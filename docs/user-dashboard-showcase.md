# User Case Dashboard - Component Showcase

## Overview
This document showcases the components built for the user case dashboard (LC-M1-004).

## Dashboard Layout

The user dashboard (`/cases`) displays:

### 1. Header Section
- Page title: "My Cases"
- Description: "Track and monitor your missing person reports"
- Action button: "+ Report Missing Person"

### 2. Case Statistics Cards (4-column grid)
- **Active Cases** - Total active cases count
- **New Leads** - Count of new leads requiring review
- **Pending Actions** - Actions requiring user attention
- **Days Active** - Days since case was reported

### 3. CaseCard Component
Displays the active case with:
- **Priority Badge** - Color-coded (P0=Red, P1=Orange, P2=Yellow, P3=Blue, P4=Gray)
- **Case Number** - e.g., "LC-2024-0089"
- **Name** - Privacy-protected (e.g., "Jamel D.")
- **Photo** - Placeholder or actual photo
- **Metadata** - Age, last seen location
- **Time Warning** - "Missing 48+ hours" (auto-calculated)
- **Risk Factors** - Color-coded badges
- **Action Button** - "View Details" linking to full case

### 4. Recent Leads & Timeline (2-column grid)

#### Left Column: Recent Leads
Each **LeadItem** shows type icon, title, description, status badge, and timestamp.

#### Right Column: Case Timeline
**TimelineView** component displays chronological events with icons.

### 5. Nearby Resources Section
**ResourceGrid** shows hospitals, shelters, police stations, and transit hubs.

### 6. Notification Preferences
**NotificationPreferences** allows users to configure channels and frequency.

## Components Delivered ✅

All components specified in acceptance criteria have been implemented and are ready for integration.
