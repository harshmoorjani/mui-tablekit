import { afterEach, expect, it, vi } from 'vitest';
import { downloadCsv, printRows, toCsv } from '../src/output.js';
import type { CellValue, Column } from '../src/index.js';

const columns: Column<{ value: CellValue }>[] = [{ id: 'value', header: 'Value', value: row => row.value }];

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it('quotes CSV fields, preserves multiline text, and protects formula-like strings', () => {
  const values: CellValue[] = ['a,"b"\nc', '=2+2', '  @SUM(A1)', '＝1+1', '\r=1', '\ttext', -12, true, null, new Date('2025-01-01')];
  expect(toCsv(columns, values.map(value => ({ value })))).toBe(
    '\uFEFF"Value"\r\n"a,""b""\nc"\r\n"\t=2+2"\r\n"\t  @SUM(A1)"\r\n"\t＝1+1"\r\n"\t\r=1"\r\n"\t\ttext"\r\n"-12"\r\n"true"\r\n""\r\n"2025-01-01T00:00:00.000Z"',
  );
  expect(toCsv([{ ...columns[0]!, header: '=header' }], [])).toBe('\uFEFF"\t=header"');
});

it('downloads a Blob and releases the temporary URL and link', () => {
  vi.useFakeTimers();
  const create = vi.fn((_blob: Blob) => 'blob:test');
  const revoke = vi.fn();
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe('people.csv');
    expect(this.href).toBe('blob:test');
  });
  downloadCsv('people.csv', columns, [{ value: 'Ada' }]);
  expect(click).toHaveBeenCalledOnce();
  expect(create.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
  expect(document.querySelector('a')).toBeNull();
  vi.runAllTimers();
  expect(revoke).toHaveBeenCalledWith('blob:test');
});

it('prints a separate text-only document and cleans up after the dialog', () => {
  const append = document.body.append.bind(document.body);
  const print = vi.fn();
  vi.spyOn(document.body, 'append').mockImplementation((...nodes) => {
    append(...nodes);
    const frame = nodes[0] as HTMLIFrameElement;
    vi.spyOn(frame.contentWindow!, 'print').mockImplementation(print);
    vi.spyOn(frame.contentWindow!, 'focus').mockImplementation(() => {});
  });
  printRows('<People>', columns, [{ value: '<img src=x onerror=alert(1)>' }]);
  const frame = document.querySelector('iframe')!;
  expect(frame.contentDocument!.querySelector('caption')).toHaveTextContent('<People>');
  expect(frame.contentDocument!.querySelector('td')).toHaveTextContent('<img src=x onerror=alert(1)>');
  expect(frame.contentDocument!.querySelector('img')).toBeNull();
  expect(print).toHaveBeenCalledOnce();
  frame.contentWindow!.dispatchEvent(new Event('afterprint'));
  expect(document.querySelector('iframe')).toBeNull();
});

it('removes the print frame when printing throws', () => {
  const append = document.body.append.bind(document.body);
  vi.spyOn(document.body, 'append').mockImplementation((...nodes) => {
    append(...nodes);
    const frame = nodes[0] as HTMLIFrameElement;
    vi.spyOn(frame.contentWindow!, 'focus').mockImplementation(() => {});
    vi.spyOn(frame.contentWindow!, 'print').mockImplementation(() => { throw new Error('Print unavailable'); });
  });
  expect(() => printRows('People', columns, [])).toThrow('Print unavailable');
  expect(document.querySelector('iframe')).toBeNull();
});

it('removes the print frame when a cell renderer fails before printing', () => {
  expect(() => printRows('People', [{ ...columns[0]!, value: () => { throw new Error('Bad value'); } }], [{ value: 'Ada' }])).toThrow('Bad value');
  expect(document.querySelector('iframe')).toBeNull();
});
