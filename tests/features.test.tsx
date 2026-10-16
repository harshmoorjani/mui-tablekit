import { useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { createTableState, DataTable } from '../src/index.js';
import type { Column, ColumnDefinition, TableState } from '../src/index.js';
import * as output from '../src/output.js';

type Row = { id: string; name: string; actual: number; planned: number; children?: Row[] };
const rows: Row[] = [{ id: 'p', name: 'Products', actual: 30, planned: 40, children: [
  { id: 'a', name: 'Alpha', actual: 10, planned: 15 }, { id: 'b', name: 'Beta', actual: 20, planned: 25 },
] }, { id: 's', name: 'Services', actual: 50, planned: 60 }];
const name: Column<Row> = { id: 'name', header: 'Name', value: row => row.name };
const columns: ColumnDefinition<Row>[] = [name, { id: 'volume', header: 'Volume', value: row => row.actual + row.planned, columns: [
  { id: 'actual', header: 'Actual', value: row => row.actual, align: 'right' },
  { id: 'planned', header: 'Planned', value: row => row.planned, align: 'right' },
] }];
const base = { rows, columns, getRowId: (row: Row) => row.id, caption: 'Report' };
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); localStorage.clear(); });

it('expands nested rows with sibling sorting, root pagination, descendant filtering and stable selection', async () => {
  const user = userEvent.setup();
  render(<DataTable {...base} getSubRows={row => row.children} defaultState={{ pageSize: 1 }} selectable expandOnClick selectOnClick />);
  await user.click(screen.getByText('Products'));
  expect(screen.getByText('Alpha')).toBeVisible();
  expect(screen.getByRole('checkbox', { name: 'Select row p' })).toBeChecked();
  expect(screen.getByText('1–1 of 2')).toBeVisible();
  await user.click(screen.getByRole('checkbox', { name: 'Select row b' }));
  await user.click(screen.getByRole('button', { name: 'Next page' }));
  expect(within(screen.getByRole('table')).getByText('Services')).toBeVisible();
  expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  await user.type(screen.getByRole('searchbox'), 'Beta');
  expect(screen.getByText('Products')).toBeVisible();
  expect(screen.getByText('Beta')).toBeVisible();
  expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Select row b' })).toBeChecked();
});

it('collapses aggregate columns, keeps header associations and restores keyboard focus', async () => {
  const user = userEvent.setup();
  render(<DataTable {...base} />);
  expect(screen.getByRole('cell', { name: '70' })).toBeVisible();
  const expand = screen.getByRole('button', { name: 'Expand Volume columns' });
  expand.focus(); await user.keyboard('{Enter}');
  const collapse = screen.getByRole('button', { name: 'Collapse Volume columns' });
  expect(collapse).toHaveFocus();
  expect(collapse.closest('th')).toHaveAttribute('colspan', '2');
  expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('rowspan', '2');
  const cell = screen.getByRole('cell', { name: '30' });
  const ids = cell.getAttribute('headers')!.split(' ');
  expect(ids).toHaveLength(2);
  expect(ids.every(id => document.getElementById(id)?.tagName === 'TH')).toBe(true);
  await user.keyboard('{Enter}');
  expect(screen.getByRole('button', { name: 'Expand Volume columns' })).toHaveFocus();
  expect(screen.queryByRole('columnheader', { name: 'Actual' })).not.toBeInTheDocument();
});

it('pins visible columns with cumulative widths and respects visibility and drag locks', () => {
  render(<DataTable {...base} columns={[{ ...name, sticky: 'left', hideable: false },
    { id: 'actual', header: 'Actual', value: row => row.actual, sticky: 'left', draggable: false },
    { id: 'planned', header: 'Planned', value: row => row.planned, sticky: 'right' }]} selectable fixedSelection columnControls columnReordering
    defaultState={{ hiddenColumnIds: ['name'], columnWidths: { name: 200, actual: 100, planned: 180 } }} />);
  expect(screen.getByRole('cell', { name: 'Products' })).toHaveStyle({ position: 'sticky', left: '64px' });
  expect(screen.getByRole('cell', { name: '30' })).toHaveStyle({ position: 'sticky', left: '264px' });
  expect(screen.getByRole('cell', { name: '40' })).toHaveStyle({ position: 'sticky', right: '0px' });
  expect(screen.getByRole('checkbox', { name: 'Show Name', hidden: true })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Move Actual (drag or use left/right arrows)' })).not.toBeInTheDocument();
});

it('supports checkbox filters, jump-to-page, custom search and case sensitivity', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<DataTable {...base} columns={[{ ...name, filterType: 'checkbox' }]} jumpToPage defaultState={{ pageSize: 1 }} />);
  const jump = screen.getByRole('spinbutton', { name: 'Jump to page' });
  fireEvent.change(jump, { target: { value: '2' } }); fireEvent.blur(jump);
  expect(within(screen.getByRole('table')).getByText('Services')).toBeVisible();
  await user.click(screen.getByRole('checkbox', { name: 'Products' }));
  expect(screen.getByText('Products', { selector: 'div' })).toBeVisible();
  expect(screen.getByText('1–1 of 1')).toBeVisible();
  rerender(<DataTable {...base} columns={[name]} caseSensitive defaultState={{ pageSize: 1 }} />);
  await user.click(screen.getByRole('button', { name: 'Reset filters' }));
  await user.type(screen.getByRole('searchbox'), 'products');
  expect(screen.getByText('No matching rows')).toBeVisible();
  rerender(<DataTable {...base} columns={[name]} searchMatch={(row, query) => row.name.toLowerCase().startsWith(query)}
    renderSearch={({ id, value, onChange }) => <input id={id} aria-label="Find a row" value={value} onChange={event => onChange(event.target.value)} />} />);
  expect(screen.getByRole('textbox', { name: 'Find a row' })).toHaveValue('products');
  expect(screen.getByText('Products')).toBeVisible();
});

it('debounces search and cancels pending input on unmount', () => {
  vi.useFakeTimers(); const onAction = vi.fn();
  const { unmount } = render(<DataTable {...base} searchDebounceMs={200} onAction={onAction} />);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Services' } });
  expect(screen.getByText('Products')).toBeVisible();
  act(() => vi.advanceTimersByTime(200));
  expect(screen.queryByText('Products')).not.toBeInTheDocument();
  expect(onAction.mock.calls.map(call => call[0])).toEqual(['init', 'search']);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Products' } });
  unmount(); act(() => vi.runAllTimers());
  expect(onAction).toHaveBeenCalledTimes(2);
});

it('recovers a saved all-hidden frontier without restoring action state', () => {
  localStorage.setItem('report', JSON.stringify({ hiddenColumnIds: ['name'], selectedIds: ['p'], expandedIds: ['p'] }));
  render(<DataTable {...base} columns={[{ ...name }, { id: 'excluded', header: 'Excluded', value: () => '', excluded: true }]} selectable storageKey="report" />);
  expect(screen.getByText('Products')).toBeVisible();
  expect(screen.getByRole('checkbox', { name: 'Select row p' })).not.toBeChecked();
  const saved = JSON.parse(localStorage.getItem('report')!);
  expect(saved).not.toHaveProperty('selectedIds'); expect(saved).not.toHaveProperty('expandedIds');
});

it('keeps controlled server trees unfiltered and reports state actions', async () => {
  const user = userEvent.setup(); const change = vi.fn(); const action = vi.fn();
  render(<DataTable {...base} mode="server" rowCount={100} getSubRows={row => row.children}
    state={createTableState({ expandedIds: ['p'], search: 'missing' })} onStateChange={change} onAction={action} />);
  expect(screen.getByText('Alpha')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Collapse row p' }));
  expect(screen.getByText('Alpha')).toBeVisible();
  expect(action.mock.lastCall?.[0]).toBe('expansion');
  expect(change.mock.lastCall?.[0].expandedIds).toEqual([]);
});

it('supports asynchronous delete veto/failure and preserves unrelated changes while waiting', async () => {
  const user = userEvent.setup(); let finish: (value: void | false) => void = () => {};
  const deletion = vi.fn(() => new Promise<void | false>(resolve => { finish = resolve; }));
  function Controlled() {
    const [state, setState] = useState<TableState>(() => createTableState({ selectedIds: ['p'] }));
    return <DataTable {...base} selectable state={state} onStateChange={setState} onRowsDelete={deletion} />;
  }
  render(<Controlled />);
  await user.click(screen.getByRole('button', { name: 'Delete selected rows' }));
  await user.type(screen.getByRole('searchbox'), 'Services');
  await act(async () => finish(false));
  expect(screen.getByText('1 selected')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Delete selected rows' }));
  await act(async () => finish());
  expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  expect(screen.getByRole('searchbox')).toHaveValue('Services');
  expect(deletion.mock.calls[0]).toEqual([['p'], [rows[0]]]);
});

it('exports selected scopes and grouped labels while rendering custom rows and summary content', async () => {
  const user = userEvent.setup(); const csv = vi.spyOn(output, 'downloadCsv').mockImplementation(() => {});
  render(<DataTable {...base} csvFileName="test.csv" csvOptions={{ rows: 'all', columns: 'all' }} defaultState={{ search: 'Services', expandedColumnIds: ['volume'], hiddenColumnIds: ['planned'] }}
    renderRow={(row, context, cells) => <tr key={context.id} data-testid="custom-row">{cells}</tr>}
    renderSummary={items => <tr><td>Summary {items.length}</td></tr>} />);
  expect(screen.getByTestId('custom-row')).toHaveTextContent('Services');
  expect(screen.getByText('Summary 1')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Download CSV' }));
  expect(csv.mock.lastCall?.[1].map(column => column.header)).toEqual(['Name', 'Volume / Actual', 'Volume / Planned']);
  expect(csv.mock.lastCall?.[2]).toEqual(rows);
});
