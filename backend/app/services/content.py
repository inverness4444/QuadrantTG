from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.content import (
    Book,
    BookCategory,
    BookTest,
    BookTestAnswer,
    BookTestQuestion,
    Course,
    CourseCategory,
    CourseTest,
    CourseTestAnswer,
    CourseTestQuestion,
)
from app.schemas.content import (
    BookCategoryCreate,
    BookCategoryUpdate,
    BookCreate,
    BookTestCreate,
    BookTestUpdate,
    BookUpdate,
    ContentBundle,
    CourseCategoryCreate,
    CourseCategoryUpdate,
    CourseCreate,
    CourseTestCreate,
    CourseTestUpdate,
    CourseUpdate,
    TestQuestionCreate,
)


class ContentService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_content(self) -> ContentBundle:
        courses = await self._list_courses(include_tests=False)
        books = await self._list_books(include_tests=False)

        categories_result = await self.session.execute(
            select(CourseCategory).order_by(CourseCategory.title)
        )
        course_categories = categories_result.scalars().all()

        book_categories_result = await self.session.execute(
            select(BookCategory).order_by(BookCategory.label)
        )
        book_categories = book_categories_result.scalars().all()

        course_tests = await self._list_course_tests(include_relations=True)
        book_tests = await self._list_book_tests(include_relations=True)

        return ContentBundle(
            courses=courses,
            course_categories=course_categories,
            books=books,
            book_categories=book_categories,
            course_tests=course_tests,
            book_tests=book_tests,
        )

    async def list_course_categories(self) -> list[CourseCategory]:
        result = await self.session.execute(
            select(CourseCategory).order_by(CourseCategory.title)
        )
        return result.scalars().all()

    async def create_course_category(self, payload: CourseCategoryCreate) -> CourseCategory:
        category = CourseCategory(**payload.model_dump())
        self.session.add(category)
        await self.session.flush()
        return category

    async def update_course_category(
        self, category_id: int, payload: CourseCategoryUpdate
    ) -> CourseCategory:
        category = await self.session.get(CourseCategory, category_id)
        if not category:
            raise ValueError("course_category_not_found")
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(category, key, value)
        await self.session.flush()
        return category

    async def delete_course_category(self, category_id: int) -> None:
        category = await self.session.get(CourseCategory, category_id)
        if not category:
            raise ValueError("course_category_not_found")
        await self.session.delete(category)
        await self.session.flush()

    async def list_courses(self) -> list[Course]:
        return await self._list_courses(include_tests=True)

    async def _list_courses(self, include_tests: bool) -> list[Course]:
        query = select(Course).options(selectinload(Course.category)).order_by(Course.title)
        if include_tests:
            query = query.options(selectinload(Course.tests))
        result = await self.session.execute(query)
        return result.scalars().unique().all()

    async def create_course(self, payload: CourseCreate) -> Course:
        course = Course(**payload.model_dump())
        self.session.add(course)
        await self.session.flush()
        return course

    async def update_course(self, course_id: int, payload: CourseUpdate) -> Course:
        course = await self.session.get(Course, course_id)
        if not course:
            raise ValueError("course_not_found")
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(course, key, value)
        await self.session.flush()
        return course

    async def delete_course(self, course_id: int) -> None:
        course = await self.session.get(Course, course_id)
        if not course:
            raise ValueError("course_not_found")
        await self.session.delete(course)
        await self.session.flush()

    async def list_book_categories(self) -> list[BookCategory]:
        result = await self.session.execute(select(BookCategory).order_by(BookCategory.label))
        return result.scalars().all()

    async def create_book_category(self, payload: BookCategoryCreate) -> BookCategory:
        category = BookCategory(**payload.model_dump())
        self.session.add(category)
        await self.session.flush()
        return category

    async def update_book_category(
        self, category_id: int, payload: BookCategoryUpdate
    ) -> BookCategory:
        category = await self.session.get(BookCategory, category_id)
        if not category:
            raise ValueError("book_category_not_found")
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(category, key, value)
        await self.session.flush()
        return category

    async def delete_book_category(self, category_id: int) -> None:
        category = await self.session.get(BookCategory, category_id)
        if not category:
            raise ValueError("book_category_not_found")
        await self.session.delete(category)
        await self.session.flush()

    async def list_books(self) -> list[Book]:
        return await self._list_books(include_tests=True)

    async def _list_books(self, include_tests: bool) -> list[Book]:
        query = select(Book).options(selectinload(Book.category)).order_by(Book.title)
        if include_tests:
            query = query.options(selectinload(Book.tests))
        result = await self.session.execute(query)
        return result.scalars().unique().all()

    async def create_book(self, payload: BookCreate) -> Book:
        book = Book(**payload.model_dump())
        self.session.add(book)
        await self.session.flush()
        return book

    async def update_book(self, book_id: int, payload: BookUpdate) -> Book:
        book = await self.session.get(Book, book_id)
        if not book:
            raise ValueError("book_not_found")
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(book, key, value)
        await self.session.flush()
        return book

    async def delete_book(self, book_id: int) -> None:
        book = await self.session.get(Book, book_id)
        if not book:
            raise ValueError("book_not_found")
        await self.session.delete(book)
        await self.session.flush()

    async def list_course_tests(self) -> list[CourseTest]:
        return await self._list_course_tests(include_relations=True)

    async def _list_course_tests(self, include_relations: bool) -> list[CourseTest]:
        query = select(CourseTest).order_by(CourseTest.title)
        if include_relations:
            query = query.options(
                selectinload(CourseTest.questions)
                .selectinload(CourseTestQuestion.answers)
            )
        result = await self.session.execute(query)
        return result.scalars().unique().all()

    async def create_course_test(self, payload: CourseTestCreate) -> CourseTest:
        test = CourseTest(
            course_id=payload.course_id,
            title=payload.title,
            description=payload.description,
            is_published=payload.is_published,
        )
        self._apply_questions(test, payload.questions)
        self.session.add(test)
        await self.session.flush()
        return test

    async def update_course_test(
        self, test_id: int, payload: CourseTestUpdate
    ) -> CourseTest:
        test = await self.session.get(
            CourseTest,
            test_id,
            options=[
                selectinload(CourseTest.questions).selectinload(CourseTestQuestion.answers)
            ],
        )
        if not test:
            raise ValueError("course_test_not_found")
        data = payload.model_dump(exclude_unset=True)
        if "title" in data:
            test.title = data["title"]
        if "description" in data:
            test.description = data["description"]
        if "is_published" in data:
            test.is_published = data["is_published"]
        if "questions" in data and data["questions"] is not None:
            test.questions.clear()
            await self.session.flush()
            self._apply_questions(test, data["questions"])
        await self.session.flush()
        return test

    async def delete_course_test(self, test_id: int) -> None:
        test = await self.session.get(CourseTest, test_id)
        if not test:
            raise ValueError("course_test_not_found")
        await self.session.delete(test)
        await self.session.flush()

    async def list_book_tests(self) -> list[BookTest]:
        return await self._list_book_tests(include_relations=True)

    async def _list_book_tests(self, include_relations: bool) -> list[BookTest]:
        query = select(BookTest).order_by(BookTest.title)
        if include_relations:
            query = query.options(
                selectinload(BookTest.questions).selectinload(BookTestQuestion.answers)
            )
        result = await self.session.execute(query)
        return result.scalars().unique().all()

    async def create_book_test(self, payload: BookTestCreate) -> BookTest:
        test = BookTest(
            book_id=payload.book_id,
            title=payload.title,
            description=payload.description,
            is_published=payload.is_published,
        )
        self._apply_book_questions(test, payload.questions)
        self.session.add(test)
        await self.session.flush()
        return test

    async def update_book_test(self, test_id: int, payload: BookTestUpdate) -> BookTest:
        test = await self.session.get(
            BookTest,
            test_id,
            options=[
                selectinload(BookTest.questions).selectinload(BookTestQuestion.answers)
            ],
        )
        if not test:
            raise ValueError("book_test_not_found")
        data = payload.model_dump(exclude_unset=True)
        if "title" in data:
            test.title = data["title"]
        if "description" in data:
            test.description = data["description"]
        if "is_published" in data:
            test.is_published = data["is_published"]
        if "questions" in data and data["questions"] is not None:
            test.questions.clear()
            await self.session.flush()
            self._apply_book_questions(test, data["questions"])
        await self.session.flush()
        return test

    async def delete_book_test(self, test_id: int) -> None:
        test = await self.session.get(BookTest, test_id)
        if not test:
            raise ValueError("book_test_not_found")
        await self.session.delete(test)
        await self.session.flush()

    def _apply_questions(
        self, test: CourseTest, questions: list[TestQuestionCreate] | tuple[TestQuestionCreate, ...]
    ) -> None:
        for index, question_data in enumerate(questions):
            question = CourseTestQuestion(
                prompt=question_data.prompt,
                explanation=question_data.explanation,
                order=question_data.order if question_data.order is not None else index,
            )
            for answer_index, answer_data in enumerate(question_data.answers):
                answer = CourseTestAnswer(
                    text=answer_data.text,
                    is_correct=answer_data.is_correct,
                    order=answer_data.order if answer_data.order is not None else answer_index,
                )
                question.answers.append(answer)
            test.questions.append(question)

    def _apply_book_questions(
        self,
        test: BookTest,
        questions: list[TestQuestionCreate] | tuple[TestQuestionCreate, ...],
    ) -> None:
        for index, question_data in enumerate(questions):
            question = BookTestQuestion(
                prompt=question_data.prompt,
                explanation=question_data.explanation,
                order=question_data.order if question_data.order is not None else index,
            )
            for answer_index, answer_data in enumerate(question_data.answers):
                answer = BookTestAnswer(
                    text=answer_data.text,
                    is_correct=answer_data.is_correct,
                    order=answer_data.order if answer_data.order is not None else answer_index,
                )
                question.answers.append(answer)
            test.questions.append(question)
