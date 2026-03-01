@echo off
echo Fechando todos os processos Chrome...
taskkill /F /IM chrome.exe >nul 2>&1
timeout /t 2 >nul

echo Abrindo Chrome com debug na porta 9222...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --no-first-run

echo.
echo Chrome iniciado! Porta de debug: 9222
echo Abra o Power BI no Chrome e depois rode o script Python.
pause
