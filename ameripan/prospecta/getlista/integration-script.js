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

            // Filtro por CNO Obras Ativas
            if (!result.error) {
                const cnoEnabled = document.getElementById('cnoEnabled')?.checked;
                const cnoOnlyActive = document.getElementById('cnoOnlyActive')?.checked;
                if (cnoEnabled && cnoOnlyActive) {
                    const hasActive = result.cno && result.cno.obras && result.cno.obras.some(o => o.situacao?.descricao?.toUpperCase() === 'ATIVA');
                    if (!hasActive) return;
                }
            }

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
                    'Porte': result.porte || '',
                    'Tem Obras': result.cno && result.cno.obras && result.cno.obras.length > 0 ? 'SIM' : 'NÃO',
                    'Qtde Obras': result.cno && result.cno.obras ? result.cno.obras.length : 0,
                    'Lista CNOs': result.cno && result.cno.obras ? result.cno.obras.map(o => `${o.cno} (${o.situacao?.descricao || ''})`).join(', ') : '',
                    'Área Total Obras (m²)': result.cno && result.cno.obras ? result.cno.obras.reduce((acc, o) => acc + (parseFloat(o.area_total) || 0), 0) : 0
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

            // Lógica de Agrupamento Fase 2
            const groupRoot = document.getElementById('groupRoot')?.checked;
            const groupCity = document.getElementById('groupCity')?.checked;

            if (groupRoot || groupCity) {
                successRows.sort((a, b) => {
                    let cmp = 0;
                    if (groupCity) {
                        const cityA = (a.result.municipio || '').toLowerCase();
                        const cityB = (b.result.municipio || '').toLowerCase();
                        if (cityA < cityB) cmp = -1;
                        if (cityA > cityB) cmp = 1;
                    }
                    if (cmp === 0 && groupRoot) {
                        const rootA = String(a.result.cnpj).replace(/\D/g, '').substring(0, 8);
                        const rootB = String(b.result.cnpj).replace(/\D/g, '').substring(0, 8);
                        if (rootA < rootB) cmp = -1;
                        if (rootA > rootB) cmp = 1;
                    }
                    return cmp;
                });
            }

            const rows = successRows.map(({ result, apiUsed }) => {
                const tel1 = utils.cleanPhone(result.ddd_telefone_1);
                const tel2 = utils.cleanPhone(result.ddd_telefone_2);
                const scoreInfo = result.scoreInfo || {};
                const age = utils.calculateAge(result.data_inicio_atividade || result.abertura);
                const ageDesc = utils.getAgeDescription(age);
                const isAccounting = utils.detectAccountingContact(result.ddd_telefone_1, result.email, result.nome_fantasia, result.razao_social);

                const row = {};
                if (groupRoot) {
                    row['Raiz CNPJ'] = String(result.cnpj).replace(/\D/g, '').substring(0, 8);
                }
                
                Object.assign(row, {
                    'CNPJ': result.cnpj,
                    'CNPJ Formatado': utils.formatCnpjForDisplay(result.cnpj),
                    'Score B2B': scoreInfo.score || 0,
                    'Temperatura Lead': scoreInfo.temp || 'Frio ❄️',
                    'Score Motivos': (scoreInfo.reasons || []).join(' | '),
                    'Estágio Comercial': ageDesc.text,
                    'Idade (Anos)': age !== null ? age : '',
                    'Contato Contábil?': isAccounting ? 'SIM' : 'NÃO',
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
                    'API Origem': apiUsed,
                    'Tem Obras': result.cno && result.cno.obras && result.cno.obras.length > 0 ? 'SIM' : 'NÃO',
                    'Qtde Obras': result.cno && result.cno.obras ? result.cno.obras.length : 0,
                    'Lista CNOs': result.cno && result.cno.obras ? result.cno.obras.map(o => `${o.cno} (${o.situacao?.descricao || ''})`).join(', ') : '',
                    'Área Total Obras (m²)': result.cno && result.cno.obras ? result.cno.obras.reduce((acc, o) => acc + (parseFloat(o.area_total) || 0), 0) : 0
                });

                // Sócios como colunas extras
                if (result.qsa && result.qsa.length > 0) {
                    result.qsa.forEach((s, i) => {
                        row['Sócio ' + (i + 1) + ' - Nome'] = s.nome_socio || s.nome || '';
                        row['Sócio ' + (i + 1) + ' - Qualificação'] = s.qualificacao_socio || s.cargo || '';
                        row['Sócio ' + (i + 1) + ' - Faixa Etária'] = s.faixa_etaria || '';
                        row['Sócio ' + (i + 1) + ' - Entrada'] = s.data_entrada_sociedade || s.data_entrada || '';
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
    },

    // ====== 📄 EXPORTAR PDF DOSSIÊ CORPORATIVO ======
    exportPdfProfissional(d) {
        if (!d) return alert('Nenhum dado selecionado.');
        if (!window.jspdf) return alert('Biblioteca jsPDF não carregada.');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const brand = [79, 70, 229], brand2 = [124, 58, 237], success = [5, 150, 105], warning = [217, 119, 6], danger = [220, 38, 38], dark = [15, 23, 42], muted = [100, 116, 139], light = [241, 245, 249], border = [203, 213, 225], white = [255, 255, 255];
        const LM = 15, RM = 195, PW = 180;
        let y = 0, pageNum = 1;

        function addPage() {
            pageNum++;
            doc.addPage();
            y = 18;
            doc.setFillColor(...brand);
            doc.rect(LM, 10, PW, 1, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(...muted);
            doc.text(`CNPJ: ${utils.formatCnpjForDisplay(d.cnpj)} | ${(d.razao_social||'').substring(0,50)}`, LM, 289);
        }

        function checkPage(needed) { if (y + needed > 270) addPage(); }

        function sectionHeader(num, title) {
            checkPage(14);
            doc.setFillColor(...light);
            doc.rect(LM, y, PW, 8, 'F');
            doc.setFillColor(...brand);
            doc.rect(LM, y, 3, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...brand);
            doc.text(`${num}. ${title}`, LM + 6, y + 5.5);
            y += 12;
        }

        function kvRow(label, value, x1, x2, maxLen) {
            checkPage(6);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(...muted);
            doc.text(label, x1, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...dark);
            let v = String(value || '-');
            if (maxLen && v.length > maxLen) v = v.substring(0, maxLen - 2) + '..';
            doc.text(v, x2, y);
            y += 5;
        }

        function kvRowFull(label, value, maxLen) { kvRow(label, value, LM, LM + 40, maxLen); }

        function kvRowDouble(label1, val1, label2, val2, maxLen) {
            checkPage(6);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(...muted);
            doc.text(label1, LM, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...dark);
            doc.text(String(val1 || '-').substring(0, maxLen || 30), LM + 36, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...muted);
            doc.text(label2, 108, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...dark);
            doc.text(String(val2 || '-').substring(0, maxLen || 30), 144, y);
            y += 5;
        }

        // Header
        doc.setFillColor(...brand); doc.rect(0, 0, 210, 28, 'F');
        doc.setFillColor(...brand2); doc.rect(130, 0, 80, 28, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...white);
        doc.text("FICHA DE INTELIGÊNCIA COMERCIAL B2B", LM, 11);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(200, 200, 240);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} | GetLista Prospecta Multi-API`, LM, 16);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...white);
        let headerName = (d.razao_social || 'SEM RAZAO SOCIAL');
        if (headerName.length > 70) headerName = headerName.substring(0, 67) + '...';
        doc.text(headerName, LM, 22);

        y = 35;

        // Card Score
        const scoreInfo = d.scoreInfo || {};
        const scoreVal = scoreInfo.score || 0;
        const tempVal = scoreInfo.temp || 'Frio ❄️';
        let scoreBg = danger;
        if (scoreVal >= 70) scoreBg = [220, 38, 38];
        else if (scoreVal >= 35) scoreBg = [217, 119, 6];
        else scoreBg = [59, 130, 246];

        doc.setFillColor(248, 250, 252); doc.setDrawColor(...border); doc.roundedRect(LM, y, PW, 30, 2, 2, 'FD');
        doc.setFillColor(...scoreBg); doc.circle(LM + 15, y + 15, 12, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(...white);
        doc.text(String(scoreVal), LM + 15, y + 17, { align: 'center' });
        doc.setFontSize(5.5); doc.text('SCORE B2B', LM + 15, y + 23, { align: 'center' });

        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...scoreBg);
        doc.text(tempVal, LM + 34, y + 12);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...muted);
        doc.text('Termômetro de Prospecção Ameripan', LM + 34, y + 17);

        const reasonsList = scoreInfo.reasons || [];
        doc.setFontSize(7); doc.setTextColor(...dark);
        let ry = y + 11;
        reasonsList.slice(0, 4).forEach(r => { doc.text(`* ${r.substring(0, 75)}`, LM + 34, ry); ry += 4; });
        y += 36;

        // 1. Identificação
        sectionHeader(1, 'IDENTIFICAÇÃO E DADOS PRINCIPAIS');
        kvRowDouble('RAZÃO SOCIAL:', d.razao_social, 'NOME FANTASIA:', d.nome_fantasia, 28);
        kvRowDouble('CNPJ:', utils.formatCnpjForDisplay(d.cnpj), 'DATA ABERTURA:', d.data_inicio_atividade || d.abertura || '-');
        kvRowDouble('SITUAÇÃO RFB:', d.descricao_situacao_cadastral || 'ATIVA', 'PORTE:', d.porte || 'NÃO INFORMADO', 28);
        kvRowDouble('CAPITAL SOCIAL:', `R$ ${(d.capital_social || 0).toLocaleString('pt-BR')}`, 'NATUREZA JURÍDICA:', d.natureza_juridica, 28);
        y += 2;

        // 2. Tributário
        sectionHeader(2, 'REGIME TRIBUTÁRIO & MATURIDADE');
        const ageVal = utils.calculateAge(d.data_inicio_atividade || d.abertura);
        const ageDesc = utils.getAgeDescription(ageVal);
        kvRowDouble('SIMPLES / MEI:', d.simples_nacional?.optante ? 'Optante Simples' : 'Lucro Presumido/Real', 'IDADE COMERCIAL:', ageVal !== null ? `${ageVal} anos (${ageDesc.text})` : 'N/D');

        // 3. Contatos
        sectionHeader(3, 'CANAIS DE CONTATO E LOCALIZAÇÃO');
        kvRowFull('ENDEREÇO:', `${d.logradouro || '-'}, Nº ${d.numero || '-'}${d.complemento ? ' - ' + d.complemento : ''}`, 70);
        kvRowDouble('BAIRRO:', d.bairro || '-', 'CEP:', d.cep || '-');
        kvRowDouble('MUNICÍPIO/UF:', `${d.municipio || '-'}/${d.uf || ''}`, 'FONE 1:', d.ddd_telefone_1 || '-');
        kvRowDouble('FONE 2:', d.ddd_telefone_2 || '-', 'E-MAIL:', d.email || '-');

        // Página 2: CNAE & QSA
        addPage();
        sectionHeader(4, 'ATIVIDADES ECONÔMICAS (CNAE)');
        kvRowFull('CNAE PRINCIPAL:', `${d.cnae_fiscal || '-'} - ${d.cnae_fiscal_descricao || '-'}`, 85);

        sectionHeader(5, 'QUADRO SOCIETÁRIO (QSA)');
        if (d.qsa && d.qsa.length > 0) {
            d.qsa.forEach((s, i) => {
                checkPage(10);
                doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...brand);
                doc.text(s.nome_socio || s.nome || '-', LM + 2, y + 3);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...dark);
                doc.text(`Cargo: ${s.qualificacao_socio || s.cargo || 'Sócio'} ${s.faixa_etaria ? '| Faixa: ' + s.faixa_etaria : ''}`, LM + 2, y + 7);
                y += 10;
            });
        } else {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...muted);
            doc.text('Nenhum sócio informado nas bases.', LM + 2, y);
            y += 6;
        }

        const cleanCnpj = utils.cleanCnpjStr(d.cnpj);
        doc.save(`CNPJ_${cleanCnpj}.pdf`);
        utils.updateStatus(`📄 PDF gerado: CNPJ_${cleanCnpj}.pdf`);
    },

    // ====== 🚀 INJETAR LEAD NO CRM (Google Sheets Webhook) ======
    async injetarLeadNoCRM(d) {
        if (!d) return alert('Nenhum lead selecionado.');
        const webhookUrl = (localStorage.getItem('crm_webhook_url') || '').trim();
        if (!webhookUrl) {
            const urlInput = prompt("Digite a URL do Webhook do CRM (Google Apps Script):");
            if (!urlInput) return;
            localStorage.setItem('crm_webhook_url', urlInput.trim());
        }

        const finalUrl = localStorage.getItem('crm_webhook_url');
        const scoreInfo = d.scoreInfo || {};
        const age = utils.calculateAge(d.data_inicio_atividade || d.abertura);

        const payload = {
            cnpj: utils.formatCnpjForDisplay(d.cnpj),
            cnpj_limpo: utils.cleanCnpjStr(d.cnpj),
            razao_social: d.razao_social || '',
            nome_fantasia: d.nome_fantasia || '',
            situacao: d.descricao_situacao_cadastral || 'ATIVA',
            abertura: d.data_inicio_atividade || d.abertura || '',
            idade: age !== null ? `${age} anos` : '',
            capital_social: d.capital_social || 0,
            telefone1: d.ddd_telefone_1 || '',
            telefone2: d.ddd_telefone_2 || '',
            email: d.email || '',
            cidade: d.municipio || '',
            uf: d.uf || '',
            cep: d.cep || '',
            cnae_principal: `${d.cnae_fiscal || ''} - ${d.cnae_fiscal_descricao || ''}`,
            lead_score: scoreInfo.score || 0,
            lead_temperatura: scoreInfo.temp || 'Frio ❄️',
            timestamp: new Date().toISOString()
        };

        try {
            await fetch(finalUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            alert(`✅ Lead ${utils.formatCnpjForDisplay(d.cnpj)} injetado com sucesso no CRM!`);
        } catch (e) {
            alert(`Erro ao enviar para o CRM: ${e.message}`);
        }
    }
});

