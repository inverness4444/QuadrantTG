import "node-libs-expo/globals";
import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CoursesScreen, BooksScreen } from "./src/screens/HomeScreen";
import EarnScreen from "./src/screens/EarnScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import AdminScreen from "./src/screens/AdminScreen";
import { AppUsageTracker } from "./src/components/AppUsageTracker";
import { AppProviders } from "./src/providers/AppProviders";
import { useTheme } from "./src/hooks/useTheme";
import { useLocalization } from "./src/hooks/useLocalization";
import { useAuth } from "./src/hooks/useAuth";
import type { ThemeDefinition } from "./src/theme/themes";

type BottomTab = "Profile" | "Courses" | "Books" | "Earn" | "Admin";

type BottomTabItem = {
  key: BottomTab;
  icon: string;
  iconOutline: string;
  labelKey: string;
};

const baseBottomTabs: BottomTabItem[] = [
  { key: "Profile", icon: "person", iconOutline: "person-outline", labelKey: "nav.profile" },
  { key: "Courses", icon: "school", iconOutline: "school-outline", labelKey: "nav.courses" },
  { key: "Books", icon: "book", iconOutline: "book-outline", labelKey: "nav.books" },
  { key: "Earn", icon: "gift", iconOutline: "gift-outline", labelKey: "nav.earn" }
];

const adminTab: BottomTabItem = {
  key: "Admin",
  icon: "construct",
  iconOutline: "construct-outline",
  labelKey: "nav.admin"
};

export default function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}

const AppContent = () => {
  const [activeTab, setActiveTab] = useState<BottomTab>("Profile");
  const { theme, mode } = useTheme();
  const { t } = useLocalization();
  const { user, isAdmin, signInWithTelegram, isAuthenticating, grantAdminOverride } = useAuth();
  const [devUnlocked, setDevUnlocked] = useState(false);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isAuthenticated = Boolean(user) || devUnlocked;

  const tabs = useMemo(
    () => (isAdmin ? [...baseBottomTabs, adminTab] : baseBottomTabs),
    [isAdmin]
  );
  const activeTabItem = tabs.find((item) => item.key === activeTab) ?? tabs[0];

  useEffect(() => {
    if (!isAdmin && activeTab === "Admin") {
      setActiveTab("Profile");
    }
  }, [activeTab, isAdmin]);

  const handleDevUnlock = () => {
    setDevUnlocked(true);
    grantAdminOverride();
    setActiveTab("Admin");
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={mode === "light" ? "dark-content" : "light-content"} />
        <AuthGate
          styles={styles}
          isLoading={isAuthenticating}
          onTelegramPress={signInWithTelegram}
          onUnlock={handleDevUnlock}
        />
      </SafeAreaView>
    );
  }

  const renderActiveScreen = () => {
    if (activeTab === "Profile") {
      return <ProfileScreen />;
    }
    if (activeTab === "Courses") {
      return <CoursesScreen />;
    }
    if (activeTab === "Books") {
      return <BooksScreen />;
    }
    if (activeTab === "Earn") {
      return <EarnScreen />;
    }
    if (activeTab === "Admin") {
      if (!isAdmin) {
        return <PlaceholderScreen sectionLabel={t(activeTabItem.labelKey)} />;
      }
      return <AdminScreen />;
    }
    return <PlaceholderScreen sectionLabel={t(activeTabItem.labelKey)} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppUsageTracker />
      <StatusBar barStyle={mode === "light" ? "dark-content" : "light-content"} />
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>
      <BottomNavigation tabs={tabs} activeTab={activeTab} onSelectTab={setActiveTab} />
    </SafeAreaView>
  );
};

type AuthGateProps = {
  styles: ReturnType<typeof createStyles>;
  onTelegramPress: () => Promise<void> | void;
  onUnlock: () => void;
  isLoading: boolean;
};

const AuthGate = ({ styles, onTelegramPress, onUnlock, isLoading }: AuthGateProps) => {
  const { t } = useLocalization();
  const { theme } = useTheme();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  const handleDevUnlock = () => {
    if (login.trim() === "1111" && password.trim() === "2222") {
      setError(undefined);
      onUnlock();
      return;
    }
    setError(t("auth.devLoginInvalid"));
  };

  const handleTelegramPress = () => {
    if (error) {
      setError(undefined);
    }
    onTelegramPress();
  };

  return (
    <View style={styles.authGateContainer}>
      <View style={styles.authGateCard}>
        <Text style={styles.authGateTitle}>{t("auth.lockedTitle")}</Text>
        <Text style={styles.authGateSubtitle}>{t("auth.lockedSubtitle")}</Text>
        <Pressable
          style={[styles.authGatePrimaryButton, isLoading && styles.authGatePrimaryButtonDisabled]}
          onPress={handleTelegramPress}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={18} color="#fff" />
              <Text style={styles.authGatePrimaryButtonText}>{t("auth.connectButton")}</Text>
            </>
          )}
        </Pressable>

        <View style={styles.authGateDivider}>
          <View style={styles.authGateDividerLine} />
          <Text style={styles.authGateDividerText}>{t("auth.lockedOr")}</Text>
          <View style={styles.authGateDividerLine} />
        </View>

        <Text style={styles.authGateDevTitle}>{t("auth.devLoginTitle")}</Text>
        <TextInput
          style={styles.authGateInput}
          value={login}
          onChangeText={(value) => {
            setLogin(value);
            if (error) {
              setError(undefined);
            }
          }}
          placeholder={t("auth.devLoginUsernamePlaceholder")}
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.authGateInput}
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (error) {
              setError(undefined);
            }
          }}
          placeholder={t("auth.devLoginPasswordPlaceholder")}
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry
        />
        <Pressable style={styles.authGateSecondaryButton} onPress={handleDevUnlock}>
          <Text style={styles.authGateSecondaryButtonText}>{t("auth.devLoginSubmit")}</Text>
        </Pressable>
        {error ? <Text style={styles.authGateError}>{error}</Text> : null}
      </View>
    </View>
  );
};

type PlaceholderScreenProps = {
  sectionLabel: string;
};

const PlaceholderScreen = ({ sectionLabel }: PlaceholderScreenProps) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.placeholderContainer}>
      <Ionicons name="construct-outline" size={48} color={theme.colors.navInactive} />
      <Text style={styles.placeholderTitle}>{t("placeholder.comingSoonTitle", { section: sectionLabel })}</Text>
      <Text style={styles.placeholderDescription}>{t("placeholder.comingSoonDescription")}</Text>
    </View>
  );
};

type BottomNavigationProps = {
  tabs: BottomTabItem[];
  activeTab: BottomTab;
  onSelectTab: (tab: BottomTab) => void;
};

const BottomNavigation = ({ tabs, activeTab, onSelectTab }: BottomNavigationProps) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable key={tab.key} style={styles.bottomNavButton} onPress={() => onSelectTab(tab.key)}>
            <Ionicons
              name={(isActive ? tab.icon : tab.iconOutline) as never}
              size={22}
              color={isActive ? theme.colors.navActive : theme.colors.navInactive}
            />
            <Text style={[styles.bottomNavLabel, isActive && styles.bottomNavLabelActive]}>
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = (theme: ThemeDefinition) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    screenContainer: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    authGateContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
      backgroundColor: theme.colors.background
    },
    authGateCard: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 32,
      paddingHorizontal: 24
    },
    authGateTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      textAlign: "center"
    },
    authGateSubtitle: {
      marginTop: 12,
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: "center"
    },
    authGatePrimaryButton: {
      marginTop: 24,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: theme.colors.accent,
      paddingVertical: 14,
      borderRadius: 14
    },
    authGatePrimaryButtonDisabled: {
      opacity: 0.7
    },
    authGatePrimaryButtonText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700"
    },
    authGateDivider: {
      marginTop: 24,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    authGateDividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border
    },
    authGateDividerText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5
    },
    authGateDevTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    authGateInput: {
      marginTop: 12,
      width: "100%",
      backgroundColor: theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.colors.textPrimary
    },
    authGateSecondaryButton: {
      marginTop: 16,
      width: "100%",
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      alignItems: "center"
    },
    authGateSecondaryButtonText: {
      color: theme.colors.accent,
      fontSize: 14,
      fontWeight: "700"
    },
    authGateError: {
      marginTop: 12,
      fontSize: 12,
      color: "#EF4444",
      textAlign: "center"
    },
    placeholderContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32
    },
    placeholderTitle: {
      marginTop: 16,
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      textAlign: "center"
    },
    placeholderDescription: {
      marginTop: 10,
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: "center"
    },
    bottomNav: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: theme.colors.navBackground,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.navBorder
    },
    bottomNavButton: {
      alignItems: "center",
      flex: 1
    },
    bottomNavLabel: {
      marginTop: 6,
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.navInactive
    },
    bottomNavLabelActive: {
      color: theme.colors.navActive
    }
  });
