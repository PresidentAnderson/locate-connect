"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register fonts (using default for now)
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
  },
  header: {
    marginBottom: 30,
    borderBottom: "2 solid #0891b2",
    paddingBottom: 20,
  },
  logo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  logoBox: {
    width: 40,
    height: 40,
    backgroundColor: "#0891b2",
    borderRadius: 8,
    marginRight: 10,
  },
  companyName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  cyanText: {
    color: "#0891b2",
  },
  tealText: {
    color: "#0d9488",
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 10,
  },
  reportSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 5,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: "1 solid #e5e7eb",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    width: "30%",
    backgroundColor: "#f0fdfa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 10,
    color: "#0d9488",
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#134e4a",
  },
  kpiDescription: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 4,
  },
  table: {
    width: "100%",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottom: "1 solid #e5e7eb",
  },
  tableHeaderCell: {
    padding: 8,
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #f3f4f6",
  },
  tableCell: {
    padding: 8,
    fontSize: 9,
    color: "#4b5563",
    flex: 1,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginTop: 4,
  },
  progressFill: {
    height: 8,
    backgroundColor: "#0891b2",
    borderRadius: 4,
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
    fontSize: 8,
    color: "#9ca3af",
  },
  pageNumber: {
    fontSize: 8,
    color: "#9ca3af",
  },
  summaryBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 10,
    color: "#4b5563",
    lineHeight: 1.5,
  },
  chartPlaceholder: {
    backgroundColor: "#f3f4f6",
    height: 150,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  chartPlaceholderText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  twoColumn: {
    flexDirection: "row",
    gap: 15,
  },
  column: {
    flex: 1,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottom: "1 solid #f3f4f6",
  },
  metricLabel: {
    fontSize: 10,
    color: "#6b7280",
  },
  metricValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#111827",
  },
});

// Types
export interface ReportData {
  title: string;
  subtitle: string;
  dateRange: {
    from: string;
    to: string;
  };
  generatedAt: string;
  includeBranding: boolean;
  includeCharts: boolean;
  kpis: {
    label: string;
    value: string | number;
    description?: string;
  }[];
  resolutionRates?: {
    overall: number;
    byPriority: { priority: string; rate: number }[];
  };
  caseMetrics?: {
    total: number;
    active: number;
    resolved: number;
    avgResolutionHours: number;
  };
  staffProductivity?: {
    name: string;
    casesResolved: number;
    leadsVerified: number;
    performanceScore: number;
  }[];
  geographicData?: {
    region: string;
    totalCases: number;
    activeCases: number;
    resolvedCases: number;
  }[];
  partnerEngagement?: {
    organization: string;
    casesReferred: number;
    collaborationScore: number;
  }[];
  slaCompliance?: {
    totalCases: number;
    compliantCases: number;
    averageScore: number;
    byPriority: { priority: string; compliant: number; total: number }[];
  };
}

interface ReportPDFDocumentProps {
  data: ReportData;
}

export function ReportPDFDocument({ data }: ReportPDFDocumentProps) {
  const {
    title,
    subtitle,
    dateRange,
    generatedAt,
    includeBranding,
    includeCharts,
    kpis,
    resolutionRates,
    caseMetrics,
    staffProductivity,
    geographicData,
    partnerEngagement,
    slaCompliance,
  } = data;

  return (
    <Document>
      {/* Cover / Summary Page */}
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
            <Text style={styles.reportTitle}>{title}</Text>
            <Text style={styles.reportSubtitle}>
              {subtitle} | {dateRange.from} to {dateRange.to}
            </Text>
          </View>
        )}

        {!includeBranding && (
          <View style={styles.header}>
            <Text style={styles.reportTitle}>{title}</Text>
            <Text style={styles.reportSubtitle}>
              {dateRange.from} to {dateRange.to}
            </Text>
          </View>
        )}

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>
              This report provides a comprehensive overview of organizational performance
              for the period {dateRange.from} to {dateRange.to}. Key metrics include
              case resolution rates, staff productivity, geographic distribution, and
              partner engagement statistics.
            </Text>
          </View>
        </View>

        {/* KPIs */}
        {kpis && kpis.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
            <View style={styles.kpiGrid}>
              {kpis.map((kpi, index) => (
                <View key={index} style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>{kpi.label}</Text>
                  <Text style={styles.kpiValue}>{kpi.value}</Text>
                  {kpi.description && (
                    <Text style={styles.kpiDescription}>{kpi.description}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Case Metrics */}
        {caseMetrics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Case Metrics Overview</Text>
            <View style={styles.twoColumn}>
              <View style={styles.column}>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Total Cases</Text>
                  <Text style={styles.metricValue}>{caseMetrics.total}</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Active Cases</Text>
                  <Text style={styles.metricValue}>{caseMetrics.active}</Text>
                </View>
              </View>
              <View style={styles.column}>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Resolved Cases</Text>
                  <Text style={styles.metricValue}>{caseMetrics.resolved}</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Avg Resolution Time</Text>
                  <Text style={styles.metricValue}>
                    {caseMetrics.avgResolutionHours > 24
                      ? `${(caseMetrics.avgResolutionHours / 24).toFixed(1)} days`
                      : `${caseMetrics.avgResolutionHours.toFixed(1)} hours`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated: {generatedAt}
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

      {/* Resolution Rates Page */}
      {resolutionRates && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resolution Rates Analysis</Text>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>
                Overall Resolution Rate: {resolutionRates.overall.toFixed(1)}%
              </Text>
              <Text style={styles.summaryText}>
                Analysis of case resolution rates across different priority levels.
              </Text>
            </View>

            {/* Resolution by Priority */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>Priority</Text>
                <Text style={styles.tableHeaderCell}>Resolution Rate</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Progress</Text>
              </View>
              {resolutionRates.byPriority.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{item.priority}</Text>
                  <Text style={styles.tableCell}>{item.rate.toFixed(1)}%</Text>
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(item.rate, 100)}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {includeCharts && (
            <View style={styles.chartPlaceholder}>
              <Text style={styles.chartPlaceholderText}>
                [Resolution Rate Chart Visualization]
              </Text>
            </View>
          )}

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              Generated: {generatedAt}
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

      {/* Staff Productivity Page */}
      {staffProductivity && staffProductivity.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Staff Productivity Report</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Staff Member</Text>
                <Text style={styles.tableHeaderCell}>Cases Resolved</Text>
                <Text style={styles.tableHeaderCell}>Leads Verified</Text>
                <Text style={styles.tableHeaderCell}>Performance Score</Text>
              </View>
              {staffProductivity.map((staff, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{staff.name}</Text>
                  <Text style={styles.tableCell}>{staff.casesResolved}</Text>
                  <Text style={styles.tableCell}>{staff.leadsVerified}</Text>
                  <Text style={styles.tableCell}>{staff.performanceScore}/100</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              Generated: {generatedAt}
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

      {/* Geographic Distribution Page */}
      {geographicData && geographicData.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Geographic Distribution</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Region</Text>
                <Text style={styles.tableHeaderCell}>Total Cases</Text>
                <Text style={styles.tableHeaderCell}>Active</Text>
                <Text style={styles.tableHeaderCell}>Resolved</Text>
              </View>
              {geographicData.map((region, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{region.region}</Text>
                  <Text style={styles.tableCell}>{region.totalCases}</Text>
                  <Text style={styles.tableCell}>{region.activeCases}</Text>
                  <Text style={styles.tableCell}>{region.resolvedCases}</Text>
                </View>
              ))}
            </View>
          </View>

          {includeCharts && (
            <View style={styles.chartPlaceholder}>
              <Text style={styles.chartPlaceholderText}>
                [Geographic Distribution Map]
              </Text>
            </View>
          )}

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              Generated: {generatedAt}
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

      {/* Partner Engagement Page */}
      {partnerEngagement && partnerEngagement.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Partner Engagement Metrics</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Organization</Text>
                <Text style={styles.tableHeaderCell}>Cases Referred</Text>
                <Text style={styles.tableHeaderCell}>Collab Score</Text>
              </View>
              {partnerEngagement.map((partner, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{partner.organization}</Text>
                  <Text style={styles.tableCell}>{partner.casesReferred}</Text>
                  <Text style={styles.tableCell}>{partner.collaborationScore}/100</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              Generated: {generatedAt}
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

      {/* SLA Compliance Page */}
      {slaCompliance && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SLA Compliance Report</Text>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>
                Overall Compliance: {slaCompliance.averageScore.toFixed(1)}%
              </Text>
              <Text style={styles.summaryText}>
                {slaCompliance.compliantCases} out of {slaCompliance.totalCases} cases
                are meeting SLA requirements.
              </Text>
            </View>

            {slaCompliance.byPriority && slaCompliance.byPriority.length > 0 && (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Priority Level</Text>
                  <Text style={styles.tableHeaderCell}>Compliant</Text>
                  <Text style={styles.tableHeaderCell}>Total</Text>
                  <Text style={styles.tableHeaderCell}>Compliance %</Text>
                </View>
                {slaCompliance.byPriority.map((item, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{item.priority}</Text>
                    <Text style={styles.tableCell}>{item.compliant}</Text>
                    <Text style={styles.tableCell}>{item.total}</Text>
                    <Text style={styles.tableCell}>
                      {item.total > 0
                        ? ((item.compliant / item.total) * 100).toFixed(1)
                        : "N/A"}
                      %
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              Generated: {generatedAt}
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

export default ReportPDFDocument;
