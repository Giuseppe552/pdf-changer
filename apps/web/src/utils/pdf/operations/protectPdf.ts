import type { PdfOperation } from "./types";

export type ProtectPdfInput = {
  inputBytes: Uint8Array;
  password: string;
};

export type ProtectPdfOutput = {
  outputBytes: Uint8Array;
  mode: "unavailable";
};

export const protectPdf: PdfOperation<ProtectPdfInput, ProtectPdfOutput> = async () => {
  throw new Error(
    "Password-protected PDF writing is not available in the local engine yet. This tool remains in hybrid beta.",
  );
};

