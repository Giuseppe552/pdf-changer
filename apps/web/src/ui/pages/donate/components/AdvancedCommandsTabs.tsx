import React from "react";
import { Button } from "../../../components/Button";

type Tab = "linux" | "macos" | "windows";

const GITHUB_RAW = "https://raw.githubusercontent.com/Giuseppe552/pdf-changer-proofs/main";
const SITE_BASE = "https://pdfchanger.org";

function commandSet(statementPath: string, signaturePath: string, keyPath: string) {
  const statement = statementPath.replace(/^\//, "");
  const signature = signaturePath.replace(/^\//, "");
  const key = keyPath.replace(/^\//, "");

  const githubStatement = `${GITHUB_RAW}/v1/addresses.txt`;
  const githubSignature = `${GITHUB_RAW}/v1/addresses.txt.asc`;
  const githubKey = `${GITHUB_RAW}/v1/signing-key.asc`;

  const curl = (os: "unix" | "win") => (os === "win" ? "curl.exe" : "curl");

  function build(os: "unix" | "win") {
    const c = curl(os);
    return [
      `# Step 1: Download from the website`,
      `${c} -sO ${SITE_BASE}/${statement}`,
      `${c} -sO ${SITE_BASE}/${signature}`,
      `${c} -sO ${SITE_BASE}/${key}`,
      ``,
      `# Step 2: Download from GitHub (independent channel)`,
      `${c} -sL ${githubStatement} -o github-addresses.txt`,
      `${c} -sL ${githubSignature} -o github-addresses.txt.asc`,
      ``,
      `# Step 3: Compare — must be identical`,
      `diff ${statement} github-addresses.txt`,
      `# If diff shows ANY output, STOP. Do not donate.`,
      ``,
      `# Step 4: Import key and verify PGP signature`,
      `gpg --import ${key}`,
      `gpg --verify ${signature} ${statement}`,
    ].join("\n");
  }

  return {
    linux: build("unix"),
    macos: build("unix"),
    windows: build("win"),
  } as const;
}

export function AdvancedCommandsTabs({
  statementPath,
  signaturePath,
  keyPath,
}: {
  statementPath: string;
  signaturePath: string;
  keyPath: string;
}) {
  const [tab, setTab] = React.useState<Tab>("linux");
  const commands = React.useMemo(
    () => commandSet(statementPath, signaturePath, keyPath),
    [keyPath, signaturePath, statementPath],
  );
  const current = commands[tab];

  return (
    <div className="space-y-3">
      {/* Explainer */}
      <div className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
        This downloads the proof files from <strong>two independent sources</strong> (the website
        and{" "}
        <a
          href="https://github.com/Giuseppe552/pdf-changer-proofs"
          target="_blank"
          rel="noreferrer"
          className="underline text-[var(--ui-accent)] hover:text-[var(--ui-accent-hover)]"
        >
          GitHub
        </a>
        ), compares them, then verifies the PGP signature. If the website were compromised,
        the GitHub copy would need to be independently compromised too.
      </div>

      {/* OS tabs */}
      <div className="flex flex-wrap gap-1.5">
        {(["linux", "macos", "windows"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={[
              "rounded-md px-2.5 py-1.5 text-xs font-medium mono transition",
              tab === item
                ? "bg-[var(--ui-accent)]/10 text-[var(--ui-accent)]"
                : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-overlay)]",
            ].join(" ")}
          >
            {item === "macos" ? "macOS" : item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {/* Commands */}
      <pre className="overflow-x-auto rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4 text-xs mono text-[var(--ui-text-secondary)] leading-relaxed">
{current}
      </pre>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigator.clipboard.writeText(current)}
        >
          Copy commands
        </Button>
        <span className="text-[10px] mono text-[var(--ui-text-muted)]">
          Offline-friendly: download first, disconnect, then verify locally.
        </span>
      </div>
    </div>
  );
}
