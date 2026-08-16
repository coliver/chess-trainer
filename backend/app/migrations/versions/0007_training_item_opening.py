# Revision ID: '0007'
# Revises: '0006'
# Create Date: 2026-08-15

import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("training_items", sa.Column("opening_eco", sa.String(), nullable=True))
    op.add_column("training_items", sa.Column("opening_name", sa.String(), nullable=True))


def downgrade():
    op.drop_column("training_items", "opening_name")
    op.drop_column("training_items", "opening_eco")
