import { ImageResponse } from "next/og";

export const runtime = "edge";

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
          padding: "64px 72px",
          background:
            "linear-gradient(135deg, #0d3a32 0%, #0d7b6f 55%, #1a8a73 100%)",
          color: "#f8f5ef",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              fontSize: 36,
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            📖
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              opacity: 0.95,
            }}
          >
            Scientific Quran AI
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              maxWidth: 980,
            }}
          >
            Tafsir & Wisdom, grounded in source.
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 400,
              opacity: 0.85,
              maxWidth: 920,
              lineHeight: 1.35,
            }}
          >
            Quran-grounded answers from authentic Hadith and scholarly tafsir.
            English & বাংলা.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: 0.85,
            fontSize: 22,
          }}
        >
          <div style={{ display: "flex", gap: 18 }}>
            <span>· Quran</span>
            <span>· Bukhari</span>
            <span>· Tafsir</span>
          </div>
          <div style={{ fontFamily: "serif", fontSize: 30, letterSpacing: "0.04em" }}>
            بسم الله الرحمن الرحيم
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
