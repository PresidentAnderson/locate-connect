'use client';

import { useState } from 'react';
import { cn } from '@/lib';
import { MatchReviewDashboard } from '@/components/facial-recognition/MatchReviewDashboard';
import { ConsentManager } from '@/components/facial-recognition/ConsentManager';
import { FRAuditLogViewer } from '@/components/facial-recognition/FRAuditLogViewer';

type Tab = 'overview' | 'matches' | 'consent' | 'audit';

export default function FacialRecognitionPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <ChartIcon className="h-5 w-5" /> },
    { key: 'matches', label: 'Match Review', icon: <FaceIcon className="h-5 w-5" /> },
    { key: 'consent', label: 'Consent', icon: <ShieldIcon className="h-5 w-5" /> },
    { key: 'audit', label: 'Audit Logs', icon: <ClipboardIcon className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facial Recognition</h1>
        <p className="mt-1 text-sm text-gray-500">
          AI-powered facial recognition for matching missing persons with found individuals
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-cyan-500 text-cyan-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'matches' && <MatchReviewDashboard />}
        {activeTab === 'consent' && <ConsentManager />}
        {activeTab === 'audit' && <FRAuditLogViewer />}
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Photos Processed"
          value="2,547"
          change="+12%"
          changeType="positive"
          icon={<PhotoIcon className="h-6 w-6" />}
        />
        <StatCard
          title="Searches Run"
          value="1,234"
          change="+8%"
          changeType="positive"
          icon={<SearchIcon className="h-6 w-6" />}
        />
        <StatCard
          title="Matches Found"
          value="89"
          change="+23%"
          changeType="positive"
          icon={<FaceIcon className="h-6 w-6" />}
        />
        <StatCard
          title="Pending Review"
          value="15"
          change="-5"
          changeType="neutral"
          icon={<ClockIcon className="h-6 w-6" />}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Upload Photos"
            description="Upload new photos for facial recognition"
            href="/facial-recognition/upload"
            icon={<UploadIcon className="h-8 w-8" />}
          />
          <QuickActionCard
            title="New Search"
            description="Initiate a facial recognition search"
            href="/facial-recognition/search"
            icon={<SearchIcon className="h-8 w-8" />}
          />
          <QuickActionCard
            title="Age Progression"
            description="Request age-progressed images"
            href="/facial-recognition/age-progression"
            icon={<ClockIcon className="h-8 w-8" />}
          />
          <QuickActionCard
            title="Review Matches"
            description="Review pending match results"
            href="/facial-recognition/matches"
            icon={<CheckIcon className="h-8 w-8" />}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Matches</h3>
          <div className="space-y-4">
            {[
              { name: 'John Doe', confidence: 94, status: 'pending_review', time: '2 hours ago' },
              { name: 'Jane Smith', confidence: 87, status: 'confirmed', time: '5 hours ago' },
              { name: 'Mike Johnson', confidence: 72, status: 'under_review', time: '1 day ago' },
            ].map((match, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <FaceIcon className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{match.name}</p>
                    <p className="text-xs text-gray-500">{match.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      match.confidence >= 90
                        ? 'bg-green-100 text-green-700'
                        : match.confidence >= 70
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    )}
                  >
                    {match.confidence}%
                  </span>
                  <span
                    className={cn(
                      'px-2 py-1 rounded text-xs',
                      match.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : match.status === 'pending_review'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                    )}
                  >
                    {match.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 text-sm text-cyan-600 hover:text-cyan-700 font-medium">
            View All Matches
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
          <div className="space-y-4">
            <SystemStatusItem
              name="Facial Recognition Service"
              status="operational"
              latency="45ms"
            />
            <SystemStatusItem
              name="Age Progression Service"
              status="operational"
              latency="120ms"
            />
            <SystemStatusItem
              name="Partner Database Sync"
              status="degraded"
              latency="350ms"
            />
            <SystemStatusItem
              name="Bias Testing Pipeline"
              status="operational"
              lastRun="2 hours ago"
            />
          </div>
        </div>
      </div>

      {/* Privacy & Compliance */}
      <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
            <ShieldIcon className="h-6 w-6 text-cyan-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Privacy & Compliance</h3>
            <p className="mt-1 text-sm text-gray-600">
              All facial recognition operations are PIPEDA and GDPR compliant. Consent is verified
              before any biometric processing, and all actions are logged for audit purposes.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="px-3 py-1 bg-white rounded-full text-sm text-cyan-700 border border-cyan-200">
                PIPEDA Compliant
              </span>
              <span className="px-3 py-1 bg-white rounded-full text-sm text-cyan-700 border border-cyan-200">
                GDPR Compliant
              </span>
              <span className="px-3 py-1 bg-white rounded-full text-sm text-cyan-700 border border-cyan-200">
                Bias Testing Active
              </span>
              <span className="px-3 py-1 bg-white rounded-full text-sm text-cyan-700 border border-cyan-200">
                Audit Logging Enabled
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

function StatCard({ title, value, change, changeType, icon }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-600">
          {icon}
        </div>
        <span
          className={cn(
            'text-sm font-medium',
            changeType === 'positive'
              ? 'text-green-600'
              : changeType === 'negative'
              ? 'text-red-600'
              : 'text-gray-500'
          )}
        >
          {change}
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{title}</p>
    </div>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

function QuickActionCard({ title, description, href, icon }: QuickActionCardProps) {
  return (
    <a
      href={href}
      className="block p-4 border border-gray-200 rounded-lg hover:border-cyan-300 hover:shadow-sm transition-all group"
    >
      <div className="text-gray-400 group-hover:text-cyan-600 transition-colors">{icon}</div>
      <h4 className="mt-3 text-sm font-medium text-gray-900 group-hover:text-cyan-700">
        {title}
      </h4>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </a>
  );
}

interface SystemStatusItemProps {
  name: string;
  status: 'operational' | 'degraded' | 'offline';
  latency?: string;
  lastRun?: string;
}

function SystemStatusItem({ name, status, latency, lastRun }: SystemStatusItemProps) {
  const statusConfig = {
    operational: { color: 'bg-green-500', label: 'Operational' },
    degraded: { color: 'bg-yellow-500', label: 'Degraded' },
    offline: { color: 'bg-red-500', label: 'Offline' },
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <span className={cn('h-2.5 w-2.5 rounded-full', statusConfig[status].color)} />
        <span className="text-sm text-gray-700">{name}</span>
      </div>
      <div className="text-xs text-gray-500">
        {latency && <span>{latency}</span>}
        {lastRun && <span>Last run: {lastRun}</span>}
      </div>
    </div>
  );
}

// Icon components
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function FaceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
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

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}
