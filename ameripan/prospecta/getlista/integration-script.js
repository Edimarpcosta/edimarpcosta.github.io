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

    // ====== FILTRO COMPARTILHADO (respeita checkboxes de Situação Cadastral) ======
    _getFilteredResults() {
        const exportAll = document.getElementById('exportAll')?.checked ?? true;
        const allowedStatuses = Array.from(document.querySelectorAll('.export-status:checked')).map(cb => cb.value.toLowerCase());

        const successRows = [];
        const errorRows = [];
        const apiStats = {};

        state.results.forEach(result => {
            if (!result) return;

            // Filtro por situação cadastral
            if (!result.error && !exportAll) {
                const statusVal = (result.descricao_situacao_cadastral || '').toLowerCase();
                const matchesStatus = allowedStatuses.some(s => statusVal.includes(s));
                if (!matchesStatus) return;
            }

            if (result.error) {
                errorRows.push({
                    'CNPJ': utils.formatCnpjForDisplay(result.cnpj),
                    'Erro': result.errorMessage,
                    'Data': new Date().toLocaleString('pt-BR')
                });
                return;
            }

            const apiUsed = result.api_origem || 'Desconhecida';
            apiStats[apiUsed] = (apiStats[apiUsed] || 0) + 1;
            successRows.push({ result, apiUsed });
        });

        return { successRows, errorRows, apiStats };
    },

    // ====== ABAS COMUNS (Erros + Resumo) ======
    _addCommonSheets(workbook, errorRows, apiStats, successCount) {
        if (errorRows.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(errorRows), 'Erros');
        }
        const totalProcessed = state.results.filter(r => r !== undefined).length;
        const summary = [
            ['RESUMO DA PROSPECÇÃO'],
            [''],
            ['Data da exportação', new Date().toLocaleString('pt-BR')],
            ['Total de CNPJs carregados', state.cnpjList.length],
            ['Total processados', totalProcessed],
            ['Sucessos (exportados)', successCount],
            ['Erros', errorRows.length],
            [''],
            ['CONSUMO DE APIS'],
            ...Object.entries(apiStats).map(([api, count]) => [api, count]),
            [''],
            ['APIs configuradas', state.apis.map(a => `${a.name} (${a.active ? 'ativa' : 'inativa'})`).join(', ')]
        ];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summary), 'Resumo');
    },

    // ====== 🗺️ EXPORTAR MAPOSCOPE (otimizado) ======
    exportMaposcope() {
        try {
            if (typeof XLSX === 'undefined') throw new Error('XLSX não disponível.');
            if (!state.results || state.results.length === 0) return alert('Não há dados para exportar.');

            utils.updateStatus('Preparando exportação Maposcope...');
            const { successRows, errorRows, apiStats } = this._getFilteredResults();
            const workbook = XLSX.utils.book_new();

            const rows = successRows.map(({ result, apiUsed }) => {
                const tel1 = utils.cleanPhone(result.ddd_telefone_1);
                const tel2 = utils.cleanPhone(result.ddd_telefone_2);
                const rua = result.logradouro || '';
                const numero = result.numero || 'SN';
                const bairro = result.bairro || '';
                const cep = result.cep || '';
                const cidade = result.municipio || '';
                const estado = result.uf || '';

                return {
                    // === Campos que o Maposcope mapeia diretamente ===
                    'Name': result.nome_fantasia || result.razao_social || 'Sem Nome',
                    'Address': rua + ', ' + numero + ' - ' + bairro + ', ' + cidade + ' - ' + estado + ', ' + cep,
                    'Street': rua,
                    'Street Number': numero,
                    'City': cidade,
                    'State': estado,
                    'Zip Code': cep,
                    'Country': 'Brasil',
                    'ID': utils.formatCnpjForDisplay(result.cnpj),

                    // === Dados normais (Maposcope usa em Descrição → Todas as colunas) ===
                    'Razão Social': result.razao_social || '',
                    'Situação Cadastral': result.descricao_situacao_cadastral || '',
                    'Descrição CNAE': result.cnae_fiscal_descricao || '',
                    'CNAE Principal': result.cnae_fiscal || '',
                    'Bairro': bairro,
                    'Telefone': result.ddd_telefone_1 || '',
                    'Telefone 2': result.ddd_telefone_2 || '',
                    'WhatsApp 1': tel1.length >= 10 ? 'https://wa.me/55' + tel1 : '',
                    'WhatsApp 2': tel2.length >= 10 ? 'https://wa.me/55' + tel2 : '',
                    'Email': result.email || '',
                    'Capital Social': result.capital_social || '',
                    'Porte': result.porte || ''
                };
            });

            if (rows.length > 0) {
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Maposcope');
            } else {
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Nenhum resultado']]), 'Maposcope');
            }

            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            XLSX.writeFile(workbook, 'maposcope_' + dateStr + '.xlsx');
            utils.updateStatus('✅ Maposcope exportado! ' + rows.length + ' pinos.');
        } catch (err) {
            console.error('Erro na exportação Maposcope:', err);
            alert('Erro ao exportar: ' + err.message);
        }
    },

    // ====== 📊 EXPORTAR COMPLETO (PT-BR) ======
    exportCompleto() {
        try {
            if (typeof XLSX === 'undefined') throw new Error('XLSX não disponível.');
            if (!state.results || state.results.length === 0) return alert('Não há dados para exportar.');

            utils.updateStatus('Preparando exportação completa...');
            const { successRows, errorRows, apiStats } = this._getFilteredResults();
            const workbook = XLSX.utils.book_new();

            const rows = successRows.map(({ result, apiUsed }) => {
                const tel1 = utils.cleanPhone(result.ddd_telefone_1);
                const tel2 = utils.cleanPhone(result.ddd_telefone_2);

                const row = {
                    'CNPJ': result.cnpj,
                    'CNPJ Formatado': utils.formatCnpjForDisplay(result.cnpj),
                    'Razão Social': result.razao_social || '',
                    'Nome Fantasia': result.nome_fantasia || '',
                    'Situação Cadastral': result.descricao_situacao_cadastral || '',
                    'Data de Abertura': result.data_inicio_atividade || '',
                    'CNAE Principal': result.cnae_fiscal || '',
                    'Descrição CNAE': result.cnae_fiscal_descricao || '',
                    'Natureza Jurídica': result.natureza_juridica || '',
                    'Logradouro': result.logradouro || '',
                    'Número': result.numero || '',
                    'Complemento': result.complemento || '',
                    'Bairro': result.bairro || '',
                    'Município': result.municipio || '',
                    'UF': result.uf || '',
                    'CEP': result.cep || '',
                    'Telefone': result.ddd_telefone_1 || '',
                    'Telefone 2': result.ddd_telefone_2 || '',
                    'Email': result.email || '',
                    'WhatsApp 1': tel1.length >= 10 ? 'https://wa.me/55' + tel1 : '',
                    'WhatsApp 2': tel2.length >= 10 ? 'https://wa.me/55' + tel2 : '',
                    'Capital Social': result.capital_social || '',
                    'Porte': result.porte || '',
                    'API Origem': apiUsed
                };

                // Sócios como colunas extras
                if (result.qsa && result.qsa.length > 0) {
                    result.qsa.forEach((s, i) => {
                        row['Sócio ' + (i + 1) + ' - Nome'] = s.nome_socio || '';
                        row['Sócio ' + (i + 1) + ' - Qualificação'] = s.qualificacao_socio || '';
                    });
                }

                // CNAEs Secundários
                if (result.cnaes_secundarios && result.cnaes_secundarios.length > 0) {
                    result.cnaes_secundarios.forEach((c, i) => {
                        row['CNAE Secundário ' + (i + 1)] = c.codigo || '';
                        row['Descrição CNAE Secundário ' + (i + 1)] = c.descricao || '';
                    });
                }

                return row;
            });

            if (rows.length > 0) {
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'CNPJs Enriquecidos');
            } else {
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Nenhum resultado com sucesso']]), 'CNPJs Enriquecidos');
            }

            this._addCommonSheets(workbook, errorRows, apiStats, rows.length);

            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            XLSX.writeFile(workbook, 'getlista_completo_' + dateStr + '.xlsx');
            utils.updateStatus('✅ Exportação completa! ' + rows.length + ' CNPJs.');
        } catch (err) {
            console.error('Erro na exportação completa:', err);
            alert('Erro ao exportar: ' + err.message);
        }
    }
});
