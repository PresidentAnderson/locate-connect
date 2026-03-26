// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BadgeDisplay } from './BadgeDisplay';
import type { TrainingBadge } from '@/types/training.types';

function makeBadge(overrides: Partial<TrainingBadge> = {}): TrainingBadge {
  return {
    id: 'badge-1',
    slug: 'first-case',
    name: 'First Case',
    badgeType: 'completion',
    criteria: {},
    points: 10,
    isPublic: true,
    displayOrder: 1,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('BadgeDisplay', () => {
  it('renders the badge container', () => {
    const { container } = render(<BadgeDisplay badge={makeBadge()} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('applies opacity-50 when not earned', () => {
    const { container } = render(<BadgeDisplay badge={makeBadge()} earned={false} />);
    const ring = container.querySelector('.opacity-50');
    expect(ring).toBeTruthy();
  });

  it('does not apply opacity-50 when earned', () => {
    const { container } = render(<BadgeDisplay badge={makeBadge()} earned />);
    const ring = container.querySelector('.opacity-50');
    expect(ring).toBeNull();
  });

  it('does not show details by default', () => {
    render(<BadgeDisplay badge={makeBadge({ name: 'Test Badge' })} earned />);
    expect(screen.queryByText('Test Badge')).toBeNull();
  });

  it('shows badge name when showDetails is true', () => {
    render(<BadgeDisplay badge={makeBadge({ name: 'Test Badge' })} earned showDetails />);
    expect(screen.getByText('Test Badge')).toBeTruthy();
  });

  it('shows earned date when showDetails is true and earnedAt is provided', () => {
    render(
      <BadgeDisplay
        badge={makeBadge()}
        earned
        earnedAt="2025-06-15T00:00:00Z"
        showDetails
      />
    );
    // toLocaleDateString output varies by locale, just check something renders
    const dateElement = screen.getByText(/2025/);
    expect(dateElement).toBeTruthy();
  });

  it('does not show earned date when earnedAt is not provided', () => {
    render(<BadgeDisplay badge={makeBadge()} earned showDetails />);
    expect(screen.queryByText(/2025/)).toBeNull();
  });

  it('shows points when earned and showDetails is true and points > 0', () => {
    render(
      <BadgeDisplay
        badge={makeBadge({ points: 25 })}
        earned
        showDetails
      />
    );
    expect(screen.getByText('25')).toBeTruthy();
  });

  it('does not show points when not earned', () => {
    render(
      <BadgeDisplay
        badge={makeBadge({ points: 25 })}
        earned={false}
        showDetails
      />
    );
    expect(screen.queryByText('25')).toBeNull();
  });

  it('does not show points when points is 0', () => {
    render(
      <BadgeDisplay
        badge={makeBadge({ points: 0 })}
        earned
        showDetails
      />
    );
    // Points section should not render when points is 0
    const pointsBadge = screen.queryByText('0');
    // The 0 points badge should not be displayed due to the points > 0 check
    expect(pointsBadge).toBeNull();
  });

  it('uses green colors for completion badge when earned', () => {
    const { container } = render(
      <BadgeDisplay badge={makeBadge({ badgeType: 'completion' })} earned />
    );
    expect(container.querySelector('.bg-green-100')).toBeTruthy();
  });

  it('uses purple colors for achievement badge when earned', () => {
    const { container } = render(
      <BadgeDisplay badge={makeBadge({ badgeType: 'achievement' })} earned />
    );
    expect(container.querySelector('.bg-purple-100')).toBeTruthy();
  });

  it('uses yellow colors for milestone badge when earned', () => {
    const { container } = render(
      <BadgeDisplay badge={makeBadge({ badgeType: 'milestone' })} earned />
    );
    expect(container.querySelector('.bg-yellow-100')).toBeTruthy();
  });

  it('uses gray colors for any badge type when not earned', () => {
    const { container } = render(
      <BadgeDisplay badge={makeBadge({ badgeType: 'achievement' })} earned={false} />
    );
    expect(container.querySelector('.bg-gray-100')).toBeTruthy();
  });

  it('renders iconUrl as image when provided', () => {
    render(
      <BadgeDisplay
        badge={makeBadge({ iconUrl: '/icons/test.png', name: 'Test Badge' })}
        earned
      />
    );
    const img = screen.getByAltText('Test Badge');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('/icons/test.png');
  });

  it('applies grayscale to icon image when not earned', () => {
    render(
      <BadgeDisplay
        badge={makeBadge({ iconUrl: '/icons/test.png', name: 'Test Badge' })}
        earned={false}
      />
    );
    const img = screen.getByAltText('Test Badge');
    expect(img.className).toContain('grayscale');
  });

  it('renders different sizes', () => {
    const { container: sm } = render(<BadgeDisplay badge={makeBadge()} size="sm" />);
    expect(sm.querySelector('.w-12')).toBeTruthy();

    const { container: md } = render(<BadgeDisplay badge={makeBadge()} size="md" />);
    expect(md.querySelector('.w-16')).toBeTruthy();

    const { container: lg } = render(<BadgeDisplay badge={makeBadge()} size="lg" />);
    expect(lg.querySelector('.w-24')).toBeTruthy();
  });

  it('sets title attribute to badge description', () => {
    const { container } = render(
      <BadgeDisplay badge={makeBadge({ description: 'Awarded for first case' })} />
    );
    const titled = container.querySelector('[title="Awarded for first case"]');
    expect(titled).toBeTruthy();
  });
});
