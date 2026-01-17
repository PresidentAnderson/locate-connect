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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className="ltr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSyllabics.variable} ${notoArabic.variable} ${notoChinese.variable} ${notoChineseTrad.variable} antialiased`}
      >
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
