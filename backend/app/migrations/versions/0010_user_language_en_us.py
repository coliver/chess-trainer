# Revision ID: '0010'
# Revises: '0009'
# Create Date: 2026-08-19

from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("UPDATE users SET language = 'en-US' WHERE language = 'en'")
    op.alter_column("users", "language", server_default="en-US")


def downgrade():
    op.execute("UPDATE users SET language = 'en' WHERE language = 'en-US'")
    op.alter_column("users", "language", server_default="en")
