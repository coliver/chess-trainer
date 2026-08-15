# Revision ID: '0005'
# Revises: '0004'
# Create Date: 2026-08-15

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    # Grandfather existing users so they aren't locked out by new verification requirement
    op.execute("UPDATE users SET email_verified = true")


def downgrade():
    op.drop_column("users", "email_verified")
