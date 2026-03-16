import React from "react";
import { degrees, PDFDocument } from "pdf-lib";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { loadPdfThumbnails } from "../../../utils/pdf/thumbnails";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { runAudited } from "../../../utils/vpe/auditRunner";
import type { AuditReport } from "../../../utils/vpe/types";
import { PdfDropZone } from "../../components/PdfDropZone";
import { AuditBadge } from "../../components/vpe/AuditBadge";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";

type PageState = {
  idx: number; // 0-based source index
  rotation: number; // degrees
  deleted: boolean;
  selected: boolean;
  thumbUrl?: string;
};

export function PageEditorToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pages, setPages] = React.useState<PageState[]>([]);
  const [out, setOut] = React.useState<{ url: string; name: string } | null>(
    null,
  );
  const [auditReport, setAuditReport] = React.useState<AuditReport | null>(null);

  React.useEffect(() => {
    return () => {
      if (out?.url) URL.revokeObjectURL(out.url);
    };
  }, [out]);

  const load = React.useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setPages([]);
    setOut(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const thumbs = await loadPdfThumbnails(bytes, { scale: 0.18, maxPages: 60 });
      setPages(
        thumbs.map((t) => ({
          idx: t.pageIndex,
          rotation: 0,
          deleted: false,
          selected: false,
          thumbUrl: t.dataUrl,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load PDF");
    } finally {
      setBusy(false);
    }
  }, [file]);

  function move(i: number, dir: -1 | 1) {
    setPages((prev) => {
      const next = [...prev];
      const ni = i + dir;
      if (ni < 0 || ni >= next.length) return prev;
      const tmp = next[i];
      next[i] = next[ni];
      next[ni] = tmp;
      return next;
    });
  }

  function rotate(i: number, dir: -90 | 90) {
    setPages((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], rotation: (next[i].rotation + dir + 360) % 360 };
      return next;
    });
  }

  function toggleDelete(i: number) {
    setPages((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], deleted: !next[i].deleted };
      return next;
    });
  }

  function toggleSelected(i: number) {
    setPages((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], selected: !next[i].selected };
      return next;
    });
  }

  async function downloadEdited(kind: "edited" | "selected") {
    if (!file) return;
    setBusy(true);
    setError(null);
    setOut(null);
    setAuditReport(null);
    try {
      if (!canUseTool(me, "editor")) {
        throw new Error("Monthly quota reached for this tool.");
      }
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const chosen = pages.filter((p) => !p.deleted && (kind === "edited" || p.selected));
      if (chosen.length === 0) throw new Error("No pages selected.");
      const { result, report } = await runAudited({
        toolName: "editor",
        inputBytes,
        processFn: async (bytes) => {
          const src = await PDFDocument.load(bytes, { ignoreEncryption: false });
          const outDoc = await PDFDocument.create();
          for (const p of chosen) {
            const [copied] = await outDoc.copyPages(src, [p.idx]);
            if (p.rotation) copied.setRotation(degrees(p.rotation));
            outDoc.addPage(copied);
          }
          const outputBytes = new Uint8Array(await outDoc.save());
          return { outputBytes };
        },
      });
      const blob = new Blob([toArrayBuffer(result.outputBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const nameBase = baseName(file.name);
      const name = kind === "edited" ? `${nameBase}.edited.pdf` : `${nameBase}.extract.pdf`;
      incrementToolUse(me, "editor");
      setOut({ url, name });
      setAuditReport(report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Card title="Page editor (reorder / rotate / delete / extract)">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF"
            help="Drag & drop a PDF here, or click to browse. Thumbnails load locally."
            files={file ? [file] : []}
            onFiles={(files) => setFile(files[0] ?? null)}
            disabled={busy}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void downloadEdited("edited")} disabled={!file || busy || pages.length === 0}>
              Download edited PDF
            </Button>
            <Button variant="secondary" onClick={() => void downloadEdited("selected")} disabled={!file || busy || pages.every((p) => !p.selected)}>
              Download selected pages
            </Button>
            {out ? (
              <a
                className="inline-flex items-center rounded-sm bg-[var(--ui-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--ui-accent-hover)]"
                href={out.url}
                download={out.name}
              >
                {out.name}
              </a>
            ) : null}
          </div>
          {busy ? <div className="text-sm text-[var(--ui-text-muted)]">Working…</div> : null}
        </div>
      </Card>

      {auditReport ? <AuditBadge report={auditReport} /> : null}

      {pages.length ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {pages.map((p, i) => (
            <div
              key={`${p.idx}-${i}`}
              className={`rounded-sm border bg-[var(--ui-bg-raised)] p-3 shadow-sm ${
                p.deleted ? "border-red-700/40 opacity-60" : "border-[var(--ui-border)]"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs text-[var(--ui-text-secondary)]">
                  Page {p.idx + 1}
                </div>
                <label className="flex items-center gap-2 text-xs text-[var(--ui-text-secondary)]">
                  <input type="checkbox" checked={p.selected} onChange={() => toggleSelected(i)} />
                  select
                </label>
              </div>
              {p.thumbUrl ? (
                <img
                  src={p.thumbUrl}
                  alt={`Page ${p.idx + 1}`}
                  className="mb-3 w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)]"
                  loading="lazy"
                />
              ) : (
                <div className="mb-3 aspect-[3/4] w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg)]" />
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => move(i, -1)} disabled={busy}>
                  Up
                </Button>
                <Button variant="secondary" onClick={() => move(i, 1)} disabled={busy}>
                  Down
                </Button>
                <Button variant="secondary" onClick={() => rotate(i, -90)} disabled={busy}>
                  ↺
                </Button>
                <Button variant="secondary" onClick={() => rotate(i, 90)} disabled={busy}>
                  ↻
                </Button>
                <Button variant={p.deleted ? "secondary" : "danger"} onClick={() => toggleDelete(i)} disabled={busy}>
                  {p.deleted ? "Undo delete" : "Delete"}
                </Button>
              </div>
              {p.rotation ? (
                <div className="mt-2 text-xs text-[var(--ui-text-muted)]">
                  Rotation: {p.rotation}°
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <Card title="Error">
          <div className="text-sm text-red-700">{error}</div>
        </Card>
      ) : null}
    </div>
  );
}

function baseName(name: string): string {
  return name.toLowerCase().endsWith(".pdf") ? name.slice(0, -4) : name;
}
