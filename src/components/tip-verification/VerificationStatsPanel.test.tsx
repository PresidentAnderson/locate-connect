// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerificationStatsPanel } from './VerificationStatsPanel';

function makeStats() {
  return {
    tipVerificationStats: {
      totalTips: 150,
      verifiedTips: 80,
      pendingReviewTips: 30,
      rejectedTips: 20,
      spamTips: 10,
      duplicateTips: 5,
      averageCredibilityScore: 72.5,
      averageVerificationTime: '4.2h',
      tipsLeadingToLeads: 25,
      tipsLeadingToResolutions: 8,
    },
    queueStats: {
      totalPending: 45,
      criticalPending: 3,
      highPriorityPending: 10,
      standardPending: 20,
      lowPriorityPending: 12,
      slaBreached: 2,
    },
    tipsterStats: {
      totalTipsters: 200,
      verifiedSourceTipsters: 50,
      blockedTipsters: 5,
      averageReliabilityScore: 68.3,
    },
    trends: {
      tipsChange: 12.5,
      credibilityChange: -3.2,
      verificationRateChange: 5.1,
      spamRateChange: -1.8,
    },
  };
}

describe('VerificationStatsPanel', () => {
  describe('loading state', () => {
    it('shows loading skeleton when isLoading is true', () => {
      render(<VerificationStatsPanel isLoading />);
      expect(screen.getByText('Verification Statistics')).toBeTruthy();
      const { container } = render(<VerificationStatsPanel isLoading />);
      const pulsingElements = container.querySelectorAll('.animate-pulse');
      expect(pulsingElements.length).toBeGreaterThan(0);
    });
  });

  describe('empty state', () => {
    it('shows "No statistics available" when stats is null', () => {
      render(<VerificationStatsPanel stats={null} />);
      expect(screen.getByText('No statistics available')).toBeTruthy();
    });

    it('shows "No statistics available" when stats is undefined', () => {
      render(<VerificationStatsPanel />);
      expect(screen.getByText('No statistics available')).toBeTruthy();
    });
  });

  describe('with data', () => {
    it('renders tip verification section header', () => {
      render(<VerificationStatsPanel stats={makeStats()} />);
      expect(screen.getByText('Tip Verification')).toBeTruthy();
    });

    it('renders total tips count', () => {
      render(<VerificationStatsPanel stats={makeStats()} />);
      expect(screen.getByText('Total Tips')).toBeTruthy();
      expect(screen.getByText('150')).toBeTruthy();
    });

    it('renders verified tips count', () => {
      render(<VerificationStatsPanel stats={makeStats()} />);
      expect(screen.getByText('Verified')).toBeTruthy();
      expect(screen.getByText('80')).toBeTruthy();
    });

    it('renders pending review count', () => {
      render(<VerificationStatsPanel stats={makeStats()} />);
      expect(screen.getByText('Pending Review')).toBeTruthy();
      expect(screen.getByText('30')).toBeTruthy();
    });

    it('renders average credibility score', () => {
      render(<VerificationStatsPanel stats={makeStats()} />);
      expect(screen.getByText('Avg Credibility')).toBeTruthy();
      expect(screen.getByText('72.5')).toBeTruthy();
    });

    it('renders queue status section', () => {
      render(<VerificationStatsPanel stats={makeStats()} />);
      expect(screen.getByText('Queue Status')).toBeTruthy();
      expect(screen.getByText('Total Pending')).toBeTruthy();
      expect(screen.getByText('45')).toBeTruthy();
    });

    it('renders critical pending count', () => {
      render(<VerificationStatsPanel stats={makeStats()} />);
      expect(screen.getByText('Critical')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('renders SLA breached count', () => {
      render(<VerificationStatsPanel stats={makeStats()} />);
      expect(screen.getByText('SLA Breached')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('renders tipster statistics section', () => {
      render(<VerificationStatsPanel stats={makeStats()} />);
      expect(screen.getByText('Tipster Statistics')).toBeTruthy();
      expect(screen.getByText('Total Tipsters')).toBeTruthy();
      expect(screen.getByText('200')).toBeTruthy();
    });

    it('renders verified sources count', () => {
      render(<VerificationStatsPanel stats={makeStats()} />);
      expect(screen.getByText('Verified Sources')).toBeTruthy();
      expect(screen.getByText('50')).toBeTruthy();
    });

    it('renders trends section', () => {
      render(<VerificationStatsPanel stats={makeStats()} />);
      expect(screen.getByText('Trends (vs Last Period)')).toBeTruthy();
    });

    it('renders positive trend with + prefix', () => {
      render(<VerificationStatsPanel stats={makeStats()} />);
      expect(screen.getByText('+12.5%')).toBeTruthy();
    });

    it('renders negative trend without + prefix', () => {
      render(<VerificationStatsPanel stats={makeStats()} />);
      expect(screen.getByText('-3.2%')).toBeTruthy();
    });

    it('applies green color for positive standard trends', () => {
      const { container } = render(<VerificationStatsPanel stats={makeStats()} />);
      // The +12.5% trend should be green (positive tips change)
      const greenValues = container.querySelectorAll('.text-green-600');
      expect(greenValues.length).toBeGreaterThan(0);
    });

    it('inverts color for spam rate trend (positive spam = red)', () => {
      const stats = makeStats();
      stats.trends.spamRateChange = 5.0; // positive spam is bad
      const { container } = render(<VerificationStatsPanel stats={stats} />);
      // With invertColor, positive values should be red
      const spamText = screen.getByText('+5.0%');
      expect(spamText.className).toContain('text-red-600');
    });
  });
});
