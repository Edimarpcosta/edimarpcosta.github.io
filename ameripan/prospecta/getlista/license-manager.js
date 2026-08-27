/**
 * GetLista — Prospecta CNPJ Pro - License Manager (Mercado Pago Pix / Google Apps Script)
 * Versão 3.0 - Compatível com Navegadores Web (LocalStorage / SessionStorage)
 */

(function (global) {
  'use strict';

  const LicenseManager = {
    CONFIG: {
      DEFAULT_ENDPOINT: 'https://script.google.com/macros/s/AKfycbwtddYDHJmvEmFqfwbX66X-Pr7ae4va72icdN5JmsahsV_ylFqXOSflW7Ae3ds52I6R/exec',
      CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 horas de cache offline
      STORAGE_KEY_HWID: 'GETLISTA_LM_HWID',
      STORAGE_KEY_DATA: 'GETLISTA_LM_LICENSE_DATA',
      STORAGE_KEY_API_URL: 'getlista_licenseApiUrl',
      STORAGE_KEY_CREDS: 'GETLISTA_API_CREDENTIALS'
    },

    /**
     * Obtém ou gera um identificador único de hardware/navegador (HWID) persistente
     * @returns {Promise<string>}
     */
    async getHWID() {
      try {
        let hwid = localStorage.getItem(this.CONFIG.STORAGE_KEY_HWID);
        if (!hwid) {
          hwid = this.generateUUID();
          localStorage.setItem(this.CONFIG.STORAGE_KEY_HWID, hwid);
        }
        return hwid;
      } catch (e) {
        return this.generateUUID();
      }
    },

    /**
     * Gera UUID randômico seguro
     * @returns {string}
     */
    generateUUID() {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },

    /**
     * Abre ou inicializa o banco IndexedDB para armazenamento persistente
     */
    openDatabase() {
      return new Promise((resolve) => {
        try {
          if (typeof window === 'undefined' || !window.indexedDB) return resolve(null);
          const req = window.indexedDB.open('GetListaDB', 1);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('licenses')) {
              db.createObjectStore('licenses', { keyPath: 'id' });
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (err) {
          resolve(null);
        }
      });
    },

    /**
     * Salva valor no IndexedDB
     */
    async setIndexedDB(id, value) {
      try {
        const db = await this.openDatabase();
        if (!db) return;
        const tx = db.transaction('licenses', 'readwrite');
        const store = tx.objectStore('licenses');
        store.put({ id, value, updatedAt: Date.now() });
      } catch (e) {}
    },

    /**
     * Resgata valor do IndexedDB
     */
    async getIndexedDB(id) {
      try {
        const db = await this.openDatabase();
        if (!db) return null;
        return new Promise((resolve) => {
          const tx = db.transaction('licenses', 'readonly');
          const store = tx.objectStore('licenses');
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result ? req.result.value : null);
          req.onerror = () => resolve(null);
        });
      } catch (e) {
        return null;
      }
    },

    /**
     * Obtém os dados de licença salvos no localStorage ou IndexedDB
     * @returns {Promise<object>}
     */
    async getStoredLicense() {
      try {
        const raw = localStorage.getItem(this.CONFIG.STORAGE_KEY_DATA);
        if (raw) {
          return JSON.parse(raw);
        }
      } catch (e) {}

      // Fallback para IndexedDB
      try {
        const idbData = await this.getIndexedDB('license_data');
        if (idbData && idbData.licenseKey) {
          localStorage.setItem(this.CONFIG.STORAGE_KEY_DATA, JSON.stringify(idbData));
          return idbData;
        }
      } catch (e) {}

      return {
        licenseKey: '',
        status: 'UNLICENSED',
        expireAt: null,
        email: null,
        lastValidated: 0,
        cachedHwid: ''
      };
    },

    /**
     * Salva os dados de licença no localStorage e no IndexedDB
     * @param {object} data 
     * @returns {Promise<void>}
     */
    async saveStoredLicense(data) {
      try {
        localStorage.setItem(this.CONFIG.STORAGE_KEY_DATA, JSON.stringify(data));
        await this.setIndexedDB('license_data', data);
      } catch (e) {}
    },

    /**
     * Obtém a URL do endpoint do Google Apps Script
     * @returns {Promise<string>}
     */
    async getApiUrl() {
      try {
        const url = localStorage.getItem(this.CONFIG.STORAGE_KEY_API_URL);
        return url || this.CONFIG.DEFAULT_ENDPOINT;
      } catch (e) {
        return this.CONFIG.DEFAULT_ENDPOINT;
      }
    },

    /**
     * Define a URL do endpoint do Google Apps Script
     * @param {string} url 
     */
    setApiUrl(url) {
      if (url) {
        localStorage.setItem(this.CONFIG.STORAGE_KEY_API_URL, url);
      }
    },

    /**
     * Valida a chave de licença (Offline Cache + Online Apps Script)
     * @param {string} [keyToTest] Chave a ser testada
     * @param {boolean} [forceOnline=false] Forçar verificação no servidor
     * @returns {Promise<{success: boolean, status: string, message: string, expireAt?: string, email?: string, fromCache?: boolean}>}
     */
    async validate(keyToTest, forceOnline = false) {
      try {
        let key = keyToTest;
        const stored = await this.getStoredLicense();

        if (!key) {
          key = stored.licenseKey;
        }

        if (!key || typeof key !== 'string' || key.trim() === '') {
          return {
            success: false,
            status: 'NO_KEY',
            message: 'Nenhuma chave de licença informada.'
          };
        }

        key = key.trim().toUpperCase();

        // 1. Verificação de Cache Offline de 24h
        const now = Date.now();
        const isSameKey = stored.licenseKey === key;
        const isWithinTtl = (now - (stored.lastValidated || 0)) < this.CONFIG.CACHE_TTL_MS;
        const notExpired = stored.expireAt ? (new Date(stored.expireAt).getTime() > now) : false;

        if (!forceOnline && isSameKey && stored.status === 'ACTIVE' && isWithinTtl && notExpired) {
          return {
            success: true,
            status: 'ACTIVE',
            expireAt: stored.expireAt,
            email: stored.email,
            isVitalicio: stored.isVitalicio,
            fromCache: true,
            message: 'Licença ativa e válida (validada offline).'
          };
        }

        // 2. Verificação Online via Google Apps Script
        const hwid = await this.getHWID();
        const apiUrl = await this.getApiUrl();

        const url = `${apiUrl}?action=validate&key=${encodeURIComponent(key)}&hwid=${encodeURIComponent(hwid)}`;

        let fetchResponse;
        try {
          fetchResponse = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            redirect: 'follow'
          });
        } catch (networkErr) {
          console.warn('[LicenseManager] Falha de conexão de rede:', networkErr);

          if (isSameKey && stored.status === 'ACTIVE' && notExpired) {
            return {
              success: true,
              status: 'ACTIVE',
              expireAt: stored.expireAt,
              email: stored.email,
              isVitalicio: stored.isVitalicio,
              fromCache: true,
              offlineGrace: true,
              message: 'Servidor temporariamente indisponível. Operando com licença em cache.'
            };
          }

          return {
            success: false,
            status: 'NETWORK_ERROR',
            message: 'Não foi possível conectar ao servidor de licenças. Verifique sua conexão com a internet.'
          };
        }

        if (!fetchResponse.ok) {
          return {
            success: false,
            status: 'SERVER_ERROR',
            message: `Erro no servidor de licenças (HTTP ${fetchResponse.status}).`
          };
        }

        const data = await fetchResponse.json();

        if (data && data.success === true) {
          const licenseData = {
            licenseKey: key,
            status: 'ACTIVE',
            expireAt: data.expireAt || stored.expireAt,
            email: data.email || stored.email,
            isVitalicio: data.isVitalicio || false,
            activeDevicesCount: data.activeDevicesCount || 1,
            maxDevices: data.maxDevices !== undefined ? data.maxDevices : 1,
            lastValidated: Date.now(),
            cachedHwid: hwid
          };

          await this.saveStoredLicense(licenseData);

          if (data.credentials) {
            localStorage.setItem(this.CONFIG.STORAGE_KEY_CREDS, JSON.stringify(data.credentials));
            if (data.credentials.b2b_key) {
              localStorage.setItem('casadosdados_api_key', data.credentials.b2b_key);
            }
          }

          return {
            success: true,
            status: 'ACTIVE',
            expireAt: licenseData.expireAt,
            email: licenseData.email,
            isVitalicio: licenseData.isVitalicio,
            activeDevicesCount: licenseData.activeDevicesCount,
            maxDevices: licenseData.maxDevices,
            fromCache: false,
            message: data.message || 'Licença ativada com sucesso!'
          };
        } else {
          const errMsg = (data && data.message) ? data.message : 'Chave de licença inválida.';
          let status = 'INVALID';

          if (errMsg.toLowerCase().includes('expirada')) status = 'EXPIRED';
          else if (errMsg.toLowerCase().includes('outro') || errMsg.toLowerCase().includes('limite') || errMsg.toLowerCase().includes('dispositivo')) status = 'DEVICE_MISMATCH';
          else if (errMsg.toLowerCase().includes('inativa')) status = 'INACTIVE';

          const invalidData = {
            licenseKey: key,
            status: status,
            expireAt: null,
            email: null,
            lastValidated: Date.now(),
            cachedHwid: hwid,
            error: errMsg
          };

          await this.saveStoredLicense(invalidData);

          return {
            success: false,
            status: status,
            message: errMsg
          };
        }
      } catch (err) {
        console.error('[LicenseManager] Erro inesperado na validação:', err);
        return {
          success: false,
          status: 'ERROR',
          message: 'Erro interno ao validar licença.'
        };
      }
    },

    /**
     * Resgata as credenciais ativas do motor B2B / IA sem expor visualmente
     * @returns {Promise<{b2b_key: string, b2b_endpoint: string, gemini_key: string}>}
     */
    async getCredentials() {
      try {
        const raw = localStorage.getItem(this.CONFIG.STORAGE_KEY_CREDS);
        if (raw) return JSON.parse(raw);
      } catch (e) {}

      return {
        b2b_key: '',
        b2b_endpoint: 'https://api.casadosdados.com.br/v2/public/cnpj/search',
        gemini_key: ''
      };
    },

    /**
     * Verifica rapidamente se a licença atual está ativa e não expirada
     * @returns {Promise<boolean>}
     */
    async checkActive() {
      const res = await this.validate();
      return res && res.success === true;
    },

    /**
     * Limpa a licença armazenada
     * @returns {Promise<void>}
     */
    async clearLicense() {
      return this.saveStoredLicense({
        licenseKey: '',
        status: 'UNLICENSED',
        expireAt: null,
        email: null,
        lastValidated: 0,
        cachedHwid: ''
      });
    },

    /**
     * Formata uma chave bruta no formato XXXX-XXXX-XXXX-XXXX
     * @param {string} raw 
     * @returns {string}
     */
    formatKey(raw) {
      if (!raw) return '';
      const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
      const parts = clean.match(/.{1,4}/g);
      return parts ? parts.join('-') : clean;
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LicenseManager;
  }
  global.LicenseManager = LicenseManager;
})(typeof window !== 'undefined' ? window : globalThis);
