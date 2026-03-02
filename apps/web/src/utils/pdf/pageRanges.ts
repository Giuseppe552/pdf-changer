export function parsePageRanges(input: string, pageCount: number): number[][] {
  const cleaned = input.trim();
  if (!cleaned) return [];
  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  const result: number[][] = [];

  for (const part of parts) {
    const range = parseSingle(part, pageCount);
    if (range.length) result.push(range);
  }
  return result;
}

function parseSingle(part: string, pageCount: number): number[] {
  // 1-based user input. Supports "n", "a-b", "a-", "-b".
  const m = part.match(/^(\d+)?\s*-\s*(\d+)?$/);
  if (m) {
    const a = m[1] ? clamp(parseInt(m[1], 10), 1, pageCount) : 1;
    const b = m[2] ? clamp(parseInt(m[2], 10), 1, pageCount) : pageCount;
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    return range(start - 1, end - 1);
  }

  const n = Number(part);
  if (Number.isInteger(n) && n >= 1 && n <= pageCount) {
    return [n - 1];
  }
  return [];
}

function range(a0: number, b0: number): number[] {
  const out: number[] = [];
  for (let i = a0; i <= b0; i++) out.push(i);
  return out;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

