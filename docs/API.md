# LocateConnect API Documentation

This document provides detailed documentation for the LocateConnect REST API.

## Authentication

All API endpoints require authentication via Supabase Auth. Include the session token in requests:

```typescript
const { data: { session } } = await supabase.auth.getSession();
// Session is automatically included via cookies in Next.js
```

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

---

## Cases API

### List Cases

```http
GET /api/cases
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (active, resolved, closed) |
| `priority` | string | Filter by priority (low, medium, high, critical) |
| `search` | string | Search in case number, name, description |
| `limit` | number | Number of results (default: 50) |
| `offset` | number | Pagination offset |

**Response:**
```json
{
  "cases": [
    {
      "id": "uuid",
      "caseNumber": "LC-2026-0001",
      "missingPersonName": "Jane Doe",
      "status": "active",
      "priority": "high",
      "lastSeenDate": "2026-01-15T10:00:00Z",
      "lastSeenLocation": "Edmonton, AB",
      "createdAt": "2026-01-15T12:00:00Z"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

### Create Case

```http
POST /api/cases
```

**Request Body:**
```json
{
  "missingPersonName": "Jane Doe",
  "dateOfBirth": "1990-05-15",
  "gender": "female",
  "height": 165,
  "weight": 60,
  "hairColor": "brown",
  "eyeColor": "blue",
  "lastSeenDate": "2026-01-15T10:00:00Z",
  "lastSeenLocation": "Downtown Edmonton",
  "lastSeenAddress": "10234 104 Street NW",
  "lastSeenCoordinates": { "lat": 53.5461, "lng": -113.4938 },
  "circumstances": "Left for work and never arrived",
  "medicalConditions": "Type 1 Diabetes",
  "medications": ["Insulin"],
  "distinguishingFeatures": "Small scar on left cheek",
  "reporterName": "John Doe",
  "reporterPhone": "780-555-0123",
  "reporterRelationship": "spouse"
}
```

**Response:** `201 Created`
```json
{
  "case": {
    "id": "uuid",
    "caseNumber": "LC-2026-0042",
    ...
  }
}
```

### Get Case

```http
GET /api/cases/{id}
```

**Response:**
```json
{
  "case": {
    "id": "uuid",
    "caseNumber": "LC-2026-0001",
    "missingPersonName": "Jane Doe",
    "status": "active",
    "priority": "high",
    "timeline": [],
    "sightings": [],
    "leads": [],
    ...
  }
}
```

### Update Case

```http
PATCH /api/cases/{id}
```

**Request Body:** Any case fields to update

**Response:** Updated case object

### Delete Case

```http
DELETE /api/cases/{id}
```

**Response:** `200 OK`
```json
{ "success": true }
```

---

## Notifications API

### List Notifications

```http
GET /api/notifications
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Number of results (default: 50) |
| `offset` | number | Pagination offset |
| `unread` | boolean | Filter to unread only |

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "new_lead",
      "priority": "high",
      "title": "New Lead Submitted",
      "message": "A new tip has been submitted...",
      "caseId": "uuid",
      "caseNumber": "LC-2026-0042",
      "read": false,
      "actionUrl": "/cases/uuid/tips",
      "createdAt": "2026-01-17T14:30:00Z"
    }
  ],
  "groups": [...],
  "total": 25,
  "unreadCount": 5
}
```

### Mark Notification as Read

```http
POST /api/notifications/{id}/read
```

**Response:**
```json
{ "success": true }
```

### Mark All as Read

```http
POST /api/notifications/read-all
```

**Response:**
```json
{ "success": true }
```

### Get Notification Preferences

```http
GET /api/notifications/preferences
```

**Response:**
```json
{
  "preferences": {
    "emailEnabled": true,
    "pushEnabled": true,
    "smsEnabled": false,
    "digestFrequency": "daily",
    "types": {
      "new_lead": { "email": true, "push": true },
      "case_update": { "email": true, "push": false },
      ...
    }
  }
}
```

### Update Notification Preferences

```http
PATCH /api/notifications/preferences
```

**Request Body:**
```json
{
  "emailEnabled": true,
  "pushEnabled": false,
  "types": {
    "new_lead": { "email": true, "push": false }
  }
}
```

---

## Geofences API

### List Geofences

```http
GET /api/geofences
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `caseId` | string | Filter by case |
| `status` | string | Filter by status (active, paused, expired) |
| `priority` | string | Filter by priority |

**Response:**
```json
{
  "geofences": [
    {
      "id": "uuid",
      "name": "Last Known Location - Jane Doe",
      "caseId": "uuid",
      "caseName": "Jane Doe",
      "type": "circle",
      "geometry": {
        "type": "circle",
        "center": { "lat": 53.5461, "lng": -113.4938 },
        "radius": 1000
      },
      "trigger": "both",
      "priority": "critical",
      "status": "active",
      "alertCount": 3,
      "notifyChannels": ["email", "sms", "push"]
    }
  ],
  "total": 10
}
```

### Create Geofence

```http
POST /api/geofences
```

**Request Body:**
```json
{
  "name": "Downtown Watch Zone",
  "caseId": "uuid",
  "type": "circle",
  "geometry": {
    "type": "circle",
    "center": { "lat": 53.5461, "lng": -113.4938 },
    "radius": 500
  },
  "trigger": "both",
  "priority": "high",
  "notifyChannels": ["email", "push"],
  "description": "Monitor downtown area"
}
```

**Geometry Types:**

Circle:
```json
{
  "type": "circle",
  "center": { "lat": 53.5461, "lng": -113.4938 },
  "radius": 1000
}
```

Polygon:
```json
{
  "type": "polygon",
  "points": [
    { "lat": 53.55, "lng": -113.51 },
    { "lat": 53.555, "lng": -113.51 },
    { "lat": 53.555, "lng": -113.5 },
    { "lat": 53.55, "lng": -113.5 }
  ]
}
```

Corridor:
```json
{
  "type": "corridor",
  "points": [
    { "lat": 53.5461, "lng": -113.4938 },
    { "lat": 53.5361, "lng": -113.5038 }
  ],
  "bufferWidth": 100
}
```

### Update Geofence

```http
PATCH /api/geofences/{id}
```

**Request Body:** Any geofence fields to update

### Delete Geofence

```http
DELETE /api/geofences/{id}
```

### Get Geofence Alerts

```http
GET /api/geofences/{id}/alerts
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `acknowledged` | boolean | Filter by acknowledgment status |
| `limit` | number | Number of results |

**Response:**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "geofenceId": "uuid",
      "geofenceName": "Downtown Watch",
      "caseId": "uuid",
      "triggerType": "enter",
      "triggeredAt": "2026-01-17T14:30:00Z",
      "location": { "lat": 53.5471, "lng": -113.4948 },
      "source": "Mobile App",
      "acknowledged": false
    }
  ],
  "total": 5,
  "unacknowledgedCount": 2
}
```

---

## Analytics API

### Get Executive Dashboard

```http
GET /api/analytics
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `timeRange` | string | Time period: 7d, 30d, 90d, 1y |

**Response:**
```json
{
  "kpis": {
    "activeCases": 42,
    "resolvedThisMonth": 8,
    "avgResolutionDays": 12.5,
    "resolutionRate": 78.5,
    "newCasesToday": 3,
    "pendingLeads": 156,
    "activeGeofences": 23,
    "alertsTriggered": 12
  },
  "charts": {
    "casesByStatus": { ... },
    "casesByPriority": { ... },
    "resolutionTrend": { ... }
  },
  "timeRange": "30d"
}
```

### Get System Health

```http
GET /api/analytics/system-health
```

**Response:**
```json
{
  "status": "healthy",
  "components": {
    "database": { "status": "healthy", "latency": 15 },
    "storage": { "status": "healthy", "usage": 45.2 },
    "realtime": { "status": "healthy", "connections": 234 },
    "cron": { "status": "healthy", "lastRun": "..." }
  },
  "uptime": 99.9,
  "lastCheck": "2026-01-18T10:00:00Z"
}
```

---

## Cron Endpoints

Protected endpoints triggered by Vercel Cron. Require `CRON_SECRET` header.

```http
Authorization: Bearer {CRON_SECRET}
```

| Endpoint | Schedule | Description |
|----------|----------|-------------|
| `GET /api/cron/priority-escalation` | Every 15 min | Check and escalate case priorities |
| `GET /api/cron/stale-case-check` | Every 6 hours | Identify stale cases |
| `GET /api/cron/notification-digest` | Daily 8 AM | Send notification digests |
| `GET /api/cron/news-crawler` | Every hour | Crawl news for mentions |
| `GET /api/cron/social-media` | Every 30 min | Monitor social media |
| `GET /api/cron/public-records` | Every 4 hours | Check public records |
| `GET /api/cron/hospital-registry` | Every 2 hours | Query hospital registries |

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

**Common Status Codes:**
| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid auth |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

---

## Rate Limiting

API requests are rate limited:
- 100 requests per minute for authenticated users
- 10 requests per minute for unauthenticated requests

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705582800
```

---

## Webhooks

Configure webhooks to receive real-time updates:

```http
POST /api/webhooks/configure
```

**Request Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["case.created", "case.updated", "alert.triggered"],
  "secret": "your_webhook_secret"
}
```

**Webhook Payload:**
```json
{
  "event": "alert.triggered",
  "timestamp": "2026-01-17T14:30:00Z",
  "data": {
    "alertId": "uuid",
    "geofenceId": "uuid",
    "caseId": "uuid",
    ...
  },
  "signature": "sha256=..."
}
```

Verify webhook signatures using HMAC-SHA256 with your secret.
