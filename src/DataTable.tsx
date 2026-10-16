'use client';

import { Fragment, useId, useMemo, useState } from 'react';
import {
  Box, Button, Checkbox, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow,
  TextField, Typography,
} from '@mui/material';
import { cellText, columnWidth, createTableState, getOrderedColumns, getView, inferFilterOptions } from './model.js';
import { ColumnControls } from './ColumnControls.js';
import { ColumnHeader } from './ColumnHeader.js';
import { FilterPanel } from './FilterPanel.js';
import { FilterChips } from './FilterChips.js';
import { downloadCsv, printRows } from './output.js';
import type { DataTableProps, FilterValue, TableLabels, TableState } from './types.js';

const defaultLabels: TableLabels = {
  search: 'Search', empty: 'No matching rows', selectPage: 'Select this page',
  selectFiltered: 'Select all filtered rows', selectLoaded: 'Select loaded rows',
  selectRow: id => `Select row ${id}`, selected: count => `${count} selected`,
  clearSelection: 'Clear selection', filter: header => `Filter ${header}`,
  filterMin: header => `${header} from`, filterMax: header => `${header} to`, clearFilter: 'Any',
  resetFilters: 'Reset filters', emptyFilterValue: '(empty)',
  filters: 'Filters', applyFilters: 'Apply filters', cancelFilters: 'Cancel',
  filterChip: (header, value) => `${header}: ${value}`, removeFilter: label => `Remove ${label}`,
  sort: header => `Sort by ${header}`, rowsPerPage: 'Rows per page:',
  previousPage: 'Previous page', nextPage: 'Next page',
  firstPage: 'First page', lastPage: 'Last page',
  expandRow: id => `Expand row ${id}`, collapseRow: id => `Collapse row ${id}`,
  expandAll: 'Expand all filtered rows', collapseAll: 'Collapse all filtered rows',
  expandLoaded: 'Expand loaded rows', collapseLoaded: 'Collapse loaded rows',
  details: 'Details', columns: 'Columns', showColumn: header => `Show ${header}`,
  moveColumn: (header, direction) => `Move ${header} ${direction}`,
  columnWidth: header => `${header} width (px)`,
  dragColumn: header => `Move ${header} (drag or use left/right arrows)`,
  resizeColumn: header => `Resize ${header} (use left/right arrows)`,
  downloadCsv: 'Download CSV', downloadCsvPage: 'Download page CSV', print: 'Print', printPage: 'Print page',
  displayedRows: ({ from, to, count }) => `${from}–${to} of ${count}`,
};

export function DataTable<Row>(props: DataTableProps<Row>) {
  if (props.mode === 'server' && (props.rowCount == null || props.state == null || typeof props.onStateChange !== 'function')) {
    throw new Error('MUI Tablekit: server mode requires rowCount, state, and onStateChange.');
  }
  const {
    rows, columns, getRowId, caption, selectable = false, renderBulkActions,
    toolbar, renderExpanded, columnControls = false, pageSizeOptions = [10, 25, 50],
    search: searchEnabled = true, pagination = true,
    isRowSelectable = () => true, selectOnClick = false, selectAllScope = 'page',
    isRowExpandable = () => true, expandAll = false,
  } = props;
  const [internalState, setInternalState] = useState(() => createTableState(props.defaultState));
  const state = props.state ?? internalState;
  const tableId = useId();
  const labels = { ...defaultLabels, ...props.labels };
  const { search, filters, sort, page, pageSize } = state;
  const rowCount = props.mode === 'server' ? props.rowCount : undefined;
  const paginate = pagination || rowCount !== undefined;
  const view = useMemo(() => getView(rows, columns, {
    search: searchEnabled ? search : '', filters, sort,
    page: paginate ? page : 0, pageSize: paginate ? pageSize : Math.max(rows.length, 1),
  }, rowCount), [rows, columns, search, filters, sort, page, pageSize, rowCount, searchEnabled, paginate]);
  const selected = new Set(selectable === 'single' ? state.selectedIds.slice(-1) : state.selectedIds);
  const expandedIds = new Set(state.expandedIds);
  const ids = rows.map(getRowId);
  if (new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !id)) {
    throw new Error('MUI Tablekit: getRowId must return a unique, nonempty string for every row.');
  }
  if (!columns.length || new Set(columns.map(column => column.id)).size !== columns.length ||
      columns.some(column => typeof column.id !== 'string' || !column.id)) {
    throw new Error('MUI Tablekit: provide columns with unique, nonempty ids.');
  }
  const pageIds = (selectAllScope === 'filtered' ? view.allRows : view.rows).filter(isRowSelectable).map(getRowId);
  const expandableIds = renderExpanded && expandAll ? view.allRows.filter(isRowExpandable).map(getRowId) : [];
  const expandableSet = new Set(expandableIds);
  const allExpanded = expandableIds.length > 0 && expandableIds.every(id => expandedIds.has(id));
  const resolvedColumns = useMemo(() => columns.map(column => column.filterType === 'select' || column.filterType === 'multiselect'
    ? { ...column, filterOptions: inferFilterOptions(column, rows, Object.hasOwn(filters, column.id) ? filters[column.id] : undefined) }
    : column), [columns, rows, filters]);
  const orderedColumns = getOrderedColumns(resolvedColumns, state.columnOrder);
  const filterColumns = orderedColumns.filter(column => column.filterable ?? Boolean(column.filterType || column.renderFilter));
  const layoutColumns = orderedColumns.filter(column => !column.excluded);
  const visibleColumns = layoutColumns.filter(column => !state.hiddenColumnIds.includes(column.id));
  if (!visibleColumns.length) throw new Error('MUI Tablekit: at least one column must be visible.');
  const sized = columnControls || props.columnResizing || Object.keys(state.columnWidths).length > 0;
  const utilityColumns = Number(Boolean(selectable)) + Number(Boolean(renderExpanded));
  const tableWidth = visibleColumns.reduce((width, column) => width + columnWidth(state.columnWidths, column.id), utilityColumns * 64);
  const pageSelected = pageIds.filter(id => selected.has(id)).length;
  const update = (patch: Partial<TableState>) => {
    const next = { ...state, page: view.page, ...patch };
    if (props.state === undefined) setInternalState(next);
    props.onStateChange?.(next);
  };
  const toggle = (rowIds: string[], checked: boolean) => {
    if (selectable === 'single') { update({ selectedIds: checked ? rowIds.slice(-1) : [] }); return; }
    const next = new Set(selected);
    rowIds.forEach(id => checked ? next.add(id) : next.delete(id));
    update({ selectedIds: [...next] });
  };
  const changeFilter = (id: string, value: FilterValue) => update({ page: 0, filters: { ...state.filters, [id]: value } });
  const hasToolbar = searchEnabled || (toolbar != null && toolbar !== false) ||
    Boolean(props.csvFileName || props.printable || (selectable && selected.size));

  return (
    <Paper variant="outlined">
      {props.header}
      {hasToolbar && <Stack direction="row" useFlexGap sx={{ p: 2, gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {searchEnabled && <TextField label={labels.search} size="small" type="search" value={state.search}
          onChange={event => update({ search: event.target.value, page: 0 })} />}
        {toolbar}
        {props.csvFileName && <Button onClick={() => downloadCsv(props.csvFileName!, visibleColumns, view.allRows, props.csvOptions)}>
          {props.mode === 'server' ? labels.downloadCsvPage : labels.downloadCsv}
        </Button>}
        {props.printable && <Button onClick={() => printRows(caption, visibleColumns, view.allRows)}>
          {props.mode === 'server' ? labels.printPage : labels.print}
        </Button>}
        {selectable && selected.size > 0 && (
          <>
            <Typography role="status">{labels.selected(selected.size)}</Typography>
            {renderBulkActions?.([...selected])}
            <Button onClick={() => update({ selectedIds: [] })}>{labels.clearSelection}</Button>
          </>
        )}
      </Stack>}
      {columnControls && <ColumnControls columns={layoutColumns} state={state} labels={labels} update={update} />}
      <FilterPanel columns={filterColumns} filters={state.filters} labels={labels} confirm={props.filterMode === 'confirm'}
        onChange={filters => update({ page: 0, filters })} />
      <FilterChips columns={orderedColumns} filters={state.filters} labels={labels} onChange={changeFilter}
        onReset={() => update({ page: 0, filters: {} })} />
      <TableContainer sx={{ maxHeight: props.maxHeight }} tabIndex={props.maxHeight ? 0 : undefined} role={props.maxHeight ? 'region' : undefined}
        aria-label={props.maxHeight ? caption : undefined}>
        <Table size="small" stickyHeader={props.stickyHeader} role="table" sx={{
          ...(sized ? { tableLayout: 'fixed', width: tableWidth, minWidth: '100%', '& td, & th': { overflowWrap: 'anywhere' } } : {}),
          '& .tablekit-label': { display: 'none' },
          ...(props.responsive === 'stacked' ? { '@media (max-width: 599px)': {
            display: 'block', width: '100%', minWidth: 0,
            '& caption, & thead, & tbody, & tr': { display: 'block' },
            '& colgroup': { display: 'none' },
            '& thead tr': { display: 'flex', flexWrap: 'wrap' },
            '& th': { display: 'block', position: 'static' },
            '& tbody tr': { borderBottom: 1, borderColor: 'divider' },
            '& td': { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, textAlign: 'start', overflowWrap: 'anywhere' },
            '& .tablekit-label': { display: 'inline', fontWeight: 600 },
          } } : {}),
        }}>
          <caption style={{ captionSide: 'top', textAlign: 'start', padding: '0 16px 12px' }}>{caption}</caption>
          {sized && <colgroup>
            {renderExpanded && <col style={{ width: 64 }} />}
            {selectable && <col style={{ width: 64 }} />}
            {visibleColumns.map(column => <col key={column.id} style={{ width: columnWidth(state.columnWidths, column.id) }} />)}
          </colgroup>}
          <TableHead role="rowgroup">
            <TableRow role="row">
              {renderExpanded && <TableCell scope="col" role="columnheader">
                {expandAll ? <Button disabled={!expandableIds.length} aria-label={props.mode === 'server'
                  ? allExpanded ? labels.collapseLoaded : labels.expandLoaded : allExpanded ? labels.collapseAll : labels.expandAll}
                  onClick={() => update({ expandedIds: allExpanded
                    ? state.expandedIds.filter(id => !expandableSet.has(id))
                    : [...new Set([...state.expandedIds, ...expandableIds])] })}>{allExpanded ? '−' : '+'}</Button>
                  : <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>{labels.details}</span>}
              </TableCell>}
              {selectable && (
                <TableCell padding="checkbox" role="columnheader">
                  {selectable !== 'single' && <Checkbox slotProps={{ input: { 'aria-label': selectAllScope === 'page' ? labels.selectPage
                    : props.mode === 'server' ? labels.selectLoaded : labels.selectFiltered } }}
                    checked={pageIds.length > 0 && pageSelected === pageIds.length}
                    indeterminate={pageSelected > 0 && pageSelected < pageIds.length}
                    disabled={!pageIds.length} onChange={(_, checked) => toggle(pageIds, checked)} />}
                </TableCell>
              )}
              {visibleColumns.map(column => <ColumnHeader key={column.id} column={column} columns={layoutColumns}
                state={state} labels={labels} update={update} tableId={tableId}
                reorder={Boolean(props.columnReordering)} resize={Boolean(props.columnResizing)} />)}
            </TableRow>
          </TableHead>
          <TableBody role="rowgroup">
            {view.rows.map((row, index) => {
              const id = getRowId(row);
              const canSelect = Boolean(selectable) && isRowSelectable(row);
              const expanded = isRowExpandable(row) && expandedIds.has(id);
              const detailsId = `${tableId}-${index}`;
              return (
                <Fragment key={id}>
                  <TableRow selected={Boolean(selectable) && selected.has(id)}
                    role="row" sx={props.rowSx?.(row)}
                    tabIndex={selectOnClick && canSelect ? 0 : undefined}
                    onClick={event => {
                      if (selectOnClick && canSelect && !(event.target as Element).closest('button,a,input,select,textarea,label,summary,[role="button"],[role="checkbox"],[role="switch"],[role="link"],[role="combobox"],[role="textbox"],[contenteditable]')) toggle([id], !selected.has(id));
                    }}
                    onKeyDown={event => {
                      if (selectOnClick && canSelect && event.target === event.currentTarget && (event.key === ' ' || event.key === 'Enter')) {
                        event.preventDefault(); toggle([id], !selected.has(id));
                      }
                    }}>
                    {renderExpanded && <TableCell padding="none" role="cell">
                      <Button aria-label={expanded ? labels.collapseRow(id) : labels.expandRow(id)}
                        disabled={!isRowExpandable(row)}
                        aria-expanded={expanded} aria-controls={expanded ? detailsId : undefined}
                        onClick={() => update({ expandedIds: expanded
                          ? state.expandedIds.filter(value => value !== id) : [...state.expandedIds, id] })}>
                        {expanded ? '−' : '+'}
                      </Button>
                    </TableCell>}
                    {selectable && (
                      <TableCell padding="checkbox" role="cell">
                        <Checkbox slotProps={{ input: { 'aria-label': labels.selectRow(id) } }}
                          disabled={!canSelect}
                          checked={selected.has(id)} onChange={(_, checked) => toggle([id], checked)} />
                      </TableCell>
                    )}
                    {visibleColumns.map(column => (
                      <TableCell key={column.id} align={column.align} role="cell"
                        sx={column.cellSx?.(row)}>
                        {props.responsive === 'stacked' && <span className="tablekit-label" aria-hidden="true">{column.header}</span>}
                        <Box sx={{ minWidth: 0 }}>{column.render ? column.render(column.value(row), row) : cellText(column.value(row))}</Box>
                      </TableCell>
                    ))}
                  </TableRow>
                  {renderExpanded && expanded && <TableRow role="row">
                    <TableCell id={detailsId} role="cell" colSpan={visibleColumns.length + utilityColumns}>
                      {renderExpanded(row)}
                    </TableCell>
                  </TableRow>}
                </Fragment>
              );
            })}
            {!view.rows.length && (
              <TableRow role="row"><TableCell role="cell" colSpan={visibleColumns.length + utilityColumns}>
                <Box role="status" sx={{ py: 3, textAlign: 'center' }}>{props.emptyContent ?? labels.empty}</Box>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination && <TablePagination component="div" count={view.count} page={view.page}
        rowsPerPage={state.pageSize} rowsPerPageOptions={[...new Set([...pageSizeOptions, state.pageSize])].sort((a, b) => a - b)}
        labelRowsPerPage={labels.rowsPerPage} labelDisplayedRows={labels.displayedRows}
        getItemAriaLabel={type => ({ first: labels.firstPage, last: labels.lastPage, previous: labels.previousPage, next: labels.nextPage })[type]}
        onPageChange={(_, page) => update({ page })}
        onRowsPerPageChange={event => update({ pageSize: Number(event.target.value), page: 0 })} />}
      {props.footer}
    </Paper>
  );
}
