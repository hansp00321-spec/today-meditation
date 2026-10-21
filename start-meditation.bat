@echo off
chcp 65001 > nul
echo ==================================================
echo   [오늘의 묵상] 웹 애플리케이션 실행 스크립트
echo ==================================================
echo.
echo 브라우저에서 웹앱을 실행합니다 (http://localhost:3000)
echo 잠시만 기다려 주세요...
echo.

set PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0"

start http://localhost:3000
npm run dev
pause
