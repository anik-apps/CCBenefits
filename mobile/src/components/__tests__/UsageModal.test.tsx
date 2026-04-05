import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import UsageModal from '../UsageModal';
import { makeBenefitStatus, makePeriodSegment } from '../../test/factories';

const defaultProps = {
  visible: true,
  benefit: makeBenefitStatus({
    periods: [
      makePeriodSegment({ label: 'Jan 2025', is_current: true, usage_id: null, amount_used: 0 }),
      makePeriodSegment({ label: 'Feb 2025', is_current: false, usage_id: 5, amount_used: 10, is_used: true }),
    ],
  }),
  onClose: jest.fn(),
  onLogUsage: jest.fn().mockResolvedValue(undefined),
  onUpdateUsage: jest.fn().mockResolvedValue(undefined),
  onDeleteUsage: jest.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('UsageModal', () => {
  it('renders benefit name and max value', () => {
    const { getByText } = render(<UsageModal {...defaultProps} />);
    expect(getByText('Dining Credit')).toBeTruthy();
    expect(getByText('$25 / monthly')).toBeTruthy();
  });

  it('renders period buttons for non-future periods', () => {
    const { getByText } = render(<UsageModal {...defaultProps} />);
    expect(getByText('Jan 2025')).toBeTruthy();
    expect(getByText('Feb 2025')).toBeTruthy();
  });

  it('shows amount input for continuous redemption type', () => {
    const { getByText } = render(<UsageModal {...defaultProps} />);
    expect(getByText('Amount Used')).toBeTruthy();
  });

  it('shows binary switch for binary redemption type', () => {
    const benefit = makeBenefitStatus({
      redemption_type: 'binary',
      periods: [makePeriodSegment({ is_current: true })],
    });
    const { getByText } = render(
      <UsageModal {...defaultProps} benefit={benefit} />,
    );
    expect(getByText('Used this period')).toBeTruthy();
  });

  it('calls onLogUsage with amount for new usage', async () => {
    const onLogUsage = jest.fn().mockResolvedValue(undefined);
    const { getByText, getByPlaceholderText } = render(
      <UsageModal {...defaultProps} onLogUsage={onLogUsage} />,
    );

    fireEvent.changeText(getByPlaceholderText('Max: $25'), '15');
    fireEvent.press(getByText('Log Usage'));

    await waitFor(() => {
      expect(onLogUsage).toHaveBeenCalledWith(15, undefined, '2025-01-01');
    });
  });

  it('calls onUpdateUsage when editing existing usage', async () => {
    const onUpdateUsage = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(
      <UsageModal {...defaultProps} onUpdateUsage={onUpdateUsage} />,
    );

    // Select Feb period which has existing usage
    fireEvent.press(getByText('Feb 2025'));
    fireEvent.press(getByText('Update Usage'));

    await waitFor(() => {
      expect(onUpdateUsage).toHaveBeenCalledWith(5, 10, undefined);
    });
  });

  it('calls onDeleteUsage for existing usage', async () => {
    const onDeleteUsage = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(
      <UsageModal {...defaultProps} onDeleteUsage={onDeleteUsage} />,
    );

    // Select Feb period which has existing usage
    fireEvent.press(getByText('Feb 2025'));
    fireEvent.press(getByText('Delete Usage'));

    await waitFor(() => {
      expect(onDeleteUsage).toHaveBeenCalledWith(5);
    });
  });

  it('calls onClose when Cancel is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(<UsageModal {...defaultProps} onClose={onClose} />);
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
