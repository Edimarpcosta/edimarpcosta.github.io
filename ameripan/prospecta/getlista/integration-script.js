// ========================= INTEGRATION-SCRIPT.JS =========================
// §3 — Leitura e Enriquecimento de Planilhas (Input/Output Modernizado)
// §4 — Otimização Específica para Prospecção (WhatsApp links, CNAE legível, merge)

Object.assign(dataHandlers, {

    // §3 — Leitura Direta de .xlsx e .csv via SheetJS
    async loadSpreadsheet(file) {
        return new Promise((resolve, reject) => {
            if (typeof XLSX === 'undefined') return reject(new Error('Biblioteca XLSX (SheetJS) não carregada.'));

            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet);

                    // §3 — Salvar dados brutos para Merge posterior
                    state.rawInputData = json;

                    const cnpjs = [];
                    if (json && json.length > 0) {
                        const keys = Object.keys(json[0]);
                        // Encontra coluna CNPJ (case-insensitive)
                        const cnpjKey = keys.find(k => k.toLowerCase().includes('cnpj')) || keys[0];

                        json.forEach(row => {
                            const val = row[cnpjKey];
                            if (val) {
                                const clean = String(val).replace(/\D/g, '');
                                if (clean.length === 14) cnpjs.push(clean);
                                // Tenta padStart pra planilhas onde o zero à esquerda foi cortado
                                else if (clean.length >= 11 && clean.length < 14) {
                                    const padded = clean.padStart(14, '0');
                                    cnpjs.push(padded);
                                }
                            }
                        });
                    }

                    console.log(`[Planilha] ${cnpjs.length} CNPJs extraídos de "${sheetName}" (${json.length} linhas originais)`);
                    resolve(cnpjs);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
            reader.readAsArrayBuffer(file);
        });
    },

    // Processa texto colado (um CNPJ por linha)
    processListText(text) {
        return text
            .split(/[\n\r,;]+/)
            .map(l => l.replace(/\D/g, ''))
            .filter(l => l.length >= 11)
            .map(l => l.padStart(14, '0'))
            .filter(l => l.length === 14);
    },

    // §3 + §4 — Exportação Enriquecida para Excel
    exportToExcel() {
        try {
            if (typeof XLSX === 'undefined') throw new Error('XLSX não disponível.');
            if (!state.results || state.results.length === 0) return alert('Não há dados para exportar.');

            utils.updateStatus('Preparando exportação enriquecida...');
            const workbook = XLSX.utils.book_new();

            const successRows = [];
            const errorRows = [];
            const apiStats = {};

            state.results.forEach(result => {
                if (!result) return;

                if (result.error) {
                    errorRows.push({
                        'CNPJ': utils.formatCnpjForDisplay(result.cnpj),
                        'Erro': result.errorMessage,
                        'Data': new Date().toLocaleString('pt-BR')
                    });
                    return;
                }

                // Contabiliza uso de APIs
                const apiUsed = result.api_origem || 'Desconhecida';
                apiStats[apiUsed] = (apiStats[apiUsed] || 0) + 1;

                // §4.1 — Higienização de contatos + WhatsApp Links
                const tel1 = utils.cleanPhone(result.ddd_telefone_1);
                const tel2 = utils.cleanPhone(result.ddd_telefone_2);

                const row = {
                    'CNPJ': utils.formatCnpjForDisplay(result.cnpj),
                    'Razão Social': result.razao_social || '',
                    'Nome Fantasia': result.nome_fantasia || '',
                    'Situação Cadastral': result.descricao_situacao_cadastral || '',
                    // §4.2 — CNAE em português legível (sem código)
                    'Atividade Principal': result.cnae_fiscal_descricao || '',
                    'CNAE Código': result.cnae_fiscal || '',
                    'Endereço': `${result.logradouro || ''}, ${result.numero || ''} - ${result.bairro || ''}`.trim().replace(/^,\s*/, ''),
                    'Cidade/UF': `${result.municipio || ''}/${result.uf || ''}`,
                    'CEP': result.cep || '',
                    'E-mail': result.email || '',
                    'Telefone 1': result.ddd_telefone_1 || '',
                    'Telefone 2': result.ddd_telefone_2 || '',
                    // §4.1 — Links WhatsApp prontos pro SDR
                    'WhatsApp 1': tel1.length >= 10 ? `https://wa.me/55${tel1}` : '',
                    'WhatsApp 2': tel2.length >= 10 ? `https://wa.me/55${tel2}` : '',
                    'Natureza Jurídica': result.natureza_juridica || '',
                    'Capital Social': result.capital_social || '',
                    'Porte': result.porte || '',
                    'Abertura': result.data_inicio_atividade || '',
                    'API Origem': apiUsed
                };

                // Sócios como colunas extras
                if (result.qsa && result.qsa.length > 0) {
                    result.qsa.forEach((s, i) => {
                        row[`Sócio ${i + 1}`] = s.nome_socio || '';
                        row[`Qualificação ${i + 1}`] = s.qualificacao_socio || '';
                    });
                }

                // §3 — Modo Merge: Appender de colunas originais da planilha de input
                if (state.rawInputData) {
                    const cleanCnpj = String(result.cnpj).replace(/\D/g, '');
                    const originalRow = state.rawInputData.find(orig => {
                        const vals = Object.values(orig).map(v => String(v).replace(/\D/g, ''));
                        return vals.includes(cleanCnpj);
                    });
                    if (originalRow) {
                        Object.keys(originalRow).forEach(k => {
                            if (!row[k] && !k.toLowerCase().includes('cnpj')) {
                                row[`[Orig] ${k}`] = originalRow[k];
                            }
                        });
                    }
                }

                successRows.push(row);
            });

            // Aba 1: Dados Enriquecidos
            if (successRows.length > 0) {
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(successRows), 'CNPJs Enriquecidos');
            } else {
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Nenhum resultado com sucesso']]), 'CNPJs Enriquecidos');
            }

            // Aba 2: Erros
            if (errorRows.length > 0) {
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(errorRows), 'Erros');
            }

            // Aba 3: Resumo
            const totalProcessed = state.results.filter(r => r !== undefined).length;
            const summary = [
                ['RESUMO DA PROSPECÇÃO'],
                [''],
                ['Data da exportação', new Date().toLocaleString('pt-BR')],
                ['Total de CNPJs carregados', state.cnpjList.length],
                ['Total processados', totalProcessed],
                ['Sucessos', successRows.length],
                ['Erros', errorRows.length],
                [''],
                ['CONSUMO DE APIS'],
                ...Object.entries(apiStats).map(([api, count]) => [api, count]),
                [''],
                ['APIs configuradas', state.apis.map(a => `${a.name} (${a.active ? 'ativa' : 'inativa'})`).join(', ')]
            ];
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summary), 'Resumo');

            // Gera nome com data
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            XLSX.writeFile(workbook, `getlista_prospeccao_${dateStr}.xlsx`);
            utils.updateStatus('✅ Exportação concluída!');
        } catch (err) {
            console.error('Erro na exportação:', err);
            alert(`Erro ao exportar: ${err.message}`);
        }
    }
});
