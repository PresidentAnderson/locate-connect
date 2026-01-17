# User Case Dashboard Components

This directory contains reusable components for the user-facing case monitoring dashboard.

## Components

### CaseCard
Displays a missing person case with priority badge, status, and risk factors.

**Props:**
- `id` - Case ID for linking
- `caseNumber` - Display case number (e.g., "LC-2024-0089")
- `firstName` - Missing person's first name
- `lastName` - Missing person's last name  
- `priorityLevel` - Priority level: `p0_critical`, `p1_high`, `p2_medium`, `p3_low`, `p4_routine`
- `status` - Case status: `active`, `resolved`, `closed`, `cold`
- `age` - Optional age at disappearance
- `lastSeenLocation` - Optional last known location
- `lastSeenDate` - ISO date string of when person was last seen
- `photoUrl` - Optional photo URL
- `riskFactors` - Array of risk factor strings
- `className` - Optional additional CSS classes

**Features:**
- Priority-based color coding (red for P0, orange for P1, etc.)
- Automatic time calculation (shows "Missing X hours/days")
- Risk factor badges with smart color coding
- Click to view details

### LeadItem
Displays an individual lead or tip with status indicator.

**Props:**
- `type` - Lead type: `email`, `social`, `witness`, `location`, `hospital`, `detention`, `other`
- `title` - Lead title
- `description` - Lead description
- `time` - Relative time string (e.g., "2 hours ago")
- `status` - Lead status: `new`, `investigating`, `verified`, `dismissed`
- `className` - Optional additional CSS classes

**Features:**
- Icon-based type indicators
- Status badges with color coding
- Compact, readable layout

### TimelineView
Displays a chronological timeline of case events.

**Props:**
- `events` - Array of timeline events
- `className` - Optional additional CSS classes

**Event Object:**
- `id` - Unique event ID
- `date` - Date string (e.g., "Jan 17, 2024")
- `time` - Time string (e.g., "10:32 AM")
- `event` - Event description
- `icon` - Emoji or icon for the event
- `type` - Optional event type: `update`, `lead`, `action`, `escalation`, `other`

**Features:**
- Chronological ordering
- Icon-based event types
- Clean, scannable design

### ResourceGrid
Displays nearby resources (hospitals, shelters, etc.) based on last known location.

**Props:**
- `resources` - Array of resource objects
- `location` - Optional location string to display
- `className` - Optional additional CSS classes

**Resource Object:**
- `id` - Unique resource ID
- `icon` - Emoji or icon
- `title` - Resource type title
- `count` - Number of nearby resources
- `status` - Status message
- `type` - Resource type: `hospital`, `shelter`, `police`, `transit`, `other`

**Features:**
- Grid layout (responsive)
- Count display
- Status indicators

### NotificationPreferences
A form for users to manage their notification preferences for case updates.

**Props:**
- `userId` - User ID
- `initialPreferences` - Optional initial preference values
  - `emailEnabled` - Boolean
  - `smsEnabled` - Boolean
  - `pushEnabled` - Boolean
  - `defaultFrequency` - `immediate`, `daily_digest`, `weekly_digest`
- `onSave` - Callback function when preferences are saved
- `className` - Optional additional CSS classes

**Features:**
- Channel toggles (email, SMS, push)
- Frequency selector
- Notification type checkboxes
- Save action

## Usage Example

```tsx
import {
  CaseCard,
  LeadItem,
  TimelineView,
  ResourceGrid,
  NotificationPreferences
} from "@/components/cases";

export default function Dashboard() {
  const timelineEvents = [
    {
      id: "1",
      date: "Jan 17, 2024",
      time: "10:32 AM",
      event: "Email tracking triggered",
      icon: "📧",
      type: "lead"
    }
  ];

  return (
    <div>
      <CaseCard
        id="LC-2024-0089"
        caseNumber="LC-2024-0089"
        firstName="John"
        lastName="Doe"
        priorityLevel="p0_critical"
        status="active"
        age={34}
        lastSeenLocation="Montreal, QC"
        lastSeenDate="2024-01-15T20:00:00Z"
        riskFactors={["Medical Dependency"]}
      />
      
      <TimelineView events={timelineEvents} />
    </div>
  );
}
```

## Design System

All components follow the LocateConnect design system:
- **Primary Color**: Cyan-600 (#0891b2)
- **Priority Colors**: 
  - P0: Red (critical)
  - P1: Orange (high)
  - P2: Yellow (medium)
  - P3: Blue (low)
  - P4: Gray (routine)
- **Typography**: Tailwind's default font stack
- **Spacing**: Consistent use of Tailwind spacing scale
- **Borders**: Rounded corners (rounded-lg, rounded-xl)

## Accessibility

- Semantic HTML elements
- ARIA labels where appropriate
- Keyboard navigation support
- Color contrast compliance
- Screen reader friendly

## Future Enhancements

- [ ] Add skeleton loading states
- [ ] Add empty states
- [ ] Add error states
- [ ] Add real-time updates via Supabase subscriptions
- [ ] Add export/print functionality
- [ ] Add filtering and sorting
