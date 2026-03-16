import React from "react";

export function LimitationsBox({
  headingId = "what-this-does-not-protect",
}: {
  headingId?: string;
}) {
  return (
    <div className="rounded-sm border border-red-400 bg-red-950/30 p-4">
      <div className="text-base font-semibold text-red-700">Limits matter</div>
      <p className="mt-2 text-[15px] text-red-700">
        No tool guarantees anonymity. Treat controls as layers and review the{" "}
        <a className="underline" href={`#${headingId}`}>
          “What this does not protect”
        </a>{" "}
        section before acting.
      </p>
    </div>
  );
}
