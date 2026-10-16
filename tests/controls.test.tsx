import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { createTableState, DataTable } from '../src/index.js';
import * as output from '../src/output.js';

const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const columns = [{ id: 'id', header: 'Name', value: (row: { id: string }) => row.id }];
const base = { rows, columns, getRowId: (row: { id: string }) => row.id, caption: 'Controls' };

it('selects a page and page size from the compact footer and clamps empty results', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<DataTable {...base} defaultState={{ pageSize: 1 }} pageSizeOptions={[1, 2]} />);
  const pages = screen.getByRole('combobox', { name: 'Page:' });
  await user.selectOptions(pages, within(pages).getByRole('option', { name: '3' }));
  expect(screen.getByText('c')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  await user.selectOptions(screen.getByRole('combobox', { name: 'Rows/Page:' }), '2');
  expect(screen.getByText('a')).toBeVisible();
  expect(screen.getByText('b')).toBeVisible();
  expect(screen.getByRole('combobox', { name: 'Page:' })).toHaveValue('0');
  rerender(<DataTable {...base} rows={[]} />);
  expect(screen.getByRole('combobox', { name: 'Page:' })).toHaveValue('0');
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
});

it('uses bounded numeric page entry for large server counts and preserves custom pagination', () => {
  const onStateChange = vi.fn();
  const props = { ...base, mode: 'server' as const, rowCount: 10000000, state: createTableState({ pageSize: 1 }), onStateChange };
  const { rerender } = render(<DataTable {...props} />);
  const page = screen.getByRole('spinbutton', { name: 'Page:' });
  expect(screen.getAllByRole('option')).toHaveLength(4);
  fireEvent.change(page, { target: { value: '9000000' } }); fireEvent.blur(page);
  expect(onStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ page: 8999999 }));
  fireEvent.change(page, { target: { value: '10000001' } }); fireEvent.blur(page);
  expect(page).toHaveValue(1);
  rerender(<DataTable {...props} components={{ Pagination: props => <button onClick={() => props.onPageChange(null, 4)}>Custom page</button> }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Custom page' }));
  expect(onStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ page: 4 }));
});

it('opens immediate filters from the compact toolbar and retains applied values after closing', async () => {
  const user = userEvent.setup(); const onAction = vi.fn();
  render(<DataTable {...base} columns={[{ ...columns[0]!, filterable: true }]} columnControls csvFileName="rows.csv" printable onAction={onAction} />);
  expect(screen.queryByRole('textbox', { name: 'Filter Name' })).not.toBeInTheDocument();
  const filters = screen.getByRole('button', { name: 'Filters' });
  expect(filters).toHaveAttribute('aria-expanded', 'false');
  await user.click(filters);
  await user.type(within(screen.getByRole('dialog', { name: 'Filters' })).getByRole('textbox', { name: 'Filter Name' }), 'b');
  await user.keyboard('{Escape}');
  expect(filters).toHaveFocus();
  expect(filters).toHaveAttribute('aria-pressed', 'true');
  expect(filters).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByText('b')).toBeVisible();
  expect(screen.queryByText('a', { selector: 'td *' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Columns' }));
  expect(screen.getByRole('dialog', { name: 'Columns' })).toBeVisible();
  await user.keyboard('{Escape}');
  expect(onAction.mock.calls.map(call => call[0])).toEqual(['init', 'filterOpen', 'filter', 'filterClose']);
});

it('accepts custom toolbar button components and a full toolbar layout without losing actions', async () => {
  const user = userEvent.setup();
  const csv = vi.spyOn(output, 'downloadCsv').mockImplementation(() => {});
  const print = vi.spyOn(output, 'printRows').mockImplementation(() => {});
  try {
    render(<DataTable {...base} csvFileName="rows.csv" printable columns={[{ ...columns[0]!, filterable: true }]}
      components={{ ToolbarButton: ({ action, label, onClick }) => <button data-action={action} onClick={onClick}>{label}</button> }}
      renderToolbar={controls => <section aria-label="My toolbar">{controls.print}{controls.csv}{controls.filters}{controls.search}</section>} />);
    expect(within(screen.getByRole('region', { name: 'My toolbar' })).getAllByRole('button').map(button => button.dataset.action)).toEqual(['print', 'csv', 'filters']);
    await user.click(screen.getByRole('button', { name: 'Download CSV' }));
    expect(csv).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Print' }));
    expect(print).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeVisible();
  } finally { csv.mockRestore(); print.mockRestore(); }
});

it('shows the insertion edge during dragging, clears it after drop and rejects locked crossings', () => {
  const moreColumns = [columns[0]!, { ...columns[0]!, id: 'second', header: 'Second' }, { ...columns[0]!, id: 'third', header: 'Third' }];
  const { rerender } = render(<DataTable {...base} columns={moreColumns} columnReordering />);
  let payload = '';
  const transfer = { setData: (_: string, value: string) => { payload = value; }, getData: () => payload, dropEffect: '' };
  const hover = (target: HTMLElement) => {
    const event = new MouseEvent('dragover', { bubbles: true, cancelable: true, clientX: 100 });
    Object.defineProperty(event, 'dataTransfer', { value: transfer }); fireEvent(target, event);
  };
  fireEvent.dragStart(screen.getByRole('button', { name: 'Move Name (drag or use left/right arrows)' }), { dataTransfer: transfer });
  const target = screen.getByRole('columnheader', { name: /Third/ }); hover(target);
  expect(target).toHaveAttribute('data-drop-side', 'after');
  expect(target).toHaveStyle({ boxShadow: 'inset -3px 0 #1976d2' });
  fireEvent.drop(target, { dataTransfer: transfer });
  expect(screen.getAllByRole('columnheader').map(cell => cell.textContent?.replace('↔', ''))).toEqual(['Second', 'Third', 'Name']);
  expect(document.querySelector('[data-drop-side]')).toBeNull();
  rerender(<DataTable key="locked" {...base} columns={moreColumns.map(column => ({ ...column, draggable: column.id !== 'second' }))} columnReordering />);
  fireEvent.dragStart(screen.getByRole('button', { name: 'Move Name (drag or use left/right arrows)' }), { dataTransfer: transfer });
  const lockedTarget = screen.getByRole('columnheader', { name: /Third/ }); hover(lockedTarget);
  expect(lockedTarget).not.toHaveAttribute('data-drop-side');
  fireEvent.drop(lockedTarget, { dataTransfer: transfer });
  expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent('Name');
});
