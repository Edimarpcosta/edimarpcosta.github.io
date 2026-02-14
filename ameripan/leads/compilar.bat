@echo off
echo ==========================================
echo      COMPILANDO COM NUITKA + ZIG (PYTHON 3.13 FIX)
echo ==========================================

set SCRIPT_PYTHON=maps-scrap.py
set NOME_EXECUTAVEL=GMapScraper_Patcher_VIP

:: Limpeza de tentativas anteriores
if exist *.dist rd /s /q *.dist
if exist *.build rd /s /q *.build
if exist *.onefile-build rd /s /q *.onefile-build

echo [INFO] Iniciando compilacao...
echo        Usando o compilador ZIG (Compativel com Python 3.13)

:: Comando Nuitka Corrigido com --zig
python -m nuitka --standalone --onefile ^
    --zig ^
    --assume-yes-for-downloads ^
    --company-name="Ameripan Distribuidora" ^
    --product-name="GMapScraper Patcher" ^
    --file-version="3.0.0.0" ^
    --product-version="3.0.0.0" ^
    --file-description="Patcher automatico para Google Maps Scraper" ^
    --copyright="Copyright (c) 2026 Ameripan" ^
    --output-filename="%NOME_EXECUTAVEL%.exe" ^
    --remove-output ^
    "%SCRIPT_PYTHON%"

if exist "%NOME_EXECUTAVEL%.exe" (
    echo.
    echo ==========================================
    echo [SUCESSO] Arquivo gerado: %NOME_EXECUTAVEL%.exe
    echo ==========================================
) else (
    echo.
    echo [ERRO] Falha na compilacao.
)
pause