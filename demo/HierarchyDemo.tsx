import {useMemo, useState} from 'react'
import {Box, Button, FormControlLabel, Stack, Switch, TableCell, TableRow, Typography} from '@mui/material'
import {createTableState, DataTable} from '../src/index.js'
import type {ColumnDefinition} from '../src/index.js'

type Item = {id: string; name: string; north: number; south: number; actual: number; planned: number; children?: Item[]}
const item = (id: string, name: string, north: number, south: number, planned: number, children?: Item[]): Item => ({
  id,
  name,
  north,
  south,
  actual: north + south,
  planned,
  children
})
const initial = [
  item('products', 'Products', 360, 280, 720, [
    item('hardware', 'Hardware', 220, 160, 420, [
      item('devices', 'Devices', 140, 100, 260),
      item('parts', 'Parts', 80, 60, 160)
    ]),
    item('software', 'Software', 140, 120, 300)
  ]),
  item('services', 'Services', 180, 220, 450, [
    item('consulting', 'Consulting', 100, 140, 260),
    item('support', 'Support', 80, 80, 190)
  ]),
  item('other', 'Other', 45, 35, 100)
]

export function HierarchyDemo() {
  const [state, setState] = useState(() =>
    createTableState({pageSize: 5, expandedIds: ['products'], expandedColumnIds: ['performance', 'regional']})
  )
  const [sticky, setSticky] = useState(true)
  const [stacked, setStacked] = useState(false)
  const [rows, setRows] = useState(initial)
  const [action, setAction] = useState('')
  const columns = useMemo<ColumnDefinition<Item>[]>(
    () => [
      {
        id: 'name',
        header: 'Department',
        value: row => row.name,
        sticky: sticky ? 'left' : undefined,
        hideable: false,
        draggable: false,
        filterType: 'text'
      },
      {
        id: 'performance',
        header: 'Performance',
        value: row => row.actual + row.planned,
        columns: [
          {id: 'actual', header: 'Actual', value: row => row.actual, align: 'right', filterType: 'numberRange'},
          {
            id: 'planned',
            header: 'Planned',
            value: row => row.planned,
            align: 'right',
            sortDescFirst: true,
            renderHeader: () => <strong>Planned</strong>
          },
          {
            id: 'regional',
            header: 'Regional',
            value: row => row.north + row.south,
            columns: [
              {id: 'north', header: 'North', value: row => row.north, align: 'right'},
              {id: 'south', header: 'South', value: row => row.south, align: 'right'}
            ]
          }
        ]
      },
      {
        id: 'variance',
        header: 'Variance',
        value: row => row.actual - row.planned,
        sticky: sticky ? 'right' : undefined,
        align: 'right',
        render: value => <Box component='span' sx={{fontWeight: 600}}>
          {String(value)}
        </Box>
      }
    ],
    [sticky]
  )
  const reset = () => {
    setRows(initial)
    setState(createTableState({pageSize: 5, expandedIds: ['products'], expandedColumnIds: ['performance', 'regional']}))
    setAction('')
  }
  return <Box component='section' aria-labelledby='hierarchy-heading' sx={{mt: 4}}>
    <Stack direction='row' useFlexGap sx={{gap: 2, alignItems: 'center', flexWrap: 'wrap'}}>
      <Typography id='hierarchy-heading' component='h2' variant='h5'>
        Nested rows and columns
      </Typography>
      <Button onClick={reset}>Reset report</Button>
      <FormControlLabel
        label='Sticky report columns'
        control={<Switch checked={sticky} onChange={(_, checked) => setSticky(checked)} />}
      />
      <FormControlLabel
        label='Stack report on mobile'
        control={<Switch checked={stacked} onChange={(_, checked) => setStacked(checked)} />}
      />
    </Stack>
    <Typography sx={{my: 2}}>
      Expand departments and column groups. Parent values are supplied totals; collapsing a group shows its aggregate.
      These records are synthetic.
    </Typography>
    <DataTable
      caption='Department report'
      rows={rows}
      columns={columns}
      getRowId={row => row.id}
      getSubRows={row => row.children}
      state={state}
      onStateChange={setState}
      onAction={event => setAction(event)}
      selectable
      isRowSelectable={row => !row.children?.length}
      expandOnClick
      expandAll
      columnControls
      columnResizing
      columnReordering
      stickyHeader
      maxHeight={480}
      fixedSelection={sticky}
      responsive={stacked ? 'stacked' : 'scroll'}
      jumpToPage
      pageSizeOptions={[1, 5, 10]}
      csvFileName='department-report.csv'
      csvOptions={{delimiter: ';'}}
      printable
      onRowsDelete={ids => {
        const remove = new Set(ids)
        const prune = (items: Item[]): Item[] =>
          items
            .filter(row => !remove.has(row.id))
            .map(row => {
              if (!row.children) return row
              const children = prune(row.children)
              const north = children.reduce((sum, child) => sum + child.north, 0)
              const south = children.reduce((sum, child) => sum + child.south, 0)
              return {
                ...row,
                children,
                north,
                south,
                actual: north + south,
                planned: children.reduce((sum, child) => sum + child.planned, 0)
              }
            })
        setRows(previous => prune(previous))
      }}
      rowSx={row => ({fontWeight: row.children?.length ? 600 : 400})}
      renderSummary={(_, visible) => <TableRow>
        <TableCell colSpan={visible.length + 2}>
          Top-level total: {rows.reduce((sum, row) => sum + row.actual, 0)} actual ·{' '}
          {rows.reduce((sum, row) => sum + row.planned, 0)} planned
        </TableCell>
      </TableRow>}
    />
    <Typography role='status' variant='body2' sx={{mt: 1}}>
      Last report action: {action || 'none'}
    </Typography>
  </Box>
}
