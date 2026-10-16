import { useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, Popover, Stack, TextField, Typography } from '@mui/material';
import { columnWidth } from './model.js';
import { ToolbarButton } from './ToolbarButton.js';
import type { Column, TableComponents, TableLabels, TableState } from './types.js';

export function ColumnControls<Row>({ columns, state, labels, update, checkbox: Choice = Checkbox, button }: {
  columns: readonly Column<Row>[];
  state: TableState;
  labels: TableLabels;
  update: (patch: Partial<TableState>) => void;
  checkbox?: TableComponents['Checkbox'];
  button?: TableComponents['ToolbarButton'];
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const movedButton = useRef<HTMLButtonElement | undefined>(undefined);
  useLayoutEffect(() => {
    const button = movedButton.current; movedButton.current = undefined;
    if (button?.isConnected) {
      if (!button.disabled) button.focus();
      else button.parentElement?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    }
  }, [state.columnOrder]);
  const visible = columns.filter(column => column.hideable === false || !state.hiddenColumnIds.includes(column.id)).length;
  const canMove = (index: number, offset: number) => {
    const column = columns[index]; const target = columns[index + offset];
    return Boolean(column && target && column.draggable !== false && target.draggable !== false && column.sticky === target.sticky);
  };
  const move = (index: number, offset: number, button: HTMLButtonElement) => {
    if (!canMove(index, offset)) return;
    const order = columns.map(column => column.id);
    [order[index], order[index + offset]] = [order[index + offset]!, order[index]!];
    movedButton.current = button;
    update({ columnOrder: order });
  };
  return (
    <>
      <ToolbarButton component={button} action="columns" label={labels.columns} expanded={Boolean(anchor)} active={Boolean(anchor)} onClick={event => setAnchor(event.currentTarget)} />
      <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { role: 'dialog', 'aria-label': labels.columns, sx: { width: 520, maxWidth: 'calc(100vw - 32px)' } } }}>
      <Stack direction="row" sx={{ px: 2, py: 1, alignItems: 'center', gap: 1, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
        <Typography variant="subtitle2" component="h2" sx={{ flexGrow: 1 }}>{labels.columns}</Typography>
      </Stack>
      <Stack spacing={1} sx={{ p: 2 }}>
        {columns.map((column, index) => {
          const hidden = column.hideable !== false && state.hiddenColumnIds.includes(column.id);
          return (
            <Box key={column.id} sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr) 32px 32px', sm: 'minmax(0, 1fr) 32px 32px 168px' }, gap: 1, alignItems: 'center' }}>
              <FormControlLabel label={labels.showColumn(column.header)} sx={{ m: 0, minWidth: 0, overflowWrap: 'anywhere' }}
                control={<Choice checked={!hidden} disabled={column.hideable === false || (!hidden && visible === 1)}
                  onChange={(_, checked) => update({ hiddenColumnIds: checked
                    ? state.hiddenColumnIds.filter(id => id !== column.id) : [...state.hiddenColumnIds, column.id] })} />}
              />
              <Button size="small" sx={{ minWidth: 32, width: 32, height: 32 }} aria-label={labels.moveColumn(column.header, 'previous')} disabled={!canMove(index, -1)}
                onClick={event => move(index, -1, event.currentTarget)}>←</Button>
              <Button size="small" sx={{ minWidth: 32, width: 32, height: 32 }} aria-label={labels.moveColumn(column.header, 'next')} disabled={!canMove(index, 1)}
                onClick={event => move(index, 1, event.currentTarget)}>→</Button>
              <TextField key={columnWidth(state.columnWidths, column.id)} type="number" size="small" label={labels.columnWidth(column.header)}
                sx={{ width: '100%', minWidth: 0, gridColumn: { xs: '1 / -1', sm: 'auto' }, '& .MuiInputBase-root': { height: 40 } }}
                slotProps={{ htmlInput: { min: 80, max: 1000, step: 10 } }}
                defaultValue={columnWidth(state.columnWidths, column.id)}
                onBlur={event => {
                  const number = Number(event.target.value);
                  const width = event.target.value !== '' && Number.isFinite(number)
                    ? Math.min(1000, Math.max(80, number)) : columnWidth(state.columnWidths, column.id);
                  event.target.value = String(columnWidth(state.columnWidths, column.id));
                  update({ columnWidths: { ...state.columnWidths, [column.id]: width } });
                }} />
            </Box>
          );
        })}
      </Stack>
      </Popover>
    </>
  );
}
