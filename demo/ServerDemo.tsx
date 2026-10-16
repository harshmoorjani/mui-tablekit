import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import { DataTable, createTableState } from '../src/index.js';
import type { Column } from '../src/index.js';
import { getView } from '../src/model.js';
import { createPeople, teams } from './data.js';
import type { Person } from './data.js';
import { directoryQuery, restoreView, saveView } from './serverAdapter.js';

const rows = createPeople(1000);
const columns: Column<Person>[] = [
  { id: 'name', header: 'Name', value: row => row.name },
  { id: 'team', header: 'Team', value: row => row.team, filterType: 'multiselect', filterOptions: teams.map(value => ({ value, label: value })) },
  { id: 'age', header: 'Age', value: row => row.age, filterType: 'numberRange' },
  { id: 'joined', header: 'Joined', value: row => row.joined, filterType: 'dateRange' },
];

// Replace this function with fetch(url, { signal }); the table owns no requests.
async function loadDirectory(query: ReturnType<typeof directoryQuery>, signal: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, 120);
    function cancel() { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); }
    if (signal.aborted) cancel(); else signal.addEventListener('abort', cancel, { once: true });
  });
  const [columnId, direction] = query.sortOrder?.split('|') ?? [];
  const view = getView(rows, columns, createTableState({
    search: query.searchText,
    filters: { team: query.teams, age: { min: query.fromAge?.toString() ?? '', max: query.toAge?.toString() ?? '' },
      joined: { min: query.fromDate ?? '', max: query.toDate ?? '' } },
    sort: columnId && (direction === 'asc' || direction === 'desc') ? { columnId, direction } : null,
    page: query.pageNo - 1, pageSize: query.pageSize,
  }));
  return { rows: view.rows, count: view.count, page: view.page };
}

export function ServerDemo() {
  const storageKey = `mui-tablekit:server-demo:${location.pathname}`;
  const [state, setState] = useState(() => {
    try { return restoreView(sessionStorage.getItem(storageKey)); } catch { return createTableState(); }
  });
  const [search, setSearch] = useState(state.search);
  const [result, setResult] = useState<{ rows: readonly Person[]; count: number; request?: object }>({ rows: [], count: 0 });
  const [status, setStatus] = useState('Loading…');
  const [retry, setRetry] = useState(0);
  const { filters, sort, page, pageSize } = state;
  const request = useMemo(() => ({ search, filters, sort, page, pageSize }), [search, filters, sort, page, pageSize]);
  const ready = result.request === request && state.search === search;
  useEffect(() => {
    const timer = setTimeout(() => setSearch(state.search), 200);
    return () => clearTimeout(timer);
  }, [state.search]);
  useEffect(() => { try { sessionStorage.setItem(storageKey, saveView(state)); } catch { /* Storage may be disabled. */ } }, [storageKey, state]);
  useEffect(() => {
    if (state.search !== search) return;
    const controller = new AbortController();
    setResult({ rows: [], count: 0 });
    setStatus('Loading…');
    (async () => {
      try {
        const response = await loadDirectory(directoryQuery(request), controller.signal);
        if (controller.signal.aborted) return;
        if (response.page !== request.page) { setState(previous => ({ ...previous, page: response.page })); return; }
        setResult({ ...response, request }); setStatus('');
      } catch (error) {
        if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : 'Unable to load rows.');
      }
    })();
    return () => controller.abort();
  }, [request, state.search, search, retry]);
  return <Box component="section" aria-labelledby="server-heading" sx={{ mt: 4 }}>
    <Typography id="server-heading" component="h2" variant="h5">Server adapter example</Typography>
    <Typography sx={{ my: 2 }}>Simulated requests, 200 ms search debounce, cancellation, one-based backend pages, and a route-scoped saved view. Reload to restore the view; selection is never saved.</Typography>
    {status && <Alert role="status" severity={status === 'Loading…' ? 'info' : 'error'} sx={{ mb: 2 }}
      action={status !== 'Loading…' && <Button onClick={() => setRetry(value => value + 1)}>Retry</Button>}>{status}</Alert>}
    <DataTable caption="Server directory" mode="server" columns={columns} rows={ready ? result.rows : []} rowCount={ready ? result.count : 0}
      pagination={ready}
      getRowId={row => row.id} state={state} onStateChange={next => {
        const changed = next.search !== state.search || next.filters !== state.filters || next.sort !== state.sort;
        setState(changed ? { ...next, selectedIds: [] } : next);
      }} selectable />
  </Box>;
}
