import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Chip, Container, CssBaseline, Typography } from '@mui/material';
import { DataTable } from '../src/index.js';
import type { Column } from '../src/index.js';

const people = [
  { id: 'ada', name: 'Ada', team: 'Engineering', location: 'London' },
  { id: 'ben', name: 'Ben', team: 'Design', location: 'Berlin' },
  { id: 'cleo', name: 'Cleo', team: 'Engineering', location: 'Bengaluru' },
  { id: 'dev', name: 'Dev', team: 'Operations', location: 'Singapore' },
  { id: 'erin', name: 'Erin', team: 'Design', location: 'London' },
  { id: 'farah', name: 'Farah', team: 'Operations', location: 'Dubai' },
];
const columns: Column<(typeof people)[number]>[] = [
  { id: 'name', header: 'Name', value: row => row.name },
  { id: 'team', header: 'Team', value: row => row.team, filterable: true,
    render: value => <Chip label={String(value)} size="small" variant="outlined" /> },
  { id: 'location', header: 'Location', value: row => row.location, filterable: true },
];

function Demo() {
  const [message, setMessage] = useState('');
  return (
    <>
      <CssBaseline />
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Typography variant="h4" component="h1" gutterBottom>MUI Tablekit</Typography>
        <Typography sx={{ mb: 3 }}>Search, filter, sort, and select people across pages.</Typography>
        <DataTable caption="People" rows={people} columns={columns} getRowId={row => row.id}
          selectable defaultState={{ pageSize: 3 }} pageSizeOptions={[3, 6]}
          renderBulkActions={ids => <Button onClick={() => setMessage(`Selected IDs: ${ids.join(', ')}`)}>Show IDs</Button>} />
        <Typography role="status" sx={{ mt: 2 }}>{message}</Typography>
      </Container>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Demo />);
