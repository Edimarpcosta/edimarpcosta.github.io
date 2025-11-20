
import { GoogleGenAI } from "@google/genai";

// IMPORTANT: This key is managed by the execution environment.
// Do not hardcode or change this line.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might want to handle this more gracefully.
  // For this context, we assume the key is always present.
  console.warn("API_KEY for Gemini is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const getAIAnalysis = async (
    query: string, 
    quotationsData: any[],
    productSuggestionsData: any[],
    ideaSuggestionsData: any[]
): Promise<string> => {
    
  if (!API_KEY) {
    return Promise.resolve("A chave de API do Gemini não está configurada. Por favor, configure a variável de ambiente `process.env.API_KEY`.");
  }

  const model = "gemini-2.5-flash";

  const prompt = `
    Você é um assistente de análise de dados comerciais. Sua tarefa é analisar os dados fornecidos em formato JSON e responder à pergunta do usuário de forma clara e concisa.

    Aqui estão os dados:

    1. Dados de Cotações de Concorrentes:
    ${JSON.stringify(quotationsData, null, 2)}

    2. Dados de Sugestões de Novos Produtos:
    ${JSON.stringify(productSuggestionsData, null, 2)}

    3. Dados de Ideias de Melhoria:
    ${JSON.stringify(ideaSuggestionsData, null, 2)}

    ---

    Com base nos dados acima, por favor, responda a seguinte pergunta:
    Pergunta do Usuário: "${query}"

    Responda em português do Brasil. Seja direto e use os dados para embasar sua resposta.
  `;

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        return `Ocorreu um erro ao comunicar com a IA: ${error.message}`;
    }
    return "Ocorreu um erro desconhecido ao comunicar com a IA.";
  }
};
