/**
 * Server-side Push Notification Service
 * Sends web push notifications to subscribed users
 * Uses the web-push library or falls back to logging
 */

import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Types
// =============================================================================

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  tag?: string;
  vibrate?: number[];
  url?: string;
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkPushResult {
  success: boolean;
  sent: number;
  failed: number;
  expired: number;
  errors?: string[];
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// =============================================================================
// Push Service
// =============================================================================

class PushServiceImpl {
  private vapidPublicKey: string;
  private vapidPrivateKey: string;
  private isConfigured: boolean;

  constructor() {
    this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
    this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
    this.isConfigured = Boolean(this.vapidPublicKey && this.vapidPrivateKey);
  }

  /**
   * Send push notification to a specific user
   */
  async sendToUser(userId: string, notification: PushNotification): Promise<PushResult> {
    const supabase = await createClient();

    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, keys')
      .eq('user_id', userId);

    if (error || !subscriptions?.length) {
      return { success: false, error: 'No push subscriptions found for user' };
    }

    // Send to all user's devices
    let successCount = 0;
    let lastError: string | undefined;

    for (const subscription of subscriptions) {
      const result = await this.sendToSubscription(subscription, notification);
      if (result.success) {
        successCount++;
      } else {
        lastError = result.error;
        // If subscription expired, remove it
        if (result.error?.includes('expired') || result.error?.includes('410')) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id);
        }
      }
    }

    return {
      success: successCount > 0,
      messageId: `push-${userId}-${Date.now()}`,
      error: successCount === 0 ? lastError : undefined,
    };
  }

  /**
   * Send push notification to a specific subscription
   */
  private async sendToSubscription(
    subscription: PushSubscription,
    notification: PushNotification
  ): Promise<PushResult> {
    if (!this.isConfigured || process.env.NODE_ENV === 'development') {
      console.log('[PUSH] Would send notification:', {
        endpoint: subscription.endpoint.substring(0, 50) + '...',
        title: notification.title,
        body: notification.body,
      });

      return { success: true, messageId: `simulated-${Date.now()}` };
    }

    try {
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/badge-72x72.png',
        image: notification.image,
        data: {
          url: notification.url,
          ...notification.data,
        },
        actions: notification.actions,
        requireInteraction: notification.requireInteraction,
        tag: notification.tag,
        vibrate: notification.vibrate,
      });

      // Using the Web Push protocol
      // In production, this would use the 'web-push' npm package
      // For now, we simulate the send
      const response = await this.sendWebPush(subscription, payload);

      if (!response.success) {
        return response;
      }

      // Log successful push
      await this.logPush({
        userId: subscription.user_id,
        endpoint: subscription.endpoint,
        title: notification.title,
        status: 'sent',
      });

      return { success: true, messageId: `push-${Date.now()}` };
    } catch (error) {
      console.error('[PUSH] Send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds: string[], notification: PushNotification): Promise<BulkPushResult> {
    let sent = 0;
    let failed = 0;
    let expired = 0;
    const errors: string[] = [];

    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, notification))
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          sent++;
        } else {
          failed++;
          if (result.value.error?.includes('expired')) {
            expired++;
          }
          if (errors.length < 10 && result.value.error) {
            errors.push(result.value.error);
          }
        }
      } else {
        failed++;
        if (errors.length < 10) {
          errors.push(String(result.reason));
        }
      }
    }

    return {
      success: sent > 0,
      sent,
      failed,
      expired,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Send push notification to users in specific provinces
   */
  async sendToProvinces(provinces: string[], notification: PushNotification): Promise<BulkPushResult> {
    const supabase = await createClient();

    // Get users who have opted in to AMBER alerts in these provinces
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select(`
        id, user_id, endpoint, keys,
        profiles!inner (
          province,
          notification_preferences
        )
      `)
      .in('profiles.province', provinces);

    if (error || !subscriptions?.length) {
      console.log('[PUSH] No subscribers found for provinces:', provinces);
      return { success: true, sent: 0, failed: 0, expired: 0 };
    }

    // Filter to only users who have AMBER alerts enabled
    const eligibleSubscriptions = subscriptions.filter(sub => {
      const prefs = (sub.profiles as unknown as { notification_preferences?: { amber_alerts?: boolean } })?.notification_preferences;
      return prefs?.amber_alerts !== false;
    });

    console.log(`[PUSH] Sending to ${eligibleSubscriptions.length} subscribers in provinces:`, provinces);

    let sent = 0;
    let failed = 0;
    let expired = 0;

    for (const sub of eligibleSubscriptions) {
      const result = await this.sendToSubscription(
        { id: sub.id, user_id: sub.user_id, endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
        notification
      );

      if (result.success) {
        sent++;
      } else {
        failed++;
        if (result.error?.includes('expired') || result.error?.includes('410')) {
          expired++;
          // Clean up expired subscription
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    return { success: sent > 0, sent, failed, expired };
  }

  /**
   * Send AMBER Alert push notification
   */
  async sendAmberAlert(options: {
    provinces: string[];
    alertNumber: string;
    childName: string;
    childAge?: number;
    abductionCity: string;
    abductionProvince: string;
    childPhotoUrl?: string;
    alertUrl: string;
  }): Promise<BulkPushResult> {
    const notification: PushNotification = {
      title: `🚨 AMBER Alert: ${options.childName}`,
      body: `Missing ${options.childAge ? `${options.childAge} year old` : 'child'} from ${options.abductionCity}, ${options.abductionProvince}. Tap for details.`,
      icon: options.childPhotoUrl || '/icons/amber-alert.png',
      badge: '/icons/badge-amber.png',
      image: options.childPhotoUrl,
      url: options.alertUrl,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      tag: `amber-${options.alertNumber}`,
      actions: [
        { action: 'view', title: 'View Alert' },
        { action: 'share', title: 'Share' },
      ],
      data: {
        type: 'amber_alert',
        alertNumber: options.alertNumber,
      },
    };

    return this.sendToProvinces(options.provinces, notification);
  }

  /**
   * Send Web Push notification using the Web Push Protocol
   * Implements RFC 8291 (Message Encryption) and RFC 8292 (VAPID)
   */
  private async sendWebPush(
    subscription: PushSubscription,
    payload: string
  ): Promise<PushResult> {
    try {
      const endpoint = subscription.endpoint;
      const p256dh = subscription.keys.p256dh;
      const auth = subscription.keys.auth;

      // Generate local ECDH key pair
      const localKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
      );

      // Import subscriber's public key
      const subscriberPublicKeyBytes = this.base64UrlDecode(p256dh);
      const subscriberPublicKey = await crypto.subtle.importKey(
        'raw',
        subscriberPublicKeyBytes.buffer as ArrayBuffer,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
      );

      // Derive shared secret
      const sharedSecret = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: subscriberPublicKey },
        localKeyPair.privateKey,
        256
      );

      // Export local public key
      const localPublicKeyBytes = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);

      // Get auth secret
      const authSecret = this.base64UrlDecode(auth);

      // Generate salt
      const salt = crypto.getRandomValues(new Uint8Array(16));

      // Derive encryption keys using HKDF
      const ikm = await this.hkdf(
        authSecret,
        new Uint8Array(sharedSecret),
        this.createInfo('WebPush: info\x00', subscriberPublicKeyBytes, new Uint8Array(localPublicKeyBytes)),
        32
      );

      const contentEncryptionKey = await this.hkdf(
        salt,
        ikm,
        new TextEncoder().encode('Content-Encoding: aes128gcm\x00'),
        16
      );

      const nonce = await this.hkdf(
        salt,
        ikm,
        new TextEncoder().encode('Content-Encoding: nonce\x00'),
        12
      );

      // Encrypt the payload using AES-128-GCM
      const paddedPayload = this.padPayload(new TextEncoder().encode(payload));
      const aesKey = await crypto.subtle.importKey(
        'raw',
        contentEncryptionKey.buffer as ArrayBuffer,
        'AES-GCM',
        false,
        ['encrypt']
      );

      const encryptedPayload = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce.buffer as ArrayBuffer },
        aesKey,
        paddedPayload.buffer as ArrayBuffer
      );

      // Build the encrypted body with header
      const recordSize = 4096;
      const body = this.buildEncryptedBody(
        salt,
        new Uint8Array(localPublicKeyBytes),
        new Uint8Array(encryptedPayload),
        recordSize
      );

      // Create VAPID JWT
      const vapidHeaders = await this.createVapidHeaders(endpoint);

      // Send the push notification
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aes128gcm',
          'Content-Length': body.length.toString(),
          'TTL': '86400', // 24 hours
          'Urgency': 'high',
          ...vapidHeaders,
        },
        body: body.buffer as ArrayBuffer,
      });

      if (response.status === 201) {
        return { success: true, messageId: response.headers.get('Location') || `push-${Date.now()}` };
      }

      if (response.status === 410) {
        return { success: false, error: 'Subscription expired (410)' };
      }

      const errorText = await response.text();
      console.error(`[PUSH] Push failed: ${response.status}`, errorText);
      return { success: false, error: `Push failed: ${response.status} - ${errorText}` };
    } catch (error) {
      console.error('[PUSH] Web push error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Web push encryption error',
      };
    }
  }

  /**
   * HKDF (HMAC-based Key Derivation Function)
   */
  private async hkdf(
    salt: Uint8Array,
    ikm: Uint8Array,
    info: Uint8Array,
    length: number
  ): Promise<Uint8Array> {
    // Extract
    const prk = await crypto.subtle.importKey(
      'raw',
      salt.buffer as ArrayBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const prkResult = await crypto.subtle.sign('HMAC', prk, ikm.buffer as ArrayBuffer);

    // Expand
    const key = await crypto.subtle.importKey(
      'raw',
      prkResult,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const infoAndCounter = new Uint8Array(info.length + 1);
    infoAndCounter.set(info);
    infoAndCounter[info.length] = 1;

    const result = await crypto.subtle.sign('HMAC', key, infoAndCounter.buffer as ArrayBuffer);
    return new Uint8Array(result).slice(0, length);
  }

  /**
   * Create info string for HKDF
   */
  private createInfo(infoType: string, subscriberPublicKey: Uint8Array, localPublicKey: Uint8Array): Uint8Array {
    const encoder = new TextEncoder();
    const infoTypeBytes = encoder.encode(infoType);

    const info = new Uint8Array(
      infoTypeBytes.length + 2 + subscriberPublicKey.length + 2 + localPublicKey.length
    );

    let offset = 0;
    info.set(infoTypeBytes, offset);
    offset += infoTypeBytes.length;

    // Subscriber public key length (2 bytes, big endian)
    info[offset++] = 0;
    info[offset++] = subscriberPublicKey.length;
    info.set(subscriberPublicKey, offset);
    offset += subscriberPublicKey.length;

    // Local public key length (2 bytes, big endian)
    info[offset++] = 0;
    info[offset++] = localPublicKey.length;
    info.set(localPublicKey, offset);

    return info;
  }

  /**
   * Pad payload with delimiter byte
   */
  private padPayload(payload: Uint8Array): Uint8Array {
    const padded = new Uint8Array(payload.length + 1);
    padded.set(payload);
    padded[payload.length] = 2; // Delimiter byte
    return padded;
  }

  /**
   * Build the encrypted body with header
   */
  private buildEncryptedBody(
    salt: Uint8Array,
    localPublicKey: Uint8Array,
    encryptedPayload: Uint8Array,
    recordSize: number
  ): Uint8Array {
    // Header: salt (16) + rs (4) + idlen (1) + keyid (65 for P-256)
    const headerLength = 16 + 4 + 1 + localPublicKey.length;
    const body = new Uint8Array(headerLength + encryptedPayload.length);

    let offset = 0;

    // Salt
    body.set(salt, offset);
    offset += 16;

    // Record size (4 bytes, big endian)
    body[offset++] = (recordSize >> 24) & 0xFF;
    body[offset++] = (recordSize >> 16) & 0xFF;
    body[offset++] = (recordSize >> 8) & 0xFF;
    body[offset++] = recordSize & 0xFF;

    // Key ID length
    body[offset++] = localPublicKey.length;

    // Key ID (local public key)
    body.set(localPublicKey, offset);
    offset += localPublicKey.length;

    // Encrypted payload
    body.set(encryptedPayload, offset);

    return body;
  }

  /**
   * Create VAPID headers for authentication
   */
  private async createVapidHeaders(endpoint: string): Promise<Record<string, string>> {
    const audience = new URL(endpoint).origin;
    const subject = 'mailto:noreply@locateconnect.ca';

    // JWT header and payload
    const header = { typ: 'JWT', alg: 'ES256' };
    const payload = {
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      sub: subject,
    };

    const headerB64 = this.base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
    const payloadB64 = this.base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Import VAPID private key and sign
    const privateKeyBytes = this.base64UrlDecode(this.vapidPrivateKey);

    // Build the JWK for the private key
    const publicKeyBytes = this.base64UrlDecode(this.vapidPublicKey);
    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      x: this.base64UrlEncode(publicKeyBytes.slice(1, 33)),
      y: this.base64UrlEncode(publicKeyBytes.slice(33, 65)),
      d: this.base64UrlEncode(privateKeyBytes),
    };

    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      new TextEncoder().encode(unsignedToken)
    );

    // Convert DER signature to raw format
    const signature = this.derToRaw(new Uint8Array(signatureBuffer));
    const signatureB64 = this.base64UrlEncode(signature);
    const jwt = `${unsignedToken}.${signatureB64}`;

    return {
      'Authorization': `vapid t=${jwt}, k=${this.vapidPublicKey}`,
    };
  }

  /**
   * Convert DER signature to raw format
   */
  private derToRaw(der: Uint8Array): Uint8Array {
    // Simple case: already in raw format (64 bytes)
    if (der.length === 64) {
      return der;
    }

    // DER format parsing
    const raw = new Uint8Array(64);
    let rStart = 4;
    let rLen = der[3];

    // Handle padding byte
    if (der[rStart] === 0) {
      rStart++;
      rLen--;
    }

    const sStart = rStart + rLen + 2 + (der[rStart + rLen + 1] === 0 ? 1 : 0);
    let sLen = der[rStart + rLen + 1];

    if (der[sStart - 1] === 0) {
      sLen--;
    }

    raw.set(der.slice(rStart, rStart + Math.min(rLen, 32)), 32 - Math.min(rLen, 32));
    raw.set(der.slice(sStart, sStart + Math.min(sLen, 32)), 64 - Math.min(sLen, 32));

    return raw;
  }

  /**
   * Base64 URL encode
   */
  private base64UrlEncode(data: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...data));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Base64 URL decode
   */
  private base64UrlDecode(str: string): Uint8Array {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const binary = atob(base64 + padding);
    return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
  }

  /**
   * Log push notification for audit
   */
  private async logPush(data: {
    userId: string;
    endpoint: string;
    title: string;
    status: string;
    error?: string;
  }): Promise<void> {
    try {
      const supabase = await createClient();

      await supabase.from('push_notification_logs').insert({
        user_id: data.userId,
        endpoint_hash: this.hashEndpoint(data.endpoint),
        title: data.title,
        status: data.status,
        error_message: data.error,
      });
    } catch (error) {
      console.error('[PUSH] Failed to log push notification:', error);
    }
  }

  /**
   * Hash endpoint for logging (privacy)
   */
  private hashEndpoint(endpoint: string): string {
    // Simple hash for logging purposes
    let hash = 0;
    for (let i = 0; i < endpoint.length; i++) {
      const char = endpoint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

// Export singleton instance
export const pushService = new PushServiceImpl();
