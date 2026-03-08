import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';
import { renderWithProviders } from '../test/helpers';

describe('App', () => {
  it('renders header with logo text', () => {
    renderWithProviders(<App />, { route: '/' });
    expect(screen.getByText('CCBenefits')).toBeInTheDocument();
  });

  it('renders tab navigation on home page', () => {
    renderWithProviders(<App />, { route: '/' });
    expect(screen.getByText('Cards')).toBeInTheDocument();
    expect(screen.getByText('All Credits')).toBeInTheDocument();
  });

  it('renders Add button', () => {
    renderWithProviders(<App />, { route: '/' });
    expect(screen.getByText('+ Add')).toBeInTheDocument();
  });

  it('renders tab navigation on credits page', () => {
    renderWithProviders(<App />, { route: '/credits' });
    expect(screen.getByText('Cards')).toBeInTheDocument();
    expect(screen.getByText('All Credits')).toBeInTheDocument();
  });

  it('hides tab navigation on card detail page', () => {
    renderWithProviders(<App />, { route: '/card/1' });
    expect(screen.queryByText('Cards')).not.toBeInTheDocument();
    // Add button should still be visible
    expect(screen.getByText('+ Add')).toBeInTheDocument();
  });

  it('hides tab navigation on add card page', () => {
    renderWithProviders(<App />, { route: '/add-card' });
    expect(screen.queryByText('Cards')).not.toBeInTheDocument();
  });
});
