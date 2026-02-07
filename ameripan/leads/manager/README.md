# Documentação — Gestor de Leads Local (V6.2 — IndexedDB)

Este sistema é um **Gerenciador de Leads local-first**, feito para rodar **sem login e sem servidor**.  
Cada pessoa usa o próprio celular/notebook, então **cada um cuida do seu**: os dados ficam salvos **no navegador do próprio dispositivo** (IndexedDB).

---

## Links de download

### HTML (versão hospedada no GitHub)
> Link direto para baixar o `index.html` (raw), conforme solicitado:

```text
https://github.com/Edimarpcosta/edimarpcosta.github.io/raw/refs/heads/main/ameripan/leads/manager/index.html
```

### HTML (versão gerada aqui no chat, V6.2)
Se você estiver usando a versão que eu gerei no ambiente do ChatGPT:
- **Gestor_de_Leads_V6_2_IndexedDB.html** (arquivo único)

---

## Como rodar

### Opção A — Rodar online (GitHub Pages)
1. Abra a página do sistema no navegador.
2. Use normalmente (Importar, editar, etc.).  
3. **Não limpe os dados do site** (isso apaga os leads).

### Opção B — Rodar local/offline (recomendado)
1. Crie uma pasta no seu computador/celular, por exemplo:
   - `gestor-leads/`
2. Coloque dentro dela:
   - `index.html` (ou `Gestor_de_Leads_V6_2_IndexedDB.html`)
   - `xlsx.full.min.js` (biblioteca para importar/exportar planilhas)
3. Abra o `index.html` no navegador.

> Observação: em alguns celulares, abrir via “arquivo” pode ter limitações.  
> Se acontecer, a solução mais estável é abrir via um servidor local (ex.: app “HTTP Server” no Android, ou `python -m http.server` no PC).

---

## Como baixar o xlsx.full.min.js (SheetJS)

### Link oficial (jsDelivr, versão 0.18.5)
Abra este link no navegador e salve o arquivo:

```text
https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
```

#### Onde colocar
✅ Salve o arquivo **com o nome exato** `xlsx.full.min.js` e coloque **na mesma pasta** do seu `index.html`.

Exemplo de estrutura:
```text
gestor-leads/
  index.html
  xlsx.full.min.js
```

#### (Opcional) Fixar o fallback online para a mesma versão
Se você quiser que o fallback online use a mesma versão 0.18.5, procure no HTML o trecho:

```js
cdn.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
```

e substitua por:

```js
cdn.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
```

---

## Onde os dados ficam salvos (muito importante)

- O sistema salva os leads localmente no **IndexedDB** do navegador.
- **Se você limpar “dados do site/armazenamento”**, os leads serão apagados.
- Por isso existe o botão **Backup (JSON)** para exportar e **Importar Backup** para restaurar.

---

## Tela principal — “o que faz o que”

### 1) Barra superior (botões)

- **📂 Importar / Juntar**  
  Importa uma planilha **XLSX/XLS/CSV** e junta na base atual (sem apagar o que já existe).  
  Também faz **deduplicação** usando:
  - `Place Id` (quando existir) **ou**
  - `Nome + Endereço` (fallback)

- **➕ Novo Lead**  
  Abre o formulário para cadastrar um lead manualmente.

- **📤 Exportar (Rotas)**  
  Exporta todos os leads do banco para uma planilha `.xlsx` (nome: `rotas_leads_v6.2.xlsx`).  
  Inclui campos como funil, próxima ação, tags, contatos, localização, nota e links.

- **💾 Backup (JSON)**  
  Exporta um arquivo JSON com todos os leads (backup rápido e leve).

- **📥 Importar Backup**  
  Importa um backup `.json` e restaura os dados no IndexedDB.

- **🗑️ Limpar**  
  **Apaga todo o banco local** do IndexedDB (irreversível).  
  Use apenas se tiver backup ou quiser zerar tudo.

---

### 2) KPIs (indicadores)

- **Total**: quantidade total de leads no banco.
- **Nota Média**: média da nota (rating) de todos os leads.
- **Oportunidades**: quantos leads estão marcados como “Oportunidade” (não verificados).
- **Ações Atrasadas**: quantos leads têm “Próxima Ação” em data/hora passada.

---

### 3) Busca e filtros

- **Buscar** (campo de texto)  
  Pesquisa em: nome, cidade, telefone, email, website, Instagram, Facebook, categoria e tags.

- **Funil**  
  Filtra por estágio:
  - Novo, Contatado, Qualificado, Proposta, Fechado, Perdido

- **Oportunidade**
  - Todas
  - Somente Oportunidades
  - Somente Verificados

- **Ação**
  - Todas
  - Com Próxima Ação
  - Ação Atrasada
  - Ação Hoje

---

### 4) Ordenação (botões “Ordenar”)

- **🏆 Melhores (Padrão)**  
  Ordena por **Nota (desc)** e depois por **Reviews (desc)**.

- **📉 Nota Baixa**  
  Ordena por **Nota (asc)** (bom para priorizar oportunidades ou melhorias).

- **🌍 Cidade/Bairro**  
  Ordena por cidade e endereço.

---

## Tabela de Leads — colunas e ações

### Colunas
- **Empresa**: Nome + Categoria
- **Funil / Próxima**: estágio + Próxima Ação + Tags
- **Anotações**: notas internas rápidas
- **Localização**: cidade/UF + CEP
- **Nota**: rating (★)
- **Reviews**: quantidade de avaliações (se veio da prospecção)
- **Oportunidade**: “Verificado” ou “Oportunidade”
- **Ações**: atalhos e edição/exclusão

### Ícones de ações (coluna “Ações”)
- **🗺️**: abrir navegação no Maps pelo endereço
- **📍**: navegação por GPS (aparece só se tiver latitude/longitude)
- **📱**: WhatsApp (aparece se o telefone for válido)
- **✉️**: email (aparece se tiver email)
- **🌐**: website (aparece se tiver site)
- **📷**: Instagram (aparece se tiver link)
- **📘**: Facebook (aparece se tiver link)
- **✏️**: editar / anotar
- **🗑️**: excluir lead

> Dica: **duplo clique** numa linha também abre o editor do lead.

---

## Modal “Lead” — campos (cadastro/edição)

- **Nome / Telefone**
- **Email / Website**
- **Instagram / Facebook**
- **Funil** (estágio do lead)
- **Próxima Ação** (data/hora)
- **Tags** (separadas por vírgula)
- **Anotações internas**
- **Endereço / Cidade / UF / CEP**
- **Latitude / Longitude**
- **Nota / Reviews**
- **Status**: Verificado ou Oportunidade

---

## Boas práticas (para não perder dados)
1. Faça **Backup (JSON)** regularmente (ex.: 1x por semana).
2. Não use modo anônimo/privado.
3. Evite “limpar dados do site”.
4. Guarde o backup em **Drive/WhatsApp/Email** (fora do navegador).

---

## Roadmap sugerido (próximas funções)
- **Histórico/Timeline** por lead (ligações, WhatsApp, visitas, resultados)
- **Templates de WhatsApp** com variáveis
- **Rota do Dia** (selecionar leads, ordenar e checklist de visitas)

