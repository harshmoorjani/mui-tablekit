import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Chip, Container, CssBaseline, Typography } from '@mui/material';
import { DataTable } from '../src/index.js';
import type { Column } from '../src/index.js';

const people = [
  { id: 'ada', name: 'Ada', team: 'Engineering', location: 'London', age: 36, joined: '2023-01-10' },
  { id: 'ben', name: 'Ben', team: 'Design', location: 'Berlin', age: 28, joined: '2024-03-15' },
  { id: 'cleo', name: 'Cleo', team: 'Engineering', location: 'Bengaluru', age: 32, joined: '2024-07-01' },
  { id: 'dev', name: 'Dev', team: 'Operations', location: 'Singapore', age: 41, joined: '2022-11-20' },
  { id: 'erin', name: 'Erin', team: 'Design', location: 'London', age: 30, joined: '2025-02-01' },
  { id: 'farah', name: 'Farah', team: 'Operations', location: 'Dubai', age: 34, joined: '2023-09-12' },
];
const columns: Column<(typeof people)[number]>[] = [
  { id: 'name', header: 'Name', value: row => row.name },
  { id: 'team', header: 'Team', value: row => row.team, filterType: 'multiselect',
    filterOptions: ['Engineering', 'Design', 'Operations'].map(value => ({ value, label: value })),
    render: value => <Chip label={String(value)} size="small" variant="outlined" /> },
  { id: 'location', header: 'Location', value: row => row.location, filterType: 'select',
    filterOptions: [...new Set(people.map(row => row.location))].map(value => ({ value, label: value })) },
  { id: 'age', header: 'Age', value: row => row.age, align: 'right', filterType: 'numberRange' },
  { id: 'joined', header: 'Joined', value: row => row.joined, filterType: 'dateRange' },
];

function Demo() {
  const [message, setMessage] = useState('');
  return (
    <>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Typography variant="h4" component="h1" gutterBottom>MUI Tablekit</Typography>
        <Typography sx={{ mb: 3 }}>Search, filter, sort, expand, and select people across pages.</Typography>
        <DataTable caption="People" rows={people} columns={columns} getRowId={row => row.id}
          selectable defaultState={{ pageSize: 3 }} pageSizeOptions={[3, 6]}
          columnControls csvFileName="people.csv" printable
          renderExpanded={row => <Typography>{row.name} joined {row.team} on {row.joined}.</Typography>}
          renderBulkActions={ids => <Button onClick={() => setMessage(`Selected IDs: ${ids.join(', ')}`)}>Show IDs</Button>} />
        <Typography role="status" sx={{ mt: 2 }}>{message}</Typography>
      </Container>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Demo />);
