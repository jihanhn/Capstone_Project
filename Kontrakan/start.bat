@echo off
title Sistem BI Kontrakan Buti
echo ========================================================
echo   Menjalankan Sistem Business Intelligence Kontrakan Buti
echo ========================================================
echo.
echo Membuka server di http://localhost:5000 ...
start http://localhost:5000
node server/src/index.js
pause
