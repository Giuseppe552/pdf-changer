import {
  parseDonateProofArchive,
  parseDonateProofManifestV1,
  type DonateProofArchiveIndex,
  type DonateProofManifestV1,
} from "./proofManifest";

export type ProofLoadResult =
  | { status: "ok"; manifest: DonateProofManifestV1 }
  | { status: "invalid"; reason: string }
  | { status: "missing"; reason: string };

export type ProofArchiveLoadResult =
  | { status: "ok"; archive: DonateProofArchiveIndex }
  | { status: "invalid"; reason: string }
  | { status: "missing"; reason: string };

export type VerificationOutcome = "pass" | "fail" | "unknown";

export type ProofFileVerification = {
  path: string;
  expectedSha256: string;
  actualSha256: string | null;
  expectedSizeBytes: number;
  actualSizeBytes: number | null;
  status: "pass" | "fail" | "missing" | "error" | "unknown";
  error?: string;
};

async function fetchJson(url: string): Promise<{ status: number; data: unknown }> {
  try {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) {
      return { status: response.status, data: null };
    }
    try {
      return { status: response.status, data: await response.json() };
    } catch {
      return { status: response.status, data: null };
    }
  } catch {
    return { status: 0, data: null };
  }
}

function toAbsolutePath(path: string): string {
  if (!path) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export async function loadDonateProofManifest(
  manifestPath = "/donate-proof/v1/manifest.v1.json",
): Promise<ProofLoadResult> {
  const { status, data } = await fetchJson(manifestPath);
  if (status === 404) {
    return { status: "missing", reason: "Manifest file not found." };
  }
  if (status >= 400 || !data) {
    return { status: "invalid", reason: "Manifest could not be read." };
  }
  const parsed = parseDonateProofManifestV1(data);
  if (!parsed.ok) {
    return { status: "invalid", reason: parsed.issues.join("; ") };
  }
  return { status: "ok", manifest: parsed.data };
}

export async function loadDonateProofArchive(
  archivePath = "/donate-proof/archive/index.json",
): Promise<ProofArchiveLoadResult> {
  const { status, data } = await fetchJson(archivePath);
  if (status === 404) {
    return { status: "missing", reason: "Archive index not found." };
  }
  if (status >= 400 || !data) {
    return { status: "invalid", reason: "Archive index could not be read." };
  }
  const parsed = parseDonateProofArchive(data);
  if (!parsed.ok) {
    return { status: "invalid", reason: parsed.issues.join("; ") };
  }
  return { status: "ok", archive: parsed.data };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const input = new Uint8Array(bytes.byteLength);
  input.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyManifestFiles(
  manifest: DonateProofManifestV1,
): Promise<ProofFileVerification[]> {
  const checks: ProofFileVerification[] = [];
  for (const file of manifest.files) {
    const path = toAbsolutePath(file.path);
    try {
      const response = await fetch(path, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) {
        checks.push({
          path,
          expectedSha256: file.sha256,
          expectedSizeBytes: file.sizeBytes,
          actualSha256: null,
          actualSizeBytes: null,
          status: response.status === 404 ? "missing" : "error",
          error: `HTTP ${response.status}`,
        });
        continue;
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      const actualSha256 = await sha256Hex(bytes);
      const actualSizeBytes = bytes.byteLength;
      const status =
        actualSha256 === file.sha256 && actualSizeBytes === file.sizeBytes
          ? "pass"
          : "fail";
      checks.push({
        path,
        expectedSha256: file.sha256,
        expectedSizeBytes: file.sizeBytes,
        actualSha256,
        actualSizeBytes,
        status,
      });
    } catch (error) {
      checks.push({
        path,
        expectedSha256: file.sha256,
        expectedSizeBytes: file.sizeBytes,
        actualSha256: null,
        actualSizeBytes: null,
        status: "error",
        error: error instanceof Error ? error.message : "Network error",
      });
    }
  }
  return checks;
}

export function outcomeFromFileChecks(fileChecks: ProofFileVerification[]): VerificationOutcome {
  if (!fileChecks.length) return "unknown";
  if (fileChecks.every((item) => item.status === "pass")) return "pass";
  if (fileChecks.some((item) => item.status === "fail" || item.status === "missing" || item.status === "error")) {
    return "fail";
  }
  return "unknown";
}
