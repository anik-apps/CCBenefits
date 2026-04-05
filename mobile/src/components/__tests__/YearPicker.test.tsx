import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import YearPicker from '../YearPicker';

describe('YearPicker', () => {
  const currentYear = new Date().getFullYear();

  it('displays the selected year', () => {
    const { getByText } = render(
      <YearPicker selectedYear={currentYear} onChange={jest.fn()} />,
    );
    expect(getByText(String(currentYear))).toBeTruthy();
  });

  it('shows year options when opened', () => {
    const { getByText } = render(
      <YearPicker selectedYear={currentYear} onChange={jest.fn()} />,
    );

    // Press the button to open picker
    fireEvent.press(getByText(String(currentYear)));

    // Should show current year and previous year
    expect(getByText('Select Year')).toBeTruthy();
    expect(getByText(String(currentYear - 1))).toBeTruthy();
  });

  it('calls onChange when a year is selected', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <YearPicker selectedYear={currentYear} onChange={onChange} />,
    );

    fireEvent.press(getByText(String(currentYear)));
    fireEvent.press(getByText(String(currentYear - 1)));

    expect(onChange).toHaveBeenCalledWith(currentYear - 1);
  });

  it('shows add past year option', () => {
    const { getByText } = render(
      <YearPicker selectedYear={currentYear} onChange={jest.fn()} />,
    );

    fireEvent.press(getByText(String(currentYear)));

    // Should show option to add year before the last visible year
    const addYearText = `+ Add ${currentYear - 2}`;
    expect(getByText(addYearText)).toBeTruthy();
  });
});
