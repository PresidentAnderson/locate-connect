-- Case Photos Storage Bucket for Missing Person Photos
-- Allows reporters to upload photos during case intake

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'case-photos',
  'case-photos',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos for their own cases
CREATE POLICY "case_photos_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'case-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to read their own uploaded photos
CREATE POLICY "case_photos_read_own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'case-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'law_enforcement')
      )
    )
  );

-- Allow users to delete their own photos
CREATE POLICY "case_photos_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'case-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
      )
    )
  );
