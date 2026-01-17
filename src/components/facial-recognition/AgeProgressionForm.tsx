'use client';

import { useState } from 'react';
import { cn } from '@/lib';
import type {
  PhotoSubmission,
  AgeProgressionRequest,
  AgeProgressionVariationParams,
} from '@/types/facial-recognition.types';

interface AgeProgressionFormProps {
  caseId: string;
  availablePhotos: PhotoSubmission[];
  onSubmit?: (request: AgeProgressionRequest) => void;
  onCancel?: () => void;
}

export function AgeProgressionForm({
  caseId,
  availablePhotos,
  onSubmit,
  onCancel,
}: AgeProgressionFormProps) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>('');
  const [sourceAge, setSourceAge] = useState<number | ''>('');
  const [targetAges, setTargetAges] = useState<number[]>([]);
  const [newTargetAge, setNewTargetAge] = useState<number | ''>('');
  const [includeVariations, setIncludeVariations] = useState(false);
  const [variationParams, setVariationParams] = useState<AgeProgressionVariationParams>({
    hairStyles: [],
    facialHair: false,
    weightRange: undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qualityPhotos = availablePhotos.filter(
    (p) => p.hasFaceDetected && p.qualityGrade !== 'poor' && p.qualityGrade !== 'unusable'
  );

  const handleAddTargetAge = () => {
    if (
      newTargetAge !== '' &&
      newTargetAge > (sourceAge || 0) &&
      !targetAges.includes(newTargetAge) &&
      targetAges.length < 5
    ) {
      setTargetAges([...targetAges, newTargetAge].sort((a, b) => a - b));
      setNewTargetAge('');
    }
  };

  const handleRemoveTargetAge = (age: number) => {
    setTargetAges(targetAges.filter((a) => a !== age));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPhotoId) {
      setError('Please select a source photo');
      return;
    }

    if (sourceAge === '' || sourceAge < 0) {
      setError('Please enter a valid source age');
      return;
    }

    if (targetAges.length === 0) {
      setError('Please add at least one target age');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/facial-recognition/age-progression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          sourcePhotoId: selectedPhotoId,
          sourceAge,
          targetAges,
          includeVariations,
          variationParameters: includeVariations ? variationParams : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      const result = await response.json();
      onSubmit?.(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPhoto = qualityPhotos.find((p) => p.id === selectedPhotoId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Photo Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Source Photo
        </label>

        {qualityPhotos.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <PhotoIcon className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">No suitable photos available</p>
            <p className="text-xs text-gray-500">
              Please upload a clear photo with a visible face
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {qualityPhotos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelectedPhotoId(photo.id)}
                className={cn(
                  'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                  selectedPhotoId === photo.id
                    ? 'border-cyan-500 ring-2 ring-cyan-500/50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <img
                  src={photo.fileUrl}
                  alt="Source"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      photo.qualityGrade === 'excellent' || photo.qualityGrade === 'good'
                        ? 'bg-green-500 text-white'
                        : 'bg-yellow-500 text-white'
                    )}
                  >
                    {photo.qualityGrade}
                  </span>
                </div>
                {selectedPhotoId === photo.id && (
                  <div className="absolute top-2 right-2">
                    <CheckIcon className="h-5 w-5 text-cyan-500 bg-white rounded-full" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Source Age */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Age in Source Photo
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="120"
            value={sourceAge}
            onChange={(e) => setSourceAge(e.target.value ? parseInt(e.target.value) : '')}
            placeholder="Enter age"
            className="w-32 rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
          />
          <span className="text-sm text-gray-500">years old</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Enter the age of the person when this photo was taken
        </p>
      </div>

      {/* Target Ages */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Ages (up to 5)
        </label>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            min={(sourceAge || 0) + 1}
            max="120"
            value={newTargetAge}
            onChange={(e) => setNewTargetAge(e.target.value ? parseInt(e.target.value) : '')}
            placeholder="Add age"
            disabled={targetAges.length >= 5}
            className="w-32 rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleAddTargetAge}
            disabled={
              newTargetAge === '' ||
              newTargetAge <= (sourceAge || 0) ||
              targetAges.length >= 5
            }
            className="px-3 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>

        {targetAges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {targetAges.map((age) => (
              <span
                key={age}
                className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm"
              >
                {age} years
                <button
                  type="button"
                  onClick={() => handleRemoveTargetAge(age)}
                  className="hover:text-cyan-900"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Add target ages to generate age-progressed images
          </p>
        )}
      </div>

      {/* Variations */}
      <div className="border-t border-gray-200 pt-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={includeVariations}
            onChange={(e) => setIncludeVariations(e.target.checked)}
            className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Include appearance variations
          </span>
        </label>
        <p className="mt-1 ml-7 text-xs text-gray-500">
          Generate additional images with different hair styles, facial hair, etc.
        </p>

        {includeVariations && (
          <div className="mt-4 ml-7 space-y-4 p-4 bg-gray-50 rounded-lg">
            {/* Hair Styles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hair Styles
              </label>
              <div className="flex flex-wrap gap-2">
                {['short', 'medium', 'long', 'bald', 'receding'].map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      const current = variationParams.hairStyles || [];
                      setVariationParams({
                        ...variationParams,
                        hairStyles: current.includes(style)
                          ? current.filter((s) => s !== style)
                          : [...current, style],
                      });
                    }}
                    className={cn(
                      'px-3 py-1 text-sm rounded-full border transition-colors capitalize',
                      variationParams.hairStyles?.includes(style)
                        ? 'bg-cyan-100 border-cyan-500 text-cyan-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    )}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Facial Hair */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={variationParams.facialHair || false}
                onChange={(e) =>
                  setVariationParams({ ...variationParams, facialHair: e.target.checked })
                }
                className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-gray-700">Include facial hair variations</span>
            </label>

            {/* Weight Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight Variations
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={variationParams.weightRange ? variationParams.weightRange[0] : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVariationParams({
                      ...variationParams,
                      weightRange: val ? [parseInt(val), variationParams.weightRange?.[1] || 0] : undefined,
                    });
                  }}
                  className="rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                >
                  <option value="">None</option>
                  <option value="-20">-20%</option>
                  <option value="-10">-10%</option>
                  <option value="0">Normal</option>
                </select>
                <span className="text-gray-500">to</span>
                <select
                  value={variationParams.weightRange ? variationParams.weightRange[1] : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVariationParams({
                      ...variationParams,
                      weightRange: val ? [variationParams.weightRange?.[0] || 0, parseInt(val)] : undefined,
                    });
                  }}
                  className="rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                >
                  <option value="">None</option>
                  <option value="0">Normal</option>
                  <option value="10">+10%</option>
                  <option value="20">+20%</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {selectedPhoto && sourceAge !== '' && targetAges.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Request Summary</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>Source age: {sourceAge} years</li>
            <li>Target ages: {targetAges.join(', ')} years</li>
            <li>Total images: {targetAges.length}{includeVariations ? ' + variations' : ''}</li>
            <li>Estimated processing time: ~{estimateProcessingTime(targetAges.length, includeVariations)} minutes</li>
          </ul>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !selectedPhotoId || sourceAge === '' || targetAges.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Request Age Progression'}
        </button>
      </div>
    </form>
  );
}

function estimateProcessingTime(targetCount: number, includeVariations: boolean): number {
  const baseTime = 1;
  const perAge = 0.5;
  const variationMultiplier = includeVariations ? 2 : 1;
  return Math.ceil((baseTime + targetCount * perAge) * variationMultiplier);
}

// Icon components
function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
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
