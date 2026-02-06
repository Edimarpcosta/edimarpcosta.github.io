import os
import zipfile
import shutil
import requests
import webbrowser
import re
import time
import glob

# ================= CONFIGURAÇÕES GERAIS =================
URL_DOWNLOAD = "https://file.mapsscraper.net/package/google-maps-scraper.zip"
ARQUIVO_ZIP_ORIGINAL = "google-maps-scraper.zip"
PASTA_TRABALHO = "temp_work_dir"
PASTA_FINAL_MOD = "google-maps-scraper-mod"
ARQUIVO_ZIP_MOD = "google-maps-scraper-mod.zip"
ARQUIVO_HTML_INSTRUCOES = "instrucoes_instalacao.html"

# Links Personalizados
LINK_AUTO = "https://edimarpcosta.github.io/ameripan/leads/GMapScraper_Patcher_VIP.exe"
LINK_MANUAL = "https://edimarpcosta.github.io/ameripan/leads/search/"
LINK_GESTAO = "https://edimarpcosta.github.io/ameripan/leads/manager/"

# ================= HTML TEMPLATE (EMBUTIDO) =================
CONTEUDO_HTML_TEMPLATE = r"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Instalação - Mod VIP</title>
    <style>
        :root {{ --bg: #0f172a; --card: #1e293b; --primary: #3b82f6; --success: #10b981; --danger: #ef4444; --text: #f1f5f9; }}
        body {{ font-family: 'Segoe UI', sans-serif; background-color: var(--bg); color: var(--text); padding: 20px; max-width: 900px; margin: 0 auto; }}
        .header {{ text-align: center; margin-bottom: 30px; }}
        .card {{ background: var(--card); padding: 25px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #334155; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }}
        .btn {{ background: var(--primary); color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 10px; transition: 0.2s; border: none; cursor: pointer; }}
        .btn:hover {{ filter: brightness(1.1); }}
        .btn-success {{ background: var(--success); }}
        .btn-outline {{ background: transparent; border: 1px solid var(--primary); color: var(--primary); }}
        .btn-outline:hover {{ background: rgba(59, 130, 246, 0.1); color: white; }}
        
        .code-block {{ background: #020617; padding: 15px; border-radius: 6px; border-left: 4px solid var(--danger); overflow-x: auto; font-family: monospace; margin: 10px 0; color: #e2e8f0; }}
        .status-success {{ color: var(--success); }}
        .status-error {{ color: var(--danger); }}
        .hidden {{ display: none; }}
        .links-bar {{ display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1 class="{CLASS_TITULO}">{TITULO_PAGINA}</h1>
        <p>{SUBTITULO_PAGINA}</p>
    </div>

    <div class="card" style="text-align: center; border-color: var(--primary);">
        <h3>🌐 Central de Controle</h3>
        <div class="links-bar" style="justify-content: center;">
            <a href="{LINK_GESTAO}" target="_blank" class="btn btn-success">📊 Gestor de Leads</a>
            <a href="{LINK_MANUAL}" target="_blank" class="btn btn-outline">📚 Tutorial Manual</a>
            <a href="{LINK_AUTO}" target="_blank" class="btn btn-outline">⬇️ Baixar Patcher</a>
        </div>
    </div>

    <div class="{CLASS_MANUAL}">
        <div class="card" style="border-color: var(--danger);">
            <h2 class="status-error">⚠️ Correção Manual Necessária</h2>
            <p>O sistema automático não encontrou os padrões esperados. Recomendamos usar o <strong>Notepad++</strong>.</p>
            
            <h3>1. Arquivo <code>leads.xxxx.js</code></h3>
            <p>Substitua a lógica de bloqueio VIP:</p>
            <div class="code-block">
                <strong>Localizar:</strong> R.GLOBAL_STORE.isVip?fe.push(...hr): ...<br>
                <strong>Substituir por:</strong> fe.push(...hr)
            </div>
            <p>Libere a visualização de E-mails:</p>
            <div class="code-block">
                <strong>Localizar:</strong> async function Kr(){{bt=R.GLOBAL_STORE.isVip<br>
                <strong>Substituir por:</strong> async function Kr(){{bt=true
            </div>

            <hr style="border-color: #334155; margin: 20px 0;">

            <h3>2. Arquivo <code>injected/msnetah.js</code> (Substituir Tudo)</h3>
            <p>Evite travamentos substituindo estas chamadas:</p>
            <div class="code-block">Localizar: r.call(n,o)<br>Substituir: r&&r.call(n,o)</div>
            <br>
            <div class="code-block">Localizar: n.call(i,s)<br>Substituir: n&&n.call(i,s)</div>
            <br>
            <div class="code-block">Localizar: e[t].call(i,o,s)<br>Substituir: e[t]&&e[t].call(i,o,s)</div>
        </div>
    </div>

    <div class="card">
        <h2>🚀 Instalação no Chrome</h2>
        <ol style="line-height: 1.8; font-size: 1.1rem;">
            <li>Abra o navegador em: <strong style="color: var(--primary);">chrome://extensions</strong></li>
            <li>Ative o <strong>"Modo do desenvolvedor"</strong> (canto superior direito).</li>
            <li>Clique em <strong>"Carregar sem compactação"</strong> (Load Unpacked).</li>
            <li>Selecione a pasta gerada: <strong style="color: #fbbf24;">google-maps-scraper-mod</strong></li>
        </ol>
    </div>
</body>
</html>
"""

# ================= MOTOR DE PATCH ROBUSTO =================

def aplicar_patch_robusto(conteudo, lista_patches, nome_arquivo):
    """
    Motor que gerencia a aplicação de patches via Regex e Backup.
    Retorna: (novo_conteudo, total_alteracoes)
    """
    novo_conteudo = conteudo
    total_alteracoes = 0
    
    print(f"--- Processando: {nome_arquivo} ---")

    for item in lista_patches:
        regex_busca = item.get('regex')
        subst = item.get('subst')
        backup_find = item.get('backup_find')
        backup_replace = item.get('backup_replace')
        descricao = item.get('desc', 'Patch genérico')
        is_global = item.get('global', False)
        
        aplicado = False
        
        # 1. Tentativa via Regex
        if regex_busca:
            # count=0 substitui todas, count=1 substitui apenas a primeira
            qtd = 0 if is_global else 1
            if re.search(regex_busca, novo_conteudo):
                novo_conteudo, n = re.subn(regex_busca, subst, novo_conteudo, count=qtd)
                if n > 0:
                    print(f"  [OK] Regex aplicado: {descricao} ({n}x)")
                    total_alteracoes += n
                    aplicado = True
        
        # 2. Tentativa via Texto Exato (Backup)
        # Só executa se o Regex falhou ou não existe, E se temos strings de backup
        if not aplicado and backup_find and backup_replace:
            if backup_find in novo_conteudo:
                # Validação de segurança para não duplicar patch
                if backup_replace not in novo_conteudo or item.get('force_backup', False):
                    novo_conteudo = novo_conteudo.replace(backup_find, backup_replace)
                    print(f"  [OK] Texto exato aplicado: {descricao}")
                    total_alteracoes += 1
                else:
                    print(f"  [Info] Backup ignorado (parece já estar aplicado): {descricao}")
            else:
                print(f"  [Falha] Padrão não encontrado: {descricao}")

    return novo_conteudo, total_alteracoes

# ================= FUNÇÕES DO SISTEMA =================

def log(msg):
    print(f"[SISTEMA] {msg}")

def encontrar_arquivo_recursivo(pasta_raiz, padrao_glob):
    """ Busca recursiva para achar arquivos em subpastas """
    caminho = os.path.join(pasta_raiz, "**", padrao_glob)
    arquivos = glob.glob(caminho, recursive=True)
    return arquivos[0] if arquivos else None

def baixar_se_necessario():
    if os.path.exists(ARQUIVO_ZIP_ORIGINAL):
        log(f"Arquivo ZIP encontrado: {ARQUIVO_ZIP_ORIGINAL}")
        return True
    
    log("Baixando versão oficial...")
    try:
        r = requests.get(URL_DOWNLOAD, stream=True)
        r.raise_for_status()
        with open(ARQUIVO_ZIP_ORIGINAL, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        log("Download concluído.")
        return True
    except Exception as e:
        print(f"[ERRO CRÍTICO] Falha no download: {e}")
        return False

def gerar_html_final(teve_erro=False):
    log("Gerando relatório HTML...")
    if teve_erro:
        titulo = "Atenção: Instalação Parcial"
        sub = "Alguns patches não puderam ser aplicados automaticamente."
        cls_tit = "status-error"
        cls_man = ""
    else:
        titulo = "Sucesso! Mod VIP Ativo"
        sub = "Sua extensão foi modificada e está pronta para uso."
        cls_tit = "status-success"
        cls_man = "hidden"

    html = CONTEUDO_HTML_TEMPLATE.format(
        TITULO_PAGINA=titulo,
        SUBTITULO_PAGINA=sub,
        CLASS_TITULO=cls_tit,
        CLASS_MANUAL=cls_man,
        LINK_AUTO=LINK_AUTO,
        LINK_MANUAL=LINK_MANUAL,
        LINK_GESTAO=LINK_GESTAO
    )
    
    with open(ARQUIVO_HTML_INSTRUCOES, "w", encoding="utf-8") as f:
        f.write(html)
    
    webbrowser.open(f"file:///{os.path.abspath(ARQUIVO_HTML_INSTRUCOES)}")

# ================= EXECUÇÃO PRINCIPAL =================

def main():
    print("\n=== GMAPS LEADS SCRAPER PATCHER (Ultimate v3) ===\n")
    ERRO_GLOBAL = False

    # 1. Limpeza e Download
    if os.path.exists(PASTA_TRABALHO): shutil.rmtree(PASTA_TRABALHO)
    if os.path.exists(PASTA_FINAL_MOD): shutil.rmtree(PASTA_FINAL_MOD)
    
    if not baixar_se_necessario():
        input("Pressione ENTER para encerrar...")
        return

    log("Extraindo arquivos...")
    with zipfile.ZipFile(ARQUIVO_ZIP_ORIGINAL, 'r') as z:
        z.extractall(PASTA_TRABALHO)

    # =========================================================
    # PATCH 1: LEADS.JS (Desbloqueio VIP)
    # =========================================================
    path_leads = encontrar_arquivo_recursivo(PASTA_TRABALHO, "leads.*.js")
    
    if path_leads:
        with open(path_leads, 'r', encoding='utf-8') as f:
            conteudo_leads = f.read()

        patches_leads = [
            {
                'desc': 'Remover Limite de 30 itens',
                # Regex flexível que pega a condicional ternária
                'regex': r'([\w\.]+\.isVip\?)([\w\.]+\.push\(.+?\)):[\s\S]+?value="finish"\)\)',
                'subst': r'\2', 
                'backup_find': r'R.GLOBAL_STORE.isVip?fe.push(...hr):(fe.length+hr.length>=30?fe.push(...hr.slice(0,30-fe.length)):fe.push(...hr),fe.length>=30&&(te.value="finish"))',
                'backup_replace': r'fe.push(...hr)'
            },
            {
                'desc': 'Mostrar E-mails e Telefones',
                'regex': r'(async\s+function\s+[\w]+\(\)\s*\{[\s]*)(\w+)(\s*=\s*[\w\.]+\.isVip)',
                'subst': r'\1\2=true',
                'backup_find': r'async function Kr(){bt=R.GLOBAL_STORE.isVip',
                'backup_replace': r'async function Kr(){bt=true'
            }
        ]

        novo_leads, n = aplicar_patch_robusto(conteudo_leads, patches_leads, "leads.js")
        
        if n > 0:
            with open(path_leads, 'w', encoding='utf-8') as f: f.write(novo_leads)
        else:
            log("ALERTA: Nenhuma alteração feita em leads.js.")
            ERRO_GLOBAL = True
    else:
        log("ERRO: leads.*.js não encontrado.")
        ERRO_GLOBAL = True

    # =========================================================
    # PATCH 2: MSNETAH.JS (Estabilidade / Correção de Null)
    # =========================================================
    path_ms = encontrar_arquivo_recursivo(PASTA_TRABALHO, "msnetah.js")
    
    if path_ms:
        with open(path_ms, 'r', encoding='utf-8') as f:
            conteudo_ms = f.read()

        # Aqui usamos o Regex "Cirúrgico" (Lookbehind) dentro da estrutura Robusta
        # (?<!r&&) -> Garante que só substitui se NÃO tiver && antes (evita duplicidade)
        patches_ms = [
            {
                'desc': 'Fix r.call(n,o)',
                'regex': r'(?<!r&&)r\.call\(n,o\)', 
                'subst': r'r&&r.call(n,o)',
                'global': True, # Substitui todas as ocorrencias
                'backup_find': 'r.call(n,o)',
                'backup_replace': 'r&&r.call(n,o)'
            },
            {
                'desc': 'Fix n.call(i,s)',
                'regex': r'(?<!n&&)n\.call\(i,s\)',
                'subst': r'n&&n.call(i,s)',
                'global': True,
                'backup_find': 'n.call(i,s)',
                'backup_replace': 'n&&n.call(i,s)'
            },
            {
                'desc': 'Fix Array e[t].call(i,o,s)',
                # Escapamos os colchetes \[ \] para o regex funcionar corretamente
                'regex': r'(?<!e\[t\]&&)e\[t\]\.call\(i,o,s\)',
                'subst': r'e[t]&&e[t].call(i,o,s)',
                'global': True,
                'backup_find': 'e[t].call(i,o,s)',
                'backup_replace': 'e[t]&&e[t].call(i,o,s)'
            }
        ]

        novo_ms, n_ms = aplicar_patch_robusto(conteudo_ms, patches_ms, "msnetah.js")
        
        if n_ms > 0:
            with open(path_ms, 'w', encoding='utf-8') as f: f.write(novo_ms)
        else:
            log("Aviso: Nenhuma correção aplicada em msnetah.js (Código limpo ou não encontrado).")
    else:
        log("Aviso: msnetah.js não encontrado.")

    # 3. Finalização
    log("Criando pacote final...")
    shutil.move(PASTA_TRABALHO, PASTA_FINAL_MOD)
    shutil.make_archive(PASTA_FINAL_MOD, 'zip', PASTA_FINAL_MOD)
    
    gerar_html_final(teve_erro=ERRO_GLOBAL)
    
    print("\nConcluído com Sucesso!")
    time.sleep(2)

if __name__ == "__main__":
    main()