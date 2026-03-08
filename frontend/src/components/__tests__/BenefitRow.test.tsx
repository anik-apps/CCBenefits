import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import BenefitRow from '../BenefitRow';
import { mockBenefit, mockBinaryBenefit, mockSegment } from '../../test/fixtures';

const defaultHandlers = {
  onToggleBinary: vi.fn(),
  onLogContinuous: vi.fn(),
  onSetPerceived: vi.fn(),
  onSegmentClick: vi.fn(),
};

describe('BenefitRow', () => {
  it('renders benefit name', () => {
    render(<BenefitRow benefit={mockBenefit()} {...defaultHandlers} />);
    expect(screen.getByText('Uber Cash')).toBeInTheDocument();
  });

  it('renders card name when provided', () => {
    render(<BenefitRow benefit={mockBenefit()} cardName="My Platinum" {...defaultHandlers} />);
    expect(screen.getByText('My Platinum')).toBeInTheDocument();
  });

  it('renders toggle switch for binary benefits', () => {
    render(<BenefitRow benefit={mockBinaryBenefit()} {...defaultHandlers} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('calls onToggleBinary when switch is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <BenefitRow
        benefit={mockBinaryBenefit()}
        {...defaultHandlers}
        onToggleBinary={onToggle}
      />,
    );
    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(2, true);
  });

  it('calls onLogContinuous when amount button is clicked', async () => {
    const user = userEvent.setup();
    const onLog = vi.fn();
    render(
      <BenefitRow
        benefit={mockBenefit()}
        {...defaultHandlers}
        onLogContinuous={onLog}
      />,
    );
    // The "+" button for unused continuous benefits
    await user.click(screen.getByText('+'));
    expect(onLog).toHaveBeenCalledWith(1);
  });

  it('shows amount used for continuous benefits', () => {
    render(
      <BenefitRow
        benefit={mockBenefit({ amount_used: 10, is_used: true })}
        {...defaultHandlers}
      />,
    );
    expect(screen.getByText('$10')).toBeInTheDocument();
  });

  it('shows expiring badge when days_remaining <= 7 and not used', () => {
    render(
      <BenefitRow
        benefit={mockBenefit({ days_remaining: 3, is_used: false })}
        {...defaultHandlers}
      />,
    );
    expect(screen.getByText('3d')).toBeInTheDocument();
  });

  it('does not show expiring badge when already used', () => {
    render(
      <BenefitRow
        benefit={mockBenefit({ days_remaining: 3, is_used: true })}
        {...defaultHandlers}
      />,
    );
    expect(screen.queryByText('3d')).not.toBeInTheDocument();
  });

  it('renders period segments', () => {
    const segments = [
      mockSegment({ label: 'Jan', is_current: true }),
      mockSegment({ label: 'Feb', is_current: false, is_future: true }),
    ];
    render(
      <BenefitRow
        benefit={mockBenefit({ periods: segments })}
        {...defaultHandlers}
      />,
    );
    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Feb')).toBeInTheDocument();
  });

  it('calls onSegmentClick for clickable segments', async () => {
    const user = userEvent.setup();
    const onSegment = vi.fn();
    const seg = mockSegment({ label: 'Jan', is_current: true });
    render(
      <BenefitRow
        benefit={mockBenefit({ periods: [seg] })}
        {...defaultHandlers}
        onSegmentClick={onSegment}
      />,
    );
    await user.click(screen.getByText('Jan'));
    expect(onSegment).toHaveBeenCalledWith(1, seg);
  });

  it('disables future segments', () => {
    const seg = mockSegment({ label: 'Dec', is_future: true });
    render(
      <BenefitRow
        benefit={mockBenefit({ periods: [seg] })}
        {...defaultHandlers}
      />,
    );
    const button = screen.getByText('Dec').closest('button');
    expect(button).toBeDisabled();
  });
});
