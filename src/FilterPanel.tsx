import { useId, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { ColumnFilter } from './ColumnFilter.js';
import type { Column, TableLabels, TableState } from './types.js';

export function FilterPanel<Row>({ columns, filters, labels, confirm, onChange }: {
  columns: readonly Column<Row>[];
  filters: TableState['filters'];
  labels: TableLabels;
  confirm: boolean;
  onChange: (filters: TableState['filters']) => void;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const [draft, setDraft] = useState(filters);
  if (!columns.length) return null;
  const values = confirm ? draft : filters;
  const controls = <Stack direction="row" useFlexGap sx={{ p: 2, gap: 2, flexWrap: 'wrap' }}>
    {columns.map(column => <ColumnFilter key={column.id} column={column} labels={labels}
      value={Object.hasOwn(values, column.id) ? values[column.id] : undefined}
      onChange={value => {
        const next = { ...values, [column.id]: value };
        if (confirm) setDraft(next); else onChange(next);
      }} />)}
  </Stack>;
  if (!confirm) return controls;
  return <>
    <Button sx={{ mx: 2, mb: 2 }} onClick={() => { setDraft(structuredClone(filters)); setOpen(true); }}>{labels.filters}</Button>
    <Dialog open={open} onClose={() => setOpen(false)} aria-labelledby={titleId} fullWidth maxWidth="md">
      <DialogTitle id={titleId}>{labels.filters}</DialogTitle>
      <DialogContent>{controls}</DialogContent>
      <DialogActions>
        <Button onClick={() => setDraft({})}>{labels.resetFilters}</Button>
        <Button onClick={() => setOpen(false)}>{labels.cancelFilters}</Button>
        <Button onClick={() => { onChange(draft); setOpen(false); }}>{labels.applyFilters}</Button>
      </DialogActions>
    </Dialog>
  </>;
}
