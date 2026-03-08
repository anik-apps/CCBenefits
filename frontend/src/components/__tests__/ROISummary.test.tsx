import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ROISummary from '../ROISummary';
import { mockCardSummary } from '../../test/fixtures';

describe('ROISummary', () => {
  it('renders nothing when no cards', () => {
    const { container } = render(<ROISummary cards={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders stat labels', () => {
    render(<ROISummary cards={[mockCardSummary()]} />);
    expect(screen.getByText('Total Fees')).toBeInTheDocument();
    expect(screen.getByText('YTD Redeemed')).toBeInTheDocument();
    expect(screen.getByText('YTD Perceived')).toBeInTheDocument();
    expect(screen.getByText('Net Value')).toBeInTheDocument();
  });

  it('renders total fees', () => {
    render(<ROISummary cards={[mockCardSummary({ annual_fee: 895 })]} />);
    expect(screen.getByText('$895')).toBeInTheDocument();
  });

  it('renders positive net value with plus sign', () => {
    render(<ROISummary cards={[mockCardSummary({
      net_perceived: 200,
      ytd_perceived_value: 1095,
      annual_fee: 895,
    })]} />);
    expect(screen.getByText('+$200')).toBeInTheDocument();
  });

  it('renders negative net value', () => {
    render(<ROISummary cards={[mockCardSummary({
      ytd_perceived_value: 450,
      annual_fee: 895,
    })]} />);
    // net = 450 - 895 = -445 → rendered as "$-445" by template literal
    expect(screen.getByText('$-445')).toBeInTheDocument();
  });

  it('aggregates multiple cards', () => {
    const cards = [
      mockCardSummary({ annual_fee: 500, ytd_actual_used: 300, ytd_perceived_value: 400 }),
      mockCardSummary({ id: 2, annual_fee: 400, ytd_actual_used: 200, ytd_perceived_value: 300 }),
    ];
    render(<ROISummary cards={cards} />);
    expect(screen.getByText('$900')).toBeInTheDocument(); // total fees
  });
});
