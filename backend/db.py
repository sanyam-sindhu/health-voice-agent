import json
import aiosqlite

DB_PATH = "appointments.db"


class Database:
    async def init(self):
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    phone_number TEXT UNIQUE NOT NULL,
                    name TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS appointments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT,
                    date TEXT NOT NULL,
                    time TEXT NOT NULL,
                    status TEXT DEFAULT 'confirmed',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS summaries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE NOT NULL,
                    summary TEXT NOT NULL,
                    appointments TEXT DEFAULT '[]',
                    user_info TEXT DEFAULT '{}',
                    metrics TEXT DEFAULT '{}',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            try:
                await db.execute("ALTER TABLE summaries ADD COLUMN metrics TEXT DEFAULT '{}'")
                await db.commit()
            except Exception:
                pass
            await db.commit()

    async def get_or_create_user(self, phone_number: str) -> dict:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM users WHERE phone_number = ?", (phone_number,)
            ) as cursor:
                user = await cursor.fetchone()
            if user:
                return dict(user)
            await db.execute(
                "INSERT INTO users (phone_number) VALUES (?)", (phone_number,)
            )
            await db.commit()
            async with db.execute(
                "SELECT * FROM users WHERE phone_number = ?", (phone_number,)
            ) as cursor:
                user = await cursor.fetchone()
            return dict(user)

    async def update_user_name(self, user_id: int, name: str):
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "UPDATE users SET name = ? WHERE id = ?", (name, user_id)
            )
            await db.commit()

    async def get_appointments(self, user_id: int) -> list:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM appointments WHERE user_id = ? AND status != 'cancelled' ORDER BY date, time",
                (user_id,),
            ) as cursor:
                rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    async def check_slot_available(self, date: str, time: str) -> bool:
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute(
                "SELECT id FROM appointments WHERE date = ? AND time = ? AND status = 'confirmed'",
                (date, time),
            ) as cursor:
                return await cursor.fetchone() is None

    async def book_appointment(
        self, user_id: int, name: str, date: str, time: str
    ) -> dict:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            await db.execute(
                "INSERT INTO appointments (user_id, name, date, time) VALUES (?, ?, ?, ?)",
                (user_id, name, date, time),
            )
            await db.commit()
            async with db.execute(
                "SELECT * FROM appointments WHERE user_id = ? ORDER BY id DESC LIMIT 1",
                (user_id,),
            ) as cursor:
                appt = await cursor.fetchone()
            return dict(appt)

    async def cancel_appointment(self, appointment_id: int, user_id: int) -> bool:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "UPDATE appointments SET status = 'cancelled' WHERE id = ? AND user_id = ?",
                (appointment_id, user_id),
            )
            await db.commit()
        return True

    async def modify_appointment(
        self, appointment_id: int, user_id: int, new_date: str, new_time: str
    ) -> bool:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "UPDATE appointments SET date = ?, time = ? WHERE id = ? AND user_id = ?",
                (new_date, new_time, appointment_id, user_id),
            )
            await db.commit()
        return True

    async def save_summary(
        self, session_id: str, summary: str, appointments: list, user_info: dict, metrics: dict = None
    ):
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "INSERT OR REPLACE INTO summaries (session_id, summary, appointments, user_info, metrics) VALUES (?, ?, ?, ?, ?)",
                (
                    session_id,
                    summary,
                    json.dumps(appointments),
                    json.dumps(user_info),
                    json.dumps(metrics or {}),
                ),
            )
            await db.commit()

    async def get_all_summaries(self) -> list:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM summaries ORDER BY created_at DESC"
            ) as cursor:
                rows = await cursor.fetchall()
            result = []
            for row in rows:
                r = dict(row)
                r["appointments"] = json.loads(r.get("appointments") or "[]")
                r["user_info"] = json.loads(r.get("user_info") or "{}")
                r["metrics"] = json.loads(r.get("metrics") or "{}")
                result.append(r)
            return result

    async def get_summary(self, session_id: str) -> dict | None:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM summaries WHERE session_id = ?", (session_id,)
            ) as cursor:
                row = await cursor.fetchone()
            if not row:
                return None
            result = dict(row)
            result["appointments"] = json.loads(result.get("appointments") or "[]")
            result["user_info"] = json.loads(result.get("user_info") or "{}")
            result["metrics"] = json.loads(result.get("metrics") or "{}")
            return result
