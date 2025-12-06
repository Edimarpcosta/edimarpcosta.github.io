/**
 * --------------------------------------------------------------------------
 * MÓDULO 1: Parser de Legendas (LrcParser)
 * --------------------------------------------------------------------------
 * Traduz o texto cru do arquivo .lrc em objetos JSON.
 */
class LrcParser {
    static parse(lrcString) {
        if (!lrcString) return { synced: null, plain: "" };
        
        // Limpa metadados globais, mantendo apenas linhas de tempo ou texto
        const cleanString = lrcString.replace(/\[[a-zA-Z]+:.+\]/g, "").trim();
        const lines = cleanString.split('\n');
        
        const synced = [];
        const unsynced = [];
        const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d{2,3})?)\]/;

        lines.forEach(line => {
            const match = line.match(timeRegex);
            if (match) {
                const rawTime = match[0];
                const text = line.replace(rawTime, "").trim();
                const startTime = this.parseTime(match[1], match[2]);
                synced.push({ text, startTime });
            } else {
                const text = line.trim();
                if (text) unsynced.push(text);
            }
        });

        return {
            synced: synced.length > 0 ? synced : null,
            plain: unsynced.length > 0 ? unsynced.join('\n') : cleanString
        };
    }

    static parseTime(minStr, secStr) {
        const min = parseInt(minStr, 10);
        const sec = parseFloat(secStr);
        return (min * 60) + sec;
    }
}

/**
 * --------------------------------------------------------------------------
 * MÓDULO 2: Cliente API (LrcClient)
 * --------------------------------------------------------------------------
 * Inteligência de busca que prioriza letras sincronizadas.
 */
class LrcClient {
    constructor() {
        this.baseUrl = "https://lrclib.net/api";
    }

    async findBestMatch(meta) {
        // 1. Match Exato
        try {
            const exact = await this.doRequest('/get', meta);
            if (exact && exact.syncedLyrics && !exact.instrumental) return exact;
        } catch (e) { }

        // 2. Busca Ampla
        const searchMeta = { ...meta, album: null };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const results = await this.doRequest('/search', searchMeta, controller.signal);
            clearTimeout(timeoutId);
            
            if (!results || results.length === 0) throw new Error("Nada encontrado");

            // 3. Ranking Inteligente
            const sorted = this.sortCandidates(results, meta.duration);
            return sorted[0]; 
        } catch (error) {
            throw error;
        }
    }

    async searchRaw(query) {
        return await this.doRequest('/search', { 
            track_name: query.track, 
            artist_name: query.artist 
        });
    }

    sortCandidates(list, targetDuration) {
        return list.sort((a, b) => {
            // Penaliza Instrumental
            if (a.instrumental && !b.instrumental) return 1;
            if (!a.instrumental && b.instrumental) return -1;

            // Prioriza Sync
            const aHasSync = !!a.syncedLyrics;
            const bHasSync = !!b.syncedLyrics;
            if (aHasSync && !bHasSync) return -1;
            if (!aHasSync && bHasSync) return 1;

            // Desempata por duração
            if (targetDuration > 0) {
                return Math.abs(a.duration - targetDuration) - Math.abs(b.duration - targetDuration);
            }
            return 0;
        });
    }

    async doRequest(endpoint, params, signal = null) {
        const url = new URL(this.baseUrl + endpoint);
        
        if (params.track || params.track_name) url.searchParams.append("track_name", params.track || params.track_name);
        if (params.artist || params.artist_name) url.searchParams.append("artist_name", params.artist || params.artist_name);
        if (params.album || params.album_name) url.searchParams.append("album_name", params.album || params.album_name);
        if (params.duration && params.duration > 0) url.searchParams.append("duration", params.duration);

        const response = await fetch(url, { signal });
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Erro API: ${response.status}`);
        }
        return await response.json();
    }
}

/**
 * --------------------------------------------------------------------------
 * MÓDULO 3: Conversor de Áudio (AudioConverter)
 * --------------------------------------------------------------------------
 * Converte FLAC/WAV para MP3 no navegador usando LAMEJS.
 */
class AudioConverter {
    static async convertToMp3(file, onProgress) {
        // Verificação de segurança para LAMEJS
        if (typeof lamejs === 'undefined') {
            throw new Error("Biblioteca 'lamejs' não carregada. Verifique sua conexão ou index.html.");
        }

        console.log("Iniciando conversão:", file.name);

        // 1. Decodificar
        const arrayBuffer = await file.arrayBuffer();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        // 2. Configurar Encoder
        const channels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const kbps = 128;
        
        const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
        const mp3Data = [];

        // 3. Processar
        const left = audioBuffer.getChannelData(0);
        const right = channels > 1 ? audioBuffer.getChannelData(1) : null;
        const sampleBlockSize = 1152;
        
        for (let i = 0; i < left.length; i += sampleBlockSize) {
            const leftChunk = left.subarray(i, i + sampleBlockSize);
            const leftInt16 = this.floatToInt16(leftChunk);
            let mp3buf;

            if (channels === 1) {
                mp3buf = mp3encoder.encodeBuffer(leftInt16);
            } else {
                const rightChunk = right.subarray(i, i + sampleBlockSize);
                const rightInt16 = this.floatToInt16(rightChunk);
                mp3buf = mp3encoder.encodeBuffer(leftInt16, rightInt16);
            }

            if (mp3buf.length > 0) mp3Data.push(mp3buf);

            if (onProgress && i % (sampleBlockSize * 50) === 0) {
                const percent = Math.round((i / left.length) * 100);
                onProgress(percent);
                // Pausa mínima para não travar a UI do navegador
                await new Promise(r => setTimeout(r, 0));
            }
        }

        const endBuf = mp3encoder.flush();
        if (endBuf.length > 0) mp3Data.push(endBuf);

        return new Blob(mp3Data, { type: 'audio/mpeg' });
    }

    static floatToInt16(float32Array) {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            let s = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return int16Array;
    }
}

/**
 * --------------------------------------------------------------------------
 * MÓDULO 4: Gravador de Tags (AudioTagger)
 * --------------------------------------------------------------------------
 * Injeta frames SYLT (Sync) e USLT (Texto) no MP3.
 */
class AudioTagger {
    static async embedMp3(originalFileBlob, meta, lyricsData) {
        
        // 1. Verificação de Segurança (AQUI ESTAVA O ERRO)
        if (typeof ID3Writer === 'undefined' && typeof window.ID3Writer === 'undefined') {
            throw new Error("Biblioteca ID3Writer não carregada. Verifique se o script está no index.html.");
        }

        // Garante referência correta à classe
        const WriterClass = window.ID3Writer || ID3Writer;

        const arrayBuffer = await originalFileBlob.arrayBuffer();
        const writer = new WriterClass(arrayBuffer);

        // Preserva/Atualiza tags básicas
        if (meta.track) writer.setFrame('TIT2', meta.track);
        if (meta.artist) writer.setFrame('TPE1', [meta.artist]); 
        if (meta.album) writer.setFrame('TALB', meta.album);

        // Injeta Sync (Letra Sincronizada)
        if (lyricsData.synced && lyricsData.synced.length > 0) {
            const syltData = lyricsData.synced.map(line => [line.text, Math.round(line.startTime * 1000)]);
            writer.setFrame('SYLT', { 
                type: 1, 
                text: syltData, 
                timestampFormat: 2, 
                language: 'por', 
                description: 'Sync Lyrics' 
            });
        }

        // Injeta Texto Puro (Letra não sincronizada)
        if (lyricsData.plain) {
            writer.setFrame('USLT', { 
                description: '', 
                lyrics: lyricsData.plain, 
                language: 'por' 
            });
        }

        writer.addTag();
        return writer.getBlob();
    }
}