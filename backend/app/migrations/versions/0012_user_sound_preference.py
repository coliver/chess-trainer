# Revision ID: '0012'
# Revises: '0011'
# Create Date: 2026-08-19

import sqlalchemy as sa
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("sound", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade():
    op.drop_column("users", "sound")
