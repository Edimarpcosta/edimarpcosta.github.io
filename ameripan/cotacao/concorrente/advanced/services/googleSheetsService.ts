import type { Product, Supervisor, Salesperson } from '../types';

const API_KEY = 'AIzaSyChiZPUY-G3oyZN2NGY_vlgRXUzry9Pkeo';
const PRODUCTS_SPREADSHEET_ID = '1cN_1GBR29BN77eRZAkzvikt96i_kX9AZ04cTc6XRM8Q';
const DATA_SPREADSHEET_ID = '1IkpsIk9sJbHWyVMPn0T-lX9Aq3EVeCzvkwfEQwj9NS0';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3aHahFM5jItTRIaZKhmJl0E_XDKSKmMtFLjgpY61e6yOGNOYuj1qBXTG4I-TL5OAYWA/exec';

// Cache to prevent re-fetching on every render
const cache = new Map<string, any>();

const fetchSheetData = async <T>(spreadsheetId: string, range: string, transform: (row: string[]) => T | null): Promise<T[]> => {
    const cacheKey = `${spreadsheetId}-${range}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${API_KEY}&_=${new Date().getTime()}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            let errorMessage = `HTTP status ${response.status}: ${response.statusText}`;
             try {
                const errorJson = await response.json();
                if (errorJson?.error?.message) {
                    errorMessage = errorJson.error.message;
                }
            } catch (e) {
                // Ignore if response body is not JSON
            }
            throw new Error(`Google Sheets API error for ${range}: ${errorMessage}. IMPORTANT: Please ensure the spreadsheet is shared publicly with 'Anyone with the link can view'.`);
        }
        const data = await response.json();
        const values: string[][] = data.values || [];
        const transformedData = values.slice(1).map(transform).filter(Boolean) as T[]; // Slice(1) to skip header row
        cache.set(cacheKey, transformedData);
        return transformedData;
    } catch (error) {
        console.error(`Failed to fetch data for range ${range}:`, error);
        return []; // Return empty array on error to prevent app crash
    }
};

const fetchSheetDataWithHeaders = async (spreadsheetId: string, range: string): Promise<any[]> => {
    const cacheKey = `${spreadsheetId}-${range}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${API_KEY}&_=${new Date().getTime()}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Google Sheets API error for ${range}: HTTP status ${response.status}`);
        }
        const data = await response.json();
        const values: string[][] = data.values || [];
        if (values.length < 2) return []; // No data rows if only header exists

        const headers = values[0];
        const rows = values.slice(1);

        const jsonData = rows.map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });

        cache.set(cacheKey, jsonData);
        return jsonData;
    } catch (error) {
        console.error(`Failed to fetch data with headers for range ${range}:`, error);
        return [];
    }
};


export const getProducts = () => fetchSheetData<Product>(
    PRODUCTS_SPREADSHEET_ID,
    'produtos!A:B',
    (row) => (row && row[0] && row[1] ? { sku: row[0].trim(), name: row[1].trim() } : null)
);

export const getSupervisors = () => fetchSheetData<Supervisor>(
    DATA_SPREADSHEET_ID,
    'Supervisores!A:A',
    (row) => (row && row[0] ? { name: row[0] } : null)
);

export const getSalespeople = () => fetchSheetData<Salesperson>(
    DATA_SPREADSHEET_ID,
    'Vendedores!A:B',
    (row) => (row && row[0] && row[1] ? { name: row[0], supervisor: row[1] } : null)
);

// Functions to get data for the dashboard
export const getQuotations = () => fetchSheetDataWithHeaders(DATA_SPREADSHEET_ID, 'COTAÇÕES!A:O');
export const getProductSuggestions = () => fetchSheetDataWithHeaders(DATA_SPREADSHEET_ID, 'Sugestoes!A:K');
export const getIdeaSuggestions = () => fetchSheetDataWithHeaders(DATA_SPREADSHEET_ID, 'SUGESTOES-DE-IDEIAS!A:F');


export const postDataToSheet = async (payload: any): Promise<{ ok: boolean, message: string }> => {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
        });

        if (response.ok) {
            return { ok: true, message: 'Dados enviados com sucesso!' };
        } else {
            const errorText = await response.text();
            console.error("Submission failed response:", errorText);
            return { ok: false, message: `Falha no envio (status: ${response.status}). Verifique o console para mais detalhes.` };
        }

    } catch (error) {
        console.error("Error posting data to Google Apps Script:", error);
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
             return { 
                ok: false,
                message: 'Ocorreu um erro de rede ou CORS ao enviar. Verifique sua conexão e se o script foi executado na planilha.' 
            };
        }
        if (error instanceof Error) {
            return { ok: false, message: error.message };
        }
        return { ok: false, message: 'Ocorreu um erro desconhecido durante o envio.' };
    }
}