import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Pressable
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";
import { useLocalization } from "../hooks/useLocalization";
import { useContent } from "../hooks/useContent";
import { useAuth } from "../hooks/useAuth";
import { useEarn } from "../hooks/useEarn";
import type { ThemeDefinition } from "../theme/themes";
import type { BookDetailSection } from "../types/library";
import type {
  Book as ContentBook,
  BookCategory,
  BookTest,
  Course as ContentCourse,
  CourseCategory,
  CourseTest
} from "../types/content";
import type { EarnTaskEntry } from "../providers/EarnProvider";
import type {
  BookCategoryInput,
  BookInput,
  BookTestInput,
  CourseCategoryInput,
  CourseInput,
  CourseTestInput,
  TestQuestionInput
} from "../services/contentApi";

const difficultyOptions: Array<{ value: "easy" | "medium" | "hard"; labelKey: string }> = [
  { value: "easy", labelKey: "courses.difficulty.easy" },
  { value: "medium", labelKey: "courses.difficulty.medium" },
  { value: "hard", labelKey: "courses.difficulty.hard" }
];

const getOnAccentColor = (theme: ThemeDefinition) =>
  theme.mode === "light" ? "#FFFFFF" : "#0F172A";

const getErrorColor = (theme: ThemeDefinition) =>
  theme.mode === "light" ? "#DC2626" : "#F87171";

type AdminSectionKey = "courses" | "books" | "tests" | "earn";

type CourseCategoryFormState = {
  dbId?: number;
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  accent: string;
  difficulty: "easy" | "medium" | "hard";
  isActive: boolean;
};

type CourseFormState = {
  dbId?: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  durationMinutes: string;
  price: string;
  difficulty: "easy" | "medium" | "hard";
  imageUrl: string;
  categorySlug: string;
  isPublished: boolean;
  extras: Record<string, unknown> | null;
  sections: BookDetailSection[];
};

type BookCategoryFormState = {
  dbId?: number;
  slug: string;
  label: string;
  description: string;
  isActive: boolean;
};

type BookFormState = {
  dbId?: number;
  slug: string;
  title: string;
  author: string;
  synopsis: string;
  content: string;
  pages: string;
  price: string;
  imageUrl: string;
  categorySlug: string;
  isPublished: boolean;
  extras: Record<string, unknown> | null;
  chapters: BookDetailSection[];
};

type TestAnswerFormState = {
  id?: number;
  text: string;
  isCorrect: boolean;
};

type TestQuestionFormState = {
  id?: number;
  prompt: string;
  explanation: string;
  answers: TestAnswerFormState[];
};

type TestFormState = {
  id?: number;
  title: string;
  description: string;
  targetSlug: string;
  targetDbId?: number;
  questions: TestQuestionFormState[];
};

type EarnTaskFormState = {
  id: string;
  title: string;
  reward: string;
  limits: string;
  verification: string;
  icon: string;
  isActive: boolean;
};

type Translate = (key: string, params?: Record<string, string | number>) => string;

const sanitizeStructuredContent = (entries: BookDetailSection[]): BookDetailSection[] =>
  entries
    .map((entry) => ({
      title: entry.title.trim(),
      body: entry.body.trim()
    }))
    .filter((entry) => entry.title.length > 0 || entry.body.length > 0);

const createEmptyCourseCategoryForm = (): CourseCategoryFormState => ({
  slug: "",
  title: "",
  description: "",
  icon: "",
  color: "",
  accent: "",
  difficulty: "easy",
  isActive: true
});

const createEmptyCourseForm = (): CourseFormState => ({
  slug: "",
  title: "",
  summary: "",
  content: "",
  durationMinutes: "30",
  price: "0",
  difficulty: "easy",
  imageUrl: "",
  categorySlug: "",
  isPublished: true,
  extras: null,
  sections: []
});

const createEmptyBookCategoryForm = (): BookCategoryFormState => ({
  slug: "",
  label: "",
  description: "",
  isActive: true
});

const createEmptyBookForm = (): BookFormState => ({
  slug: "",
  title: "",
  author: "",
  synopsis: "",
  content: "",
  pages: "0",
  price: "0",
  imageUrl: "",
  categorySlug: "",
  isPublished: true,
  extras: null,
  chapters: []
});

const createEmptyTestForm = (): TestFormState => ({
  title: "",
  description: "",
  targetSlug: "",
  questions: []
});

const createEmptyEarnTaskForm = (): EarnTaskFormState => ({
  id: "",
  title: "",
  reward: "",
  limits: "",
  verification: "",
  icon: "send",
  isActive: true
});

const extractCoursePrice = (extras: Record<string, unknown> | null | undefined): number => {
  if (!extras) {
    return 0;
  }
  const raw = (extras as Record<string, unknown>).price;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const parsed = Number.parseFloat(raw.replace(",", "."));
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 0;
};

const AdminScreen = () => {
  const { theme } = useTheme();
  const { t, language } = useLocalization();
  const { isAdmin } = useAuth();
  const {
    isLoading,
    courses,
    courseCategories,
    books,
    bookCategories,
    courseTests,
    bookTests,
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
  } = useContent();
  const {
    tasks: earnTasks,
    isReady: isEarnReady,
    saveTask: saveEarnTask,
    deleteTask: deleteEarnTask
  } = useEarn();

  const styles = useMemo(() => createStyles(theme), [theme]);
  const accentTextColor = getOnAccentColor(theme);
  const dangerColor = getErrorColor(theme);
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        maximumFractionDigits: 2
      }),
    [language]
  );
  const [activeSection, setActiveSection] = useState<AdminSectionKey>("courses");

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CourseCategoryFormState>(createEmptyCourseCategoryForm());

  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [courseForm, setCourseForm] = useState<CourseFormState>(createEmptyCourseForm());

  const [bookCategoryModalVisible, setBookCategoryModalVisible] = useState(false);
  const [bookCategoryForm, setBookCategoryForm] = useState<BookCategoryFormState>(createEmptyBookCategoryForm());

  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [bookForm, setBookForm] = useState<BookFormState>(createEmptyBookForm());

  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testForm, setTestForm] = useState<TestFormState>(createEmptyTestForm());
  const [testType, setTestType] = useState<"course" | "book">("course");
  const [earnTaskModalVisible, setEarnTaskModalVisible] = useState(false);
  const [earnTaskForm, setEarnTaskForm] = useState<EarnTaskFormState>(createEmptyEarnTaskForm());
  const [editingEarnTaskId, setEditingEarnTaskId] = useState<string | undefined>(undefined);
  const [isSavingEarnTask, setIsSavingEarnTask] = useState(false);

  const sectionTabs: Array<{ key: AdminSectionKey; label: string; icon: string }> = useMemo(
    () => [
      { key: "courses", label: t("admin.sections.courses"), icon: "reader-outline" },
      { key: "books", label: t("admin.sections.books"), icon: "book-outline" },
      { key: "earn", label: t("admin.sections.earn"), icon: "gift-outline" },
      { key: "tests", label: t("admin.sections.tests"), icon: "clipboard-outline" }
    ],
    [t]
  );

  const handleEditCourseCategory = (category?: CourseCategory) => {
    if (category) {
      setCategoryForm({
        dbId: category.dbId,
        slug: category.slug,
        title: category.title,
        description: category.description ?? "",
        icon: category.icon ?? "",
        color: category.color ?? "",
        accent: category.accent ?? "",
        difficulty: category.difficulty,
        isActive: category.isActive
      });
    } else {
      setCategoryForm(createEmptyCourseCategoryForm());
    }
    setCategoryModalVisible(true);
  };

  const handleEditCourse = (course?: ContentCourse) => {
    if (course) {
      const extras = (course.extras ?? {}) as { sections?: BookDetailSection[] };
      const existingSections = Array.isArray(extras.sections)
        ? extras.sections.map((section) => ({
            title: section.title ?? "",
            body: section.body ?? ""
          }))
        : [];
      setCourseForm({
        dbId: course.dbId,
        slug: course.slug,
        title: course.title,
        summary: course.summary ?? "",
        content: course.content ?? "",
        durationMinutes: String(course.durationMinutes ?? 0),
        price: String(extractCoursePrice(course.extras ?? null)),
        difficulty: course.difficulty,
        imageUrl: course.imageUrl ?? "",
        categorySlug: course.categorySlug ?? "",
        isPublished: course.isPublished,
        extras: course.extras ? { ...course.extras } : null,
        sections: existingSections
      });
    } else {
      setCourseForm(createEmptyCourseForm());
    }
    setCourseModalVisible(true);
  };

  const handleEditBookCategory = (category?: BookCategory) => {
    if (category) {
      setBookCategoryForm({
        dbId: category.dbId,
        slug: category.slug,
        label: category.label,
        description: category.description ?? "",
        isActive: category.isActive
      });
    } else {
      setBookCategoryForm(createEmptyBookCategoryForm());
    }
    setBookCategoryModalVisible(true);
  };

  const handleEditBook = (book?: ContentBook) => {
    if (book) {
      const extras = (book.extras ?? {}) as { chapters?: BookDetailSection[] };
      const existingChapters = Array.isArray(extras.chapters)
        ? extras.chapters.map((chapter) => ({
            title: chapter.title ?? "",
            body: chapter.body ?? ""
          }))
        : [];
      setBookForm({
        dbId: book.dbId,
        slug: book.slug,
        title: book.title,
        author: book.author ?? "",
        synopsis: book.synopsis ?? "",
        content: book.content ?? "",
        pages: String(book.pages ?? 0),
        price: String(book.price ?? 0),
        imageUrl: book.imageUrl ?? "",
        categorySlug: book.categorySlug ?? "",
        isPublished: book.isPublished,
        extras: book.extras ? { ...book.extras } : null,
        chapters: existingChapters
      });
    } else {
      setBookForm(createEmptyBookForm());
    }
    setBookModalVisible(true);
  };

  const handleEditTest = (type: "course" | "book", test?: CourseTest | BookTest) => {
    setTestType(type);
    if (test) {
      const mappedQuestions: TestQuestionFormState[] = test.questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        explanation: question.explanation ?? "",
        answers: question.answers.map((answer) => ({
          id: answer.id,
          text: answer.text,
          isCorrect: answer.isCorrect
        }))
      }));
      setTestForm({
        id: test.id,
        title: test.title,
        description: test.description ?? "",
        targetSlug: type === "course"
          ? courses.find((course) => course.dbId === (test as CourseTest).courseId)?.slug ?? ""
          : books.find((book) => book.dbId === (test as BookTest).bookId)?.slug ?? "",
        targetDbId: type === "course" ? (test as CourseTest).courseId : (test as BookTest).bookId,
        questions: mappedQuestions
      });
    } else {
      setTestForm(createEmptyTestForm());
    }
    setTestModalVisible(true);
  };

  const handleCloseEarnTaskModal = () => {
    setEarnTaskModalVisible(false);
    setEditingEarnTaskId(undefined);
    setEarnTaskForm(createEmptyEarnTaskForm());
    setIsSavingEarnTask(false);
  };

  const handleEditEarnTask = (task?: EarnTaskEntry) => {
    if (task) {
      setEarnTaskForm({
        id: task.id,
        title: task.title,
        reward: task.reward,
        limits: task.limits,
        verification: task.verification,
        icon: task.icon,
        isActive: task.isActive
      });
      setEditingEarnTaskId(task.id);
    } else {
      setEarnTaskForm(createEmptyEarnTaskForm());
      setEditingEarnTaskId(undefined);
    }
    setEarnTaskModalVisible(true);
  };

  const handleToggleEarnTask = async (task: EarnTaskEntry, nextValue: boolean) => {
    try {
      await saveEarnTask(
        {
          ...task,
          isActive: nextValue
        },
        task.id
      );
    } catch (error) {
      showError(error);
    }
  };

  const handleDeleteEarnTask = (task: EarnTaskEntry) => {
    confirmDelete(
      t("admin.actions.confirmDeleteEarnTask", { title: task.title }),
      () => deleteEarnTask(task.id)
    );
  };

  const handleSubmitEarnTask = async () => {
    if (!earnTaskForm.id.trim() || !earnTaskForm.title.trim()) {
      Alert.alert(t("admin.forms.validation.required"));
      return;
    }

    setIsSavingEarnTask(true);
    try {
      await saveEarnTask(
        {
          id: earnTaskForm.id,
          title: earnTaskForm.title,
          reward: earnTaskForm.reward,
          limits: earnTaskForm.limits,
          verification: earnTaskForm.verification,
          icon: earnTaskForm.icon.trim() || "gift",
          isActive: earnTaskForm.isActive
        },
        editingEarnTaskId
      );
      handleCloseEarnTaskModal();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "earn_task_invalid_id") {
          Alert.alert(t("admin.forms.validation.earnTaskIdRequired"));
          return;
        }
        if (error.message === "earn_task_duplicate_id") {
          Alert.alert(t("admin.forms.validation.earnTaskIdDuplicate"));
          return;
        }
      }
      showError(error);
    } finally {
      setIsSavingEarnTask(false);
    }
  };

  const showError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    Alert.alert(t("admin.messages.error", { message }));
  };

  const handleSubmitCourseCategory = async () => {
    if (!categoryForm.slug.trim() || !categoryForm.title.trim()) {
      Alert.alert(t("admin.forms.validation.required"));
      return;
    }
    const payload: CourseCategoryInput = {
      slug: categoryForm.slug.trim(),
      title: categoryForm.title.trim(),
      description: categoryForm.description.trim() || undefined,
      icon: categoryForm.icon.trim() || undefined,
      color: categoryForm.color.trim() || undefined,
      accent: categoryForm.accent.trim() || undefined,
      difficulty: categoryForm.difficulty,
      isActive: categoryForm.isActive
    };
    try {
      if (categoryForm.dbId) {
        await updateCourseCategory(categoryForm.dbId, payload);
      } else {
        await createCourseCategory(payload);
      }
      setCategoryModalVisible(false);
    } catch (error) {
      showError(error);
    }
  };

  const handleSubmitCourse = async () => {
    if (!courseForm.slug.trim() || !courseForm.title.trim()) {
      Alert.alert(t("admin.forms.validation.required"));
      return;
    }
    const category = courseCategories.find((cat) => cat.slug === courseForm.categorySlug.trim());
    if (!category) {
      Alert.alert(t("admin.forms.validation.categoryMissing"));
      return;
    }
    const duration = Number.parseInt(courseForm.durationMinutes, 10) || 0;
    const priceValue = Number.parseFloat(courseForm.price.replace(",", "."));
    if (Number.isNaN(priceValue) || priceValue < 0) {
      Alert.alert(t("admin.forms.validation.priceInvalid"));
      return;
    }
    const sanitizedSections = sanitizeStructuredContent(courseForm.sections);
    const extrasPayload: Record<string, unknown> = {
      ...(courseForm.extras ?? {}),
      price: Number.isFinite(priceValue) ? priceValue : 0
    };
    if (sanitizedSections.length > 0) {
      extrasPayload.sections = sanitizedSections;
    } else {
      delete extrasPayload.sections;
    }
    const payload: CourseInput = {
      slug: courseForm.slug.trim(),
      title: courseForm.title.trim(),
      summary: courseForm.summary.trim() || undefined,
      content: courseForm.content.trim() || undefined,
      durationMinutes: duration,
      difficulty: courseForm.difficulty,
      imageUrl: courseForm.imageUrl.trim() || undefined,
      categoryDbId: category.dbId,
      isPublished: courseForm.isPublished,
      extras: extrasPayload
    };
    try {
      if (courseForm.dbId) {
        await updateCourse(courseForm.dbId, payload);
      } else {
        await createCourse(payload);
      }
      setCourseModalVisible(false);
    } catch (error) {
      showError(error);
    }
  };

  const handleSubmitBookCategory = async () => {
    if (!bookCategoryForm.slug.trim() || !bookCategoryForm.label.trim()) {
      Alert.alert(t("admin.forms.validation.required"));
      return;
    }
    const payload: BookCategoryInput = {
      slug: bookCategoryForm.slug.trim(),
      label: bookCategoryForm.label.trim(),
      description: bookCategoryForm.description.trim() || undefined,
      isActive: bookCategoryForm.isActive
    };
    try {
      if (bookCategoryForm.dbId) {
        await updateBookCategory(bookCategoryForm.dbId, payload);
      } else {
        await createBookCategory(payload);
      }
      setBookCategoryModalVisible(false);
    } catch (error) {
      showError(error);
    }
  };

  const handleSubmitBook = async () => {
    if (!bookForm.slug.trim() || !bookForm.title.trim()) {
      Alert.alert(t("admin.forms.validation.required"));
      return;
    }
    const category = bookCategories.find((cat) => cat.slug === bookForm.categorySlug.trim());
    if (!category) {
      Alert.alert(t("admin.forms.validation.categoryMissing"));
      return;
    }
    const priceValue = Number.parseFloat(bookForm.price.replace(",", "."));
    if (Number.isNaN(priceValue) || priceValue < 0) {
      Alert.alert(t("admin.forms.validation.priceInvalid"));
      return;
    }
    const sanitizedChapters = sanitizeStructuredContent(bookForm.chapters);
    const extrasPayload: Record<string, unknown> = {
      ...(bookForm.extras ?? {})
    };
    if (sanitizedChapters.length > 0) {
      extrasPayload.chapters = sanitizedChapters;
    } else {
      delete extrasPayload.chapters;
    }
    const payload: BookInput = {
      slug: bookForm.slug.trim(),
      title: bookForm.title.trim(),
      author: bookForm.author.trim() || undefined,
      synopsis: bookForm.synopsis.trim() || undefined,
      content: bookForm.content.trim() || undefined,
      pages: Number.parseInt(bookForm.pages, 10) || 0,
      price: Number.isFinite(priceValue) ? priceValue : 0,
      imageUrl: bookForm.imageUrl.trim() || undefined,
      categoryDbId: category.dbId,
      isPublished: bookForm.isPublished,
      extras: Object.keys(extrasPayload).length > 0 ? extrasPayload : undefined
    };
    try {
      if (bookForm.dbId) {
        await updateBook(bookForm.dbId, payload);
      } else {
        await createBook(payload);
      }
      setBookModalVisible(false);
    } catch (error) {
      showError(error);
    }
  };

  const convertTestFormToPayload = (): TestQuestionInput[] | undefined => {
    if (testForm.questions.length === 0) {
      return undefined;
    }
    return testForm.questions.map((question, questionIndex) => ({
      prompt: question.prompt,
      explanation: question.explanation || undefined,
      order: questionIndex,
      answers: question.answers.map((answer, answerIndex) => ({
        text: answer.text,
        isCorrect: answer.isCorrect,
        order: answerIndex
      }))
    }));
  };

  const handleSubmitTest = async () => {
    if (!testForm.title.trim()) {
      Alert.alert(t("admin.forms.validation.required"));
      return;
    }
    const targetSlug = testForm.targetSlug.trim();
    if (!targetSlug) {
      Alert.alert(
        t(
          testType === "course"
            ? "admin.forms.validation.courseMissing"
            : "admin.forms.validation.bookMissing"
        )
      );
      return;
    }
    if (testType === "course") {
      const course = courses.find((item) => item.slug === targetSlug);
      if (!course) {
        Alert.alert(t("admin.forms.validation.courseMissing"));
        return;
      }
      const payload: CourseTestInput = {
        courseId: course.dbId,
        title: testForm.title.trim(),
        description: testForm.description.trim() || undefined,
        questions: convertTestFormToPayload()
      };
      try {
        if (testForm.id) {
          await updateCourseTest(testForm.id, payload);
        } else {
          await createCourseTest(payload);
        }
        setTestModalVisible(false);
      } catch (error) {
        showError(error);
      }
    } else {
      const book = books.find((item) => item.slug === targetSlug);
      if (!book) {
        Alert.alert(t("admin.forms.validation.bookMissing"));
        return;
      }
      const payload: BookTestInput = {
        bookId: book.dbId,
        title: testForm.title.trim(),
        description: testForm.description.trim() || undefined,
        questions: convertTestFormToPayload()
      };
      try {
        if (testForm.id) {
          await updateBookTest(testForm.id, payload);
        } else {
          await createBookTest(payload);
        }
        setTestModalVisible(false);
      } catch (error) {
        showError(error);
      }
    }
  };

  const confirmDelete = (message: string, onConfirm: () => Promise<void>) => {
    Alert.alert(t("admin.actions.delete"), message, [
      { text: t("admin.actions.cancel"), style: "cancel" },
      {
        text: t("admin.actions.delete"),
        style: "destructive",
        onPress: () => {
          onConfirm().catch(showError);
        }
      }
    ]);
  };

  const renderCoursesSection = () => (
    <ScrollView contentContainerStyle={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("admin.courses.categoriesTitle")}</Text>
        <Pressable style={styles.actionButton} onPress={() => handleEditCourseCategory()}>
          <Ionicons name="add" size={18} color={accentTextColor} />
          <Text style={styles.actionButtonText}>{t("admin.actions.add")}</Text>
        </Pressable>
      </View>
      {courseCategories.length === 0 ? (
        <Text style={styles.emptyText}>{t("admin.courses.emptyCategories")}</Text>
      ) : (
        courseCategories.map((category) => {
          const isFallback = Boolean(category.isFallback);
          return (
          <View key={category.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{category.title}</Text>
              <Text style={styles.itemSubtitle}>{category.slug}</Text>
            </View>
            <View style={styles.itemMetaRow}>
              <Text style={styles.itemMeta}>{t("admin.fields.difficulty")}: {t(`courses.difficulty.${category.difficulty}`)}</Text>
              <Text style={styles.itemMeta}>{category.isActive ? t("admin.status.active") : t("admin.status.inactive")}</Text>
              {isFallback && <Text style={styles.itemMeta}>{t("admin.readonly.sample")}</Text>}
            </View>
            <View style={styles.itemActions}>
              {isFallback ? (
                <Text style={styles.readonlyText}>{t("admin.readonly.sample")}</Text>
              ) : (
                <>
                  <Pressable style={styles.secondaryButton} onPress={() => handleEditCourseCategory(category)}>
                    <Text style={styles.secondaryButtonText}>{t("admin.actions.edit")}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.destructiveButton}
                    onPress={() =>
                      confirmDelete(
                        t("admin.actions.confirmDeleteCategory", { title: category.title }),
                        () => deleteCourseCategory(category.dbId)
                      )
                    }
                  >
                    <Text style={styles.destructiveButtonText}>{t("admin.actions.delete")}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        );
        })
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("admin.courses.itemsTitle")}</Text>
        <Pressable style={styles.actionButton} onPress={() => handleEditCourse()}>
          <Ionicons name="add" size={18} color={accentTextColor} />
          <Text style={styles.actionButtonText}>{t("admin.actions.add")}</Text>
        </Pressable>
      </View>
      {courses.length === 0 ? (
        <Text style={styles.emptyText}>{t("admin.courses.emptyCourses")}</Text>
      ) : (
        courses.map((course) => {
          const category = courseCategories.find((cat) => cat.slug === course.categorySlug);
          const isFallback = Boolean(course.isFallback);
          const price = extractCoursePrice(course.extras ?? null);
          const formattedPrice = numberFormatter.format(price ?? 0);
          return (
            <View key={course.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{course.title}</Text>
                <Text style={styles.itemSubtitle}>{course.slug}</Text>
              </View>
              <View style={styles.itemMetaRow}>
                {category && (
                  <Text style={styles.itemMeta}>
                    {t("admin.fields.category")}: {category.title}
                  </Text>
                )}
                <Text style={styles.itemMeta}>{t("admin.fields.difficulty")}: {t(`courses.difficulty.${course.difficulty}`)}</Text>
                <Text style={styles.itemMeta}>
                  {t("admin.fields.price")}: {formattedPrice}
                </Text>
                <Text style={styles.itemMeta}>
                  {course.isPublished ? t("admin.status.visible") : t("admin.status.hidden")}
                </Text>
                {isFallback && <Text style={styles.itemMeta}>{t("admin.readonly.sample")}</Text>}
              </View>
              <View style={styles.itemActions}>
                <Pressable style={styles.secondaryButton} onPress={() => handleEditCourse(course)}>
                  <Text style={styles.secondaryButtonText}>{t("admin.actions.edit")}</Text>
                </Pressable>
                <Pressable
                  style={styles.destructiveButton}
                  onPress={() =>
                    confirmDelete(
                      t("admin.actions.confirmDeleteCourse", { title: course.title }),
                      () => deleteCourse(course.dbId)
                    )
                  }
                >
                  <Text style={styles.destructiveButtonText}>{t("admin.actions.delete")}</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );

  const renderBooksSection = () => (
    <ScrollView contentContainerStyle={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("admin.books.categoriesTitle")}</Text>
        <Pressable style={styles.actionButton} onPress={() => handleEditBookCategory()}>
          <Ionicons name="add" size={18} color={accentTextColor} />
          <Text style={styles.actionButtonText}>{t("admin.actions.add")}</Text>
        </Pressable>
      </View>
      {bookCategories.length === 0 ? (
        <Text style={styles.emptyText}>{t("admin.books.emptyCategories")}</Text>
      ) : (
        bookCategories.map((category) => {
          const isFallback = Boolean(category.isFallback);
          return (
          <View key={category.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{category.label}</Text>
              <Text style={styles.itemSubtitle}>{category.slug}</Text>
            </View>
            <View style={styles.itemMetaRow}>
              <Text style={styles.itemMeta}>{category.isActive ? t("admin.status.active") : t("admin.status.inactive")}</Text>
              {isFallback && <Text style={styles.itemMeta}>{t("admin.readonly.sample")}</Text>}
            </View>
            <View style={styles.itemActions}>
              {isFallback ? (
                <Text style={styles.readonlyText}>{t("admin.readonly.sample")}</Text>
              ) : (
                <>
                  <Pressable style={styles.secondaryButton} onPress={() => handleEditBookCategory(category)}>
                    <Text style={styles.secondaryButtonText}>{t("admin.actions.edit")}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.destructiveButton}
                    onPress={() =>
                      confirmDelete(
                        t("admin.actions.confirmDeleteCategory", { title: category.label }),
                        () => deleteBookCategory(category.dbId)
                      )
                    }
                  >
                    <Text style={styles.destructiveButtonText}>{t("admin.actions.delete")}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        );
        })
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("admin.books.itemsTitle")}</Text>
        <Pressable style={styles.actionButton} onPress={() => handleEditBook()}>
          <Ionicons name="add" size={18} color={accentTextColor} />
          <Text style={styles.actionButtonText}>{t("admin.actions.add")}</Text>
        </Pressable>
      </View>
      {books.length === 0 ? (
        <Text style={styles.emptyText}>{t("admin.books.emptyBooks")}</Text>
      ) : (
        books.map((book) => {
          const category = bookCategories.find((cat) => cat.slug === book.categorySlug);
          const isFallback = Boolean(book.isFallback);
          const formattedPrice = numberFormatter.format(book.price ?? 0);
          return (
            <View key={book.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{book.title}</Text>
                <Text style={styles.itemSubtitle}>{book.slug}</Text>
              </View>
              <View style={styles.itemMetaRow}>
                {category && (
                  <Text style={styles.itemMeta}>
                    {t("admin.fields.category")}: {category.label}
                  </Text>
                )}
                <Text style={styles.itemMeta}>{t("admin.fields.author")}: {book.author ?? t("library.book.authorUnknown")}</Text>
                <Text style={styles.itemMeta}>
                  {t("admin.fields.price")}: {formattedPrice}
                </Text>
                <Text style={styles.itemMeta}>
                  {book.isPublished ? t("admin.status.visible") : t("admin.status.hidden")}
                </Text>
                {isFallback && <Text style={styles.itemMeta}>{t("admin.readonly.sample")}</Text>}
              </View>
              <View style={styles.itemActions}>
                <Pressable style={styles.secondaryButton} onPress={() => handleEditBook(book)}>
                  <Text style={styles.secondaryButtonText}>{t("admin.actions.edit")}</Text>
                </Pressable>
                <Pressable
                  style={styles.destructiveButton}
                  onPress={() =>
                    confirmDelete(
                      t("admin.actions.confirmDeleteBook", { title: book.title }),
                      () => deleteBook(book.dbId)
                    )
                  }
                >
                  <Text style={styles.destructiveButtonText}>{t("admin.actions.delete")}</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );

  const renderTestsSection = () => (
    <ScrollView contentContainerStyle={styles.sectionContainer}>
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleButton, testType === "course" && styles.toggleButtonActive]}
          onPress={() => setTestType("course")}
        >
          <Text
            style={[
              styles.toggleButtonText,
              testType === "course" && styles.toggleButtonTextActive
            ]}
          >
            {t("admin.tests.type.course")}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, testType === "book" && styles.toggleButtonActive]}
          onPress={() => setTestType("book")}
        >
          <Text
            style={[
              styles.toggleButtonText,
              testType === "book" && styles.toggleButtonTextActive
            ]}
          >
            {t("admin.tests.type.book")}
          </Text>
        </Pressable>
      </View>

      <Pressable style={styles.actionButton} onPress={() => handleEditTest(testType)}>
        <Ionicons name="add" size={18} color={accentTextColor} />
        <Text style={styles.actionButtonText}>{t("admin.actions.add")}</Text>
      </Pressable>

      {testType === "course"
        ? renderTestList(courseTests, courses, "course")
        : renderTestList(bookTests, books, "book")}
    </ScrollView>
  );

  const renderEarnSection = () => (
    <ScrollView contentContainerStyle={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("admin.earn.sectionTitle")}</Text>
        <Pressable style={styles.actionButton} onPress={() => handleEditEarnTask()}>
          <Ionicons name="add" size={18} color={accentTextColor} />
          <Text style={styles.actionButtonText}>{t("admin.earn.addTask")}</Text>
        </Pressable>
      </View>
      {!isEarnReady ? (
        <View style={styles.loaderRow}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : earnTasks.length === 0 ? (
        <Text style={styles.emptyText}>{t("admin.earn.empty")}</Text>
      ) : (
        earnTasks.map((task) => (
          <View key={task.id} style={styles.itemCard}>
            <View style={styles.earnTaskHeader}>
              <View style={styles.itemHeaderLeft}>
                <Feather name={task.icon as never} size={18} color={theme.colors.accent} />
                <Text style={styles.itemTitle}>{task.title}</Text>
              </View>
              <Switch
                value={task.isActive}
                onValueChange={(value) => handleToggleEarnTask(task, value)}
                trackColor={{ true: theme.colors.accent, false: theme.colors.surfaceAlt }}
                thumbColor={task.isActive ? getOnAccentColor(theme) : theme.colors.textSecondary}
              />
            </View>
            <Text style={styles.itemSubtitle}>
              {t("admin.fields.slug")}: {task.id}
            </Text>
            <View style={styles.itemMetaColumn}>
              <Text style={styles.itemMeta}>
                {t("admin.fields.rewardLabel")}: {task.reward}
              </Text>
              <Text style={styles.itemMeta}>
                {t("admin.fields.limitsLabel")}: {task.limits}
              </Text>
              <Text style={styles.itemMeta}>
                {t("admin.fields.verificationLabel")}: {task.verification}
              </Text>
            </View>
            <View style={styles.itemActions}>
              <Pressable style={styles.secondaryButton} onPress={() => handleEditEarnTask(task)}>
                <Text style={styles.secondaryButtonText}>{t("admin.actions.edit")}</Text>
              </Pressable>
              <Pressable
                style={styles.destructiveButton}
                onPress={() => handleDeleteEarnTask(task)}
              >
                <Text style={styles.destructiveButtonText}>{t("admin.actions.delete")}</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderTestList = (
    tests: CourseTest[] | BookTest[],
    targets: ContentCourse[] | ContentBook[],
    type: "course" | "book"
  ) => (
    tests.length === 0 ? (
      <Text style={styles.emptyText}>{t("admin.tests.empty")}</Text>
    ) : (
      tests.map((test) => {
        const target =
          type === "course"
            ? (targets as ContentCourse[]).find((item) => item.dbId === (test as CourseTest).courseId)
            : (targets as ContentBook[]).find((item) => item.dbId === (test as BookTest).bookId);
        return (
          <View key={`${type}-${test.id}`} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{test.title}</Text>
              {target && <Text style={styles.itemSubtitle}>{target.title}</Text>}
            </View>
            <View style={styles.itemMetaRow}>
              <Text style={styles.itemMeta}>
                {t("admin.tests.questionsCount", { count: test.questions.length })}
              </Text>
            </View>
            <View style={styles.itemActions}>
              <Pressable style={styles.secondaryButton} onPress={() => handleEditTest(type, test)}>
                <Text style={styles.secondaryButtonText}>{t("admin.actions.edit")}</Text>
              </Pressable>
              <Pressable
                style={styles.destructiveButton}
                onPress={() =>
                  confirmDelete(
                    t("admin.actions.confirmDeleteTest", { title: test.title }),
                    () => (type === "course" ? deleteCourseTest(test.id) : deleteBookTest(test.id))
                  )
                }
              >
                <Text style={styles.destructiveButtonText}>{t("admin.actions.delete")}</Text>
              </Pressable>
            </View>
          </View>
        );
      })
    )
  );

  const renderActiveSection = () => {
    if (activeSection === "courses") {
      return renderCoursesSection();
    }
    if (activeSection === "books") {
      return renderBooksSection();
    }
    if (activeSection === "earn") {
      return renderEarnSection();
    }
    return renderTestsSection();
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>{t("admin.access.denied")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("admin.title")}</Text>
        {isLoading && <ActivityIndicator size="small" color={theme.colors.accent} />}
      </View>
      <View style={styles.tabRow}>
        {sectionTabs.map((tab) => {
          const isActive = tab.key === activeSection;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveSection(tab.key)}
            >
              <Ionicons
                name={(isActive ? tab.icon.replace("-outline", "") : tab.icon) as never}
                size={16}
                color={isActive ? accentTextColor : theme.colors.textSecondary}
              />
              <Text
                style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {renderActiveSection()}

      <CourseCategoryModal
        visible={categoryModalVisible}
        form={categoryForm}
        onChange={setCategoryForm}
        onClose={() => setCategoryModalVisible(false)}
        onSubmit={handleSubmitCourseCategory}
      />
      <CourseModal
        visible={courseModalVisible}
        form={courseForm}
        onChange={setCourseForm}
        onClose={() => setCourseModalVisible(false)}
        onSubmit={handleSubmitCourse}
        categories={courseCategories}
      />
      <BookCategoryModal
        visible={bookCategoryModalVisible}
        form={bookCategoryForm}
        onChange={setBookCategoryForm}
        onClose={() => setBookCategoryModalVisible(false)}
        onSubmit={handleSubmitBookCategory}
      />
      <BookModal
        visible={bookModalVisible}
        form={bookForm}
        onChange={setBookForm}
        onClose={() => setBookModalVisible(false)}
        onSubmit={handleSubmitBook}
        categories={bookCategories}
      />
      <EarnTaskModal
        visible={earnTaskModalVisible}
        form={earnTaskForm}
        onChange={setEarnTaskForm}
        onClose={handleCloseEarnTaskModal}
        onSubmit={handleSubmitEarnTask}
        isSaving={isSavingEarnTask}
      />
      <TestModal
        visible={testModalVisible}
        form={testForm}
        onChange={setTestForm}
        onClose={() => setTestModalVisible(false)}
        onSubmit={handleSubmitTest}
        testType={testType}
        courses={courses}
        books={books}
        t={t}
      />
    </View>
  );
};

const CourseCategoryModal = ({
  visible,
  form,
  onChange,
  onClose,
  onSubmit
}: {
  visible: boolean;
  form: CourseCategoryFormState;
  onChange: (form: CourseCategoryFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const styles = useMemo(() => createModalStyles(theme), [theme]);

  const update = (patch: Partial<CourseCategoryFormState>) => {
    onChange({ ...form, ...patch });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {form.dbId ? t("admin.courses.editCategory") : t("admin.courses.createCategory")}
          </Text>
          <ScrollView style={styles.modalContent}>
            <FormField
              label={t("admin.fields.slug")}
              value={form.slug}
              onChangeText={(value) => update({ slug: value })}
            />
            <FormField
              label={t("admin.fields.title")}
              value={form.title}
              onChangeText={(value) => update({ title: value })}
            />
            <FormField
              label={t("admin.fields.description")}
              value={form.description}
              onChangeText={(value) => update({ description: value })}
              multiline
            />
            <FormField
              label={t("admin.fields.icon")}
              value={form.icon}
              onChangeText={(value) => update({ icon: value })}
            />
            <FormField
              label={t("admin.fields.color")}
              value={form.color}
              onChangeText={(value) => update({ color: value })}
            />
            <FormField
              label={t("admin.fields.accent")}
              value={form.accent}
              onChangeText={(value) => update({ accent: value })}
            />
            <FormSelect
              label={t("admin.fields.difficulty")}
              value={form.difficulty}
              options={difficultyOptions.map((option) => ({
                value: option.value,
                label: t(option.labelKey)
              }))}
              onChange={(value) => update({ difficulty: value as CourseCategoryFormState["difficulty"] })}
            />
            <BooleanField
              label={t("admin.fields.isActive")}
              value={form.isActive}
              onToggle={(value) => update({ isActive: value })}
            />
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>{t("admin.actions.cancel")}</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={onSubmit}>
              <Text style={styles.primaryButtonText}>{t("admin.actions.save")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const CourseModal = ({
  visible,
  form,
  onChange,
  onClose,
  onSubmit,
  categories
}: {
  visible: boolean;
  form: CourseFormState;
  onChange: (form: CourseFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  categories: CourseCategory[];
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const styles = useMemo(() => createModalStyles(theme), [theme]);

  const update = (patch: Partial<CourseFormState>) => {
    onChange({ ...form, ...patch });
  };

  const handleSectionChange = (index: number, patch: Partial<BookDetailSection>) => {
    const nextSections = form.sections.map((section, idx) =>
      idx === index
        ? {
            title: patch.title ?? section.title,
            body: patch.body ?? section.body
          }
        : section
    );
    update({ sections: nextSections });
  };

  const handleSectionRemove = (index: number) => {
    update({ sections: form.sections.filter((_, idx) => idx !== index) });
  };

  const handleSectionAdd = () => {
    update({ sections: [...form.sections, { title: "", body: "" }] });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {form.dbId ? t("admin.courses.editCourse") : t("admin.courses.createCourse")}
          </Text>
          <ScrollView style={styles.modalContent}>
            <FormField label={t("admin.fields.slug")} value={form.slug} onChangeText={(value) => update({ slug: value })} />
            <FormField label={t("admin.fields.title")} value={form.title} onChangeText={(value) => update({ title: value })} />
            <FormField label={t("admin.fields.summary")} value={form.summary} onChangeText={(value) => update({ summary: value })} multiline />
            <FormField label={t("admin.fields.content")} value={form.content} onChangeText={(value) => update({ content: value })} multiline />
            <FormField
              label={t("admin.fields.durationMinutes")}
              value={form.durationMinutes}
              keyboardType="numeric"
              onChangeText={(value) => update({ durationMinutes: value })}
            />
            <FormField
              label={t("admin.fields.price")}
              value={form.price}
              keyboardType="numeric"
              onChangeText={(value) => update({ price: value })}
            />
            <FormSelect
              label={t("admin.fields.difficulty")}
              value={form.difficulty}
              options={difficultyOptions.map((option) => ({
                value: option.value,
                label: t(option.labelKey)
              }))}
              onChange={(value) => update({ difficulty: value as CourseFormState["difficulty"] })}
            />
            <FormField label={t("admin.fields.imageUrl")} value={form.imageUrl} onChangeText={(value) => update({ imageUrl: value })} />
            <FormSelect
              label={t("admin.fields.category")}
              value={form.categorySlug}
              options={categories.map((category) => ({
                value: category.slug,
                label: `${category.title} (${category.slug})`
              }))}
              onChange={(value) => update({ categorySlug: value })}
            />
            <BooleanField
              label={t("admin.fields.isVisible")}
              value={form.isPublished}
              onToggle={(value) => update({ isPublished: value })}
            />
            <View style={styles.contentEditorContainer}>
              <Text style={styles.sectionTitle}>{t("admin.fields.courseSectionsTitle")}</Text>
              {form.sections.length === 0 ? (
                <Text style={styles.emptyText}>{t("admin.fields.sectionsEmpty")}</Text>
              ) : (
                form.sections.map((section, index) => (
                  <View key={`course-section-${index}`} style={styles.structuredItem}>
                    <View style={styles.structuredHeader}>
                      <Text style={styles.structuredIndex}>{t("admin.fields.sectionIndex", { index: index + 1 })}</Text>
                      <Pressable
                        style={styles.structuredRemoveButton}
                        onPress={() => handleSectionRemove(index)}
                      >
                        <Text style={styles.structuredRemoveButtonText}>{t("admin.actions.remove")}</Text>
                      </Pressable>
                    </View>
                    <FormField
                      label={t("admin.fields.sectionTitle")}
                      value={section.title}
                      onChangeText={(value) => handleSectionChange(index, { title: value })}
                    />
                    <FormField
                      label={t("admin.fields.sectionBody")}
                      value={section.body}
                      onChangeText={(value) => handleSectionChange(index, { body: value })}
                      multiline
                    />
                  </View>
                ))
              )}
              <Pressable style={styles.secondaryButton} onPress={handleSectionAdd}>
                <Text style={styles.secondaryButtonAccent}>{t("admin.actions.addSection")}</Text>
              </Pressable>
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>{t("admin.actions.cancel")}</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={onSubmit}>
              <Text style={styles.primaryButtonText}>{t("admin.actions.save")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const BookCategoryModal = ({
  visible,
  form,
  onChange,
  onClose,
  onSubmit
}: {
  visible: boolean;
  form: BookCategoryFormState;
  onChange: (form: BookCategoryFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const styles = useMemo(() => createModalStyles(theme), [theme]);

  const update = (patch: Partial<BookCategoryFormState>) => {
    onChange({ ...form, ...patch });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {form.dbId ? t("admin.books.editCategory") : t("admin.books.createCategory")}
          </Text>
          <ScrollView style={styles.modalContent}>
            <FormField label={t("admin.fields.slug")} value={form.slug} onChangeText={(value) => update({ slug: value })} />
            <FormField label={t("admin.fields.title")} value={form.label} onChangeText={(value) => update({ label: value })} />
            <FormField label={t("admin.fields.description")} value={form.description} onChangeText={(value) => update({ description: value })} multiline />
            <BooleanField label={t("admin.fields.isActive") } value={form.isActive} onToggle={(value) => update({ isActive: value })} />
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>{t("admin.actions.cancel")}</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={onSubmit}>
              <Text style={styles.primaryButtonText}>{t("admin.actions.save")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const BookModal = ({
  visible,
  form,
  onChange,
  onClose,
  onSubmit,
  categories
}: {
  visible: boolean;
  form: BookFormState;
  onChange: (form: BookFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  categories: BookCategory[];
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const styles = useMemo(() => createModalStyles(theme), [theme]);

  const update = (patch: Partial<BookFormState>) => {
    onChange({ ...form, ...patch });
  };

  const handleChapterChange = (index: number, patch: Partial<BookDetailSection>) => {
    const nextChapters = form.chapters.map((chapter, idx) =>
      idx === index
        ? {
            title: patch.title ?? chapter.title,
            body: patch.body ?? chapter.body
          }
        : chapter
    );
    update({ chapters: nextChapters });
  };

  const handleChapterRemove = (index: number) => {
    update({ chapters: form.chapters.filter((_, idx) => idx !== index) });
  };

  const handleChapterAdd = () => {
    update({ chapters: [...form.chapters, { title: "", body: "" }] });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {form.dbId ? t("admin.books.editBook") : t("admin.books.createBook")}
          </Text>
          <ScrollView style={styles.modalContent}>
            <FormField label={t("admin.fields.slug")} value={form.slug} onChangeText={(value) => update({ slug: value })} />
            <FormField label={t("admin.fields.title")} value={form.title} onChangeText={(value) => update({ title: value })} />
            <FormField label={t("admin.fields.author")} value={form.author} onChangeText={(value) => update({ author: value })} />
            <FormField label={t("admin.fields.synopsis")} value={form.synopsis} onChangeText={(value) => update({ synopsis: value })} multiline />
            <FormField label={t("admin.fields.content")} value={form.content} onChangeText={(value) => update({ content: value })} multiline />
            <FormField
              label={t("admin.fields.pages")}
              value={form.pages}
              keyboardType="numeric"
              onChangeText={(value) => update({ pages: value })}
            />
            <FormField
              label={t("admin.fields.price")}
              value={form.price}
              keyboardType="numeric"
              onChangeText={(value) => update({ price: value })}
            />
            <FormField label={t("admin.fields.imageUrl")} value={form.imageUrl} onChangeText={(value) => update({ imageUrl: value })} />
            <FormSelect
              label={t("admin.fields.category")}
              value={form.categorySlug}
              options={categories.map((category) => ({ value: category.slug, label: `${category.label} (${category.slug})` }))}
              onChange={(value) => update({ categorySlug: value })}
            />
            <BooleanField
              label={t("admin.fields.isVisible")}
              value={form.isPublished}
              onToggle={(value) => update({ isPublished: value })}
            />
            <View style={styles.contentEditorContainer}>
              <Text style={styles.sectionTitle}>{t("admin.fields.bookChaptersTitle")}</Text>
              {form.chapters.length === 0 ? (
                <Text style={styles.emptyText}>{t("admin.fields.chaptersEmpty")}</Text>
              ) : (
                form.chapters.map((chapter, index) => (
                  <View key={`book-chapter-${index}`} style={styles.structuredItem}>
                    <View style={styles.structuredHeader}>
                      <Text style={styles.structuredIndex}>{t("admin.fields.chapterIndex", { index: index + 1 })}</Text>
                      <Pressable
                        style={styles.structuredRemoveButton}
                        onPress={() => handleChapterRemove(index)}
                      >
                        <Text style={styles.structuredRemoveButtonText}>{t("admin.actions.remove")}</Text>
                      </Pressable>
                    </View>
                    <FormField
                      label={t("admin.fields.chapterTitle")}
                      value={chapter.title}
                      onChangeText={(value) => handleChapterChange(index, { title: value })}
                    />
                    <FormField
                      label={t("admin.fields.chapterBody")}
                      value={chapter.body}
                      onChangeText={(value) => handleChapterChange(index, { body: value })}
                      multiline
                    />
                  </View>
                ))
              )}
              <Pressable style={styles.secondaryButton} onPress={handleChapterAdd}>
                <Text style={styles.secondaryButtonAccent}>{t("admin.actions.addChapter")}</Text>
              </Pressable>
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>{t("admin.actions.cancel")}</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={onSubmit}>
              <Text style={styles.primaryButtonText}>{t("admin.actions.save")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const EarnTaskModal = ({
  visible,
  form,
  onChange,
  onClose,
  onSubmit,
  isSaving
}: {
  visible: boolean;
  form: EarnTaskFormState;
  onChange: (form: EarnTaskFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSaving: boolean;
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const styles = useMemo(() => createModalStyles(theme), [theme]);

  const update = (patch: Partial<EarnTaskFormState>) => {
    onChange({ ...form, ...patch });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {form.id ? t("admin.earn.editTask") : t("admin.earn.createTask")}
          </Text>
          <ScrollView style={styles.modalContent}>
            <FormField
              label={t("admin.fields.slug")}
              value={form.id}
              onChangeText={(value) => update({ id: value })}
            />
            <FormField
              label={t("admin.fields.title")}
              value={form.title}
              onChangeText={(value) => update({ title: value })}
            />
            <FormField
              label={t("admin.fields.rewardLabel")}
              value={form.reward}
              onChangeText={(value) => update({ reward: value })}
              multiline
            />
            <FormField
              label={t("admin.fields.limitsLabel")}
              value={form.limits}
              onChangeText={(value) => update({ limits: value })}
              multiline
            />
            <FormField
              label={t("admin.fields.verificationLabel")}
              value={form.verification}
              onChangeText={(value) => update({ verification: value })}
              multiline
            />
            <FormField
              label={t("admin.fields.icon")}
              value={form.icon}
              onChangeText={(value) => update({ icon: value })}
            />
            <BooleanField
              label={t("admin.fields.isVisible")}
              value={form.isActive}
              onToggle={(value) => update({ isActive: value })}
            />
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>{t("admin.actions.cancel")}</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
              onPress={onSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{t("admin.actions.save")}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const TestModal = ({
  visible,
  form,
  onChange,
  onClose,
  onSubmit,
  testType,
  courses,
  books,
  t
}: {
  visible: boolean;
  form: TestFormState;
  onChange: (form: TestFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  testType: "course" | "book";
  courses: ContentCourse[];
  books: ContentBook[];
  t: Translate;
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createModalStyles(theme), [theme]);
  const dangerColor = getErrorColor(theme);

  const update = (patch: Partial<TestFormState>) => {
    onChange({ ...form, ...patch });
  };

  const updateQuestion = (index: number, patch: Partial<TestQuestionFormState>) => {
    const questions = [...form.questions];
    questions[index] = { ...questions[index], ...patch };
    onChange({ ...form, questions });
  };

  const updateAnswer = (qIndex: number, aIndex: number, patch: Partial<TestAnswerFormState>) => {
    const questions = [...form.questions];
    const answers = [...questions[qIndex].answers];
    answers[aIndex] = { ...answers[aIndex], ...patch };
    questions[qIndex] = { ...questions[qIndex], answers };
    onChange({ ...form, questions });
  };

  const addQuestion = () => {
    onChange({
      ...form,
      questions: [
        ...form.questions,
        {
          prompt: "",
          explanation: "",
          answers: [
            { text: "", isCorrect: true },
            { text: "", isCorrect: false }
          ]
        }
      ]
    });
  };

  const removeQuestion = (index: number) => {
    const questions = form.questions.filter((_, i) => i !== index);
    onChange({ ...form, questions });
  };

  const addAnswer = (index: number) => {
    const questions = [...form.questions];
    const answers = [...questions[index].answers, { text: "", isCorrect: false }];
    questions[index] = { ...questions[index], answers };
    onChange({ ...form, questions });
  };

  const removeAnswer = (qIndex: number, aIndex: number) => {
    const questions = [...form.questions];
    const answers = questions[qIndex].answers.filter((_, index) => index !== aIndex);
    questions[qIndex] = { ...questions[qIndex], answers };
    onChange({ ...form, questions });
  };

  const targetOptions = testType === "course"
    ? courses.map((course) => ({ value: course.slug, label: course.title }))
    : books.map((book) => ({ value: book.slug, label: book.title }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContainerLarge}>
          <Text style={styles.modalTitle}>
            {form.id ? t("admin.tests.editTest") : t("admin.tests.createTest")}
          </Text>
          <ScrollView style={styles.modalContent}>
            <FormField label={t("admin.fields.title")} value={form.title} onChangeText={(value) => update({ title: value })} />
            <FormField label={t("admin.fields.description")} value={form.description} onChangeText={(value) => update({ description: value })} multiline />
            <FormSelect
              label={testType === "course" ? t("admin.fields.course") : t("admin.fields.book")}
              value={form.targetSlug}
              options={targetOptions}
              onChange={(value) => update({ targetSlug: value })}
            />
            <View style={styles.questionHeader}>
              <Text style={styles.sectionTitle}>{t("admin.tests.questionsTitle")}</Text>
              <Pressable style={styles.secondaryButton} onPress={addQuestion}>
                <Ionicons name="add" size={16} color={theme.colors.accent} />
                <Text style={styles.secondaryButtonAccent}>{t("admin.tests.addQuestion")}</Text>
              </Pressable>
            </View>
            {form.questions.length === 0 ? (
              <Text style={styles.emptyText}>{t("admin.tests.empty")}</Text>
            ) : (
              form.questions.map((question, qIndex) => (
                <View key={`question-${qIndex}`} style={styles.questionCard}>
                  <View style={styles.questionHeaderRow}>
                    <Text style={styles.itemTitle}>{t("admin.tests.questionLabel", { index: qIndex + 1 })}</Text>
                    <Pressable onPress={() => removeQuestion(qIndex)}>
                      <Ionicons name="trash-outline" size={18} color={dangerColor} />
                    </Pressable>
                  </View>
                  <FormField
                    label={t("admin.fields.prompt")}
                    value={question.prompt}
                    onChangeText={(value) => updateQuestion(qIndex, { prompt: value })}
                    multiline
                  />
                  <FormField
                    label={t("admin.fields.explanation")}
                    value={question.explanation}
                    onChangeText={(value) => updateQuestion(qIndex, { explanation: value })}
                    multiline
                  />
                  <Text style={styles.answersTitle}>{t("admin.fields.answers")}</Text>
                  {question.answers.map((answer, aIndex) => (
                    <View key={`answer-${aIndex}`} style={styles.answerRow}>
                      <FormField
                        label={`${t("admin.fields.answerText")} #${aIndex + 1}`}
                        value={answer.text}
                        onChangeText={(value) => updateAnswer(qIndex, aIndex, { text: value })}
                      />
                      <BooleanField
                        label={t("admin.fields.isCorrect")}
                        value={answer.isCorrect}
                        onToggle={(value) => updateAnswer(qIndex, aIndex, { isCorrect: value })}
                      />
                      {question.answers.length > 1 && (
                        <Pressable onPress={() => removeAnswer(qIndex, aIndex)}>
                          <Ionicons name="remove-circle-outline" size={20} color={dangerColor} />
                        </Pressable>
                      )}
                    </View>
                  ))}
                  <Pressable style={styles.secondaryButton} onPress={() => addAnswer(qIndex)}>
                    <Ionicons name="add" size={16} color={theme.colors.accent} />
                    <Text style={styles.secondaryButtonAccent}>{t("admin.tests.addAnswer")}</Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>{t("admin.actions.cancel")}</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={onSubmit}>
              <Text style={styles.primaryButtonText}>{t("admin.actions.save")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const FormField = ({
  label,
  value,
  onChangeText,
  multiline = false,
  keyboardType
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createFormStyles(theme), [theme]);
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        placeholder=""
        placeholderTextColor={theme.colors.textSecondary}
      />
    </View>
  );
};

const FormSelect = ({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createFormStyles(theme), [theme]);
  const [isPickerVisible, setPickerVisible] = useState(false);

  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        style={styles.selectButton}
        onPress={() => setPickerVisible(true)}
      >
        <Text style={styles.selectButtonText}>
          {selected ? selected.label : label}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Modal visible={isPickerVisible} transparent animationType="fade">
        <Pressable style={styles.pickerBackdrop} onPress={() => setPickerVisible(false)}>
          <View style={styles.pickerContainer}>
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  style={styles.pickerOption}
                  onPress={() => {
                    onChange(option.value);
                    setPickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      option.value === value && styles.pickerOptionTextActive
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const BooleanField = ({
  label,
  value,
  onToggle
}: {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createFormStyles(theme), [theme]);
  return (
    <View style={styles.switchRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: theme.colors.accent, false: theme.colors.surfaceAlt }}
        thumbColor={value ? getOnAccentColor(theme) : theme.colors.textSecondary}
      />
    </View>
  );
};

const createStyles = (theme: ThemeDefinition) => {
  const onAccent = getOnAccentColor(theme);
  const danger = getErrorColor(theme);
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 16
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    tabRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12
    },
    tabButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceAlt
    },
    tabButtonActive: {
      backgroundColor: theme.colors.accent
    },
    tabButtonText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary
    },
    tabButtonTextActive: {
      color: onAccent
    },
    sectionContainer: {
      paddingBottom: 160
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
      marginTop: 16
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.accent
    },
    actionButtonText: {
      fontSize: 13,
      fontWeight: "600",
      color: onAccent
    },
    itemCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    earnTaskHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8
    },
    itemHeader: {
      marginBottom: 8
    },
    itemHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    itemSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    itemMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12
    },
    itemMetaColumn: {
      marginTop: 8,
      gap: 4
    },
    itemMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    itemActions: {
      marginTop: 12,
      flexDirection: "row",
      gap: 10
    },
    secondaryButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      flexDirection: "row",
      alignItems: "center",
      gap: 6
    },
    secondaryButtonText: {
      fontSize: 13,
      color: theme.colors.accent,
      fontWeight: "600"
    },
    secondaryButtonAccent: {
      fontSize: 13,
      color: theme.colors.accent,
      fontWeight: "600"
    },
    destructiveButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: danger
    },
    destructiveButtonText: {
      fontSize: 13,
      color: danger,
      fontWeight: "600"
    },
    readonlyText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontStyle: "italic"
    },
    emptyText: {
      marginTop: 12,
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    loaderRow: {
      paddingVertical: 32,
      alignItems: "center"
    },
    toggleRow: {
      flexDirection: "row",
      borderRadius: 14,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 16
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: theme.colors.surface
    },
    toggleButtonActive: {
      backgroundColor: theme.colors.accent
    },
    toggleButtonText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: "600"
    },
    toggleButtonTextActive: {
      color: onAccent
    },
    questionCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      marginBottom: 12,
      backgroundColor: theme.colors.surface
    },
    questionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8
    },
    questionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10
    },
    answersTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginTop: 8,
      marginBottom: 6
    },
    answerRow: {
      marginBottom: 10
    }
  });
};

const createModalStyles = (theme: ThemeDefinition) => {
  const onAccent = getOnAccentColor(theme);
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16
    },
    modalContainer: {
      width: "100%",
      maxHeight: "90%",
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      padding: 16
    },
    modalContainerLarge: {
      width: "100%",
      height: "90%",
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      padding: 16
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 12
    },
    modalContent: {
      flexGrow: 0
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      marginTop: 12
    },
    emptyText: {
      marginTop: 8,
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    questionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 16,
      marginBottom: 8
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    questionCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      marginBottom: 12,
      backgroundColor: theme.colors.surfaceAlt
    },
    contentEditorContainer: {
      marginTop: 16,
      gap: 12
    },
    structuredItem: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      backgroundColor: theme.colors.surfaceAlt,
      gap: 8
    },
    structuredHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    structuredIndex: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary
    },
    structuredRemoveButton: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface
    },
    structuredRemoveButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: getErrorColor(theme)
    },
    questionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10
    },
    itemTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary
    },
    answersTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginTop: 8,
      marginBottom: 6
    },
    answerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8
    },
    primaryButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.accent,
      borderRadius: 12
    },
    primaryButtonDisabled: {
      opacity: 0.7
    },
    primaryButtonText: {
      color: onAccent,
      fontWeight: "600"
    },
    secondaryButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    secondaryButtonText: {
      color: theme.colors.textSecondary,
      fontWeight: "600"
    },
    secondaryButtonAccent: {
      color: theme.colors.accent,
      fontWeight: "600"
    },
    pickerBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.3)",
      justifyContent: "center",
      padding: 24
    },
    pickerContainer: {
      maxHeight: "60%",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingVertical: 12
    },
    pickerOption: {
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    pickerOptionText: {
      fontSize: 14,
      color: theme.colors.textSecondary
    },
    pickerOptionTextActive: {
      color: theme.colors.textPrimary,
      fontWeight: "600"
    }
  });
};

const createFormStyles = (theme: ThemeDefinition) =>
  StyleSheet.create({
    fieldContainer: {
      marginBottom: 12
    },
    fieldLabel: {
      marginBottom: 6,
      fontSize: 13,
      color: theme.colors.textPrimary,
      fontWeight: "600"
    },
    fieldInput: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceAlt
    },
    fieldInputMultiline: {
      minHeight: 140,
      textAlignVertical: "top"
    },
    selectButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.surfaceAlt,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    selectButtonText: {
      fontSize: 14,
      color: theme.colors.textPrimary
    },
    pickerBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.3)",
      justifyContent: "center",
      padding: 24
    },
    pickerContainer: {
      maxHeight: "60%",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingVertical: 12
    },
    pickerOption: {
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    pickerOptionText: {
      fontSize: 14,
      color: theme.colors.textSecondary
    },
    pickerOptionTextActive: {
      color: theme.colors.textPrimary,
      fontWeight: "600"
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 6
    }
  });

export default AdminScreen;
