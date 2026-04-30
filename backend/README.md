# Voice Agent Backend

## Setup

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Fill in .env with your keys
```

## Run

**Terminal 1 — API server:**
```bash
uvicorn main:app --reload --port 8000
```

**Terminal 2 — LiveKit agent worker:**
```bash
python agent.py dev
```

## LiveKit Cloud setup

1. Create a project at https://cloud.livekit.io
2. Enable **Agent Dispatch → Auto Dispatch** in project settings
3. Copy URL, API key, API secret to `.env`

## Environment Variables

| Variable | Description |
|---|---|
| LIVEKIT_URL | wss://your-project.livekit.cloud |
| LIVEKIT_API_KEY | LiveKit API key |
| LIVEKIT_API_SECRET | LiveKit API secret |
| OPENAI_API_KEY | OpenAI API key (GPT-4o + TTS) |
| DEEPGRAM_API_KEY | Deepgram API key (STT) |
