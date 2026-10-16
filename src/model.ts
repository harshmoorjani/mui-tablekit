import type {CellValue, Column, FilterValue, TableState} from './types.js'

const collator = new Intl.Collator(undefined, {numeric: true})

export function createTableState(state: Partial<TableState> = {}): TableState {
  return {
    search: '',
    filters: {},
    sort: null,
    page: 0,
    pageSize: 10,
    selectedIds: [],
    expandedIds: [],
    expandedColumnIds: [],
    hiddenColumnIds: [],
    columnOrder: [],
    columnWidths: {},
    ...state
  }
}

export function getOrderedColumns<Row>(columns: readonly Column<Row>[], order: readonly string[]) {
  const byId = new Map(columns.map(column => [column.id, column]))
  return [...new Set([...order, ...byId.keys()])].flatMap(id => {
    const column = byId.get(id)
    return column ? [column] : []
  })
}

export function columnWidth(widths: Record<string, number>, id: string) {
  const width = Object.hasOwn(widths, id) ? widths[id] : undefined
  return typeof width === 'number' && Number.isFinite(width) ? Math.min(1000, Math.max(80, width)) : 160
}

export function cellText(value: CellValue): string {
  if (Array.isArray(value)) return value.map(cellText).join(', ')
  return value instanceof Date ? value.toISOString() : String(value ?? '')
}

export function inferFilterOptions<Row>(column: Column<Row>, rows: readonly Row[], filter?: FilterValue) {
  if (column.filterOptions) return column.filterOptions
  const values = new Set<string>()
  rows.forEach(row => {
    const value = column.value(row)
    ;(Array.isArray(value) ? value : [value]).forEach(entry => {
      if (entry != null) values.add(cellText(entry))
    })
  })
  // Keep active choices usable when a refresh no longer contains their rows.
  if (typeof filter === 'string' && filter) values.add(filter)
  if (Array.isArray(filter)) filter.forEach(value => values.add(value))
  return [...values].sort(collator.compare).map(value => ({value, label: value}))
}

function compareValues(a: CellValue, b: CellValue): number {
  if (a == null) return b == null ? 0 : 1
  if (b == null) return -1
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return collator.compare(cellText(a), cellText(b))
}

function dateNumber(value: CellValue): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value !== 'string') return NaN
  const day = value.slice(0, 10)
  const midnight = Date.parse(day)
  // Date.parse otherwise turns February 30 into a day in March.
  return Number.isFinite(midnight) && new Date(midnight).toISOString().slice(0, 10) === day ? Date.parse(value) : NaN
}

export function activeFilter(filter: FilterValue | undefined): boolean {
  return Boolean(
    filter && (typeof filter === 'string' || (Array.isArray(filter) ? filter.length : filter.min || filter.max))
  )
}

function matchesFilter<Row>(column: Column<Row>, row: Row, filter: FilterValue | undefined): boolean {
  if (
    !filter ||
    (Array.isArray(filter) && !filter.length) ||
    (typeof filter === 'object' && !Array.isArray(filter) && !filter.min && !filter.max)
  )
    return true
  if (column.filter) return column.filter(row, filter)
  const value = column.value(row)
  if (Array.isArray(filter)) {
    const values = (Array.isArray(value) ? value : [value]).map(cellText)
    return column.filterMatch === 'all'
      ? filter.every(entry => values.includes(entry))
      : filter.some(entry => values.includes(entry))
  }
  if (typeof filter === 'string')
    return column.filterType === 'select'
      ? (Array.isArray(value) ? value : [value]).some(entry => cellText(entry) === filter)
      : cellText(value).toLocaleLowerCase().includes(filter.toLocaleLowerCase())
  if (value == null || (typeof value === 'string' && value.trim() === '')) return false
  const dates = column.filterType === 'dateRange'
  const number = dates
    ? dateNumber(value)
    : typeof value === 'number' || typeof value === 'string'
      ? Number(value)
      : NaN
  const min = !filter.min ? -Infinity : dates ? dateNumber(`${filter.min}T00:00:00.000Z`) : Number(filter.min)
  const max = !filter.max ? Infinity : dates ? dateNumber(`${filter.max}T23:59:59.999Z`) : Number(filter.max)
  return Number.isFinite(number) && number >= min && number <= max
}

export interface SearchOptions<Row> {
  caseSensitive?: boolean
  searchMatch?: (row: Row, query: string, columns: readonly Column<Row>[]) => boolean
}

export function matchesRow<Row>(
  row: Row,
  columns: readonly Column<Row>[],
  state: Pick<TableState, 'search' | 'filters'>,
  options: SearchOptions<Row> = {}
) {
  const query = state.search.trim()
  const text = (value: string) => (options.caseSensitive ? value : value.toLocaleLowerCase())
  return (!query ||
      (options.searchMatch
        ? options.searchMatch(row, query, columns)
        : columns.some(
            column => column.searchable !== false && text(cellText(column.value(row))).includes(text(query))
          ))) &&
    columns.every(column =>
      matchesFilter(column, row, Object.hasOwn(state.filters, column.id) ? state.filters[column.id] : undefined)
    )
}

export function rowComparator<Row>(columns: readonly Column<Row>[], sort: TableState['sort']) {
  const column = columns.find(column => column.id === sort?.columnId)
  return column && sort && column.sortable !== false
    ? (a: Row, b: Row) =>
        (sort.direction === 'asc' ? 1 : -1) *
        (column.compare ? column.compare(a, b) : compareValues(column.value(a), column.value(b)))
    : undefined
}

export function getView<Row>(
  rows: readonly Row[],
  columns: readonly Column<Row>[],
  state: Pick<TableState, 'search' | 'filters' | 'sort' | 'page' | 'pageSize'>,
  serverRowCount?: number,
  options: SearchOptions<Row> = {}
) {
  if (!Number.isInteger(state.page) || state.page < 0 || !Number.isInteger(state.pageSize) || state.pageSize < 1) {
    throw new Error('MUI Tablekit: page must be a nonnegative integer and pageSize a positive integer.')
  }
  if (serverRowCount !== undefined && (!Number.isInteger(serverRowCount) || serverRowCount < 0)) {
    throw new Error('MUI Tablekit: rowCount must be a nonnegative integer.')
  }
  let result = rows
  if (serverRowCount === undefined) {
    const filtered = rows.filter(row => matchesRow(row, columns, state, options))
    const compare = rowComparator(columns, state.sort)
    if (compare) filtered.sort(compare)
    result = filtered
  }
  const count = serverRowCount ?? result.length
  // The server owns its page; never relabel old response rows as another page.
  const page =
    serverRowCount === undefined ? Math.min(state.page, Math.max(0, Math.ceil(count / state.pageSize) - 1)) : state.page
  return {
    rows: serverRowCount === undefined ? result.slice(page * state.pageSize, (page + 1) * state.pageSize) : result,
    allRows: result,
    count,
    page
  }
}
