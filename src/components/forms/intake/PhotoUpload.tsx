"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

export interface UploadedPhoto {
  id: string;
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

interface PhotoUploadProps {
  photos: UploadedPhoto[];
  onPhotosChange: (photos: UploadedPhoto[]) => void;
  maxPhotos?: number;
  maxSizeMB?: number;
  className?: string;
  labels?: {
    title?: string;
    dragDrop?: string;
    or?: string;
    browse?: string;
    maxSize?: string;
    uploading?: string;
    remove?: string;
  };
}

const DEFAULT_LABELS = {
  title: "Upload Photos",
  dragDrop: "Drag and drop photos here",
  or: "or",
  browse: "Browse files",
  maxSize: "Max file size: {size}MB",
  uploading: "Uploading...",
  remove: "Remove",
};

export function PhotoUpload({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  maxSizeMB = 10,
  className,
  labels = DEFAULT_LABELS,
}: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mergedLabels = { ...DEFAULT_LABELS, ...labels };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      setUploadError(null);
      const fileArray = Array.from(files);

      // Validate number of files
      if (photos.length + fileArray.length > maxPhotos) {
        setUploadError(`Maximum ${maxPhotos} photos allowed`);
        return;
      }

      // Filter valid image files
      const validFiles = fileArray.filter((file) => {
        if (!file.type.startsWith("image/")) {
          setUploadError("Only image files are allowed");
          return false;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          setUploadError(`File size must be less than ${maxSizeMB}MB`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      setIsUploading(true);

      try {
        const uploadedPhotos: UploadedPhoto[] = [];

        for (const file of validFiles) {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload/photo", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Upload failed");
          }

          const result = await response.json();
          uploadedPhotos.push({
            id: result.id,
            url: result.url,
            filename: file.name,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          });
        }

        onPhotosChange([...photos, ...uploadedPhotos]);
      } catch (error) {
        setUploadError(
          error instanceof Error ? error.message : "Failed to upload photos"
        );
      } finally {
        setIsUploading(false);
      }
    },
    [photos, onPhotosChange, maxPhotos, maxSizeMB]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      // Reset input value to allow selecting the same file again
      e.target.value = "";
    },
    [processFiles]
  );

  const handleRemovePhoto = useCallback(
    async (photoId: string) => {
      // Optionally delete from server
      try {
        await fetch(`/api/upload/photo/${photoId}`, {
          method: "DELETE",
        });
      } catch {
        // Ignore deletion errors, still remove from UI
      }

      onPhotosChange(photos.filter((p) => p.id !== photoId));
    },
    [photos, onPhotosChange]
  );

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("space-y-4", className)}>
      <label className="block text-sm font-medium text-gray-700">
        {mergedLabels.title}
      </label>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragging
            ? "border-cyan-500 bg-cyan-50"
            : "border-gray-300 hover:border-gray-400",
          isUploading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <PhotoIcon className="w-6 h-6 text-gray-400" />
          </div>

          {isUploading ? (
            <div className="flex items-center gap-2">
              <Spinner className="w-4 h-4" />
              <span className="text-sm text-gray-600">{mergedLabels.uploading}</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">{mergedLabels.dragDrop}</p>
              <p className="text-xs text-gray-400">{mergedLabels.or}</p>
              <button
                type="button"
                onClick={handleBrowseClick}
                className="px-4 py-2 text-sm font-medium text-cyan-600 border border-cyan-600 rounded-lg hover:bg-cyan-50 transition-colors"
              >
                {mergedLabels.browse}
              </button>
              <p className="text-xs text-gray-400">
                {mergedLabels.maxSize.replace("{size}", String(maxSizeMB))}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {uploadError}
        </div>
      )}

      {/* Photo Previews */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group rounded-lg overflow-hidden border border-gray-200"
            >
              <img
                src={photo.url}
                alt={photo.filename}
                className="w-full h-24 object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(photo.id)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title={mergedLabels.remove}
              >
                <CloseIcon className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 px-2 py-1">
                <p className="text-xs text-white truncate">{photo.filename}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Count */}
      <p className="text-xs text-gray-500 text-right">
        {photos.length} / {maxPhotos} photos
      </p>
    </div>
  );
}

// =============================================================================
// Icons
// =============================================================================

function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default PhotoUpload;
