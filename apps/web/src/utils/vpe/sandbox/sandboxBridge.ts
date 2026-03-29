export type SandboxBridge = {
  process(
    toolName: string,
    inputBytes: Uint8Array,
    config?: unknown,
  ): Promise<{
    outputBytes: Uint8Array;
    toolReport: unknown;
  }>;
  destroy(): void;
};

let sharedIframe: HTMLIFrameElement | null = null;
let readyPromise: Promise<void> | null = null;
const pendingRequests = new Map<
  string,
  { resolve: (v: { outputBytes: Uint8Array; toolReport: unknown }) => void; reject: (e: Error) => void; timer: number }
>();
let listenerAttached = false;
let readyResolve: (() => void) | null = null;

function attachListener() {
  if (listenerAttached) return;
  listenerAttached = true;

  window.addEventListener("message", (e) => {
    if (e.source !== sharedIframe?.contentWindow) return;
    const data = e.data;

    // Sandbox signals it's loaded and listening
    if (data?.type === "ready") {
      readyResolve?.();
      return;
    }

    const { id, type, outputBytes, report, message } = data;
    const pending = pendingRequests.get(id);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingRequests.delete(id);
    if (type === "result") {
      pending.resolve({
        outputBytes: new Uint8Array(outputBytes),
        toolReport: report,
      });
    } else {
      pending.reject(new Error(message ?? "Sandbox processing failed"));
    }
  });
}

function ensureIframe(): Promise<void> {
  if (sharedIframe && readyPromise) return readyPromise;

  readyPromise = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;

    sharedIframe = document.createElement("iframe");
    sharedIframe.setAttribute("sandbox", "allow-scripts");
    sharedIframe.src = "/sandbox.html";
    sharedIframe.style.display = "none";
    document.body.appendChild(sharedIframe);
    attachListener();

    // If sandbox never signals ready, fail fast instead of hanging 60s
    setTimeout(() => reject(new Error("Sandbox failed to initialize")), 10_000);
  });

  return readyPromise;
}

/** Preload the sandbox iframe so it's warm when the user clicks process. */
export function preloadSandbox(): void {
  ensureIframe().catch(() => {
    // Preload failed — direct mode will handle it at process time
  });
}

export function createSandbox(): SandboxBridge {
  return {
    async process(toolName, inputBytes, config) {
      await ensureIframe();

      return new Promise((resolve, reject) => {
        const id = crypto.randomUUID();
        const timer = window.setTimeout(() => {
          pendingRequests.delete(id);
          reject(new Error("Sandbox processing timed out (60s)"));
        }, 60_000);
        pendingRequests.set(id, { resolve, reject, timer });
        const buffer = inputBytes.buffer.slice(
          inputBytes.byteOffset,
          inputBytes.byteOffset + inputBytes.byteLength,
        );
        sharedIframe!.contentWindow!.postMessage(
          { id, toolName, inputBytes: buffer, config },
          "*",
          [buffer],
        );
      });
    },
    destroy() {
      if (sharedIframe) {
        sharedIframe.remove();
        sharedIframe = null;
        readyPromise = null;
        readyResolve = null;
        listenerAttached = false;
      }
      for (const [, pending] of pendingRequests) {
        clearTimeout(pending.timer);
        pending.reject(new Error("Sandbox destroyed"));
      }
      pendingRequests.clear();
    },
  };
}
