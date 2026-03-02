import React from "react";

type Props = {
  width?: number;
  height?: number;
  lineWidth?: number;
  lineColor?: string;
  disabled?: boolean;
  onSignatureChange: (dataUrl: string | null) => void;
};

export function SignaturePad({
  width = 400,
  height = 160,
  lineWidth = 2,
  lineColor = "#000000",
  disabled = false,
  onSignatureChange,
}: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const drawingRef = React.useRef(false);
  const hasStrokesRef = React.useRef(false);

  function getCtx() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokesRef.current = false;
    onSignatureChange(null);
  }

  function toCanvasCoords(e: React.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (disabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = toCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drawingRef.current || disabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = toCanvasCoords(e);
    ctx.lineWidth = lineWidth * 2; // 2x for retina canvas
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = lineColor;
    ctx.lineTo(x, y);
    ctx.stroke();
    hasStrokesRef.current = true;
  }

  function handlePointerUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (hasStrokesRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        onSignatureChange(canvas.toDataURL("image/png"));
      }
    }
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={width * 2}
        height={height * 2}
        style={{ width, height, touchAction: "none" }}
        className="cursor-crosshair rounded-sm border border-neutral-300 bg-white"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <button
        type="button"
        onClick={clear}
        disabled={disabled}
        className="text-sm text-neutral-600 underline hover:text-neutral-900 disabled:opacity-50"
      >
        Clear signature
      </button>
    </div>
  );
}
