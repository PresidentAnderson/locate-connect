/**
 * Credentials Vault Service
 * Main service for managing encrypted integration credentials
 */

import type {
  VaultCredential,
  DecryptedCredential,
  CredentialInput,
  CredentialData,
  AuthenticationType,
} from '@/types';
import {
  EncryptionService,
  getEncryptionService,
  encryptJSON,
  decryptJSON,
} from './encryption';
import {
  AccessControlService,
  getAccessControlService,
  type AccessControlContext,
} from './access-control';
import { AuditLoggerService, getAuditLogger } from './audit-logger';

export interface VaultServiceConfig {
  enableCaching?: boolean;
  cacheTTLMs?: number;
  enableAuditLogging?: boolean;
}

interface CacheEntry {
  credential: DecryptedCredential;
  expiresAt: number;
}

/**
 * Credentials Vault Service
 * Provides secure storage and retrieval of integration credentials
 */
export class CredentialsVaultService {
  private credentials: Map<string, VaultCredential> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private encryption: EncryptionService;
  private accessControl: AccessControlService;
  private auditLogger: AuditLoggerService;
  private config: Required<VaultServiceConfig>;

  constructor(config: VaultServiceConfig = {}) {
    this.encryption = getEncryptionService();
    this.accessControl = getAccessControlService();
    this.auditLogger = getAuditLogger();

    this.config = {
      enableCaching: config.enableCaching ?? false,
      cacheTTLMs: config.cacheTTLMs ?? 5 * 60 * 1000, // 5 minutes default
      enableAuditLogging: config.enableAuditLogging ?? true,
    };
  }

  /**
   * Store a new credential in the vault
   */
  async store(
    context: AccessControlContext,
    input: CredentialInput
  ): Promise<VaultCredential> {
    // Check permission
    const accessCheck = this.accessControl.checkPermission(
      context,
      'credential:create'
    );
    if (!accessCheck.allowed) {
      if (this.config.enableAuditLogging) {
        await this.auditLogger.logAccessDenied(
          context,
          'new',
          accessCheck.reason || 'Permission denied',
          input.name
        );
      }
      throw new Error(accessCheck.reason || 'Permission denied');
    }

    // Generate credential ID
    const id = crypto.randomUUID();

    // Encrypt credential data
    const encryptedEnvelope = encryptJSON(
      input.data as Record<string, unknown>,
      this.encryption
    );

    // Create vault credential
    const credential: VaultCredential = {
      id,
      name: input.name,
      type: input.type,
      integrationId: input.integrationId,
      encryptedData: encryptedEnvelope.ciphertext,
      encryptionKeyId: encryptedEnvelope.keyId,
      iv: encryptedEnvelope.iv,
      authTag: encryptedEnvelope.authTag,
      allowedUsers: input.allowedUsers || [],
      allowedRoles: input.allowedRoles || ['admin', 'super_admin'],
      expiresAt: input.expiresAt,
      rotationSchedule: input.rotationSchedule,
      rotationCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: context.userId,
      status: 'active',
    };

    // Store in memory (would be database in production)
    this.credentials.set(id, credential);

    // Log creation
    if (this.config.enableAuditLogging) {
      await this.auditLogger.logCreate(
        context,
        id,
        input.name,
        input.integrationId
      );
    }

    return credential;
  }

  /**
   * Retrieve a decrypted credential
   */
  async retrieve(
    context: AccessControlContext,
    credentialId: string
  ): Promise<DecryptedCredential> {
    // Get credential from storage
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      if (this.config.enableAuditLogging) {
        await this.auditLogger.logAccessDenied(
          context,
          credentialId,
          'Credential not found'
        );
      }
      throw new Error('Credential not found');
    }

    // Check if revoked or expired
    if (credential.status === 'revoked') {
      if (this.config.enableAuditLogging) {
        await this.auditLogger.logAccessDenied(
          context,
          credentialId,
          'Credential has been revoked',
          credential.name
        );
      }
      throw new Error('Credential has been revoked');
    }

    if (credential.status === 'expired' || this.isExpired(credential)) {
      if (this.config.enableAuditLogging) {
        await this.auditLogger.logAccessDenied(
          context,
          credentialId,
          'Credential has expired',
          credential.name
        );
      }
      throw new Error('Credential has expired');
    }

    // Check access permission
    const accessCheck = this.accessControl.canAccessCredential(
      context,
      credential,
      'credential:read'
    );
    if (!accessCheck.allowed) {
      if (this.config.enableAuditLogging) {
        await this.auditLogger.logAccessDenied(
          context,
          credentialId,
          accessCheck.reason || 'Access denied',
          credential.name
        );
      }
      throw new Error(accessCheck.reason || 'Access denied');
    }

    // Check cache if enabled
    if (this.config.enableCaching) {
      const cached = this.cache.get(credentialId);
      if (cached && cached.expiresAt > Date.now()) {
        // Log retrieval from cache
        if (this.config.enableAuditLogging) {
          await this.auditLogger.logRetrieve(
            context,
            credentialId,
            credential.name,
            credential.integrationId
          );
        }
        return cached.credential;
      }
    }

    // Decrypt credential data
    const decryptedData = decryptJSON<CredentialData>(
      {
        ciphertext: credential.encryptedData,
        iv: credential.iv,
        authTag: credential.authTag,
        keyId: credential.encryptionKeyId,
        algorithm: 'aes-256-gcm',
        version: 1,
      },
      this.encryption
    );

    const decrypted: DecryptedCredential = {
      id: credential.id,
      name: credential.name,
      type: credential.type,
      data: decryptedData,
      expiresAt: credential.expiresAt,
    };

    // Update cache if enabled
    if (this.config.enableCaching) {
      this.cache.set(credentialId, {
        credential: decrypted,
        expiresAt: Date.now() + this.config.cacheTTLMs,
      });
    }

    // Update last accessed
    credential.lastAccessedAt = new Date().toISOString();
    credential.lastAccessedBy = context.userId;

    // Log retrieval
    if (this.config.enableAuditLogging) {
      await this.auditLogger.logRetrieve(
        context,
        credentialId,
        credential.name,
        credential.integrationId
      );
    }

    return decrypted;
  }

  /**
   * Rotate credential data (update with new values)
   */
  async rotate(
    context: AccessControlContext,
    credentialId: string,
    newData: CredentialData,
    reason?: string
  ): Promise<VaultCredential> {
    // Get existing credential
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    // Check rotation permission
    const accessCheck = this.accessControl.canAccessCredential(
      context,
      credential,
      'credential:rotate'
    );
    if (!accessCheck.allowed) {
      if (this.config.enableAuditLogging) {
        await this.auditLogger.logAccessDenied(
          context,
          credentialId,
          accessCheck.reason || 'Rotation denied',
          credential.name
        );
      }
      throw new Error(accessCheck.reason || 'Rotation denied');
    }

    // Mark as rotating
    credential.status = 'rotating';

    // Encrypt new data
    const encryptedEnvelope = encryptJSON(
      newData as Record<string, unknown>,
      this.encryption
    );

    // Update credential
    credential.encryptedData = encryptedEnvelope.ciphertext;
    credential.encryptionKeyId = encryptedEnvelope.keyId;
    credential.iv = encryptedEnvelope.iv;
    credential.authTag = encryptedEnvelope.authTag;
    credential.lastRotated = new Date().toISOString();
    credential.rotationCount += 1;
    credential.updatedAt = new Date().toISOString();
    credential.status = 'active';

    // Clear cache
    if (this.config.enableCaching) {
      this.cache.delete(credentialId);
    }

    // Log rotation
    if (this.config.enableAuditLogging) {
      await this.auditLogger.logRotate(
        context,
        credentialId,
        credential.name,
        reason
      );
    }

    return credential;
  }

  /**
   * Revoke a credential
   */
  async revoke(
    context: AccessControlContext,
    credentialId: string,
    reason: string
  ): Promise<void> {
    // Get existing credential
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    // Check revocation permission
    const accessCheck = this.accessControl.canAccessCredential(
      context,
      credential,
      'credential:revoke'
    );
    if (!accessCheck.allowed) {
      if (this.config.enableAuditLogging) {
        await this.auditLogger.logAccessDenied(
          context,
          credentialId,
          accessCheck.reason || 'Revocation denied',
          credential.name
        );
      }
      throw new Error(accessCheck.reason || 'Revocation denied');
    }

    // Revoke
    credential.status = 'revoked';
    credential.revokedAt = new Date().toISOString();
    credential.revokedBy = context.userId;
    credential.revokeReason = reason;
    credential.updatedAt = new Date().toISOString();

    // Clear cache
    if (this.config.enableCaching) {
      this.cache.delete(credentialId);
    }

    // Log revocation
    if (this.config.enableAuditLogging) {
      await this.auditLogger.logRevoke(
        context,
        credentialId,
        credential.name,
        reason
      );
    }
  }

  /**
   * Delete a credential (permanent)
   */
  async delete(
    context: AccessControlContext,
    credentialId: string,
    reason?: string
  ): Promise<void> {
    // Get existing credential
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    // Check deletion permission
    const accessCheck = this.accessControl.canAccessCredential(
      context,
      credential,
      'credential:delete'
    );
    if (!accessCheck.allowed) {
      if (this.config.enableAuditLogging) {
        await this.auditLogger.logAccessDenied(
          context,
          credentialId,
          accessCheck.reason || 'Deletion denied',
          credential.name
        );
      }
      throw new Error(accessCheck.reason || 'Deletion denied');
    }

    // Delete
    this.credentials.delete(credentialId);

    // Clear cache
    if (this.config.enableCaching) {
      this.cache.delete(credentialId);
    }

    // Log deletion
    if (this.config.enableAuditLogging) {
      await this.auditLogger.logDelete(
        context,
        credentialId,
        credential.name,
        reason
      );
    }
  }

  /**
   * List credentials (without decrypted data)
   */
  async list(
    context: AccessControlContext,
    filter?: {
      integrationId?: string;
      type?: AuthenticationType;
      status?: VaultCredential['status'];
    }
  ): Promise<VaultCredential[]> {
    // Check permission
    const accessCheck = this.accessControl.checkPermission(
      context,
      'credential:read'
    );
    if (!accessCheck.allowed) {
      return [];
    }

    let credentials = Array.from(this.credentials.values());

    // Apply filters
    if (filter?.integrationId) {
      credentials = credentials.filter(
        (c) => c.integrationId === filter.integrationId
      );
    }
    if (filter?.type) {
      credentials = credentials.filter((c) => c.type === filter.type);
    }
    if (filter?.status) {
      credentials = credentials.filter((c) => c.status === filter.status);
    }

    // Filter by access (non-admin users only see their accessible credentials)
    if (context.userRole !== 'admin' && context.userRole !== 'super_admin') {
      credentials = credentials.filter((c) => {
        return (
          c.allowedUsers.includes(context.userId) ||
          c.allowedRoles.some((role) =>
            this.accessControl.userHasRole(context, role as any)
          )
        );
      });
    }

    return credentials;
  }

  /**
   * Get credential metadata (without decrypted data)
   */
  async getMetadata(
    context: AccessControlContext,
    credentialId: string
  ): Promise<Omit<VaultCredential, 'encryptedData' | 'iv' | 'authTag'> | null> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      return null;
    }

    // Check access
    const accessCheck = this.accessControl.canAccessCredential(
      context,
      credential,
      'credential:read'
    );
    if (!accessCheck.allowed) {
      return null;
    }

    // Return metadata without encrypted data
    const { encryptedData, iv, authTag, ...metadata } = credential;
    return metadata;
  }

  /**
   * Update credential access control
   */
  async updateAccessControl(
    context: AccessControlContext,
    credentialId: string,
    allowedUsers: string[],
    allowedRoles: string[]
  ): Promise<VaultCredential> {
    // Get existing credential
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    // Check manage_access permission
    const accessCheck = this.accessControl.canAccessCredential(
      context,
      credential,
      'credential:manage_access'
    );
    if (!accessCheck.allowed) {
      if (this.config.enableAuditLogging) {
        await this.auditLogger.logAccessDenied(
          context,
          credentialId,
          accessCheck.reason || 'Access control update denied',
          credential.name
        );
      }
      throw new Error(accessCheck.reason || 'Access control update denied');
    }

    // Validate the new access control
    const validationResult = this.accessControl.validateAccessListUpdate(
      context,
      allowedUsers,
      allowedRoles
    );
    if (!validationResult.allowed) {
      throw new Error(validationResult.reason);
    }

    // Update
    credential.allowedUsers = allowedUsers;
    credential.allowedRoles = allowedRoles;
    credential.updatedAt = new Date().toISOString();

    // Log update
    if (this.config.enableAuditLogging) {
      await this.auditLogger.logUpdate(context, credentialId, credential.name, [
        'allowedUsers',
        'allowedRoles',
      ]);
    }

    return credential;
  }

  /**
   * Check if credential is expired
   */
  private isExpired(credential: VaultCredential): boolean {
    if (!credential.expiresAt) {
      return false;
    }
    return new Date(credential.expiresAt) < new Date();
  }

  /**
   * Clear expired credentials from cache
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [id, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(id);
      }
    }
  }
}

// Singleton instance
let vaultServiceInstance: CredentialsVaultService | null = null;

export function getCredentialsVault(
  config?: VaultServiceConfig
): CredentialsVaultService {
  if (!vaultServiceInstance) {
    vaultServiceInstance = new CredentialsVaultService(config);
  }
  return vaultServiceInstance;
}
