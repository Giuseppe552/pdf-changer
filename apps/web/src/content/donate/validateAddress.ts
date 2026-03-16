/**
 * Cryptocurrency address format validators.
 * Pure TypeScript, zero external dependencies (ETH uses @noble/hashes
 * which is already in the project for Pedersen commitments).
 *
 * BTC: BIP 173 / BIP 350 bech32/bech32m for native SegWit
 * ETH: EIP-55 mixed-case checksum
 * XMR: CryptoNote base58 + length/prefix check
 */

// ── Bitcoin bech32 (BIP 173 / BIP 350) ─────────────────────────────────

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const BECH32_CONST = 1;
const BECH32M_CONST = 0x2bc830a3;

function bech32Polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= BECH32_GEN[i];
    }
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
  return ret;
}

export function isValidBtcAddress(addr: string): { valid: boolean; error?: string } {
  if (addr !== addr.toLowerCase() && addr !== addr.toUpperCase()) {
    return { valid: false, error: "Mixed case not allowed in bech32" };
  }
  const lower = addr.toLowerCase();
  const pos = lower.lastIndexOf("1");
  if (pos < 1 || pos + 7 > lower.length || lower.length > 90) {
    return { valid: false, error: "Invalid bech32 structure" };
  }
  const hrp = lower.slice(0, pos);
  if (hrp !== "bc" && hrp !== "tb") {
    return { valid: false, error: `Unknown HRP: ${hrp}` };
  }
  const data: number[] = [];
  for (let i = pos + 1; i < lower.length; i++) {
    const c = BECH32_CHARSET.indexOf(lower[i]);
    if (c === -1) return { valid: false, error: `Invalid character: ${lower[i]}` };
    data.push(c);
  }
  const check = bech32Polymod(bech32HrpExpand(hrp).concat(data));
  let enc: "bech32" | "bech32m" | null = null;
  if (check === BECH32_CONST) enc = "bech32";
  if (check === BECH32M_CONST) enc = "bech32m";
  if (!enc) return { valid: false, error: "Invalid bech32 checksum" };

  const witnessVersion = data[0];
  if (witnessVersion === 0 && enc !== "bech32") {
    return { valid: false, error: "v0 witness must use bech32 (not bech32m)" };
  }
  if (witnessVersion > 0 && enc !== "bech32m") {
    return { valid: false, error: `v${witnessVersion} witness must use bech32m` };
  }
  if (witnessVersion > 16) {
    return { valid: false, error: `Invalid witness version: ${witnessVersion}` };
  }
  // data[] at this point has checksum already stripped by verifyChecksum succeeding.
  // Wait — no, data still includes checksum. The checksum is the last 6 values.
  // Witness program is data[1..data.length-6] (skip witness version, strip checksum).
  const progData = data.slice(1, data.length - 6);
  const progLen = Math.floor(progData.length * 5 / 8);
  if (witnessVersion === 0 && progLen !== 20 && progLen !== 32) {
    return { valid: false, error: `v0 program must be 20 or 32 bytes, got ${progLen}` };
  }
  if (witnessVersion === 1 && progLen !== 32) {
    return { valid: false, error: `v1 (taproot) program must be 32 bytes, got ${progLen}` };
  }
  if (progLen < 2 || progLen > 40) {
    return { valid: false, error: `Program length out of range: ${progLen}` };
  }
  return { valid: true };
}

// ── Ethereum EIP-55 ─────────────────────────────────────────────────────

/**
 * Validate Ethereum address with EIP-55 checksum.
 * Uses keccak-256 from @noble/hashes (already in project).
 */
export async function isValidEthAddress(addr: string): Promise<{ valid: boolean; error?: string }> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    return { valid: false, error: "Must be 0x followed by 40 hex characters" };
  }
  const hex = addr.slice(2);
  // All-lowercase or all-uppercase is valid but not checksummed
  if (hex === hex.toLowerCase() || hex === hex.toUpperCase()) {
    return { valid: true };
  }
  // EIP-55 checksum: keccak256 of lowercase hex, each nibble >= 8 → uppercase
  const { keccak_256 } = await import("@noble/hashes/sha3.js");
  const { bytesToHex } = await import("@noble/hashes/utils.js");
  const hashHex = bytesToHex(keccak_256(new TextEncoder().encode(hex.toLowerCase())));
  for (let i = 0; i < 40; i++) {
    const c = hex[i];
    if (/[a-fA-F]/.test(c)) {
      const nibble = parseInt(hashHex[i], 16);
      if (nibble >= 8 && c !== c.toUpperCase()) {
        return { valid: false, error: `EIP-55 checksum mismatch at position ${i}` };
      }
      if (nibble < 8 && c !== c.toLowerCase()) {
        return { valid: false, error: `EIP-55 checksum mismatch at position ${i}` };
      }
    }
  }
  return { valid: true };
}

// ── Monero (CryptoNote base58 light validation) ─────────────────────────

const XMR_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function isValidXmrAddress(addr: string): { valid: boolean; error?: string } {
  // Standard address = 95 chars, integrated address = 106 chars
  if (addr.length !== 95 && addr.length !== 106) {
    return { valid: false, error: `Expected 95 or 106 characters, got ${addr.length}` };
  }
  for (const c of addr) {
    if (XMR_ALPHABET.indexOf(c) === -1) {
      return { valid: false, error: `Invalid base58 character: ${c}` };
    }
  }
  // Mainnet standard/subaddress starts with '4' or '8'
  // Mainnet integrated starts with '4'
  if (addr[0] !== "4" && addr[0] !== "8") {
    return { valid: false, error: `Unexpected first character: ${addr[0]} (mainnet starts with 4 or 8)` };
  }
  return { valid: true };
}

// ── Unified validator ───────────────────────────────────────────────────

export async function validateDonateAddress(
  symbol: string,
  address: string,
): Promise<{ valid: boolean; error?: string }> {
  switch (symbol) {
    case "BTC":
      return isValidBtcAddress(address);
    case "ETH":
      return isValidEthAddress(address);
    case "XMR":
      return isValidXmrAddress(address);
    default:
      return { valid: false, error: `Unknown symbol: ${symbol}` };
  }
}
