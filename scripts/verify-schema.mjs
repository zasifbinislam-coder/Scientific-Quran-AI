// Quick verification: confirm Supabase `documents.embedding` is VECTOR(768).
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// Round-trip a tiny 768-dim vector. If the schema is wrong size or missing,
// the insert errors out with a clear message.
const probe = new Array(768).fill(0).map((_, i) => Math.sin(i) * 0.01);
const { data, error } = await supabase
  .from("documents")
  .insert({
    content: "__schema_probe__",
    source: "__probe__",
    metadata: { kind: "probe" },
    embedding: probe,
  })
  .select("id")
  .single();

if (error) {
  console.error("✗ schema check FAILED:", error.message);
  if (error.message.includes("dimensions") || error.message.includes("vector")) {
    console.error("  → Supabase is NOT at VECTOR(768). Re-run scripts/sql/init.sql.");
  } else if (error.message.includes("does not exist")) {
    console.error("  → Table 'documents' missing. Run scripts/sql/init.sql.");
  }
  process.exit(1);
}

// Clean up the probe row.
await supabase.from("documents").delete().eq("id", data.id);
console.log("✓ documents table exists and accepts 768-dim embeddings.");
