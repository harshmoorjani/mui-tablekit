import { useId, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Popover, Stack } from '@mui/material';
import { ColumnFilter } from './ColumnFilter.js';
import { ToolbarButton } from './ToolbarButton.js';
import { activeFilter } from './model.js';
import type { Column, TableComponents, TableLabels, TableState } from './types.js';

export function FilterPanel<Row>({ columns, filters, labels, confirm, onChange, onOpen, onClose, checkbox, button, inline }: {
  columns: readonly Column<Row>[];
  filters: TableState['filters'];
  labels: TableLabels;
  confirm: boolean;
  onChange: (filters: TableState['filters'], confirmed?: boolean) => void;
  onOpen?: () => void;
  onClose?: () => void;
  checkbox?: TableComponents['Checkbox'];
  button?: TableComponents['ToolbarButton'];
  inline?: boolean;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);
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
  if (!confirm && inline) return controls;
  const close = () => { setAnchor(null); onClose?.(); };
  return <>
    <ToolbarButton component={button} action="filters" label={labels.filters} expanded={open} active={open || Object.values(filters).some(activeFilter)}
      onClick={event => { setDraft(structuredClone(filters)); setAnchor(event.currentTarget); onOpen?.(); }} />
    {confirm ? <Dialog open={open} onClose={close} aria-labelledby={titleId} fullWidth maxWidth="md">
      <DialogTitle id={titleId}>{labels.filters}</DialogTitle>
      <DialogContent>{controls}</DialogContent>
      <DialogActions>
        <Button onClick={() => setDraft({})}>{labels.resetFilters}</Button>
        <Button onClick={close}>{labels.cancelFilters}</Button>
        <Button onClick={() => { onChange(draft, true); close(); }}>{labels.applyFilters}</Button>
      </DialogActions>
    </Dialog> : <Popover open={open} anchorEl={anchor} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { role: 'dialog', 'aria-label': labels.filters, sx: { width: 600, maxWidth: 'calc(100vw - 32px)' } } }}>
      {controls}
    </Popover>}
  </>;
}
