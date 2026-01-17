"use client";

import { useState, useEffect } from "react";

export const dynamic = "force-dynamic";

type PosterTemplate = "standard" | "amber_alert" | "community" | "social_media" | "multilingual";
type PosterSize = "letter" | "tabloid" | "a4" | "instagram" | "facebook";

interface CaseInfo {
  id: string;
  name: string;
  age: number;
  lastSeenDate: string;
  lastSeenLocation: string;
  description: string;
  photoUrl?: string;
}

const TEMPLATES: { id: PosterTemplate; name: string; description: string }[] = [
  { id: "standard", name: "Standard Missing Person", description: "Traditional missing person flyer format" },
  { id: "amber_alert", name: "AMBER Alert Style", description: "High-visibility emergency alert format" },
  { id: "community", name: "Community Outreach", description: "Friendly neighborhood-focused design" },
  { id: "social_media", name: "Social Media", description: "Optimized for sharing on social platforms" },
  { id: "multilingual", name: "Multilingual", description: "Template with multiple language support" },
];

const SIZES: { id: PosterSize; name: string; dimensions: string }[] = [
  { id: "letter", name: "Letter (8.5x11)", dimensions: "8.5 x 11 inches" },
  { id: "tabloid", name: "Tabloid (11x17)", dimensions: "11 x 17 inches" },
  { id: "a4", name: "A4", dimensions: "210 x 297 mm" },
  { id: "instagram", name: "Instagram Post", dimensions: "1080 x 1080 px" },
  { id: "facebook", name: "Facebook Post", dimensions: "1200 x 630 px" },
];

export default function PostersPage() {
  const [activeTab, setActiveTab] = useState<"create" | "templates" | "history">("create");
  const [selectedCase, setSelectedCase] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<PosterTemplate>("standard");
  const [selectedSize, setSelectedSize] = useState<PosterSize>("letter");
  const [customText, setCustomText] = useState({
    headline: "MISSING",
    reward: "",
    contactInfo: "If you have any information, please contact:",
    tiplineNumber: "1-800-THE-LOST",
  });
  const [showQRCode, setShowQRCode] = useState(true);
  const [cases, setCases] = useState<CaseInfo[]>([]);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Load mock cases
    setCases([
      { id: "1", name: "Jane Doe", age: 16, lastSeenDate: "2026-01-15", lastSeenLocation: "Downtown Edmonton", description: "5'4\", brown hair, brown eyes, last seen wearing blue jacket" },
      { id: "2", name: "John Smith", age: 72, lastSeenDate: "2026-01-14", lastSeenLocation: "Sherwood Park", description: "6'0\", gray hair, blue eyes, uses walker" },
      { id: "3", name: "Emily Chen", age: 14, lastSeenDate: "2026-01-16", lastSeenLocation: "West Edmonton Mall", description: "5'2\", black hair, brown eyes, wearing school uniform" },
    ]);
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    // Simulate poster generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setPreviewUrl("/api/posters/preview?template=" + selectedTemplate);
    setGenerating(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Poster & Flyer Generator</h1>
        <p className="text-gray-600 mt-2">Create professional missing person posters and flyers</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {[
            { id: "create", label: "Create Poster" },
            { id: "templates", label: "Templates" },
            { id: "history", label: "History" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Create Tab */}
      {activeTab === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-6">
            {/* Case Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Case</h2>
              <select
                value={selectedCase}
                onChange={(e) => setSelectedCase(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a case...</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - Last seen {c.lastSeenDate}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Template</h2>
              <div className="grid grid-cols-1 gap-3">
                {TEMPLATES.map((template) => (
                  <label
                    key={template.id}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate === template.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={template.id}
                      checked={selectedTemplate === template.id}
                      onChange={(e) => setSelectedTemplate(e.target.value as PosterTemplate)}
                      className="mr-3"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{template.name}</p>
                      <p className="text-sm text-gray-500">{template.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Output Size</h2>
              <div className="grid grid-cols-2 gap-3">
                {SIZES.map((size) => (
                  <label
                    key={size.id}
                    className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-colors text-center ${
                      selectedSize === size.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="size"
                      value={size.id}
                      checked={selectedSize === size.id}
                      onChange={(e) => setSelectedSize(e.target.value as PosterSize)}
                      className="sr-only"
                    />
                    <p className="font-medium text-gray-900 text-sm">{size.name}</p>
                    <p className="text-xs text-gray-500">{size.dimensions}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Text */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customize Text</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                  <input
                    type="text"
                    value={customText.headline}
                    onChange={(e) => setCustomText({ ...customText, headline: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reward (optional)</label>
                  <input
                    type="text"
                    value={customText.reward}
                    onChange={(e) => setCustomText({ ...customText, reward: e.target.value })}
                    placeholder="e.g., $10,000 reward for information"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tip Line Number</label>
                  <input
                    type="text"
                    value={customText.tiplineNumber}
                    onChange={(e) => setCustomText({ ...customText, tiplineNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showQRCode}
                    onChange={(e) => setShowQRCode(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Include QR code linking to case page</span>
                </label>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!selectedCase || generating}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                selectedCase && !generating
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                "Generate Poster"
              )}
            </button>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
            <div className="aspect-[8.5/11] bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
              {previewUrl ? (
                <div className="w-full h-full bg-white p-8 flex flex-col items-center">
                  <div className="text-red-600 font-bold text-4xl mb-4">{customText.headline}</div>
                  <div className="w-32 h-40 bg-gray-300 rounded mb-4 flex items-center justify-center text-gray-500">
                    Photo
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {cases.find((c) => c.id === selectedCase)?.name || "Name"}
                    </p>
                    <p className="text-gray-600 mt-2">
                      Age: {cases.find((c) => c.id === selectedCase)?.age || "--"}
                    </p>
                    <p className="text-gray-600 mt-1">
                      Last Seen: {cases.find((c) => c.id === selectedCase)?.lastSeenLocation || "Location"}
                    </p>
                    <p className="text-sm text-gray-500 mt-4 max-w-xs">
                      {cases.find((c) => c.id === selectedCase)?.description || "Description"}
                    </p>
                  </div>
                  {customText.reward && (
                    <div className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded font-medium">
                      {customText.reward}
                    </div>
                  )}
                  <div className="mt-auto text-center">
                    <p className="text-sm text-gray-600">{customText.contactInfo}</p>
                    <p className="text-xl font-bold text-blue-600 mt-1">{customText.tiplineNumber}</p>
                    {showQRCode && (
                      <div className="mt-4 w-16 h-16 bg-gray-800 mx-auto" title="QR Code" />
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Select a case and generate to preview</p>
              )}
            </div>
            {previewUrl && (
              <div className="flex gap-3 mt-4">
                <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Download PDF
                </button>
                <button className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Print
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEMPLATES.map((template) => (
            <div key={template.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="aspect-[8.5/11] bg-gray-100 flex items-center justify-center text-gray-400">
                Template Preview
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                <button
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setActiveTab("create");
                  }}
                  className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Generated Posters</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {[
              { id: "1", case: "Jane Doe", template: "AMBER Alert", created: "2026-01-16 10:30 AM", downloads: 45 },
              { id: "2", case: "John Smith", template: "Standard", created: "2026-01-15 3:15 PM", downloads: 23 },
              { id: "3", case: "Emily Chen", template: "Social Media", created: "2026-01-16 9:00 AM", downloads: 128 },
            ].map((poster) => (
              <div key={poster.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{poster.case}</p>
                  <p className="text-sm text-gray-500">{poster.template} · Created {poster.created}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{poster.downloads} downloads</span>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">Download</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
