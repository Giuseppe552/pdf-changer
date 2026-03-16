/**
 * Runtime integrity check: cross-references the addresses rendered on the
 * donate page (from compiled addresses.ts) against the PGP-signed proof
 * manifest (fetched at runtime from /donate-proof/v1/manifest.v1.json).
 *
 * If the build pipeline was compromised and addresses.ts was modified,
 * but the signed manifest was not, this check catches the mismatch.
 *
 * This is defense-in-depth. The primary defense is the PGP signature
 * on the proof bundle which the user verifies independently.
 */

import { donateAddresses } from "./addresses";

export type IntegrityResult =
  | { status: "pass"; checkedAt: string }
  | { status: "mismatch"; details: string; checkedAt: string }
  | { status: "unavailable"; reason: string; checkedAt: string };

export async function verifyDonateAddressIntegrity(): Promise<IntegrityResult> {
  const checkedAt = new Date().toISOString();

  try {
    const res = await fetch("/donate-proof/v1/manifest.v1.json", {
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!res.ok) {
      return {
        status: "unavailable",
        reason: `Manifest fetch failed: HTTP ${res.status}`,
        checkedAt,
      };
    }

    const manifest = await res.json();
    const manifestAddresses: Array<{ symbol: string; address: string }> =
      manifest?.addresses ?? [];

    if (!Array.isArray(manifestAddresses) || manifestAddresses.length === 0) {
      return {
        status: "unavailable",
        reason: "Manifest contains no addresses",
        checkedAt,
      };
    }

    // Cross-check every address in the compiled code against the manifest
    const mismatches: string[] = [];

    for (const compiled of donateAddresses) {
      const signed = manifestAddresses.find(
        (a) => a.symbol === compiled.symbol,
      );
      if (!signed) {
        mismatches.push(`${compiled.symbol}: present in code but missing from signed manifest`);
        continue;
      }
      if (signed.address.trim() !== compiled.address.trim()) {
        mismatches.push(
          `${compiled.symbol}: CODE=${compiled.address.slice(0, 12)}... MANIFEST=${signed.address.slice(0, 12)}...`,
        );
      }
    }

    // Also check for addresses in manifest that aren't in code
    for (const signed of manifestAddresses) {
      const inCode = donateAddresses.find((a) => a.symbol === signed.symbol);
      if (!inCode) {
        mismatches.push(`${signed.symbol}: present in signed manifest but missing from code`);
      }
    }

    if (mismatches.length > 0) {
      return {
        status: "mismatch",
        details: mismatches.join("; "),
        checkedAt,
      };
    }

    return { status: "pass", checkedAt };
  } catch (err) {
    return {
      status: "unavailable",
      reason: err instanceof Error ? err.message : "Network error",
      checkedAt,
    };
  }
}
