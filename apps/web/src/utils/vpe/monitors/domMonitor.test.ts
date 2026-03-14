// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { createDomMonitor } from "./domMonitor";

describe("domMonitor", () => {
  it("detects injected script elements", async () => {
    const monitor = createDomMonitor();
    monitor.start();
    const script = document.createElement("script");
    script.src = "https://evil.com/steal.js";
    document.body.appendChild(script);
    // MutationObserver fires asynchronously in happy-dom
    await new Promise((r) => setTimeout(r, 10));
    const events = monitor.stop();
    expect(events).toHaveLength(1);
    expect(events[0].tagName).toBe("SCRIPT");
    expect(events[0].src).toBe("https://evil.com/steal.js");
    script.remove();
  });

  it("ignores non-suspicious elements like div", async () => {
    const monitor = createDomMonitor();
    monitor.start();
    const div = document.createElement("div");
    document.body.appendChild(div);
    await new Promise((r) => setTimeout(r, 10));
    const events = monitor.stop();
    expect(events).toHaveLength(0);
    div.remove();
  });

  it("disconnects on stop", async () => {
    const monitor = createDomMonitor();
    monitor.start();
    monitor.stop();
    const script = document.createElement("script");
    document.body.appendChild(script);
    await new Promise((r) => setTimeout(r, 10));
    // Calling stop again should return empty since it was already stopped
    const events = monitor.stop();
    expect(events).toHaveLength(0);
    script.remove();
  });
});
