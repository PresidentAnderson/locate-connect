'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { VerificationQueuePanel } from '@/components/tip-verification/VerificationQueuePanel';
import { VerificationStatsPanel } from '@/components/tip-verification/VerificationStatsPanel';
import { TipsterLeaderboard } from '@/components/tip-verification/TipsterLeaderboard';

interface QueueStats {
  totalPending: number;
  criticalPending: number;
  highPriorityPending: number;
  standardPending: number;
  lowPriorityPending: number;
  slaBreached: number;
}

interface TipVerificationStats {
  totalTips: number;
  verifiedTips: number;
  pendingReviewTips: number;
  rejectedTips: number;
  spamTips: number;
  duplicateTips: number;
  averageCredibilityScore: number;
  averageVerificationTime: string;
  tipsLeadingToLeads: number;
  tipsLeadingToResolutions: number;
}

interface TipsterStats {
  totalTipsters: number;
  verifiedSourceTipsters: number;
  blockedTipsters: number;
  averageReliabilityScore: number;
}

interface StatsData {
  tipVerificationStats: TipVerificationStats;
  queueStats: QueueStats;
  tipsterStats: TipsterStats;
  trends: {
    tipsChange: number;
    credibilityChange: number;
    verificationRateChange: number;
    spamRateChange: number;
  };
}

export default function TipVerificationPage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'stats' | 'tipsters'>('queue');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const response = await fetch('/api/tips/verification/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tip Verification Center</h1>
        <p className="mt-1 text-sm text-gray-500">
          AI-powered tip verification, scoring, and prioritization system
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Review"
          value={stats?.queueStats.totalPending || 0}
          subtext={`${stats?.queueStats.criticalPending || 0} critical`}
          trend={stats?.trends.tipsChange}
          color="cyan"
          isLoading={isLoading}
        />
        <StatCard
          title="Verified Today"
          value={stats?.tipVerificationStats.verifiedTips || 0}
          subtext={`${stats?.tipVerificationStats.averageCredibilityScore || 0}% avg score`}
          trend={stats?.trends.verificationRateChange}
          color="green"
          isLoading={isLoading}
        />
        <StatCard
          title="Spam Detected"
          value={stats?.tipVerificationStats.spamTips || 0}
          subtext={`${stats?.tipVerificationStats.duplicateTips || 0} duplicates`}
          trend={stats?.trends.spamRateChange}
          trendInverse
          color="red"
          isLoading={isLoading}
        />
        <StatCard
          title="Active Tipsters"
          value={stats?.tipsterStats.totalTipsters || 0}
          subtext={`${stats?.tipsterStats.verifiedSourceTipsters || 0} verified sources`}
          color="purple"
          isLoading={isLoading}
        />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('queue')}
            className={cn(
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'queue'
                ? 'border-cyan-500 text-cyan-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Review Queue
            {(stats?.queueStats.totalPending || 0) > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                {stats?.queueStats.totalPending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={cn(
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'stats'
                ? 'border-cyan-500 text-cyan-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('tipsters')}
            className={cn(
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'tipsters'
                ? 'border-cyan-500 text-cyan-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Tipster Management
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'queue' && (
          <VerificationQueuePanel onStatsChange={fetchStats} />
        )}
        {activeTab === 'stats' && (
          <VerificationStatsPanel stats={stats} isLoading={isLoading} />
        )}
        {activeTab === 'tipsters' && (
          <TipsterLeaderboard />
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  subtext: string;
  trend?: number;
  trendInverse?: boolean;
  color: 'cyan' | 'green' | 'red' | 'purple';
  isLoading?: boolean;
}

function StatCard({ title, value, subtext, trend, trendInverse, color, isLoading }: StatCardProps) {
  const colorClasses = {
    cyan: 'bg-cyan-50 text-cyan-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  const trendColor = trend !== undefined
    ? (trendInverse ? trend > 0 : trend >= 0)
      ? (trendInverse ? 'text-red-600' : 'text-green-600')
      : (trendInverse ? 'text-green-600' : 'text-red-600')
    : '';

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
        <div className="h-8 bg-gray-200 rounded w-16 mb-1" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={cn('text-3xl font-semibold', colorClasses[color].split(' ')[1])}>
          {value.toLocaleString()}
        </span>
        {trend !== undefined && (
          <span className={cn('text-sm font-medium', trendColor)}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-500">{subtext}</p>
    </div>
  );
}
