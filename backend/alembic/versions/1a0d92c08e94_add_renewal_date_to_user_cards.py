"""add renewal_date to user_cards

Revision ID: 1a0d92c08e94
Revises: 2dc0bfd9d9fb
Create Date: 2026-03-10 20:51:52.012523

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a0d92c08e94'
down_revision: Union[str, Sequence[str], None] = '2dc0bfd9d9fb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('user_cards', schema=None) as batch_op:
        batch_op.add_column(sa.Column('renewal_date', sa.Date(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('user_cards', schema=None) as batch_op:
        batch_op.drop_column('renewal_date')
