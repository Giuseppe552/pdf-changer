import React from "react";

export type RedactionRectUI = {
  id: string;
  x: number; // fraction 0-1
  y: number;
  width: number;
  height: number;
};

type Props = {
  imageDataUrl: string;
  pageWidth: number;
  pageHeight: number;
  redactions: RedactionRectUI[];
  onAdd: (rect: Omit<RedactionRectUI, "id">) => void;
  onRemove: (id: string) => void;
};

export function RedactionCanvas({
  imageDataUrl,
  pageWidth,
  pageHeight,
  redactions,
  onAdd,
  onRemove,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = React.useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  function toFraction(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { fx: 0, fy: 0 };
    const fx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const fy = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { fx, fy };
  }

  function handlePointerDown(e: React.PointerEvent) {
    const { fx, fy } = toFraction(e.clientX, e.clientY);
    setDrawing({ startX: fx, startY: fy, currentX: fx, currentY: fy });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drawing) return;
    const { fx, fy } = toFraction(e.clientX, e.clientY);
    setDrawing({ ...drawing, currentX: fx, currentY: fy });
  }

  function handlePointerUp() {
    if (!drawing) return;
    const x = Math.min(drawing.startX, drawing.currentX);
    const y = Math.min(drawing.startY, drawing.currentY);
    const w = Math.abs(drawing.currentX - drawing.startX);
    const h = Math.abs(drawing.currentY - drawing.startY);
    if (w > 0.005 && h > 0.005) {
      onAdd({ x, y, width: w, height: h });
    }
    setDrawing(null);
  }

  const aspectRatio = pageWidth / pageHeight;

  return (
    <div
      ref={containerRef}
      className="relative mx-auto cursor-crosshair select-none overflow-hidden border border-[var(--ui-border)]"
      style={{ aspectRatio: String(aspectRatio), maxWidth: "100%", maxHeight: "80vh" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <img
        src={imageDataUrl}
        alt="PDF page"
        className="pointer-events-none h-full w-full"
        draggable={false}
      />

      {/* Existing redaction rectangles */}
      {redactions.map((r) => (
        <div
          key={r.id}
          className="absolute border-2 border-red-600 bg-red-950/300/30 hover:bg-red-950/300/50"
          style={{
            left: `${r.x * 100}%`,
            top: `${r.y * 100}%`,
            width: `${r.width * 100}%`,
            height: `${r.height * 100}%`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(r.id);
          }}
          title="Click to remove"
        />
      ))}

      {/* Current drawing rectangle */}
      {drawing ? (
        <div
          className="pointer-events-none absolute border-2 border-red-600 bg-red-950/300/30"
          style={{
            left: `${Math.min(drawing.startX, drawing.currentX) * 100}%`,
            top: `${Math.min(drawing.startY, drawing.currentY) * 100}%`,
            width: `${Math.abs(drawing.currentX - drawing.startX) * 100}%`,
            height: `${Math.abs(drawing.currentY - drawing.startY) * 100}%`,
          }}
        />
      ) : null}
    </div>
  );
}
