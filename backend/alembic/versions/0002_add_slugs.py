"""add slug columns to services and masters

Revision ID: 0002_add_slugs
Revises: 0001_initial
Create Date: 2026-06-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_add_slugs"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("services", sa.Column("slug", sa.String(100), nullable=True))
    op.create_unique_constraint("uq_services_slug", "services", ["slug"])

    op.add_column("masters", sa.Column("slug", sa.String(100), nullable=True))
    op.create_unique_constraint("uq_masters_slug", "masters", ["slug"])


def downgrade() -> None:
    op.drop_constraint("uq_masters_slug", "masters", type_="unique")
    op.drop_column("masters", "slug")
    op.drop_constraint("uq_services_slug", "services", type_="unique")
    op.drop_column("services", "slug")
