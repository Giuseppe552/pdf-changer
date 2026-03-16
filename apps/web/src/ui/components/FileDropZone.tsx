import React from "react";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const fixed = unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(fixed)} ${units[unitIndex]}`;
}

export function FileDropZone({
  label = "Choose files",
  help = "Drag and drop files here, or click Browse.",
  multiple,
  disabled,
  files,
  onFiles,
  accept,
  validateFile,
  browseLabel = "Browse",
}: {
  label?: string;
  help?: string;
  multiple?: boolean;
  disabled?: boolean;
  files?: File[];
  onFiles: (files: File[]) => void;
  accept?: string;
  validateFile?: (file: File) => boolean;
  browseLabel?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const dragCounter = React.useRef(0);

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function accepts(file: File): boolean {
    return validateFile ? validateFile(file) : true;
  }

  function acceptFiles(next: File[]) {
    const filtered = next.filter(accepts);
    onFiles(multiple ? filtered : filtered.slice(0, 1));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  }

  function onDragEnter(e: React.DragEvent<HTMLDivElement>) {
    if (disabled) return;
    e.preventDefault();
    dragCounter.current += 1;
    setDragging(true);
  }

  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (disabled) return;
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragging(false);
    }
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    if (disabled) return;
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    const list = Array.from(e.dataTransfer.files ?? []);
    if (!list.length) return;
    acceptFiles(list);
  }

  const summary =
    files && files.length
      ? multiple
        ? `${files.length} file${files.length === 1 ? "" : "s"} selected`
        : `${files[0].name} · ${formatBytes(files[0].size)}`
      : null;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled ? "true" : "false"}
      onKeyDown={onKeyDown}
      onClick={openPicker}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={[
        "rounded-sm border-2 border-dashed p-5 transition",
        disabled
          ? "cursor-not-allowed border-[var(--ui-border)] bg-[var(--ui-bg)] opacity-70"
          : dragging
            ? "cursor-pointer border-[var(--ui-accent)] bg-[var(--ui-accent)]/10"
            : "cursor-pointer border-[var(--ui-border)] bg-[var(--ui-bg-raised)] hover:border-[var(--ui-border)] hover:bg-[var(--ui-bg)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--ui-focus)]",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          e.currentTarget.value = "";
          acceptFiles(list);
        }}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-base font-semibold text-[var(--ui-text)]">{label}</div>
          <div className="text-[15px] text-[var(--ui-text-secondary)]">{help}</div>
        </div>
        <div className="rounded-sm border border-[var(--ui-border-strong)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm font-semibold text-[var(--ui-text)]">
          {browseLabel}
        </div>
      </div>

      {summary ? <div className="mt-3 text-sm text-[var(--ui-text-muted)]">{summary}</div> : null}
    </div>
  );
}
