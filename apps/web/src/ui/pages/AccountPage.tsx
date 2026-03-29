import React from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useAuth } from "../auth/AuthContext";
import { api } from "../../utils/api";

type Credential = {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
  transports: string[];
};

export function AccountPage() {
  const { me, loading, refresh, signOut } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[] | null>(null);
  const [credentials, setCredentials] = React.useState<Credential[] | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (me.authenticated) {
      api.listCredentials().then((res) => setCredentials(res.credentials)).catch(() => {});
    } else {
      setCredentials(null);
    }
  }, [me.authenticated]);

  async function registerPasskey() {
    setBusy(true);
    setError(null);
    setRecoveryCodes(null);
    try {
      const options = await api.webauthnRegisterOptions();
      const attResp = await startRegistration(options);
      const verified = await api.webauthnRegisterVerify(attResp);
      if (verified?.recoveryCodes?.length) setRecoveryCodes(verified.recoveryCodes);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  async function loginPasskey() {
    setBusy(true);
    setError(null);
    setRecoveryCodes(null);
    try {
      const options = await api.webauthnLoginOptions();
      const asseResp = await startAuthentication(options);
      await api.webauthnLoginVerify(asseResp);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function consumeRecovery(code: string) {
    setBusy(true);
    setError(null);
    try {
      await api.consumeRecovery(code);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recovery failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeCredential(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteCredential(id);
      setCredentials((prev) => prev?.filter((c) => c.id !== id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove passkey");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    setError(null);
    try {
      await api.deleteAccount();
      setConfirmDelete(false);
      setCredentials(null);
      await signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion failed");
    } finally {
      setBusy(false);
    }
  }

  if (!me.authenticated) {
    return <GuestView busy={busy || loading} error={error} onRegister={registerPasskey} onLogin={loginPasskey} onRecover={consumeRecovery} recoveryCodes={recoveryCodes} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>

      <Card title="Status">
        <div className="space-y-2 text-sm">
          <div className="text-[var(--ui-text-secondary)]">
            All tools are free. Accounts are for supporters who want to manage their subscription.
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[var(--ui-text)]">Signed in</span>
            {me.plan === "paid" && (
              <span className="rounded-sm bg-[var(--ui-accent)] px-1.5 py-0.5 text-xs font-medium text-white">
                Supporter
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="secondary" onClick={() => void signOut()} disabled={busy}>
              Sign out
            </Button>
          </div>
        </div>
      </Card>

      {/* Passkey management */}
      <Card title="Your devices">
        {credentials === null ? (
          <div className="text-sm text-[var(--ui-text-muted)]">Loading…</div>
        ) : credentials.length === 0 ? (
          <div className="text-sm text-[var(--ui-text-muted)]">No passkeys registered.</div>
        ) : (
          <div className="space-y-2">
            {credentials.map((cred) => (
              <div key={cred.id} className="flex items-center justify-between rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg)] px-3 py-2">
                <div className="space-y-0.5">
                  <div className="text-sm text-[var(--ui-text)]">
                    {transportLabel(cred.transports)}
                  </div>
                  <div className="mono text-xs text-[var(--ui-text-muted)]">
                    Added {shortDate(cred.createdAt)}
                    {cred.lastUsedAt ? ` · Last used ${shortDate(cred.lastUsedAt)}` : ""}
                  </div>
                </div>
                {credentials.length > 1 && (
                  <button
                    onClick={() => void removeCredential(cred.id)}
                    disabled={busy}
                    className="text-xs text-[var(--ui-text-muted)] underline hover:text-red-400 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-3">
          <Button onClick={registerPasskey} disabled={busy}>
            Add another device
          </Button>
        </div>
      </Card>

      {/* Recovery codes (shown once after registration) */}
      {recoveryCodes ? (
        <Card title="Save these recovery codes" variant="warning">
          <p className="mb-3 text-sm text-[var(--ui-text-secondary)]">
            Shown once. Store offline or in an encrypted vault. Any 3 codes can restore your account.
          </p>
          <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3">
            <ul className="grid gap-2 text-xs text-[var(--ui-text)] md:grid-cols-2">
              {recoveryCodes.map((c) => (
                <li key={c} className="font-mono">{c}</li>
              ))}
            </ul>
          </div>
        </Card>
      ) : null}

      {/* Account recovery */}
      <Card title="Account recovery">
        <p className="mb-3 text-sm text-[var(--ui-text-secondary)]">
          Lost your device? Enter a recovery code to regain access.
        </p>
        <RecoveryForm onConsume={consumeRecovery} busy={busy} />
      </Card>

      {/* Danger zone */}
      <Card title="Delete account" variant="danger">
        <p className="mb-3 text-sm text-[var(--ui-text-secondary)]">
          Permanently removes your account, all passkeys, and recovery codes. This cannot be undone.
        </p>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <Button variant="danger" onClick={() => void deleteAccount()} disabled={busy}>
              {busy ? "Deleting…" : "Yes, delete everything"}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
            Delete account
          </Button>
        )}
      </Card>

      {error ? (
        <Card title="Error" variant="danger">
          <div className="text-sm text-red-300">{error}</div>
        </Card>
      ) : null}
    </div>
  );
}

function GuestView({
  busy,
  error,
  onRegister,
  onLogin,
  onRecover,
  recoveryCodes,
}: {
  busy: boolean;
  error: string | null;
  onRegister: () => void;
  onLogin: () => void;
  onRecover: (code: string) => void;
  recoveryCodes: string[] | null;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>

      <Card>
        <div className="space-y-3 text-sm">
          <p className="text-[var(--ui-text)]">
            You don't need an account to use any tool. Everything runs in your browser, free, no limits.
          </p>
          <p className="text-[var(--ui-text-secondary)]">
            Accounts exist for one reason: if you choose to support the project, a passkey lets you manage your subscription without giving us an email address.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="New here?">
          <p className="mb-3 text-sm text-[var(--ui-text-secondary)]">
            Creates a passkey on your device. No email, no password.
          </p>
          <Button onClick={onRegister} disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </Button>
        </Card>

        <Card title="Already have an account?">
          <p className="mb-3 text-sm text-[var(--ui-text-secondary)]">
            Sign in with the device you registered on.
          </p>
          <Button onClick={onLogin} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </Card>
      </div>

      {recoveryCodes ? (
        <Card title="Save these recovery codes" variant="warning">
          <p className="mb-3 text-sm text-[var(--ui-text-secondary)]">
            Shown once. Store offline or in an encrypted vault. Any 3 codes can restore your account.
          </p>
          <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3">
            <ul className="grid gap-2 text-xs text-[var(--ui-text)] md:grid-cols-2">
              {recoveryCodes.map((c) => (
                <li key={c} className="font-mono">{c}</li>
              ))}
            </ul>
          </div>
        </Card>
      ) : null}

      <Card title="Lost your device?">
        <p className="mb-3 text-sm text-[var(--ui-text-secondary)]">
          Enter a recovery code to regain access.
        </p>
        <RecoveryForm onConsume={onRecover} busy={busy} />
      </Card>

      {error ? (
        <Card title="Error" variant="danger">
          <div className="text-sm text-red-300">{error}</div>
        </Card>
      ) : null}
    </div>
  );
}

function RecoveryForm({
  onConsume,
  busy,
}: {
  onConsume: (code: string) => void | Promise<void>;
  busy: boolean;
}) {
  const [code, setCode] = React.useState("");

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = code.trim();
        if (trimmed.length < 10) return;
        void onConsume(trimmed);
        setCode("");
      }}
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX"
        className="w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)] placeholder:text-[var(--ui-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-focus)]"
        autoComplete="off"
        spellCheck={false}
      />
      <Button disabled={busy || code.trim().length < 10} type="submit">
        Use code
      </Button>
    </form>
  );
}

function transportLabel(transports: string[]): string {
  if (transports.includes("internal") || transports.includes("hybrid")) return "This device";
  if (transports.includes("usb")) return "USB security key";
  if (transports.includes("ble")) return "Bluetooth device";
  if (transports.includes("nfc")) return "NFC device";
  if (transports.length > 0) return transports[0];
  return "Passkey";
}

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
