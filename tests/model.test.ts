import { describe, expect, it } from 'vitest';
import { columnWidth, createTableState, getOrderedColumns, getView } from '../src/model.js';
import type { Column } from '../src/index.js';

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
      ? { ...column, filter: (row: (typeof rows)[number], value: string) => row.age >= Number(value),
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
