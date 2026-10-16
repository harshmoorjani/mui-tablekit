import type { CellValue, Column, TableState } from './types.js';

export function createTableState(state: Partial<TableState> = {}): TableState {
  return {
    search: '', filters: {}, sort: null, page: 0, pageSize: 10,
    selectedIds: [], expandedIds: [], hiddenColumnIds: [], columnOrder: [], columnWidths: {}, ...state,
  };
}

export function getOrderedColumns<Row>(columns: readonly Column<Row>[], order: readonly string[]) {
  const byId = new Map(columns.map(column => [column.id, column]));
  return [...new Set([...order, ...byId.keys()])].flatMap(id => {
    const column = byId.get(id);
    return column ? [column] : [];
  });
}

export function columnWidth(widths: Record<string, number>, id: string) {
  const width = Object.hasOwn(widths, id) ? widths[id] : undefined;
  return typeof width === 'number' && Number.isFinite(width) ? Math.min(1000, Math.max(80, width)) : 160;
}

export function cellText(value: CellValue): string {
  return value instanceof Date ? value.toISOString() : String(value ?? '');
}

function compareValues(a: CellValue, b: CellValue): number {
  if (a == null) return b == null ? 0 : 1;
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return cellText(a).localeCompare(cellText(b), undefined, { numeric: true });
}

export function getView<Row>(
  rows: readonly Row[], columns: readonly Column<Row>[], state: TableState,
  serverRowCount?: number,
) {
  if (!Number.isInteger(state.page) || state.page < 0 ||
      !Number.isInteger(state.pageSize) || state.pageSize < 1) {
    throw new Error('MUI Tablekit: page must be a nonnegative integer and pageSize a positive integer.');
  }
  if (serverRowCount !== undefined && (!Number.isInteger(serverRowCount) || serverRowCount < 0)) {
    throw new Error('MUI Tablekit: rowCount must be a nonnegative integer.');
  }
  let result = [...rows];
  if (serverRowCount === undefined) {
    const query = state.search.trim().toLocaleLowerCase();
    result = result.filter(row =>
      (!query || columns.some(column => column.searchable !== false &&
        cellText(column.value(row)).toLocaleLowerCase().includes(query))) &&
      columns.every(column => {
        const filter = Object.hasOwn(state.filters, column.id) ? state.filters[column.id] : '';
        return !filter || (column.filter ? column.filter(row, filter) :
          cellText(column.value(row)).toLocaleLowerCase().includes(filter.toLocaleLowerCase()));
      }),
    );
    const sort = state.sort;
    const column = columns.find(column => column.id === sort?.columnId);
    if (column && sort && column.sortable !== false) {
      result.sort((a, b) => (sort.direction === 'asc' ? 1 : -1) *
        (column.compare ? column.compare(a, b) : compareValues(column.value(a), column.value(b))));
    }
  }
  const count = serverRowCount ?? result.length;
  // The server owns its page; never relabel old response rows as another page.
  const page = serverRowCount === undefined
    ? Math.min(state.page, Math.max(0, Math.ceil(count / state.pageSize) - 1))
    : state.page;
  return {
    rows: serverRowCount === undefined ? result.slice(page * state.pageSize, (page + 1) * state.pageSize) : result,
    count,
    page,
  };
}
