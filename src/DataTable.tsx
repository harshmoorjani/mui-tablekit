'use client';

import { Fragment, useId, useMemo, useState } from 'react';
import {
  Box, Button, Checkbox, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TableSortLabel,
  TextField, Typography,
} from '@mui/material';
import { cellText, columnWidth, createTableState, getOrderedColumns, getView } from './model.js';
import { ColumnControls } from './ColumnControls.js';
import { ColumnFilter } from './ColumnFilter.js';
import { downloadCsv, printRows } from './output.js';
import type { DataTableProps, TableLabels, TableState } from './types.js';

const defaultLabels: TableLabels = {
  search: 'Search', empty: 'No matching rows', selectPage: 'Select this page',
  selectRow: id => `Select row ${id}`, selected: count => `${count} selected`,
  clearSelection: 'Clear selection', filter: header => `Filter ${header}`,
  filterMin: header => `${header} from`, filterMax: header => `${header} to`, clearFilter: 'Any',
  sort: header => `Sort by ${header}`, rowsPerPage: 'Rows per page:',
  previousPage: 'Previous page', nextPage: 'Next page',
  expandRow: id => `Expand row ${id}`, collapseRow: id => `Collapse row ${id}`,
  details: 'Details', columns: 'Columns', showColumn: header => `Show ${header}`,
  moveColumn: (header, direction) => `Move ${header} ${direction}`,
  columnWidth: header => `${header} width (px)`,
  downloadCsv: 'Download CSV', downloadCsvPage: 'Download page CSV', print: 'Print', printPage: 'Print page',
  displayedRows: ({ from, to, count }) => `${from}–${to} of ${count}`,
};

export function DataTable<Row>(props: DataTableProps<Row>) {
  const {
    rows, columns, getRowId, caption, selectable = false, renderBulkActions,
    toolbar, renderExpanded, columnControls = false, pageSizeOptions = [10, 25, 50],
  } = props;
  const [internalState, setInternalState] = useState(() => createTableState(props.defaultState));
  const state = props.state ?? internalState;
  const tableId = useId();
  const labels = { ...defaultLabels, ...props.labels };
  const { search, filters, sort, page, pageSize } = state;
  const rowCount = props.mode === 'server' ? props.rowCount : undefined;
  const view = useMemo(() => getView(rows, columns, { search, filters, sort, page, pageSize }, rowCount),
    [rows, columns, search, filters, sort, page, pageSize, rowCount]);
  const selected = new Set(state.selectedIds);
  const ids = rows.map(getRowId);
  if (new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !id)) {
    throw new Error('MUI Tablekit: getRowId must return a unique, nonempty string for every row.');
  }
  if (!columns.length || new Set(columns.map(column => column.id)).size !== columns.length ||
      columns.some(column => !column.id)) {
    throw new Error('MUI Tablekit: provide columns with unique, nonempty ids.');
  }
  const pageIds = view.rows.map(getRowId);
  const orderedColumns = getOrderedColumns(columns, state.columnOrder);
  const visibleColumns = orderedColumns.filter(column => !state.hiddenColumnIds.includes(column.id));
  if (!visibleColumns.length) throw new Error('MUI Tablekit: at least one column must be visible.');
  const sized = columnControls || Object.keys(state.columnWidths).length > 0;
  const utilityColumns = Number(selectable) + Number(Boolean(renderExpanded));
  const tableWidth = visibleColumns.reduce((width, column) => width + columnWidth(state.columnWidths, column.id), utilityColumns * 64);
  const pageSelected = pageIds.filter(id => selected.has(id)).length;
  const update = (patch: Partial<TableState>) => {
    const next = { ...state, page: view.page, ...patch };
    if (props.state === undefined) setInternalState(next);
    props.onStateChange?.(next);
  };
  const toggle = (rowIds: string[], checked: boolean) => {
    const next = new Set(selected);
    rowIds.forEach(id => checked ? next.add(id) : next.delete(id));
    update({ selectedIds: [...next] });
  };

  return (
    <Paper variant="outlined">
      <Stack direction="row" useFlexGap sx={{ p: 2, gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField label={labels.search} size="small" type="search" value={state.search}
          onChange={event => update({ search: event.target.value, page: 0 })} />
        {toolbar}
        {props.csvFileName && <Button onClick={() => downloadCsv(props.csvFileName!, visibleColumns, view.allRows)}>
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
      </Stack>
      {columnControls && <ColumnControls columns={orderedColumns} state={state} labels={labels} update={update} />}
      {orderedColumns.some(column => column.filterable ?? Boolean(column.filterType)) && <Stack direction="row" useFlexGap sx={{ px: 2, pb: 2, gap: 2, flexWrap: 'wrap' }}>
        {orderedColumns.filter(column => column.filterable ?? Boolean(column.filterType)).map(column => (
          <ColumnFilter key={column.id} column={column} labels={labels}
            value={Object.hasOwn(state.filters, column.id) ? state.filters[column.id] : undefined}
            onChange={value => update({ page: 0, filters: { ...state.filters, [column.id]: value } })} />
        ))}
      </Stack>}
      <TableContainer>
        <Table size="small" sx={sized ? { tableLayout: 'fixed', width: tableWidth, minWidth: '100%', '& td, & th': { overflowWrap: 'anywhere' } } : undefined}>
          <caption style={{ captionSide: 'top', textAlign: 'start', padding: '0 16px 12px' }}>{caption}</caption>
          {sized && <colgroup>
            {renderExpanded && <col style={{ width: 64 }} />}
            {selectable && <col style={{ width: 64 }} />}
            {visibleColumns.map(column => <col key={column.id} style={{ width: columnWidth(state.columnWidths, column.id) }} />)}
          </colgroup>}
          <TableHead>
            <TableRow>
              {renderExpanded && <TableCell scope="col"><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>{labels.details}</span></TableCell>}
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox slotProps={{ input: { 'aria-label': labels.selectPage } }}
                    checked={pageIds.length > 0 && pageSelected === pageIds.length}
                    indeterminate={pageSelected > 0 && pageSelected < pageIds.length}
                    disabled={!pageIds.length} onChange={(_, checked) => toggle(pageIds, checked)} />
                </TableCell>
              )}
              {visibleColumns.map(column => (
                <TableCell key={column.id} scope="col" align={column.align}
                  sortDirection={state.sort?.columnId === column.id ? state.sort.direction : false}>
                  {column.sortable === false ? column.header : (
                    <TableSortLabel active={state.sort?.columnId === column.id}
                      direction={state.sort?.columnId === column.id ? state.sort.direction : 'asc'}
                      aria-label={labels.sort(column.header)}
                      onClick={() => update({ page: 0, sort: state.sort?.columnId !== column.id
                        ? { columnId: column.id, direction: 'asc' }
                        : state.sort.direction === 'asc' ? { columnId: column.id, direction: 'desc' } : null })}
                    >{column.header}</TableSortLabel>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {view.rows.map(row => {
              const id = getRowId(row);
              const expanded = state.expandedIds.includes(id);
              const detailsId = `${tableId}-${encodeURIComponent(id)}`;
              return (
                <Fragment key={id}>
                  <TableRow selected={selectable && selected.has(id)}>
                    {renderExpanded && <TableCell padding="none">
                      <Button aria-label={expanded ? labels.collapseRow(id) : labels.expandRow(id)}
                        aria-expanded={expanded} aria-controls={expanded ? detailsId : undefined}
                        onClick={() => update({ expandedIds: expanded
                          ? state.expandedIds.filter(value => value !== id) : [...state.expandedIds, id] })}>
                        {expanded ? '−' : '+'}
                      </Button>
                    </TableCell>}
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox slotProps={{ input: { 'aria-label': labels.selectRow(id) } }}
                          checked={selected.has(id)} onChange={(_, checked) => toggle([id], checked)} />
                      </TableCell>
                    )}
                    {visibleColumns.map(column => (
                      <TableCell key={column.id} align={column.align}>
                        {column.render ? column.render(column.value(row), row) : cellText(column.value(row))}
                      </TableCell>
                    ))}
                  </TableRow>
                  {renderExpanded && expanded && <TableRow>
                    <TableCell id={detailsId} colSpan={visibleColumns.length + utilityColumns}>
                      {renderExpanded(row)}
                    </TableCell>
                  </TableRow>}
                </Fragment>
              );
            })}
            {!view.rows.length && (
              <TableRow><TableCell colSpan={visibleColumns.length + utilityColumns}>
                <Box role="status" sx={{ py: 3, textAlign: 'center' }}>{labels.empty}</Box>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={view.count} page={view.page}
        rowsPerPage={state.pageSize} rowsPerPageOptions={[...new Set([...pageSizeOptions, state.pageSize])].sort((a, b) => a - b)}
        labelRowsPerPage={labels.rowsPerPage} labelDisplayedRows={labels.displayedRows}
        getItemAriaLabel={type => type === 'previous' ? labels.previousPage : labels.nextPage}
        onPageChange={(_, page) => update({ page })}
        onRowsPerPageChange={event => update({ pageSize: Number(event.target.value), page: 0 })} />
    </Paper>
  );
}
