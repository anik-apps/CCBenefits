import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UtilizationBar from '../UtilizationBar';

describe('UtilizationBar', () => {
  it('renders with correct percentage', () => {
    render(<UtilizationBar current={50} max={100} showLabel />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('caps at 100%', () => {
    render(<UtilizationBar current={150} max={100} showLabel />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('handles zero max gracefully', () => {
    render(<UtilizationBar current={0} max={0} showLabel />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('does not show label by default', () => {
    const { container } = render(<UtilizationBar current={50} max={100} />);
    expect(container.querySelector('span')).toBeNull();
  });

  it('uses red color below 50%', () => {
    render(<UtilizationBar current={25} max={100} showLabel />);
    const label = screen.getByText('25%');
    expect(label.style.color).toBe('var(--accent-red)');
  });

  it('uses amber color at 50%+', () => {
    render(<UtilizationBar current={60} max={100} showLabel />);
    const label = screen.getByText('60%');
    expect(label.style.color).toBe('var(--accent-amber)');
  });

  it('uses emerald color at 100%', () => {
    render(<UtilizationBar current={100} max={100} showLabel />);
    const label = screen.getByText('100%');
    expect(label.style.color).toBe('var(--accent-emerald)');
  });
});
