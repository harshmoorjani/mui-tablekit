import { cellText } from './model.js';
import type { CellValue, Column } from './types.js';

function csvCell(value: CellValue) {
  const text = cellText(value);
  // Keep formula-like strings as text in spreadsheet imports, including full-width prefixes.
  const guarded = typeof value === 'string' && /^[\s\u0000-\u001f]*[=+\-@＝＋－＠\t\r\n]/u.test(text) ? `\t${text}` : text;
  return `"${guarded.replaceAll('"', '""')}"`;
}

export function toCsv<Row>(columns: readonly Column<Row>[], rows: readonly Row[]) {
  return '\uFEFF' + [columns.map(column => csvCell(column.header)).join(','),
    ...rows.map(row => columns.map(column => csvCell(column.value(row))).join(','))].join('\r\n');
}

export function downloadCsv<Row>(filename: string, columns: readonly Column<Row>[], rows: readonly Row[]) {
  const url = URL.createObjectURL(new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export function printRows<Row>(caption: string, columns: readonly Column<Row>[], rows: readonly Row[]) {
  const frame = document.createElement('iframe');
  frame.title = caption;
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0';
  document.body.append(frame);
  const target = frame.contentWindow;
  if (!target) { frame.remove(); throw new Error('MUI Tablekit: unable to open the print document.'); }
  const cleanup = () => { clearTimeout(timeout); frame.remove(); };
  // Some browsers omit afterprint when the dialog is dismissed or unavailable.
  const timeout = setTimeout(cleanup, 60_000);
  target.addEventListener('afterprint', cleanup, { once: true });
  try {
    const doc = target.document;
    doc.title = caption;
    const style = doc.createElement('style');
    style.textContent = 'body{font:14px sans-serif}table{border-collapse:collapse;width:100%}caption{font-weight:bold;text-align:start;padding:12px 0}th,td{border:1px solid #bbb;padding:8px;text-align:start;overflow-wrap:anywhere}';
    doc.head.append(style);
    const table = doc.createElement('table');
    table.createCaption().textContent = caption;
    const header = table.createTHead().insertRow();
    columns.forEach(column => {
      const cell = doc.createElement('th');
      cell.scope = 'col';
      cell.textContent = column.header;
      header.append(cell);
    });
    const body = table.createTBody();
    rows.forEach(row => {
      const tr = body.insertRow();
      columns.forEach(column => { tr.insertCell().textContent = cellText(column.value(row)); });
    });
    doc.body.append(table);
    target.focus();
    target.print();
  } catch (error) { cleanup(); throw error; }
}
