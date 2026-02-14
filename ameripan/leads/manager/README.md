# Gestor de Leads PRO 🚀

> **Versão:** 7.3.1 | **Atualizado:** 14/02/2026
> **Compatibilidade:** Chrome / Edge (Desktop, Tablet, Smartphone)

O **Gestor de Leads PRO** é uma solução web (PWA) desenvolvida para organizar prospecção (Leads) e gestão de carteira (Clientes Ativos). O sistema foca em agilidade, permitindo controle de rotas, integração com WhatsApp, Google Maps e sincronização via Google Sheets.

---

## 📋 Índice

- [Começar Rápido](#-começar-rápido)
- [Conceitos do Sistema](#-conceitos-do-sistema)
- [Funcionalidades](#-funcionalidades)
  - [Gestão de Leads](#gestão-de-leads)
  - [Clientes Ativos](#clientes-ativos)
  - [Integração Google Sheets](#integração-google-sheets)
- [Importação e Exportação](#-importação-e-exportação)
- [Enriquecimento de Dados (CNPJ)](#-enriquecimento-de-dados-cnpj)
- [Guia de Ícones](#-guia-de-ícones)
- [Instalação e Uso](#-instalação-e-uso)

---

## ⚡ Começar Rápido

1. **Abra o App:** Recomendado usar Google Chrome.
2. **Defina o Conjunto:** Escolha ou crie um "banco de dados" (ex: *Rota Piracicaba*) no menu superior.
3. **Importe Dados:**
   - **Leads:** Importe arquivos `.xlsx` ou `.csv` (compatível com MapsScraper).
   - **Clientes:** Importe a planilha padrão (formato Ameripan/Distribuidora).
4. **Ação:** Utilize os botões de ação rápida para contato (WhatsApp) ou navegação (Maps).
5. **Backup:** Faça backup regularmente via botão `Backup` (baixa um JSON) ou configure o Google Sheets.

> **Dica Mobile:** No Android (Chrome), vá no menu e clique em **"Adicionar à tela inicial"** para usar como um aplicativo nativo.

---

## 🧩 Conceitos do Sistema

O sistema divide os contatos em duas categorias distintas para não misturar prospecção com operação:

### 1. Lead (Prospect)
Empresas ou pessoas em fase de prospecção.
- **Foco:** Funil de vendas, qualificação, primeira abordagem.
- **Dados:** Nome, Categoria, Contatos, Links sociais, Status do Funil.
- **Enriquecimento:** Busca automática de dados via CNPJ.

### 2. Cliente Ativo
Clientes que já compram e precisam de gestão operacional.
- **Foco:** Recorrência, Rota de entrega, Histórico de pedidos.
- **Dados:** Cód. Cliente (ERP), Comprador, Dias de Visita/Entrega, Vendedor/Equipe.
- **Padrão:** Segue o layout de importação da *Ameripan Distribuidora*.

---

## 🛠 Funcionalidades

### Gestão de Leads
Painel focado em conversão.
- **KPIs:** Visualização rápida de total de leads, oportunidades e ações atrasadas.
- **Filtros Avançados:** Por Funil, Oportunidade, Ação ou Cidade.
- **Campos Específicos:**
  - *Maps URL/CID:* Link direto para conferência do local.
  - *Funil & Oportunidade:* Classificação visual (ex: "Boa chance", "Verificado").
  - *Próxima Ação:* Agendamento de retorno para não perder o timing.

### Clientes Ativos
Controle total da carteira de clientes.
- **Código do Cliente:** Identificador primário para pedidos.
- **Rota:** Definição de dias de entrega (ex: Seg/Qua/Sex).
- **Interesses:** Campo para registrar produtos que o cliente costuma comprar.

### Integração Google Sheets
O sistema possui dois modos de operação com planilhas:

| Modo | Descrição | Requisito |
| :--- | :--- | :--- |
| **Simples (Leitura)** | Lê dados de uma planilha pública/compartilhada. Ideal para carregar listas prontas. | ID da Planilha + API Key |
| **Completo (Sync)** | Lê e Edita. Permite sincronizar dados entre dispositivos (PC e Celular). | Apps Script Web App URL |

**Exemplo de chamada API (Modo Leitura):**
```javascript
const url = `https://sheets.googleapis.com/v4/spreadsheets/${ID}/values/${SHEET}!A:ZZ?key=${API_KEY}`;

```

---

## 📂 Importação e Exportação

### Importar

* **Leads (MapsScraper):** O sistema reconhece colunas como Nome, Telefone, Categoria, Reviews, URL do Maps, etc.
* **Clientes:** Reconhece cabeçalhos variados (com/sem acento). Fallback: Se não achar o cabeçalho "Cód.", usa a **Coluna A**.
* **Prevenção de Duplicatas:** O sistema tenta casar registros por Código, WhatsApp ou Nome+Cidade.

### Exportar

* **📤 Exportar Leads:** Gera planilha com dados enriquecidos e links.
* **🔁 Leads → Clientes:** Converte leads selecionados para o formato de Clientes Ativos (útil após fechar a venda).
* **💾 Backup JSON:** Salva todo o estado do aplicativo (incluindo configurações).

---

## ✨ Enriquecimento de Dados (CNPJ)

Se um Lead possuir um **CNPJ válido (14 dígitos)**, o sistema habilita funções de automação:

* **Botão ✨ Atualizar por CNPJ:** Consulta APIs públicas para preencher campos vazios (Endereço, Nome Fantasia, Atividade, etc.).
* **Regra:** Por segurança, o sistema preenche apenas campos que estão vazios (a menos que configurado para sobrescrever).

---

## 🗺 Guia de Ícones

A interface utiliza ícones contextuais na coluna de **Ações**:

| Ícone | Condição | Ação |
| --- | --- | --- |
| 🗺️ | Endereço ou Link Maps | Abre o local no Google Maps. |
| 📍 | Lat/Long preenchidos | Inicia navegação GPS por coordenadas. |
| 📱 | Telefone válido | Abre WhatsApp (sem mensagem pronta). |
| 💬 | Template ativo | Abre WhatsApp com mensagem pré-definida. |
| ✉️ | Email preenchido | Abre cliente de email. |
| 🌐 | Site preenchido | Abre o website da empresa. |
| 📷 | Link Instagram | Abre o perfil no Instagram. |
| ✏️ | Sempre visível | Edição completa do registro. |

---

## ⚙️ Configurações e Solução de Problemas

### Configurações Úteis

* **Equipes Sugeridas:** Edite a lista de equipes/rotas em Configurações para facilitar o cadastro.
* **Mensagens WhatsApp:** Defina templates com variáveis (ex: Olá {nome}, sou da Ameripan...).

### FAQ / Troubleshooting

* **Dados Sumiram?** O sistema usa `LocalStorage`/`IndexedDB`. Se limpar o cache do navegador, os dados locais somem. **Faça backups.**
* **Menu Lateral não abre?** Em telas pequenas, clique no ícone `☰`.
* **Erro no Google Sheets?** Verifique se a planilha está compartilhada como "Leitor" (para API Key) ou se o Web App foi implantado corretamente.

---

<div align="center">
<small>Desenvolvido para produtividade em vendas e desenvolvimento.</small>
</div>
