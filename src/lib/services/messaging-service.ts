/**
 * Secure Messaging Service (LC-FEAT-005)
 * Handles message threads, messages, attachments, and read receipts
 */

import { createClient } from '@/lib/supabase/client';
import type {
  MessageThread,
  MessageThreadCreate,
  MessageThreadUpdate,
  MessageThreadWithMetadata,
  Message,
  MessageCreate,
  MessageUpdate,
  MessageWithMetadata,
  MessageParticipant,
  MessageParticipantCreate,
  MessageParticipantUpdate,
  MessageAttachment,
  MessageAttachmentCreate,
  MessageReadReceipt,
  MessageReadReceiptCreate,
  MessageSearchParams,
  MessageSearchResult,
  ThreadListParams,
  ThreadListResult,
  SendMessageOptions,
  CreateThreadOptions,
  ArchiveThreadOptions,
  mapThreadRowToThread,
  mapMessageRowToMessage,
  mapParticipantRowToParticipant,
  mapAttachmentRowToAttachment,
  mapReceiptRowToReceipt,
} from '@/types';
import {
  encryptMessage,
  decryptMessage,
  generateEncryptionKey,
  exportKey,
  importKey,
  generateKeyId,
  MessageEncryptionKeyStore,
} from '@/lib/utils/message-encryption';

// =============================================================================
// MESSAGE THREAD OPERATIONS
// =============================================================================

/**
 * Creates a new message thread
 */
export async function createMessageThread(
  options: CreateThreadOptions
): Promise<MessageThread> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Create the thread
  const { data: thread, error: threadError } = await supabase
    .from('message_threads')
    .insert({
      case_id: options.caseId,
      channel_type: options.channelType,
      thread_name: options.threadName,
      thread_description: options.threadDescription,
      is_encrypted: true,
      is_anonymous: options.isAnonymous ?? false,
      auto_delete_days: options.autoDeleteDays,
      created_by: user.id,
    })
    .select()
    .single();
  
  if (threadError) throw threadError;
  
  // Add participants
  const participants = options.participantIds.map(userId => ({
    thread_id: thread.id,
    user_id: userId,
    participant_role: userId === user.id ? 'owner' : 'member',
  }));
  
  const { error: participantError } = await supabase
    .from('message_participants')
    .insert(participants);
  
  if (participantError) throw participantError;
  
  // Log audit trail
  await logMessageAudit({
    threadId: thread.id,
    action: 'create',
    details: { channelType: options.channelType },
  });
  
  return mapThreadRowToThread(thread);
}

/**
 * Gets a message thread by ID
 */
export async function getMessageThread(threadId: string): Promise<MessageThread | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('message_threads')
    .select()
    .eq('id', threadId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return mapThreadRowToThread(data);
}

/**
 * Updates a message thread
 */
export async function updateMessageThread(
  threadId: string,
  updates: MessageThreadUpdate
): Promise<MessageThread> {
  const supabase = createClient();
  
  const updateData: Record<string, unknown> = {};
  if (updates.threadName !== undefined) updateData.thread_name = updates.threadName;
  if (updates.threadDescription !== undefined) updateData.thread_description = updates.threadDescription;
  if (updates.autoDeleteDays !== undefined) updateData.auto_delete_days = updates.autoDeleteDays;
  if (updates.isArchived !== undefined) {
    updateData.is_archived = updates.isArchived;
    updateData.archived_at = updates.isArchived ? new Date().toISOString() : null;
    
    const { data: { user } } = await supabase.auth.getUser();
    updateData.archived_by = updates.isArchived ? user?.id : null;
  }
  
  const { data, error } = await supabase
    .from('message_threads')
    .update(updateData)
    .eq('id', threadId)
    .select()
    .single();
  
  if (error) throw error;
  
  return mapThreadRowToThread(data);
}

/**
 * Archives or unarchives a thread
 */
export async function archiveThread(options: ArchiveThreadOptions): Promise<MessageThread> {
  return updateMessageThread(options.threadId, {
    isArchived: options.archive,
  });
}

/**
 * Lists message threads with filters
 */
export async function listMessageThreads(
  params: ThreadListParams = {}
): Promise<ThreadListResult> {
  const supabase = createClient();
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  
  let query = supabase
    .from('message_threads')
    .select('*', { count: 'exact' });
  
  if (params.caseId) query = query.eq('case_id', params.caseId);
  if (params.channelType) query = query.eq('channel_type', params.channelType);
  if (params.isArchived !== undefined) query = query.eq('is_archived', params.isArchived);
  
  // Filter by participant
  if (params.participantId) {
    query = query.in('id', 
      supabase
        .from('message_participants')
        .select('thread_id')
        .eq('user_id', params.participantId)
        .eq('is_active', true)
    );
  }
  
  query = query
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  const threads = (data ?? []).map(mapThreadRowToThread);
  
  // Get metadata for each thread (simplified - in production, optimize with joins)
  const threadsWithMetadata: MessageThreadWithMetadata[] = await Promise.all(
    threads.map(async (thread) => {
      const [participants, unreadCount, lastMessage] = await Promise.all([
        getThreadParticipants(thread.id),
        getUnreadMessageCount(thread.id),
        getLastMessage(thread.id),
      ]);
      
      return {
        ...thread,
        participantCount: participants.length,
        unreadCount,
        lastMessage,
        participants,
      };
    })
  );
  
  return {
    threads: threadsWithMetadata,
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit,
  };
}

/**
 * Deletes a message thread (soft delete by archiving)
 */
export async function deleteMessageThread(threadId: string): Promise<void> {
  await archiveThread({ threadId, archive: true });
}

// =============================================================================
// MESSAGE OPERATIONS
// =============================================================================

/**
 * Sends a message in a thread
 */
export async function sendMessage(options: SendMessageOptions): Promise<Message> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Encrypt message content if encryption is enabled
  let contentEncrypted = options.content;
  let encryptionKeyId: string | null = null;
  let contentHash: string | null = null;
  
  if (options.encrypt !== false) {
    // Get or create encryption key for this thread
    const thread = await getMessageThread(options.threadId);
    if (!thread) throw new Error('Thread not found');
    
    if (thread.isEncrypted) {
      // Use thread-level encryption key for better performance and key management
      // In production, implement proper key exchange between participants
      encryptionKeyId = `thread_${options.threadId}`;
      
      // Try to get existing key from session storage
      let key = await MessageEncryptionKeyStore.getKey(encryptionKeyId);
      
      // If no key exists, generate and store it
      if (!key) {
        key = await generateEncryptionKey();
        await MessageEncryptionKeyStore.storeKey(encryptionKeyId, key);
      }
      
      const encrypted = await encryptMessage(options.content, key);
      contentEncrypted = encrypted.encrypted;
      contentHash = encrypted.hash;
    }
  }
  
  // Create message
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      thread_id: options.threadId,
      sender_id: user.id,
      content_encrypted: contentEncrypted,
      encryption_key_id: encryptionKeyId,
      content_hash: contentHash,
      reply_to_message_id: options.replyToMessageId,
      message_status: 'sent',
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Handle attachments if provided
  if (options.attachments && options.attachments.length > 0) {
    await Promise.all(
      options.attachments.map(file => 
        uploadMessageAttachment({
          messageId: message.id,
          file,
        })
      )
    );
  }
  
  // Log audit trail
  await logMessageAudit({
    threadId: options.threadId,
    messageId: message.id,
    action: 'create',
    details: { hasAttachments: options.attachments?.length ?? 0 > 0 },
  });
  
  return mapMessageRowToMessage(message);
}

/**
 * Gets messages in a thread
 */
export async function getThreadMessages(
  threadId: string,
  limit = 50,
  offset = 0
): Promise<MessageWithMetadata[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!sender_id(id, first_name, last_name, role, avatar_url)
    `)
    .eq('thread_id', threadId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);
  
  if (error) throw error;
  
  // Get attachments and read receipts for each message
  const messagesWithMetadata: MessageWithMetadata[] = await Promise.all(
    (data ?? []).map(async (msg) => {
      const [attachments, readReceipts] = await Promise.all([
        getMessageAttachments(msg.id),
        getMessageReadReceipts(msg.id),
      ]);
      
      return {
        ...mapMessageRowToMessage(msg),
        sender: msg.sender ? {
          id: msg.sender.id,
          firstName: msg.sender.first_name,
          lastName: msg.sender.last_name,
          role: msg.sender.role,
          avatarUrl: msg.sender.avatar_url,
        } : null,
        attachments,
        readReceipts,
        replyToMessage: null, // Simplified - fetch if needed
      };
    })
  );
  
  return messagesWithMetadata;
}

/**
 * Updates a message (edit content or delete)
 */
export async function updateMessage(
  messageId: string,
  updates: MessageUpdate
): Promise<Message> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const updateData: Record<string, unknown> = {};
  
  if (updates.content !== undefined) {
    // Re-encrypt with new content
    const message = await getMessage(messageId);
    if (!message) throw new Error('Message not found');
    
    if (message.encryptionKeyId) {
      const key = await MessageEncryptionKeyStore.getKey(message.encryptionKeyId);
      if (key) {
        const encrypted = await encryptMessage(updates.content, key);
        updateData.content_encrypted = encrypted.encrypted;
        updateData.content_hash = encrypted.hash;
      } else {
        updateData.content_encrypted = updates.content;
      }
    } else {
      updateData.content_encrypted = updates.content;
    }
    
    updateData.is_edited = true;
    updateData.edited_at = new Date().toISOString();
  }
  
  if (updates.isDeleted !== undefined) {
    updateData.is_deleted = updates.isDeleted;
    updateData.deleted_at = updates.isDeleted ? new Date().toISOString() : null;
    updateData.deleted_by = updates.isDeleted ? user.id : null;
  }
  
  const { data, error } = await supabase
    .from('messages')
    .update(updateData)
    .eq('id', messageId)
    .select()
    .single();
  
  if (error) throw error;
  
  return mapMessageRowToMessage(data);
}

/**
 * Gets a single message by ID
 */
export async function getMessage(messageId: string): Promise<Message | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('messages')
    .select()
    .eq('id', messageId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return mapMessageRowToMessage(data);
}

/**
 * Deletes a message (soft delete)
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await updateMessage(messageId, { isDeleted: true });
}

/**
 * Searches messages
 * 
 * Note: Full-text search on encrypted content is not supported.
 * This function filters by metadata (thread, sender, dates).
 * For content search, messages must be decrypted client-side first.
 */
export async function searchMessages(
  params: MessageSearchParams
): Promise<MessageSearchResult> {
  const supabase = createClient();
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  
  let query = supabase
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('is_deleted', false);
  
  if (params.threadId) query = query.eq('thread_id', params.threadId);
  if (params.senderId) query = query.eq('sender_id', params.senderId);
  if (params.fromDate) query = query.gte('created_at', params.fromDate);
  if (params.toDate) query = query.lte('created_at', params.toDate);
  
  // Note: Text search on encrypted content is not possible at database level
  // If searchQuery is provided, fetch all matching messages and filter client-side
  // For production, consider implementing a separate encrypted search index
  
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  const messages = (data ?? []).map(mapMessageRowToMessage);
  
  // Get metadata (simplified)
  const messagesWithMetadata: MessageWithMetadata[] = messages.map(msg => ({
    ...msg,
    sender: null,
    attachments: [],
    readReceipts: [],
    replyToMessage: null,
  }));
  
  return {
    messages: messagesWithMetadata,
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit,
  };
}

// =============================================================================
// PARTICIPANT OPERATIONS
// =============================================================================

/**
 * Adds a participant to a thread
 */
export async function addThreadParticipant(
  participant: MessageParticipantCreate
): Promise<MessageParticipant> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('message_participants')
    .insert({
      thread_id: participant.threadId,
      user_id: participant.userId,
      anonymous_identifier: participant.anonymousIdentifier,
      participant_role: participant.participantRole ?? 'member',
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return mapParticipantRowToParticipant(data);
}

/**
 * Gets participants in a thread
 */
export async function getThreadParticipants(threadId: string): Promise<MessageParticipant[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('message_participants')
    .select()
    .eq('thread_id', threadId)
    .eq('is_active', true);
  
  if (error) throw error;
  
  return (data ?? []).map(mapParticipantRowToParticipant);
}

/**
 * Updates a participant's settings
 */
export async function updateThreadParticipant(
  participantId: string,
  updates: MessageParticipantUpdate
): Promise<MessageParticipant> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('message_participants')
    .update(updates)
    .eq('id', participantId)
    .select()
    .single();
  
  if (error) throw error;
  
  return mapParticipantRowToParticipant(data);
}

/**
 * Removes a participant from a thread
 */
export async function removeThreadParticipant(participantId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('message_participants')
    .update({
      is_active: false,
      left_at: new Date().toISOString(),
    })
    .eq('id', participantId);
  
  if (error) throw error;
}

// =============================================================================
// ATTACHMENT OPERATIONS
// =============================================================================

/**
 * Uploads a message attachment
 */
export async function uploadMessageAttachment(
  params: MessageAttachmentCreate
): Promise<MessageAttachment> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const fileName = params.fileName ?? params.file.name;
  const storagePath = `${params.messageId}/${Date.now()}_${fileName}`;
  
  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('message-attachments')
    .upload(storagePath, params.file);
  
  if (uploadError) throw uploadError;
  
  // Create attachment record
  const { data, error } = await supabase
    .from('message_attachments')
    .insert({
      message_id: params.messageId,
      file_name: fileName,
      file_type: params.file.type,
      file_size_bytes: params.file.size,
      storage_path: storagePath,
      is_encrypted: true,
      uploaded_by: user.id,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return mapAttachmentRowToAttachment(data);
}

/**
 * Gets attachments for a message
 */
export async function getMessageAttachments(messageId: string): Promise<MessageAttachment[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('message_attachments')
    .select()
    .eq('message_id', messageId);
  
  if (error) throw error;
  
  return (data ?? []).map(mapAttachmentRowToAttachment);
}

/**
 * Downloads an attachment
 */
export async function downloadAttachment(attachmentId: string): Promise<Blob> {
  const supabase = createClient();
  
  // Get attachment metadata
  const { data: attachment, error: metadataError } = await supabase
    .from('message_attachments')
    .select()
    .eq('id', attachmentId)
    .single();
  
  if (metadataError) throw metadataError;
  
  // Download from storage
  const { data, error } = await supabase.storage
    .from('message-attachments')
    .download(attachment.storage_path);
  
  if (error) throw error;
  
  return data;
}

// =============================================================================
// READ RECEIPT OPERATIONS
// =============================================================================

/**
 * Marks a message as read
 */
export async function markMessageAsRead(
  messageId: string,
  participantId: string
): Promise<MessageReadReceipt> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('message_read_receipts')
    .upsert({
      message_id: messageId,
      user_id: user?.id,
      participant_id: participantId,
      read_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return mapReceiptRowToReceipt(data);
}

/**
 * Gets read receipts for a message
 */
export async function getMessageReadReceipts(messageId: string): Promise<MessageReadReceipt[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('message_read_receipts')
    .select()
    .eq('message_id', messageId);
  
  if (error) throw error;
  
  return (data ?? []).map(mapReceiptRowToReceipt);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the count of unread messages in a thread
 */
async function getUnreadMessageCount(threadId: string): Promise<number> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  
  // Get all messages in thread not sent by current user
  const { data: threadMessages, error: msgError } = await supabase
    .from('messages')
    .select('id')
    .eq('thread_id', threadId)
    .eq('is_deleted', false)
    .neq('sender_id', user.id);
  
  if (msgError || !threadMessages) return 0;
  
  // Get read receipts for current user
  const { data: readReceipts, error: receiptError } = await supabase
    .from('message_read_receipts')
    .select('message_id')
    .eq('user_id', user.id)
    .in('message_id', threadMessages.map(m => m.id));
  
  if (receiptError) return 0;
  
  const readMessageIds = new Set(readReceipts?.map(r => r.message_id) ?? []);
  const unreadCount = threadMessages.filter(m => !readMessageIds.has(m.id)).length;
  
  return unreadCount;
}

/**
 * Gets the last message in a thread
 */
async function getLastMessage(threadId: string): Promise<Message | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('messages')
    .select()
    .eq('thread_id', threadId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return mapMessageRowToMessage(data);
}

/**
 * Logs an audit event for messages
 */
async function logMessageAudit(params: {
  threadId?: string;
  messageId?: string;
  action: string;
  details: Record<string, unknown>;
}): Promise<void> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  await supabase
    .from('message_audit_log')
    .insert({
      thread_id: params.threadId,
      message_id: params.messageId,
      user_id: user?.id,
      action: params.action,
      details: params.details,
    });
}
