import type { ComponentType, ElementType, ReactNode } from 'react';
import type { TablePaginationProps } from '@mui/material/TablePagination';
import type { TableCellProps } from '@mui/material/TableCell';
import type { CheckboxProps } from '@mui/material/Checkbox';
import type { ButtonProps } from '@mui/material/Button';
import type { ChipProps } from '@mui/material/Chip';
import type { MouseEventHandler } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';

export type CellScalar = string | number | boolean | Date | null | undefined;
export type CellValue = CellScalar | readonly CellScalar[];
export type FilterValue = string | string[] | { min: string; max: string };
export type FilterCriterion = number | 'min' | 'max';

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
  exportable?: boolean;
  csvValue?: (value: CellValue, row: Row) => CellValue;
  sortable?: boolean;
  compare?: (a: Row, b: Row) => number;
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'multiselect' | 'checkbox' | 'numberRange' | 'dateRange';
  filterOptions?: readonly { value: string; label: string }[];
  filterMatch?: 'any' | 'all';
  filter?: (row: Row, query: FilterValue) => boolean;
  renderFilter?: (props: FilterControlProps) => ReactNode;
  filterChipLabel?: (value: string, criterion: FilterCriterion) => string;
  removeFilterValue?: (value: FilterValue, criterion: FilterCriterion) => FilterValue;
  searchable?: boolean;
  excluded?: boolean;
  hideable?: boolean;
  draggable?: boolean;
  printable?: boolean;
  sticky?: 'left' | 'right';
  sortDescFirst?: boolean;
  sortReset?: boolean;
  renderHeader?: (column: { id: string; header: string }) => ReactNode;
  align?: 'left' | 'center' | 'right';
  headerSx?: SxProps<Theme>;
  cellSx?: (row: Row) => SxProps<Theme>;
}

export interface ColumnGroup<Row> extends Omit<Column<Row>, 'value'> {
  columns: readonly ColumnDefinition<Row>[];
  value?: (row: Row) => CellValue;
}

export type ColumnDefinition<Row> = Column<Row> | ColumnGroup<Row>;

export interface SearchControlProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export type TableAction = 'init' | 'search' | 'filter' | 'sort' | 'page' | 'pageSize' | 'selection' | 'expansion' | 'columns'
  | 'searchOpen' | 'searchClose' | 'filterOpen' | 'filterClose' | 'filterConfirm' | 'filterChipClose' | 'filterReset';

export interface RowContext {
  id: string;
  depth: number;
  selected: boolean;
  expanded: boolean;
}

export interface ToolbarButtonProps {
  action: 'search' | 'filters' | 'columns' | 'csv' | 'print';
  label: string;
  active?: boolean;
  expanded?: boolean;
  onClick: MouseEventHandler<HTMLElement>;
  children: ReactNode;
}

export interface ToolbarControls {
  search: ReactNode;
  filters: ReactNode;
  columns: ReactNode;
  csv: ReactNode;
  print: ReactNode;
  selection: ReactNode;
  custom: ReactNode;
}

export interface TableComponents {
  Table?: ElementType;
  Head?: ElementType;
  Body?: ElementType;
  Row?: ElementType;
  Cell?: TableCellProps['component'];
  Pagination?: ComponentType<TablePaginationProps>;
  Checkbox?: ComponentType<CheckboxProps>;
  ExpandButton?: ComponentType<ButtonProps>;
  FilterChip?: ComponentType<ChipProps>;
  Toolbar?: ElementType;
  ToolbarButton?: ComponentType<ToolbarButtonProps>;
}

export interface TableState {
  search: string;
  filters: Record<string, FilterValue>;
  sort: { columnId: string; direction: 'asc' | 'desc' } | null;
  page: number;
  pageSize: number;
  selectedIds: string[];
  expandedIds: string[];
  expandedColumnIds: string[];
  hiddenColumnIds: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>;
}

export interface CsvOptions {
  delimiter?: string;
  rows?: 'filtered' | 'all' | 'page';
  columns?: 'visible' | 'all';
  transform?: (csv: string) => string | false;
}

export interface TableLabels {
  search: string;
  showSearch: string;
  hideSearch: string;
  jumpToPage: string;
  deleteRows: string;
  deleteFailed: string;
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
  filters: string;
  applyFilters: string;
  cancelFilters: string;
  emptyFilterValue: string;
  filterChip: (header: string, value: string) => string;
  removeFilter: (label: string) => string;
  sort: (header: string) => string;
  rowsPerPage: string;
  page: string;
  previousPage: string;
  nextPage: string;
  firstPage: string;
  lastPage: string;
  expandRow: (id: string) => string;
  collapseRow: (id: string) => string;
  expandAll: string;
  collapseAll: string;
  expandLoaded: string;
  collapseLoaded: string;
  details: string;
  columns: string;
  showColumn: (header: string) => string;
  moveColumn: (header: string, direction: 'previous' | 'next') => string;
  columnWidth: (header: string) => string;
  dragColumn: (header: string) => string;
  resizeColumn: (header: string) => string;
  expandColumns: (header: string) => string;
  collapseColumns: (header: string) => string;
  downloadCsv: string;
  downloadCsvPage: string;
  print: string;
  printPage: string;
  displayedRows: (range: { from: number; to: number; count: number }) => string;
}

interface BaseProps<Row> {
  rows: readonly Row[];
  columns: readonly ColumnDefinition<Row>[];
  getRowId: (row: Row) => string;
  /** Accessible table name; rendered above the controls. */
  caption: string;
  state?: TableState;
  defaultState?: Partial<TableState>;
  onStateChange?: (state: TableState) => void;
  onAction?: (action: TableAction, state: TableState) => void;
  onRowClick?: (row: Row, context: RowContext) => void;
  onCellClick?: (row: Row, column: Column<Row>, context: RowContext) => void;
  onRowsDelete?: (ids: readonly string[], rows: readonly Row[]) => void | boolean | Promise<void | boolean>;
  selectable?: boolean | 'single';
  isRowSelectable?: (row: Row) => boolean;
  selectOnClick?: boolean;
  selectAllScope?: 'page' | 'filtered';
  selectionCheckboxes?: boolean;
  selectAll?: boolean;
  selectionToolbar?: 'inline' | 'above' | 'replace' | 'none';
  renderBulkActions?: (selectedIds: readonly string[]) => ReactNode;
  renderExpanded?: (row: Row) => ReactNode;
  getSubRows?: (row: Row) => readonly Row[] | undefined;
  expandOnClick?: boolean;
  isRowExpandable?: (row: Row) => boolean;
  expandAll?: boolean;
  columnControls?: boolean;
  columnReordering?: boolean;
  columnResizing?: boolean;
  csvFileName?: string;
  csvOptions?: CsvOptions;
  printable?: boolean;
  toolbar?: ReactNode;
  renderToolbar?: (controls: ToolbarControls) => ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  emptyContent?: ReactNode;
  rowSx?: (row: Row) => SxProps<Theme>;
  stickyHeader?: boolean;
  fixedSelection?: boolean;
  maxHeight?: number | string;
  responsive?: 'scroll' | 'stacked' | 'simple';
  renderRow?: (row: Row, context: RowContext, cells: ReactNode) => ReactNode;
  renderSummary?: (rows: readonly Row[], columns: readonly Column<Row>[]) => ReactNode;
  components?: TableComponents;
  labels?: Partial<TableLabels>;
  pageSizeOptions?: number[];
  search?: boolean;
  caseSensitive?: boolean;
  searchMatch?: (row: Row, query: string, columns: readonly Column<Row>[]) => boolean;
  renderSearch?: (props: SearchControlProps) => ReactNode;
  searchDisplay?: 'always' | 'toggle';
  searchDebounceMs?: number;
  pagination?: boolean;
  jumpToPage?: boolean;
  storageKey?: string;
  filterMode?: 'immediate' | 'confirm';
  filterDisplay?: 'popover' | 'inline';
}

export type DataTableProps<Row> = BaseProps<Row> & (
  | { mode?: 'client'; rowCount?: never }
  | { mode: 'server'; rowCount: number; state: TableState; onStateChange: (state: TableState) => void }
);
