@echo off
echo Starting Cricket Auction System...

echo 1. Starting Backend API Server...
cd backend
start cmd /k "python app.py"

cd ../frontend
echo 2. Starting Frontend Web Server...
start http://localhost:8000
python -m http.server 8000
