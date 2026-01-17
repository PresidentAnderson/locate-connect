'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { TipsterProfile, TipsterReliabilityTier } from '@/types/tip-verification.types';

interface TipsterLeaderboardProps {
  initialLimit?: number;
}

export function TipsterLeaderboard({ initialLimit = 20 }: TipsterLeaderboardProps) {
  const [tipsters, setTipsters] = useState<TipsterProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'verified_source' | 'high' | 'blocked'>('all');
  const [sortBy, setSortBy] = useState<'reliability_score' | 'total_tips' | 'verified_tips'>('reliability_score');
  const [selectedTipster, setSelectedTipster] = useState<TipsterProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTipsters();
  }, [filter, sortBy]);

  async function fetchTipsters() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'verified_source' || filter === 'high') {
        params.set('reliabilityTier', filter);
      }
      if (filter === 'blocked') {
        params.set('isBlocked', 'true');
      }
      params.set('sortBy', sortBy);
      params.set('limit', String(initialLimit));

      const response = await fetch(`/api/tips/verification/tipsters?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTipsters(data.tipsters);
      }
    } catch (error) {
      console.error('Failed to fetch tipsters:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTipsterAction(action: 'block' | 'unblock' | 'upgrade_tier' | 'downgrade_tier') {
    if (!selectedTipster) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/tips/verification/tipsters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipsterProfileId: selectedTipster.id,
          action,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the tipster in the list
        setTipsters(prev =>
          prev.map(t => t.id === selectedTipster.id ? data.tipsterProfile : t)
        );
        setSelectedTipster(data.tipsterProfile);
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
    } finally {
      setActionLoading(false);
    }
  }

  const tierColors: Record<TipsterReliabilityTier, string> = {
    verified_source: 'bg-green-100 text-green-800',
    high: 'bg-cyan-100 text-cyan-800',
    moderate: 'bg-yellow-100 text-yellow-800',
    low: 'bg-orange-100 text-orange-800',
    unrated: 'bg-gray-100 text-gray-800',
    new: 'bg-blue-100 text-blue-800',
  };

  const tierLabels: Record<TipsterReliabilityTier, string> = {
    verified_source: 'Verified Source',
    high: 'High',
    moderate: 'Moderate',
    low: 'Low',
    unrated: 'Unrated',
    new: 'New',
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tipster Management</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-32" />
              </div>
              <div className="h-6 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
          >
            <option value="all">All Tipsters</option>
            <option value="verified_source">Verified Sources</option>
            <option value="high">High Reliability</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
          >
            <option value="reliability_score">Reliability Score</option>
            <option value="total_tips">Total Tips</option>
            <option value="verified_tips">Verified Tips</option>
          </select>
        </div>
        <button
          onClick={() => fetchTipsters()}
          className="ml-auto px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Tipster List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="divide-y divide-gray-200">
          {tipsters.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No tipsters found matching the criteria
            </div>
          ) : (
            tipsters.map((tipster, index) => (
              <div
                key={tipster.id}
                onClick={() => setSelectedTipster(tipster)}
                className={cn(
                  'p-4 flex items-center gap-4 cursor-pointer transition-colors',
                  selectedTipster?.id === tipster.id
                    ? 'bg-cyan-50'
                    : 'hover:bg-gray-50',
                  tipster.isBlocked && 'opacity-60'
                )}
              >
                {/* Rank */}
                <div className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0',
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-200 text-gray-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-600'
                )}>
                  {index + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {tipster.email || tipster.phone || `Anonymous (${tipster.anonymousId?.slice(0, 8)}...)`}
                    </span>
                    {tipster.isBlocked && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                        Blocked
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span>{tipster.totalTips} tips</span>
                    <span>{tipster.verifiedTips} verified</span>
                    {tipster.falseTips > 0 && (
                      <span className="text-red-600">{tipster.falseTips} false</span>
                    )}
                  </div>
                </div>

                {/* Reliability */}
                <div className="flex flex-col items-end gap-1">
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded',
                    tierColors[tipster.reliabilityTier]
                  )}>
                    {tierLabels[tipster.reliabilityTier]}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          tipster.reliabilityScore >= 70 ? 'bg-green-500' :
                          tipster.reliabilityScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${tipster.reliabilityScore}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-8">
                      {tipster.reliabilityScore}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Selected Tipster Details */}
      {selectedTipster && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tipster Details</h3>
              <p className="text-sm text-gray-500">
                {selectedTipster.email || selectedTipster.phone || `Anonymous ID: ${selectedTipster.anonymousId}`}
              </p>
            </div>
            <button
              onClick={() => setSelectedTipster(null)}
              className="text-gray-400 hover:text-gray-500"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Total Tips</p>
              <p className="text-xl font-semibold text-gray-900">{selectedTipster.totalTips}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Verified</p>
              <p className="text-xl font-semibold text-green-700">{selectedTipster.verifiedTips}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Partial</p>
              <p className="text-xl font-semibold text-yellow-700">{selectedTipster.partiallyVerifiedTips}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">False</p>
              <p className="text-xl font-semibold text-red-700">{selectedTipster.falseTips}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className={cn(
              'px-3 py-1 text-sm font-medium rounded-full',
              tierColors[selectedTipster.reliabilityTier]
            )}>
              {tierLabels[selectedTipster.reliabilityTier]} - Score: {selectedTipster.reliabilityScore}
            </span>
            {selectedTipster.providesPhotos && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                Provides Photos
              </span>
            )}
            {selectedTipster.providesDetailedInfo && (
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                Detailed Info
              </span>
            )}
          </div>

          {selectedTipster.tipsLeadingToResolution > 0 && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-800">
                This tipster has contributed to {selectedTipster.tipsLeadingToResolution} case resolution(s)!
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
            {selectedTipster.isBlocked ? (
              <button
                onClick={() => handleTipsterAction('unblock')}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Unblock Tipster'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleTipsterAction('upgrade_tier')}
                  disabled={actionLoading || selectedTipster.reliabilityTier === 'verified_source'}
                  className="px-4 py-2 text-sm font-medium text-cyan-700 bg-cyan-100 rounded-md hover:bg-cyan-200 disabled:opacity-50"
                >
                  Upgrade Tier
                </button>
                <button
                  onClick={() => handleTipsterAction('downgrade_tier')}
                  disabled={actionLoading || selectedTipster.reliabilityTier === 'new'}
                  className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-100 rounded-md hover:bg-orange-200 disabled:opacity-50"
                >
                  Downgrade Tier
                </button>
                <button
                  onClick={() => handleTipsterAction('block')}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50"
                >
                  Block Tipster
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
