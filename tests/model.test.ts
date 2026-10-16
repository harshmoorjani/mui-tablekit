import { describe, expect, it } from 'vitest';
import { columnWidth, createTableState, getOrderedColumns, getView } from '../src/model.js';
import type { Column, FilterValue } from '../src/index.js';

const rows = [
  { id: 'a', name: 'Ada', team: 'Design', age: 40 },
  { id: 'b', name: 'Ben', team: 'Engineering', age: 25 },
  { id: 'c', name: 'Cleo', team: 'Engineering', age: 32 },
];
const columns: Column<(typeof rows)[number]>[] = [
  { id: 'name', header: 'Name', value: row => row.name },
  { id: 'team', header: 'Team', value: row => row.team },
  { id: 'age', header: 'Age', value: row => row.age },
];

describe('client row model', () => {
  it('searches and filters before sorting and paging without mutating input', () => {
    const view = getView(rows, columns, createTableState({
      search: 'ENGINEERING', filters: { name: 'e' },
      sort: { columnId: 'age', direction: 'desc' }, pageSize: 1,
    }));
    expect(view.rows.map(row => row.id)).toEqual(['c']);
    expect(view.count).toBe(2);
    expect(rows.map(row => row.id)).toEqual(['a', 'b', 'c']);
  });

  it('clamps a client page after data shrinks, including empty data', () => {
    expect(getView(rows, columns, createTableState({ page: 9, pageSize: 2 })).page).toBe(1);
    expect(getView([], columns, createTableState({ page: 9 })).page).toBe(0);
  });

  it('supports custom comparisons and filter predicates', () => {
    const custom = columns.map(column => column.id === 'age'
      ? { ...column, filter: (row: (typeof rows)[number], value: FilterValue) => row.age >= Number(value),
          compare: (a: (typeof rows)[number], b: (typeof rows)[number]) => b.age - a.age }
      : column);
    expect(getView(rows, custom, createTableState({
      filters: { age: '30' }, sort: { columnId: 'age', direction: 'asc' },
    })).rows.map(row => row.id)).toEqual(['a', 'c']);
  });

  it('excludes opted-out columns from search', () => {
    expect(getView(rows, columns.map(column => ({ ...column, searchable: false })),
      createTableState({ search: 'Ada' })).count).toBe(0);
  });

  it('accepts column IDs that also exist on Object.prototype', () => {
    expect(getView(rows, [{ ...columns[0]!, id: 'constructor' }], createTableState()).count).toBe(3);
  });

  it('sorts nulls, numbers, booleans, and dates', () => {
    for (const values of [[10, 2, null], [true, false, null], [new Date('2025-01-01'), new Date('2024-01-01'), null]]) {
      const data = values.map((value, index) => ({ id: String(index), value }));
      const view = getView(data, [{ id: 'value', header: 'Value', value: row => row.value }],
        createTableState({ sort: { columnId: 'value', direction: 'asc' } }));
      expect(view.rows.map(row => row.id)).toEqual(['1', '0', '2']);
    }
  });

  it('rejects invalid pagination inputs', () => {
    for (const state of [{ page: -1 }, { page: 0.5 }, { pageSize: 0 }, { pageSize: NaN }]) {
      expect(() => getView(rows, columns, createTableState(state))).toThrow(/page/);
    }
  });
});

it('leaves server rows untouched even when local state would exclude them', () => {
  const view = getView(rows, columns, createTableState({
    search: 'missing', filters: { name: 'missing' },
    sort: { columnId: 'age', direction: 'asc' }, page: 2, pageSize: 1,
  }), 100);
  expect(view).toEqual({ rows, count: 100, page: 2 });
  expect(() => getView(rows, columns, createTableState(), -1)).toThrow(/rowCount/);
});

it('normalizes persisted column order and widths after column definitions change', () => {
  expect(getOrderedColumns(columns, ['age', 'removed', 'age']).map(column => column.id)).toEqual(['age', 'name', 'team']);
  expect(columnWidth({}, 'constructor')).toBe(160);
  expect(columnWidth({ name: Infinity }, 'name')).toBe(160);
  expect(columnWidth({ name: 10 }, 'name')).toBe(80);
  expect(columnWidth({ name: 2000 }, 'name')).toBe(1000);
});

it('combines multiselect and inclusive numeric ranges, allowing one-sided and cleared ranges', () => {
  const state = createTableState({ filters: { team: ['Engineering', 'Design'], age: { min: '30', max: '40' } } });
  expect(getView(rows, columns, state).rows.map(row => row.id)).toEqual(['a', 'c']);
  expect(getView(rows, columns, { ...state, filters: { age: { min: '32', max: '' } } }).rows.map(row => row.id)).toEqual(['a', 'c']);
  expect(getView(rows, columns, { ...state, filters: { age: { min: '', max: '' }, team: [] } }).count).toBe(3);
  expect(getView(rows, columns, { ...state, filters: { age: { min: '40', max: '30' } } }).count).toBe(0);
  expect(getView(rows, columns, { ...state, filters: { age: { min: 'invalid', max: '' } } }).count).toBe(0);
});

it('uses exact select matching and inclusive UTC dates', () => {
  expect(getView(rows, [{ ...columns[1]!, filterType: 'select' }], createTableState({ filters: { team: 'Eng' } })).count).toBe(0);
  const dated = [
    { value: new Date('2025-01-01T00:00:00Z') },
    { value: '2025-01-02T23:59:59.999Z' },
    { value: '2025-01-03T00:00:00Z' }, { value: null }, { value: 'invalid' },
  ];
  expect(getView(dated, [{ id: 'date', header: 'Date', value: row => row.value, filterType: 'dateRange' }],
    createTableState({ filters: { date: { min: '2025-01-01', max: '2025-01-02' } } })).rows).toEqual(dated.slice(0, 2));
});

it('rejects impossible calendar dates instead of rolling them into another day', () => {
  const data = [{ value: '2025-02-30' }, { value: '2025-03-02' }, { value: '2025-02-30T12:00:00Z' }];
  const dateColumns: Column<(typeof data)[number]>[] = [{ id: 'date', header: 'Date', value: row => row.value, filterType: 'dateRange' }];
  expect(getView(data, dateColumns, createTableState({ filters: { date: { min: '2025-03-02', max: '2025-03-02' } } })).rows).toEqual([data[1]]);
  expect(getView(data, dateColumns, createTableState({ filters: { date: { min: '2025-02-30', max: '' } } })).count).toBe(0);
  expect(getView([{ value: '2024-02-29' }], dateColumns,
    createTableState({ filters: { date: { min: '2024-02-29', max: '2024-02-29' } } })).count).toBe(1);
});
