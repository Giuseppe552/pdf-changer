import { describe, expect, it } from "vitest";
import {
  base64urlEncode,
  base64urlDecode,
  base64DecodeAny,
  toArrayBuffer,
  sha256Bytes,
  hmacSha256,
  utf8,
  aesGcmEncryptToBase64Url,
} from "./crypto";

describe("base64url", () => {
  it("round-trips bytes", () => {
    const input = new Uint8Array([0, 1, 2, 255, 254, 253]);
    const encoded = base64urlEncode(input);
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");
    const decoded = base64urlDecode(encoded);
    expect(decoded).toEqual(input);
  });

  it("handles empty input", () => {
    const encoded = base64urlEncode(new Uint8Array(0));
    expect(encoded).toBe("");
    expect(base64urlDecode("")).toEqual(new Uint8Array(0));
  });

  it("pads correctly on decode", () => {
    // 1 byte = 2 base64 chars, needs 2 padding
    const one = new Uint8Array([42]);
    const enc = base64urlEncode(one);
    expect(enc.length % 4).not.toBe(0); // no padding in url-safe
    expect(base64urlDecode(enc)).toEqual(one);
  });
});

describe("base64DecodeAny", () => {
  it("decodes standard base64", () => {
    const input = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const standard = btoa(String.fromCharCode(...input));
    expect(base64DecodeAny(standard)).toEqual(input);
  });

  it("decodes url-safe base64", () => {
    const input = new Uint8Array([0, 1, 2, 255, 254, 253]);
    const urlSafe = base64urlEncode(input);
    expect(base64DecodeAny(urlSafe)).toEqual(input);
  });
});

describe("toArrayBuffer", () => {
  it("returns correct buffer from typed array", () => {
    const bytes = new Uint8Array([10, 20, 30]);
    const buf = toArrayBuffer(bytes);
    expect(buf.byteLength).toBe(3);
    expect(new Uint8Array(buf)).toEqual(bytes);
  });

  it("handles subarray correctly", () => {
    const full = new Uint8Array([1, 2, 3, 4, 5]);
    const sub = full.subarray(1, 4); // [2, 3, 4]
    const buf = toArrayBuffer(sub);
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([2, 3, 4]));
  });
});

describe("sha256Bytes", () => {
  it("hashes empty input", async () => {
    const hash = await sha256Bytes(new Uint8Array(0));
    expect(hash.length).toBe(32);
    // known sha256 of empty string
    const hex = [...hash].map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(hex).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("produces consistent output", async () => {
    const input = utf8("test");
    const a = await sha256Bytes(input);
    const b = await sha256Bytes(input);
    expect(a).toEqual(b);
  });
});

describe("hmacSha256", () => {
  it("produces 32-byte output", async () => {
    const key = utf8("secret");
    const data = utf8("message");
    const sig = await hmacSha256(key, data);
    expect(sig.length).toBe(32);
  });

  it("different keys produce different sigs", async () => {
    const data = utf8("message");
    const a = await hmacSha256(utf8("key1"), data);
    const b = await hmacSha256(utf8("key2"), data);
    expect(a).not.toEqual(b);
  });

  it("same key+data is deterministic", async () => {
    const key = utf8("key");
    const data = utf8("data");
    const a = await hmacSha256(key, data);
    const b = await hmacSha256(key, data);
    expect(a).toEqual(b);
  });
});

describe("utf8", () => {
  it("encodes ascii", () => {
    expect(utf8("abc")).toEqual(new Uint8Array([97, 98, 99]));
  });

  it("encodes multibyte", () => {
    const bytes = utf8("é");
    expect(bytes.length).toBe(2); // utf-8 for é is 2 bytes
  });
});

describe("aesGcmEncryptToBase64Url", () => {
  it("produces url-safe output", async () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = utf8("hello world");
    const encrypted = await aesGcmEncryptToBase64Url(key, plaintext);
    expect(encrypted).not.toContain("+");
    expect(encrypted).not.toContain("/");
    expect(encrypted).not.toContain("=");
  });

  it("different calls produce different ciphertext (random IV)", async () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = utf8("same input");
    const a = await aesGcmEncryptToBase64Url(key, plaintext);
    const b = await aesGcmEncryptToBase64Url(key, plaintext);
    expect(a).not.toBe(b);
  });

  it("output contains IV + ciphertext", async () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = utf8("x");
    const encrypted = await aesGcmEncryptToBase64Url(key, plaintext);
    const decoded = base64urlDecode(encrypted);
    // 12 bytes IV + at least 1 byte ciphertext + 16 bytes GCM tag
    expect(decoded.length).toBeGreaterThanOrEqual(12 + 1 + 16);
  });
});
