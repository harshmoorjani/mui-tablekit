'use client'

import {Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState} from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import {alpha, useTheme} from '@mui/material/styles'
import type {SxProps, Theme} from '@mui/material/styles'
import type {KeyboardEvent, MouseEvent} from 'react'
import {cellText, columnWidth, createTableState, getOrderedColumns, getView, inferFilterOptions} from './model.js'
import {columnTree, displayedColumns, headerRows} from './columnLayout.js'
import {rowTree, treeView} from './tree.js'
import {restoreState, savedState} from './storage.js'
import {ColumnControls} from './ColumnControls.js'
import {ColumnHeader} from './ColumnHeader.js'
import {CompactPagination} from './CompactPagination.js'
import {ToolbarButton} from './ToolbarButton.js'
import {SearchField} from './SearchField.js'
import {FilterPanel} from './FilterPanel.js'
import {FilterChips} from './FilterChips.js'
import {downloadCsv, printRows} from './output.js'
import type {
  Column,
  DataTableProps,
  FilterValue,
  RowContext,
  TableAction,
  TableLabels,
  TableState,
  ToolbarControls
} from './types.js'

const defaultLabels: TableLabels = {
  search: 'Search',
  showSearch: 'Show search',
  hideSearch: 'Hide search',
  jumpToPage: 'Jump to page',
  deleteRows: 'Delete selected rows',
  deleteFailed: 'Unable to delete selected rows',
  empty: 'No matching rows',
  selectPage: 'Select this page',
  selectFiltered: 'Select all filtered rows',
  selectLoaded: 'Select loaded rows',
  selectRow: id => `Select row ${id}`,
  selected: count => `${count} selected`,
  clearSelection: 'Clear selection',
  filter: header => `Filter ${header}`,
  filterMin: header => `${header} from`,
  filterMax: header => `${header} to`,
  clearFilter: 'Any',
  resetFilters: 'Reset filters',
  emptyFilterValue: '(empty)',
  filters: 'Filters',
  applyFilters: 'Apply filters',
  cancelFilters: 'Cancel',
  filterChip: (header, value) => `${header}: ${value}`,
  removeFilter: label => `Remove ${label}`,
  sort: header => `Sort by ${header}`,
  rowsPerPage: 'Rows/Page:',
  page: 'Page:',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  firstPage: 'First page',
  lastPage: 'Last page',
  expandRow: id => `Expand row ${id}`,
  collapseRow: id => `Collapse row ${id}`,
  expandAll: 'Expand all filtered rows',
  collapseAll: 'Collapse all filtered rows',
  expandLoaded: 'Expand loaded rows',
  collapseLoaded: 'Collapse loaded rows',
  details: 'Details',
  columns: 'Columns',
  showColumn: header => `Show ${header}`,
  moveColumn: (header, direction) => `Move ${header} ${direction}`,
  columnWidth: header => `${header} width (px)`,
  dragColumn: header => `Move ${header} (drag or use left/right arrows)`,
  resizeColumn: header => `Resize ${header} (use left/right arrows)`,
  expandColumns: header => `Expand ${header} columns`,
  collapseColumns: header => `Collapse ${header} columns`,
  downloadCsv: 'Download CSV',
  downloadCsvPage: 'Download page CSV',
  print: 'Print',
  printPage: 'Print page',
  displayedRows: ({from, to, count}) => `${from}–${to} of ${count}`
}

const interactive =
  'button,a,input,select,textarea,label,summary,[role="button"],[role="checkbox"],[role="switch"],[role="link"],[role="combobox"],[role="textbox"],[contenteditable]'
const eligible = () => true
const styles = (...values: (SxProps<Theme> | undefined)[]): SxProps<Theme> =>
  values.flatMap(value => (Array.isArray(value) ? value : [value ?? {}])) as SxProps<Theme>

export function DataTable<Row>(props: DataTableProps<Row>) {
  if (
    props.mode === 'server' &&
    (props.rowCount == null || props.state == null || typeof props.onStateChange !== 'function')
  ) {
    throw new Error('MUI Tablekit: server mode requires rowCount, state, and onStateChange.')
  }
  const {
    rows,
    getRowId,
    caption,
    selectable = false,
    renderBulkActions,
    toolbar,
    renderExpanded,
    columnControls = false,
    pageSizeOptions = [10, 25, 50],
    search: searchEnabled = true,
    pagination = true,
    isRowSelectable = eligible,
    selectOnClick = false,
    selectAllScope = 'page',
    isRowExpandable = eligible,
    expandAll = false,
    getSubRows,
    components = {}
  } = props
  const columnModel = useMemo(() => columnTree(props.columns), [props.columns])
  const storageKey = useRef(props.storageKey)
  if (storageKey.current !== props.storageKey)
    throw new Error('MUI Tablekit: storageKey must stay fixed; remount the table to switch saved views.')
  const columns = columnModel.columns
  const [internalState, setInternalState] = useState(() => {
    const defaults = createTableState(props.defaultState)
    try {
      if (!props.storageKey || props.state !== undefined) return defaults
      const restored = restoreState(localStorage.getItem(props.storageKey), defaults, [
        ...columns.map(column => column.id),
        ...columnModel.groups.keys()
      ])
      const visible = displayedColumns(columnModel, restored.expandedColumnIds)
      if (
        !visible.some(column => column.hideable === false || !restored.hiddenColumnIds.includes(column.id)) &&
        visible[0]
      ) {
        restored.hiddenColumnIds = restored.hiddenColumnIds.filter(id => id !== visible[0]!.id)
      }
      return restored
    } catch {
      return defaults
    }
  })
  const state = props.state ?? internalState
  const [searchOpen, setSearchOpen] = useState(false)
  const searchContainer = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (searchOpen)
      searchContainer.current?.querySelector<HTMLElement>('input,[role="searchbox"],[role="textbox"]')?.focus()
  }, [searchOpen])
  const [dragSource, setDragSource] = useState<string>()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const tableId = useId()
  const theme = useTheme()
  const labels = {...defaultLabels, ...props.labels}
  const {search, filters, sort, page, pageSize} = state
  const rowCount = props.mode === 'server' ? props.rowCount : undefined
  const tree = useMemo(
    () => (getSubRows ? rowTree(rows, getRowId, getSubRows) : undefined),
    [rows, getRowId, getSubRows]
  )
  const allInputRows = useMemo(() => (tree ? tree.all.map(node => node.row) : rows), [tree, rows])
  const paginate = pagination || rowCount !== undefined
  const viewState = {
    ...state,
    search: searchEnabled ? search : '',
    page: paginate ? page : 0,
    pageSize: paginate ? pageSize : Math.max(rows.length, 1)
  }
  const view = useMemo(
    () =>
      tree
        ? treeView(tree, columns, viewState, isRowExpandable, rowCount, props)
        : {...getView(rows, columns, viewState, rowCount, props), nodes: undefined, reveal: false},
    [
      tree,
      rows,
      columns,
      search,
      filters,
      sort,
      page,
      pageSize,
      rowCount,
      searchEnabled,
      paginate,
      tree ? state.expandedIds : undefined,
      tree ? isRowExpandable : undefined,
      props.caseSensitive,
      props.searchMatch
    ]
  )
  const selected = new Set(selectable === 'single' ? state.selectedIds.slice(-1) : state.selectedIds)
  const expandedIds = new Set(state.expandedIds)
  const ids = allInputRows.map(getRowId)
  if (new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !id)) {
    throw new Error('MUI Tablekit: getRowId must return a unique, nonempty string for every row.')
  }
  const resolvedColumns = useMemo(
    () =>
      columns.map(column =>
        ['select', 'multiselect', 'checkbox'].includes(column.filterType ?? '')
          ? {
              ...column,
              filterOptions: inferFilterOptions(
                column,
                allInputRows,
                Object.hasOwn(filters, column.id) ? filters[column.id] : undefined
              )
            }
          : column
      ),
    [columns, allInputRows, filters]
  )
  const resolved = new Map(resolvedColumns.map(column => [column.id, column]))
  const frontier = displayedColumns(columnModel, state.expandedColumnIds, state.columnOrder).map(column =>
    resolved.get(column.id)!
  )
  const layoutColumns = [
    ...frontier.filter(column => column.sticky === 'left'),
    ...frontier.filter(column => !column.sticky),
    ...frontier.filter(column => column.sticky === 'right')
  ]
  const visibleColumns = layoutColumns.filter(
    column => column.hideable === false || !state.hiddenColumnIds.includes(column.id)
  )
  if (!visibleColumns.length) throw new Error('MUI Tablekit: at least one column must be visible.')
  const headers = headerRows(visibleColumns, columnModel.paths, tableId)
  const headerStyle: SxProps<Theme> = {
    height: 40,
    fontWeight: 600,
    color: 'text.secondary',
    bgcolor: 'background.paper',
    backgroundImage: `linear-gradient(${alpha(theme.palette.text.primary, 0.06)}, ${alpha(theme.palette.text.primary, 0.06)})`,
    borderBottom: 2,
    borderColor: 'divider'
  }
  const filterColumns = getOrderedColumns(resolvedColumns, state.columnOrder).filter(
    column => column.filterable ?? Boolean(column.filterType || column.renderFilter)
  )
  const showSelection = Boolean(selectable) && props.selectionCheckboxes !== false
  const showExpansion = Boolean(renderExpanded || getSubRows)
  const utilityColumns = Number(showSelection) + Number(showExpansion)
  const pinUtilities = Boolean(props.fixedSelection && showSelection)
  const pinned = pinUtilities || visibleColumns.some(column => column.sticky)
  const container = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(Infinity)
  useLayoutEffect(() => {
    if (!container.current || !pinned) return
    const measure = () => {
      const width = container.current?.clientWidth ?? 0
      if (width > 0) setContainerWidth(width)
    }
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : undefined
    observer?.observe(container.current)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [pinned])
  const sized = pinned || columnControls || props.columnResizing || Object.keys(state.columnWidths).length > 0
  const tableWidth = visibleColumns.reduce(
    (width, column) => width + columnWidth(state.columnWidths, column.id),
    utilityColumns * 64
  )
  const offsets = new Map<string, number>()
  let left = pinUtilities ? utilityColumns * 64 : 0
  let right = 0
  visibleColumns.forEach(column => {
    if (column.sticky === 'left') {
      offsets.set(column.id, left)
      left += columnWidth(state.columnWidths, column.id)
    }
  })
  ;[...visibleColumns].reverse().forEach(column => {
    if (column.sticky === 'right') {
      offsets.set(column.id, right)
      right += columnWidth(state.columnWidths, column.id)
    }
  })
  const stickyStyle = (
    column: Column<Row> | undefined,
    header: boolean,
    top = 0,
    selection = false,
    offset?: number,
    rowPaint?: {backgroundColor?: unknown; backgroundImage?: unknown}
  ): SxProps<Theme> => {
    const side = left + right + 80 > containerWidth ? undefined : offset !== undefined ? 'left' : column?.sticky
    const layer = (color: string) => `linear-gradient(${color}, ${color})`
    const backgroundImage =
      [
        selection && layer(alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity)),
        typeof rowPaint?.backgroundImage === 'string' &&
          rowPaint.backgroundImage !== 'none' &&
          rowPaint.backgroundImage,
        typeof rowPaint?.backgroundColor === 'string' && layer(rowPaint.backgroundColor),
        header && layer(alpha(theme.palette.text.primary, 0.06))
      ]
        .filter(Boolean)
        .join(', ') || 'none'
    return {
      ...(side
        ? {
            position: 'sticky',
            [side]: offset ?? offsets.get(column!.id),
            zIndex: header ? 5 : 2,
            bgcolor: 'background.paper',
            backgroundImage
          }
        : {}),
      ...(header && props.stickyHeader
        ? {position: 'sticky', top, zIndex: side ? 5 : 3, bgcolor: 'background.paper'}
        : {})
    }
  }
  const head = useRef<HTMLTableSectionElement>(null)
  const focusGroup = useRef<string | undefined>(undefined)
  const [heights, setHeights] = useState<number[]>([])
  const headerKey = headers.rows
    .map(row => row.map(cell => `${cell.id}:${cell.colSpan}:${cell.rowSpan}`).join('|'))
    .join(';')
  useLayoutEffect(() => {
    if (!props.stickyHeader || !head.current) return
    const measure = () => {
      if (!head.current) return
      const next = [...head.current.rows].map(row => row.getBoundingClientRect().height)
      setHeights(previous => (previous.join(',') === next.join(',') ? previous : next))
    }
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : undefined
    observer?.observe(head.current)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [props.stickyHeader, headerKey])
  useLayoutEffect(() => {
    if (!focusGroup.current) return
    const button = [...(head.current?.querySelectorAll<HTMLElement>('[data-group-toggle]') ?? [])].find(
      element => element.getAttribute('data-group-toggle') === focusGroup.current
    )
    button?.focus()
    focusGroup.current = undefined
  }, [state.expandedColumnIds])
  const latest = useRef({state, page: view.page, props})
  latest.current = {state, page: view.page, props}
  const update = (patch: Partial<TableState>, reason?: TableAction) => {
    const current = latest.current
    const next = {...current.state, page: current.page, ...patch}
    const action: TableAction =
      'search' in patch
        ? 'search'
        : 'filters' in patch
          ? 'filter'
          : 'sort' in patch
            ? 'sort'
            : 'pageSize' in patch
              ? 'pageSize'
              : 'selectedIds' in patch
                ? 'selection'
                : 'expandedIds' in patch
                  ? 'expansion'
                  : 'page' in patch
                    ? 'page'
                    : 'columns'
    if (current.props.state === undefined) setInternalState(next)
    current.props.onStateChange?.(next)
    current.props.onAction?.(reason ?? action, next)
  }
  const emit = (action: TableAction) => latest.current.props.onAction?.(action, latest.current.state)
  useEffect(() => {
    props.onAction?.('init', state)
  }, [])
  useEffect(() => {
    if (props.storageKey && props.state === undefined) {
      try {
        localStorage.setItem(props.storageKey, savedState(state))
      } catch {
        /* Storage can be disabled. */
      }
    }
  }, [state, props.storageKey, props.state])
  const toggle = (rowIds: string[], checked: boolean) => {
    if (deleting) return
    if (selectable === 'single') {
      update({selectedIds: checked ? rowIds.slice(-1) : []})
      return
    }
    const next = new Set(selected)
    rowIds.forEach(id => (checked ? next.add(id) : next.delete(id)))
    update({selectedIds: [...next]})
  }
  const pageIds = (selectAllScope === 'filtered' ? view.allRows : view.rows).filter(isRowSelectable).map(getRowId)
  const pageSelected = pageIds.filter(id => selected.has(id)).length
  const nodeFor = (id: string) => view.nodes?.get(id)
  const expandableIds = expandAll
    ? view.allRows
        .filter(row => isRowExpandable(row) && (renderExpanded || nodeFor(getRowId(row))?.children.length))
        .map(getRowId)
    : []
  const expandableSet = new Set(expandableIds)
  const allExpanded = expandableIds.length > 0 && expandableIds.every(id => expandedIds.has(id))
  const toggleExpansion = (id: string) =>
    update({
      expandedIds: expandedIds.has(id) ? state.expandedIds.filter(value => value !== id) : [...state.expandedIds, id]
    })
  const changeFilter = (id: string, value: FilterValue) =>
    update({page: 0, filters: {...state.filters, [id]: value}}, 'filterChipClose')
  const toggleGroup = (id: string) => {
    const expandedColumnIds = state.expandedColumnIds.includes(id)
      ? state.expandedColumnIds.filter(value => value !== id)
      : [...state.expandedColumnIds, id]
    const next = displayedColumns(columnModel, expandedColumnIds, state.columnOrder)
    if (!next.length) return
    const fallback =
      next.find(column => column.id === id || columnModel.paths.get(column.id)?.some(group => group.id === id)) ??
      next[0]!
    const hiddenColumnIds = next.some(column => column.hideable === false || !state.hiddenColumnIds.includes(column.id))
      ? state.hiddenColumnIds
      : state.hiddenColumnIds.filter(value => value !== fallback.id)
    focusGroup.current = id
    update({expandedColumnIds, hiddenColumnIds})
  }
  const exportColumns = (items: readonly Column<Row>[]) =>
    items.map(column => {
      const parents = columnModel.paths.get(column.id) ?? []
      return parents.length
        ? {...column, header: [...parents.map(parent => parent.header), column.header].join(' / ')}
        : column
    })
  const selectionBar =
    selectable && selected.size > 0 && props.selectionToolbar !== 'none' ? <>
      <Typography role='status'>{labels.selected(selected.size)}</Typography>
      {renderBulkActions?.([...selected])}
      {props.onRowsDelete && <Button
        disabled={deleting}
        onClick={async () => {
          const snapshot = [...selected]
          const removed = new Set(snapshot)
          setDeleting(true)
          setDeleteError(false)
          try {
            if (
              (await props.onRowsDelete!(
                snapshot,
                allInputRows.filter(row => removed.has(getRowId(row)))
              )) !== false
            ) {
              update({selectedIds: latest.current.state.selectedIds.filter(id => !removed.has(id))})
            }
          } catch {
            setDeleteError(true)
          } finally {
            setDeleting(false)
          }
        }}>
        {labels.deleteRows}
      </Button>}
      <Button disabled={deleting} onClick={() => update({selectedIds: []})}>
        {labels.clearSelection}
      </Button>
    </> : null
  const barSx = {px: 2, py: 1, gap: 1, flexWrap: 'wrap', alignItems: 'center'} as const
  const replaced = Boolean(selectionBar && props.selectionToolbar === 'replace')
  const inlineFilters = props.filterDisplay === 'inline' && props.filterMode !== 'confirm'
  const filterControl = <FilterPanel
    columns={filterColumns}
    filters={state.filters}
    labels={labels}
    confirm={props.filterMode === 'confirm'}
    inline={inlineFilters}
    checkbox={components.Checkbox}
    button={components.ToolbarButton}
    onReset={() => update({page: 0, filters: {}}, 'filterReset')}
    onOpen={() => emit('filterOpen')}
    onClose={() => emit('filterClose')}
    onChange={(filters, confirmed) => update({page: 0, filters}, confirmed ? 'filterConfirm' : 'filter')}
  />
  const controls: ToolbarControls = {
    search: searchEnabled ? <>
      {props.searchDisplay === 'toggle' && <ToolbarButton
        component={components.ToolbarButton}
        action='search'
        active={searchOpen || Boolean(state.search.trim())}
        expanded={searchOpen}
        label={
          searchOpen
            ? labels.hideSearch
            : state.search.trim()
              ? `${labels.showSearch}: ${state.search}`
              : labels.showSearch
        }
        onClick={() => {
          setSearchOpen(value => !value)
          emit(searchOpen ? 'searchClose' : 'searchOpen')
        }}
      />}
      <Box ref={searchContainer} sx={{display: props.searchDisplay === 'toggle' && !searchOpen ? 'none' : 'contents'}}>
        <SearchField
          value={state.search}
          label={labels.search}
          autoFocus={props.searchDisplay === 'toggle' && searchOpen}
          delay={props.searchDebounceMs}
          render={props.renderSearch}
          onChange={search => update({search, page: 0})}
        />
      </Box>
    </> : null,
    filters: !inlineFilters && filterColumns.length ? filterControl : null,
    columns: columnControls ? <ColumnControls
      columns={layoutColumns}
      state={state}
      labels={labels}
      update={update}
      checkbox={components.Checkbox}
      button={components.ToolbarButton}
    /> : null,
    csv: props.csvFileName ? <ToolbarButton
      component={components.ToolbarButton}
      action='csv'
      label={props.mode === 'server' ? labels.downloadCsvPage : labels.downloadCsv}
      onClick={() =>
        downloadCsv(
          props.csvFileName!,
          exportColumns(props.csvOptions?.columns === 'all' ? layoutColumns : visibleColumns),
          props.csvOptions?.rows === 'all'
            ? allInputRows
            : props.csvOptions?.rows === 'page'
              ? view.rows
              : view.allRows,
          props.csvOptions
        )
      }
    /> : null,
    print: props.printable ? <ToolbarButton
      component={components.ToolbarButton}
      action='print'
      label={props.mode === 'server' ? labels.printPage : labels.print}
      onClick={() => printRows(caption, exportColumns(visibleColumns), view.allRows)}
    /> : null,
    selection: props.selectionToolbar !== 'above' && !replaced ? selectionBar : null,
    custom: toolbar
  }
  const hasToolbar =
    searchEnabled ||
    columnControls ||
    (!inlineFilters && filterColumns.length > 0) ||
    (toolbar != null && toolbar !== false) ||
    Boolean(
      props.csvFileName ||
      props.printable ||
      (selectionBar && props.selectionToolbar !== 'above') ||
      props.renderToolbar
    )
  const Pagination = components.Pagination ?? CompactPagination
  const Choice = components.Checkbox ?? Checkbox
  const ExpandButton = components.ExpandButton ?? Button
  const stacked = props.responsive === 'stacked' || props.responsive === 'simple'
  return <Paper variant='outlined'>
    <Typography
      id={`${tableId}-caption`}
      component='h2'
      variant='subtitle1'
      sx={{px: 2, pt: 1.5, pb: 1, fontWeight: 600}}>
      {caption}
    </Typography>
    {props.header}
    {selectionBar && props.selectionToolbar === 'above' && <Stack direction='row' useFlexGap sx={barSx}>
      {selectionBar}
    </Stack>}
    {hasToolbar && <Stack component={components.Toolbar ?? 'div'} direction='row' useFlexGap sx={barSx}>
      <Box sx={{display: replaced ? 'none' : 'contents'}}>
        {props.renderToolbar ? props.renderToolbar(controls) : <>
          {controls.filters}
          {controls.search}
          {controls.selection}
          <Box sx={{flexGrow: 1}} />
          {controls.custom}
          <Stack direction='row' useFlexGap sx={{gap: 0.5, alignItems: 'center', flexWrap: 'wrap', maxWidth: '100%'}}>
            {controls.columns}
            {controls.csv}
            {controls.print}
          </Stack>
        </>}
      </Box>
      {replaced && selectionBar}
    </Stack>}
    {deleteError && <Alert severity='error' role='status'>
      {labels.deleteFailed}
    </Alert>}
    {inlineFilters && filterControl}
    <FilterChips
      component={components.FilterChip}
      columns={getOrderedColumns(resolvedColumns, state.columnOrder)}
      filters={state.filters}
      labels={labels}
      onChange={changeFilter}
      onReset={() => update({page: 0, filters: {}}, 'filterReset')}
    />
    <TableContainer
      ref={container}
      sx={{maxHeight: props.maxHeight}}
      tabIndex={props.maxHeight || pinned ? 0 : undefined}
      role={props.maxHeight || pinned ? 'region' : undefined}
      aria-label={props.maxHeight || pinned ? caption : undefined}>
      <Table
        component={components.Table ?? 'table'}
        size='small'
        stickyHeader={props.stickyHeader}
        role='table'
        aria-labelledby={`${tableId}-caption`}
        sx={{
          'tableLayout': 'fixed',
          'width': sized ? tableWidth : '100%',
          '& td, & th': {px: 1.5, py: 0.5},
          '& td': {height: 40},
          '& .MuiCheckbox-root': {p: 0.5},
          '& .tablekit-cell': {whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '24px'},
          '& .MuiTableCell-paddingCheckbox': {px: 0.5},
          '& .tablekit-label': {display: 'none'},
          ...(stacked
            ? {
                '@media (max-width: 599px)': {
                  'display': 'block',
                  'width': '100%',
                  'minWidth': 0,
                  '& caption, & thead, & tbody, & tfoot, & tr': {display: 'block'},
                  '& colgroup': {display: 'none'},
                  '& thead tr': {display: 'flex', flexWrap: 'wrap'},
                  '& th': {
                    display: 'block',
                    position: 'relative',
                    left: 'auto',
                    right: 'auto',
                    top: 'auto',
                    maxWidth: '100%'
                  },
                  '& th.MuiTableCell-paddingCheckbox': {minWidth: 52, flexShrink: 0},
                  '& tbody tr': {borderBottom: 1, borderColor: 'divider'},
                  '& td': {
                    display: 'flex',
                    flexDirection: 'row',
                    position: 'static',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    textAlign: 'start',
                    overflowWrap: 'anywhere'
                  },
                  '& .tablekit-label': {display: props.responsive === 'simple' ? 'none' : 'inline', fontWeight: 600}
                }
              }
            : {})
        }}>
        {sized && <colgroup>
          {showExpansion && <col style={{width: 64}} />}
          {showSelection && <col style={{width: 64}} />}
          {visibleColumns.map(column => <col
            key={column.id}
            style={{width: columnWidth(state.columnWidths, column.id)}}
          />)}
        </colgroup>}
        <TableHead ref={head} component={components.Head ?? 'thead'} role='rowgroup'>
          {headers.rows.map((cells, level) => {
            const top = heights.slice(0, level).reduce((total, height) => total + height, 0)
            return <TableRow role='row' key={level}>
              {level === 0 && showExpansion && <TableCell
                rowSpan={headers.rows.length}
                scope='col'
                role='columnheader'
                sx={styles(headerStyle, stickyStyle(undefined, true, 0, false, pinUtilities ? 0 : undefined))}>
                {expandAll ? <ExpandButton
                  disabled={!expandableIds.length}
                  aria-label={
                    props.mode === 'server'
                      ? allExpanded
                        ? labels.collapseLoaded
                        : labels.expandLoaded
                      : allExpanded
                        ? labels.collapseAll
                        : labels.expandAll
                  }
                  sx={{minWidth: 24, width: 28, height: 28, p: 0}}
                  onClick={() =>
                    update({
                      expandedIds: allExpanded
                        ? state.expandedIds.filter(id => !expandableSet.has(id))
                        : [...new Set([...state.expandedIds, ...expandableIds])]
                    })
                  }>
                  {allExpanded ? '−' : '+'}
                </ExpandButton> : <span style={{position: 'absolute', width: 1, height: 1, overflow: 'hidden'}}>
                  {labels.details}
                </span>}
              </TableCell>}
              {level === 0 && showSelection && <TableCell
                rowSpan={headers.rows.length}
                padding='checkbox'
                role='columnheader'
                sx={styles(
                  headerStyle,
                  stickyStyle(undefined, true, 0, false, pinUtilities ? Number(showExpansion) * 64 : undefined)
                )}>
                {selectable !== 'single' && props.selectAll !== false && <Choice
                  slotProps={{
                    input: {
                      'aria-label':
                        selectAllScope === 'page'
                          ? labels.selectPage
                          : props.mode === 'server'
                            ? labels.selectLoaded
                            : labels.selectFiltered
                    }
                  }}
                  checked={pageIds.length > 0 && pageSelected === pageIds.length}
                  indeterminate={pageSelected > 0 && pageSelected < pageIds.length}
                  disabled={deleting || !pageIds.length}
                  onChange={(_, checked) => toggle(pageIds, checked)}
                />}
              </TableCell>}
              {cells.map(cell =>
                cell.column ? <ColumnHeader
                  key={cell.id}
                  id={cell.id}
                  rowSpan={cell.rowSpan}
                  column={cell.column}
                  columns={layoutColumns}
                  sx={styles(headerStyle, stickyStyle(cell.column, true, top))}
                  groupToggle={
                    columnModel.groups.get(cell.column.id)?.value ? () => toggleGroup(cell.column!.id) : undefined
                  }
                  state={state}
                  labels={labels}
                  update={update}
                  tableId={tableId}
                  reorder={Boolean(props.columnReordering)}
                  resize={Boolean(props.columnResizing)}
                  dragSource={dragSource}
                  onDragSourceChange={setDragSource}
                /> : <TableCell
                  key={cell.id}
                  id={cell.id}
                  scope='colgroup'
                  role='columnheader'
                  colSpan={cell.colSpan}
                  rowSpan={cell.rowSpan}
                  sx={styles(
                    headerStyle,
                    stickyStyle(cell.leaves[0]?.sticky === 'right' ? cell.leaves.at(-1) : cell.leaves[0], true, top),
                    cell.group?.headerSx
                  )}>
                  {cell.group?.value ? <Button
                    data-group-toggle={cell.group.id}
                    aria-label={labels.collapseColumns(cell.header)}
                    aria-expanded
                    onClick={() => toggleGroup(cell.group!.id)}>
                    − {cell.header}
                  </Button> : cell.header}
                </TableCell>
              )}
            </TableRow>
          })}
        </TableHead>
        <TableBody component={components.Body ?? 'tbody'} role='rowgroup'>
          {view.rows.map((row, index) => {
            const id = getRowId(row)
            const node = nodeFor(id)
            const canSelect = Boolean(selectable) && isRowSelectable(row)
            const canExpand = isRowExpandable(row) && Boolean(renderExpanded || node?.children.length)
            const expanded = canExpand && (expandedIds.has(id) || (view.reveal && Boolean(node?.children.length)))
            const context: RowContext = {
              id,
              depth: node?.depth ?? 0,
              selected: Boolean(selectable) && selected.has(id),
              expanded: Boolean(expanded)
            }
            const rowSx = props.rowSx?.(row)
            const rowPaint = rowSx ? theme.unstable_sx(rowSx) : undefined
            const detailsId = `${tableId}-detail-${index}`
            const activate = () => {
              const patch: Partial<TableState> = {}
              if (selectOnClick && canSelect && !deleting)
                patch.selectedIds =
                  selectable === 'single'
                    ? selected.has(id)
                      ? []
                      : [id]
                    : selected.has(id)
                      ? state.selectedIds.filter(value => value !== id)
                      : [...state.selectedIds, id]
              if (props.expandOnClick && canExpand)
                patch.expandedIds = expandedIds.has(id)
                  ? state.expandedIds.filter(value => value !== id)
                  : [...state.expandedIds, id]
              if (Object.keys(patch).length) update(patch)
            }
            const cells = <>
              {showExpansion && <TableCell
                role='cell'
                padding='none'
                sx={stickyStyle(undefined, false, 0, context.selected, pinUtilities ? 0 : undefined, rowPaint)}>
                <ExpandButton
                  disabled={!canExpand}
                  aria-label={expanded ? labels.collapseRow(id) : labels.expandRow(id)}
                  aria-expanded={Boolean(expanded)}
                  sx={{minWidth: 24, width: 28, height: 28, p: 0}}
                  aria-controls={renderExpanded && expanded ? detailsId : undefined}
                  onClick={() => toggleExpansion(id)}>
                  {expanded ? '−' : '+'}
                </ExpandButton>
              </TableCell>}
              {showSelection && <TableCell
                padding='checkbox'
                role='cell'
                sx={stickyStyle(
                  undefined,
                  false,
                  0,
                  context.selected,
                  pinUtilities ? Number(showExpansion) * 64 : undefined,
                  rowPaint
                )}>
                <Choice
                  slotProps={{input: {'aria-label': labels.selectRow(id)}}}
                  disabled={deleting || !canSelect}
                  checked={selected.has(id)}
                  onChange={(_, checked) => toggle([id], checked)}
                />
              </TableCell>}
              {visibleColumns.map((column, columnIndex) => <TableCell
                component={components.Cell ?? 'td'}
                role='cell'
                key={column.id}
                align={column.align}
                headers={headers.associations.get(column.id)?.join(' ')}
                onClick={() => props.onCellClick?.(row, column, context)}
                sx={styles(stickyStyle(column, false, 0, context.selected, undefined, rowPaint), column.cellSx?.(row))}>
                {stacked && <span className='tablekit-label' aria-hidden='true'>
                  {[...(columnModel.paths.get(column.id)?.map(parent => parent.header) ?? []), column.header].join(
                    ' / '
                  )}
                </span>}
                <Box
                  className='tablekit-cell'
                  title={cellText(column.value(row))}
                  sx={{minWidth: 0, ...(columnIndex === 0 && context.depth ? {pl: context.depth * 2} : {})}}>
                  {column.render ? column.render(column.value(row), row) : cellText(column.value(row))}
                </Box>
              </TableCell>)}
            </>
            return <Fragment key={id}>
              {props.renderRow ? props.renderRow(row, context, cells) : <TableRow
                component={components.Row ?? 'tr'}
                role='row'
                selected={context.selected}
                data-depth={context.depth}
                sx={rowSx}
                tabIndex={(selectOnClick && canSelect) || (props.expandOnClick && canExpand) ? 0 : undefined}
                onClick={(event: MouseEvent<HTMLElement>) => {
                  props.onRowClick?.(row, context)
                  if ((event.target as Element).closest(interactive)) return
                  activate()
                }}
                onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
                  if (event.target !== event.currentTarget || (event.key !== ' ' && event.key !== 'Enter')) return
                  event.preventDefault()
                  activate()
                }}>
                {cells}
              </TableRow>}
              {renderExpanded && expanded && <TableRow role='row'>
                <TableCell id={detailsId} role='cell' colSpan={visibleColumns.length + utilityColumns}>
                  {renderExpanded(row)}
                </TableCell>
              </TableRow>}
            </Fragment>
          })}
          {!view.rows.length && <TableRow role='row'>
            <TableCell role='cell' colSpan={visibleColumns.length + utilityColumns}>
              <Box role='status' sx={{py: 3, textAlign: 'center'}}>
                {props.emptyContent ?? labels.empty}
              </Box>
            </TableCell>
          </TableRow>}
        </TableBody>
        {props.renderSummary && <TableFooter>{props.renderSummary(view.allRows, visibleColumns)}</TableFooter>}
      </Table>
    </TableContainer>
    {pagination && <Stack
      direction='row'
      useFlexGap
      sx={{alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap'}}>
      {props.jumpToPage && components.Pagination && <TextField
        type='number'
        size='small'
        label={labels.jumpToPage}
        key={view.page}
        defaultValue={view.page + 1}
        sx={{m: 1, width: 140}}
        slotProps={{htmlInput: {min: 1, max: Math.max(1, Math.ceil(view.count / state.pageSize)), step: 1}}}
        onKeyDown={event => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
        }}
        onBlur={event => {
          const number = Number(event.target.value)
          event.target.value = String(view.page + 1)
          if (Number.isInteger(number) && number >= 1 && number <= Math.max(1, Math.ceil(view.count / state.pageSize)))
            update({page: number - 1})
        }}
      />}
      <Pagination
        {...(!components.Pagination
          ? {pageLabel: labels.page, jumpToPage: props.jumpToPage, jumpLabel: labels.jumpToPage}
          : {})}
        component='div'
        count={view.count}
        page={view.page}
        rowsPerPage={state.pageSize}
        rowsPerPageOptions={[...new Set([...pageSizeOptions, state.pageSize])].sort((a, b) => a - b)}
        labelRowsPerPage={labels.rowsPerPage}
        labelDisplayedRows={labels.displayedRows}
        getItemAriaLabel={type =>
          ({first: labels.firstPage, last: labels.lastPage, previous: labels.previousPage, next: labels.nextPage})[type]
        }
        onPageChange={(_, page) => update({page})}
        onRowsPerPageChange={event => update({pageSize: Number(event.target.value), page: 0})}
      />
    </Stack>}
    {props.footer}
  </Paper>
}
