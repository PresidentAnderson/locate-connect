/**
 * Credentials Vault Module
 * Secure storage for integration credentials with AES-256-GCM encryption
 */

export {
  CredentialsVaultService,
  getCredentialsVault,
  type VaultServiceConfig,
} from './vault-service';

export {
  EncryptionService,
  getEncryptionService,
  encryptJSON,
  decryptJSON,
  generateSecureToken,
  hashData,
  type EncryptedEnvelope,
  type EncryptionKey,
} from './encryption';

export {
  AccessControlService,
  getAccessControlService,
  type Role,
  type CredentialPermission,
  type AccessControlContext,
  type AccessCheckResult,
} from './access-control';

export {
  AuditLoggerService,
  getAuditLogger,
  type AuditAction,
  type AuditLogEntry,
  type AuditLogFilter,
} from './audit-logger';
