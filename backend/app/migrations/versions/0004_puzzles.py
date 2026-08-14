# Revision ID: '0004'
# Revises: '0003'
# Create Date: 2026-08-14

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "puzzles",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("fen", sa.String(), nullable=False),
        sa.Column("moves", sa.String(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("popularity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("nb_plays", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("themes", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "puzzle_progress",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("puzzle_id", sa.String(), nullable=False),
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
        sa.ForeignKeyConstraint(["puzzle_id"], ["puzzles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "puzzle_id", name="uq_puzzle_progress_user_puzzle"),
    )
    op.create_index(
        op.f("ix_puzzle_progress_user_id"), "puzzle_progress", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_puzzle_progress_puzzle_id"), "puzzle_progress", ["puzzle_id"], unique=False
    )


def downgrade():
    op.drop_index(op.f("ix_puzzle_progress_puzzle_id"), table_name="puzzle_progress")
    op.drop_index(op.f("ix_puzzle_progress_user_id"), table_name="puzzle_progress")
    op.drop_table("puzzle_progress")
    op.drop_table("puzzles")
