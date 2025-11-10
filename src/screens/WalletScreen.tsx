import React, { useMemo, useState } from "react";
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTonWallet } from "../hooks/useTonWallet";
import { useTheme } from "../hooks/useTheme";
import { useLocalization } from "../hooks/useLocalization";
import type { ThemeDefinition } from "../theme/themes";

const TonScanBaseUrl = "https://tonscan.org/address";

const WalletScreen = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    status,
    address,
    wallet,
    connectedWalletInfo,
    wallets,
    isLoadingWallets,
    isConnecting,
    error,
    connect,
    disconnect,
    refreshWallets
  } = useTonWallet();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) {
      return;
    }
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleViewExplorer = () => {
    if (!address) {
      return;
    }
    const url = `${TonScanBaseUrl}/${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => {
      /* ignore */
    });
  };

  const connectionInProgress = status === "connecting" || isConnecting;
  const restoring = status === "restoring";
  const connected = status === "connected" && !!address;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("wallet.title")}</Text>
      <Text style={styles.subtitle}>{t("wallet.subtitle")}</Text>

      {restoring && (
        <View style={styles.statusCard}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.statusText}>{t("wallet.status.restoring")}</Text>
        </View>
      )}

      {error && (
        <View style={[styles.alertCard, styles.alertCardError]}>
          <Ionicons name="warning-outline" size={18} color="#fff" />
          <Text style={styles.alertText}>{error}</Text>
          <Pressable style={styles.alertAction} onPress={refreshWallets}>
            <Text style={styles.alertActionText}>{t("wallet.actions.retry")}</Text>
          </Pressable>
        </View>
      )}

      {connected ? (
        <View style={styles.connectedCard}>
          <View style={styles.connectedHeader}>
            {connectedWalletInfo?.imageUrl ? (
              <Image source={{ uri: connectedWalletInfo.imageUrl }} style={styles.walletIcon} />
            ) : (
              <View style={styles.walletIconFallback}>
                <Feather name="shield" size={20} color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.connectedInfo}>
              <Text style={styles.connectedWalletName}>
                {connectedWalletInfo?.name ?? wallet?.device?.appName ?? t("wallet.labels.unknownWallet")}
              </Text>
              <Text style={styles.connectedChain}>
                {wallet?.account?.chain === "-3" ? t("wallet.chain.testnet") : t("wallet.chain.mainnet")}
              </Text>
            </View>
          </View>
          <View style={styles.addressRow}>
            <Text style={styles.addressLabel}>{t("wallet.labels.address")}</Text>
            <Text style={styles.addressValue}>{address}</Text>
          </View>
          <View style={styles.connectedActions}>
            <Pressable style={styles.secondaryButton} onPress={handleCopy}>
              <Ionicons
                name={(copied ? "checkmark" : "copy-outline") as never}
                size={16}
                color={theme.colors.accent}
              />
              <Text style={styles.secondaryButtonText}>
                {copied ? t("wallet.actions.copied") : t("wallet.actions.copy")}
              </Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleViewExplorer}>
              <Ionicons name={"external-link-outline" as never} size={16} color={theme.colors.accent} />
              <Text style={styles.secondaryButtonText}>{t("wallet.actions.explorer")}</Text>
            </Pressable>
          </View>
          <Pressable style={styles.disconnectButton} onPress={disconnect}>
            <Text style={styles.disconnectButtonText}>{t("wallet.actions.disconnect")}</Text>
          </Pressable>
          <Text style={styles.helperText}>{t("wallet.helper.reconnectHint")}</Text>
        </View>
      ) : (
        <View style={styles.walletsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("wallet.section.available")}</Text>
            <Pressable style={styles.refreshButton} onPress={refreshWallets}>
              <Ionicons name={"refresh-outline" as never} size={18} color={theme.colors.accent} />
            </Pressable>
          </View>
          {isLoadingWallets ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.loaderText}>{t("wallet.status.loadingWallets")}</Text>
            </View>
          ) : (
            wallets.map((availableWallet) => {
              const disableConnect = connectionInProgress;
              return (
                <View key={availableWallet.appName} style={styles.walletCard}>
                  <View style={styles.walletCardHeader}>
                    {availableWallet.imageUrl ? (
                      <Image source={{ uri: availableWallet.imageUrl }} style={styles.walletCardIcon} />
                    ) : (
                      <View style={styles.walletCardIconFallback}>
                        <Feather name="shield" size={18} color={theme.colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.walletCardInfo}>
                      <Text style={styles.walletCardName}>{availableWallet.name}</Text>
                      <Text style={styles.walletCardPlatforms}>
                        {availableWallet.platforms.join(", ")}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={[styles.connectButton, disableConnect && styles.connectButtonDisabled]}
                    onPress={() => connect(availableWallet)}
                    disabled={disableConnect}
                  >
                    {connectionInProgress ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.connectButtonText}>{t("wallet.actions.connect")}</Text>
                    )}
                  </Pressable>
                </View>
              );
            })
          )}
          <Text style={styles.helperText}>{t("wallet.helper.installHint")}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const createStyles = (theme: ThemeDefinition) =>
  StyleSheet.create({
    container: {
      padding: 20,
      paddingBottom: 40
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    subtitle: {
      marginTop: 6,
      fontSize: 14,
      color: theme.colors.textSecondary
    },
    statusCard: {
      marginTop: 18,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    statusText: {
      color: theme.colors.textSecondary,
      fontSize: 13
    },
    alertCard: {
      marginTop: 18,
      borderRadius: 16,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10
    },
    alertCardError: {
      backgroundColor: "#D64545"
    },
    alertText: {
      color: "#fff",
      flex: 1,
      fontSize: 13
    },
    alertAction: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: "rgba(255,255,255,0.15)"
    },
    alertActionText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 12
    },
    connectedCard: {
      marginTop: 18,
      padding: 20,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    connectedHeader: {
      flexDirection: "row",
      alignItems: "center"
    },
    walletIcon: {
      width: 48,
      height: 48,
      borderRadius: 12
    },
    walletIconFallback: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: "center",
      justifyContent: "center"
    },
    connectedInfo: {
      marginLeft: 14
    },
    connectedWalletName: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    connectedChain: {
      marginTop: 4,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    addressRow: {
      marginTop: 18
    },
    addressLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary
    },
    addressValue: {
      marginTop: 8,
      fontSize: 13,
      fontFamily: "Courier",
      color: theme.colors.textPrimary
    },
    connectedActions: {
      marginTop: 16,
      flexDirection: "row",
      gap: 12
    },
    secondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      backgroundColor: "transparent"
    },
    secondaryButtonText: {
      color: theme.colors.accent,
      fontWeight: "600",
      fontSize: 12
    },
    disconnectButton: {
      marginTop: 18,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: "#D64545",
      alignItems: "center"
    },
    disconnectButtonText: {
      color: "#fff",
      fontWeight: "600"
    },
    helperText: {
      marginTop: 12,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    walletsSection: {
      marginTop: 18
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary
    },
    refreshButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceAlt
    },
    loaderContainer: {
      marginTop: 20,
      padding: 18,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    loaderText: {
      fontSize: 13,
      color: theme.colors.textSecondary
    },
    walletCard: {
      marginTop: 16,
      padding: 18,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    walletCardHeader: {
      flexDirection: "row",
      alignItems: "center"
    },
    walletCardIcon: {
      width: 44,
      height: 44,
      borderRadius: 12
    },
    walletCardIconFallback: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: "center",
      justifyContent: "center"
    },
    walletCardInfo: {
      marginLeft: 12
    },
    walletCardName: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textPrimary
    },
    walletCardPlatforms: {
      marginTop: 4,
      fontSize: 12,
      color: theme.colors.textSecondary
    },
    connectButton: {
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.accent,
      alignItems: "center"
    },
    connectButtonDisabled: {
      backgroundColor: theme.colors.surfaceAlt
    },
    connectButtonText: {
      color: "#fff",
      fontWeight: "600"
    }
  });

export default WalletScreen;
