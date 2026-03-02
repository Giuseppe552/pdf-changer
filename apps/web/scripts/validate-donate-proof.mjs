#!/usr/bin/env node
import process from "node:process";
import { validateDonateProofArtifacts } from "./validate-donate-proof-lib.mjs";

const result = validateDonateProofArtifacts({
  rootDir: process.cwd(),
});

if (!result.ok) {
  globalThis.console.error("Donate proof validation failed:");
  for (const error of result.errors) {
    globalThis.console.error(`- ${error}`);
  }
  process.exit(1);
}

if (result.warnings.length) {
  globalThis.console.warn("Donate proof validation warnings:");
  for (const warning of result.warnings) {
    globalThis.console.warn(`- ${warning}`);
  }
}

globalThis.console.log("Donate proof validation passed.");
