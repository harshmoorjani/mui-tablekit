import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createTheme, ThemeProvider } from '@mui/material/styles';
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
  it('supports single and conditional selection with keyboard row selection without activating nested controls', async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<DataTable {...base} selectable="single" selectOnClick isRowSelectable={row => row.id !== 'c'}
      columns={[...columns, { id: 'action', header: 'Action', value: () => '', render: () => <button onClick={action}>Inspect</button> }]} />);
    expect(screen.queryByRole('checkbox', { name: 'Select this page' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Select row a' }));
    const benRow = screen.getByText('Ben').closest('tr')!;
    benRow.focus();
    await user.keyboard(' ');
    expect(screen.getByRole('checkbox', { name: 'Select row a' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select row b' })).toBeChecked();
    await user.click(within(benRow).getByRole('button', { name: 'Inspect' }));
    expect(action).toHaveBeenCalledOnce();
    expect(screen.getByRole('checkbox', { name: 'Select row b' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select row c' })).toBeDisabled();
    await user.click(screen.getByText('Cleo'));
    expect(screen.getByText('1 selected')).toBeVisible();
    await user.click(screen.getByText('Ben'));
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  });

  it('selects all eligible filtered rows across pages and expands only eligible rows', async () => {
    const user = userEvent.setup();
    render(<DataTable {...base} selectable selectAllScope="filtered" isRowSelectable={row => row.id !== 'b'}
      defaultState={{ pageSize: 1 }} expandAll isRowExpandable={row => row.id !== 'b'} renderExpanded={row => <p>Details {row.name}</p>} />);
    await user.click(screen.getByRole('checkbox', { name: 'Select all filtered rows' }));
    expect(screen.getByText('2 selected')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Expand all filtered rows' }));
    expect(screen.getByText('Details Ada')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByRole('button', { name: 'Expand row b' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Details Cleo')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Collapse all filtered rows' }));
    expect(screen.queryByText('Details Cleo')).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Select all filtered rows' }));
    expect(screen.queryByText('2 selected')).not.toBeInTheDocument();
  });

  it('limits server select-all to eligible supplied rows', async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn();
    render(<DataTable {...base} rows={rows.slice(1)} mode="server" rowCount={100} state={createTableState()}
      onStateChange={onStateChange} selectable selectAllScope="filtered" isRowSelectable={row => row.id !== 'c'} />);
    await user.click(screen.getByRole('checkbox', { name: 'Select loaded rows' }));
    expect(onStateChange.mock.lastCall?.[0].selectedIds).toEqual(['b']);
  });
  it('infers choices from all supplied rows and keeps excluded columns out of layout and output', async () => {
    const user = userEvent.setup();
    const download = vi.spyOn(output, 'downloadCsv').mockImplementation(() => {});
    render(<DataTable {...base} columns={[{ ...columns[0]!, excluded: true },
      { ...columns[1]!, filterType: 'select' }, columns[2]!]} columnControls csvFileName="test.csv" defaultState={{ pageSize: 1 }} />);
    expect(screen.queryByRole('button', { name: 'Sort by Name' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Show Name' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Filter Team' }));
    await user.click(screen.getByRole('option', { name: 'Engineering' }));
    expect(screen.getByText('1–1 of 2')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Download CSV' }));
    expect(download.mock.calls[0]?.[1].map(column => column.id)).toEqual(['team', 'age']);
    download.mockRestore();
  });
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
    expect(() => render(<DataTable {...base} defaultState={{ hiddenColumnIds: ['name', 'team', 'age'] }} />)).toThrow(/visible/);
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
    const width = screen.getByRole('spinbutton', { name: 'Age width (px)' });
    await user.clear(width);
    await user.type(width, '280');
    await user.tab();
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

it('combines select, multiselect, and range controls, including clearing them', async () => {
  const user = userEvent.setup();
  render(<DataTable {...base} defaultState={{ page: 2, pageSize: 1 }} columns={[
    { ...columns[0]!, filterType: 'select', filterOptions: rows.map(row => ({ value: row.name, label: row.name })) },
    { ...columns[1]!, filterType: 'multiselect', filterOptions: ['Design', 'Engineering'].map(value => ({ value, label: value })) },
    { ...columns[2]!, filterType: 'numberRange' },
  ]} />);
  await user.click(screen.getByRole('combobox', { name: 'Filter Team' }));
  await user.click(screen.getByRole('option', { name: 'Engineering' }));
  await user.keyboard('{Escape}');
  expect(screen.getByText('1–1 of 2')).toBeVisible();
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Age from' }), { target: { value: '30' } });
  expect(screen.getByText('Cleo')).toBeVisible();
  expect(screen.getByText('1–1 of 1')).toBeVisible();
  await user.click(screen.getByRole('combobox', { name: 'Filter Name' }));
  await user.click(screen.getByRole('option', { name: 'Ada' }));
  expect(screen.getByText('No matching rows')).toBeVisible();
  await user.click(screen.getByRole('combobox', { name: 'Filter Name' }));
  await user.click(screen.getByRole('option', { name: 'Any' }));
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Age from' }), { target: { value: '' } });
  await user.click(screen.getByRole('combobox', { name: 'Filter Team' }));
  await user.click(screen.getByRole('option', { name: 'Engineering' }));
  await user.keyboard('{Escape}');
  expect(screen.getByText('1–1 of 3')).toBeVisible();
});

it('emits structured date ranges in server mode without filtering supplied rows', () => {
  const change = vi.fn();
  render(<DataTable {...base} columns={[{ ...columns[0]!, filterType: 'dateRange' }]}
    mode="server" rowCount={3} state={createTableState()} onStateChange={change} />);
  fireEvent.change(screen.getByLabelText('Name from'), { target: { value: '2025-01-01' } });
  expect(change).toHaveBeenCalledWith(expect.objectContaining({ page: 0, filters: { name: { min: '2025-01-01', max: '' } } }));
  expect(screen.getByText('Ada')).toBeVisible();
});

it('waits for controlled width changes to be applied by the parent', async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  const { rerender } = render(<DataTable {...base} columnControls state={createTableState()} onStateChange={change} />);
  await user.click(screen.getByText('Columns', { exact: true }));
  const width = screen.getByRole('spinbutton', { name: 'Name width (px)' });
  await user.clear(width);
  await user.type(width, '280');
  await user.tab();
  expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ columnWidths: { name: 280 } }));
  expect(width).toHaveValue(160);
  rerender(<DataTable {...base} columnControls state={createTableState({ columnWidths: { name: 280 } })} onStateChange={change} />);
  expect(screen.getByRole('spinbutton', { name: 'Name width (px)' })).toHaveValue(280);
});

it('reuses the row model for selection and export, and refreshes it when data changes', async () => {
  const user = userEvent.setup();
  const compare = vi.fn((a: Person, b: Person) => a.age - b.age);
  const stableColumns = [columns[0]!, columns[1]!, { ...columns[2]!, compare }];
  const csv = vi.spyOn(output, 'downloadCsv').mockImplementation(() => {});
  try {
    const props = { ...base, columns: stableColumns, selectable: true, csvFileName: 'people.csv',
      defaultState: { sort: { columnId: 'age', direction: 'asc' as const } } };
    const { rerender } = render(<DataTable {...props} />);
    const comparisons = compare.mock.calls.length;
    expect(comparisons).toBeGreaterThan(0);
    await user.click(screen.getByRole('checkbox', { name: 'Select row b' }));
    await user.click(screen.getByRole('button', { name: 'Download CSV' }));
    expect(compare).toHaveBeenCalledTimes(comparisons);
    expect(csv).toHaveBeenCalledWith('people.csv', stableColumns, [rows[1], rows[2], rows[0]]);
    rerender(<DataTable {...props} rows={rows.map(row => row.id === 'a' ? { ...row, age: 20 } : row)} />);
    expect(compare.mock.calls.length).toBeGreaterThan(comparisons);
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Ada');
  } finally { csv.mockRestore(); }
});

it('supports arbitrary string row IDs in accessible expansion references', async () => {
  const user = userEvent.setup();
  render(<DataTable {...base} rows={[{ ...rows[0]!, id: '\ud800' }, { ...rows[1]!, id: 'row with spaces' }]}
    renderExpanded={row => <p>Details for {row.name}</p>} />);
  await user.click(screen.getAllByRole('button', { name: /Expand row/ })[0]!);
  const toggle = screen.getByRole('button', { name: /Collapse row/ });
  expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toHaveTextContent('Details for Ada');
});

it('labels and operates first/last pagination buttons enabled by the application theme', async () => {
  const user = userEvent.setup();
  const theme = createTheme({ components: { MuiTablePagination: { defaultProps: { showFirstButton: true, showLastButton: true } } } });
  render(<ThemeProvider theme={theme}><DataTable {...base} defaultState={{ page: 1, pageSize: 1 }} /></ThemeProvider>);
  await user.click(screen.getByRole('button', { name: 'Last page' }));
  expect(screen.getByText('Cleo')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'First page' }));
  expect(screen.getByText('Ada')).toBeVisible();
});

it('rejects incomplete server configuration from JavaScript consumers instead of applying client operations', () => {
  const props = { ...base, mode: 'server', rowCount: 100, state: createTableState(), onStateChange: () => {} };
  for (const key of ['rowCount', 'state', 'onStateChange'] as const) {
    const incomplete = { ...props, [key]: undefined } as unknown as DataTableProps<Person>;
    expect(() => render(<DataTable {...incomplete} />)).toThrow(/server mode requires/);
  }
});

it('uses an accessible custom widget on a hidden column with the existing filter and state contract', async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  const custom: Column<Person> = {
    id: 'team', header: 'Team', value: row => row.team,
    filter: (row, value) => value === 'true' && row.team === 'Engineering',
    renderFilter: ({ id, label, value, onChange }) => <label htmlFor={id}>{label}
      <input id={id} type="checkbox" checked={value === 'true'} onChange={event => onChange(event.target.checked ? 'true' : '')} />
    </label>,
  };
  render(<DataTable {...base} columns={[columns[0]!, custom, columns[2]!]} selectable
    defaultState={{ page: 2, pageSize: 1, selectedIds: ['a'], hiddenColumnIds: ['team'] }} onStateChange={change} />);
  const widget = screen.getByRole('checkbox', { name: 'Filter Team' });
  expect(screen.queryByRole('textbox', { name: 'Filter Team' })).not.toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: 'Team' })).not.toBeInTheDocument();
  await user.click(widget);
  expect(widget).toBeChecked();
  expect(screen.getByText('Ben')).toBeVisible();
  expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, filters: { team: 'true' }, selectedIds: ['a'] }));
  await user.click(widget);
  expect(screen.getByText('Ada')).toBeVisible();
  await user.click(widget);
  await user.click(screen.getByRole('button', { name: 'Remove Team: true' }));
  expect(widget).not.toBeChecked();
  await user.click(widget);
  await user.click(screen.getByRole('button', { name: 'Reset filters' }));
  expect(widget).not.toBeChecked();
});

it('keeps custom widgets controlled in server mode and allows their control to be suppressed', async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  const predicate = vi.fn(() => false);
  const custom: Column<Person> = {
    ...columns[1]!, filter: predicate,
    renderFilter: ({ label, value, onChange }) => <label>{label}
      <input type="checkbox" checked={value === 'true'} onChange={event => onChange(event.target.checked ? 'true' : '')} />
    </label>,
  };
  const props = { ...base, columns: [custom], mode: 'server' as const, rowCount: 100,
    state: createTableState({ page: 2 }), onStateChange: change };
  const { rerender } = render(<DataTable {...props} />);
  await user.click(screen.getByRole('checkbox', { name: 'Filter Team' }));
  expect(screen.getByRole('checkbox', { name: 'Filter Team' })).not.toBeChecked();
  const next = change.mock.calls[0]![0] as TableState;
  expect(next).toEqual(expect.objectContaining({ page: 0, filters: { team: 'true' } }));
  rerender(<DataTable {...props} state={next} />);
  expect(screen.getByRole('checkbox', { name: 'Filter Team' })).toBeChecked();
  expect(screen.getAllByRole('row')).toHaveLength(4);
  expect(predicate).not.toHaveBeenCalled();
  rerender(<DataTable {...props} state={next} columns={[{ ...custom, filterable: false }]} />);
  expect(screen.queryByRole('checkbox', { name: 'Filter Team' })).not.toBeInTheDocument();
});

it('removes individual values and range bounds, then resets filters without changing other state', async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  const initial = createTableState({ search: 'Ada', page: 2, pageSize: 1,
    filters: { name: 'A', team: ['Design', 'Engineering'], age: { min: '30', max: '40' } },
    sort: { columnId: 'age', direction: 'desc' }, selectedIds: ['a'], expandedIds: ['a'],
    hiddenColumnIds: ['team'], columnOrder: ['age', 'name', 'team'], columnWidths: { age: 280 } });
  render(<DataTable {...base} selectable defaultState={initial} onStateChange={change}
    renderExpanded={row => <p>Details for {row.name}</p>} columns={[
      columns[0]!, { ...columns[1]!, filterOptions: [{ value: 'Engineering', label: 'Engineering team' }] }, columns[2]!,
    ]} />);
  await user.click(screen.getByRole('button', { name: 'Remove Team: Engineering team' }));
  expect(change).toHaveBeenCalledTimes(1);
  expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ filters: {
    name: 'A', team: ['Design'], age: { min: '30', max: '40' },
  } }));
  screen.getByRole('button', { name: 'Remove Age from: 30' }).focus();
  await user.keyboard('{Delete}');
  expect(screen.queryByRole('button', { name: 'Remove Age from: 30' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remove Age to: 40' })).toBeVisible();
  expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ filters: {
    name: 'A', team: ['Design'], age: { min: '', max: '40' },
  } }));
  await user.click(screen.getByRole('button', { name: 'Reset filters' }));
  expect(change).toHaveBeenCalledTimes(3);
  expect(change).toHaveBeenLastCalledWith({ ...initial, page: 0, filters: {} });
  expect(screen.queryByRole('button', { name: 'Reset filters' })).not.toBeInTheDocument();
  expect(screen.getByRole('searchbox')).toHaveValue('Ada');
  expect(screen.getByRole('checkbox', { name: 'Select row a' })).toBeChecked();
  expect(screen.getByText('Details for Ada')).toBeVisible();
});

it('omits inactive chips and localizes empty-value chips and removal actions', async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  const labels = { resetFilters: 'Limpiar filtros', emptyFilterValue: 'Vacío',
    filterChip: (header: string, value: string) => `${header} = ${value}`, removeFilter: (label: string) => `Quitar ${label}` };
  const props = { ...base, labels, onStateChange: change };
  const { rerender } = render(<DataTable {...props} state={createTableState({
    filters: { name: '', team: [], age: { min: '', max: '' } },
  })} />);
  expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument();
  rerender(<DataTable {...props} state={createTableState({ filters: { team: [''] } })} />);
  const chip = screen.getByRole('button', { name: 'Quitar Team = Vacío' });
  expect(chip).toBeVisible();
  chip.focus();
  await user.keyboard('{Enter}');
  expect(change).toHaveBeenCalledOnce();
  expect(change).toHaveBeenCalledWith(expect.objectContaining({ page: 0, filters: { team: [] } }));
  expect(chip).toBeVisible();
});

it('clears server criteria through controlled state without filtering the supplied rows', async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  const initial = createTableState({ page: 2, filters: { team: 'Engineering' }, selectedIds: ['a'] });
  const props = { ...base, mode: 'server' as const, rowCount: 100, state: initial, onStateChange: change };
  const { rerender } = render(<DataTable {...props} />);
  await user.click(screen.getByRole('button', { name: 'Remove Team: Engineering' }));
  expect(change).toHaveBeenLastCalledWith({ ...initial, page: 0, filters: { team: '' } });
  expect(screen.getByRole('button', { name: 'Remove Team: Engineering' })).toBeVisible();
  expect(screen.getByText('Ada')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Reset filters' }));
  expect(change).toHaveBeenLastCalledWith({ ...initial, page: 0, filters: {} });
  rerender(<DataTable {...props} state={change.mock.calls.at(-1)![0] as TableState} />);
  expect(screen.queryByRole('button', { name: 'Reset filters' })).not.toBeInTheDocument();
});

it('disables client search and pagination without losing stored values or column criteria', async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  const props = { ...base, onStateChange: change, defaultState: { search: 'missing', page: 2, pageSize: 1,
    filters: { team: 'Engineering' }, sort: { columnId: 'age', direction: 'asc' as const } } };
  const { rerender } = render(<DataTable {...props} search={false} pagination={false} />);
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: 'Rows per page:' })).not.toBeInTheDocument();
  expect(names()).toEqual(['Ben', 'Cleo']);
  expect(change).not.toHaveBeenCalled();
  rerender(<DataTable {...props} pagination={false} />);
  expect(screen.getByRole('searchbox')).toHaveValue('missing');
  expect(screen.getByText('No matching rows')).toBeVisible();
  await user.clear(screen.getByRole('searchbox'));
  expect(names()).toEqual(['Ben', 'Cleo']);
  expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, pageSize: 1, search: '' }));
  rerender(<DataTable {...props} />);
  expect(names()).toEqual(['Ben']);
  await user.click(screen.getByRole('button', { name: 'Next page' }));
  expect(names()).toEqual(['Cleo']);
});

it('selects all visible filtered client rows with pagination disabled, including empty results', async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  const props = { ...base, selectable: true, search: false, pagination: false, onStateChange: change,
    defaultState: { page: 2, pageSize: 1, filters: { team: 'Engineering' } } };
  const { rerender } = render(<DataTable {...props} />);
  expect(screen.getByText('Ben')).toBeVisible();
  expect(screen.getByText('Cleo')).toBeVisible();
  await user.click(screen.getByRole('checkbox', { name: 'Select this page' }));
  expect(screen.getByRole('checkbox', { name: 'Select row b' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Select row c' })).toBeChecked();
  expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, pageSize: 1, selectedIds: ['b', 'c'] }));
  expect(screen.getByRole('status')).toHaveTextContent('2 selected');
  rerender(<DataTable {...props} rows={[]} />);
  expect(screen.getByText('No matching rows')).toBeVisible();
  expect(screen.getByRole('checkbox', { name: 'Select this page' })).toBeDisabled();
});

it('keeps server data and query ownership with the parent when search and pagination controls are disabled', async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  const state = createTableState({ page: 2, pageSize: 2, search: 'missing', filters: { team: 'missing' } });
  render(<DataTable {...base} rows={rows.slice(0, 2)} mode="server" rowCount={100} state={state} onStateChange={change}
    search={false} pagination={false} selectable toolbar={<button>Refresh</button>} />);
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeVisible();
  expect(screen.getByText('Ada')).toBeVisible();
  expect(screen.getByText('Ben')).toBeVisible();
  await user.click(screen.getByRole('checkbox', { name: 'Select row a' }));
  expect(change).toHaveBeenLastCalledWith({ ...state, selectedIds: ['a'] });
});

it('exports the same filtered client rows displayed when search and pagination are disabled', async () => {
  const user = userEvent.setup();
  const csv = vi.spyOn(output, 'downloadCsv').mockImplementation(() => {});
  try {
    render(<DataTable {...base} search={false} pagination={false} csvFileName="people.csv"
      defaultState={{ search: 'missing', page: 2, pageSize: 1, filters: { team: 'Engineering' } }} />);
    await user.click(screen.getByRole('button', { name: 'Download CSV' }));
    expect(csv).toHaveBeenCalledWith('people.csv', columns, [rows[1], rows[2]]);
  } finally { csv.mockRestore(); }
});

// Server operations require a caller-owned query and total count.
// @ts-expect-error server mode requires state and onStateChange
const invalidServer: DataTableProps<Person> = { ...base, mode: 'server', rowCount: 100 };
void invalidServer;
