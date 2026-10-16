import type { ReactNode } from 'react';

export type CellScalar = string | number | boolean | Date | null | undefined;
export type CellValue = CellScalar | readonly CellScalar[];
export type FilterValue = string | string[] | { min: string; max: string };

export interface FilterControlProps {
  id: string;
  label: string;
  value: FilterValue | undefined;
  onChange: (value: FilterValue) => void;
}

export interface Column<Row> {
  id: string;
  header: string;
  value: (row: Row) => CellValue;
  render?: (value: CellValue, row: Row) => ReactNode;
  sortable?: boolean;
  compare?: (a: Row, b: Row) => number;
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'multiselect' | 'numberRange' | 'dateRange';
  filterOptions?: readonly { value: string; label: string }[];
  filterMatch?: 'any' | 'all';
  filter?: (row: Row, query: FilterValue) => boolean;
  renderFilter?: (props: FilterControlProps) => ReactNode;
  searchable?: boolean;
  excluded?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface TableState {
  search: string;
  filters: Record<string, FilterValue>;
  sort: { columnId: string; direction: 'asc' | 'desc' } | null;
  page: number;
  pageSize: number;
  selectedIds: string[];
  expandedIds: string[];
  hiddenColumnIds: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>;
}

export interface TableLabels {
  search: string;
  empty: string;
  selectPage: string;
  selectFiltered: string;
  selectLoaded: string;
  selectRow: (id: string) => string;
  selected: (count: number) => string;
  clearSelection: string;
  filter: (header: string) => string;
  filterMin: (header: string) => string;
  filterMax: (header: string) => string;
  clearFilter: string;
  resetFilters: string;
  emptyFilterValue: string;
  filterChip: (header: string, value: string) => string;
  removeFilter: (label: string) => string;
  sort: (header: string) => string;
  rowsPerPage: string;
  previousPage: string;
  nextPage: string;
  firstPage: string;
  lastPage: string;
  expandRow: (id: string) => string;
  collapseRow: (id: string) => string;
  expandAll: string;
  collapseAll: string;
  details: string;
  columns: string;
  showColumn: (header: string) => string;
  moveColumn: (header: string, direction: 'previous' | 'next') => string;
  columnWidth: (header: string) => string;
  downloadCsv: string;
  downloadCsvPage: string;
  print: string;
  printPage: string;
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
  selectable?: boolean | 'single';
  isRowSelectable?: (row: Row) => boolean;
  selectOnClick?: boolean;
  selectAllScope?: 'page' | 'filtered';
  renderBulkActions?: (selectedIds: readonly string[]) => ReactNode;
  renderExpanded?: (row: Row) => ReactNode;
  isRowExpandable?: (row: Row) => boolean;
  expandAll?: boolean;
  columnControls?: boolean;
  csvFileName?: string;
  printable?: boolean;
  toolbar?: ReactNode;
  labels?: Partial<TableLabels>;
  pageSizeOptions?: number[];
  search?: boolean;
  pagination?: boolean;
}

export type DataTableProps<Row> = BaseProps<Row> & (
  | { mode?: 'client'; rowCount?: never }
  | { mode: 'server'; rowCount: number; state: TableState; onStateChange: (state: TableState) => void }
);
