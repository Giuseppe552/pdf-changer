import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { PdfDropZone } from "../../components/PdfDropZone";
import {
  analyzeFormPdf,
  fillFormPdf,
  type FormFieldInfo,
} from "../../../utils/pdf/operations/fillFormPdf";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { processAudited } from "../../../utils/vpe/processAudited";
import type { AuditReport } from "../../../utils/vpe/types";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";
import { AuditBadge } from "../../components/vpe/AuditBadge";

type Phase = "upload" | "fill" | "done";

export function FillFormToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [phase, setPhase] = React.useState<Phase>("upload");
  const [fields, setFields] = React.useState<FormFieldInfo[]>([]);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [flattenAfterFill, setFlattenAfterFill] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [out, setOut] = React.useState<{ url: string; name: string } | null>(null);
  const [filledCount, setFilledCount] = React.useState(0);
  const [auditReport, setAuditReport] = React.useState<AuditReport | null>(null);

  React.useEffect(
    () => () => {
      if (out?.url) URL.revokeObjectURL(out.url);
    },
    [out],
  );

  async function loadFields() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const result = await analyzeFormPdf({ inputBytes });
      if (result.fields.length === 0) {
        throw new Error("No interactive form fields found in this PDF.");
      }
      setFields(result.fields);
      const initial: Record<string, string> = {};
      for (const f of result.fields) {
        initial[f.name] = f.currentValue;
      }
      setValues(initial);
      setPhase("fill");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Failed to load form");
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setOut(null);
    try {
      if (!canUseTool(me, "fill-form")) {
        throw new Error("Monthly quota reached for this tool.");
      }
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const { outputBytes, toolReport, auditReport: report } = await processAudited({
        toolName: "fill-form",
        inputBytes,
        processFn: async (bytes) => fillFormPdf({ inputBytes: bytes, values, flattenAfterFill }),
      });
      const blob = new Blob([toArrayBuffer(outputBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      incrementToolUse(me, "fill-form");
      setOut({ url, name: `${baseName(file.name)}.filled.pdf` });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool report shape
      setFilledCount((toolReport as any).filledCount);
      setAuditReport(report);
      setPhase("done");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Fill failed");
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setPhase("upload");
    setFile(null);
    setFields([]);
    setValues({});
    setError(null);
    setOut(null);
    setFilledCount(0);
  }

  function updateValue(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  const inputCls =
    "w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)]";

  return (
    <div className="space-y-4">
      {phase === "upload" ? (
        <Card title="Fill PDF Forms">
          <div className="space-y-4">
            <PdfDropZone
              label="Choose a PDF with form fields"
              help="Detect and fill interactive PDF form fields locally."
              files={file ? [file] : []}
              onFiles={(files) => setFile(files[0] ?? null)}
              disabled={busy}
            />
            <Button onClick={loadFields} disabled={!file || busy}>
              {busy ? "Analyzing…" : "Load form fields"}
            </Button>
          </div>
        </Card>
      ) : null}

      {phase === "fill" ? (
        <>
          <Card title={`${fields.length} form field(s) detected`}>
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.name} className="space-y-1">
                  <div className="text-sm font-medium text-[var(--ui-text-secondary)]">{field.name}</div>
                  {field.type === "text" ? (
                    <input
                      type="text"
                      value={values[field.name] ?? ""}
                      onChange={(e) => updateValue(field.name, e.target.value)}
                      className={inputCls}
                      disabled={busy}
                    />
                  ) : field.type === "checkbox" ? (
                    <label className="flex items-center gap-2 text-sm text-[var(--ui-text-secondary)]">
                      <input
                        type="checkbox"
                        checked={values[field.name] === "true"}
                        onChange={(e) =>
                          updateValue(field.name, e.target.checked ? "true" : "false")
                        }
                        disabled={busy}
                      />
                      Checked
                    </label>
                  ) : field.type === "dropdown" ? (
                    <select
                      value={values[field.name] ?? ""}
                      onChange={(e) => updateValue(field.name, e.target.value)}
                      className={inputCls}
                      disabled={busy}
                    >
                      <option value="">— Select —</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "radio" ? (
                    <fieldset className="flex flex-wrap gap-3">
                      {field.options?.map((opt) => (
                        <label key={opt} className="flex items-center gap-1 text-sm text-[var(--ui-text-secondary)]">
                          <input
                            type="radio"
                            name={field.name}
                            value={opt}
                            checked={values[field.name] === opt}
                            onChange={(e) => updateValue(field.name, e.target.value)}
                            disabled={busy}
                          />
                          {opt}
                        </label>
                      ))}
                    </fieldset>
                  ) : (
                    <div className="text-sm text-[var(--ui-text-muted)]">Unsupported field type</div>
                  )}
                </div>
              ))}

              <label className="flex items-center gap-2 text-sm text-[var(--ui-text-secondary)]">
                <input
                  type="checkbox"
                  checked={flattenAfterFill}
                  onChange={(e) => setFlattenAfterFill(e.target.checked)}
                  disabled={busy}
                />
                Flatten form after filling (removes editability)
              </label>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button onClick={run} disabled={busy}>
              {busy ? "Filling…" : "Fill and download"}
            </Button>
            <Button variant="secondary" onClick={startOver} disabled={busy}>
              Start over
            </Button>
          </div>
        </>
      ) : null}

      {phase === "done" ? (
        <>
          <Card title="Form fill report">
            <div className="text-[15px] text-[var(--ui-text-secondary)]">
              Filled {filledCount} field(s).
              {flattenAfterFill ? " Form was flattened." : ""}
            </div>
          </Card>
          {auditReport ? <AuditBadge report={auditReport} /> : null}
          {out ? <ResultDownloadPanel files={[out]} /> : null}
          <Button variant="secondary" onClick={startOver}>
            Start over
          </Button>
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
