# NamJap — Daily Counter Tracker

Track your daily count, log it, and see totals & history over time.

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Flask (Python)
- **Database**: SQLite

## Quick Start

### 1. Backend (Flask)

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The API will start at `http://127.0.0.1:5000`.

### 2. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

The app will open at `http://localhost:5173`.

> The Vite dev server proxies all `/api/*` requests to the Flask backend automatically.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/today` | Get today's log |
| POST | `/api/log` | Save/update a log |
| GET | `/api/logs` | Get all logs |
| GET | `/api/stats` | Get aggregate stats |
| PUT | `/api/log/:id` | Edit a log entry |
| DELETE | `/api/log/:id` | Delete a log entry |
