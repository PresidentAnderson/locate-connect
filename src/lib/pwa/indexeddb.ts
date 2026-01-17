/**
 * IndexedDB utilities for offline data storage
 * LC-FEAT-031: Mobile App Companion
 */

const DB_NAME = 'locateconnect-offline';
const DB_VERSION = 2;

// Store names
export const STORES = {
  CASES: 'cached-cases',
  TIPS: 'offline-tips',
  EVIDENCE: 'evidence-uploads',
  FIELD_DATA: 'field-data',
  SYNC_QUEUE: 'sync-queue',
  USER_LOCATION: 'user-location',
  VOICE_NOTES: 'voice-notes',
  DRAFT_FORMS: 'draft-forms',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

interface DBSchema {
  'cached-cases': CachedCase;
  'offline-tips': OfflineTip;
  'evidence-uploads': EvidenceUpload;
  'field-data': FieldDataEntry;
  'sync-queue': SyncQueueItem;
  'user-location': UserLocation;
  'voice-notes': VoiceNote;
  'draft-forms': DraftForm;
}

export interface CachedCase {
  id: string;
  data: Record<string, unknown>;
  cachedAt: number;
  updatedAt: number;
  expiresAt: number;
}

export interface OfflineTip {
  id?: number;
  caseId: string;
  tipContent: string;
  tipsterInfo?: {
    name?: string;
    contact?: string;
    anonymous: boolean;
  };
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  media?: Array<{
    type: 'image' | 'video' | 'audio';
    blob: Blob;
    filename: string;
  }>;
  createdAt: number;
  synced: boolean;
}

export interface EvidenceUpload {
  id?: number;
  caseId: string;
  file: Blob;
  filename: string;
  mimeType: string;
  metadata: {
    capturedAt: number;
    location?: { latitude: number; longitude: number };
    deviceInfo?: string;
    notes?: string;
  };
  createdAt: number;
  synced: boolean;
}

export interface FieldDataEntry {
  id?: number;
  formType: string;
  caseId?: string;
  data: Record<string, unknown>;
  location?: { latitude: number; longitude: number };
  createdAt: number;
  updatedAt: number;
  synced: boolean;
}

export interface SyncQueueItem {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface UserLocation {
  id?: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface VoiceNote {
  id?: number;
  caseId?: string;
  fieldEntryId?: number;
  blob: Blob;
  duration: number;
  transcript?: string;
  transcriptionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  synced: boolean;
}

export interface DraftForm {
  id?: number;
  formType: string;
  caseId?: string;
  data: Record<string, unknown>;
  lastSavedAt: number;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Open the IndexedDB database
 */
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.CASES)) {
        const casesStore = db.createObjectStore(STORES.CASES, { keyPath: 'id' });
        casesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        casesStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.TIPS)) {
        const tipsStore = db.createObjectStore(STORES.TIPS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        tipsStore.createIndex('caseId', 'caseId', { unique: false });
        tipsStore.createIndex('synced', 'synced', { unique: false });
        tipsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.EVIDENCE)) {
        const evidenceStore = db.createObjectStore(STORES.EVIDENCE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        evidenceStore.createIndex('caseId', 'caseId', { unique: false });
        evidenceStore.createIndex('synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.FIELD_DATA)) {
        const fieldStore = db.createObjectStore(STORES.FIELD_DATA, {
          keyPath: 'id',
          autoIncrement: true,
        });
        fieldStore.createIndex('formType', 'formType', { unique: false });
        fieldStore.createIndex('caseId', 'caseId', { unique: false });
        fieldStore.createIndex('synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.USER_LOCATION)) {
        const locationStore = db.createObjectStore(STORES.USER_LOCATION, {
          keyPath: 'id',
          autoIncrement: true,
        });
        locationStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.VOICE_NOTES)) {
        const voiceStore = db.createObjectStore(STORES.VOICE_NOTES, {
          keyPath: 'id',
          autoIncrement: true,
        });
        voiceStore.createIndex('caseId', 'caseId', { unique: false });
        voiceStore.createIndex('synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.DRAFT_FORMS)) {
        const draftStore = db.createObjectStore(STORES.DRAFT_FORMS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        draftStore.createIndex('formType', 'formType', { unique: false });
        draftStore.createIndex('caseId', 'caseId', { unique: false });
      }
    };
  });
}

/**
 * Generic function to add data to a store
 */
export async function addToStore<K extends StoreName>(
  storeName: K,
  data: DBSchema[K]
): Promise<IDBValidKey> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.add(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Generic function to update data in a store
 */
export async function updateInStore<K extends StoreName>(
  storeName: K,
  data: DBSchema[K]
): Promise<IDBValidKey> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Generic function to get data by ID
 */
export async function getFromStore<K extends StoreName>(
  storeName: K,
  id: IDBValidKey
): Promise<DBSchema[K] | undefined> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Generic function to get all data from a store
 */
export async function getAllFromStore<K extends StoreName>(
  storeName: K
): Promise<DBSchema[K][]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get data by index
 */
export async function getByIndex<K extends StoreName>(
  storeName: K,
  indexName: string,
  value: IDBValidKey
): Promise<DBSchema[K][]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Delete data from store
 */
export async function deleteFromStore(
  storeName: StoreName,
  id: IDBValidKey
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Clear all data from a store
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get unsynced items from a store
 */
export async function getUnsyncedItems<K extends StoreName>(
  storeName: K
): Promise<DBSchema[K][]> {
  return getByIndex(storeName, 'synced', 0);
}

/**
 * Mark item as synced
 */
export async function markAsSynced<K extends StoreName>(
  storeName: K,
  id: IDBValidKey
): Promise<void> {
  const item = await getFromStore(storeName, id);
  if (item && 'synced' in item) {
    (item as unknown as { synced: boolean }).synced = true;
    await updateInStore(storeName, item);
  }
}

// ============================================
// Case-specific utilities
// ============================================

/**
 * Cache a case for offline viewing
 */
export async function cacheCase(
  caseId: string,
  caseData: Record<string, unknown>,
  ttlHours: number = 24
): Promise<void> {
  const now = Date.now();
  const cachedCase: CachedCase = {
    id: caseId,
    data: caseData,
    cachedAt: now,
    updatedAt: now,
    expiresAt: now + ttlHours * 60 * 60 * 1000,
  };

  await updateInStore(STORES.CASES, cachedCase);
}

/**
 * Get cached case
 */
export async function getCachedCase(
  caseId: string
): Promise<CachedCase | undefined> {
  const cachedCase = await getFromStore(STORES.CASES, caseId);

  if (cachedCase && cachedCase.expiresAt < Date.now()) {
    // Cache expired, remove it
    await deleteFromStore(STORES.CASES, caseId);
    return undefined;
  }

  return cachedCase;
}

/**
 * Remove expired cached cases
 */
export async function cleanExpiredCases(): Promise<number> {
  const allCases = await getAllFromStore(STORES.CASES);
  const now = Date.now();
  let removed = 0;

  for (const cachedCase of allCases) {
    if (cachedCase.expiresAt < now) {
      await deleteFromStore(STORES.CASES, cachedCase.id);
      removed++;
    }
  }

  return removed;
}

// ============================================
// Tip-specific utilities
// ============================================

/**
 * Save offline tip
 */
export async function saveOfflineTip(
  tip: Omit<OfflineTip, 'id' | 'createdAt' | 'synced'>
): Promise<IDBValidKey> {
  const offlineTip: OfflineTip = {
    ...tip,
    createdAt: Date.now(),
    synced: false,
  };

  return addToStore(STORES.TIPS, offlineTip);
}

/**
 * Get all pending tips for a case
 */
export async function getPendingTips(caseId: string): Promise<OfflineTip[]> {
  return getByIndex(STORES.TIPS, 'caseId', caseId);
}

// ============================================
// Evidence upload utilities
// ============================================

/**
 * Queue evidence for upload
 */
export async function queueEvidenceUpload(
  evidence: Omit<EvidenceUpload, 'id' | 'createdAt' | 'synced'>
): Promise<IDBValidKey> {
  const upload: EvidenceUpload = {
    ...evidence,
    createdAt: Date.now(),
    synced: false,
  };

  return addToStore(STORES.EVIDENCE, upload);
}

/**
 * Get pending evidence uploads
 */
export async function getPendingUploads(): Promise<EvidenceUpload[]> {
  return getByIndex(STORES.EVIDENCE, 'synced', 0);
}

// ============================================
// Field data utilities
// ============================================

/**
 * Save field data entry
 */
export async function saveFieldData(
  entry: Omit<FieldDataEntry, 'id' | 'createdAt' | 'updatedAt' | 'synced'>
): Promise<IDBValidKey> {
  const fieldEntry: FieldDataEntry = {
    ...entry,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    synced: false,
  };

  return addToStore(STORES.FIELD_DATA, fieldEntry);
}

/**
 * Update existing field data entry
 */
export async function updateFieldData(
  id: number,
  updates: Partial<FieldDataEntry>
): Promise<void> {
  const existing = await getFromStore(STORES.FIELD_DATA, id);
  if (existing) {
    const updated: FieldDataEntry = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };
    await updateInStore(STORES.FIELD_DATA, updated);
  }
}

// ============================================
// Voice note utilities
// ============================================

/**
 * Save voice note
 */
export async function saveVoiceNote(
  note: Omit<VoiceNote, 'id' | 'createdAt' | 'synced' | 'transcriptionStatus'>
): Promise<IDBValidKey> {
  const voiceNote: VoiceNote = {
    ...note,
    transcriptionStatus: 'pending',
    createdAt: Date.now(),
    synced: false,
  };

  return addToStore(STORES.VOICE_NOTES, voiceNote);
}

/**
 * Update voice note transcript
 */
export async function updateVoiceNoteTranscript(
  id: number,
  transcript: string
): Promise<void> {
  const note = await getFromStore(STORES.VOICE_NOTES, id);
  if (note) {
    note.transcript = transcript;
    note.transcriptionStatus = 'completed';
    await updateInStore(STORES.VOICE_NOTES, note);
  }
}

// ============================================
// Draft form utilities
// ============================================

/**
 * Save or update draft form
 */
export async function saveDraftForm(
  formType: string,
  data: Record<string, unknown>,
  caseId?: string
): Promise<IDBValidKey> {
  // Check if draft already exists
  const existing = await getByIndex(STORES.DRAFT_FORMS, 'formType', formType);
  const matchingDraft = existing.find(
    (d) => d.formType === formType && d.caseId === caseId
  );

  if (matchingDraft && matchingDraft.id) {
    matchingDraft.data = data;
    matchingDraft.lastSavedAt = Date.now();
    await updateInStore(STORES.DRAFT_FORMS, matchingDraft);
    return matchingDraft.id;
  }

  const draft: DraftForm = {
    formType,
    caseId,
    data,
    lastSavedAt: Date.now(),
  };

  return addToStore(STORES.DRAFT_FORMS, draft);
}

/**
 * Get draft form
 */
export async function getDraftForm(
  formType: string,
  caseId?: string
): Promise<DraftForm | undefined> {
  const drafts = await getByIndex(STORES.DRAFT_FORMS, 'formType', formType);
  return drafts.find((d) => d.caseId === caseId);
}

/**
 * Delete draft form
 */
export async function deleteDraftForm(
  formType: string,
  caseId?: string
): Promise<void> {
  const draft = await getDraftForm(formType, caseId);
  if (draft && draft.id) {
    await deleteFromStore(STORES.DRAFT_FORMS, draft.id);
  }
}

// ============================================
// Location utilities
// ============================================

/**
 * Save user location
 */
export async function saveUserLocation(
  latitude: number,
  longitude: number,
  accuracy?: number
): Promise<void> {
  // Clear old locations and save new one
  await clearStore(STORES.USER_LOCATION);

  const location: UserLocation = {
    latitude,
    longitude,
    accuracy,
    timestamp: Date.now(),
  };

  await addToStore(STORES.USER_LOCATION, location);
}

/**
 * Get last known user location
 */
export async function getLastLocation(): Promise<UserLocation | undefined> {
  const locations = await getAllFromStore(STORES.USER_LOCATION);
  return locations[0];
}

// ============================================
// Sync queue utilities
// ============================================

/**
 * Add request to sync queue
 */
export async function queueForSync(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string
): Promise<IDBValidKey> {
  const item: SyncQueueItem = {
    url,
    method,
    headers,
    body,
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 3,
  };

  return addToStore(STORES.SYNC_QUEUE, item);
}

/**
 * Get pending sync items
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return getAllFromStore(STORES.SYNC_QUEUE);
}

/**
 * Increment retry count for sync item
 */
export async function incrementSyncRetry(id: number): Promise<boolean> {
  const item = await getFromStore(STORES.SYNC_QUEUE, id);
  if (item) {
    item.retryCount++;
    if (item.retryCount >= item.maxRetries) {
      // Max retries reached, remove from queue
      await deleteFromStore(STORES.SYNC_QUEUE, id);
      return false;
    }
    await updateInStore(STORES.SYNC_QUEUE, item);
    return true;
  }
  return false;
}

// ============================================
// Storage utilities
// ============================================

/**
 * Get storage usage estimate
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentUsed: estimate.quota
        ? ((estimate.usage || 0) / estimate.quota) * 100
        : 0,
    };
  }
  return { usage: 0, quota: 0, percentUsed: 0 };
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    return navigator.storage.persist();
  }
  return false;
}

/**
 * Check if storage is persistent
 */
export async function isStoragePersistent(): Promise<boolean> {
  if ('storage' in navigator && 'persisted' in navigator.storage) {
    return navigator.storage.persisted();
  }
  return false;
}
