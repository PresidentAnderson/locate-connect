"use client";

/**
 * Law Enforcement Field Data Entry Form
 * Mobile-optimized form for field investigators
 * LC-FEAT-031: Mobile App Companion - LE Features
 */

import { useState, useCallback, useEffect } from "react";
import { saveFieldData, saveDraftForm, getDraftForm, deleteDraftForm } from "@/lib/pwa/indexeddb";
import { registerBackgroundSync } from "@/lib/pwa/service-worker";

export interface FieldEntry {
  id: string;
  type: FieldEntryType;
  caseId?: string;
  data: Record<string, unknown>;
  location?: { latitude: number; longitude: number };
  attachments?: FieldAttachment[];
  createdAt: number;
  createdBy: string;
}

export type FieldEntryType =
  | "sighting"
  | "witness_interview"
  | "location_check"
  | "vehicle_check"
  | "evidence_log"
  | "status_update"
  | "general_note";

export interface FieldAttachment {
  id: string;
  type: "photo" | "video" | "audio" | "document";
  url: string;
  filename: string;
  capturedAt: number;
}

interface LEFieldDataFormProps {
  caseId?: string;
  entryType?: FieldEntryType;
  officerId: string;
  officerName: string;
  onSubmit: (entry: FieldEntry) => void;
  onCancel?: () => void;
  className?: string;
}

const ENTRY_TYPE_CONFIG: Record<
  FieldEntryType,
  {
    label: string;
    description: string;
    icon: string;
    fields: FieldConfig[];
  }
> = {
  sighting: {
    label: "Sighting Report",
    description: "Report a potential sighting of the missing person",
    icon: "eye",
    fields: [
      { name: "timeObserved", label: "Time Observed", type: "datetime", required: true },
      { name: "exactLocation", label: "Exact Location", type: "location", required: true },
      { name: "description", label: "Description", type: "textarea", required: true, placeholder: "Describe what you observed..." },
      { name: "direction", label: "Direction of Travel", type: "select", options: ["North", "South", "East", "West", "Unknown"] },
      { name: "withOthers", label: "With Other People?", type: "boolean" },
      { name: "othersDescription", label: "Others Description", type: "textarea", dependsOn: "withOthers" },
      { name: "vehicleInvolved", label: "Vehicle Involved?", type: "boolean" },
      { name: "vehicleDescription", label: "Vehicle Description", type: "text", dependsOn: "vehicleInvolved" },
      { name: "confidence", label: "Confidence Level", type: "select", required: true, options: ["High", "Medium", "Low", "Uncertain"] },
    ],
  },
  witness_interview: {
    label: "Witness Interview",
    description: "Document a witness interview",
    icon: "users",
    fields: [
      { name: "witnessName", label: "Witness Name", type: "text", required: true },
      { name: "witnessContact", label: "Contact Information", type: "text" },
      { name: "relationship", label: "Relationship to MP", type: "text" },
      { name: "interviewLocation", label: "Interview Location", type: "location" },
      { name: "summary", label: "Interview Summary", type: "textarea", required: true },
      { name: "keyDetails", label: "Key Details", type: "textarea" },
      { name: "credibility", label: "Credibility Assessment", type: "select", options: ["Highly Credible", "Credible", "Questionable", "Low Credibility"] },
      { name: "followUpNeeded", label: "Follow-up Needed?", type: "boolean" },
      { name: "followUpNotes", label: "Follow-up Notes", type: "textarea", dependsOn: "followUpNeeded" },
    ],
  },
  location_check: {
    label: "Location Check",
    description: "Document a location visit/check",
    icon: "map-pin",
    fields: [
      { name: "location", label: "Location", type: "location", required: true },
      { name: "locationType", label: "Location Type", type: "select", required: true, options: ["Residence", "Workplace", "Known Hangout", "Last Seen Location", "Other"] },
      { name: "timeChecked", label: "Time Checked", type: "datetime", required: true },
      { name: "accessGranted", label: "Access Granted?", type: "boolean" },
      { name: "whoWasPresent", label: "Who Was Present", type: "text" },
      { name: "observations", label: "Observations", type: "textarea", required: true },
      { name: "signsOfMP", label: "Signs of Missing Person?", type: "boolean" },
      { name: "signsDescription", label: "Signs Description", type: "textarea", dependsOn: "signsOfMP" },
      { name: "nextSteps", label: "Recommended Next Steps", type: "textarea" },
    ],
  },
  vehicle_check: {
    label: "Vehicle Check",
    description: "Document a vehicle sighting or check",
    icon: "truck",
    fields: [
      { name: "licensePlate", label: "License Plate", type: "text" },
      { name: "vehicleMake", label: "Make", type: "text", required: true },
      { name: "vehicleModel", label: "Model", type: "text" },
      { name: "vehicleColor", label: "Color", type: "text", required: true },
      { name: "vehicleYear", label: "Year", type: "text" },
      { name: "location", label: "Location Observed", type: "location", required: true },
      { name: "timeObserved", label: "Time Observed", type: "datetime", required: true },
      { name: "occupants", label: "Occupant Description", type: "textarea" },
      { name: "matchesMP", label: "MP Vehicle Match?", type: "boolean" },
      { name: "notes", label: "Additional Notes", type: "textarea" },
    ],
  },
  evidence_log: {
    label: "Evidence Log",
    description: "Document evidence collection",
    icon: "archive",
    fields: [
      { name: "evidenceType", label: "Evidence Type", type: "select", required: true, options: ["Physical Item", "Document", "Digital", "Photo/Video", "Other"] },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "collectionLocation", label: "Collection Location", type: "location", required: true },
      { name: "collectedTime", label: "Collection Time", type: "datetime", required: true },
      { name: "chainOfCustody", label: "Chain of Custody", type: "text", required: true },
      { name: "storageLocation", label: "Storage Location", type: "text" },
      { name: "analysisNeeded", label: "Analysis Needed?", type: "boolean" },
      { name: "analysisType", label: "Analysis Type", type: "text", dependsOn: "analysisNeeded" },
      { name: "notes", label: "Additional Notes", type: "textarea" },
    ],
  },
  status_update: {
    label: "Status Update",
    description: "Quick status update for the case",
    icon: "refresh",
    fields: [
      { name: "status", label: "Current Status", type: "select", required: true, options: ["Active Search", "Investigation Ongoing", "New Lead", "Lead Exhausted", "Awaiting Info", "Escalated"] },
      { name: "summary", label: "Update Summary", type: "textarea", required: true },
      { name: "priorityChange", label: "Priority Change?", type: "boolean" },
      { name: "newPriority", label: "New Priority", type: "select", dependsOn: "priorityChange", options: ["Critical", "High", "Medium", "Low"] },
      { name: "resourcesNeeded", label: "Additional Resources Needed", type: "textarea" },
      { name: "nextAction", label: "Next Planned Action", type: "textarea" },
    ],
  },
  general_note: {
    label: "General Note",
    description: "Add a general note to the case",
    icon: "edit",
    fields: [
      { name: "title", label: "Note Title", type: "text", required: true },
      { name: "content", label: "Content", type: "textarea", required: true },
      { name: "category", label: "Category", type: "select", options: ["Investigation", "Communication", "Planning", "Other"] },
      { name: "priority", label: "Priority", type: "select", options: ["High", "Normal", "Low"] },
      { name: "shareWith", label: "Share With Team?", type: "boolean" },
    ],
  },
};

interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "boolean" | "datetime" | "location" | "number";
  required?: boolean;
  placeholder?: string;
  options?: string[];
  dependsOn?: string;
}

export function LEFieldDataForm({
  caseId,
  entryType = "general_note",
  officerId,
  officerName,
  onSubmit,
  onCancel,
  className = "",
}: LEFieldDataFormProps) {
  const [selectedType, setSelectedType] = useState<FieldEntryType>(entryType);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [attachments, setAttachments] = useState<FieldAttachment[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const config = ENTRY_TYPE_CONFIG[selectedType];

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      const draft = await getDraftForm(selectedType, caseId);
      if (draft) {
        setFormData(draft.data);
        setLastSaved(new Date(draft.lastSavedAt));
      }
    };
    loadDraft();
  }, [selectedType, caseId]);

  // Auto-save draft
  useEffect(() => {
    const saveDraft = async () => {
      if (Object.keys(formData).length > 0) {
        await saveDraftForm(selectedType, formData, caseId);
        setLastSaved(new Date());
      }
    };

    const timer = setTimeout(saveDraft, 2000);
    return () => clearTimeout(timer);
  }, [formData, selectedType, caseId]);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Location error:", error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Handle field change
  const handleFieldChange = (name: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Check if field should be shown
  const shouldShowField = (field: FieldConfig): boolean => {
    if (!field.dependsOn) return true;
    return Boolean(formData[field.dependsOn]);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const entry: FieldEntry = {
        id: `field-${Date.now()}`,
        type: selectedType,
        caseId,
        data: formData,
        location: currentLocation || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        createdAt: Date.now(),
        createdBy: officerId,
      };

      if (isOffline) {
        // Save to IndexedDB for later sync
        await saveFieldData({
          formType: selectedType,
          caseId,
          data: {
            ...formData,
            _officerId: officerId,
            _officerName: officerName,
            _attachments: attachments,
          },
          location: currentLocation || undefined,
        });

        // Register for background sync
        await registerBackgroundSync("sync-field-data");
      }

      // Delete draft after successful submission
      await deleteDraftForm(selectedType, caseId);

      onSubmit(entry);
    } catch (error) {
      console.error("Submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render field input
  const renderField = (field: FieldConfig) => {
    if (!shouldShowField(field)) return null;

    const value = formData[field.name];

    switch (field.type) {
      case "text":
        return (
          <input
            type="text"
            value={(value as string) || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case "textarea":
        return (
          <textarea
            value={(value as string) || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        );

      case "select":
        return (
          <select
            value={(value as string) || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            required={field.required}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select...</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "boolean":
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Yes</span>
          </label>
        );

      case "datetime":
        return (
          <input
            type="datetime-local"
            value={(value as string) || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            required={field.required}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case "location":
        return (
          <div className="flex gap-2">
            <input
              type="text"
              value={(value as string) || (currentLocation ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}` : "")}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder="Enter address or coordinates"
              required={field.required}
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={getCurrentLocation}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        );

      case "number":
        return (
          <input
            type="number"
            value={(value as number) || ""}
            onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Offline indicator */}
      {isOffline && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            <span className="text-sm text-amber-700 dark:text-amber-300">
              Offline mode - data will sync when connected
            </span>
          </div>
        </div>
      )}

      {/* Entry type selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Entry Type
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as FieldEntryType)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {Object.entries(ENTRY_TYPE_CONFIG).map(([type, cfg]) => (
            <option key={type} value={type}>
              {cfg.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {config.description}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {config.fields.map((field) => (
          <div key={field.name} className={shouldShowField(field) ? "" : "hidden"}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field)}
          </div>
        ))}

        {/* Officer info */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Entry by: {officerName} ({officerId})
          </p>
          {lastSaved && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Last saved: {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{isOffline ? "Save Offline" : "Submit"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
