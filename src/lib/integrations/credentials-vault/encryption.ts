/**
 * Credentials Vault - Encryption Module
 * Implements AES-256-GCM encryption with envelope encryption pattern
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto';

// Encryption constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const KEY_LENGTH = 32; // 256 bits for AES-256
const SCRYPT_N = 16384; // CPU/memory cost parameter
const SCRYPT_R = 8; // Block size
const SCRYPT_P = 1; // Parallelization

export interface EncryptedEnvelope {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyId: string;
  algorithm: string;
  version: number;
}

export interface EncryptionKey {
  id: string;
  key: Buffer;
  createdAt: Date;
  expiresAt?: Date;
  status: 'active' | 'rotating' | 'retired';
}

/**
 * Encryption Service for credential data
 */
export class EncryptionService {
  private masterKeyHash: string;
  private derivedKeys: Map<string, Buffer> = new Map();
  private currentKeyId: string;

  constructor() {
    // Get master key from environment
    const masterKey = process.env.CREDENTIALS_MASTER_KEY;
    if (!masterKey) {
      console.warn('[EncryptionService] CREDENTIALS_MASTER_KEY not set, using fallback for development');
    }

    // Hash the master key for verification
    this.masterKeyHash = this.hashMasterKey(masterKey || 'development-key-do-not-use-in-production');

    // Generate initial key ID
    this.currentKeyId = this.generateKeyId();

    // Derive initial encryption key
    this.deriveKey(this.currentKeyId, masterKey || 'development-key-do-not-use-in-production');
  }

  /**
   * Encrypt credential data
   */
  encrypt(data: string): EncryptedEnvelope {
    const key = this.getKey(this.currentKeyId);
    if (!key) {
      throw new Error('Encryption key not available');
    }

    // Generate random IV
    const iv = randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Encrypt data
    let ciphertext = cipher.update(data, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyId: this.currentKeyId,
      algorithm: ALGORITHM,
      version: 1,
    };
  }

  /**
   * Decrypt credential data
   */
  decrypt(envelope: EncryptedEnvelope): string {
    const key = this.getKey(envelope.keyId);
    if (!key) {
      throw new Error(`Encryption key ${envelope.keyId} not available`);
    }

    // Decode IV and auth tag
    const iv = Buffer.from(envelope.iv, 'base64');
    const authTag = Buffer.from(envelope.authTag, 'base64');

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    // Decrypt data
    let plaintext = decipher.update(envelope.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  /**
   * Re-encrypt data with current key (for key rotation)
   */
  reEncrypt(envelope: EncryptedEnvelope): EncryptedEnvelope {
    // Decrypt with old key
    const plaintext = this.decrypt(envelope);

    // Encrypt with current key
    return this.encrypt(plaintext);
  }

  /**
   * Rotate to a new master key
   */
  rotateKey(newMasterKey: string): string {
    const newKeyId = this.generateKeyId();
    this.deriveKey(newKeyId, newMasterKey);

    const oldKeyId = this.currentKeyId;
    this.currentKeyId = newKeyId;

    // Keep old key for re-encryption of existing data
    // Old keys should be retired after all data is re-encrypted

    return newKeyId;
  }

  /**
   * Get current key ID
   */
  getCurrentKeyId(): string {
    return this.currentKeyId;
  }

  /**
   * Verify master key hash
   */
  verifyMasterKey(key: string): boolean {
    return this.hashMasterKey(key) === this.masterKeyHash;
  }

  /**
   * Derive encryption key from master key
   */
  private deriveKey(keyId: string, masterKey: string): void {
    // Use key ID as salt (ensures different keys for different IDs)
    const salt = createHash('sha256').update(keyId).digest();

    const derivedKey = scryptSync(masterKey, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });

    this.derivedKeys.set(keyId, derivedKey);
  }

  /**
   * Get encryption key by ID
   */
  private getKey(keyId: string): Buffer | undefined {
    return this.derivedKeys.get(keyId);
  }

  /**
   * Hash master key for verification
   */
  private hashMasterKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString('hex');
    return `key_${timestamp}_${random}`;
  }
}

/**
 * Encrypt sensitive JSON data
 */
export function encryptJSON(
  data: Record<string, unknown>,
  encryptionService: EncryptionService
): EncryptedEnvelope {
  const jsonString = JSON.stringify(data);
  return encryptionService.encrypt(jsonString);
}

/**
 * Decrypt to JSON data
 */
export function decryptJSON<T extends Record<string, unknown>>(
  envelope: EncryptedEnvelope,
  encryptionService: EncryptionService
): T {
  const jsonString = encryptionService.decrypt(envelope);
  return JSON.parse(jsonString) as T;
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('base64url');
}

/**
 * Hash data for comparison (e.g., for credential lookups)
 */
export function hashData(data: string, salt?: string): string {
  const hashInput = salt ? `${salt}:${data}` : data;
  return createHash('sha256').update(hashInput).digest('hex');
}

// Singleton instance
let encryptionServiceInstance: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new EncryptionService();
  }
  return encryptionServiceInstance;
}
