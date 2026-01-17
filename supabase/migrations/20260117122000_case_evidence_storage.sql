-- Case Evidence Storage Bucket and Policies

INSERT INTO storage.buckets (id, name, public)
VALUES ('case-evidence', 'case-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Evidence access: admins, law enforcement, and assigned case members
CREATE POLICY "case_evidence_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'case-evidence'
    AND (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'law_enforcement')
      )
      OR EXISTS (
        SELECT 1 FROM case_assignments ca
        WHERE ca.case_id = split_part(name, '/', 2)::uuid
          AND ca.user_id = auth.uid()
          AND ca.is_active = true
      )
    )
  );

CREATE POLICY "case_evidence_write"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'case-evidence'
    AND (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'law_enforcement')
      )
      OR EXISTS (
        SELECT 1 FROM case_assignments ca
        WHERE ca.case_id = split_part(name, '/', 2)::uuid
          AND ca.user_id = auth.uid()
          AND ca.is_active = true
      )
    )
  );

CREATE POLICY "case_evidence_delete_admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'case-evidence'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );
