
import React from 'react';
import FormHeader from './FormHeader';

const TutorialCard: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-primary mb-4">
            <i className={`fas ${icon} mr-3`}></i>{title}
        </h2>
        <div className="text-gray-700 space-y-2">
            {children}
        </div>
    </div>
);

const TutorialFormularios: React.FC = () => {
    return (
        <div className="bg-gray-50 min-h-screen">
            <FormHeader />
            <main className="container mx-auto p-4 md:p-6 lg:p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-extrabold text-gray-800">Guia de Uso dos Formulários</h1>
                    <p className="text-lg text-gray-600 mt-2">Como preencher os dados de campo corretamente.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <TutorialCard title="Formulário de Cotação" icon="fa-dollar-sign">
                        <p><strong>Objetivo:</strong> Registrar preços de produtos praticados por concorrentes no ponto de venda.</p>
                        <p><strong>Passo 1: Cabeçalho:</strong> Preencha a data da cotação, seu supervisor, seu nome, a cidade e o concorrente. O campo "Cliente" é opcional.</p>
                        <p><strong>Dica:</strong> Use os botões "Salvar Cabeçalho" para guardar seus dados (supervisor, vendedor, cidade) no navegador e agilizar preenchimentos futuros.</p>
                        <p><strong>Passo 2: Tabela de Produtos:</strong> Para cada produto, preencha o código (SKU) ou busque pelo nome. Informe o "Preço Flex" (nosso preço), "Custo", e o "Preço Concorrente" encontrado.</p>
                        <p><strong>Venda Perdida?:</strong> Marque "Sim" se deixamos de vender por causa do preço do concorrente.</p>
                        <p><strong>Verificar Imagem:</strong> Clique no campo "Cód. Produto" de uma linha para ver a imagem correspondente do produto.</p>
                    </TutorialCard>

                    <TutorialCard title="Formulário de Sugestão de Produto" icon="fa-lightbulb">
                        <p><strong>Objetivo:</strong> Indicar novos produtos para adicionarmos ao nosso portfólio.</p>
                        <p><strong>Como preencher:</strong> Seu nome de vendedor já vem preenchido. Informe o nome do produto que você viu no mercado, o nicho dele e uma estimativa de custo e potencial de venda.</p>
                        <p><strong>Informações Cruciais:</strong> Se possível, adicione dados do fornecedor/fabricante, um contato e um link ou código de barras (EAN). O campo mais importante é o "Objetivo da Indicação", onde você explica por que esse produto seria uma boa adição.</p>
                    </TutorialCard>

                    <TutorialCard title="Formulário de Sugestão de Ideias" icon="fa-brain">
                        <p><strong>Objetivo:</strong> Coletar feedback e ideias para melhorar processos, sistemas ou qualquer outra área da empresa.</p>
                        <p><strong>Categoria:</strong> Selecione o tipo de ideia que você está enviando. Isso ajuda a direcionar a sugestão para a equipe correta.</p>
                        <p><strong>Título:</strong> Crie um título curto e claro para sua ideia. Ex: "Melhorar Rota de Visitas".</p>
                        <p><strong>Descrição:</strong> Detalhe o problema que você identificou ou a ideia que você teve. Seja específico.</p>
                        <p><strong>Solução (Opcional):</strong> Se tiver uma sugestão de como resolver o problema, descreva aqui.</p>
                    </TutorialCard>
                </div>
                 <div className="text-center mt-12">
                    <a href="#/" className="px-6 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-secondary">
                        &larr; Voltar para o Formulário de Cotação
                    </a>
                </div>
            </main>
        </div>
    );
};

export default TutorialFormularios;
