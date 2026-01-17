'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib';
import type {
  FaceMatchWithDetails,
  FaceMatchStatus,
  MatchReviewDecision,
  ComparisonPoint,
} from '@/types/facial-recognition.types';
import { FACE_MATCH_STATUS_LABELS } from '@/types/facial-recognition.types';

interface MatchReviewDashboardProps {
  caseId?: string;
  initialFilters?: MatchFilters;
}

interface MatchFilters {
  status?: FaceMatchStatus;
  minConfidence?: number;
  pendingReviewOnly?: boolean;
}

export function MatchReviewDashboard({ caseId, initialFilters }: MatchReviewDashboardProps) {
  const [matches, setMatches] = useState<FaceMatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MatchFilters>(initialFilters || { pendingReviewOnly: true });
  const [selectedMatch, setSelectedMatch] = useState<FaceMatchWithDetails | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (caseId) params.set('caseId', caseId);
      if (filters.status) params.set('status', filters.status);
      if (filters.minConfidence) params.set('minConfidence', filters.minConfidence.toString());
      if (filters.pendingReviewOnly) params.set('pendingReview', 'true');
      params.set('limit', limit.toString());
      params.set('offset', (page * limit).toString());

      const response = await fetch(`/api/facial-recognition/matches?${params}`);
      if (!response.ok) throw new Error('Failed to fetch matches');

      const data = await response.json();
      setMatches(data.data);
      setTotal(data.meta.total);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  }, [caseId, filters, page]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleStatusChange = (status: FaceMatchStatus | 'all') => {
    setFilters((prev) => ({
      ...prev,
      status: status === 'all' ? undefined : status,
      pendingReviewOnly: false,
    }));
    setPage(0);
  };

  const handleReviewComplete = () => {
    setSelectedMatch(null);
    fetchMatches();
  };

  const pendingCount = matches.filter(
    (m) => m.status === 'pending_review' || m.status === 'under_review'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Match Review Queue</h2>
          <p className="text-sm text-gray-500 mt-1">
            {pendingCount} matches pending review
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Confidence Filter */}
          <select
            value={filters.minConfidence || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                minConfidence: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
            className="rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
          >
            <option value="">All Confidence</option>
            <option value="90">90%+ High</option>
            <option value="70">70%+ Medium</option>
            <option value="50">50%+ Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status || (filters.pendingReviewOnly ? 'pending' : 'all')}
            onChange={(e) => handleStatusChange(e.target.value as FaceMatchStatus | 'all')}
            className="rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
          >
            <option value="pending">Pending Review</option>
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
            <option value="false_positive">False Positives</option>
          </select>
        </div>
      </div>

      {/* Match Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner className="h-8 w-8 text-cyan-600" />
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FaceIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">No matches found</p>
          <p className="text-sm text-gray-500">
            {filters.pendingReviewOnly
              ? 'All matches have been reviewed'
              : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onClick={() => setSelectedMatch(match)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} matches
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * limit >= total}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedMatch && (
        <MatchReviewModal
          match={selectedMatch}
          isOpen={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onComplete={handleReviewComplete}
        />
      )}
    </div>
  );
}

interface MatchCardProps {
  match: FaceMatchWithDetails;
  onClick: () => void;
}

function MatchCard({ match, onClick }: MatchCardProps) {
  const statusConfig = FACE_MATCH_STATUS_LABELS[match.status];

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Photo Comparison */}
      <div className="flex h-32">
        <div className="w-1/2 bg-gray-100 relative">
          {match.sourcePhoto?.fileUrl ? (
            <img
              src={match.sourcePhoto.fileUrl}
              alt="Source"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <PhotoIcon className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
            Source
          </span>
        </div>
        <div className="w-1/2 bg-gray-100 relative border-l border-gray-200">
          {match.matchedPhoto?.fileUrl || match.externalPhotoUrl ? (
            <img
              src={match.matchedPhoto?.fileUrl || match.externalPhotoUrl}
              alt="Match"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <PhotoIcon className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
            Match
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <ConfidenceScore score={match.confidenceScore} />
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              statusConfig.bgColor,
              statusConfig.color
            )}
          >
            {statusConfig.label}
          </span>
        </div>

        {match.matchedCase && (
          <div className="text-sm">
            <p className="font-medium text-gray-900">
              {match.matchedCase.firstName} {match.matchedCase.lastName}
            </p>
            <p className="text-xs text-gray-500">{match.matchedCase.caseNumber}</p>
          </div>
        )}

        {match.externalSource && (
          <p className="text-xs text-gray-500">
            Source: {match.externalSource}
          </p>
        )}

        <p className="text-xs text-gray-400">
          {new Date(match.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

interface ConfidenceScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

function ConfidenceScore({ score, size = 'sm' }: ConfidenceScoreProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-12 w-12 text-lg',
    lg: 'h-16 w-16 text-xl',
  };

  const colorClasses =
    score >= 90
      ? 'bg-green-100 text-green-700 border-green-200'
      : score >= 70
      ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
      : 'bg-red-100 text-red-700 border-red-200';

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold border',
        sizeClasses[size],
        colorClasses
      )}
    >
      {score}%
    </div>
  );
}

interface MatchReviewModalProps {
  match: FaceMatchWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

function MatchReviewModal({ match, isOpen, onClose, onComplete }: MatchReviewModalProps) {
  const [decision, setDecision] = useState<MatchReviewDecision | ''>('');
  const [confidenceLevel, setConfidenceLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const [notes, setNotes] = useState('');
  const [comparisonPoints, setComparisonPoints] = useState<ComparisonPoint[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!decision) {
      setError('Please select a decision');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Determine status based on decision
      let newStatus: FaceMatchStatus;
      let reviewOutcome: 'match' | 'no_match' | 'possible_match';

      switch (decision) {
        case 'confirm_match':
          newStatus = 'confirmed';
          reviewOutcome = 'match';
          break;
        case 'reject_match':
          newStatus = 'rejected';
          reviewOutcome = 'no_match';
          break;
        case 'needs_investigation':
          newStatus = 'inconclusive';
          reviewOutcome = 'possible_match';
          break;
        case 'escalate':
          newStatus = 'under_review';
          reviewOutcome = 'possible_match';
          break;
        default:
          newStatus = 'under_review';
          reviewOutcome = 'possible_match';
      }

      const response = await fetch('/api/facial-recognition/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          status: newStatus,
          reviewNotes: notes,
          reviewOutcome,
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
  };

  const handleMarkFalsePositive = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/facial-recognition/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          markedAsFalsePositive: true,
          falsePositiveReason: notes || 'Marked during review',
        }),
      });

      if (!response.ok) throw new Error('Failed to mark as false positive');
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as false positive');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Review Match</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <XIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Photo Comparison */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Photo Comparison</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Source Photo</p>
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {match.sourcePhoto?.fileUrl ? (
                        <img
                          src={match.sourcePhoto.fileUrl}
                          alt="Source"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <PhotoIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-2">Matched Photo</p>
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {match.matchedPhoto?.fileUrl || match.externalPhotoUrl ? (
                        <img
                          src={match.matchedPhoto?.fileUrl || match.externalPhotoUrl}
                          alt="Match"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <PhotoIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Confidence Score</span>
                    <ConfidenceScore score={match.confidenceScore} size="md" />
                  </div>

                  {match.similarityScore && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Similarity</span>
                      <span className="font-medium">{(match.similarityScore * 100).toFixed(2)}%</span>
                    </div>
                  )}

                  {match.estimatedAgeRange && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Estimated Age</span>
                      <span className="font-medium">
                        {match.estimatedAgeRange.min}-{match.estimatedAgeRange.max} years
                      </span>
                    </div>
                  )}

                  {match.matchedCase && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {match.matchedCase.firstName} {match.matchedCase.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Case: {match.matchedCase.caseNumber} ({match.matchedCase.status})
                      </p>
                    </div>
                  )}

                  {match.externalSource && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-600">External Source</p>
                      <p className="font-medium">{match.externalSource}</p>
                      {match.externalReferenceId && (
                        <p className="text-xs text-gray-500">Ref: {match.externalReferenceId}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Review Form */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Your Review</h4>

                {/* Decision */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decision
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'confirm_match', label: 'Confirm Match', color: 'green' },
                      { value: 'reject_match', label: 'Not a Match', color: 'red' },
                      { value: 'needs_investigation', label: 'Needs Investigation', color: 'yellow' },
                      { value: 'escalate', label: 'Escalate', color: 'purple' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setDecision(option.value as MatchReviewDecision)}
                        className={cn(
                          'px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                          decision === option.value
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
                </div>

                {/* Confidence Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Confidence Level
                  </label>
                  <div className="flex gap-2">
                    {(['high', 'medium', 'low'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setConfidenceLevel(level)}
                        className={cn(
                          'flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors capitalize',
                          confidenceLevel === level
                            ? 'bg-cyan-100 border-cyan-500 text-cyan-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Notes
                  </label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add observations, comparison notes, or reasons for your decision..."
                    className="w-full rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                {/* False Positive Option */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleMarkFalsePositive}
                    disabled={isSubmitting}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Mark as False Positive (for AI training)
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !decision}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon components
function FaceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
    </svg>
  );
}

function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
