import React from "react";
import { api } from "../../utils/api";
import { Button } from "./Button";

export function NewsletterSignup({
  noteAlign = "left",
}: {
  noteAlign?: "left" | "right";
}) {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setStatus("loading");
    try {
      await api.newsletterSubscribe(value);
      setEmail("");
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 md:items-center">
      <form onSubmit={subscribe} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          inputMode="email"
          placeholder="Email for product updates (optional)"
          className="ui-input"
          autoComplete="email"
        />
        <Button
          type="submit"
          disabled={status === "loading" || email.trim().length < 3}
        >
          {status === "loading" ? "Subscribing…" : "Subscribe"}
        </Button>
      </form>
      <div
        className={[
          "text-sm text-[var(--ui-text-muted)]",
          noteAlign === "right" ? "md:text-right" : "",
        ].join(" ")}
      >
        {status === "ok"
          ? "Subscribed. You can unsubscribe any time."
          : status === "error"
            ? "Could not subscribe right now."
            : "We only use this to send product updates. No marketing pixels."}
      </div>
    </div>
  );
}
