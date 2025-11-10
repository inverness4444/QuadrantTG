import React, { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLibrary } from "../hooks/useLibrary";
import { useTheme } from "../hooks/useTheme";
import { useLocalization } from "../hooks/useLocalization";
import type { ThemeDefinition } from "../theme/themes";
import { useLevel } from "../hooks/useLevel";
import { useContent } from "../hooks/useContent";
import type { Book as ContentBook } from "../types/content";

const ProgressScreen = () => {
  const { progressBookIds, getBookProgress } = useLibrary();
  const { completedCourseIds } = useLevel();
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { books: contentBooks, courseCategories: contentCourseCategories } = useContent();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const progressBooks = useMemo<ContentBook[]>(() => {
    if (progressBookIds.length === 0) {
      return [];
    }
    return progressBookIds
      .map((id) => contentBooks.find((book) => book.id === id))
      .filter((book): book is ContentBook => Boolean(book));
  }, [contentBooks, progressBookIds]);

  const totalCourses = contentCourseCategories.length;
  const completedCourses = completedCourseIds.length;
  const courseProgress = totalCourses > 0 ? Math.min(1, completedCourses / totalCourses) : 0;
  const courseRemainingPercent = Math.max(0, 100 - Math.round(courseProgress * 100));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>{t("progress.sectionTitle")}</Text>
        <Text style={styles.pageSubtitle}>{t("progress.sectionDescription")}</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="school-outline" size={20} color={theme.colors.accent} />
            <Text style={styles.summaryTitle}>{t("progress.courseSummary.title")}</Text>
          </View>
          <Text style={styles.summaryMeta}>
            {t("progress.courseSummary.caption", {
              completed: completedCourses,
              total: totalCourses,
              remaining: courseRemainingPercent
            })}
          </Text>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${courseProgress * 100}%` }]} />
          </View>
        </View>

        {progressBooks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={40} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>{t("progress.emptyTitle")}</Text>
            <Text style={styles.emptySubtitle}>{t("progress.emptySubtitle")}</Text>
          </View>
        ) : (
          <View style={styles.bookList}>
            {progressBooks.map((book) => (
              <View key={book.id} style={styles.progressCard}>
                <Text style={styles.cardTitle}>{book.title}</Text>
                <Text style={styles.cardMeta}>
                  {(book.author ?? "").trim().length > 0
                    ? book.author
                    : t("library.book.authorUnknown")}
                </Text>

                {(() => {
                  const { completedChapters, totalChapters, progress } = getBookProgress(
                    book.id,
                    0
                  );
                  if (totalChapters <= 0) {
                    return (
                      <Text style={styles.cardStatusMuted}>
                        {t("progress.bookProgress.unavailable")}
                      </Text>
                    );
                  }
                  const percent = Math.round(progress * 100);
                  const remainingPercent = Math.max(0, 100 - percent);
                  return (
                    <View style={styles.cardProgressWrapper}>
                      <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                      </View>
                      <Text style={styles.cardProgressLabel}>
                        {t("progress.bookProgress.caption", {
                          completed: completedChapters,
                          total: totalChapters,
                          remaining: remainingPercent
                        })}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
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
    pageTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    pageSubtitle: {
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.textSecondary
    },
    emptyState: {
      marginTop: 40,
      alignItems: "center"
    },
    emptyTitle: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      textAlign: "center"
    },
    emptySubtitle: {
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center"
    },
    bookList: {
      marginTop: 24
    },
    progressCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    cardMeta: {
      marginTop: 6,
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    summaryCard: {
      marginTop: 24,
      padding: 18,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface
    },
    summaryHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 8
    },
    summaryTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    summaryMeta: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 12
    },
    progressBarTrack: {
      height: 6,
      borderRadius: 6,
      backgroundColor: theme.colors.surfaceAlt,
      overflow: "hidden"
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 6,
      backgroundColor: theme.colors.accent
    },
    cardProgressWrapper: {
      marginTop: 12
    },
    cardProgressLabel: {
      marginTop: 6,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    cardStatusMuted: {
      marginTop: 12,
      fontSize: 12,
      color: theme.colors.textSecondary
    }
  });

export default ProgressScreen;
