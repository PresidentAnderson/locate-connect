"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface PhotoUploadProps {
  onUploadComplete: (photoUrl: string) => void;
  currentPhotoUrl?: string;
  label: string;
  helper: string;
  uploading: string;
  uploaded: string;
  remove: string;
  maxSize: string;
  formats: string;
}

export function PhotoUpload({
  onUploadComplete,
  currentPhotoUrl,
  label,
  helper,
  uploading,
  uploaded,
  remove,
  maxSize,
  formats,
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(currentPhotoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setUploadError(null);

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds 10MB");
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Invalid file format. Please use JPEG, PNG, WebP, or HEIC");
      return;
    }

    setIsUploading(true);

    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("You must be logged in to upload photos");
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("case-photos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("case-photos")
        .getPublicUrl(data.path);

      setPhotoUrl(urlData.publicUrl);
      onUploadComplete(urlData.publicUrl);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(error instanceof Error ? error.message : "Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFileSelect(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setPhotoUrl(undefined);
    onUploadComplete("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="sm:col-span-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <p className="mt-1 text-xs text-gray-500">{maxSize}</p>
      <p className="text-xs text-gray-500">{formats}</p>
      
      {photoUrl ? (
        <div className="mt-2 space-y-2">
          <div className="relative inline-block">
            <img
              src={photoUrl}
              alt="Uploaded photo"
              className="h-40 w-auto rounded-lg border-2 border-gray-300 object-cover"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-sm text-red-600 hover:text-red-700"
            >
              {remove}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="mt-2 flex justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 hover:border-gray-400"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="text-center">
            {isUploading ? (
              <>
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
                <p className="mt-2 text-sm text-gray-600">{uploading}</p>
              </>
            ) : (
              <>
                <span className="text-4xl">📷</span>
                <p className="mt-2 text-sm text-gray-600">{helper}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="mt-2 inline-block cursor-pointer rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                >
                  Choose file
                </label>
              </>
            )}
          </div>
        </div>
      )}
      
      {uploadError && (
        <p className="mt-2 text-sm text-red-600">{uploadError}</p>
      )}
    </div>
  );
}
