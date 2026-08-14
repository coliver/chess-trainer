# Revision ID: '0002'
# Revises: '3cc7fe7415fa'
# Create Date: 2026-08-14

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "3cc7fe7415fa"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "position_progress",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("fen", sa.String(), nullable=False),
        sa.Column("correct_move_uci", sa.String(), nullable=False),
        sa.Column("opening_eco", sa.String(), nullable=True),
        sa.Column("opening_name", sa.String(), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("correct_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("incorrect_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ease_factor", sa.Float(), nullable=False, server_default="2.5"),
        sa.Column("interval_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("repetitions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "fen", "correct_move_uci", name="uq_position_progress_user_position"
        ),
    )
    op.create_index(
        op.f("ix_position_progress_user_id"), "position_progress", ["user_id"], unique=False
    )


def downgrade():
    op.drop_index(op.f("ix_position_progress_user_id"), table_name="position_progress")
    op.drop_table("position_progress")
