"""add content and admin fields

Revision ID: f8c2eab13b5f
Revises: 7a3936cc781c
Create Date: 2024-09-14 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'f8c2eab13b5f'
down_revision = '7a3936cc781c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('is_admin', sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.alter_column('users', 'is_admin', server_default=None)

    course_difficulty_enum = postgresql.ENUM(
        'easy', 'medium', 'hard', name='course_difficulty_enum'
    )
    course_difficulty_enum.create(op.get_bind(), checkfirst=True)
    course_difficulty_enum = postgresql.ENUM(
        'easy', 'medium', 'hard', name='course_difficulty_enum', create_type=False
    )

    op.create_table(
        'course_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=64), nullable=False),
        sa.Column('title', sa.String(length=160), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(length=64), nullable=True),
        sa.Column('color', sa.String(length=16), nullable=True),
        sa.Column('accent', sa.String(length=16), nullable=True),
        sa.Column('difficulty', course_difficulty_enum, nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug', name='uq_course_categories_slug'),
    )
    op.create_index(
        op.f('ix_course_categories_id'), 'course_categories', ['id'], unique=False
    )
    op.create_index(
        op.f('ix_course_categories_slug'), 'course_categories', ['slug'], unique=False
    )

    op.create_table(
        'book_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=64), nullable=False),
        sa.Column('label', sa.String(length=160), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug', name='uq_book_categories_slug'),
    )
    op.create_index(
        op.f('ix_book_categories_id'), 'book_categories', ['id'], unique=False
    )
    op.create_index(
        op.f('ix_book_categories_slug'), 'book_categories', ['slug'], unique=False
    )

    op.create_table(
        'courses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=80), nullable=False),
        sa.Column('title', sa.String(length=180), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('difficulty', course_difficulty_enum, nullable=False),
        sa.Column('image_url', sa.String(length=255), nullable=True),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('extras', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['category_id'], ['course_categories.id'], ondelete='SET NULL'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug', name='uq_courses_slug'),
    )
    op.create_index(op.f('ix_courses_id'), 'courses', ['id'], unique=False)
    op.create_index(op.f('ix_courses_slug'), 'courses', ['slug'], unique=False)
    op.create_index(
        op.f('ix_courses_category_id'), 'courses', ['category_id'], unique=False
    )

    op.create_table(
        'books',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=80), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('author', sa.String(length=160), nullable=True),
        sa.Column('synopsis', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('pages', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('price', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('image_url', sa.String(length=255), nullable=True),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('extras', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['category_id'], ['book_categories.id'], ondelete='SET NULL'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug', name='uq_books_slug'),
    )
    op.create_index(op.f('ix_books_id'), 'books', ['id'], unique=False)
    op.create_index(op.f('ix_books_slug'), 'books', ['slug'], unique=False)
    op.create_index(
        op.f('ix_books_category_id'), 'books', ['category_id'], unique=False
    )

    op.create_table(
        'course_tests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_course_tests_id'), 'course_tests', ['id'], unique=False)
    op.create_index(
        op.f('ix_course_tests_course_id'), 'course_tests', ['course_id'], unique=False
    )

    op.create_table(
        'book_tests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('book_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['book_id'], ['books.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_book_tests_id'), 'book_tests', ['id'], unique=False)
    op.create_index(
        op.f('ix_book_tests_book_id'), 'book_tests', ['book_id'], unique=False
    )

    op.create_table(
        'course_test_questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('test_id', sa.Integer(), nullable=False),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['test_id'], ['course_tests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_course_test_questions_id'),
        'course_test_questions',
        ['id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_course_test_questions_test_id'),
        'course_test_questions',
        ['test_id'],
        unique=False,
    )

    op.create_table(
        'book_test_questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('test_id', sa.Integer(), nullable=False),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['test_id'], ['book_tests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_book_test_questions_id'),
        'book_test_questions',
        ['id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_book_test_questions_test_id'),
        'book_test_questions',
        ['test_id'],
        unique=False,
    )

    op.create_table(
        'course_test_answers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['question_id'], ['course_test_questions.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_course_test_answers_id'),
        'course_test_answers',
        ['id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_course_test_answers_question_id'),
        'course_test_answers',
        ['question_id'],
        unique=False,
    )

    op.create_table(
        'book_test_answers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['question_id'], ['book_test_questions.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_book_test_answers_id'), 'book_test_answers', ['id'], unique=False
    )
    op.create_index(
        op.f('ix_book_test_answers_question_id'),
        'book_test_answers',
        ['question_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_book_test_answers_question_id'), table_name='book_test_answers')
    op.drop_index(op.f('ix_book_test_answers_id'), table_name='book_test_answers')
    op.drop_table('book_test_answers')

    op.drop_index(op.f('ix_course_test_answers_question_id'), table_name='course_test_answers')
    op.drop_index(op.f('ix_course_test_answers_id'), table_name='course_test_answers')
    op.drop_table('course_test_answers')

    op.drop_index(op.f('ix_book_test_questions_test_id'), table_name='book_test_questions')
    op.drop_index(op.f('ix_book_test_questions_id'), table_name='book_test_questions')
    op.drop_table('book_test_questions')

    op.drop_index(
        op.f('ix_course_test_questions_test_id'), table_name='course_test_questions'
    )
    op.drop_index(op.f('ix_course_test_questions_id'), table_name='course_test_questions')
    op.drop_table('course_test_questions')

    op.drop_index(op.f('ix_book_tests_book_id'), table_name='book_tests')
    op.drop_index(op.f('ix_book_tests_id'), table_name='book_tests')
    op.drop_table('book_tests')

    op.drop_index(op.f('ix_course_tests_course_id'), table_name='course_tests')
    op.drop_index(op.f('ix_course_tests_id'), table_name='course_tests')
    op.drop_table('course_tests')

    op.drop_index(op.f('ix_books_category_id'), table_name='books')
    op.drop_index(op.f('ix_books_slug'), table_name='books')
    op.drop_index(op.f('ix_books_id'), table_name='books')
    op.drop_table('books')

    op.drop_index(op.f('ix_courses_category_id'), table_name='courses')
    op.drop_index(op.f('ix_courses_slug'), table_name='courses')
    op.drop_index(op.f('ix_courses_id'), table_name='courses')
    op.drop_table('courses')

    op.drop_index(op.f('ix_book_categories_slug'), table_name='book_categories')
    op.drop_index(op.f('ix_book_categories_id'), table_name='book_categories')
    op.drop_table('book_categories')

    op.drop_index(op.f('ix_course_categories_slug'), table_name='course_categories')
    op.drop_index(op.f('ix_course_categories_id'), table_name='course_categories')
    op.drop_table('course_categories')

    op.drop_column('users', 'is_admin')

    course_difficulty_enum = sa.Enum(
        'easy', 'medium', 'hard', name='course_difficulty_enum'
    )
    course_difficulty_enum.drop(op.get_bind(), checkfirst=True)
