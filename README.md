# MUI Tablekit

A small, typed React table built with MUI. Independent of mui-datatables, with a fresh API.

Inspired by [mui-datatables](https://github.com/gregnb/mui-datatables). Upstream development appears inactive: its latest default-branch commit is from [January 2023](https://github.com/gregnb/mui-datatables/commit/e09c39cb3c5713c7c157845b3d3e4b7d77c77649). MUI Tablekit aims to carry that useful feature set forward with current React and MUI, a smaller implementation, and its own typed API.

**Not published yet.** Core features are implemented; release qualification is still in progress.

## Try it

Requires Node.js 24. Install dependencies, then start the local demo:

```sh
npm ci --ignore-scripts
npm run dev
```

Run `npm run check` for type checks, interaction tests, package compilation, and the demo build.

The playground has up to 10,000 synthetic rows, feature switches, and an optional server adapter example. It contains no application data or credentials.

## Usage

React 19.3.1+, MUI 9.5+, Emotion React 11.5+, and Emotion Styled 11.3+ are peer dependencies. Only these major versions are currently supported. Development uses TypeScript 6.0.3. Current checks use React 19.3.1, MUI 9.5.0, and Emotion React/Styled 11.14.x; every version within the peer ranges has not been tested.

After publication, the import will be `mui-tablekit`. For local testing, run `npm pack` here and install the generated tarball in another project.

```tsx
import { DataTable, type Column } from 'mui-tablekit';

type Person = { id: string; name: string; age: number };

const columns: Column<Person>[] = [
  { id: 'name', header: 'Name', value: row => row.name, filterable: true },
  { id: 'age', header: 'Age', value: row => row.age, align: 'right' },
];

const people: Person[] = [
  { id: 'ada', name: 'Ada', age: 36 },
  { id: 'ben', name: 'Ben', age: 28 },
];

<DataTable
  caption="People"
  rows={people}
  columns={columns}
  getRowId={row => row.id}
/>;
```

Use `render(value, row)` on a column for custom cells. Values are strings, numbers, booleans, valid `Date` objects, nullish values, or readonly arrays of these scalar values. Arrays display as comma-separated text and participate in search. Default array sorting compares that text; supply `compare(a, b)` for another ordering. Plain cell text is escaped by React. Supply `filter(row, query)` for a custom column predicate. `sortable: false` disables sorting; `searchable: false` excludes a column from global search. Sorting cycles ascending, descending, unsorted.

Search and text filters use case-insensitive substring matching. Search matches any searchable column; column filters are combined with AND. Numeric values and dates sort by value, strings use the environment's locale, and nullish values sort last ascending. Search and filters run before sorting and pagination. Input rows are never mutated.

### Filters

`filterable: true` enables a text filter. `filterType` enables a specific control: `text`, `select`, `multiselect`, `numberRange`, or `dateRange`. Set `filterable: false` to suppress its control. Select controls take `filterOptions: [{ value, label }]`; values are strings, including `"true"`/`"false"` for boolean columns. When omitted, choices are inferred from all supplied rows, deduplicated, and sorted. Array members become individual choices; nullish values are omitted. Active inferred choices remain available after a refresh. An explicit options array, including `[]`, overrides inference. In server mode, provide options for the entire result set when choices must go beyond the loaded page. An empty string clears a single select.

`FilterValue` is a string for text/select, `string[]` for multiselect, or `{ min: string, max: string }` for ranges. A custom `filter(row, query)` receives this value and replaces the built-in matching. Multiselect matches any chosen value exactly; an empty selection clears the filter. Ranges are inclusive, and either bound may be blank. Numeric ranges accept numbers or numeric strings. Date ranges use UTC days and accept `Date` values or ISO date strings; include a timezone in timestamp strings. Impossible calendar dates, invalid cell values, and inverted ranges do not match an active range. Filters remain available when their columns are hidden.

For array cells, select matches an exact member. Multiselect uses `filterMatch: 'any'` by default; use `'all'` to require every selected value. An empty filter matches every row, including empty arrays. Range filters apply to scalar cells; supply a custom predicate for ranges over array members.

Use `renderFilter({ id, label, value, onChange })` for a custom control. It enables the control automatically, takes precedence over `filterType`, and can be suppressed with `filterable: false`. The renderer writes the same `FilterValue` shapes as built-in controls. Pair it with `filter(row, query)` for custom client matching; server mode only reports state changes. Label your custom inputs and use the supplied `id` when linking a label.

```tsx
const nameColumn: Column<Person> = {
  id: 'name', header: 'Name', value: row => row.name,
  filter: (row, query) => typeof query === 'string' && row.name.startsWith(query),
  filterOptions: [{ value: 'A', label: 'Starts with A' }],
  renderFilter: ({ id, value, onChange }) => (
    <label htmlFor={id}>
      <input id={id} type="checkbox" checked={value === 'A'}
        onChange={event => onChange(event.target.checked ? 'A' : '')} />
      Names starting with A
    </label>
  ),
};
```

Active filters produce removable chips, including on hidden columns. Multiselect values and range bounds have separate chips. Clicking a chip or pressing Enter, Backspace, or Delete removes that criterion and resets the page. `filterOptions` supplies display labels for values, including custom widgets; empty multiselect values use the localized `emptyFilterValue` label. Empty strings, empty arrays, and ranges with both bounds empty produce no chips.

“Reset filters” clears all column filters and resets the page to zero. It preserves search, sort, selection, expansion, layout, and page size. Customize chip text and actions with `labels.filterChip`, `labels.removeFilter`, `labels.resetFilters`, and the existing range labels. Controlled tables report changes and wait for the parent to apply them, keeping custom widgets, chips, and results in sync.

Set `filterMode="confirm"` to replace inline controls with a Filters dialog. Edits and its reset button affect a private draft. Apply commits the draft once and resets the page; Cancel, Escape, or clicking outside discards it. Chips outside the dialog still remove applied filters immediately. Labels include `filters`, `applyFilters`, and `cancelFilters`. Custom widgets must treat their supplied value as immutable.

### Search and pagination switches

Both default to `true`. Set `search={false}` to hide the search field and ignore stored search text during client filtering. Stored text is retained so re-enabling search restores it. Column filters still apply.

Set `pagination={false}` to hide the pager and show all filtered, sorted client rows. Selection applies to those visible rows; CSV and print still use the full filtered result. Stored page size is retained for re-enabling pagination. With neither search nor other toolbar content, no empty toolbar is rendered.

Server mode always renders only supplied rows. These switches hide controls; the parent still owns remote queries, search criteria, pagination state, and data fetching. They do not request an entire remote dataset or silently rewrite parent-owned state.

## State

Uncontrolled tables accept `defaultState` and optionally report changes through `onStateChange`. Controlled tables accept the complete `state` and `onStateChange`; the parent must apply changes. Keep the ownership mode fixed during a table's lifetime.

```tsx
import { useState } from 'react';
import { createTableState, DataTable } from 'mui-tablekit';

const [state, setState] = useState(() => createTableState({ pageSize: 25 }));

<DataTable
  caption="People"
  rows={people}
  columns={columns}
  getRowId={row => row.id}
  state={state}
  onStateChange={setState}
/>;
```

State has `search`, `filters` (column ID to `FilterValue`), `sort` (`{ columnId, direction }` or `null`), zero-based `page`, positive `pageSize`, `selectedIds`, `expandedIds`, `hiddenColumnIds`, `columnOrder`, and `columnWidths`. Use `createTableState` to supply defaults. Search, filter, sort, and page-size changes reset the page. When client rows shrink, the displayed page is clamped; the next interaction reports that page. No state is persisted automatically.

Treat data and state as immutable: replace the rows array, column definitions, filters, or sort object when changing them. The row model is cached by these references so selection, expansion, and layout changes do not repeat filtering/sorting. CSV and print reuse that same result.

## Selection and bulk actions

Set `selectable` to show checkboxes. `getRowId` must return a unique, nonempty string that remains stable across sorting, paging, and data refreshes. Column IDs must also be unique and nonempty.

```tsx
<DataTable
  caption="People"
  rows={people}
  columns={columns}
  getRowId={row => row.id}
  selectable
  renderBulkActions={ids => <button onClick={() => archive(ids)}>Archive</button>}
/>;
```

The header checkbox selects or deselects the current page. Other pages' selections remain. Selection also survives search, filtering, sorting, and refreshed rows. Bulk actions receive IDs, including selected IDs absent from the current dataset. The caller must validate those IDs and clear selection after deletion, a dataset switch, or an action where retaining it would be misleading. The table never executes a bulk action automatically.

Use `selectable="single"` for at most one selected ID and no header checkbox. If existing state contains multiple IDs, single mode uses the last ID. `isRowSelectable(row)` disables selection for ineligible rows. Eligibility does not purge existing IDs: the caller still owns action validation and clearing stale selection.

`selectOnClick` enables selection by clicking ordinary row content or focusing the row and pressing Space/Enter. Nested links, inputs, buttons, and common interactive roles keep their own behaviour. Custom interactive controls should use native elements or appropriate roles. Set `selectAllScope="filtered"` for the header checkbox to cover all eligible filtered client rows across pages. In server mode it covers only eligible supplied rows and is labeled “Select loaded rows”; it never claims to select unseen records.

## Expansion and column layout

Pass `renderExpanded(row)` to enable row details. Expansion uses stable row IDs and survives sorting, filtering, paging, and data refreshes. The toggle exposes its expanded state and references the details cell. Clear `expandedIds` when switching datasets.

`isRowExpandable(row)` restricts which rows can show details. `expandAll` adds a header toggle for all eligible filtered client rows, or only supplied server rows. Collapsing that scope preserves expansion IDs outside it. Changing eligibility hides the details without deleting their IDs.

Set `columnControls` to show a collapsible panel for visibility, ordering, and width. Checkboxes preserve at least one visible column; move buttons support keyboard operation. Width inputs apply on blur and clamp to 80–1000 pixels. Columns can stretch to fill the table container. These controls do not alter selection, expansion, sorting, or filters.

Layout is also controllable through `hiddenColumnIds`, `columnOrder`, and `columnWidths` without the panel. At least one column must remain visible. Unknown/duplicate order IDs are ignored, and new columns are appended in definition order. Only the supplied column definitions can appear.

`excluded: true` on a column permanently removes it from the table, layout controls, CSV, and print. Its accessor can still support search and filters; this is a presentation option, not an authorization boundary. Use `searchable: false` and `filterable: false` when appropriate, and never send unauthorized data to the browser.

`columnReordering` adds header drag handles; focus a handle and use Left/Right to move it with the keyboard. `columnResizing` adds pointer handles with Left/Right steps of 10 px and Home/End limits of 80/1000 px. Touch resizing uses pointer capture; ordering uses native desktop drag or keyboard controls. The existing column panel remains an alternative for all layouts.

## CSV and printing

Set `csvFileName="people.csv"` and/or `printable` to show the corresponding buttons. Both use visible columns in their current order, with raw accessor values rather than custom cell markup. Client output contains **all filtered, sorted rows**, across pages, regardless of selection. Server output contains **only the supplied page**; buttons say “Download page CSV” and “Print page.” Fetching an entire remote result set remains the caller's responsibility.

CSV uses UTF-8 with a BOM, quoted fields, escaped quotes, and CRLF record separators. Formula-like strings (including full-width prefixes and leading control characters) receive a tab prefix; numeric values retain their type representation. This changes those strings' underlying data. See [OWASP's CSV injection guidance](https://community.owasp.org/attacks/CSV_Injection) for spreadsheet-specific limits: no CSV escaping strategy is universal across consumers.

Pass `csvOptions={{ delimiter: ';' }}` for another separator (one printable character other than a quote). A column's `exportable: false` omits it from CSV; `csvValue(value, row)` formats its exported scalar/array value independently of cell rendering. Formula protection runs after formatting, including for array text. These CSV settings do not change printing.

Print opens a separate text-only table in a temporary iframe. It includes the caption and data headers, excludes controls and expanded detail content, and never inserts accessor values as HTML. The browser owns the print dialog; the frame is removed afterward or after a one-minute fallback timeout. Custom print styling and rendered React cells are intentionally outside this API.

## Server data

Set `mode="server"`, supply `rowCount`, and control the state. The table renders exactly the supplied page; it does not search, filter, sort, or page it again.

```tsx
<DataTable
  caption="People"
  mode="server"
  rows={response.rows}
  rowCount={response.total}
  columns={columns}
  getRowId={row => row.id}
  state={state}
  onStateChange={setState}
/>;
```

The caller owns fetching, loading/error UI, debouncing, cancellation, authorization, query validation, and out-of-range page recovery. Keep rows and total consistent with the controlled page. Use the `toolbar` prop for additional controls or request status. No networking code or credentials belong in this package.

The runnable [server example](demo/ServerDemo.tsx) shows a 200 ms search debounce, aborting obsolete requests, hiding stale responses, out-of-range page recovery, and a retry action. Its [adapter](demo/serverAdapter.ts) maps filters and zero-based table pages to an explicit backend query with one-based pages. It validates a route-scoped saved view in session storage and excludes selection/expansion from persistence. The data source is simulated; replace `loadDirectory` with your application's API request and validate queries on the server. These example files are not package exports.

## Styling, localization, and accessibility

Components inherit the application's MUI theme. Controls wrap and the default `responsive="scroll"` keeps the table horizontally scrollable on narrow screens. `responsive="stacked"` stacks labeled cells below 600 px, retaining header controls and explicit table semantics. `stickyHeader` and `maxHeight={480}` enable a bounded scrolling body with sticky column headers; stacked mobile headers remain in normal flow. The scroll region is keyboard focusable when a height limit is set.

Use `rowSx(row)`, column `cellSx(row)`, and column `headerSx` for MUI theme-aware styling. `header` and `footer` accept content above/below the table controls; `emptyContent` replaces the empty-state body. The visible `caption` remains the accessible table name. Custom renderers must maintain contrast and accessible interactions.

Pass `labels` to replace search, filter, sort, selection, expansion, column-control, output, empty-state, and pagination text; function-valued labels support counts and row IDs. Header handles and the column panel both offer keyboard operation.

The table has a visible caption, scoped column headers, sort announcements, labeled inputs and checkboxes, keyboard-operable sorting, and status text for selection and empty results. Automated interaction checks do not replace screen-reader and real-browser qualification before release.

The current interaction suite passed in Playwright Chromium 131 and Firefox 132 at 1360 px and 390 px, with no page errors, page overflow, or automated WCAG A/AA findings in the tested table/dialog states. WebKit could not start because this host lacks its required shared libraries; Safari, manual screen-reader use, and the native print dialog remain unverified. Browser engines and audit tools are temporary local test tools, not package dependencies.

## Feature coverage

Scope reference: [mui-datatables documentation](https://github.com/gregnb/mui-datatables#readme). No upstream implementation code was copied.

| Feature | Current implementation |
| --- | --- |
| Search, sort, filters, pagination | Client operations and controlled server state |
| Selection and bulk actions | Stable IDs, single/multiple/conditional/click selection, filtered scope, custom actions |
| Custom rendering and controls | Cells, filter widgets, comparison, predicates, toolbar |
| Responsive layout and localization | Scroll/stacked views, sticky headers, height limit, overridable labels |
| Expandable rows | Stable IDs, conditional details, expand-all, controlled or uncontrolled |
| Column visibility, ordering, resizing | Exclusions, optional panel, drag/pointer/keyboard handles, controlled state |
| CSV export and printing | Filtered results/loaded page; CSV delimiter, formatting, column exclusions |
| Advanced filters | Arrays with any/all matching, inferred choices, custom controls, chips/reset, Apply/Cancel dialog |
| Accessibility | Semantic markup and interaction tests; release audit pending |

The previously identified feature gaps are implemented. This remains an independent API, not a drop-in mui-datatables replacement or a claim of exhaustive parity with every upstream option. Row actions are ordinary custom-rendered columns; application persistence, debouncing, and query translation use the controlled-state adapter pattern above. Server selection, expansion, CSV, and print always operate on supplied rows; remote “all results” actions require an application/backend contract.

## Distribution

ES modules and TypeScript declarations are built with `tsc`; React, MUI, and Emotion remain peer dependencies. There is no table-engine dependency or bundled copy of the UI framework.

The package allowlist contains only `dist`; npm also includes the manifest, README, and license. Source tests, demo assets, and local environment files are excluded. Builds clear generated `dist` output before compilation so deleted-source artifacts cannot remain in the tarball. `prepack` builds the library; `prepublishOnly` runs the full checks. Checks and releases run locally; this repository has no GitHub workflows.

The current 23-file tarball passed a fresh install, strict TypeScript compilation against the public API, and React server rendering. Its allowlist and common credential-pattern checks passed, including a scan of Git history. The dependency audit reported zero vulnerabilities. No credentials or publishing tokens are stored here; these checks are not a guarantee against security issues.

Before the first release: finish the manual accessibility/print and Safari/WebKit checks above, verify package ownership/permissions, repeat checks against the exact release tarball, and authorize publication.

The 2026-10-16 registry lookup for `mui-tablekit` returned 404. The name is not reserved, and publishing ownership/permissions remain unverified. Nothing has been pushed or published.

Licensed under the [Unlicense](LICENSE). MUI Tablekit is an independent project, not an official MUI product.
