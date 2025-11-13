from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session, require_admin_user
from app.core.config import settings
from app.core.rate_limiter import rate_limit_dependency, user_identifier
from app.schemas.content import (
    BookCategoryCreate,
    BookCategoryPublic,
    BookCategoryUpdate,
    BookCreate,
    BookPublic,
    BookTestCreate,
    BookTestPublic,
    BookTestUpdate,
    BookUpdate,
    ContentBundle,
    CourseCategoryCreate,
    CourseCategoryPublic,
    CourseCategoryUpdate,
    CourseCreate,
    CoursePublic,
    CourseTestCreate,
    CourseTestPublic,
    CourseTestUpdate,
    CourseUpdate,
)
from app.services.content import ContentService

router = APIRouter(tags=["content"])


@router.get("", response_model=ContentBundle, summary="Get published content bundle")
async def get_content_bundle(db: AsyncSession = Depends(get_db_session)) -> ContentBundle:
    service = ContentService(db)
    return await service.get_content()


@router.get("/courses", response_model=list[CoursePublic], summary="List courses")
async def list_courses(db: AsyncSession = Depends(get_db_session)) -> list[CoursePublic]:
    service = ContentService(db)
    return await service.list_courses()


@router.get(
    "/course-categories",
    response_model=list[CourseCategoryPublic],
    summary="List course categories",
)
async def list_course_categories(
    db: AsyncSession = Depends(get_db_session),
) -> list[CourseCategoryPublic]:
    service = ContentService(db)
    return await service.list_course_categories()


@router.get("/books", response_model=list[BookPublic], summary="List books")
async def list_books(db: AsyncSession = Depends(get_db_session)) -> list[BookPublic]:
    service = ContentService(db)
    return await service.list_books()


@router.get(
    "/book-categories",
    response_model=list[BookCategoryPublic],
    summary="List book categories",
)
async def list_book_categories(
    db: AsyncSession = Depends(get_db_session),
) -> list[BookCategoryPublic]:
    service = ContentService(db)
    return await service.list_book_categories()


@router.get(
    "/course-tests",
    response_model=list[CourseTestPublic],
    summary="List course tests",
)
async def list_course_tests(
    db: AsyncSession = Depends(get_db_session),
) -> list[CourseTestPublic]:
    service = ContentService(db)
    return await service.list_course_tests()


@router.get(
    "/book-tests",
    response_model=list[BookTestPublic],
    summary="List book tests",
)
async def list_book_tests(
    db: AsyncSession = Depends(get_db_session),
) -> list[BookTestPublic]:
    service = ContentService(db)
    return await service.list_book_tests()


admin_rate_limit = rate_limit_dependency(
    scope="admin",
    limit=settings.admin_rate_limit_per_minute,
    window_seconds=60,
    identifier=user_identifier,
)

admin_router = APIRouter(
    prefix="/admin",
    tags=["content-admin"],
    dependencies=[Depends(require_admin_user), Depends(admin_rate_limit)],
)


@admin_router.post(
    "/course-categories",
    response_model=CourseCategoryPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create course category",
)
async def create_course_category(
    payload: CourseCategoryCreate,
    db: AsyncSession = Depends(get_db_session),
) -> CourseCategoryPublic:
    service = ContentService(db)
    category = await service.create_course_category(payload)
    await db.commit()
    return category


@admin_router.patch(
    "/course-categories/{category_id}",
    response_model=CourseCategoryPublic,
    summary="Update course category",
)
async def update_course_category(
    category_id: int,
    payload: CourseCategoryUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> CourseCategoryPublic:
    service = ContentService(db)
    try:
        category = await service.update_course_category(category_id, payload)
        await db.commit()
        return category
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@admin_router.delete(
    "/course-categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete course category",
)
async def delete_course_category(
    category_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    service = ContentService(db)
    try:
        await service.delete_course_category(category_id)
        await db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@admin_router.post(
    "/courses",
    response_model=CoursePublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create course",
)
async def create_course(
    payload: CourseCreate,
    db: AsyncSession = Depends(get_db_session),
) -> CoursePublic:
    service = ContentService(db)
    course = await service.create_course(payload)
    await db.commit()
    await db.refresh(course)
    return course


@admin_router.patch(
    "/courses/{course_id}",
    response_model=CoursePublic,
    summary="Update course",
)
async def update_course(
    course_id: int,
    payload: CourseUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> CoursePublic:
    service = ContentService(db)
    try:
        course = await service.update_course(course_id, payload)
        await db.commit()
        await db.refresh(course)
        return course
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@admin_router.delete(
    "/courses/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete course",
)
async def delete_course(
    course_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    service = ContentService(db)
    try:
        await service.delete_course(course_id)
        await db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@admin_router.post(
    "/book-categories",
    response_model=BookCategoryPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create book category",
)
async def create_book_category(
    payload: BookCategoryCreate,
    db: AsyncSession = Depends(get_db_session),
) -> BookCategoryPublic:
    service = ContentService(db)
    category = await service.create_book_category(payload)
    await db.commit()
    return category


@admin_router.patch(
    "/book-categories/{category_id}",
    response_model=BookCategoryPublic,
    summary="Update book category",
)
async def update_book_category(
    category_id: int,
    payload: BookCategoryUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> BookCategoryPublic:
    service = ContentService(db)
    try:
        category = await service.update_book_category(category_id, payload)
        await db.commit()
        return category
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@admin_router.delete(
    "/book-categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete book category",
)
async def delete_book_category(
    category_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    service = ContentService(db)
    try:
        await service.delete_book_category(category_id)
        await db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@admin_router.post(
    "/books",
    response_model=BookPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create book",
)
async def create_book(
    payload: BookCreate,
    db: AsyncSession = Depends(get_db_session),
) -> BookPublic:
    service = ContentService(db)
    book = await service.create_book(payload)
    await db.commit()
    await db.refresh(book)
    return book


@admin_router.patch(
    "/books/{book_id}",
    response_model=BookPublic,
    summary="Update book",
)
async def update_book(
    book_id: int,
    payload: BookUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> BookPublic:
    service = ContentService(db)
    try:
        book = await service.update_book(book_id, payload)
        await db.commit()
        await db.refresh(book)
        return book
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@admin_router.delete(
    "/books/{book_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete book",
)
async def delete_book(
    book_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    service = ContentService(db)
    try:
        await service.delete_book(book_id)
        await db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@admin_router.post(
    "/course-tests",
    response_model=CourseTestPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create course test",
)
async def create_course_test(
    payload: CourseTestCreate,
    db: AsyncSession = Depends(get_db_session),
) -> CourseTestPublic:
    service = ContentService(db)
    test = await service.create_course_test(payload)
    await db.commit()
    await db.refresh(test)
    return test


@admin_router.patch(
    "/course-tests/{test_id}",
    response_model=CourseTestPublic,
    summary="Update course test",
)
async def update_course_test(
    test_id: int,
    payload: CourseTestUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> CourseTestPublic:
    service = ContentService(db)
    try:
        test = await service.update_course_test(test_id, payload)
        await db.commit()
        await db.refresh(test)
        return test
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@admin_router.delete(
    "/course-tests/{test_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete course test",
)
async def delete_course_test(
    test_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    service = ContentService(db)
    try:
        await service.delete_course_test(test_id)
        await db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@admin_router.post(
    "/book-tests",
    response_model=BookTestPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create book test",
)
async def create_book_test(
    payload: BookTestCreate,
    db: AsyncSession = Depends(get_db_session),
) -> BookTestPublic:
    service = ContentService(db)
    test = await service.create_book_test(payload)
    await db.commit()
    await db.refresh(test)
    return test


@admin_router.patch(
    "/book-tests/{test_id}",
    response_model=BookTestPublic,
    summary="Update book test",
)
async def update_book_test(
    test_id: int,
    payload: BookTestUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> BookTestPublic:
    service = ContentService(db)
    try:
        test = await service.update_book_test(test_id, payload)
        await db.commit()
        await db.refresh(test)
        return test
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@admin_router.delete(
    "/book-tests/{test_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete book test",
)
async def delete_book_test(
    test_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    service = ContentService(db)
    try:
        await service.delete_book_test(test_id)
        await db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
