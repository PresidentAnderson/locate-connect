'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib';
import type {
  PhotoQualityGrade,
  PhotoQualityFactors,
  PhotoSubmission,
  FaceBoundingBox,
} from '@/types/facial-recognition.types';
import { PHOTO_QUALITY_GRADE_LABELS } from '@/types/facial-recognition.types';

interface PhotoUploaderProps {
  caseId: string;
  consentRecordId?: string;
  submissionSource?: 'family_upload' | 'law_enforcement' | 'tip' | 'partner_database';
  onUploadComplete?: (photo: PhotoSubmission) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  showQualityAssessment?: boolean;
}

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  progress: number;
  result?: PhotoSubmission;
  qualityAssessment?: {
    grade: PhotoQualityGrade;
    score: number;
    factors: PhotoQualityFactors;
    enhancementRecommended: boolean;
  };
  facesDetected?: FaceBoundingBox[];
  error?: string;
}

export function PhotoUploader({
  caseId,
  consentRecordId,
  submissionSource = 'family_upload',
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  showQualityAssessment = true,
}: PhotoUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type.startsWith('image/')
    );

    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const addFiles = (newFiles: File[]) => {
    const availableSlots = maxFiles - files.length;
    const filesToAdd = newFiles.slice(0, availableSlots);

    const uploadedFiles: UploadedFile[] = filesToAdd.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...uploadedFiles]);

    // Auto-upload each file
    uploadedFiles.forEach((uploadedFile) => {
      uploadFile(uploadedFile);
    });
  };

  const uploadFile = async (uploadedFile: UploadedFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadedFile.id ? { ...f, status: 'uploading' as const } : f
      )
    );

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile.file);
      formData.append('caseId', caseId);
      formData.append('submissionSource', submissionSource);
      if (consentRecordId) {
        formData.append('consentRecordId', consentRecordId);
      }

      const response = await fetch('/api/facial-recognition/photos', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? {
                ...f,
                status: 'complete' as const,
                progress: 100,
                result: result.data,
                qualityAssessment: result.qualityAssessment,
                facesDetected: result.facesDetected,
              }
            : f
        )
      );

      onUploadComplete?.(result.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        )
      );

      onUploadError?.(errorMessage);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const retryUpload = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file) {
      uploadFile(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging
            ? 'border-cyan-500 bg-cyan-50'
            : 'border-gray-300 hover:border-gray-400',
          files.length >= maxFiles && 'opacity-50 pointer-events-none'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={files.length >= maxFiles}
        />

        <div className="space-y-3">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-cyan-600 hover:text-cyan-700 font-medium"
              disabled={files.length >= maxFiles}
            >
              Upload photos
            </button>
            <span className="text-gray-500"> or drag and drop</span>
          </div>
          <p className="text-xs text-gray-500">
            JPEG, PNG, WebP, or HEIC up to 20MB each
          </p>
          {files.length > 0 && (
            <p className="text-xs text-gray-400">
              {files.length} of {maxFiles} photos added
            </p>
          )}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((file) => (
            <FilePreviewCard
              key={file.id}
              file={file}
              showQualityAssessment={showQualityAssessment}
              onRemove={() => removeFile(file.id)}
              onRetry={() => retryUpload(file.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FilePreviewCardProps {
  file: UploadedFile;
  showQualityAssessment: boolean;
  onRemove: () => void;
  onRetry: () => void;
}

function FilePreviewCard({
  file,
  showQualityAssessment,
  onRemove,
  onRetry,
}: FilePreviewCardProps) {
  const qualityConfig = file.qualityAssessment?.grade
    ? PHOTO_QUALITY_GRADE_LABELS[file.qualityAssessment.grade]
    : null;

  return (
    <div className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg">
      {/* Thumbnail */}
      <div className="relative h-20 w-20 flex-shrink-0">
        <img
          src={file.preview}
          alt={file.file.name}
          className="h-full w-full object-cover rounded-md"
        />
        {file.status === 'uploading' && (
          <div className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center">
            <LoadingSpinner className="h-6 w-6 text-white" />
          </div>
        )}
        {file.status === 'complete' && file.facesDetected && file.facesDetected.length > 0 && (
          <div className="absolute bottom-1 right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
            {file.facesDetected.length} face{file.facesDetected.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.file.name}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(file.file.size)}
            </p>
          </div>
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-gray-500"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Status */}
        {file.status === 'uploading' && (
          <div className="mt-2">
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${file.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Uploading...</p>
          </div>
        )}

        {file.status === 'error' && (
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xs text-red-600">{file.error}</p>
            <button
              onClick={onRetry}
              className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {file.status === 'complete' && showQualityAssessment && file.qualityAssessment && (
          <div className="mt-2 space-y-2">
            {/* Quality Grade Badge */}
            {qualityConfig && (
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                  qualityConfig.bgColor,
                  qualityConfig.color
                )}
              >
                {qualityConfig.label} Quality ({file.qualityAssessment.score}%)
              </span>
            )}

            {/* Enhancement Recommendation */}
            {file.qualityAssessment.enhancementRecommended && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <ExclamationIcon className="h-3.5 w-3.5" />
                Enhancement recommended for better results
              </p>
            )}

            {/* Quality Factors */}
            <QualityFactorsDisplay factors={file.qualityAssessment.factors} />
          </div>
        )}
      </div>
    </div>
  );
}

interface QualityFactorsDisplayProps {
  factors: PhotoQualityFactors;
}

function QualityFactorsDisplay({ factors }: QualityFactorsDisplayProps) {
  const factorItems = [
    { label: 'Lighting', value: factors.lighting },
    { label: 'Focus', value: factors.focus },
    { label: 'Resolution', value: factors.resolution },
    { label: 'Face Visibility', value: factors.faceVisibility },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      {factorItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 w-20">{item.label}</span>
          <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                item.value >= 70 ? 'bg-green-500' :
                item.value >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${item.value}%` }}
            />
          </div>
          <span className="text-gray-600 w-8 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Icon components
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

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  );
}
