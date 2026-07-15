"""Create openings table"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = "bb6e0bb7fd99"
down_revision = "a46587a06c20"
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    """Return True if the given table already exists in the current schema."""
    conn = op.get_bind()
    result = conn.execute(
        text(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = current_schema()
                  AND table_name = :tbl
            )
            """
        ),
        {"tbl": table_name},
    )
    return result.scalar()


def upgrade() -> None:
    if not table_exists("openings"):
        op.create_table(
            "openings",
            sa.Column("eco", sa.VARCHAR(), nullable=False),
            sa.Column("name", sa.VARCHAR(), nullable=False),
            sa.Column("epd", sa.TEXT(), nullable=True),
            sa.Column("pgn", sa.TEXT(), nullable=True),
            sa.Column("uci_moves", sa.TEXT(), nullable=True),
            sa.PrimaryKeyConstraint("eco", "name", name=op.f("pk_openings")),
        )
    else:
        # Table already present – no action required
        pass


def downgrade() -> None:
    # Drop the table only if it exists (mirrors the upgrade guard)
    if table_exists("openings"):
        op.drop_table("openings")
