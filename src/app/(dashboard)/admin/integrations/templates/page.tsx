'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  version: string;
  logoUrl?: string;
  rating: number;
  ratingCount: number;
  usageCount: number;
  tags: string[];
  isOfficial: boolean;
  isVerified: boolean;
}

const categoryLabels: Record<string, string> = {
  healthcare: 'Healthcare',
  law_enforcement: 'Law Enforcement',
  government: 'Government',
  transportation: 'Transportation',
  border_services: 'Border Services',
  social_services: 'Social Services',
  communication: 'Communication',
  data_provider: 'Data Provider',
  custom: 'Custom',
};

const categoryIcons: Record<string, string> = {
  healthcare: '🏥',
  law_enforcement: '🚔',
  government: '🏛️',
  transportation: '🚇',
  border_services: '🛂',
  social_services: '🤝',
  communication: '📡',
  data_provider: '📊',
  custom: '🔧',
};

export default function TemplateMarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'usage_count' | 'rating' | 'newest'>('usage_count');

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedCategory) params.set('category', selectedCategory);
      params.set('sort', sortBy);

      const response = await fetch(`/api/integrations/templates?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch templates');
      }

      setTemplates(data.data?.templates || []);
      setCategories(data.data?.categories || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [search, selectedCategory, sortBy]);

  const filteredTemplates = templates;

  if (loading && templates.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/integrations"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integration Templates</h1>
            <p className="text-sm text-gray-500">
              Pre-built integrations ready for one-click setup
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500"
        >
          <option value="usage_count">Most Popular</option>
          <option value="rating">Highest Rated</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            selectedCategory === null
              ? 'bg-cyan-100 text-cyan-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          All ({templates.length})
        </button>
        {Object.entries(categories).map(([category, count]) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              selectedCategory === category
                ? 'bg-cyan-100 text-cyan-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {categoryIcons[category]} {categoryLabels[category] || category} ({count})
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <span className="text-2xl">📦</span>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No templates found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search
              ? 'Try adjusting your search or filters'
              : 'Templates will appear here once they are added'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template }: { template: Template }) {
  return (
    <Link
      href={`/admin/integrations/templates/${template.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-5 hover:border-cyan-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-2xl">
            {template.logoUrl ? (
              <img src={template.logoUrl} alt={template.name} className="h-8 w-8 object-contain" />
            ) : (
              categoryIcons[template.category] || '📦'
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{template.name}</h3>
              {template.isOfficial && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Official
                </span>
              )}
              {template.isVerified && !template.isOfficial && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Verified
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{template.provider}</p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-600 line-clamp-2">{template.description}</p>

      {/* Tags */}
      {template.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="text-xs text-gray-400">+{template.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500 border-t border-gray-100 pt-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <StarIcon className="h-4 w-4 text-yellow-400" />
            {template.rating.toFixed(1)}
            <span className="text-xs">({template.ratingCount})</span>
          </span>
          <span>{template.usageCount.toLocaleString()} installs</span>
        </div>
        <span className="text-xs text-gray-400">v{template.version}</span>
      </div>
    </Link>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
