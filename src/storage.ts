import { createTableState } from './model.js';
import type { FilterValue, TableState } from './types.js';

export function restoreState(raw: string | null, defaults: TableState, columnIds: readonly string[]): TableState {
  try {
    const value = JSON.parse(raw ?? 'null') as Record<string, unknown> | null;
    if (!value || typeof value !== 'object') return defaults;
    const strings = (items: unknown): items is string[] => Array.isArray(items) && items.every(item => typeof item === 'string');
    const filter = (item: unknown): item is FilterValue => typeof item === 'string' || strings(item) || Boolean(item && typeof item === 'object' &&
      typeof (item as { min?: unknown }).min === 'string' && typeof (item as { max?: unknown }).max === 'string');
    const filters: Record<string, FilterValue> = {};
    if (value.filters && typeof value.filters === 'object' && !Array.isArray(value.filters)) {
      Object.entries(value.filters).forEach(([id, item]) => { if (columnIds.includes(id) && filter(item)) Object.defineProperty(filters, id, { value: item, enumerable: true, configurable: true, writable: true }); });
    } else Object.assign(filters, defaults.filters);
    const widths: Record<string, number> = {};
    if (value.columnWidths && typeof value.columnWidths === 'object') Object.entries(value.columnWidths).forEach(([id, width]) => {
      if (columnIds.includes(id) && typeof width === 'number' && Number.isFinite(width)) Object.defineProperty(widths, id, { value: width, enumerable: true });
    });
    const sort = value.sort as { columnId?: unknown; direction?: unknown } | null;
    const hidden = strings(value.hiddenColumnIds) ? value.hiddenColumnIds.filter(id => columnIds.includes(id)) : defaults.hiddenColumnIds;
    return createTableState({ ...defaults, filters,
      search: typeof value.search === 'string' ? value.search : defaults.search,
      page: typeof value.page === 'number' && Number.isSafeInteger(value.page) && value.page >= 0 ? value.page : defaults.page,
      pageSize: typeof value.pageSize === 'number' && Number.isSafeInteger(value.pageSize) && value.pageSize > 0 ? value.pageSize : defaults.pageSize,
      sort: sort === null ? null : sort && typeof sort.columnId === 'string' && columnIds.includes(sort.columnId) && (sort.direction === 'asc' || sort.direction === 'desc')
        ? { columnId: sort.columnId, direction: sort.direction } : defaults.sort,
      hiddenColumnIds: columnIds.every(id => hidden.includes(id)) ? hidden.slice(1) : hidden,
      columnOrder: strings(value.columnOrder) ? value.columnOrder.filter(id => columnIds.includes(id)) : defaults.columnOrder,
      expandedColumnIds: strings(value.expandedColumnIds) ? value.expandedColumnIds.filter(id => columnIds.includes(id)) : defaults.expandedColumnIds,
      columnWidths: value.columnWidths && typeof value.columnWidths === 'object' ? widths : defaults.columnWidths,
    });
  } catch { return defaults; }
}

export function savedState(state: TableState) {
  const { selectedIds: _selected, expandedIds: _expanded, ...view } = state;
  return JSON.stringify(view);
}
