import { z } from "zod";

const fingerprintRegex = /^[A-F0-9]{40}$/;
const keyIdRegex = /^[A-F0-9]{16}$/;
const sha256Regex = /^[a-f0-9]{64}$/;

const isoDateTime = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/));

const proofFileSchema = z.object({
  path: z.string().min(1),
  sha256: z.string().regex(sha256Regex, "sha256 must be 64 lowercase hex chars"),
  sizeBytes: z.number().int().nonnegative(),
});

const proofAddressSchema = z.object({
  network: z.string().min(1),
  symbol: z.string().min(1),
  address: z.string().min(8),
  note: z.string().min(1).optional(),
});

const proofKeySchema = z.object({
  fingerprint: z.string().regex(fingerprintRegex, "fingerprint must be 40 uppercase hex chars"),
  keyId: z.string().regex(keyIdRegex, "keyId must be 16 uppercase hex chars"),
  algorithm: z.string().min(2),
  firstSeenAt: isoDateTime,
});

export const donateProofManifestV1Schema = z
  .object({
    version: z.literal("v1"),
    proofId: z.string().min(3),
    publishedAt: isoDateTime,
    validFrom: isoDateTime,
    key: proofKeySchema,
    files: z.array(proofFileSchema).min(1),
    addresses: z.array(proofAddressSchema).min(1),
    supersedesProofId: z.string().min(3).optional(),
    revoked: z.boolean().optional(),
    revocationReason: z.string().min(3).optional(),
  })
  .superRefine((value, ctx) => {
    const set = new Set<string>();
    for (const [index, file] of value.files.entries()) {
      if (set.has(file.path)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate file path: ${file.path}`,
          path: ["files", index, "path"],
        });
      }
      set.add(file.path);
    }

    if (value.revoked && !value.revocationReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "revoked proof must include revocationReason",
        path: ["revocationReason"],
      });
    }
  });

export type DonateProofManifestV1 = z.infer<typeof donateProofManifestV1Schema>;
export type DonateProofFile = z.infer<typeof proofFileSchema>;

const archiveProofSchema = z.object({
  proofId: z.string().min(3),
  manifestPath: z.string().min(1),
  publishedAt: isoDateTime,
  revoked: z.boolean().optional(),
  revocationReason: z.string().min(3).optional(),
});

const archiveKeySchema = z.object({
  fingerprint: z.string().regex(fingerprintRegex),
  keyId: z.string().regex(keyIdRegex),
  path: z.string().min(1),
  firstSeenAt: isoDateTime,
  status: z.enum(["active", "retired", "revoked"]),
  retiredAt: isoDateTime.optional(),
});

export const donateProofArchiveSchema = z.object({
  version: z.literal("v1"),
  updatedAt: isoDateTime,
  proofs: z.array(archiveProofSchema),
  keys: z.array(archiveKeySchema),
});

export type DonateProofArchiveIndex = z.infer<typeof donateProofArchiveSchema>;

export function parseDonateProofManifestV1(
  input: unknown,
): { ok: true; data: DonateProofManifestV1 } | { ok: false; issues: string[] } {
  const parsed = donateProofManifestV1Schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }
  return { ok: true, data: parsed.data };
}

export function parseDonateProofArchive(
  input: unknown,
): { ok: true; data: DonateProofArchiveIndex } | { ok: false; issues: string[] } {
  const parsed = donateProofArchiveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }
  return { ok: true, data: parsed.data };
}
