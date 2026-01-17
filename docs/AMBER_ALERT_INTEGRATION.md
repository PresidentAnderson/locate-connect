# AMBER Alert Integration

This feature implements a comprehensive AMBER Alert system for the LocateConnect platform, enabling law enforcement to request, approve, and distribute AMBER Alerts for missing children cases.

## Features Implemented

### 1. Database Schema
- **amber_alert_requests**: Main table tracking alert requests from creation to resolution
- **amber_alert_status_history**: Audit trail of all status changes
- **amber_alert_distribution_log**: Tracks alert distribution across channels
- **amber_alert_metrics**: Performance analytics and recovery tracking

### 2. Alert Lifecycle
1. **Draft**: Initial creation by law enforcement
2. **Pending Review**: Submitted for approval
3. **Approved**: Ready for activation
4. **Active**: Currently distributed
5. **Expired/Cancelled/Resolved**: End states

### 3. Distribution Channels
- Wireless Emergency Alerts (WEA)
- Emergency Alert System (EAS)
- AMBER Alert Canada
- AMBER Alert Quebec
- Highway Digital Signage
- Social Media
- Broadcast Media (TV/Radio)
- Mobile App Notifications

### 4. AMBER Alert Criteria Validation
Automated validation ensures alerts meet official criteria:
- ✅ Child under 18 years old
- ✅ Confirmed abduction
- ✅ Imminent danger to child
- ✅ Sufficient descriptive information

### 5. API Endpoints

#### Alert Management
- `POST /api/amber-alerts` - Create new alert request
- `GET /api/amber-alerts` - List alerts (LE only, with filtering)
- `GET /api/amber-alerts/[id]` - Get alert details
- `PATCH /api/amber-alerts/[id]` - Update status/activate
- `DELETE /api/amber-alerts/[id]` - Delete draft alerts
- `GET /api/amber-alerts/[id]/status` - Get status history and metrics

#### Case Integration
- `GET /api/cases/[id]/amber-criteria` - Check if case meets criteria

### 6. User Interface

#### Law Enforcement Dashboard
- `/law-enforcement/amber-alerts` - Alert management dashboard
  - Statistics cards (active, pending, monthly, recovery rate)
  - Filterable alert table
  - Quick actions

#### Alert Detail View
- `/law-enforcement/amber-alerts/[id]` - Individual alert management
  - Complete alert information
  - Approval workflow (approve/reject)
  - Activation controls
  - Real-time status tracking
  - Distribution logs
  - Performance metrics

#### Components
- **AmberAlertRequestForm**: Multi-step form for creating alerts
- **AlertStatusTracker**: Real-time status monitoring with auto-refresh
- **AmberAlertCriteria**: Visual criteria validation checklist

### 7. Security & Compliance

#### Row-Level Security (RLS)
- Law enforcement can view all alerts
- Case reporters can view their own alerts
- All alert actions are audit logged

#### Audit Trail
- Complete history of status changes
- User attribution for all actions
- IP address and user agent tracking
- Integration with existing audit_logs table

## Usage

### Creating an AMBER Alert

1. Navigate to a case that meets AMBER criteria
2. Click "Request AMBER Alert" button
3. Fill in the multi-step form
4. Submit for review

### Approving/Activating an Alert

1. Navigate to `/law-enforcement/amber-alerts`
2. Click on pending alert
3. Review all information
4. Click "Approve" to approve or "Reject" to deny
5. Once approved, click "Activate Alert" to distribute

## Database Functions

### Helper Functions
- `get_active_amber_alerts_nearby(lat, lng, radius)` - Find active alerts near location
- `check_amber_alert_criteria(case_id)` - Validate if case meets criteria
- `get_amber_alert_stats()` - Get dashboard statistics

## Files Modified/Created

### Database
- `supabase/migrations/20260117163800_amber_alert_integration.sql`

### Types
- `src/types/amber-alert.types.ts`

### Services
- `src/lib/services/amber-alert-service.ts`

### API Routes
- `src/app/api/amber-alerts/route.ts`
- `src/app/api/amber-alerts/[id]/route.ts`
- `src/app/api/amber-alerts/[id]/status/route.ts`
- `src/app/api/cases/[id]/amber-criteria/route.ts`

### Components
- `src/components/amber-alerts/AmberAlertRequestForm.tsx`
- `src/components/amber-alerts/AlertStatusTracker.tsx`
- `src/components/amber-alerts/AmberAlertCriteria.tsx`

### Pages
- `src/app/(dashboard)/law-enforcement/amber-alerts/page.tsx`
- `src/app/(dashboard)/law-enforcement/amber-alerts/[id]/page.tsx`
