import React from "react";
import { NavLink } from "react-router-dom";
import { donateAddresses, hasPlaceholderAddresses, type DonateAddress } from "../../content/donate/addresses";
import { validateDonateAddress } from "../../content/donate/validateAddress";
import { verifyDonateAddressIntegrity, type IntegrityResult } from "../../content/donate/verifyIntegrity";
import { Button } from "../components/Button";

const STRIPE_ONE_TIME_URL = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env
  .VITE_DONATE_STRIPE_ONE_TIME_URL;
const STRIPE_MONTHLY_URL = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env
  .VITE_DONATE_STRIPE_MONTHLY_URL;

export function DonatePage() {
  const [integrity, setIntegrity] = React.useState<IntegrityResult | null>(null);
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    document.title = "Donate · PDF Changer";
  }, []);

  // Run integrity check + address validation on mount
  React.useEffect(() => {
    verifyDonateAddressIntegrity().then(setIntegrity);

    async function validate() {
      const errors: Record<string, string> = {};
      for (const addr of donateAddresses) {
        const result = await validateDonateAddress(addr.symbol, addr.address);
        if (!result.valid && result.error) {
          errors[addr.symbol] = result.error;
        }
      }
      setValidationErrors(errors);
    }
    void validate();
  }, []);

  const isPlaceholder = hasPlaceholderAddresses();
  const hasMismatch = integrity?.status === "mismatch";
  const hasValidationIssues = Object.keys(validationErrors).length > 0;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="mono text-xs tracking-wider uppercase text-[var(--ui-accent)] mb-3">
          Support
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Donate</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--ui-text-secondary)] leading-relaxed">
          PDF Changer is free, open source, and has no ads or tracking.
          Donations keep it maintained. No analytics on this page. No wallet-connect scripts. No third-party loads.
        </p>
      </div>

      {/* CRITICAL: Integrity mismatch — hard stop */}
      {hasMismatch && (
        <div className="rounded-lg border-2 border-red-600 bg-red-950/40 px-5 py-5">
          <div className="mono text-sm font-bold text-red-300 tracking-wider uppercase mb-2">
            ADDRESS INTEGRITY FAILURE — DO NOT DONATE
          </div>
          <div className="text-sm text-red-200/80 leading-relaxed">
            The addresses displayed on this page do not match the PGP-signed proof manifest.
            This could indicate a compromised build or deployment.
            Verify addresses manually at the{" "}
            <NavLink to="/donate/proof" className="underline text-red-300">
              proof center
            </NavLink>{" "}
            before sending any funds.
          </div>
          <div className="mt-2 mono text-xs text-red-400/70">{integrity.details}</div>
        </div>
      )}

      {/* Placeholder warning */}
      {isPlaceholder && !hasMismatch && (
        <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 px-5 py-4">
          <div className="mono text-xs font-medium text-[var(--ui-warn)] tracking-wider uppercase mb-1">
            Placeholder addresses
          </div>
          <div className="text-xs text-amber-200/70">
            The addresses below are placeholders. Real addresses will be added before launch.
            Do not send funds to these addresses.
          </div>
        </div>
      )}

      {/* Integrity status bar */}
      {integrity && !hasMismatch && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-4 py-3">
          <span
            className={`mono text-[10px] font-medium tracking-wider uppercase ${
              integrity.status === "pass"
                ? "text-[var(--ui-success)]"
                : "text-[var(--ui-text-muted)]"
            }`}
          >
            {integrity.status === "pass"
              ? "Addresses match signed manifest"
              : "Manifest check unavailable"}
          </span>
          <span className="mono text-[10px] text-[var(--ui-text-muted)]">
            checked {new Date(integrity.checkedAt).toLocaleTimeString()}
          </span>
          {integrity.status === "unavailable" && (
            <span className="mono text-[10px] text-[var(--ui-text-muted)]">
              — {integrity.reason}
            </span>
          )}
        </div>
      )}

      {/* Donor privacy */}
      <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-5 py-4">
        <div className="mono text-xs tracking-wider uppercase text-[var(--ui-text-muted)] mb-2">
          Donor privacy
        </div>
        <ul className="space-y-1.5 text-xs text-[var(--ui-text-secondary)]">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--ui-success)] shrink-0" />
            We do not collect, store, or publish any information about donors.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--ui-success)] shrink-0" />
            No KYC. No email required. No account needed.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--ui-success)] shrink-0" />
            Monero is recommended — private by default at the protocol level (ring signatures, stealth addresses, RingCT).
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--ui-success)] shrink-0" />
            We never publish transaction IDs, on-chain receipts, or donation amounts.
          </li>
        </ul>
      </div>

      {/* Crypto — primary */}
      <section>
        <div className="mono text-xs tracking-wider uppercase text-[var(--ui-text-muted)] mb-4">
          Cryptocurrency
        </div>
        <div className="space-y-3">
          {donateAddresses.map((addr) => (
            <CryptoCard
              key={addr.symbol}
              addr={addr}
              validationError={validationErrors[addr.symbol]}
              disabled={hasMismatch}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <NavLink
            to="/donate/proof"
            className="mono text-xs text-[var(--ui-accent)] hover:text-[var(--ui-accent-hover)] transition-colors"
          >
            verify addresses (PGP signed) &rarr;
          </NavLink>
          <NavLink
            to="/donate/proof/archive"
            className="mono text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-text-secondary)] transition-colors"
          >
            proof archive &rarr;
          </NavLink>
        </div>
      </section>

      {/* Card / Stripe — secondary */}
      <section>
        <div className="mono text-xs tracking-wider uppercase text-[var(--ui-text-muted)] mb-4">
          Card (Stripe)
        </div>
        <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-5 py-5">
          <div className="flex flex-wrap items-center gap-3">
            <StripeLink href={STRIPE_ONE_TIME_URL} label="One-time" />
            <StripeLink href={STRIPE_MONTHLY_URL} label="Monthly" />
          </div>
          <div className="mt-3 text-xs text-[var(--ui-text-muted)]">
            Stripe handles all card processing. No payment data touches this site.
          </div>
        </div>
      </section>

      {/* Trust footer */}
      <div className="flex flex-wrap items-center gap-4 border-t border-[var(--ui-border)] pt-6">
        <NavLink to="/donate/proof" className="text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-text-secondary)] underline transition-colors">
          Address proof center
        </NavLink>
        <NavLink to="/donate/proof/archive" className="text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-text-secondary)] underline transition-colors">
          Proof archive
        </NavLink>
        <NavLink to="/security/policy" className="text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-text-secondary)] underline transition-colors">
          Defensive-only policy
        </NavLink>
      </div>
    </div>
  );
}

/* ── Crypto address card ─────────────────────────────────────────────── */

function CryptoCard({
  addr,
  validationError,
  disabled,
}: {
  addr: DonateAddress;
  validationError?: string;
  disabled?: boolean;
}) {
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "mismatch" | "unverified">("idle");

  async function handleCopy() {
    if (disabled) return;
    await navigator.clipboard.writeText(addr.address);

    // Clipboard readback verification (when browser allows)
    try {
      const readback = await navigator.clipboard.readText();
      if (readback !== addr.address) {
        setCopyState("mismatch");
        return; // DO NOT dismiss — this is critical
      }
      setCopyState("copied");
    } catch {
      // Firefox / Safari may deny clipboard read — show unverified state
      setCopyState("unverified");
    }
    setTimeout(() => setCopyState("idle"), 4000);
  }

  const prefix = addr.address.slice(0, 8);
  const suffix = addr.address.slice(-8);

  return (
    <div
      className={`rounded-lg border overflow-hidden ${
        validationError
          ? "border-red-700/40 bg-red-950/20"
          : "border-[var(--ui-border)] bg-[var(--ui-bg-raised)]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--ui-border)]">
        <div className="flex items-center gap-3">
          <CoinIcon symbol={addr.symbol} />
          <div>
            <div className="text-sm font-medium text-[var(--ui-text)]">{addr.network}</div>
            <div className="mono text-[10px] text-[var(--ui-text-muted)]">{addr.symbol}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {addr.note && (
            <span className="mono text-[10px] text-[var(--ui-text-muted)] hidden sm:block">{addr.note}</span>
          )}
          {validationError && (
            <span className="mono text-[10px] text-red-300">format invalid</span>
          )}
        </div>
      </div>

      {/* Address + actions */}
      <div className="px-5 py-4">
        {/* Validation error */}
        {validationError && (
          <div className="mb-3 rounded border border-red-700/40 bg-red-950/30 px-3 py-2 mono text-[10px] text-red-300">
            Validation error: {validationError}
          </div>
        )}

        {/* Address */}
        <div className="mono text-xs text-[var(--ui-text)] break-all leading-relaxed bg-[var(--ui-bg)] border border-[var(--ui-border)] rounded px-3 py-2.5 select-all">
          {addr.address}
        </div>

        {/* Actions */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            disabled={disabled}
            className={`mono text-xs px-3 py-1.5 rounded border transition-all disabled:opacity-40 ${
              copyState === "copied"
                ? "border-[var(--ui-success)]/40 bg-[var(--ui-success)]/10 text-[var(--ui-success)]"
                : copyState === "mismatch"
                  ? "border-red-600 bg-red-950/40 text-red-300"
                  : copyState === "unverified"
                    ? "border-amber-600/40 bg-amber-950/20 text-amber-300"
                    : "border-[var(--ui-border-strong)] text-[var(--ui-text-muted)] hover:text-[var(--ui-text-secondary)] hover:border-[var(--ui-text-muted)]"
            }`}
          >
            {copyState === "copied" && "Copied & verified"}
            {copyState === "mismatch" && "CLIPBOARD TAMPERED — DO NOT PASTE"}
            {copyState === "unverified" && "Copied (verify after pasting)"}
            {copyState === "idle" && "Copy address"}
          </button>

          <a
            href={`${addr.uriScheme}${addr.address}`}
            className="mono text-[10px] text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] transition-colors"
          >
            open in wallet &rarr;
          </a>
        </div>

        {/* Post-copy visual confirmation */}
        {(copyState === "copied" || copyState === "unverified") && (
          <div className="mt-2 mono text-[10px] text-[var(--ui-text-muted)]">
            Confirm after pasting: starts with{" "}
            <span className="text-[var(--ui-text)]">{prefix}</span>
            {" "}ends with{" "}
            <span className="text-[var(--ui-text)]">{suffix}</span>
          </div>
        )}

        {/* Clipboard tamper warning */}
        {copyState === "mismatch" && (
          <div className="mt-2 rounded border-2 border-red-600 bg-red-950/50 px-3 py-2 text-xs text-red-200">
            <strong>Your clipboard contents do not match the address on this page.</strong>{" "}
            Your device may have clipboard-hijacking malware installed. Do not paste
            this address into any wallet. Clear your clipboard and scan your device.
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Coin icon ────────────────────────────────────────────────────────── */

function CoinIcon({ symbol }: { symbol: string }) {
  const colors: Record<string, string> = { XMR: "#ff6600", BTC: "#f7931a", ETH: "#627eea" };
  const color = colors[symbol] ?? "var(--ui-accent)";
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full mono text-[10px] font-bold"
      style={{ background: `${color}20`, color }}
    >
      {symbol}
    </div>
  );
}

/* ── Stripe link ──────────────────────────────────────────────────────── */

function StripeLink({ href, label }: { href: string | undefined; label: string }) {
  if (!href) return <Button disabled size="md">{label} (not configured)</Button>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <Button size="md">{label}</Button>
    </a>
  );
}
