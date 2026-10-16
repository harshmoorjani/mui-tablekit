/// <reference types="vite/client" />
import {forwardRef, useState} from 'react'
import type {ComponentPropsWithoutRef} from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import type {ButtonProps, CheckboxProps, ChipProps, TablePaginationProps} from '@mui/material'
import {DataTable} from '../src/index.js'
import type {
  Column,
  DataTableProps,
  FilterControlProps,
  SearchControlProps,
  TableComponents,
  ToolbarButtonProps
} from '../src/index.js'
import source from './CustomizationDemo.tsx?raw'

// example: Table
const FramedTable = forwardRef<HTMLTableElement, ComponentPropsWithoutRef<'table'>>((props, ref) => <table
  {...props}
  ref={ref}
  style={{...props.style, border: '2px solid currentColor'}}
/>)
const RuledTable = forwardRef<HTMLTableElement, ComponentPropsWithoutRef<'table'>>((props, ref) => <table
  {...props}
  ref={ref}
  style={{...props.style, borderTop: '4px double currentColor', borderBottom: '4px double currentColor'}}
/>)
// example: Head
const UnderlinedHead = forwardRef<HTMLTableSectionElement, ComponentPropsWithoutRef<'thead'>>((props, ref) => <thead
  {...props}
  ref={ref}
  style={{...props.style, borderBottom: '3px solid currentColor'}}
/>)
const UppercaseHead = forwardRef<HTMLTableSectionElement, ComponentPropsWithoutRef<'thead'>>((props, ref) => <thead
  {...props}
  ref={ref}
  style={{...props.style, textTransform: 'uppercase', letterSpacing: '.08em'}}
/>)
// example: Body
const DividedBody = forwardRef<HTMLTableSectionElement, ComponentPropsWithoutRef<'tbody'>>((props, ref) => <tbody
  {...props}
  ref={ref}
  style={{...props.style, borderBottom: '3px double currentColor'}}
/>)
const InsetBody = forwardRef<HTMLTableSectionElement, ComponentPropsWithoutRef<'tbody'>>((props, ref) => <tbody
  {...props}
  ref={ref}
  style={{...props.style, outline: '1px dashed currentColor', outlineOffset: '-3px'}}
/>)
// example: Row
const RuledRow = forwardRef<HTMLTableRowElement, ComponentPropsWithoutRef<'tr'>>((props, ref) => <tr
  {...props}
  ref={ref}
  style={{...props.style, borderBottom: '2px dotted currentColor'}}
/>)
const AccentedRow = forwardRef<HTMLTableRowElement, ComponentPropsWithoutRef<'tr'>>((props, ref) => <tr
  {...props}
  ref={ref}
  style={{...props.style, borderInlineStart: '4px solid currentColor'}}
/>)
// example: Cell
const MonoCell = forwardRef<HTMLTableCellElement, ComponentPropsWithoutRef<'td'>>((props, ref) => <td
  {...props}
  ref={ref}
  style={{...props.style, fontFamily: 'monospace'}}
/>)
const MarkedCell = forwardRef<HTMLTableCellElement, ComponentPropsWithoutRef<'td'>>(({children, ...props}, ref) => <td
  {...props}
  ref={ref}>
  <span style={{display: 'flex', alignItems: 'center', gap: 4, minWidth: 0}}>
    <span aria-hidden='true'>·</span>
    {children}
  </span>
</td>)
// example: Pagination
function StepPagination({count, page, rowsPerPage, onPageChange}: TablePaginationProps) {
  const pages = Math.max(1, Math.ceil(count / rowsPerPage))
  return <Stack direction='row' sx={{gap: 1, alignItems: 'center', p: 1, flexWrap: 'wrap'}}>
    <Button disabled={!page} onClick={event => onPageChange(event, page - 1)}>
      Previous
    </Button>
    <span aria-live='polite'>
      Page {page + 1} of {pages}
    </span>
    <Button disabled={page + 1 >= pages} onClick={event => onPageChange(event, page + 1)}>
      Next
    </Button>
  </Stack>
}
function NumberPagination({count, page, rowsPerPage, onPageChange}: TablePaginationProps) {
  return <Stack direction='row' sx={{gap: 0.5, p: 1, flexWrap: 'wrap'}}>
    {Array.from({length: Math.max(1, Math.ceil(count / rowsPerPage))}, (_, index) => <Button
      key={index}
      size='small'
      aria-label={`Page ${index + 1}`}
      aria-current={page === index ? 'page' : undefined}
      variant={page === index ? 'contained' : 'outlined'}
      onClick={event => onPageChange(event, index)}>
      {index + 1}
    </Button>)}
  </Stack>
}
// example: Checkbox
function SquareCheckbox(props: CheckboxProps) {
  return <Checkbox
    {...props}
    icon={<span aria-hidden='true'>□</span>}
    checkedIcon={<span aria-hidden='true'>■</span>}
    indeterminateIcon={<span aria-hidden='true'>▣</span>}
  />
}
function RoundCheckbox(props: CheckboxProps) {
  return <Checkbox
    {...props}
    icon={<span aria-hidden='true'>○</span>}
    checkedIcon={<span aria-hidden='true'>●</span>}
    indeterminateIcon={<span aria-hidden='true'>◐</span>}
  />
}
// example: ExpandButton
function TextExpand({children: _children, ...props}: ButtonProps) {
  return <Button {...props} size='small'>
    {props['aria-expanded'] ? 'Less' : 'More'}
  </Button>
}
function ArrowExpand({children: _children, ...props}: ButtonProps) {
  return <Button {...props} size='small' variant='outlined'>
    <span aria-hidden='true'>{props['aria-expanded'] ? '▾' : '▸'}</span>
  </Button>
}
// example: FilterChip
function OutlinedFilter(props: ChipProps) {
  return <Chip {...props} variant='outlined' color='primary' />
}
function RoundedFilter(props: ChipProps) {
  return <Chip {...props} color='secondary' sx={{borderRadius: 1}} />
}
// example: Toolbar
const BorderedToolbar = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>((props, ref) => <div
  {...props}
  ref={ref}
  style={{...props.style, borderBlock: '2px solid currentColor'}}
/>)
const DashedToolbar = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>((props, ref) => <div
  {...props}
  ref={ref}
  style={{...props.style, border: '1px dashed currentColor', borderRadius: 8}}
/>)
// example: ToolbarButton
function TextAction({label, active, expanded, onClick}: ToolbarButtonProps) {
  return <Button
    size='small'
    variant={active ? 'contained' : 'text'}
    aria-pressed={active}
    aria-expanded={expanded}
    onClick={onClick}>
    {label}
  </Button>
}
function LabeledAction({label, active, expanded, onClick, children}: ToolbarButtonProps) {
  return <Button
    size='small'
    variant='outlined'
    startIcon={children}
    aria-pressed={active}
    aria-expanded={expanded}
    onClick={onClick}>
    {label}
  </Button>
}
// example: renderSearch
function UnderlineSearch({id, label, value, onChange, autoFocus}: SearchControlProps) {
  return <TextField
    id={id}
    type='search'
    variant='standard'
    label={label}
    value={value}
    autoFocus={autoFocus}
    onChange={event => onChange(event.target.value)}
    size='small'
    sx={{width: 200}}
  />
}
function ClearableSearch({id, label, value, onChange, autoFocus}: SearchControlProps) {
  return <Stack direction='row' sx={{alignItems: 'center', gap: 0.5}}>
    <TextField
      id={id}
      type='search'
      placeholder='Find an item…'
      slotProps={{htmlInput: {'aria-label': label}}}
      value={value}
      autoFocus={autoFocus}
      onChange={event => onChange(event.target.value)}
      size='small'
      sx={{width: 180}}
    />
    <Button size='small' disabled={!value} onClick={() => onChange('')}>
      Clear
    </Button>
  </Stack>
}
// example: renderFilter
function StatusSelect({id, label, value, onChange}: FilterControlProps) {
  return <TextField
    id={id}
    select
    size='small'
    label={label}
    value={value ?? ''}
    onChange={event => onChange(event.target.value)}
    sx={{minWidth: 140}}>
    <MenuItem value=''>All</MenuItem>
    <MenuItem value='Ready'>Ready</MenuItem>
    <MenuItem value='Draft'>Draft</MenuItem>
  </TextField>
}
function StatusButtons({id, label, value, onChange}: FilterControlProps) {
  return <Box role='group' aria-label={label} id={id}>
    <Typography variant='caption'>{label}</Typography>
    <Stack direction='row' sx={{gap: 0.5}}>
      {['', 'Ready', 'Draft'].map(status => <Button
        key={status}
        size='small'
        variant={value === status ? 'contained' : 'outlined'}
        onClick={() => onChange(status)}>
        {status || 'All'}
      </Button>)}
    </Stack>
  </Box>
}
// example: renderHeader
const badgeHeader: Column<Item>['renderHeader'] = column => <Chip
  size='small'
  label={column.header}
  variant='outlined'
/>
const stackedHeader: Column<Item>['renderHeader'] = column => <span>
  {column.header}
  <small style={{display: 'block', fontWeight: 400}}>Workflow stage</small>
</span>
// example: render
const badgeValue: Column<Item>['render'] = value => <Chip
  size='small'
  label={String(value)}
  color={value === 'Ready' ? 'success' : 'default'}
/>
const markedValue: Column<Item>['render'] = value => <span>
  <span aria-hidden='true'>{value === 'Ready' ? '✓' : '◇'} </span>
  {String(value)}
</span>
// example: renderToolbar
const groupedToolbar: DataTableProps<Item>['renderToolbar'] = controls => <>
  {controls.filters}
  {controls.search}
  <Box sx={{flex: 1}} />
  {controls.selection}
  {controls.columns}
  {controls.csv}
  {controls.print}
  {controls.custom}
</>
const stackedToolbar: DataTableProps<Item>['renderToolbar'] = controls => <Stack sx={{width: '100%', gap: 1}}>
  <Stack direction='row' sx={{gap: 1, flexWrap: 'wrap', alignItems: 'center'}}>
    {controls.filters}
    {controls.search}
    {controls.selection}
  </Stack>
  <Stack direction='row' sx={{gap: 1, flexWrap: 'wrap', alignItems: 'center'}}>
    {controls.columns}
    {controls.csv}
    {controls.print}
    {controls.custom}
  </Stack>
</Stack>
// example: renderRow
const stripedRow: DataTableProps<Item>['renderRow'] = (row, context, cells) => <TableRow
  selected={context.selected}
  sx={{bgcolor: Number(row.id) % 2 ? 'action.hover' : undefined}}>
  {cells}
</TableRow>
const priorityRow: DataTableProps<Item>['renderRow'] = (row, context, cells) => <TableRow
  selected={context.selected}
  sx={{
    '& > td:first-of-type': {
      borderLeft: row.status === 'Ready' ? '4px solid' : '4px dotted',
      borderColor: 'primary.main'
    }
  }}>
  {cells}
</TableRow>
// example: renderSummary
const totalSummary: DataTableProps<Item>['renderSummary'] = (rows, columns) => <TableRow>
  <TableCell colSpan={columns.length + 2}>Total: {rows.reduce((sum, row) => sum + row.quantity, 0)} items</TableCell>
</TableRow>
const statusSummary: DataTableProps<Item>['renderSummary'] = (rows, columns) => <TableRow>
  <TableCell colSpan={columns.length + 2}>
    <Chip size='small' label={`${rows.filter(row => row.status === 'Ready').length} ready`} />
  </TableCell>
</TableRow>
// example: renderBulkActions
function CopyIds({ids}: {ids: readonly string[]}) {
  const [message, setMessage] = useState('')
  return <Stack direction='row' sx={{gap: 1, alignItems: 'center', flexWrap: 'wrap'}}>
    <Button
      size='small'
      onClick={async () => {
        try {
          if (!navigator.clipboard) throw new Error('Clipboard unavailable')
          await navigator.clipboard.writeText(ids.join(', '))
          setMessage('Copied')
        } catch {
          setMessage('Copy unavailable')
        }
      }}>
      Copy selected IDs
    </Button>
    <Typography variant='caption' role='status'>
      {message}
    </Typography>
  </Stack>
}
const inspectBulk: DataTableProps<Item>['renderBulkActions'] = ids => <CopyIds key={JSON.stringify(ids)} ids={ids} />
const countBulk: DataTableProps<Item>['renderBulkActions'] = ids => <Typography variant='caption'>
  Selected IDs: {ids.join(', ')}
</Typography>
// example: renderExpanded
const noteDetails: DataTableProps<Item>['renderExpanded'] = row => <Typography sx={{p: 1}}>
  Notes for {row.name}: synthetic example record.
</Typography>
const cardDetails: DataTableProps<Item>['renderExpanded'] = row => <Paper variant='outlined' sx={{p: 1, m: 1}}>
  <Typography sx={{fontWeight: 600}}>{row.name}</Typography>
  <Typography variant='body2'>
    {row.quantity} items · {row.status}
  </Typography>
</Paper>
// example: header
const noticeHeader = <Alert severity='info' sx={{m: 1}}>
  Custom content above the controls.
</Alert>
const titleHeader = <Typography sx={{p: 1}} variant='overline'>
  Warehouse / Sample collection
</Typography>
// example: footer
const noteFooter = <Typography variant='caption' sx={{display: 'block', p: 1}}>
  Custom footer · all data is synthetic.
</Typography>
const actionFooter = <Box sx={{p: 1, textAlign: 'right'}}>
  <Button size='small' href='https://github.com/harshmoorjani/mui-tablekit'>
    Project source
  </Button>
</Box>
// example: emptyContent
const plainEmpty = <Typography>No results. Try a broader search.</Typography>
const cardEmpty = <Alert severity='info'>Nothing here yet. Add your first record to get started.</Alert>
// example: end

interface Item {
  id: string
  name: string
  status: string
  quantity: number
}
const rows: Item[] = [
  {id: '1', name: 'Desk lamp', status: 'Ready', quantity: 8},
  {id: '2', name: 'Notebook', status: 'Draft', quantity: 12},
  {id: '3', name: 'Travel mug', status: 'Ready', quantity: 6},
  {id: '4', name: 'Cable pouch', status: 'Draft', quantity: 4}
]
const slots = {
  Table: [FramedTable, RuledTable],
  Head: [UnderlinedHead, UppercaseHead],
  Body: [DividedBody, InsetBody],
  Row: [RuledRow, AccentedRow],
  Cell: [MonoCell, MarkedCell],
  Pagination: [StepPagination, NumberPagination],
  Checkbox: [SquareCheckbox, RoundCheckbox],
  ExpandButton: [TextExpand, ArrowExpand],
  FilterChip: [OutlinedFilter, RoundedFilter],
  Toolbar: [BorderedToolbar, DashedToolbar],
  ToolbarButton: [TextAction, LabeledAction]
} satisfies {
  [Key in keyof Required<TableComponents>]: [NonNullable<TableComponents[Key]>, NonNullable<TableComponents[Key]>]
}
const renderers = {
  renderSearch: [UnderlineSearch, ClearableSearch],
  renderToolbar: [groupedToolbar, stackedToolbar],
  renderRow: [stripedRow, priorityRow],
  renderSummary: [totalSummary, statusSummary],
  renderBulkActions: [inspectBulk, countBulk],
  renderExpanded: [noteDetails, cardDetails],
  header: [noticeHeader, titleHeader],
  footer: [noteFooter, actionFooter],
  emptyContent: [plainEmpty, cardEmpty]
}
const columnRenderers = {
  renderFilter: [StatusSelect, StatusButtons],
  renderHeader: [badgeHeader, stackedHeader],
  render: [badgeValue, markedValue]
}
const targets = [...Object.keys(slots), ...Object.keys(columnRenderers), ...Object.keys(renderers)]
const descriptions: Record<string, string> = {
  Table: 'Framed table / Double rules',
  Head: 'Strong rule / Uppercase labels',
  Body: 'Divided section / Inset outline',
  Row: 'Dotted rules / Leading accent',
  Cell: 'Monospace / Leading marker',
  Pagination: 'Previous and next / Numbered buttons',
  Checkbox: 'Square marks / Round marks',
  ExpandButton: 'Text labels / Arrow buttons',
  FilterChip: 'Outlined / Filled rectangular',
  Toolbar: 'Ruled container / Dashed container',
  ToolbarButton: 'Text buttons / Labeled icon buttons',
  renderSearch: 'Underlined input / Input with clear button',
  renderFilter: 'Status select / Segmented buttons',
  renderHeader: 'Badge / Two-line label',
  render: 'Status badge / Status marker',
  renderToolbar: 'Single row / Two rows',
  renderRow: 'Striped rows / Status accent',
  renderSummary: 'Quantity total / Ready count',
  renderBulkActions: 'Copy IDs / Show IDs',
  renderExpanded: 'Plain notes / Detail card',
  header: 'Notice / Section label',
  footer: 'Footnote / Project link',
  emptyContent: 'Plain message / Notice card'
}

export function CustomizationDemo() {
  const [target, setTarget] = useState('ToolbarButton')
  const [variant, setVariant] = useState(0)
  const slot =
    target in slots ? ({[target]: slots[target as keyof typeof slots][variant]} as TableComponents) : undefined
  const renderer = target in renderers ? {[target]: renderers[target as keyof typeof renderers][variant]} : {}
  const columnRenderer =
    target in columnRenderers ? {[target]: columnRenderers[target as keyof typeof columnRenderers][variant]} : {}
  const columns: Column<Item>[] = [
    {id: 'name', header: 'Item', value: row => row.name, filterable: false},
    {
      id: 'status',
      header: 'Status',
      value: row => row.status,
      filterType: 'select',
      filterOptions: [
        {value: 'Ready', label: 'Ready'},
        {value: 'Draft', label: 'Draft'}
      ],
      ...columnRenderer
    },
    {id: 'quantity', header: 'Quantity', value: row => row.quantity, align: 'right', filterable: false}
  ]
  const section = source.split(`// example: ${target}\n`)[1]?.split('// example: ')[0]?.trim()
  return <Stack sx={{gap: 2}}>
    <Stack direction='row' sx={{gap: 2, flexWrap: 'wrap'}}>
      <TextField
        select
        size='small'
        label='Customization target'
        value={target}
        onChange={event => {
          setTarget(event.target.value)
          setVariant(0)
        }}
        sx={{minWidth: 210}}>
        {targets.map(name => <MenuItem key={name} value={name}>
          {name}
        </MenuItem>)}
      </TextField>
      <TextField
        select
        size='small'
        label='Implementation'
        value={variant}
        onChange={event => setVariant(Number(event.target.value))}
        sx={{minWidth: 230}}>
        {(descriptions[target] ?? '').split(' / ').map((name, index) => <MenuItem key={name} value={index}>
          {name}
        </MenuItem>)}
      </TextField>
    </Stack>
    <Typography variant='body2' color='text.secondary'>
      Each example replaces the selected component or renderer. Try its controls, then open the code below. Selection,
      expansion, and a removable filter are enabled for inspection.
    </Typography>
    <Box sx={{width: 608, maxWidth: '100%'}}>
      <DataTable
        key={`${target}-${variant}`}
        caption='Custom component preview'
        rows={target === 'emptyContent' ? [] : rows}
        columns={columns}
        getRowId={row => row.id}
        components={slot}
        selectable
        columnControls
        printable
        csvFileName='custom-example.csv'
        pageSizeOptions={[1, 2, 4]}
        defaultState={{
          pageSize: 2,
          filters: target === 'FilterChip' ? {status: 'Ready'} : {},
          selectedIds: target === 'renderBulkActions' ? ['1'] : [],
          expandedIds: target === 'renderExpanded' ? ['1'] : []
        }}
        filterDisplay={target === 'renderFilter' ? 'inline' : 'popover'}
        renderExpanded={noteDetails}
        {...renderer}
      />
    </Box>
    <Box component='details' sx={{border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5}}>
      <Box component='summary' sx={{cursor: 'pointer', fontWeight: 600}}>
        Component code · {target}
      </Box>
      <Typography variant='caption' component='p'>
        Both implementations shown; imports use React and @mui/material. Pass the selected function through{' '}
        {target in slots ? `components.${target}` : target in columnRenderers ? `column.${target}` : target}.
      </Typography>
      <Box component='pre' sx={{overflow: 'auto', fontSize: 12, m: 0, mt: 1, maxHeight: 420}}>
        <code>{section}</code>
      </Box>
    </Box>
  </Stack>
}
