import uuid
from datetime import time

from sqlalchemy import Boolean, ForeignKey, Numeric, SmallInteger, String, Text, Time
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Master(Base):
    __tablename__ = "masters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str | None] = mapped_column(String(100), unique=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    bio: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(String(500))
    specializations: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    rating: Mapped[float | None] = mapped_column(Numeric(3, 2))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    schedules: Mapped[list["MasterSchedule"]] = relationship(
        back_populates="master", cascade="all, delete-orphan"
    )


class MasterSchedule(Base):
    __tablename__ = "master_schedules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    master_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE")
    )
    day_of_week: Mapped[int | None] = mapped_column(SmallInteger)  # 0=Mon .. 6=Sun
    start_time: Mapped[time | None] = mapped_column(Time)
    end_time: Mapped[time | None] = mapped_column(Time)

    master: Mapped["Master"] = relationship(back_populates="schedules")
