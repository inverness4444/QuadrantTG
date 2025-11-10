import React, { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { earnGeneralRules } from "../constants/data";
import { useTheme } from "../hooks/useTheme";
import { useLocalization } from "../hooks/useLocalization";
import type { ThemeDefinition } from "../theme/themes";
import { useEarn } from "../hooks/useEarn";

const EarnScreen = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { tasks, isReady } = useEarn();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const activeTasks = useMemo(
    () => tasks.filter((task) => task.isActive),
    [tasks]
  );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{t("earn.sectionTitle")}</Text>
      <Text style={styles.subtitle}>{t("earn.sectionDescription")}</Text>

      <View style={styles.tasksSection}>
        {!isReady ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : activeTasks.length === 0 ? (
          <Text style={styles.emptyState}>{t("earn.emptyState")}</Text>
        ) : (
          activeTasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskIconWrapper}>
                <Feather name={task.icon as never} size={20} color={theme.colors.accent} />
              </View>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskReward}>{task.reward}</Text>
                <Text style={styles.taskMeta}>{task.limits}</Text>
                <Text style={styles.taskVerification}>{task.verification}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.rulesCard}>
        <Text style={styles.rulesTitle}>{t("earn.rules.title")}</Text>
        {earnGeneralRules.map((rule) => (
          <Text key={rule.id} style={styles.ruleText}>
            {t(rule.textKey)}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
};

const createStyles = (theme: ThemeDefinition) =>
  StyleSheet.create({
    container: {
      padding: 20,
      paddingBottom: 40,
      gap: 20
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary
    },
    tasksSection: {
      gap: 12
    },
    loader: {
      paddingVertical: 24,
      alignItems: "center"
    },
    emptyState: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      paddingVertical: 16
    },
    taskCard: {
      flexDirection: "row",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: 16,
      gap: 14
    },
    taskIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.colors.highlight,
      alignItems: "center",
      justifyContent: "center"
    },
    taskInfo: {
      flex: 1
    },
    taskTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    taskReward: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.accent
    },
    taskMeta: {
      marginTop: 4,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    taskVerification: {
      marginTop: 4,
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 18
    },
    rulesCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: 16,
      gap: 8
    },
    rulesTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    ruleText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 18
    }
  });

export default EarnScreen;
