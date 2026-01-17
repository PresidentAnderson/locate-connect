"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AmberAlertForm } from "@/components/alerts/AmberAlertForm";
import type { AmberAlertRequest } from "@/components/alerts/AmberAlertForm";

interface AmberAlertRequestPanelProps {
  caseData: {
    id: string;
    caseNumber: string;
    firstName: string;
    lastName: string;
    age: number;
    gender: string;
    heightCm?: number;
    weightKg?: number;
    hairColor?: string;
    eyeColor?: string;
    distinguishingFeatures?: string;
    clothingLastSeen?: string;
    primaryPhotoUrl?: string;
    lastSeenDate: string;
    lastSeenLocation?: string;
    lastSeenCity?: string;
    lastSeenProvince?: string;
    circumstances?: string;
  };
}

export function AmberAlertRequestPanel({ caseData }: AmberAlertRequestPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (request: AmberAlertRequest) => {
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/amber-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to submit AMBER Alert request");
    }

    setSuccess("AMBER Alert request submitted.");
  };

  const handleCancel = () => {
    router.push("/law-enforcement/amber-alerts");
  };

  return (
    <div className="space-y-4">
      {(error || success) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error || success}
        </div>
      )}
      <AmberAlertForm
        caseData={caseData}
        onSubmit={async (request) => {
          try {
            await handleSubmit(request);
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Failed to submit AMBER Alert request"
            );
          }
        }}
        onCancel={handleCancel}
      />
    </div>
  );
}

export default AmberAlertRequestPanel;
