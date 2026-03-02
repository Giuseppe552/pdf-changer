import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FileDropZone } from "../../components/FileDropZone";
import { imageToPdf } from "../../../utils/pdf/operations/imageToPdf";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";

type ImageItem = { id: string; file: File };

function isImage(file: File): boolean {
  return (
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    /\.(jpg|jpeg|png)$/i.test(file.name)
  );
}

export function ImageToPdfToolPage() {
  const { me } = useAuth();
  const [items, setItems] = React.useState<ImageItem[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [out, setOut] = React.useState<{ url: string; name: string } | null>(null);

  React.useEffect(
    () => () => {
      if (out?.url) URL.revokeObjectURL(out.url);
    },
    [out],
  );

  function addFiles(files: File[]) {
    if (!files.length) return;
    const next = files
      .filter(isImage)
      .map((file) => ({ id: crypto.randomUUID(), file }));
    if (!next.length) return;
    setItems((previous) => [...previous, ...next]);
  }

  function move(id: string, offset: -1 | 1) {
    setItems((previous) => {
      const index = previous.findIndex((item) => item.id === id);
      if (index < 0) return previous;
      const nextIndex = index + offset;
      if (nextIndex < 0 || nextIndex >= previous.length) return previous;
      const next = [...previous];
      const current = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = current;
      return next;
    });
  }

  function remove(id: string) {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }

  async function run() {
    if (!items.length) return;
    setBusy(true);
    setError(null);
    setOut(null);
    try {
      if (!canUseTool(me, "image-to-pdf")) {
        throw new Error("Monthly quota reached for this tool.");
      }
      const images = await Promise.all(
        items.map(async ({ file }) => ({
          name: file.name,
          mimeType: file.type,
          bytes: new Uint8Array(await file.arrayBuffer()),
        })),
      );
      const output = await imageToPdf({ images });
      const blob = new Blob([toArrayBuffer(output.outputBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      incrementToolUse(me, "image-to-pdf");
      setOut({ url, name: "images.pdf" });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Conversion failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="JPG/PNG → PDF">
        <div className="space-y-4">
          <FileDropZone
            label="Add JPG or PNG files"
            help="Drag and drop images, or click Browse. Reorder before converting."
            multiple
            disabled={busy}
            files={items.map((item) => item.file)}
            onFiles={addFiles}
            accept="image/png,image/jpeg,.png,.jpg,.jpeg"
            validateFile={isImage}
          />
          <div className="text-sm text-neutral-600">Add images, reorder, then export one PDF.</div>
          {items.length ? (
            <ul className="space-y-2">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-sm border border-neutral-300 bg-white px-3 py-2"
                >
                  <div className="min-w-0 truncate text-sm text-neutral-900">
                    {index + 1}. {item.file.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="md" variant="secondary" onClick={() => move(item.id, -1)} disabled={busy}>
                      Up
                    </Button>
                    <Button size="md" variant="secondary" onClick={() => move(item.id, 1)} disabled={busy}>
                      Down
                    </Button>
                    <Button size="md" variant="danger" onClick={() => remove(item.id)} disabled={busy}>
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-neutral-600">No images selected yet.</div>
          )}
          <Button onClick={run} disabled={!items.length || busy}>
            {busy ? "Converting…" : "Convert locally"}
          </Button>
        </div>
      </Card>

      {out ? <ResultDownloadPanel files={[out]} /> : null}

      {error ? (
        <Card title="Error" variant="danger">
          <div className="text-[15px] text-red-800">{error}</div>
        </Card>
      ) : null}
    </div>
  );
}
