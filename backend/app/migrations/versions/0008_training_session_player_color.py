# Revision ID: '0008'
# Revises: '0007'
# Create Date: 2026-08-16

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "training_sessions",
        sa.Column("player_color", sa.String(length=1), nullable=False, server_default="w"),
    )


def downgrade():
    op.drop_column("training_sessions", "player_color")
