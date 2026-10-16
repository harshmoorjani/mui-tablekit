import { Button, Chip, Stack } from '@mui/material';
import type { Column, FilterValue, TableLabels, TableState } from './types.js';

export function FilterChips<Row>({ columns, filters, labels, onChange, onReset }: {
  columns: readonly Column<Row>[];
  filters: TableState['filters'];
  labels: TableLabels;
  onChange: (id: string, value: FilterValue) => void;
  onReset: () => void;
}) {
  const chips = columns.flatMap(column => {
    const value = Object.hasOwn(filters, column.id) ? filters[column.id] : undefined;
    const chip = (key: string, label: string, remove: () => void) => (
      <Chip key={`${column.id}-${key}`} size="small" label={label} aria-label={labels.removeFilter(label)}
        onClick={remove} onDelete={remove} />
    );
    const label = (entry: string) => labels.filterChip(column.header,
      column.filterOptions?.find(option => option.value === entry)?.label || entry || labels.emptyFilterValue);
    if (typeof value === 'string') return value ? [chip('value', label(value), () => onChange(column.id, ''))] : [];
    if (Array.isArray(value)) return value.map((entry, index) =>
      chip(String(index), label(entry), () => onChange(column.id, value.filter((_, i) => i !== index))));
    if (!value) return [];
    return (['min', 'max'] as const).filter(bound => value[bound]).map(bound =>
      chip(bound, labels.filterChip(bound === 'min' ? labels.filterMin(column.header) : labels.filterMax(column.header), value[bound]),
        () => onChange(column.id, { ...value, [bound]: '' })));
  });
  if (!chips.length) return null;
  return <Stack direction="row" useFlexGap sx={{ px: 2, pb: 2, gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
    {chips}
    <Button onClick={onReset}>{labels.resetFilters}</Button>
  </Stack>;
}
