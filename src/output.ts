import { cellText } from './model.js';
import type { CellValue, Column, CsvOptions } from './types.js';

function csvCell(value: CellValue) {
  const text = cellText(value);
  // Keep formula-like strings as text in spreadsheet imports, including full-width prefixes.
  const guarded = typeof value !== 'number' && /^[\s\u0000-\u001f]*[=+\-@＝＋－＠\t\r\n]/u.test(text) ? `\t${text}` : text;
  return `"${guarded.replaceAll('"', '""')}"`;
}

export function toCsv<Row>(columns: readonly Column<Row>[], rows: readonly Row[], { delimiter = ',' }: CsvOptions = {}) {
  if (delimiter.length !== 1 || /["\r\n\u0000-\u001f\u007f]/u.test(delimiter)) {
    throw new Error('MUI Tablekit: CSV delimiter must be one printable character other than a quote.');
  }
  const exported = columns.filter(column => column.exportable !== false);
  return '\uFEFF' + [exported.map(column => csvCell(column.header)).join(delimiter),
    ...rows.map(row => exported.map(column => {
      const value = column.value(row);
      return csvCell(column.csvValue ? column.csvValue(value, row) : value);
    }).join(delimiter))].join('\r\n');
}

export function downloadCsv<Row>(filename: string, columns: readonly Column<Row>[], rows: readonly Row[], options?: CsvOptions) {
  const csv = toCsv(columns, rows, options);
  const content = options?.transform ? options.transform(csv) : csv;
  if (content === false) return;
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
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
  columns = columns.filter(column => column.printable !== false);
  const previousFocus = document.activeElement;
  const frame = document.createElement('iframe');
  frame.title = caption;
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0';
  document.body.append(frame);
  const target = frame.contentWindow;
  if (!target) { frame.remove(); throw new Error('MUI Tablekit: unable to open the print document.'); }
  const cleanup = () => {
    clearTimeout(timeout);
    const restoreFocus = document.activeElement === frame;
    frame.remove();
    if (restoreFocus && previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
  };
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
