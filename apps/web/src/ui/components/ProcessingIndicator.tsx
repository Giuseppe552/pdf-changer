import React from "react";
import type { ProgressUpdate } from "../../utils/progress";

/**
 * Processing feedback for long operations.
 *
 * Two modes:
 * - Without progress data: indeterminate bar + elapsed time (existing behaviour)
 * - With progress data: real progress bar, stage label, page counter
 *
 * Appears after a short delay to avoid flash on fast operations.
 */
export function ProcessingIndicator({
  label = "Processing",
  showAfterMs = 600,
  progress,
}: {
  label?: string;
  showAfterMs?: number;
  progress?: ProgressUpdate | null;
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

  const hasProgress = progress && progress.fraction !== null;
  const pct = hasProgress ? Math.round(progress.fraction! * 100) : null;
  const displayLabel = progress?.label ?? label;
  const pageInfo =
    progress?.currentPage && progress?.pageCount
      ? `${progress.currentPage} / ${progress.pageCount}`
      : null;

  return (
    <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)] animate-pulse" />
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)] animate-pulse"
              style={{ animationDelay: "0.2s" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)] animate-pulse"
              style={{ animationDelay: "0.4s" }}
            />
          </div>
          <span className="mono text-xs text-[var(--ui-text-secondary)]">
            {displayLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {pageInfo && (
            <span className="mono text-xs text-[var(--ui-text-muted)] tabular-nums">
              pg {pageInfo}
            </span>
          )}
          {pct !== null && (
            <span className="mono text-xs text-[var(--ui-text)] tabular-nums">
              {pct}%
            </span>
          )}
          <span className="mono text-xs text-[var(--ui-text-muted)] tabular-nums">
            {elapsed}s
          </span>
        </div>
      </div>

      {/* Progress track — determinate or indeterminate */}
      <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-[var(--ui-border)]">
        {hasProgress ? (
          <div
            className="h-full rounded-full bg-[var(--ui-accent)] transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div
            className="h-full rounded-full bg-[var(--ui-accent)]"
            style={{
              width: "30%",
              animation: "processing-slide 1.5s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {!hasProgress && elapsed >= 10 && (
        <div className="mt-2 text-xs text-[var(--ui-text-muted)]">
          Large files take longer. Your browser is doing the work locally.
        </div>
      )}
    </div>
  );
}
