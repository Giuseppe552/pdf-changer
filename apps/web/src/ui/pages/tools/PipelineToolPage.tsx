import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { PdfDropZone } from "../../components/PdfDropZone";
import {
  executePipeline,
  PIPELINE_PRESETS,
  stepLabel,
  type PipelineStep,
  type PipelineStepType,
  type PipelineStepResult,
} from "../../../utils/pdf/pipeline";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { runAudited } from "../../../utils/vpe/auditRunner";
import type { AuditReport } from "../../../utils/vpe/types";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";
import { AuditBadge } from "../../components/vpe/AuditBadge";
import { ProcessingIndicator } from "../../components/ProcessingIndicator";

const AVAILABLE_STEPS: PipelineStepType[] = [
  "scrub",
  "paranoid-scrub",
  "exif-strip",
  "flatten",
  "compress",
];

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function PipelineToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [steps, setSteps] = React.useState<PipelineStep[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState<number>(-1);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    url: string;
    name: string;
    stepResults: PipelineStepResult[];
    totalDurationMs: number;
    auditReport: AuditReport;
  } | null>(null);

  React.useEffect(
    () => () => {
      if (result?.url) URL.revokeObjectURL(result.url);
    },
    [result],
  );

  function applyPreset(presetSteps: PipelineStep[]) {
    setSteps([...presetSteps]);
  }

  function addStep(type: PipelineStepType) {
    setSteps((prev) => [...prev, { type }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function run() {
    if (!file || steps.length === 0) return;
    if (!canUseTool(me, "pipeline")) {
      setError("Monthly heavy quota reached for this device.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);
    try {
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const { result: auditResult, report: auditReport } = await runAudited({
        toolName: "pipeline",
        inputBytes,
        processFn: async (bytes) => {
          const pipelineResult = await executePipeline(bytes, steps, (idx) => {
            setCurrentStep(idx);
          });
          return {
            outputBytes: pipelineResult.outputBytes,
            steps: pipelineResult.steps,
            totalDurationMs: pipelineResult.totalDurationMs,
          };
        },
      });
      const blob = new Blob([toArrayBuffer(auditResult.outputBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      incrementToolUse(me, "pipeline");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool report shape
      const pipeReport = auditResult as any;
      setResult({
        url,
        name: `${baseName(file.name)}.pipeline.pdf`,
        stepResults: pipeReport.steps,
        totalDurationMs: pipeReport.totalDurationMs,
        auditReport,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pipeline failed");
    } finally {
      setBusy(false);
      setCurrentStep(-1);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Privacy Pipeline">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF"
            help="Chain multiple privacy operations in sequence."
            files={file ? [file] : []}
            onFiles={(files) => setFile(files[0] ?? null)}
            disabled={busy}
          />

          <div className="space-y-2">
            <div className="text-sm font-semibold text-[var(--ui-text)]">Presets</div>
            <div className="flex flex-wrap gap-2">
              {PIPELINE_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  className="rounded border border-[var(--ui-border)] px-3 py-1.5 text-sm text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-overlay)]"
                  onClick={() => applyPreset(preset.steps)}
                  disabled={busy}
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-[var(--ui-text)]">
              Steps ({steps.length})
            </div>
            {steps.length === 0 ? (
              <div className="text-sm text-[var(--ui-text-muted)]">
                Choose a preset or add steps manually.
              </div>
            ) : (
              <div className="space-y-1">
                {steps.map((step, i) => (
                  <div
                    key={i}
                    className={[
                      "flex items-center gap-2 rounded border px-3 py-2 text-sm",
                      busy && currentStep === i
                        ? "border-[var(--ui-accent)] bg-[var(--ui-accent)]/10"
                        : "border-[var(--ui-border)] bg-[var(--ui-bg-raised)]",
                    ].join(" ")}
                  >
                    <span className="font-mono text-[var(--ui-text-muted)]">{i + 1}.</span>
                    <span className="flex-1 font-semibold text-[var(--ui-text-secondary)]">
                      {stepLabel(step.type)}
                    </span>
                    {busy && currentStep === i ? (
                      <span className="text-xs text-[var(--ui-accent)]">Running...</span>
                    ) : null}
                    {!busy ? (
                      <>
                        <button
                          className="text-[var(--ui-text-muted)] hover:text-[var(--ui-text-secondary)]"
                          onClick={() => moveStep(i, -1)}
                          disabled={i === 0}
                        >
                          Up
                        </button>
                        <button
                          className="text-[var(--ui-text-muted)] hover:text-[var(--ui-text-secondary)]"
                          onClick={() => moveStep(i, 1)}
                          disabled={i === steps.length - 1}
                        >
                          Dn
                        </button>
                        <button
                          className="text-red-400 hover:text-red-600"
                          onClick={() => removeStep(i)}
                        >
                          X
                        </button>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!busy ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-[var(--ui-text)]">Add step</div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_STEPS.map((type) => (
                  <button
                    key={type}
                    className="rounded border border-[var(--ui-border)] px-3 py-1.5 text-sm text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-overlay)]"
                    onClick={() => addStep(type)}
                  >
                    + {stepLabel(type)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <Button onClick={run} disabled={!file || steps.length === 0 || busy}>
            {busy ? `Running step ${currentStep + 1} of ${steps.length}…` : "Run pipeline"}
          </Button>
        </div>
      </Card>

      {busy && <ProcessingIndicator label="Running pipeline" />}

      {result ? (
        <Card title="Pipeline report">
          <div className="space-y-3">
            <div className="text-sm text-[var(--ui-text-muted)]">
              Total: {(result.totalDurationMs / 1000).toFixed(1)}s
            </div>
            <div className="space-y-1">
              {result.stepResults.map((sr, i) => (
                <div
                  key={i}
                  className="grid grid-cols-4 gap-2 border-b border-[var(--ui-border)] py-1 text-sm"
                >
                  <div className="font-semibold text-[var(--ui-text-secondary)]">
                    {i + 1}. {stepLabel(sr.type)}
                  </div>
                  <div className="text-[var(--ui-text-muted)]">
                    In: {formatBytes(sr.inputSize)}
                  </div>
                  <div className="text-[var(--ui-text-muted)]">
                    Out: {formatBytes(sr.outputSize)}
                  </div>
                  <div className="text-[var(--ui-text-muted)]">
                    {(sr.durationMs / 1000).toFixed(1)}s
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {result ? (
        <>
          <AuditBadge report={result.auditReport} />
          <ResultDownloadPanel files={[{ url: result.url, name: result.name }]} />
        </>
      ) : null}

      {error ? (
        <Card title="Error" variant="danger">
          <div className="text-[15px] text-red-300">{error}</div>
        </Card>
      ) : null}
    </div>
  );
}

function baseName(name: string): string {
  return name.toLowerCase().endsWith(".pdf") ? name.slice(0, -4) : name;
}
