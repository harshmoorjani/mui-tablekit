# MUI Tablekit

A small, typed React table built with MUI. Independent of mui-datatables, with a fresh API.

Inspired by [mui-datatables](https://github.com/gregnb/mui-datatables). Upstream development appears inactive: its latest default-branch commit is from [January 2023](https://github.com/gregnb/mui-datatables/commit/e09c39cb3c5713c7c157845b3d3e4b7d77c77649). MUI Tablekit aims to carry that useful feature set forward with current React and MUI, a smaller implementation, and its own typed API.

**Work in progress. Not published yet.** The first slice covers client and server data operations; it does not yet cover the full intended feature set.

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

Search and default filters use case-insensitive substring matching. Search matches any searchable column; column filters are combined with AND. Numeric values and dates sort by value, strings use the environment's locale, and nullish values sort last ascending. Search and filters run before sorting and pagination. Input rows are never mutated.

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

State has `search`, `filters` (column ID to string), `sort` (`{ columnId, direction }` or `null`), zero-based `page`, positive `pageSize`, and `selectedIds`. Search, filter, sort, and page-size changes reset the page. When client rows shrink, the displayed page is clamped; the next interaction reports that page. No state is persisted automatically.

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

Components inherit the application's MUI theme. The toolbar wraps and the table scrolls horizontally on narrow screens. Pass `labels` to replace search, filter, sort, selection, empty-state, and pagination text; function-valued labels support counts and row IDs. This release has no stacked mobile layout.

The table has a visible caption, scoped column headers, sort announcements, labeled inputs and checkboxes, keyboard-operable sorting, and status text for selection and empty results. Automated interaction checks do not replace screen-reader and real-browser qualification before release.

## Feature coverage

Scope reference: [mui-datatables documentation](https://github.com/gregnb/mui-datatables#readme). No upstream implementation code was copied.

| Feature | Current implementation |
| --- | --- |
| Search, sort, filters, pagination | Client operations and controlled server state |
| Selection and bulk actions | Stable IDs, page selection, custom action content |
| Custom rendering and controls | Column rendering, comparison, predicates, toolbar |
| Responsive layout and localization | Horizontal scroll, wrapping toolbar, overridable labels |
| Expandable rows | Pending |
| Column visibility, ordering, resizing | Pending |
| CSV export and printing | Pending |
| Advanced filters | Custom predicates now; range/multiselect controls pending |
| Accessibility | Semantic markup and interaction tests; release audit pending |

## Distribution

ES modules and TypeScript declarations are built with `tsc`; React, MUI, and Emotion remain peer dependencies. There is no table-engine dependency or bundled copy of the UI framework.

The package allowlist contains only `dist`; npm also includes the manifest, README, and license. Source tests, demo assets, and local environment files are excluded. `prepack` builds the library; `prepublishOnly` runs the full checks. Checks and releases run locally; this repository has no GitHub workflows.

Before the first release: complete the agreed feature scope, verify accessibility and browser behavior, inspect the exact tarball for secrets and unexpected files, review dependency findings, check package ownership/name availability, and authorize publication. No credentials or publishing tokens are stored here. A clean dependency audit is not a guarantee against security issues.

Licensed under the [Unlicense](LICENSE). MUI Tablekit is an independent project, not an official MUI product.
