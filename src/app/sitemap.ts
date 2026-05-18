import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://scientific-quran-ai.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: { path: string; priority: number; freq: "daily" | "weekly" | "monthly" | "yearly" }[] = [
    { path: "/",                 priority: 1.0, freq: "weekly" },
    { path: "/about",            priority: 0.7, freq: "monthly" },
    { path: "/subscribe",        priority: 0.9, freq: "monthly" },
    { path: "/login",            priority: 0.5, freq: "yearly" },
    { path: "/signup",           priority: 0.5, freq: "yearly" },
    { path: "/forgot-password",  priority: 0.3, freq: "yearly" },
    { path: "/privacy",          priority: 0.3, freq: "yearly" },
    { path: "/terms",            priority: 0.3, freq: "yearly" },
  ];

  return pages.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));
}
