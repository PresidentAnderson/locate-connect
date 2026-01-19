/**
 * Credentials Vault Service
 * Main service for managing encrypted integration credentials with database persistence
 */

import { createClient } from '@/lib/supabase/server';
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

export interface ExpiringCredential {
  id: string;
  name: string;
  integrationId?: string;
  expiresAt: string;
  daysUntilExpiry: number;
}

/**
 * Credentials Vault Service
 * Provides secure storage and retrieval of integration credentials with database persistence
 */
export class CredentialsVaultService {
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

    // Store in database
    const supabase = await createClient();
    const { error } = await supabase
      .from('integration_credentials')
      .insert({
        id: credential.id,
        name: credential.name,
        type: credential.type,
        integration_id: credential.integrationId,
        encrypted_data: credential.encryptedData,
        encryption_key_id: credential.encryptionKeyId,
        iv: credential.iv,
        auth_tag: credential.authTag,
        allowed_users: credential.allowedUsers,
        allowed_roles: credential.allowedRoles,
        expires_at: credential.expiresAt,
        rotation_schedule: credential.rotationSchedule,
        rotation_count: credential.rotationCount,
        created_at: credential.createdAt,
        updated_at: credential.updatedAt,
        created_by: credential.createdBy,
        status: credential.status,
      });

    if (error) {
      console.error('[CredentialsVault] Store error:', error);
      throw new Error('Failed to store credential');
    }

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
    // Fetch from database
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from('integration_credentials')
      .select('*')
      .eq('id', credentialId)
      .single();

    if (error || !row) {
      if (this.config.enableAuditLogging) {
        await this.auditLogger.logAccessDenied(
          context,
          credentialId,
          'Credential not found'
        );
      }
      throw new Error('Credential not found');
    }

    const credential = this.mapRowToCredential(row);

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

    // Update last accessed in database
    await supabase
      .from('integration_credentials')
      .update({
        last_accessed_at: new Date().toISOString(),
        last_accessed_by: context.userId,
      })
      .eq('id', credentialId);

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
    const supabase = await createClient();

    // Fetch existing credential
    const { data: row, error } = await supabase
      .from('integration_credentials')
      .select('*')
      .eq('id', credentialId)
      .single();

    if (error || !row) {
      throw new Error('Credential not found');
    }

    const credential = this.mapRowToCredential(row);

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

    // Encrypt new data
    const encryptedEnvelope = encryptJSON(
      newData as Record<string, unknown>,
      this.encryption
    );

    const now = new Date().toISOString();

    // Update in database
    const { error: updateError } = await supabase
      .from('integration_credentials')
      .update({
        encrypted_data: encryptedEnvelope.ciphertext,
        encryption_key_id: encryptedEnvelope.keyId,
        iv: encryptedEnvelope.iv,
        auth_tag: encryptedEnvelope.authTag,
        last_rotated: now,
        rotation_count: (credential.rotationCount || 0) + 1,
        updated_at: now,
        status: 'active',
      })
      .eq('id', credentialId);

    if (updateError) {
      throw new Error('Failed to rotate credential');
    }

    // Clear cache
    this.cache.delete(credentialId);

    // Log rotation
    if (this.config.enableAuditLogging) {
      await this.auditLogger.logRotate(
        context,
        credentialId,
        credential.name,
        reason
      );
    }

    // Return updated credential
    return {
      ...credential,
      encryptedData: encryptedEnvelope.ciphertext,
      encryptionKeyId: encryptedEnvelope.keyId,
      iv: encryptedEnvelope.iv,
      authTag: encryptedEnvelope.authTag,
      lastRotated: now,
      rotationCount: (credential.rotationCount || 0) + 1,
      updatedAt: now,
      status: 'active',
    };
  }

  /**
   * Revoke a credential
   */
  async revoke(
    context: AccessControlContext,
    credentialId: string,
    reason: string
  ): Promise<void> {
    const supabase = await createClient();

    // Fetch existing credential
    const { data: row, error } = await supabase
      .from('integration_credentials')
      .select('*')
      .eq('id', credentialId)
      .single();

    if (error || !row) {
      throw new Error('Credential not found');
    }

    const credential = this.mapRowToCredential(row);

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

    const now = new Date().toISOString();

    // Update in database
    const { error: updateError } = await supabase
      .from('integration_credentials')
      .update({
        status: 'revoked',
        revoked_at: now,
        revoked_by: context.userId,
        revoke_reason: reason,
        updated_at: now,
      })
      .eq('id', credentialId);

    if (updateError) {
      throw new Error('Failed to revoke credential');
    }

    // Clear cache
    this.cache.delete(credentialId);

    // Log revocation
    if (this.config.enableAuditLogging) {
      await this.auditLogger.logRevoke(
        context,
        credentialId,
        reason,
        credential.name
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
    const supabase = await createClient();

    // Fetch existing credential
    const { data: row, error } = await supabase
      .from('integration_credentials')
      .select('*')
      .eq('id', credentialId)
      .single();

    if (error || !row) {
      throw new Error('Credential not found');
    }

    const credential = this.mapRowToCredential(row);

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

    // Delete from database
    const { error: deleteError } = await supabase
      .from('integration_credentials')
      .delete()
      .eq('id', credentialId);

    if (deleteError) {
      throw new Error('Failed to delete credential');
    }

    // Clear cache
    this.cache.delete(credentialId);

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

    const supabase = await createClient();
    let query = supabase.from('integration_credentials').select('*');

    // Apply filters
    if (filter?.integrationId) {
      query = query.eq('integration_id', filter.integrationId);
    }
    if (filter?.type) {
      query = query.eq('type', filter.type);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[CredentialsVault] List error:', error);
      return [];
    }

    let credentials = (data || []).map(this.mapRowToCredential);

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
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from('integration_credentials')
      .select('*')
      .eq('id', credentialId)
      .single();

    if (error || !row) {
      return null;
    }

    const credential = this.mapRowToCredential(row);

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
    const supabase = await createClient();

    // Fetch existing credential
    const { data: row, error } = await supabase
      .from('integration_credentials')
      .select('*')
      .eq('id', credentialId)
      .single();

    if (error || !row) {
      throw new Error('Credential not found');
    }

    const credential = this.mapRowToCredential(row);

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

    const now = new Date().toISOString();

    // Update in database
    const { error: updateError } = await supabase
      .from('integration_credentials')
      .update({
        allowed_users: allowedUsers,
        allowed_roles: allowedRoles,
        updated_at: now,
      })
      .eq('id', credentialId);

    if (updateError) {
      throw new Error('Failed to update access control');
    }

    // Log update
    if (this.config.enableAuditLogging) {
      await this.auditLogger.logUpdate(context, credentialId, credential.name, [
        'allowedUsers',
        'allowedRoles',
      ]);
    }

    return {
      ...credential,
      allowedUsers,
      allowedRoles,
      updatedAt: now,
    };
  }

  /**
   * Get credentials expiring within specified days
   */
  async getExpiringCredentials(
    context: AccessControlContext,
    daysUntilExpiry: number = 30
  ): Promise<ExpiringCredential[]> {
    // Check permission
    const accessCheck = this.accessControl.checkPermission(
      context,
      'credential:read'
    );
    if (!accessCheck.allowed) {
      return [];
    }

    const supabase = await createClient();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysUntilExpiry);

    const { data, error } = await supabase
      .from('integration_credentials')
      .select('id, name, integration_id, expires_at')
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .lte('expires_at', futureDate.toISOString())
      .order('expires_at', { ascending: true });

    if (error) {
      console.error('[CredentialsVault] Get expiring error:', error);
      return [];
    }

    const now = new Date();
    return (data || []).map((row) => {
      const expiresAt = new Date(row.expires_at);
      const diffTime = expiresAt.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: row.id,
        name: row.name,
        integrationId: row.integration_id,
        expiresAt: row.expires_at,
        daysUntilExpiry: diffDays,
      };
    });
  }

  /**
   * Check for and mark expired credentials
   */
  async processExpiredCredentials(): Promise<number> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('integration_credentials')
      .update({
        status: 'expired',
        updated_at: now,
      })
      .eq('status', 'active')
      .lt('expires_at', now)
      .select('id');

    if (error) {
      console.error('[CredentialsVault] Process expired error:', error);
      return 0;
    }

    // Clear cache for expired credentials
    (data || []).forEach((row) => this.cache.delete(row.id));

    return data?.length || 0;
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
   * Map database row to VaultCredential
   */
  private mapRowToCredential(row: any): VaultCredential {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      integrationId: row.integration_id,
      encryptedData: row.encrypted_data,
      encryptionKeyId: row.encryption_key_id,
      iv: row.iv,
      authTag: row.auth_tag,
      allowedUsers: row.allowed_users || [],
      allowedRoles: row.allowed_roles || [],
      expiresAt: row.expires_at,
      rotationSchedule: row.rotation_schedule,
      lastRotated: row.last_rotated,
      rotationCount: row.rotation_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      lastAccessedAt: row.last_accessed_at,
      lastAccessedBy: row.last_accessed_by,
      status: row.status,
      revokedAt: row.revoked_at,
      revokedBy: row.revoked_by,
      revokeReason: row.revoke_reason,
    };
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
