# Revision ID: '0003'
# Revises: '0002'
# Create Date: 2026-08-14

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_streaks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_active_date", sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_user_streaks_user_id"),
    )
    op.create_index(op.f("ix_user_streaks_user_id"), "user_streaks", ["user_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_user_streaks_user_id"), table_name="user_streaks")
    op.drop_table("user_streaks")
