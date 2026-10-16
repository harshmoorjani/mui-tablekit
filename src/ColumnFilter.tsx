import { useId } from 'react';
import { Checkbox, FormControl, FormControlLabel, FormGroup, FormLabel, InputLabel, MenuItem, Select, Stack, TextField } from '@mui/material';
import type { Column, FilterValue, TableComponents, TableLabels } from './types.js';

export function ColumnFilter<Row>({ column, value, labels, onChange, checkbox: Choice = Checkbox }: {
  column: Column<Row>;
  value: FilterValue | undefined;
  labels: TableLabels;
  onChange: (value: FilterValue) => void;
  checkbox?: TableComponents['Checkbox'];
}) {
  const id = useId();
  const label = labels.filter(column.header);
  if (column.renderFilter) return column.renderFilter({ id, label, value, onChange });
  if (column.filterType === 'checkbox') return <FormControl component="fieldset">
    <FormLabel component="legend">{label}</FormLabel>
    <FormGroup>{column.filterOptions?.map(option => <FormControlLabel key={option.value} label={option.label || labels.emptyFilterValue}
      control={<Choice checked={Array.isArray(value) && value.includes(option.value)} onChange={(_, checked) => {
        const previous = Array.isArray(value) ? value : [];
        onChange(checked ? [...previous, option.value] : previous.filter(entry => entry !== option.value));
      }} />} />)}</FormGroup>
  </FormControl>;
  if (column.filterType === 'numberRange' || column.filterType === 'dateRange') {
    const range = value && typeof value === 'object' && !Array.isArray(value) ? value : { min: '', max: '' };
    return <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap' }}>
      {(['min', 'max'] as const).map(bound => (
        <TextField key={bound} size="small" type={column.filterType === 'dateRange' ? 'date' : 'number'}
          label={bound === 'min' ? labels.filterMin(column.header) : labels.filterMax(column.header)}
          value={range[bound]} sx={{ width: 180 }} slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 'any' } }}
          onChange={event => onChange({ ...range, [bound]: event.target.value })} />
      ))}
    </Stack>;
  }
  if (column.filterType === 'select' || column.filterType === 'multiselect') {
    const multiple = column.filterType === 'multiselect';
    return <FormControl size="small" sx={{ minWidth: 180 }}>
      <InputLabel id={id}>{label}</InputLabel>
      <Select<string | string[]> labelId={id} label={label} multiple={multiple}
        value={multiple ? Array.isArray(value) ? value : [] : typeof value === 'string' ? value : ''}
        onChange={event => onChange(multiple && typeof event.target.value === 'string' ? [event.target.value] : event.target.value)}>
        {!multiple && <MenuItem value="">{labels.clearFilter}</MenuItem>}
        {column.filterOptions?.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
      </Select>
    </FormControl>;
  }
  return <TextField size="small" label={label} value={typeof value === 'string' ? value : ''}
    onChange={event => onChange(event.target.value)} />;
}
