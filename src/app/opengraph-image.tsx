import { ImageResponse } from "next/og";

// Node runtime: Satori on the edge runtime silently fails to render
// emoji / Arabic glyphs without a custom font bundle. Node has the
// system PNG renderer and stays inside the function-size budget on
// Vercel's free tier for this small image.
export const runtime = "nodejs";

export const alt = "Scientific Quran AI — Tafsir & Wisdom";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #0d3a32 0%, #0d7b6f 55%, #1a8a73 100%)",
          color: "#f8f5ef",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(255,255,255,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            QA
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              opacity: 0.95,
            }}
          >
            Scientific Quran AI
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 90,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              maxWidth: 980,
            }}
          >
            Tafsir &amp; Wisdom, grounded in source.
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 400,
              opacity: 0.88,
              maxWidth: 960,
              lineHeight: 1.35,
            }}
          >
            Quran-grounded answers from authentic Hadith and scholarly tafsir.
            Bilingual: English &amp; Bengali.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: 0.9,
            fontSize: 24,
            fontWeight: 500,
          }}
        >
          <div style={{ display: "flex", gap: 24 }}>
            <span>Quran</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span>Bukhari</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span>Tafsir</span>
          </div>
          <div style={{ fontSize: 22, opacity: 0.8 }}>
            scientific-quran-ai.vercel.app
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
