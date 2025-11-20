import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FormHeader from './FormHeader';
import { getSalespeople, postDataToSheet } from '../services/googleSheetsService';
import type { ProductSuggestionPayload, Salesperson } from '../types';

const ProductSuggestionForm: React.FC = () => {
    const navigate = useNavigate();
    const [salesperson, setSalesperson] = useState('');
    const [productName, setProductName] = useState('');
    const [estimatedCost, setEstimatedCost] = useState<number | ''>('');
    const [minQuantity, setMinQuantity] = useState<number | ''>('');
    const [niche, setNiche] = useState<'Sorveteria' | 'Padaria' | 'Açaí' | 'Outro'>('Padaria');
    const [estimatedSale, setEstimatedSale] = useState('');
    const [supplier, setSupplier] = useState('');
    const [contact, setContact] = useState('');
    const [eanOrLink, setEanOrLink] = useState('');
    const [objective, setObjective] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
    const [submitMessage, setSubmitMessage] = useState('');

    const [salespeople, setSalespeople] = useState<Salesperson[]>([]);

    useEffect(() => {
        // Pre-fill salesperson from quotation form session data
        setSalesperson(sessionStorage.getItem('form_salesperson') || '');
        // Load salespeople for datalist
        getSalespeople().then(setSalespeople);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!salesperson || !productName || !objective) {
            setSubmitStatus('error');
            setSubmitMessage('Falha ao enviar. Vendedor, Nome do Produto e Objetivo são obrigatórios.');
            setTimeout(() => setSubmitStatus(null), 5000);
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus(null);

        const payload: ProductSuggestionPayload = {
            type: 'sugestao_produto',
            sugestao: {
                submissionDate: new Date().toISOString().split('T')[0],
                salesperson,
                productName,
                estimatedCost,
                minQuantity,
                niche,
                estimatedSale,
                supplier,
                contact,
                eanOrLink,
                objective
            }
        };

        console.log("Submitting payload:", JSON.stringify(payload, null, 2));
        const response = await postDataToSheet(payload);

        if (response.ok) {
            setSubmitStatus('success');
            setSubmitMessage('Sugestão enviada com sucesso! Redirecionando...');
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } else {
            setSubmitStatus('error');
            setSubmitMessage(response.message || 'Falha ao enviar. Tente novamente.');
            setTimeout(() => setSubmitStatus(null), 5000);
        }
        
        setIsSubmitting(false);
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            <FormHeader />
            <main className="container mx-auto p-4 md:p-6 lg:p-8">
                <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl mx-auto">
                    <h1 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-4">Formulário de Sugestão de Produto</h1>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Vendedor</label>
                            <input
                                type="text"
                                list="all-salespeople-list"
                                value={salesperson}
                                onChange={e => setSalesperson(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                placeholder="Seu nome de vendedor"
                                required
                            />
                            <datalist id="all-salespeople-list">
                                {salespeople.map(v => <option key={v.name} value={v.name} />)}
                            </datalist>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Nome do Produto</label>
                                <input type="text" value={productName} onChange={e => setProductName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" required />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Nicho</label>
                                <select value={niche} onChange={e => setNiche(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-md">
                                    <option>Sorveteria</option>
                                    <option>Padaria</option>
                                    <option>Açaí</option>
                                    <option>Outro</option>
                                </select>
                            </div>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Custo Estimado (R$)</label>
                                <input type="number" step="0.01" value={estimatedCost} onChange={e => setEstimatedCost(Number(e.target.value) || '')} className="w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Qtd. Mínima (un)</label>
                                <input type="number" value={minQuantity} onChange={e => setMinQuantity(Number(e.target.value) || '')} className="w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Venda Estimada (ex: 10 caixas/mês)</label>
                            <input type="text" value={estimatedSale} onChange={e => setEstimatedSale(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Fornecedor/Fabricante</label>
                                <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Telefone/Contato</label>
                                <input type="text" value={contact} onChange={e => setContact(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">EAN/Link do Produto</label>
                            <input type="text" value={eanOrLink} onChange={e => setEanOrLink(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Objetivo da Indicação</label>
                            <textarea value={objective} onChange={e => setObjective(e.target.value)} rows={4} className="w-full p-2 border border-gray-300 rounded-md" required></textarea>
                        </div>
                        
                        <div className="pt-4 flex flex-col items-end">
                            {submitStatus && (
                                <div className={`p-3 mb-4 w-full text-center text-sm rounded-lg ${submitStatus === 'success' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`} role="alert">
                                    {submitMessage}
                                </div>
                            )}
                            
                            <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-secondary disabled:bg-gray-400">
                                {isSubmitting ? (
                                    <><i className="fas fa-spinner fa-spin mr-2"></i> Enviando...</>
                                ) : (
                                    <><i className="fas fa-paper-plane mr-2"></i> Enviar Sugestão</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default ProductSuggestionForm;
