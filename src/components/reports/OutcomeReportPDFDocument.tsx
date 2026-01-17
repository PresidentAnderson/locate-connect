"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { CaseOutcomeReportWithRelations } from "@/types/outcome-report.types";

// Register fonts
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

// Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  header: {
    marginBottom: 25,
    borderBottom: "2 solid #0891b2",
    paddingBottom: 15,
  },
  logo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  logoBox: {
    width: 35,
    height: 35,
    backgroundColor: "#0891b2",
    borderRadius: 6,
    marginRight: 10,
  },
  companyName: {
    fontSize: 20,
    fontWeight: "bold",
  },
  cyanText: {
    color: "#0891b2",
  },
  tealText: {
    color: "#0d9488",
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 8,
  },
  reportSubtitle: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: "1 solid #e5e7eb",
  },
  outcomeBanner: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 15,
  },
  outcomeBannerGreen: {
    backgroundColor: "#dcfce7",
  },
  outcomeBannerAmber: {
    backgroundColor: "#fef3c7",
  },
  outcomeBannerGray: {
    backgroundColor: "#f3f4f6",
  },
  outcomeText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  outcomeTextGreen: {
    color: "#166534",
  },
  outcomeTextAmber: {
    color: "#92400e",
  },
  outcomeTextGray: {
    color: "#374151",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 15,
  },
  kpiCard: {
    width: "23%",
    backgroundColor: "#f0fdfa",
    borderRadius: 6,
    padding: 10,
  },
  kpiLabel: {
    fontSize: 8,
    color: "#0d9488",
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#134e4a",
  },
  kpiSubvalue: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 2,
  },
  twoColumn: {
    flexDirection: "row",
    gap: 15,
  },
  column: {
    flex: 1,
  },
  infoBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottom: "1 solid #f3f4f6",
  },
  infoLabel: {
    fontSize: 9,
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "right",
    maxWidth: "60%",
  },
  table: {
    width: "100%",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottom: "1 solid #e5e7eb",
  },
  tableHeaderCell: {
    padding: 6,
    fontSize: 8,
    fontWeight: "bold",
    color: "#374151",
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #f3f4f6",
  },
  tableCell: {
    padding: 6,
    fontSize: 8,
    color: "#4b5563",
    flex: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    marginTop: 3,
  },
  progressFill: {
    height: 6,
    backgroundColor: "#0891b2",
    borderRadius: 3,
  },
  progressFillGreen: {
    backgroundColor: "#22c55e",
  },
  progressFillRed: {
    backgroundColor: "#ef4444",
  },
  progressFillAmber: {
    backgroundColor: "#f59e0b",
  },
  timeline: {
    marginLeft: 10,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingLeft: 15,
    borderLeft: "2 solid #e5e7eb",
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -19,
    marginRight: 10,
    marginTop: 2,
  },
  timelineDotBlue: {
    backgroundColor: "#3b82f6",
  },
  timelineDotGreen: {
    backgroundColor: "#22c55e",
  },
  timelineDotAmber: {
    backgroundColor: "#f59e0b",
  },
  timelineDotRed: {
    backgroundColor: "#ef4444",
  },
  timelineDotGray: {
    backgroundColor: "#9ca3af",
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#111827",
  },
  timelineDate: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 1,
  },
  timelineDescription: {
    fontSize: 8,
    color: "#4b5563",
    marginTop: 2,
  },
  recommendation: {
    backgroundColor: "#f9fafb",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderLeft: "3 solid #0891b2",
  },
  recommendationHigh: {
    borderLeft: "3 solid #ef4444",
  },
  recommendationMedium: {
    borderLeft: "3 solid #f59e0b",
  },
  recommendationLow: {
    borderLeft: "3 solid #22c55e",
  },
  recommendationCritical: {
    borderLeft: "3 solid #7c2d12",
    backgroundColor: "#fef2f2",
  },
  recommendationTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 3,
  },
  recommendationDescription: {
    fontSize: 8,
    color: "#4b5563",
  },
  badge: {
    fontSize: 7,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 4,
  },
  badgeProcess: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },
  badgeResource: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  badgeCommunication: {
    backgroundColor: "#f3e8ff",
    color: "#6b21a8",
  },
  badgeTechnology: {
    backgroundColor: "#cffafe",
    color: "#0e7490",
  },
  badgePriorityCritical: {
    backgroundColor: "#fecaca",
    color: "#991b1b",
  },
  badgePriorityHigh: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
  },
  badgePriorityMedium: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  badgePriorityLow: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  listBullet: {
    width: 15,
    fontSize: 8,
    color: "#0891b2",
  },
  listText: {
    flex: 1,
    fontSize: 8,
    color: "#4b5563",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "1 solid #e5e7eb",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: "#9ca3af",
  },
  pageNumber: {
    fontSize: 7,
    color: "#9ca3af",
  },
  confidentialBanner: {
    backgroundColor: "#fef2f2",
    padding: 8,
    borderRadius: 4,
    marginBottom: 15,
  },
  confidentialText: {
    fontSize: 8,
    color: "#b91c1c",
    textAlign: "center",
    fontWeight: "bold",
  },
});

// Types
export interface OutcomeReportPDFProps {
  report: CaseOutcomeReportWithRelations;
  generatedAt: string;
  generatedBy?: string;
  includeBranding?: boolean;
  includeConfidential?: boolean;
}

export function OutcomeReportPDFDocument({
  report,
  generatedAt,
  generatedBy,
  includeBranding = true,
  includeConfidential = false,
}: OutcomeReportPDFProps) {
  const subjectName = includeConfidential
    ? `${report.case?.firstName || ""} ${report.case?.lastName || ""}`.trim()
    : "[Redacted]";

  const dispositionStyle = getDispositionStyle(report.case?.disposition);
  const dispositionLabel = formatDisposition(report.case?.disposition);

  return (
    <Document>
      {/* Page 1: Summary & Case Overview */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        {includeBranding && (
          <View style={styles.header}>
            <View style={styles.logo}>
              <View style={styles.logoBox} />
              <Text style={styles.companyName}>
                <Text style={styles.cyanText}>Locate</Text>
                <Text style={styles.tealText}>Connect</Text>
              </Text>
            </View>
            <Text style={styles.reportTitle}>Case Outcome Report</Text>
            <Text style={styles.reportSubtitle}>
              {report.reportNumber} | {report.case?.caseNumber} | {subjectName}
            </Text>
          </View>
        )}

        {!includeBranding && (
          <View style={styles.header}>
            <Text style={styles.reportTitle}>Case Outcome Report</Text>
            <Text style={styles.reportSubtitle}>
              {report.reportNumber} | {report.case?.caseNumber}
            </Text>
          </View>
        )}

        {/* Confidential Banner */}
        {includeConfidential && (
          <View style={styles.confidentialBanner}>
            <Text style={styles.confidentialText}>
              CONFIDENTIAL - LAW ENFORCEMENT USE ONLY
            </Text>
          </View>
        )}

        {/* Outcome Banner */}
        <View
          style={[
            styles.outcomeBanner,
            dispositionStyle === "green"
              ? styles.outcomeBannerGreen
              : dispositionStyle === "amber"
                ? styles.outcomeBannerAmber
                : styles.outcomeBannerGray,
          ]}
        >
          <Text
            style={[
              styles.outcomeText,
              dispositionStyle === "green"
                ? styles.outcomeTextGreen
                : dispositionStyle === "amber"
                  ? styles.outcomeTextAmber
                  : styles.outcomeTextGray,
            ]}
          >
            {dispositionLabel}
          </Text>
          <Text style={styles.reportSubtitle}>
            Resolved on {formatDate(report.caseResolvedAt)}
          </Text>
        </View>

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Duration</Text>
              <Text style={styles.kpiValue}>
                {formatDuration(report.totalDurationHours)}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Leads</Text>
              <Text style={styles.kpiValue}>{report.totalLeadsGenerated}</Text>
              <Text style={styles.kpiSubvalue}>
                {report.leadsVerified} verified
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Tips</Text>
              <Text style={styles.kpiValue}>{report.totalTipsReceived}</Text>
              <Text style={styles.kpiSubvalue}>
                {report.tipsVerified} verified
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Officers</Text>
              <Text style={styles.kpiValue}>
                {report.totalAssignedOfficers}
              </Text>
              <Text style={styles.kpiSubvalue}>assigned</Text>
            </View>
          </View>
        </View>

        {/* Case Details & Resolution */}
        <View style={styles.section}>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Case Details</Text>
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Subject</Text>
                  <Text style={styles.infoValue}>{subjectName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Age at Disappearance</Text>
                  <Text style={styles.infoValue}>
                    {report.case?.ageAtDisappearance || "N/A"} years
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Reported Date</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(report.caseReportedAt)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Resolved Date</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(report.caseResolvedAt)}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Resolution Details</Text>
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Discovery Method</Text>
                  <Text style={styles.infoValue}>
                    {formatDiscoveryMethod(report.discoveryMethod)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Location Found</Text>
                  <Text style={styles.infoValue}>
                    {report.locationFoundCity}, {report.locationFoundProvince}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Found By</Text>
                  <Text style={styles.infoValue}>
                    {report.foundByName || report.foundByType || "N/A"}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Condition</Text>
                  <Text style={styles.infoValue}>
                    {report.conditionAtResolution || "N/A"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated: {formatDateTime(generatedAt)}
            {includeBranding && " | LocateConnect - Confidential"}
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* Page 2: Lead & Tip Analysis */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lead Analysis</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Leads</Text>
              <Text style={styles.kpiValue}>{report.totalLeadsGenerated}</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: "#dcfce7" }]}>
              <Text style={[styles.kpiLabel, { color: "#166534" }]}>
                Verified
              </Text>
              <Text style={[styles.kpiValue, { color: "#166534" }]}>
                {report.leadsVerified}
              </Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: "#fee2e2" }]}>
              <Text style={[styles.kpiLabel, { color: "#991b1b" }]}>
                Dismissed
              </Text>
              <Text style={[styles.kpiValue, { color: "#991b1b" }]}>
                {report.leadsDismissed}
              </Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: "#fef3c7" }]}>
              <Text style={[styles.kpiLabel, { color: "#92400e" }]}>
                False Positive Rate
              </Text>
              <Text style={[styles.kpiValue, { color: "#92400e" }]}>
                {report.falsePositiveRate?.toFixed(1) || 0}%
              </Text>
            </View>
          </View>

          {/* Verification Rate Bar */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Verification Rate</Text>
              <Text style={styles.infoValue}>
                {report.totalLeadsGenerated > 0
                  ? Math.round(
                      (report.leadsVerified / report.totalLeadsGenerated) * 100
                    )
                  : 0}
                %
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  styles.progressFillGreen,
                  {
                    width: `${report.totalLeadsGenerated > 0 ? (report.leadsVerified / report.totalLeadsGenerated) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
            <View style={[styles.infoRow, { marginTop: 8 }]}>
              <Text style={styles.infoLabel}>Average Response Time</Text>
              <Text style={styles.infoValue}>
                {report.avgLeadResponseHours?.toFixed(1) || 0} hours
              </Text>
            </View>
            {report.solvingLeadSource && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Solving Lead Source</Text>
                <Text style={styles.infoValue}>{report.solvingLeadSource}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tip Analysis</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Tips</Text>
              <Text style={styles.kpiValue}>{report.totalTipsReceived}</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: "#dcfce7" }]}>
              <Text style={[styles.kpiLabel, { color: "#166534" }]}>
                Verified
              </Text>
              <Text style={[styles.kpiValue, { color: "#166534" }]}>
                {report.tipsVerified}
              </Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: "#fee2e2" }]}>
              <Text style={[styles.kpiLabel, { color: "#991b1b" }]}>Hoax</Text>
              <Text style={[styles.kpiValue, { color: "#991b1b" }]}>
                {report.tipsHoax}
              </Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: "#cffafe" }]}>
              <Text style={[styles.kpiLabel, { color: "#0e7490" }]}>
                Converted to Leads
              </Text>
              <Text style={[styles.kpiValue, { color: "#0e7490" }]}>
                {report.tipsConvertedToLeads}
              </Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tip-to-Lead Conversion Rate</Text>
              <Text style={styles.infoValue}>
                {report.tipConversionRate?.toFixed(1) || 0}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(report.tipConversionRate || 0, 100)}%`,
                  },
                ]}
              />
            </View>
            <View style={[styles.infoRow, { marginTop: 8 }]}>
              <Text style={styles.infoLabel}>Duplicate Tips</Text>
              <Text style={styles.infoValue}>{report.tipsDuplicate}</Text>
            </View>
          </View>
        </View>

        {/* Resource Utilization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resource Utilization</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Officers Assigned</Text>
                  <Text style={styles.infoValue}>
                    {report.totalAssignedOfficers}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Volunteer Hours</Text>
                  <Text style={styles.infoValue}>
                    {report.totalVolunteerHours || 0}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Media Outlets</Text>
                  <Text style={styles.infoValue}>
                    {report.mediaOutletsEngaged}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.column}>
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Social Media Reach</Text>
                  <Text style={styles.infoValue}>
                    {formatNumber(report.socialMediaReach)}
                  </Text>
                </View>
                {report.estimatedCost && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Estimated Cost</Text>
                    <Text style={styles.infoValue}>
                      ${report.estimatedCost.toLocaleString()}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Partner Organizations</Text>
                  <Text style={styles.infoValue}>
                    {report.partnerOrganizationsInvolved?.length || 0}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated: {formatDateTime(generatedAt)}
            {includeBranding && " | LocateConnect - Confidential"}
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* Page 3: Timeline */}
      {report.timeline && report.timeline.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Case Timeline</Text>
            <View style={styles.timeline}>
              {report.timeline.map((event, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View
                    style={[
                      styles.timelineDot,
                      event.milestoneType === "resolution"
                        ? styles.timelineDotGreen
                        : event.milestoneType === "decision"
                          ? styles.timelineDotBlue
                          : event.wasDelay
                            ? styles.timelineDotRed
                            : styles.timelineDotGray,
                    ]}
                  />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>{event.title}</Text>
                    <Text style={styles.timelineDate}>
                      {formatDateTime(event.timestamp)}
                    </Text>
                    {event.description && (
                      <Text style={styles.timelineDescription}>
                        {event.description}
                      </Text>
                    )}
                    {event.wasDelay && (
                      <Text
                        style={[
                          styles.timelineDescription,
                          { color: "#b91c1c" },
                        ]}
                      >
                        Delay: {event.delayHours?.toFixed(1)} hours -{" "}
                        {event.delayReason}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              Generated: {formatDateTime(generatedAt)}
              {includeBranding && " | LocateConnect - Confidential"}
            </Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
          </View>
        </Page>
      )}

      {/* Page 4: Analysis & Lessons Learned */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Worked</Text>
          <View style={styles.infoBox}>
            {report.whatWorked && report.whatWorked.length > 0 ? (
              report.whatWorked.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listBullet}>+</Text>
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.listText}>No items recorded</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Didn't Work</Text>
          <View style={styles.infoBox}>
            {report.whatDidntWork && report.whatDidntWork.length > 0 ? (
              report.whatDidntWork.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={[styles.listBullet, { color: "#b91c1c" }]}>
                    -
                  </Text>
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.listText}>No items recorded</Text>
            )}
          </View>
        </View>

        {report.delaysIdentified && report.delaysIdentified.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delays Identified</Text>
            <View style={styles.infoBox}>
              {report.delaysIdentified.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={[styles.listBullet, { color: "#f59e0b" }]}>
                    !
                  </Text>
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {report.lessonsLearned && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lessons Learned</Text>
            <View style={styles.infoBox}>
              <Text style={styles.listText}>{report.lessonsLearned}</Text>
            </View>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated: {formatDateTime(generatedAt)}
            {includeBranding && " | LocateConnect - Confidential"}
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* Page 5: Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            {report.recommendations.map((rec, index) => (
              <View
                key={index}
                style={[
                  styles.recommendation,
                  rec.priority === "critical"
                    ? styles.recommendationCritical
                    : rec.priority === "high"
                      ? styles.recommendationHigh
                      : rec.priority === "medium"
                        ? styles.recommendationMedium
                        : styles.recommendationLow,
                ]}
              >
                <View style={styles.badgeRow}>
                  <Text
                    style={[
                      styles.badge,
                      rec.category === "process"
                        ? styles.badgeProcess
                        : rec.category === "resource"
                          ? styles.badgeResource
                          : rec.category === "communication"
                            ? styles.badgeCommunication
                            : styles.badgeTechnology,
                    ]}
                  >
                    {rec.category.toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.badge,
                      rec.priority === "critical"
                        ? styles.badgePriorityCritical
                        : rec.priority === "high"
                          ? styles.badgePriorityHigh
                          : rec.priority === "medium"
                            ? styles.badgePriorityMedium
                            : styles.badgePriorityLow,
                    ]}
                  >
                    {rec.priority.toUpperCase()}
                  </Text>
                  {rec.isImplemented && (
                    <Text
                      style={[styles.badge, { backgroundColor: "#dcfce7", color: "#166534" }]}
                    >
                      IMPLEMENTED
                    </Text>
                  )}
                </View>
                <Text style={styles.recommendationTitle}>{rec.title}</Text>
                <Text style={styles.recommendationDescription}>
                  {rec.description}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              Generated: {formatDateTime(generatedAt)}
              {includeBranding && " | LocateConnect - Confidential"}
            </Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
          </View>
        </Page>
      )}

      {/* Page 6: Similar Cases */}
      {report.similarCases && report.similarCases.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Similar Cases Analysis</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>
                  Case Number
                </Text>
                <Text style={styles.tableHeaderCell}>Similarity</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>
                  Disposition
                </Text>
              </View>
              {report.similarCases.map((sc, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>
                    {/* Similar case number would be fetched */}
                    {sc.similarCaseId.substring(0, 8)}...
                  </Text>
                  <Text style={styles.tableCell}>
                    {sc.similarityScore.toFixed(1)}%
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>
                    {sc.resolutionComparison || "N/A"}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              Generated: {formatDateTime(generatedAt)}
              {includeBranding && " | LocateConnect - Confidential"}
            </Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
          </View>
        </Page>
      )}
    </Document>
  );
}

// Helper functions
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(hours: number): string {
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getDispositionStyle(disposition: string | undefined): string {
  if (!disposition) return "gray";
  if (disposition.includes("alive") || disposition.includes("returned")) {
    return "green";
  }
  if (disposition.includes("injured")) {
    return "amber";
  }
  return "gray";
}

function formatDisposition(disposition: string | undefined): string {
  const labels: Record<string, string> = {
    found_alive_safe: "Found Alive - Safe",
    found_alive_injured: "Found Alive - Injured",
    found_deceased: "Found Deceased",
    returned_voluntarily: "Returned Voluntarily",
    located_runaway: "Located - Runaway",
    located_custody: "Located - In Custody",
    located_medical_facility: "Located - Medical Facility",
    located_shelter: "Located - Shelter",
    located_incarcerated: "Located - Incarcerated",
    false_report: "False Report",
    other: "Other",
  };
  return labels[disposition || ""] || disposition || "Unknown";
}

function formatDiscoveryMethod(method: string | undefined): string {
  const labels: Record<string, string> = {
    lead_from_public: "Lead from Public",
    lead_from_law_enforcement: "Lead from Law Enforcement",
    tip_anonymous: "Anonymous Tip",
    tip_identified: "Identified Tip",
    social_media_monitoring: "Social Media Monitoring",
    surveillance: "Surveillance",
    patrol_encounter: "Patrol Encounter",
    self_return: "Self Return",
    hospital_report: "Hospital Report",
    shelter_report: "Shelter Report",
    cross_border_alert: "Cross-Border Alert",
    amber_alert_response: "AMBER Alert Response",
    volunteer_search: "Volunteer Search",
    ai_facial_recognition: "AI/Facial Recognition",
    financial_tracking: "Financial Tracking",
    phone_tracking: "Phone Tracking",
    other: "Other",
  };
  return labels[method || ""] || method || "Unknown";
}

export default OutcomeReportPDFDocument;
