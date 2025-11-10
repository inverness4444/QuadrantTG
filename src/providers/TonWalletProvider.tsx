import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Linking } from "react-native";
import * as SecureStore from "expo-secure-store";
import EventEmitter from "eventemitter3";
import TonConnect, {
  type Account,
  type IStorage,
  type TonConnectError,
  type TonConnectOptions,
  type Wallet,
  type WalletInfo
} from "@tonconnect/sdk";

type TonWalletStatus = "disconnected" | "connecting" | "connected" | "restoring";

type TonWalletContextValue = {
  status: TonWalletStatus;
  address: string | null;
  wallet: Wallet | null;
  connectedWalletInfo: WalletInfo | null;
  wallets: WalletInfo[];
  isLoadingWallets: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (wallet: WalletInfo) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshWallets: () => Promise<void>;
};

const TonWalletContext = createContext<TonWalletContextValue | undefined>(undefined);

const STORAGE_PREFIX = "tonconnect:";
const MANIFEST_URL = "https://ton-connect.github.io/demo-dapp-with-react/tonconnect-manifest.json";

const storage: IStorage = {
  async getItem(key: string) {
    return SecureStore.getItemAsync(`${STORAGE_PREFIX}${key}`);
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(`${STORAGE_PREFIX}${key}`, value);
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(`${STORAGE_PREFIX}${key}`);
  }
};

const ensureTonConnectEnvironment = () => {
  const globalObject = global as unknown as {
    window?: any;
    CustomEvent?: any;
    document?: any;
  };

  if (!globalObject.CustomEvent) {
    globalObject.CustomEvent = class CustomEventPolyfill<T> {
      type: string;
      detail: T;
      constructor(type: string, params?: { detail?: T }) {
        this.type = type;
        this.detail = (params?.detail ?? null) as T;
      }
    };
  }

  if (!globalObject.window) {
    globalObject.window = globalObject;
  }

  if (!globalObject.document) {
    globalObject.document = {
      visibilityState: "visible",
      addEventListener: () => {},
      removeEventListener: () => {}
    };
  }

  const win = globalObject.window;
  if (!win.__tonconnectEmitter) {
    const emitter = new EventEmitter();
    win.__tonconnectEmitter = emitter;
    win.addEventListener = (eventName: string, listener: (event: any) => void) => {
      emitter.on(eventName, listener);
    };
    win.removeEventListener = (eventName: string, listener: (event: any) => void) => {
      emitter.off(eventName, listener);
    };
    win.dispatchEvent = (event: { type: string }) => {
      emitter.emit(event.type, event);
      return true;
    };
  }
};

ensureTonConnectEnvironment();

const createConnector = () => {
  const options: TonConnectOptions = {
    manifestUrl: MANIFEST_URL,
    storage
  };
  return new TonConnect(options);
};

export const TonWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const connectorRef = useRef<TonConnect | null>(null);
  if (!connectorRef.current) {
    connectorRef.current = createConnector();
  }
  const connector = connectorRef.current!;

  const [status, setStatus] = useState<TonWalletStatus>(connector.connected ? "connected" : "disconnected");
  const [account, setAccount] = useState<Account | null>(connector.account);
  const [wallet, setWallet] = useState<Wallet | null>(connector.wallet);
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [walletsLoading, setWalletsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const refreshWallets = useCallback(async () => {
    setWalletsLoading(true);
    try {
      const list = await connector.getWallets();
      setWallets(list);
    } catch (err) {
      console.warn("Failed to load wallets list", err);
      setError(err instanceof Error ? err.message : "Failed to load wallets list.");
    } finally {
      setWalletsLoading(false);
    }
  }, [connector]);

  useEffect(() => {
    refreshWallets().catch(() => {
      /* handled above */
    });
  }, [refreshWallets]);

  useEffect(() => {
    setStatus("restoring");
    connector
      .restoreConnection()
      .catch((err) => {
        console.warn("Failed to restore TON wallet connection", err);
      })
      .finally(() => {
        setStatus(connector.connected ? "connected" : "disconnected");
      });
  }, [connector]);

  useEffect(() => {
    const unsubscribe = connector.onStatusChange(
      (nextWallet) => {
        setWallet(nextWallet);
        setAccount(nextWallet?.account ?? null);
        setStatus(nextWallet ? "connected" : "disconnected");
        if (!nextWallet) {
          setIsConnecting(false);
        }
      },
      (err: TonConnectError) => {
        setError(err?.message ?? "TonConnect error");
        setStatus("disconnected");
        setIsConnecting(false);
      }
    );
    return unsubscribe;
  }, [connector]);

  const connect = useCallback(
    async (targetWallet: WalletInfo) => {
      setError(null);
      setIsConnecting(true);
      setStatus("connecting");
      try {
        let universalLink: string | undefined;
        if ("universalLink" in targetWallet && "bridgeUrl" in targetWallet) {
          const link = connector.connect({
            universalLink: targetWallet.universalLink,
            bridgeUrl: targetWallet.bridgeUrl
          });
          if (typeof link === "string") {
            universalLink = link;
          }
        } else if ("jsBridgeKey" in targetWallet) {
          const link = connector.connect({ jsBridgeKey: targetWallet.jsBridgeKey });
          if (typeof link === "string") {
            universalLink = link;
          }
        } else {
          throw new Error("Unsupported wallet type");
        }
        if (universalLink) {
          await Linking.openURL(universalLink);
        }
      } catch (err) {
        console.warn("TonConnect connect error", err);
        setError(err instanceof Error ? err.message : "Unable to connect wallet.");
        setStatus("disconnected");
        setIsConnecting(false);
      }
    },
    [connector]
  );

  const disconnect = useCallback(async () => {
    try {
      await connector.disconnect();
    } catch (err) {
      console.warn("TonConnect disconnect error", err);
    } finally {
      setStatus("disconnected");
      setIsConnecting(false);
      setAccount(null);
      setWallet(null);
    }
  }, [connector]);

  const connectedWalletInfo = useMemo(() => {
    if (!wallet) {
      return null;
    }
    return wallets.find((w) => w.appName === wallet.device.appName) ?? null;
  }, [wallet, wallets]);

  const value = useMemo<TonWalletContextValue>(
    () => ({
      status,
      address: account?.address ?? null,
      wallet,
      connectedWalletInfo,
      wallets,
      isLoadingWallets: walletsLoading,
      isConnecting,
      error,
      connect,
      disconnect,
      refreshWallets
    }),
    [
      status,
      account?.address,
      wallet,
      connectedWalletInfo,
      wallets,
      walletsLoading,
      isConnecting,
      error,
      connect,
      disconnect,
      refreshWallets
    ]
  );

  return <TonWalletContext.Provider value={value}>{children}</TonWalletContext.Provider>;
};

export const useTonWalletContext = () => {
  const ctx = useContext(TonWalletContext);
  if (!ctx) {
    throw new Error("useTonWalletContext must be used within TonWalletProvider");
  }
  return ctx;
};
