# LC-M2-003: Risk Factor Intake Implementation Summary

## Overview
This implementation adds a contextual/interpersonal risk intake system to LocateConnect with comprehensive privacy safeguards as specified in LC-M2-003.

## Acceptance Criteria - All Met ✅

### 1. ✅ Non-accusatory language in all prompts
- Pre-defined risk categories use neutral terminology
- UI labels use "concern", "context", "information" instead of accusations
- Disclaimers clearly state information is not meant to blame anyone
- Help text emphasizes contextual nature

### 2. ✅ No identifiers shown in LE view by default  
- `included_in_le_view` defaults to `FALSE` in database
- Sanitization function removes reporter information
- Only shows category, type, severity, and correlation data
- Explicit authorization required to change visibility

### 3. ✅ Risk factors require corroboration
- All factors created with `requires_corroboration = TRUE`
- `is_corroborated` field tracks verification status
- Corroboration source, date, and verifier recorded
- Weight calculation reduced for unverified factors

### 4. ✅ Separate storage with access controls
- Dedicated tables: `sensitive_risk_factors`, `risk_factor_access_log`, `risk_factor_consent`
- Row-Level Security (RLS) enforces authorization at database level
- `authorized_viewers` array controls access per factor
- Default restriction prevents unauthorized access

### 5. ✅ Audit logging for access
- Automatic trigger logs all INSERT/UPDATE operations
- Manual logging for READ operations via API
- Captures: user, timestamp, action type, correlation status, IP, user agent
- Admin-only access to audit logs via RLS

### 6. ✅ Reporter acknowledgment of sensitivity
- 6-point consent checklist required before data entry
- Records acknowledgment timestamp and IP address
- Stores full consent text and version
- Cannot submit without all acknowledgments

## Safety Constraints - All Implemented ✅

### 1. ✅ Low weight in priority calculation
- Base weight: 0.05 (low), 0.10 (medium), 0.15 (high)
- Compare to standard factors: 5-20 points
- Represents <1% impact on priority score
- Weight further reduced if not corroborated (50% reduction)

### 2. ✅ Only surfaces with behavioral/medical correlation
- Access control checks for correlation before granting LE access
- Zero weight in priority if no correlation provided
- Both `behavioral_correlation` and `medical_correlation` fields available
- Access denied message explains correlation requirement

### 3. ✅ Clear disclaimers about non-accusatory nature
- Disclaimer shown before entering section
- Repeated in consent acknowledgments
- Included in privacy policy text
- Displayed in UI help text

## Files Added/Modified

### Database Migration
- `supabase/migrations/20260117173000_risk_factor_intake.sql`
  - Creates 3 tables with RLS policies
  - Adds automatic audit triggers
  - Includes comprehensive comments

### TypeScript Types  
- `src/types/risk-factor.types.ts`
  - Complete type definitions for risk factors, consent, and access logs
  - Non-accusatory language constants
  - Pre-defined risk categories and types
  - Mapper functions for database conversion

### Service Layer
- `src/lib/services/risk-factor-service.ts`
  - Access control checking with correlation requirements
  - Consent validation
  - Weight calculation with correlation checks
  - Sanitization for LE view
  - Audit log entry creation

### UI Component
- `src/components/intake/RiskFactorIntake.tsx`
  - Optional section with skip option
  - Progressive disclosure (consent → data entry)
  - Category-based risk factor input
  - Correlation fields for each factor
  - Real-time consent validation

### API Routes
- `src/app/api/risk-factors/route.ts`
  - POST: Create risk factors with consent validation
  - GET: Retrieve with automatic access logging
  - Authorization checks
  - IP address and user agent capture

### Integration Points
- `src/lib/services/priority-engine.ts`
  - Accepts optional `sensitiveRiskFactors` array
  - Applies low weight with correlation checks
  - Includes in assessment only when appropriate

- `src/app/(dashboard)/cases/new/page.tsx`
  - New "contextual-risks" step in intake flow
  - Separate API call after case creation
  - Non-blocking (case succeeds even if risk factors fail)

- `src/components/intake/index.ts`
  - Exports RiskFactorIntake component

- `src/types/index.ts`
  - Exports risk factor types

### Documentation
- `docs/RISK_FACTOR_PRIVACY.md`
  - Comprehensive privacy safeguards documentation
  - Technical implementation details
  - Best practices for law enforcement
  - Compliance considerations

## Key Design Decisions

### Separate API Call
Risk factors submitted in separate API call after case creation to ensure:
- Case creation succeeds even if risk factors fail
- Can be added later by authorized users
- Clean separation of concerns

### Progressive Consent
Consent shown before risk factor input to ensure:
- Informed consent before data collection
- User understands privacy protections
- Clear acknowledgment of limitations

### Correlation as Gatekeeper
Correlation requirement for LE visibility ensures:
- Context tied to objective factors
- Not shown without relevance
- Prevents misuse of contextual information

### Optional Section
Entire section optional to ensure:
- No pressure to provide sensitive information
- Data minimization principle
- User control over disclosure

## Testing Recommendations

### Database Tests
- [ ] Verify RLS policies prevent unauthorized access
- [ ] Confirm audit triggers fire on all operations
- [ ] Test correlation requirements in access checks

### API Tests
- [ ] Test consent validation rejects incomplete consent
- [ ] Verify authorization checks work correctly
- [ ] Confirm access logging captures all required fields

### UI Tests
- [ ] Verify consent flow prevents data entry without acknowledgment
- [ ] Test skip functionality works correctly
- [ ] Confirm correlation fields are prominent

### Integration Tests
- [ ] Test priority engine correctly applies low weight
- [ ] Verify case submission succeeds with risk factors
- [ ] Confirm case submission succeeds without risk factors
- [ ] Test case submission succeeds when risk factors fail

### Security Tests
- [ ] Attempt unauthorized access to risk factors
- [ ] Verify LE cannot access without correlation
- [ ] Test audit logging cannot be tampered with
- [ ] Confirm sensitive data not in LE view

## Compliance Checklist

### PIPEDA Compliance
- ✅ Consent obtained before collection
- ✅ Purpose clearly stated (aid in search)
- ✅ Limited collection (only relevant factors)
- ✅ Safeguards in place (RLS, audit logs, encryption)
- ✅ Accountability through comprehensive logging
- ✅ Individual access (reporters can view their data)

### Privacy by Design
- ✅ Proactive not reactive (built into system)
- ✅ Privacy as default (restricted access, low weight)
- ✅ Privacy embedded in design (separate storage, RLS)
- ✅ Positive-sum (aids search while protecting privacy)
- ✅ End-to-end security (database to UI)
- ✅ Visibility and transparency (audit logs, disclaimers)
- ✅ Respect for user privacy (optional, acknowledged, minimal)

## Future Enhancements

### Short Term
1. Add UI for law enforcement to view risk factors with correlation
2. Implement corroboration workflow for investigators
3. Add admin dashboard for access log review

### Medium Term
1. Automated correlation detection using pattern matching
2. Integration with existing behavioral/medical assessments
3. Risk factor templates for common scenarios

### Long Term
1. Machine learning for correlation suggestions
2. Anonymous research dataset generation
3. Integration with external verification systems

## Support and Maintenance

### Monitoring
- Review access logs monthly for unusual patterns
- Track correlation and corroboration rates
- Monitor weight contribution to priority scores

### Updates
- Keep consent text current with privacy regulations
- Update risk categories based on law enforcement feedback
- Refine correlation requirements based on usage patterns

### Documentation
- Maintain privacy documentation as system evolves
- Update training materials for reporters and LE
- Document any changes to access control logic
