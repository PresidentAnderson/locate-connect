"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const API_SECTIONS = [
  {
    id: "overview",
    title: "Overview",
    content: `
# LocateConnect Public API

The LocateConnect API provides programmatic access to missing person case data for third-party integrations.

## Base URL

\`\`\`
https://api.locateconnect.ca/v1
\`\`\`

## Authentication

All API requests require authentication using either an API key or OAuth 2.0 access token.

### API Key Authentication

Include your API key in the \`Authorization\` header:

\`\`\`
Authorization: Bearer lc_pub_your_api_key_here
\`\`\`

Or use the \`X-API-Key\` header:

\`\`\`
X-API-Key: lc_pub_your_api_key_here
\`\`\`

### OAuth 2.0

For user-authorized access, use OAuth 2.0 with the authorization code flow.

## Rate Limiting

| Access Level | Requests/Minute | Requests/Day | Monthly Quota |
|-------------|-----------------|--------------|---------------|
| Public      | 60              | 10,000       | 100,000       |
| Partner     | 120             | 50,000       | 500,000       |
| Law Enforcement | 300         | Unlimited    | Unlimited     |

Rate limit headers are included in all responses:
- \`X-RateLimit-Remaining-Minute\`
- \`X-RateLimit-Remaining-Day\`
- \`X-Quota-Remaining-Month\`
    `.trim(),
  },
  {
    id: "cases",
    title: "Cases",
    content: `
# Cases API

Retrieve information about missing person cases.

## List Cases

\`\`\`
GET /v1/cases
\`\`\`

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number (default: 1) |
| page_size | integer | Items per page (max: 100, default: 20) |
| status | string | Filter by status: active, resolved, closed, cold |
| province | string | Filter by province code (e.g., ON, QC, BC) |
| priority | string | Filter by priority level |
| is_amber_alert | boolean | Filter AMBER Alert cases |
| since | ISO 8601 | Return cases updated since this date |
| search | string | Search by name or case number |

### Response

\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "case_number": "LC-2024-000001",
      "first_name": "John",
      "last_name": "Doe",
      "age_at_disappearance": 25,
      "gender": "male",
      "last_seen_date": "2024-01-15T00:00:00Z",
      "last_seen_city": "Toronto",
      "last_seen_province": "ON",
      "status": "active",
      "priority_level": "p1_high",
      "is_amber_alert": false,
      "primary_photo_url": "https://...",
      "created_at": "2024-01-15T12:00:00Z",
      "updated_at": "2024-01-15T12:00:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "page_size": 20,
    "total_pages": 8
  }
}
\`\`\`

## Get Case

\`\`\`
GET /v1/cases/{id}
\`\`\`

Returns detailed information for a specific case. Partner and Law Enforcement access levels receive additional fields.
    `.trim(),
  },
  {
    id: "tips",
    title: "Tips",
    content: `
# Tips API

Submit tips about missing person cases.

## Submit Tip

\`\`\`
POST /v1/tips
\`\`\`

### Request Body

\`\`\`json
{
  "case_id": "uuid",
  "content": "Description of the sighting or information",
  "tipster_name": "Optional name",
  "tipster_email": "optional@email.com",
  "tipster_phone": "555-1234",
  "is_anonymous": true,
  "location": "123 Main St, Toronto, ON",
  "latitude": 43.6532,
  "longitude": -79.3832,
  "sighting_date": "2024-01-20T14:30:00Z"
}
\`\`\`

### Response

\`\`\`json
{
  "success": true,
  "data": {
    "id": "uuid",
    "case_id": "uuid",
    "is_anonymous": true,
    "created_at": "2024-01-20T15:00:00Z",
    "message": "Tip submitted successfully. Thank you for your help."
  }
}
\`\`\`

### Notes

- Tips can be submitted anonymously by setting \`is_anonymous: true\`
- The \`content\` field must be at least 10 characters
- Tips can only be submitted for active, public cases
    `.trim(),
  },
  {
    id: "alerts",
    title: "Alerts",
    content: `
# Alerts API

Retrieve active alerts including AMBER Alerts.

## List Alerts

\`\`\`
GET /v1/alerts
\`\`\`

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number |
| page_size | integer | Items per page |
| type | string | Alert type: amber, silver |
| province | string | Filter by province |
| active | boolean | Only active alerts (default: true) |

### Response

\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "case_number": "LC-2024-000001",
      "alert_type": "amber",
      "person": {
        "first_name": "Jane",
        "last_name": "Doe",
        "age": 8,
        "gender": "female",
        "photo_url": "https://..."
      },
      "last_seen": {
        "date": "2024-01-20T14:00:00Z",
        "city": "Vancouver",
        "province": "BC"
      },
      "circumstances": "Last seen at local park...",
      "priority": "p0_critical",
      "issued_at": "2024-01-20T15:00:00Z",
      "updated_at": "2024-01-20T15:30:00Z"
    }
  ],
  "meta": {
    "total": 3,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
\`\`\`
    `.trim(),
  },
  {
    id: "statistics",
    title: "Statistics",
    content: `
# Statistics API

Retrieve anonymized case statistics.

## Get Statistics

\`\`\`
GET /v1/statistics
\`\`\`

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| province | string | Filter by province |
| year | integer | Filter by year |

### Response (Public Access)

\`\`\`json
{
  "success": true,
  "data": {
    "overview": {
      "total_cases": 5000,
      "active_cases": 850,
      "resolved_cases": 4000,
      "closed_cases": 100,
      "cold_cases": 50,
      "resolution_rate": 80
    },
    "by_priority": {
      "p0_critical": 10,
      "p1_high": 50,
      "p2_medium": 200,
      "p3_low": 400,
      "p4_routine": 190
    },
    "amber_alerts": {
      "total": 25,
      "active": 2
    }
  },
  "meta": {
    "generated_at": "2024-01-20T12:00:00Z",
    "filters": {
      "province": "all",
      "year": "all"
    },
    "access_level": "public"
  }
}
\`\`\`

### Response (Partner/LE Access)

Partner and Law Enforcement access includes additional fields:
- \`by_disposition\`: Breakdown by case outcome
- \`by_province\`: Geographic distribution
- \`demographics\`: Age and demographic statistics
- \`monthly_trend\`: Last 12 months trend data
    `.trim(),
  },
  {
    id: "webhooks",
    title: "Webhooks",
    content: `
# Webhooks

Receive real-time notifications when events occur.

## Supported Events

| Event | Description |
|-------|-------------|
| case.created | A new case has been created |
| case.updated | Case information has been updated |
| case.resolved | A case has been resolved |
| case.status_changed | Case status has changed |
| lead.created | A new lead has been created |
| lead.verified | A lead has been verified |
| tip.received | A new tip has been received |
| alert.amber_issued | An AMBER Alert has been issued |
| alert.silver_issued | A Silver Alert has been issued |

## Webhook Payload

\`\`\`json
{
  "event": "case.created",
  "timestamp": "2024-01-20T15:00:00Z",
  "webhook_id": "uuid",
  "data": {
    "id": "uuid",
    "case_number": "LC-2024-000001",
    // Event-specific data
  }
}
\`\`\`

## Signature Verification

All webhook requests include a signature header:

\`\`\`
X-Webhook-Signature: t=1705759200,v1=abc123...
\`\`\`

Verify the signature by:
1. Extract the timestamp (t) and signature (v1)
2. Create the signed payload: \`{timestamp}.{body}\`
3. Compute HMAC-SHA256 with your webhook secret
4. Compare with the received signature

## Retry Policy

Failed deliveries are retried up to 3 times with exponential backoff:
- 1st retry: 1 minute
- 2nd retry: 5 minutes
- 3rd retry: 30 minutes

Webhooks are marked as "failed" after all retries are exhausted.
    `.trim(),
  },
  {
    id: "errors",
    title: "Error Handling",
    content: `
# Error Handling

The API uses standard HTTP status codes and returns detailed error information.

## Error Response Format

\`\`\`json
{
  "success": false,
  "error": {
    "code": "error_code",
    "message": "Human-readable error message",
    "details": {
      // Additional context if available
    }
  }
}
\`\`\`

## Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | bad_request | Invalid request parameters |
| 401 | unauthorized | Missing or invalid authentication |
| 403 | forbidden | Insufficient permissions |
| 404 | not_found | Resource not found |
| 409 | conflict | Resource conflict |
| 429 | rate_limit_exceeded | Rate limit exceeded |
| 500 | internal_error | Server error |

## Rate Limit Errors

When rate limited, the response includes a \`Retry-After\` header:

\`\`\`
HTTP/1.1 429 Too Many Requests
Retry-After: 45
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded"
  }
}
\`\`\`
    `.trim(),
  },
];

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState("overview");

  const currentSection = API_SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="flex min-h-[calc(100vh-8rem)]">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-gray-200 bg-white pr-6">
        <nav className="sticky top-6 space-y-1">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">API Reference</h2>
          {API_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                activeSection === section.id
                  ? "bg-cyan-50 text-cyan-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {section.title}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-8 py-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Link href="/developers" className="hover:text-gray-700">
                Developer Portal
              </Link>
              <span>/</span>
              <span className="text-gray-900">API Documentation</span>
            </div>
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              v1.0
            </span>
          </div>

          {/* Markdown-style content */}
          <div className="prose prose-sm prose-gray max-w-none">
            <MarkdownContent content={currentSection?.content || ""} />
          </div>
        </div>
      </main>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown-to-HTML conversion
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLanguage = "";

  lines.forEach((line, index) => {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <pre key={`code-${index}`} className="overflow-x-auto rounded-lg bg-gray-900 p-4">
            <code className="text-sm text-gray-100">{codeContent.join("\n")}</code>
          </pre>
        );
        codeContent = [];
        inCodeBlock = false;
      } else {
        // Start code block
        codeLanguage = line.slice(3);
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      return;
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={index} className="text-2xl font-bold text-gray-900 mt-8 mb-4 first:mt-0">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={index} className="text-xl font-semibold text-gray-900 mt-6 mb-3">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={index} className="text-lg font-medium text-gray-900 mt-4 mb-2">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("| ")) {
      // Table handling
      const cells = line.split("|").filter((c) => c.trim());
      const isHeader = lines[index + 1]?.includes("---");
      const prevWasTable = elements.length > 0 && (elements[elements.length - 1] as React.ReactElement)?.type === "table";

      if (!prevWasTable) {
        // Start new table
        const tableRows: React.ReactNode[] = [];
        let i = index;
        while (i < lines.length && lines[i].startsWith("| ")) {
          const rowCells = lines[i].split("|").filter((c) => c.trim());
          if (!lines[i].includes("---")) {
            tableRows.push(
              <tr key={i} className={i === index ? "bg-gray-50" : ""}>
                {rowCells.map((cell, ci) =>
                  i === index ? (
                    <th key={ci} className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                      {cell.trim()}
                    </th>
                  ) : (
                    <td key={ci} className="px-4 py-2 text-sm text-gray-600">
                      {renderInlineCode(cell.trim())}
                    </td>
                  )
                )}
              </tr>
            );
          }
          i++;
        }
        elements.push(
          <table key={index} className="my-4 w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
            <tbody>{tableRows}</tbody>
          </table>
        );
      }
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={index} className="ml-4 text-gray-600">
          {renderInlineCode(line.slice(2))}
        </li>
      );
    } else if (line.trim()) {
      elements.push(
        <p key={index} className="my-2 text-gray-600">
          {renderInlineCode(line)}
        </p>
      );
    }
  });

  return <>{elements}</>;
}

function renderInlineCode(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-cyan-600">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
