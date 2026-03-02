import React from "react";
import { NavLink } from "react-router-dom";

export function FailureActionsBox() {
  return (
    <div className="space-y-3 text-[15px] text-red-800">
      <div className="text-base font-semibold text-red-900">
        If verification fails: stop immediately
      </div>
      <ul className="list-inside list-disc space-y-1">
        <li>Do not send funds.</li>
        <li>Do not trust copied addresses from social posts or screenshots.</li>
        <li>Reload only from the official domain and verify again.</li>
        <li>
          Check <NavLink className="underline" to="/status">status page</NavLink> for
          key rotation or incident notes.
        </li>
      </ul>
      <div className="text-sm text-red-700">
        Common attacks: fake mirror pages, stale cached pages, altered clipboard
        addresses.
      </div>
    </div>
  );
}
