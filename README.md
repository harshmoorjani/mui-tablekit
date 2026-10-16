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

## Usage

React 19.3+, MUI 9.5+, and Emotion 11 are peer dependencies. Only these major versions are currently supported. Development uses TypeScript 6.0.3.

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

Use `render(value, row)` on a column for custom cells. Values are strings, numbers, booleans, valid `Date` objects, or nullish values. Plain cell text is escaped by React. Supply `compare(a, b)` for a custom row comparator and `filter(row, query)` for a custom column predicate. `sortable: false` disables sorting; `searchable: false` excludes a column from global search. Sorting cycles ascending, descending, unsorted.

Search and text filters use case-insensitive substring matching. Search matches any searchable column; column filters are combined with AND. Numeric values and dates sort by value, strings use the environment's locale, and nullish values sort last ascending. Search and filters run before sorting and pagination. Input rows are never mutated.

### Filters

`filterable: true` enables a text filter. `filterType` enables a specific control: `text`, `select`, `multiselect`, `numberRange`, or `dateRange`. Set `filterable: false` to suppress its control. Select controls take `filterOptions: [{ value, label }]`; values are strings, including `"true"`/`"false"` for boolean columns. An empty string clears a single select.

`FilterValue` is a string for text/select, `string[]` for multiselect, or `{ min: string, max: string }` for ranges. A custom `filter(row, query)` receives this value and replaces the built-in matching. Multiselect matches any chosen value exactly; an empty selection clears the filter. Ranges are inclusive, and either bound may be blank. Numeric ranges accept numbers or numeric strings. Date ranges use UTC days and accept `Date` values or ISO date strings; include a timezone in timestamp strings. Impossible calendar dates, invalid cell values, and inverted ranges do not match an active range. Filters remain available when their columns are hidden.

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

## Expansion and column layout

Pass `renderExpanded(row)` to enable row details. Expansion uses stable row IDs and survives sorting, filtering, paging, and data refreshes. The toggle exposes its expanded state and references the details cell. Clear `expandedIds` when switching datasets.

Set `columnControls` to show a collapsible panel for visibility, ordering, and width. Checkboxes preserve at least one visible column; move buttons support keyboard operation. Width inputs apply on blur and clamp to 80–1000 pixels. Columns can stretch to fill the table container. These controls do not alter selection, expansion, sorting, or filters.

Layout is also controllable through `hiddenColumnIds`, `columnOrder`, and `columnWidths` without the panel. At least one column must remain visible. Unknown/duplicate order IDs are ignored, and new columns are appended in definition order. Only the supplied column definitions can appear.

## CSV and printing

Set `csvFileName="people.csv"` and/or `printable` to show the corresponding buttons. Both use visible columns in their current order, with raw accessor values rather than custom cell markup. Client output contains **all filtered, sorted rows**, across pages, regardless of selection. Server output contains **only the supplied page**; buttons say “Download page CSV” and “Print page.” Fetching an entire remote result set remains the caller's responsibility.

CSV uses UTF-8 with a BOM, quoted fields, escaped quotes, and CRLF record separators. Formula-like strings (including full-width prefixes and leading control characters) receive a tab prefix; numeric values retain their type representation. This changes those strings' underlying data. See [OWASP's CSV injection guidance](https://community.owasp.org/attacks/CSV_Injection) for spreadsheet-specific limits: no CSV escaping strategy is universal across consumers.

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

## Styling, localization, and accessibility

Components inherit the application's MUI theme. Controls wrap and the table scrolls horizontally on narrow screens. Pass `labels` to replace search, filter, sort, selection, expansion, column-control, output, empty-state, and pagination text; function-valued labels support counts and row IDs. This release has no stacked mobile layout or drag handles; column ordering and sizing use keyboard-accessible controls.

The table has a visible caption, scoped column headers, sort announcements, labeled inputs and checkboxes, keyboard-operable sorting, and status text for selection and empty results. Automated interaction checks do not replace screen-reader and real-browser qualification before release.

## Feature coverage

Scope reference: [mui-datatables documentation](https://github.com/gregnb/mui-datatables#readme). No upstream implementation code was copied.

| Feature | Current implementation |
| --- | --- |
| Search, sort, filters, pagination | Client operations and controlled server state |
| Selection and bulk actions | Stable IDs, page selection, custom action content |
| Custom rendering and controls | Column rendering, comparison, predicates, toolbar |
| Responsive layout and localization | Horizontal scroll, wrapping toolbar, overridable labels |
| Expandable rows | Stable-ID details, controlled or uncontrolled |
| Column visibility, ordering, resizing | Optional panel and controlled layout state |
| CSV export and printing | Visible columns; filtered client results or loaded server page |
| Advanced filters | Text, select, multiselect, numeric/date ranges, custom predicates |
| Accessibility | Semantic markup and interaction tests; release audit pending |

This is not complete mui-datatables parity. Missing surfaces include removable filter chips/reset-all, custom filter-control rendering, inferred filter choices, native array-valued cells and any/all matching, switches to hide search/pagination, permanently excluded columns, row/cell styling props and header/footer/empty-content slots. Some can be supplied through controlled state, custom predicates, cell rendering, or a surrounding application component.

Other upstream options not provided here include single/conditional/click-to-select selection, select-all across filtered pages, expand-all/conditional expansion, drag handles, sticky-header/body-height controls, stacked mobile views, filter confirmation dialogs, and CSV delimiter/formatter/per-column export options. Row actions can already be ordinary custom-rendered columns. Route persistence, search debouncing, and backend query translation belong in an application adapter using the controlled state API.

## Distribution

ES modules and TypeScript declarations are built with `tsc`; React, MUI, and Emotion remain peer dependencies. There is no table-engine dependency or bundled copy of the UI framework.

The package allowlist contains only `dist`; npm also includes the manifest, README, and license. Source tests, demo assets, and local environment files are excluded. Builds clear generated `dist` output before compilation so deleted-source artifacts cannot remain in the tarball. `prepack` builds the library; `prepublishOnly` runs the full checks. Checks and releases run locally; this repository has no GitHub workflows.

Before the first release: complete the agreed feature scope, verify accessibility and browser behavior, inspect the exact tarball for secrets and unexpected files, review dependency findings, check package ownership/name availability, and authorize publication. No credentials or publishing tokens are stored here. A clean dependency audit is not a guarantee against security issues.

Licensed under the [Unlicense](LICENSE). MUI Tablekit is an independent project, not an official MUI product.
