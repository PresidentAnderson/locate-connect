# Locate Connect - Full Environment Setup Guide

Complete specifications for all services and credentials required for full functionality.

---

## Table of Contents

1. [Core Infrastructure](#1-core-infrastructure)
2. [Email Services](#2-email-services)
3. [SMS Services](#3-sms-services)
4. [Push Notifications](#4-push-notifications)
5. [Social Media Integrations](#5-social-media-integrations)
6. [AI & Facial Recognition](#6-ai--facial-recognition)
7. [Transcription Services](#7-transcription-services)
8. [External Data Sources](#8-external-data-sources)
9. [Law Enforcement Data Sources](#9-law-enforcement-data-sources)
10. [Cost Summary](#10-cost-summary)

---

## 1. Core Infrastructure

### Supabase (Required)

**Purpose:** Database, authentication, file storage, real-time subscriptions

**Setup:**
1. Create account at https://supabase.com
2. Create new project
3. Go to Settings → API

**Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Public anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # Service role key (keep secret!)
```

**Required Supabase Configuration:**
- Enable Email Auth in Authentication → Providers
- Enable Row Level Security on all tables
- Create storage buckets:
  - `case-photos` (public)
  - `evidence-files` (private)
  - `facial-recognition-photos` (private)
  - `data-portability` (private)
  - `voice-memos` (private)

**Pricing:**
| Tier | Price | Includes |
|------|-------|----------|
| Free | $0/month | 500MB DB, 1GB storage, 2GB bandwidth |
| Pro | $25/month | 8GB DB, 100GB storage, 250GB bandwidth |
| Team | $599/month | Unlimited DB, 100GB storage, custom |

---

### Application Security Keys

**CRON_SECRET**
- Purpose: Protects cron job API endpoints from unauthorized access
- Generate: `openssl rand -hex 32`
- Used by: All `/api/cron/*` routes

**CREDENTIALS_MASTER_KEY**
- Purpose: Encrypts sensitive credentials stored in the vault
- Generate: `openssl rand -hex 32`
- Used by: Credentials vault encryption service
- ⚠️ If lost, all encrypted credentials become unrecoverable

---

## 2. Email Services

### Option A: SendGrid (Recommended)

**Purpose:** Transactional email delivery

**Setup:**
1. Create account at https://sendgrid.com
2. Settings → API Keys → Create API Key
3. Select "Full Access" or custom with:
   - Mail Send: Full Access
   - Template Engine: Read Access

**Variables:**
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

**Domain Verification:**
1. Settings → Sender Authentication
2. Authenticate your domain (add DNS records)
3. Verify single sender for testing

**Pricing:**
| Tier | Price | Emails/month |
|------|-------|--------------|
| Free | $0 | 100/day |
| Essentials | $19.95/month | 50,000 |
| Pro | $89.95/month | 100,000 |

---

### Option B: AWS SES

**Purpose:** Transactional email at scale

**Setup:**
1. AWS Console → SES → Get Started
2. Verify domain or email addresses
3. Request production access (exits sandbox)

**Variables:**
```env
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxxx
EMAIL_FROM=noreply@yourdomain.com
```

**IAM Policy Required:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

**Pricing:** $0.10 per 1,000 emails

---

## 3. SMS Services

### Twilio

**Purpose:** SMS notifications, alerts, 2FA

**Setup:**
1. Create account at https://twilio.com
2. Console → Get a Twilio phone number
3. Console → Account → API keys

**Variables:**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+15551234567
```

**Phone Number Requirements:**
- Must be SMS-capable
- For Canada: Get Canadian number or enable international
- For US: Standard local or toll-free number

**Messaging Service (Optional but Recommended):**
1. Messaging → Services → Create
2. Add your phone numbers to the pool
3. Enables: Link shortening, opt-out handling, compliance

**Pricing:**
| Item | Price |
|------|-------|
| Phone Number | $1.00/month |
| Outbound SMS (US) | $0.0079/message |
| Outbound SMS (Canada) | $0.0080/message |
| Inbound SMS | $0.0079/message |

---

## 4. Push Notifications

### Web Push (VAPID)

**Purpose:** Browser push notifications

**Setup:**
```bash
npx web-push generate-vapid-keys
```

**Variables:**
```env
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
VAPID_PRIVATE_KEY=UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls
```

**Browser Support:**
- Chrome: Full support
- Firefox: Full support
- Safari: Requires Apple Developer account
- Edge: Full support

**Pricing:** Free (self-hosted)

---

## 5. Social Media Integrations

### Facebook / Meta

**Purpose:** Post missing person alerts, page management

**Setup:**
1. Create app at https://developers.facebook.com
2. Add "Facebook Login" product
3. Add "Pages API" product
4. App Review → Request permissions

**Variables:**
```env
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=abcdef0123456789abcdef0123456789
```

**Required Permissions:**
- `pages_show_list` - List user's pages
- `pages_read_engagement` - Read page posts
- `pages_manage_posts` - Create/edit posts
- `pages_read_user_content` - Read user comments

**App Review Required For:**
- Any permission beyond basic profile
- Production use with non-admin users

**Pricing:** Free

---

### Twitter / X

**Purpose:** Post alerts, monitor mentions

**Setup:**
1. Apply at https://developer.twitter.com
2. Create Project and App
3. Enable OAuth 1.0a and OAuth 2.0
4. Generate Access Token and Secret

**Variables:**
```env
TWITTER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxx
TWITTER_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWITTER_ACCESS_TOKEN=123456789-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWITTER_ACCESS_TOKEN_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**API Access Levels:**
| Level | Price | Tweets/month |
|-------|-------|--------------|
| Free | $0 | 1,500 (post only) |
| Basic | $100/month | 50,000 read, 10,000 post |
| Pro | $5,000/month | 1M read, 100,000 post |

**Required Scopes:**
- `tweet.read`
- `tweet.write`
- `users.read`
- `offline.access`

---

### Instagram

**Purpose:** Post alerts to Instagram (via Facebook Graph API)

**Setup:**
1. Same Facebook Developer App
2. Add "Instagram Graph API" product
3. Connect Instagram Business/Creator account to Facebook Page

**Variables:**
```env
INSTAGRAM_CLIENT_ID=123456789012345
INSTAGRAM_CLIENT_SECRET=abcdef0123456789abcdef0123456789
```

**Requirements:**
- Instagram account must be Business or Creator
- Must be connected to a Facebook Page
- Facebook App must have Instagram permissions approved

**Pricing:** Free (uses Facebook API quotas)

---

## 6. AI & Facial Recognition

### Azure Face API

**Purpose:** Face detection, quality assessment, facial matching

**Setup:**
1. Azure Portal → Create Resource → "Face"
2. Select pricing tier
3. Get Key and Endpoint from "Keys and Endpoint"

**Variables:**
```env
AZURE_FACE_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
AZURE_FACE_API_ENDPOINT=https://eastus.api.cognitive.microsoft.com
AZURE_FACE_ENDPOINT=https://eastus.api.cognitive.microsoft.com
AZURE_FACE_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Features Used:**
- Face Detection - Detect faces in images
- Face Attributes - Age, emotion, head pose, blur, exposure
- Face Verification - Compare two faces
- Face Identification - Match against a group

**Pricing:**
| Tier | Price | Calls |
|------|-------|-------|
| Free | $0 | 30,000/month |
| S0 | $1.00/1,000 calls | Unlimited |

**Important:** Azure requires "Limited Access" approval for face identification features. Apply at: https://aka.ms/facerecognition

---

### AWS Rekognition

**Purpose:** Alternative/fallback facial recognition

**Setup:**
1. AWS Console → Rekognition
2. IAM → Create policy and user

**Variables:**
```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxxx
AWS_REGION=us-east-1
```

**IAM Policy Required:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectFaces",
        "rekognition:CompareFaces",
        "rekognition:SearchFacesByImage",
        "rekognition:IndexFaces",
        "rekognition:CreateCollection",
        "rekognition:DeleteCollection"
      ],
      "Resource": "*"
    }
  ]
}
```

**Pricing:**
| Feature | Price |
|---------|-------|
| Face Detection | $1.00/1,000 images |
| Face Comparison | $1.00/1,000 images |
| Face Search | $0.10/1,000 searches |
| Free Tier | 5,000 images/month (12 months) |

---

## 7. Transcription Services

### OpenAI Whisper (Primary)

**Purpose:** Voice memo transcription

**Setup:**
1. Create account at https://platform.openai.com
2. API Keys → Create new secret key
3. Add payment method

**Variables:**
```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TRANSCRIPTION_PROVIDER=openai
```

**Pricing:** $0.006 per minute of audio

**Supported Formats:** mp3, mp4, mpeg, mpga, m4a, wav, webm

**Limits:** 25MB file size max

---

### Deepgram (Fallback)

**Purpose:** Alternative transcription service

**Setup:**
1. Create account at https://console.deepgram.com
2. Settings → API Keys → Create Key

**Variables:**
```env
DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Pricing:**
| Tier | Price | Hours |
|------|-------|-------|
| Pay as you go | $0.0043/min | - |
| Growth | $0.0036/min | 10,000+ hrs/year |
| Free | $0 | $200 credit |

---

### AssemblyAI (Fallback)

**Purpose:** Alternative transcription service

**Setup:**
1. Create account at https://www.assemblyai.com
2. Dashboard → Copy API Key

**Variables:**
```env
ASSEMBLYAI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Pricing:**
| Tier | Price |
|------|-------|
| Pay as you go | $0.00025/second ($0.90/hour) |
| Free | 100 hours |

---

## 8. External Data Sources

### NewsAPI

**Purpose:** Crawl news articles for case mentions

**Setup:**
1. Register at https://newsapi.org
2. Get API Key from dashboard

**Variables:**
```env
NEWSAPI_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Pricing:**
| Tier | Price | Requests |
|------|-------|----------|
| Developer | $0 | 100/day, headlines only |
| Business | $449/month | 250,000/month |
| Corporate | Custom | Unlimited |

**Limitations (Free):**
- No commercial use
- 100 requests/day
- Headlines and metadata only
- No full article content

---

### WeatherAPI

**Purpose:** Weather conditions for case timelines

**Setup:**
1. Register at https://www.weatherapi.com
2. Copy API Key from dashboard

**Variables:**
```env
WEATHERAPI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Pricing:**
| Tier | Price | Calls/month |
|------|-------|-------------|
| Free | $0 | 1,000,000 |
| Pro | $4/month | 2,000,000 |
| Business | $10/month | 5,000,000 |

---

### IPInfo

**Purpose:** Geolocation for email tracking pixels

**Setup:**
1. Register at https://ipinfo.io
2. Dashboard → Access Token

**Variables:**
```env
IPINFO_API_KEY=xxxxxxxxxxxxxxxx
```

**Pricing:**
| Tier | Price | Requests/month |
|------|-------|----------------|
| Free | $0 | 50,000 |
| Basic | $99/month | 150,000 |
| Standard | $249/month | 500,000 |

---

## 9. Law Enforcement Data Sources

### NamUs (National Missing and Unidentified Persons System)

**Purpose:** Search and match against national missing persons database

**Requirements:**
- Must be law enforcement or authorized agency
- Requires formal MOA (Memorandum of Agreement)

**How to Apply:**
1. Contact NamUs at https://namus.gov
2. Submit agency credentials
3. Complete training requirements
4. Sign data use agreement

**Variables:**
```env
NAMUS_API_URL=https://www.namus.gov/api/v2
NAMUS_API_KEY=provided-after-approval
```

**Features:**
- Search missing persons by criteria
- Search unidentified persons
- Cross-reference cases
- Biometric data access (fingerprints, DNA)

---

### NCMEC (National Center for Missing & Exploited Children)

**Purpose:** Access to missing children database, image distribution

**Requirements:**
- Must be law enforcement agency
- Requires formal partnership agreement

**How to Apply:**
1. Contact NCMEC at https://www.missingkids.org
2. Law Enforcement Portal registration
3. Agency verification
4. Sign partnership agreement

**Variables:**
```env
NCMEC_API_URL=https://api.missingkids.org/v1
NCMEC_API_KEY=provided-after-approval
```

**Features:**
- Missing children case data
- AMBER Alert integration
- Image distribution network
- Age progression requests

---

### Hospital Registries

**Purpose:** Search hospital John/Jane Doe admissions

**Setup:** Requires individual agreements with hospital networks

**Variables:**
```env
HOSPITAL_REGISTRIES={"registries":[
  {
    "id": "hospital-network-1",
    "name": "Regional Health Network",
    "endpoint": "https://api.hospital.org/patients",
    "apiKey": "xxx",
    "searchEndpoint": "/search",
    "matchEndpoint": "/match"
  }
]}
```

**Common Networks:**
- Epic MyChart API (requires Epic partnership)
- Cerner API (requires Cerner partnership)
- State HIE (Health Information Exchange)

---

## 10. Cost Summary

### Minimum Viable (Small Agency)

| Service | Monthly Cost |
|---------|--------------|
| Supabase Pro | $25 |
| SendGrid Essentials | $19.95 |
| Twilio (500 SMS) | ~$5 |
| Azure Face (Free) | $0 |
| OpenAI Whisper (10 hrs) | ~$4 |
| **Total** | **~$54/month** |

### Full Production

| Service | Monthly Cost |
|---------|--------------|
| Supabase Pro | $25 |
| SendGrid Pro | $89.95 |
| Twilio (5,000 SMS) | ~$45 |
| Azure Face S0 (50K) | $50 |
| AWS Rekognition (10K) | $10 |
| OpenAI Whisper (100 hrs) | $36 |
| Twitter Basic | $100 |
| NewsAPI Business | $449 |
| IPInfo Basic | $99 |
| **Total** | **~$904/month** |

### Enterprise (High Volume)

| Service | Monthly Cost |
|---------|--------------|
| Supabase Team | $599 |
| AWS SES (500K emails) | $50 |
| Twilio (50,000 SMS) | ~$400 |
| Azure Face S0 (500K) | $500 |
| All transcription services | $200 |
| Twitter Pro | $5,000 |
| NewsAPI Corporate | $1,000+ |
| **Total** | **~$7,750+/month** |

---

## Environment File Template

See `.env.example` in the project root for a complete template with all variables.

```bash
# Copy and configure
cp .env.example .env.local
```

---

## Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Rotate keys regularly** - Especially after team changes
3. **Use least privilege** - Only grant necessary API permissions
4. **Separate environments** - Different keys for dev/staging/prod
5. **Audit access** - Review API usage logs monthly
6. **Encrypt at rest** - Use CREDENTIALS_MASTER_KEY for stored secrets

---

## Troubleshooting

### "Service not configured" errors
- Check that the required env vars are set
- Verify keys don't have extra whitespace
- Confirm service account has required permissions

### Rate limiting
- Implement exponential backoff
- Cache responses where appropriate
- Consider upgrading API tier

### Authentication failures
- Regenerate API keys
- Check key hasn't expired
- Verify domain/IP restrictions

---

*Last updated: January 2026*
