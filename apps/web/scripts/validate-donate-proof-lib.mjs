import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const FINGERPRINT_RE = /^[A-F0-9]{40}$/;
const KEY_ID_RE = /^[A-F0-9]{16}$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function assertObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function readJson(filePath, errors, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(`${label} missing: ${filePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(
      `${label} invalid JSON: ${filePath} (${error instanceof Error ? error.message : "unknown"})`,
    );
    return null;
  }
}

function computeSha256(filePath) {
  const bytes = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function assertIsoDate(value) {
  return typeof value === "string" && ISO_UTC_RE.test(value) && Number.isFinite(Date.parse(value));
}

function ensurePublicUrlPath(urlPath, errors, label) {
  if (typeof urlPath !== "string" || !urlPath.startsWith("/")) {
    errors.push(`${label} must be absolute site path starting with '/'`);
    return false;
  }
  if (urlPath.includes("..")) {
    errors.push(`${label} must not contain '..'`);
    return false;
  }
  return true;
}

function resolvePublicPath(publicRoot, urlPath) {
  const normalized = urlPath.replace(/^\/+/, "");
  const resolved = path.resolve(publicRoot, normalized);
  return resolved.startsWith(publicRoot) ? resolved : null;
}

function validateManifestShape(manifest, label, errors) {
  if (!assertObject(manifest)) {
    errors.push(`${label}: manifest must be an object`);
    return;
  }

  if (manifest.version !== "v1") {
    errors.push(`${label}: version must be "v1"`);
  }
  if (typeof manifest.proofId !== "string" || manifest.proofId.length < 3) {
    errors.push(`${label}: proofId must be a non-empty string`);
  }
  if (!assertIsoDate(manifest.publishedAt)) {
    errors.push(`${label}: publishedAt must be ISO-8601 UTC`);
  }
  if (!assertIsoDate(manifest.validFrom)) {
    errors.push(`${label}: validFrom must be ISO-8601 UTC`);
  }

  if (!assertObject(manifest.key)) {
    errors.push(`${label}: key must be an object`);
  } else {
    if (!FINGERPRINT_RE.test(String(manifest.key.fingerprint ?? ""))) {
      errors.push(`${label}: key.fingerprint must be 40 uppercase hex chars`);
    }
    if (!KEY_ID_RE.test(String(manifest.key.keyId ?? ""))) {
      errors.push(`${label}: key.keyId must be 16 uppercase hex chars`);
    }
    if (typeof manifest.key.algorithm !== "string" || manifest.key.algorithm.length < 2) {
      errors.push(`${label}: key.algorithm must be a non-empty string`);
    }
    if (!assertIsoDate(manifest.key.firstSeenAt)) {
      errors.push(`${label}: key.firstSeenAt must be ISO-8601 UTC`);
    }
  }

  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    errors.push(`${label}: files must contain at least one item`);
  } else {
    const seen = new Set();
    for (const [index, file] of manifest.files.entries()) {
      if (!assertObject(file)) {
        errors.push(`${label}: files[${index}] must be an object`);
        continue;
      }
      const prefix = `${label}: files[${index}]`;
      if (!ensurePublicUrlPath(file.path, errors, `${prefix}.path`)) continue;
      if (seen.has(file.path)) {
        errors.push(`${prefix}.path duplicate: ${file.path}`);
      }
      seen.add(file.path);
      if (!SHA256_RE.test(String(file.sha256 ?? ""))) {
        errors.push(`${prefix}.sha256 must be 64 lowercase hex chars`);
      }
      if (!Number.isInteger(file.sizeBytes) || file.sizeBytes < 0) {
        errors.push(`${prefix}.sizeBytes must be a non-negative integer`);
      }
    }
  }

  if (!Array.isArray(manifest.addresses) || manifest.addresses.length === 0) {
    errors.push(`${label}: addresses must contain at least one item`);
  } else {
    for (const [index, addr] of manifest.addresses.entries()) {
      if (!assertObject(addr)) {
        errors.push(`${label}: addresses[${index}] must be an object`);
        continue;
      }
      if (typeof addr.network !== "string" || !addr.network.trim()) {
        errors.push(`${label}: addresses[${index}].network is required`);
      }
      if (typeof addr.symbol !== "string" || !addr.symbol.trim()) {
        errors.push(`${label}: addresses[${index}].symbol is required`);
      }
      if (typeof addr.address !== "string" || addr.address.length < 8) {
        errors.push(`${label}: addresses[${index}].address looks invalid`);
      }
      if ("note" in addr && (typeof addr.note !== "string" || !addr.note.trim())) {
        errors.push(`${label}: addresses[${index}].note must be non-empty when provided`);
      }
    }
  }

  if ("supersedesProofId" in manifest) {
    if (
      typeof manifest.supersedesProofId !== "string" ||
      manifest.supersedesProofId.length < 3
    ) {
      errors.push(`${label}: supersedesProofId must be a non-empty string when present`);
    }
  }

  if ("revoked" in manifest && typeof manifest.revoked !== "boolean") {
    errors.push(`${label}: revoked must be boolean when present`);
  }
  if (manifest.revoked && (typeof manifest.revocationReason !== "string" || !manifest.revocationReason.trim())) {
    errors.push(`${label}: revoked manifests must include revocationReason`);
  }
}

function validateManifestFileChecks(manifest, publicRoot, errors, label) {
  if (!Array.isArray(manifest.files)) return;
  for (const file of manifest.files) {
    if (!file || typeof file !== "object") continue;
    if (!ensurePublicUrlPath(file.path, errors, `${label}: file path`)) continue;
    const filePath = resolvePublicPath(publicRoot, file.path);
    if (!filePath) {
      errors.push(`${label}: file path escapes public root: ${file.path}`);
      continue;
    }
    if (!fs.existsSync(filePath)) {
      errors.push(`${label}: missing file listed in manifest: ${file.path}`);
      continue;
    }
    const stat = fs.statSync(filePath);
    const actualSize = stat.size;
    const actualHash = computeSha256(filePath);

    if (actualSize !== file.sizeBytes) {
      errors.push(
        `${label}: size mismatch for ${file.path} (manifest=${file.sizeBytes}, actual=${actualSize})`,
      );
    }
    if (actualHash !== file.sha256) {
      errors.push(
        `${label}: sha256 mismatch for ${file.path} (manifest=${file.sha256}, actual=${actualHash})`,
      );
    }
  }
}

function validateArchiveShape(archive, errors) {
  if (!assertObject(archive)) {
    errors.push("archive index must be an object");
    return;
  }
  if (archive.version !== "v1") {
    errors.push("archive.version must be \"v1\"");
  }
  if (!assertIsoDate(archive.updatedAt)) {
    errors.push("archive.updatedAt must be ISO-8601 UTC");
  }
  if (!Array.isArray(archive.proofs) || archive.proofs.length === 0) {
    errors.push("archive.proofs must contain at least one entry");
  }
  if (!Array.isArray(archive.keys) || archive.keys.length === 0) {
    errors.push("archive.keys must contain at least one entry");
  }
}

function validateArchiveAndChain({
  currentManifest,
  currentManifestPath,
  archive,
  archivePath,
  publicRoot,
  errors,
}) {
  if (!Array.isArray(archive.proofs) || !archive.proofs.length) return;

  const proofIdSet = new Set();
  const proofById = new Map();
  for (const [index, item] of archive.proofs.entries()) {
    const prefix = `archive.proofs[${index}]`;
    if (!assertObject(item)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    if (typeof item.proofId !== "string" || item.proofId.length < 3) {
      errors.push(`${prefix}.proofId must be a non-empty string`);
      continue;
    }
    if (proofIdSet.has(item.proofId)) {
      errors.push(`${prefix}.proofId duplicated: ${item.proofId}`);
    }
    proofIdSet.add(item.proofId);
    proofById.set(item.proofId, item);

    if (!ensurePublicUrlPath(item.manifestPath, errors, `${prefix}.manifestPath`)) continue;
    const manifestFile = resolvePublicPath(publicRoot, item.manifestPath);
    if (!manifestFile) {
      errors.push(`${prefix}.manifestPath escapes public root`);
      continue;
    }
    if (!fs.existsSync(manifestFile)) {
      errors.push(`${prefix}.manifestPath file missing: ${item.manifestPath}`);
      continue;
    }

    const manifestJson = readJson(
      manifestFile,
      errors,
      `${prefix}.manifestPath`,
    );
    if (!manifestJson) continue;
    validateManifestShape(manifestJson, `${prefix}.manifest`, errors);
    validateManifestFileChecks(
      manifestJson,
      publicRoot,
      errors,
      `${prefix}.manifest`,
    );

    if (manifestJson.proofId !== item.proofId) {
      errors.push(
        `${prefix} proofId mismatch with manifest (${item.proofId} != ${manifestJson.proofId})`,
      );
    }
    if (!assertIsoDate(item.publishedAt)) {
      errors.push(`${prefix}.publishedAt must be ISO-8601 UTC`);
    } else if (manifestJson.publishedAt && item.publishedAt !== manifestJson.publishedAt) {
      errors.push(
        `${prefix}.publishedAt mismatch with manifest (${item.publishedAt} != ${manifestJson.publishedAt})`,
      );
    }
    if ("revoked" in item && typeof item.revoked !== "boolean") {
      errors.push(`${prefix}.revoked must be boolean when present`);
    }
    if (item.revoked && (typeof item.revocationReason !== "string" || !item.revocationReason.trim())) {
      errors.push(`${prefix}.revocationReason required when revoked`);
    }
    if (Boolean(item.revoked) !== Boolean(manifestJson.revoked)) {
      errors.push(`${prefix}.revoked mismatch with manifest`);
    }
    if (
      item.revocationReason &&
      manifestJson.revocationReason &&
      item.revocationReason !== manifestJson.revocationReason
    ) {
      errors.push(`${prefix}.revocationReason mismatch with manifest`);
    }
  }

  if (!proofById.has(currentManifest.proofId)) {
    errors.push(`current manifest proofId missing from archive index: ${currentManifest.proofId}`);
  }
  const topProof = archive.proofs[0];
  if (topProof?.proofId !== currentManifest.proofId) {
    errors.push(
      `archive first proof should be current proof (${currentManifest.proofId}), got ${topProof?.proofId ?? "none"}`,
    );
  }
  if (topProof?.manifestPath !== currentManifestPath) {
    errors.push(
      `archive first proof manifestPath should be ${currentManifestPath}, got ${topProof?.manifestPath ?? "none"}`,
    );
  }

  for (const item of archive.proofs) {
    if (!item || typeof item !== "object") continue;
    const manifestFile = resolvePublicPath(publicRoot, item.manifestPath ?? "");
    if (!manifestFile || !fs.existsSync(manifestFile)) continue;
    const manifestJson = readJson(manifestFile, [], ""); // shape errors already emitted above
    if (!manifestJson || !manifestJson.supersedesProofId) continue;
    if (!proofById.has(manifestJson.supersedesProofId)) {
      errors.push(
        `orphan supersedesProofId: ${manifestJson.proofId} -> ${manifestJson.supersedesProofId}`,
      );
      continue;
    }
    const parent = proofById.get(manifestJson.supersedesProofId);
    const currentTime = Date.parse(String(manifestJson.publishedAt));
    const parentTime = Date.parse(String(parent?.publishedAt ?? ""));
    if (Number.isFinite(currentTime) && Number.isFinite(parentTime) && currentTime <= parentTime) {
      errors.push(
        `non-monotonic publish date: ${manifestJson.proofId} must be newer than ${manifestJson.supersedesProofId}`,
      );
    }
  }

  if (!Array.isArray(archive.keys)) return;
  const activeKeys = archive.keys.filter((item) => item?.status === "active");
  if (activeKeys.length !== 1) {
    errors.push(`archive.keys must have exactly one active key, found ${activeKeys.length}`);
  }
  const activeKey = activeKeys[0];
  if (activeKey && activeKey.fingerprint !== currentManifest.key.fingerprint) {
    errors.push(
      `active archive key fingerprint must match current proof key (${currentManifest.key.fingerprint})`,
    );
  }

  const fingerprintSet = new Set();
  for (const [index, key] of archive.keys.entries()) {
    const prefix = `archive.keys[${index}]`;
    if (!assertObject(key)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    if (!FINGERPRINT_RE.test(String(key.fingerprint ?? ""))) {
      errors.push(`${prefix}.fingerprint invalid`);
    }
    if (!KEY_ID_RE.test(String(key.keyId ?? ""))) {
      errors.push(`${prefix}.keyId invalid`);
    }
    if (!ensurePublicUrlPath(key.path, errors, `${prefix}.path`)) continue;
    const keyFile = resolvePublicPath(publicRoot, key.path);
    if (!keyFile || !fs.existsSync(keyFile)) {
      errors.push(`${prefix}.path missing file: ${key.path}`);
    }
    if (!assertIsoDate(key.firstSeenAt)) {
      errors.push(`${prefix}.firstSeenAt must be ISO-8601 UTC`);
    }
    if (!["active", "retired", "revoked"].includes(String(key.status))) {
      errors.push(`${prefix}.status must be active|retired|revoked`);
    }
    if (key.status !== "active" && key.status !== "retired" && !key.retiredAt) {
      errors.push(`${prefix}.retiredAt required when status is revoked`);
    }
    if (key.retiredAt && !assertIsoDate(key.retiredAt)) {
      errors.push(`${prefix}.retiredAt must be ISO-8601 UTC`);
    }
    if (fingerprintSet.has(key.fingerprint)) {
      errors.push(`${prefix}.fingerprint duplicated: ${key.fingerprint}`);
    }
    fingerprintSet.add(key.fingerprint);
  }

  const manifestsToCheck = archive.proofs
    .map((item) => resolvePublicPath(publicRoot, item?.manifestPath ?? ""))
    .filter(Boolean)
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => readJson(filePath, [], ""))
    .filter(Boolean);

  for (const manifestJson of manifestsToCheck) {
    if (!fingerprintSet.has(manifestJson.key?.fingerprint)) {
      errors.push(
        `proof ${manifestJson.proofId} key fingerprint missing from archive.keys: ${manifestJson.key?.fingerprint}`,
      );
    }
  }

  const supersededTargets = new Set();
  for (const manifestJson of manifestsToCheck) {
    if (manifestJson.supersedesProofId) supersededTargets.add(manifestJson.supersedesProofId);
  }
  const headProofs = archive.proofs
    .map((item) => item.proofId)
    .filter((proofId) => !supersededTargets.has(proofId));
  if (headProofs.length !== 1) {
    errors.push(`proof chain must have exactly one head proof, found ${headProofs.length}`);
  } else if (headProofs[0] !== currentManifest.proofId) {
    errors.push(`proof chain head must equal current proofId (${currentManifest.proofId})`);
  }

  const archiveTs = Date.parse(String(archive.updatedAt));
  const currentTs = Date.parse(String(currentManifest.publishedAt));
  if (Number.isFinite(archiveTs) && Number.isFinite(currentTs) && archiveTs < currentTs) {
    errors.push("archive.updatedAt must be >= current manifest publishedAt");
  }

  const archiveFileResolved = resolvePublicPath(publicRoot, archivePath);
  if (!archiveFileResolved || !fs.existsSync(archiveFileResolved)) {
    errors.push(`archive index missing at ${archivePath}`);
  }
}

export function validateDonateProofArtifacts({
  rootDir = globalThis.process.cwd(),
  currentManifestPath = "/donate-proof/v1/manifest.v1.json",
  archivePath = "/donate-proof/archive/index.json",
} = {}) {
  const errors = [];
  const warnings = [];
  const publicRoot = path.join(rootDir, "public");

  if (!fs.existsSync(publicRoot)) {
    return {
      ok: false,
      errors: [`public directory not found: ${publicRoot}`],
      warnings,
    };
  }

  if (!ensurePublicUrlPath(currentManifestPath, errors, "currentManifestPath")) {
    return { ok: false, errors, warnings };
  }
  if (!ensurePublicUrlPath(archivePath, errors, "archivePath")) {
    return { ok: false, errors, warnings };
  }

  const manifestFile = resolvePublicPath(publicRoot, currentManifestPath);
  const archiveFile = resolvePublicPath(publicRoot, archivePath);
  if (!manifestFile || !archiveFile) {
    errors.push("manifest/archive path escaped public root");
    return { ok: false, errors, warnings };
  }

  const manifest = readJson(manifestFile, errors, "current manifest");
  const archive = readJson(archiveFile, errors, "archive index");

  if (manifest) {
    validateManifestShape(manifest, "current manifest", errors);
    validateManifestFileChecks(manifest, publicRoot, errors, "current manifest");
  }
  if (archive) {
    validateArchiveShape(archive, errors);
  }

  if (manifest && archive) {
    validateArchiveAndChain({
      currentManifest: manifest,
      currentManifestPath,
      archive,
      archivePath,
      publicRoot,
      errors,
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}
