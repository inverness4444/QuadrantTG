"""add app usage tracking to users

Revision ID: 202405270001
Revises: f8c2eab13b5f
Create Date: 2024-05-27 00:01:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202405270001'
down_revision = 'f8c2eab13b5f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('app_seconds_spent', sa.BigInteger(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    op.drop_column('users', 'app_seconds_spent')
