import { useState } from 'react';
import { Button, Checkbox, FormControlLabel, Popover, Stack, TextField } from '@mui/material';
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
  const visible = columns.filter(column => column.hideable === false || !state.hiddenColumnIds.includes(column.id)).length;
  const move = (index: number, offset: number) => {
    const order = columns.map(column => column.id);
    [order[index], order[index + offset]] = [order[index + offset]!, order[index]!];
    update({ columnOrder: order });
  };
  return (
    <>
      <ToolbarButton component={button} action="columns" label={labels.columns} expanded={Boolean(anchor)} active={Boolean(anchor)} onClick={event => setAnchor(event.currentTarget)} />
      <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { role: 'dialog', 'aria-label': labels.columns, sx: { maxWidth: 'calc(100vw - 32px)' } } }}>
      <Stack spacing={1} sx={{ p: 2 }}>
        {columns.map((column, index) => {
          const hidden = column.hideable !== false && state.hiddenColumnIds.includes(column.id);
          return (
            <Stack key={column.id} direction="row" useFlexGap sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControlLabel label={labels.showColumn(column.header)}
                control={<Choice checked={!hidden} disabled={column.hideable === false || (!hidden && visible === 1)}
                  onChange={(_, checked) => update({ hiddenColumnIds: checked
                    ? state.hiddenColumnIds.filter(id => id !== column.id) : [...state.hiddenColumnIds, column.id] })} />}
              />
              <Button aria-label={labels.moveColumn(column.header, 'previous')} disabled={index === 0 || column.draggable === false || columns[index - 1]?.draggable === false}
                onClick={() => move(index, -1)}>←</Button>
              <Button aria-label={labels.moveColumn(column.header, 'next')} disabled={index === columns.length - 1 || column.draggable === false || columns[index + 1]?.draggable === false}
                onClick={() => move(index, 1)}>→</Button>
              <TextField key={columnWidth(state.columnWidths, column.id)} type="number" size="small" label={labels.columnWidth(column.header)} sx={{ width: 160 }}
                slotProps={{ htmlInput: { min: 80, max: 1000, step: 10 } }}
                defaultValue={columnWidth(state.columnWidths, column.id)}
                onBlur={event => {
                  const number = Number(event.target.value);
                  const width = event.target.value !== '' && Number.isFinite(number)
                    ? Math.min(1000, Math.max(80, number)) : columnWidth(state.columnWidths, column.id);
                  event.target.value = String(columnWidth(state.columnWidths, column.id));
                  update({ columnWidths: { ...state.columnWidths, [column.id]: width } });
                }} />
            </Stack>
          );
        })}
      </Stack>
      </Popover>
    </>
  );
}
