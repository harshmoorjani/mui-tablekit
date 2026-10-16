import { Box, Button, Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';
import { columnWidth } from './model.js';
import type { Column, TableLabels, TableState } from './types.js';

export function ColumnControls<Row>({ columns, state, labels, update }: {
  columns: readonly Column<Row>[];
  state: TableState;
  labels: TableLabels;
  update: (patch: Partial<TableState>) => void;
}) {
  const visible = columns.filter(column => !state.hiddenColumnIds.includes(column.id)).length;
  const move = (index: number, offset: number) => {
    const order = columns.map(column => column.id);
    [order[index], order[index + offset]] = [order[index + offset]!, order[index]!];
    update({ columnOrder: order });
  };
  return (
    <Box component="details" sx={{ px: 2, pb: 2 }}>
      <summary>{labels.columns}</summary>
      <Stack spacing={1} sx={{ pt: 1 }}>
        {columns.map((column, index) => {
          const hidden = state.hiddenColumnIds.includes(column.id);
          return (
            <Stack key={column.id} direction="row" useFlexGap sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControlLabel label={labels.showColumn(column.header)}
                control={<Checkbox checked={!hidden} disabled={!hidden && visible === 1}
                  onChange={(_, checked) => update({ hiddenColumnIds: checked
                    ? state.hiddenColumnIds.filter(id => id !== column.id) : [...state.hiddenColumnIds, column.id] })} />}
              />
              <Button aria-label={labels.moveColumn(column.header, 'previous')} disabled={index === 0}
                onClick={() => move(index, -1)}>←</Button>
              <Button aria-label={labels.moveColumn(column.header, 'next')} disabled={index === columns.length - 1}
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
    </Box>
  );
}
