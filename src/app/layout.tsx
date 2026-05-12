import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Amiri } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  weight: ["400", "700"],
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "Scientific Quran AI — Tafsir & Wisdom",
  description:
    "A scientific, Quran-grounded AI assistant. Answers from the Holy Quran, authentic Hadith, and scholarly tafsir — bilingual (English & Bengali).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover", // respects iOS notch + home-indicator safe areas
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1310" },
  ],
};

// Runs in the browser BEFORE React hydrates — sets data-theme on <html>
// so the very first paint already matches the user's pick. Avoids the
// "light flash then dark" FOUC when reloading in dark mode.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var resolved = (stored === 'dark' || stored === 'light')
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${amiri.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
