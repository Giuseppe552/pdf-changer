type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

export async function rateLimit(
  key: string,
  opts: { limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CF Workers caches.default isn't typed
  const cache = (caches as any).default as Cache;
  const cacheKey = new Request(`https://rate-limit.invalid/${encodeURIComponent(key)}`);
  const cached = await cache.match(cacheKey);
  let count = 0;
  if (cached) {
    const raw = await cached.text().catch(() => "0");
    const n = Number(raw);
    count = Number.isFinite(n) ? n : 0;
  }

  count += 1;
  const ttl = Math.max(1, Math.floor(opts.windowSeconds));
  await cache.put(
    cacheKey,
    new Response(String(count), {
      headers: { "Cache-Control": `max-age=${ttl}` },
    }),
  );

  if (count > opts.limit) {
    return { ok: false, retryAfterSeconds: ttl };
  }
  return { ok: true, remaining: Math.max(0, opts.limit - count) };
}

export function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") ?? "unknown";
}
