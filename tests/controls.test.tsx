import {act, fireEvent, render, screen, within} from '@testing-library/react'
import {userEvent} from '@testing-library/user-event'
import {expect, it, vi} from 'vitest'
import {createTableState, DataTable} from '../src/index.js'
import * as output from '../src/output.js'

const rows = [{id: 'a'}, {id: 'b'}, {id: 'c'}]
const columns = [{id: 'id', header: 'Name', value: (row: {id: string}) => row.id}]
const base = {rows, columns, getRowId: (row: {id: string}) => row.id, caption: 'Controls'}

it.each([false, true])('keeps a visible column when toggling a group with hidden columns (expanded: %s)', expanded => {
  render(
    <DataTable
      {...base}
      columns={[
        ...columns,
        {
          id: 'total',
          header: 'Total',
          value: row => row.id,
          columns: [
            {id: 'a', header: 'A', value: row => row.id},
            {id: 'b', header: 'B', value: row => row.id}
          ]
        }
      ]}
      defaultState={{
        expandedColumnIds: expanded ? ['total'] : [],
        hiddenColumnIds: expanded ? ['id', 'total', 'b'] : ['id', 'a', 'b']
      }}
    />
  )
  fireEvent.click(screen.getByRole('button', {name: `${expanded ? 'Collapse' : 'Expand'} Total columns`}))
  expect(screen.getByRole('columnheader', {name: expanded ? /Total/ : /A/})).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: `${expanded ? 'Expand' : 'Collapse'} Total columns`}))
  expect(screen.getByRole('columnheader', {name: expanded ? /A/ : /Total/})).toBeVisible()
})

it.each([false, true])('leaves an aggregate visible when its children are excluded (with sibling: %s)', sibling => {
  render(
    <DataTable
      {...base}
      columns={[
        ...(sibling ? [{...columns[0]!, id: 'sibling'}] : []),
        {id: 'total', header: 'Total', value: row => row.id, columns: [{...columns[0]!, excluded: true}]}
      ]}
    />
  )
  fireEvent.click(screen.getByRole('button', {name: 'Expand Total columns'}))
  expect(screen.getByRole('columnheader', {name: /Total/})).toBeVisible()
})

it('keeps the title before controls, filters before search, and inline selection beside search', () => {
  render(
    <DataTable
      {...base}
      columns={[{...columns[0]!, filterable: true}]}
      selectable
      csvFileName='rows.csv'
      defaultState={{selectedIds: ['a']}}
    />
  )
  const title = screen.getByRole('heading', {name: 'Controls'})
  const search = screen.getByRole('searchbox')
  const before = (left: Element, right: Element) =>
    Boolean(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING)
  expect(screen.getByRole('table', {name: 'Controls'})).not.toContainElement(title)
  expect(before(title, screen.getByRole('button', {name: 'Filters'}))).toBe(true)
  expect(before(screen.getByRole('button', {name: 'Filters'}), search)).toBe(true)
  expect(before(search, screen.getByText('1 selected'))).toBe(true)
  expect(before(screen.getByText('1 selected'), screen.getByRole('button', {name: 'Download CSV'}))).toBe(true)
})

it('preserves pending debounced search while selection replaces the toolbar', () => {
  vi.useFakeTimers()
  try {
    render(<DataTable {...base} selectable selectionToolbar='replace' searchDebounceMs={200} />)
    fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'b'}})
    fireEvent.click(screen.getByRole('checkbox', {name: 'Select row a'}))
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(200))
    expect(screen.getByText('b')).toBeVisible()
    fireEvent.click(screen.getByRole('button', {name: 'Clear selection'}))
    expect(screen.getByRole('searchbox')).toHaveValue('b')
  } finally {
    vi.useRealTimers()
  }
})

it('preserves pending debounced search when its field is hidden and focuses it when reopened', () => {
  vi.useFakeTimers()
  try {
    render(<DataTable {...base} searchDisplay='toggle' searchDebounceMs={200} />)
    fireEvent.click(screen.getByRole('button', {name: 'Show search'}))
    fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'b'}})
    fireEvent.click(screen.getByRole('button', {name: 'Hide search'}))
    act(() => vi.advanceTimersByTime(200))
    const show = screen.getByRole('button', {name: 'Show search: b'})
    expect(show).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('b')).toBeVisible()
    fireEvent.click(show)
    expect(screen.getByRole('searchbox')).toHaveValue('b')
    expect(screen.getByRole('searchbox')).toHaveFocus()
  } finally {
    vi.useRealTimers()
  }
})

it('paints pinned cells with the custom row background over an opaque base', () => {
  render(<DataTable {...base} columns={[{...columns[0]!, sticky: 'left'}]} rowSx={() => ({bgcolor: '#ffeecc'})} />)
  const cell = screen.getByRole('cell', {name: 'a'})
  expect(cell).toHaveStyle({position: 'sticky', backgroundColor: 'rgb(255, 255, 255)'})
  expect(getComputedStyle(cell).backgroundImage).toMatch(/ffeecc|255, 238, 204/)
})

it('selects a page and page size from the compact footer and clamps empty results', async () => {
  const user = userEvent.setup()
  const {rerender} = render(<DataTable {...base} defaultState={{pageSize: 1}} pageSizeOptions={[1, 2]} />)
  const pages = screen.getByRole('combobox', {name: 'Page:'})
  await user.selectOptions(pages, within(pages).getByRole('option', {name: '3'}))
  expect(screen.getByText('c')).toBeVisible()
  expect(screen.getByRole('button', {name: 'Next page'})).toBeDisabled()
  await user.selectOptions(screen.getByRole('combobox', {name: 'Rows/Page:'}), '2')
  expect(screen.getByText('a')).toBeVisible()
  expect(screen.getByText('b')).toBeVisible()
  expect(screen.getByRole('combobox', {name: 'Page:'})).toHaveValue('0')
  rerender(<DataTable {...base} rows={[]} />)
  expect(screen.getByRole('combobox', {name: 'Page:'})).toHaveValue('0')
  expect(screen.getByRole('button', {name: 'Next page'})).toBeDisabled()
})

it('uses bounded numeric page entry for large server counts and preserves custom pagination', () => {
  const onStateChange = vi.fn()
  const props = {
    ...base,
    mode: 'server' as const,
    rowCount: 10000000,
    state: createTableState({pageSize: 1}),
    onStateChange
  }
  const {rerender} = render(<DataTable {...props} />)
  const page = screen.getByRole('spinbutton', {name: 'Page:'})
  expect(screen.getAllByRole('option')).toHaveLength(4)
  fireEvent.change(page, {target: {value: '9000000'}})
  fireEvent.blur(page)
  expect(onStateChange).toHaveBeenLastCalledWith(expect.objectContaining({page: 8999999}))
  expect(page).toHaveValue(1)
  fireEvent.change(page, {target: {value: '10000001'}})
  fireEvent.blur(page)
  expect(page).toHaveValue(1)
  rerender(
    <DataTable
      {...props}
      components={{Pagination: props => <button onClick={() => props.onPageChange(null, 4)}>Custom page</button>}}
    />
  )
  fireEvent.click(screen.getByRole('button', {name: 'Custom page'}))
  expect(onStateChange).toHaveBeenLastCalledWith(expect.objectContaining({page: 4}))
})

it.each([40, 700])('opens immediate filters from the left edge of an offset toolbar (%s)', async left => {
  vi.stubGlobal('innerWidth', 1440)
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(600)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200)
  try {
    render(<DataTable {...base} columns={[{...columns[0]!, filterable: true}]} />)
    const trigger = screen.getByRole('button', {name: 'Filters'})
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      x: left,
      y: 100,
      left,
      right: left + 40,
      top: 100,
      bottom: 140,
      width: 40,
      height: 40,
      toJSON: () => ({})
    })
    await userEvent.setup().click(trigger)
    expect(screen.getByRole('dialog', {name: 'Filters'})).toHaveStyle({left: `${left}px`})
  } finally {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})

it('opens immediate filters from the compact toolbar and retains applied values after closing', async () => {
  const user = userEvent.setup()
  const onAction = vi.fn()
  render(
    <DataTable
      {...base}
      columns={[{...columns[0]!, filterable: true}]}
      columnControls
      csvFileName='rows.csv'
      printable
      onAction={onAction}
    />
  )
  expect(screen.queryByRole('textbox', {name: 'Filter Name'})).not.toBeInTheDocument()
  const filters = screen.getByRole('button', {name: 'Filters'})
  expect(filters).toHaveAttribute('aria-expanded', 'false')
  await user.click(filters)
  await user.type(
    within(screen.getByRole('dialog', {name: 'Filters'})).getByRole('textbox', {name: 'Filter Name'}),
    'b'
  )
  await user.keyboard('{Escape}')
  expect(filters).toHaveFocus()
  expect(filters).toHaveAttribute('aria-pressed', 'true')
  expect(filters).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByText('b')).toBeVisible()
  expect(screen.queryByText('a', {selector: 'td *'})).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', {name: 'Columns'}))
  expect(screen.getByRole('dialog', {name: 'Columns'})).toBeVisible()
  await user.keyboard('{Escape}')
  expect(onAction.mock.calls.map(call => call[0])).toEqual(['init', 'filterOpen', 'filter', 'filterClose'])
})

it('keeps reset inside immediate filters and preserves the rest of the view on dismissal', async () => {
  const user = userEvent.setup()
  const onAction = vi.fn()
  render(
    <DataTable
      {...base}
      columns={[{...columns[0]!, filterable: true}]}
      onAction={onAction}
      selectable
      defaultState={{search: 'b', selectedIds: ['b'], filters: {id: 'b'}}}
    />
  )
  const trigger = screen.getByRole('button', {name: 'Filters'})
  await user.click(trigger)
  const panel = within(screen.getByRole('dialog', {name: 'Filters'}))
  await user.click(panel.getByRole('button', {name: 'Reset filters'}))
  expect(panel.getByRole('textbox', {name: 'Filter Name'})).toHaveValue('')
  expect(panel.getByRole('button', {name: 'Reset filters'})).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(trigger).toHaveFocus()
  expect(screen.getByRole('searchbox')).toHaveValue('b')
  expect(screen.getByRole('checkbox', {name: 'Select row b'})).toBeChecked()
  expect(onAction.mock.calls.map(call => call[0])).toEqual(['init', 'filterOpen', 'filterReset', 'filterClose'])
})

it('supports an application-owned grouped ID picker on an excluded column with readable chips', async () => {
  const user = userEvent.setup()
  render(
    <DataTable
      {...base}
      columns={[
        ...columns,
        {
          id: 'scope',
          header: 'Group',
          excluded: true,
          value: row => row.id,
          filterType: 'multiselect',
          filterOptions: [
            {value: 'a', label: 'North / Alpha'},
            {value: 'b', label: 'South / Beta'}
          ],
          renderFilter: ({id, label, value, onChange}) => <label htmlFor={id}>
            {label}
            <select
              id={id}
              multiple
              value={Array.isArray(value) ? value : []}
              onChange={event => onChange([...event.target.selectedOptions].map(option => option.value))}>
              <optgroup label='North'>
                <option value='a'>Alpha</option>
              </optgroup>
              <optgroup label='South'>
                <option value='b'>Beta</option>
              </optgroup>
            </select>
          </label>
        }
      ]}
    />
  )
  await user.click(screen.getByRole('button', {name: 'Filters'}))
  await user.selectOptions(screen.getByRole('listbox', {name: 'Filter Group'}), 'b')
  await user.keyboard('{Escape}')
  expect(screen.getByText('b')).toBeVisible()
  expect(screen.queryByText('a', {selector: 'td *'})).not.toBeInTheDocument()
  expect(screen.queryByRole('columnheader', {name: 'Group'})).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', {name: 'Remove Group: South / Beta'}))
  expect(screen.getByText('a')).toBeVisible()
})

it('focuses newly opened search and exposes the active query while it is hidden', async () => {
  const user = userEvent.setup()
  render(<DataTable {...base} searchDisplay='toggle' />)
  await user.click(screen.getByRole('button', {name: 'Show search'}))
  expect(screen.getByRole('searchbox')).toHaveFocus()
  await user.keyboard('b')
  await user.click(screen.getByRole('button', {name: 'Hide search'}))
  const trigger = screen.getByRole('button', {name: 'Show search: b'})
  expect(trigger).toHaveAttribute('aria-pressed', 'true')
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await user.click(trigger)
  expect(screen.getByRole('searchbox')).toHaveFocus()
  await user.clear(screen.getByRole('searchbox'))
  await user.click(screen.getByRole('button', {name: 'Hide search'}))
  expect(screen.getByRole('button', {name: 'Show search'})).toHaveAttribute('aria-pressed', 'false')
})

it('keeps column panel arrows within the same sticky zone', async () => {
  const user = userEvent.setup()
  render(
    <DataTable
      {...base}
      columnControls
      columns={[
        {...columns[0]!, sticky: 'left'},
        {...columns[0]!, id: 'middle', header: 'Middle'},
        {...columns[0]!, id: 'last', header: 'Last'},
        {...columns[0]!, id: 'pinned', header: 'Pinned', sticky: 'right'}
      ]}
    />
  )
  await user.click(screen.getByRole('button', {name: 'Columns'}))
  expect(screen.getByRole('button', {name: 'Move Name next'})).toBeDisabled()
  expect(screen.getByRole('button', {name: 'Move Middle previous'})).toBeDisabled()
  expect(screen.getByRole('button', {name: 'Move Last next'})).toBeDisabled()
  expect(screen.getByRole('button', {name: 'Move Pinned previous'})).toBeDisabled()
  await user.click(screen.getByRole('button', {name: 'Move Middle next'}))
  expect(screen.getByRole('button', {name: 'Move Middle previous'})).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual([
    'Name',
    'Last',
    'Middle',
    'Pinned'
  ])
})

it('accepts custom toolbar button components and a full toolbar layout without losing actions', async () => {
  const user = userEvent.setup()
  const csv = vi.spyOn(output, 'downloadCsv').mockImplementation(() => {})
  const print = vi.spyOn(output, 'printRows').mockImplementation(() => {})
  try {
    render(
      <DataTable
        {...base}
        csvFileName='rows.csv'
        printable
        columns={[{...columns[0]!, filterable: true}]}
        components={{
          ToolbarButton: ({action, label, onClick}) => <button data-action={action} onClick={onClick}>
            {label}
          </button>
        }}
        renderToolbar={controls => <section aria-label='My toolbar'>
          {controls.print}
          {controls.csv}
          {controls.filters}
          {controls.search}
        </section>}
      />
    )
    expect(
      within(screen.getByRole('region', {name: 'My toolbar'}))
        .getAllByRole('button')
        .map(button => button.dataset.action)
    ).toEqual(['print', 'csv', 'filters'])
    await user.click(screen.getByRole('button', {name: 'Download CSV'}))
    expect(csv).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', {name: 'Print'}))
    expect(print).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', {name: 'Filters'}))
    expect(screen.getByRole('dialog', {name: 'Filters'})).toBeVisible()
  } finally {
    csv.mockRestore()
    print.mockRestore()
  }
})

it('shows the insertion edge during dragging, clears it after drop and rejects locked crossings', () => {
  const moreColumns = [
    columns[0]!,
    {...columns[0]!, id: 'second', header: 'Second'},
    {...columns[0]!, id: 'third', header: 'Third'}
  ]
  const {rerender} = render(<DataTable {...base} columns={moreColumns} columnReordering />)
  let payload = ''
  const transfer = {
    setData: (_: string, value: string) => {
      payload = value
    },
    getData: () => payload,
    dropEffect: ''
  }
  const hover = (target: HTMLElement) => {
    const event = new MouseEvent('dragover', {bubbles: true, cancelable: true, clientX: 100})
    Object.defineProperty(event, 'dataTransfer', {value: transfer})
    fireEvent(target, event)
  }
  fireEvent.dragStart(screen.getByRole('button', {name: 'Move Name (drag or use left/right arrows)'}), {
    dataTransfer: transfer
  })
  const target = screen.getByRole('columnheader', {name: /Third/})
  hover(target)
  expect(target).toHaveAttribute('data-drop-side', 'after')
  expect(target).toHaveStyle({boxShadow: 'inset -3px 0 #1976d2'})
  fireEvent.drop(target, {dataTransfer: transfer})
  expect(screen.getAllByRole('columnheader').map(cell => cell.textContent?.replace('↔', ''))).toEqual([
    'Second',
    'Third',
    'Name'
  ])
  expect(document.querySelector('[data-drop-side]')).toBeNull()
  rerender(
    <DataTable
      key='locked'
      {...base}
      columns={moreColumns.map(column => ({...column, draggable: column.id !== 'second'}))}
      columnReordering
    />
  )
  fireEvent.dragStart(screen.getByRole('button', {name: 'Move Name (drag or use left/right arrows)'}), {
    dataTransfer: transfer
  })
  const lockedTarget = screen.getByRole('columnheader', {name: /Third/})
  hover(lockedTarget)
  expect(lockedTarget).not.toHaveAttribute('data-drop-side')
  fireEvent.drop(lockedTarget, {dataTransfer: transfer})
  expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent('Name')
})
