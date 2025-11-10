export interface UserPublic {
  id: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  locale: string;
  is_admin: boolean;
  app_seconds_spent: number;
}

export interface TokenPair {
  access: string;
  refresh: string;
  user: UserPublic;
}

export interface CourseCategory {
  id: number;
  title: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  accent?: string | null;
  difficulty: "easy" | "medium" | "hard";
}

export interface Course {
  id: number;
  title: string;
  summary?: string | null;
  duration_minutes: number;
  difficulty: "easy" | "medium" | "hard";
  image_url?: string | null;
  category?: CourseCategory | null;
}

export interface BookCategory {
  id: number;
  label: string;
  description?: string | null;
}

export interface Book {
  id: number;
  title: string;
  author?: string | null;
  synopsis?: string | null;
  pages: number;
  image_url?: string | null;
  category?: BookCategory | null;
}

export interface ContentBundle {
  courses: Course[];
  course_categories: CourseCategory[];
  books: Book[];
  book_categories: BookCategory[];
}
