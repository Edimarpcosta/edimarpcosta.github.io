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
