import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../App';
import { getQuotations, getProductSuggestions, getIdeaSuggestions } from '../services/googleSheetsService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getAIAnalysis } from '../services/geminiService';
import type { ChatMessage } from '../types';

// --- Helper Functions ---
const parseLostSale = (value: any) => !['N', 'NÃO', 'FALSE'].includes(String(value).toUpperCase());

const calculateMargins = (item: any) => {
    const flexPrice = Number(item['Preço Flex']) || 0;
    const cost = Number(item['Custo']) || 0;
    const competitorPrice = Number(item['Preço Concorrente']) || 0;

    const myMargin = flexPrice > 0 ? (flexPrice - cost) / flexPrice : 0;
    const coverMargin = competitorPrice > 0 ? (competitorPrice - cost) / competitorPrice : 0;

    return { myMargin, coverMargin };
};


// --- Sub-components for Dashboard Sections ---

const KpiCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${color}`}>
            <i className={`fas ${icon} text-white text-xl`}></i>
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const AnalysisAssistant: React.FC<{
    quotationsData: any[];
    productSuggestionsData: any[];
    ideaSuggestionsData: any[];
}> = ({ quotationsData, productSuggestionsData, ideaSuggestionsData }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { sender: 'ai', text: 'Olá! Como posso ajudar a analisar os dados comerciais hoje?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;
        
        const userMessage: ChatMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        
        try {
            const aiResponse = await getAIAnalysis(
                input, 
                quotationsData, 
                productSuggestionsData, 
                ideaSuggestionsData
            );
            const aiMessage: ChatMessage = { sender: 'ai', text: aiResponse };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = { sender: 'ai', text: 'Desculpe, ocorreu um erro ao processar sua solicitação.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-white p-4 rounded-lg shadow-md flex flex-col h-[70vh]">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Assistente de Análise (Gemini AI)</h3>
            <div className="flex-grow overflow-y-auto mb-4 p-2 bg-gray-50 rounded-md">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
                        <div className={`max-w-xs md:max-w-md lg:max-w-2xl p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                           {msg.text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex justify-start mb-3">
                         <div className="max-w-xs p-3 rounded-lg bg-gray-200 text-gray-800">
                             <i className="fas fa-spinner fa-spin"></i> Analisando...
                         </div>
                     </div>
                )}
            </div>
            <div className="flex">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Pergunte sobre as vendas, perdas, ideias..." 
                    className="flex-grow p-2 border rounded-l-md focus:ring-primary focus:border-primary"
                    disabled={isLoading}
                />
                <button onClick={handleSend} disabled={isLoading} className="px-4 py-2 bg-primary text-white rounded-r-md hover:bg-secondary disabled:bg-gray-400">
                    <i className="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    );
};

const QuotationsAnalysisView: React.FC<{data: any[]}> = ({ data }) => {
    const [activeView, setActiveView] = useState('resumo');
    
    const processedData = useMemo(() => data.map(item => ({
        ...item,
        lost: parseLostSale(item['Venda Perdida']),
        ...calculateMargins(item),
    })), [data]);

    const summaryKpis = useMemo(() => {
        const totalQuotes = processedData.length;
        const totalLost = processedData.filter(d => d.lost).length;
        const lossRate = totalQuotes > 0 ? (totalLost / totalQuotes) * 100 : 0;
        const totalValueLost = processedData.filter(d => d.lost).reduce((acc, item) => acc + (Number(item['Preço Concorrente']) || 0), 0);
        return { totalQuotes, totalLost, lossRate, totalValueLost };
    }, [processedData]);

    const menuItems = [
        { id: 'resumo', name: 'Resumo Geral', icon: 'fa-tachometer-alt' },
        { id: 'analise_vendedores', name: 'Análise Vendedores', icon: 'fa-users' },
        { id: 'analise_cidades', name: 'Análise Cidades', icon: 'fa-map-marked-alt' },
        { id: 'relatorio_detalhado', name: 'Relatório Detalhado', icon: 'fa-table' },
    ];
    
    const renderContent = () => {
         switch(activeView) {
            case 'resumo':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KpiCard title="Total de Cotações" value={summaryKpis.totalQuotes.toString()} icon="fa-file-invoice-dollar" color="bg-blue-500" />
                        <KpiCard title="Vendas Perdidas" value={summaryKpis.totalLost.toString()} icon="fa-arrow-trend-down" color="bg-red-500" />
                        <KpiCard title="Taxa de Perda" value={`${summaryKpis.lossRate.toFixed(1)}%`} icon="fa-percent" color="bg-orange-500" />
                        <KpiCard title="Valor Perdido (Est.)" value={`R$ ${summaryKpis.totalValueLost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon="fa-hand-holding-dollar" color="bg-yellow-500" />
                    </div>
                );
            default:
                return <div className="text-center p-8 bg-white rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold">Em Desenvolvimento</h2>
                    <p className="text-gray-500">Esta seção do painel ainda está sendo construída.</p>
                </div>;
        }
    };
    
    return (
        <div className="flex h-full">
             <nav className="w-64 bg-white p-4 shadow-lg rounded-lg mr-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Análises</h3>
                <ul className="space-y-2">
                    {menuItems.map(item => (
                         <li key={item.id}>
                            <a href="#" onClick={(e) => { e.preventDefault(); setActiveView(item.id);}} className={`flex items-center p-2 rounded-md text-sm transition-colors ${activeView === item.id ? 'bg-blue-100 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>
                                <i className={`fas ${item.icon} w-6 text-center mr-3`}></i>
                                <span>{item.name}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="flex-1">
                {renderContent()}
            </div>
        </div>
    )
};


const ProductSuggestionsView: React.FC<{data: any[]}> = ({ data }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiCard title="Total de Sugestões" value={data.length.toString()} icon="fa-lightbulb" color="bg-green-500" />
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="font-semibold mb-2 text-gray-800">Tabela de Sugestões de Produtos</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Data</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Vendedor</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Produto</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Nicho</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Objetivo</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Fornecedor</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((item, index) => (
                            <tr key={index}>
                                <td className="px-4 py-2 whitespace-nowrap">{item["Data Sugestão"]}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{item.Vendedor}</td>
                                <td className="px-4 py-2 whitespace-nowrap font-semibold">{item["Nome Produto"]}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{item.Nicho}</td>
                                <td className="px-4 py-2">{item["Objetivo da Indicação"]}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{item["Fornecedor/Fabricante"]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);


const IdeaSuggestionsView: React.FC<{data: any[]}> = ({ data }) => {
    const ideasByCategory = useMemo(() => {
        const counts = data.reduce((acc, idea) => {
            const category = idea['Categoria'] || 'Sem Categoria';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [data]);
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title="Total de Ideias Enviadas" value={data.length.toString()} icon="fa-brain" color="bg-purple-500" />
                <div className="md:col-span-2 bg-white p-4 rounded-lg shadow-md">
                    <h3 className="font-semibold mb-2 text-gray-800">Ideias por Categoria</h3>
                    <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                            <Pie data={ideasByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8" label>
                                {ideasByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="font-semibold mb-2 text-gray-800">Tabela de Ideias</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Data</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Vendedor</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Categoria</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Título</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Descrição</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.map((idea, index) => (
                                <tr key={index}>
                                    <td className="px-4 py-2 whitespace-nowrap">{idea["Data Envio"]}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{idea.Vendedor}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{idea.Categoria}</td>
                                    <td className="px-4 py-2 font-semibold">{idea["Título da Ideia"]}</td>
                                    <td className="px-4 py-2">{idea["Descrição do Problema/Ideia"]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


// --- Main Dashboard Component ---
const Dashboard: React.FC = () => {
    const { logout } = useAuth();
    const [mainView, setMainView] = useState<'cotacoes' | 'oportunidades' | 'ideias' | 'assistente'>('cotacoes');
    
    // State for live data
    const [quotationsData, setQuotationsData] = useState<any[]>([]);
    const [productSuggestionsData, setProductSuggestionsData] = useState<any[]>([]);
    const [ideaSuggestionsData, setIdeaSuggestionsData] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            setIsLoadingData(true);
            try {
                const [quotes, products, ideas] = await Promise.all([
                    getQuotations(),
                    getProductSuggestions(),
                    getIdeaSuggestions(),
                ]);
                setQuotationsData(quotes);
                setProductSuggestionsData(products);
                setIdeaSuggestionsData(ideas);
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                setIsLoadingData(false);
            }
        };
        loadDashboardData();
    }, []);

    const renderMainView = () => {
        if (isLoadingData) {
            return (
                <div className="flex justify-center items-center h-full">
                    <div className="text-center">
                        <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
                        <p className="text-lg text-gray-600">Carregando dados do painel...</p>
                    </div>
                </div>
            );
        }

        switch(mainView) {
            case 'cotacoes':
                return <QuotationsAnalysisView data={quotationsData} />;
            case 'oportunidades':
                return <ProductSuggestionsView data={productSuggestionsData} />;
            case 'ideias':
                return <IdeaSuggestionsView data={ideaSuggestionsData} />;
            case 'assistente':
                 return <AnalysisAssistant 
                    quotationsData={quotationsData} 
                    productSuggestionsData={productSuggestionsData}
                    ideaSuggestionsData={ideaSuggestionsData} 
                />;
            default:
                return <div>Selecione uma visão</div>;
        }
    }
    
    const mainViews = [
        { id: 'cotacoes', name: 'Análise de Cotações', icon: 'fa-chart-line' },
        { id: 'oportunidades', name: 'Banco de Oportunidades', icon: 'fa-lightbulb' },
        { id: 'ideias', name: 'Banco de Ideias', icon: 'fa-brain' },
        { id: 'assistente', name: 'Assistente de Análise', icon: 'fa-robot' },
    ]

    return (
        <div className="flex h-screen bg-gray-100">
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex justify-between items-center p-4 bg-white border-b shadow-sm">
                    <div className="flex items-center">
                        <i className="fas fa-chart-pie text-2xl text-primary mr-3"></i>
                        <h1 className="text-xl font-bold text-gray-800">BI Comercial</h1>
                    </div>
                    <div className="flex items-center space-x-2">
                        {mainViews.map(view => (
                             <button key={view.id} onClick={() => setMainView(view.id as any)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${mainView === view.id ? 'bg-primary text-white shadow' : 'text-gray-600 hover:bg-blue-100'}`}>
                                <i className={`fas ${view.icon} mr-2`}></i>
                                {view.name}
                             </button>
                        ))}
                    </div>
                    <div>
                         <a href="#/" className="text-gray-600 hover:text-primary mr-4" title="Voltar ao Formulário">
                            <i className="fas fa-arrow-left"></i>
                        </a>
                         <a href="#/dashboard/tutorial" target="_blank" className="text-gray-600 hover:text-primary mr-4" title="Ajuda">
                           <i className="fas fa-question-circle"></i>
                        </a>
                        <button onClick={logout} className="text-gray-600 hover:text-red-500" title="Sair">
                            <i className="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                    {renderMainView()}
                </main>
            </div>
        </div>
    );
};

export default Dashboard;