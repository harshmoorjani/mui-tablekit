import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CustomizationDemo } from '../demo/CustomizationDemo.js';

async function choose(user: ReturnType<typeof userEvent.setup>, target: string) {
  await user.click(screen.getByRole('combobox', { name: 'Customization target' }));
  await user.click(screen.getByRole('option', { name: target }));
}

describe('custom component gallery', () => {
  it('reports clipboard rejection and success without an unhandled error', async () => {
    const user = userEvent.setup();
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Denied'));
    try {
      render(<CustomizationDemo />);
      await choose(user, 'renderBulkActions');
      await user.click(screen.getByRole('button', { name: 'Copy selected IDs' }));
      expect(await screen.findByText('Copy unavailable')).toBeVisible();
      write.mockResolvedValue(undefined);
      await user.click(screen.getByRole('button', { name: 'Copy selected IDs' }));
      expect(await screen.findByText('Copied')).toBeVisible();
      expect(write).toHaveBeenLastCalledWith('1');
    } finally { write.mockRestore(); }
  });
  it('offers two working implementations of every slot and renderer with source', async () => {
    const user = userEvent.setup();
    render(<CustomizationDemo />);
    expect(screen.getByRole('searchbox')).toBeVisible();
    await user.click(screen.getByRole('combobox', { name: 'Customization target' }));
    expect(screen.getAllByRole('option')).toHaveLength(23);
    await user.click(screen.getByRole('option', { name: 'Pagination' }));
    expect(screen.getByText('Page 1 of 2')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Page 2 of 2')).toBeVisible();
    expect(within(screen.getByRole('table')).getByText('Travel mug')).toBeVisible();
    await user.click(screen.getByRole('combobox', { name: 'Implementation' }));
    await user.click(screen.getByRole('option', { name: 'Numbered buttons' }));
    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByText('Component code · Pagination'));
    expect(screen.getByText(/function StepPagination/, { selector: 'code' })).toBeVisible();
    await choose(user, 'renderSearch');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Notebook' } });
    expect(within(screen.getByRole('table')).queryByText('Desk lamp')).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Implementation' }));
    await user.click(screen.getByRole('option', { name: 'Input with clear button' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Notebook' } });
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(within(screen.getByRole('table')).getByText('Desk lamp')).toBeVisible();
  });

  it('keeps custom checkbox, expansion, filter removal and filter widgets interactive', async () => {
    const user = userEvent.setup();
    render(<CustomizationDemo />);
    await choose(user, 'Checkbox');
    await user.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
    expect(screen.getByRole('checkbox', { name: 'Select row 1' })).toBeChecked();
    await choose(user, 'ExpandButton');
    await user.click(screen.getByRole('button', { name: 'Expand row 1' }));
    expect(screen.getByText('Notes for Desk lamp: synthetic example record.')).toBeVisible();
    await choose(user, 'FilterChip');
    await user.click(screen.getByRole('button', { name: 'Remove Status: Ready' }));
    expect(within(screen.getByRole('table')).getByText('Notebook')).toBeVisible();
    await choose(user, 'renderFilter');
    await user.click(screen.getByRole('combobox', { name: 'Implementation' }));
    await user.click(screen.getByRole('option', { name: 'Segmented buttons' }));
    await user.click(within(screen.getByRole('group', { name: 'Filter Status' })).getByRole('button', { name: 'Draft' }));
    expect(within(screen.getByRole('table')).queryByText('Desk lamp')).not.toBeInTheDocument();
  });
});
