import React from "react";
import { FileDropZone } from "./FileDropZone";

function isPdf(file: File): boolean {
  if (file.type === "application/pdf") return true;
  return file.name.toLowerCase().endsWith(".pdf");
}

export function PdfDropZone({
  label = "PDF",
  help = "Drag & drop a PDF here, or click to browse.",
  multiple,
  disabled,
  files,
  onFiles,
}: {
  label?: string;
  help?: string;
  multiple?: boolean;
  disabled?: boolean;
  files?: File[];
  onFiles: (files: File[]) => void;
}) {
  return (
    <FileDropZone
      label={label}
      help={help}
      multiple={multiple}
      disabled={disabled}
      files={files}
      onFiles={onFiles}
      accept="application/pdf,.pdf"
      validateFile={isPdf}
      browseLabel="Browse"
    />
  );
}
