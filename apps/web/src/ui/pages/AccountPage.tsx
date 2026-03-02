import React from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useAuth } from "../auth/AuthContext";
import { api } from "../../utils/api";

export function AccountPage() {
  const { me, loading, refresh, signOut } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[] | null>(
    null,
  );

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
      setError(e instanceof Error ? e.message : "Login failed");
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>

      <Card title="Status">
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-neutral-500">Plan:</span>{" "}
            <span className="font-medium text-neutral-900">{me.plan}</span>
          </div>
          <div>
            <span className="text-neutral-500">Authenticated:</span>{" "}
            <span className="font-medium text-neutral-900">
              {me.authenticated ? "yes" : "no"}
            </span>
          </div>
          <div>
            <span className="text-neutral-500">Entitlement expiry:</span>{" "}
            <span className="font-medium text-neutral-900">
              {me.entitlementExpiresAt ?? "—"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => void refresh()} disabled={busy || loading}>
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={() => void signOut()}
              disabled={busy || loading || !me.authenticated}
            >
              Sign out
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          title="Create passkey"
          footer={
            <div className="text-xs text-neutral-500">
              No email or phone required.
            </div>
          }
        >
          <Button onClick={registerPasskey} disabled={busy || loading}>
            Create passkey
          </Button>
        </Card>

        <Card
          title="Sign in"
          footer={
            <div className="text-xs text-neutral-500">
              Uses your device passkey prompt.
            </div>
          }
        >
          <Button onClick={loginPasskey} disabled={busy || loading}>
            Sign in with passkey
          </Button>
        </Card>
      </div>

      <Card title="Account recovery (recovery code)">
        <p className="mb-3 text-neutral-700">
          If you lose your passkey, a recovery code can restore access. Enter one
          code below.
        </p>
        <RecoveryForm onConsume={consumeRecovery} busy={busy || loading} />
      </Card>

      {recoveryCodes ? (
        <Card title="Save these recovery codes (shown once)">
          <p className="mb-3 text-neutral-700">
            Store these offline. Anyone with a code can access your account.
          </p>
          <div className="rounded-sm border border-neutral-200 bg-neutral-50 p-3">
            <ul className="grid gap-2 text-xs text-neutral-900 md:grid-cols-2">
              {recoveryCodes.map((c) => (
                <li key={c} className="font-mono">
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Tip: print to paper, or save in an encrypted vault.
          </p>
        </Card>
      ) : null}

      {error ? (
        <Card title="Error">
          <div className="text-sm text-red-700">{error}</div>
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
        void onConsume(code.trim());
      }}
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Recovery code"
        className="w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        autoComplete="off"
        spellCheck={false}
      />
      <Button disabled={busy || code.trim().length < 10} type="submit">
        Use code
      </Button>
    </form>
  );
}
