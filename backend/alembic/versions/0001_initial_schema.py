"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

UUID_PK = sa.text("gen_random_uuid()")  # built-in in PostgreSQL 13+


def upgrade() -> None:
    # ─── users ───────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=UUID_PK),
        sa.Column("phone", sa.String(20), nullable=False, unique=True),
        sa.Column("name", sa.String(100)),
        sa.Column("birth_date", sa.Date()),
        sa.Column("notify_24h", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("notify_2h", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # ─── masters ─────────────────────────────────────────────────────
    op.create_table(
        "masters",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=UUID_PK),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("bio", sa.Text()),
        sa.Column("photo_url", sa.String(500)),
        sa.Column("specializations", postgresql.ARRAY(sa.Text())),
        sa.Column("rating", sa.Numeric(3, 2)),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
    )

    # ─── services ────────────────────────────────────────────────────
    op.create_table(
        "services",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=UUID_PK),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("category", sa.String(100)),
        sa.Column("description", sa.Text()),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
    )

    # ─── master_schedules ────────────────────────────────────────────
    op.create_table(
        "master_schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=UUID_PK),
        sa.Column("master_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("masters.id", ondelete="CASCADE")),
        sa.Column("day_of_week", sa.SmallInteger()),  # 0=Mon .. 6=Sun
        sa.Column("start_time", sa.Time()),
        sa.Column("end_time", sa.Time()),
    )
    op.create_index("ix_master_schedules_master_id", "master_schedules", ["master_id"])

    # ─── appointments ────────────────────────────────────────────────
    op.create_table(
        "appointments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=UUID_PK),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("master_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("masters.id")),
        sa.Column("service_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("services.id")),
        sa.Column("starts_at", sa.DateTime(), nullable=False),
        sa.Column("ends_at", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("price", sa.Numeric(10, 2)),
        sa.Column("discount_applied", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_appointments_user_id", "appointments", ["user_id"])
    op.create_index("ix_appointments_master_id", "appointments", ["master_id"])
    op.create_index("ix_appointments_starts_at", "appointments", ["starts_at"])

    # ─── discount_offers ─────────────────────────────────────────────
    op.create_table(
        "discount_offers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=UUID_PK),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("service_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("services.id")),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # ─── payments ────────────────────────────────────────────────────
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=UUID_PK),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("appointments.id")),
        sa.Column("amount", sa.Numeric(10, 2)),
        sa.Column("provider", sa.String(50)),
        sa.Column("provider_payment_id", sa.String(200)),
        sa.Column("status", sa.String(20)),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # ─── staff ───────────────────────────────────────────────────────
    op.create_table(
        "staff",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=UUID_PK),
        sa.Column("email", sa.String(200), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(200), nullable=False),
        sa.Column("name", sa.String(100)),
        sa.Column("role", sa.String(20), server_default="staff"),  # 'admin' | 'staff'
    )


def downgrade() -> None:
    op.drop_table("staff")
    op.drop_table("payments")
    op.drop_table("discount_offers")
    op.drop_index("ix_appointments_starts_at", table_name="appointments")
    op.drop_index("ix_appointments_master_id", table_name="appointments")
    op.drop_index("ix_appointments_user_id", table_name="appointments")
    op.drop_table("appointments")
    op.drop_index("ix_master_schedules_master_id", table_name="master_schedules")
    op.drop_table("master_schedules")
    op.drop_table("services")
    op.drop_table("masters")
    op.drop_table("users")
