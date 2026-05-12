// One-shot converter: reads the per-book hadith JSON files we cloned into
// c:/Users/prant/Desktop/hadith-tmp/Sunnah, and writes one .txt per
// collection into ./data/hadith/. Each hadith becomes a labeled block.

import fs from "node:fs/promises";
import path from "node:path";

const SRC = process.env.HADITH_SRC ?? "C:/Users/prant/Desktop/hadith-tmp/Sunnah";
const DEST = path.resolve("./data/hadith");

const TARGETS = [
  "bukhari",
  "muslim",
  "abudawud",
  "tirmidhi",
  "nasai",
  "ibnmajah",
  "malik",
];

const LABEL = {
  bukhari: "Sahih al-Bukhari",
  muslim: "Sahih Muslim",
  abudawud: "Sunan Abu Dawud",
  tirmidhi: "Jami` at-Tirmidhi",
  nasai: "Sunan an-Nasa'i",
  ibnmajah: "Sunan Ibn Majah",
  malik: "Muwatta Malik",
};

await fs.mkdir(DEST, { recursive: true });

for (const coll of TARGETS) {
  const dir = path.join(SRC, coll);
  let files;
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    console.log(`skip ${coll} — folder not found at ${dir}`);
    continue;
  }
  const out = [];
  let count = 0;
  for (const f of files) {
    const raw = await fs.readFile(path.join(dir, f), "utf8");
    const clean = raw.replace(/^﻿/, ""); // strip BOM
    let arr;
    try {
      arr = JSON.parse(clean);
    } catch (e) {
      console.warn(`  ! parse error in ${coll}/${f}: ${e.message}`);
      continue;
    }
    if (!Array.isArray(arr)) continue;
    for (const h of arr) {
      count++;
      const book = (h.book ?? "").trim();
      const grade = (h.grade ?? "").trim();
      const ref = (h.reference ?? "").trim();
      const arabic = (h.arabic ?? "").trim();
      const english =
        (h.english ?? h.text ?? h.translation ?? h.narration ?? "").trim();

      const parts = [
        `[${LABEL[coll]} — ${book}]`,
        grade ? `Grade: ${grade}` : "",
        ref ? `Reference: ${ref}` : "",
        arabic ? `Arabic: ${arabic}` : "",
        english ? `English: ${english}` : "",
      ].filter(Boolean);
      out.push(parts.join("\n"));
    }
  }
  const outPath = path.join(DEST, `${coll}.txt`);
  await fs.writeFile(outPath, out.join("\n\n---\n\n"), "utf8");
  console.log(`✓ ${coll}: ${count} hadith → ${outPath}`);
}
