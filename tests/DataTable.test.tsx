import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createTableState, DataTable } from '../src/index.js';
import type { Column, DataTableProps, TableState } from '../src/index.js';
import * as output from '../src/output.js';

const rows = [
  { id: 'a', name: 'Ada', team: 'Design', age: 40 },
  { id: 'b', name: 'Ben', team: 'Engineering', age: 25 },
  { id: 'c', name: 'Cleo', team: 'Engineering', age: 32 },
];
type Person = (typeof rows)[number];
const columns: Column<Person>[] = [
  { id: 'name', header: 'Name', value: row => row.name, filterable: true },
  { id: 'team', header: 'Team', value: row => row.team, filterable: true },
  { id: 'age', header: 'Age', value: row => row.age, align: 'right' },
];
const base = { rows, columns, getRowId: (row: Person) => row.id, caption: 'People' };
const names = () => within(screen.getByRole('table', { name: 'People' }))
  .getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0]?.textContent);

describe('DataTable', () => {
  it('combines search and column filters and resets pagination', async () => {
    const user = userEvent.setup();
    render(<DataTable {...base} defaultState={{ pageSize: 1, page: 2 }} />);
    expect(screen.getByText('Cleo')).toBeVisible();
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'engineering');
    expect(screen.getByText('Ben')).toBeVisible();
    expect(screen.getByText('1–1 of 2')).toBeVisible();
    await user.type(screen.getByRole('textbox', { name: 'Filter Name' }), 'Cleo');
    expect(screen.getByText('Cleo')).toBeVisible();
    expect(screen.queryByText('Ben')).not.toBeInTheDocument();
    expect(screen.getByText('1–1 of 1')).toBeVisible();
  });

  it('cycles sorting ascending, descending, unsorted, including keyboard operation', async () => {
    const user = userEvent.setup();
    render(<DataTable {...base} />);
    const sort = screen.getByRole('button', { name: 'Sort by Age' });
    sort.focus();
    await user.keyboard('{Enter}');
    expect(names()).toEqual(['Ben', 'Cleo', 'Ada']);
    expect(screen.getByRole('columnheader', { name: 'Age' })).toHaveAttribute('aria-sort', 'ascending');
    await user.click(sort);
    expect(names()).toEqual(['Ada', 'Cleo', 'Ben']);
    await user.click(sort);
    expect(names()).toEqual(['Ada', 'Ben', 'Cleo']);
  });

  it('keeps selection identity through sorting, filtering, paging, and refreshed rows', async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    const props = { ...base, selectable: true, defaultState: { pageSize: 2 },
      renderBulkActions: (ids: readonly string[]) => <button onClick={() => action(ids)}>Apply</button> };
    const { rerender } = render(<DataTable {...props} />);
    await user.click(screen.getByRole('checkbox', { name: 'Select row a' }));
    await user.click(screen.getByRole('button', { name: 'Sort by Age' }));
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Select this page' }));
    await user.type(screen.getByRole('searchbox'), 'Design');
    expect(screen.getByRole('checkbox', { name: 'Select row a' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(action).toHaveBeenLastCalledWith(['a', 'b', 'c']);
    await user.clear(screen.getByRole('searchbox'));
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByRole('checkbox', { name: 'Select row a' })).toBeChecked();
    rerender(<DataTable {...props} rows={[...rows].reverse().map(row => ({ ...row }))} />);
    expect(screen.getByRole('checkbox', { name: 'Select row a' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.getByRole('checkbox', { name: 'Select row a' })).not.toBeChecked();
  });

  it('selects only the current page and preserves selections on other pages', async () => {
    const user = userEvent.setup();
    render(<DataTable {...base} selectable defaultState={{ pageSize: 2 }} />);
    await user.click(screen.getByRole('checkbox', { name: 'Select this page' }));
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByRole('checkbox', { name: 'Select row c' })).not.toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'Select this page' }));
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select this page' }));
    expect(screen.getByRole('status')).toHaveTextContent('1 selected');
  });

  it('renders custom cells and escapes plain text', () => {
    render(<DataTable {...base} rows={[{ ...rows[0]!, name: '<script>alert(1)</script>' }]}
      columns={[columns[0]!, { ...columns[2]!, render: (_, row) => <a href={`#${row.id}`}>{row.age} years</a> }]} />);
    expect(screen.getByText('<script>alert(1)</script>')).toBeVisible();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByRole('link', { name: '40 years' })).toHaveAttribute('href', '#a');
  });

  it('renders empty state and translated controls', () => {
    render(<DataTable {...base} rows={[]} selectable labels={{ search: 'Buscar', empty: 'Sin resultados', nextPage: 'Siguiente' }} />);
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Sin resultados');
    expect(screen.getByRole('checkbox', { name: 'Select this page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('supports controlled state without applying changes before the parent does', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(<DataTable {...base} state={createTableState()} onStateChange={change} />);
    await user.click(screen.getByRole('button', { name: 'Sort by Age' }));
    expect(change).toHaveBeenCalledWith(expect.objectContaining({ sort: { columnId: 'age', direction: 'asc' } }));
    expect(names()).toEqual(['Ada', 'Ben', 'Cleo']);
  });

  it('emits server query state while leaving supplied rows untouched', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    function ServerTable() {
      const [state, setState] = useState<TableState>(() => createTableState({ pageSize: 2 }));
      return <DataTable {...base} rows={rows.slice(0, 2)} mode="server" rowCount={100} state={state}
        onStateChange={next => { change(next); setState(next); }} />;
    }
    render(<ServerTable />);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
    await user.type(screen.getByRole('searchbox'), 'missing');
    expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, search: 'missing' }));
    expect(screen.getByText('Ada')).toBeVisible();
    expect(screen.getByText('1–2 of 100')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Sort by Age' }));
    expect(names()).toEqual(['Ada', 'Ben']);
  });

  it('returns to page zero when the page size changes', () => {
    const change = vi.fn();
    render(<DataTable {...base} defaultState={{ page: 1, pageSize: 1 }} pageSizeOptions={[1, 2]}
      onStateChange={change} />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: '2' }));
    expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, pageSize: 2 }));
    expect(screen.getByText('Ada')).toBeVisible();
  });

  it('rejects ambiguous row and column identity', () => {
    expect(() => render(<DataTable {...base} rows={[rows[0]!, rows[0]!]} />)).toThrow(/getRowId/);
    expect(() => render(<DataTable {...base} columns={[columns[0]!, columns[0]!]} />)).toThrow(/columns/);
  });

  it('keeps expansion attached to row IDs through sorting and paging', async () => {
    const user = userEvent.setup();
    render(<DataTable {...base} selectable defaultState={{ pageSize: 2 }}
      renderExpanded={row => <p>Details for {row.name}</p>} />);
    const expand = screen.getByRole('button', { name: 'Expand row a' });
    expand.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Details for Ada')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Collapse row a' })).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'Sort by Age' }));
    expect(screen.queryByText('Details for Ada')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Details for Ada')).toBeVisible();
    expect(screen.getByText('Details for Ada').closest('td')).toHaveAttribute('colspan', '5');
    await user.click(screen.getByRole('button', { name: 'Collapse row a' }));
    expect(screen.queryByText('Details for Ada')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select row a' })).not.toBeChecked();
  });

  it('hides, reorders, and resizes columns without losing hidden filters or selection', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(<DataTable {...base} columnControls selectable onStateChange={change} />);
    await user.click(screen.getByRole('checkbox', { name: 'Select row a' }));
    await user.click(screen.getByText('Columns', { exact: true }));
    await user.click(screen.getByRole('checkbox', { name: 'Show Team' }));
    expect(screen.queryByRole('columnheader', { name: 'Team' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Filter Team' }), 'Design');
    expect(screen.getByText('Ada')).toBeVisible();
    expect(screen.queryByText('Ben')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Move Age previous' }));
    await user.click(screen.getByRole('button', { name: 'Move Age previous' }));
    const headers = screen.getAllByRole('columnheader');
    expect(headers[1]).toHaveTextContent('Age');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Age width (px)' }), { target: { value: '280' } });
    expect(document.querySelector('colgroup col:nth-child(2)')).toHaveStyle({ width: '280px' });
    expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ selectedIds: ['a'], columnWidths: { age: 280 } }));
    await user.click(screen.getByRole('checkbox', { name: 'Show Name' }));
    expect(screen.getByRole('checkbox', { name: 'Show Age' })).toBeDisabled();
  });

  it('exports and prints all filtered client rows in visible column order', async () => {
    const user = userEvent.setup();
    const csv = vi.spyOn(output, 'downloadCsv').mockImplementation(() => {});
    const print = vi.spyOn(output, 'printRows').mockImplementation(() => {});
    try {
      render(<DataTable {...base} csvFileName="people.csv" printable defaultState={{ pageSize: 1,
        filters: { team: 'Engineering' }, sort: { columnId: 'age', direction: 'desc' },
        hiddenColumnIds: ['team'], columnOrder: ['age', 'name'] }} />);
      await user.click(screen.getByRole('button', { name: 'Download CSV' }));
      expect(csv).toHaveBeenCalledWith('people.csv', [columns[2], columns[0]], [rows[2], rows[1]]);
      await user.click(screen.getByRole('button', { name: /^Print$/ }));
      expect(print).toHaveBeenCalledWith('People', [columns[2], columns[0]], [rows[2], rows[1]]);
    } finally { csv.mockRestore(); print.mockRestore(); }
  });

  it('labels server exports as page-only and never exports unseen rows', async () => {
    const user = userEvent.setup();
    const csv = vi.spyOn(output, 'downloadCsv').mockImplementation(() => {});
    try {
      render(<DataTable {...base} rows={[rows[1]!]} csvFileName="page.csv" printable mode="server" rowCount={100}
        state={createTableState({ page: 2 })} onStateChange={() => {}} />);
      await user.click(screen.getByRole('button', { name: 'Download page CSV' }));
      expect(csv).toHaveBeenCalledWith('page.csv', columns, [rows[1]]);
      expect(screen.getByRole('button', { name: 'Print page' })).toBeVisible();
    } finally { csv.mockRestore(); }
  });
});

// Server operations require a caller-owned query and total count.
// @ts-expect-error server mode requires state and onStateChange
const invalidServer: DataTableProps<Person> = { ...base, mode: 'server', rowCount: 100 };
void invalidServer;
