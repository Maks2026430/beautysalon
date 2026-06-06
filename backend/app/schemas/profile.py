from datetime import date

from pydantic import BaseModel


class ProfileUpdate(BaseModel):
    # Phone is intentionally absent — it is read-only (spec 6.2).
    name: str | None = None
    birth_date: date | None = None
    notify_24h: bool | None = None
    notify_2h: bool | None = None
