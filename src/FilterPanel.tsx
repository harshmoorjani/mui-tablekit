import { useId, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { ColumnFilter } from './ColumnFilter.js';
import type { Column, TableComponents, TableLabels, TableState } from './types.js';

export function FilterPanel<Row>({ columns, filters, labels, confirm, onChange, onOpen, onClose, checkbox }: {
  columns: readonly Column<Row>[];
  filters: TableState['filters'];
  labels: TableLabels;
  confirm: boolean;
  onChange: (filters: TableState['filters'], confirmed?: boolean) => void;
  onOpen?: () => void;
  onClose?: () => void;
  checkbox?: TableComponents['Checkbox'];
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const [draft, setDraft] = useState(filters);
  if (!columns.length) return null;
  const values = confirm ? draft : filters;
  const controls = <Stack direction="row" useFlexGap sx={{ p: 2, gap: 2, flexWrap: 'wrap' }}>
    {columns.map(column => <ColumnFilter key={column.id} column={column} labels={labels} checkbox={checkbox}
      value={Object.hasOwn(values, column.id) ? values[column.id] : undefined}
      onChange={value => {
        const next = { ...values, [column.id]: value };
        if (confirm) setDraft(next); else onChange(next);
      }} />)}
  </Stack>;
  if (!confirm) return controls;
  const close = () => { setOpen(false); onClose?.(); };
  return <>
    <Button sx={{ mx: 2, mb: 2 }} onClick={() => { setDraft(structuredClone(filters)); setOpen(true); onOpen?.(); }}>{labels.filters}</Button>
    <Dialog open={open} onClose={close} aria-labelledby={titleId} fullWidth maxWidth="md">
      <DialogTitle id={titleId}>{labels.filters}</DialogTitle>
      <DialogContent>{controls}</DialogContent>
      <DialogActions>
        <Button onClick={() => setDraft({})}>{labels.resetFilters}</Button>
        <Button onClick={close}>{labels.cancelFilters}</Button>
        <Button onClick={() => { onChange(draft, true); close(); }}>{labels.applyFilters}</Button>
      </DialogActions>
    </Dialog>
  </>;
}
