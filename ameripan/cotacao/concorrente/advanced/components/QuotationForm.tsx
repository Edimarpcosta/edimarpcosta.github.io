import React, { useState, useEffect, useMemo } from 'react';
import FormHeader from './FormHeader';
import { getProducts, getSupervisors, getSalespeople, postDataToSheet } from '../services/googleSheetsService';
import type { QuotationRow, Product, Supervisor, Salesperson } from '../types';

const QuotationForm: React.FC = () => {
    const [supervisor, setSupervisor] = useState('');
    const [salesperson, setSalesperson] = useState('');
    const [city, setCity] = useState('');
    const [client, setClient] = useState('');
    const [competitor, setCompetitor] = useState('');
    const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);

    const [rows, setRows] = useState<QuotationRow[]>([
        { id: 1, sku: '', productName: '', flexPrice: '', cost: '', competitorPrice: '', brand: '', invoicePhotoUrl: '', lostSale: '' }
    ]);
    const [nextId, setNextId] = useState(2);

    const [searchTerm, setSearchTerm] = useState('');
    const [productSearchRowId, setProductSearchRowId] = useState<number | null>(null);
    const [focusedSku, setFocusedSku] = useState<string>('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
    const [submitMessage, setSubmitMessage] = useState('');

    // Data from Google Sheets
    const [products, setProducts] = useState<Product[]>([]);
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    
    // Image viewer state
    const [imageSrc, setImageSrc] = useState('https://i.imgur.com/tC0FvRj.png');
    const [imageAlt, setImageAlt] = useState('Clique ou digite no campo "Cód. Produto" para ver a imagem.');


    // Fetch all required data on component mount
    useEffect(() => {
        const loadData = async () => {
            setIsLoadingData(true);
            try {
                const [productsData, supervisorsData, salespeopleData] = await Promise.all([
                    getProducts(),
                    getSupervisors(),
                    getSalespeople()
                ]);
                setProducts(productsData);
                setSupervisors(supervisorsData);
                setSalespeople(salespeopleData);
            } catch (error) {
                console.error("Failed to load initial form data:", error);
            } finally {
                setIsLoadingData(false);
            }
        };
        loadData();
    }, []);

    // Load header data from sessionStorage on component mount
    useEffect(() => {
        setSupervisor(sessionStorage.getItem('form_supervisor') || '');
        setSalesperson(sessionStorage.getItem('form_salesperson') || '');
        setCity(sessionStorage.getItem('form_city') || '');
    }, []);

    // Auto-save header data to sessionStorage whenever it changes
    useEffect(() => { sessionStorage.setItem('form_supervisor', supervisor); }, [supervisor]);
    useEffect(() => { sessionStorage.setItem('form_salesperson', salesperson); }, [salesperson]);
    useEffect(() => { sessionStorage.setItem('form_city', city); }, [city]);

    
    const clearHeaderFromSession = () => {
        sessionStorage.removeItem('form_supervisor');
        sessionStorage.removeItem('form_salesperson');
        sessionStorage.removeItem('form_city');
        setSupervisor('');
        setSalesperson('');
        setCity('');
        alert('Dados do cabeçalho limpos da sessão!');
    };
    
    const filteredSalespeople = useMemo(() => {
        if (!supervisor) return [];
        return salespeople.filter(s => s.supervisor === supervisor);
    }, [supervisor, salespeople]);

    const handleRowChange = (id: number, field: keyof Omit<QuotationRow, 'id'>, value: any) => {
        setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const addRow = () => {
        setRows(prevRows => {
            const newId = (prevRows.length > 0 ? Math.max(...prevRows.map(r => r.id)) : 0) + 1;
            return [...prevRows, { id: newId, sku: '', productName: '', flexPrice: '', cost: '', competitorPrice: '', brand: '', invoicePhotoUrl: '', lostSale: '' }];
        });
    };

    const removeRow = (id: number) => {
        setRows(rows.filter(row => row.id !== id));
    };
    
    const selectProduct = (product: {sku: string, name: string}) => {
        if(productSearchRowId !== null) {
            const updatedRows = rows.map(row => {
                if (row.id === productSearchRowId) {
                    setFocusedSku(product.sku);
                    return { ...row, sku: product.sku, productName: product.name };
                }
                return row;
            });
            setRows(updatedRows);
            setProductSearchRowId(null);
            setSearchTerm('');
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, rowId: number, currentFieldIndex: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const target = e.target as HTMLElement;
            target.blur(); // Trigger onBlur logic

            const nextFieldIndex = currentFieldIndex + 1;
            const currentRow = target.closest('tr');
            const nextInput = currentRow?.querySelector(`[data-field-index='${nextFieldIndex}']`) as HTMLElement;

            if (nextInput) {
                nextInput.focus();
            } else {
                // It's the last field, add a new row and focus its first input
                addRow();
                setTimeout(() => {
                    const lastRow = document.querySelector("#products-table-body tr:last-child");
                    const firstInput = lastRow?.querySelector(`[data-field-index='0']`) as HTMLElement;
                    firstInput?.focus();
                }, 50);
            }
        }
    };

    // Implements wildcard (*) search logic
    const filteredProducts = useMemo(() => {
        if (!searchTerm) return [];
        const upperSearchTerm = searchTerm.toUpperCase();

        // Handle wildcard search
        if (upperSearchTerm.includes('*')) {
            const terms = upperSearchTerm.split('*').filter(t => t);
            if (terms.length === 0) return [];
            return products.filter(p => {
                const productNameUpper = p.name.toUpperCase();
                return terms.every(term => productNameUpper.includes(term));
            }).slice(0, 50); // Limit results for performance
        }
        
        // Handle normal search
        return products.filter(p => 
            p.name.toUpperCase().includes(upperSearchTerm) || 
            p.sku.toUpperCase().includes(upperSearchTerm)
        ).slice(0, 50);
    }, [searchTerm, products]);
    
    // Implements cascading image search (scraper + fallback)
    const fetchProductImage = async (sku: string) => {
        if (!sku) {
            return {
                src: 'https://i.imgur.com/tC0FvRj.png',
                alt: 'Nenhum SKU fornecido.'
            };
        }

        // Tentativa 1: Scraper. Expected to fail due to CORS in a browser environment.
        try {
            // This request is blocked by CORS policy in browsers.
            // Included to match prompt spec, but will not work as intended without a server-side proxy.
            const response = await fetch(`https://www.ameripan.com.br/buscar?q=${sku}`);
            if (response.ok) {
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const skuElement = doc.querySelector('.listagem-item .produto-sku.hide');

                if (skuElement && skuElement.textContent?.trim() === sku) {
                    const parentItem = skuElement.closest('.listagem-item');
                    const imgElement = parentItem?.querySelector('.imagem-produto img');
                    if (imgElement) {
                        let imageUrl = imgElement.getAttribute('src') || '';
                        if (imageUrl.startsWith('/')) {
                            imageUrl = `https://www.ameripan.com.br${imageUrl}`;
                        }
                        return { src: imageUrl, alt: `Imagem de ${sku} (Fonte: Ameripan)` };
                    }
                }
            }
        } catch (error) {
            console.warn(`Scraper fetch failed for SKU ${sku} (expected CORS error):`, error);
        }

        // Tentativa 2: Fallback to GitHub
        const fallbackUrl = `https://github.com/Edimarpcosta/edimarpcosta.github.io/blob/main/ameripan/img/${sku.toUpperCase()}.jpg?raw=true`;
        return { src: fallbackUrl, alt: `Imagem de ${sku} (Fonte: GitHub)` };
    };
    
    // Effect to update image when focused SKU changes
    useEffect(() => {
        const updateImage = async () => {
            if (focusedSku) {
                setImageSrc('https://i.imgur.com/8Dc3S2Q.gif'); // loading gif
                setImageAlt(`Buscando imagem para ${focusedSku}...`);
                const { src, alt } = await fetchProductImage(focusedSku);
                setImageSrc(src);
                setImageAlt(alt);
            } else {
                 setImageSrc('https://i.imgur.com/tC0FvRj.png');
                 setImageAlt('Clique ou digite no campo "Cód. Produto" para ver a imagem.');
            }
        };
        const handler = setTimeout(() => { updateImage(); }, 300); // Debounce
        return () => { clearTimeout(handler); };
    }, [focusedSku]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!supervisor || !salesperson || !competitor || rows.some(r => !r.sku)) {
             setSubmitStatus('error');
             setSubmitMessage('Falha ao salvar. Verifique os campos obrigatórios (Supervisor, Vendedor, Concorrente e Cód. Produto).');
             setTimeout(() => setSubmitStatus(null), 5000);
             return;
        }

        setIsSubmitting(true);
        setSubmitStatus(null);
        
        // Adapt payload to match Google Apps Script structure
        const payload = {
            type: 'cotacao',
            header: {
                data: quotationDate,
                supervisor: supervisor,
                vendedor: salesperson,
                cidade: city,
                cliente: client,
                concorrente: competitor
            },
            products: rows
                .filter(row => row.sku && row.productName) // Send only valid rows
                .map(row => ({
                    cod: row.sku,
                    nome: row.productName,
                    flex: Number(row.flexPrice) || 0,
                    custo: Number(row.cost) || 0,
                    concorrente: Number(row.competitorPrice) || 0,
                    marca: row.brand,
                    foto: row.invoicePhotoUrl,
                    vendaPerdida: row.lostSale === 'FALSE' ? 'FALSE' : 'TRUE'
                }))
        };

        if (payload.products.length === 0) {
            setSubmitStatus('error');
            setSubmitMessage('Nenhum produto válido para salvar. Preencha ao menos uma linha completamente.');
            setIsSubmitting(false);
            setTimeout(() => setSubmitStatus(null), 5000);
            return;
        }
        
        const response = await postDataToSheet(payload);

        if (response.ok) {
            setSubmitStatus('success');
            setSubmitMessage('Cotações salvas com sucesso!');
            setRows([{ id: 1, sku: '', productName: '', flexPrice: '', cost: '', competitorPrice: '', brand: '', invoicePhotoUrl: '', lostSale: '' }]);
            setNextId(2);
            setClient('');
            setCompetitor('');
        } else {
            setSubmitStatus('error');
            setSubmitMessage(response.message || 'Falha ao salvar. Verifique sua conexão e tente novamente.');
        }

        setIsSubmitting(false);
        setTimeout(() => setSubmitStatus(null), 5000);
    };

    const inputStyles = "w-full p-1 border rounded-md bg-white text-gray-800 shadow-sm focus:ring-primary focus:border-primary";

    return (
        <div className="bg-gray-50 min-h-screen">
            <FormHeader />
            <main className="container mx-auto p-4 md:p-6 lg:p-8">
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h1 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-4">Formulário de Cotação de Concorrentes</h1>
                    
                    {isLoadingData && (
                        <div className="text-center p-4">
                            <i className="fas fa-spinner fa-spin mr-2"></i> Carregando dados...
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Data da Cotação</label>
                            <input type="date" value={quotationDate} onChange={e => setQuotationDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Supervisor</label>
                            <select value={supervisor} onChange={e => {setSupervisor(e.target.value); setSalesperson('');}} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" required disabled={isLoadingData}>
                                <option value="">Selecione...</option>
                                {supervisors.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Vendedor</label>
                            <input
                                type="text"
                                list="salespeople-list"
                                value={salesperson}
                                onChange={e => setSalesperson(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                                disabled={!supervisor || isLoadingData}
                                required
                                placeholder={supervisor ? "Digite ou selecione..." : "Selecione um supervisor"}
                            />
                            <datalist id="salespeople-list">
                                {filteredSalespeople.map(v => <option key={v.name} value={v.name} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Cidade</label>
                            <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: São Paulo" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Cliente (Opcional)</label>
                            <input type="text" value={client} onChange={e => setClient(e.target.value)} placeholder="Ex: Padaria do Zé" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Concorrente</label>
                            <input type="text" value={competitor} onChange={e => setCompetitor(e.target.value)} placeholder="Ex: Atacadão Preço Bom" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" required/>
                        </div>
                    </div>
                    <div className="flex space-x-2 mb-8">
                        <button onClick={clearHeaderFromSession} className="px-4 py-2 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"><i className="fas fa-eraser mr-1"></i> Limpar Cabeçalho</button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-28">Cód. Produto</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-72">Nome Produto</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-28">Preço Flex</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-28">Custo</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-32">Preço Concorrente</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-32">Marca</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-36">Link Foto NF</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-28">Venda Perdida?</th>
                                    <th className="px-2 py-3 w-12"></th>
                                </tr>
                            </thead>
                            <tbody id="products-table-body" className="bg-white divide-y divide-gray-200">
                                {rows.map((row) => (
                                    <tr key={row.id}>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <input
                                                type="text"
                                                data-field-index="0"
                                                value={row.sku}
                                                onChange={(e) => handleRowChange(row.id, 'sku', e.target.value.toUpperCase())}
                                                onFocus={(e) => setFocusedSku(e.target.value)}
                                                onBlur={(e) => {
                                                    const skuValue = e.target.value;
                                                    setFocusedSku(skuValue);
                                                    const product = products.find(p => p.sku.toLowerCase() === skuValue.toLowerCase());
                                                    if (product) {
                                                        handleRowChange(row.id, 'productName', product.name);
                                                    } else if (skuValue === '') {
                                                        handleRowChange(row.id, 'productName', '');
                                                    }
                                                }}
                                                onKeyDown={(e) => handleKeyDown(e, row.id, 0)}
                                                className={inputStyles}
                                            />
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap relative">
                                            <div className="flex items-center">
                                                <input type="text" data-field-index="1" value={row.productName} onFocus={() => {setProductSearchRowId(row.id); setSearchTerm(row.productName);}} onChange={(e) => {
                                                    handleRowChange(row.id, 'productName', e.target.value);
                                                    setSearchTerm(e.target.value);
                                                    setProductSearchRowId(row.id);
                                                }} onBlur={() => setTimeout(() => setProductSearchRowId(null), 200)} onKeyDown={(e) => handleKeyDown(e, row.id, 1)} className={inputStyles} />
                                                <i className="fas fa-info-circle text-gray-400 ml-2" title="Busque pelo nome ou código. Use * como curinga (ex: LEITE*COND)."></i>
                                            </div>
                                            {productSearchRowId === row.id && searchTerm && (
                                                <div className="absolute z-10 w-full bg-white border shadow-lg max-h-48 overflow-y-auto rounded-md mt-1">
                                                    {filteredProducts.map(p => (
                                                        <div key={p.sku} onMouseDown={() => selectProduct(p)} className="p-2 hover:bg-blue-100 cursor-pointer">{p.sku} - {p.name}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-2"><input type="number" step="0.01" data-field-index="2" value={row.flexPrice} onChange={e => handleRowChange(row.id, 'flexPrice', e.target.value)} onKeyDown={(e) => handleKeyDown(e, row.id, 2)} className={inputStyles} /></td>
                                        <td className="px-4 py-2"><input type="number" step="0.01" data-field-index="3" value={row.cost} onChange={e => handleRowChange(row.id, 'cost', e.target.value)} onKeyDown={(e) => handleKeyDown(e, row.id, 3)} className={inputStyles} /></td>
                                        <td className="px-4 py-2"><input type="number" step="0.01" data-field-index="4" value={row.competitorPrice} onChange={e => handleRowChange(row.id, 'competitorPrice', e.target.value)} onKeyDown={(e) => handleKeyDown(e, row.id, 4)} className={inputStyles} /></td>
                                        <td className="px-4 py-2"><input type="text" data-field-index="5" value={row.brand} onChange={e => handleRowChange(row.id, 'brand', e.target.value)} placeholder="Opcional" onKeyDown={(e) => handleKeyDown(e, row.id, 5)} className={inputStyles} /></td>
                                        <td className="px-4 py-2"><input type="text" data-field-index="6" value={row.invoicePhotoUrl} onChange={e => handleRowChange(row.id, 'invoicePhotoUrl', e.target.value)} onKeyDown={(e) => handleKeyDown(e, row.id, 6)} className={inputStyles} /></td>
                                        <td className="px-4 py-2">
                                            <select data-field-index="7" value={row.lostSale} onChange={e => handleRowChange(row.id, 'lostSale', e.target.value as '' | 'TRUE' | 'FALSE')} onKeyDown={(e) => handleKeyDown(e, row.id, 7)} className={inputStyles}>
                                                <option value="">N/A</option>
                                                <option value="TRUE">Sim</option>
                                                <option value="FALSE">Não</option>
                                            </select>
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <button onClick={() => removeRow(row.id)} className="text-red-500 hover:text-red-700"><i className="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={addRow} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"><i className="fas fa-plus mr-1"></i> Adicionar Produto</button>

                    <div className="flex justify-between items-start mt-8 pt-6 border-t">
                        <div className="w-1/2 pr-4">
                           <h3 className="font-semibold text-gray-700 mb-2">Verificar Imagem do Produto</h3>
                           <div className="w-full h-auto bg-gray-200 rounded flex items-center justify-center text-gray-500 text-center p-4 min-h-[150px]">
                               <img 
                                src={imageSrc} 
                                alt={imageAlt}
                                className="max-w-full h-auto rounded shadow-md"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://i.imgur.com/tC0FvRj.png'; (e.target as HTMLImageElement).alt = 'Imagem não encontrada ou erro ao carregar'; }}
                             />
                           </div>
                        </div>
                        <div className="w-1/2 pl-4 flex flex-col items-end">
                            {submitStatus === 'success' && <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">{submitMessage}</div>}
                            {submitStatus === 'error' && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">{submitMessage}</div>}
                            
                            <button onClick={handleSubmit} disabled={isSubmitting || isLoadingData} className="w-full md:w-auto px-8 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:bg-gray-400">
                                {isSubmitting ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin mr-2"></i> Salvando...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-check mr-2"></i> Salvar Cotações
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default QuotationForm;