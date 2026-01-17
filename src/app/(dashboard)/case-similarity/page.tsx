"use client";

import { useState, useEffect } from "react";

export const dynamic = "force-dynamic";

type MatchConfidence = "high" | "medium" | "low";
type MatchStatus = "pending_review" | "confirmed" | "dismissed" | "investigating";

interface SimilarityFactor {
  name: string;
  score: number;
  description: string;
}

interface CaseMatch {
  id: string;
  sourceCase: {
    id: string;
    name: string;
    age: number;
    lastSeenDate: string;
    lastSeenLocation: string;
    photoUrl?: string;
  };
  matchedCase: {
    id: string;
    name: string;
    age: number;
    lastSeenDate: string;
    lastSeenLocation: string;
    photoUrl?: string;
  };
  overallScore: number;
  confidence: MatchConfidence;
  status: MatchStatus;
  factors: SimilarityFactor[];
  detectedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

const getConfidenceColor = (confidence: MatchConfidence) => {
  switch (confidence) {
    case "high":
      return "bg-red-100 text-red-700";
    case "medium":
      return "bg-orange-100 text-orange-700";
    case "low":
      return "bg-yellow-100 text-yellow-700";
  }
};

const getStatusColor = (status: MatchStatus) => {
  switch (status) {
    case "pending_review":
      return "bg-blue-100 text-blue-700";
    case "confirmed":
      return "bg-green-100 text-green-700";
    case "dismissed":
      return "bg-gray-100 text-gray-700";
    case "investigating":
      return "bg-purple-100 text-purple-700";
  }
};

export default function CaseSimilarityPage() {
  const [activeTab, setActiveTab] = useState<"matches" | "analysis" | "settings">("matches");
  const [matches, setMatches] = useState<CaseMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<CaseMatch | null>(null);
  const [filterConfidence, setFilterConfidence] = useState<MatchConfidence | "all">("all");
  const [filterStatus, setFilterStatus] = useState<MatchStatus | "all">("all");
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  useEffect(() => {
    // Load mock matches
    setMatches([
      {
        id: "match-1",
        sourceCase: {
          id: "case-1",
          name: "Jane Doe",
          age: 16,
          lastSeenDate: "2026-01-15",
          lastSeenLocation: "Downtown Edmonton",
        },
        matchedCase: {
          id: "case-old-1",
          name: "Sarah Johnson",
          age: 17,
          lastSeenDate: "2025-11-20",
          lastSeenLocation: "Whyte Avenue, Edmonton",
        },
        overallScore: 87,
        confidence: "high",
        status: "pending_review",
        factors: [
          { name: "Geographic Proximity", score: 92, description: "Both cases in Edmonton area, <5km apart" },
          { name: "Age Range", score: 95, description: "Both subjects 16-17 years old" },
          { name: "Physical Description", score: 78, description: "Similar height, hair color" },
          { name: "Circumstances", score: 83, description: "Both last seen near transit hubs" },
        ],
        detectedAt: "2026-01-17T10:00:00Z",
      },
      {
        id: "match-2",
        sourceCase: {
          id: "case-2",
          name: "John Smith",
          age: 72,
          lastSeenDate: "2026-01-14",
          lastSeenLocation: "Sherwood Park",
        },
        matchedCase: {
          id: "case-old-2",
          name: "Robert Williams",
          age: 75,
          lastSeenDate: "2025-12-05",
          lastSeenLocation: "St. Albert",
        },
        overallScore: 74,
        confidence: "medium",
        status: "investigating",
        factors: [
          { name: "Geographic Proximity", score: 68, description: "Both cases in Edmonton metro area" },
          { name: "Age Range", score: 90, description: "Both subjects elderly (70+)" },
          { name: "Medical Condition", score: 85, description: "Both have memory-related conditions" },
          { name: "Circumstances", score: 54, description: "Similar time of day" },
        ],
        detectedAt: "2026-01-16T14:30:00Z",
        reviewedBy: "Det. Johnson",
        reviewedAt: "2026-01-16T16:00:00Z",
        notes: "Investigating potential connection. Both cases involve dementia patients.",
      },
      {
        id: "match-3",
        sourceCase: {
          id: "case-3",
          name: "Emily Chen",
          age: 14,
          lastSeenDate: "2026-01-16",
          lastSeenLocation: "West Edmonton Mall",
        },
        matchedCase: {
          id: "case-old-3",
          name: "Michelle Park",
          age: 15,
          lastSeenDate: "2025-09-12",
          lastSeenLocation: "West Edmonton Mall",
        },
        overallScore: 91,
        confidence: "high",
        status: "confirmed",
        factors: [
          { name: "Geographic Proximity", score: 100, description: "Same location - West Edmonton Mall" },
          { name: "Age Range", score: 92, description: "Both subjects 14-15 years old" },
          { name: "Physical Description", score: 85, description: "Similar appearance, school uniforms" },
          { name: "Day/Time Pattern", score: 88, description: "Both on school days, afternoon" },
        ],
        detectedAt: "2026-01-16T18:00:00Z",
        reviewedBy: "Sgt. Martinez",
        reviewedAt: "2026-01-17T09:00:00Z",
        notes: "Confirmed pattern. Recommending increased patrol presence at WEM during school hours.",
      },
    ]);
  }, []);

  const filteredMatches = matches.filter((match) => {
    if (filterConfidence !== "all" && match.confidence !== filterConfidence) return false;
    if (filterStatus !== "all" && match.status !== filterStatus) return false;
    return true;
  });

  const runAnalysis = async () => {
    setRunningAnalysis(true);
    setAnalysisProgress(0);
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      setAnalysisProgress(i);
    }
    setRunningAnalysis(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Case Similarity Matching</h1>
          <p className="text-gray-600 mt-2">AI-powered analysis to identify potential case connections</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={runningAnalysis}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {runningAnalysis ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Run Analysis
            </>
          )}
        </button>
      </div>

      {runningAnalysis && (
        <div className="mb-6 bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm text-blue-700 mb-2">
            <span>Analyzing case similarities...</span>
            <span>{analysisProgress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${analysisProgress}%` }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {[
            { id: "matches", label: `Matches (${matches.filter((m) => m.status === "pending_review").length} pending)` },
            { id: "analysis", label: "Analysis History" },
            { id: "settings", label: "Settings" },
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

      {/* Matches Tab */}
      {activeTab === "matches" && (
        <div>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <select
              value={filterConfidence}
              onChange={(e) => setFilterConfidence(e.target.value as MatchConfidence | "all")}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Confidence</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as MatchStatus | "all")}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending_review">Pending Review</option>
              <option value="investigating">Investigating</option>
              <option value="confirmed">Confirmed</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {/* Matches List */}
          <div className="space-y-4">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedMatch(match)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm">
                        Photo
                      </div>
                      <p className="text-sm font-medium mt-1">{match.sourceCase.name}</p>
                      <p className="text-xs text-gray-500">Age {match.sourceCase.age}</p>
                    </div>
                    <div className="text-4xl text-gray-300">↔</div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm">
                        Photo
                      </div>
                      <p className="text-sm font-medium mt-1">{match.matchedCase.name}</p>
                      <p className="text-xs text-gray-500">Age {match.matchedCase.age}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded ${getConfidenceColor(match.confidence)}`}>
                        {match.confidence} confidence
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(match.status)}`}>
                        {match.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{match.overallScore}%</p>
                    <p className="text-sm text-gray-500">match score</p>
                  </div>
                </div>

                {/* Factors */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {match.factors.map((factor) => (
                    <div key={factor.name} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">{factor.name}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              factor.score >= 80 ? "bg-green-500" : factor.score >= 60 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${factor.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{factor.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                  <span>Detected: {new Date(match.detectedAt).toLocaleString()}</span>
                  {match.reviewedBy && <span>Reviewed by: {match.reviewedBy}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === "analysis" && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Analysis History</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {[
              { date: "2026-01-17 10:00 AM", cases: 45, matches: 3, duration: "2m 34s" },
              { date: "2026-01-16 10:00 AM", cases: 44, matches: 2, duration: "2m 21s" },
              { date: "2026-01-15 10:00 AM", cases: 42, matches: 1, duration: "2m 15s" },
            ].map((analysis, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{analysis.date}</p>
                  <p className="text-sm text-gray-500">
                    Analyzed {analysis.cases} cases &bull; Found {analysis.matches} matches
                  </p>
                </div>
                <div className="text-sm text-gray-500">{analysis.duration}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Matching Criteria Weights</h3>
              <div className="space-y-4">
                {[
                  { name: "Geographic Proximity", value: 25 },
                  { name: "Age Range", value: 20 },
                  { name: "Physical Description", value: 20 },
                  { name: "Circumstances", value: 15 },
                  { name: "Time Pattern", value: 10 },
                  { name: "Other Factors", value: 10 },
                ].map((criteria) => (
                  <div key={criteria.name} className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-700">{criteria.name}</label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      defaultValue={criteria.value}
                      className="flex-1"
                    />
                    <span className="w-12 text-sm text-gray-600">{criteria.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Alert Thresholds</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">High Confidence Threshold</label>
                  <input
                    type="number"
                    defaultValue={85}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Medium Confidence Threshold</label>
                  <input
                    type="number"
                    defaultValue={65}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Automatic Analysis</h3>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">Run analysis automatically when new cases are added</span>
              </label>
            </div>

            <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Settings</button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Match Details</h2>
              <button onClick={() => setSelectedMatch(null)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              {/* Cases Comparison */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Source Case</h3>
                  <div className="w-20 h-20 bg-gray-200 rounded-lg mx-auto mb-3" />
                  <p className="text-lg font-medium text-center">{selectedMatch.sourceCase.name}</p>
                  <div className="mt-3 text-sm text-gray-600 space-y-1">
                    <p>Age: {selectedMatch.sourceCase.age}</p>
                    <p>Last Seen: {selectedMatch.sourceCase.lastSeenDate}</p>
                    <p>Location: {selectedMatch.sourceCase.lastSeenLocation}</p>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Matched Case</h3>
                  <div className="w-20 h-20 bg-gray-200 rounded-lg mx-auto mb-3" />
                  <p className="text-lg font-medium text-center">{selectedMatch.matchedCase.name}</p>
                  <div className="mt-3 text-sm text-gray-600 space-y-1">
                    <p>Age: {selectedMatch.matchedCase.age}</p>
                    <p>Last Seen: {selectedMatch.matchedCase.lastSeenDate}</p>
                    <p>Location: {selectedMatch.matchedCase.lastSeenLocation}</p>
                  </div>
                </div>
              </div>

              {/* Detailed Factors */}
              <h3 className="font-semibold text-gray-900 mb-3">Similarity Factors</h3>
              <div className="space-y-3 mb-6">
                {selectedMatch.factors.map((factor) => (
                  <div key={factor.name} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">{factor.name}</p>
                      <span className="font-bold text-lg">{factor.score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full ${
                          factor.score >= 80 ? "bg-green-500" : factor.score >= 60 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${factor.score}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600">{factor.description}</p>
                  </div>
                ))}
              </div>

              {selectedMatch.notes && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{selectedMatch.notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Confirm Match
              </button>
              <button className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Investigate
              </button>
              <button className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
