import React from "react";
import { PDFDocument } from "pdf-lib";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { PdfDropZone } from "../../components/PdfDropZone";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";

type MergeItem = {
  id: string;
  file: File;
};

export function MergeToolPage() {
  const { me } = useAuth();
  const [items, setItems] = React.useState<MergeItem[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [out, setOut] = React.useState<{ url: string; name: string } | null>(
    null,
  );

  function addFiles(files: File[]) {
    if (!files.length) return;
    const newItems: MergeItem[] = files.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
    }));
    setItems((prev) => [...prev, ...newItems]);
  }

  function move(id: string, dir: -1 | 1) {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const ni = idx + dir;
      if (ni < 0 || ni >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[ni];
      next[ni] = tmp;
      return next;
    });
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  async function merge() {
    setBusy(true);
    setError(null);
    setOut(null);
    try {
      if (!canUseTool(me, "merge")) {
        throw new Error("Monthly quota reached for this tool.");
      }
      if (items.length < 2) throw new Error("Choose at least 2 PDFs to merge.");
      const outDoc = await PDFDocument.create();
      for (const item of items) {
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        const src = await PDFDocument.load(bytes, { ignoreEncryption: false });
        const pages = await outDoc.copyPages(src, src.getPageIndices());
        for (const p of pages) outDoc.addPage(p);
      }
      const mergedBytes = await outDoc.save();
      const blob = new Blob([toArrayBuffer(mergedBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      incrementToolUse(me, "merge");
      setOut({ url, name: "merged.pdf" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Merge failed");
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    return () => {
      if (out?.url) URL.revokeObjectURL(out.url);
    };
  }, [out]);

  return (
    <div className="space-y-4">
      <Card title="Merge PDFs">
        <div className="space-y-4">
          <PdfDropZone
            label="Add PDFs"
            help="Drag & drop PDFs here, or click to browse. Reorder before merging."
            multiple
            files={items.map((i) => i.file)}
            onFiles={addFiles}
            disabled={busy}
          />
          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="text-sm text-neutral-600">No files yet.</div>
            ) : (
              <ul className="space-y-2">
                {items.map((it, idx) => (
                  <li
                    key={it.id}
                    className="flex items-center justify-between gap-2 rounded-sm border border-neutral-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-neutral-900">
                        {idx + 1}. {it.file.name}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {(it.file.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => move(it.id, -1)} disabled={busy}>
                        Up
                      </Button>
                      <Button variant="secondary" onClick={() => move(it.id, 1)} disabled={busy}>
                        Down
                      </Button>
                      <Button variant="danger" onClick={() => remove(it.id)} disabled={busy}>
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={merge} disabled={busy || items.length < 2}>
              {busy ? "Merging…" : "Merge"}
            </Button>
            {out ? (
              <a
                className="inline-flex items-center rounded-sm bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                href={out.url}
                download={out.name}
              >
                Download {out.name}
              </a>
            ) : null}
          </div>
        </div>
      </Card>
      {error ? (
        <Card title="Error">
          <div className="text-sm text-red-700">{error}</div>
        </Card>
      ) : null}
    </div>
  );
}
