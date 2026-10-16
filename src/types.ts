import type { ReactNode } from 'react';

export type CellValue = string | number | boolean | Date | null | undefined;

export interface Column<Row> {
  id: string;
  header: string;
  value: (row: Row) => CellValue;
  render?: (value: CellValue, row: Row) => ReactNode;
  sortable?: boolean;
  compare?: (a: Row, b: Row) => number;
  filterable?: boolean;
  filter?: (row: Row, query: string) => boolean;
  searchable?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface TableState {
  search: string;
  filters: Record<string, string>;
  sort: { columnId: string; direction: 'asc' | 'desc' } | null;
  page: number;
  pageSize: number;
  selectedIds: string[];
  expandedIds: string[];
}

export interface TableLabels {
  search: string;
  empty: string;
  selectPage: string;
  selectRow: (id: string) => string;
  selected: (count: number) => string;
  clearSelection: string;
  filter: (header: string) => string;
  sort: (header: string) => string;
  rowsPerPage: string;
  previousPage: string;
  nextPage: string;
  expandRow: (id: string) => string;
  collapseRow: (id: string) => string;
  displayedRows: (range: { from: number; to: number; count: number }) => string;
}

interface BaseProps<Row> {
  rows: readonly Row[];
  columns: readonly Column<Row>[];
  getRowId: (row: Row) => string;
  /** Accessible table name; rendered as a caption. */
  caption: string;
  state?: TableState;
  defaultState?: Partial<TableState>;
  onStateChange?: (state: TableState) => void;
  selectable?: boolean;
  renderBulkActions?: (selectedIds: readonly string[]) => ReactNode;
  renderExpanded?: (row: Row) => ReactNode;
  toolbar?: ReactNode;
  labels?: Partial<TableLabels>;
  pageSizeOptions?: number[];
}

export type DataTableProps<Row> = BaseProps<Row> & (
  | { mode?: 'client'; rowCount?: never }
  | { mode: 'server'; rowCount: number; state: TableState; onStateChange: (state: TableState) => void }
);
