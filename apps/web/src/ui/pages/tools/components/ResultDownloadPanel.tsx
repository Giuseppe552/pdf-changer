import React from "react";
import { createZip } from "../../../../utils/zip";
import { toArrayBuffer } from "../../../../utils/toArrayBuffer";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";

export type ToolOutputFile = {
  url: string;
  name: string;
  note?: string;
  bytes?: Uint8Array;
};

export function ResultDownloadPanel({
  title = "Downloads",
  files,
  zipName = "pdf-changer-exports.zip",
}: {
  title?: string;
  files: ToolOutputFile[];
  zipName?: string;
}) {
  const [zipBusy, setZipBusy] = React.useState(false);
  const [zipError, setZipError] = React.useState<string | null>(null);

  if (!files.length) return null;

  async function downloadAllZip() {
    setZipBusy(true);
    setZipError(null);
    try {
      const entries = await Promise.all(
        files.map(async (file) => {
          if (file.bytes) {
            return { name: file.name, bytes: file.bytes };
          }
          const response = await fetch(file.url);
          if (!response.ok) {
            throw new Error(`Could not read ${file.name} for ZIP export.`);
          }
          const bytes = new Uint8Array(await response.arrayBuffer());
          return { name: file.name, bytes };
        }),
      );
      const zipBytes = createZip(entries);
      const blob = new Blob([toArrayBuffer(zipBytes)], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = zipName;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setZipError(error instanceof Error ? error.message : "ZIP export failed.");
    } finally {
      setZipBusy(false);
    }
  }

  return (
    <Card title={title}>
      {files.length > 1 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Button onClick={() => void downloadAllZip()} disabled={zipBusy}>
            {zipBusy ? "Preparing ZIP…" : "Download all (.zip)"}
          </Button>
          <div className="text-[15px] text-neutral-700">
            {files.length} files ready
          </div>
        </div>
      ) : null}

      {zipError ? (
        <div className="mb-4 rounded-sm border border-red-300 bg-red-50 p-3 text-[15px] text-red-700">
          {zipError}
        </div>
      ) : null}

      <ul className="space-y-2">
        {files.map((file) => (
          <li key={`${file.name}:${file.url}`}>
            <a
              className="inline-flex min-h-11 items-center rounded-sm bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              href={file.url}
              download={file.name}
            >
              {file.name}
            </a>
            {file.note ? (
              <div className="mt-1 text-sm text-neutral-600">{file.note}</div>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
