/**
 * Secure Messaging System Types (LC-FEAT-005)
 */

// =============================================================================
// ENUMS
// =============================================================================

export type MessageChannelType = 
  | 'case_discussion'    // Reporter + assigned LE
  | 'family_chat'        // All family members
  | 'le_internal'        // Assigned officers only
  | 'tip_line';          // Anonymous → Moderated

export type MessageParticipantRole = 
  | 'owner'              // Thread creator
  | 'member'             // Regular participant
  | 'moderator'          // Can moderate (for tip line)
  | 'observer';          // Read-only access

export type MessageStatus = 
  | 'sent'
  | 'delivered'
  | 'read'
  | 'deleted';

// =============================================================================
// MESSAGE THREAD TYPES
// =============================================================================

export interface MessageThread {
  id: string;
  caseId: string;
  channelType: MessageChannelType;
  threadName: string | null;
  threadDescription: string | null;
  
  // Thread settings
  isEncrypted: boolean;
  isAnonymous: boolean;
  autoDeleteDays: number | null;
  isArchived: boolean;
  archivedAt: string | null;
  archivedBy: string | null;
  
  // Metadata
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
}

export interface MessageThreadCreate {
  caseId: string;
  channelType: MessageChannelType;
  threadName?: string;
  threadDescription?: string;
  isEncrypted?: boolean;
  isAnonymous?: boolean;
  autoDeleteDays?: number;
  participantIds: string[]; // Initial participants
}

export interface MessageThreadUpdate {
  threadName?: string;
  threadDescription?: string;
  autoDeleteDays?: number | null;
  isArchived?: boolean;
}

export interface MessageThreadWithMetadata extends MessageThread {
  participantCount: number;
  unreadCount: number;
  lastMessage: Message | null;
  participants: MessageParticipant[];
}

// =============================================================================
// MESSAGE PARTICIPANT TYPES
// =============================================================================

export interface MessageParticipant {
  id: string;
  threadId: string;
  userId: string | null;
  participantRole: MessageParticipantRole;
  
  // Anonymous participant info
  anonymousIdentifier: string | null;
  
  // Participant settings
  notificationsEnabled: boolean;
  isMuted: boolean;
  joinedAt: string;
  leftAt: string | null;
  isActive: boolean;
}

export interface MessageParticipantWithProfile extends MessageParticipant {
  profile: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
    avatarUrl: string | null;
  } | null;
}

export interface MessageParticipantCreate {
  threadId: string;
  userId?: string;
  anonymousIdentifier?: string;
  participantRole?: MessageParticipantRole;
}

export interface MessageParticipantUpdate {
  notificationsEnabled?: boolean;
  isMuted?: boolean;
  isActive?: boolean;
}

// =============================================================================
// MESSAGE TYPES
// =============================================================================

export interface Message {
  id: string;
  threadId: string;
  senderId: string | null;
  senderAnonymousId: string | null;
  
  // Message content (encrypted at rest)
  contentEncrypted: string;
  encryptionKeyId: string | null;
  contentHash: string | null;
  
  // Message metadata
  messageStatus: MessageStatus;
  isEdited: boolean;
  editedAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
  
  // Reply/thread tracking
  replyToMessageId: string | null;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface MessageCreate {
  threadId: string;
  content: string; // Unencrypted content (will be encrypted by service)
  replyToMessageId?: string;
}

export interface MessageUpdate {
  content?: string;
  isDeleted?: boolean;
}

export interface MessageWithMetadata extends Message {
  sender: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    avatarUrl: string | null;
  } | null;
  attachments: MessageAttachment[];
  readReceipts: MessageReadReceipt[];
  replyToMessage: Message | null;
  decryptedContent?: string; // Populated by client-side decryption
}

// =============================================================================
// MESSAGE ATTACHMENT TYPES
// =============================================================================

export interface MessageAttachment {
  id: string;
  messageId: string;
  
  // File info
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  storagePath: string;
  
  // Encryption
  isEncrypted: boolean;
  encryptionKeyId: string | null;
  fileHash: string | null;
  
  // Metadata
  uploadedBy: string | null;
  createdAt: string;
}

export interface MessageAttachmentCreate {
  messageId: string;
  file: File; // Browser File object
  fileName?: string;
}

export interface MessageAttachmentUploadResult {
  attachment: MessageAttachment;
  downloadUrl: string;
}

// =============================================================================
// MESSAGE READ RECEIPT TYPES
// =============================================================================

export interface MessageReadReceipt {
  id: string;
  messageId: string;
  userId: string | null;
  participantId: string;
  
  // Receipt tracking
  deliveredAt: string | null;
  readAt: string;
}

export interface MessageReadReceiptCreate {
  messageId: string;
  participantId: string;
}

export interface MessageReadReceiptSummary {
  messageId: string;
  totalRecipients: number;
  deliveredCount: number;
  readCount: number;
  receipts: MessageReadReceipt[];
}

// =============================================================================
// MESSAGE AUDIT LOG TYPES
// =============================================================================

export interface MessageAuditLog {
  id: string;
  threadId: string | null;
  messageId: string | null;
  userId: string | null;
  
  // Audit details
  action: 'create' | 'read' | 'update' | 'delete' | 'archive' | 'export';
  details: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  
  // Timestamps
  createdAt: string;
}

// =============================================================================
// MESSAGING SERVICE TYPES
// =============================================================================

export interface MessageSearchParams {
  threadId?: string;
  caseId?: string;
  channelType?: MessageChannelType;
  searchQuery?: string;
  senderId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface MessageSearchResult {
  messages: MessageWithMetadata[];
  total: number;
  hasMore: boolean;
}

export interface ThreadListParams {
  caseId?: string;
  channelType?: MessageChannelType;
  isArchived?: boolean;
  participantId?: string;
  limit?: number;
  offset?: number;
}

export interface ThreadListResult {
  threads: MessageThreadWithMetadata[];
  total: number;
  hasMore: boolean;
}

export interface MessageEncryptionOptions {
  enabled: boolean;
  keyId?: string;
  algorithm?: 'AES-256-GCM' | 'AES-128-GCM';
}

export interface MessageDecryptionResult {
  content: string;
  isValid: boolean;
  error?: string;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export interface SendMessageOptions {
  content: string;
  threadId: string;
  replyToMessageId?: string;
  attachments?: File[];
  encrypt?: boolean;
}

export interface CreateThreadOptions {
  caseId: string;
  channelType: MessageChannelType;
  threadName?: string;
  threadDescription?: string;
  participantIds: string[];
  isAnonymous?: boolean;
  autoDeleteDays?: number;
}

export interface ArchiveThreadOptions {
  threadId: string;
  archive: boolean; // true to archive, false to unarchive
}

// =============================================================================
// DATABASE ROW MAPPING TYPES
// =============================================================================

/**
 * Helper types for mapping database rows to TypeScript types
 */

export interface MessageThreadRow {
  id: string;
  case_id: string;
  channel_type: string;
  thread_name: string | null;
  thread_description: string | null;
  is_encrypted: boolean;
  is_anonymous: boolean;
  auto_delete_days: number | null;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

export interface MessageRow {
  id: string;
  thread_id: string;
  sender_id: string | null;
  sender_anonymous_id: string | null;
  content_encrypted: string;
  encryption_key_id: string | null;
  content_hash: string | null;
  message_status: string;
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  reply_to_message_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageParticipantRow {
  id: string;
  thread_id: string;
  user_id: string | null;
  participant_role: string;
  anonymous_identifier: string | null;
  notifications_enabled: boolean;
  is_muted: boolean;
  joined_at: string;
  left_at: string | null;
  is_active: boolean;
}

export interface MessageAttachmentRow {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  storage_path: string;
  is_encrypted: boolean;
  encryption_key_id: string | null;
  file_hash: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface MessageReadReceiptRow {
  id: string;
  message_id: string;
  user_id: string | null;
  participant_id: string;
  delivered_at: string | null;
  read_at: string;
}

// =============================================================================
// HELPER FUNCTIONS FOR TYPE CONVERSION
// =============================================================================

export function mapThreadRowToThread(row: MessageThreadRow): MessageThread {
  return {
    id: row.id,
    caseId: row.case_id,
    channelType: row.channel_type as MessageChannelType,
    threadName: row.thread_name,
    threadDescription: row.thread_description,
    isEncrypted: row.is_encrypted,
    isAnonymous: row.is_anonymous,
    autoDeleteDays: row.auto_delete_days,
    isArchived: row.is_archived,
    archivedAt: row.archived_at,
    archivedBy: row.archived_by,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
  };
}

export function mapMessageRowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    senderAnonymousId: row.sender_anonymous_id,
    contentEncrypted: row.content_encrypted,
    encryptionKeyId: row.encryption_key_id,
    contentHash: row.content_hash,
    messageStatus: row.message_status as MessageStatus,
    isEdited: row.is_edited,
    editedAt: row.edited_at,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    replyToMessageId: row.reply_to_message_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapParticipantRowToParticipant(row: MessageParticipantRow): MessageParticipant {
  return {
    id: row.id,
    threadId: row.thread_id,
    userId: row.user_id,
    participantRole: row.participant_role as MessageParticipantRole,
    anonymousIdentifier: row.anonymous_identifier,
    notificationsEnabled: row.notifications_enabled,
    isMuted: row.is_muted,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    isActive: row.is_active,
  };
}

export function mapAttachmentRowToAttachment(row: MessageAttachmentRow): MessageAttachment {
  return {
    id: row.id,
    messageId: row.message_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSizeBytes: row.file_size_bytes,
    storagePath: row.storage_path,
    isEncrypted: row.is_encrypted,
    encryptionKeyId: row.encryption_key_id,
    fileHash: row.file_hash,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

export function mapReceiptRowToReceipt(row: MessageReadReceiptRow): MessageReadReceipt {
  return {
    id: row.id,
    messageId: row.message_id,
    userId: row.user_id,
    participantId: row.participant_id,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
  };
}
