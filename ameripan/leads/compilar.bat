@echo off
echo ==========================================
echo      COMPILANDO PATCHER EDIMAR v1.0
echo ==========================================

:: 1. Definições de Nomes
set SCRIPT_PYTHON=maps-scrap.py
set NOME_EXECUTAVEL=GMapScraper_Patcher_VIP

:: 2. Verificação de segurança
if not exist "%SCRIPT_PYTHON%" (
    echo [ERRO] O arquivo "%SCRIPT_PYTHON%" nao foi encontrado nesta pasta.
    echo Verifique se o nome do arquivo Python esta correto.
    pause
    exit
)

:: 3. Instalar PyInstaller (se necessário)
echo [INFO] Verificando dependencias...
pip install pyinstaller requests >nul 2>&1

:: 4. Limpar compilações anteriores
if exist build rd /s /q build
if exist dist rd /s /q dist
if exist *.spec del *.spec

:: 5. Compilar (Modo Silencioso do Console)
echo.
echo [INFO] Iniciando compilacao do executavel...
echo        Isso pode levar alguns segundos...
python -m PyInstaller --onefile --clean --name "%NOME_EXECUTAVEL%" "%SCRIPT_PYTHON%"

:: 6. Mover e Limpar
if exist "dist\%NOME_EXECUTAVEL%.exe" (
    echo.
    echo [INFO] Movendo executavel para a raiz...
    move "dist\%NOME_EXECUTAVEL%.exe" . >nul
    
    echo [INFO] Limpando arquivos temporarios...
    rd /s /q build
    rd /s /q dist
    del *.spec
    
    echo.
    echo ==========================================
    echo      SUCESSO TOTAL!
    echo      O arquivo "%NOME_EXECUTAVEL%.exe" foi criado.
    echo ==========================================
) else (
    echo.
    echo [ERRO] Falha na criacao do executavel. Verifique os erros acima.
)

pause