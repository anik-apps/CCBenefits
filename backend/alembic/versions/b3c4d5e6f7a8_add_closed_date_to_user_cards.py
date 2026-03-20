"""add closed_date to user_cards

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-03-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add closed_date column and migrate existing inactive cards."""
    with op.batch_alter_table('user_cards', schema=None) as batch_op:
        batch_op.add_column(sa.Column('closed_date', sa.Date(), nullable=True))

    # Migrate existing inactive cards: use today's date as best approximation
    # (UserCard has no updated_at column, and created_at is the card creation date)
    op.execute(
        "UPDATE user_cards SET closed_date = CURRENT_DATE WHERE NOT is_active"
    )


def downgrade() -> None:
    """Remove closed_date column."""
    with op.batch_alter_table('user_cards', schema=None) as batch_op:
        batch_op.drop_column('closed_date')
