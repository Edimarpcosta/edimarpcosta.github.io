# Previsão do Tempo - Cidades SP

![Licença](https://img.shields.io/badge/license-MIT-blue.svg)
![Versão](https://img.shields.io/badge/version-1.0.0-green.svg)

Uma aplicação web moderna e responsiva para consulta de previsões meteorológicas. Originalmente focada em cidades do estado de São Paulo, mas expandida para permitir a busca de previsões para qualquer localidade do mundo.

![Screenshot da aplicação](https://via.placeholder.com/800x400.png?text=Screenshot+da+Aplicação)

## 📋 Índice

- [Funcionalidades](#-funcionalidades)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Demonstração](#-demonstração)
- [Instalação e Uso](#-instalação-e-uso)
- [APIs Utilizadas](#-apis-utilizadas)
- [Estrutura do Código](#-estrutura-do-código)
- [Principais Funções](#-principais-funções)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

## ✨ Funcionalidades

- **Previsão para 15 dias** - Exibe dados meteorológicos completos para os próximos 15 dias
- **Cidades pré-definidas** - Acesso rápido a cidades populares de SP com botões dedicados
- **Pesquisa global** - Campo de busca interativo para encontrar qualquer cidade do mundo
- **Verificação no mapa** - Botão "Ver no mapa" para confirmar a localização exata da cidade
- **Dados meteorológicos detalhados**:
  - Temperatura máxima e mínima
  - Descrição da condição meteorológica
  - Probabilidade de precipitação
  - Velocidade e direção do vento
  - Nascer e pôr do sol
- **Design responsivo** - Interface adaptável a qualquer dispositivo (desktop, tablet, celular)
- **Ícones meteorológicos** - Representações visuais intuitivas para cada condição
- **Destaque para o dia atual** - Identificação visual clara do dia corrente
- **Suporte a múltiplos idiomas** - Exibe dados em português do Brasil
- **Glossário meteorológico** - Explicação dos termos técnicos e ícones utilizados

## 🚀 Tecnologias Utilizadas

- **HTML5** - Estrutura semântica
- **CSS3** - Estilos e responsividade
- **JavaScript (ES6+)** - Lógica e interatividade
- **APIs Externas** - Open-Meteo para dados meteorológicos e geocodificação
- **SVG** - Ícones vetoriais para condições meteorológicas
- **Async/Await** - Gerenciamento de operações assíncronas
- **LocalStorage API** - Armazenamento de preferências do usuário (opcional)
- **OpenStreetMap** - Visualização de mapa interativo

## 🔍 Demonstração

[Veja a aplicação em funcionamento](https://seu-link-de-demonstracao.com)

## 📦 Instalação e Uso

### Método 1: Download direto
1. Faça o download do repositório
2. Extraia os arquivos em um diretório de sua preferência
3. Abra o arquivo `index.html` em qualquer navegador moderno

### Método 2: Clonando o repositório
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/previsao-tempo-cidades-sp.git

# Entre no diretório
cd previsao-tempo-cidades-sp

# Abra o arquivo index.html em seu navegador
# Ou use qualquer servidor HTTP simples, como:
npx serve
```

### Método 3: Servidor web
Você pode hospedar os arquivos em qualquer servidor web como Apache, Nginx, ou em plataformas como GitHub Pages, Netlify, Vercel, etc.

## 🌐 APIs Utilizadas

### Open-Meteo Geocoding API
- **URL**: `https://geocoding-api.open-meteo.com/v1/search`
- **Uso**: Converte nomes de cidades em coordenadas geográficas
- **Parâmetros**: 
  - `name`: Nome da cidade a ser pesquisada
  - `count`: Número máximo de resultados (1-5)

### Open-Meteo Weather Forecast API
- **URL**: `https://api.open-meteo.com/v1/forecast`
- **Uso**: Fornece dados meteorológicos com base nas coordenadas
- **Parâmetros**:
  - `latitude`, `longitude`: Coordenadas geográficas
  - `hourly`: Dados horários (temperatura, código meteorológico)
  - `daily`: Dados diários (temperatura máx/min, nascer/pôr do sol, etc.)
  - `timezone`: Fuso horário
  - `forecast_days`: Número de dias para previsão (até 16)

### OpenStreetMap
- **URL**: `https://www.openstreetmap.org/export/embed.html`
- **Uso**: Exibe mapa interativo da localização da cidade
- **Parâmetros**:
  - `bbox`: Limites do mapa (longitude/latitude)
  - `marker`: Posição do marcador (latitude, longitude)

## 📂 Estrutura do Código

```
previsao-tempo-cidades-sp/
├── index.html          # Estrutura HTML principal
├── README.md           # Documentação do projeto
└── assets/
    ├── css/
    │   └── styles.css  # Estilos da aplicação (incorporados no HTML)
    └── js/
        └── script.js   # JavaScript da aplicação (incorporado no HTML)
```

## 🔧 Principais Funções

### `obterCoordenadas(nomeCidade)`
Consome a API de geocodificação para converter o nome da cidade em coordenadas geográficas.

```javascript
async function obterCoordenadas(nomeCidade) {
    // Retorna um objeto com latitude, longitude, nome e país
}
```

### `obterPrevisaoTempo(latitude, longitude)`
Consome a API de previsão para obter dados meteorológicos baseados em coordenadas.

```javascript
async function obterPrevisaoTempo(latitude, longitude) {
    // Retorna objeto com dados da previsão
}
```

### `renderizarPrevisao(previsao, nomeCidade)`
Cria e insere os cartões de previsão no DOM para cada dia.

```javascript
function renderizarPrevisao(previsao, nomeCidade) {
    // Renderiza os cartões de previsão para cada dia
}
```

### `pesquisarCidades(termo)`
Busca cidades que correspondem ao termo de pesquisa e exibe os resultados.

```javascript
async function pesquisarCidades(termo) {
    // Pesquisa cidades e mostra resultados interativos
}
```

### `abrirMapa()`
Abre o modal com o mapa da cidade selecionada.

```javascript
function abrirMapa() {
    // Abre o modal com o mapa centrado na cidade
}
```

### `obterDirecaoVento(graus)`
Converte a direção do vento de graus para pontos cardeais (N, NE, L, etc.).

```javascript
function obterDirecaoVento(graus) {
    // Converte graus para direção cardeal
}
```

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para enviar pull requests.

1. Faça um fork do projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Melhorias Futuras

- [ ] Histórico de cidades pesquisadas
- [ ] Temas claro/escuro
- [ ] Notificações de alertas meteorológicos
- [ ] Gráficos de temperatura
- [ ] Suporte a mais idiomas
- [ ] PWA para instalação como aplicativo

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

Desenvolvido com ❤️ por [Seu Nome](https://github.com/seu-usuario)
