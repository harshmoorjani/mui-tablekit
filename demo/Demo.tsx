import { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Container, CssBaseline, FormControlLabel,
  MenuItem, Paper, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { createTableState, DataTable } from '../src/index.js';
import type { Column, ToolbarButtonProps } from '../src/index.js';
import { createPeople, locations, statuses, teams } from './data.js';
import type { Person } from './data.js';
import { ServerDemo } from './ServerDemo.js';
import { demoTheme, themes } from './themes.js';
import { HierarchyDemo } from './HierarchyDemo.js';
import { CustomizationDemo } from './CustomizationDemo.js';

const options = (values: string[]) => values.map(value => ({ value, label: value }));
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
function TextToolbarButton({ label, onClick, active, expanded }: ToolbarButtonProps) {
  return <Button size="small" onClick={onClick} aria-pressed={active} aria-expanded={expanded} variant={active ? 'contained' : 'text'}>{label}</Button>;
}
const columns: Column<Person>[] = [
  { id: 'email', header: 'Email', value: row => row.email, excluded: true, filterable: false },
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
  { id: 'skills', header: 'Skills', value: row => row.skills, filterType: 'multiselect' },
];

const defaults = {
  search: true, pagination: true, filters: true, sorting: true, selection: true,
  expansion: true, columnControls: true, csv: true, print: true, customCells: true,
  columnReordering: false, columnResizing: false, sticky: false, stacked: false,
  confirm: false, clickSelection: false, filteredSelection: false, eligible: false, expandAll: false,
  stickyColumns: false, checkboxFilters: false, toggleSearch: false, debounce: false, jump: false, caseSensitive: false,
  hideCheckboxes: false, hideSelectAll: false, inlineFilters: false, textButtons: false,
};
const toggles: [keyof typeof defaults, string][] = [
  ['search', 'Enable search'], ['pagination', 'Enable pagination'], ['filters', 'Column filters'],
  ['sorting', 'Sorting'], ['selection', 'Row selection'], ['expansion', 'Expandable rows'],
  ['columnControls', 'Column controls'], ['csv', 'CSV export'], ['print', 'Printing'], ['customCells', 'Custom cells'],
  ['columnReordering', 'Drag columns'], ['columnResizing', 'Resize handles'], ['sticky', 'Sticky header'],
  ['stacked', 'Stacked mobile layout'], ['confirm', 'Confirm filters'], ['clickSelection', 'Click to select'],
  ['filteredSelection', 'Select across filtered pages'], ['eligible', 'Only remote rows selectable/expandable'], ['expandAll', 'Expand all control'],
  ['stickyColumns', 'Sticky columns'], ['checkboxFilters', 'Checkbox status filter'], ['toggleSearch', 'Toggle search field'],
  ['debounce', 'Debounce search (200 ms)'], ['jump', 'Jump to page'], ['caseSensitive', 'Case-sensitive search'],
  ['hideCheckboxes', 'Hide selection checkboxes'], ['hideSelectAll', 'Hide select-all checkbox'],
  ['inlineFilters', 'Inline filters'], ['textButtons', 'Custom text toolbar buttons'],
];

export function Demo() {
  const [count, setCount] = useState(1000);
  const [features, setFeatures] = useState(defaults);
  const [state, setState] = useState(() => createTableState({ pageSize: 25 }));
  const [themeId, setThemeId] = useState('canvas');
  const [inspect, setInspect] = useState(false);
  const [message, setMessage] = useState('');
  const [single, setSingle] = useState(false);
  const [allSkills, setAllSkills] = useState(false);
  const [example, setExample] = useState('people');
  const [selectionToolbar, setSelectionToolbar] = useState<'inline' | 'above' | 'replace' | 'none'>('inline');
  const rows = useMemo(() => createPeople(count), [count]);
  const theme = useMemo(() => demoTheme(themeId), [themeId]);
  const activeColumns = useMemo(() => columns.map(column => ({
    ...column,
    filterable: features.filters && column.filterable !== false,
    sortable: features.sorting,
    filterMatch: allSkills ? 'all' as const : 'any' as const,
    render: features.customCells ? column.render : undefined,
    filterType: column.id === 'status' && features.checkboxFilters ? 'checkbox' as const : column.filterType,
    sticky: features.stickyColumns ? column.id === 'name' ? 'left' as const : column.id === 'projects' ? 'right' as const : undefined : undefined,
  })), [features.filters, features.sorting, features.customCells, features.checkboxFilters, features.stickyColumns, allSkills]);

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
    setThemeId('canvas');
    setInspect(false);
    setMessage('');
    setSingle(false);
    setAllSkills(false);
    setExample('people');
    setSelectionToolbar('inline');
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
          <TextField select label="Example" size="small" sx={{ minWidth: 200 }} value={example} onChange={event => setExample(event.target.value)}>
            <MenuItem value="people">People directory</MenuItem><MenuItem value="nested">Nested report</MenuItem><MenuItem value="server">Server adapter</MenuItem><MenuItem value="custom">Custom components</MenuItem>
          </TextField>
          <TextField select label="Theme" size="small" value={themeId} sx={{ minWidth: 180 }} onChange={event => setThemeId(event.target.value)}>
            {themes.map(preset => <MenuItem key={preset.id} value={preset.id}>{preset.label}</MenuItem>)}
          </TextField>
          {example === 'people' && <TextField select label="Dataset size" size="small" sx={{ minWidth: 180 }} value={count}
            onChange={event => {
              setCount(Number(event.target.value));
              setState(previous => ({ ...previous, page: 0, selectedIds: [], expandedIds: [] }));
              setMessage('');
            }}>
            {[0, 100, 1000, 5000, 10000].map(size => <MenuItem key={size} value={size}>
              {size === 0 ? 'Empty dataset' : `${size.toLocaleString('en-US')} people`}
            </MenuItem>)}
          </TextField>}
          {example === 'people' && <TextField select label="Page size" size="small" sx={{ minWidth: 130 }} value={state.pageSize} disabled={!features.pagination}
            onChange={event => setState(previous => ({ ...previous, pageSize: Number(event.target.value), page: 0 }))}>
            {[10, 25, 50, 100].map(size => <MenuItem key={size} value={size}>{size}</MenuItem>)}
          </TextField>}
        </Stack>
        {example === 'people' && <Box component="details">
          <Box component="summary" sx={{ cursor: 'pointer', fontWeight: 600 }}>Table options</Box>
          <Stack direction="row" useFlexGap sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'center', my: 2 }}>
          <TextField select label="Selection toolbar" size="small" value={selectionToolbar} sx={{ minWidth: 180 }}
            onChange={event => setSelectionToolbar(event.target.value as typeof selectionToolbar)}>
            {(['inline', 'above', 'replace', 'none'] as const).map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
          </TextField>
          <FormControlLabel label="Show table state" control={<Switch checked={inspect} onChange={(_, checked) => setInspect(checked)} />} />
          <FormControlLabel label="Single selection" control={<Switch checked={single} onChange={(_, checked) => {
            setSingle(checked); setState(previous => ({ ...previous, selectedIds: [] }));
          }} />} />
          <FormControlLabel label="Match all selected skills" control={<Switch checked={allSkills} onChange={(_, checked) => setAllSkills(checked)} />} />
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
        </Box>}
      </Paper>

      {example === 'people' && !features.pagination && count >= 1000 && <Alert severity="info" sx={{ mb: 2 }}>
        Pagination is off: all matching rows render at once. Large datasets may take a moment.
      </Alert>}

      {example === 'people' && <DataTable caption="People directory" rows={rows} columns={activeColumns} getRowId={row => row.id}
        state={state} onStateChange={setState} pageSizeOptions={[10, 25, 50, 100]}
        search={features.search} pagination={features.pagination} selectable={features.selection && (single ? 'single' : true)}
        selectOnClick={features.clickSelection} selectAllScope={features.filteredSelection ? 'filtered' : 'page'}
        selectionCheckboxes={!features.hideCheckboxes} selectAll={!features.hideSelectAll} selectionToolbar={selectionToolbar}
        searchDisplay={features.toggleSearch ? 'toggle' : 'always'} searchDebounceMs={features.debounce ? 200 : 0}
        caseSensitive={features.caseSensitive} jumpToPage={features.jump} fixedSelection={features.stickyColumns}
        isRowSelectable={row => !features.eligible || row.remote} isRowExpandable={row => !features.eligible || row.remote}
        expandAll={features.expandAll} columnReordering={features.columnReordering} columnResizing={features.columnResizing}
        stickyHeader={features.sticky} maxHeight={features.sticky ? 480 : undefined}
        responsive={features.stacked ? 'stacked' : 'scroll'} filterMode={features.confirm ? 'confirm' : 'immediate'}
        filterDisplay={features.inlineFilters ? 'inline' : 'popover'} components={{ ToolbarButton: features.textButtons ? TextToolbarButton : undefined }}
        emptyContent={<Typography>No matching rows</Typography>}
        rowSx={row => ({ bgcolor: row.status === 'On leave' ? 'action.hover' : undefined })}
        columnControls={features.columnControls} csvFileName={features.csv ? 'people.csv' : undefined} printable={features.print}
        renderExpanded={features.expansion ? row => <Stack spacing={0.5} sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 600 }}>{row.name} · {row.id}</Typography>
          <Typography>{row.email}</Typography>
          <Typography variant="body2">{row.team} · {row.location} · {row.status}</Typography>
          <Typography variant="body2">Joined {row.joined} · {row.projects} projects · {row.remote ? 'Works remotely' : 'Office based'}</Typography>
        </Stack> : undefined}
        renderBulkActions={ids => <Button onClick={() => setMessage(`Selected IDs: ${ids.join(', ')}`)}>Show IDs</Button>}
      />}
      {message && <Alert severity="info" role="status" sx={{ mt: 2, overflowWrap: 'anywhere' }} onClose={() => setMessage('')}>{message}</Alert>}

      {inspect && example === 'people' && <Paper component="section" aria-labelledby="state-heading" variant="outlined" sx={{ mt: 3, p: 2 }}>
        <Typography id="state-heading" variant="h6" component="h2">Live table state</Typography>
        <Box component="pre" sx={{ m: 0, mt: 2, overflow: 'auto', maxHeight: 360, fontSize: 13 }}>{JSON.stringify(state, null, 2)}</Box>
      </Paper>}
      {example === 'server' && <ServerDemo />}
      {example === 'nested' && <HierarchyDemo />}
      {example === 'custom' && <CustomizationDemo />}
    </Container>
  </ThemeProvider>;
}
