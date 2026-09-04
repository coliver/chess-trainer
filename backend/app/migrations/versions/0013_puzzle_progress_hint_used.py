# Revision ID: '0013'
# Revises: '0012'
# Create Date: 2026-09-04

import sqlalchemy as sa
from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "puzzle_progress",
        sa.Column("hint_used", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade():
    op.drop_column("puzzle_progress", "hint_used")
