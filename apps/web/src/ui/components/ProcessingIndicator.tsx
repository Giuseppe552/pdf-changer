import React from "react";

/**
 * Minimal processing indicator for long operations.
 * Shows an animated bar + elapsed time so users know something is happening.
 * Appears only after a short delay to avoid flash on fast operations.
 */
export function ProcessingIndicator({
  label = "Processing",
  showAfterMs = 800,
}: {
  label?: string;
  showAfterMs?: number;
}) {
  const [visible, setVisible] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const startRef = React.useRef(Date.now());

  React.useEffect(() => {
    startRef.current = Date.now();
    const showTimer = setTimeout(() => setVisible(true), showAfterMs);
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => {
      clearTimeout(showTimer);
      clearInterval(tick);
    };
  }, [showAfterMs]);

  if (!visible) return null;

  return (
    <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* animated bar — three dots cycling */}
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)] animate-pulse" />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)] animate-pulse" style={{ animationDelay: "0.2s" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)] animate-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
          <span className="mono text-xs text-[var(--ui-text-secondary)]">{label}</span>
        </div>
        <span className="mono text-xs text-[var(--ui-text-muted)] tabular-nums">
          {elapsed}s
        </span>
      </div>
      {/* progress track */}
      <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-[var(--ui-border)]">
        <div
          className="h-full rounded-full bg-[var(--ui-accent)]"
          style={{
            width: "30%",
            animation: "processing-slide 1.5s ease-in-out infinite",
          }}
        />
      </div>
      {elapsed >= 10 && (
        <div className="mt-2 text-xs text-[var(--ui-text-muted)]">
          Large files take longer. Your browser is doing the work locally.
        </div>
      )}
    </div>
  );
}
