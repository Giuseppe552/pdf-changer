import { PDFDocument } from "pdf-lib";
import type { PdfOperation } from "./types";

export type UnlockPdfInput = {
  inputBytes: Uint8Array;
};

export type UnlockPdfOutput = {
  outputBytes: Uint8Array;
  wasEncrypted: boolean;
};

export const unlockPdf: PdfOperation<UnlockPdfInput, UnlockPdfOutput> = async ({
  inputBytes,
}) => {
  const doc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
  const wasEncrypted = doc.isEncrypted;
  const outputBytes = await doc.save({ useObjectStreams: true });
  return { outputBytes, wasEncrypted };
};
