import type {
  CheckoutResponse,
  MeResponse,
  PortalResponse,
} from "@pdf-changer/shared";

type EnvShape = {
  VITE_API_BASE_URL?: string;
  VITE_CSP_CONNECT_SRC?: string;
};

const ENV = (import.meta as ImportMeta & { env?: EnvShape }).env ?? {};
const API_BASE_URL = ENV.VITE_API_BASE_URL;
const CSP_CONNECT_SRC = ENV.VITE_CSP_CONNECT_SRC ?? "'self'";

function hostMatchesPattern(origin: string, pattern: string): boolean {
  if (!pattern.startsWith("https://*.")) return false;
  const expectedSuffix = pattern.slice("https://*.".length);
  try {
    const host = new URL(origin).hostname;
    return host === expectedSuffix || host.endsWith(`.${expectedSuffix}`);
  } catch {
    return false;
  }
}

function cspIncludesOrigin(connectSrc: string, origin: string): boolean {
  const parts = connectSrc
    .replace("connect-src", "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.includes("*") || parts.includes("https:")) return true;
  if (parts.includes(origin)) return true;
  return parts.some((part) => hostMatchesPattern(origin, part));
}

function warnCspForCrossOriginApi(baseUrl: string | undefined): void {
  if (!baseUrl || typeof window === "undefined") return;
  try {
    const apiOrigin = new URL(baseUrl, window.location.origin).origin;
    if (apiOrigin === window.location.origin) return;
    if (cspIncludesOrigin(CSP_CONNECT_SRC, apiOrigin)) return;
    globalThis.console.warn(
      `VITE_API_BASE_URL is cross-origin (${apiOrigin}). Ensure CSP connect-src includes this origin.`,
    );
  } catch {
    // ignore invalid URL warnings here; request failures will surface separately
  }
}

warnCspForCrossOriginApi(API_BASE_URL);

function apiUrl(path: string): string {
  const base = (API_BASE_URL ?? "").replace(/\/+$/, "");
  return base ? `${base}${path}` : path;
}

async function fetchJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const msg = await safeReadText(res);
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export const api = {
  me: () => fetchJson<MeResponse>("/v1/me"),
  logout: () => fetchJson<{ ok: true }>("/v1/logout", { method: "POST" }),

  webauthnRegisterOptions: () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- webauthn options passed directly to browser API
    fetchJson<any>("/v1/webauthn/register/options", { method: "POST" }),
  webauthnRegisterVerify: (body: unknown) =>
    fetchJson<{ ok: true; recoveryCodes?: string[] }>(
      "/v1/webauthn/register/verify",
      { method: "POST", body: JSON.stringify(body) },
    ),
  webauthnLoginOptions: () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- webauthn options passed directly to browser API
    fetchJson<any>("/v1/webauthn/login/options", { method: "POST" }),
  webauthnLoginVerify: (body: unknown) =>
    fetchJson<{ ok: true }>("/v1/webauthn/login/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  consumeRecovery: (code: string) =>
    fetchJson<{ ok: true }>("/v1/recovery/consume", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  checkout: () =>
    fetchJson<CheckoutResponse>("/v1/billing/checkout", { method: "POST" }),
  portal: () =>
    fetchJson<PortalResponse>("/v1/billing/portal", { method: "POST" }),

  newsletterSubscribe: (email: string) =>
    fetchJson<{ ok: true }>("/v1/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  listCredentials: () =>
    fetchJson<{
      credentials: Array<{
        id: string;
        createdAt: string;
        lastUsedAt: string | null;
        transports: string[];
      }>;
    }>("/v1/credentials"),

  deleteCredential: (id: string) =>
    fetchJson<{ ok: true }>(`/v1/credentials/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  deleteAccount: () =>
    fetchJson<{ ok: true }>("/v1/account/delete", { method: "POST" }),

  health: () => fetchJson<{ ok: true }>("/v1/health"),
};
