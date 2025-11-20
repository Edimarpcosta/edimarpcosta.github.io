
import React from 'react';

const TutorialDashboard: React.FC = () => {
    return (
        <div className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <i className="fas fa-book-open text-5xl text-primary mb-4"></i>
                    <h1 className="text-4xl font-extrabold text-gray-800">Guia de Análise do Painel de BI</h1>
                    <p className="text-lg text-gray-600 mt-2">Entendendo os indicadores e gráficos.</p>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-2xl font-bold text-gray-700 mb-3">Conceitos e Fórmulas</h2>
                        <div className="space-y-2 text-gray-600">
                            <p><strong>Venda Perdida:</strong> Considera-se "perdida" uma venda quando o campo está marcado como 'TRUE', 'S' ou está vazio na planilha. 'FALSE' ou 'N' indicam que a venda não foi perdida.</p>
                            <p><strong>Minha Margem:</strong> Mostra a lucratividade do nosso preço de venda.</p>
                            <p className="pl-4 font-mono text-sm bg-gray-100 p-2 rounded"> (Preço Flex - Custo) / Preço Flex </p>
                            <p><strong>Margem p/ Cobrir:</strong> Mostra a margem que teríamos se praticássemos o mesmo preço do concorrente.</p>
                            <p className="pl-4 font-mono text-sm bg-gray-100 p-2 rounded"> (Preço Concorrente - Custo) / Preço Concorrente </p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-2xl font-bold text-gray-700 mb-3">Seções do Painel</h2>
                        <ul className="list-disc list-inside space-y-3 text-gray-600">
                            <li>
                                <strong>Resumo Geral:</strong> Visão rápida dos principais indicadores (KPIs), como total de cotações, número de vendas perdidas, taxa de perda percentual e o valor total estimado que deixamos de faturar para os concorrentes.
                            </li>
                            <li>
                                <strong>Análise Vendedores/Cidades/Concorrentes:</strong> Gráficos que detalham a performance e as perdas por cada uma dessas dimensões, permitindo identificar onde estão os maiores desafios.
                            </li>
                            <li>
                                <strong>Banco de Oportunidades:</strong> Uma tabela com todas as sugestões de novos produtos enviadas pela equipe de campo. Use para identificar tendências e demandas do mercado.
                            </li>
                             <li>
                                <strong>Banco de Ideias (NOVO):</strong> Centraliza todas as ideias de melhoria. Possui um KPI de total de ideias, um gráfico de pizza mostrando a distribuição por categoria e uma tabela detalhada para análise e priorização.
                            </li>
                            <li>
                                <strong>Relatório Detalhado:</strong> A tabela completa com todos os dados brutos de cotação. Permite ordenação por coluna e exportação para Excel para análises mais profundas.
                            </li>
                            <li>
                                <strong>Assistente de Análise (IA):</strong> Um chat onde você pode fazer perguntas em linguagem natural sobre os dados (cotações, ideias, etc.). A IA irá analisar as informações e fornecer respostas para ajudar na sua tomada de decisão.
                            </li>
                        </ul>
                    </div>
                </div>

                 <div className="text-center mt-12">
                    <a href="#/dashboard" className="px-6 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-secondary">
                        &larr; Voltar para o Dashboard
                    </a>
                </div>
            </div>
        </div>
    );
};

export default TutorialDashboard;
