'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib';
import type {
  QueueItemWithDetails,
  QueueType,
  TipPriorityBucket,
} from '@/types/tip-verification.types';
import { TipReviewModal } from './TipReviewModal';

interface VerificationQueuePanelProps {
  onStatsChange?: () => void;
}

export function VerificationQueuePanel({ onStatsChange }: VerificationQueuePanelProps) {
  const [items, setItems] = useState<QueueItemWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<QueueType | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<QueueItemWithDetails | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, [selectedFilter]);

  async function fetchQueue() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFilter !== 'all') {
        params.set('queueType', selectedFilter);
      }
      params.set('status', 'pending');
      params.set('limit', '50');

      const response = await fetch(`/api/tips/verification/queue?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClaimItem(itemId: string) {
    try {
      const response = await fetch('/api/tips/verification/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueItemId: itemId, action: 'claim' }),
      });

      if (response.ok) {
        const data = await response.json();
        // Find and update the item in the list
        setItems(prev =>
          prev.map(item =>
            item.id === itemId
              ? { ...item, ...data.queueItem, status: 'in_review' }
              : item
          )
        );
        // Open review modal
        const claimedItem = items.find(i => i.id === itemId);
        if (claimedItem) {
          setSelectedItem({ ...claimedItem, status: 'in_review' });
          setIsReviewModalOpen(true);
        }
      }
    } catch (error) {
      console.error('Failed to claim item:', error);
    }
  }

  function handleReviewComplete() {
    setIsReviewModalOpen(false);
    setSelectedItem(null);
    fetchQueue();
    onStatsChange?.();
  }

  const priorityColors: Record<TipPriorityBucket, string> = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200',
    spam: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const queueTypeLabels: Record<QueueType, string> = {
    critical: 'Critical',
    high_priority: 'High Priority',
    standard: 'Standard',
    low_priority: 'Low Priority',
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Filter:</span>
        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value as QueueType | 'all')}
          className="rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
        >
          <option value="all">All Queues</option>
          <option value="critical">Critical</option>
          <option value="high_priority">High Priority</option>
          <option value="standard">Standard</option>
          <option value="low_priority">Low Priority</option>
        </select>
        <button
          onClick={() => fetchQueue()}
          className="ml-auto inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshIcon className="h-4 w-4 mr-1.5" />
          Refresh
        </button>
      </div>

      {/* Queue Items */}
      {items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Queue is empty</h3>
          <p className="mt-2 text-sm text-gray-500">
            All tips have been reviewed. Great work!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:border-cyan-300 transition-colors',
                item.slaBreached && 'border-red-300 bg-red-50'
              )}
            >
              <div className="flex items-start gap-4">
                {/* Case Photo */}
                <div className="flex-shrink-0">
                  {item.case?.primaryPhotoUrl ? (
                    <img
                      src={item.case.primaryPhotoUrl}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                      <UserIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {item.case?.firstName} {item.case?.lastName}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {item.case?.caseNumber}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
                            item.verification?.priorityBucket
                              ? priorityColors[item.verification.priorityBucket]
                              : 'bg-gray-100 text-gray-800'
                          )}
                        >
                          {item.verification?.priorityBucket || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {queueTypeLabels[item.queueType]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {item.tip?.content}
                      </p>
                    </div>

                    {/* Credibility Score */}
                    <div className="flex-shrink-0 text-center">
                      <div
                        className={cn(
                          'h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold',
                          (item.verification?.credibilityScore || 0) >= 70
                            ? 'bg-green-100 text-green-700'
                            : (item.verification?.credibilityScore || 0) >= 40
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        )}
                      >
                        {item.verification?.credibilityScore || '?'}
                      </div>
                      <span className="text-xs text-gray-500">Score</span>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    {item.tip?.location && (
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="h-3.5 w-3.5" />
                        {item.tip.location}
                      </span>
                    )}
                    {item.tip?.sightingDate && (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {new Date(item.tip.sightingDate).toLocaleDateString()}
                      </span>
                    )}
                    {item.tip?.isAnonymous && (
                      <span className="flex items-center gap-1">
                        <EyeSlashIcon className="h-3.5 w-3.5" />
                        Anonymous
                      </span>
                    )}
                    {item.tip?.attachmentsCount > 0 && (
                      <span className="flex items-center gap-1">
                        <PhotoIcon className="h-3.5 w-3.5" />
                        {item.tip.attachmentsCount} photo(s)
                      </span>
                    )}
                    {item.slaBreached && (
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <ExclamationIcon className="h-3.5 w-3.5" />
                        SLA Breached
                      </span>
                    )}
                    {item.slaDeadline && !item.slaBreached && (
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-3.5 w-3.5" />
                        Due: {formatTimeRemaining(item.slaDeadline)}
                      </span>
                    )}
                  </div>

                  {/* Warnings */}
                  {item.verification?.hoaxIndicators && item.verification.hoaxIndicators.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                      <span className="text-xs text-amber-600">
                        {item.verification.hoaxIndicators.length} warning(s) detected
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => handleClaimItem(item.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                    >
                      Claim & Review
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setIsReviewModalOpen(true);
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {isReviewModalOpen && selectedItem && (
        <TipReviewModal
          item={selectedItem}
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedItem(null);
          }}
          onComplete={handleReviewComplete}
        />
      )}
    </div>
  );
}

function formatTimeRemaining(deadline: string): string {
  const now = new Date();
  const due = new Date(deadline);
  const diffMs = due.getTime() - now.getTime();

  if (diffMs < 0) return 'Overdue';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Icon components
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function EyeSlashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
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

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
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
