import React from "react";
import { Button } from "../../../components/Button";

type Tab = "linux" | "macos" | "windows";

function commandSet(statementPath: string, signaturePath: string, keyPath: string) {
  const statement = statementPath.replace(/^\//, "");
  const signature = signaturePath.replace(/^\//, "");
  const key = keyPath.replace(/^\//, "");
  return {
    linux: [
      `curl -O ${statementPath}`,
      `curl -O ${signaturePath}`,
      `curl -O ${keyPath}`,
      `gpg --import ${key}`,
      `gpg --verify ${signature} ${statement}`,
    ].join("\n"),
    macos: [
      `curl -O ${statementPath}`,
      `curl -O ${signaturePath}`,
      `curl -O ${keyPath}`,
      `gpg --import ${key}`,
      `gpg --verify ${signature} ${statement}`,
    ].join("\n"),
    windows: [
      `curl.exe -O ${statementPath}`,
      `curl.exe -O ${signaturePath}`,
      `curl.exe -O ${keyPath}`,
      `gpg --import ${key}`,
      `gpg --verify ${signature} ${statement}`,
    ].join("\n"),
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
      <div className="flex flex-wrap gap-2">
        {(["linux", "macos", "windows"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={[
              "rounded-sm border px-3 py-2 text-sm font-semibold",
              tab === item
                ? "border-blue-800 bg-blue-800 text-white"
                : "border-neutral-400 bg-white text-neutral-800 hover:bg-neutral-100",
            ].join(" ")}
          >
            {item === "macos" ? "macOS" : item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      <pre className="overflow-x-auto rounded-sm border border-neutral-300 bg-neutral-100 p-3 text-sm text-neutral-900">
{current}
      </pre>
      <Button
        variant="secondary"
        size="md"
        onClick={() => navigator.clipboard.writeText(current)}
      >
        Copy {tab === "macos" ? "macOS" : tab} commands
      </Button>
      <div className="text-sm text-neutral-600">
        Offline-friendly flow: download files first, disable network, then run
        the verify command locally.
      </div>
    </div>
  );
}
