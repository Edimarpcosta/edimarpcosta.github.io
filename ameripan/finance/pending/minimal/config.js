// CONFIGURAÇÕES GERAIS DO PORTAL
const CONFIG = {
  // Retorna a senha persistida no navegador
  get PASSWORD() {
    return localStorage.getItem("cobranca_password") || "";
  },
  set PASSWORD(val) {
    if (val === null || val === undefined) {
      localStorage.removeItem("cobranca_password");
    } else {
      localStorage.setItem("cobranca_password", val);
    }
  },
  
  // Retorna a URL do Google Apps Script cadastrada
  get APPS_SCRIPT_URL() {
    return localStorage.getItem("cobranca_apps_script_url") || "https://script.google.com/macros/s/AKfycbwwHgXFyDsTxMMIn37k1l1-xv1dk7LE4z211DyJUFPvvuAzcIXBu47RCmrj3wvsELU_xQ/exec";
  },
  set APPS_SCRIPT_URL(val) {
    if (val === null || val === undefined) {
      localStorage.removeItem("cobranca_apps_script_url");
    } else {
      localStorage.setItem("cobranca_apps_script_url", val);
    }
  },

  // Senha de contingência local caso a URL do Sheets ainda não tenha sido configurada
  LOCAL_BACKUP_PASSWORD: "ameripan123"
};
