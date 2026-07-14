# create openings table

# Revision ID: 'bb6e0bb7fd99'
# Revises: 'a46587a06c20'
# Create Date: 2026-07-14 20:06:54.037858

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'bb6e0bb7fd99'
down_revision = 'a46587a06c20'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "openings",
        sa.Column("eco", sa.String(), nullable=False, primary_key=True),
        sa.Column("name", sa.String(), nullable=False, primary_key=True),
        sa.Column("epd", sa.Text(), nullable=True),
        sa.Column("pgn", sa.Text(), nullable=True),
        sa.Column("uci_moves", sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_table("openings")
