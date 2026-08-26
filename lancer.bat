@echo off
echo ==========================================
echo   GRU - Gestion des Relations Usager
echo   Lancement de l'application...
echo ==========================================
echo.

echo [1/3] Installation des dependances backend...
cd /d "%~dp0backend"
call npm install --production 2>nul
if errorlevel 1 (
    echo ERREUR: Echec de l'installation backend
    pause
    exit /b 1
)

echo [2/3] Installation des dependances frontend...
cd /d "%~dp0frontend"
call npm install 2>nul
if errorlevel 1 (
    echo ERREUR: Echec de l'installation frontend
    pause
    exit /b 1
)

echo [3/3] Demarrage...
echo.
echo --- Backend (port 3000) ---
echo --- Frontend (port 5173) ---
echo --- Swagger: http://localhost:3000/api-docs ---
echo.

cd /d "%~dp0"
start "GRU Backend" cmd /c "cd backend && npm run dev"
timeout /t 3 /nobreak >nul
start "GRU Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo Application lancee !
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3000
echo   Swagger:  http://localhost:3000/api-docs
echo.
echo Fermez cette fenetre ou appuyez sur Ctrl+C dans les terminaux pour arreter.
pause
