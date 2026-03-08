import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CardSummary from '../CardSummary';
import { mockCardSummary } from '../../test/fixtures';
import { renderWithProviders } from '../../test/helpers';

describe('CardSummary', () => {
  it('renders card name', () => {
    renderWithProviders(<CardSummary card={mockCardSummary()} index={0} />);
    expect(screen.getByText('Amex Platinum')).toBeInTheDocument();
  });

  it('renders issuer and fee', () => {
    renderWithProviders(<CardSummary card={mockCardSummary()} index={0} />);
    expect(screen.getByText(/American Express/)).toBeInTheDocument();
    expect(screen.getByText(/\$895\/yr/)).toBeInTheDocument();
  });

  it('renders usage count', () => {
    renderWithProviders(<CardSummary card={mockCardSummary()} index={0} />);
    expect(screen.getByText('5/12 used')).toBeInTheDocument();
  });

  it('renders net value with color', () => {
    renderWithProviders(
      <CardSummary card={mockCardSummary({ net_perceived: 100 })} index={0} />,
    );
    expect(screen.getByText('+$100')).toBeInTheDocument();
  });

  it('links to card detail page', () => {
    renderWithProviders(<CardSummary card={mockCardSummary({ id: 42 })} index={0} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/card/42');
  });

  it('renders ytd usage values', () => {
    renderWithProviders(<CardSummary card={mockCardSummary({
      ytd_actual_used: 500,
      total_max_annual_value: 2000,
    })} index={0} />);
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByText(/2000/)).toBeInTheDocument();
  });
});
