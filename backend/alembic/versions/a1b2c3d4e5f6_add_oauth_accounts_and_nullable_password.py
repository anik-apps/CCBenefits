"""Add OAuth accounts table and nullable password

Revision ID: a1b2c3d4e5f6
Revises: 0f594cb77e8d
Create Date: 2026-03-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "0f594cb77e8d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create user_oauth_accounts table
    op.create_table(
        "user_oauth_accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("provider_user_id", sa.String(), nullable=False),
        sa.Column("provider_email", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "provider_user_id", name="uq_provider_user"),
    )
    op.create_index("ix_user_oauth_accounts_user_id", "user_oauth_accounts", ["user_id"])

    # Make hashed_password nullable (SQLite needs batch mode)
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("hashed_password", existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("hashed_password", existing_type=sa.String(), nullable=False)
    op.drop_index("ix_user_oauth_accounts_user_id", table_name="user_oauth_accounts")
    op.drop_table("user_oauth_accounts")
