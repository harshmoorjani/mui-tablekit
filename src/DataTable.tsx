'use client';

import { useState } from 'react';
import {
  Box, Button, Checkbox, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TableSortLabel,
  TextField, Typography,
} from '@mui/material';
import { cellText, createTableState, getView } from './model.js';
import type { DataTableProps, TableLabels, TableState } from './types.js';

const defaultLabels: TableLabels = {
  search: 'Search', empty: 'No matching rows', selectPage: 'Select this page',
  selectRow: id => `Select row ${id}`, selected: count => `${count} selected`,
  clearSelection: 'Clear selection', filter: header => `Filter ${header}`,
  sort: header => `Sort by ${header}`, rowsPerPage: 'Rows per page:',
  previousPage: 'Previous page', nextPage: 'Next page',
  displayedRows: ({ from, to, count }) => `${from}–${to} of ${count}`,
};

export function DataTable<Row>(props: DataTableProps<Row>) {
  const {
    rows, columns, getRowId, caption, selectable = false, renderBulkActions,
    toolbar, pageSizeOptions = [10, 25, 50],
  } = props;
  const [internalState, setInternalState] = useState(() => createTableState(props.defaultState));
  const state = props.state ?? internalState;
  const labels = { ...defaultLabels, ...props.labels };
  const view = getView(rows, columns, state, props.mode === 'server' ? props.rowCount : undefined);
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
        {selectable && selected.size > 0 && (
          <>
            <Typography role="status">{labels.selected(selected.size)}</Typography>
            {renderBulkActions?.([...selected])}
            <Button onClick={() => update({ selectedIds: [] })}>{labels.clearSelection}</Button>
          </>
        )}
      </Stack>
      <TableContainer>
        <Table size="small">
          <caption style={{ captionSide: 'top', textAlign: 'start', padding: '0 16px 12px' }}>{caption}</caption>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox slotProps={{ input: { 'aria-label': labels.selectPage } }}
                    checked={pageIds.length > 0 && pageSelected === pageIds.length}
                    indeterminate={pageSelected > 0 && pageSelected < pageIds.length}
                    disabled={!pageIds.length} onChange={(_, checked) => toggle(pageIds, checked)} />
                </TableCell>
              )}
              {columns.map(column => (
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
            {columns.some(column => column.filterable) && (
              <TableRow>
                {selectable && <TableCell component="td" />}
                {columns.map(column => (
                  <TableCell key={column.id} component="td">
                    {column.filterable && (
                      <TextField size="small" label={labels.filter(column.header)}
                        value={Object.hasOwn(state.filters, column.id) ? state.filters[column.id] : ''}
                        onChange={event => update({ page: 0, filters: { ...state.filters, [column.id]: event.target.value } })} />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableHead>
          <TableBody>
            {view.rows.map(row => {
              const id = getRowId(row);
              return (
                <TableRow key={id} selected={selectable && selected.has(id)}>
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Checkbox slotProps={{ input: { 'aria-label': labels.selectRow(id) } }}
                        checked={selected.has(id)} onChange={(_, checked) => toggle([id], checked)} />
                    </TableCell>
                  )}
                  {columns.map(column => (
                    <TableCell key={column.id} align={column.align}>
                      {column.render ? column.render(column.value(row), row) : cellText(column.value(row))}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            {!view.rows.length && (
              <TableRow><TableCell colSpan={columns.length + Number(selectable)}>
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
