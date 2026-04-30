import os
import uuid
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from livekit.api import AccessToken, VideoGrants
from openai import AsyncOpenAI

from db import Database

load_dotenv()

app = FastAPI(title="Voice Agent API")
db = Database()
openai_client = AsyncOpenAI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.init()


@app.post("/connect")
async def connect():
    room_name = f"voice-{uuid.uuid4().hex[:10]}"

    token = (
        AccessToken(
            os.environ["LIVEKIT_API_KEY"],
            os.environ["LIVEKIT_API_SECRET"],
        )
        .with_identity("user")
        .with_name("Caller")
        .with_grants(VideoGrants(room_join=True, room=room_name))
        .to_jwt()
    )

    return {
        "token": token,
        "url": os.environ["LIVEKIT_URL"],
        "room": room_name,
    }


@app.get("/appointments/{user_id}")
async def get_appointments(user_id: int):
    return await db.get_appointments(user_id)


@app.get("/summary/{session_id}")
async def get_summary(session_id: str):
    summary = await db.get_summary(session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    return summary


@app.post("/summary/generate/{session_id}")
async def generate_summary(session_id: str, user_id: int = 0):
    existing = await db.get_summary(session_id)
    if existing:
        return existing

    appointments = await db.get_appointments(user_id) if user_id else []
    appt_text = (
        "\n".join([f"- {a['date']} at {a['time']} (ID {a['id']})" for a in appointments])
        if appointments else "No appointments booked."
    )

    resp = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "Generate a brief call summary for a healthcare front-desk AI voice agent session.",
            },
            {
                "role": "user",
                "content": f"Session ended by user. Appointments on file:\n{appt_text}",
            },
        ],
    )
    summary_text = resp.choices[0].message.content or "Call completed."

    user_info = {}
    if user_id:
        user_info = {"id": user_id}

    await db.save_summary(session_id, summary_text, appointments, user_info)
    return await db.get_summary(session_id)


@app.get("/summaries")
async def list_summaries():
    return await db.get_all_summaries()


@app.get("/health")
async def health():
    return {"status": "ok"}
