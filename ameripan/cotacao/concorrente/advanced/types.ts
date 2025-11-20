export interface Product {
    sku: string;
    name: string;
}

export interface Supervisor {
    name: string;
}

export interface Salesperson {
    name: string;
    supervisor: string;
}

export interface User {
    username: string;
    password: string;
}

export interface QuotationRow {
    id: number;
    sku: string;
    productName: string;
    flexPrice: number | '';
    cost: number | '';
    competitorPrice: number | '';
    brand: string;
    invoicePhotoUrl: string;
    lostSale: '' | 'TRUE' | 'FALSE';
}

export interface QuotationPayload {
    type: 'cotacao';
    submissionDate: string;
    quotationDate: string;
    supervisor: string;
    salesperson: string;
    city: string;
    client: string;
    competitor: string;
    items: Omit<QuotationRow, 'id'>[];
}

export interface ProductSuggestionPayload {
    type: 'sugestao_produto';
    sugestao: {
        submissionDate: string;
        salesperson: string;
        productName: string;
        estimatedCost: number | '';
        minQuantity: number | '';
        niche: 'Sorveteria' | 'Padaria' | 'Açaí' | 'Outro';
        estimatedSale: string;
        supplier: string;
        contact: string;
        eanOrLink: string;
        objective: string;
    };
}

export interface IdeaSuggestionPayload {
    type: 'sugestao_ideia';
    ideia: {
        submissionDate: string;
        salesperson: string;
        category: 'Problema de Processo' | 'Melhoria de Sistema' | 'Oportunidade de Produto' | 'Ideia Geral';
        title: string;
        description: string;
        solution: string;
    };
}

export interface ChatMessage {
    sender: 'user' | 'ai';
    text: string;
}
