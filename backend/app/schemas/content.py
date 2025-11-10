from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Sequence

from pydantic import BaseModel, ConfigDict, Field

CourseDifficulty = Literal["easy", "medium", "hard"]


class TimeStampedModel(BaseModel):
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CourseCategoryBase(BaseModel):
    slug: str
    title: str
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    accent: str | None = None
    difficulty: CourseDifficulty = "easy"
    is_active: bool = True


class CourseCategoryCreate(CourseCategoryBase):
    pass


class CourseCategoryUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    accent: str | None = None
    difficulty: CourseDifficulty | None = None
    is_active: bool | None = None


class CourseCategoryPublic(CourseCategoryBase, TimeStampedModel):
    id: int


class CourseBase(BaseModel):
    slug: str
    title: str
    summary: str | None = None
    content: str | None = None
    duration_minutes: int = Field(default=0, ge=0)
    difficulty: CourseDifficulty = "easy"
    image_url: str | None = None
    category_id: int | None = None
    extras: dict[str, Any] | None = None
    is_published: bool = True


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    title: str | None = None
    summary: str | None = None
    content: str | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
    difficulty: CourseDifficulty | None = None
    image_url: str | None = None
    category_id: int | None = None
    extras: dict[str, Any] | None = None
    is_published: bool | None = None


class CoursePublic(CourseBase, TimeStampedModel):
    id: int
    category: CourseCategoryPublic | None = None


class BookCategoryBase(BaseModel):
    slug: str
    label: str
    description: str | None = None
    is_active: bool = True


class BookCategoryCreate(BookCategoryBase):
    pass


class BookCategoryUpdate(BaseModel):
    label: str | None = None
    description: str | None = None
    is_active: bool | None = None


class BookCategoryPublic(BookCategoryBase, TimeStampedModel):
    id: int


class BookBase(BaseModel):
    slug: str
    title: str
    author: str | None = None
    synopsis: str | None = None
    content: str | None = None
    pages: int = Field(default=0, ge=0)
    price: int = Field(default=0, ge=0)
    image_url: str | None = None
    category_id: int | None = None
    extras: dict[str, Any] | None = None
    is_published: bool = True


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    synopsis: str | None = None
    content: str | None = None
    pages: int | None = Field(default=None, ge=0)
    price: int | None = Field(default=None, ge=0)
    image_url: str | None = None
    category_id: int | None = None
    extras: dict[str, Any] | None = None
    is_published: bool | None = None


class BookPublic(BookBase, TimeStampedModel):
    id: int
    category: BookCategoryPublic | None = None


class TestAnswerBase(BaseModel):
    text: str
    is_correct: bool = False
    order: int = 0


class TestAnswerCreate(TestAnswerBase):
    pass


class TestAnswerUpdate(BaseModel):
    text: str | None = None
    is_correct: bool | None = None
    order: int | None = None


class TestAnswerPublic(TestAnswerBase, TimeStampedModel):
    id: int


class TestQuestionBase(BaseModel):
    prompt: str
    explanation: str | None = None
    order: int = 0


class TestQuestionCreate(TestQuestionBase):
    answers: Sequence[TestAnswerCreate]


class TestQuestionUpdate(BaseModel):
    prompt: str | None = None
    explanation: str | None = None
    order: int | None = None
    answers: Sequence[TestAnswerCreate] | None = None


class TestQuestionPublic(TestQuestionBase, TimeStampedModel):
    id: int
    answers: list[TestAnswerPublic]


class CourseTestBase(BaseModel):
    course_id: int
    title: str
    description: str | None = None
    is_published: bool = True


class CourseTestCreate(CourseTestBase):
    questions: Sequence[TestQuestionCreate] = ()


class CourseTestUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_published: bool | None = None
    questions: Sequence[TestQuestionCreate] | None = None


class CourseTestPublic(CourseTestBase, TimeStampedModel):
    id: int
    questions: list[TestQuestionPublic]


class BookTestBase(BaseModel):
    book_id: int
    title: str
    description: str | None = None
    is_published: bool = True


class BookTestCreate(BookTestBase):
    questions: Sequence[TestQuestionCreate] = ()


class BookTestUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_published: bool | None = None
    questions: Sequence[TestQuestionCreate] | None = None


class BookTestPublic(BookTestBase, TimeStampedModel):
    id: int
    questions: list[TestQuestionPublic]


class ContentBundle(BaseModel):
    courses: list[CoursePublic]
    course_categories: list[CourseCategoryPublic]
    books: list[BookPublic]
    book_categories: list[BookCategoryPublic]
    course_tests: list[CourseTestPublic]
    book_tests: list[BookTestPublic]
