import type { Metadata } from "next";
import { siteConfig } from "@/config";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import "./globals.css";

// NOTE: Google Fonts are temporarily disabled due to network restrictions during build
// The application will use system fonts defined in globals.css with comprehensive fallback chains
// These include:
// - System fonts for Latin scripts (English, French, Spanish)
// - "Noto Sans Canadian Aboriginal", "Euphemia UCAS" for Indigenous syllabics
// - "Segoe UI", "Tahoma" for Arabic
// - "PingFang SC", "Microsoft YaHei" for Simplified Chinese
// - "PingFang TC", "Microsoft JhengHei" for Traditional Chinese
// - "Raavi" for Punjabi
//
// When network access is available, uncomment the following imports:
/*
import {
  Geist,
  Geist_Mono,
  Noto_Sans_Canadian_Aboriginal,
  Noto_Sans_Arabic,
  Noto_Sans_SC,
  Noto_Sans_TC,
} from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Indigenous languages font (Canadian Aboriginal Syllabics)
const notoSyllabics = Noto_Sans_Canadian_Aboriginal({
  variable: "--font-syllabics",
  subsets: ["canadian-aboriginal", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Arabic font for RTL support
const notoArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Simplified Chinese font (Mandarin)
const notoChinese = Noto_Sans_SC({
  variable: "--font-chinese-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Traditional Chinese font (Cantonese)
const notoChineseTrad = Noto_Sans_TC({
  variable: "--font-chinese-tc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
*/

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

// Viewport configuration (moved from metadata per Next.js 16+ requirements)
// Allows users to zoom for accessibility (WCAG compliance)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3b82f6",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className="ltr" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content={siteConfig.name} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={siteConfig.name} />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="mask-icon" href="/favicon.svg" color="#3b82f6" />
      </head>
      <body className="antialiased">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
