'use client';

import { useState } from 'react';
import { cn } from '@/lib';
import type {
  QueueItemWithDetails,
  ReviewOutcome,
  TipVerification,
} from '@/types/tip-verification.types';

interface TipReviewModalProps {
  item: QueueItemWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function TipReviewModal({ item, isOpen, onClose, onComplete }: TipReviewModalProps) {
  const [outcome, setOutcome] = useState<ReviewOutcome | ''>('');
  const [notes, setNotes] = useState('');
  const [overrideScore, setOverrideScore] = useState<number | undefined>(undefined);
  const [createLead, setCreateLead] = useState(false);
  const [leadTitle, setLeadTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!outcome) {
      setError('Please select an outcome');
      return;
    }

    if (createLead && !leadTitle) {
      setError('Please provide a lead title');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/tips/verification/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId: item.verification?.id || item.tipVerificationId,
          queueItemId: item.id,
          outcome,
          notes,
          overrideScore,
          createLead: createLead && outcome === 'verified',
          leadData: createLead ? { title: leadTitle, description: notes } : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit review');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const verification = item.verification;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle">
          {/* Header */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Review Tip</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Case: {item.case?.firstName} {item.case?.lastName} ({item.case?.caseNumber})
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-500"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Tip Details */}
              <div className="space-y-6">
                {/* Tip Content */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Tip Content</h4>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800">
                    {item.tip?.content}
                  </div>
                </div>

                {/* Location */}
                {item.tip?.location && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Location</h4>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800">
                      <p>{item.tip.location}</p>
                      {item.tip.latitude && item.tip.longitude && (
                        <p className="text-xs text-gray-500 mt-1">
                          Coordinates: {item.tip.latitude.toFixed(6)}, {item.tip.longitude.toFixed(6)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Sighting Date */}
                {item.tip?.sightingDate && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Sighting Date</h4>
                    <p className="text-sm text-gray-800">
                      {new Date(item.tip.sightingDate).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* AI Summary */}
                {verification?.aiSummary && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">AI Analysis Summary</h4>
                    <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                      {verification.aiSummary}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {verification?.aiRecommendations && verification.aiRecommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {verification.aiRecommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column - Verification Details & Actions */}
              <div className="space-y-6">
                {/* Credibility Score */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-700">Credibility Score</h4>
                    <div
                      className={cn(
                        'h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold',
                        (verification?.credibilityScore || 0) >= 70
                          ? 'bg-green-100 text-green-700'
                          : (verification?.credibilityScore || 0) >= 40
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      )}
                    >
                      {verification?.credibilityScore || '?'}
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="space-y-2">
                    <ScoreBar
                      label="Photo"
                      score={verification?.photoVerificationScore}
                    />
                    <ScoreBar
                      label="Location"
                      score={verification?.locationVerificationScore}
                    />
                    <ScoreBar
                      label="Time Plausibility"
                      score={verification?.timePlausibilityScore}
                    />
                    <ScoreBar
                      label="Text Analysis"
                      score={verification?.textAnalysisScore}
                    />
                    <ScoreBar
                      label="Cross-Reference"
                      score={verification?.crossReferenceScore}
                    />
                    <ScoreBar
                      label="Tipster Reliability"
                      score={verification?.tipsterReliabilityScore}
                    />
                  </div>
                </div>

                {/* Warnings */}
                {verification?.hoaxIndicators && verification.hoaxIndicators.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-amber-800 mb-2">Warnings</h4>
                    <ul className="space-y-1">
                      {verification.hoaxIndicators.map((indicator, i) => (
                        <li key={i} className="text-sm text-amber-700 flex items-center gap-2">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          {formatIndicator(indicator)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Duplicate Notice */}
                {verification?.isDuplicate && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-orange-800">Duplicate Detected</h4>
                    <p className="text-sm text-orange-600 mt-1">
                      This tip is similar to existing tip(s) in the system.
                    </p>
                  </div>
                )}

                {/* Review Form */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Your Review</h4>

                  {/* Outcome Selection */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { value: 'verified', label: 'Verify', color: 'green' },
                      { value: 'rejected', label: 'Reject', color: 'red' },
                      { value: 'needs_more_info', label: 'Need More Info', color: 'yellow' },
                      { value: 'escalated', label: 'Escalate', color: 'purple' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setOutcome(option.value as ReviewOutcome)}
                        className={cn(
                          'px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                          outcome === option.value
                            ? option.color === 'green'
                              ? 'bg-green-100 border-green-500 text-green-700'
                              : option.color === 'red'
                              ? 'bg-red-100 border-red-500 text-red-700'
                              : option.color === 'yellow'
                              ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
                              : 'bg-purple-100 border-purple-500 text-purple-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {/* Override Score */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Override Score (optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={overrideScore ?? ''}
                      onChange={(e) => setOverrideScore(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      placeholder="Leave empty to keep AI score"
                      className="w-full rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                    />
                  </div>

                  {/* Notes */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Review Notes
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any relevant notes about this review..."
                      className="w-full rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                    />
                  </div>

                  {/* Create Lead Option */}
                  {outcome === 'verified' && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={createLead}
                          onChange={(e) => setCreateLead(e.target.checked)}
                          className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Create a lead from this tip
                        </span>
                      </label>

                      {createLead && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Lead Title
                          </label>
                          <input
                            type="text"
                            value={leadTitle}
                            onChange={(e) => setLeadTitle(e.target.value)}
                            placeholder="e.g., Possible sighting at downtown mall"
                            className="w-full rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !outcome}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 border border-transparent rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score?: number }) {
  const displayScore = score ?? 0;
  const barColor =
    displayScore >= 70 ? 'bg-green-500' :
    displayScore >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-gray-600">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${displayScore}%` }}
        />
      </div>
      <span className="w-8 text-right text-gray-700 font-medium">
        {score !== undefined ? score : '-'}
      </span>
    </div>
  );
}

function formatIndicator(indicator: string): string {
  const labels: Record<string, string> = {
    known_scam_pattern: 'Known scam pattern detected',
    suspicious_metadata: 'Suspicious photo metadata',
    impossible_timeline: 'Timeline is impossible',
    conflicting_location: 'Location conflicts with evidence',
    repeated_false_reports: 'Tipster has history of false reports',
    spam_signature: 'Spam signature detected',
    ai_generated_content: 'AI-generated content suspected',
    stock_photo_detected: 'Stock photo detected',
  };
  return labels[indicator] || indicator;
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}
