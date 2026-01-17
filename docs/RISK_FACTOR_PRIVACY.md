# Risk Factor Intake Privacy Safeguards (LC-M2-003)

## Overview
The Risk Factor Intake system implements contextual/interpersonal risk collection with comprehensive privacy safeguards to protect sensitive information while aiding in missing person searches.

## Key Features

### 1. Non-Accusatory Language
All prompts and labels use neutral, non-accusatory language.

### 2. Separate Storage with Access Controls
- Dedicated tables with Row-Level Security (RLS)
- Authorized viewers list per risk factor
- Not shown to law enforcement by default

### 3. Corroboration Requirements
- All risk factors require corroboration
- Weight reduced if not corroborated

### 4. Limited Weight in Priority Calculation
- Base weight: 0.05 - 0.15 (very low)
- Only applied with behavioral or medical correlation
- Further reduced 50% if not corroborated

### 5. Correlation Requirements for LE View
Risk factors only visible to LE when behavioral or medical correlation exists.

### 6. Comprehensive Audit Logging
All access logged with user, time, type, correlation status.

### 7. Reporter Acknowledgment System
Must acknowledge non-accusatory nature, corroboration needs, limited weight, privacy protections.

### 8. Data Minimization
Section is optional, can be skipped entirely.
