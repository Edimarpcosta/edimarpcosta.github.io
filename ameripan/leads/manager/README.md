<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ajuda — Gestor de Leads PRO</title>
  <style>
    :root {
      --bg:#0b1220;
      --panel:#0f1a2f;
      --panel2:#0d162a;
      --text:#e8eefc;
      --muted:#a7b6d9;
      --brand:#55c1ff;
      --ok:#3ddc97;
      --warn:#ffcc66;
      --bad:#ff6b6b;
      --line: rgba(255,255,255,.10);
      --shadow: 0 20px 60px rgba(0,0,0,.35);
      --radius: 18px;
    }
    * { box-sizing: border-box; }
    body {
      margin:0;
      background: radial-gradient(1200px 700px at 20% 10%, rgba(85,193,255,.18), transparent 55%),
                  radial-gradient(1200px 700px at 85% 20%, rgba(61,220,151,.12), transparent 55%),
                  radial-gradient(900px 600px at 50% 95%, rgba(255,204,102,.10), transparent 60%),
                  var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial;
      line-height: 1.45;
    }
    a { color: var(--brand); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .wrap {
      max-width: 1200px;
      margin: 0 auto;
      padding: 18px;
    }
    .hero {
      background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 18px 18px 14px;
      overflow: hidden;
      position: relative;
    }
    .hero:before {
      content:"";
      position:absolute; inset:-2px;
      background: radial-gradient(600px 240px at 30% 10%, rgba(85,193,255,.15), transparent 60%),
                  radial-gradient(600px 240px at 70% 20%, rgba(61,220,151,.12), transparent 60%);
      pointer-events:none;
    }
    .hero > * { position: relative; }
    h1 {
      margin: 0 0 6px;
      font-size: 22px;
      letter-spacing:.2px;
    }
    .sub {
      margin:0;
      color: var(--muted);
      font-size: 14px;
    }
    .meta {
      margin-top: 10px;
      display:flex;
      gap:10px;
      flex-wrap: wrap;
      color: var(--muted);
      font-size: 13px;
    }
    .badge {
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,.05);
      border: 1px solid var(--line);
    }
    .grid {
      margin-top: 14px;
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 14px;
      align-items: start;
    }
    @media (max-width: 980px) {
      .grid { grid-template-columns: 1fr; }
      .toc { position: static !important; }
    }
    .card {
      background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
    }
    .toc {
      position: sticky;
      top: 14px;
      padding: 14px;
    }
    .toc h2 {
      margin: 0 0 10px;
      font-size: 15px;
      color: var(--text);
    }
    .toc a {
      display:block;
      padding: 7px 10px;
      border-radius: 12px;
      color: var(--muted);
    }
    .toc a:hover {
      background: rgba(85,193,255,.10);
      color: var(--text);
      text-decoration:none;
    }
    .toc .small {
      font-size: 12px;
      opacity: .95;
      margin-top: 12px;
      color: var(--muted);
      border-top: 1px dashed var(--line);
      padding-top: 10px;
    }
    .content {
      padding: 14px;
    }
    h2 {
      margin: 18px 0 8px;
      font-size: 18px;
    }
    h3 {
      margin: 16px 0 6px;
      font-size: 15px;
      color: #dfe8ff;
    }
    p {
      margin: 8px 0;
      color: #d8e2ff;
    }
    .muted { color: var(--muted); }
    .kbd {
      display: inline-block;
      padding: 2px 8px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,.05);
      border-radius: 9px;
      font-size: 12px;
      color: #eaf1ff;
      vertical-align: middle;
    }
    .pill {
      display:inline-flex;
      gap:6px;
      align-items:center;
      padding: 3px 10px;
      border-radius:999px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,.04);
      color: var(--muted);
      font-size: 12px;
      margin: 2px 6px 2px 0;
      white-space: nowrap;
    }
    .ok { color: var(--ok); }
    .warn { color: var(--warn); }
    .bad { color: var(--bad); }
    .callout {
      border: 1px solid var(--line);
      background: rgba(0,0,0,.20);
      border-radius: 16px;
      padding: 12px;
      margin: 10px 0;
    }
    .callout strong { color: #eef4ff; }
    ul,ol { margin: 8px 0 8px 20px; }
    li { margin: 6px 0; color: #d8e2ff; }
    code {
      background: rgba(255,255,255,.06);
      border: 1px solid var(--line);
      padding: 2px 6px;
      border-radius: 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12px;
      color:#f2f6ff;
    }
    pre {
      padding: 12px;
      border-radius: 16px;
      border: 1px solid var(--line);
      background: rgba(0,0,0,.25);
      overflow:auto;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.03);
    }
    pre code {
      background: transparent;
      border: none;
      padding: 0;
      font-size: 12px;
      color: #eaf1ff;
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 10px 0;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 16px;
    }
    th, td {
      padding: 10px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      vertical-align: top;
      text-align: left;
    }
    th {
      font-size: 12px;
      color: var(--muted);
      letter-spacing: .3px;
      background: rgba(255,255,255,.04);
    }
    tr:last-child td { border-bottom: none; }
    .icon {
      font-size: 16px;
      width: 22px;
      display:inline-block;
      text-align:center;
    }
    details {
      border: 1px solid var(--line);
      background: rgba(255,255,255,.03);
      border-radius: 16px;
      padding: 10px 12px;
      margin: 10px 0;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
      color: #f2f6ff;
    }
    .two {
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    @media (max-width: 820px) {
      .two { grid-template-columns: 1fr; }
    }
    .foot {
      margin: 14px 0 22px;
      text-align: center;
      color: var(--muted);
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <h1>Ajuda — Gestor de Leads PRO</h1>
      <p class="sub">Manual completo (ícones, botões, fluxos, importação/exportação, Google Sheets, enriquecimento por CNPJ e dicas para mobile/desktop).</p>
      <div class="meta">
        <span class="badge">Atualizado em: 2026-02-14 22:48</span>
        <span class="badge">Uso recomendado: Chrome / Edge</span>
        <span class="badge">Funciona: Smartphone • Tablet • Notebook</span>
      </div>
    </div>

    <div class="grid">
      <div class="card toc">
        <h2>Conteúdo</h2>
        <a href="#inicio">Começar rápido</a>
        <a href="#conceitos">Conceitos</a>
        <a href="#layout">Layout e navegação</a>
        <a href="#leads">Leads</a>
        <a href="#clientes">Clientes Ativos</a>
        <a href="#agenda">Agenda</a>
        <a href="#conjuntos">Conjuntos (vários “bancos”)</a>
        <a href="#importar">Importar</a>
        <a href="#exportar">Exportar</a>
        <a href="#backup">Backup e restauração</a>
        <a href="#sheets">Google Sheets</a>
        <a href="#cnpj">CPF/CNPJ e Enriquecimento</a>
        <a href="#config">Configurações</a>
        <a href="#icones">Guia de ícones</a>
        <a href="#solucoes">Problemas comuns</a>
        <a href="#seguranca">Privacidade e segurança</a>
        <a href="#faq">FAQ</a>

        <div class="small">
          Dica: você pode salvar esta página como “Ajuda” (<code>ajuda.html</code>) na mesma pasta do app.
        </div>
      </div>

      <div class="card content">

        <h2 id="inicio">Começar rápido</h2>
        <div class="callout">
          <strong>Objetivo do sistema:</strong> organizar leads (prospects) + clientes ativos, controlar próximas ações/visitas, registrar interesse em produtos e facilitar contato (WhatsApp) com exportação/importação padrão.
        </div>
        <ol>
          <li><strong>Abra o app</strong> no navegador (Chrome recomendado).</li>
          <li>Escolha o <strong>Conjunto</strong> no topo (ou crie em <span class="pill"><span class="icon">⚙️</span>Gerenciar</span>).</li>
          <li>Importe <strong>Leads</strong> (xlsx/csv do MapsScraper) em <span class="pill"><span class="icon">📂</span>Importar</span>.</li>
          <li>Importe <strong>Clientes Ativos</strong> (xlsx do padrão Ameripan) em <span class="pill"><span class="icon">📥</span>Clientes</span> → <em>Importar</em>.</li>
          <li>Use as <strong>Ações</strong> (WhatsApp/Maps/Email/Site) diretamente na lista.</li>
          <li>Faça <strong>Backup</strong> periodicamente (ou sincronize via Google Sheets, se configurado).</li>
        </ol>

        <details>
          <summary>Dica para usar como “app” no celular</summary>
          <p>No Android (Chrome): menu ⋮ → <strong>Adicionar à tela inicial</strong>. Assim o Gestor abre como um app e fica mais rápido no dia a dia.</p>
        </details>

        <h2 id="conceitos">Conceitos</h2>
        <div class="two">
          <div class="callout">
            <strong>Lead</strong>
            <p class="muted">Uma empresa/pessoa ainda em prospecção (capturada do Google Maps / lista / pesquisa).</p>
            <ul>
              <li>Você controla <strong>Funil</strong>, <strong>Próxima ação</strong>, <strong>Status</strong>, observações e interesse.</li>
              <li>Pode enriquecer dados com <strong>CNPJ</strong> (quando disponível).</li>
            </ul>
          </div>
          <div class="callout">
            <strong>Cliente Ativo</strong>
            <p class="muted">Já compra da empresa. Precisa de controle de rota/visita, código interno e histórico de interesse.</p>
            <ul>
              <li>Campos chave: <strong>Cód. Cliente</strong>, <strong>Comprador</strong>, <strong>Dias de entrega</strong>, <strong>Dia de visita</strong>.</li>
              <li>WhatsApp rápido + registro de interesse em produtos.</li>
            </ul>
          </div>
        </div>

        <h2 id="layout">Layout e navegação</h2>
        <p>O sistema é responsivo:</p>
        <ul>
          <li><strong>Desktop/Notebook:</strong> sidebar (menu lateral) para economizar altura e aumentar a área de dados.</li>
          <li><strong>Mobile/Tablet:</strong> ícone ☰ abre/fecha menu; também pode haver barra inferior dependendo da versão/layout.</li>
          <li>Tabelas usam <strong>rolagem horizontal</strong> quando necessário (evita quebra de linha e melhora a leitura).</li>
        </ul>

        <details>
          <summary>Atalhos e produtividade</summary>
          <ul>
            <li>Use o campo de busca para filtrar por <strong>nome, cidade, CEP, telefone, email, tags</strong>.</li>
            <li>Os filtros “Funil / Oportunidade / Ação / Cidade” refinam a lista sem perder dados.</li>
            <li>Em notebooks, se quiser ver mais linhas, use “Modo foco / Tela cheia” quando disponível.</li>
          </ul>
        </details>

        <h2 id="leads">Leads</h2>
        <p>Na tela de Leads você tem:</p>
        <ul>
          <li><strong>KPIs</strong> (total, nota média, oportunidades, ações atrasadas).</li>
          <li><strong>Busca + filtros</strong> (Funil/Oportunidade/Ação/Cidade).</li>
          <li><strong>Lista</strong> com colunas compactas e ações por ícone.</li>
          <li><span class="pill"><span class="icon">➕</span>Novo Lead</span> para cadastrar manualmente.</li>
        </ul>

        <h3>Campos do Lead (o que é cada coisa)</h3>
        <table>
          <thead><tr><th>Campo</th><th>Para que serve</th></tr></thead>
          <tbody>
            <tr><td><strong>Empresa / Nome</strong></td><td>Nome do estabelecimento. Geralmente vem do Google Maps.</td></tr>
            <tr><td><strong>Categoria</strong></td><td>Segmento (ex.: sorveteria, padaria). Ajuda a priorizar e personalizar abordagem.</td></tr>
            <tr><td><strong>Cidade / UF / CEP</strong></td><td>Localização. Útil para rota e divisão por região.</td></tr>
            <tr><td><strong>Telefone / WhatsApp</strong></td><td>Contato principal. O botão <span class="pill"><span class="icon">📱</span>WhatsApp</span> aparece se for um número válido.</td></tr>
            <tr><td><strong>Email</strong></td><td>Contato alternativo (se houver).</td></tr>
            <tr><td><strong>Website</strong></td><td>Site da empresa (se houver).</td></tr>
            <tr><td><strong>Instagram / Facebook</strong></td><td>Links sociais (quando disponíveis).</td></tr>
            <tr><td><strong>Maps URL / CID / PlaceId</strong></td><td>Link direto do Google Maps (ótimo para conferir local). Se existir, o nome da empresa pode abrir o Maps.</td></tr>
            <tr><td><strong>Latitude / Longitude</strong></td><td>Se existir, habilita o botão <span class="pill"><span class="icon">📍</span>GPS</span> para navegação por coordenadas.</td></tr>
            <tr><td><strong>Funil</strong></td><td>Etapa do lead: novo, contato feito, interessado, negociação, etc.</td></tr>
            <tr><td><strong>Oportunidade</strong></td><td>Marcação rápida: “Verificado”, “Boa chance”, “Baixa chance”… (depende da configuração da versão).</td></tr>
            <tr><td><strong>Próxima Ação</strong></td><td>O que você vai fazer depois e quando (ajuda agenda e atrasos).</td></tr>
            <tr><td><strong>Observações</strong></td><td>Notas internas sobre conversa, necessidades e objeções.</td></tr>
            <tr><td><strong>CPF/CNPJ</strong></td><td>Ajuda a cadastrar rapidamente depois. Com CNPJ (14 dígitos), permite enriquecer dados automaticamente.</td></tr>
          </tbody>
        </table>

        <h3>Fluxo recomendado de atendimento (Lead)</h3>
        <ol>
          <li>Abra o Maps para ver local e contexto <span class="pill"><span class="icon">🗺️</span>Maps</span>.</li>
          <li>Fale no WhatsApp <span class="pill"><span class="icon">📱</span>WhatsApp</span> (sem mensagem) ou <span class="pill"><span class="icon">💬</span>Mensagem</span> (se habilitado).</li>
          <li>Registre interesse/observações e defina <strong>Próxima Ação</strong>.</li>
          <li>Se virou cliente: use <strong>Leads → Clientes</strong> para converter/exportar no padrão.</li>
        </ol>

        <h2 id="clientes">Clientes Ativos</h2>
        <p>Clientes Ativos são seu controle operacional: rota, pedido certo, comprador certo e recorrência.</p>

        <h3>Campos do Cliente (prioridade interna)</h3>
        <table>
          <thead><tr><th>Campo</th><th>Para que serve</th></tr></thead>
          <tbody>
            <tr><td><strong>Cód. Cliente</strong> <span class="pill ok">primordial</span></td><td>Código interno para identificar o cliente no sistema da empresa e fazer pedido “sem burocracia”.</td></tr>
            <tr><td><strong>Razão / Nome</strong></td><td>Nome do cliente (empresa).</td></tr>
            <tr><td><strong>Comprador</strong></td><td>Pessoa responsável pelo pedido.</td></tr>
            <tr><td><strong>WhatsApp</strong></td><td>Contato rápido. Botão abre conversa e permite registrar interesse.</td></tr>
            <tr><td><strong>Vendedor</strong></td><td>Responsável pela conta. Campo maior para caber nomes longos.</td></tr>
            <tr><td><strong>Equipe</strong></td><td>Grupo do vendedor (com sugestões editáveis em Config). Você pode escrever novas equipes.</td></tr>
            <tr><td><strong>Dias de entrega</strong></td><td>Ex.: seg/qua/sex. Ajuda a planejar pedidos e rota.</td></tr>
            <tr><td><strong>Dia de visita</strong></td><td>Quando costuma visitar (se você usa esse controle).</td></tr>
            <tr><td><strong>Próxima visita / próxima ação</strong></td><td>Planejamento de atendimento e retorno.</td></tr>
            <tr><td><strong>Produtos de interesse</strong></td><td>Registro rápido do que o cliente quer/compra (facilita fechamento).</td></tr>
          </tbody>
        </table>

        <h3>Importação de Clientes (padrão Ameripan)</h3>
        <div class="callout">
          <strong>Sobre “Cód. Cliente”:</strong> o sistema tenta identificar o código pelo cabeçalho (com ou sem acento) e também tem fallback para “coluna A”.
          <p class="muted">Ou seja: se a planilha tiver o código na primeira coluna, ele será importado mesmo que o nome do cabeçalho venha diferente.</p>
        </div>

        <h2 id="agenda">Agenda</h2>
        <p>A Agenda reúne itens com “Próxima Ação/Visita” para você não perder o timing.</p>
        <ul>
          <li>Mostra o que está <span class="pill warn">para hoje</span> e <span class="pill bad">atrasado</span>.</li>
          <li>Permite abrir WhatsApp e registrar resultado do contato.</li>
          <li>É o modo mais rápido de “executar o dia”.</li>
        </ul>

        <h2 id="conjuntos">Conjuntos (vários “bancos”)</h2>
        <p>Um <strong>Conjunto</strong> é um “grupo independente” de dados. Ex.:</p>
        <div class="callout">
          <span class="pill">Leads Sul de Minas</span>
          <span class="pill">Leads Piracicaba</span>
          <span class="pill">Leads Entrega Sábado</span>
          <span class="pill">Clientes Rota A</span>
        </div>
        <ul>
          <li>Você pode trocar o Conjunto no topo para alternar entre listas.</li>
          <li>Conjuntos ajudam a separar campanhas, regiões e rotas.</li>
          <li>Algumas versões permitem mapear cada Conjunto para uma aba específica do Google Sheets.</li>
        </ul>

        <h2 id="importar">Importar</h2>
        <h3>Importar Leads (MapsScraper)</h3>
        <ul>
          <li>Exporte do MapsScraper em <strong>XLSX</strong> ou <strong>CSV</strong>.</li>
          <li>No Gestor: <span class="pill"><span class="icon">📂</span>Importar</span> → <strong>Leads</strong>.</li>
          <li>O sistema tenta reconhecer campos como: nome, categoria, cidade, telefone, url do Maps, reviews, nota, etc.</li>
        </ul>

        <h3>Importar Clientes Ativos</h3>
        <ul>
          <li>Use o padrão Ameripan (como seu arquivo de exemplo).</li>
          <li>O sistema reconhece variações de cabeçalho (com/sem acento), e usa fallback para a <strong>coluna A</strong> no “Cód. Cliente”.</li>
        </ul>

        <details>
          <summary>Dica: evitar duplicados ao importar</summary>
          <ul>
            <li>Clientes: o sistema tenta casar por <strong>Cód. Cliente</strong>, depois por <strong>WhatsApp</strong>, depois por <strong>Nome + Cidade</strong>.</li>
            <li>Leads: recomenda-se não importar o mesmo arquivo repetidamente no mesmo conjunto; use filtros e limpeza quando necessário.</li>
          </ul>
        </details>

        <h2 id="exportar">Exportar</h2>
        <p>Exportar é útil para:</p>
        <ul>
          <li>Mandar leads para outro vendedor.</li>
          <li>Subir dados para um sistema externo.</li>
          <li>Consolidar a rota/agenda.</li>
        </ul>
        <table>
          <thead><tr><th>Botão</th><th>O que faz</th></tr></thead>
          <tbody>
            <tr><td><span class="pill"><span class="icon">📤</span>Exportar Leads</span></td><td>Gera arquivo com os leads do conjunto (inclui campos extras como links e, quando disponível, CPF/CNPJ).</td></tr>
            <tr><td><span class="pill"><span class="icon">🔁</span>Leads → Clientes</span></td><td>Converte/exporta leads selecionados para o formato de Clientes Ativos (padrão).</td></tr>
            <tr><td><span class="pill"><span class="icon">📤</span>Exportar Clientes</span></td><td>Gera arquivo no padrão (inclui <strong>Cód. Cliente</strong>, Razão e WhatsApp, além de dados de gestão).</td></tr>
          </tbody>
        </table>

        <h2 id="backup">Backup e restauração</h2>
        <div class="callout">
          <strong>O sistema salva dados no seu navegador.</strong> Para não perder, use <strong>Backup</strong> e/ou sincronização (Google Sheets modo completo).
        </div>
        <ul>
          <li><span class="pill"><span class="icon">💾</span>Backup</span> baixa um arquivo JSON com seus dados.</li>
          <li><span class="pill"><span class="icon">📥</span>Importar Backup</span> restaura o arquivo JSON.</li>
          <li>Recomendação: faça backup semanal (ou diário se o volume é grande).</li>
        </ul>

        <h2 id="sheets">Google Sheets</h2>
        <p>Existem <strong>dois modos</strong>:</p>

        <div class="two">
          <div class="callout">
            <strong>Modo simples (API Key) — Somente leitura</strong>
            <ul>
              <li>Você informa <strong>ID/Link</strong> da planilha e uma <strong>API Key</strong>.</li>
              <li>O app lê os dados da aba <code>leads</code> e <code>clientes</code> (padrão), mas você pode configurar.</li>
              <li>Permite <strong>listar abas</strong> para selecionar.</li>
            </ul>
            <p class="muted"><strong>Importante:</strong> para funcionar, a planilha precisa estar acessível para leitura (ex.: “qualquer pessoa com o link pode ver”).</p>
          </div>
          <div class="callout">
            <strong>Modo completo (Apps Script Web App) — Ler + Editar</strong>
            <ul>
              <li>Você configura um Web App (Apps Script) e cola a URL no Gestor.</li>
              <li>Permite <strong>criar abas</strong>, <strong>enviar</strong> e <strong>puxar</strong> dados, mantendo tudo sincronizado entre dispositivos.</li>
              <li>Ideal para uso em equipe ou quando você troca muito de celular/PC.</li>
            </ul>
          </div>
        </div>

        <h3>Exemplo de leitura via Sheets API (o padrão do sistema)</h3>
        <pre><code>const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET}!A:ZZ?key=${API_KEY}&_=${Date.now()}`;</code></pre>

        <details>
          <summary>Como obter a API Key (passo a passo)</summary>
          <ol>
            <li>Acesse o <strong>Google Cloud Console</strong> e crie/seleciona um projeto.</li>
            <li>Ative a API: <strong>Google Sheets API</strong>.</li>
            <li>Vá em <strong>APIs & Services → Credentials</strong> e crie uma <strong>API key</strong>.</li>
            <li>Restrinja a chave (recomendado):
              <ul>
                <li>Restrição por <strong>HTTP referrers</strong> (quando estiver no GitHub Pages).</li>
                <li>Restrição de API para permitir somente <strong>Google Sheets API</strong>.</li>
              </ul>
            </li>
          </ol>
          <p class="muted">Dica: durante testes locais, algumas restrições podem impedir funcionamento. Depois de publicar, aplique as restrições.</p>
        </details>

        <h2 id="cnpj">CPF/CNPJ e Enriquecimento</h2>
        <p>Para reduzir burocracia no cadastro, você pode informar CPF/CNPJ no Lead.</p>

        <div class="callout">
          <strong>Regra:</strong> quando for <strong>CNPJ</strong> (14 dígitos), o botão de enriquecimento pode buscar dados e preencher campos vazios automaticamente.
          <p class="muted">O sistema tenta várias APIs públicas (e pode usar token opcional em serviços que exigem).</p>
        </div>

        <h3>Botões de enriquecimento</h3>
        <ul>
          <li><span class="pill"><span class="icon">✨</span>Atualizar por CNPJ</span> (no Lead): busca dados e completa campos.</li>
          <li><span class="pill"><span class="icon">✨</span>Atualizar todos</span> (quando disponível): roda em lote para vários leads com CNPJ.</li>
        </ul>

        <details>
          <summary>Como o enriquecimento decide o que preencher</summary>
          <ul>
            <li>Por padrão, ele <strong>preenche apenas campos vazios</strong>.</li>
            <li>Em Config, você pode habilitar “<strong>sobrescrever</strong> campos já preenchidos” (use com cuidado).</li>
            <li>Os dados retornados ficam guardados como “dados extras” do lead (quando disponível) para consulta.</li>
          </ul>
        </details>

        <h2 id="config">Configurações</h2>
        <p>O menu <span class="pill"><span class="icon">🧩</span>Config</span> centraliza as preferências do sistema.</p>

        <h3>Mensagens do WhatsApp (opcional)</h3>
        <ul>
          <li>O botão <span class="pill"><span class="icon">📱</span>WhatsApp</span> sempre abre <strong>sem mensagem</strong>.</li>
          <li>Se você ativar mensagens, aparece o botão <span class="pill"><span class="icon">💬</span>Mensagem</span>.</li>
          <li>Você pode definir templates (ex.: com nome do cliente, vendedor, etc.).</li>
        </ul>

        <h3>Equipes sugeridas</h3>
        <p>Em Config você pode manter uma lista de equipes sugeridas (uma por linha). Exemplos:</p>
        <pre><code>EQUIPE CARLOS
EQUIPE SANDRO
EQUIPE SOROCABA
EQUIPE SORVETERIA
EQUIPE TELEPAN</code></pre>
        <p class="muted">No cadastro, o campo “Equipe” sugere, mas você pode digitar equipes novas.</p>

        <h2 id="icones">Guia de ícones</h2>
        <p>Os ícones aparecem principalmente na coluna <strong>Ações</strong> (Leads/Clientes). Alguns só aparecem se houver dados.</p>

        <table>
          <thead><tr><th>Ícone</th><th>Quando aparece</th><th>O que faz</th></tr></thead>
          <tbody>
            <tr><td><span class="icon">🗺️</span></td><td>Sempre que há endereço ou link do Maps</td><td>Abre o Google Maps no endereço/URL/cid (visualizar local).</td></tr>
            <tr><td><span class="icon">📍</span></td><td>Somente com latitude/longitude</td><td>Abre navegação por coordenadas (GPS).</td></tr>
            <tr><td><span class="icon">📱</span></td><td>Somente com telefone válido</td><td>Abre WhatsApp <strong>sem mensagem</strong>.</td></tr>
            <tr><td><span class="icon">💬</span></td><td>Se template estiver habilitado</td><td>Abre WhatsApp com mensagem padrão (opcional).</td></tr>
            <tr><td><span class="icon">✉️</span></td><td>Somente com email</td><td>Abre app de email para enviar mensagem.</td></tr>
            <tr><td><span class="icon">🌐</span></td><td>Somente com site</td><td>Abre o website.</td></tr>
            <tr><td><span class="icon">📷</span></td><td>Somente com link Instagram</td><td>Abre Instagram no perfil/URL.</td></tr>
            <tr><td><span class="icon">📘</span></td><td>Somente com link Facebook</td><td>Abre Facebook no perfil/URL.</td></tr>
            <tr><td><span class="icon">✏️</span></td><td>Sempre</td><td>Abre o modal de edição/anotações.</td></tr>
            <tr><td><span class="icon">🗑️</span></td><td>Sempre</td><td>Remove o lead/cliente (confirme antes).</td></tr>
          </tbody>
        </table>

        <h2 id="solucoes">Problemas comuns</h2>
        <details>
          <summary>“Meu Google Sheets não carrega”</summary>
          <ul>
            <li>Verifique o ID da planilha.</li>
            <li>Verifique se a aba existe (padrão: <code>leads</code> e <code>clientes</code>).</li>
            <li>Com API Key: confirme que a planilha está acessível para leitura.</li>
            <li>Se estiver abrindo por arquivo local (<code>file://</code>), publique no GitHub Pages e teste (melhor compatibilidade).</li>
          </ul>
        </details>

        <details>
          <summary>“Meu menu lateral sumiu / não abre”</summary>
          <ul>
            <li>No desktop: clique no botão ☰ do topo para expandir/recolher.</li>
            <li>No mobile: toque no ☰ para abrir o menu.</li>
            <li>Se a tela estiver muito estreita, aumente o zoom ou rotacione o celular para paisagem.</li>
          </ul>
        </details>

        <details>
          <summary>“Perdi meus dados”</summary>
          <ul>
            <li>Dados ficam no navegador. Se você limpar cache/dados do site, pode perder.</li>
            <li>Use <strong>Backup</strong> e/ou modo completo (sincronização) para evitar.</li>
          </ul>
        </details>

        <h2 id="seguranca">Privacidade e segurança</h2>
        <ul>
          <li>Os dados ficam no seu navegador (IndexedDB/localStorage).</li>
          <li>Ao usar GitHub Pages, cada usuário tem seu próprio armazenamento local (outros não veem suas configs).</li>
          <li><strong>Evite</strong> publicar tokens/senhas dentro do código do app.</li>
          <li>Se usar API Key, aplique restrições no Google Cloud quando estiver em produção.</li>
        </ul>

        <h2 id="faq">FAQ</h2>
        <details>
          <summary>Posso usar sem internet?</summary>
          <p>Sim, para trabalhar com dados já importados e salvar localmente. Para Google Sheets e enriquecimento por CNPJ, precisa internet.</p>
        </details>
        <details>
          <summary>Por que algumas ações não aparecem?</summary>
          <p>Os ícones são condicionais. Ex.: GPS só aparece com lat/lng; Email só aparece com email; Instagram só aparece com link.</p>
        </details>
        <details>
          <summary>Posso ter vários vendedores usando o mesmo banco?</summary>
          <p>Sim. O jeito mais prático é usar o modo completo (Google Sheets via Web App) para sincronizar entre dispositivos. Caso contrário, cada navegador tem seu próprio banco local.</p>
        </details>

        <div class="foot">
          Gestor de Leads PRO • Ajuda completa • 2026-02-14 22:48
        </div>

      </div>
    </div>
  </div>
</body>
</html>
