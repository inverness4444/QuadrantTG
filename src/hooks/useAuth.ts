import { useAuthContext } from "../providers/AuthProvider";

export const useAuth = () => {
  const {
    user,
    profile,
    telegramInitData,
    isAdmin,
    signInWithTelegram,
    signOut,
    isAuthenticating,
    updateProfile,
    grantAdminOverride,
    revokeAdminOverride
  } = useAuthContext();
  return {
    user,
    profile,
    telegramInitData,
    isAdmin,
    signInWithTelegram,
    signOut,
    isAuthenticating,
    updateProfile,
    grantAdminOverride,
    revokeAdminOverride
  };
};
