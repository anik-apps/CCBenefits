import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import UsageModal from '../UsageModal';
import { mockBenefit } from '../../test/fixtures';

describe('UsageModal', () => {
  const defaultProps = {
    benefit: mockBenefit(),
    mode: 'usage' as const,
    onSave: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders title for usage mode', () => {
    render(<UsageModal {...defaultProps} />);
    expect(screen.getByText(/Log Usage: Uber Cash/)).toBeInTheDocument();
  });

  it('renders title for perceived mode', () => {
    render(<UsageModal {...defaultProps} mode="perceived" />);
    expect(screen.getByText(/Set Perceived Value: Uber Cash/)).toBeInTheDocument();
  });

  it('shows max hint for usage mode', () => {
    render(<UsageModal {...defaultProps} />);
    expect(screen.getByText(/Max: \$15 per period/)).toBeInTheDocument();
  });

  it('shows perceived hint for perceived mode', () => {
    render(<UsageModal {...defaultProps} mode="perceived" />);
    expect(screen.getByText('Your valuation of this benefit')).toBeInTheDocument();
  });

  it('pre-fills amount when editing existing usage', () => {
    render(
      <UsageModal
        {...defaultProps}
        benefit={mockBenefit({ amount_used: 10, usage_id: 1 })}
      />,
    );
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  it('pre-fills perceived value in perceived mode', () => {
    render(
      <UsageModal
        {...defaultProps}
        mode="perceived"
        benefit={mockBenefit({ perceived_max_value: 8 })}
      />,
    );
    expect(screen.getByDisplayValue('8')).toBeInTheDocument();
  });

  it('does not call onSave for invalid input', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<UsageModal {...defaultProps} onSave={onSave} />);

    const input = screen.getByPlaceholderText('0.00');
    await user.clear(input);
    await user.type(input, '-5');
    await user.click(screen.getByText('Save'));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not call onSave when exceeding max', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<UsageModal {...defaultProps} onSave={onSave} />);

    const input = screen.getByPlaceholderText('0.00');
    await user.clear(input);
    await user.type(input, '20');
    await user.click(screen.getByText('Save'));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with valid amount', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<UsageModal {...defaultProps} onSave={onSave} />);

    const input = screen.getByPlaceholderText('0.00');
    await user.type(input, '10');
    await user.click(screen.getByText('Save'));

    // targetDate is pre-filled from benefit.period_start_date
    expect(onSave).toHaveBeenCalledWith(10, '', '2026-01-01');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<UsageModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<UsageModal {...defaultProps} onClose={onClose} />);

    const backdrop = screen.getByTestId('modal-backdrop');
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('fills full amount when button is clicked', async () => {
    const user = userEvent.setup();
    render(<UsageModal {...defaultProps} />);

    await user.click(screen.getByText(/Use Full Amount/));
    expect(screen.getByDisplayValue('15')).toBeInTheDocument();
  });

  it('shows notes field in usage mode', () => {
    render(<UsageModal {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Uber Eats order/)).toBeInTheDocument();
  });

  it('hides notes field in perceived mode', () => {
    render(<UsageModal {...defaultProps} mode="perceived" />);
    expect(screen.queryByPlaceholderText(/Uber Eats order/)).not.toBeInTheDocument();
  });

  it('shows date picker for new usage', () => {
    render(<UsageModal {...defaultProps} benefit={mockBenefit({ usage_id: null })} />);
    expect(screen.getByText(/Period date/)).toBeInTheDocument();
  });

  it('hides date picker when editing existing usage', () => {
    render(<UsageModal {...defaultProps} benefit={mockBenefit({ usage_id: 1 })} />);
    expect(screen.queryByText(/Period date/)).not.toBeInTheDocument();
  });
});
