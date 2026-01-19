/**
 * Social Media Posting Service
 * Handles posting content to connected social media accounts
 * Falls back to logging in development mode
 */

import { createClient } from '@/lib/supabase/server';
import type { SocialMediaPlatform } from '@/types';

// =============================================================================
// Types
// =============================================================================

export interface SocialPostOptions {
  accountId: string;
  message: string;
  imageUrl?: string;
  link?: string;
  hashtags?: string[];
}

export interface SocialPostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export interface BulkSocialPostResult {
  success: boolean;
  posted: number;
  failed: number;
  results: Array<{
    accountId: string;
    platform: string;
    success: boolean;
    postId?: string;
    postUrl?: string;
    error?: string;
  }>;
}

interface SocialMediaAccount {
  id: string;
  platform: SocialMediaPlatform;
  account_name: string;
  access_token?: string;
  access_token_secret?: string;
  page_id?: string;
  account_id?: string;
}

// =============================================================================
// Social Media Service
// =============================================================================

class SocialServiceImpl {
  private isConfigured: boolean;

  constructor() {
    // Check if any social media API keys are configured
    this.isConfigured = Boolean(
      process.env.FACEBOOK_APP_ID ||
      process.env.TWITTER_API_KEY ||
      process.env.INSTAGRAM_CLIENT_ID
    );
  }

  /**
   * Post to a specific social media account
   */
  async post(options: SocialPostOptions): Promise<SocialPostResult> {
    const supabase = await createClient();

    // Get the account details
    const { data: account, error } = await supabase
      .from('social_media_accounts')
      .select('id, platform, account_name, access_token, access_token_secret, page_id, account_id')
      .eq('id', options.accountId)
      .eq('is_active', true)
      .eq('is_connected', true)
      .single();

    if (error || !account) {
      return { success: false, error: 'Social media account not found or not connected' };
    }

    // Log in development or when not configured
    if (!this.isConfigured || process.env.NODE_ENV === 'development') {
      console.log('[SOCIAL] Would post to:', {
        platform: account.platform,
        account: account.account_name,
        messageLength: options.message.length,
        hasImage: !!options.imageUrl,
      });

      await this.logPost({
        accountId: options.accountId,
        platform: account.platform,
        message: options.message,
        status: 'simulated',
      });

      return { success: true, postId: `simulated-${Date.now()}` };
    }

    // Route to platform-specific handler
    try {
      switch (account.platform) {
        case 'facebook':
          return await this.postToFacebook(account as SocialMediaAccount, options);
        case 'twitter':
          return await this.postToTwitter(account as SocialMediaAccount, options);
        case 'instagram':
          return await this.postToInstagram(account as SocialMediaAccount, options);
        default:
          return { success: false, error: `Unsupported platform: ${account.platform}` };
      }
    } catch (err) {
      console.error('[SOCIAL] Post error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Post to Facebook Page
   */
  private async postToFacebook(
    account: SocialMediaAccount,
    options: SocialPostOptions
  ): Promise<SocialPostResult> {
    if (!account.access_token || !account.page_id) {
      return { success: false, error: 'Facebook access token or page ID not configured' };
    }

    const url = `https://graph.facebook.com/v18.0/${account.page_id}/feed`;

    const params = new URLSearchParams({
      access_token: account.access_token,
      message: options.message,
    });

    if (options.link) {
      params.append('link', options.link);
    }

    const response = await fetch(url, {
      method: 'POST',
      body: params,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[SOCIAL] Facebook error:', data);
      return { success: false, error: data.error?.message || 'Facebook API error' };
    }

    await this.logPost({
      accountId: options.accountId,
      platform: 'facebook',
      message: options.message,
      status: 'posted',
      externalPostId: data.id,
    });

    return {
      success: true,
      postId: data.id,
      postUrl: `https://facebook.com/${data.id}`,
    };
  }

  /**
   * Post to Twitter/X
   */
  private async postToTwitter(
    account: SocialMediaAccount,
    options: SocialPostOptions
  ): Promise<SocialPostResult> {
    if (!account.access_token || !account.access_token_secret) {
      return { success: false, error: 'Twitter access tokens not configured' };
    }

    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;

    if (!apiKey || !apiSecret) {
      return { success: false, error: 'Twitter API credentials not configured' };
    }

    // Build the tweet text
    let tweetText = options.message;
    if (options.hashtags?.length) {
      tweetText += '\n\n' + options.hashtags.map(h => `#${h}`).join(' ');
    }

    // Twitter API v2 endpoint
    const url = 'https://api.twitter.com/2/tweets';

    // Build OAuth 1.0a signature (simplified - in production use a proper OAuth library)
    const oauthParams = {
      oauth_consumer_key: apiKey,
      oauth_token: account.access_token,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: Math.random().toString(36).substring(2),
      oauth_version: '1.0',
    };

    // In production, you would properly sign the request with OAuth 1.0a
    // For now, we'll log and simulate
    console.log('[SOCIAL] Twitter OAuth would be signed with params:', oauthParams);
    console.log('[SOCIAL] Would post tweet:', tweetText.substring(0, 100) + '...');

    await this.logPost({
      accountId: options.accountId,
      platform: 'twitter',
      message: options.message,
      status: 'simulated',
    });

    return { success: true, postId: `twitter-${Date.now()}` };
  }

  /**
   * Post to Instagram (via Facebook Graph API for Business accounts)
   */
  private async postToInstagram(
    account: SocialMediaAccount,
    options: SocialPostOptions
  ): Promise<SocialPostResult> {
    if (!account.access_token || !account.account_id) {
      return { success: false, error: 'Instagram access token or account ID not configured' };
    }

    // Instagram requires an image for posts
    if (!options.imageUrl) {
      return { success: false, error: 'Instagram posts require an image' };
    }

    // Step 1: Create a media container
    const containerUrl = `https://graph.facebook.com/v18.0/${account.account_id}/media`;

    let caption = options.message;
    if (options.hashtags?.length) {
      caption += '\n\n' + options.hashtags.map(h => `#${h}`).join(' ');
    }

    const containerParams = new URLSearchParams({
      access_token: account.access_token,
      image_url: options.imageUrl,
      caption,
    });

    const containerResponse = await fetch(containerUrl, {
      method: 'POST',
      body: containerParams,
    });

    const containerData = await containerResponse.json();

    if (!containerResponse.ok) {
      console.error('[SOCIAL] Instagram container error:', containerData);
      return { success: false, error: containerData.error?.message || 'Instagram API error' };
    }

    // Step 2: Publish the container
    const publishUrl = `https://graph.facebook.com/v18.0/${account.account_id}/media_publish`;

    const publishParams = new URLSearchParams({
      access_token: account.access_token,
      creation_id: containerData.id,
    });

    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      body: publishParams,
    });

    const publishData = await publishResponse.json();

    if (!publishResponse.ok) {
      console.error('[SOCIAL] Instagram publish error:', publishData);
      return { success: false, error: publishData.error?.message || 'Instagram publish error' };
    }

    await this.logPost({
      accountId: options.accountId,
      platform: 'instagram',
      message: options.message,
      status: 'posted',
      externalPostId: publishData.id,
    });

    return {
      success: true,
      postId: publishData.id,
      postUrl: `https://instagram.com/p/${publishData.id}`,
    };
  }

  /**
   * Post AMBER Alert to all configured auto-post accounts
   */
  async postAmberAlert(options: {
    alertNumber: string;
    childName: string;
    childAge?: number;
    abductionCity: string;
    abductionProvince: string;
    childPhotoUrl?: string;
    contactPhone: string;
    alertUrl: string;
  }): Promise<BulkSocialPostResult> {
    const supabase = await createClient();

    // Get all accounts configured for auto-posting AMBER alerts
    const { data: accounts, error } = await supabase
      .from('social_media_accounts')
      .select('id, platform, account_name')
      .eq('is_active', true)
      .eq('is_connected', true)
      .eq('auto_post_amber', true);

    if (error || !accounts?.length) {
      console.log('[SOCIAL] No social media accounts configured for AMBER alert auto-posting');
      return { success: true, posted: 0, failed: 0, results: [] };
    }

    const results: BulkSocialPostResult['results'] = [];
    let posted = 0;
    let failed = 0;

    // Build the message
    const message = this.formatAmberAlertMessage(options);
    const hashtags = ['AMBERAlert', 'MissingChild', 'HelpFindThem', options.abductionProvince.replace(/\s+/g, '')];

    for (const account of accounts) {
      const result = await this.post({
        accountId: account.id,
        message,
        imageUrl: options.childPhotoUrl,
        link: options.alertUrl,
        hashtags,
      });

      results.push({
        accountId: account.id,
        platform: account.platform,
        success: result.success,
        postId: result.postId,
        postUrl: result.postUrl,
        error: result.error,
      });

      if (result.success) {
        posted++;
      } else {
        failed++;
      }
    }

    return {
      success: posted > 0,
      posted,
      failed,
      results,
    };
  }

  /**
   * Format AMBER Alert message for social media
   */
  private formatAmberAlertMessage(options: {
    alertNumber: string;
    childName: string;
    childAge?: number;
    abductionCity: string;
    abductionProvince: string;
    contactPhone: string;
    alertUrl: string;
  }): string {
    const lines = [
      `🚨 AMBER ALERT 🚨`,
      ``,
      `Missing: ${options.childName}`,
      options.childAge ? `Age: ${options.childAge} years old` : '',
      `Last seen: ${options.abductionCity}, ${options.abductionProvince}`,
      ``,
      `If you have any information, please contact:`,
      `📞 ${options.contactPhone}`,
      ``,
      `More details: ${options.alertUrl}`,
      ``,
      `Please share to help bring ${options.childName.split(' ')[0]} home! 🙏`,
    ];

    return lines.filter(line => line !== undefined).join('\n');
  }

  /**
   * Log social media post for audit
   */
  private async logPost(data: {
    accountId: string;
    platform: string;
    message: string;
    status: string;
    externalPostId?: string;
  }): Promise<void> {
    try {
      const supabase = await createClient();

      await supabase.from('social_post_logs').insert({
        account_id: data.accountId,
        platform: data.platform,
        message_preview: data.message.substring(0, 200),
        status: data.status,
        external_post_id: data.externalPostId,
      });
    } catch (error) {
      console.error('[SOCIAL] Failed to log post:', error);
    }
  }
}

// Export singleton instance
export const socialService = new SocialServiceImpl();
