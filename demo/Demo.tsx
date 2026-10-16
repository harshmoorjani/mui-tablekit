import { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Container, CssBaseline, FormControlLabel,
  MenuItem, Paper, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { createTableState, DataTable } from '../src/index.js';
import type { Column } from '../src/index.js';
import { createPeople, locations, statuses, teams } from './data.js';
import type { Person } from './data.js';

const options = (values: string[]) => values.map(value => ({ value, label: value }));
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const columns: Column<Person>[] = [
  { id: 'name', header: 'Name', value: row => row.name, filterType: 'text' },
  { id: 'team', header: 'Team', value: row => row.team, filterType: 'multiselect', filterOptions: options(teams),
    render: value => <Chip label={String(value)} size="small" variant="outlined" /> },
  { id: 'location', header: 'Location', value: row => row.location, filterType: 'select', filterOptions: options(locations) },
  { id: 'status', header: 'Status', value: row => row.status, filterType: 'select', filterOptions: options(statuses),
    render: value => <Chip label={String(value)} size="small" color={value === 'Active' ? 'success' : value === 'On leave' ? 'warning' : 'info'} /> },
  { id: 'age', header: 'Age', value: row => row.age, align: 'right', filterType: 'numberRange' },
  { id: 'salary', header: 'Salary (USD)', value: row => row.salary, align: 'right', filterType: 'numberRange',
    render: value => currency.format(Number(value)) },
  { id: 'joined', header: 'Joined', value: row => row.joined, filterType: 'dateRange' },
  { id: 'remote', header: 'Remote', value: row => row.remote,
    filterOptions: [{ value: 'true', label: 'Remote only' }],
    filter: (row, value) => value !== 'true' || row.remote,
    renderFilter: ({ id, value, onChange }) => <FormControlLabel label="Remote only" control={
      <Checkbox id={id} checked={value === 'true'} onChange={(_, checked) => onChange(checked ? 'true' : '')} />
    } />,
    render: value => value ? 'Yes' : 'No' },
  { id: 'projects', header: 'Projects', value: row => row.projects, align: 'right', filterType: 'numberRange' },
];

const defaults = {
  search: true, pagination: true, filters: true, sorting: true, selection: true,
  expansion: true, columnControls: true, csv: true, print: true, customCells: true,
};
const toggles: [keyof typeof defaults, string][] = [
  ['search', 'Enable search'], ['pagination', 'Enable pagination'], ['filters', 'Column filters'],
  ['sorting', 'Sorting'], ['selection', 'Row selection'], ['expansion', 'Expandable rows'],
  ['columnControls', 'Column controls'], ['csv', 'CSV export'], ['print', 'Printing'], ['customCells', 'Custom cells'],
];

export function Demo() {
  const [count, setCount] = useState(1000);
  const [features, setFeatures] = useState(defaults);
  const [state, setState] = useState(() => createTableState({ pageSize: 25 }));
  const [dark, setDark] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [message, setMessage] = useState('');
  const rows = useMemo(() => createPeople(count), [count]);
  const theme = useMemo(() => createTheme({ palette: { mode: dark ? 'dark' : 'light' } }), [dark]);
  const activeColumns = useMemo(() => columns.map(column => ({
    ...column,
    filterable: features.filters,
    sortable: features.sorting,
    render: features.customCells ? column.render : undefined,
  })), [features.filters, features.sorting, features.customCells]);

  const toggleFeature = (key: keyof typeof defaults, checked: boolean) => {
    setFeatures(previous => ({ ...previous, [key]: checked }));
    if (key === 'filters') setState(previous => ({ ...previous, filters: {}, page: 0 }));
    if (key === 'sorting') setState(previous => ({ ...previous, sort: null, page: 0 }));
    if (key === 'selection') {
      setState(previous => ({ ...previous, selectedIds: [] }));
      setMessage('');
    }
    if (key === 'expansion') setState(previous => ({ ...previous, expandedIds: [] }));
  };

  const reset = () => {
    setCount(1000);
    setFeatures(defaults);
    setState(createTableState({ pageSize: 25 }));
    setDark(false);
    setInspect(false);
    setMessage('');
  };

  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
      <Typography variant="overline" color="text.secondary">Interactive playground</Typography>
      <Typography variant="h4" component="h1" gutterBottom>MUI Tablekit</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Configure the table, then explore search, filters, sorting, and selections across a larger dataset.
        All records are synthetic and generated locally.
      </Typography>

      <Paper component="section" aria-labelledby="configuration-heading" variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Typography id="configuration-heading" variant="h6" component="h2">Configuration</Typography>
          <Button onClick={reset}>Reset playground</Button>
        </Stack>
        <Stack direction="row" useFlexGap sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
          <TextField select label="Dataset size" size="small" sx={{ minWidth: 180 }} value={count}
            onChange={event => {
              setCount(Number(event.target.value));
              setState(previous => ({ ...previous, page: 0, selectedIds: [], expandedIds: [] }));
              setMessage('');
            }}>
            {[0, 100, 1000, 5000, 10000].map(size => <MenuItem key={size} value={size}>
              {size === 0 ? 'Empty dataset' : `${size.toLocaleString('en-US')} people`}
            </MenuItem>)}
          </TextField>
          <TextField select label="Page size" size="small" sx={{ minWidth: 130 }} value={state.pageSize} disabled={!features.pagination}
            onChange={event => setState(previous => ({ ...previous, pageSize: Number(event.target.value), page: 0 }))}>
            {[10, 25, 50, 100].map(size => <MenuItem key={size} value={size}>{size}</MenuItem>)}
          </TextField>
          <FormControlLabel label="Dark theme" control={<Switch checked={dark} onChange={(_, checked) => setDark(checked)} />} />
          <FormControlLabel label="Show table state" control={<Switch checked={inspect} onChange={(_, checked) => setInspect(checked)} />} />
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' } }}>
          {toggles.map(([key, label]) => <FormControlLabel key={key} label={label} control={
            <Switch checked={features[key]} onChange={(_, checked) => toggleFeature(key, checked)} />
          } />)}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Filters include text, team multiselect, location and status selects, numeric and date ranges, and a custom remote checkbox.
          Disabling filters or sorting clears those criteria.
        </Typography>
      </Paper>

      {!features.pagination && count >= 1000 && <Alert severity="info" sx={{ mb: 2 }}>
        Pagination is off: all matching rows render at once. Large datasets may take a moment.
      </Alert>}

      <DataTable caption="People directory" rows={rows} columns={activeColumns} getRowId={row => row.id}
        state={state} onStateChange={setState} pageSizeOptions={[10, 25, 50, 100]}
        search={features.search} pagination={features.pagination} selectable={features.selection}
        columnControls={features.columnControls} csvFileName={features.csv ? 'people.csv' : undefined} printable={features.print}
        renderExpanded={features.expansion ? row => <Stack spacing={0.5} sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 600 }}>{row.name} · {row.id}</Typography>
          <Typography>{row.email}</Typography>
          <Typography variant="body2">{row.team} · {row.location} · {row.status}</Typography>
          <Typography variant="body2">Joined {row.joined} · {row.projects} projects · {row.remote ? 'Works remotely' : 'Office based'}</Typography>
        </Stack> : undefined}
        renderBulkActions={ids => <Button onClick={() => setMessage(`Selected IDs: ${ids.join(', ')}`)}>Show IDs</Button>}
      />
      {message && <Alert severity="info" role="status" sx={{ mt: 2, overflowWrap: 'anywhere' }} onClose={() => setMessage('')}>{message}</Alert>}

      {inspect && <Paper component="section" aria-labelledby="state-heading" variant="outlined" sx={{ mt: 3, p: 2 }}>
        <Typography id="state-heading" variant="h6" component="h2">Live table state</Typography>
        <Box component="pre" sx={{ m: 0, mt: 2, overflow: 'auto', maxHeight: 360, fontSize: 13 }}>{JSON.stringify(state, null, 2)}</Box>
      </Paper>}
    </Container>
  </ThemeProvider>;
}
