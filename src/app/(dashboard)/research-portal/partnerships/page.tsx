"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Partnership {
  id: string;
  institution_name: string;
  institution_type: string;
  department: string | null;
  city: string | null;
  province: string | null;
  country: string;
  website: string | null;
  partnership_type: string;
  focus_areas: string[];
  access_level: string;
  status: string;
  mou_signed_date: string | null;
  mou_expiry_date: string | null;
  created_at: string;
}

type InstitutionType = "university" | "college" | "research_institute" | "law_enforcement_academy" | "government" | "ngo";
type PartnershipType = "research" | "training" | "data_sharing" | "collaborative_project" | "educational";

interface ApplicationFormData {
  institutionName: string;
  institutionType: InstitutionType | "";
  department: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  website: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  primaryContactPosition: string;
  secondaryContactName: string;
  secondaryContactEmail: string;
  partnershipType: PartnershipType | "";
  focusAreas: string[];
  accessLevel: string;
  proposedActivities: string;
  expectedBenefits: string;
}

const initialFormData: ApplicationFormData = {
  institutionName: "",
  institutionType: "",
  department: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  country: "CA",
  website: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  primaryContactPosition: "",
  secondaryContactName: "",
  secondaryContactEmail: "",
  partnershipType: "",
  focusAreas: [],
  accessLevel: "academic",
  proposedActivities: "",
  expectedBenefits: "",
};

const focusAreaOptions = [
  "Missing Youth",
  "Vulnerable Adults",
  "Indigenous Communities",
  "Rural/Remote Areas",
  "Urban Settings",
  "Cross-Border Cases",
  "Technology & Tools",
  "Search Methodology",
  "Family Support",
  "Prevention Programs",
  "Policy Development",
  "Training Curriculum",
];

export default function PartnershipsPage() {
  const [activeTab, setActiveTab] = useState<"browse" | "apply">("browse");
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ApplicationFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchPartnerships = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/archive/partnerships?status=active");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch partnerships");
      }

      setPartnerships(data.partnerships || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartnerships();
  }, [fetchPartnerships]);

  const updateFormData = (field: keyof ApplicationFormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFocusArea = (area: string) => {
    const newAreas = formData.focusAreas.includes(area)
      ? formData.focusAreas.filter((a) => a !== area)
      : [...formData.focusAreas, area];
    updateFormData("focusAreas", newAreas);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/archive/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      setSubmitSuccess(true);
      setFormData(initialFormData);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const getInstitutionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      university: "University",
      college: "College",
      research_institute: "Research Institute",
      law_enforcement_academy: "Law Enforcement Academy",
      government: "Government Agency",
      ngo: "Non-Profit Organization",
    };
    return labels[type] || type;
  };

  const getPartnershipTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      research: "Research Partnership",
      training: "Training Partnership",
      data_sharing: "Data Sharing Agreement",
      collaborative_project: "Collaborative Project",
      educational: "Educational Partnership",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/research-portal"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Research Portal
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Academic Partnerships</h1>
          <p className="mt-1 text-sm text-gray-600">
            Explore our partnerships with academic institutions and apply to become a partner.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab("browse")}
            className={`border-b-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "browse"
                ? "border-cyan-600 text-cyan-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Current Partners
          </button>
          <button
            onClick={() => setActiveTab("apply")}
            className={`border-b-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "apply"
                ? "border-cyan-600 text-cyan-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Apply for Partnership
          </button>
        </nav>
      </div>

      {/* Browse Partnerships Tab */}
      {activeTab === "browse" && (
        <div className="space-y-6">
          {/* Partnership Benefits */}
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-cyan-50 to-teal-50 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Partnership Benefits</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
                    <svg className="h-5 w-5 text-cyan-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Data Access</h3>
                  <p className="mt-1 text-sm text-gray-600">Enhanced access to anonymized case data for research</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
                    <svg className="h-5 w-5 text-cyan-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Collaboration</h3>
                  <p className="mt-1 text-sm text-gray-600">Joint research projects and knowledge sharing</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
                    <svg className="h-5 w-5 text-cyan-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Training</h3>
                  <p className="mt-1 text-sm text-gray-600">Access to training materials and case studies</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-6">
                  <div className="h-5 w-3/4 rounded bg-gray-200" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
                  <div className="mt-4 flex gap-2">
                    <div className="h-6 w-20 rounded bg-gray-200" />
                    <div className="h-6 w-24 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : partnerships.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No active partnerships yet</h3>
              <p className="mt-2 text-sm text-gray-600">
                Be the first to establish a partnership with LocateConnect.
              </p>
              <button
                onClick={() => setActiveTab("apply")}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
              >
                Apply Now
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {partnerships.map((partnership) => (
                <div
                  key={partnership.id}
                  className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {partnership.institution_name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {getInstitutionTypeLabel(partnership.institution_type)}
                        {partnership.department && ` - ${partnership.department}`}
                      </p>
                    </div>
                    <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Active
                    </span>
                  </div>

                  {(partnership.city || partnership.province) && (
                    <p className="mt-2 text-sm text-gray-500">
                      {[partnership.city, partnership.province, partnership.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}

                  <div className="mt-4">
                    <span className="inline-flex rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-medium text-cyan-800">
                      {getPartnershipTypeLabel(partnership.partnership_type)}
                    </span>
                  </div>

                  {partnership.focus_areas && partnership.focus_areas.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-500">Focus Areas</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {partnership.focus_areas.slice(0, 3).map((area) => (
                          <span
                            key={area}
                            className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                          >
                            {area}
                          </span>
                        ))}
                        {partnership.focus_areas.length > 3 && (
                          <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            +{partnership.focus_areas.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {partnership.website && (
                    <a
                      href={partnership.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
                    >
                      Visit Website
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apply Tab */}
      {activeTab === "apply" && (
        <div className="mx-auto max-w-2xl">
          {submitSuccess ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-green-800">Application Submitted</h2>
              <p className="mt-2 text-green-700">
                Thank you for your partnership application. Our team will review it and contact you within 10-15 business days.
              </p>
              <button
                onClick={() => {
                  setSubmitSuccess(false);
                  setActiveTab("browse");
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                View Current Partners
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Submit Error */}
              {submitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-800">{submitError}</p>
                </div>
              )}

              {/* Institution Information */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Institution Information</h2>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Institution Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.institutionName}
                      onChange={(e) => updateFormData("institutionName", e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Institution Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.institutionType}
                        onChange={(e) => updateFormData("institutionType", e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="">Select type</option>
                        <option value="university">University</option>
                        <option value="college">College</option>
                        <option value="research_institute">Research Institute</option>
                        <option value="law_enforcement_academy">Law Enforcement Academy</option>
                        <option value="government">Government Agency</option>
                        <option value="ngo">Non-Profit Organization</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department</label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => updateFormData("department", e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        placeholder="e.g., Department of Criminology"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => updateFormData("address", e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => updateFormData("city", e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Province</label>
                      <input
                        type="text"
                        value={formData.province}
                        onChange={(e) => updateFormData("province", e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => updateFormData("postalCode", e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => updateFormData("website", e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      placeholder="https://"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Primary Contact</h2>

                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.primaryContactName}
                        onChange={(e) => updateFormData("primaryContactName", e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Position</label>
                      <input
                        type="text"
                        value={formData.primaryContactPosition}
                        onChange={(e) => updateFormData("primaryContactPosition", e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.primaryContactEmail}
                        onChange={(e) => updateFormData("primaryContactEmail", e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="tel"
                        value={formData.primaryContactPhone}
                        onChange={(e) => updateFormData("primaryContactPhone", e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                <h3 className="mt-6 text-sm font-semibold text-gray-900">Secondary Contact (Optional)</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      type="text"
                      value={formData.secondaryContactName}
                      onChange={(e) => updateFormData("secondaryContactName", e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.secondaryContactEmail}
                      onChange={(e) => updateFormData("secondaryContactEmail", e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Partnership Details */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Partnership Details</h2>

                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Partnership Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.partnershipType}
                        onChange={(e) => updateFormData("partnershipType", e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="">Select type</option>
                        <option value="research">Research Partnership</option>
                        <option value="training">Training Partnership</option>
                        <option value="data_sharing">Data Sharing Agreement</option>
                        <option value="collaborative_project">Collaborative Project</option>
                        <option value="educational">Educational Partnership</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Access Level Requested <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.accessLevel}
                        onChange={(e) => updateFormData("accessLevel", e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="public">Public</option>
                        <option value="academic">Academic</option>
                        <option value="law_enforcement">Law Enforcement</option>
                        <option value="restricted">Restricted</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Focus Areas</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {focusAreaOptions.map((area) => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => toggleFocusArea(area)}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                            formData.focusAreas.includes(area)
                              ? "border-cyan-600 bg-cyan-50 text-cyan-700"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Proposed Activities</label>
                    <textarea
                      rows={3}
                      value={formData.proposedActivities}
                      onChange={(e) => updateFormData("proposedActivities", e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      placeholder="Describe the activities you plan to undertake as part of this partnership..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expected Benefits</label>
                    <textarea
                      rows={3}
                      value={formData.expectedBenefits}
                      onChange={(e) => updateFormData("expectedBenefits", e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      placeholder="What benefits do you expect from this partnership for your institution and the broader community?"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
