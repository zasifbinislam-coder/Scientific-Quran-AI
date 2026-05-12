/**
 * Ingestion pipeline for the Scientific Quran AI knowledge base.
 *
 * Walks ./data, reads .txt / .md / .pdf / .json files, chunks them,
 * embeds with OpenAI text-embedding-3-small, and upserts into a
 * Supabase pgvector `documents` table.
 *
 * Layout:
 *   data/quran/*       → kind: "quran"
 *   data/hadith/*      → kind: "hadith"
 *   data/tafsir/*      → kind: "tafsir"
 *   data/bible/*       → kind: "bible" (comparative-only)
 *   data/*.{txt,md,pdf} (root) → kind: "document"
 *
 * Run:  npm run ingest -- [--reset] [--only quran|hadith|tafsir|bible]
 */

import { config } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";

// Load .env.local first (Next.js convention), then fall back to .env.
config({ path: ".env.local" });
config({ path: ".env" });
import { createClient } from "@supabase/supabase-js";
import { embedBatch } from "../src/lib/embeddings";

type Kind = "quran" | "hadith" | "tafsir" | "bible" | "document";

type Chunk = {
  content: string;
  source: string;
  kind: Kind;
  chunkIndex: number;
  metadata: Record<string, unknown>;
};

const DATA_DIR = path.resolve(process.cwd(), "data");
const LOG_DIR = path.resolve(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "ingest-progress.log");
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 180;
const EMBED_BATCH = Number(process.env.EMBED_BATCH ?? 50);
// 1024-dim vectors are ~4KB each. With HNSW index updates, large inserts can
// hit Supabase's 8s statement timeout. 50 rows / call stays safely under it.
const INSERT_BATCH = Number(process.env.INSERT_BATCH ?? 50);
// Gemini free tier: 100 RPM on gemini-embedding-001. Sleep ~700ms between
// batches → ~85 RPM, leaving headroom for retries.
const EMBED_DELAY_MS = Number(process.env.EMBED_DELAY_MS ?? 700);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function logLine(line: string) {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(LOG_FILE, line + "\n");
  } catch {
    /* logging is best-effort */
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const onlyIdx = args.indexOf("--only");
  const only =
    onlyIdx >= 0 && onlyIdx + 1 < args.length
      ? (args[onlyIdx + 1] as Kind)
      : null;
  const fileIdx = args.indexOf("--file");
  const file =
    fileIdx >= 0 && fileIdx + 1 < args.length ? args[fileIdx + 1] : null;
  return { reset, only, file };
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(p)));
    } else if (e.isFile()) {
      out.push(p);
    }
  }
  return out;
}

function inferKind(filePath: string): Kind {
  const rel = path.relative(DATA_DIR, filePath).replace(/\\/g, "/");
  const top = rel.split("/")[0]?.toLowerCase();
  if (top === "quran") return "quran";
  if (top === "hadith") return "hadith";
  if (top === "tafsir") return "tafsir";
  if (top === "bible") return "bible";
  return "document";
}

async function readFileAsText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    const buf = await fs.readFile(filePath);
    // pdf-parse v2 exports a class: `new PDFParse({data}).getText()`.
    const { PDFParse } = (await import("pdf-parse")) as unknown as {
      PDFParse: new (opts: { data: Buffer | Uint8Array }) => {
        getText(): Promise<{ text: string }>;
        destroy(): Promise<void>;
      };
    };
    const parser = new PDFParse({ data: buf });
    try {
      const result = await parser.getText();
      return result.text ?? "";
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }
  if (ext === ".json") {
    const raw = await fs.readFile(filePath, "utf8");
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  }
  // .txt, .md, anything else: treat as utf-8 text.
  return fs.readFile(filePath, "utf8");
}

/**
 * Recursive character splitter. Tries separators in order:
 *   "\n\n" (paragraphs) → "\n" (lines, e.g. verse-per-line) → " " (words)
 *   → hard char split as last resort.
 * Then packs the resulting atoms into chunks of `size` chars with overlap.
 */
function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (cleaned.length === 0) return [];
  if (cleaned.length <= size) return [cleaned];

  const atoms = splitRecursive(cleaned, ["\n\n", "\n", " "], size);
  return packAtoms(atoms, size, overlap);
}

function splitRecursive(text: string, seps: string[], size: number): string[] {
  if (text.length <= size) return [text];
  if (seps.length === 0) {
    // hard char split as a last resort
    const out: string[] = [];
    for (let i = 0; i < text.length; i += size) {
      out.push(text.slice(i, i + size));
    }
    return out;
  }
  const [sep, ...rest] = seps;
  const parts = text.split(sep);
  const out: string[] = [];
  for (const part of parts) {
    if (part.length <= size) {
      out.push(part);
    } else {
      out.push(...splitRecursive(part, rest, size));
    }
  }
  return out;
}

function packAtoms(atoms: string[], size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let buffer = "";
  const joiner = "\n";

  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed.length > 0) chunks.push(trimmed);
    buffer = "";
  };

  for (const atom of atoms) {
    if (atom.length === 0) continue;
    const candidate = buffer ? `${buffer}${joiner}${atom}` : atom;
    if (candidate.length <= size) {
      buffer = candidate;
      continue;
    }
    flush();
    buffer = atom.length <= size ? atom : atom.slice(0, size);
  }
  flush();

  // Stitch tail of previous chunk onto head of next for recall overlap.
  if (overlap <= 0 || chunks.length <= 1) return chunks;
  const withOverlap: string[] = [chunks[0]];
  for (let i = 1; i < chunks.length; i++) {
    const prevTail = chunks[i - 1].slice(-overlap);
    withOverlap.push(`${prevTail}\n${chunks[i]}`.trim());
  }
  return withOverlap;
}

async function buildChunks(
  only: Kind | null,
  fileFilter: string | null
): Promise<Chunk[]> {
  const files = await walk(DATA_DIR);
  const chunks: Chunk[] = [];
  for (const filePath of files) {
    const kind = inferKind(filePath);
    if (only && kind !== only) continue;
    if (fileFilter) {
      const rel = path.relative(DATA_DIR, filePath).replace(/\\/g, "/");
      if (!rel.includes(fileFilter)) continue;
    }
    const rel = path.relative(DATA_DIR, filePath).replace(/\\/g, "/");
    let text: string;
    try {
      text = await readFileAsText(filePath);
    } catch (err) {
      console.warn(`  ⚠  skipped ${rel}: ${(err as Error).message}`);
      continue;
    }
    if (!text.trim()) continue;
    const split = chunkText(text);
    split.forEach((content, idx) => {
      chunks.push({
        content,
        source: rel,
        kind,
        chunkIndex: idx,
        metadata: { kind, source: rel, chunkIndex: idx },
      });
    });
    console.log(`  •  ${rel} → ${split.length} chunks (${kind})`);
  }
  return chunks;
}

async function main() {
  const { reset, only, file } = parseArgs();

  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const embProvider = (process.env.EMBEDDING_PROVIDER ?? "google").toLowerCase();
  if (embProvider === "openai") {
    requireEnv("OPENAI_API_KEY");
  } else {
    requireEnv("GOOGLE_GENERATIVE_AI_API_KEY");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  try {
    await fs.access(DATA_DIR);
  } catch {
    console.error(
      `data/ directory not found at ${DATA_DIR}. Create it and place your sources inside (quran/, hadith/, tafsir/, bible/).`
    );
    process.exit(1);
  }

  if (reset) {
    console.log("⟳  --reset: wiping existing documents…");
    const { error } = await supabase.from("documents").delete().neq("id", -1);
    if (error) {
      console.error("Failed to reset:", error.message);
      process.exit(1);
    }
  }

  console.log(
    `📚 Reading sources from ${DATA_DIR}${only ? ` (only ${only})` : ""}${
      file ? ` (file filter: "${file}")` : ""
    }…`
  );
  const chunks = await buildChunks(only, file);
  if (chunks.length === 0) {
    console.log("Nothing to ingest. Add files to data/ and rerun.");
    return;
  }
  console.log(`📦 Total chunks: ${chunks.length}`);

  // Sanity check: probe the embedding pipeline once and verify dims match
  // what the Supabase schema expects, before embedding thousands of chunks.
  const probeVecs = await embedBatch(["__dim_probe__"]);
  const observedDims = probeVecs[0]?.length ?? 0;
  const expectedDims = Number(process.env.EMBEDDING_DIMS ?? 1024);
  console.log(
    `🔍 Embedding model returns ${observedDims} dims (expected ${expectedDims})`
  );
  if (observedDims !== expectedDims) {
    console.error(
      `❌ Dim mismatch! Model returns ${observedDims}, but EMBEDDING_DIMS=${expectedDims}. ` +
        `Check CLOUDFLARE_EMBEDDING_MODEL / EMBEDDING_DIMS in .env.local.`
    );
    process.exit(1);
  }

  console.log(
    `🧠 Generating embeddings… (batch=${EMBED_BATCH}, delay=${EMBED_DELAY_MS}ms)`
  );
  await logLine(
    `[${new Date().toISOString().slice(11, 19)}] START embeddings  total=${chunks.length}  batch=${EMBED_BATCH}`
  );
  const embeddings: number[][] = [];
  const t0 = Date.now();
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH).map((c) => c.content);
    let attempts = 0;
    while (true) {
      try {
        const out = await embedBatch(batch);
        embeddings.push(...out);
        break;
      } catch (err) {
        attempts++;
        const msg = (err as Error).message ?? String(err);
        const is429 = msg.includes("429") || msg.toLowerCase().includes("quota");
        if (attempts >= 5) {
          console.error(
            `\n❌ Embedding batch failed after ${attempts} attempts: ${msg}`
          );
          await logLine(`ERROR after 5 attempts: ${msg}`);
          throw err;
        }
        const wait = is429 ? 30_000 * attempts : 3_000 * attempts;
        process.stdout.write(
          `\n   ⚠ ${is429 ? "rate limited" : "error"}, retry ${attempts}/5 in ${wait}ms\n`
        );
        await sleep(wait);
      }
    }
    const done = Math.min(i + EMBED_BATCH, chunks.length);
    const elapsed = (Date.now() - t0) / 1000;
    const rate = done / elapsed;
    const eta = Math.max(0, (chunks.length - done) / rate);
    const pct = ((done / chunks.length) * 100).toFixed(1);
    const status = `${done}/${chunks.length} (${pct}%) ${rate.toFixed(
      1
    )}/s eta ${Math.round(eta)}s`;
    process.stdout.write(`    ${status}        \r`);
    // Log every batch; small line appends are cheap and give Sir a smooth tail.
    void logLine(`[${new Date().toISOString().slice(11, 19)}] embed ${status}`);
    if (done < chunks.length && EMBED_DELAY_MS > 0) await sleep(EMBED_DELAY_MS);
  }
  process.stdout.write("\n");
  await logLine(
    `[${new Date().toISOString().slice(11, 19)}] DONE embeddings  total=${chunks.length}`
  );

  console.log("💾 Upserting into Supabase…");
  await logLine(
    `[${new Date().toISOString().slice(11, 19)}] START upsert    total=${chunks.length}`
  );
  for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
    const slice = chunks.slice(i, i + INSERT_BATCH);
    const embSlice = embeddings.slice(i, i + INSERT_BATCH);
    const rows = slice.map((c, j) => ({
      content: c.content,
      source: c.source,
      metadata: c.metadata,
      embedding: embSlice[j],
    }));
    // Retry-with-backoff on Supabase timeout — happens occasionally under
    // HNSW indexing load on large 1024-dim batches.
    let attempts = 0;
    while (true) {
      const { error } = await supabase.from("documents").insert(rows);
      if (!error) break;
      attempts++;
      const transient =
        error.message?.includes("timeout") ||
        error.message?.includes("canceling statement");
      if (attempts >= 5 || !transient) {
        console.error(`Insert error at batch ${i}: ${error.message}`);
        await logLine(`ERROR insert batch ${i}: ${error.message}`);
        process.exit(1);
      }
      const wait = 2000 * attempts;
      process.stdout.write(
        `\n   ⚠ supabase timeout, retry ${attempts}/5 in ${wait}ms\n`
      );
      await sleep(wait);
    }
    const done = Math.min(i + INSERT_BATCH, chunks.length);
    process.stdout.write(`    ${done}/${chunks.length}\r`);
    void logLine(
      `[${new Date().toISOString().slice(11, 19)}] upsert ${done}/${chunks.length}`
    );
  }
  process.stdout.write("\n");
  await logLine(
    `[${new Date().toISOString().slice(11, 19)}] DONE upsert     total=${chunks.length}`
  );

  console.log(`✅ Ingested ${chunks.length} chunks.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
