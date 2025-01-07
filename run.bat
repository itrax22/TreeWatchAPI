@echo off
REM Kill all running Docker containers and run a new one

echo Stopping and removing all running Docker containers...
for /f "tokens=*" %%i in ('docker ps -q') do docker stop %%i
for /f "tokens=*" %%i in ('docker ps -aq') do docker rm %%i

IF %ERRORLEVEL% NEQ 0 (
    echo Warning: No containers were running or could not be stopped.
)

echo Running the Docker container...
docker run -p 8080:8080 -e PORT=8080 gcr.io/treewatchapi/tree-permit-api-handler:latest
IF %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to run the Docker container.
    exit /b %ERRORLEVEL%
)

echo Docker container started successfully!
pause
