import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { contentApi, type BookCategoryInput, type BookInput, type BookTestInput, type CourseCategoryInput, type CourseInput, type CourseTestInput } from "../services/contentApi";
import type { BookDetailSection } from "../types/library";
import {
  type Book,
  type BookCategory,
  type BookTest,
  type ContentBundle,
  type Course,
  type CourseCategory,
  type CourseTest
} from "../types/content";
import {
  courseCategories as staticCourseCategories,
  courseCatalog as staticCourseCatalog,
  libraryBooks as staticLibraryBooks,
  libraryCategories as staticLibraryCategories
} from "../constants/data";
import { useLocalization } from "../hooks/useLocalization";
import { useAuth } from "../hooks/useAuth";
import type { CourseDifficulty } from "../types/content";

const FALLBACK_TIMESTAMP = "1970-01-01T00:00:00.000Z";
const COURSE_OVERRIDES_KEY = "@quadrant/content/courseOverrides";
const BOOK_OVERRIDES_KEY = "@quadrant/content/bookOverrides";

type CourseOverride = {
  slug: string;
  dbId?: number;
  title?: string;
  summary?: string;
  content?: string;
  durationMinutes?: number;
  difficulty?: CourseDifficulty;
  imageUrl?: string;
  categorySlug?: string | null;
  extras?: Record<string, unknown> | null;
  sections?: BookDetailSection[];
  isPublished?: boolean;
  isDeleted?: boolean;
  isNew?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type BookOverride = {
  slug: string;
  dbId?: number;
  title?: string;
  author?: string;
  synopsis?: string;
  content?: string;
  pages?: number;
  price?: number;
  imageUrl?: string;
  categorySlug?: string | null;
  extras?: Record<string, unknown> | null;
  chapters?: BookDetailSection[];
  isPublished?: boolean;
  isDeleted?: boolean;
  isNew?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ContentContextValue = {
  isLoading: boolean;
  error?: string;
  courses: Course[];
  courseCategories: CourseCategory[];
  books: Book[];
  bookCategories: BookCategory[];
  courseTests: CourseTest[];
  bookTests: BookTest[];
  refresh: (force?: boolean) => Promise<void>;
  createCourseCategory: (input: CourseCategoryInput) => Promise<CourseCategory>;
  updateCourseCategory: (dbId: number, input: CourseCategoryInput) => Promise<CourseCategory>;
  deleteCourseCategory: (dbId: number) => Promise<void>;
  createCourse: (input: CourseInput) => Promise<Course>;
  updateCourse: (dbId: number, input: CourseInput) => Promise<Course>;
  deleteCourse: (dbId: number) => Promise<void>;
  createBookCategory: (input: BookCategoryInput) => Promise<BookCategory>;
  updateBookCategory: (dbId: number, input: BookCategoryInput) => Promise<BookCategory>;
  deleteBookCategory: (dbId: number) => Promise<void>;
  createBook: (input: BookInput) => Promise<Book>;
  updateBook: (dbId: number, input: BookInput) => Promise<Book>;
  deleteBook: (dbId: number) => Promise<void>;
  createCourseTest: (input: CourseTestInput) => Promise<CourseTest>;
  updateCourseTest: (id: number, input: CourseTestInput) => Promise<CourseTest>;
  deleteCourseTest: (id: number) => Promise<void>;
  createBookTest: (input: BookTestInput) => Promise<BookTest>;
  updateBookTest: (id: number, input: BookTestInput) => Promise<BookTest>;
  deleteBookTest: (id: number) => Promise<void>;
};

const ContentContext = createContext<ContentContextValue | undefined>(undefined);

const mapFallbackCourseCategory = (
  difficulty: CourseDifficulty,
  slug: string,
  title: string,
  description: string,
  icon: string,
  color: string,
  accent: string,
  index: number
): CourseCategory => ({
  id: slug,
  dbId: -1000 - index,
  slug,
  title,
  description,
  icon,
  color,
  accent,
  difficulty,
  isActive: true,
  createdAt: FALLBACK_TIMESTAMP,
  updatedAt: FALLBACK_TIMESTAMP,
  isFallback: true
});

const mapFallbackCourse = (
  course: (typeof staticCourseCatalog)[number],
  title: string,
  summary: string,
  category: CourseCategory | undefined,
  index: number
): Course => ({
  id: course.id,
  dbId: -2000 - index,
  slug: course.id,
  title,
  summary,
  content: undefined,
  durationMinutes: course.durationMinutes,
  difficulty: course.difficulty,
  imageUrl: course.imageUrl,
  categorySlug: category?.slug ?? course.categoryId,
  categoryDbId: category?.dbId ?? null,
  category: category ?? null,
  extras: null,
  isPublished: true,
  createdAt: FALLBACK_TIMESTAMP,
  updatedAt: FALLBACK_TIMESTAMP,
  isFallback: true
});

const mapFallbackBookCategory = (
  slug: string,
  label: string,
  description: string | undefined,
  index: number
): BookCategory => ({
  id: slug,
  dbId: -3000 - index,
  slug,
  label,
  description,
  isActive: true,
  createdAt: FALLBACK_TIMESTAMP,
  updatedAt: FALLBACK_TIMESTAMP,
  isFallback: true
});

const mapFallbackBook = (
  book: (typeof staticLibraryBooks)[number],
  title: string,
  author: string,
  synopsis: string,
  category: BookCategory | undefined,
  index: number
): Book => ({
  id: book.id,
  dbId: -4000 - index,
  slug: book.id,
  title,
  author,
  synopsis,
  content: undefined,
  pages: book.pages,
  price: book.price,
  imageUrl: book.imageUrl,
  categorySlug: category?.slug ?? book.categoryId,
  categoryDbId: category?.dbId ?? null,
  category: category ?? null,
  extras: null,
  isPublished: true,
  createdAt: FALLBACK_TIMESTAMP,
  updatedAt: FALLBACK_TIMESTAMP,
  isFallback: true
});

const buildFallbackBundle = (t: (key: string) => string): ContentBundle => {
  const categories = staticCourseCategories.map((category, index) =>
    mapFallbackCourseCategory(
      category.difficulty,
      category.id,
      t(category.titleKey),
      t(category.descriptionKey),
      category.icon,
      category.color,
      category.accent,
      index
    )
  );

  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));

  const courses = staticCourseCatalog.map((course, index) =>
    mapFallbackCourse(
      course,
      t(course.titleKey),
      t(course.summaryKey),
      categoryBySlug.get(course.categoryId),
      index
    )
  );

  const bookCategories = staticLibraryCategories
    .filter((category) => category.id !== "all" && category.id !== "my-library")
    .map((category, index) =>
      mapFallbackBookCategory(
        category.id,
        t(category.labelKey),
        undefined,
        index
      )
    );

  const bookCategoryBySlug = new Map(bookCategories.map((category) => [category.slug, category]));

  const books = staticLibraryBooks.map((book, index) =>
    mapFallbackBook(
      book,
      t(book.titleKey),
      t(book.authorKey),
      t(book.synopsisKey),
      bookCategoryBySlug.get(book.categoryId),
      index
    )
  );

  return {
    courses,
    courseCategories: categories,
    books,
    bookCategories,
    courseTests: [],
    bookTests: []
  };
};

const generateLocalDbId = (() => {
  let counter = 1;
  return () => -5000 - counter++;
})();

const getSectionsFromExtras = (extras?: Record<string, unknown> | null): BookDetailSection[] | undefined => {
  if (!extras) {
    return undefined;
  }
  const candidate = (extras as { sections?: BookDetailSection[] }).sections;
  return Array.isArray(candidate) ? candidate : undefined;
};

const getChaptersFromExtras = (extras?: Record<string, unknown> | null): BookDetailSection[] | undefined => {
  if (!extras) {
    return undefined;
  }
  const candidate = (extras as { chapters?: BookDetailSection[] }).chapters;
  return Array.isArray(candidate) ? candidate : undefined;
};

const sanitizeContentSections = (
  sections?: BookDetailSection[] | null
): BookDetailSection[] | undefined => {
  if (!sections) {
    return undefined;
  }
  const sanitized = sections
    .map((section) => ({
      title: (section.title ?? "").trim(),
      body: (section.body ?? "").trim()
    }))
    .filter((section) => section.title.length > 0 || section.body.length > 0);
  return sanitized.length > 0 ? sanitized : undefined;
};

const mergeCourseWithOverride = (
  base: Course | undefined,
  override: CourseOverride,
  categoryMap: Map<string, CourseCategory>
): Course => {
  const now = new Date().toISOString();
  const category =
    override.categorySlug !== undefined
      ? (override.categorySlug ? categoryMap.get(override.categorySlug) ?? null : null)
      : base?.category ?? null;
  const categorySlug =
    override.categorySlug !== undefined
      ? override.categorySlug
      : category?.slug ?? base?.categorySlug ?? null;
  const categoryDbId =
    category?.dbId ?? (categorySlug ? categoryMap.get(categorySlug)?.dbId ?? base?.categoryDbId ?? null : base?.categoryDbId ?? null);

  const baseExtras = (base?.extras ?? null) as Record<string, unknown> | null;
  const overrideExtras = override.extras ?? null;
  const mergedExtras: Record<string, unknown> = {
    ...(baseExtras ?? {}),
    ...(overrideExtras ?? {})
  };
  const sections = override.sections ?? getSectionsFromExtras(overrideExtras) ?? getSectionsFromExtras(baseExtras);
  if (sections && sections.length > 0) {
    mergedExtras.sections = sections;
  } else {
    delete mergedExtras.sections;
  }
  const extras = Object.keys(mergedExtras).length > 0 ? mergedExtras : null;

  return {
    id: base?.id ?? override.slug,
    dbId: override.dbId ?? base?.dbId ?? generateLocalDbId(),
    slug: override.slug,
    title: override.title ?? base?.title ?? "",
    summary: override.summary ?? base?.summary,
    content: override.content ?? base?.content,
    durationMinutes: override.durationMinutes ?? base?.durationMinutes ?? 0,
    difficulty: override.difficulty ?? base?.difficulty ?? "easy",
    imageUrl: override.imageUrl ?? base?.imageUrl,
    categorySlug,
    categoryDbId,
    category: category ?? (categorySlug ? categoryMap.get(categorySlug) ?? null : base?.category ?? null),
    extras,
    isPublished: override.isPublished ?? base?.isPublished ?? true,
    createdAt: override.createdAt ?? base?.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
    isFallback: base?.isFallback ?? true
  };
};

const mergeBookWithOverride = (
  base: Book | undefined,
  override: BookOverride,
  categoryMap: Map<string, BookCategory>
): Book => {
  const now = new Date().toISOString();
  const category =
    override.categorySlug !== undefined
      ? (override.categorySlug ? categoryMap.get(override.categorySlug) ?? null : null)
      : base?.category ?? null;
  const categorySlug =
    override.categorySlug !== undefined
      ? override.categorySlug
      : category?.slug ?? base?.categorySlug ?? null;
  const categoryDbId =
    category?.dbId ?? (categorySlug ? categoryMap.get(categorySlug)?.dbId ?? base?.categoryDbId ?? null : base?.categoryDbId ?? null);

  const baseExtras = (base?.extras ?? null) as Record<string, unknown> | null;
  const overrideExtras = override.extras ?? null;
  const mergedExtras: Record<string, unknown> = {
    ...(baseExtras ?? {}),
    ...(overrideExtras ?? {})
  };
  const chapters = override.chapters ?? getChaptersFromExtras(overrideExtras) ?? getChaptersFromExtras(baseExtras);
  if (chapters && chapters.length > 0) {
    mergedExtras.chapters = chapters;
  } else {
    delete mergedExtras.chapters;
  }
  const extras = Object.keys(mergedExtras).length > 0 ? mergedExtras : null;

  return {
    id: base?.id ?? override.slug,
    dbId: override.dbId ?? base?.dbId ?? generateLocalDbId(),
    slug: override.slug,
    title: override.title ?? base?.title ?? "",
    author: override.author ?? base?.author,
    synopsis: override.synopsis ?? base?.synopsis,
    content: override.content ?? base?.content,
    pages: override.pages ?? base?.pages ?? 0,
    price: override.price ?? base?.price ?? 0,
    imageUrl: override.imageUrl ?? base?.imageUrl,
    categorySlug,
    categoryDbId,
    category: category ?? (categorySlug ? categoryMap.get(categorySlug) ?? null : base?.category ?? null),
    extras,
    isPublished: override.isPublished ?? base?.isPublished ?? true,
    createdAt: override.createdAt ?? base?.createdAt ?? now,
    updatedAt: override.updatedAt ?? base?.updatedAt ?? now,
    isFallback: base?.isFallback ?? true
  };
};

type ContentProviderProps = {
  children: React.ReactNode;
};

export const ContentProvider = ({ children }: ContentProviderProps) => {
  const { t } = useLocalization();
  const { telegramInitData } = useAuth();

  const fallbackBundle = useMemo(() => buildFallbackBundle(t), [t]);

  const [courseOverrides, setCourseOverrides] = useState<Record<string, CourseOverride>>({});
  const [bookOverrides, setBookOverrides] = useState<Record<string, BookOverride>>({});
  const [content, setContent] = useState<ContentBundle>(fallbackBundle);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    const loadOverrides = async () => {
      try {
        const [storedCourses, storedBooks] = await Promise.all([
          AsyncStorage.getItem(COURSE_OVERRIDES_KEY),
          AsyncStorage.getItem(BOOK_OVERRIDES_KEY)
        ]);
        if (storedCourses) {
          try {
            const parsed = JSON.parse(storedCourses) as Record<string, CourseOverride>;
            if (parsed && typeof parsed === "object") {
              setCourseOverrides(parsed);
            }
          } catch (err) {
            console.warn("Failed to parse stored course overrides", err);
          }
        }
        if (storedBooks) {
          try {
            const parsed = JSON.parse(storedBooks) as Record<string, BookOverride>;
            if (parsed && typeof parsed === "object") {
              setBookOverrides(parsed);
            }
          } catch (err) {
            console.warn("Failed to parse stored book overrides", err);
          }
        }
      } catch (err) {
        console.warn("Failed to load content overrides", err);
      }
    };
    loadOverrides().catch((err) => {
      console.warn("Unexpected error while loading overrides", err);
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(COURSE_OVERRIDES_KEY, JSON.stringify(courseOverrides)).catch((err) => {
      console.warn("Failed to persist course overrides", err);
    });
  }, [courseOverrides]);

  useEffect(() => {
    AsyncStorage.setItem(BOOK_OVERRIDES_KEY, JSON.stringify(bookOverrides)).catch((err) => {
      console.warn("Failed to persist book overrides", err);
    });
  }, [bookOverrides]);

  const refresh = useCallback(
    async (force = false) => {
      if (isLoadingRef.current && !force) {
        return;
      }
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(undefined);
      try {
        const bundle = await contentApi.fetchBundle();
        setContent(bundle);
      } catch (err) {
        console.warn("Failed to load content bundle", err);
        setContent(fallbackBundle);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [fallbackBundle]
  );

  useEffect(() => {
    refresh(true).catch((err) => {
      console.warn("Initial content load failed", err);
    });
  }, [refresh]);

  useEffect(() => {
    if (error) {
      setContent(fallbackBundle);
    }
  }, [fallbackBundle, error]);

  const courseCategories = useMemo(() => content.courseCategories, [content.courseCategories]);
  const bookCategories = useMemo(() => content.bookCategories, [content.bookCategories]);

  const getCourseCategoryMap = useCallback(
    () => new Map(courseCategories.map((category) => [category.slug, category])),
    [courseCategories]
  );

  const getBookCategoryMap = useCallback(
    () => new Map(bookCategories.map((category) => [category.slug, category])),
    [bookCategories]
  );

  const courses = useMemo(() => {
    const categoryMap = getCourseCategoryMap();
    const courseMap = new Map<string, Course>();
    content.courses.forEach((course) => {
      const category =
        course.categorySlug && categoryMap.has(course.categorySlug)
          ? categoryMap.get(course.categorySlug) ?? null
          : course.category ?? null;
      courseMap.set(course.slug, {
        ...course,
        category,
        categoryDbId: category?.dbId ?? course.categoryDbId ?? null
      });
    });

    Object.values(courseOverrides).forEach((override) => {
      if (override.isDeleted) {
        courseMap.delete(override.slug);
        return;
      }
      const base = courseMap.get(override.slug);
      const merged = mergeCourseWithOverride(base, override, categoryMap);
      courseMap.set(override.slug, merged);
    });

    return Array.from(courseMap.values());
  }, [content.courses, courseOverrides, getCourseCategoryMap]);

  const books = useMemo(() => {
    const categoryMap = getBookCategoryMap();
    const bookMap = new Map<string, Book>();
    content.books.forEach((book) => {
      const category =
        book.categorySlug && categoryMap.has(book.categorySlug)
          ? categoryMap.get(book.categorySlug) ?? null
          : book.category ?? null;
      bookMap.set(book.slug, {
        ...book,
        category,
        categoryDbId: category?.dbId ?? book.categoryDbId ?? null
      });
    });

    Object.values(bookOverrides).forEach((override) => {
      if (override.isDeleted) {
        bookMap.delete(override.slug);
        return;
      }
      const base = bookMap.get(override.slug);
      const merged = mergeBookWithOverride(base, override, categoryMap);
      bookMap.set(override.slug, merged);
    });

    return Array.from(bookMap.values());
  }, [content.books, bookOverrides, getBookCategoryMap]);

  const buildCourseOverridePatch = useCallback(
    (input: CourseInput, base: Course | undefined, existing?: CourseOverride): CourseOverride => {
      const slug = (input.slug ?? base?.slug ?? "").trim();
      if (!slug) {
        throw new Error("course_override_missing_slug");
      }
      const now = new Date().toISOString();
      const category =
        typeof input.categoryDbId === "number"
          ? courseCategories.find((cat) => cat.dbId === input.categoryDbId)
          : base?.category ?? (existing?.categorySlug ? getCourseCategoryMap().get(existing.categorySlug) ?? null : null);

      const inputExtras = (input.extras ?? undefined) as Record<string, unknown> | undefined;
      const baseExtras = (base?.extras ?? null) as Record<string, unknown> | null;
      const existingExtras = existing?.extras;
      const extrasMerge: Record<string, unknown> = {
        ...(baseExtras ?? {}),
        ...(existingExtras ?? {}),
        ...(inputExtras ?? {})
      };
      const sectionsFromInput = sanitizeContentSections(getSectionsFromExtras(inputExtras ?? null));
      const sectionsFromExisting = sanitizeContentSections(existing?.sections);
      const sectionsFromBase = sanitizeContentSections(getSectionsFromExtras(baseExtras));
      const sections = sectionsFromInput ?? sectionsFromExisting ?? sectionsFromBase;
      if (sections) {
        extrasMerge.sections = sections;
      } else {
        delete extrasMerge.sections;
      }
      const extras = Object.keys(extrasMerge).length > 0 ? extrasMerge : null;

      return {
        slug,
        dbId: existing?.dbId ?? base?.dbId ?? generateLocalDbId(),
        title: input.title ?? existing?.title ?? base?.title,
        summary: input.summary ?? existing?.summary ?? base?.summary,
        content: input.content ?? existing?.content ?? base?.content,
        durationMinutes: input.durationMinutes ?? existing?.durationMinutes ?? base?.durationMinutes ?? 0,
        difficulty: input.difficulty ?? existing?.difficulty ?? base?.difficulty ?? "easy",
        imageUrl: input.imageUrl ?? existing?.imageUrl ?? base?.imageUrl,
        categorySlug:
          category?.slug ??
          (existing?.categorySlug !== undefined ? existing.categorySlug : base?.categorySlug ?? null),
        extras,
        sections,
        isPublished: input.isPublished ?? existing?.isPublished ?? base?.isPublished ?? true,
        isDeleted: false,
        isNew: existing?.isNew ?? !base,
        createdAt: existing?.createdAt ?? base?.createdAt ?? now,
        updatedAt: now
      };
    },
    [courseCategories, getCourseCategoryMap]
  );

  const buildBookOverridePatch = useCallback(
    (input: BookInput, base: Book | undefined, existing?: BookOverride): BookOverride => {
      const slug = (input.slug ?? base?.slug ?? "").trim();
      if (!slug) {
        throw new Error("book_override_missing_slug");
      }
      const now = new Date().toISOString();
      const category =
        typeof input.categoryDbId === "number"
          ? bookCategories.find((cat) => cat.dbId === input.categoryDbId)
          : base?.category ?? (existing?.categorySlug ? getBookCategoryMap().get(existing.categorySlug) ?? null : null);

      const inputExtras = (input.extras ?? undefined) as Record<string, unknown> | undefined;
      const baseExtras = (base?.extras ?? null) as Record<string, unknown> | null;
      const existingExtras = existing?.extras;
      const extrasMerge: Record<string, unknown> = {
        ...(baseExtras ?? {}),
        ...(existingExtras ?? {}),
        ...(inputExtras ?? {})
      };
      const chaptersFromInput = sanitizeContentSections(getChaptersFromExtras(inputExtras ?? null));
      const chaptersFromExisting = sanitizeContentSections(existing?.chapters);
      const chaptersFromBase = sanitizeContentSections(getChaptersFromExtras(baseExtras));
      const chapters = chaptersFromInput ?? chaptersFromExisting ?? chaptersFromBase;
      if (chapters) {
        extrasMerge.chapters = chapters;
      } else {
        delete extrasMerge.chapters;
      }
      const extras = Object.keys(extrasMerge).length > 0 ? extrasMerge : null;

      return {
        slug,
        dbId: existing?.dbId ?? base?.dbId ?? generateLocalDbId(),
        title: input.title ?? existing?.title ?? base?.title,
        author: input.author ?? existing?.author ?? base?.author,
        synopsis: input.synopsis ?? existing?.synopsis ?? base?.synopsis,
        content: input.content ?? existing?.content ?? base?.content,
        pages: input.pages ?? existing?.pages ?? base?.pages ?? 0,
        price: input.price ?? existing?.price ?? base?.price ?? 0,
        imageUrl: input.imageUrl ?? existing?.imageUrl ?? base?.imageUrl,
        categorySlug:
          category?.slug ??
          (existing?.categorySlug !== undefined ? existing.categorySlug : base?.categorySlug ?? null),
        chapters,
        extras,
        isPublished: input.isPublished ?? existing?.isPublished ?? base?.isPublished ?? true,
        isDeleted: false,
        isNew: existing?.isNew ?? !base,
        createdAt: existing?.createdAt ?? base?.createdAt ?? now,
        updatedAt: now
      };
    },
    [bookCategories, getBookCategoryMap]
  );

  const withReload = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T> => {
      isLoadingRef.current = true;
      const result = await operation();
      try {
        const bundle = await contentApi.fetchBundle();
        setContent(bundle);
        setError(undefined);
      } catch (err) {
        console.warn("Failed to refresh content after admin action", err);
        setError(err instanceof Error ? err.message : String(err));
      }
      isLoadingRef.current = false;
      return result;
    },
    []
  );

  const createCourseCategory = useCallback(
    (input: CourseCategoryInput) =>
      withReload(() => contentApi.createCourseCategory(input, telegramInitData)),
    [withReload, telegramInitData]
  );

  const updateCourseCategory = useCallback(
    (dbId: number, input: CourseCategoryInput) =>
      withReload(() => contentApi.updateCourseCategory(dbId, input, telegramInitData)),
    [withReload, telegramInitData]
  );

  const deleteCourseCategory = useCallback(
    (dbId: number) =>
      withReload(() => contentApi.deleteCourseCategory(dbId, telegramInitData)),
    [withReload, telegramInitData]
  );

  const createCourse = useCallback(
    async (input: CourseInput) => {
      if (!telegramInitData) {
        const override = buildCourseOverridePatch(input, undefined, courseOverrides[input.slug ?? ""]);
        override.isNew = true;
        setCourseOverrides((prev) => ({
          ...prev,
          [override.slug]: override
        }));
        return mergeCourseWithOverride(undefined, override, getCourseCategoryMap());
      }
      return withReload(() => contentApi.createCourse(input, telegramInitData));
    },
    [telegramInitData, buildCourseOverridePatch, courseOverrides, getCourseCategoryMap, withReload]
  );

  const updateCourse = useCallback(
    async (dbId: number, input: CourseInput) => {
      if (dbId < 0 || !telegramInitData) {
        const baseCourse = courses.find((course) => course.dbId === dbId) ?? content.courses.find((course) => course.dbId === dbId);
        const existingOverride = courseOverrides[input.slug ?? baseCourse?.slug ?? ""];
        const override = buildCourseOverridePatch(input, baseCourse, existingOverride);
        setCourseOverrides((prev) => ({
          ...prev,
          [override.slug]: override
        }));
        return mergeCourseWithOverride(baseCourse, override, getCourseCategoryMap());
      }
      return withReload(() => contentApi.updateCourse(dbId, input, telegramInitData));
    },
    [
      courses,
      content.courses,
      courseOverrides,
      buildCourseOverridePatch,
      getCourseCategoryMap,
      telegramInitData,
      withReload
    ]
  );

  const deleteCourse = useCallback(
    async (dbId: number) => {
      if (dbId < 0 || !telegramInitData) {
        const target = courses.find((course) => course.dbId === dbId);
        if (!target) {
          return;
        }
        setCourseOverrides((prev) => {
          const existing = prev[target.slug];
          if (existing?.isNew) {
            const { [target.slug]: _removed, ...rest } = prev;
            return rest;
          }
          return {
            ...prev,
            [target.slug]: {
              ...(existing ?? { slug: target.slug, dbId: target.dbId }),
              isDeleted: true,
              updatedAt: new Date().toISOString()
            }
          };
        });
        return;
      }
      return withReload(() => contentApi.deleteCourse(dbId, telegramInitData));
    },
    [courses, telegramInitData, withReload]
  );

  const createBookCategory = useCallback(
    (input: BookCategoryInput) =>
      withReload(() => contentApi.createBookCategory(input, telegramInitData)),
    [withReload, telegramInitData]
  );

  const updateBookCategory = useCallback(
    (dbId: number, input: BookCategoryInput) =>
      withReload(() => contentApi.updateBookCategory(dbId, input, telegramInitData)),
    [withReload, telegramInitData]
  );

  const deleteBookCategory = useCallback(
    (dbId: number) =>
      withReload(() => contentApi.deleteBookCategory(dbId, telegramInitData)),
    [withReload, telegramInitData]
  );

  const createBook = useCallback(
    async (input: BookInput) => {
      if (!telegramInitData) {
        const override = buildBookOverridePatch(input, undefined, bookOverrides[input.slug ?? ""]);
        override.isNew = true;
        setBookOverrides((prev) => ({
          ...prev,
          [override.slug]: override
        }));
        return mergeBookWithOverride(undefined, override, getBookCategoryMap());
      }
      return withReload(() => contentApi.createBook(input, telegramInitData));
    },
    [telegramInitData, buildBookOverridePatch, bookOverrides, getBookCategoryMap, withReload]
  );

  const updateBook = useCallback(
    async (dbId: number, input: BookInput) => {
      if (dbId < 0 || !telegramInitData) {
        const baseBook = books.find((book) => book.dbId === dbId) ?? content.books.find((book) => book.dbId === dbId);
        const existingOverride = bookOverrides[input.slug ?? baseBook?.slug ?? ""];
        const override = buildBookOverridePatch(input, baseBook, existingOverride);
        setBookOverrides((prev) => ({
          ...prev,
          [override.slug]: override
        }));
        return mergeBookWithOverride(baseBook, override, getBookCategoryMap());
      }
      return withReload(() => contentApi.updateBook(dbId, input, telegramInitData));
    },
    [books, content.books, bookOverrides, buildBookOverridePatch, getBookCategoryMap, telegramInitData, withReload]
  );

  const deleteBook = useCallback(
    async (dbId: number) => {
      if (dbId < 0 || !telegramInitData) {
        const target = books.find((book) => book.dbId === dbId);
        if (!target) {
          return;
        }
        setBookOverrides((prev) => {
          const existing = prev[target.slug];
          if (existing?.isNew) {
            const { [target.slug]: _removed, ...rest } = prev;
            return rest;
          }
          return {
            ...prev,
            [target.slug]: {
              ...(existing ?? { slug: target.slug, dbId: target.dbId }),
              isDeleted: true,
              updatedAt: new Date().toISOString()
            }
          };
        });
        return;
      }
      return withReload(() => contentApi.deleteBook(dbId, telegramInitData));
    },
    [books, telegramInitData, withReload]
  );

  const createCourseTest = useCallback(
    (input: CourseTestInput) =>
      withReload(() => contentApi.createCourseTest(input, telegramInitData)),
    [withReload, telegramInitData]
  );

  const updateCourseTest = useCallback(
    (id: number, input: CourseTestInput) =>
      withReload(() => contentApi.updateCourseTest(id, input, telegramInitData)),
    [withReload, telegramInitData]
  );

  const deleteCourseTest = useCallback(
    (id: number) =>
      withReload(() => contentApi.deleteCourseTest(id, telegramInitData)),
    [withReload, telegramInitData]
  );

  const createBookTest = useCallback(
    (input: BookTestInput) =>
      withReload(() => contentApi.createBookTest(input, telegramInitData)),
    [withReload, telegramInitData]
  );

  const updateBookTest = useCallback(
    (id: number, input: BookTestInput) =>
      withReload(() => contentApi.updateBookTest(id, input, telegramInitData)),
    [withReload, telegramInitData]
  );

  const deleteBookTest = useCallback(
    (id: number) =>
      withReload(() => contentApi.deleteBookTest(id, telegramInitData)),
    [withReload, telegramInitData]
  );

  const value = useMemo<ContentContextValue>(
    () => ({
      isLoading,
      error,
      courses,
      courseCategories,
      books,
      bookCategories,
      courseTests: content.courseTests,
      bookTests: content.bookTests,
      refresh,
      createCourseCategory,
      updateCourseCategory,
      deleteCourseCategory,
      createCourse,
      updateCourse,
      deleteCourse,
      createBookCategory,
      updateBookCategory,
      deleteBookCategory,
      createBook,
      updateBook,
      deleteBook,
      createCourseTest,
      updateCourseTest,
      deleteCourseTest,
      createBookTest,
      updateBookTest,
      deleteBookTest
    }),
    [
      courses,
      courseCategories,
      books,
      bookCategories,
      isLoading,
      error,
      refresh,
      createCourseCategory,
      updateCourseCategory,
      deleteCourseCategory,
      createCourse,
      updateCourse,
      deleteCourse,
      createBookCategory,
      updateBookCategory,
      deleteBookCategory,
      createBook,
      updateBook,
      deleteBook,
      createCourseTest,
      updateCourseTest,
      deleteCourseTest,
      createBookTest,
      updateBookTest,
      deleteBookTest
    ]
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
};

export const useContentContext = () => {
  const ctx = useContext(ContentContext);
  if (!ctx) {
    throw new Error("useContentContext must be used within a ContentProvider");
  }
  return ctx;
};
