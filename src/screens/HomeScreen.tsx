import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  GestureResponderEvent,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Image,
  SafeAreaView,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COURSE_REWARD_BY_DIFFICULTY, BOOK_COMPLETION_REWARD } from "../constants/data";
import { notionPageIds } from "../constants/notionPages";
import { useTheme } from "../hooks/useTheme";
import { useLocalization } from "../hooks/useLocalization";
import { useLibrary } from "../hooks/useLibrary";
import { useLevel } from "../hooks/useLevel";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { useDailyStreak } from "../hooks/useDailyStreak";
import type { ThemeDefinition } from "../theme/themes";
import type { BookDetailSection } from "../types/library";
import { loadNotionBookSections } from "../services/notion";
import type { DailyStreakCalendarDay } from "../providers/DailyStreakProvider";
import { useContent } from "../hooks/useContent";
import type {
  Book as ContentBook,
  BookCategory,
  Course as ContentCourse,
  CourseCategory
} from "../types/content";

type Translate = (key: string, params?: Record<string, string | number>) => string;
type ScreenStyles = ReturnType<typeof createStyles>;

type BookSectionsSource = "notion" | "fallback" | "manual";

type BookSectionsState = {
  sections: BookDetailSection[];
  source: BookSectionsSource;
  error?: string;
};

type CourseDetailModalProps = {
  visible: boolean;
  course: ContentCourse | null;
  sections: BookDetailSection[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
  onComplete: () => void;
  styles: ScreenStyles;
  t: Translate;
  theme: ThemeDefinition;
  languageCode: string;
};

function CourseDetailModal({
  visible,
  course,
  sections,
  activeIndex,
  onChangeIndex,
  onClose,
  onComplete,
  styles,
  t,
  theme,
  languageCode
}: CourseDetailModalProps) {
  if (!course) {
    return null;
  }

  const resolvedSections = sections.length > 0
    ? sections
    : [
        {
          title: "",
          body: course.content ?? course.summary ?? ""
        }
      ];
  const totalSections = resolvedSections.length;
  const clampedIndex = totalSections > 0 ? Math.max(0, Math.min(activeIndex, totalSections - 1)) : 0;
  const activeSection = resolvedSections[clampedIndex];
  const sectionTitle = activeSection && activeSection.title.trim().length > 0
    ? activeSection.title.trim()
    : t("courses.sectionUntitled", { index: clampedIndex + 1 });
  const sectionBody = (activeSection?.body ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const canGoPrevious = clampedIndex > 0;
  const canGoNext = clampedIndex < totalSections - 1;
  const progressLabel =
    totalSections > 0
      ? t("courses.sectionProgressLabel", { current: clampedIndex + 1, total: totalSections })
      : t("courses.sectionsEmpty");
  const courseReward = COURSE_REWARD_BY_DIFFICULTY[course.difficulty];
  const rewardLabel = t("courses.rewardLabel", {
    amount: courseReward.toLocaleString(languageCode)
  });

  const handlePrev = () => {
    if (canGoPrevious) {
      onChangeIndex(clampedIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onChangeIndex(clampedIndex + 1);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.bookModalBackdrop}>
        <SafeAreaView style={styles.bookModalContainer}>
          <View style={styles.readerTopBar}>
            <Pressable style={styles.readerActionButton} onPress={onClose}>
              <Ionicons name="chevron-down" size={22} color={theme.colors.textPrimary} />
            </Pressable>
            <View style={styles.readerTitleBlock}>
              <Text style={styles.readerBookTitle} numberOfLines={2}>
                {course.title}
              </Text>
              <Text style={styles.readerBookAuthor} numberOfLines={1}>
                {t(`courses.difficulty.${course.difficulty}`)}
              </Text>
              <Text style={styles.readerBookReward} numberOfLines={1}>
                {rewardLabel}
              </Text>
            </View>
            <View style={styles.readerActionPlaceholder} />
          </View>

          <View style={styles.readerBody}>
            {totalSections === 0 ? (
              <View style={styles.readerCenteredState}>
                <Text style={styles.bookModalNoticeText}>{t("courses.sectionsEmpty")}</Text>
              </View>
            ) : (
              <>
                <View style={styles.readerChapterHeader}>
                  <Pressable
                    style={[styles.readerNavigateButton, !canGoPrevious && styles.readerNavigateDisabled]}
                    onPress={handlePrev}
                    disabled={!canGoPrevious}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={canGoPrevious ? theme.colors.textPrimary : theme.colors.textSecondary}
                    />
                  </Pressable>
                  <View style={styles.readerChapterMeta}>
                    <Text style={styles.readerChapterTitle} numberOfLines={2}>
                      {sectionTitle}
                    </Text>
                    <Text style={styles.readerChapterCounter}>{progressLabel}</Text>
                  </View>
                  <Pressable
                    style={[styles.readerNavigateButton, !canGoNext && styles.readerNavigateDisabled]}
                    onPress={handleNext}
                    disabled={!canGoNext}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={canGoNext ? theme.colors.textPrimary : theme.colors.textSecondary}
                    />
                  </Pressable>
                </View>
                <ScrollView
                  style={styles.readerContentScroll}
                  contentContainerStyle={styles.readerContentContainer}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.readerContentWrapper}>
                    {sectionBody.length > 0 ? (
                      sectionBody.map((line, index) => (
                        <Text key={`course-section-line-${index}`} style={styles.readerParagraph}>
                          {line}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.readerParagraph}>{t("courses.sectionsEmpty")}</Text>
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>

          <View style={styles.bookModalActions}>
            <Pressable style={styles.bookModalActionPrimary} onPress={onComplete}>
              <Text style={styles.bookModalActionPrimaryText}>{t("levels.markCourseComplete")}</Text>
            </Pressable>
            <Pressable style={styles.bookModalActionSecondary} onPress={onClose}>
              <Text style={styles.bookModalActionSecondaryText}>{t("actions.close")}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}


type InProgressShelfItem = {
  key: string;
  title: string;
  subtitle: string;
  progress: number;
  progressLabel: string;
  onPress: () => void;
};

type InProgressShelfProps = {
  styles: ScreenStyles;
  t: Translate;
  type: "course" | "book";
  items: InProgressShelfItem[];
};

const formatUsageDuration = (
  seconds: number,
  t: Translate,
  formatter: Intl.NumberFormat
): string => {
  if (seconds <= 0) {
    return t("profile.usage.lessThanMinute");
  }

  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return t("profile.usage.minutesOnly", {
      minutes: formatter.format(minutes)
    });
  }

  if (minutes === 0) {
    return t("profile.usage.hoursOnly", {
      hours: formatter.format(hours)
    });
  }

  return t("profile.usage.hoursMinutes", {
    hours: formatter.format(hours),
    minutes: formatter.format(minutes)
  });
};

type HomeScreenMode = "courses" | "books";

type HomeScreenProps = {
  mode: HomeScreenMode;
};

const HomeScreen = ({ mode }: HomeScreenProps) => {
  const [libraryCategory, setLibraryCategory] = useState<string>("all");
  const [courseCategory, setCourseCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [bookDetailVisible, setBookDetailVisible] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<ContentBook | null>(null);
  const [bookSectionsState, setBookSectionsState] = useState<Record<string, BookSectionsState>>({});
  const [loadingBookId, setLoadingBookId] = useState<string | null>(null);
  const [bookChapterIndices, setBookChapterIndices] = useState<Record<string, number>>({});
  const [courseDetailVisible, setCourseDetailVisible] = useState<boolean>(false);
  const [selectedCourse, setSelectedCourse] = useState<ContentCourse | null>(null);
  const [selectedCourseSections, setSelectedCourseSections] = useState<BookDetailSection[]>([]);
  const [activeCourseSectionIndex, setActiveCourseSectionIndex] = useState<number>(0);

  const { theme } = useTheme();
  const { language, t } = useLocalization();
  const {
    addBookToLibrary,
    isBookOwned,
    isBookInProgress,
    ownedBookIds,
    progressBookIds,
    completeChapter,
    getCompletedChapterIndex,
    setBookChapterTotal,
    getBookProgress
  } = useLibrary();
  const {
    level,
    currentLevelXp,
    levelXpTarget,
    xpToNextLevel,
    stageKey,
    courseXpReward,
    bookXpReward,
    completedCourseIds,
    completedBookIds,
    markCourseComplete,
    markBookComplete
  } = useLevel();
  const { addTokens } = useTokenBalance();
  const {
    requiredBookPages,
    requiredCourseMinutes,
    registerBookCompletion,
    registerCourseCompletion
  } = useDailyStreak();
  const {
    courses: contentCourses,
    courseCategories: contentCourseCategories,
    books: contentBooks,
    bookCategories: contentBookCategories,
    isLoading: isContentLoading,
  } = useContent();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const filteredCourses = useMemo(() => {
    if (courseCategory === "all") {
      return contentCourses;
    }
    if (courseCategory === "my-courses") {
      return contentCourses.filter((course) => completedCourseIds.includes(course.id));
    }
    return contentCourses.filter((course) => course.categorySlug === courseCategory);
  }, [contentCourses, courseCategory, completedCourseIds]);

  const filteredBooks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return contentBooks.filter((book) => {
      const owned = ownedBookIds.includes(book.id);
      let matchesCategory = false;

      if (libraryCategory === "all") {
        matchesCategory = true;
      } else if (libraryCategory === "my-library") {
        matchesCategory = owned;
      } else {
        matchesCategory = book.categorySlug === libraryCategory;
      }

      if (!matchesCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      const title = book.title.toLowerCase();
      const author = (book.author ?? "").toLowerCase();
      return title.includes(query) || author.includes(query);
    });
  }, [contentBooks, libraryCategory, ownedBookIds, searchTerm]);

  const libraryFilters = useMemo(
    () => [
      { id: "all", label: t("library.categories.all") },
      { id: "my-library", label: t("library.categories.myLibrary") },
      ...contentBookCategories.map((category) => ({
        id: category.id,
        label: category.label
      }))
    ],
    [contentBookCategories, t]
  );

  const inProgressCourses = useMemo(() => {
    if (completedCourseIds.length === 0) {
      return [] as ContentCourse[];
    }
    return contentCourses
      .filter((course) => completedCourseIds.includes(course.id))
      .slice(0, 6);
  }, [completedCourseIds, contentCourses]);

  const inProgressBooks = useMemo(() => {
    if (progressBookIds.length === 0) {
      return [] as ContentBook[];
    }
    return progressBookIds
      .map((id) => contentBooks.find((book) => book.id === id))
      .filter((book): book is ContentBook => Boolean(book))
      .slice(0, 6);
  }, [contentBooks, progressBookIds]);

  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        style: "percent",
        maximumFractionDigits: 0
      }),
    [language]
  );
  const showInProgressCourses = mode === "courses" && inProgressCourses.length > 0;
  const showInProgressBooks = mode === "books" && inProgressBooks.length > 0;

  const handleBookPress = (book: ContentBook) => {
    setSelectedBook(book);
    setBookDetailVisible(true);
    setBookChapterIndices((prev) => {
      const existing = prev[book.id];
      if (typeof existing === "number") {
        return prev;
      }
      const completedIndex = getCompletedChapterIndex(book.id);
      const initialIndex = Math.max(0, completedIndex + 1);
      return {
        ...prev,
        [book.id]: initialIndex
      };
    });

    setBookSectionsState((prev) => {
      const existing = prev[book.id];
      if (existing && existing.source === "notion") {
        return prev;
      }
      const fallbackSections = buildBookSections(book.synopsis ?? "");
      return {
        ...prev,
        [book.id]: {
          sections: fallbackSections,
          source: "fallback",
          error: undefined
        }
      };
    });

    fetchBookSections(book);
  };

  const handleBookAcquire = (book: ContentBook) => {
    if (isBookOwned(book.id)) {
      return;
    }
    const added = addBookToLibrary(book.id);
    if (added) {
      setBookChapterIndices((prev) => ({
        ...prev,
        [book.id]: 0
      }));
      Alert.alert(
        t("library.book.addedTitle"),
        t("library.book.addedMessage", { title: book.title })
      );
    }
  };

  const handleBookComplete = (book: ContentBook) => {
    const added = markBookComplete(book.id);
    if (added) {
      addTokens(BOOK_COMPLETION_REWARD);
      const streakResult = registerBookCompletion(book.pages);
      if (streakResult.awarded) {
        addTokens(streakResult.reward);
      }
      const baseMessage = t("levels.bookCompleteMessage", {
        xp: bookXpReward,
        tokens: BOOK_COMPLETION_REWARD.toLocaleString(language)
      });
      let streakMessage: string | undefined;
      if (streakResult.awarded) {
        streakMessage = t("dailyStreak.rewardGranted", {
          reward: streakResult.reward,
          streak: streakResult.streak
        });
      } else if (streakResult.reason === "alreadyCompleted") {
        streakMessage = t("dailyStreak.rewardAlreadyCounted");
      } else if (streakResult.reason === "insufficientPages") {
        streakMessage = t("dailyStreak.requirementBookShort", { pages: requiredBookPages });
      }
      const message = streakMessage ? `${baseMessage}\n\n${streakMessage}` : baseMessage;
      Alert.alert(t("levels.bookCompleteTitle"), message);
      setBookDetailVisible(false);
    } else {
      Alert.alert(t("levels.alreadyCompletedTitle"), t("levels.bookAlreadyCompleted"));
    }
  };

  const handleChapterChange = useCallback(
    (book: ContentBook, chapterIndex: number, chapterCount: number) => {
      if (chapterCount <= 0) {
        return false;
      }
      const cappedIndex = Math.max(0, Math.min(chapterIndex, chapterCount - 1));
      const completedIndex = getCompletedChapterIndex(book.id);
      const maxUnlocked = Math.min(completedIndex + 1, chapterCount - 1);
      if (cappedIndex > maxUnlocked) {
        return false;
      }
      setBookChapterIndices((prev) => ({
        ...prev,
        [book.id]: cappedIndex
      }));
      return true;
    },
    [getCompletedChapterIndex]
  );

  const handleChapterComplete = useCallback(
    (book: ContentBook, chapterIndex: number, chapterCount: number) => {
      if (chapterCount <= 0) {
        return false;
      }
      const result = completeChapter(book.id, chapterIndex, chapterCount);
      if (!result.updated) {
        return false;
      }
      const nextIndex = Math.min(chapterIndex + 1, chapterCount - 1);
      setBookChapterIndices((prev) => ({
        ...prev,
        [book.id]: nextIndex
      }));
      if (result.completedAll) {
        Alert.alert(
          t("library.bookDetails.allChaptersDoneTitle"),
          t("library.bookDetails.allChaptersDoneMessage", { title: book.title })
        );
      }
      return true;
    },
    [completeChapter, t]
  );

  const completeCourse = useCallback(
    (course: ContentCourse) => {
      const courseReward = COURSE_REWARD_BY_DIFFICULTY[course.difficulty];
      const formattedReward = courseReward.toLocaleString(language);
      const added = markCourseComplete(course.id);
      if (added) {
        addTokens(courseReward);
        const streakResult = registerCourseCompletion(course.durationMinutes);
        if (streakResult.awarded) {
          addTokens(streakResult.reward);
        }
        const baseMessage = t("levels.courseCompleteMessage", {
          xp: courseXpReward,
          tokens: formattedReward
        });
        let streakMessage: string | undefined;
        if (streakResult.awarded) {
          streakMessage = t("dailyStreak.rewardGranted", {
            reward: streakResult.reward,
            streak: streakResult.streak
          });
        } else if (streakResult.reason === "alreadyCompleted") {
          streakMessage = t("dailyStreak.rewardAlreadyCounted");
        } else if (streakResult.reason === "insufficientMinutes") {
          streakMessage = t("dailyStreak.requirementCourseShort", {
            minutes: requiredCourseMinutes
          });
        }
        const message = streakMessage ? `${baseMessage}\n\n${streakMessage}` : baseMessage;
        Alert.alert(t("levels.courseCompleteTitle"), message);
        return true;
      }
      Alert.alert(t("levels.alreadyCompletedTitle"), t("levels.courseAlreadyCompleted"));
      return false;
    },
    [
      addTokens,
      courseXpReward,
      language,
      markCourseComplete,
      registerCourseCompletion,
      requiredCourseMinutes,
      t
    ]
  );

  const handleCoursePress = (course: ContentCourse) => {
    const extras = (course.extras ?? {}) as { sections?: BookDetailSection[] };
    const manualSections = Array.isArray(extras.sections) ? extras.sections : [];
    if (manualSections.length > 0) {
      setSelectedCourse(course);
      setSelectedCourseSections(manualSections);
      setActiveCourseSectionIndex(0);
      setCourseDetailVisible(true);
      return;
    }

    const courseTitle = course.title;
    const courseSummary = course.summary ?? "";
    const promptMessage = `${courseSummary}\n\n${t("levels.coursePromptMessage", { course: courseTitle })}`;
    Alert.alert(
      courseTitle,
      promptMessage,
      [
        {
          text: t("levels.markCourseComplete"),
          onPress: () => {
            completeCourse(course);
          }
        },
        {
          text: t("actions.close"),
          style: "cancel"
        }
      ]
    );
  };

  const fetchBookSections = useCallback(
    async (book: ContentBook, options: { force?: boolean } = {}) => {
      const { force = false } = options;
      const notionPageId = notionPageIds[book.id];
      const manualSections = Array.isArray(((book.extras ?? {}) as { chapters?: BookDetailSection[] }).chapters)
        ? (((book.extras ?? {}) as { chapters?: BookDetailSection[] }).chapters as BookDetailSection[])
        : undefined;
      if (!force && manualSections && manualSections.length > 0) {
        setBookSectionsState((prev) => ({
          ...prev,
          [book.id]: {
            sections: manualSections,
            source: "manual",
            error: undefined
          }
        }));
        setBookChapterTotal(book.id, manualSections.length);
        return;
      }
      if (!force) {
        const existing = bookSectionsState[book.id];
        if (existing && existing.source === "notion") {
          return;
        }
      }

      setLoadingBookId(book.id);
      try {
        let sections: BookDetailSection[] = [];
        let source: BookSectionsSource = "fallback";
        let errorMessage: string | undefined;

        if (notionPageId) {
          const notionSections = await loadNotionBookSections(notionPageId);
          const normalizedNotionSections = normalizeBookSections(notionSections);
          if (normalizedNotionSections.length > 0) {
            sections = normalizedNotionSections;
            source = "notion";
          } else {
            errorMessage = t("library.bookDetails.empty");
          }
        } else {
          sections = [];
        }

        if (manualSections && manualSections.length > 0) {
          sections = manualSections;
          source = "manual";
          errorMessage = undefined;
        }

        if (sections.length === 0) {
          const fallbackSections = buildBookSections(book.synopsis ?? "");
          sections = fallbackSections;
          if (!errorMessage && notionPageId) {
            errorMessage = t("library.bookDetails.empty");
          }
        }

        setBookSectionsState((prev) => ({
          ...prev,
          [book.id]: {
            sections,
            source,
            error: source === "notion" ? undefined : errorMessage
          }
        }));
        if (sections.length > 0) {
          setBookChapterTotal(book.id, sections.length);
        }
      } catch (error) {
        console.warn("Failed to load Notion book sections", error);
        const fallbackSections = manualSections && manualSections.length > 0
          ? manualSections
          : buildBookSections(book.synopsis ?? "");
        const fallbackSource: BookSectionsSource = manualSections && manualSections.length > 0 ? "manual" : "fallback";
        setBookSectionsState((prev) => ({
          ...prev,
          [book.id]: {
            sections: fallbackSections,
            source: fallbackSource,
            error: fallbackSource === "fallback" ? t("library.bookDetails.error") : undefined
          }
        }));
        if (fallbackSections.length > 0) {
          setBookChapterTotal(book.id, fallbackSections.length);
        }
      } finally {
        setLoadingBookId((current) => (current === book.id ? null : current));
      }
    },
    [bookSectionsState, t]
  );

  const selectedBookState = selectedBook ? bookSectionsState[selectedBook.id] : undefined;
  const selectedBookSections = selectedBookState?.sections ?? [];
  useEffect(() => {
    if (selectedBook && selectedBookSections.length > 0) {
      setBookChapterTotal(selectedBook.id, selectedBookSections.length);
    }
  }, [selectedBook, selectedBookSections, setBookChapterTotal]);
  const isSectionsLoading = selectedBook ? loadingBookId === selectedBook.id : false;
  const isUsingFallbackSections = selectedBookState?.source === "fallback";
  const selectedBookErrorMessage = selectedBookState?.error;
  const selectedBookActiveChapter = selectedBook ? bookChapterIndices[selectedBook.id] ?? 0 : 0;
  const selectedBookCompletedChapterIndex = selectedBook ? getCompletedChapterIndex(selectedBook.id) : -1;
  const selectedBookOwned = selectedBook ? isBookOwned(selectedBook.id) : false;

  const handleCourseModalClose = useCallback(() => {
    setCourseDetailVisible(false);
    setSelectedCourse(null);
    setSelectedCourseSections([]);
    setActiveCourseSectionIndex(0);
  }, []);

  const handleCourseModalComplete = useCallback(() => {
    if (!selectedCourse) {
      return;
    }
    const success = completeCourse(selectedCourse);
    if (success) {
      handleCourseModalClose();
    }
  }, [completeCourse, handleCourseModalClose, selectedCourse]);

  const handleCourseSectionIndexChange = useCallback(
    (index: number) => {
      setActiveCourseSectionIndex(() => {
        if (selectedCourseSections.length === 0) {
          return 0;
        }
        return Math.max(0, Math.min(index, selectedCourseSections.length - 1));
      });
    },
    [selectedCourseSections]
  );

  const isSelectedBookCompleted = useMemo(() => {
    if (!selectedBook) {
      return false;
    }
    return completedBookIds.includes(selectedBook.id);
  }, [selectedBook, completedBookIds]);

  useEffect(() => {
    if (!selectedBook) {
      return;
    }
    const sections = selectedBookSections;
    if (sections.length === 0) {
      return;
    }
    const maxUnlocked = Math.min(selectedBookCompletedChapterIndex + 1, sections.length - 1);
    const safeIndex = Math.max(
      0,
      Math.min(selectedBookActiveChapter, maxUnlocked >= 0 ? maxUnlocked : 0)
    );
    if (safeIndex !== selectedBookActiveChapter) {
      setBookChapterIndices((prev) => ({
        ...prev,
        [selectedBook.id]: safeIndex
      }));
    }
  }, [
    selectedBook,
    selectedBookSections,
    selectedBookCompletedChapterIndex,
    selectedBookActiveChapter
  ]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {showInProgressCourses ? (
          <InProgressShelf
            styles={styles}
            t={t}
            type="course"
            items={inProgressCourses.map((course) => {
              const extras = (course.extras ?? {}) as { progress?: unknown };
              const extrasProgress =
                typeof extras.progress === "number" ? extras.progress : undefined;
              const computedProgress = extrasProgress ?? (completedCourseIds.includes(course.id) ? 1 : 0);
              const progress = Math.max(0, Math.min(1, computedProgress));
              return {
                key: `course-${course.id}`,
                title: course.title,
                subtitle: course.category?.title ?? t("courses.sectionTitle"),
                progress,
                progressLabel: percentFormatter.format(progress),
                onPress: () => handleCoursePress(course)
              };
            })}
          />
        ) : null}

        {showInProgressBooks ? (
          <InProgressShelf
            styles={styles}
            t={t}
            type="book"
            items={inProgressBooks.map((book) => {
              const sections = bookSectionsState[book.id]?.sections ?? [];
              const { progress } = getBookProgress(book.id, sections.length);
              const completedProgress = completedBookIds.includes(book.id) ? 1 : progress;
              const clamped = Math.max(0, Math.min(1, completedProgress));
              return {
                key: `book-${book.id}`,
                title: book.title,
                subtitle:
                  (book.author ?? "").trim().length > 0
                    ? (book.author as string)
                    : t("library.book.authorUnknown"),
                progress: clamped,
                progressLabel: percentFormatter.format(clamped),
                onPress: () => handleBookPress(book)
              };
            })}
          />
        ) : null}

        {mode === "books" && (
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder={t("library.searchPlaceholder")}
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.searchInput}
            />
            {searchTerm.trim().length > 0 && (
              <Pressable onPress={() => setSearchTerm("")} style={styles.clearSearch}>
                <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            )}
          </View>
        )}

        {mode === "courses" && (
          <CoursesSection
            styles={styles}
            theme={theme}
            t={t}
            courses={filteredCourses}
            categories={contentCourseCategories}
            activeCategory={courseCategory}
            onCategoryChange={setCourseCategory}
            onCoursePress={handleCoursePress}
            languageCode={language}
            completedCourseIds={completedCourseIds}
            isLoading={isContentLoading}
          />
        )}

        {mode === "books" && (
          <LibrarySection
            styles={styles}
            t={t}
            books={filteredBooks}
            filters={libraryFilters}
            activeCategory={libraryCategory}
            onCategoryChange={setLibraryCategory}
            onBookPress={handleBookPress}
            onBookGet={handleBookAcquire}
            isBookOwned={isBookOwned}
            isMyLibraryCategory={libraryCategory === "my-library"}
            theme={theme}
            languageCode={language}
            isLoading={isContentLoading}
          />
        )}

      </ScrollView>
      <CourseDetailModal
        visible={courseDetailVisible}
        course={selectedCourse}
        sections={selectedCourseSections}
        activeIndex={activeCourseSectionIndex}
        onChangeIndex={handleCourseSectionIndexChange}
        onClose={handleCourseModalClose}
        onComplete={handleCourseModalComplete}
        styles={styles}
        t={t}
        theme={theme}
        languageCode={language}
      />
      <BookDetailModal
        visible={bookDetailVisible}
        book={selectedBook}
        sections={selectedBookSections}
        onClose={() => setBookDetailVisible(false)}
        onComplete={(book) => handleBookComplete(book)}
        styles={styles}
        t={t}
        xpReward={bookXpReward}
        isCompleted={isSelectedBookCompleted}
        isLoading={isSectionsLoading}
        isFallback={Boolean(isUsingFallbackSections)}
        errorMessage={selectedBookErrorMessage}
        onRetry={
          selectedBook
            ? () => {
                fetchBookSections(selectedBook, { force: true });
              }
            : undefined
        }
        theme={theme}
        isOwned={selectedBookOwned}
        onAcquire={handleBookAcquire}
        activeChapterIndex={selectedBookActiveChapter}
        onChapterChange={(book, index, total) => handleChapterChange(book, index, total)}
        onChapterComplete={(book, index, total) => handleChapterComplete(book, index, total)}
        completedChapterIndex={selectedBookCompletedChapterIndex}
        languageCode={language}
      />
    </View>
  );
};

type CoursesSectionProps = {
  styles: ScreenStyles;
  theme: ThemeDefinition;
  t: Translate;
  courses: ContentCourse[];
  categories: CourseCategory[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  onCoursePress: (course: ContentCourse) => void;
  languageCode: string;
  completedCourseIds: string[];
  isLoading: boolean;
};

const InProgressShelf = ({ styles, t, type, items }: InProgressShelfProps) => {
  if (items.length === 0) {
    return null;
  }

  const badgeLabel = type === "course" ? t("home.startedLabelCourse") : t("home.startedLabelBook");

  return (
    <View style={styles.progressSection}>
      <Text style={styles.progressTitle}>{t("home.startedSectionTitle")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.progressList}
      >
        {items.map((item) => (
          <Pressable key={item.key} style={styles.progressCard} onPress={item.onPress}>
            <View style={styles.progressTypeBadge}>
              <Text style={styles.progressTypeText}>{badgeLabel}</Text>
            </View>
            <Text style={styles.progressCardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.progressCardSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
            <View style={styles.progressCardProgressWrapper}>
              <Text style={styles.progressCardProgressLabel}>{item.progressLabel}</Text>
              <View style={styles.progressCardProgressTrack}>
                <View
                  style={[
                    styles.progressCardProgressFill,
                    { width: `${Math.max(0, Math.min(1, item.progress)) * 100}%` }
                  ]}
                />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const CoursesSection = ({
  styles,
  theme,
  t,
  courses,
  categories,
  activeCategory,
  onCategoryChange,
  onCoursePress,
  languageCode,
  completedCourseIds,
  isLoading
}: CoursesSectionProps) => {
  const filters = [
    { id: "all", label: t("courses.filters.all") },
    { id: "my-courses", label: t("courses.filters.myCourses") },
    ...categories.map((category) => ({
      id: category.id,
      label: category.title
    }))
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t("courses.sectionTitle")}</Text>
      <Text style={styles.sectionDescription}>{t("courses.sectionDescription")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.courseFiltersRow}
      >
        {filters.map((filter) => {
          const isActive = activeCategory === filter.id;
          return (
            <Pressable
              key={filter.id}
              onPress={() => onCategoryChange(filter.id)}
              style={[styles.courseFilterPill, isActive && styles.courseFilterPillActive]}
            >
              <Text
                style={[styles.courseFilterText, isActive && styles.courseFilterTextActive]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {isLoading ? (
        <View style={styles.courseEmptyState}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.courseEmptyState}>
          <Text style={styles.courseEmptyTitle}>
            {activeCategory === "my-courses"
              ? t("courses.emptyMyCoursesTitle")
              : t("courses.emptyTitle")}
          </Text>
          <Text style={styles.courseEmptySubtitle}>
            {activeCategory === "my-courses"
              ? t("courses.emptyMyCoursesSubtitle")
              : t("courses.emptySubtitle")}
          </Text>
        </View>
      ) : (
        <View style={styles.courseList}>
          {courses.map((course) => {
            const category = course.category ?? categories.find((cat) => cat.id === course.categorySlug);
            const rewardAmount = COURSE_REWARD_BY_DIFFICULTY[
              course.difficulty
            ].toLocaleString(languageCode);
            const owned = completedCourseIds.includes(course.id);
            return (
              <Pressable
                key={course.id}
                style={styles.courseCard}
                onPress={() => onCoursePress(course)}
              >
                <View style={styles.courseCover}>
                  <Image
                    source={{ uri: course.imageUrl }}
                    style={styles.courseCoverImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  <Text style={styles.courseSummary}>{course.summary ?? ""}</Text>
                  <View style={styles.courseMetaRow}>
                    {category && (
                      <>
                        <Text style={styles.courseMeta}>{category.title}</Text>
                        <Text style={styles.courseMetaDivider}>•</Text>
                      </>
                    )}
                    <Text style={styles.courseMeta}>
                      {t("courses.meta.duration", { minutes: course.durationMinutes })}
                    </Text>
                    <Text style={styles.courseMetaDivider}>•</Text>
                    <Text style={styles.courseMeta}>
                      {t(`courses.difficulty.${course.difficulty}`)}
                    </Text>
                  </View>
                  <Text style={styles.courseReward}>{t("courses.rewardLabel", { amount: rewardAmount })}</Text>
                  <Pressable
                    style={[
                      styles.courseActionButton,
                      owned && styles.courseActionButtonDisabled
                    ]}
                    onPress={(event) => {
                      event.stopPropagation();
                      if (!owned) {
                        onCoursePress(course);
                      }
                    }}
                    disabled={owned}
                  >
                    <Text
                      style={[
                        styles.courseActionButtonText,
                        owned && styles.courseActionButtonTextDisabled
                      ]}
                    >
                      {owned ? t("courses.action.completed") : t("courses.action.start")}
                    </Text>
                  </Pressable>
                </View>
                <View style={[styles.coursePriceBadge, owned && styles.coursePriceBadgeCompleted]}>
                  <Text
                    style={[
                      styles.coursePriceText,
                      owned && styles.coursePriceTextCompleted
                    ]}
                  >
                    {owned ? t("courses.badge.completed") : t("courses.badge.free")}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};

type LibrarySectionProps = {
  styles: ScreenStyles;
  t: Translate;
  books: ContentBook[];
  filters: { id: string; label: string }[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  onBookPress: (book: ContentBook) => void;
  onBookGet: (book: ContentBook) => void;
  isBookOwned: (bookId: string) => boolean;
  isMyLibraryCategory: boolean;
  theme: ThemeDefinition;
  languageCode: string;
  isLoading: boolean;
};

const LibrarySection = ({
  styles,
  t,
  books,
  filters,
  activeCategory,
  onCategoryChange,
  onBookPress,
  onBookGet,
  isBookOwned,
  isMyLibraryCategory,
  theme,
  languageCode,
  isLoading
}: LibrarySectionProps) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{t("library.categoriesTitle")}</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryPillsRow}
    >
      {filters.map((category) => {
        const isActive = activeCategory === category.id;
        return (
          <Pressable
            key={category.id}
            onPress={() => onCategoryChange(category.id)}
            style={[styles.categoryPill, isActive && styles.categoryPillActive]}
          >
            <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>
              {category.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>

    <Text style={[styles.sectionTitle, styles.sectionSpaceTop]}>{t("library.availableTitle")}</Text>
    {isLoading ? (
      <View style={styles.emptyState}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    ) : books.length === 0 ? (
      <View style={styles.emptyState}>
        <Ionicons name="search-outline" size={28} color={theme.colors.textSecondary} />
        <Text style={styles.emptyStateTitle}>
          {t(isMyLibraryCategory ? "library.emptyOwnedTitle" : "library.emptyTitle")}
        </Text>
        <Text style={styles.emptyStateSubtitle}>
          {t(isMyLibraryCategory ? "library.emptyOwnedSubtitle" : "library.emptySubtitle")}
        </Text>
      </View>
    ) : (
      <View style={styles.bookList}>
        {books.map((book) => {
          const owned = isBookOwned(book.id);
          const rewardLabel = t("library.bookRewardLabel", {
            amount: BOOK_COMPLETION_REWARD.toLocaleString(languageCode)
          });
          const authorName = (book.author ?? "").trim();
          const authorLabel = authorName.length > 0 ? authorName : t("library.book.authorUnknown");
          return (
            <Pressable key={book.id} onPress={() => onBookPress(book)} style={styles.bookCard}>
              <View style={styles.bookCover}>
                <Image source={{ uri: book.imageUrl }} style={styles.bookCoverImage} resizeMode="cover" />
              </View>
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookAuthor}>{authorLabel}</Text>
                <Text style={styles.bookMeta}>{t("library.pages", { pages: book.pages })}</Text>
                <Text style={styles.bookReward}>{rewardLabel}</Text>
                <Pressable
                  style={[styles.bookActionButton, owned && styles.bookActionButtonDisabled]}
                  onPress={(event: GestureResponderEvent) => {
                    event.stopPropagation();
                    if (!owned) {
                      onBookGet(book);
                    }
                  }}
                  disabled={owned}
                >
                  <Text
                    style={[
                      styles.bookActionButtonText,
                      owned && styles.bookActionButtonTextDisabled
                    ]}
                  >
                    {owned ? t("library.book.ownedCta") : t("library.book.getCta")}
                  </Text>
                </Pressable>
              </View>
              <View style={[styles.bookPriceBadge, owned && styles.bookPriceBadgeOwned]}>
                <Text style={[styles.bookPriceText, owned && styles.bookPriceTextOwned]}>
                  {owned ? t("library.badge.inLibrary") : t("library.badge.free")}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    )}
  </View>
);

type BookDetailModalProps = {
  visible: boolean;
  book: ContentBook | null;
  sections: BookDetailSection[];
  onClose: () => void;
  onComplete: (book: ContentBook) => void;
  styles: ScreenStyles;
  t: Translate;
  xpReward: number;
  isCompleted: boolean;
  isLoading: boolean;
  isFallback: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  theme: ThemeDefinition;
  isOwned: boolean;
  onAcquire: (book: ContentBook) => void;
  activeChapterIndex: number;
  onChapterChange: (book: ContentBook, chapterIndex: number, chapterCount: number) => boolean;
  onChapterComplete: (book: ContentBook, chapterIndex: number, chapterCount: number) => boolean;
  completedChapterIndex: number;
  languageCode: string;
};

const BookDetailModal = ({
  visible,
  book,
  sections,
  onClose,
  onComplete,
  styles,
  t,
  xpReward,
  isCompleted,
  isLoading,
  isFallback,
  errorMessage,
  onRetry,
  theme,
  isOwned,
  onAcquire,
  activeChapterIndex,
  onChapterChange,
  onChapterComplete,
  completedChapterIndex,
  languageCode
}: BookDetailModalProps) => {
  const [isChapterPickerVisible, setChapterPickerVisible] = useState(false);

  if (!book) {
    return null;
  }

  const bookTitle = book.title;
  const authorName = (book.author ?? "").trim();
  const author = authorName.length > 0 ? authorName : t("library.book.authorUnknown");
  const bookRewardLabel = t("library.bookRewardLabel", {
    amount: BOOK_COMPLETION_REWARD.toLocaleString(languageCode)
  });
  const resolvedSections =
    sections.length > 0 ? sections : [{ title: "", body: book.synopsis ?? "" }];
  const totalChapters = resolvedSections.length;
  const normalizedActiveIndex =
    totalChapters > 0 ? Math.max(0, Math.min(activeChapterIndex, totalChapters - 1)) : 0;
  const maxUnlockedChapterIndex =
    isOwned && totalChapters > 0 ? Math.min(completedChapterIndex + 1, totalChapters - 1) : -1;
  const activeIndex =
    isOwned && maxUnlockedChapterIndex >= 0
      ? Math.min(normalizedActiveIndex, maxUnlockedChapterIndex)
      : normalizedActiveIndex;
  const activeSection = resolvedSections[activeIndex];
  const activeSectionTitle =
    activeSection && activeSection.title.trim().length > 0
      ? activeSection.title.trim()
      : t("levels.bookOverviewTitle");
  const formattedBody = activeSection ? activeSection.body.replace(/ - /g, "\n• ") : "";
  const activeBodyLines = formattedBody
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const isActiveChapterCompleted = completedChapterIndex >= activeIndex;
  const isFinalChapter = activeIndex >= totalChapters - 1;
  const canCompleteBook =
    isOwned && !isCompleted && totalChapters > 0 && completedChapterIndex >= totalChapters - 1;
  const chapterActionAvailable =
    isOwned &&
    totalChapters > 0 &&
    !isActiveChapterCompleted &&
    activeIndex <= maxUnlockedChapterIndex &&
    maxUnlockedChapterIndex >= 0;
  const canGoPrevious = isOwned && activeIndex > 0;
  const canGoNext = isOwned && activeIndex < maxUnlockedChapterIndex;
  const chapterProgressLabel =
    totalChapters > 0
      ? t("library.bookDetails.chapterProgressLabel", {
          current: activeIndex + 1,
          total: totalChapters
        })
      : t("library.bookDetails.chapterProgressEmpty");
  const progressValue =
    totalChapters > 0 ? Math.max(0, Math.min(1, (activeIndex + 1) / totalChapters)) : 0;
  const fallbackNotice = !isLoading
    ? errorMessage ?? (isFallback ? t("library.bookDetails.fallback") : undefined)
    : undefined;
  const finishHint =
    isOwned && !isCompleted && totalChapters > 0 && !canCompleteBook
      ? t("library.bookDetails.finishHint")
      : undefined;

  const handlePrevChapter = () => {
    if (canGoPrevious) {
      onChapterChange(book, activeIndex - 1, totalChapters);
    }
  };

  const handleNextChapter = () => {
    if (canGoNext) {
      onChapterChange(book, activeIndex + 1, totalChapters);
    }
  };

  const handleChapterSelect = (index: number) => {
    if (onChapterChange(book, index, totalChapters)) {
      setChapterPickerVisible(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.bookModalBackdrop}>
        <SafeAreaView style={styles.bookModalContainer}>
          <View style={styles.readerTopBar}>
            <Pressable style={styles.readerActionButton} onPress={onClose}>
              <Ionicons name="chevron-down" size={22} color={theme.colors.textPrimary} />
            </Pressable>
            <View style={styles.readerTitleBlock}>
              <Text style={styles.readerBookTitle} numberOfLines={2}>
                {bookTitle}
              </Text>
              <Text style={styles.readerBookAuthor} numberOfLines={1}>
                {author}
              </Text>
              <Text style={styles.readerBookReward} numberOfLines={1}>
                {bookRewardLabel}
              </Text>
            </View>
            {isOwned && totalChapters > 0 ? (
              <Pressable
                style={styles.readerActionButton}
                onPress={() => setChapterPickerVisible(true)}
              >
                <Ionicons name="list-outline" size={20} color={theme.colors.textPrimary} />
              </Pressable>
            ) : (
              <View style={styles.readerActionPlaceholder} />
            )}
          </View>

          <View style={styles.readerBody}>
            {isLoading ? (
              <View style={styles.readerCenteredState}>
                <View style={styles.bookModalLoading}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={styles.bookModalLoadingText}>{t("library.bookDetails.loading")}</Text>
                </View>
              </View>
            ) : isOwned ? (
              <>
                {fallbackNotice && (
                  <View style={styles.bookModalNotice}>
                    <Text style={styles.bookModalNoticeText}>{fallbackNotice}</Text>
                    {onRetry && (
                      <Pressable style={styles.bookModalNoticeButton} onPress={onRetry}>
                        <Text style={styles.bookModalNoticeButtonText}>{t("actions.retry")}</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {totalChapters > 0 ? (
                  <>
                  <View style={styles.readerChapterHeader}>
                    <Pressable
                      style={[styles.readerNavigateButton, !canGoPrevious && styles.readerNavigateDisabled]}
                      onPress={handlePrevChapter}
                      disabled={!canGoPrevious}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={18}
                        color={
                          canGoPrevious ? theme.colors.textPrimary : theme.colors.textSecondary
                        }
                      />
                    </Pressable>
                    <View style={styles.readerChapterMeta}>
                      <Text style={styles.readerChapterTitle} numberOfLines={2}>
                        {activeSectionTitle}
                      </Text>
                      <Text style={styles.readerChapterCounter}>{chapterProgressLabel}</Text>
                    </View>
                    <Pressable
                      style={[styles.readerNavigateButton, !canGoNext && styles.readerNavigateDisabled]}
                      onPress={handleNextChapter}
                      disabled={!canGoNext}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={canGoNext ? theme.colors.textPrimary : theme.colors.textSecondary}
                      />
                    </Pressable>
                  </View>

                  <View style={styles.readerProgressBar}>
                    <View style={styles.readerProgressTrack}>
                      <View
                        style={[
                          styles.readerProgressFill,
                          { width: `${Math.max(progressValue * 100, progressValue > 0 ? 6 : 0)}%` }
                        ]}
                      />
                    </View>
                  </View>

                  <ScrollView
                    style={styles.readerContentScroll}
                    contentContainerStyle={styles.readerContentContainer}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.readerContentWrapper}>
                      {activeBodyLines.length === 0 ? (
                        <Text style={styles.readerParagraph}>
                          {t("library.bookDetails.emptyChapter")}
                        </Text>
                      ) : (
                        activeBodyLines.map((line, index) => (
                          <Text key={`${activeSectionTitle}-${index}`} style={styles.readerParagraph}>
                            {line}
                          </Text>
                        ))
                      )}
                    </View>
                  </ScrollView>
                </>
              ) : (
                <View style={styles.bookModalNotice}>
                  <Text style={styles.bookModalNoticeText}>{t("library.bookDetails.empty")}</Text>
                  {onRetry && (
                    <Pressable style={styles.bookModalNoticeButton} onPress={onRetry}>
                      <Text style={styles.bookModalNoticeButtonText}>{t("actions.retry")}</Text>
                    </Pressable>
                  )}
                </View>
              )}
              </>
            ) : (
              <View style={styles.readerCenteredState}>
                <View style={styles.bookModalLocked}>
                  <Ionicons name="lock-closed-outline" size={36} color={theme.colors.accent} />
                  <Text style={styles.bookModalLockedTitle}>{t("library.bookDetails.lockedTitle")}</Text>
                  <Text style={styles.bookModalLockedMessage}>{t("library.bookDetails.lockedMessage")}</Text>
                  <Pressable style={styles.bookModalLockedButton} onPress={() => onAcquire(book)}>
                    <Text style={styles.bookModalLockedButtonText}>
                      {t("library.bookDetails.purchaseCta")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          <View style={styles.bookModalActions}>
            {isOwned ? (
              <>
                {chapterActionAvailable ? (
                  <Pressable
                    style={styles.bookModalActionPrimary}
                    onPress={() => onChapterComplete(book, activeIndex, totalChapters)}
                  >
                    <Text style={styles.bookModalActionPrimaryText}>
                      {isFinalChapter
                        ? t("library.bookDetails.chapterFinalCta")
                        : t("library.bookDetails.chapterCompleteCta")}
                    </Text>
                  </Pressable>
                ) : (
                  <View style={[styles.readerStatusPill, styles.readerStatusPillFull]}>
                    <Ionicons
                      name={isActiveChapterCompleted ? "checkmark-circle" : "lock-closed"}
                      size={16}
                      color={theme.colors.accent}
                    />
                    <Text style={styles.readerStatusPillText}>
                      {isActiveChapterCompleted
                        ? t("library.bookDetails.chapterStatusCompleted")
                        : t("library.bookDetails.chapterStatusLocked")}
                    </Text>
                  </View>
                )}
                <Pressable
                  style={[
                    styles.bookModalActionSecondary,
                    (isCompleted || !canCompleteBook) && styles.bookModalActionSecondaryDisabled
                  ]}
                  onPress={() => {
                    if (!isCompleted && canCompleteBook) {
                      onComplete(book);
                    }
                  }}
                  disabled={isCompleted || !canCompleteBook}
                >
                  <Text
                    style={[
                      styles.bookModalActionSecondaryText,
                      (isCompleted || !canCompleteBook) && styles.bookModalActionSecondaryTextDisabled
                    ]}
                  >
                    {isCompleted
                      ? t("levels.bookAlreadyLogged")
                      : t("levels.markBookComplete")}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.bookModalActionPrimary} onPress={() => onAcquire(book)}>
                <Text style={styles.bookModalActionPrimaryText}>
                  {t("library.bookDetails.purchaseCta")}
                </Text>
              </Pressable>
            )}
          </View>

          {finishHint && <Text style={styles.bookModalFinishHint}>{finishHint}</Text>}
        </SafeAreaView>
      </View>

      {isOwned && totalChapters > 0 && (
        <Modal
          visible={isChapterPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setChapterPickerVisible(false)}
        >
          <View style={styles.chapterPickerBackdrop}>
            <Pressable
              style={styles.chapterPickerDismiss}
              onPress={() => setChapterPickerVisible(false)}
            />
            <View style={styles.chapterPickerSheet}>
              <View style={styles.chapterPickerHeader}>
                <Text style={styles.chapterPickerTitle}>
                  {t("library.bookDetails.chapterPickerTitle")}
                </Text>
                <Pressable
                  style={styles.chapterPickerCloseButton}
                  onPress={() => setChapterPickerVisible(false)}
                >
                  <Ionicons name="close" size={18} color={theme.colors.textPrimary} />
                </Pressable>
              </View>
              <ScrollView
                style={styles.chapterPickerList}
                contentContainerStyle={styles.chapterPickerListContent}
                showsVerticalScrollIndicator={false}
              >
                {resolvedSections.map((section, index) => {
                  const accessible = index <= maxUnlockedChapterIndex;
                  const completed = completedChapterIndex >= index;
                  const isActive = index === activeIndex;
                  const chapterTitle =
                    section.title.trim().length > 0
                      ? section.title.trim()
                      : t("library.bookDetails.chapterUntitled", { number: index + 1 });
                  const statusLabel = completed
                    ? t("library.bookDetails.chapterStatusCompleted")
                    : accessible
                    ? t("library.bookDetails.chapterStatusAvailable")
                    : t("library.bookDetails.chapterStatusLocked");
                  return (
                    <Pressable
                      key={`${section.title}-${index}`}
                      style={[
                        styles.chapterPickerItem,
                        isActive && styles.chapterPickerItemActive,
                        !accessible && styles.chapterPickerItemLocked
                      ]}
                      onPress={() => handleChapterSelect(index)}
                      disabled={!accessible}
                    >
                      <View style={styles.chapterPickerItemHeader}>
                        <Text style={styles.chapterPickerNumber}>
                          {t("library.bookDetails.chapterNumber", { number: index + 1 })}
                        </Text>
                        {completed && (
                          <Ionicons name="checkmark-circle" size={16} color={theme.colors.accent} />
                        )}
                        {!accessible && (
                          <Ionicons
                            name="lock-closed"
                            size={16}
                            color={theme.colors.textSecondary}
                          />
                        )}
                      </View>
                      <Text style={styles.chapterPickerItemTitle} numberOfLines={2}>
                        {chapterTitle}
                      </Text>
                      <Text style={styles.chapterPickerStatus}>{statusLabel}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
};

const chapterHeadingKeywords = [
  "пролог",
  "эпилог",
  "послесловие",
  "предисловие",
  "введение",
  "заключение",
  "итоги",
  "глава",
  "часть",
  "раздел",
  "chapter",
  "part",
  "section"
];

const chapterHeadingPatterns: RegExp[] = [
  /^пролог\b/i,
  /^эпилог\b/i,
  /^предисловие\b/i,
  /^послесловие\b/i,
  /^введение\b/i,
  /^заключение\b/i,
  /^итоги\b/i,
  /^глава\b/i,
  /^часть\b/i,
  /^раздел\b/i,
  /^chapter\b/i,
  /^part\b/i,
  /^section\b/i,
  /^\d+\.\s+/,
  /^\d+\)\s+/,
  /^[ivxlcdm]+\.\s+/i,
  /^[ivxlcdm]+\)\s+/i,
  /^№\s*\d+/i
];

const insertChapterLineBreaks = (text: string): string => {
  let updated = text;
  chapterHeadingKeywords.forEach((keyword) => {
    const pattern = new RegExp(`\\s+(${keyword}\\s*[0-9IVXLCDM\\-–]*)`, "gi");
    updated = updated.replace(pattern, "\n$1");
  });
  return updated;
};

const normalizeHeadingText = (heading: string): string => {
  const trimmed = heading.replace(/^[«"']/g, "").replace(/[»"']$/g, "").trim();
  if (!trimmed) {
    return "";
  }
  const cleaned = trimmed.replace(/^[0-9IVXLCDM№]+[\.\)\-–—]?\s*/i, (match) =>
    match.trim().length > 0 ? "" : match
  );
  if (/^\w/.test(cleaned)) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
};

const formatContentLine = (line: string): string => {
  if (!line) {
    return "";
  }
  if (/^[\-–—]\s*/.test(line)) {
    return line.replace(/^[\-–—]\s*/, "• ").trim();
  }
  if (/^\d+\.\s+/.test(line)) {
    return `• ${line.replace(/^\d+\.\s+/, "")}`.trim();
  }
  if (/^\d+\)\s+/.test(line)) {
    return `• ${line.replace(/^\d+\)\s+/, "")}`.trim();
  }
  return line.trim();
};

const splitBodyIntoChapters = (text: string): BookDetailSection[] => {
  if (!text) {
    return [];
  }
  const prepared = insertChapterLineBreaks(
    text
      .replace(/\u00a0/g, " ")
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, " ")
  );
  const lines = prepared.split(/\n+/).map((line) => line.trim()).filter((line) => line.length > 0);
  const sections: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;
  let detectedHeading = false;

  const commitCurrent = () => {
    if (!current) {
      return;
    }
    const body = current.lines.map(formatContentLine).filter((line) => line.length > 0);
    if (current.title.length === 0 && body.length === 0) {
      current = null;
      return;
    }
    sections.push({
      title: normalizeHeadingText(current.title),
      lines: body
    });
    current = null;
  };

  const ensureCurrent = () => {
    if (!current) {
      current = { title: "", lines: [] };
    }
    return current;
  };

  lines.forEach((line) => {
    const headingMatch = chapterHeadingPatterns.some((pattern) => pattern.test(line));
    if (headingMatch) {
      commitCurrent();
      current = { title: normalizeHeadingText(line), lines: [] };
      detectedHeading = true;
      return;
    }
    const section = ensureCurrent();
    section.lines.push(line);
  });

  commitCurrent();

  if (!detectedHeading) {
    return [];
  }

  return sections
    .map((section) => ({
      title: section.title,
      body: section.lines.join("\n").trim()
    }))
    .filter((section) => section.title.length > 0 || section.body.length > 0);
};

const normalizeBookSections = (sections: BookDetailSection[]): BookDetailSection[] => {
  if (!sections || sections.length === 0) {
    return [];
  }
  const normalized: BookDetailSection[] = [];
  sections.forEach(({ title, body }) => {
    const sanitizedBody = body
      .replace(/\u00a0/g, " ")
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, " ")
      .trim();
    const cleanedTitle = normalizeHeadingText(title);
    const nested = splitBodyIntoChapters(sanitizedBody);
    if (nested.length > 0) {
      nested.forEach((section, index) => {
        const nestedTitle = section.title || (index === 0 ? cleanedTitle : "");
        normalized.push({
          title: nestedTitle,
          body: section.body
        });
      });
    } else {
      normalized.push({
        title: cleanedTitle,
        body: sanitizedBody
      });
    }
  });

  return normalized
    .map((section) => ({
      title: section.title,
      body: section.body.trim()
    }))
    .filter((section) => section.title.length > 0 || section.body.length > 0);
};

const buildBookSections = (summary: string): BookDetailSection[] => {
  if (!summary) {
    return [];
  }
  const sanitizedSummary = summary
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .trim();
  if (!sanitizedSummary) {
    return [];
  }
  const splitSummary = splitBodyIntoChapters(sanitizedSummary);
  if (splitSummary.length > 0) {
    return splitSummary;
  }
  return [
    {
      title: "",
      body: sanitizedSummary
    }
  ];
};

const createStyles = (theme: ThemeDefinition) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    scrollContainer: {
      padding: 20,
      paddingBottom: 120
    },
    progressSection: {
      marginBottom: 24
    },
    progressTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 12
    },
    progressList: {
      paddingRight: 12,
      gap: 12
    },
    progressCard: {
      width: 220,
      padding: 16,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    progressTypeBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceAlt,
      marginBottom: 10
    },
    progressTypeText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5
    },
    progressCardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    progressCardSubtitle: {
      marginTop: 6,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    progressCardProgressWrapper: {
      marginTop: 12
    },
    progressCardProgressLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: 6
    },
    progressCardProgressTrack: {
      height: 6,
      borderRadius: 4,
      backgroundColor: theme.colors.surfaceAlt,
      overflow: "hidden"
    },
    progressCardProgressFill: {
      height: "100%",
      backgroundColor: theme.colors.accent
    },
    headerContainer: {
      marginBottom: 24
    },
    headerTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16
    },
    headerBrandRow: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1
    },
    headerBrandText: {
      marginLeft: 12,
      flexShrink: 1
    },
    headerAppName: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      flexShrink: 1
    },
    headerSubtitle: {
      marginTop: 2,
      fontSize: 13,
      color: theme.colors.textSecondary,
      flexShrink: 1,
      flexWrap: "wrap"
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 12,
      flexShrink: 0
    },
    headerIconButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginLeft: 8
    },
    headerIconButtonText: {
      marginLeft: 4,
      color: theme.colors.textPrimary,
      fontWeight: "600"
    },
    headerActionIcon: {
      width: 36,
      height: 36,
      marginLeft: 8,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    userCard: {
      backgroundColor: theme.colors.userCardBackground,
      borderRadius: 20,
      padding: 18,
      shadowColor: theme.colors.userCardShadow,
      shadowOpacity: 0.35,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 16,
      elevation: 6
    },
    userRow: {
      flexDirection: "row",
      alignItems: "center"
    },
    avatarWrapper: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.2)",
      justifyContent: "center",
      alignItems: "center"
    },
    userInfo: {
      flex: 1,
      marginLeft: 12
    },
    userName: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "700"
    },
    userLevel: {
      marginTop: 4,
      color: "rgba(255,255,255,0.75)",
      fontSize: 13
    },
    rewardButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.18)",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 24
    },
    rewardButtonText: {
      color: "#fff",
      fontWeight: "600",
      marginHorizontal: 8,
      fontSize: 14
    },
    rewardBadge: {
      minWidth: 30,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center"
    },
    rewardBadgeText: {
      color: theme.colors.accent,
      fontWeight: "700",
      fontSize: 12
    },
    statsRow: {
      marginTop: 18,
      flexDirection: "row",
      justifyContent: "space-between"
    },
    statColumn: {
      flex: 1
    },
    statColumnDivider: {
      marginRight: 12
    },
    statLabel: {
      color: "rgba(255,255,255,0.7)",
      fontSize: 13
    },
    statValue: {
      marginTop: 6,
      color: "#fff",
      fontWeight: "700",
      fontSize: 22
    },
    statMeta: {
      marginTop: 2,
      fontSize: 12,
      color: "rgba(255,255,255,0.75)"
    },
    communityStatsRow: {
      marginTop: 16,
      flexDirection: "row",
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14
    },
    communityStatItem: {
      flex: 1
    },
    communityStatItemSeparator: {
      marginRight: 12
    },
    communityStatLabel: {
      color: "rgba(255,255,255,0.65)",
      fontSize: 12
    },
    communityStatValue: {
      marginTop: 4,
      color: "#fff",
      fontWeight: "700",
      fontSize: 18
    },
    topTabsRow: {
      flexDirection: "row",
      backgroundColor: theme.colors.highlight,
      borderRadius: 16,
      padding: 4,
      marginBottom: 20
    },
    topTabButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 12
    },
    topTabButtonActive: {
      backgroundColor: theme.colors.surface,
      shadowColor: "rgba(0,0,0,0.14)",
      shadowOpacity: 0.14,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 3
    },
    topTabText: {
      fontWeight: "600",
      color: theme.colors.textSecondary
    },
    topTabTextActive: {
      color: theme.colors.textPrimary
    },
    searchWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 20
    },
    searchInput: {
      flex: 1,
      marginLeft: 10,
      fontSize: 14,
      color: theme.colors.textPrimary
    },
    clearSearch: {
      marginLeft: 6
    },
    section: {
      marginBottom: 28
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    sectionDescription: {
      marginTop: 6,
      fontSize: 14,
      color: theme.colors.textSecondary
    },
    sectionSpaceTop: {
      marginTop: 16
    },
    courseFiltersRow: {
      paddingVertical: 8,
      paddingRight: 6,
      marginTop: 16
    },
    courseFilterPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: 10
    },
    courseFilterPillActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent
    },
    courseFilterText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary
    },
    courseFilterTextActive: {
      color: theme.colors.surface
    },
    courseList: {
      marginTop: 16
    },
    courseCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    courseCover: {
      width: 48,
      height: 64,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
      overflow: "hidden"
    },
    courseCoverImage: {
      width: "100%",
      height: "100%"
    },
    courseInfo: {
      flex: 1
    },
    courseTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    courseSummary: {
      marginTop: 4,
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    courseMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      marginTop: 6
    },
    courseMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    courseMetaDivider: {
      marginHorizontal: 6,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    courseReward: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.accent
    },
    courseActionButton: {
      marginTop: 12,
      alignSelf: "flex-start",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.accent
    },
    courseActionButtonDisabled: {
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    courseActionButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#fff"
    },
    courseActionButtonTextDisabled: {
      color: theme.colors.textSecondary
    },
    coursePriceBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.highlight,
      borderRadius: 14
    },
    coursePriceBadgeCompleted: {
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    coursePriceText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.accent
    },
    coursePriceTextCompleted: {
      color: theme.colors.textSecondary
    },
    courseEmptyState: {
      marginTop: 20,
      padding: 20,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center"
    },
    courseEmptyTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    courseEmptySubtitle: {
      marginTop: 6,
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: "center"
    },
    categoryPillsRow: {
      paddingVertical: 6
    },
    categoryPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: 10
    },
    categoryPillActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent
    },
    categoryPillText: {
      color: theme.colors.textSecondary,
      fontWeight: "600",
      fontSize: 12
    },
    categoryPillTextActive: {
      color: theme.colors.surface
    },
    bookList: {
      marginTop: 16
    },
    bookCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    bookCover: {
      width: 48,
      height: 64,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
      overflow: "hidden"
    },
    bookCoverImage: {
      width: "100%",
      height: "100%"
    },
    bookInfo: {
      flex: 1
    },
    bookTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    bookAuthor: {
      marginTop: 4,
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    bookMeta: {
      marginTop: 6,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    bookReward: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.accent
    },
    bookActionButton: {
      marginTop: 12,
      alignSelf: "flex-start",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.accent
    },
    bookActionButtonDisabled: {
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    bookActionButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#fff"
    },
    bookActionButtonTextDisabled: {
      color: theme.colors.textSecondary
    },
    bookPriceBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.highlight,
      borderRadius: 14
    },
    bookPriceBadgeOwned: {
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    bookPriceText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.accent
    },
    bookPriceTextOwned: {
      color: theme.colors.textSecondary
    },
    emptyState: {
      marginTop: 24,
      padding: 20,
      alignItems: "center"
    },
    emptyStateTitle: {
      marginTop: 12,
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary
    },
    emptyStateSubtitle: {
      marginTop: 6,
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: 20
    },
    rewardsList: {
      marginTop: 16
    },
    rewardCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12
    },
    rewardIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.colors.highlight,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14
    },
    rewardInfo: {
      flex: 1
    },
    rewardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    rewardSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    earnRewardValue: {
      marginTop: 6,
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.accent
    },
    rewardVerification: {
      marginTop: 6,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    earnRulesCard: {
      marginTop: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    earnRulesTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    earnRuleText: {
      marginTop: 6,
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 18
    },
    streakModalBackdrop: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      padding: 24
    },
    streakModalDismiss: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    },
    streakModalContent: {
      width: "100%",
      maxWidth: 360,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    streakModalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    streakModalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    streakModalSubtitle: {
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.textSecondary
    },
    streakModalCloseButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceAlt
    },
    streakModalCalendar: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 18
    },
    streakCalendarItem: {
      width: "25%",
      alignItems: "center",
      marginBottom: 16
    },
    streakCalendarDayNumber: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary
    },
    streakCalendarDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginTop: 6
    },
    streakCalendarDotActive: {
      backgroundColor: "#FF4D4F"
    },
    streakCalendarDotInactive: {
      backgroundColor: theme.colors.border
    },
    streakCalendarDotToday: {
      borderWidth: 2,
      borderColor: theme.colors.accent,
      width: 14,
      height: 14,
      borderRadius: 7
    },
    streakCalendarWeekday: {
      marginTop: 6,
      fontSize: 11,
      color: theme.colors.textSecondary,
      textTransform: "uppercase"
    },
    streakModalSection: {
      marginTop: 20
    },
    streakModalSectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    streakModalListItem: {
      marginTop: 6,
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 18
    },
    streakModalRewardRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 12
    },
    streakModalRewardBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      marginRight: 8,
      marginBottom: 8
    },
    streakModalRewardBadgeText: {
      fontSize: 12,
      fontWeight: "600"
    },
    streakModalFooterNote: {
      marginTop: 12,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      padding: 24
    },
    modalDismissArea: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    },
    languageSheet: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 12
    },
    languageOption: {
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    languageOptionActive: {
      backgroundColor: theme.colors.highlight
    },
    languageOptionText: {
      fontSize: 14,
      color: theme.colors.textPrimary,
      fontWeight: "600"
    },
    sheetCancelButton: {
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.highlight,
      alignItems: "center"
    },
    sheetCancelText: {
      fontWeight: "600",
      color: theme.colors.accent
    },
    bookModalBackdrop: {
      flex: 1,
      backgroundColor: theme.colors.overlay
    },
    bookModalContainer: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 20,
      paddingVertical: 18,
      paddingBottom: 28
    },
    bookModalLoading: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    bookModalLoadingText: {
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    bookModalNotice: {
      marginTop: 12,
      marginBottom: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 10
    },
    bookModalNoticeText: {
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    bookModalNoticeButton: {
      alignSelf: "flex-start",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: theme.colors.surface
    },
    bookModalNoticeButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.accent
    },
    readerTopBar: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8
    },
    readerActionButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface
    },
    readerActionPlaceholder: {
      width: 40,
      height: 40
    },
    readerTitleBlock: {
      flex: 1,
      marginHorizontal: 12
    },
    readerBookTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    readerBookAuthor: {
      marginTop: 4,
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    readerBookReward: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.accent
    },
    readerBody: {
      flex: 1
    },
    readerCenteredState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20
    },
    readerChapterHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12
    },
    readerNavigateButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface
    },
    readerNavigateDisabled: {
      opacity: 0.35
    },
    readerChapterMeta: {
      flex: 1,
      paddingHorizontal: 12,
      alignItems: "center"
    },
    readerChapterTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      textAlign: "center"
    },
    readerChapterCounter: {
      marginTop: 4,
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: "center"
    },
    readerProgressBar: {
      marginBottom: 10
    },
    readerProgressTrack: {
      height: 4,
      borderRadius: 4,
      backgroundColor: theme.colors.surfaceAlt,
      overflow: "hidden"
    },
    readerProgressFill: {
      height: "100%",
      borderRadius: 6,
      backgroundColor: theme.colors.accent
    },
    readerContentScroll: {
      flex: 1
    },
    readerContentContainer: {
      flexGrow: 1,
      paddingTop: 4,
      paddingBottom: 20
    },
    readerContentWrapper: {
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
      paddingHorizontal: 12
    },
    readerParagraph: {
      fontSize: 16,
      lineHeight: 25,
      color: theme.colors.textPrimary,
      marginBottom: 12
    },
    readerStatusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      alignSelf: "stretch",
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    readerStatusPillText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary
    },
    readerStatusPillFull: {
      flex: 1
    },
    bookModalActions: {
      flexDirection: "row",
      alignItems: "stretch",
      justifyContent: "center",
      marginTop: 12,
      paddingTop: 12,
      gap: 12,
      borderTopWidth: 1,
      borderColor: theme.colors.border
    },
    bookModalActionSecondary: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      backgroundColor: theme.colors.surface
    },
    bookModalActionSecondaryDisabled: {
      backgroundColor: theme.colors.surfaceAlt
    },
    bookModalActionSecondaryText: {
      fontWeight: "600",
      color: theme.colors.textPrimary
    },
    bookModalActionSecondaryTextDisabled: {
      color: theme.colors.textSecondary
    },
    bookModalActionPrimary: {
      flex: 1,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      backgroundColor: theme.colors.accent
    },
    bookModalActionPrimaryText: {
      fontWeight: "700",
      color: "#fff"
    },
    bookModalLocked: {
      alignItems: "center",
      gap: 12,
      padding: 24,
      borderRadius: 16,
      borderColor: theme.colors.border,
      borderWidth: 1,
      backgroundColor: theme.colors.surfaceAlt,
      maxWidth: 360,
      alignSelf: "stretch"
    },
    bookModalLockedTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      textAlign: "center"
    },
    bookModalLockedMessage: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: "center"
    },
    bookModalLockedButton: {
      marginTop: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: theme.colors.accent
    },
    bookModalLockedButtonText: {
      fontWeight: "700",
      color: "#fff"
    },
    bookModalFinishHint: {
      textAlign: "center",
      color: theme.colors.textSecondary,
      fontSize: 12,
      paddingHorizontal: 12,
      paddingTop: 4,
      paddingBottom: 10
    },
    chapterPickerBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end"
    },
    chapterPickerDismiss: {
      flex: 1
    },
    chapterPickerSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 28,
      maxHeight: "75%"
    },
    chapterPickerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12
    },
    chapterPickerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    chapterPickerCloseButton: {
      width: 32,
      height: 32,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: "center",
      justifyContent: "center"
    },
    chapterPickerList: {
      flexGrow: 0
    },
    chapterPickerListContent: {
      paddingBottom: 12
    },
    chapterPickerItem: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      backgroundColor: theme.colors.surface
    },
    chapterPickerItemActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.highlight
    },
    chapterPickerItemLocked: {
      opacity: 0.6
    },
    chapterPickerItemHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8
    },
    chapterPickerNumber: {
      fontWeight: "700",
      color: theme.colors.textPrimary,
      fontSize: 13
    },
    chapterPickerItemTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 4
    },
    chapterPickerStatus: {
      fontSize: 12,
      color: theme.colors.textSecondary
    }
  });

export const CoursesScreen = () => <HomeScreen mode="courses" />;
export const BooksScreen = () => <HomeScreen mode="books" />;

export default CoursesScreen;
