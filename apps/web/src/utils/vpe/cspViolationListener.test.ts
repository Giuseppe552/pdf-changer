// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { startCspListener } from "./cspViolationListener";

function dispatchCspViolation(overrides: Partial<SecurityPolicyViolationEventInit> = {}) {
  const event = new Event("securitypolicyviolation") as SecurityPolicyViolationEvent;
  Object.defineProperties(event, {
    blockedURI: { value: overrides.blockedURI ?? "https://evil.com/track" },
    violatedDirective: { value: overrides.violatedDirective ?? "connect-src" },
    originalPolicy: { value: overrides.originalPolicy ?? "connect-src 'self'" },
  });
  document.dispatchEvent(event);
}

describe("cspViolationListener", () => {
  it("captures violations", () => {
    const listener = startCspListener();
    dispatchCspViolation({ blockedURI: "https://bad.com" });
    expect(listener.getViolations()).toHaveLength(1);
    expect(listener.getViolations()[0].blockedURI).toBe("https://bad.com");
    listener.stop();
  });

  it("stops capturing after stop()", () => {
    const listener = startCspListener();
    dispatchCspViolation();
    listener.stop();
    dispatchCspViolation();
    expect(listener.getViolations()).toHaveLength(1);
  });

  it("caps at 100 violations", () => {
    const listener = startCspListener();
    for (let i = 0; i < 105; i++) {
      dispatchCspViolation({ blockedURI: `https://bad.com/${i}` });
    }
    expect(listener.getViolations()).toHaveLength(100);
    listener.stop();
  });
});
