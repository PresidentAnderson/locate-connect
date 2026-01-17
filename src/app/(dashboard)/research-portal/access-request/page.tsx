"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AccessLevel = "public" | "academic" | "law_enforcement" | "restricted";
type OrganizationType = "university" | "research_institute" | "law_enforcement" | "government" | "ngo" | "other";
type ResearchCategory = "academic" | "policy" | "training" | "operational" | "statistical";

interface FormData {
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  organizationName: string;
  organizationType: OrganizationType | "";
  positionTitle: string;
  accessLevelRequested: AccessLevel | "";
  researchPurpose: string;
  researchCategory: ResearchCategory | "";
  researchTitle: string;
  researchDescription: string;
  methodology: string;
  expectedOutcomes: string;
  ethicsApprovalNumber: string;
  requestedDateRangeStart: string;
  requestedDateRangeEnd: string;
  requestedRegions: string[];
  requestedCaseTypes: string[];
  requestedFields: string[];
  estimatedCasesNeeded: string;
  accessDurationMonths: string;
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;
}

const initialFormData: FormData = {
  requesterName: "",
  requesterEmail: "",
  requesterPhone: "",
  organizationName: "",
  organizationType: "",
  positionTitle: "",
  accessLevelRequested: "",
  researchPurpose: "",
  researchCategory: "",
  researchTitle: "",
  researchDescription: "",
  methodology: "",
  expectedOutcomes: "",
  ethicsApprovalNumber: "",
  requestedDateRangeStart: "",
  requestedDateRangeEnd: "",
  requestedRegions: [],
  requestedCaseTypes: [],
  requestedFields: [],
  estimatedCasesNeeded: "",
  accessDurationMonths: "12",
  agreeToTerms: false,
  agreeToPrivacy: false,
};

const provinces = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"
];

const caseTypes = [
  "runaway", "parental_abduction", "stranger_abduction", "lost", "wandered", "unknown"
];

const availableFields = [
  "case_category", "disposition", "year_reported", "year_resolved",
  "age_range", "gender", "province", "region_type", "risk_factors",
  "resolution_time_days", "found_circumstances", "tags"
];

export default function AccessRequestPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const totalSteps = 4;

  const updateFormData = (field: keyof FormData, value: string | string[] | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: keyof FormData, item: string) => {
    const currentArray = formData[field] as string[];
    const newArray = currentArray.includes(item)
      ? currentArray.filter((i) => i !== item)
      : [...currentArray, item];
    updateFormData(field, newArray);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.requesterName &&
          formData.requesterEmail &&
          formData.organizationName &&
          formData.organizationType
        );
      case 2:
        return !!(
          formData.accessLevelRequested &&
          formData.researchCategory &&
          formData.researchTitle &&
          formData.researchDescription
        );
      case 3:
        return formData.requestedFields.length > 0;
      case 4:
        return formData.agreeToTerms && formData.agreeToPrivacy;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/archive/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          estimatedCasesNeeded: formData.estimatedCasesNeeded
            ? parseInt(formData.estimatedCasesNeeded)
            : null,
          accessDurationMonths: parseInt(formData.accessDurationMonths),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-green-800">Request Submitted Successfully</h2>
          <p className="mt-2 text-green-700">
            Your research access request has been submitted and is pending review.
            You will receive an email notification once your request has been processed.
          </p>
          <p className="mt-4 text-sm text-green-600">
            Typical review time: 5-7 business days
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/research-portal"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Back to Research Portal
            </Link>
            <Link
              href="/archive"
              className="inline-flex items-center gap-2 rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
            >
              Browse Public Archive
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/research-portal"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Research Portal
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Request Research Access</h1>
        <p className="mt-2 text-gray-600">
          Complete this form to request access to our anonymized case database for research purposes.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {["Contact Info", "Research Details", "Data Requirements", "Review & Submit"].map((label, index) => (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
                    index + 1 < currentStep
                      ? "bg-cyan-600 text-white"
                      : index + 1 === currentStep
                      ? "bg-cyan-100 text-cyan-700 ring-2 ring-cyan-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {index + 1 < currentStep ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="mt-2 text-xs font-medium text-gray-600">{label}</span>
              </div>
              {index < 3 && (
                <div
                  className={`h-0.5 flex-1 ${
                    index + 1 < currentStep ? "bg-cyan-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Form Steps */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Step 1: Contact Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.requesterName}
                  onChange={(e) => updateFormData("requesterName", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="Dr. Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.requesterEmail}
                  onChange={(e) => updateFormData("requesterEmail", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="jane.smith@university.ca"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={formData.requesterPhone}
                  onChange={(e) => updateFormData("requesterPhone", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Position/Title</label>
                <input
                  type="text"
                  value={formData.positionTitle}
                  onChange={(e) => updateFormData("positionTitle", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="Associate Professor"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.organizationName}
                onChange={(e) => updateFormData("organizationName", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="University of Toronto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Organization Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.organizationType}
                onChange={(e) => updateFormData("organizationType", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">Select organization type</option>
                <option value="university">University/College</option>
                <option value="research_institute">Research Institute</option>
                <option value="law_enforcement">Law Enforcement Agency</option>
                <option value="government">Government Agency</option>
                <option value="ngo">Non-Profit/NGO</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Research Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Research Details</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Access Level Requested <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.accessLevelRequested}
                  onChange={(e) => updateFormData("accessLevelRequested", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">Select access level</option>
                  <option value="public">Public (basic anonymized data)</option>
                  <option value="academic">Academic (enhanced detail)</option>
                  <option value="law_enforcement">Law Enforcement</option>
                  <option value="restricted">Restricted (full detail)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Research Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.researchCategory}
                  onChange={(e) => updateFormData("researchCategory", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">Select category</option>
                  <option value="academic">Academic Research</option>
                  <option value="policy">Policy Development</option>
                  <option value="training">Training/Education</option>
                  <option value="operational">Operational Improvement</option>
                  <option value="statistical">Statistical Analysis</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Research Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.researchTitle}
                onChange={(e) => updateFormData("researchTitle", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="Factors Influencing Resolution Times in Missing Youth Cases"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Research Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.researchDescription}
                onChange={(e) => updateFormData("researchDescription", e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="Describe your research objectives, questions, and how this data will be used..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Methodology</label>
              <textarea
                value={formData.methodology}
                onChange={(e) => updateFormData("methodology", e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="Describe your research methodology..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Expected Outcomes</label>
              <textarea
                value={formData.expectedOutcomes}
                onChange={(e) => updateFormData("expectedOutcomes", e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="What do you expect to learn or produce from this research?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ethics Approval Number</label>
              <input
                type="text"
                value={formData.ethicsApprovalNumber}
                onChange={(e) => updateFormData("ethicsApprovalNumber", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="REB-2024-1234"
              />
              <p className="mt-1 text-xs text-gray-500">
                If your research requires ethics approval, please provide your approval number.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Data Requirements */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Data Requirements</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date Range Start</label>
                <input
                  type="date"
                  value={formData.requestedDateRangeStart}
                  onChange={(e) => updateFormData("requestedDateRangeStart", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date Range End</label>
                <input
                  type="date"
                  value={formData.requestedDateRangeEnd}
                  onChange={(e) => updateFormData("requestedDateRangeEnd", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Regions of Interest</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {provinces.map((province) => (
                  <button
                    key={province}
                    type="button"
                    onClick={() => toggleArrayItem("requestedRegions", province)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      formData.requestedRegions.includes(province)
                        ? "border-cyan-600 bg-cyan-50 text-cyan-700"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {province}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">Leave empty to include all regions</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Case Types</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {caseTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleArrayItem("requestedCaseTypes", type)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                      formData.requestedCaseTypes.includes(type)
                        ? "border-cyan-600 bg-cyan-50 text-cyan-700"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {type.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">Leave empty to include all case types</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Data Fields Required <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                {availableFields.map((field) => (
                  <label key={field} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.requestedFields.includes(field)}
                      onChange={() => toggleArrayItem("requestedFields", field)}
                      className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-gray-700">{field.replace(/_/g, " ")}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Estimated Cases Needed</label>
                <input
                  type="number"
                  value={formData.estimatedCasesNeeded}
                  onChange={(e) => updateFormData("estimatedCasesNeeded", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="1000"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Access Duration (months)</label>
                <select
                  value={formData.accessDurationMonths}
                  onChange={(e) => updateFormData("accessDurationMonths", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                  <option value="24">24 months</option>
                  <option value="36">36 months</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Review & Submit</h2>

            {/* Summary */}
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Request Summary</h3>
              <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-gray-500">Requester</dt>
                  <dd className="font-medium text-gray-900">{formData.requesterName}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Organization</dt>
                  <dd className="font-medium text-gray-900">{formData.organizationName}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Access Level</dt>
                  <dd className="font-medium text-gray-900 capitalize">{formData.accessLevelRequested.replace(/_/g, " ")}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Research Category</dt>
                  <dd className="font-medium text-gray-900 capitalize">{formData.researchCategory}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-gray-500">Research Title</dt>
                  <dd className="font-medium text-gray-900">{formData.researchTitle}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Data Fields</dt>
                  <dd className="font-medium text-gray-900">{formData.requestedFields.length} fields selected</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Duration</dt>
                  <dd className="font-medium text-gray-900">{formData.accessDurationMonths} months</dd>
                </div>
              </dl>
            </div>

            {/* Terms & Conditions */}
            <div className="space-y-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={(e) => updateFormData("agreeToTerms", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-700">
                  I agree to the{" "}
                  <a href="#" className="font-medium text-cyan-600 hover:text-cyan-700">
                    Data Use Agreement
                  </a>{" "}
                  and will use this data only for the stated research purposes. I understand that attempting
                  to re-identify individuals is strictly prohibited.
                  <span className="text-red-500">*</span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.agreeToPrivacy}
                  onChange={(e) => updateFormData("agreeToPrivacy", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-700">
                  I acknowledge that I have read and understood the{" "}
                  <a href="#" className="font-medium text-cyan-600 hover:text-cyan-700">
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a href="#" className="font-medium text-cyan-600 hover:text-cyan-700">
                    Research Ethics Guidelines
                  </a>
                  . I will ensure all data is stored securely and will not be shared with unauthorized parties.
                  <span className="text-red-500">*</span>
                </span>
              </label>
            </div>

            {/* Notice */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <svg className="h-5 w-5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Review Process</p>
                  <p className="mt-1">
                    Your request will be reviewed by our research committee. This typically takes 5-7 business days.
                    You may be contacted for additional information or clarification.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevious}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Previous
            </button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !validateStep(4)}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
