export type CourseDifficulty = "easy" | "medium" | "hard";

export type CourseCategory = {
  id: string; // slug identifier for UI
  dbId: number;
  slug: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  accent?: string;
  difficulty: CourseDifficulty;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isFallback?: boolean;
};

export type Course = {
  id: string; // slug identifier used across the app
  dbId: number;
  slug: string;
  title: string;
  summary?: string;
  content?: string;
  durationMinutes: number;
  difficulty: CourseDifficulty;
  imageUrl?: string;
  categorySlug?: string | null;
  categoryDbId?: number | null;
  category?: CourseCategory | null;
  extras?: Record<string, unknown> | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  isFallback?: boolean;
};

export type BookCategory = {
  id: string;
  dbId: number;
  slug: string;
  label: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isFallback?: boolean;
};

export type Book = {
  id: string;
  dbId: number;
  slug: string;
  title: string;
  author?: string;
  synopsis?: string;
  content?: string;
  pages: number;
  price: number;
  imageUrl?: string;
  categorySlug?: string | null;
  categoryDbId?: number | null;
  category?: BookCategory | null;
  extras?: Record<string, unknown> | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  isFallback?: boolean;
};

export type TestAnswer = {
  id: number;
  questionId: number;
  text: string;
  isCorrect: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type TestQuestion = {
  id: number;
  testId: number;
  prompt: string;
  explanation?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  answers: TestAnswer[];
};

export type CourseTest = {
  id: number;
  courseId: number;
  title: string;
  description?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  questions: TestQuestion[];
};

export type BookTest = {
  id: number;
  bookId: number;
  title: string;
  description?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  questions: TestQuestion[];
};

export type ContentBundle = {
  courses: Course[];
  courseCategories: CourseCategory[];
  books: Book[];
  bookCategories: BookCategory[];
  courseTests: CourseTest[];
  bookTests: BookTest[];
};
