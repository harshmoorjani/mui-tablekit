import {createTableState} from '../src/index.js'
import type {FilterValue, TableState} from '../src/index.js'

const sortColumns = ['name', 'team', 'age', 'joined']

export function restoreView(raw: string | null): TableState {
  try {
    const value = JSON.parse(raw ?? 'null')
    const isFilter = (filter: unknown): filter is FilterValue =>
      typeof filter === 'string' ||
      (Array.isArray(filter)
        ? filter.every(item => typeof item === 'string')
        : Boolean(
            filter &&
            typeof filter === 'object' &&
            typeof (filter as {min?: unknown}).min === 'string' &&
            typeof (filter as {max?: unknown}).max === 'string'
          ))
    if (
      !value ||
      typeof value.search !== 'string' ||
      !value.filters ||
      Array.isArray(value.filters) ||
      typeof value.filters !== 'object' ||
      !Object.entries(value.filters).every(([id, filter]) => sortColumns.includes(id) && isFilter(filter)) ||
      !Number.isSafeInteger(value.page) ||
      value.page < 0 ||
      ![10, 25, 50, 100].includes(value.pageSize) ||
      (value.sort !== null &&
        (!value.sort || !sortColumns.includes(value.sort.columnId) || !['asc', 'desc'].includes(value.sort.direction)))
    )
      return createTableState({pageSize: 10})
    return createTableState({
      search: value.search,
      filters: value.filters,
      sort: value.sort,
      page: value.page,
      pageSize: value.pageSize
    })
  } catch {
    return createTableState({pageSize: 10})
  }
}

export function saveView(state: TableState) {
  const {search, filters, sort, page, pageSize} = state
  return JSON.stringify({search, filters, sort, page, pageSize})
}

export function directoryQuery(state: Pick<TableState, 'search' | 'filters' | 'sort' | 'page' | 'pageSize'>) {
  const range = (id: string) => {
    const value = state.filters[id]
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {min: '', max: ''}
  }
  const number = (value: string) => {
    if (!value) return undefined
    if (!Number.isFinite(Number(value))) throw new Error('Age bounds must be numbers.')
    return Number(value)
  }
  const team = state.filters.team
  return {
    searchText: state.search,
    teams: Array.isArray(team) ? team : [],
    fromAge: number(range('age').min),
    toAge: number(range('age').max),
    fromDate: range('joined').min || undefined,
    toDate: range('joined').max || undefined,
    sortOrder:
      state.sort && sortColumns.includes(state.sort.columnId)
        ? `${state.sort.columnId}|${state.sort.direction}`
        : undefined,
    pageNo: state.page + 1,
    pageSize: state.pageSize
  }
}
