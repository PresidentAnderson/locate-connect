/**
 * Encryption utilities for secure messaging
 * Provides client-side encryption/decryption for messages
 */

/**
 * Generates a random encryption key for AES-256-GCM
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Exports a CryptoKey to a base64 string for storage
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * Imports a base64 string key into a CryptoKey
 */
export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a message using AES-256-GCM
 * Returns base64-encoded encrypted data with IV prepended
 */
export async function encryptMessage(
  plaintext: string,
  key: CryptoKey
): Promise<{ encrypted: string; hash: string }> {
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Convert plaintext to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Convert to base64
  const encryptedBase64 = btoa(String.fromCharCode(...combined));
  
  // Generate hash for integrity verification
  const hash = await generateHash(plaintext);
  
  return {
    encrypted: encryptedBase64,
    hash,
  };
}

/**
 * Decrypts a message encrypted with encryptMessage
 */
export async function decryptMessage(
  encryptedData: string,
  key: CryptoKey
): Promise<string> {
  try {
    // Decode base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );
    
    // Convert bytes to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Generates a SHA-256 hash of the content for integrity verification
 */
export async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

/**
 * Verifies that the hash matches the content
 */
export async function verifyHash(content: string, hash: string): Promise<boolean> {
  const computedHash = await generateHash(content);
  return computedHash === hash;
}

/**
 * Simple symmetric encryption for demo purposes
 * In production, use proper key exchange (e.g., Diffie-Hellman)
 * and key derivation (e.g., PBKDF2)
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const saltData = encoder.encode(salt);
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive key using PBKDF2
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Client-side encryption for secure messaging
 * 
 * PRODUCTION CONSIDERATIONS:
 * - This implementation uses per-thread shared keys for simplicity
 * - For production, consider implementing:
 *   1. End-to-end encryption with public/private key pairs per user
 *   2. Key exchange protocols (e.g., Signal Protocol, Double Ratchet)
 *   3. Forward secrecy with periodic key rotation
 *   4. Proper key management service integration
 *   5. Hardware security module (HSM) for key storage
 */

export interface EncryptionKeyMetadata {
  keyId: string;
  algorithm: 'AES-256-GCM';
  createdAt: string;
  rotatedAt?: string;
}

/**
 * Generates a unique key ID for tracking encryption keys
 */
export function generateKeyId(): string {
  return `key_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Client-side key storage helper (uses sessionStorage for convenience)
 * 
 * SECURITY CONSIDERATIONS:
 * - sessionStorage is accessible to any script on the same origin
 * - For production, consider these more secure alternatives:
 *   1. Store keys only in memory (no persistence)
 *   2. Use IndexedDB with Web Crypto API for encrypted storage
 *   3. Implement proper key derivation that doesn't require client storage
 *   4. Use a secure key management service
 * - Keys are cleared when the browser tab is closed
 * - Never store keys in localStorage (persists across sessions)
 */
export class MessageEncryptionKeyStore {
  private static STORAGE_PREFIX = 'msg_enc_key_';
  
  static async storeKey(keyId: string, key: CryptoKey): Promise<void> {
    const exported = await exportKey(key);
    sessionStorage.setItem(this.STORAGE_PREFIX + keyId, exported);
  }
  
  static async getKey(keyId: string): Promise<CryptoKey | null> {
    const stored = sessionStorage.getItem(this.STORAGE_PREFIX + keyId);
    if (!stored) return null;
    return await importKey(stored);
  }
  
  static removeKey(keyId: string): void {
    sessionStorage.removeItem(this.STORAGE_PREFIX + keyId);
  }
  
  static clearAllKeys(): void {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  }
}
