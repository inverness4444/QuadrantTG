import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../hooks/useAuth";

const STORAGE_KEY = "quadrant_referral_state_v1";

export type ReferralInvite = {
  id: string;
  name: string;
  joinedAt: number;
};

type ReferralStorage = {
  fallbackCode: string;
  invites: ReferralInvite[];
};

type ReferralContextValue = {
  referralCode: string;
  referralLink: string;
  invitedFriends: ReferralInvite[];
  addInvite: (name: string) => void;
  removeInvite: (id: string) => void;
  resetInvites: () => void;
};

const ReferralContext = createContext<ReferralContextValue | undefined>(undefined);

const generateFallbackCode = () =>
  `QDR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const deriveCodeFromUser = (userCode?: string, fallbackCode?: string) => {
  if (userCode) {
    return userCode;
  }
  return fallbackCode ?? generateFallbackCode();
};

type ReferralProviderProps = {
  children: React.ReactNode;
};

export const ReferralProvider = ({ children }: ReferralProviderProps) => {
  const { user } = useAuth();
  const [storage, setStorage] = useState<ReferralStorage>({
    fallbackCode: generateFallbackCode(),
    invites: []
  });
  const [isLoaded, setIsLoaded] = useState(false);

  const userDerivedCode = useMemo(() => {
    if (!user) {
      return undefined;
    }
    if (user.username && user.username.trim().length > 0) {
      return user.username.trim().toLowerCase();
    }
    if (user.id) {
      return `tg${user.id}`;
    }
    return undefined;
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (!mounted) {
          return;
        }
        if (raw) {
          const parsed = JSON.parse(raw) as ReferralStorage;
          setStorage(parsed);
        }
      } catch (error) {
        console.warn("Failed to load referral storage", error);
      } finally {
        if (mounted) {
          setIsLoaded(true);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !storage) {
      return;
    }
    SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(storage)).catch((error) => {
      console.warn("Failed to persist referral storage", error);
    });
  }, [storage, isLoaded]);

  const referralCode = useMemo(
    () => deriveCodeFromUser(userDerivedCode, storage.fallbackCode),
    [userDerivedCode, storage.fallbackCode]
  );

  const referralLink = useMemo(
    () => `https://quadrant.app/join?ref=${encodeURIComponent(referralCode ?? "")}`,
    [referralCode]
  );

  const addInvite = useCallback((name: string) => {
    if (!name.trim()) {
      return;
    }
    setStorage((prev) => {
      const invite: ReferralInvite = {
        id: `invite-${Date.now()}`,
        name: name.trim(),
        joinedAt: Date.now()
      };
      return {
        ...prev,
        invites: [invite, ...prev.invites]
      };
    });
  }, []);

  const removeInvite = useCallback((id: string) => {
    setStorage((prev) => {
      return {
        ...prev,
        invites: prev.invites.filter((invite) => invite.id !== id)
      };
    });
  }, []);

  const resetInvites = useCallback(() => {
    setStorage((prev) => ({ ...prev, invites: [] }));
  }, []);

  const value = useMemo<ReferralContextValue>(
    () => ({
      referralCode: referralCode ?? "",
      referralLink,
      invitedFriends: storage.invites,
      addInvite,
      removeInvite,
      resetInvites
    }),
    [referralCode, referralLink, storage.invites, addInvite, removeInvite, resetInvites]
  );

  return <ReferralContext.Provider value={value}>{children}</ReferralContext.Provider>;
};

export const useReferralContext = () => {
  const context = useContext(ReferralContext);
  if (!context) {
    throw new Error("useReferralContext must be used within a ReferralProvider");
  }
  return context;
};
