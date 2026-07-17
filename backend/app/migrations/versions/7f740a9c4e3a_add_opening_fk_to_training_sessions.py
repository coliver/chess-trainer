# add opening FK to training_sessions

# Revision ID: '7f740a9c4e3a'
# Revises: 'bb6e0bb7fd99'
# Create Date: 2026-07-15 16:54:16.201133

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "7f740a9c4e3a"
down_revision = "bb6e0bb7fd99"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "training_sessions",
        sa.Column("opening_eco", sa.String(), nullable=True),
    )
    op.add_column(
        "training_sessions",
        sa.Column("opening_name", sa.String(), nullable=True),
    )

    op.create_index(
        "ix_training_sessions_opening_eco_opening_name",
        "training_sessions",
        ["opening_eco", "opening_name"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_training_sessions_openings",
        "training_sessions",
        "openings",
        ["opening_eco", "opening_name"],
        ["eco", "name"],
        ondelete="RESTRICT",
    )


def downgrade():
    op.drop_constraint("fk_training_sessions_openings", "training_sessions", type_="foreignkey")
    op.drop_index("ix_training_sessions_opening_eco_opening_name", table_name="training_sessions")
    op.drop_column("training_sessions", "opening_name")
    op.drop_column("training_sessions", "opening_eco")
