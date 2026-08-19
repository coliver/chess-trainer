# Revision ID: '0011'
# Revises: '0010'
# Create Date: 2026-08-19

import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("theme", sa.String(10), nullable=False, server_default="system"),
    )
    op.add_column(
        "users",
        sa.Column("board_theme", sa.String(30), nullable=False, server_default="default"),
    )
    op.add_column(
        "users",
        sa.Column("piece_set", sa.String(20), nullable=False, server_default="standard"),
    )
    op.add_column(
        "users",
        sa.Column("show_coordinates", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "users",
        sa.Column("board_animations", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "users",
        sa.Column("board_orientation_mode", sa.String(10), nullable=False, server_default="auto"),
    )


def downgrade():
    op.drop_column("users", "board_orientation_mode")
    op.drop_column("users", "board_animations")
    op.drop_column("users", "show_coordinates")
    op.drop_column("users", "piece_set")
    op.drop_column("users", "board_theme")
    op.drop_column("users", "theme")
