# add user_id to training_sessions

# Revision ID: '740659af4925'
# Revises: '7f740a9c4e3a'
# Create Date: 2026-07-16 19:41:39.265726

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '740659af4925'
down_revision = '7f740a9c4e3a'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column(
        "training_sessions",
        sa.Column("user_id", sa.Integer(), nullable=False),
    )

    op.create_foreign_key(
        "training_sessions_user_id_fkey",
        "training_sessions",
        "users",
        ["user_id"],
        ["id"],
    )

    op.create_index(
        "training_sessions_user_id_id_idx",
        "training_sessions",
        ["user_id", "id"],
        unique=False,
    )


def downgrade():
    op.drop_index("training_sessions_user_id_id_idx", table_name="training_sessions")
    op.drop_constraint("training_sessions_user_id_fkey", "training_sessions", type_="foreignkey")
    op.drop_column("training_sessions", "user_id")