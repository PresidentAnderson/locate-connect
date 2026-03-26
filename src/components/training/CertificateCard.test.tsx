// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CertificateCard } from './CertificateCard';
import type { TrainingCertification } from '@/types/training.types';

function makeCertification(overrides: Partial<TrainingCertification> = {}): TrainingCertification {
  return {
    id: 'cert-1',
    userId: 'user-1',
    trackId: 'track-1',
    certificateNumber: 'CERT-2025-001',
    issuedAt: '2025-01-15T00:00:00Z',
    status: 'active',
    metadata: {},
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
    track: { title: 'Missing Persons Fundamentals' } as TrainingCertification['track'],
    ...overrides,
  };
}

describe('CertificateCard', () => {
  it('renders the certificate number', () => {
    render(<CertificateCard certification={makeCertification()} />);
    expect(screen.getByText('Certificate #CERT-2025-001')).toBeTruthy();
  });

  it('renders the track title', () => {
    render(<CertificateCard certification={makeCertification()} />);
    expect(screen.getByText('Missing Persons Fundamentals')).toBeTruthy();
  });

  it('shows Active badge for active non-expired certification', () => {
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    render(<CertificateCard certification={makeCertification({ expiresAt: futureDate })} />);
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('shows Revoked badge for revoked certification', () => {
    render(<CertificateCard certification={makeCertification({ status: 'revoked' })} />);
    expect(screen.getByText('Revoked')).toBeTruthy();
  });

  it('shows Expired badge for expired certification', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    render(
      <CertificateCard
        certification={makeCertification({ expiresAt: pastDate, status: 'active' })}
      />
    );
    expect(screen.getByText('Expired')).toBeTruthy();
  });

  it('shows "Expires in X days" badge when expiring within 30 days', () => {
    const soonDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    render(
      <CertificateCard
        certification={makeCertification({ expiresAt: soonDate, status: 'active' })}
      />
    );
    expect(screen.getByText(/Expires in \d+ days/)).toBeTruthy();
  });

  it('shows Active badge when no expiry date is set', () => {
    render(
      <CertificateCard
        certification={makeCertification({ expiresAt: undefined, status: 'active' })}
      />
    );
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('renders the issued date', () => {
    render(<CertificateCard certification={makeCertification()} />);
    expect(screen.getByText('Issued')).toBeTruthy();
  });

  it('shows expiry date when provided', () => {
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    render(<CertificateCard certification={makeCertification({ expiresAt: futureDate })} />);
    expect(screen.getByText('Expires')).toBeTruthy();
  });

  it('does not show expiry date when not provided', () => {
    render(<CertificateCard certification={makeCertification({ expiresAt: undefined })} />);
    expect(screen.queryByText('Expires')).toBeNull();
  });

  it('shows final score when provided', () => {
    render(
      <CertificateCard certification={makeCertification({ finalScorePercentage: 92 })} />
    );
    expect(screen.getByText('Final Score')).toBeTruthy();
    expect(screen.getByText('92%')).toBeTruthy();
  });

  it('does not show final score when not provided', () => {
    render(
      <CertificateCard certification={makeCertification({ finalScorePercentage: undefined })} />
    );
    expect(screen.queryByText('Final Score')).toBeNull();
  });

  it('shows truncated verification hash when provided', () => {
    render(
      <CertificateCard
        certification={makeCertification({
          verificationHash: 'abc123def456ghi789',
        })}
      />
    );
    expect(screen.getByText('Verification')).toBeTruthy();
    expect(screen.getByText('abc123def456...')).toBeTruthy();
  });

  it('renders Download button when onDownload is provided', () => {
    const onDownload = vi.fn();
    render(
      <CertificateCard certification={makeCertification()} onDownload={onDownload} />
    );
    const btn = screen.getByText('Download');
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onDownload).toHaveBeenCalledOnce();
  });

  it('renders Share button when onShare is provided', () => {
    const onShare = vi.fn();
    render(
      <CertificateCard certification={makeCertification()} onShare={onShare} />
    );
    const btn = screen.getByText('Share');
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onShare).toHaveBeenCalledOnce();
  });

  it('renders Verify button when onVerify is provided', () => {
    const onVerify = vi.fn();
    render(
      <CertificateCard certification={makeCertification()} onVerify={onVerify} />
    );
    const btn = screen.getByText('Verify');
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onVerify).toHaveBeenCalledOnce();
  });

  it('does not render action buttons when callbacks are not provided', () => {
    render(<CertificateCard certification={makeCertification()} />);
    expect(screen.queryByText('Download')).toBeNull();
    expect(screen.queryByText('Share')).toBeNull();
    expect(screen.queryByText('Verify')).toBeNull();
  });

  it('applies red border for revoked status', () => {
    const { container } = render(
      <CertificateCard certification={makeCertification({ status: 'revoked' })} />
    );
    expect(container.querySelector('.border-red-300')).toBeTruthy();
  });

  it('applies green border for active status', () => {
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const { container } = render(
      <CertificateCard certification={makeCertification({ expiresAt: futureDate })} />
    );
    expect(container.querySelector('.border-green-300')).toBeTruthy();
  });

  it('applies yellow border for expired status', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { container } = render(
      <CertificateCard
        certification={makeCertification({ expiresAt: pastDate, status: 'active' })}
      />
    );
    expect(container.querySelector('.border-yellow-300')).toBeTruthy();
  });
});
