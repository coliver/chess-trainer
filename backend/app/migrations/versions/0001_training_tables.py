from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "training_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )

    op.create_table(
        "training_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "session_id",
            sa.Integer(),
            sa.ForeignKey("training_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("fen", sa.String(), nullable=False),
        sa.Column("correct_move_uci", sa.String(), nullable=False),
    )
    op.create_index("ix_training_items_session_id", "training_items", ["session_id"])
    op.create_index("ix_training_items_order_index", "training_items", ["order_index"])

    op.create_table(
        "training_responses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "item_id",
            sa.Integer(),
            sa.ForeignKey("training_items.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("submitted_move_uci", sa.String(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("reason", sa.String(), nullable=False),
        sa.Column("fen_after", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )
    op.create_index("ix_training_responses_item_id", "training_responses", ["item_id"])


def downgrade():
    op.drop_index("ix_training_responses_item_id", table_name="training_responses")
    op.drop_table("training_responses")
    op.drop_index("ix_training_items_order_index", table_name="training_items")
    op.drop_index("ix_training_items_session_id", table_name="training_items")
    op.drop_table("training_items")
    op.drop_table("training_sessions")
