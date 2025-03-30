/**
 * Catálogo de Treinamento - Ameripan
 * Script principal para funcionalidades do catálogo
 */

// Banco de dados dos produtos (simulado)
let todosProdutos = [];
let produtosFiltrados = [];
let categoriasProdutos = {
    emulsificantes: [],
    estabilizantes: [],
    saborizantes: [],
    bases: [],
    coberturas: [],
    chocolates: [],
    pastas: [],
    variegatos: [],
    acai: [],
    insumos: []
};

// Mapeamento de categorias
const mapeamentoCategorias = {
    "Emulsificantes": "emulsificantes",
    "Estabilizantes": "estabilizantes",
    "Saborizantes": "saborizantes",
    "Bases para Sorvetes": "bases",
    "Coberturas": "coberturas",
    "Chocolates": "chocolates",
    "Pastas e Cremes": "pastas",
    "Variegatos": "variegatos",
    "Produtos para Açaí": "acai",
    "Insumos Gerais": "insumos"
};

// Funções de utilidade
function formatarPreco(preco) {
    if (!preco) return '';
    return preco.replace('R$ ', '').trim();
}

function obterCategoriaProduto(produto) {
    // Lógica para determinar a categoria baseada nas informações do produto
    const nome = produto.marca.toLowerCase();
    const sku = produto.sku.toString();
    
    if (nome.includes('emustab') || nome.includes('emulsificante')) {
        return 'emulsificantes';
    } else if (nome.includes('liga neutra') || nome.includes('super liga') || nome.includes('estabilizante') || nome.includes('aqua 5') || sku === '555' || sku === '559') {
        return 'estabilizantes';
    } else if (nome.includes('algemix') || nome.includes('saborizante') || (nome.includes('selecta') && nome.includes('tropical'))) {
        return 'saborizantes';
    } else if (nome.includes('base zero') || nome.includes('base neutra') || nome.includes('leve zero') || nome.includes('gelato')) {
        return 'bases';
    } else if (nome.includes('cobertura') || nome.includes('esquimó') || nome.includes('supreme')) {
        return 'coberturas';
    } else if (nome.includes('chocolate') || nome.includes('cacau')) {
        return 'chocolates';
    } else if (nome.includes('pasta') || nome.includes('creme') || nome.includes('chocolat')) {
        return 'pastas';
    } else if (nome.includes('variegato') || nome.includes('marmoreio')) {
        return 'variegatos';
    } else if (nome.includes('açaí') || nome.includes('acai')) {
        return 'acai';
    } else {
        return 'insumos';
    }
}

function obterDetalhes(produto) {
    // Adiciona informações detalhadas ao produto
    const categoria = obterCategoriaProduto(produto);
    let descricao = '';
    let caracteristicas = [];
    let aplicacoes = [];
    
    // Definindo descrição e características com base na categoria
    switch (categoria) {
        case 'emulsificantes':
            descricao = 'Emulsificante para sorvetes que proporciona cremosidade, estabilidade e melhor textura ao produto final.';
            caracteristicas = [
                'Melhora a incorporação de ar (overrun)',
                'Proporciona textura cremosa e macia',
                'Evita a separação de ingredientes',
                'Prolonga a vida útil do produto'
            ];
            aplicacoes = [
                'Sorvetes de massa',
                'Picolés cremosos',
                'Sobremesas geladas'
            ];
            break;
        case 'estabilizantes':
            descricao = 'Estabilizante que previne a formação de cristais de gelo e garante melhor conservação do sorvete durante o armazenamento.';
            caracteristicas = [
                'Previne a formação de cristais de gelo',
                'Melhora a estabilidade durante o armazenamento',
                'Proporciona melhor resistência ao derretimento',
                'Melhora a textura e corpo do sorvete'
            ];
            aplicacoes = [
                'Sorvetes artesanais e industriais',
                'Sorbets e produtos à base de água',
                'Sobremesas geladas em geral'
            ];
            break;
        case 'saborizantes':
            descricao = 'Saborizante em pó que confere sabor e aroma intensos aos sorvetes e sobremesas.';
            caracteristicas = [
                'Sabor e aroma intensos e consistentes',
                'Facilidade de armazenamento e dosagem',
                'Longa validade',
                'Coloração característica'
            ];
            aplicacoes = [
                'Sorvetes de massa',
                'Milk shakes',
                'Sobremesas geladas diversas'
            ];
            break;
        case 'bases':
            descricao = 'Base para sorvetes que facilita o preparo, garantindo textura, cremosidade e estabilidade adequadas ao produto final.';
            caracteristicas = [
                'Padronização dos produtos',
                'Facilidade e rapidez no preparo',
                'Resultados consistentes e de alta qualidade'
            ];
            aplicacoes = [
                'Sorvetes artesanais',
                'Gelatos',
                'Produtos para públicos específicos'
            ];
            break;
        case 'coberturas':
            descricao = 'Cobertura para finalização de sorvetes, sundaes e sobremesas geladas, com sabor característico e excelente fluidez.';
            caracteristicas = [
                'Excelente fluidez',
                'Sabor intenso',
                'Visual atraente',
                'Versátil para diversas aplicações'
            ];
            aplicacoes = [
                'Finalização de sorvetes e sundaes',
                'Decoração de sobremesas',
                'Criação de produtos especiais'
            ];
            break;
        case 'chocolates':
            descricao = 'Produto de chocolate premium para aplicação em sorvetes, proporcionando sabor intenso e refinado.';
            caracteristicas = [
                'Sabor intenso e refinado',
                'Qualidade premium',
                'Versatilidade de aplicação'
            ];
            aplicacoes = [
                'Sorvetes gourmet',
                'Produtos premium',
                'Finalização de sobremesas especiais'
            ];
            break;
        case 'pastas':
            descricao = 'Pasta concentrada para a produção de sorvetes e sobremesas cremosas, com sabor intenso e autêntico.';
            caracteristicas = [
                'Sabor concentrado e autêntico',
                'Fácil incorporação',
                'Resultados consistentes',
                'Textura cremosa'
            ];
            aplicacoes = [
                'Sorvetes especiais e diferenciados',
                'Recheios para produtos de confeitaria',
                'Milk shakes gourmet'
            ];
            break;
        case 'variegatos':
            descricao = 'Variegato para marmoreio de sorvetes, proporcionando sabor intenso e visual atraente ao produto final.';
            caracteristicas = [
                'Visual atraente e diferenciado',
                'Combinação de sabores e texturas',
                'Eleva o valor percebido do produto'
            ];
            aplicacoes = [
                'Marmoreio de sorvetes',
                'Criação de camadas em sobremesas',
                'Desenvolvimento de produtos premium'
            ];
            break;
        case 'acai':
            descricao = 'Produto específico para açaiterias, que proporciona melhor textura, sabor e estabilidade ao açaí e suas variações.';
            caracteristicas = [
                'Melhora a textura e consistência do açaí',
                'Prolonga a vida útil do produto',
                'Facilita o preparo e padronização'
            ];
            aplicacoes = [
                'Açaí tradicional',
                'Mixes de açaí com frutas',
                'Sobremesas especiais à base de açaí'
            ];
            break;
        case 'insumos':
            descricao = 'Insumo complementar para a produção de sorvetes, açaí e outras sobremesas geladas.';
            caracteristicas = [
                'Facilita a produção',
                'Melhora características específicas dos produtos',
                'Garante resultados consistentes'
            ];
            aplicacoes = [
                'Produção de sorvetes e sobremesas',
                'Processos específicos de fabricação',
                'Melhoramento de características sensoriais'
            ];
            break;
    }
    
    // Ajustando informações com base no nome específico do produto
    if (produto.marca.toLowerCase().includes('zero')) {
        caracteristicas.push('Livre de lactose');
        aplicacoes.push('Produtos para públicos com intolerância à lactose');
    }
    
    if (produto.marca.toLowerCase().includes('premium')) {
        caracteristicas.push('Qualidade premium');
        caracteristicas.push('Ingredientes selecionados');
        aplicacoes.push('Produtos gourmet e de alta gastronomia');
    }
    
    return {
        ...produto,
        categoria,
        descricao,
        caracteristicas,
        aplicacoes,
        fornecedor: determinaFornecedor(produto)
    };
}

function determinaFornecedor(produto) {
    const nome = produto.marca.toLowerCase();
    
    if (nome.includes('selecta') || nome.includes('algemix') || nome.includes('aqua 5')) {
        return 'Selecta';
    } else if (nome.includes('duas rodas') || nome.includes('emustab')) {
        return 'Duas Rodas';
    } else if (nome.includes('specialitá') || nome.includes('gelato')) {
        return 'Specialitá';
    } else {
        return 'Outros';
    }
}

// Carregamento de dados
async function carregarDados() {
    try {
        // URL do arquivo CSV
        const csvUrl = 'https://edimarpcosta.github.io/ameripan/catalogo/produtos.csv';
        
        // Simulação de carregamento
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Dados simulados (baseados no formato do CSV)
        const dadosSimulados = [
            { rowid: "0", categoria: "sorveteria", sku: "4", marca: "Emustab 1 kg - LARANJA", preco: "R$ 23,25", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/84750271/8519a6ab98.jpg" },
            { rowid: "1", categoria: "sorveteria", sku: "1504", marca: "Emustab DR 10 kg", preco: "R$ 12,54", img: "https://cdn.awsli.com.br/2500x2500/1284/1284671/produto/54777139/186955d63b.jpg" },
            { rowid: "2", categoria: "sorveteria", sku: "555", marca: "Super Liga Neutra Selecta Pacote 1kg", preco: "R$ 15,42", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/91623409/13f037b45d.jpg" },
            { rowid: "3", categoria: "sorveteria", sku: "559", marca: "Liga Neutra Extra Industrial Selecta 1kg", preco: "R$ 35,26", img: "https://cdn.awsli.com.br/2500x2500/1284/1284671/produto/96416567/7b10601127.jpg" },
            { rowid: "4", categoria: "sorveteria", sku: "2024", marca: "Aqua 5 Selecta - Pacote 1kg", preco: "R$ 41,62", img: "https://cdn.awsli.com.br/2500x2500/1284/1284671/produto/90024668/bc0e87091d.jpg" },
            { rowid: "5", categoria: "sorveteria", sku: "497", marca: "Saborizante Sorvete Algemix Selecta - Coco 1kg", preco: "R$ 19,09", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/88486749/c26fb570b8.jpg" },
            { rowid: "6", categoria: "sorveteria", sku: "1455", marca: "Saborizante Sorvete Algemix Selecta - Chocolate 1,01kg", preco: "R$ 57,45", img: "https://cdn.awsli.com.br/2500x2500/1284/1284671/produto/133464781/378e3c990a.jpg" },
            { rowid: "7", categoria: "sorveteria", sku: "527", marca: "Saborizante Sorvete Algemix Selecta - Milho Verde 1Kg", preco: "R$ 19,09", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/88489558/49d479f92e.jpg" },
            { rowid: "8", categoria: "sorveteria", sku: "526", marca: "Saborizante Sorvete Algemix Selecta - Morango 1Kg", preco: "R$ 19,09", img: "https://cdn.awsli.com.br/2500x2500/1284/1284671/produto/88489676/1c9bbfb425.jpg" },
            { rowid: "9", categoria: "sorveteria", sku: "2190", marca: "Base Zero Fruta Selecta 1kg", preco: "R$ 34,42", img: "https://cdn.awsli.com.br/2500x2500/1284/1284671/produto/115520229/0753120697.jpg" },
            { rowid: "10", categoria: "sorveteria", sku: "1247", marca: "Base Zero Para Leite Selecta 800g", preco: "R$ 28,39", img: "https://cdn.awsli.com.br/2500x2500/1284/1284671/produto/115520352/1532d751d4.jpg" },
            { rowid: "11", categoria: "sorveteria", sku: "2275", marca: "Base Neutra Gelato Specialitá - Acqua 800g", preco: "R$ 27,13", img: "https://edimarpcosta.github.io/ameripan/img/2275.jpg" },
            { rowid: "12", categoria: "sorveteria", sku: "326", marca: "Cobertura de Chocolate Selecta 1,3kg", preco: "R$ 13,38", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/88493211/7ad5ae1aff.jpg" },
            { rowid: "13", categoria: "sorveteria", sku: "379", marca: "Cobertura de Morango Selecta 1,3kg", preco: "R$ 8,66", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/88493300/9b7afb7a75.jpg" },
            { rowid: "14", categoria: "sorveteria", sku: "325", marca: "Cobertura de Caramelo Selecta 1,3kg", preco: "R$ 9,13", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/88493372/be2a33f6d4.jpg" },
            { rowid: "15", categoria: "sorveteria", sku: "1199", marca: "Cacau Selecta - Em Pó 100% 10kg", preco: "R$ 35,98", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/88493446/b13fbfa6c9.jpg" },
            { rowid: "16", categoria: "sorveteria", sku: "1420", marca: "Base Dark Chocolate Meio Amargo Selecta 1,01kg", preco: "R$ 32,51", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/88493447/3c7b67dbee.jpg" },
            { rowid: "17", categoria: "sorveteria", sku: "2223", marca: "Pasta Chocolat Leitinho Selecta 12kg", preco: "R$ 31,29", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/113329731/pasta-chocolat-leitinho-2-02-kg-4-un-n2jecgkdqk.jpg" },
            { rowid: "18", categoria: "sorveteria", sku: "2085", marca: "Pasta Brigadeiro Artesanalle 2,02kg", preco: "R$ 25,29", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/113329728/pasta-brigadeiro-2-02-kg-4-un-3uawjm7hls.jpg" },
            { rowid: "19", categoria: "sorveteria", sku: "1284", marca: "Creme de Amendoim c/ Pedaços Selecta 3kg", preco: "R$ 21,39", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/91623456/0a70df2ef4.jpg" },
            { rowid: "20", categoria: "sorveteria", sku: "1725", marca: "Variegato Frutas do Bosque Selecta 2kg", preco: "R$ 28,19", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/88493556/61faf5dd9a.jpg" },
            { rowid: "21", categoria: "sorveteria", sku: "1726", marca: "Variegato Morango Selecta 2kg", preco: "R$ 28,51", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/88493636/e493d0a19d.jpg" },
            { rowid: "22", categoria: "sorveteria", sku: "1983", marca: "Variegato Banana Flambada 2kg", preco: "R$ 23,82", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/88493557/0c23c1a5a7.jpg" },
            { rowid: "23", categoria: "acaiteria", sku: "2364", marca: "Açaí Selecta Plus 1kg", preco: "R$ 34,20", img: "https://edimarpcosta.github.io/ameripan/img/2364.jpg" },
            { rowid: "24", categoria: "sorveteria", sku: "553", marca: "Selecta Tropical Pinta Lingua Azul 1Kg", preco: "R$ 31,72", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/53589416/fe9f249370.jpg" },
            { rowid: "25", categoria: "sorveteria", sku: "2336", marca: "Glucose em Pó Indemil 25 KG", preco: "R$ 235,00", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/231240362/glucose-em-po-mor-rex-1940-25g-ingredientes-online-verso-5mhc8pit9h.jpg" },
            { rowid: "26", categoria: "sorveteria", sku: "790", marca: "Amido de Milho Indemil 25KG", preco: "R$ 130,00", img: "https://cdn.awsli.com.br/300x300/1284/1284671/produto/261702661/218119-78r1fy8fil.jpg" }
        ];

        // Processar os dados
        todosProdutos = dadosSimulados.map(produto => obterDetalhes(produto));
        
        // Classificar os produtos por categoria
        todosProdutos.forEach(produto => {
            const categoria = produto.categoria;
            categoriasProdutos[categoria].push(produto);
        });
        
        // Atualizar contadores de produtos por categoria
        atualizarContadores();
        
        // Renderizar os produtos
        renderizarProdutos();
        
        // Mostrar produtos em destaque
        mostrarProdutosDestaque();
        
        // Mostrar / esconder o preloader
        document.getElementById('preloader').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('preloader').style.display = 'none';
        }, 500);
        
    } catch (erro) {
        console.error('Erro ao carregar os dados:', erro);
        alert('Ocorreu um erro ao carregar os produtos. Por favor, recarregue a página.');
    }
}

// Renderização de produtos
function criarCardProduto(produto) {
    const caracteristicasLista = produto.caracteristicas.slice(0, 3).map(item => `<li>${item}</li>`).join('');
    
    return `
    <div class="col-md-4">
        <div class="card h-100 product-card">
            <img src="${produto.img}" class="card-img-top" alt="${produto.marca}">
            <div class="card-body">
                <h5 class="card-title">${produto.marca}</h5>
                <div class="product-sku">Código: ${produto.sku}</div>
                <div class="tag">${produto.fornecedor}</div>
                <p class="product-description">${produto.descricao}</p>
                <p><strong>Características:</strong></p>
                <ul class="caracteristicas-list">
                    ${caracteristicasLista}
                </ul>
            </div>
            <div class="card-footer">
                <button class="btn btn-sm btn-primary ver-detalhes" data-sku="${produto.sku}">Ver Detalhes</button>
            </div>
        </div>
    </div>
    `;
}

function renderizarProdutos() {
    // Renderizar produtos por categoria
    Object.keys(categoriasProdutos).forEach(categoria => {
        const containerElement = document.getElementById(`produtos-${categoria}`);
        if (containerElement) {
            const produtosHTML = categoriasProdutos[categoria].map(produto => criarCardProduto(produto)).join('');
            containerElement.innerHTML = produtosHTML || '<div class="col-12"><p class="text-center">Nenhum produto encontrado nesta categoria.</p></div>';
            
            // Remover spinner de carregamento
            const spinner = containerElement.querySelector('.loading-spinner');
            if (spinner) {
                spinner.remove();
            }
        }
    });
    
    // Adicionar eventos aos botões "Ver Detalhes"
    document.querySelectorAll('.ver-detalhes').forEach(botao => {
        botao.addEventListener('click', event => {
            const sku = event.target.getAttribute('data-sku');
            abrirModalProduto(sku);
        });
    });
}

function mostrarProdutosDestaque() {
    // Selecionar alguns produtos de destaque (1 de cada categoria principal)
    const produtosDestaque = [];
    
    // Obter um produto de cada categoria principal
    ['emulsificantes', 'estabilizantes', 'saborizantes', 'bases'].forEach(categoria => {
        if (categoriasProdutos[categoria].length > 0) {
            // Pegar um produto aleatório da categoria
            const indiceAleatorio = Math.floor(Math.random() * categoriasProdutos[categoria].length);
            produtosDestaque.push(categoriasProdutos[categoria][indiceAleatorio]);
        }
    });
    
    // Adicionar até 4 produtos destacados
    const containerElement = document.getElementById('produtos-destaque');
    if (containerElement) {
        const produtosHTML = produtosDestaque.map(produto => {
            return `
            <div class="col-md-3">
                <div class="card h-100 product-card">
                    <div class="position-absolute top-0 end-0 p-2">
                        <span class="badge bg-warning">Destaque</span>
                    </div>
                    <img src="${produto.img}" class="card-img-top" alt="${produto.marca}">
                    <div class="card-body">
                        <h5 class="card-title">${produto.marca}</h5>
                        <div class="product-sku">Código: ${produto.sku}</div>
                        <div class="tag">${produto.fornecedor}</div>
                        <p class="product-description">${produto.descricao.substring(0, 80)}...</p>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-primary ver-detalhes" data-sku="${produto.sku}">Ver Detalhes</button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
        
        containerElement.innerHTML = produtosHTML;
        
        // Remover spinner de carregamento
        const spinner = containerElement.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
        
        // Adicionar eventos aos botões "Ver Detalhes"
        containerElement.querySelectorAll('.ver-detalhes').forEach(botao => {
            botao.addEventListener('click', event => {
                const sku = event.target.getAttribute('data-sku');
                abrirModalProduto(sku);
            });
        });
    }
}

function atualizarContadores() {
    // Atualizar contadores na barra lateral
    Object.keys(categoriasProdutos).forEach(categoria => {
        const contador = document.getElementById(`count-${categoria}`);
        if (contador) {
            contador.textContent = categoriasProdutos[categoria].length;
        }
    });
}

function abrirModalProduto(sku) {
    // Encontrar o produto pelo SKU
    const produto = todosProdutos.find(p => p.sku.toString() === sku.toString());
    
    if (!produto) {
        alert('Produto não encontrado');
        return;
    }
    
    // Construir o conteúdo do modal
    const modalBody = document.getElementById('produto-detalhes');
    
    // Características completas
    const caracteristicasLista = produto.caracteristicas.map(item => `<li>${item}</li>`).join('');
    
    // Aplicações completas
    const aplicacoesLista = produto.aplicacoes.map(item => `<li>${item}</li>`).join('');
    
    // Template do modal
    modalBody.innerHTML = `
    <div class="row">
        <div class="col-md-4 text-center">
            <img src="${produto.img}" class="img-fluid produto-modal-img" alt="${produto.marca}">
        </div>
        <div class="col-md-8">
            <div class="produto-tags mb-3">
                <span class="tag">${produto.fornecedor}</span>
                <span class="tag">${mapeamentoCategorias[Object.keys(mapeamentoCategorias).find(key => mapeamentoCategorias[key] === produto.categoria)]}</span>
            </div>
            <h4>${produto.marca}</h4>
            <div class="product-sku mb-3">Código: ${produto.sku}</div>
            <div class="produto-info-section">
                <p>${produto.descricao}</p>
            </div>
        </div>
    </div>
    
    <div class="produto-detalhes-grid mt-4">
        <div class="produto-info-section">
            <h5>Características</h5>
            <ul class="caracteristicas-list">
                ${caracteristicasLista}
            </ul>
        </div>
        
        <div class="produto-info-section">
            <h5>Aplicações</h5>
            <ul class="aplicacao-list">
                ${aplicacoesLista}
            </ul>
        </div>
    </div>
    
    <div class="produto-info-section mt-3">
        <h5>Dicas de Venda</h5>
        <div class="alert alert-info">
            <p><strong>Como apresentar este produto:</strong></p>
            <ul>
                <li>Destaque os benefícios sensoriais que ele proporciona ao produto final</li>
                <li>Explique como ele pode resolver problemas específicos do cliente</li>
                <li>Mostre como ele pode agregar valor ao negócio</li>
            </ul>
        </div>
    </div>
    `;
    
    // Mostrar o modal
    const produtoModal = new bootstrap.Modal(document.getElementById('produtoModal'));
    produtoModal.show();
}

// Funções de interação com a interface
function configurarBotoesMostrarInfo() {
    document.querySelectorAll('.btn-show-info').forEach(botao => {
        botao.addEventListener('click', event => {
            const categoria = event.target.getAttribute('data-category');
            const infoDiv = document.getElementById(`info-${categoria}`);
            
            if (infoDiv.style.display === 'block') {
                infoDiv.style.display = 'none';
                botao.innerHTML = '<i class="bi bi-info-circle"></i> Sobre esta categoria';
            } else {
                infoDiv.style.display = 'block';
                botao.innerHTML = '<i class="bi bi-x-circle"></i> Fechar informações';
            }
        });
    });
}

function configurarBotaoVoltarTopo() {
    const botaoTopo = document.querySelector('.back-to-top');
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            botaoTopo.classList.add('show');
        } else {
            botaoTopo.classList.remove('show');
        }
    });
}

function configurarPesquisa() {
    const botaoPesquisa = document.getElementById('search-button');
    const inputPesquisa = document.getElementById('search-input');
    const resultadoBusca = document.getElementById('resultado-busca');
    const produtosBusca = document.getElementById('produtos-busca');
    const infoBusca = document.getElementById('info-busca');
    const botaoLimparBusca = document.getElementById('limpar-busca');
    
    botaoPesquisa.addEventListener('click', () => {
        realizarPesquisa();
    });
    
    inputPesquisa.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            realizarPesquisa();
        }
    });
    
    botaoLimparBusca.addEventListener('click', () => {
        inputPesquisa.value = '';
        resultadoBusca.classList.add('d-none');
    });
    
    function realizarPesquisa() {
        const termoPesquisa = inputPesquisa.value.trim().toLowerCase();
        
        if (termoPesquisa.length < 3) {
            alert('Digite pelo menos 3 caracteres para pesquisar');
            return;
        }
        
        // Filtrar produtos
        const resultados = todosProdutos.filter(produto => 
            produto.marca.toLowerCase().includes(termoPesquisa) || 
            produto.sku.toString().includes(termoPesquisa)
        );
        
        // Mostrar resultados
        if (resultados.length > 0) {
            resultadoBusca.classList.remove('d-none');
            infoBusca.innerHTML = `Encontrados <strong>${resultados.length}</strong> produtos para "<strong>${termoPesquisa}</strong>"`;
            
            const produtosHTML = resultados.map(produto => criarCardProduto(produto)).join('');
            produtosBusca.innerHTML = produtosHTML;
            
            // Adicionar eventos aos botões "Ver Detalhes"
            produtosBusca.querySelectorAll('.ver-detalhes').forEach(botao => {
                botao.addEventListener('click', event => {
                    const sku = event.target.getAttribute('data-sku');
                    abrirModalProduto(sku);
                });
            });
            
            // Rolar até os resultados
            resultadoBusca.scrollIntoView({ behavior: 'smooth' });
        } else {
            resultadoBusca.classList.remove('d-none');
            infoBusca.innerHTML = `Nenhum produto encontrado para "<strong>${termoPesquisa}</strong>"`;
            produtosBusca.innerHTML = '<div class="col-12"><p class="text-center">Nenhum produto encontrado. Tente outro termo de busca.</p></div>';
        }
    }
}

function configurarFiltros() {
    const botaoAplicarFiltros = document.getElementById('aplicar-filtros');
    
    botaoAplicarFiltros.addEventListener('click', () => {
        const filtroFornecedor = document.getElementById('filter-fornecedor').value;
        const filtroZeroLactose = document.getElementById('filter-zerolactose').checked;
        const filtroPremium = document.getElementById('filter-premium').checked;
        const filtroIndustrial = document.getElementById('filter-industrial').checked;
        
        // Aplicar filtros a todas categorias
        Object.keys(categoriasProdutos).forEach(categoria => {
            // Resetar filtros
            categoriasProdutos[categoria] = todosProdutos.filter(p => p.categoria === categoria);
            
            // Aplicar filtro de fornecedor
            if (filtroFornecedor) {
                categoriasProdutos[categoria] = categoriasProdutos[categoria].filter(p => 
                    p.fornecedor === filtroFornecedor
                );
            }
            
            // Aplicar filtro de zero lactose
            if (filtroZeroLactose) {
                categoriasProdutos[categoria] = categoriasProdutos[categoria].filter(p => 
                    p.marca.toLowerCase().includes('zero') || 
                    p.caracteristicas.some(c => c.toLowerCase().includes('lactose'))
                );
            }
            
            // Aplicar filtro de premium
            if (filtroPremium) {
                categoriasProdutos[categoria] = categoriasProdutos[categoria].filter(p => 
                    p.marca.toLowerCase().includes('premium') || 
                    p.caracteristicas.some(c => c.toLowerCase().includes('premium'))
                );
            }
            
            // Aplicar filtro de industrial
            if (filtroIndustrial) {
                categoriasProdutos[categoria] = categoriasProdutos[categoria].filter(p => 
                    p.marca.toLowerCase().includes('industrial') || 
                    p.aplicacoes.some(a => a.toLowerCase().includes('industrial'))
                );
            }
        });
        
        // Renderizar produtos filtrados
        renderizarProdutos();
        
        // Atualizar contadores
        atualizarContadores();
        
        // Mostrar mensagem de filtros aplicados
        alert('Filtros aplicados com sucesso!');
    });
}

// Funcionalidade de comparação de produtos
let produtosParaComparar = [];
const MAX_PRODUTOS_COMPARACAO = 3;

function adicionarProdutoComparacao(sku) {
    const produto = todosProdutos.find(p => p.sku.toString() === sku.toString());
    
    if (!produto) {
        alert('Produto não encontrado');
        return;
    }
    
    // Verificar se o produto já está na lista
    if (produtosParaComparar.some(p => p.sku.toString() === sku.toString())) {
        alert('Este produto já está na lista de comparação');
        return;
    }
    
    // Verificar se já atingiu o limite
    if (produtosParaComparar.length >= MAX_PRODUTOS_COMPARACAO) {
        alert(`Você pode comparar no máximo ${MAX_PRODUTOS_COMPARACAO} produtos. Remova um produto antes de adicionar outro.`);
        return;
    }
    
    // Adicionar o produto à lista
    produtosParaComparar.push(produto);
    
    // Atualizar o contador de produtos na comparação
    atualizarContadorComparacao();
    
    // Mostrar notificação
    mostrarNotificacao(`"${produto.marca}" adicionado à comparação`);
    
    // Se tiver 2 ou mais produtos, habilitar o botão de comparar
    if (produtosParaComparar.length >= 2) {
        document.getElementById('btn-comparar').removeAttribute('disabled');
    }
}

function removerProdutoComparacao(sku) {
    // Remover o produto da lista
    produtosParaComparar = produtosParaComparar.filter(p => p.sku.toString() !== sku.toString());
    
    // Atualizar o contador
    atualizarContadorComparacao();
    
    // Se tiver menos de 2 produtos, desabilitar o botão de comparar
    if (produtosParaComparar.length < 2) {
        document.getElementById('btn-comparar').setAttribute('disabled', 'disabled');
    }
    
    // Se estiver na página de comparação, atualizar a comparação
    if (document.getElementById('comparacao-produtos').style.display === 'block') {
        mostrarComparacao();
    }
}

function atualizarContadorComparacao() {
    const contador = document.getElementById('contador-comparacao');
    contador.textContent = produtosParaComparar.length;
    
    // Atualizar o dropdown de produtos para comparação
    atualizarDropdownComparacao();
}

function atualizarDropdownComparacao() {
    const dropdown = document.getElementById('produtos-comparacao-lista');
    
    if (!dropdown) return;
    
    if (produtosParaComparar.length === 0) {
        dropdown.innerHTML = '<li><span class="dropdown-item disabled">Nenhum produto selecionado</span></li>';
        return;
    }
    
    dropdown.innerHTML = produtosParaComparar.map(produto => `
        <li>
            <div class="dropdown-item d-flex justify-content-between align-items-center">
                <span>${produto.marca.substring(0, 30)}${produto.marca.length > 30 ? '...' : ''}</span>
                <button class="btn btn-sm btn-danger ms-2 remover-comparacao" data-sku="${produto.sku}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </li>
    `).join('');
    
    // Adicionar eventos aos botões de remover
    dropdown.querySelectorAll('.remover-comparacao').forEach(botao => {
        botao.addEventListener('click', event => {
            event.stopPropagation();
            const sku = event.currentTarget.getAttribute('data-sku');
            removerProdutoComparacao(sku);
        });
    });
}

function mostrarComparacao() {
    if (produtosParaComparar.length < 2) {
        alert('Selecione pelo menos 2 produtos para comparar');
        return;
    }
    
    // Esconder outras seções
    document.querySelectorAll('section.category-section, #resultado-busca').forEach(section => {
        section.style.display = 'none';
    });
    
    // Mostrar seção de comparação
    const comparacaoSection = document.getElementById('comparacao-produtos');
    comparacaoSection.style.display = 'block';
    
    // Construir tabela de comparação
    const tabelaComparacao = document.getElementById('tabela-comparacao');
    
    let html = `
    <table class="table table-bordered table-striped">
        <thead>
            <tr>
                <th>Característica</th>
                ${produtosParaComparar.map(produto => `
                    <th>
                        <div class="text-center mb-2">
                            <img src="${produto.img}" alt="${produto.marca}" style="height: 80px; object-fit: contain;">
                        </div>
                        <h6>${produto.marca}</h6>
                        <div class="product-sku">Código: ${produto.sku}</div>
                        <button class="btn btn-sm btn-danger mt-2 remover-comparacao" data-sku="${produto.sku}">
                            <i class="bi bi-trash"></i> Remover
                        </button>
                    </th>
                `).join('')}
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Categoria</strong></td>
                ${produtosParaComparar.map(produto => `
                    <td>${mapeamentoCategorias[Object.keys(mapeamentoCategorias).find(key => mapeamentoCategorias[key] === produto.categoria)]}</td>
                `).join('')}
            </tr>
            <tr>
                <td><strong>Fornecedor</strong></td>
                ${produtosParaComparar.map(produto => `
                    <td>${produto.fornecedor}</td>
                `).join('')}
            </tr>
            <tr>
                <td><strong>Descrição</strong></td>
                ${produtosParaComparar.map(produto => `
                    <td>${produto.descricao}</td>
                `).join('')}
            </tr>
            <tr>
                <td><strong>Características</strong></td>
                ${produtosParaComparar.map(produto => `
                    <td>
                        <ul class="caracteristicas-list">
                            ${produto.caracteristicas.map(c => `<li>${c}</li>`).join('')}
                        </ul>
                    </td>
                `).join('')}
            </tr>
            <tr>
                <td><strong>Aplicações</strong></td>
                ${produtosParaComparar.map(produto => `
                    <td>
                        <ul class="aplicacao-list">
                            ${produto.aplicacoes.map(a => `<li>${a}</li>`).join('')}
                        </ul>
                    </td>
                `).join('')}
            </tr>
            <tr>
                <td><strong>Ações</strong></td>
                ${produtosParaComparar.map(produto => `
                    <td class="text-center">
                        <button class="btn btn-primary ver-detalhes" data-sku="${produto.sku}">
                            <i class="bi bi-eye"></i> Ver Detalhes
                        </button>
                    </td>
                `).join('')}
            </tr>
        </tbody>
    </table>
    `;
    
    tabelaComparacao.innerHTML = html;
    
    // Adicionar eventos aos botões
    tabelaComparacao.querySelectorAll('.remover-comparacao').forEach(botao => {
        botao.addEventListener('click', event => {
            const sku = event.currentTarget.getAttribute('data-sku');
            removerProdutoComparacao(sku);
        });
    });
    
    tabelaComparacao.querySelectorAll('.ver-detalhes').forEach(botao => {
        botao.addEventListener('click', event => {
            const sku = event.currentTarget.getAttribute('data-sku');
            abrirModalProduto(sku);
        });
    });
    
    // Adicionar botão para voltar
    document.getElementById('btn-voltar-comparacao').addEventListener('click', () => {
        // Esconder seção de comparação
        comparacaoSection.style.display = 'none';
        
        // Mostrar todas as seções
        document.querySelectorAll('section.category-section').forEach(section => {
            section.style.display = 'block';
        });
    });
    
    // Rolar para a seção de comparação
    comparacaoSection.scrollIntoView({ behavior: 'smooth' });
}

// Funcionalidade de favoritos
function configurarFavoritos() {
    // Carregar favoritos do localStorage
    const favoritosArmazenados = localStorage.getItem('produtosFavoritos');
    let produtosFavoritos = favoritosArmazenados ? JSON.parse(favoritosArmazenados) : [];
    
    // Função para adicionar ou remover favorito
    window.toggleFavorito = function(sku) {
        const indice = produtosFavoritos.indexOf(sku.toString());
        
        if (indice === -1) {
            // Adicionar aos favoritos
            produtosFavoritos.push(sku.toString());
            mostrarNotificacao('Produto adicionado aos favoritos');
        } else {
            // Remover dos favoritos
            produtosFavoritos.splice(indice, 1);
            mostrarNotificacao('Produto removido dos favoritos');
        }
        
        // Salvar no localStorage
        localStorage.setItem('produtosFavoritos', JSON.stringify(produtosFavoritos));
        
        // Atualizar ícones de favoritos
        atualizarIconesFavoritos();
        
        // Atualizar contador de favoritos
        atualizarContadorFavoritos();
    };
    
    // Função para verificar se um produto é favorito
    window.isFavorito = function(sku) {
        return produtosFavoritos.includes(sku.toString());
    };
    
    // Atualizar ícones de favoritos
    function atualizarIconesFavoritos() {
        document.querySelectorAll('.btn-favorito').forEach(botao => {
            const sku = botao.getAttribute('data-sku');
            
            if (isFavorito(sku)) {
                botao.innerHTML = '<i class="bi bi-heart-fill text-danger"></i>';
                botao.title = 'Remover dos favoritos';
            } else {
                botao.innerHTML = '<i class="bi bi-heart"></i>';
                botao.title = 'Adicionar aos favoritos';
            }
        });
    }
    
    // Atualizar contador de favoritos
    function atualizarContadorFavoritos() {
        const contador = document.getElementById('contador-favoritos');
        if (contador) {
            contador.textContent = produtosFavoritos.length;
        }
    }
    
    // Adicionar botões de favorito aos cards de produto
    function adicionarBotoesFavorito() {
        document.querySelectorAll('.product-card .card-footer').forEach(footer => {
            const botaoVerDetalhes = footer.querySelector('.ver-detalhes');
            if (botaoVerDetalhes) {
                const sku = botaoVerDetalhes.getAttribute('data-sku');
                
                // Verificar se já tem botão de favorito
                if (!footer.querySelector('.btn-favorito')) {
                    const botaoFavorito = document.createElement('button');
                    botaoFavorito.className = 'btn btn-sm btn-outline-secondary ms-2 btn-favorito';
                    botaoFavorito.setAttribute('data-sku', sku);
                    botaoFavorito.addEventListener('click', () => toggleFavorito(sku));
                    
                    if (isFavorito(sku)) {
                        botaoFavorito.innerHTML = '<i class="bi bi-heart-fill text-danger"></i>';
                        botaoFavorito.title = 'Remover dos favoritos';
                    } else {
                        botaoFavorito.innerHTML = '<i class="bi bi-heart"></i>';
                        botaoFavorito.title = 'Adicionar aos favoritos';
                    }
                    
                    footer.appendChild(botaoFavorito);
                }
            }
        });
    }
    
    // Configurar página de favoritos
    document.getElementById('btn-ver-favoritos').addEventListener('click', () => {
        mostrarProdutosFavoritos();
    });
    
    function mostrarProdutosFavoritos() {
        if (produtosFavoritos.length === 0) {
            alert('Você ainda não adicionou nenhum produto aos favoritos.');
            return;
        }
        
        // Esconder outras seções
        document.querySelectorAll('section.category-section, #resultado-busca, #comparacao-produtos').forEach(section => {
            section.style.display = 'none';
        });
        
        // Mostrar seção de favoritos
        const favoritosSection = document.getElementById('favoritos-produtos');
        favoritosSection.style.display = 'block';
        
        // Encontrar produtos favoritos
        const produtosFavoritosDetalhes = todosProdutos.filter(produto => 
            produtosFavoritos.includes(produto.sku.toString())
        );
        
        // Construir cards de produtos favoritos
        const containerFavoritos = document.getElementById('container-favoritos');
        
        const produtosHTML = produtosFavoritosDetalhes.map(produto => criarCardProduto(produto)).join('');
        containerFavoritos.innerHTML = produtosHTML || '<div class="col-12"><p class="text-center">Nenhum produto favorito encontrado.</p></div>';
        
        // Adicionar eventos aos botões
        adicionarBotoesFavorito();
        
        containerFavoritos.querySelectorAll('.ver-detalhes').forEach(botao => {
            botao.addEventListener('click', event => {
                const sku = event.target.getAttribute('data-sku');
                abrirModalProduto(sku);
            });
        });
        
        // Adicionar botão para voltar
        document.getElementById('btn-voltar-favoritos').addEventListener('click', () => {
            // Esconder seção de favoritos
            favoritosSection.style.display = 'none';
            
            // Mostrar todas as seções
            document.querySelectorAll('section.category-section').forEach(section => {
                section.style.display = 'block';
            });
        });
        
        // Rolar para a seção de favoritos
        favoritosSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Inicializar
    atualizarContadorFavoritos();
    setTimeout(adicionarBotoesFavorito, 1000); // Adicionar após o carregamento dos produtos
}

// Funcionalidade de exportação de informações
function configurarExportacao() {
    document.getElementById('btn-exportar-pdf').addEventListener('click', () => {
        alert('Funcionalidade de exportação para PDF em desenvolvimento. Em breve você poderá exportar o catálogo completo ou categorias específicas.');
    });
    
    document.getElementById('btn-exportar-excel').addEventListener('click', () => {
        alert('Funcionalidade de exportação para Excel em desenvolvimento. Em breve você poderá exportar dados de produtos para análise em planilhas.');
    });
}

// Funcionalidade de notificações
function mostrarNotificacao(mensagem, tipo = 'info') {
    // Criar elemento de notificação
    const notificacao = document.createElement('div');
    notificacao.className = `toast align-items-center text-white bg-${tipo} border-0`;
    notificacao.setAttribute('role', 'alert');
    notificacao.setAttribute('aria-live', 'assertive');
    notificacao.setAttribute('aria-atomic', 'true');
    
    notificacao.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${mensagem}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
        </div>
    `;
    
    // Adicionar ao container de notificações
    const container = document.getElementById('notificacoes-container');
    container.appendChild(notificacao);
    
    // Mostrar notificação
    const toast = new bootstrap.Toast(notificacao, {
        animation: true,
        autohide: true,
        delay: 3000
    });
    toast.show();
    
    // Remover após fechado
    notificacao.addEventListener('hidden.bs.toast', () => {
        container.removeChild(notificacao);
    });
}

// Galeria de imagens para produtos
function configurarGaleriaProdutos() {
    // Criar modal para galeria
    const galeriaModal = document.createElement('div');
    galeriaModal.className = 'modal fade';
    galeriaModal.id = 'galeriaModal';
    galeriaModal.tabIndex = '-1';
    galeriaModal.setAttribute('aria-labelledby', 'galeriaModalLabel');
    galeriaModal.setAttribute('aria-hidden', 'true');
    
    galeriaModal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="galeriaModalLabel">Galeria de Imagens</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                </div>
                <div class="modal-body">
                    <div id="carouselGaleria" class="carousel slide" data-bs-ride="carousel">
                        <div class="carousel-inner" id="galeria-carousel-inner">
                            <!-- As imagens serão adicionadas aqui via JavaScript -->
                        </div>
                        <button class="carousel-control-prev" type="button" data-bs-target="#carouselGaleria" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Anterior</span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#carouselGaleria" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Próximo</span>
                        </button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(galeriaModal);
    
    // Função para abrir a galeria
    window.abrirGaleria = function(categoria) {
        // Obter produtos da categoria
        const produtos = categoriasProdutos[categoria];
        
        if (produtos.length === 0) {
            alert('Nenhum produto encontrado nesta categoria.');
            return;
        }
        
        // Preencher carousel
        const carouselInner = document.getElementById('galeria-carousel-inner');
        carouselInner.innerHTML = '';
        
        produtos.forEach((produto, index) => {
            const slide = document.createElement('div');
            slide.className = `carousel-item${index === 0 ? ' active' : ''}`;
            
            slide.innerHTML = `
                <div class="text-center">
                    <img src="${produto.img}" class="d-block mx-auto" style="max-height: 400px; object-fit: contain;" alt="${produto.marca}">
                    <div class="carousel-caption d-none d-md-block bg-dark bg-opacity-75 rounded">
                        <h5>${produto.marca}</h5>
                        <p>Código: ${produto.sku}</p>
                    </div>
                </div>
            `;
            
            carouselInner.appendChild(slide);
        });
        
        // Atualizar título
        document.getElementById('galeriaModalLabel').textContent = `Galeria: ${Object.keys(mapeamentoCategorias).find(key => mapeamentoCategorias[key] === categoria)}`;
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('galeriaModal'));
        modal.show();
    };
    
    // Adicionar botões para abrir galeria em cada seção
    Object.keys(categoriasProdutos).forEach(categoria => {
        const sectionHeader = document.querySelector(`#${categoria} .category-header`);
        
        if (sectionHeader) {
            const botaoGaleria = document.createElement('button');
            botaoGaleria.className = 'btn btn-sm btn-outline-primary ms-2 btn-galeria';
            botaoGaleria.innerHTML = '<i class="bi bi-images"></i> Ver Galeria';
            botaoGaleria.addEventListener('click', () => abrirGaleria(categoria));
            
            sectionHeader.appendChild(botaoGaleria);
        }
    });
}

// Funcionalidade de armazenamento de preferências do usuário
function configurarPreferenciasUsuario() {
    // Carregar preferências
    const preferenciasTema = localStorage.getItem('tema') || 'claro';
    const prefFontSize = localStorage.getItem('fontSize') || 'normal';
    
    // Aplicar preferências
    if (preferenciasTema === 'escuro') {
        document.body.classList.add('tema-escuro');
        document.getElementById('switch-tema').checked = true;
    }
    
    document.body.classList.add(`font-size-${prefFontSize}`);
    document.getElementById('select-font-size').value = prefFontSize;
    
    // Salvar preferências
    document.getElementById('switch-tema').addEventListener('change', function() {
        if (this.checked) {
            document.body.classList.add('tema-escuro');
            localStorage.setItem('tema', 'escuro');
        } else {
            document.body.classList.remove('tema-escuro');
            localStorage.setItem('tema', 'claro');
        }
    });
    
    document.getElementById('select-font-size').addEventListener('change', function() {
        // Remover classes anteriores
        document.body.classList.remove('font-size-pequeno', 'font-size-normal', 'font-size-grande');
        
        // Adicionar nova classe
        document.body.classList.add(`font-size-${this.value}`);
        
        // Salvar preferência
        localStorage.setItem('fontSize', this.value);
    });
}

// Funcionalidade para sugestões personalizadas
function mostrarSugestoesPersonalizadas() {
    // Obter produtos visualizados
    const produtosVistos = JSON.parse(localStorage.getItem('produtosVistos') || '[]');
    
    if (produtosVistos.length === 0) return;
    
    // Obter categorias mais visualizadas
    const contadorCategorias = {};
    
    produtosVistos.forEach(sku => {
        const produto = todosProdutos.find(p => p.sku.toString() === sku.toString());
        if (produto) {
            const categoria = produto.categoria;
            contadorCategorias[categoria] = (contadorCategorias[categoria] || 0) + 1;
        }
    });
    
    // Ordenar categorias por número de visualizações
    const categoriasOrdenadas = Object.keys(contadorCategorias).sort((a, b) => 
        contadorCategorias[b] - contadorCategorias[a]
    );
    
    if (categoriasOrdenadas.length === 0) return;
    
    // Categoria mais visualizada
    const categoriaPrincipal = categoriasOrdenadas[0];
    
    // Encontrar produtos sugeridos (que não foram vistos)
    const produtosSugeridos = categoriasProdutos[categoriaPrincipal]
        .filter(produto => !produtosVistos.includes(produto.sku.toString()))
        .slice(0, 4); // Pegar até 4 produtos
    
    if (produtosSugeridos.length === 0) return;
    
    // Mostrar sugestões
    const sugestoesSection = document.getElementById('sugestoes-personalizadas');
    const sugestoesContainer = document.getElementById('container-sugestoes');
    
    // Atualizar título
    document.getElementById('titulo-sugestoes').textContent = `Sugestões de ${Object.keys(mapeamentoCategorias).find(key => mapeamentoCategorias[key] === categoriaPrincipal)}`;
    
    // Criar cards de sugestões
    const sugestoesHTML = produtosSugeridos.map(produto => {
        return `
        <div class="col-md-3">
            <div class="card h-100 product-card">
                <div class="position-absolute top-0 end-0 p-2">
                    <span class="badge bg-info">Sugestão</span>
                </div>
                <img src="${produto.img}" class="card-img-top" alt="${produto.marca}">
                <div class="card-body">
                    <h5 class="card-title">${produto.marca}</h5>
                    <div class="product-sku">Código: ${produto.sku}</div>
                    <div class="tag">${produto.fornecedor}</div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm btn-primary ver-detalhes" data-sku="${produto.sku}">Ver Detalhes</button>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    sugestoesContainer.innerHTML = sugestoesHTML;
    
    // Adicionar eventos
    sugestoesContainer.querySelectorAll('.ver-detalhes').forEach(botao => {
        botao.addEventListener('click', event => {
            const sku = event.target.getAttribute('data-sku');
            abrirModalProduto(sku);
        });
    });
    
    // Mostrar seção
    sugestoesSection.style.display = 'block';
}

// Funcionalidade para registro de visualizações
function registrarVisualizacao(sku) {
    // Carregar visualizações anteriores
    let produtosVistos = JSON.parse(localStorage.getItem('produtosVistos') || '[]');
    
    // Verificar se já foi visto
    if (!produtosVistos.includes(sku.toString())) {
        // Adicionar ao início da lista
        produtosVistos.unshift(sku.toString());
        
        // Limitar a 20 produtos
        produtosVistos = produtosVistos.slice(0, 20);
        
        // Salvar
        localStorage.setItem('produtosVistos', JSON.stringify(produtosVistos));
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Carregar dados dos produtos
    carregarDados();
    
    // Configurar elementos da UI que precisam existir antes de carregar os dados
    const comparacaoSection = document.createElement('section');
    comparacaoSection.id = 'comparacao-produtos';
    comparacaoSection.className = 'mb-5';
    comparacaoSection.style.display = 'none';
    comparacaoSection.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="section-title">Comparação de Produtos</h2>
            <button id="btn-voltar-comparacao" class="btn btn-outline-secondary">
                <i class="bi bi-arrow-left"></i> Voltar
            </button>
        </div>
        <div id="tabela-comparacao"></div>
    `;
    
    const favoritosSection = document.createElement('section');
    favoritosSection.id = 'favoritos-produtos';
    favoritosSection.className = 'mb-5';
    favoritosSection.style.display = 'none';
    favoritosSection.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="section-title">Meus Produtos Favoritos</h2>
            <button id="btn-voltar-favoritos" class="btn btn-outline-secondary">
                <i class="bi bi-arrow-left"></i> Voltar
            </button>
        </div>
        <div class="row" id="container-favoritos"></div>
    `;
    
    const sugestoesSection = document.createElement('section');
    sugestoesSection.id = 'sugestoes-personalizadas';
    sugestoesSection.className = 'py-5 bg-light';
    sugestoesSection.style.display = 'none';
    sugestoesSection.innerHTML = `
        <div class="container">
            <h2 class="text-center mb-4" id="titulo-sugestoes">Sugestões Personalizadas</h2>
            <div class="row row-cols-1 row-cols-md-4 g-4" id="container-sugestoes"></div>
        </div>
    `;
    
    const notificacoesContainer = document.createElement('div');
    notificacoesContainer.id = 'notificacoes-container';
    notificacoesContainer.className = 'position-fixed bottom-0 end-0 p-3';
    notificacoesContainer.style.zIndex = '1050';
    
    // Adicionar elementos ao DOM
    document.querySelector('.container.py-5').appendChild(comparacaoSection);
    document.querySelector('.container.py-5').appendChild(favoritosSection);
    document.querySelector('#catalogo-completo').after(sugestoesSection);
    document.body.appendChild(notificacoesContainer);
    
    // Adicionar elementos à navbar
    const navbarNav = document.querySelector('.navbar-nav');
    
    const liComparar = document.createElement('li');
    liComparar.className = 'nav-item dropdown';
    liComparar.innerHTML = `
        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
            <i class="bi bi-bar-chart"></i> Comparar
            <span class="badge bg-danger rounded-pill" id="contador-comparacao">0</span>
        </a>
        <ul class="dropdown-menu" id="produtos-comparacao-lista">
            <li><span class="dropdown-item disabled">Nenhum produto selecionado</span></li>
        </ul>
    `;
    
    const liFavoritos = document.createElement('li');
    liFavoritos.className = 'nav-item';
    liFavoritos.innerHTML = `
        <a class="nav-link" href="#" id="btn-ver-favoritos">
            <i class="bi bi-heart"></i> Favoritos
            <span class="badge bg-danger rounded-pill" id="contador-favoritos">0</span>
        </a>
    `;
    
    const liExportar = document.createElement('li');
    liExportar.className = 'nav-item dropdown';
    liExportar.innerHTML = `
        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
            <i class="bi bi-download"></i> Exportar
        </a>
        <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="#" id="btn-exportar-pdf">Exportar para PDF</a></li>
            <li><a class="dropdown-item" href="#" id="btn-exportar-excel">Exportar para Excel</a></li>
        </ul>
    `;
    
    const liConfiguracoes = document.createElement('li');
    liConfiguracoes.className = 'nav-item dropdown';
    liConfiguracoes.innerHTML = `
        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
            <i class="bi bi-gear"></i> Configurações
        </a>
        <ul class="dropdown-menu">
            <li>
                <div class="dropdown-item">
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="switch-tema">
                        <label class="form-check-label" for="switch-tema">Tema Escuro</label>
                    </div>
                </div>
            </li>
            <li>
                <div class="dropdown-item">
                    <label for="select-font-size" class="form-label">Tamanho da Fonte</label>
                    <select class="form-select form-select-sm" id="select-font-size">
                        <option value="pequeno">Pequeno</option>
                        <option value="normal" selected>Normal</option>
                        <option value="grande">Grande</option>
                    </select>
                </div>
            </li>
        </ul>
    `;
    
    navbarNav.appendChild(liComparar);
    navbarNav.appendChild(liFavoritos);
    navbarNav.appendChild(liExportar);
    navbarNav.appendChild(liConfiguracoes);
    
    // Adicionar botão de comparar
    const btnComparar = document.createElement('button');
    btnComparar.id = 'btn-comparar';
    btnComparar.className = 'btn btn-primary btn-sm';
    btnComparar.innerHTML = '<i class="bi bi-bar-chart"></i> Comparar Produtos';
    btnComparar.setAttribute('disabled', 'disabled');
    btnComparar.addEventListener('click', mostrarComparacao);
    
    const dropdownComparacao = document.getElementById('produtos-comparacao-lista');
    if (dropdownComparacao) {
        const li = document.createElement('li');
        li.className = 'dropdown-item';
        li.appendChild(btnComparar);
        dropdownComparacao.appendChild(li);
    }
    
    // Configurar eventos de interação
    configurarBotoesMostrarInfo();
    configurarBotaoVoltarTopo();
    configurarPesquisa();
    configurarFiltros();
    configurarFavoritos();
    configurarExportacao();
    configurarGaleriaProdutos();
    configurarPreferenciasUsuario();
    
    // Configurar eventos de clique em links para rolagem suave
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Modificar a função abrirModalProduto para registrar visualizações
    const abrirModalProdutoOriginal = abrirModalProduto;
    abrirModalProduto = function(sku) {
        // Registrar visualização
        registrarVisualizacao(sku);
        
        // Chamar função original
        abrirModalProdutoOriginal(sku);
    };
    
    // Configurar botão para download de dicas de vendas
    document.getElementById('btn-download-dicas').addEventListener('click', () => {
        alert('Funcionalidade em desenvolvimento. Em breve você poderá baixar o material completo de dicas para vendedores.');
    });
    
    // Após carregar os produtos, mostrar sugestões personalizadas
    setTimeout(() => {
        mostrarSugestoesPersonalizadas();
    }, 2000);
});