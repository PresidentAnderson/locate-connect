"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AmberAlertsPage() {
  const router = useRouter();
  const [caseId, setCaseId] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!caseId.trim()) return;
    router.push(`/law-enforcement/amber-alerts/${caseId.trim()}`);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AMBER Alert Requests</h1>
        <p className="mt-1 text-sm text-gray-500">
          Start a new AMBER Alert request for an active case.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-6 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Case ID
          </label>
          <input
            type="text"
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
            placeholder="Case UUID"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Use the case UUID from the case record to prefill the alert details.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          Start AMBER Alert
        </button>
      </form>
    </div>
  );
}
