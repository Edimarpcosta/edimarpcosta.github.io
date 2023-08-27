@echo off
setlocal enabledelayedexpansion

REM Percorre o arquivo CSV linha por linha
for /F "tokens=1,2 delims=;" %%a in (produtos.csv) do (
    REM Baixa a imagem usando wget e nomeia com base na coluna 'nome'
    wget -O %%a.jpg %%b
)

endlocal
