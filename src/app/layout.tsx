import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Noto_Sans_Canadian_Aboriginal,
  Noto_Sans_Arabic,
  Noto_Sans_SC,
  Noto_Sans_TC,
} from "next/font/google";
import { siteConfig } from "@/config";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import "./globals.css";

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

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
  },
  formatDetection: {
    telephone: true,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSyllabics.variable} ${notoArabic.variable} ${notoChinese.variable} ${notoChineseTrad.variable} antialiased`}
      >
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
