type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  path?: string;
  maxAgeSeconds?: number;
};

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  const parts = header.split(";").map((p) => p.trim());
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

export function serializeCookie(
  name: string,
  value: string,
  opts: CookieOptions,
): string {
  const segments: string[] = [`${name}=${value}`];
  segments.push(`Path=${opts.path ?? "/"}`);
  if (opts.httpOnly) segments.push("HttpOnly");
  if (opts.secure) segments.push("Secure");
  if (opts.sameSite) segments.push(`SameSite=${opts.sameSite}`);
  if (typeof opts.maxAgeSeconds === "number") {
    segments.push(`Max-Age=${Math.max(0, Math.floor(opts.maxAgeSeconds))}`);
  }
  return segments.join("; ");
}

