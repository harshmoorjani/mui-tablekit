import {fireEvent, render, screen, within} from '@testing-library/react'
import {userEvent} from '@testing-library/user-event'
import {afterEach, expect, it} from 'vitest'
import {createTableState} from '../src/index.js'
import {directoryQuery, restoreView, saveView} from '../demo/serverAdapter.js'
import {ServerDemo} from '../demo/ServerDemo.js'
import {createPeople} from '../demo/data.js'

afterEach(() => sessionStorage.clear())

it('validates saved views, omits action state, and maps backend queries explicitly', () => {
  const state = createTableState({
    search: 'Ada',
    page: 2,
    pageSize: 25,
    selectedIds: ['old'],
    expandedIds: ['old'],
    filters: {team: ['Design', 'Finance'], age: {min: '25', max: '40'}, joined: {min: '2024-01-01', max: ''}},
    sort: {columnId: 'age', direction: 'desc'}
  })
  expect(restoreView(saveView(state))).toEqual({...state, selectedIds: [], expandedIds: []})
  for (const raw of [
    'invalid',
    '{}',
    '{"page":-1}',
    saveView({...state, pageSize: 0}),
    saveView({...state, filters: {team: [4] as unknown as string[]}})
  ]) {
    expect(restoreView(raw)).toEqual(createTableState())
  }
  expect(directoryQuery(state)).toEqual({
    searchText: 'Ada',
    teams: ['Design', 'Finance'],
    fromAge: 25,
    toAge: 40,
    fromDate: '2024-01-01',
    toDate: undefined,
    sortOrder: 'age|desc',
    pageNo: 3,
    pageSize: 25
  })
  expect(() => directoryQuery({...state, filters: {age: {min: 'invalid', max: ''}}})).toThrow(/numbers/)
})

it('restores the view, debounces search, cancels stale requests and keeps selection out of storage', async () => {
  const user = userEvent.setup()
  sessionStorage.setItem(
    `mui-tablekit:server-demo:${location.pathname}`,
    saveView(createTableState({search: 'Ada', page: 99}))
  )
  render(<ServerDemo />)
  const table = screen.getByRole('table', {name: 'Server directory'})
  const people = createPeople(1000)
  const ada = people.filter(row => row.name.includes('Ada'))
  const lastPageName = ada[Math.floor((ada.length - 1) / 10) * 10]!.name
  expect((await within(table).findAllByText(lastPageName))[0]).toBeVisible()
  const search = screen.getByRole('searchbox')
  fireEvent.change(search, {target: {value: 'no-such-person'}})
  fireEvent.change(search, {target: {value: 'Cleo'}})
  expect((await within(table).findAllByText(people.find(row => row.name.includes('Cleo'))!.name))[0]).toBeVisible()
  expect(within(table).queryByText(lastPageName)).not.toBeInTheDocument()
  const firstCheckbox = within(table).getAllByRole('checkbox')[1]!
  await user.click(firstCheckbox)
  expect(screen.getByText('1 selected')).toBeVisible()
  const saved = sessionStorage.getItem(`mui-tablekit:server-demo:${location.pathname}`)!
  expect(saved).not.toContain('selectedIds')
  expect(restoreView(saved).search).toBe('Cleo')
})
