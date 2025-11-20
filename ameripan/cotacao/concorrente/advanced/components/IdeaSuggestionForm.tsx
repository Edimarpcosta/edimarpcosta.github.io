import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FormHeader from './FormHeader';
import { getSalespeople, postDataToSheet } from '../services/googleSheetsService';
import type { IdeaSuggestionPayload, Salesperson } from '../types';

const IdeaSuggestionForm: React.FC = () => {
    const navigate = useNavigate();
    const [salesperson, setSalesperson] = useState('');
    const [category, setCategory] = useState<'Problema de Processo' | 'Melhoria de Sistema' | 'Oportunidade de Produto' | 'Ideia Geral'>('Ideia Geral');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [solution, setSolution] = useState('');

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

        if (!salesperson || !title || !description) {
            setSubmitStatus('error');
            setSubmitMessage('Falha ao enviar. Vendedor, Título e Descrição são obrigatórios.');
            setTimeout(() => setSubmitStatus(null), 5000);
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus(null);

        const payload: IdeaSuggestionPayload = {
            type: 'sugestao_ideia',
            ideia: {
                submissionDate: new Date().toISOString().split('T')[0],
                salesperson,
                category,
                title,
                description,
                solution,
            }
        };

        console.log("Submitting payload:", JSON.stringify(payload, null, 2));
        const response = await postDataToSheet(payload);

        if (response.ok) {
            setSubmitStatus('success');
            setSubmitMessage('Ideia enviada com sucesso! Redirecionando...');
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
                    <h1 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-4">Formulário de Sugestão de Ideias</h1>
                    
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
                                <label className="block text-sm font-medium text-gray-600 mb-1">Categoria</label>
                                <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-md">
                                    <option>Problema de Processo</option>
                                    <option>Melhoria de Sistema</option>
                                    <option>Oportunidade de Produto</option>
                                    <option>Ideia Geral</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Título da Ideia</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Descreva a Ideia ou Problema</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} className="w-full p-2 border border-gray-300 rounded-md" required></textarea>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Sugestão de Solução (Opcional)</label>
                            <textarea value={solution} onChange={e => setSolution(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-md"></textarea>
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
                                    <><i className="fas fa-paper-plane mr-2"></i> Enviar Ideia</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default IdeaSuggestionForm;
