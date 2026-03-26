"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/hooks/useTranslations";

const mainNav = [
  { key: "nav.dashboard", href: "/cases" },
  { key: "nav.newReport", href: "/cases/new" },
  { key: "nav.leads", href: "/leads" },
];

const sections = [
  {
    titleKey: "sections.analyticsReports",
    items: [
      { key: "nav.executiveDashboard", href: "/dashboards/executive" },
      { key: "nav.stakeholderReports", href: "/dashboards/reports" },
      { key: "nav.systemHealth", href: "/dashboards/system-health" },
    ],
  },
  {
    titleKey: "sections.lawEnforcement",
    items: [
      { key: "nav.leDashboard", href: "/law-enforcement" },
      { key: "nav.amberAlerts", href: "/law-enforcement/amber-alerts" },
    ],
  },
  {
    titleKey: "sections.coldCases",
    items: [
      { key: "nav.coldCases", href: "/cold-cases" },
    ],
  },
  {
    titleKey: "sections.familySupport",
    items: [
      { key: "nav.familySupport", href: "/family-support" },
    ],
  },
];

export function MobileSidebarToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("common");

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close on escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setIsOpen(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  return (
    <>
      {/* Hamburger button - visible only below lg */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        aria-label="Open navigation menu"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-900/50"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Sidebar panel */}
          <nav className="fixed inset-y-0 left-0 z-[61] w-72 overflow-y-auto bg-white shadow-xl" aria-label="Mobile navigation">
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-600 to-teal-600" aria-hidden="true" />
                <span className="text-lg font-semibold">
                  <span className="text-cyan-600">Locate</span>
                  <span className="text-teal-600">Connect</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                aria-label="Close navigation menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation links */}
            <div className="px-3 py-4 space-y-6">
              {/* Main nav */}
              <div className="space-y-1">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {t("sections.cases")}
                </p>
                {mainNav.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-cyan-50 text-cyan-700"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {t(item.key)}
                  </Link>
                ))}
              </div>

              {/* Other sections */}
              {sections.map((section) => (
                <div key={section.titleKey} className="space-y-1">
                  <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t(section.titleKey)}
                  </p>
                  {section.items.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={cn(
                        "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        pathname === item.href || pathname.startsWith(item.href + "/")
                          ? "bg-cyan-50 text-cyan-700"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      {t(item.key)}
                    </Link>
                  ))}
                </div>
              ))}

              {/* Settings link */}
              <div className="border-t border-gray-200 pt-4">
                <Link
                  href="/settings"
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/settings")
                      ? "bg-cyan-50 text-cyan-700"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  Settings
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
