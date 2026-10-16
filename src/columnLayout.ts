import type { Column, ColumnDefinition, ColumnGroup } from './types.js';

export function columnTree<Row>(definitions: readonly ColumnDefinition<Row>[]) {
  const columns: Column<Row>[] = [];
  const paths = new Map<string, readonly ColumnGroup<Row>[]>();
  const groups = new Map<string, ColumnGroup<Row>>();
  const ids = new Set<string>();
  const stack = [...definitions].reverse().map(column => ({ column, parents: [] as ColumnGroup<Row>[] }));
  while (stack.length) {
    const { column, parents } = stack.pop()!;
    if (!column.id || typeof column.id !== 'string' || ids.has(column.id)) throw new Error('MUI Tablekit: columns and groups require unique, nonempty IDs; cycles are not allowed.');
    ids.add(column.id);
    if ('columns' in column) {
      groups.set(column.id, column); paths.set(column.id, parents);
      if (column.value) columns.push({ ...column, value: column.value });
      if (!column.columns.length) throw new Error('MUI Tablekit: column groups must contain columns.');
      for (let index = column.columns.length - 1; index >= 0; index--) stack.push({ column: column.columns[index]!, parents: [...parents, column] });
    } else { columns.push(column); paths.set(column.id, parents); }
  }
  if (!columns.length) throw new Error('MUI Tablekit: provide columns with unique, nonempty ids.');
  return { columns, paths, groups, definitions };
}

export function displayedColumns<Row>(tree: ReturnType<typeof columnTree<Row>>, expanded: readonly string[]) {
  const result: Column<Row>[] = [];
  const open = new Set(expanded);
  const stack = [...tree.definitions].reverse();
  while (stack.length) {
    const column = stack.pop()!;
    if (column.excluded) continue;
    if ('columns' in column) {
      if (column.value && !open.has(column.id)) result.push({ ...column, value: column.value });
      else for (let index = column.columns.length - 1; index >= 0; index--) stack.push(column.columns[index]!);
    } else result.push(column);
  }
  return result;
}

export interface HeaderCell<Row> {
  id: string;
  header: string;
  column?: Column<Row>;
  group?: ColumnGroup<Row>;
  leaves: readonly Column<Row>[];
  colSpan: number;
  rowSpan: number;
}

export function headerRows<Row>(columns: readonly Column<Row>[], paths: Map<string, readonly ColumnGroup<Row>[]>, tableId: string) {
  const levels = Math.max(...columns.map(column => paths.get(column.id)?.length ?? 0)) + 1;
  const rows: HeaderCell<Row>[][] = Array.from({ length: levels }, () => []);
  const associations = new Map<string, string[]>();
  const leafIds = new Map([...paths.keys()].map((id, index) => [id, `${tableId}-leaf${index}`]));
  columns.forEach(column => associations.set(column.id, []));
  for (let level = 0; level < levels; level++) {
    let previous: HeaderCell<Row> | undefined;
    for (const column of columns) {
      const parents = paths.get(column.id) ?? [];
      if (parents.length < level) { previous = undefined; continue; }
      const group = parents[level];
      if (group && previous?.group === group && previous.leaves[0]?.sticky === column.sticky) {
        previous.colSpan++;
        previous.leaves = [...previous.leaves, column];
      } else {
        previous = { id: group ? `${tableId}-h${level}-${rows[level]!.length}` : leafIds.get(column.id)!, header: group?.header ?? column.header,
          column: group ? undefined : column, group, leaves: [column], colSpan: 1, rowSpan: group ? 1 : levels - level };
        rows[level]!.push(previous);
      }
      associations.get(column.id)!.push(previous.id);
    }
  }
  return { rows, associations };
}
