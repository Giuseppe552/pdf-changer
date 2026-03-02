import React from "react";
import type { MeResponse } from "@pdf-changer/shared";
import { api } from "../../utils/api";
import {
  getCachedEntitlement,
  setCachedEntitlement,
} from "../../utils/entitlementCache";
import { AuthContext } from "./AuthContext";

const guest: MeResponse = {
  authenticated: false,
  plan: "guest",
  entitlementExpiresAt: null,
  entitlementToken: null,
};

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return Date.now() > Date.parse(expiresAt);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = React.useState<MeResponse>(guest);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.me();
      setMe(res);
      setCachedEntitlement(res);
    } catch {
      const cached = getCachedEntitlement();
      if (cached && !isExpired(cached.entitlementExpiresAt)) {
        setMe(cached);
      } else {
        setMe(guest);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = React.useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setMe(guest);
      setCachedEntitlement(guest);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ me, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
