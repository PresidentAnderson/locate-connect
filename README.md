# LocateConnect

A comprehensive missing persons case management platform designed to streamline investigations, coordinate with law enforcement, and support families during critical times.

## Features

### Case Management
- **Multi-step case intake** with Zod validation and draft persistence
- **Priority assessment engine** with automatic escalation
- **Case lifecycle tracking** from intake to resolution
- **Photo upload** with Supabase Storage integration

### Real-time Notifications
- **Supabase real-time subscriptions** for instant updates
- **Push notifications** with service worker support
- **Customizable notification preferences** per user
- **Multi-channel alerts** (email, SMS, push, webhook)

### Geofencing & Mapping
- **Interactive map** with react-leaflet integration
- **Geofence drawing tools** (circle, polygon, corridor)
- **Location-based alerts** on entry/exit events
- **Sighting tracking** with confidence scoring

### Law Enforcement Portal
- **AMBER Alert management** and distribution
- **Shift handoff tools** for seamless case transfers
- **Evidence chain of custody** tracking
- **Multi-jurisdiction coordination**

### Analytics & Reporting
- **Executive dashboard** with KPIs and metrics
- **System health monitoring** in real-time
- **Resolution heatmaps** for pattern analysis
- **Outcome reporting** with PDF generation

### External Integrations
- **Connector framework** with circuit breakers
- **Hospital registry** integration
- **Border services** (CBSA, ICE) coordination
- **Transit authority** data feeds
- **Credentials vault** with encryption

### Background Processing
- **Cron jobs** for scheduled tasks via Vercel
- **Priority escalation** automation
- **News and social media** monitoring
- **Data ingestion agents**

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Styling**: Tailwind CSS 4
- **Maps**: Leaflet / react-leaflet
- **PDF**: @react-pdf/renderer
- **Validation**: Zod
- **Testing**: Vitest + Playwright
- **i18n**: next-intl

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase account

### Environment Variables

Create a `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cron Jobs (Vercel)
CRON_SECRET=your_cron_secret

# Optional: Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
npx supabase db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with UI |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Main application pages
│   └── api/               # API routes
├── components/            # React components
│   ├── forms/             # Form components
│   ├── geofencing/        # Map & geofence components
│   ├── heatmap/           # Heatmap visualizations
│   ├── notifications/     # Notification UI
│   └── ui/                # Shared UI components
├── hooks/                 # Custom React hooks
│   ├── useRealtime.ts     # Supabase real-time hook
│   ├── useNotifications.ts# Notification management
│   └── useFormPersistence.ts # Form draft persistence
├── lib/                   # Utilities and services
│   ├── integrations/      # External connectors
│   ├── services/          # Business logic services
│   ├── supabase/          # Supabase client setup
│   └── validations/       # Zod schemas
├── types/                 # TypeScript type definitions
└── messages/              # i18n translation files
```

## API Endpoints

### Cases
- `GET /api/cases` - List cases with filtering
- `POST /api/cases` - Create new case
- `GET /api/cases/[id]` - Get case details
- `PATCH /api/cases/[id]` - Update case
- `DELETE /api/cases/[id]` - Delete case

### Notifications
- `GET /api/notifications` - List user notifications
- `POST /api/notifications/[id]/read` - Mark as read
- `POST /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/preferences` - Get preferences
- `PATCH /api/notifications/preferences` - Update preferences

### Geofences
- `GET /api/geofences` - List geofences
- `POST /api/geofences` - Create geofence
- `GET /api/geofences/[id]` - Get geofence
- `PATCH /api/geofences/[id]` - Update geofence
- `DELETE /api/geofences/[id]` - Delete geofence
- `GET /api/geofences/[id]/alerts` - Get alerts

### Analytics
- `GET /api/analytics` - Executive dashboard data
- `GET /api/analytics/system-health` - System health metrics

### Cron Jobs (Vercel)
- `GET /api/cron/priority-escalation` - Check priority escalations
- `GET /api/cron/stale-case-check` - Check stale cases
- `GET /api/cron/notification-digest` - Send digest emails
- `GET /api/cron/news-crawler` - Crawl news sources
- `GET /api/cron/social-media` - Monitor social media
- `GET /api/cron/public-records` - Check public records
- `GET /api/cron/hospital-registry` - Query hospitals

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

Cron jobs are automatically configured via `vercel.json`.

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Proprietary - Jonathan Anderson Investigational

## Support

For support, email support@locateconnect.ca or open an issue on GitHub.
