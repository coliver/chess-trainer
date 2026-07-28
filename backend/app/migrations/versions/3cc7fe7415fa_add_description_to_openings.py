# Add description to openings

# Revision ID: '3cc7fe7415fa'
# Revises: '740659af4925'
# Create Date: 2026-07-27 17:08:18.213037

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "3cc7fe7415fa"
down_revision = "740659af4925"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("openings", sa.Column("description", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("openings", "description")
