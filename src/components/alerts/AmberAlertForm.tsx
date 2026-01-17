"use client";

import { useState } from "react";

export type AmberAlertStatus = "draft" | "pending_approval" | "submitted" | "active" | "expired" | "cancelled";

export interface AmberAlertRequest {
  id?: string;
  caseId: string;
  caseNumber: string;
  status: AmberAlertStatus;

  // Child Information (pre-populated from case)
  childFirstName: string;
  childLastName: string;
  childAge: number;
  childGender: string;
  childHeight?: string;
  childWeight?: string;
  childHairColor?: string;
  childEyeColor?: string;
  childDistinguishingFeatures?: string;
  childClothingDescription?: string;
  childPhotoUrl?: string;

  // Abduction Details
  abductionDate: string;
  abductionTime?: string;
  abductionLocation: string;
  abductionCity: string;
  abductionProvince: string;
  circumstances: string;

  // Suspect Information
  suspectKnown: boolean;
  suspectFirstName?: string;
  suspectLastName?: string;
  suspectAge?: number;
  suspectGender?: string;
  suspectDescription?: string;
  suspectRelationship?: string;
  suspectPhotoUrl?: string;

  // Vehicle Information
  vehicleInvolved: boolean;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleColor?: string;
  vehicleLicensePlate?: string;
  vehicleLicenseProvince?: string;
  vehicleDescription?: string;

  // Alert Configuration
  targetProvinces: string[];
  targetRadius?: number;
  includeWirelessAlert: boolean;
  includeBroadcastAlert: boolean;
  includeHighwaySignage: boolean;
  includeSocialMedia: boolean;

  // Contact
  lawEnforcementAgency: string;
  lawEnforcementContact: string;
  lawEnforcementPhone: string;
  caseFileNumber?: string;

  // Tracking
  requestedBy?: string;
  requestedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  activatedAt?: string;
  expiresAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

interface AmberAlertFormProps {
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
  onSubmit: (request: AmberAlertRequest) => Promise<void>;
  onCancel: () => void;
}

const PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

export function AmberAlertForm({
  caseData,
  onSubmit,
  onCancel,
}: AmberAlertFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<AmberAlertRequest>({
    caseId: caseData.id,
    caseNumber: caseData.caseNumber,
    status: "draft",
    childFirstName: caseData.firstName,
    childLastName: caseData.lastName,
    childAge: caseData.age,
    childGender: caseData.gender,
    childHeight: caseData.heightCm ? `${caseData.heightCm} cm` : "",
    childWeight: caseData.weightKg ? `${caseData.weightKg} kg` : "",
    childHairColor: caseData.hairColor || "",
    childEyeColor: caseData.eyeColor || "",
    childDistinguishingFeatures: caseData.distinguishingFeatures || "",
    childClothingDescription: caseData.clothingLastSeen || "",
    childPhotoUrl: caseData.primaryPhotoUrl || "",
    abductionDate: caseData.lastSeenDate.split("T")[0],
    abductionTime: caseData.lastSeenDate.includes("T")
      ? caseData.lastSeenDate.split("T")[1].substring(0, 5)
      : "",
    abductionLocation: caseData.lastSeenLocation || "",
    abductionCity: caseData.lastSeenCity || "",
    abductionProvince: caseData.lastSeenProvince || "",
    circumstances: caseData.circumstances || "",
    suspectKnown: false,
    vehicleInvolved: false,
    targetProvinces: caseData.lastSeenProvince ? [caseData.lastSeenProvince] : [],
    includeWirelessAlert: true,
    includeBroadcastAlert: true,
    includeHighwaySignage: true,
    includeSocialMedia: true,
    lawEnforcementAgency: "",
    lawEnforcementContact: "",
    lawEnforcementPhone: "",
  });

  const updateField = <K extends keyof AmberAlertRequest>(
    key: K,
    value: AmberAlertRequest[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ ...formData, status: "pending_approval" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        return !!(
          formData.childFirstName &&
          formData.childLastName &&
          formData.childAge
        );
      case 2:
        return !!(
          formData.abductionDate &&
          formData.abductionLocation &&
          formData.circumstances
        );
      case 3:
        return true; // Suspect info is optional
      case 4:
        return formData.targetProvinces.length > 0;
      case 5:
        return !!(
          formData.lawEnforcementAgency &&
          formData.lawEnforcementContact &&
          formData.lawEnforcementPhone
        );
      default:
        return true;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              AMBER Alert Request
            </h2>
            <p className="text-sm text-gray-600">
              Case #{formData.caseNumber}
            </p>
          </div>
        </div>
      </div>

      {/* AMBER Alert Criteria Warning */}
      <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
        <h4 className="font-medium text-amber-800 mb-2">
          AMBER Alert Criteria
        </h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Child must be under 18 years old</li>
          <li>• Law enforcement believes the child was abducted</li>
          <li>• Child is in imminent danger of serious harm or death</li>
          <li>• Sufficient descriptive information exists to issue an alert</li>
          <li>• Child&apos;s name and other data have been entered into CPIC</li>
        </ul>
      </div>

      {/* Progress Steps */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: "Child Info" },
            { num: 2, label: "Abduction" },
            { num: 3, label: "Suspect/Vehicle" },
            { num: 4, label: "Distribution" },
            { num: 5, label: "Review" },
          ].map((s, i, arr) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step >= s.num
                    ? "bg-cyan-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {s.num}
              </div>
              <span
                className={`ml-2 text-sm hidden md:inline ${
                  step >= s.num ? "text-cyan-600" : "text-gray-500"
                }`}
              >
                {s.label}
              </span>
              {i < arr.length - 1 && (
                <div
                  className={`w-8 md:w-16 h-0.5 mx-2 ${
                    step > s.num ? "bg-cyan-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Child Information */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Child Information
            </h3>
            <p className="text-sm text-gray-600">
              Verify and complete the missing child&apos;s information
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.childFirstName}
                  onChange={(e) => updateField("childFirstName", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.childLastName}
                  onChange={(e) => updateField("childLastName", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age *
                </label>
                <input
                  type="number"
                  value={formData.childAge}
                  onChange={(e) => updateField("childAge", parseInt(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={formData.childGender}
                  onChange={(e) => updateField("childGender", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height
                </label>
                <input
                  type="text"
                  value={formData.childHeight}
                  onChange={(e) => updateField("childHeight", e.target.value)}
                  placeholder="e.g., 120 cm or 4'0&quot;"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight
                </label>
                <input
                  type="text"
                  value={formData.childWeight}
                  onChange={(e) => updateField("childWeight", e.target.value)}
                  placeholder="e.g., 25 kg or 55 lbs"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hair Color
                </label>
                <input
                  type="text"
                  value={formData.childHairColor}
                  onChange={(e) => updateField("childHairColor", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Eye Color
                </label>
                <input
                  type="text"
                  value={formData.childEyeColor}
                  onChange={(e) => updateField("childEyeColor", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clothing Description
              </label>
              <textarea
                value={formData.childClothingDescription}
                onChange={(e) => updateField("childClothingDescription", e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distinguishing Features
              </label>
              <textarea
                value={formData.childDistinguishingFeatures}
                onChange={(e) => updateField("childDistinguishingFeatures", e.target.value)}
                rows={2}
                placeholder="Scars, birthmarks, glasses, etc."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
        )}

        {/* Step 2: Abduction Details */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Abduction Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Abduction *
                </label>
                <input
                  type="date"
                  value={formData.abductionDate}
                  onChange={(e) => updateField("abductionDate", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approximate Time
                </label>
                <input
                  type="time"
                  value={formData.abductionTime}
                  onChange={(e) => updateField("abductionTime", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location of Abduction *
              </label>
              <input
                type="text"
                value={formData.abductionLocation}
                onChange={(e) => updateField("abductionLocation", e.target.value)}
                placeholder="Street address or description"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.abductionCity}
                  onChange={(e) => updateField("abductionCity", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Province *
                </label>
                <select
                  value={formData.abductionProvince}
                  onChange={(e) => updateField("abductionProvince", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">Select Province</option>
                  {PROVINCES.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Circumstances *
              </label>
              <textarea
                value={formData.circumstances}
                onChange={(e) => updateField("circumstances", e.target.value)}
                rows={4}
                placeholder="Describe the circumstances of the abduction"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
        )}

        {/* Step 3: Suspect/Vehicle */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Suspect Information */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Suspect Information
                </h3>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.suspectKnown}
                    onChange={(e) => updateField("suspectKnown", e.target.checked)}
                    className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-700">Suspect is known</span>
                </label>
              </div>

              {formData.suspectKnown && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Suspect First Name
                    </label>
                    <input
                      type="text"
                      value={formData.suspectFirstName || ""}
                      onChange={(e) => updateField("suspectFirstName", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Suspect Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.suspectLastName || ""}
                      onChange={(e) => updateField("suspectLastName", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship to Child
                    </label>
                    <input
                      type="text"
                      value={formData.suspectRelationship || ""}
                      onChange={(e) => updateField("suspectRelationship", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.suspectDescription || ""}
                      onChange={(e) => updateField("suspectDescription", e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Vehicle Information */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Vehicle Information
                </h3>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.vehicleInvolved}
                    onChange={(e) => updateField("vehicleInvolved", e.target.checked)}
                    className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-700">Vehicle involved</span>
                </label>
              </div>

              {formData.vehicleInvolved && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Make
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleMake || ""}
                      onChange={(e) => updateField("vehicleMake", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleModel || ""}
                      onChange={(e) => updateField("vehicleModel", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleYear || ""}
                      onChange={(e) => updateField("vehicleYear", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleColor || ""}
                      onChange={(e) => updateField("vehicleColor", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      License Plate
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleLicensePlate || ""}
                      onChange={(e) => updateField("vehicleLicensePlate", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plate Province
                    </label>
                    <select
                      value={formData.vehicleLicenseProvince || ""}
                      onChange={(e) => updateField("vehicleLicenseProvince", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="">Select</option>
                      {PROVINCES.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Distribution */}
        {step === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">
              Alert Distribution
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Provinces *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PROVINCES.map((p) => (
                  <label
                    key={p.code}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.targetProvinces.includes(p.code)
                        ? "border-cyan-500 bg-cyan-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.targetProvinces.includes(p.code)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateField("targetProvinces", [
                            ...formData.targetProvinces,
                            p.code,
                          ]);
                        } else {
                          updateField(
                            "targetProvinces",
                            formData.targetProvinces.filter((c) => c !== p.code)
                          );
                        }
                      }}
                      className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm">{p.code}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alert Channels
              </label>
              <div className="space-y-3">
                {[
                  { key: "includeWirelessAlert", label: "Wireless Emergency Alerts (WEA)", desc: "Push to mobile devices" },
                  { key: "includeBroadcastAlert", label: "Emergency Alert System (EAS)", desc: "TV and radio broadcasts" },
                  { key: "includeHighwaySignage", label: "Highway Digital Signage", desc: "Electronic road signs" },
                  { key: "includeSocialMedia", label: "Social Media Distribution", desc: "Official channels" },
                ].map((channel) => (
                  <label
                    key={channel.key}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData[channel.key as keyof AmberAlertRequest] as boolean}
                      onChange={(e) =>
                        updateField(channel.key as keyof AmberAlertRequest, e.target.checked)
                      }
                      className="mt-0.5 w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {channel.label}
                      </span>
                      <p className="text-xs text-gray-500">{channel.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Law Enforcement & Review */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Law Enforcement Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agency Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lawEnforcementAgency}
                    onChange={(e) => updateField("lawEnforcementAgency", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Case/File Number
                  </label>
                  <input
                    type="text"
                    value={formData.caseFileNumber || ""}
                    onChange={(e) => updateField("caseFileNumber", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Officer *
                  </label>
                  <input
                    type="text"
                    value={formData.lawEnforcementContact}
                    onChange={(e) => updateField("lawEnforcementContact", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.lawEnforcementPhone}
                    onChange={(e) => updateField("lawEnforcementPhone", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Review Summary */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Review Summary
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Child:</span>
                  <span className="font-medium">
                    {formData.childFirstName} {formData.childLastName}, {formData.childAge} years old
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium">
                    {formData.abductionCity}, {formData.abductionProvince}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{formData.abductionDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Target Provinces:</span>
                  <span className="font-medium">
                    {formData.targetProvinces.join(", ")}
                  </span>
                </div>
              </div>
            </div>

            {/* Confirmation */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm text-red-800">
                  I confirm that all AMBER Alert criteria have been met, the
                  information provided is accurate, and this request has been
                  authorized by law enforcement.
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <button
          type="button"
          onClick={step === 1 ? onCancel : () => setStep(step - 1)}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {step === 1 ? "Cancel" : "Back"}
        </button>
        <div className="flex items-center gap-3">
          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!validateStep(step)}
              className="px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !validateStep(5)}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Submit AMBER Alert Request"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AmberAlertForm;
