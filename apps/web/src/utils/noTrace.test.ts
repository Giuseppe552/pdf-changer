import { describe, expect, it, beforeEach, vi } from "vitest";
import { enableNoTrace, disableNoTrace, isNoTraceMode } from "./noTrace";

// Provide localStorage polyfill for Node test environment
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  get length() { return store.size; },
  key: (i: number) => [...store.keys()][i] ?? null,
};

vi.stubGlobal("localStorage", localStorageMock);

describe("noTrace", () => {
  beforeEach(() => {
    disableNoTrace();
    store.clear();
  });

  it("starts disabled", () => {
    expect(isNoTraceMode()).toBe(false);
  });

  it("enables and reports mode", () => {
    enableNoTrace();
    expect(isNoTraceMode()).toBe(true);
  });

  it("purges pdfchanger.* keys on enable", () => {
    store.set("pdfchanger.usage.v2.2026-02.total", "5");
    store.set("pdfchanger.entitlement.v1", '{"plan":"free"}');
    store.set("unrelated.key", "keep");

    enableNoTrace();

    expect(store.get("pdfchanger.usage.v2.2026-02.total")).toBeUndefined();
    expect(store.get("pdfchanger.entitlement.v1")).toBeUndefined();
    expect(store.get("unrelated.key")).toBe("keep");
  });

  it("disables and reports mode", () => {
    enableNoTrace();
    disableNoTrace();
    expect(isNoTraceMode()).toBe(false);
  });
});
