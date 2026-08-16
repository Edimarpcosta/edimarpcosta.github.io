/**
 * BEMBOLADO SORVETES & CAFÉ - JAVASCRIPT PRINCIPAL (2026)
 * Tradição desde 1987 em Piracicaba
 */

// --- 1. DADOS DAS UNIDADES EM PIRACICABA ---
const STORES_DATA = [
  {
    id: "nova-america",
    name: "Unidade Nova América",
    street: "R. Antônio Lourenço do Canto, 55",
    neighborhood: "Nova América (Piracicamirim)",
    city: "Piracicaba - SP",
    cep: "13417-750",
    phone: "(19) 3375-7231",
    phoneRaw: "551933757231",
    lat: -22.7384675,
    lng: -47.630977,
    rating: 4.3,
    reviewsCount: 662,
    hours: {
      all: "Segunda a Domingo: 10:00 às 22:00",
      openHour: 10,
      closeHour: 22
    },
    image: "689081514_18588846850040946_5343366069088733742_n.jpg",
    gmapsUrl: "https://www.google.com/maps?cid=11654678171077682119",
    wazeUrl: "https://waze.com/ul?ll=-22.7384675,-47.630977&navigate=yes"
  },
  {
    id: "chacara-esperia",
    name: "Unidade Chácara Esperia",
    street: "R. Manaus, 95",
    neighborhood: "Chácara Esperia",
    city: "Piracicaba - SP",
    cep: "13403-141",
    phone: "(19) 97423-4655",
    phoneRaw: "5519974234655",
    lat: -22.721986,
    lng: -47.6827903,
    rating: 4.6,
    reviewsCount: 265,
    hours: {
      all: "Segunda a Domingo: 10:00 às 20:00",
      openHour: 10,
      closeHour: 20
    },
    image: "687782307_18588846829040946_8171579911496844393_n.jpg",
    gmapsUrl: "https://www.google.com/maps?cid=3705512999906438417",
    wazeUrl: "https://waze.com/ul?ll=-22.721986,-47.6827903&navigate=yes"
  },
  {
    id: "paulista",
    name: "Unidade Paulista / Jaraguá",
    street: "Av. Dona Jane Conceição, 1561",
    neighborhood: "Jaraguá / Paulista",
    city: "Piracicaba - SP",
    cep: "13401-110",
    phone: "(19) 97423-4655",
    phoneRaw: "5519974234655",
    lat: -22.7387507,
    lng: -47.6560853,
    rating: 5.0,
    reviewsCount: 15,
    hours: {
      all: "Segunda a Domingo: 10:00 às 22:00",
      openHour: 10,
      closeHour: 22
    },
    image: "689468573_18588846889040946_7430038867888944042_n.jpg",
    gmapsUrl: "https://www.google.com/maps?cid=4468747061131924884",
    wazeUrl: "https://waze.com/ul?ll=-22.7387507,-47.6560853&navigate=yes"
  },
  {
    id: "mario-dedini",
    name: "Unidade Mário Dedini",
    street: "Av. Luiz Ralf Benatti, 80",
    neighborhood: "Mário Dedini",
    city: "Piracicaba - SP",
    cep: "13412-248",
    phone: "(19) 97423-4655",
    phoneRaw: "5519974234655",
    lat: -22.6848387,
    lng: -47.6661435,
    rating: 4.1,
    reviewsCount: 20,
    hours: {
      all: "Segunda a Domingo: 11:00 às 22:00",
      openHour: 11,
      closeHour: 22
    },
    image: "686434994_18588846868040946_8183053617822276622_n.jpg",
    gmapsUrl: "https://www.google.com/maps?cid=17929533407215265766",
    wazeUrl: "https://waze.com/ul?ll=-22.6848387,-47.6661435&navigate=yes"
  }
];

// --- 2. DADOS DOS PRODUTOS POR CATEGORIA (ATUALIZADOS COM IFOOD.CSV) ---
const PRODUCTS_DATA = [
  // PICOLÉS & PALETAS
  {
    id: "picoles-1",
    category: "picoles",
    categoryName: "Picolés & Paletas",
    name: "Sorvete Picolé Caixa - 18 unidades",
    badge: "18 Unidades 🍭",
    price: "R$ 58,50",
    desc: "A caixa perfeita para quem ama sorvete! 18 picolés com sabores refrescantes e irresistíveis, ideais para compartilhar com a família.",
    tag: "18 Unidades",
    image: "assets/products/picole_caixa_18.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=cf5a98f6-88ec-4094-b375-6fe85005e2ee"
  },
  {
    id: "picoles-2",
    category: "picoles",
    categoryName: "Picolés & Paletas",
    name: "Stecco Premium - Kit com 5 unidades",
    badge: "Premium Crocante 🍫",
    price: "R$ 45,50",
    desc: "Sorvete super cremoso com cobertura de chocolate crocante. Equilíbrio perfeito entre textura, sabor e indulgência.",
    tag: "Kit 5 un",
    image: "assets/products/stecco_premium_5.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=1ea7fa21-3051-4a59-ad54-687ed7d0f675"
  },
  {
    id: "picoles-3",
    category: "picoles",
    categoryName: "Picolés & Paletas",
    name: "Paletas Recheadas - Kit com 5 unidades",
    badge: "Super Recheio 🍓",
    price: "R$ 35,75",
    desc: "Casquinha gelada por fora e recheio cremoso e generoso por dentro. Sabores que conquistam na primeira mordida.",
    tag: "Kit 5 un",
    image: "assets/products/paletas_recheadas_5.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=a9edf968-cad3-4b58-be89-6e6bfca024f9"
  },
  {
    id: "picoles-4",
    category: "picoles",
    categoryName: "Picolés & Paletas",
    name: "Picolés Skimo - Kit com 5 unidades",
    badge: "Mais Vendido 🔥",
    price: "R$ 35,75",
    desc: "Refrescância, sabor e qualidade em cada picolé com a clássica cobertura crocante de chocolate.",
    tag: "Kit 5 un",
    image: "assets/products/skimo_kit_5.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=34527d26-ec2b-41c5-8556-ecc993012ecb"
  },
  {
    id: "picoles-5",
    category: "picoles",
    categoryName: "Picolés & Paletas",
    name: "Combo Premium | 5 Steccos + 5 Paletas",
    badge: "Combo 10 Unidades 🏆",
    price: "R$ 77,19",
    originalPrice: "R$ 81,25",
    desc: "Reúna o melhor de dois sucessos: 5 Steccos Premium crocantes e 5 Paletas Recheadas para uma explosão de sabor.",
    tag: "10 Sobremesas",
    image: "assets/products/combo_stecco_paletas.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=9352eb58-ae0b-46b7-8932-4a09cae1921a"
  },

  // POTES & SORVETES PARA VIAGEM
  {
    id: "potes-1",
    category: "potes",
    categoryName: "Potes para Viagem",
    name: "Pote de Sorvete Artesanal 1,1 Litros",
    badge: "Tradição 1,1L 🍨",
    price: "A partir de R$ 33,00",
    desc: "O melhor sorvete artesanal de Piracicaba em pote generoso. Textura incrivelmente cremosa e sabor marcante.",
    tag: "1.1 Litros",
    image: "assets/products/pote_1_1l.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=e0755242-65b9-4a09-886c-289563761831"
  },
  {
    id: "potes-2",
    category: "potes",
    categoryName: "Potes para Viagem",
    name: "Pote 1,1 Litros | Promoção 2 Unidades",
    badge: "2,2L em Promoção ⭐",
    price: "R$ 62,29",
    desc: "Leve 2 potes de 1,1 litro e garanta ainda mais cremosidade, sabor e economia para toda a família.",
    tag: "2 Potes (2.2L)",
    image: "assets/products/pote_1_1l_promo2.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=f5296ebf-fd07-46fa-aec9-c369bdf45feb"
  },
  {
    id: "potes-3",
    category: "potes",
    categoryName: "Potes para Viagem",
    name: "Pote 2 Litros Tradicional Família",
    badge: "Pote 2L 🏠",
    price: "R$ 49,64",
    desc: "2 litros de puro sabor artesanal, cremosidade inigualável e ingredientes nobres para deixar qualquer momento mais doce.",
    tag: "2.0 Litros",
    image: "assets/products/pote_2l.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=4f4036ef-6d09-4c3c-b7e8-7a3cd560af9c"
  },
  {
    id: "potes-4",
    category: "potes",
    categoryName: "Potes para Viagem",
    name: "Sorvete - Caixa Festa 05 Litros",
    badge: "5 Litros para Festas 🎉",
    price: "R$ 156,00",
    desc: "Muito mais sorvete para festas e confraternizações. Textura cremosa e sabores inesquecíveis com excelente custo-benefício.",
    tag: "Caixa 5 Litros",
    image: "assets/products/caixa_5_litros.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=8200e081-5cf3-456b-b2c5-736cc65691b9"
  },

  // AÇAÍ NOBRE
  {
    id: "acai-1",
    category: "acai",
    categoryName: "Açaí Nobre",
    name: "Açaí Premium Natural - Pote 1,1L",
    badge: "Fabricação Própria 🍇",
    price: "R$ 49,64",
    desc: "Produzido artesanalmente com receita própria, textura cremosa sem cristais de gelo e sabor autêntico de açaí puro.",
    tag: "1.1 Litros",
    image: "assets/products/acai_premium_natural.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=9e039c43-3ed0-4541-aa33-f03c3c74d175"
  },
  {
    id: "acai-2",
    category: "acai",
    categoryName: "Açaí Nobre",
    name: "Açaí Premium com Banana - Pote 1,1L",
    badge: "Açaí + Banana 🍌",
    price: "R$ 49,64",
    desc: "A clássica combinação de açaí artesanal batido com banana realçando o sabor da fruta e a textura aveludada.",
    tag: "1.1 Litros",
    image: "assets/products/acai_premium_banana.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=4d07baf8-daa2-4a12-97f0-0bfc3e18c516"
  },

  // SORVETES DIET / ZERO AÇÚCAR
  {
    id: "diet-1",
    category: "diet",
    categoryName: "Sorvetes Diet",
    name: "Pote 1,1 Litros | Zero Adição de Açúcar",
    badge: "Zero Açúcar 🌿",
    price: "R$ 49,30",
    desc: "Todo o sabor e cremosidade do sorvete artesanal Bembolado sem adição de açúcar. Feito com Polidextrose e Z-Trim.",
    tag: "1.1 Litros Zero",
    image: "assets/products/pote_1_1l_zero.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=47074925-d912-4351-b33d-45cef9c4405d"
  },
  {
    id: "diet-2",
    category: "diet",
    categoryName: "Sorvetes Diet",
    name: "Picolé Caixa - 18 unidades | Zero Açúcar",
    badge: "18 Picolés Zero 🍃",
    price: "R$ 117,00",
    desc: "Caixa com 18 picolés Zero Açúcar para saborear com leveza, equilíbrio e o sabor incomparável da nossa fábrica.",
    tag: "18 Unidades Zero",
    image: "assets/products/picole_caixa_18_zero.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=61cec386-5f88-492a-b12c-ebb53ba65e51"
  },

  // CASQUINHAS & COBERTURAS
  {
    id: "casquinhas-1",
    category: "casquinhas",
    categoryName: "Casquinhas & Coberturas",
    name: "Cascão Crocante - Kit com 10 Unidades",
    badge: "Super Crocante 🍦",
    price: "R$ 13,00",
    desc: "Cascões fresquinhos e crocantes para montar suas sobremesas e sorvetes favoritos com o toque profissional da Bembolado.",
    tag: "Kit 10 Cascões",
    image: "assets/products/cascao_kit10.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=ff3c4896-f86e-449f-b91c-3ca9d88a5f79"
  },
  {
    id: "casquinhas-2",
    category: "casquinhas",
    categoryName: "Casquinhas & Coberturas",
    name: "Cestinha Doce - Kit com 5 Unidades",
    badge: "Para Servir em Casa ✨",
    price: "R$ 6,50",
    desc: "Cestinhas crocantes ideais para servir sorvetes, açaí, caldas e frutas com muito charme e sabor.",
    tag: "Kit 5 Cestinhas",
    image: "assets/products/cestinha_kit5.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=0da7d699-a4b7-4875-9a05-b655dd58e045"
  },
  {
    id: "casquinhas-3",
    category: "casquinhas",
    categoryName: "Casquinhas & Coberturas",
    name: "Cobertura Especial Bembolado 300g",
    badge: "Sem Glúten 🍫",
    price: "R$ 16,25",
    desc: "Calda cremosa artesanal com sabor intenso para regar sorvetes, açaí, waffles e sobremesas em geral.",
    tag: "Frasco 300g",
    image: "assets/products/cobertura_300g.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?prato=b3a9847f-73af-4527-a18e-f271c909212d"
  },

  // TAÇAS, SELF-SERVICE & CAFETERIA (EXPERIÊNCIA EM LOJA)
  {
    id: "tacas-1",
    category: "tacas",
    categoryName: "Taças Especiais",
    name: "Taça Vulcão de Nutella & Ninho",
    badge: "Destaque da Loja 🔥",
    price: "Feita na hora",
    desc: "Bordas generosas de Nutella pura, bolas de sorvete de Ninho Trufado, morangos frescos picados, chantilly e castanhas.",
    tag: "20 Opções Exclusivas",
    image: "hero_banner.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?utm_medium=share"
  },
  {
    id: "self-1",
    category: "self-service",
    categoryName: "Self-Service",
    name: "Sorvete Tradicional de Pamonha Caipira",
    badge: "Sabor Típico Piracicabano 🌽",
    price: "Self-Service por Quilo",
    desc: "O autêntico sabor caipira da nossa terra feito com milho verde selecionado e uma textura ultracremosa inconfundível.",
    tag: "Exclusividade da Casa",
    image: "hero_banner.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?utm_medium=share"
  },
  {
    id: "cafe-1",
    category: "cafe",
    categoryName: "Cafeteria Gourmet",
    name: "Cappuccinos, Frappuccinos & Chocolate Quente",
    badge: "+53 Mil Combinações ☕",
    price: "Grãos Nobres Moídos",
    desc: "Grãos selecionados moídos na hora, cappuccinos com borda de doce de leite, frapês gelados de café com sorvete e chocolate cremoso.",
    tag: "Cafeteria Artesanal",
    image: "hero_banner.jpg",
    ifoodUrl: "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?utm_medium=share"
  }
];

// --- 3. DADOS DA LINHA DO TEMPO (1987 - 2026) ---
const TIMELINE_DATA = [
  {
    year: "1987",
    title: "O Início da Tradição no Bairro Alto",
    desc: "O Sr. Jefferson Granziol e a Sra. Jussara Granziol iniciaram sua jornada na adolescência, aprendendo a arte do sorvete artesanal em Piracicaba. Com apoio do mestre sorveteiro, abriram a primeira unidade na Av. Armando Salles de Oliveira, dando nascimento à marca Bembolado.",
    highlight: "Nascimento da marca e receitas autorais",
    badge: "Ano 1987"
  },
  {
    year: "1992",
    title: "Fábrica Própria na Vila Monteiro",
    desc: "A sorveteria é transferida para sede própria na Rua Lázaro Lozano, Vila Monteiro. Ao se livrar do aluguel, a Bembolado realizou grandes investimentos em tecnologia de maquinário e pasteurização para elevar a capacidade produtiva.",
    highlight: "Modernização fabril e aumento de qualidade",
    badge: "Ano 1992"
  },
  {
    year: "1997",
    title: "Inauguração da Loja Nova América",
    desc: "Abertura da consagrada unidade do Piracicamirim (Rua Antônio Lourenço do Canto, 55). A loja trouxe um salto expressivo nas vendas e se tornou ponto de encontro obrigatório para famílias de toda a região.",
    highlight: "Consolidação como sorveteria favorita do bairro",
    badge: "Ano 1997"
  },
  {
    year: "2006",
    title: "Aquisição na Av. Independência",
    desc: "O Sr. Jefferson adquiriu a tradicional loja da Av. Independência (onde tudo começou na juventude), unificando a marca Bembolado Sorvetes e expandindo a logística física de armazenagem.",
    highlight: "Expansão de capacidade e unificação de marca",
    badge: "Ano 2006"
  },
  {
    year: "2012",
    title: "Unidade Gourmet na Dr. Paulo Moraes",
    desc: "Inauguração do conceito Gourmet na Av. Doutor Paulo Moraes, unindo sorvetes nobres, sobremesas exclusivas, cafeteria premium e ambiente aconchegante.",
    highlight: "Conceito Gourmet e Cafeteria Artesanal",
    badge: "Ano 2012"
  },
  {
    year: "2024",
    title: "Nova Era e Renovação Tecnológica",
    desc: "Atualização completa dos processos industriais e introdução de novas linhas de taças especiais, açaí premium e embalagens sustentáveis para viagem.",
    highlight: "Modernização de embalagens e sabores",
    badge: "Ano 2024"
  },
  {
    year: "2026",
    title: "39 Anos de História & Expansão Regional",
    desc: "Celebrando 39 anos de sabor e afeto, a Bembolado expande o programa 'Seja um Ponto de Venda' e fortalece novos canais de distribuição para levar os melhores picolés e potes para comércios de todo o interior paulista.",
    highlight: "Expansão do Programa Ponto de Venda & Franquias",
    badge: "Ano 2026 (Hoje)"
  }
];

// --- 4. CÁLCULO DE DISTÂNCIA (HAVERSINE FORMULA) ---
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Verifica se a loja está aberta no momento com base no horário de Piracicaba
function isStoreCurrentlyOpen(store) {
  const now = new Date();
  // Horário de Brasília / São Paulo
  const currentHour = now.getHours();
  return currentHour >= store.hours.openHour && currentHour < store.hours.closeHour;
}

// --- 5. INICIALIZAÇÃO DO MAPA LEAFLET.JS ---
let leafletMap = null;
let mapMarkers = [];

function initLeafletMap() {
  const mapElement = document.getElementById("leaflet-map");
  if (!mapElement || typeof L === "undefined") return;

  // Centro de Piracicaba
  leafletMap = L.map("leaflet-map", {
    scrollWheelZoom: false
  }).setView([-22.724, -47.658], 13);

  // Tiles modernos CartoDB Positron / OSM
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(leafletMap);

  // Marcador customizado com a logo oficial da Bembolado
  const createPinIcon = (name) => {
    return L.divIcon({
      className: "custom-leaflet-pin",
      html: `
        <div class="pin-bubble" title="${name}">
          <img src="logo-bembolado-sorvetes.png" alt="Bembolado" style="width: 26px; height: auto; transform: rotate(45deg); filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));" />
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 48],
      popupAnchor: [0, -44]
    });
  };

  STORES_DATA.forEach((store, index) => {
    const isOpen = isStoreCurrentlyOpen(store);
    const statusHtml = isOpen
      ? `<span style="color:#107C41; font-weight:700;">🟢 Aberto Agora</span>`
      : `<span style="color:#D12543; font-weight:700;">🔴 Fechado no momento</span>`;

    const popupContent = `
      <div style="font-family:'Plus Jakarta Sans', sans-serif; min-width: 220px; padding: 4px;">
        <h4 style="margin: 0 0 4px; color: #3D1E16; font-size: 1.1rem; font-weight: 700;">${store.name}</h4>
        <p style="margin: 0 0 6px; font-size: 0.85rem; color: #6C5549;">${store.street} - ${store.neighborhood}</p>
        <p style="margin: 0 0 8px; font-size: 0.8rem;">${statusHtml} • ${store.hours.all}</p>
        <div style="display:flex; gap:6px; margin-top:8px;">
          <a href="${store.gmapsUrl}" target="_blank" style="background:#1A73E8; color:#fff; padding:6px 12px; border-radius:6px; font-size:0.75rem; text-decoration:none; font-weight:700;">Google Maps</a>
          <a href="${store.wazeUrl}" target="_blank" style="background:#0088CC; color:#fff; padding:6px 12px; border-radius:6px; font-size:0.75rem; text-decoration:none; font-weight:700;">Waze</a>
        </div>
      </div>
    `;

    const marker = L.marker([store.lat, store.lng], {
      icon: createPinIcon(store.name)
    })
      .addTo(leafletMap)
      .bindPopup(popupContent);

    mapMarkers.push({ id: store.id, marker });
  });
}

function focusStoreOnMap(storeId) {
  const store = STORES_DATA.find((s) => s.id === storeId);
  const targetMarkerObj = mapMarkers.find((m) => m.id === storeId);

  if (store && leafletMap && targetMarkerObj) {
    leafletMap.flyTo([store.lat, store.lng], 15, { duration: 1.2 });
    targetMarkerObj.marker.openPopup();

    // Destaque visual nos cards
    document.querySelectorAll(".store-card").forEach((c) => c.classList.remove("selected"));
    const activeCard = document.querySelector(`.store-card[data-id="${storeId}"]`);
    if (activeCard) activeCard.classList.add("selected");
  }
}

// --- 6. RENDERIZAÇÃO DOS CARDS DAS LOJAS ---
function renderStoresList() {
  const container = document.getElementById("stores-list-container");
  if (!container) return;

  container.innerHTML = STORES_DATA.map((store) => {
    const isOpen = isStoreCurrentlyOpen(store);
    const statusText = isOpen ? "Aberto Agora" : "Fechado";
    const statusClass = isOpen ? "open" : "closed";

    return `
      <div class="store-card" data-id="${store.id}" onclick="focusStoreOnMap('${store.id}')">
        <div class="store-thumb">
          <img src="${store.image}" alt="${store.name}" loading="lazy" />
        </div>
        <div class="store-details">
          <div class="store-status-row">
            <span class="status-badge ${statusClass}">
              <span class="status-dot"></span> ${statusText}
            </span>
            <span class="store-rating">★ ${store.rating.toFixed(1)} <small style="color:var(--text-light); font-weight:500;">(${store.reviewsCount})</small></span>
          </div>
          <h3 class="store-name">${store.name}</h3>
          <p class="store-address">${store.street}<br><strong style="color:var(--secondary); font-weight:600;">${store.neighborhood}</strong>, ${store.city}</p>
          <p class="store-hours">🕒 ${store.hours.all}</p>
          
          <div class="store-actions" onclick="event.stopPropagation()">
            <a href="${store.gmapsUrl}" target="_blank" class="store-btn store-btn-maps" title="Abrir rota no Google Maps">
              📍 Maps
            </a>
            <a href="${store.wazeUrl}" target="_blank" class="store-btn store-btn-waze" title="Abrir rota no Waze">
              🚗 Waze
            </a>
            <a href="tel:${store.phoneRaw}" class="store-btn store-btn-call" title="Ligar para a loja">
              📞 ${store.phone}
            </a>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// --- 7. RENDERIZAÇÃO DOS PRODUTOS & TABS ---
function renderProducts(category = "all") {
  const container = document.getElementById("products-grid");
  if (!container) return;

  const filtered = category === "all"
    ? PRODUCTS_DATA
    : PRODUCTS_DATA.filter((p) => p.category === category);

  let cardsHtml = filtered.map((prod) => {
    const itemUrl = prod.ifoodUrl || "https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?utm_medium=share";
    return `
      <div class="product-card" data-category="${prod.category}">
        <div class="product-img-wrapper">
          <img src="${prod.image}" alt="${prod.name}" loading="lazy" />
          ${prod.badge ? `<span class="product-badge badge-flag-popular">${prod.badge}</span>` : ""}
        </div>
        <div class="product-info">
          <span class="product-category-label">${prod.categoryName}</span>
          <h3 class="product-name">${prod.name}</h3>
          <p class="product-desc">${prod.desc}</p>
          <div class="product-footer">
            <span class="product-tag">${prod.tag}</span>
            <a href="${itemUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-ifood btn-sm" title="Ver ${prod.name} no iFood">
              Ver no iFood ➔
            </a>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Adiciona os cards promocionais para preencher o grid com dinamismo e alta conversão
  if (category === "all" || category === "tacas" || category === "cafe") {
    cardsHtml += `
      <!-- Card Promo iFood -->
      <div class="promo-grid-card promo-ifood">
        <div>
          <div class="promo-icon">🛵</div>
          <h3>Peça pelo iFood em Casa</h3>
          <p>Receba em minutos com embalagem térmica especial em qualquer bairro de Piracicaba.</p>
        </div>
        <a href="https://www.ifood.com.br/delivery/piracicaba-sp/bembolado-sorvetes-chacara-esperia/9f281629-b50f-42fc-8b34-446f2651ee87?utm_medium=share" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="background:#ffffff; color:#EA1D2C; font-weight:800;">
          Cardápio Completo iFood ➔
        </a>
      </div>

      <!-- Card Promo Ponto de Venda B2B -->
      <div class="promo-grid-card promo-b2b">
        <div>
          <div class="promo-icon">🏪</div>
          <h3>Seja um Ponto de Venda</h3>
          <p>Revenda nossos picolés e potes com freezers em comodato, entrega refrigerada própria e alta rentabilidade.</p>
        </div>
        <a href="#ponto-de-venda" class="btn btn-primary" style="background:var(--primary); color:#ffffff; font-weight:700;">
          Quero Revender ➔
        </a>
      </div>

      <!-- Card Promo Experiência nas Lojas -->
      <div class="promo-grid-card promo-lojas">
        <div>
          <div class="promo-icon">🍦</div>
          <h3>Visite Nossas 4 Lojas</h3>
          <p>Conheça o buffet self-service com mais de 40 sabores, sorvete de pamonha e nossas 20 taças montadas na hora.</p>
        </div>
        <a href="#lojas" class="btn btn-secondary" style="background:var(--secondary); color:#ffffff; font-weight:700; border:none;">
          Ver Unidades no Mapa ➔
        </a>
      </div>
    `;
  }

  container.innerHTML = cardsHtml;
}

function handleSaborPertoPermitir() {
  openGpsModal();
}

function handleSaborPertoRecusar() {
  const card = document.getElementById("sabor-perto-card");
  if (card) {
    card.style.transition = "all 0.3s ease";
    card.style.opacity = "0";
    card.style.transform = "scale(0.95)";
    setTimeout(() => {
      card.classList.add("hidden");
    }, 300);
  }
}

function initProductTabs() {
  const tabs = document.querySelectorAll(".category-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const category = tab.getAttribute("data-category");
      renderProducts(category);
    });
  });
}

// --- 8. RENDERIZAÇÃO DA LINHA DO TEMPO (TIMELINE) ---
function renderTimeline() {
  const navContainer = document.getElementById("timeline-years-nav");
  const sliderContainer = document.getElementById("timeline-slider");
  if (!navContainer || !sliderContainer) return;

  // Render Botões de Ano
  navContainer.innerHTML = TIMELINE_DATA.map((item, index) => {
    const activeClass = index === 0 ? "active" : "";
    return `
      <button class="timeline-year-btn ${activeClass}" data-year="${item.year}" onclick="selectTimelineYear('${item.year}')">
        ${item.year}
      </button>
    `;
  }).join("");

  // Render Cards de História
  sliderContainer.innerHTML = TIMELINE_DATA.map((item, index) => {
    const activeClass = index === 0 ? "active" : "";
    return `
      <div class="timeline-card ${activeClass}" id="timeline-card-${item.year}">
        <div class="timeline-visual">
          <img src="684289792_18588801889040946_2585470112546310601_n.jpg" alt="${item.title}" />
          <span class="timeline-year-badge">${item.badge}</span>
        </div>
        <div class="timeline-content">
          <span class="badge-tag">Nossa Trajetória</span>
          <h3>${item.title}</h3>
          <p>${item.desc}</p>
          <div class="timeline-highlight">
            ✨ ${item.highlight}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function selectTimelineYear(year) {
  document.querySelectorAll(".timeline-year-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-year") === year);
  });

  document.querySelectorAll(".timeline-card").forEach((card) => {
    card.classList.remove("active");
  });

  const targetCard = document.getElementById(`timeline-card-${year}`);
  if (targetCard) targetCard.classList.add("active");
}

// --- 9. MODAL GPS ("SABOR POR PERTO?") ---
function openGpsModal() {
  const modal = document.getElementById("gps-modal");
  if (!modal) return;

  modal.classList.add("open");
  const contentArea = document.getElementById("gps-result-area");
  
  contentArea.innerHTML = `
    <div class="gps-calc-status">
      <div class="radar-spinner"></div>
      <h4 style="font-size:1.15rem; color:var(--secondary); margin-bottom:6px;">Calculando rota mais próxima...</h4>
      <p style="font-size:0.9rem; color:var(--text-muted);">Aguardando permissão de localização do seu navegador.</p>
    </div>
  `;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        displayClosestStore(userLat, userLng);
      },
      (error) => {
        displayGpsFallback("Não foi possível obter sua localização exata. Selecione seu bairro abaixo para calcularmos a melhor opção!");
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  } else {
    displayGpsFallback("Geolocalização não suportada. Selecione seu bairro:");
  }
}

function closeGpsModal() {
  const modal = document.getElementById("gps-modal");
  if (modal) modal.classList.remove("open");
}

function displayClosestStore(userLat, userLng) {
  const contentArea = document.getElementById("gps-result-area");
  if (!contentArea) return;

  // Calcula a distância para todas as 4 lojas
  const storeDistances = STORES_DATA.map((store) => {
    const dist = calculateDistanceKm(userLat, userLng, store.lat, store.lng);
    return { ...store, distanceKm: dist };
  });

  storeDistances.sort((a, b) => a.distanceKm - b.distanceKm);
  const closest = storeDistances[0];
  const isOpen = isStoreCurrentlyOpen(closest);

  // Estimativa de tempo (carro @ ~35km/h na cidade)
  const driveMinutes = Math.max(2, Math.round(closest.distanceKm * 2.2));

  contentArea.innerHTML = `
    <div class="closest-store-result">
      <div class="distance-highlight">
        <span>📍</span> ${closest.distanceKm < 1 ? `${Math.round(closest.distanceKm * 1000)} metros` : `${closest.distanceKm.toFixed(1)} km`} de você!
      </div>
      <h3 style="font-size:1.35rem; color:var(--secondary); margin-bottom:4px;">${closest.name}</h3>
      <p style="font-size:0.92rem; color:var(--text-muted); margin-bottom:12px;">${closest.street} - ${closest.neighborhood}</p>
      
      <div style="display:flex; align-items:center; gap:12px; font-size:0.88rem; margin-bottom:18px;">
        <span style="font-weight:700; color:${isOpen ? '#107C41' : '#D12543'};">${isOpen ? '🟢 Aberto Agora' : '🔴 Fechado'}</span>
        <span>•</span>
        <span>🚗 ~${driveMinutes} min de trajeto</span>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <a href="${closest.gmapsUrl}" target="_blank" class="btn btn-primary btn-sm" style="flex:1;">
          Navegar no Google Maps
        </a>
        <a href="${closest.wazeUrl}" target="_blank" class="btn btn-secondary btn-sm" style="flex:1;">
          Navegar no Waze
        </a>
      </div>
    </div>

    <div style="text-align:center;">
      <button onclick="closeGpsModal(); focusStoreOnMap('${closest.id}');" style="color:var(--primary); font-weight:700; font-size:0.9rem; text-decoration:underline;">
        Ver esta unidade no mapa da página
      </button>
    </div>
  `;
}

function displayGpsFallback(message) {
  const contentArea = document.getElementById("gps-result-area");
  if (!contentArea) return;

  contentArea.innerHTML = `
    <div style="text-align:center; margin-bottom:16px;">
      <p style="font-size:0.95rem; color:var(--text-muted);">${message}</p>
    </div>
    
    <div class="manual-neighborhood-select">
      <label for="neighborhood-select">Escolha seu Bairro ou Região em Piracicaba:</label>
      <select id="neighborhood-select" class="custom-select" onchange="handleNeighborhoodChoice(this.value)">
        <option value="">Selecione...</option>
        <option value="nova-america">Nova América / Piracicamirim / Pompéia</option>
        <option value="chacara-esperia">Chácara Esperia / Santa Rosa / São Dimas</option>
        <option value="paulista">Paulista / Jaraguá / Paulicéia / Bairro Alto</option>
        <option value="mario-dedini">Mário Dedini / Santa Terezinha / Vila Sônia</option>
        <option value="centro">Centro / Cidade Jardim / Vila Monteiro</option>
      </select>
    </div>
  `;
}

function handleNeighborhoodChoice(choice) {
  if (!choice) return;
  
  // Coordenadas aproximadas dos bairros
  const neighborhoodCoords = {
    "nova-america": { lat: -22.738, lng: -47.631 },
    "chacara-esperia": { lat: -22.721, lng: -47.682 },
    "paulista": { lat: -22.738, lng: -47.656 },
    "mario-dedini": { lat: -22.684, lng: -47.666 },
    "centro": { lat: -22.725, lng: -47.649 }
  };

  const coords = neighborhoodCoords[choice];
  if (coords) {
    displayClosestStore(coords.lat, coords.lng);
  }
}

// --- 10. INTERAÇÃO DO HEADER, MENU MOBILE E SCROLL ---
function initNavigation() {
  const header = document.querySelector(".header");
  const menuToggle = document.getElementById("menu-toggle");
  const mobileNav = document.getElementById("mobile-nav");
  const mobileLinks = document.querySelectorAll(".mobile-nav-link");

  // Scroll Header Effect
  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });

  // Mobile Menu Toggle
  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", () => {
      mobileNav.classList.toggle("open");
    });

    mobileLinks.forEach((link) => {
      link.addEventListener("click", () => {
        mobileNav.classList.remove("open");
      });
    });
  }
}

// --- 11. INICIALIZAÇÃO GLOBAL ---
document.addEventListener("DOMContentLoaded", () => {
  renderStoresList();
  renderProducts("all");
  renderTimeline();
  initProductTabs();
  initNavigation();
  initLeafletMap();

  // Fecha o modal ao clicar fora da janela
  const modal = document.getElementById("gps-modal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeGpsModal();
    });
  }
});
