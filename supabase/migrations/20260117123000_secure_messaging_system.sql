-- LocateConnect Database Schema
-- Secure Messaging System Migration (LC-FEAT-005)

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Channel types for different conversation contexts
CREATE TYPE message_channel_type AS ENUM (
  'case_discussion',    -- Reporter + assigned LE
  'family_chat',        -- All family members
  'le_internal',        -- Assigned officers only
  'tip_line'            -- Anonymous → Moderated
);

-- Participant roles in message threads
CREATE TYPE message_participant_role AS ENUM (
  'owner',          -- Thread creator
  'member',         -- Regular participant
  'moderator',      -- Can moderate (for tip line)
  'observer'        -- Read-only access
);

-- Message status for tracking
CREATE TYPE message_status AS ENUM (
  'sent',
  'delivered',
  'read',
  'deleted'
);

-- =============================================================================
-- MESSAGE THREADS TABLE
-- =============================================================================

CREATE TABLE message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  channel_type message_channel_type NOT NULL,
  thread_name TEXT,
  thread_description TEXT,
  
  -- Thread settings
  is_encrypted BOOLEAN DEFAULT TRUE,
  is_anonymous BOOLEAN DEFAULT FALSE, -- For tip_line channels
  auto_delete_days INTEGER, -- Null = no auto-delete
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES profiles(id),
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

-- =============================================================================
-- MESSAGE PARTICIPANTS TABLE
-- =============================================================================

CREATE TABLE message_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Null for anonymous participants
  participant_role message_participant_role DEFAULT 'member',
  
  -- Anonymous participant info (for tip_line)
  anonymous_identifier TEXT, -- Unique identifier for anonymous users
  
  -- Participant settings
  notifications_enabled BOOLEAN DEFAULT TRUE,
  is_muted BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Constraints
  UNIQUE(thread_id, user_id),
  UNIQUE(thread_id, anonymous_identifier)
);

-- =============================================================================
-- MESSAGES TABLE
-- =============================================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sender_anonymous_id TEXT, -- For anonymous senders
  
  -- Message content (encrypted at rest)
  content_encrypted TEXT NOT NULL,
  encryption_key_id TEXT, -- Reference to encryption key used
  content_hash TEXT, -- For integrity verification
  
  -- Message metadata
  message_status message_status DEFAULT 'sent',
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id),
  
  -- Reply/thread tracking
  reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MESSAGE ATTACHMENTS TABLE
-- =============================================================================

CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  
  -- File info
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in storage bucket
  
  -- Encryption
  is_encrypted BOOLEAN DEFAULT TRUE,
  encryption_key_id TEXT,
  file_hash TEXT, -- For integrity verification
  
  -- Metadata
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MESSAGE READ RECEIPTS TABLE
-- =============================================================================

CREATE TABLE message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES message_participants(id) ON DELETE CASCADE,
  
  -- Receipt tracking
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(message_id, user_id),
  UNIQUE(message_id, participant_id)
);

-- =============================================================================
-- MESSAGE AUDIT LOG TABLE (for LE compliance)
-- =============================================================================

CREATE TABLE message_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES message_threads(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id),
  
  -- Audit details
  action TEXT NOT NULL, -- 'create', 'read', 'update', 'delete', 'archive', 'export'
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Message threads
CREATE INDEX idx_message_threads_case ON message_threads(case_id);
CREATE INDEX idx_message_threads_channel ON message_threads(channel_type);
CREATE INDEX idx_message_threads_archived ON message_threads(is_archived);
CREATE INDEX idx_message_threads_last_message ON message_threads(last_message_at DESC);

-- Message participants
CREATE INDEX idx_message_participants_thread ON message_participants(thread_id);
CREATE INDEX idx_message_participants_user ON message_participants(user_id);
CREATE INDEX idx_message_participants_active ON message_participants(is_active) WHERE is_active = TRUE;

-- Messages
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_status ON messages(message_status);
CREATE INDEX idx_messages_reply ON messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;
CREATE INDEX idx_messages_not_deleted ON messages(thread_id, created_at) WHERE is_deleted = FALSE;

-- Message attachments
CREATE INDEX idx_message_attachments_message ON message_attachments(message_id);

-- Read receipts
CREATE INDEX idx_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX idx_read_receipts_user ON message_read_receipts(user_id);

-- Audit log
CREATE INDEX idx_message_audit_thread ON message_audit_log(thread_id);
CREATE INDEX idx_message_audit_message ON message_audit_log(message_id);
CREATE INDEX idx_message_audit_user ON message_audit_log(user_id);
CREATE INDEX idx_message_audit_created ON message_audit_log(created_at DESC);

-- Full-text search on messages (for message search feature)
CREATE INDEX idx_messages_content_search ON messages USING gin(to_tsvector('english', content_encrypted));

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update thread.updated_at when messages are added
CREATE OR REPLACE FUNCTION update_message_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE message_threads
  SET updated_at = NOW(),
      last_message_at = NOW()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_inserted_update_thread
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_thread_timestamp();

-- Update messages.updated_at
CREATE OR REPLACE FUNCTION update_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_updated_at();

CREATE TRIGGER message_threads_updated_at
  BEFORE UPDATE ON message_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_message_updated_at();

-- Auto-delete messages based on thread settings
CREATE OR REPLACE FUNCTION auto_delete_old_messages()
RETURNS void AS $$
BEGIN
  -- Mark messages as deleted in threads with auto-delete enabled
  UPDATE messages m
  SET is_deleted = TRUE,
      deleted_at = NOW()
  FROM message_threads t
  WHERE m.thread_id = t.id
    AND t.auto_delete_days IS NOT NULL
    AND m.created_at < NOW() - (t.auto_delete_days || ' days')::INTERVAL
    AND m.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_audit_log ENABLE ROW LEVEL SECURITY;

-- Message threads: Participants can view their threads
CREATE POLICY "Users can view threads they participate in"
  ON message_threads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM message_participants mp
      WHERE mp.thread_id = id
        AND (mp.user_id = auth.uid() OR mp.anonymous_identifier IS NOT NULL)
        AND mp.is_active = TRUE
    )
  );

-- LE and admins can view all threads
CREATE POLICY "LE and admins can view all threads"
  ON message_threads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('law_enforcement', 'admin')
    )
  );

-- Thread creators can create threads
CREATE POLICY "Users can create message threads"
  ON message_threads FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('law_enforcement', 'admin')
    )
  );

-- Thread creators and LE can update threads
CREATE POLICY "Thread creators and LE can update threads"
  ON message_threads FOR UPDATE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('law_enforcement', 'admin')
    )
  );

-- Message participants: Users can view their own participation
CREATE POLICY "Users can view their participation"
  ON message_participants FOR SELECT
  USING (auth.uid() = user_id);

-- LE can view all participants
CREATE POLICY "LE can view all participants"
  ON message_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('law_enforcement', 'admin')
    )
  );

-- Users can join threads
CREATE POLICY "Users can join threads"
  ON message_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('law_enforcement', 'admin')
    )
  );

-- Messages: Participants can view messages in their threads
CREATE POLICY "Participants can view thread messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM message_participants mp
      WHERE mp.thread_id = messages.thread_id
        AND mp.user_id = auth.uid()
        AND mp.is_active = TRUE
    )
    AND is_deleted = FALSE
  );

-- LE can view all messages
CREATE POLICY "LE can view all messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('law_enforcement', 'admin')
    )
  );

-- Participants can send messages
CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM message_participants mp
      WHERE mp.thread_id = thread_id
        AND mp.user_id = auth.uid()
        AND mp.is_active = TRUE
    )
    AND auth.uid() = sender_id
  );

-- Senders can edit their own messages
CREATE POLICY "Senders can edit own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- Attachments: Follow message permissions
CREATE POLICY "Users can view attachments for their messages"
  ON message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN message_participants mp ON m.thread_id = mp.thread_id
      WHERE m.id = message_id
        AND mp.user_id = auth.uid()
        AND mp.is_active = TRUE
    )
  );

CREATE POLICY "Users can upload attachments"
  ON message_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN message_participants mp ON m.thread_id = mp.thread_id
      WHERE m.id = message_id
        AND mp.user_id = auth.uid()
        AND mp.is_active = TRUE
    )
    AND auth.uid() = uploaded_by
  );

-- Read receipts: Users can create and view their own receipts
CREATE POLICY "Users can create read receipts"
  ON message_read_receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view read receipts for their messages"
  ON message_read_receipts FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
        AND m.sender_id = auth.uid()
    )
  );

-- LE can view all read receipts
CREATE POLICY "LE can view all read receipts"
  ON message_read_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('law_enforcement', 'admin')
    )
  );

-- Audit log: LE and admins only
CREATE POLICY "LE can view audit logs"
  ON message_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('law_enforcement', 'admin')
    )
  );

CREATE POLICY "System can insert audit logs"
  ON message_audit_log FOR INSERT
  WITH CHECK (TRUE); -- Allow service role to insert

-- =============================================================================
-- STORAGE BUCKET FOR MESSAGE ATTACHMENTS
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Attachment access: thread participants only
CREATE POLICY "message_attachments_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND EXISTS (
      SELECT 1 
      FROM message_attachments ma
      JOIN messages m ON ma.message_id = m.id
      JOIN message_participants mp ON m.thread_id = mp.thread_id
      WHERE ma.storage_path = name
        AND mp.user_id = auth.uid()
        AND mp.is_active = TRUE
    )
  );

CREATE POLICY "message_attachments_write"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "message_attachments_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (
      -- Sender can delete
      EXISTS (
        SELECT 1 
        FROM message_attachments ma
        JOIN messages m ON ma.message_id = m.id
        WHERE ma.storage_path = name
          AND m.sender_id = auth.uid()
      )
      -- Or LE/admin can delete
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('law_enforcement', 'admin')
      )
    )
  );

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT ALL ON message_threads TO service_role;
GRANT ALL ON message_participants TO service_role;
GRANT ALL ON messages TO service_role;
GRANT ALL ON message_attachments TO service_role;
GRANT ALL ON message_read_receipts TO service_role;
GRANT ALL ON message_audit_log TO service_role;
