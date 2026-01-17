/**
 * Public API Service
 * Manages API keys and third-party access
 */

import type {
  PublicAPIKey,
  PublicAPIScope,
  PublicAPIRequest,
} from "@/types/compliance.types";

class PublicAPIService {
  private apiKeys: Map<string, PublicAPIKey> = new Map();
  private apiRequests: Map<string, PublicAPIRequest> = new Map();

  /**
   * Generate API key
   */
  private generateAPIKey(): { key: string; prefix: string; hashedKey: string } {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "lc_";
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const prefix = key.substring(0, 11); // "lc_" + first 8 chars
    const hashedKey = this.hashKey(key);

    return { key, prefix, hashedKey };
  }

  /**
   * Hash API key
   */
  private hashKey(key: string): string {
    // In production, use proper hashing (bcrypt, argon2)
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Submit API access request
   */
  async submitRequest(input: {
    organizationName: string;
    contactName: string;
    contactEmail: string;
    purpose: string;
    requestedScopes: PublicAPIScope[];
  }): Promise<PublicAPIRequest> {
    const id = crypto.randomUUID();

    const request: PublicAPIRequest = {
      id,
      organizationName: input.organizationName,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      purpose: input.purpose,
      requestedScopes: input.requestedScopes,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    this.apiRequests.set(id, request);
    console.log(`[PublicAPI] Request submitted by ${input.organizationName}`);

    return request;
  }

  /**
   * Get API request
   */
  getRequest(requestId: string): PublicAPIRequest | null {
    return this.apiRequests.get(requestId) || null;
  }

  /**
   * List API requests
   */
  listRequests(status?: PublicAPIRequest["status"]): PublicAPIRequest[] {
    let requests = Array.from(this.apiRequests.values());

    if (status) {
      requests = requests.filter((r) => r.status === status);
    }

    return requests.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Approve API request and generate key
   */
  async approveRequest(
    requestId: string,
    approvedScopes: PublicAPIScope[],
    rateLimit: number,
    reviewerId: string
  ): Promise<{ apiKey: PublicAPIKey; rawKey: string } | null> {
    const request = this.apiRequests.get(requestId);
    if (!request || request.status !== "pending") return null;

    // Generate API key
    const { key, prefix, hashedKey } = this.generateAPIKey();

    const apiKey: PublicAPIKey = {
      id: crypto.randomUUID(),
      name: `${request.organizationName} API Key`,
      organizationId: crypto.randomUUID(),
      organizationName: request.organizationName,
      keyPrefix: prefix,
      hashedKey,
      scopes: approvedScopes,
      rateLimit,
      status: "active",
      totalRequests: 0,
      createdAt: new Date().toISOString(),
      createdBy: reviewerId,
    };

    this.apiKeys.set(apiKey.id, apiKey);

    // Update request
    request.status = "approved";
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = reviewerId;
    request.apiKeyId = apiKey.id;
    this.apiRequests.set(requestId, request);

    console.log(`[PublicAPI] Request approved, key issued: ${prefix}`);

    return { apiKey, rawKey: key };
  }

  /**
   * Deny API request
   */
  async denyRequest(requestId: string, reviewerId: string): Promise<boolean> {
    const request = this.apiRequests.get(requestId);
    if (!request || request.status !== "pending") return false;

    request.status = "denied";
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = reviewerId;
    this.apiRequests.set(requestId, request);

    console.log(`[PublicAPI] Request denied: ${requestId}`);
    return true;
  }

  /**
   * Validate API key
   */
  validateKey(key: string): { valid: boolean; keyData?: PublicAPIKey } {
    const hashedKey = this.hashKey(key);

    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.hashedKey === hashedKey && apiKey.status === "active") {
        return { valid: true, keyData: apiKey };
      }
    }

    return { valid: false };
  }

  /**
   * Check scope
   */
  hasScope(keyId: string, scope: PublicAPIScope): boolean {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) return false;
    return apiKey.scopes.includes(scope);
  }

  /**
   * Record API usage
   */
  recordUsage(keyId: string): void {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) return;

    apiKey.lastUsedAt = new Date().toISOString();
    apiKey.totalRequests++;
    this.apiKeys.set(keyId, apiKey);
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(keyId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: string;
  }> {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) {
      return { allowed: false, remaining: 0, resetAt: new Date().toISOString() };
    }

    // In production, use Redis for rate limiting
    // This is a simplified implementation
    const now = new Date();
    const resetAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

    return {
      allowed: true,
      remaining: apiKey.rateLimit,
      resetAt: resetAt.toISOString(),
    };
  }

  /**
   * Suspend API key
   */
  suspendKey(keyId: string): boolean {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) return false;

    apiKey.status = "suspended";
    this.apiKeys.set(keyId, apiKey);

    console.log(`[PublicAPI] Key suspended: ${apiKey.keyPrefix}`);
    return true;
  }

  /**
   * Revoke API key
   */
  revokeKey(keyId: string): boolean {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) return false;

    apiKey.status = "revoked";
    this.apiKeys.set(keyId, apiKey);

    console.log(`[PublicAPI] Key revoked: ${apiKey.keyPrefix}`);
    return true;
  }

  /**
   * Reactivate API key
   */
  reactivateKey(keyId: string): boolean {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey || apiKey.status === "revoked") return false;

    apiKey.status = "active";
    this.apiKeys.set(keyId, apiKey);

    console.log(`[PublicAPI] Key reactivated: ${apiKey.keyPrefix}`);
    return true;
  }

  /**
   * List API keys
   */
  listKeys(organizationId?: string): PublicAPIKey[] {
    let keys = Array.from(this.apiKeys.values());

    if (organizationId) {
      keys = keys.filter((k) => k.organizationId === organizationId);
    }

    return keys;
  }

  /**
   * Get API key by ID
   */
  getKey(keyId: string): PublicAPIKey | null {
    return this.apiKeys.get(keyId) || null;
  }

  /**
   * Get available scopes
   */
  getAvailableScopes(): Array<{
    scope: PublicAPIScope;
    description: string;
    riskLevel: "low" | "medium" | "high";
  }> {
    return [
      {
        scope: "cases:read",
        description: "Read public case information",
        riskLevel: "low",
      },
      {
        scope: "cases:search",
        description: "Search public cases by criteria",
        riskLevel: "low",
      },
      {
        scope: "tips:submit",
        description: "Submit anonymous tips",
        riskLevel: "low",
      },
      {
        scope: "alerts:read",
        description: "Read active alerts",
        riskLevel: "low",
      },
      {
        scope: "statistics:read",
        description: "Read aggregate statistics",
        riskLevel: "low",
      },
    ];
  }

  /**
   * Get API usage statistics
   */
  getUsageStats(keyId: string): {
    totalRequests: number;
    last24Hours: number;
    last7Days: number;
    byEndpoint: Record<string, number>;
  } {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) {
      return { totalRequests: 0, last24Hours: 0, last7Days: 0, byEndpoint: {} };
    }

    // In production, pull from analytics
    return {
      totalRequests: apiKey.totalRequests,
      last24Hours: 0,
      last7Days: 0,
      byEndpoint: {},
    };
  }
}

export const publicAPIService = new PublicAPIService();
