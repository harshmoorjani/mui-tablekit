import {expect, it} from 'vitest'
import {columnTree, displayedColumns, headerRows} from '../src/columnLayout.js'
import {rowTree, treeView} from '../src/tree.js'
import {createTableState} from '../src/model.js'
import type {ColumnDefinition} from '../src/index.js'

type Row = {id: string; amount: number; children?: Row[]}
const columns = [
  {id: 'id', header: 'Name', value: (row: Row) => row.id},
  {id: 'amount', header: 'Amount', value: (row: Row) => row.amount}
]
const rows: Row[] = [
  {
    id: 'parent',
    amount: 8,
    children: [
      {id: 'beta', amount: 5},
      {id: 'alpha', amount: 3}
    ]
  },
  {id: 'other', amount: 1}
]

it('pages roots, sorts siblings, reveals matching descendants and preserves ancestors', () => {
  const tree = rowTree(
    rows,
    row => row.id,
    row => row.children
  )
  const state = createTableState({expandedIds: ['parent'], pageSize: 1, sort: {columnId: 'amount', direction: 'desc'}})
  const view = treeView(tree, columns, state, () => true)
  expect(view.rows.map(row => row.id)).toEqual(['parent', 'beta', 'alpha'])
  expect(view.count).toBe(2)
  expect(treeView(tree, columns, {...state, page: 1}, () => true).rows.map(row => row.id)).toEqual(['other'])
  expect(
    treeView(tree, columns, {...state, expandedIds: [], search: 'alpha'}, () => true).rows.map(row => row.id)
  ).toEqual(['parent', 'alpha'])
  expect(
    treeView(tree, columns, {...state, expandedIds: [], search: 'missing'}, () => true, 200).rows.map(row => row.id)
  ).toEqual(['parent', 'other'])
  expect(rows[0]?.children?.map(row => row.id)).toEqual(['beta', 'alpha'])
})

it('rejects duplicate IDs and cycles, and handles deeply nested rows without recursive stack growth', () => {
  expect(() =>
    rowTree(
      [...rows, rows[0]!],
      row => row.id,
      row => row.children
    )
  ).toThrow(/unique/)
  const cycle: Row = {id: 'loop', amount: 0}
  cycle.children = [cycle]
  expect(() =>
    rowTree(
      [cycle],
      row => row.id,
      row => row.children
    )
  ).toThrow(/cycles/)
  const root: Row = {id: '0', amount: 0}
  let node = root
  for (let index = 1; index <= 5000; index++) {
    const child = {id: String(index), amount: index}
    node.children = [child]
    node = child
  }
  const tree = rowTree(
    [root],
    row => row.id,
    row => row.children
  )
  expect(treeView(tree, columns, createTableState({search: '5000'}), () => true).rows).toHaveLength(5001)
})

it('builds uneven grouped headers and recomputes spans after hiding and reordering leaves', () => {
  const definitions: ColumnDefinition<Row>[] = [
    columns[0]!,
    {
      id: 'region',
      header: 'Region',
      columns: [
        {...columns[1]!, id: 'actual'},
        {
          id: 'forecast',
          header: 'Forecast',
          columns: [
            {...columns[1]!, id: 'low'},
            {...columns[1]!, id: 'high'}
          ]
        }
      ]
    }
  ]
  const tree = columnTree(definitions)
  let headers = headerRows(tree.columns, tree.paths, 'test')
  expect(headers.rows.map(row => row.map(cell => [cell.header, cell.colSpan, cell.rowSpan]))).toEqual([
    [
      ['Name', 1, 3],
      ['Region', 3, 1]
    ],
    [
      ['Amount', 1, 2],
      ['Forecast', 2, 1]
    ],
    [
      ['Amount', 1, 1],
      ['Amount', 1, 1]
    ]
  ])
  headers = headerRows([tree.columns[3]!, tree.columns[0]!, tree.columns[1]!], tree.paths, 'test')
  expect(headers.rows[0]?.map(cell => cell.colSpan)).toEqual([1, 1, 1])
  expect(headers.associations.get('high')).toHaveLength(3)
  expect(() => columnTree([{id: 'empty', header: 'Empty', columns: []}])).toThrow(/contain/)
  expect(() => columnTree([...definitions, definitions[0]!])).toThrow(/unique/)
})

it('keeps an aggregate group in its reordered position across collapse and expansion', () => {
  const tree = columnTree([
    columns[0]!,
    {
      id: 'group',
      header: 'Group',
      value: (row: Row) => row.amount,
      columns: [
        {...columns[1]!, id: 'a'},
        {...columns[1]!, id: 'b'}
      ]
    },
    columns[1]!
  ])
  expect(displayedColumns(tree, [], ['id', 'b', 'a', 'amount']).map(column => column.id)).toEqual([
    'id',
    'group',
    'amount'
  ])
  expect(displayedColumns(tree, ['group'], ['amount', 'group', 'id']).map(column => column.id)).toEqual([
    'amount',
    'a',
    'b',
    'id'
  ])
  expect(displayedColumns(tree, ['group'], ['b', 'a', 'id', 'amount']).map(column => column.id)).toEqual([
    'b',
    'a',
    'id',
    'amount'
  ])
  expect(displayedColumns(tree, [], ['amount', 'group', 'amount', 'id']).map(column => column.id)).toEqual([
    'amount',
    'group',
    'id'
  ])
})
