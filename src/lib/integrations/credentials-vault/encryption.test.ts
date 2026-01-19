/**
 * Tests for Credentials Vault - Encryption Module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EncryptionService,
  encryptJSON,
  decryptJSON,
  generateSecureToken,
  hashData,
  type EncryptedEnvelope,
} from './encryption';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    // Set test master key
    vi.stubEnv('CREDENTIALS_MASTER_KEY', 'test-master-key-for-testing-only');
    encryptionService = new EncryptionService();
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'test-secret-value';

      const envelope = encryptionService.encrypt(plaintext);

      expect(envelope.ciphertext).toBeDefined();
      expect(envelope.iv).toBeDefined();
      expect(envelope.authTag).toBeDefined();
      expect(envelope.keyId).toBeDefined();
      expect(envelope.algorithm).toBe('aes-256-gcm');
      expect(envelope.version).toBe(1);

      // Ciphertext should be different from plaintext
      expect(envelope.ciphertext).not.toBe(plaintext);

      const decrypted = encryptionService.decrypt(envelope);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt JSON data', () => {
      const data = {
        api_key: 'sk-test-12345',
        api_secret: 'secret-value',
        nested: {
          field: 'value',
        },
      };

      const jsonString = JSON.stringify(data);
      const envelope = encryptionService.encrypt(jsonString);
      const decrypted = encryptionService.decrypt(envelope);

      expect(JSON.parse(decrypted)).toEqual(data);
    });

    it('should generate unique IVs for each encryption', () => {
      const plaintext = 'same-plaintext';

      const envelope1 = encryptionService.encrypt(plaintext);
      const envelope2 = encryptionService.encrypt(plaintext);

      // IVs should be different
      expect(envelope1.iv).not.toBe(envelope2.iv);

      // Ciphertexts should be different due to different IVs
      expect(envelope1.ciphertext).not.toBe(envelope2.ciphertext);

      // But both should decrypt to the same value
      expect(encryptionService.decrypt(envelope1)).toBe(plaintext);
      expect(encryptionService.decrypt(envelope2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const plaintext = '';

      const envelope = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(envelope);

      expect(decrypted).toBe('');
    });

    it('should handle special characters', () => {
      const plaintext = '特殊字符 émojis 🔐 <script>alert("xss")</script>';

      const envelope = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(envelope);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);

      const envelope = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(envelope);

      expect(decrypted).toBe(plaintext);
    });

    it('should fail decryption with tampered ciphertext', () => {
      const plaintext = 'test-secret';
      const envelope = encryptionService.encrypt(plaintext);

      // Tamper with ciphertext
      const tamperedEnvelope: EncryptedEnvelope = {
        ...envelope,
        ciphertext: envelope.ciphertext.slice(0, -4) + 'XXXX',
      };

      expect(() => encryptionService.decrypt(tamperedEnvelope)).toThrow();
    });

    it('should fail decryption with tampered auth tag', () => {
      const plaintext = 'test-secret';
      const envelope = encryptionService.encrypt(plaintext);

      // Tamper with auth tag
      const tamperedEnvelope: EncryptedEnvelope = {
        ...envelope,
        authTag: 'invalidauthtagvalue==',
      };

      expect(() => encryptionService.decrypt(tamperedEnvelope)).toThrow();
    });

    it('should fail decryption with wrong IV', () => {
      const plaintext = 'test-secret';
      const envelope = encryptionService.encrypt(plaintext);

      // Create a different envelope and use its IV
      const otherEnvelope = encryptionService.encrypt('other-secret');
      const tamperedEnvelope: EncryptedEnvelope = {
        ...envelope,
        iv: otherEnvelope.iv,
      };

      expect(() => encryptionService.decrypt(tamperedEnvelope)).toThrow();
    });
  });

  describe('reEncrypt', () => {
    it('should re-encrypt data with current key', () => {
      const plaintext = 'original-secret';
      const originalEnvelope = encryptionService.encrypt(plaintext);

      const reEncrypted = encryptionService.reEncrypt(originalEnvelope);

      // New envelope should have different IV and ciphertext
      expect(reEncrypted.iv).not.toBe(originalEnvelope.iv);
      expect(reEncrypted.ciphertext).not.toBe(originalEnvelope.ciphertext);

      // But should decrypt to same value
      expect(encryptionService.decrypt(reEncrypted)).toBe(plaintext);
    });
  });

  describe('rotateKey', () => {
    it('should rotate to a new master key', () => {
      const oldKeyId = encryptionService.getCurrentKeyId();

      const newKeyId = encryptionService.rotateKey('new-master-key');

      expect(newKeyId).not.toBe(oldKeyId);
      expect(encryptionService.getCurrentKeyId()).toBe(newKeyId);
    });

    it('should be able to decrypt data encrypted with old key after rotation', () => {
      const plaintext = 'secret-before-rotation';
      const oldEnvelope = encryptionService.encrypt(plaintext);

      // Rotate key
      encryptionService.rotateKey('new-master-key');

      // Should still be able to decrypt with old key ID
      const decrypted = encryptionService.decrypt(oldEnvelope);
      expect(decrypted).toBe(plaintext);
    });

    it('should use new key for new encryptions after rotation', () => {
      const oldKeyId = encryptionService.getCurrentKeyId();

      encryptionService.rotateKey('new-master-key');

      const newEnvelope = encryptionService.encrypt('new-secret');
      expect(newEnvelope.keyId).not.toBe(oldKeyId);
      expect(newEnvelope.keyId).toBe(encryptionService.getCurrentKeyId());
    });
  });

  describe('verifyMasterKey', () => {
    it('should verify correct master key', () => {
      // encryptionService was created with 'test-master-key-for-testing-only' from beforeEach
      expect(encryptionService.verifyMasterKey('test-master-key-for-testing-only')).toBe(true);
    });

    it('should reject incorrect master key', () => {
      expect(encryptionService.verifyMasterKey('wrong-key')).toBe(false);
    });
  });

  describe('getCurrentKeyId', () => {
    it('should return a key ID in expected format', () => {
      const keyId = encryptionService.getCurrentKeyId();
      expect(keyId).toMatch(/^key_[a-z0-9]+_[a-f0-9]+$/);
    });

    it('should return consistent key ID within instance', () => {
      const keyId1 = encryptionService.getCurrentKeyId();
      const keyId2 = encryptionService.getCurrentKeyId();
      expect(keyId1).toBe(keyId2);
    });
  });
});

describe('encryptJSON/decryptJSON', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    vi.stubEnv('CREDENTIALS_MASTER_KEY', 'test-key');
    encryptionService = new EncryptionService();
  });

  it('should encrypt and decrypt JSON objects', () => {
    const data = {
      api_key: 'sk-12345',
      client_id: 'client-abc',
      client_secret: 'secret-xyz',
    };

    const envelope = encryptJSON(data, encryptionService);
    const decrypted = decryptJSON<typeof data>(envelope, encryptionService);

    expect(decrypted).toEqual(data);
  });

  it('should handle nested objects', () => {
    const data = {
      credentials: {
        primary: {
          key: 'primary-key',
        },
        secondary: {
          key: 'secondary-key',
        },
      },
      config: {
        timeout: 5000,
        enabled: true,
      },
    };

    const envelope = encryptJSON(data, encryptionService);
    const decrypted = decryptJSON<typeof data>(envelope, encryptionService);

    expect(decrypted).toEqual(data);
  });

  it('should handle arrays in JSON', () => {
    const data = {
      api_keys: ['key1', 'key2', 'key3'],
      scopes: ['read', 'write'],
    };

    const envelope = encryptJSON(data, encryptionService);
    const decrypted = decryptJSON<typeof data>(envelope, encryptionService);

    expect(decrypted).toEqual(data);
  });

  it('should handle null values', () => {
    const data = {
      api_key: 'test',
      refresh_token: null,
    };

    const envelope = encryptJSON(data, encryptionService);
    const decrypted = decryptJSON<typeof data>(envelope, encryptionService);

    expect(decrypted).toEqual(data);
  });
});

describe('generateSecureToken', () => {
  it('should generate token of default length', () => {
    const token = generateSecureToken();
    // Base64url encoding: 32 bytes = ~43 chars
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it('should generate token of specified length', () => {
    const token16 = generateSecureToken(16);
    const token64 = generateSecureToken(64);

    expect(token16.length).toBeLessThan(token64.length);
  });

  it('should generate unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateSecureToken());
    }
    expect(tokens.size).toBe(100);
  });

  it('should generate URL-safe tokens', () => {
    const token = generateSecureToken();
    // Base64url should not contain +, /, or =
    expect(token).not.toMatch(/[+/=]/);
  });
});

describe('hashData', () => {
  it('should hash data consistently', () => {
    const data = 'test-data';
    const hash1 = hashData(data);
    const hash2 = hashData(data);

    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different data', () => {
    const hash1 = hashData('data1');
    const hash2 = hashData('data2');

    expect(hash1).not.toBe(hash2);
  });

  it('should hash with salt when provided', () => {
    const data = 'test-data';
    const hashWithoutSalt = hashData(data);
    const hashWithSalt = hashData(data, 'salt');

    expect(hashWithoutSalt).not.toBe(hashWithSalt);
  });

  it('should produce different hashes with different salts', () => {
    const data = 'test-data';
    const hash1 = hashData(data, 'salt1');
    const hash2 = hashData(data, 'salt2');

    expect(hash1).not.toBe(hash2);
  });

  it('should produce consistent hashes with same salt', () => {
    const data = 'test-data';
    const hash1 = hashData(data, 'same-salt');
    const hash2 = hashData(data, 'same-salt');

    expect(hash1).toBe(hash2);
  });

  it('should produce 64-character hex hash (SHA-256)', () => {
    const hash = hashData('any-data');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
