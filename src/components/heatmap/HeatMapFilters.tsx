"use client";

import { useState } from "react";
import type {
  HeatMapFilters,
  LayerVisibility,
  AgeGroupCategory,
  CaseTypeCategory,
  DispositionType,
  ResolutionSource,
  TimeOfDayCategory,
} from "@/types/heatmap.types";

interface HeatMapFiltersProps {
  filters: HeatMapFilters;
  visibleLayers: LayerVisibility;
  onFiltersChange: (filters: HeatMapFilters) => void;
  onLayersChange: (layers: LayerVisibility) => void;
  onApply: () => void;
  onReset: () => void;
  isLoading?: boolean;
}

const AGE_GROUPS: { value: AgeGroupCategory; label: string }[] = [
  { value: "child", label: "Child (0-12)" },
  { value: "teen", label: "Teen (13-17)" },
  { value: "young_adult", label: "Young Adult (18-25)" },
  { value: "adult", label: "Adult (26-64)" },
  { value: "elderly", label: "Elderly (65+)" },
];

const CASE_TYPES: { value: CaseTypeCategory; label: string }[] = [
  { value: "runaway", label: "Runaway" },
  { value: "abduction", label: "Abduction" },
  { value: "dementia_related", label: "Dementia Related" },
  { value: "mental_health", label: "Mental Health" },
  { value: "indigenous", label: "Indigenous" },
];

const DISPOSITIONS: { value: DispositionType; label: string }[] = [
  { value: "found_alive_safe", label: "Found Alive & Safe" },
  { value: "found_alive_injured", label: "Found Alive & Injured" },
  { value: "returned_voluntarily", label: "Returned Voluntarily" },
  { value: "located_runaway", label: "Located (Runaway)" },
  { value: "located_medical_facility", label: "Located at Medical Facility" },
  { value: "located_shelter", label: "Located at Shelter" },
  { value: "found_deceased", label: "Found Deceased" },
];

const SOURCES: { value: ResolutionSource; label: string }[] = [
  { value: "hospital", label: "Hospital" },
  { value: "shelter", label: "Shelter" },
  { value: "police_station", label: "Police Station" },
  { value: "home_address", label: "Home Address" },
  { value: "public_location", label: "Public Location" },
  { value: "school", label: "School" },
  { value: "mental_health_facility", label: "Mental Health Facility" },
];

const TIME_FRAMES: { value: HeatMapFilters["timeFrame"]; label: string }[] = [
  { value: "all", label: "All Times" },
  { value: "day", label: "Daytime (06:00-18:00)" },
  { value: "night", label: "Nighttime (18:00-06:00)" },
];

export function HeatMapFiltersPanel({
  filters,
  visibleLayers,
  onFiltersChange,
  onLayersChange,
  onApply,
  onReset,
  isLoading = false,
}: HeatMapFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAgeGroupToggle = (ageGroup: AgeGroupCategory) => {
    const current = filters.ageGroups || [];
    const updated = current.includes(ageGroup)
      ? current.filter(a => a !== ageGroup)
      : [...current, ageGroup];
    onFiltersChange({ ...filters, ageGroups: updated });
  };

  const handleCaseTypeToggle = (caseType: CaseTypeCategory) => {
    const current = filters.caseTypes || [];
    const updated = current.includes(caseType)
      ? current.filter(c => c !== caseType)
      : [...current, caseType];
    onFiltersChange({ ...filters, caseTypes: updated });
  };

  const handleDispositionToggle = (disposition: DispositionType) => {
    const current = filters.dispositions || [];
    const updated = current.includes(disposition)
      ? current.filter(d => d !== disposition)
      : [...current, disposition];
    onFiltersChange({ ...filters, dispositions: updated });
  };

  const handleSourceToggle = (source: ResolutionSource) => {
    const current = filters.sources || [];
    const updated = current.includes(source)
      ? current.filter(s => s !== source)
      : [...current, source];
    onFiltersChange({ ...filters, sources: updated });
  };

  const handleLayerToggle = (layer: keyof LayerVisibility) => {
    onLayersChange({
      ...visibleLayers,
      [layer]: !visibleLayers[layer],
    });
  };

  const handleDateRangeChange = (field: "startDate" | "endDate", value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value,
      } as HeatMapFilters["dateRange"],
    });
  };

  const hasActiveFilters = () => {
    return (
      (filters.ageGroups?.length || 0) > 0 ||
      (filters.caseTypes?.length || 0) > 0 ||
      (filters.dispositions?.length || 0) > 0 ||
      (filters.sources?.length || 0) > 0 ||
      filters.timeFrame !== "all" ||
      filters.dateRange?.startDate ||
      filters.dateRange?.endDate
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <FilterIcon className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters & Layers</h3>
          {hasActiveFilters() && (
            <span className="px-2 py-0.5 text-xs bg-cyan-100 text-cyan-700 rounded-full">
              Active
            </span>
          )}
        </div>
        <ChevronIcon className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-6">
          {/* Map Layers */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Map Layers</h4>
            <div className="space-y-2">
              <LayerToggle
                label="All Resolutions"
                description="Show heat map of all resolution locations"
                checked={visibleLayers.allResolutions}
                onChange={() => handleLayerToggle("allResolutions")}
              />
              <LayerToggle
                label="By Disposition"
                description="Color by resolution outcome"
                checked={visibleLayers.byDisposition}
                onChange={() => handleLayerToggle("byDisposition")}
              />
              <LayerToggle
                label="By Source"
                description="Color by location type"
                checked={visibleLayers.bySource}
                onChange={() => handleLayerToggle("bySource")}
              />
              <LayerToggle
                label="By Time Pattern"
                description="Show day vs night patterns"
                checked={visibleLayers.byTimePattern}
                onChange={() => handleLayerToggle("byTimePattern")}
              />
              <LayerToggle
                label="By Demographics"
                description="Show age group patterns"
                checked={visibleLayers.byDemographic}
                onChange={() => handleLayerToggle("byDemographic")}
              />
            </div>
          </div>

          {/* Date Range */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Date Range</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.dateRange?.startDate || ""}
                  onChange={(e) => handleDateRangeChange("startDate", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.dateRange?.endDate || ""}
                  onChange={(e) => handleDateRangeChange("endDate", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Time Frame */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Time Frame</h4>
            <select
              value={filters.timeFrame}
              onChange={(e) => onFiltersChange({ ...filters, timeFrame: e.target.value as HeatMapFilters["timeFrame"] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-cyan-500 focus:border-cyan-500"
            >
              {TIME_FRAMES.map(tf => (
                <option key={tf.value} value={tf.value}>{tf.label}</option>
              ))}
            </select>
          </div>

          {/* Age Groups */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Age Groups</h4>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map(ag => (
                <FilterChip
                  key={ag.value}
                  label={ag.label}
                  selected={filters.ageGroups?.includes(ag.value) || false}
                  onClick={() => handleAgeGroupToggle(ag.value)}
                />
              ))}
            </div>
          </div>

          {/* Case Types */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Case Types</h4>
            <div className="flex flex-wrap gap-2">
              {CASE_TYPES.map(ct => (
                <FilterChip
                  key={ct.value}
                  label={ct.label}
                  selected={filters.caseTypes?.includes(ct.value) || false}
                  onClick={() => handleCaseTypeToggle(ct.value)}
                />
              ))}
            </div>
          </div>

          {/* Dispositions */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Dispositions</h4>
            <div className="flex flex-wrap gap-2">
              {DISPOSITIONS.map(d => (
                <FilterChip
                  key={d.value}
                  label={d.label}
                  selected={filters.dispositions?.includes(d.value) || false}
                  onClick={() => handleDispositionToggle(d.value)}
                />
              ))}
            </div>
          </div>

          {/* Sources */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Location Sources</h4>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map(s => (
                <FilterChip
                  key={s.value}
                  label={s.label}
                  selected={filters.sources?.includes(s.value) || false}
                  onClick={() => handleSourceToggle(s.value)}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onApply}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Applying..." : "Apply Filters"}
            </button>
            <button
              onClick={onReset}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function LayerToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative flex items-center justify-center flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div className={`w-5 h-5 rounded border-2 ${checked ? "bg-cyan-600 border-cyan-600" : "border-gray-300 group-hover:border-gray-400"}`}>
          {checked && (
            <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
    </label>
  );
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
        selected
          ? "bg-cyan-100 text-cyan-700 border border-cyan-300"
          : "bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default HeatMapFiltersPanel;
