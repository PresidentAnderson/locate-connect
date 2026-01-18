/**
 * Official Integration Templates
 * Pre-built templates for common external service integrations
 */

import type { IntegrationTemplate } from '@/types';

export const officialTemplates: Omit<IntegrationTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Hospital Registry Templates
  {
    name: 'Canadian Hospital Registry',
    description: 'Connect to Canadian hospital registries to search for unidentified patients (John/Jane Doe). Supports real-time alerts and patient matching.',
    category: 'healthcare',
    provider: 'Canada Health Infoway',
    version: '1.0.0',
    configTemplate: {
      endpoints: [
        {
          id: 'patient_search',
          name: 'Patient Search',
          path: '/api/v1/patients/search',
          method: 'POST',
          description: 'Search for unidentified patients',
        },
        {
          id: 'patient_details',
          name: 'Patient Details',
          path: '/api/v1/patients/{patientId}',
          method: 'GET',
          description: 'Get patient details',
        },
        {
          id: 'subscribe_alerts',
          name: 'Subscribe to Alerts',
          path: '/api/v1/alerts/subscribe',
          method: 'POST',
          description: 'Subscribe to patient admission alerts',
        },
      ],
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    },
    credentialRequirements: [
      {
        name: 'API Credentials',
        type: 'api_key',
        description: 'API key for hospital registry access',
        required: true,
        fields: [
          {
            name: 'apiKey',
            label: 'API Key',
            type: 'password',
            required: true,
            placeholder: 'Enter your API key',
          },
        ],
      },
    ],
    documentation: 'https://docs.example.com/hospital-registry',
    setupGuide: `
# Canadian Hospital Registry Setup

## Prerequisites
- Valid API credentials from Canada Health Infoway
- Jurisdiction approval for patient data access

## Configuration Steps
1. Enter your API key in the credentials section
2. Configure the base URL for your region
3. Set up patient matching criteria
4. Enable real-time alerts (optional)

## Rate Limits
- 60 requests per minute
- 1,000 requests per hour
`,
    rating: 4.5,
    usageCount: 150,
    tags: ['hospital', 'healthcare', 'canada', 'patient-matching'],
    icon: '🏥',
    isOfficial: true,
  },

  // Border Services Templates
  {
    name: 'CBSA Border Services',
    description: 'Connect to Canada Border Services Agency for border crossing detection and watchlist management.',
    category: 'border_services',
    provider: 'CBSA',
    version: '1.0.0',
    configTemplate: {
      endpoints: [
        {
          id: 'watchlist_add',
          name: 'Add to Watchlist',
          path: '/api/v1/watchlist',
          method: 'POST',
          description: 'Add person to border watchlist',
        },
        {
          id: 'crossing_search',
          name: 'Search Crossings',
          path: '/api/v1/crossings/search',
          method: 'POST',
          description: 'Search for border crossings',
        },
        {
          id: 'subscribe_alerts',
          name: 'Subscribe to Alerts',
          path: '/api/v1/alerts/subscribe',
          method: 'POST',
          description: 'Subscribe to crossing alerts',
        },
      ],
      timeout: 30000,
      retryAttempts: 3,
    },
    credentialRequirements: [
      {
        name: 'CBSA Credentials',
        type: 'oauth2',
        description: 'OAuth2 credentials for CBSA API access',
        required: true,
        fields: [
          {
            name: 'clientId',
            label: 'Client ID',
            type: 'text',
            required: true,
          },
          {
            name: 'clientSecret',
            label: 'Client Secret',
            type: 'password',
            required: true,
          },
        ],
      },
    ],
    documentation: 'https://docs.cbsa.gc.ca/api',
    setupGuide: `
# CBSA Border Services Setup

## Prerequisites
- Law enforcement agency authorization
- CBSA API access approval
- Signed data sharing agreement

## Configuration
1. Register your application with CBSA
2. Obtain OAuth2 credentials
3. Configure endpoint URLs
4. Set up watchlist criteria
`,
    rating: 4.8,
    usageCount: 200,
    tags: ['border', 'cbsa', 'canada', 'law-enforcement'],
    icon: '🛂',
    isOfficial: true,
  },

  // Morgue Registry Template
  {
    name: 'National Unidentified Remains Database',
    description: 'Connect to national and provincial morgue/coroner databases for unidentified remains matching. Supports DNA and dental comparisons.',
    category: 'government',
    provider: 'RCMP NamUs',
    version: '1.0.0',
    configTemplate: {
      endpoints: [
        {
          id: 'remains_search',
          name: 'Search Remains',
          path: '/api/v1/remains/search',
          method: 'POST',
          description: 'Search for unidentified remains',
        },
        {
          id: 'dna_comparison',
          name: 'DNA Comparison',
          path: '/api/v1/dna/comparison-request',
          method: 'POST',
          description: 'Request DNA comparison',
        },
        {
          id: 'dental_comparison',
          name: 'Dental Comparison',
          path: '/api/v1/dental/comparison-request',
          method: 'POST',
          description: 'Request dental records comparison',
        },
      ],
      timeout: 60000,
      retryAttempts: 2,
    },
    credentialRequirements: [
      {
        name: 'Database Credentials',
        type: 'api_key',
        description: 'API credentials for remains database access',
        required: true,
        fields: [
          {
            name: 'apiKey',
            label: 'API Key',
            type: 'password',
            required: true,
          },
          {
            name: 'agencyCode',
            label: 'Agency Code',
            type: 'text',
            required: true,
            placeholder: 'Your agency identifier',
          },
        ],
      },
    ],
    documentation: 'https://docs.example.com/remains-database',
    setupGuide: `
# Unidentified Remains Database Setup

## Prerequisites
- Law enforcement or coroner office authorization
- Database access agreement
- Trained personnel for sensitive data handling

## Configuration
1. Obtain API credentials from your regional coordinator
2. Enter agency code and API key
3. Configure matching criteria preferences
4. Set up notification preferences for new cases
`,
    rating: 4.6,
    usageCount: 85,
    tags: ['morgue', 'coroner', 'dna', 'dental', 'remains'],
    icon: '📋',
    isOfficial: true,
  },

  // Transit Authority Template
  {
    name: 'STM Transit System',
    description: 'Connect to Société de transport de Montréal for transit sighting searches, camera access, and fare card tracking.',
    category: 'transportation',
    provider: 'STM',
    version: '1.0.0',
    configTemplate: {
      endpoints: [
        {
          id: 'sighting_search',
          name: 'Search Sightings',
          path: '/api/v1/sightings/search',
          method: 'POST',
          description: 'Search for transit sightings',
        },
        {
          id: 'camera_request',
          name: 'Request Camera Access',
          path: '/api/v1/camera/access-request',
          method: 'POST',
          description: 'Request security camera footage',
        },
        {
          id: 'farecard_search',
          name: 'Fare Card Search',
          path: '/api/v1/farecard/search',
          method: 'POST',
          description: 'Search fare card activity',
        },
        {
          id: 'network_info',
          name: 'Network Information',
          path: '/api/v1/network/info',
          method: 'GET',
          description: 'Get station and line information',
        },
      ],
      timeout: 30000,
      retryAttempts: 3,
      customSettings: {
        realTimeEnabled: true,
        authority: 'STM',
        city: 'Montreal',
      },
    },
    credentialRequirements: [
      {
        name: 'STM API Credentials',
        type: 'api_key',
        description: 'API credentials for STM system access',
        required: true,
        fields: [
          {
            name: 'apiKey',
            label: 'API Key',
            type: 'password',
            required: true,
          },
        ],
      },
    ],
    documentation: 'https://api.stm.info/docs',
    setupGuide: `
# STM Transit System Setup

## Prerequisites
- Law enforcement authorization
- STM data access agreement
- Privacy compliance training

## Configuration
1. Request API access from STM Security
2. Enter API credentials
3. Configure station/line preferences
4. Set up real-time sighting alerts

## Camera Access
Camera footage requests require separate approval and may take 24-48 hours.
`,
    rating: 4.3,
    usageCount: 120,
    tags: ['transit', 'metro', 'bus', 'stm', 'montreal', 'camera'],
    icon: '🚇',
    isOfficial: true,
  },

  // Generic REST API Template
  {
    name: 'Generic REST API',
    description: 'Generic template for connecting to any REST API. Supports multiple authentication methods and customizable endpoints.',
    category: 'custom',
    provider: 'Custom',
    version: '1.0.0',
    configTemplate: {
      endpoints: [],
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    },
    credentialRequirements: [
      {
        name: 'API Credentials',
        type: 'api_key',
        description: 'API credentials (customize based on target API)',
        required: false,
        fields: [
          {
            name: 'apiKey',
            label: 'API Key',
            type: 'password',
            required: false,
          },
          {
            name: 'username',
            label: 'Username',
            type: 'text',
            required: false,
          },
          {
            name: 'password',
            label: 'Password',
            type: 'password',
            required: false,
          },
        ],
      },
    ],
    documentation: '',
    setupGuide: `
# Generic REST API Setup

This template provides a starting point for connecting to any REST API.

## Steps
1. Configure the base URL
2. Add endpoint definitions
3. Set up authentication
4. Configure rate limiting
5. Test the connection

## Customization
Modify the configuration to match your target API's requirements.
`,
    rating: 4.0,
    usageCount: 300,
    tags: ['api', 'rest', 'custom', 'generic'],
    icon: '🔌',
    isOfficial: true,
  },
];

/**
 * Get all official templates
 */
export function getOfficialTemplates(): typeof officialTemplates {
  return officialTemplates;
}

/**
 * Get template by provider
 */
export function getTemplateByProvider(
  provider: string
): (typeof officialTemplates)[number] | undefined {
  return officialTemplates.find(
    (t) => t.provider.toLowerCase() === provider.toLowerCase()
  );
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: string
): typeof officialTemplates {
  return officialTemplates.filter((t) => t.category === category);
}

/**
 * Search templates
 */
export function searchTemplates(query: string): typeof officialTemplates {
  const lowerQuery = query.toLowerCase();
  return officialTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}
