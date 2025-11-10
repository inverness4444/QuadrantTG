import { apiFetch } from "./api";
import type {
  Book,
  BookCategory,
  BookTest,
  Course,
  CourseCategory,
  CourseDifficulty,
  CourseTest,
  TestQuestion,
  TestAnswer,
  ContentBundle
} from "../types/content";

// --- API response types ----------------------------------------------------

type CourseCategoryResponse = {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  accent?: string | null;
  difficulty: CourseDifficulty;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CourseResponse = {
  id: number;
  slug: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  duration_minutes: number;
  difficulty: CourseDifficulty;
  image_url?: string | null;
  category_id?: number | null;
  extras?: Record<string, unknown> | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  category?: CourseCategoryResponse | null;
};

type BookCategoryResponse = {
  id: number;
  slug: string;
  label: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type BookResponse = {
  id: number;
  slug: string;
  title: string;
  author?: string | null;
  synopsis?: string | null;
  content?: string | null;
  pages: number;
  price: number;
  image_url?: string | null;
  category_id?: number | null;
  extras?: Record<string, unknown> | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  category?: BookCategoryResponse | null;
};

type TestAnswerResponse = {
  id: number;
  question_id: number;
  text: string;
  is_correct: boolean;
  order: number;
  created_at: string;
  updated_at: string;
};

type TestQuestionResponse = {
  id: number;
  test_id: number;
  prompt: string;
  explanation?: string | null;
  order: number;
  created_at: string;
  updated_at: string;
  answers: TestAnswerResponse[];
};

type CourseTestResponse = {
  id: number;
  course_id: number;
  title: string;
  description?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  questions: TestQuestionResponse[];
};

type BookTestResponse = {
  id: number;
  book_id: number;
  title: string;
  description?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  questions: TestQuestionResponse[];
};

type ContentBundleResponse = {
  courses: CourseResponse[];
  course_categories: CourseCategoryResponse[];
  books: BookResponse[];
  book_categories: BookCategoryResponse[];
  course_tests: CourseTestResponse[];
  book_tests: BookTestResponse[];
};

// --- API payload types -----------------------------------------------------

export type CourseCategoryInput = {
  slug: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  accent?: string;
  difficulty?: CourseDifficulty;
  isActive?: boolean;
};

export type CourseInput = {
  slug: string;
  title: string;
  summary?: string;
  content?: string;
  durationMinutes?: number;
  difficulty?: CourseDifficulty;
  imageUrl?: string;
  categoryDbId?: number | null;
  extras?: Record<string, unknown> | null;
  isPublished?: boolean;
};

export type BookCategoryInput = {
  slug: string;
  label: string;
  description?: string;
  isActive?: boolean;
};

export type BookInput = {
  slug: string;
  title: string;
  author?: string;
  synopsis?: string;
  content?: string;
  pages?: number;
  price?: number;
  imageUrl?: string;
  categoryDbId?: number | null;
  extras?: Record<string, unknown> | null;
  isPublished?: boolean;
};

export type TestAnswerInput = {
  text: string;
  isCorrect?: boolean;
  order?: number;
};

export type TestQuestionInput = {
  prompt: string;
  explanation?: string;
  order?: number;
  answers: TestAnswerInput[];
};

export type CourseTestInput = {
  courseId: number;
  title: string;
  description?: string;
  isPublished?: boolean;
  questions?: TestQuestionInput[];
};

export type BookTestInput = {
  bookId: number;
  title: string;
  description?: string;
  isPublished?: boolean;
  questions?: TestQuestionInput[];
};

// --- Mapping helpers -------------------------------------------------------

const mapCourseCategory = (category: CourseCategoryResponse): CourseCategory => ({
  id: category.slug,
  dbId: category.id,
  slug: category.slug,
  title: category.title,
  description: category.description ?? undefined,
  icon: category.icon ?? undefined,
  color: category.color ?? undefined,
  accent: category.accent ?? undefined,
  difficulty: category.difficulty,
  isActive: category.is_active,
  createdAt: category.created_at,
  updatedAt: category.updated_at
});

const mapCourse = (course: CourseResponse): Course => ({
  id: course.slug,
  dbId: course.id,
  slug: course.slug,
  title: course.title,
  summary: course.summary ?? undefined,
  content: course.content ?? undefined,
  durationMinutes: course.duration_minutes ?? 0,
  difficulty: course.difficulty,
  imageUrl: course.image_url ?? undefined,
  categorySlug: course.category?.slug ?? null,
  categoryDbId: course.category_id ?? null,
  category: course.category ? mapCourseCategory(course.category) : null,
  extras: course.extras ?? null,
  isPublished: course.is_published,
  createdAt: course.created_at,
  updatedAt: course.updated_at
});

const mapBookCategory = (category: BookCategoryResponse): BookCategory => ({
  id: category.slug,
  dbId: category.id,
  slug: category.slug,
  label: category.label,
  description: category.description ?? undefined,
  isActive: category.is_active,
  createdAt: category.created_at,
  updatedAt: category.updated_at
});

const mapBook = (book: BookResponse): Book => ({
  id: book.slug,
  dbId: book.id,
  slug: book.slug,
  title: book.title,
  author: book.author ?? undefined,
  synopsis: book.synopsis ?? undefined,
  content: book.content ?? undefined,
  pages: book.pages ?? 0,
  price: book.price ?? 0,
  imageUrl: book.image_url ?? undefined,
  categorySlug: book.category?.slug ?? null,
  categoryDbId: book.category_id ?? null,
  category: book.category ? mapBookCategory(book.category) : null,
  extras: book.extras ?? null,
  isPublished: book.is_published,
  createdAt: book.created_at,
  updatedAt: book.updated_at
});

const mapTestAnswer = (answer: TestAnswerResponse): TestAnswer => ({
  id: answer.id,
  questionId: answer.question_id,
  text: answer.text,
  isCorrect: answer.is_correct,
  order: answer.order,
  createdAt: answer.created_at,
  updatedAt: answer.updated_at
});

const mapTestQuestion = (question: TestQuestionResponse): TestQuestion => ({
  id: question.id,
  testId: question.test_id,
  prompt: question.prompt,
  explanation: question.explanation ?? undefined,
  order: question.order,
  createdAt: question.created_at,
  updatedAt: question.updated_at,
  answers: question.answers.map(mapTestAnswer)
});

const mapCourseTest = (test: CourseTestResponse): CourseTest => ({
  id: test.id,
  courseId: test.course_id,
  title: test.title,
  description: test.description ?? undefined,
  isPublished: test.is_published,
  createdAt: test.created_at,
  updatedAt: test.updated_at,
  questions: test.questions.map(mapTestQuestion)
});

const mapBookTest = (test: BookTestResponse): BookTest => ({
  id: test.id,
  bookId: test.book_id,
  title: test.title,
  description: test.description ?? undefined,
  isPublished: test.is_published,
  createdAt: test.created_at,
  updatedAt: test.updated_at,
  questions: test.questions.map(mapTestQuestion)
});

// --- Serialization helpers -------------------------------------------------

const buildAdminHeaders = (telegramInitData?: string) => {
  if (!telegramInitData) {
    throw new Error("telegram_auth_required");
  }
  return {
    "X-Telegram-Init-Data": telegramInitData
  } as const;
};

type PrimitiveRecord = Record<string, unknown>;

const omitUndefined = (payload: PrimitiveRecord) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

const encodeCourseCategory = (input: CourseCategoryInput) =>
  omitUndefined({
    slug: input.slug,
    title: input.title,
    description: input.description,
    icon: input.icon,
    color: input.color,
    accent: input.accent,
    difficulty: input.difficulty,
    is_active: input.isActive
  });

const encodeCourse = (input: CourseInput) =>
  omitUndefined({
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    content: input.content,
    duration_minutes: input.durationMinutes,
    difficulty: input.difficulty,
    image_url: input.imageUrl,
    category_id: input.categoryDbId,
    extras: input.extras,
    is_published: input.isPublished
  });

const encodeBookCategory = (input: BookCategoryInput) =>
  omitUndefined({
    slug: input.slug,
    label: input.label,
    description: input.description,
    is_active: input.isActive
  });

const encodeBook = (input: BookInput) =>
  omitUndefined({
    slug: input.slug,
    title: input.title,
    author: input.author,
    synopsis: input.synopsis,
    content: input.content,
    pages: input.pages,
    price: input.price,
    image_url: input.imageUrl,
    category_id: input.categoryDbId,
    extras: input.extras,
    is_published: input.isPublished
  });

const encodeTestQuestion = (question: TestQuestionInput) => ({
  prompt: question.prompt,
  explanation: question.explanation,
  order: question.order,
  answers: question.answers.map((answer, index) => ({
    text: answer.text,
    is_correct: answer.isCorrect ?? false,
    order: answer.order ?? index
  }))
});

const encodeCourseTest = (input: CourseTestInput) =>
  omitUndefined({
    course_id: input.courseId,
    title: input.title,
    description: input.description,
    is_published: input.isPublished,
    questions: input.questions?.map(encodeTestQuestion)
  });

const encodeBookTest = (input: BookTestInput) =>
  omitUndefined({
    book_id: input.bookId,
    title: input.title,
    description: input.description,
    is_published: input.isPublished,
    questions: input.questions?.map(encodeTestQuestion)
  });

// --- Public API ------------------------------------------------------------

export const contentApi = {
  async fetchBundle(): Promise<ContentBundle> {
    const response = await apiFetch<ContentBundleResponse>("/api/v1/content");
    return {
      courses: response.courses.map(mapCourse),
      courseCategories: response.course_categories.map(mapCourseCategory),
      books: response.books.map(mapBook),
      bookCategories: response.book_categories.map(mapBookCategory),
      courseTests: response.course_tests.map(mapCourseTest),
      bookTests: response.book_tests.map(mapBookTest)
    };
  },
  async createCourseCategory(input: CourseCategoryInput, telegramInitData?: string) {
    const category = await apiFetch<CourseCategoryResponse>(
      "/api/v1/content/admin/course-categories",
      {
        method: "POST",
        body: JSON.stringify(encodeCourseCategory(input)),
        headers: buildAdminHeaders(telegramInitData)
      }
    );
    return mapCourseCategory(category);
  },
  async updateCourseCategory(
    categoryDbId: number,
    input: CourseCategoryInput,
    telegramInitData?: string
  ) {
    const category = await apiFetch<CourseCategoryResponse>(
      `/api/v1/content/admin/course-categories/${categoryDbId}`,
      {
        method: "PATCH",
        body: JSON.stringify(encodeCourseCategory(input)),
        headers: buildAdminHeaders(telegramInitData)
      }
    );
    return mapCourseCategory(category);
  },
  async deleteCourseCategory(categoryDbId: number, telegramInitData?: string) {
    await apiFetch<void>(`/api/v1/content/admin/course-categories/${categoryDbId}`, {
      method: "DELETE",
      headers: buildAdminHeaders(telegramInitData)
    });
  },
  async createCourse(input: CourseInput, telegramInitData?: string) {
    const course = await apiFetch<CourseResponse>("/api/v1/content/admin/courses", {
      method: "POST",
      body: JSON.stringify(encodeCourse(input)),
      headers: buildAdminHeaders(telegramInitData)
    });
    return mapCourse(course);
  },
  async updateCourse(courseDbId: number, input: CourseInput, telegramInitData?: string) {
    const course = await apiFetch<CourseResponse>(
      `/api/v1/content/admin/courses/${courseDbId}`,
      {
        method: "PATCH",
        body: JSON.stringify(encodeCourse(input)),
        headers: buildAdminHeaders(telegramInitData)
      }
    );
    return mapCourse(course);
  },
  async deleteCourse(courseDbId: number, telegramInitData?: string) {
    await apiFetch<void>(`/api/v1/content/admin/courses/${courseDbId}`, {
      method: "DELETE",
      headers: buildAdminHeaders(telegramInitData)
    });
  },
  async createBookCategory(input: BookCategoryInput, telegramInitData?: string) {
    const category = await apiFetch<BookCategoryResponse>(
      "/api/v1/content/admin/book-categories",
      {
        method: "POST",
        body: JSON.stringify(encodeBookCategory(input)),
        headers: buildAdminHeaders(telegramInitData)
      }
    );
    return mapBookCategory(category);
  },
  async updateBookCategory(
    categoryDbId: number,
    input: BookCategoryInput,
    telegramInitData?: string
  ) {
    const category = await apiFetch<BookCategoryResponse>(
      `/api/v1/content/admin/book-categories/${categoryDbId}`,
      {
        method: "PATCH",
        body: JSON.stringify(encodeBookCategory(input)),
        headers: buildAdminHeaders(telegramInitData)
      }
    );
    return mapBookCategory(category);
  },
  async deleteBookCategory(categoryDbId: number, telegramInitData?: string) {
    await apiFetch<void>(`/api/v1/content/admin/book-categories/${categoryDbId}`, {
      method: "DELETE",
      headers: buildAdminHeaders(telegramInitData)
    });
  },
  async createBook(input: BookInput, telegramInitData?: string) {
    const book = await apiFetch<BookResponse>("/api/v1/content/admin/books", {
      method: "POST",
      body: JSON.stringify(encodeBook(input)),
      headers: buildAdminHeaders(telegramInitData)
    });
    return mapBook(book);
  },
  async updateBook(bookDbId: number, input: BookInput, telegramInitData?: string) {
    const book = await apiFetch<BookResponse>(`/api/v1/content/admin/books/${bookDbId}`, {
      method: "PATCH",
      body: JSON.stringify(encodeBook(input)),
      headers: buildAdminHeaders(telegramInitData)
    });
    return mapBook(book);
  },
  async deleteBook(bookDbId: number, telegramInitData?: string) {
    await apiFetch<void>(`/api/v1/content/admin/books/${bookDbId}`, {
      method: "DELETE",
      headers: buildAdminHeaders(telegramInitData)
    });
  },
  async createCourseTest(input: CourseTestInput, telegramInitData?: string) {
    const test = await apiFetch<CourseTestResponse>(
      "/api/v1/content/admin/course-tests",
      {
        method: "POST",
        body: JSON.stringify(encodeCourseTest(input)),
        headers: buildAdminHeaders(telegramInitData)
      }
    );
    return mapCourseTest(test);
  },
  async updateCourseTest(testId: number, input: CourseTestInput, telegramInitData?: string) {
    const test = await apiFetch<CourseTestResponse>(
      `/api/v1/content/admin/course-tests/${testId}`,
      {
        method: "PATCH",
        body: JSON.stringify(encodeCourseTest(input)),
        headers: buildAdminHeaders(telegramInitData)
      }
    );
    return mapCourseTest(test);
  },
  async deleteCourseTest(testId: number, telegramInitData?: string) {
    await apiFetch<void>(`/api/v1/content/admin/course-tests/${testId}`, {
      method: "DELETE",
      headers: buildAdminHeaders(telegramInitData)
    });
  },
  async createBookTest(input: BookTestInput, telegramInitData?: string) {
    const test = await apiFetch<BookTestResponse>("/api/v1/content/admin/book-tests", {
      method: "POST",
      body: JSON.stringify(encodeBookTest(input)),
      headers: buildAdminHeaders(telegramInitData)
    });
    return mapBookTest(test);
  },
  async updateBookTest(testId: number, input: BookTestInput, telegramInitData?: string) {
    const test = await apiFetch<BookTestResponse>(
      `/api/v1/content/admin/book-tests/${testId}`,
      {
        method: "PATCH",
        body: JSON.stringify(encodeBookTest(input)),
        headers: buildAdminHeaders(telegramInitData)
      }
    );
    return mapBookTest(test);
  },
  async deleteBookTest(testId: number, telegramInitData?: string) {
    await apiFetch<void>(`/api/v1/content/admin/book-tests/${testId}`, {
      method: "DELETE",
      headers: buildAdminHeaders(telegramInitData)
    });
  }
};
