from __future__ import annotations

from enum import Enum
from typing import Any

from sqlalchemy import (
    Boolean,
    Enum as SqlEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CourseDifficultyEnum(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class CourseCategory(Base, TimestampMixin):
    __tablename__ = "course_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(length=64), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(length=160))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(length=64), nullable=True)
    color: Mapped[str | None] = mapped_column(String(length=16), nullable=True)
    accent: Mapped[str | None] = mapped_column(String(length=16), nullable=True)
    difficulty: Mapped[CourseDifficultyEnum] = mapped_column(
        SqlEnum(CourseDifficultyEnum, name="course_difficulty_enum"),
        default=CourseDifficultyEnum.EASY,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    courses: Mapped[list["Course"]] = relationship(
        "Course", back_populates="category"
    )


class Course(Base, TimestampMixin):
    __tablename__ = "courses"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_courses_slug"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(length=80), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(length=180))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0)
    difficulty: Mapped[CourseDifficultyEnum] = mapped_column(
        SqlEnum(
            CourseDifficultyEnum,
            name="course_difficulty_enum",
            create_constraint=False,
        ),
        default=CourseDifficultyEnum.EASY,
    )
    image_url: Mapped[str | None] = mapped_column(String(length=255), nullable=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("course_categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    extras: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)

    category: Mapped[CourseCategory | None] = relationship(
        "CourseCategory", back_populates="courses"
    )
    tests: Mapped[list["CourseTest"]] = relationship(
        "CourseTest", back_populates="course", cascade="all, delete-orphan"
    )


class BookCategory(Base, TimestampMixin):
    __tablename__ = "book_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(length=64), unique=True, index=True)
    label: Mapped[str] = mapped_column(String(length=160))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    books: Mapped[list["Book"]] = relationship(
        "Book", back_populates="category"
    )


class Book(Base, TimestampMixin):
    __tablename__ = "books"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_books_slug"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(length=80), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(length=200))
    author: Mapped[str | None] = mapped_column(String(length=160), nullable=True)
    synopsis: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    pages: Mapped[int] = mapped_column(Integer, default=0)
    price: Mapped[int] = mapped_column(Integer, default=0)
    image_url: Mapped[str | None] = mapped_column(String(length=255), nullable=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("book_categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    extras: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)

    category: Mapped[BookCategory | None] = relationship(
        "BookCategory", back_populates="books"
    )
    tests: Mapped[list["BookTest"]] = relationship(
        "BookTest", back_populates="book", cascade="all, delete-orphan"
    )


class CourseTest(Base, TimestampMixin):
    __tablename__ = "course_tests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(length=200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)

    course: Mapped["Course"] = relationship("Course", back_populates="tests")
    questions: Mapped[list["CourseTestQuestion"]] = relationship(
        "CourseTestQuestion",
        back_populates="test",
        cascade="all, delete-orphan",
        order_by="CourseTestQuestion.order",
    )


class CourseTestQuestion(Base, TimestampMixin):
    __tablename__ = "course_test_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    test_id: Mapped[int] = mapped_column(
        ForeignKey("course_tests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prompt: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0)

    test: Mapped["CourseTest"] = relationship("CourseTest", back_populates="questions")
    answers: Mapped[list["CourseTestAnswer"]] = relationship(
        "CourseTestAnswer",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="CourseTestAnswer.order",
    )


class CourseTestAnswer(Base, TimestampMixin):
    __tablename__ = "course_test_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("course_test_questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    text: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["CourseTestQuestion"] = relationship(
        "CourseTestQuestion", back_populates="answers"
    )


class BookTest(Base, TimestampMixin):
    __tablename__ = "book_tests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    book_id: Mapped[int] = mapped_column(
        ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(length=200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)

    book: Mapped["Book"] = relationship("Book", back_populates="tests")
    questions: Mapped[list["BookTestQuestion"]] = relationship(
        "BookTestQuestion",
        back_populates="test",
        cascade="all, delete-orphan",
        order_by="BookTestQuestion.order",
    )


class BookTestQuestion(Base, TimestampMixin):
    __tablename__ = "book_test_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    test_id: Mapped[int] = mapped_column(
        ForeignKey("book_tests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    prompt: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0)

    test: Mapped["BookTest"] = relationship("BookTest", back_populates="questions")
    answers: Mapped[list["BookTestAnswer"]] = relationship(
        "BookTestAnswer",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="BookTestAnswer.order",
    )


class BookTestAnswer(Base, TimestampMixin):
    __tablename__ = "book_test_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("book_test_questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    text: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["BookTestQuestion"] = relationship(
        "BookTestQuestion", back_populates="answers"
    )
