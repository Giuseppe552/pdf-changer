import React from "react";
import { loadPdfThumbnails } from "../../utils/pdf/thumbnails";

/**
 * Renders a thumbnail of the first page of a PDF file.
 * Loads pdf.js lazily on first use.
 */
export function PdfPreview({ file }: { file: File | null }) {
  const [thumb, setThumb] = React.useState<string | null>(null);
  const [pageCount, setPageCount] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!file) {
      setThumb(null);
      setPageCount(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    file
      .arrayBuffer()
      .then((buf) =>
        loadPdfThumbnails(new Uint8Array(buf), { scale: 0.5, maxPages: 1 }),
      )
      .then(({ thumbs, pageCount: count }) => {
        if (cancelled) return;
        setThumb(thumbs[0]?.dataUrl ?? null);
        setPageCount(count);
      })
      .catch(() => {
        if (!cancelled) setThumb(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  if (!file) return null;

  return (
    <div className="flex items-start gap-4 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-3">
      <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded border border-[var(--ui-border)] bg-[var(--ui-bg)]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ui-border-strong)] border-t-[var(--ui-accent)]" />
          </div>
        ) : thumb ? (
          <img
            src={thumb}
            alt="Page 1"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--ui-text-muted)]">
            PDF
          </div>
        )}
      </div>
      <div className="min-w-0 space-y-0.5 pt-1">
        <div className="truncate text-sm font-medium text-[var(--ui-text)]">
          {file.name}
        </div>
        <div className="mono text-xs text-[var(--ui-text-muted)]">
          {formatSize(file.size)}
          {pageCount !== null ? ` · ${pageCount} page${pageCount === 1 ? "" : "s"}` : ""}
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
