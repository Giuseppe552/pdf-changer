import React from "react";
import type { MeResponse } from "@pdf-changer/shared";

export type AuthState = {
  me: MeResponse;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = React.createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("AuthContext missing");
  }
  return ctx;
}

