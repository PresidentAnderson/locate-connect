"use client";

import { useState } from "react";
import type {
  HeatMapInsights,
  ResolutionPattern,
  PredictiveSuggestion,
  InsightPattern,
  DistanceInsight,
  TemporalInsight,
  SourceInsight,
} from "@/types/heatmap.types";

interface InsightsPanelProps {
  insights: HeatMapInsights;
  patterns: ResolutionPattern[];
  suggestions: PredictiveSuggestion[];
  isLoading?: boolean;
}

type TabType = "overview" | "patterns" | "distance" | "suggestions";

export function InsightsPanel({
  insights,
  patterns,
  suggestions,
  isLoading = false,
}: InsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  if (isLoading) {
    return <InsightsSkeleton />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <InsightIcon className="w-5 h-5 text-cyan-600" />
          <h3 className="font-semibold text-gray-900">Insights & Patterns</h3>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Analysis of {insights.totalResolutions.toLocaleString()} resolution locations
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <TabButton
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            label="Overview"
          />
          <TabButton
            active={activeTab === "patterns"}
            onClick={() => setActiveTab("patterns")}
            label="Patterns"
            count={patterns.length}
          />
          <TabButton
            active={activeTab === "distance"}
            onClick={() => setActiveTab("distance")}
            label="Distance"
          />
          <TabButton
            active={activeTab === "suggestions"}
            onClick={() => setActiveTab("suggestions")}
            label="Suggestions"
            count={suggestions.length}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {activeTab === "overview" && (
          <OverviewTab insights={insights} />
        )}
        {activeTab === "patterns" && (
          <PatternsTab patterns={patterns} topPatterns={insights.topPatterns} />
        )}
        {activeTab === "distance" && (
          <DistanceTab distanceInsights={insights.distanceInsights} />
        )}
        {activeTab === "suggestions" && (
          <SuggestionsTab suggestions={suggestions} />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Tab Components
// =============================================================================

function OverviewTab({ insights }: { insights: HeatMapInsights }) {
  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Total Resolutions"
          value={insights.totalResolutions.toLocaleString()}
          icon={<LocationIcon className="w-5 h-5 text-cyan-600" />}
        />
        <StatCard
          label="Patterns Found"
          value={insights.topPatterns.length.toString()}
          icon={<PatternIcon className="w-5 h-5 text-purple-600" />}
        />
      </div>

      {/* Top Patterns */}
      {insights.topPatterns.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Key Findings</h4>
          <div className="space-y-3">
            {insights.topPatterns.slice(0, 5).map((pattern, index) => (
              <InsightCard key={index} pattern={pattern} />
            ))}
          </div>
        </div>
      )}

      {/* Temporal Distribution */}
      {insights.temporalInsights.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Time Distribution</h4>
          <div className="space-y-2">
            {insights.temporalInsights.map((t, index) => (
              <BarStat
                key={index}
                label={formatTimeOfDay(t.timeOfDay)}
                value={t.count}
                percentage={t.percentage}
                color="cyan"
              />
            ))}
          </div>
        </div>
      )}

      {/* Source Distribution */}
      {insights.sourceInsights.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Location Sources</h4>
          <div className="space-y-2">
            {insights.sourceInsights.slice(0, 5).map((s, index) => (
              <BarStat
                key={index}
                label={formatSource(s.source)}
                value={s.count}
                percentage={s.percentage}
                color="purple"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PatternsTab({
  patterns,
  topPatterns,
}: {
  patterns: ResolutionPattern[];
  topPatterns: InsightPattern[];
}) {
  if (patterns.length === 0 && topPatterns.length === 0) {
    return (
      <EmptyState
        icon={<PatternIcon className="w-8 h-8 text-gray-400" />}
        title="No patterns found"
        description="Apply different filters or expand your date range to discover patterns."
      />
    );
  }

  return (
    <div className="space-y-4">
      {patterns.map((pattern) => (
        <PatternCard key={pattern.id} pattern={pattern} />
      ))}
      {patterns.length === 0 && topPatterns.map((pattern, index) => (
        <InsightCard key={index} pattern={pattern} />
      ))}
    </div>
  );
}

function DistanceTab({ distanceInsights }: { distanceInsights: DistanceInsight[] }) {
  if (distanceInsights.length === 0) {
    return (
      <EmptyState
        icon={<DistanceIcon className="w-8 h-8 text-gray-400" />}
        title="No distance data"
        description="Distance insights require resolved cases with location data."
      />
    );
  }

  return (
    <div className="space-y-4">
      {distanceInsights.map((insight, index) => (
        <DistanceCard key={index} insight={insight} />
      ))}

      {/* Summary */}
      <div className="p-4 bg-cyan-50 rounded-lg">
        <h5 className="text-sm font-medium text-cyan-800 mb-2">Key Takeaway</h5>
        <p className="text-sm text-cyan-700">
          Based on the data, most cases are resolved within 10-25km of the last seen location.
          Focus initial search efforts in this radius for optimal results.
        </p>
      </div>
    </div>
  );
}

function SuggestionsTab({ suggestions }: { suggestions: PredictiveSuggestion[] }) {
  if (suggestions.length === 0) {
    return (
      <EmptyState
        icon={<SuggestionIcon className="w-8 h-8 text-gray-400" />}
        title="No suggestions available"
        description="Suggestions are generated when sufficient pattern data is available."
      />
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.map((suggestion) => (
        <SuggestionCard key={suggestion.id} suggestion={suggestion} />
      ))}
    </div>
  );
}

// =============================================================================
// Card Components
// =============================================================================

function InsightCard({ pattern }: { pattern: InsightPattern }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h5 className="text-sm font-medium text-gray-900">{pattern.title}</h5>
          <p className="text-xs text-gray-600 mt-1">{pattern.description}</p>
        </div>
        <ConfidenceBadge level={pattern.confidenceLevel} />
      </div>
      {pattern.percentage !== undefined && (
        <div className="mt-2">
          <ProgressBar value={pattern.percentage} color="cyan" />
        </div>
      )}
    </div>
  );
}

function PatternCard({ pattern }: { pattern: ResolutionPattern }) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getPatternTypeColor(pattern.patternType)}`}>
            {pattern.patternType}
          </span>
          <h5 className="text-sm font-medium text-gray-900 mt-1">{pattern.patternName}</h5>
        </div>
        <ConfidenceBadge level={pattern.confidenceLevel} />
      </div>
      <p className="text-xs text-gray-600">{pattern.patternDescription}</p>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span>Sample: {pattern.sampleSize}</span>
        {pattern.ageGroup && <span>Age: {formatAgeGroup(pattern.ageGroup)}</span>}
      </div>
    </div>
  );
}

function DistanceCard({ insight }: { insight: DistanceInsight }) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-medium text-gray-900">
          {formatAgeGroup(insight.ageGroup)}
        </h5>
        <span className="text-xs text-gray-500">
          {insight.sampleSize} cases
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-lg font-bold text-gray-900">{insight.avgDistanceKm}km</div>
          <div className="text-xs text-gray-500">Avg Distance</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-lg font-bold text-gray-900">{insight.medianDistanceKm}km</div>
          <div className="text-xs text-gray-500">Median Distance</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-gray-600 font-medium">Within radius:</div>
        <BarStat label="5km" value={insight.withinRadiusPercentages.radius5km} percentage={insight.withinRadiusPercentages.radius5km} color="green" showValue={false} />
        <BarStat label="10km" value={insight.withinRadiusPercentages.radius10km} percentage={insight.withinRadiusPercentages.radius10km} color="cyan" showValue={false} />
        <BarStat label="25km" value={insight.withinRadiusPercentages.radius25km} percentage={insight.withinRadiusPercentages.radius25km} color="purple" showValue={false} />
        <BarStat label="50km" value={insight.withinRadiusPercentages.radius50km} percentage={insight.withinRadiusPercentages.radius50km} color="gray" showValue={false} />
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: PredictiveSuggestion }) {
  return (
    <div className="p-4 border border-cyan-200 bg-cyan-50 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-cyan-100 rounded-full">
          <SuggestionIcon className="w-4 h-4 text-cyan-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h5 className="text-sm font-medium text-gray-900">{suggestion.suggestionTitle}</h5>
            <ConfidenceBadge level={suggestion.confidenceScore} />
          </div>
          <p className="text-xs text-gray-600 mt-1">{suggestion.suggestionDescription}</p>

          {suggestion.appliesToAgeGroup && suggestion.appliesToAgeGroup.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {suggestion.appliesToAgeGroup.map((ag) => (
                <span key={ag} className="px-2 py-0.5 text-xs bg-white text-gray-600 rounded-full border border-gray-200">
                  {formatAgeGroup(ag)}
                </span>
              ))}
            </div>
          )}

          {suggestion.successRate > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              Success rate: {Math.round(suggestion.successRate * 100)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-cyan-600 text-cyan-600"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${active ? "bg-cyan-100 text-cyan-700" : "bg-gray-100 text-gray-600"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function BarStat({
  label,
  value,
  percentage,
  color,
  showValue = true,
}: {
  label: string;
  value: number;
  percentage: number;
  color: "cyan" | "purple" | "green" | "gray";
  showValue?: boolean;
}) {
  const colorClasses = {
    cyan: "bg-cyan-500",
    purple: "bg-purple-500",
    green: "bg-green-500",
    gray: "bg-gray-400",
  };

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs text-gray-600 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} rounded-full transition-all`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      <span className="w-12 text-xs text-gray-600 text-right">
        {showValue ? value : `${Math.round(percentage)}%`}
      </span>
    </div>
  );
}

function ProgressBar({
  value,
  color,
}: {
  value: number;
  color: "cyan" | "purple" | "green";
}) {
  const colorClasses = {
    cyan: "bg-cyan-500",
    purple: "bg-purple-500",
    green: "bg-green-500",
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} rounded-full`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="text-xs text-gray-600">{Math.round(value)}%</span>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: number }) {
  const getColor = () => {
    if (level >= 0.8) return "bg-green-100 text-green-700";
    if (level >= 0.6) return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getColor()}`}>
      {Math.round(level * 100)}%
    </span>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-8">
      <div className="flex justify-center mb-3">{icon}</div>
      <h5 className="text-sm font-medium text-gray-900 mb-1">{title}</h5>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatTimeOfDay(time: string): string {
  const map: Record<string, string> = {
    early_morning: "Early Morning",
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
  };
  return map[time] || time;
}

function formatSource(source: string): string {
  return source.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatAgeGroup(ageGroup: string): string {
  const map: Record<string, string> = {
    child: "Child",
    teen: "Teen",
    young_adult: "Young Adult",
    adult: "Adult",
    elderly: "Elderly",
  };
  return map[ageGroup] || ageGroup;
}

function getPatternTypeColor(type: string): string {
  const colors: Record<string, string> = {
    distance: "bg-blue-100 text-blue-700",
    time: "bg-orange-100 text-orange-700",
    source: "bg-purple-100 text-purple-700",
    demographic: "bg-green-100 text-green-700",
    correlation: "bg-cyan-100 text-cyan-700",
  };
  return colors[type] || "bg-gray-100 text-gray-700";
}

// =============================================================================
// Icons
// =============================================================================

function InsightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PatternIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  );
}

function DistanceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function SuggestionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

export default InsightsPanel;
