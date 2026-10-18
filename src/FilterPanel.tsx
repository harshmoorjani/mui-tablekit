import {useId, useState} from 'react'
import {Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Popover, Stack, Typography} from '@mui/material'
import {ColumnFilter} from './ColumnFilter.js'
import {ToolbarButton} from './ToolbarButton.js'
import {activeFilter} from './model.js'
import type {Column, TableComponents, TableLabels, TableState} from './types.js'

export function FilterPanel<Row>({
  columns,
  filters,
  labels,
  confirm,
  onChange,
  onOpen,
  onClose,
  onReset,
  checkbox,
  button,
  inline
}: {
  columns: readonly Column<Row>[]
  filters: TableState['filters']
  labels: TableLabels
  confirm: boolean
  onChange: (filters: TableState['filters'], confirmed?: boolean) => void
  onOpen?: () => void
  onClose?: () => void
  onReset: () => void
  checkbox?: TableComponents['Checkbox']
  button?: TableComponents['ToolbarButton']
  inline?: boolean
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const open = Boolean(anchor)
  const titleId = useId()
  const [draft, setDraft] = useState(filters)
  if (!columns.length) return null
  const values = confirm ? draft : filters
  const controls = <Box
    sx={{
      display: inline ? 'flex' : 'grid',
      flexWrap: 'wrap',
      gridTemplateColumns: {xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))'},
      p: 2,
      gap: 1.5,
      alignItems: 'start'
    }}>
    {columns.map(column => <Box
      key={column.id}
      sx={{
        minWidth: 0,
        maxWidth: '100%',
        width: inline
          ? {
              xs: '100%',
              sm:
                column.filterType === 'checkbox'
                  ? 'auto'
                  : column.filterType === 'numberRange' || column.filterType === 'dateRange'
                    ? 360
                    : 180
            }
          : '100%',
        overflowWrap: 'anywhere',
        gridColumn:
          !inline && (column.renderFilter || column.filterType === 'numberRange' || column.filterType === 'dateRange')
            ? '1 / -1'
            : undefined
      }}>
      <ColumnFilter
        column={column}
        labels={labels}
        checkbox={checkbox}
        inline={inline}
        value={Object.hasOwn(values, column.id) ? values[column.id] : undefined}
        onChange={value => {
          const next = {...values, [column.id]: value}
          if (confirm) setDraft(next)
          else onChange(next)
        }}
      />
    </Box>)}
  </Box>
  if (!confirm && inline) return controls
  const close = () => {
    setAnchor(null)
    onClose?.()
  }
  return <>
    <ToolbarButton
      component={button}
      action='filters'
      label={labels.filters}
      expanded={open}
      active={open || Object.values(filters).some(activeFilter)}
      onClick={event => {
        setDraft(structuredClone(filters))
        setAnchor(event.currentTarget)
        onOpen?.()
      }}
    />
    {confirm ? <Dialog open={open} onClose={close} aria-labelledby={titleId} fullWidth maxWidth='md'>
      <DialogTitle id={titleId}>{labels.filters}</DialogTitle>
      <DialogContent>{controls}</DialogContent>
      <DialogActions>
        <Button onClick={() => setDraft({})}>{labels.resetFilters}</Button>
        <Button onClick={close}>{labels.cancelFilters}</Button>
        <Button
          onClick={() => {
            onChange(draft, true)
            close()
          }}>
          {labels.applyFilters}
        </Button>
      </DialogActions>
    </Dialog> : <Popover
      open={open}
      anchorEl={anchor}
      onClose={close}
      anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
      transformOrigin={{vertical: 'top', horizontal: 'left'}}
      slotProps={{
        paper: {'role': 'dialog', 'aria-label': labels.filters, 'sx': {width: 600, maxWidth: 'calc(100vw - 32px)'}}
      }}>
      <Stack
        direction='row'
        useFlexGap
        sx={{
          px: 2,
          py: 1,
          gap: 1,
          alignItems: 'center',
          flexWrap: 'wrap',
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1
        }}>
        <Typography variant='subtitle2' component='h2' sx={{flexGrow: 1}}>
          {labels.filters}
        </Typography>
        <Button size='small' onClick={onReset}>
          {labels.resetFilters}
        </Button>
      </Stack>
      {controls}
    </Popover>}
  </>
}
