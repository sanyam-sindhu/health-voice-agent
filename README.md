# Voice Agent

AI-powered voice assistant for healthcare appointment booking. Patients can call in, speak naturally, and book, modify, or cancel appointments through a conversational interface.

## What it does

- Voice conversation with an AI receptionist using LiveKit
- Talking avatar powered by Simli
- Real-time tool call visualization on the frontend
- Books, modifies, and cancels appointments stored in SQLite
- Generates a call summary at the end of each session
- Stores call history with metrics like duration and actions taken

## Project structure

```
voice-agent/
  backend/    FastAPI server + LiveKit agent worker
  frontend/   React app built with Vite
```

## Running locally

Start the backend API:
```bash
cd backend
venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001
```

Start the agent worker in a separate terminal:
```bash
cd backend
venv\Scripts\python.exe agent.py start
```

Start the frontend:
```bash
cd frontend
npm run dev
```

## Environment variables

Copy `backend/.env.example` to `backend/.env` and fill in your keys:

```
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
OPENAI_API_KEY=
DEEPGRAM_API_KEY=
SIMLI_API_KEY=
SIMLI_FACE_ID=
```

Set the backend URL in `frontend/.env`:

```
VITE_API_URL=http://localhost:8001
```

## Tech stack

Backend: FastAPI, LiveKit Agents, OpenAI GPT-4o, Deepgram STT, Simli avatar, SQLite

Frontend: React, Vite, Tailwind CSS, LiveKit Components
