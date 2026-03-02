import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error build-script helper has no TS declarations.
import { validateDonateProofArtifacts } from "../../../scripts/validate-donate-proof-lib.mjs";

function withTempRoot(): string {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-changer-proof-"));
  const src = path.join(process.cwd(), "public", "donate-proof");
  const dst = path.join(tempRoot, "public", "donate-proof");
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
  return tempRoot;
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("validateDonateProofArtifacts", () => {
  it("passes with current repository artifacts", () => {
    const result = validateDonateProofArtifacts({ rootDir: process.cwd() });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails on manifest hash mismatch", () => {
    const tempRoot = withTempRoot();
    tempRoots.push(tempRoot);

    const manifestPath = path.join(
      tempRoot,
      "public",
      "donate-proof",
      "v1",
      "manifest.v1.json",
    );
    const manifest = readJson(manifestPath);
    manifest.files[0].sha256 = "0000000000000000000000000000000000000000000000000000000000000000";
    writeJson(manifestPath, manifest);

    const result = validateDonateProofArtifacts({ rootDir: tempRoot });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("sha256 mismatch");
  });

  it("fails when supersedesProofId points to missing proof", () => {
    const tempRoot = withTempRoot();
    tempRoots.push(tempRoot);

    const manifestPath = path.join(
      tempRoot,
      "public",
      "donate-proof",
      "v1",
      "manifest.v1.json",
    );
    const manifest = readJson(manifestPath);
    manifest.supersedesProofId = "2099-01-01-missing";
    writeJson(manifestPath, manifest);

    const result = validateDonateProofArtifacts({ rootDir: tempRoot });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("orphan supersedesProofId");
  });

  it("fails when revoked proof has no reason", () => {
    const tempRoot = withTempRoot();
    tempRoots.push(tempRoot);

    const manifestPath = path.join(
      tempRoot,
      "public",
      "donate-proof",
      "v1",
      "manifest.v1.json",
    );
    const manifest = readJson(manifestPath);
    manifest.revoked = true;
    delete manifest.revocationReason;
    writeJson(manifestPath, manifest);

    const result = validateDonateProofArtifacts({ rootDir: tempRoot });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("revoked manifests must include revocationReason");
  });
});
