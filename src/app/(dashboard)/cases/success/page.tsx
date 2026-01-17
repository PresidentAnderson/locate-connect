"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@/hooks/useTranslations";

export default function CaseSuccessPage() {
  const t = useTranslations("intake");
  const searchParams = useSearchParams();
  const caseNumber = searchParams.get("case");

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-xl border border-gray-200 bg-white p-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
          {t("success.kicker")}
        </p>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("success.title")}
        </h1>
        <p className="text-sm text-gray-600">{t("success.subtitle")}</p>
      </div>

      {caseNumber && (
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3">
          <p className="text-sm text-cyan-900">
            <span className="font-medium">{t("success.caseLabel")}</span>{" "}
            <span className="font-mono">{caseNumber}</span>
          </p>
        </div>
      )}

      <div className="space-y-3 text-sm text-gray-600">
        <p>{t("success.nextStepsTitle")}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("success.nextSteps.first")}</li>
          <li>{t("success.nextSteps.second")}</li>
          <li>{t("success.nextSteps.third")}</li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/cases"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          {t("success.backToCases")}
        </Link>
        <Link
          href="/cases/new"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t("success.newReport")}
        </Link>
      </div>
    </div>
  );
}
