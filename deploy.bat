@echo off
REM Build and push Docker image script

echo Building Docker image...
docker build -t gcr.io/treewatchapi/tree-permit-api-handler:latest .
IF %ERRORLEVEL% NEQ 0 (
    echo Error: Docker build failed.
    exit /b %ERRORLEVEL%
)

echo Pushing Docker image to Google Container Registry...
docker push gcr.io/treewatchapi/tree-permit-api-handler:latest
IF %ERRORLEVEL% NEQ 0 (
    echo Error: Docker push failed.
    exit /b %ERRORLEVEL%
)

echo Build and push completed successfully!
pause
