import { activeFilter, getView, matchesRow, rowComparator } from './model.js';
import type { SearchOptions } from './model.js';
import type { Column, TableState } from './types.js';

export interface RowNode<Row> {
  row: Row;
  id: string;
  depth: number;
  children: RowNode<Row>[];
}

export function rowTree<Row>(rows: readonly Row[], getRowId: (row: Row) => string, getSubRows: (row: Row) => readonly Row[] | undefined) {
  const roots: RowNode<Row>[] = [];
  const all: RowNode<Row>[] = [];
  const ids = new Set<string>();
  const stack = [...rows].reverse().map(row => ({ row, depth: 0, target: roots }));
  while (stack.length) {
    const { row, depth, target } = stack.pop()!;
    const id = getRowId(row);
    if (typeof id !== 'string' || !id || ids.has(id)) throw new Error('MUI Tablekit: tree rows require globally unique, nonempty IDs; cycles are not allowed.');
    ids.add(id);
    const node: RowNode<Row> = { row, id, depth, children: [] };
    target.push(node); all.push(node);
    const children = getSubRows(row) ?? [];
    for (let index = children.length - 1; index >= 0; index--) stack.push({ row: children[index]!, depth: depth + 1, target: node.children });
  }
  return { roots, all };
}

export function treeView<Row>(tree: ReturnType<typeof rowTree<Row>>, columns: readonly Column<Row>[], state: TableState,
  isRowExpandable: (row: Row) => boolean, serverRowCount?: number, options: SearchOptions<Row> = {}) {
  const kept = new Map<string, RowNode<Row>>();
  const compare = serverRowCount === undefined ? rowComparator(columns, state.sort) : undefined;
  const order = (nodes: RowNode<Row>[]) => compare ? nodes.sort((a, b) => compare(a.row, b.row)) : nodes;
  for (let index = tree.all.length - 1; index >= 0; index--) {
    const node = tree.all[index]!;
    const children = order(node.children.flatMap(child => { const match = kept.get(child.id); return match ? [match] : []; }));
    if (serverRowCount !== undefined || children.length || matchesRow(node.row, columns, state, options)) kept.set(node.id, { ...node, children });
  }
  const roots = order(tree.roots.flatMap(node => { const match = kept.get(node.id); return match ? [match] : []; }));
  const page = getView(roots, [], { ...state, search: '', filters: {}, sort: null }, serverRowCount);
  const reveal = serverRowCount === undefined && Boolean(state.search.trim() || columns.some(column => activeFilter(state.filters[column.id])));
  const expanded = new Set(state.expandedIds);
  const flatten = (nodes: readonly RowNode<Row>[], visible: boolean) => {
    const result: RowNode<Row>[] = [];
    const stack = [...nodes].reverse();
    while (stack.length) {
      const node = stack.pop()!;
      result.push(node);
      if (!visible || (isRowExpandable(node.row) && (reveal || expanded.has(node.id)))) {
        for (let index = node.children.length - 1; index >= 0; index--) stack.push(node.children[index]!);
      }
    }
    return result;
  };
  const visible = flatten(page.rows, true);
  return { rows: visible.map(node => node.row), allRows: flatten(roots, false).map(node => node.row), count: page.count, page: page.page,
    nodes: kept, reveal };
}
