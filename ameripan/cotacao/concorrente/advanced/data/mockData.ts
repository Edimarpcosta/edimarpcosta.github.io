
import { Product, Supervisor, Salesperson, User } from '../types';

export const MOCK_PRODUCTS: Product[] = [
    { sku: 'P001', name: 'Leite Condensado 395g' },
    { sku: 'P002', name: 'Creme de Leite 200g' },
    { sku: 'P003', name: 'Achocolatado em Pó 400g' },
    { sku: 'P004', name: 'Farinha de Trigo 1kg' },
    { sku: 'P005', name: 'Óleo de Soja 900ml' },
    { sku: 'P006', name: 'Arroz Branco 5kg' },
    { sku: 'P007', name: 'Feijão Carioca 1kg' },
    { sku: 'P008', name: 'Açúcar Refinado 1kg' },
    { sku: 'P009', name: 'Café Torrado e Moído 500g' },
    { sku: 'P010', name: 'Macarrão Espaguete 500g' },
];

export const MOCK_SUPERVISORS: Supervisor[] = [
    { name: 'Carlos Andrade' },
    { name: 'Fernanda Lima' },
    { name: 'Ricardo Souza' },
];

export const MOCK_SALESPEOPLE: Salesperson[] = [
    { name: 'Ana Pereira', supervisor: 'Carlos Andrade' },
    { name: 'Bruno Costa', supervisor: 'Carlos Andrade' },
    { name: 'Clara Dias', supervisor: 'Fernanda Lima' },
    { name: 'Daniel Alves', supervisor: 'Fernanda Lima' },
    { name: 'Eduarda Rocha', supervisor: 'Ricardo Souza' },
    { name: 'Fábio Martins', supervisor: 'Ricardo Souza' },
];

export const MOCK_USERS: User[] = [
    { username: 'admin', password: 'password123' },
    { username: 'gerente', password: 'bi' },
];

// Mocked data for dashboard
export const MOCK_QUOTATIONS_DATA = [
    { "Data Envio": "2024-07-28", "Data Cotação": "2024-07-28", "Supervisor": "Carlos Andrade", "Vendedor": "Ana Pereira", "Cidade": "São Paulo", "Cliente": "Padaria do Zé", "Concorrente": "Atacadão Dia a Dia", "Cod. Produto": "P001", "Nome Produto": "Leite Condensado 395g", "Preço Flex": 5.50, "Custo": 4.20, "Preço Concorrente": 5.30, "Link Foto NF": "", "Venda Perdida": "TRUE" },
    { "Data Envio": "2024-07-28", "Data Cotação": "2024-07-28", "Supervisor": "Carlos Andrade", "Vendedor": "Ana Pereira", "Cidade": "São Paulo", "Cliente": "Padaria do Zé", "Concorrente": "Atacadão Dia a Dia", "Cod. Produto": "P002", "Nome Produto": "Creme de Leite 200g", "Preço Flex": 3.20, "Custo": 2.50, "Preço Concorrente": 3.10, "Link Foto NF": "", "Venda Perdida": "FALSE" },
    { "Data Envio": "2024-07-27", "Data Cotação": "2024-07-27", "Supervisor": "Fernanda Lima", "Vendedor": "Clara Dias", "Cidade": "Rio de Janeiro", "Cliente": "Mercado Central", "Concorrente": "Preço Bom", "Cod. Produto": "P005", "Nome Produto": "Óleo de Soja 900ml", "Preço Flex": 8.00, "Custo": 6.80, "Preço Concorrente": 7.80, "Link Foto NF": "", "Venda Perdida": "TRUE" },
    { "Data Envio": "2024-07-27", "Data Cotação": "2024-07-27", "Supervisor": "Ricardo Souza", "Vendedor": "Eduarda Rocha", "Cidade": "Belo Horizonte", "Cliente": "Sorveteria Gelada", "Concorrente": "Atacadão Dia a Dia", "Cod. Produto": "P003", "Nome Produto": "Achocolatado em Pó 400g", "Preço Flex": 9.50, "Custo": 7.50, "Preço Concorrente": 9.80, "Link Foto NF": "", "Venda Perdida": "FALSE" },
    { "Data Envio": "2024-07-26", "Data Cotação": "2024-07-26", "Supervisor": "Carlos Andrade", "Vendedor": "Bruno Costa", "Cidade": "São Paulo", "Cliente": "Restaurante Sabor", "Concorrente": "Preço Bom", "Cod. Produto": "P006", "Nome Produto": "Arroz Branco 5kg", "Preço Flex": 25.00, "Custo": 21.00, "Preço Concorrente": 24.50, "Link Foto NF": "", "Venda Perdida": "TRUE" },
];

export const MOCK_PRODUCT_SUGGESTIONS = [
    { "Data Sugestão": "2024-07-25", "Vendedor": "Ana Pereira", "Nome Produto": "Granola Premium 500g", "Custo Estimado": 12.00, "Qtd Mínima": 50, "Nicho": "Padaria", "Venda Estimada": "100 un/mês", "Fornecedor/Fabricante": "NutriVida", "Telefone/Contato": "11 98765-4321", "EAN/Link": "7890123456789", "Objetivo da Indicação": "Clientes estão pedindo opções mais saudáveis para o café da manhã." },
    { "Data Sugestão": "2024-07-24", "Vendedor": "Clara Dias", "Nome Produto": "Polpa de Açaí Congelada 1kg", "Custo Estimado": 15.00, "Qtd Mínima": 100, "Nicho": "Açaí", "Venda Estimada": "200 un/mês", "Fornecedor/Fabricante": "Açaí da Amazônia", "Telefone/Contato": "21 91234-5678", "EAN/Link": "amazon-acai.com", "Objetivo da Indicação": "Aumentar o portfólio para lojas de açaí, que estão em alta na região." },
];

export const MOCK_IDEA_SUGGESTIONS = [
    { "Data Envio": "2024-07-28", "Vendedor": "Bruno Costa", "Categoria": "Melhoria de Sistema", "Título da Ideia": "App de Vendas com Roteirização", "Descrição do Problema/Ideia": "Perdemos muito tempo planejando as rotas de visita. O sistema atual não otimiza o trajeto, gerando gastos com combustível e perda de tempo.", "Sugestão de Solução": "Integrar uma API de mapas (como Google Maps) ao nosso sistema de vendas para criar rotas otimizadas automaticamente com base na agenda de visitas do dia." },
    { "Data Envio": "2024-07-26", "Vendedor": "Eduarda Rocha", "Categoria": "Problema de Processo", "Título da Ideia": "Aprovação de Descontos Lenta", "Descrição do Problema/Ideia": "O processo para aprovar um desconto especial é muito burocrático e lento. Preciso ligar para o supervisor, que precisa de outra aprovação. Às vezes, perdemos a venda por causa da demora.", "Sugestão de Solução": "Criar um workflow de aprovação no sistema onde o vendedor solicita, o supervisor aprova pelo celular e a gerência é notificada. Definir alçadas de aprovação automática para descontos pequenos." },
    { "Data Envio": "2024-07-22", "Vendedor": "Ana Pereira", "Categoria": "Oportunidade de Produto", "Título da Ideia": "Kit Festa Pronta", "Descrição do Problema/Ideia": "Muitas padarias estão vendendo 'kits festa' com bolo, salgados e doces. Não temos uma solução completa para isso, vendemos apenas os ingredientes separados.", "Sugestão de Solução": "Desenvolver um catálogo de 'kits' com produtos do nosso portfólio (ex: mistura para bolo, recheios, confeitos, etc.) e oferecer como uma solução completa para nossos clientes de padaria." },
];
