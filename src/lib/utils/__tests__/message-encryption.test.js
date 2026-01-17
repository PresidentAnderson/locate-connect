/**
 * Tests for Message Encryption Utilities
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  generateEncryptionKey,
  exportKey,
  importKey,
  encryptMessage,
  decryptMessage,
  generateHash,
  verifyHash,
  generateKeyId,
} from "../message-encryption.js";

test("generateEncryptionKey creates a valid AES-256-GCM key", async () => {
  const key = await generateEncryptionKey();
  assert.ok(key);
  assert.equal(key.type, "secret");
  assert.equal(key.algorithm.name, "AES-GCM");
});

test("exportKey and importKey are reversible", async () => {
  const key = await generateEncryptionKey();
  const exported = await exportKey(key);
  
  assert.ok(exported);
  assert.equal(typeof exported, "string");
  
  const imported = await importKey(exported);
  assert.ok(imported);
  assert.equal(imported.type, "secret");
  assert.equal(imported.algorithm.name, "AES-GCM");
});

test("encryptMessage produces encrypted output", async () => {
  const key = await generateEncryptionKey();
  const plaintext = "Test message content";
  
  const { encrypted, hash } = await encryptMessage(plaintext, key);
  
  assert.ok(encrypted);
  assert.notEqual(encrypted, plaintext);
  assert.ok(hash);
  assert.equal(typeof encrypted, "string");
  assert.equal(typeof hash, "string");
});

test("decryptMessage reverses encryption", async () => {
  const key = await generateEncryptionKey();
  const plaintext = "Test message content";
  
  const { encrypted } = await encryptMessage(plaintext, key);
  const decrypted = await decryptMessage(encrypted, key);
  
  assert.equal(decrypted, plaintext);
});

test("encryption with different keys produces different ciphertext", async () => {
  const plaintext = "Test message";
  const key1 = await generateEncryptionKey();
  const key2 = await generateEncryptionKey();
  
  const { encrypted: enc1 } = await encryptMessage(plaintext, key1);
  const { encrypted: enc2 } = await encryptMessage(plaintext, key2);
  
  assert.notEqual(enc1, enc2);
});

test("decryption with wrong key fails", async () => {
  const plaintext = "Test message";
  const key1 = await generateEncryptionKey();
  const key2 = await generateEncryptionKey();
  
  const { encrypted } = await encryptMessage(plaintext, key1);
  
  await assert.rejects(
    async () => await decryptMessage(encrypted, key2),
    /Failed to decrypt message/
  );
});

test("generateHash creates consistent hashes", async () => {
  const content = "Test content";
  const hash1 = await generateHash(content);
  const hash2 = await generateHash(content);
  
  assert.equal(hash1, hash2);
});

test("generateHash produces different hashes for different content", async () => {
  const hash1 = await generateHash("Content 1");
  const hash2 = await generateHash("Content 2");
  
  assert.notEqual(hash1, hash2);
});

test("verifyHash validates correct hashes", async () => {
  const content = "Test content";
  const hash = await generateHash(content);
  
  const isValid = await verifyHash(content, hash);
  assert.equal(isValid, true);
});

test("verifyHash rejects incorrect hashes", async () => {
  const content = "Test content";
  const hash = await generateHash("Different content");
  
  const isValid = await verifyHash(content, hash);
  assert.equal(isValid, false);
});

test("generateKeyId creates unique identifiers", () => {
  const id1 = generateKeyId();
  const id2 = generateKeyId();
  
  assert.ok(id1);
  assert.ok(id2);
  assert.notEqual(id1, id2);
  assert.ok(id1.startsWith("key_"));
  assert.ok(id2.startsWith("key_"));
});

test("empty string encryption and decryption", async () => {
  const key = await generateEncryptionKey();
  const plaintext = "";
  
  const { encrypted } = await encryptMessage(plaintext, key);
  const decrypted = await decryptMessage(encrypted, key);
  
  assert.equal(decrypted, plaintext);
});

test("long message encryption and decryption", async () => {
  const key = await generateEncryptionKey();
  const plaintext = "A".repeat(10000); // 10KB message
  
  const { encrypted } = await encryptMessage(plaintext, key);
  const decrypted = await decryptMessage(encrypted, key);
  
  assert.equal(decrypted, plaintext);
});

test("unicode message encryption and decryption", async () => {
  const key = await generateEncryptionKey();
  const plaintext = "Hello 世界 🌍 Привет";
  
  const { encrypted } = await encryptMessage(plaintext, key);
  const decrypted = await decryptMessage(encrypted, key);
  
  assert.equal(decrypted, plaintext);
});
