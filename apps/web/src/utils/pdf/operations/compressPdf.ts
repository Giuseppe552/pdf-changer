import { PDFDocument } from "pdf-lib";
import type { PdfOperation } from "./types";

export type CompressPdfInput = {
  inputBytes: Uint8Array;
};

export type CompressPdfOutput = {
  outputBytes: Uint8Array;
  inputSizeBytes: number;
  outputSizeBytes: number;
  reductionRatio: number;
};

export const compressPdf: PdfOperation<CompressPdfInput, CompressPdfOutput> = async ({
  inputBytes,
}) => {
  const src = await PDFDocument.load(inputBytes, { ignoreEncryption: false });
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  for (const page of pages) out.addPage(page);

  out.setTitle("");
  out.setAuthor("");
  out.setSubject("");
  out.setKeywords([]);
  out.setCreator("");
  out.setProducer("");

  const outputBytes = await out.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });

  const inputSizeBytes = inputBytes.byteLength;
  const outputSizeBytes = outputBytes.byteLength;
  const reductionRatio =
    inputSizeBytes <= 0 ? 0 : (inputSizeBytes - outputSizeBytes) / inputSizeBytes;

  return {
    outputBytes,
    inputSizeBytes,
    outputSizeBytes,
    reductionRatio,
  };
};

