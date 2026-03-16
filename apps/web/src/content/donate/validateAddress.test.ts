import { describe, expect, it } from "vitest";
import { isValidBtcAddress, isValidEthAddress, isValidXmrAddress } from "./validateAddress";

describe("isValidBtcAddress", () => {
  it("accepts valid P2WPKH (v0 bech32)", () => {
    // BIP 173 test vector
    expect(isValidBtcAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4").valid).toBe(true);
  });

  it("accepts uppercase valid bech32", () => {
    // BIP 173: uppercase is valid (case-insensitive decoding)
    expect(
      isValidBtcAddress("BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4").valid,
    ).toBe(true);
  });

  it("rejects mixed case", () => {
    const result = isValidBtcAddress("bc1qW508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4");
    expect(result.valid).toBe(false);
  });

  it("rejects bad checksum", () => {
    const result = isValidBtcAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("checksum");
  });

  it("rejects unknown HRP", () => {
    const result = isValidBtcAddress("xx1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4");
    expect(result.valid).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidBtcAddress("").valid).toBe(false);
  });
});

describe("isValidEthAddress", () => {
  it("accepts valid EIP-55 checksummed address", async () => {
    // EIP-55 test vector
    const result = await isValidEthAddress("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed");
    expect(result.valid).toBe(true);
  });

  it("accepts all-lowercase (valid but not checksummed)", async () => {
    const result = await isValidEthAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed");
    expect(result.valid).toBe(true);
  });

  it("accepts all-uppercase (valid but not checksummed)", async () => {
    const result = await isValidEthAddress("0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED");
    expect(result.valid).toBe(true);
  });

  it("rejects wrong length", async () => {
    const result = await isValidEthAddress("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1Be");
    expect(result.valid).toBe(false);
  });

  it("rejects invalid checksum (single char wrong)", async () => {
    // Flip one case in a checksummed address
    const result = await isValidEthAddress("0x5aaeb6053F3E94C9b9A09f33669435E7Ef1BeAed");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("checksum");
  });

  it("rejects missing 0x prefix", async () => {
    const result = await isValidEthAddress("5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed");
    expect(result.valid).toBe(false);
  });
});

describe("isValidXmrAddress", () => {
  it("accepts 95-char mainnet address starting with 4", () => {
    const addr = "4" + "A".repeat(94);
    expect(isValidXmrAddress(addr).valid).toBe(true);
  });

  it("accepts 95-char subaddress starting with 8", () => {
    const addr = "8" + "B".repeat(94);
    expect(isValidXmrAddress(addr).valid).toBe(true);
  });

  it("accepts 106-char integrated address starting with 4", () => {
    const addr = "4" + "C".repeat(105);
    expect(isValidXmrAddress(addr).valid).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(isValidXmrAddress("4ABCDEF").valid).toBe(false);
  });

  it("rejects wrong first character", () => {
    const addr = "1" + "A".repeat(94);
    expect(isValidXmrAddress(addr).valid).toBe(false);
  });

  it("rejects invalid base58 characters (0, O, I, l)", () => {
    const addr = "4" + "0".repeat(94); // '0' is not in base58
    expect(isValidXmrAddress(addr).valid).toBe(false);
  });
});
