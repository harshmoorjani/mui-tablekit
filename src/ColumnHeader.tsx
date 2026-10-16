import {useEffect, useRef, useState} from 'react'
import {Box, Button, TableCell, TableSortLabel} from '@mui/material'
import {columnWidth} from './model.js'
import type {Column, TableLabels, TableState} from './types.js'
import type {SxProps, Theme} from '@mui/material/styles'

export function ColumnHeader<Row>({
  column,
  columns,
  state,
  labels,
  update,
  reorder,
  resize,
  tableId,
  id,
  rowSpan = 1,
  sx,
  groupToggle,
  dragSource,
  onDragSourceChange
}: {
  column: Column<Row>
  columns: readonly Column<Row>[]
  state: TableState
  labels: TableLabels
  update: (patch: Partial<TableState>) => void
  reorder: boolean
  resize: boolean
  tableId: string
  id?: string
  rowSpan?: number
  sx?: SxProps<Theme>
  groupToggle?: () => void
  dragSource?: string
  onDragSourceChange: (id?: string) => void
}) {
  const start = useRef<{x: number; width: number} | null>(null)
  const [dropSide, setDropSide] = useState<'before' | 'after'>()
  useEffect(() => {
    setDropSide(undefined)
  }, [dragSource])
  const width = columnWidth(state.columnWidths, column.id)
  const setWidth = (value: number) =>
    update({
      columnWidths: {
        ...state.columnWidths,
        [column.id]: Math.min(1000, Math.max(80, value))
      }
    })
  const canMove = (source: string, target: string) => {
    const from = columns.findIndex(entry => entry.id === source)
    const to = columns.findIndex(entry => entry.id === target)
    return from >= 0 &&
      to >= 0 &&
      from !== to &&
      columns[from]?.sticky === columns[to]?.sticky &&
      !columns.slice(Math.min(from, to), Math.max(from, to) + 1).some(column => column.draggable === false)
  }
  const move = (source: string, target: string, side?: 'before' | 'after') => {
    const order = columns.map(entry => entry.id)
    const from = order.indexOf(source)
    const to = order.indexOf(target)
    if (!canMove(source, target)) return
    order.splice(from, 1)
    order.splice(order.indexOf(target) + ((side ?? (from < to ? 'after' : 'before')) === 'after' ? 1 : 0), 0, source)
    update({columnOrder: order})
  }
  return <TableCell
    id={id}
    rowSpan={rowSpan}
    scope='col'
    role='columnheader'
    align={column.align}
    data-drop-side={dragSource && dropSide && canMove(dragSource, column.id) ? dropSide : undefined}
    sx={[
      {position: 'relative', whiteSpace: 'nowrap', overflow: 'hidden', pr: resize ? 2 : 1.5},
      ...(Array.isArray(sx) ? sx : [sx ?? {}]),
      ...(Array.isArray(column.headerSx) ? column.headerSx : [column.headerSx ?? {}]),
      dragSource && dropSide && canMove(dragSource, column.id)
        ? {boxShadow: theme => `inset ${dropSide === 'before' ? 3 : -3}px 0 ${theme.palette.primary.main}`}
        : {}
    ]}
    sortDirection={state.sort?.columnId === column.id ? state.sort.direction : false}
    onDragOver={event => {
      if (!reorder || !dragSource || !canMove(dragSource, column.id)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      const bounds = event.currentTarget.getBoundingClientRect()
      setDropSide(event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after')
    }}
    onDragLeave={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropSide(undefined)
    }}
    onDrop={event => {
      if (!reorder) return
      event.preventDefault()
      const prefix = `${tableId}\n`
      const data = event.dataTransfer.getData('text/plain')
      if (data.startsWith(prefix)) move(data.slice(prefix.length), column.id, dropSide)
      setDropSide(undefined)
      onDragSourceChange()
    }}>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        minWidth: 0,
        justifyContent: column.align === 'right' ? 'flex-end' : column.align === 'center' ? 'center' : 'flex-start'
      }}>
      {groupToggle && <Button
        size='small'
        sx={{minWidth: 20, width: 20, p: 0, flexShrink: 0}}
        data-group-toggle={column.id}
        aria-label={labels.expandColumns(column.header)}
        aria-expanded={false}
        onClick={groupToggle}>
        +
      </Button>}
      {reorder && column.draggable !== false && <Button
        size='small'
        draggable
        aria-label={labels.dragColumn(column.header)}
        sx={{minWidth: 20, width: 20, p: 0, flexShrink: 0, cursor: 'grab', color: 'text.secondary'}}
        onDragStart={event => {
          event.dataTransfer.setData('text/plain', `${tableId}\n${column.id}`)
          event.dataTransfer.effectAllowed = 'move'
          onDragSourceChange(column.id)
        }}
        onDragEnd={() => {
          onDragSourceChange()
          setDropSide(undefined)
        }}
        onKeyDown={event => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
          event.preventDefault()
          const target =
            columns[columns.findIndex(entry => entry.id === column.id) + (event.key === 'ArrowLeft' ? -1 : 1)]
          if (target) move(column.id, target.id)
        }}>
        ↔
      </Button>}
      {column.sortable === false ? <Box
        component='span'
        title={column.header}
        sx={{minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis'}}>
        {column.renderHeader?.(column) ?? column.header}
      </Box> : <TableSortLabel
        active={state.sort?.columnId === column.id}
        title={column.header}
        sx={{
          'flexDirection': 'row',
          'minWidth': 0,
          'maxWidth': '100%',
          '& .MuiTableSortLabel-icon': {flexShrink: 0, fontSize: 16, mx: 0.25}
        }}
        direction={state.sort?.columnId === column.id ? state.sort.direction : 'asc'}
        aria-label={labels.sort(column.header)}
        onClick={() => {
          const first = column.sortDescFirst ? 'desc' : 'asc'
          update({
            page: 0,
            sort:
              state.sort?.columnId !== column.id
                ? {columnId: column.id, direction: first}
                : state.sort.direction === first
                  ? {columnId: column.id, direction: first === 'asc' ? 'desc' : 'asc'}
                  : column.sortReset === false
                    ? {columnId: column.id, direction: first}
                    : null
          })
        }}>
        <Box component='span' sx={{minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis'}}>
          {column.renderHeader?.(column) ?? column.header}
        </Box>
      </TableSortLabel>}
    </Box>
    {resize && <Box
      component='span'
      role='separator'
      tabIndex={0}
      aria-orientation='vertical'
      aria-label={labels.resizeColumn(column.header)}
      aria-valuemin={80}
      aria-valuemax={1000}
      aria-valuenow={width}
      sx={{
        'position': 'absolute',
        'right': 0,
        'top': 0,
        'bottom': 0,
        'width': 8,
        'zIndex': 1,
        'borderRight': 2,
        'borderColor': 'divider',
        'cursor': 'col-resize',
        'touchAction': 'none',
        '&:hover': {borderColor: 'primary.main'},
        '&:focus-visible': {outline: '2px solid currentColor', outlineOffset: -2}
      }}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
          event.preventDefault()
          setWidth(
            event.key === 'Home' ? 80 : event.key === 'End' ? 1000 : width + (event.key === 'ArrowLeft' ? -10 : 10)
          )
        }
      }}
      onPointerDown={event => {
        if (event.button !== 0) return
        event.preventDefault()
        start.current = {x: event.clientX, width}
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={event => {
        if (start.current) setWidth(start.current.width + event.clientX - start.current.x)
      }}
      onPointerUp={event => {
        start.current = null
        event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onLostPointerCapture={() => {
        start.current = null
      }}
    />}
  </TableCell>
}
