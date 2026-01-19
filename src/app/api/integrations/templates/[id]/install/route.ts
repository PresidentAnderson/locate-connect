import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiServerError,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
} from '@/lib/api/response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CredentialInput {
  name: string;
  value: string;
}

/**
 * POST /api/integrations/templates/[id]/install
 * Install an integration from a template (one-click setup)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Admin role required');
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('integration_templates')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (templateError || !template) {
      return apiNotFound('Template not found');
    }

    const body = await request.json();
    const {
      name,
      description,
      credentials,
      customConfig = {},
    } = body;

    // Validate required fields
    if (!name) {
      return apiBadRequest('Integration name is required');
    }

    // Validate credentials
    const requiredCreds = template.credential_requirements as { name: string; type: string; required: boolean }[];
    const providedCreds = credentials as CredentialInput[] || [];

    for (const req of requiredCreds) {
      if (req.required) {
        const provided = providedCreds.find(c => c.name === req.name);
        if (!provided || !provided.value) {
          return apiBadRequest(`Missing required credential: ${req.name}`);
        }
      }
    }

    // Merge config template with custom config
    const configTemplate = template.config_template as Record<string, unknown>;
    const finalConfig = {
      ...configTemplate,
      ...customConfig,
    };

    // Create the integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .insert({
        name: name.trim(),
        description: description?.trim() || template.description,
        category: template.category,
        provider: template.provider,
        version: template.version,
        status: 'configuring',
        base_url: finalConfig.baseUrl as string || '',
        auth_type: finalConfig.authType as string || 'api_key',
        config: finalConfig,
        endpoints: template.endpoints_template,
        default_headers: finalConfig.defaultHeaders || {},
        timeout_ms: (finalConfig.timeout as number) || 30000,
        created_by: user.id,
      })
      .select()
      .single();

    if (integrationError) {
      console.error('Error creating integration:', integrationError);
      return apiServerError('Failed to create integration');
    }

    // Store credentials (encrypted)
    // Note: In production, credentials should be properly encrypted
    // This is a simplified version
    if (providedCreds.length > 0) {
      const credentialData: Record<string, string> = {};
      providedCreds.forEach(c => {
        credentialData[c.name] = c.value;
      });

      const { data: credential, error: credError } = await supabase
        .from('integration_credentials')
        .insert({
          name: `${name} Credentials`,
          type: finalConfig.authType as string || 'api_key',
          integration_id: integration.id,
          // In production: properly encrypt this data
          encrypted_data: Buffer.from(JSON.stringify(credentialData)).toString('base64'),
          encryption_key_id: 'temp-key',
          iv: 'temp-iv',
          auth_tag: 'temp-tag',
          status: 'active',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (!credError && credential) {
        // Update integration with credential ID
        await supabase
          .from('integrations')
          .update({ credential_id: credential.id })
          .eq('id', integration.id);
      }
    }

    // Create connector entry
    await supabase
      .from('integration_connectors')
      .insert({
        integration_id: integration.id,
        state: 'disconnected',
        circuit_breaker_state: 'closed',
      });

    // Increment template usage count
    await supabase.rpc('increment_template_usage', { p_template_id: id });

    // Update integration status to pending (ready for configuration)
    await supabase
      .from('integrations')
      .update({ status: 'pending' })
      .eq('id', integration.id);

    return apiSuccess({
      message: 'Integration created from template successfully',
      integration: {
        id: integration.id,
        name: integration.name,
        description: integration.description,
        category: integration.category,
        provider: integration.provider,
        status: 'pending',
        baseUrl: finalConfig.baseUrl,
      },
      template: {
        id: template.id,
        name: template.name,
      },
      nextSteps: [
        'Review and update configuration settings',
        'Test the connection',
        'Enable the integration when ready',
      ],
    });
  } catch (error) {
    console.error('Template install error:', error);
    return apiServerError('Internal server error');
  }
}
