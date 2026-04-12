// NER-based PII detection using a BERT model running in the browser.
// Model: Xenova/bert-base-NER (110M params, quantized ONNX, ~65MB)
// Downloads on first use, then cached via Transformers.js's Cache API.
// Detects: PER (person names), ORG (organizations), LOC (locations), MISC

type NerEntity = {
  entity_group: string; // "PER", "ORG", "LOC", "MISC"
  score: number;
  word: string;
  start: number; // character offset in input text
  end: number;
};

// Singleton pipeline — loads once, reused across calls
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedPipeline: any = null;
let loading: Promise<unknown> | null = null;

export async function loadNerModel(
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (cachedPipeline) return;
  if (loading) {
    await loading;
    return;
  }

  loading = (async () => {
    const { pipeline, env } = await import("@huggingface/transformers");
    // Disable local model check — always fetch from HF hub
    env.allowLocalModels = false;

    cachedPipeline = await pipeline(
      "token-classification",
      "Xenova/bert-base-NER",
      {
        dtype: "q8",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (p: any) => {
          if (typeof p?.progress === "number" && onProgress) {
            onProgress(Math.round(p.progress));
          }
        },
      },
    );
  })();

  await loading;
  loading = null;
}

export function isNerModelLoaded(): boolean {
  return cachedPipeline !== null;
}

export async function runNer(text: string): Promise<NerEntity[]> {
  if (!cachedPipeline) {
    throw new Error("NER model not loaded. Call loadNerModel() first.");
  }

  // Split long text into chunks — BERT has a 512 token limit (~400 words)
  const chunks = splitIntoChunks(text, 1500); // ~1500 chars ≈ 300 words
  const results: NerEntity[] = [];
  let offset = 0;

  for (const chunk of chunks) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entities: any[] = await cachedPipeline(chunk, {
      aggregation_strategy: "simple", // merge subword tokens
    });

    for (const e of entities) {
      // Skip low-confidence detections
      if (e.score < 0.7) continue;
      results.push({
        entity_group: e.entity_group,
        score: e.score,
        word: e.word,
        start: e.start + offset,
        end: e.end + offset,
      });
    }

    offset += chunk.length;
  }

  return results;
}

// Split text into overlapping chunks at sentence boundaries.
// BERT tokenizer has a 512 token limit; ~1500 chars is a safe upper bound.
function splitIntoChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let pos = 0;

  while (pos < text.length) {
    let end = Math.min(pos + maxLen, text.length);

    // Try to break at a sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(". ", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > pos + maxLen * 0.5) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(pos, end));
    pos = end;
  }

  return chunks;
}
