import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Demo } from '../demo/Demo.js';
import { createPeople } from '../demo/data.js';

describe('demo playground', () => {
  it('generates varied, stable records with unique identities', () => {
    const people = createPeople(10000);
    expect(new Set(people.map(row => row.id)).size).toBe(10000);
    expect(people.slice(0, 100)).toEqual(createPeople(100));
    expect(new Set(people.map(row => row.team)).size).toBe(6);
    expect(new Set(people.map(row => row.remote)).size).toBe(2);
    expect(people.every(row => Number.isFinite(Date.parse(row.joined)))).toBe(true);
    expect(createPeople(0)).toEqual([]);
  });

  it('applies feature switches, clears disabled filters, and resets the playground', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    expect(screen.getByText('1–25 of 1000')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter Name' }), { target: { value: 'no-such-person' } });
    expect(screen.getByText('No matching rows')).toBeVisible();
    await user.keyboard('{Escape}');
    await user.click(screen.getByText('Table options'));
    await user.click(screen.getByRole('switch', { name: 'Column filters' }));
    expect(screen.queryByRole('textbox', { name: 'Filter Name' })).not.toBeInTheDocument();
    expect(screen.getByText('1–25 of 1000')).toBeVisible();
    await user.click(screen.getByRole('switch', { name: 'Enable search' }));
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Sorting' }));
    expect(screen.queryByRole('button', { name: 'Sort by Name' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset playground' }));
    expect(screen.getByRole('searchbox')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('textbox', { name: 'Filter Name' })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Sort by Name', hidden: true })).toBeVisible();
  });

  it('clears selection and expansion on dataset changes and supports an empty dataset', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole('checkbox', { name: 'Select row person-1' }));
    await user.click(screen.getByRole('button', { name: 'Expand row person-1' }));
    await user.click(screen.getByRole('combobox', { name: 'Dataset size' }));
    await user.click(screen.getByRole('option', { name: '100 people' }));
    expect(screen.getByText('1–25 of 100')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Select row person-1' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Expand row person-1' })).toBeVisible();
    await user.click(screen.getByRole('combobox', { name: 'Dataset size' }));
    await user.click(screen.getByRole('option', { name: 'Empty dataset' }));
    expect(within(screen.getByRole('table')).getByText('No matching rows')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Select this page' })).toBeDisabled();
  });
});
