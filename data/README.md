# Knowledge base sources

Drop your raw text / PDF / Markdown source material into this folder. The
`npm run ingest` script walks every subfolder, chunks the content, embeds
each chunk with OpenAI `text-embedding-3-small`, and upserts the result
into the Supabase `documents` table.

## Recommended layout

```
data/
├── quran/        # Quran translations & Arabic text (kind: "quran")
├── hadith/       # Authentic hadith collections (kind: "hadith")
├── tafsir/       # Zakaria Kamal & other scientific tafsir (kind: "tafsir")
└── bible/        # Comparative-only Biblical text  (kind: "bible")
```

Any file placed at the root of `data/` is ingested with `kind: "document"`.

## Supported formats

- `.txt` / `.md` — read as UTF-8 text
- `.pdf` — extracted with `pdf-parse`
- `.json` — pretty-printed and indexed as raw text

## Re-ingesting

- `npm run ingest` — incremental insert (chunks are not deduped; rerunning
  appends. Use `--reset` to wipe first).
- `npm run ingest -- --reset` — clears the `documents` table, then ingests.
- `npm run ingest -- --only tafsir` — ingests one subfolder.

## Important

The Bible is treated as **comparative knowledge only**. The system prompt
forbids using it as a source of theological rulings — that authority
belongs to the Quran and authentic Hadith.
