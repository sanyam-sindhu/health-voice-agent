import asyncio
import json
import logging
import os
from datetime import datetime
from typing import Annotated

from dotenv import load_dotenv
from openai import AsyncOpenAI

from livekit import rtc
from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    JobContext,
    RunContext,
    WorkerOptions,
    WorkerType,
    cli,
    function_tool,
)
from livekit.plugins import deepgram, silero, simli
from livekit.plugins import openai as lk_openai

from db import Database

load_dotenv()

logger = logging.getLogger("agent")
openai_client = AsyncOpenAI()


class HealthcareAgent(Agent):
    def __init__(self, db: Database, session_id: str, room: rtc.Room):
        today = datetime.now().strftime("%A, %B %d, %Y")
        super().__init__(
            instructions=(
                f"Today's date is {today}. "
                "You are a warm, professional AI receptionist for a healthcare clinic. "
                "Help patients book, modify, and cancel appointments. "
                "Start by greeting and immediately ask for their phone number, then call identify_user. "
                "Ask for their name if not on file. Keep responses short — this is a voice call. "
                "When the user says 'tomorrow' or 'next Monday' etc., convert it to the correct YYYY-MM-DD date relative to today. "
                "Always confirm the exact date and time before booking. "
                "When the user says goodbye or is done, call end_conversation."
            )
        )
        self._db = db
        self._session_id = session_id
        self._room = room
        self._user: dict = {"id": None, "name": None, "phone": None}
        self._log: list[dict] = []
        self._call_start = datetime.now()
        self._tool_counts: dict[str, int] = {}

    async def _emit(self, event_type: str, data: dict):
        payload = json.dumps({"type": event_type, **data}).encode()
        await self._room.local_participant.publish_data(payload, reliable=True)

    def _track(self, tool_name: str):
        self._tool_counts[tool_name] = self._tool_counts.get(tool_name, 0) + 1

    def _build_metrics(self) -> dict:
        duration_s = int((datetime.now() - self._call_start).total_seconds())
        return {
            "duration_seconds": duration_s,
            "duration_label": f"{duration_s // 60}m {duration_s % 60}s",
            "tool_calls_total": sum(self._tool_counts.values()),
            "tool_breakdown": self._tool_counts,
        }

    @function_tool
    async def identify_user(
        self,
        context: RunContext,
        phone_number: Annotated[str, "Caller's phone number, digits only"],
    ) -> str:
        self._track("identify_user")
        await self._emit(
            "tool_call",
            {"name": "identify_user", "status": "running", "message": f"Looking up {phone_number}…"},
        )
        user = await self._db.get_or_create_user(phone_number)
        self._user["id"] = user["id"]
        self._user["phone"] = phone_number
        if user.get("name"):
            self._user["name"] = user["name"]
        await self._emit(
            "tool_result",
            {"name": "identify_user", "status": "done", "message": f"User found (ID {user['id']})"},
        )
        label = "returning patient" if user.get("name") else "new patient"
        return f"Identified as {label}. User ID: {user['id']}. Name on file: {user.get('name', 'not set')}."

    @function_tool
    async def update_user_name(
        self,
        context: RunContext,
        name: Annotated[str, "Full name of the caller"],
    ) -> str:
        if not self._user["id"]:
            return "Identify the user first."
        self._track("update_user_name")
        await self._db.update_user_name(self._user["id"], name)
        self._user["name"] = name
        await self._emit(
            "tool_result",
            {"name": "update_user_name", "status": "done", "message": f"Name saved: {name}"},
        )
        return f"Name updated to {name}."

    @function_tool
    async def fetch_slots(
        self,
        context: RunContext,
        date: Annotated[str, "Date to check availability in YYYY-MM-DD format"],
    ) -> str:
        self._track("fetch_slots")
        await self._emit(
            "tool_call",
            {"name": "fetch_slots", "status": "running", "message": f"Fetching slots for {date}…"},
        )
        all_slots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]
        available = [s for s in all_slots if await self._db.check_slot_available(date, s)]
        await self._emit(
            "tool_result",
            {
                "name": "fetch_slots",
                "status": "done",
                "message": f"{len(available)} slots available on {date}",
                "slots": available,
                "date": date,
            },
        )
        if not available:
            return f"No slots available on {date}. Try another date."
        return f"Available on {date}: {', '.join(available)}. Which time works?"

    @function_tool
    async def book_appointment(
        self,
        context: RunContext,
        date: Annotated[str, "Appointment date in YYYY-MM-DD format"],
        time: Annotated[str, "Appointment time in HH:MM 24-hour format"],
    ) -> str:
        if not self._user["id"]:
            return "Identify the user first."
        self._track("book_appointment")
        await self._emit(
            "tool_call",
            {"name": "book_appointment", "status": "running", "message": f"Booking {date} at {time}…"},
        )
        if not await self._db.check_slot_available(date, time):
            await self._emit(
                "tool_result",
                {"name": "book_appointment", "status": "error", "message": f"{time} on {date} is already taken"},
            )
            return f"Sorry, {time} on {date} is booked. Let me fetch other available slots."
        appt = await self._db.book_appointment(
            self._user["id"], self._user.get("name") or "", date, time
        )
        await self._emit(
            "tool_result",
            {
                "name": "book_appointment",
                "status": "done",
                "message": f"Confirmed — {date} at {time} ✅",
                "appointment": appt,
            },
        )
        return f"Appointment booked! ID: {appt['id']}, Date: {date}, Time: {time}. All confirmed."

    @function_tool
    async def retrieve_appointments(
        self,
        context: RunContext,
    ) -> str:
        if not self._user["id"]:
            return "Identify the user first."
        self._track("retrieve_appointments")
        await self._emit(
            "tool_call",
            {"name": "retrieve_appointments", "status": "running", "message": "Fetching your appointments…"},
        )
        appointments = await self._db.get_appointments(self._user["id"])
        await self._emit(
            "tool_result",
            {
                "name": "retrieve_appointments",
                "status": "done",
                "message": f"Found {len(appointments)} appointment(s)",
                "appointments": appointments,
            },
        )
        if not appointments:
            return "You have no upcoming appointments."
        lines = [f"ID {a['id']}: {a['date']} at {a['time']}" for a in appointments]
        return "Your appointments: " + "; ".join(lines) + "."

    @function_tool
    async def cancel_appointment(
        self,
        context: RunContext,
        appointment_id: Annotated[int, "The numeric appointment ID to cancel"],
    ) -> str:
        if not self._user["id"]:
            return "Identify the user first."
        self._track("cancel_appointment")
        await self._emit(
            "tool_call",
            {"name": "cancel_appointment", "status": "running", "message": f"Cancelling appointment {appointment_id}…"},
        )
        await self._db.cancel_appointment(appointment_id, self._user["id"])
        await self._emit(
            "tool_result",
            {"name": "cancel_appointment", "status": "done", "message": f"Appointment {appointment_id} cancelled ✅"},
        )
        return f"Appointment {appointment_id} has been cancelled."

    @function_tool
    async def modify_appointment(
        self,
        context: RunContext,
        appointment_id: Annotated[int, "The appointment ID to reschedule"],
        new_date: Annotated[str, "New date in YYYY-MM-DD format"],
        new_time: Annotated[str, "New time in HH:MM 24-hour format"],
    ) -> str:
        if not self._user["id"]:
            return "Identify the user first."
        self._track("modify_appointment")
        await self._emit(
            "tool_call",
            {"name": "modify_appointment", "status": "running", "message": f"Rescheduling appointment {appointment_id}…"},
        )
        if not await self._db.check_slot_available(new_date, new_time):
            await self._emit(
                "tool_result",
                {"name": "modify_appointment", "status": "error", "message": f"{new_time} on {new_date} not available"},
            )
            return f"Sorry, {new_time} on {new_date} is not available."
        await self._db.modify_appointment(appointment_id, self._user["id"], new_date, new_time)
        await self._emit(
            "tool_result",
            {"name": "modify_appointment", "status": "done", "message": f"Rescheduled to {new_date} at {new_time} ✅"},
        )
        return f"Appointment {appointment_id} rescheduled to {new_date} at {new_time}."

    @function_tool
    async def end_conversation(
        self,
        context: RunContext,
    ) -> str:
        await self._emit(
            "tool_call",
            {"name": "end_conversation", "status": "running", "message": "Generating call summary…"},
        )
        history_text = "\n".join(
            [f"{m['role'].upper()}: {m['content']}" for m in self._log[-30:]]
        )
        appointments: list = []
        if self._user["id"]:
            appointments = await self._db.get_appointments(self._user["id"])

        resp = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Summarize this healthcare front-desk voice call in 3-4 sentences. "
                        "Cover: caller intent, actions taken, any preferences or notes."
                    ),
                },
                {"role": "user", "content": f"Transcript:\n{history_text}"},
            ],
        )
        summary_text = resp.choices[0].message.content or "Call completed."
        metrics = self._build_metrics()

        await self._db.save_summary(
            self._session_id, summary_text, appointments, self._user, metrics
        )
        await self._emit(
            "summary",
            {
                "session_id": self._session_id,
                "summary": summary_text,
                "appointments": appointments,
                "user": self._user,
                "metrics": metrics,
                "timestamp": datetime.now().isoformat(),
            },
        )
        return "Thank you for calling. I've sent you a summary. Have a great day! Goodbye."


async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    db = Database()
    await db.init()

    session_id = ctx.room.name
    agent = HealthcareAgent(db=db, session_id=session_id, room=ctx.room)

    session = AgentSession(
        stt=deepgram.STT(),
        llm=lk_openai.LLM(model="gpt-4o"),
        tts=lk_openai.TTS(voice="alloy"),
        vad=silero.VAD.load(),
    )

    @session.on("conversation_item_added")
    def on_item_added(evt):
        msg = evt.item
        if hasattr(msg, "role") and hasattr(msg, "text_content"):
            text = msg.text_content
            if text:
                agent._log.append({"role": msg.role, "content": text})

    @ctx.room.on("data_received")
    def on_data_received(packet):
        try:
            msg = json.loads(bytes(packet.data).decode())
            if msg.get("type") == "user_message":
                asyncio.ensure_future(
                    session.generate_reply(
                        instructions="The user has clicked End Call. Call end_conversation tool right now to generate the summary and say goodbye."
                    )
                )
        except Exception:
            pass

    simli_avatar = simli.AvatarSession(
        simli_config=simli.SimliConfig(
            api_key=os.environ["SIMLI_API_KEY"],
            face_id=os.environ["SIMLI_FACE_ID"],
        ),
    )
    await simli_avatar.start(session, room=ctx.room)

    await session.start(agent, room=ctx.room)
    await session.say(
        "Hello! Thank you for calling. I'm your AI healthcare assistant. "
        "Could I please have your phone number to get started?",
        allow_interruptions=True,
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, worker_type=WorkerType.ROOM))
