/**
 * No Trace Mode: in-memory boolean flag (NOT persisted).
 * When enabled, all pdfchanger.* localStorage keys are purged immediately
 * and no new writes occur. Flag is lost on page close (this is the point).
 */

const STORAGE_PREFIX = "pdfchanger.";

let noTraceEnabled = false;

export function enableNoTrace(): void {
  noTraceEnabled = true;
  purgeAllStorage();
}

export function disableNoTrace(): void {
  noTraceEnabled = false;
}

export function isNoTraceMode(): boolean {
  return noTraceEnabled;
}

function purgeStorage(storage: Storage): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      storage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
}

function purgeAllStorage(): void {
  purgeStorage(localStorage);
  if (typeof sessionStorage !== "undefined") {
    purgeStorage(sessionStorage);
  }
}
