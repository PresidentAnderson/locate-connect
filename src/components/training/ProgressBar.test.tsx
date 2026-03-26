// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProgressBar percentage={50} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not show label by default', () => {
    render(<ProgressBar percentage={50} />);
    expect(screen.queryByText('Progress')).toBeNull();
    expect(screen.queryByText('50%')).toBeNull();
  });

  it('shows label when showLabel is true', () => {
    render(<ProgressBar percentage={50} showLabel />);
    expect(screen.getByText('Progress')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('rounds the percentage in the label', () => {
    render(<ProgressBar percentage={33.7} showLabel />);
    expect(screen.getByText('34%')).toBeTruthy();
  });

  it('clamps the bar width to a minimum of 0%', () => {
    const { container } = render(<ProgressBar percentage={-20} />);
    const bar = container.querySelector('[style]');
    expect(bar?.getAttribute('style')).toContain('width: 0%');
  });

  it('clamps the bar width to a maximum of 100%', () => {
    const { container } = render(<ProgressBar percentage={150} />);
    const bar = container.querySelector('[style]');
    expect(bar?.getAttribute('style')).toContain('width: 100%');
  });

  it('sets correct width for normal percentage', () => {
    const { container } = render(<ProgressBar percentage={75} />);
    const bar = container.querySelector('[style]');
    expect(bar?.getAttribute('style')).toContain('width: 75%');
  });

  it('applies sm height class', () => {
    const { container } = render(<ProgressBar percentage={50} size="sm" />);
    const track = container.querySelector('.h-1');
    expect(track).toBeTruthy();
  });

  it('applies md height class by default', () => {
    const { container } = render(<ProgressBar percentage={50} />);
    const track = container.querySelector('.h-2');
    expect(track).toBeTruthy();
  });

  it('applies lg height class', () => {
    const { container } = render(<ProgressBar percentage={50} size="lg" />);
    const track = container.querySelector('.h-3');
    expect(track).toBeTruthy();
  });

  it('uses cyan color by default', () => {
    const { container } = render(<ProgressBar percentage={50} />);
    const bar = container.querySelector('.bg-cyan-600');
    expect(bar).toBeTruthy();
  });

  it('applies custom color', () => {
    const { container } = render(<ProgressBar percentage={50} color="green" />);
    const bar = container.querySelector('.bg-green-600');
    expect(bar).toBeTruthy();
  });

  it('falls back to cyan for unknown color', () => {
    const { container } = render(<ProgressBar percentage={50} color="unknown" />);
    const bar = container.querySelector('.bg-cyan-600');
    expect(bar).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(<ProgressBar percentage={50} className="my-custom-class" />);
    expect(container.firstChild).toHaveProperty('className');
    expect((container.firstChild as HTMLElement).className).toContain('my-custom-class');
  });
});
