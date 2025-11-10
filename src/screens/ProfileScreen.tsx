import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";
import { useLocalization } from "../hooks/useLocalization";
import { useAuth } from "../hooks/useAuth";
import { useStrava } from "../hooks/useStrava";
import { useReferral } from "../hooks/useReferral";
import { useLevel } from "../hooks/useLevel";
import { useDailyStreak } from "../hooks/useDailyStreak";
import * as Clipboard from "expo-clipboard";
import type { ThemeDefinition } from "../theme/themes";
import { fallbackLeaderboard } from "../constants/leaderboard";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { useCommunityStats } from "../hooks/useCommunityStats";
import { languageOrder, type SupportedLanguage } from "../i18n/locales";

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

const AVATAR_PLACEHOLDER = "https://avatars.dicebear.com/api/identicon/quadrant.svg";

const formatUsageDuration = (
  seconds: number,
  t: TranslateFn,
  formatter: Intl.NumberFormat
) => {
  if (seconds < 60) {
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

type ProfileSummaryCardProps = {
  styles: ReturnType<typeof createStyles>;
  t: TranslateFn;
  theme: ThemeDefinition;
  userName?: string;
  userHandle?: string;
  avatarUrl?: string;
  levelLabel: string;
  xpProgressLabel: string;
  xpToNextLabel: string;
  balanceValue: string;
  tokenTicker: string;
  communityTotalUsers: string;
  communityOnlineUsers: string;
  communityTotalTokens: string;
  usageLabel: string;
  usageMeta: string;
  stepsValue: string;
  stepsMeta: string;
  streakCount: number;
  onStreakPress: () => void;
  telegramId?: number;
};

const ProfileScreen = () => {
  const { theme, mode, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLocalization();
  const { user, profile, signOut } = useAuth();
  const {
    athlete: stravaAthlete,
    connect: connectStrava,
    disconnect: disconnectStrava,
    refresh: refreshStrava,
    dailySteps: stravaSteps,
    isConnected: stravaConnected,
    isSyncing: stravaSyncing,
    lastSyncedAt: stravaLastSynced,
    error: stravaError,
    isConfigured: stravaConfigured
  } = useStrava();
  const { referralCode, referralLink, invitedFriends, addInvite } = useReferral();
  const {
    level,
    xp,
    currentLevelXp,
    levelXpTarget,
    xpToNextLevel,
    stageKey,
    progress,
    completedCourseIds,
    completedBookIds
  } = useLevel();
  const {
    streakCount,
    todayCompleted: streakTodayCompleted,
    nextReward: streakNextReward,
    requiredBookPages,
    requiredCourseMinutes
  } = useDailyStreak();
  const { balance } = useTokenBalance();
  const { totalUsers, onlineUsers, totalTokensIssued } = useCommunityStats();
  const [inviteModalVisible, setInviteModalVisible] = useState<boolean>(false);
  const [newInviteName, setNewInviteName] = useState<string>("");
  const [streakModalVisible, setStreakModalVisible] = useState<boolean>(false);
  const [languageSheetVisible, setLanguageSheetVisible] = useState<boolean>(false);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const logoSource =
    mode === "light"
      ? require("../../assets/logo_dark.png")
      : require("../../assets/logo_light.png");
  const languageLabel = language.toUpperCase();
  const languageOptions = useMemo(
    () =>
      languageOrder.map((code) => ({
        code,
        label: t(`language.names.${code}`)
      })),
    [t]
  );
  const levelTitle = t(`levels.title.${stageKey}`);
  const profileXpLabel = t("levels.profileXp", { xp });
  const profileProgressLabel = t("levels.profileProgress", {
    current: currentLevelXp,
    target: levelXpTarget
  });
  const coursesLabel = t("levels.profileCourses", { count: completedCourseIds.length });
  const booksLabel = t("levels.profileBooks", { count: completedBookIds.length });
  const levelProgressPercent = Math.min(100, Math.round(progress * 100));
  const levelLabel = t("header.levelDynamic", { level, title: levelTitle });

  const userDisplayName = useMemo(() => {
    if (!user) {
      return undefined;
    }
    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    if (fullName.length > 0) {
      return fullName;
    }
    if (user.username) {
      return `@${user.username}`;
    }
    return undefined;
  }, [user]);
  const userHandle = user?.username ?? undefined;

  const formatTime = (timestamp: number) => {
    try {
      const formatter = new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit" });
      return formatter.format(new Date(timestamp));
    } catch {
      return new Date(timestamp).toLocaleTimeString();
    }
  };

  const resolveStravaError = (code: string | undefined) => {
    if (!code) {
      return undefined;
    }
    if (code === "missing_config" || code.startsWith("missing_config") || code === "coming_soon") {
      return t("strava.error.comingSoon");
    }
    if (code === "cancelled") {
      return t("strava.error.cancelled");
    }
    return t("strava.error.generic");
  };

  const handleLanguagePress = () => {
    setLanguageSheetVisible(true);
  };

  const handleLanguageSelect = (nextLanguage: SupportedLanguage) => {
    setLanguage(nextLanguage);
    setLanguageSheetVisible(false);
  };

  const handleLanguageSheetClose = () => {
    setLanguageSheetVisible(false);
  };

  const stravaErrorMessage = resolveStravaError(stravaError);
  const numberFormatter = useMemo(() => new Intl.NumberFormat(language), [language]);
  const balanceValue = numberFormatter.format(balance);
  const tokenTicker = t("profile.metrics.balanceTicker");
  const xpToNextLabel = t("header.xpToNext", { xp: xpToNextLevel });
  const communityTotalUsersLabel = numberFormatter.format(totalUsers);
  const communityOnlineUsersLabel = numberFormatter.format(onlineUsers);
  const communityTotalTokensLabel = numberFormatter.format(totalTokensIssued);
  const usageSeconds = profile?.app_seconds_spent ?? 0;
  const usageLabel = useMemo(
    () => formatUsageDuration(usageSeconds, t, numberFormatter),
    [usageSeconds, numberFormatter, t]
  );
  const usageMeta = profile ? t("profile.usage.updated") : t("profile.metrics.connectHint");
  const stepsValue = useMemo(
    () => (stravaConfigured && stravaConnected ? stravaSteps.toLocaleString() : "0"),
    [stravaConfigured, stravaConnected, stravaSteps]
  );
  const stepsMeta = useMemo(() => {
    if (!stravaConfigured) {
      return t("strava.comingSoonDescription");
    }
    if (!stravaConnected) {
      return t("strava.shortConnectPrompt");
    }
    if (!stravaLastSynced) {
      return t("strava.lastSyncNever");
    }
    try {
      const formatter = new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit" });
      return t("strava.lastSynced", { time: formatter.format(new Date(stravaLastSynced)) });
    } catch {
      return t("strava.lastSynced", { time: new Date(stravaLastSynced).toLocaleTimeString() });
    }
  }, [language, stravaConfigured, stravaConnected, stravaLastSynced, t]);
  const xpProgressLabel = t("header.xpProgress", {
    current: currentLevelXp,
    next: levelXpTarget
  });

  const formattedInvites = useMemo(
    () =>
      invitedFriends.map((invite) => {
        try {
          const formatter = new Intl.DateTimeFormat(language, {
            month: "short",
            day: "numeric"
          });
          return {
            ...invite,
            formattedDate: formatter.format(new Date(invite.joinedAt))
          };
        } catch {
          return {
            ...invite,
            formattedDate: new Date(invite.joinedAt).toLocaleDateString()
          };
        }
      }),
    [invitedFriends, language]
  );

  const handleCopyCode = async () => {
    if (!referralCode) {
      return;
    }
    await Clipboard.setStringAsync(referralCode);
    Alert.alert(t("referrals.copyTitle"), t("referrals.copyCode"));
  };

  const handleCopyLink = async () => {
    if (!referralLink) {
      return;
    }
    await Clipboard.setStringAsync(referralLink);
    Alert.alert(t("referrals.copyTitle"), t("referrals.copyLink"));
  };

  const handleShareLink = async () => {
    try {
      const message = t("referrals.shareMessage", {
        link: referralLink,
        code: referralCode.toUpperCase()
      });
      await Share.share({ message });
    } catch (error) {
      console.warn("Failed to share referral link", error);
    }
  };

  const closeInviteModal = () => {
    setInviteModalVisible(false);
    setNewInviteName("");
  };

  const handleInviteSubmit = () => {
    if (!newInviteName.trim()) {
      Alert.alert(t("referrals.addInviteTitle"), t("referrals.addInviteValidation"));
      return;
    }
    addInvite(newInviteName.trim());
    closeInviteModal();
    Alert.alert(t("referrals.addInviteTitle"), t("referrals.addInviteSuccess"));
  };

  const handleTelegramSignOut = () => {
    Alert.alert(t("auth.signOutTitle"), t("auth.signOutMessage"), [
      { text: t("actions.close"), style: "cancel" },
      {
        text: t("auth.signOutConfirm"),
        style: "destructive",
        onPress: () => signOut()
      }
    ]);
  };

  const handleStravaConnect = async () => {
    if (!stravaConfigured) {
      Alert.alert(t("strava.comingSoonTitle"), t("strava.comingSoonDescription"));
      return;
    }
    try {
      await connectStrava();
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      Alert.alert(t("strava.sectionTitle"), resolveStravaError(message) ?? t("strava.error.generic"));
    }
  };

  const handleStravaDisconnect = () => {
    Alert.alert(t("strava.disconnectTitle"), t("strava.disconnectMessage"), [
      { text: t("actions.close"), style: "cancel" },
      {
        text: t("strava.disconnectButton"),
        style: "destructive",
        onPress: () => disconnectStrava()
      }
    ]);
  };

  const handleStravaRefresh = async () => {
    try {
      await refreshStrava();
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      Alert.alert(t("strava.sectionTitle"), resolveStravaError(message) ?? t("strava.error.generic"));
    }
  };

  const isTelegramConnected = Boolean(user);

  const stravaStepsLabel = stravaConfigured && stravaConnected ? stravaSteps.toLocaleString() : "—";
  const stravaLastSyncLabel = stravaConfigured
    ? stravaConnected
      ? stravaLastSynced
        ? t("strava.lastSynced", { time: formatTime(stravaLastSynced) })
        : t("strava.lastSyncNever")
      : t("strava.connectDescription")
    : t("strava.comingSoonDescription");
  const stravaStatusMeta = stravaSyncing ? t("strava.syncing") : stravaLastSyncLabel;
  const stravaStepEstimateNote = stravaConfigured
    ? t("strava.stepEstimateNote")
    : t("strava.comingSoonDescription");

  const referralCodeLabel = referralCode ? referralCode.toUpperCase() : "—";
  const hasReferralLink = Boolean(referralLink);
  const referralLinkLabel = hasReferralLink ? (referralLink as string) : "—";
  const leaderboardEntries = useMemo(() => {
    const sorted = [...fallbackLeaderboard].sort((a, b) => b.tokens - a.tokens);
    const topHundred = sorted.slice(0, 100);
    return topHundred.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      tokensLabel: t("profile.leaderboard.tokens", {
        tokens: numberFormatter.format(entry.tokens)
      }),
      timeLabel: formatUsageDuration(entry.appSeconds, t, numberFormatter)
    }));
  }, [numberFormatter, t]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View style={styles.brandRow}>
            <Image source={logoSource} style={styles.brandLogo} resizeMode="contain" />
            <View style={styles.brandText}>
              <Text style={styles.brandTitle}>{t("header.title")}</Text>
              <Text style={styles.brandSubtitle}>{t("header.subtitle")}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerActionButton} onPress={handleLanguagePress}>
              <Ionicons name="globe-outline" size={16} color={theme.colors.textPrimary} />
              <Text style={styles.headerActionText}>{languageLabel}</Text>
            </Pressable>
            <Pressable style={styles.headerIconButton} onPress={toggleTheme}>
              <Ionicons
                name={mode === "light" ? "moon" : "sunny"}
                size={18}
                color={theme.colors.textPrimary}
              />
            </Pressable>
          </View>
        </View>

        <ProfileSummaryCard
          styles={styles}
          t={t}
          theme={theme}
          userName={userDisplayName}
          userHandle={userHandle}
          avatarUrl={user?.photo_url ?? undefined}
          levelLabel={levelLabel}
          xpProgressLabel={xpProgressLabel}
          xpToNextLabel={xpToNextLabel}
          balanceValue={balanceValue}
          tokenTicker={tokenTicker}
          communityTotalUsers={communityTotalUsersLabel}
          communityOnlineUsers={communityOnlineUsersLabel}
          communityTotalTokens={communityTotalTokensLabel}
          usageLabel={usageLabel}
          usageMeta={usageMeta}
          stepsValue={stepsValue}
          stepsMeta={stepsMeta}
          streakCount={streakCount}
          onStreakPress={() => setStreakModalVisible(true)}
          telegramId={user?.id}
        />

        {user ? (
          <>
            <Pressable style={[styles.primaryButton, styles.signOutButton]} onPress={handleTelegramSignOut}>
              <Text style={styles.primaryButtonText}>{t("auth.signOutButton")}</Text>
            </Pressable>

            <View style={styles.noteBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.navActive} />
              <Text style={styles.noteText}>{t("auth.securityDisclaimer")}</Text>
            </View>
          </>
        ) : null}

      <View style={styles.levelCard}>
        <View style={styles.levelHeaderRow}>
          <View style={styles.levelIconBadge}>
            <Ionicons name="trophy-outline" size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.levelHeaderText}>
            <Text style={styles.levelCardTitle}>{t("levels.profileTitle")}</Text>
            <Text style={styles.levelCardSubtitle}>{t("levels.profileSubtitle")}</Text>
          </View>
        </View>
        <Text style={styles.levelCurrentLabel}>{t("header.levelDynamic", { level, title: levelTitle })}</Text>
        <Text style={styles.levelXpTotal}>{profileXpLabel}</Text>
        <View style={styles.levelProgressTrack}>
          <View style={[styles.levelProgressFill, { width: `${levelProgressPercent}%` }]} />
        </View>
        <Text style={styles.levelProgressMeta}>{profileProgressLabel}</Text>
        <View style={styles.levelStatsRow}>
          <View style={styles.levelStatItem}>
            <Ionicons name="play-circle-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.levelStatText}>{coursesLabel}</Text>
          </View>
          <View style={styles.levelStatItem}>
            <Ionicons name="book-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.levelStatText}>{booksLabel}</Text>
          </View>
      </View>
      <Text style={styles.levelProgressNext}>{t("header.xpToNext", { xp: xpToNextLevel })}</Text>
    </View>

    <View style={styles.leaderboardCard}>
      <View style={styles.leaderboardHeaderRow}>
        <View style={styles.iconBadgeSmall}>
          <Ionicons name="podium-outline" size={20} color={theme.colors.accent} />
        </View>
        <View style={styles.leaderboardHeaderText}>
          <Text style={styles.leaderboardTitle}>{t("profile.leaderboard.sectionTitle")}</Text>
          <Text style={styles.leaderboardSubtitle}>{t("profile.leaderboard.sectionSubtitle")}</Text>
        </View>
      </View>
      <View style={styles.leaderboardScrollWrapper}>
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.leaderboardList}
        >
          {leaderboardEntries.map((entry) => (
            <View key={entry.id} style={styles.leaderboardItem}>
              <View style={styles.leaderboardRank}>
                <Text style={styles.leaderboardRankText}>#{entry.rank}</Text>
              </View>
              <Image source={{ uri: entry.avatarUrl }} style={styles.leaderboardAvatar} />
              <View style={styles.leaderboardDetails}>
                <Text style={styles.leaderboardName}>{entry.name}</Text>
                <Text style={styles.leaderboardUsername}>@{entry.username}</Text>
              </View>
              <View style={styles.leaderboardStats}>
                <Text style={styles.leaderboardTokens}>{entry.tokensLabel}</Text>
                <Text style={styles.leaderboardTime}>{entry.timeLabel}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
      {!isTelegramConnected ? (
        <Text style={styles.leaderboardFootnote}>{t("profile.leaderboard.loginHint")}</Text>
      ) : null}
    </View>

    <View style={styles.referralCard}>
      <View style={styles.referralHeader}>
        <View style={styles.iconBadgeSmall}>
          <Ionicons name="gift-outline" size={20} color={theme.colors.accent} />
        </View>
          <View style={styles.referralHeaderText}>
            <Text style={styles.referralTitle}>{t("referrals.sectionTitle")}</Text>
            <Text style={styles.referralSubtitle}>
              {isTelegramConnected
                ? t("referrals.sectionSubtitle")
                : t("referrals.sectionSubtitleAnonymous")}
            </Text>
          </View>
        </View>

        <View style={styles.referralCodeRow}>
          <Text style={styles.referralCodeValue}>{referralCodeLabel}</Text>
          <Pressable
            style={[styles.referralChip, !referralCode && styles.referralChipDisabled]}
            onPress={handleCopyCode}
            disabled={!referralCode}
          >
            <Ionicons name="copy-outline" size={15} color={theme.colors.accent} />
            <Text style={styles.referralChipText}>{t("referrals.copyCodeButton")}</Text>
          </Pressable>
        </View>

        <View style={styles.referralLinkRow}>
          <Text style={styles.referralLinkValue} numberOfLines={1}>
            {referralLinkLabel}
          </Text>
          <View style={styles.referralLinkActions}>
            <Pressable
              style={[styles.referralMiniButton, !hasReferralLink && styles.referralMiniButtonDisabled]}
              onPress={handleCopyLink}
              disabled={!hasReferralLink}
            >
              <Ionicons name="link-outline" size={15} color={theme.colors.accent} />
            </Pressable>
            <Pressable
              style={[styles.referralMiniButton, !hasReferralLink && styles.referralMiniButtonDisabled]}
              onPress={handleShareLink}
              disabled={!hasReferralLink}
            >
              <Ionicons name="share-social-outline" size={15} color={theme.colors.accent} />
            </Pressable>
          </View>
        </View>

        {formattedInvites.length === 0 ? (
          <Text style={styles.referralEmpty}>{t("referrals.emptyState")}</Text>
        ) : (
          <View style={styles.referralList}>
            {formattedInvites.map((invite) => (
              <View key={invite.id} style={styles.referralListItem}>
                <Ionicons name="person-add-outline" size={18} color={theme.colors.accent} />
                <View style={styles.referralInviteText}>
                  <Text style={styles.referralInviteName}>{invite.name}</Text>
                  <Text style={styles.referralInviteMeta}>
                    {t("referrals.inviteJoined", { date: invite.formattedDate })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={[
            styles.secondaryButton,
            styles.referralAddButton,
            !isTelegramConnected && styles.secondaryButtonDisabled
          ]}
          onPress={() => {
            if (!isTelegramConnected) {
              Alert.alert(
                t("referrals.loginRequiredTitle"),
                t("referrals.loginRequiredMessage")
              );
              return;
            }
            setInviteModalVisible(true);
          }}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              !isTelegramConnected && styles.secondaryButtonTextDisabled
            ]}
          >
            {t("referrals.addInviteButton")}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.sectionHeading}>{t("strava.sectionTitle")}</Text>
      <Text style={styles.sectionSubheading}>
        {stravaConfigured ? t("strava.connectDescription") : t("strava.comingSoonLead")}
      </Text>

      <View style={styles.stravaCard}>
        <View style={styles.stravaHeader}>
          <View style={styles.iconBadgeSmall}>
            <Ionicons name="footsteps-outline" size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.stravaHeaderText}>
            <Text style={styles.stravaStatusTitle}>
              {stravaConfigured
                ? stravaConnected
                  ? t("strava.connected")
                  : t("strava.notConnected")
                : t("strava.comingSoonTitle")}
            </Text>
            <Text style={styles.stravaStatusMeta}>{stravaStatusMeta}</Text>
            {stravaAthlete?.firstname ? (
              <Text style={styles.stravaStatusMeta}>
                {stravaAthlete.firstname} {stravaAthlete.lastname ?? ""}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.stravaStepsRow}>
          <View style={styles.stravaStepsText}>
            <Text style={styles.stravaStepsLabel}>{t("strava.stepsToday")}</Text>
            <Text style={styles.stravaStepsMeta}>{stravaStepEstimateNote}</Text>
          </View>
          <Text style={styles.stravaStepsValue}>{stravaStepsLabel}</Text>
        </View>

        {stravaErrorMessage ? <Text style={styles.errorText}>{stravaErrorMessage}</Text> : null}

        {stravaConfigured && stravaConnected ? (
          <View style={styles.stravaButtonRow}>
            <Pressable
              style={[styles.secondaryButton, stravaSyncing && styles.secondaryButtonDisabled]}
              onPress={handleStravaRefresh}
              disabled={stravaSyncing}
            >
              {stravaSyncing ? (
                <ActivityIndicator color={theme.colors.accent} />
              ) : (
                <Text style={styles.secondaryButtonText}>{t("strava.refreshButton")}</Text>
              )}
            </Pressable>
            <Pressable style={styles.secondaryOutlineButton} onPress={handleStravaDisconnect}>
              <Text style={styles.secondaryOutlineButtonText}>{t("strava.disconnectButton")}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.primaryButton, !stravaConfigured && styles.primaryButtonDisabled]}
            onPress={handleStravaConnect}
            disabled={!stravaConfigured}
          >
            <Text style={styles.primaryButtonText}>
              {stravaConfigured ? t("strava.connectButton") : t("strava.comingSoonAction")}
            </Text>
          </Pressable>
        )}

        <Text style={styles.stravaFooterNote}>
          {stravaConfigured ? t("strava.note") : t("strava.comingSoonDescription")}
        </Text>
      </View>

      </ScrollView>

      <Modal
        transparent
        visible={languageSheetVisible}
        animationType="fade"
        onRequestClose={handleLanguageSheetClose}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={handleLanguageSheetClose} />
          <View style={styles.languageSheet}>
            <Text style={styles.sheetTitle}>{t("language.selectorTitle")}</Text>
            {languageOptions.map((option) => {
              const isActive = option.code === language;
              return (
                <Pressable
                  key={option.code}
                  style={[styles.languageOption, isActive && styles.languageOptionActive]}
                  onPress={() => handleLanguageSelect(option.code)}
                >
                  <Text style={styles.languageOptionText}>{option.label}</Text>
                  <Ionicons
                    name={isActive ? "checkmark-circle" : "ellipse-outline"}
                    size={18}
                    color={isActive ? theme.colors.accent : theme.colors.textSecondary}
                  />
                </Pressable>
              );
            })}
            <Pressable style={styles.sheetCancelButton} onPress={handleLanguageSheetClose}>
              <Text style={styles.sheetCancelText}>{t("actions.close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <DailyStreakModal
        styles={styles}
        t={t}
        theme={theme}
        visible={streakModalVisible}
        onClose={() => setStreakModalVisible(false)}
        streakCount={streakCount}
        todayCompleted={streakTodayCompleted}
        nextReward={streakNextReward}
        requiredBookPages={requiredBookPages}
        requiredCourseMinutes={requiredCourseMinutes}
      />

      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeInviteModal}
      >
        <View style={styles.referralModalBackdrop}>
          <Pressable style={styles.referralModalDismiss} onPress={closeInviteModal} />
          <View style={styles.referralModalCard}>
            <Text style={styles.referralModalTitle}>{t("referrals.modalTitle")}</Text>
            <Text style={styles.referralModalSubtitle}>{t("referrals.modalSubtitle")}</Text>
            <TextInput
              value={newInviteName}
              onChangeText={setNewInviteName}
              placeholder={t("referrals.modalPlaceholder")}
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.referralModalInput}
            />
            <View style={styles.referralModalActions}>
              <Pressable style={styles.referralModalAction} onPress={closeInviteModal}>
                <Text style={styles.referralModalActionText}>{t("actions.close")}</Text>
              </Pressable>
              <Pressable style={styles.referralModalActionPrimary} onPress={handleInviteSubmit}>
                <Text style={styles.referralModalActionPrimaryText}>
                  {t("referrals.modalConfirm")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const ProfileSummaryCard = ({
  styles,
  t,
  theme,
  userName,
  userHandle,
  avatarUrl,
  levelLabel,
  xpProgressLabel,
  xpToNextLabel,
  balanceValue,
  tokenTicker,
  communityTotalUsers,
  communityOnlineUsers,
  communityTotalTokens,
  usageLabel,
  usageMeta,
  stepsValue,
  stepsMeta,
  streakCount,
  onStreakPress,
  telegramId
}: ProfileSummaryCardProps) => {
  const cardIconColor = theme.mode === "dark" ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.9)";

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTopRow}>
        <View style={styles.summaryIdentity}>
          <View style={styles.summaryAvatarWrapper}>
            <Image
              source={{ uri: avatarUrl ?? AVATAR_PLACEHOLDER }}
              style={styles.summaryAvatar}
              resizeMode="cover"
            />
          </View>
          <View style={styles.summaryIdentityText}>
            <Text style={styles.summaryName}>{userName ?? t("header.userLabel")}</Text>
            {userHandle ? <Text style={styles.summaryHandle}>@{userHandle}</Text> : null}
            {telegramId ? (
              <Text style={styles.summaryMeta}>{t("auth.telegramId", { id: telegramId })}</Text>
            ) : null}
            <Text style={styles.summaryLevel}>{levelLabel}</Text>
          </View>
        </View>
        <Pressable style={styles.streakBadge} onPress={onStreakPress}>
          <Ionicons name="flame" size={16} color="#FFF" />
          <Text style={styles.streakBadgeText}>{t("header.dailyStreak")}</Text>
          <View style={styles.streakBadgeCount}>
            <Text style={styles.streakBadgeCountText}>{streakCount}</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.summaryStatsRow}>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryStatLabel}>{t("header.stepsToday")}</Text>
          <Text style={styles.summaryStatValue}>{stepsValue}</Text>
          <Text style={styles.summaryStatMeta}>{stepsMeta}</Text>
        </View>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryStatLabel}>{t("header.xpLabel")}</Text>
          <Text style={[styles.summaryStatValue, styles.summaryStatValueAccent]}>{xpProgressLabel}</Text>
          <Text style={styles.summaryStatMeta}>{xpToNextLabel}</Text>
        </View>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryStatLabel}>{t("profile.metrics.balance")}</Text>
          <Text style={styles.summaryStatValue}>{balanceValue}</Text>
          <Text style={styles.summaryStatMeta}>{tokenTicker}</Text>
        </View>
      </View>

      <View style={styles.summaryUsageRow}>
        <View style={styles.summaryUsageIcon}>
          <Ionicons name="time-outline" size={18} color={cardIconColor} />
        </View>
        <View style={styles.summaryUsageText}>
          <Text style={styles.summaryUsageLabel}>{t("profile.metrics.time")}</Text>
          <Text style={styles.summaryUsageValue}>{usageLabel}</Text>
          <Text style={styles.summaryUsageMeta}>{usageMeta}</Text>
        </View>
      </View>

      <View style={styles.summaryCommunityRow}>
        <View style={styles.summaryCommunityItem}>
          <Text style={styles.summaryCommunityLabel}>{t("communityStats.totalUsers")}</Text>
          <Text style={styles.summaryCommunityValue}>{communityTotalUsers}</Text>
        </View>
        <View style={styles.summaryCommunityItem}>
          <Text style={styles.summaryCommunityLabel}>{t("communityStats.onlineUsers")}</Text>
          <Text style={styles.summaryCommunityValue}>{communityOnlineUsers}</Text>
        </View>
        <View style={styles.summaryCommunityItem}>
          <Text style={styles.summaryCommunityLabel}>{t("communityStats.totalTokens")}</Text>
          <Text style={styles.summaryCommunityValue}>
            {communityTotalTokens} {tokenTicker}
          </Text>
        </View>
      </View>
    </View>
  );
};

type DailyStreakModalProps = {
  styles: ReturnType<typeof createStyles>;
  t: TranslateFn;
  theme: ThemeDefinition;
  visible: boolean;
  onClose: () => void;
  streakCount: number;
  todayCompleted: boolean;
  nextReward: number;
  requiredBookPages: number;
  requiredCourseMinutes: number;
};

const DailyStreakModal = ({
  styles,
  t,
  theme,
  visible,
  onClose,
  streakCount,
  todayCompleted,
  nextReward,
  requiredBookPages,
  requiredCourseMinutes
}: DailyStreakModalProps) => {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalDismissArea} onPress={onClose} />
        <View style={[styles.streakModalCard, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.streakModalHeader}>
            <Text style={styles.streakModalTitle}>{t("dailyStreak.modalTitle")}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={18} color={theme.colors.textPrimary} />
            </Pressable>
          </View>
          <Text style={styles.streakModalSubtitle}>
            {t("dailyStreak.modalSubtitle", { streak: streakCount })}
          </Text>
          <View style={styles.streakRequirementRow}>
            <Ionicons name="book-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.streakRequirementText}>
              {t("dailyStreak.requirementsBook", { pages: requiredBookPages })}
            </Text>
          </View>
          <View style={styles.streakRequirementRow}>
            <Ionicons name="play-circle-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.streakRequirementText}>
              {t("dailyStreak.requirementsCourse", { minutes: requiredCourseMinutes })}
            </Text>
          </View>
          <View style={styles.streakStatusBox}>
            <Ionicons
              name={todayCompleted ? "checkmark-circle" : "time-outline"}
              size={18}
              color={theme.colors.accent}
            />
            <Text style={styles.streakStatusText}>
              {todayCompleted
                ? t("dailyStreak.todayDone", { reward: nextReward })
                : t("dailyStreak.nextRewardHint", { reward: nextReward })}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: ThemeDefinition) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    scrollContainer: {
      padding: 24,
      paddingBottom: 160
    },
    pageHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      flex: 1
    },
    brandLogo: {
      width: 44,
      height: 44,
      borderRadius: 12
    },
    brandText: {
      flex: 1
    },
    brandTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    brandSubtitle: {
      marginTop: 4,
      fontSize: 14,
      color: theme.colors.textSecondary
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    headerActionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    headerActionText: {
      fontWeight: "600",
      fontSize: 13,
      color: theme.colors.textPrimary,
      textTransform: "uppercase"
    },
    headerIconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center"
    },
    summaryCard: {
      marginTop: 16,
      padding: 16,
      borderRadius: 20,
      backgroundColor: theme.colors.userCardBackground,
      shadowColor: theme.colors.userCardShadow,
      shadowOpacity: 0.32,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 16,
      elevation: 8
    },
    summaryTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    },
    summaryIdentity: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    summaryAvatarWrapper: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden"
    },
    summaryAvatar: {
      width: "100%",
      height: "100%",
      borderRadius: 20
    },
    summaryIdentityText: {
      flex: 1
    },
    summaryName: {
      fontSize: 16,
      fontWeight: "700",
      color: "#FFFFFF"
    },
    summaryHandle: {
      marginTop: 1,
      fontSize: 11,
      color: "rgba(255,255,255,0.82)"
    },
    summaryMeta: {
      marginTop: 2,
      fontSize: 11,
      color: "rgba(255,255,255,0.7)"
    },
    summaryLevel: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: "600",
      color: "#FFFFFF"
    },
    streakBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.20)",
      borderRadius: 999,
      paddingVertical: 5,
      paddingHorizontal: 10,
      gap: 6
    },
    streakBadgeText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "600"
    },
    streakBadgeCount: {
      minWidth: 22,
      paddingHorizontal: 6,
      paddingVertical: 0,
      borderRadius: 999,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center"
    },
    streakBadgeCountText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.userCardBackground
    },
    summaryStatsRow: {
      marginTop: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8
    },
    summaryStat: {
      flex: 1,
      padding: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.24)",
      backgroundColor: "rgba(255,255,255,0.14)",
      gap: 4
    },
    summaryStatLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: "rgba(255,255,255,0.78)"
    },
    summaryStatValue: {
      fontSize: 15,
      fontWeight: "700",
      color: "#FFFFFF"
    },
    summaryStatValueAccent: {
      color: "#E0EAFF"
    },
    summaryStatMeta: {
      fontSize: 12,
      color: "rgba(255,255,255,0.7)"
    },
    summaryUsageRow: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.12)",
      padding: 12,
      gap: 10
    },
    summaryUsageIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center"
    },
    summaryUsageText: {
      flex: 1
    },
    summaryUsageLabel: {
      fontSize: 12,
      color: "rgba(255,255,255,0.78)"
    },
    summaryUsageValue: {
      marginTop: 2,
      fontSize: 16,
      fontWeight: "700",
      color: "#FFFFFF"
    },
    summaryUsageMeta: {
      marginTop: 2,
      fontSize: 11,
      color: "rgba(255,255,255,0.7)"
    },
    summaryCommunityRow: {
      marginTop: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: "rgba(255,255,255,0.1)",
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 12
    },
    summaryCommunityItem: {
      flex: 1
    },
    summaryCommunityLabel: {
      fontSize: 10,
      color: "rgba(255,255,255,0.72)"
    },
    summaryCommunityValue: {
      marginTop: 4,
      fontSize: 14,
      fontWeight: "700",
      color: "#FFFFFF"
    },
    infoCard: {
      marginTop: 28,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 24
    },
    iconBadge: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: theme.colors.highlight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16
    },
    infoTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    infoDescription: {
      marginTop: 10,
      fontSize: 14,
      color: theme.colors.textSecondary
    },
    infoSteps: {
      marginTop: 16,
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    primaryButton: {
      marginTop: 24,
      backgroundColor: theme.colors.accent,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center"
    },
    primaryButtonDisabled: {
      opacity: 0.65
    },
    primaryButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15
    },
    noteBox: {
      marginTop: 24,
      padding: 16,
      borderRadius: 14,
      backgroundColor: theme.colors.highlight,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12
    },
    noteText: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 13
    },
    levelCard: {
      marginTop: 28,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 20
    },
    levelHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16
    },
    levelIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.highlight,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12
    },
    levelHeaderText: {
      flex: 1
    },
    levelCardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    levelCardSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    levelCurrentLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary
    },
    levelXpTotal: {
      marginTop: 6,
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    levelProgressTrack: {
      marginTop: 14,
      height: 8,
      borderRadius: 6,
      backgroundColor: theme.colors.surfaceAlt,
      overflow: "hidden"
    },
    levelProgressFill: {
      height: "100%",
      backgroundColor: theme.colors.accent
    },
    levelProgressMeta: {
      marginTop: 8,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    levelStatsRow: {
      marginTop: 14,
      flexDirection: "row",
      justifyContent: "space-between"
    },
    levelStatItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8
    },
    levelStatText: {
      fontSize: 13,
      color: theme.colors.textPrimary,
      fontWeight: "600"
    },
    levelProgressNext: {
      marginTop: 12,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    leaderboardCard: {
      marginTop: 24,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 20
    },
    leaderboardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    leaderboardHeaderText: {
      flex: 1
    },
    leaderboardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    leaderboardSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    leaderboardList: {
      paddingVertical: 4,
      gap: 16
    },
    leaderboardItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    leaderboardRank: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: "center",
      justifyContent: "center"
    },
    leaderboardRankText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textSecondary
    },
    leaderboardAvatar: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceAlt
    },
    leaderboardDetails: {
      flex: 1
    },
    leaderboardName: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    leaderboardUsername: {
      marginTop: 2,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    leaderboardScrollWrapper: {
      marginTop: 20,
      maxHeight: 360
    },
    leaderboardStats: {
      alignItems: "flex-end",
      gap: 4
    },
    leaderboardTokens: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    leaderboardTime: {
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    leaderboardFootnote: {
      marginTop: 16,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    accountCard: {
      marginTop: 28,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 20,
      flexDirection: "row",
      alignItems: "center"
    },
    avatar: {
      width: 70,
      height: 70,
      borderRadius: 18,
      marginRight: 18
    },
    accountDetails: {
      flex: 1
    },
    accountName: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    accountUsername: {
      marginTop: 6,
      fontSize: 14,
      color: theme.colors.navActive
    },
    accountMeta: {
      marginTop: 4,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    signOutButton: {
      marginTop: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    sectionHeading: {
      marginTop: 36,
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    sectionSubheading: {
      marginTop: 6,
      fontSize: 14,
      color: theme.colors.textSecondary
    },
    referralCard: {
      marginTop: 36,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 20
    },
    referralHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16
    },
    referralHeaderText: {
      flex: 1
    },
    referralTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    referralSubtitle: {
      marginTop: 6,
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    referralCodeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    referralCodeValue: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    referralChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: theme.colors.highlight
    },
    referralChipDisabled: {
      opacity: 0.5
    },
    referralChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.accent
    },
    referralLinkRow: {
      marginTop: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    },
    referralLinkValue: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    referralLinkActions: {
      flexDirection: "row",
      gap: 8
    },
    referralMiniButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceAlt
    },
    referralMiniButtonDisabled: {
      opacity: 0.4
    },
    referralEmpty: {
      marginTop: 18,
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    referralList: {
      marginTop: 12,
      gap: 12
    },
    referralListItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 6
    },
    referralInviteText: {
      flex: 1
    },
    referralInviteName: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary
    },
    referralInviteMeta: {
      marginTop: 2,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    referralAddButton: {
      marginTop: 20
    },
    stravaCard: {
      marginTop: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 20
    },
    iconBadgeSmall: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.highlight,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12
    },
    stravaHeader: {
      flexDirection: "row",
      alignItems: "center"
    },
    stravaHeaderText: {
      flex: 1
    },
    stravaStatusTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    stravaStatusMeta: {
      marginTop: 4,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    stravaStepsRow: {
      marginTop: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    stravaStepsText: {
      flex: 1,
      paddingRight: 12
    },
    stravaStepsLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textPrimary
    },
    stravaStepsMeta: {
      marginTop: 6,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    stravaStepsValue: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.colors.accent
    },
    errorText: {
      marginTop: 16,
      fontSize: 12,
      color: "#E53935"
    },
    stravaButtonRow: {
      marginTop: 20,
      flexDirection: "row",
      gap: 12
    },
    secondaryButton: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12
    },
    secondaryButtonDisabled: {
      opacity: 0.6
    },
    secondaryButtonText: {
      color: theme.colors.accent,
      fontWeight: "600"
    },
    secondaryButtonTextDisabled: {
      color: theme.colors.textSecondary
    },
    secondaryOutlineButton: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12
    },
    secondaryOutlineButtonText: {
      color: theme.colors.textPrimary,
      fontWeight: "600"
    },
    stravaFooterNote: {
      marginTop: 16,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    modalBackdrop: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.overlay,
      justifyContent: "center",
      alignItems: "center"
    },
    modalDismissArea: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    },
    streakModalCard: {
      width: "90%",
      maxWidth: 420,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    languageSheet: {
      width: "90%",
      maxWidth: 360,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 20
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 12
    },
    languageOption: {
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10
    },
    languageOptionActive: {
      backgroundColor: theme.colors.highlight
    },
    languageOptionText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary
    },
    sheetCancelButton: {
      marginTop: 6,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.highlight,
      alignItems: "center"
    },
    sheetCancelText: {
      fontWeight: "600",
      color: theme.colors.accent
    },
    streakModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12
    },
    streakModalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    streakModalSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 18
    },
    streakRequirementRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12
    },
    streakRequirementText: {
      fontSize: 13,
      color: theme.colors.textPrimary,
      flex: 1
    },
    streakStatusBox: {
      marginTop: 18,
      padding: 14,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceAlt,
      flexDirection: "row",
      alignItems: "center",
      gap: 10
    },
    streakStatusText: {
      fontSize: 13,
      color: theme.colors.textPrimary,
      flex: 1
    },
    referralModalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      padding: 24
    },
    referralModalDismiss: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    },
    referralModalCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 20
    },
    referralModalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    referralModalSubtitle: {
      marginTop: 6,
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    referralModalInput: {
      marginTop: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceAlt
    },
    referralModalActions: {
      marginTop: 20,
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12
    },
    referralModalAction: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    referralModalActionText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary
    },
    referralModalActionPrimary: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.accent
    },
    referralModalActionPrimaryText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#fff"
    }
  });

export default ProfileScreen;
