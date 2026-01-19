"use client";

import Link from "next/link";
import { LanguageSwitcherButton } from "@/components/i18n/LocaleSwitcher";

export function LandingHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-600">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">LocateConnect</span>
        </div>
        <nav className="flex items-center gap-4">
          <LanguageSwitcherButton />
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            Sign In
          </Link>
          <Link href="/cases/new" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700">
            Report Missing Person
          </Link>
        </nav>
      </div>
    </header>
  );
}
