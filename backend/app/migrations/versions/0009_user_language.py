# Revision ID: '0009'
# Revises: '0008'
# Create Date: 2026-08-17

import sqlalchemy as sa
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("language", sa.String(length=20), nullable=False, server_default="en"),
    )


def downgrade():
    op.drop_column("users", "language")
