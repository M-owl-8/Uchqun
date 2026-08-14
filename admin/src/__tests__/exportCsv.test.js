/**
 * D-42 — the admin portal had no data export on any route.
 *
 * Reception could export its parents and government its schools; a school
 * director, the person most often asked to hand a list to someone outside the
 * system, could export nothing. Eight admin routes were scanned in Campaign I
 * and the only match for export|csv|excel|yuklab ol|eksport was the IMPORT card.
 *
 * The helper is shared rather than copied a third time, because the two existing
 * copies had already drifted — government's shipped an English header into an
 * Uzbek UI (D-45) while reception's was translated.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportCsv } from '@shared/utils/exportCsv';

let captured;

beforeEach(() => {
  captured = {};
  global.Blob = class {
    constructor(parts, opts) { this.parts = parts; this.opts = opts; captured.blob = this; }
  };
  global.URL.createObjectURL = vi.fn(() => 'blob:mock');
  global.URL.revokeObjectURL = vi.fn();
  vi.spyOn(document, 'createElement').mockImplementation(() => {
    const a = { click: vi.fn(), set href(v) { captured.href = v; }, get href() { return captured.href; } };
    Object.defineProperty(a, 'download', {
      set(v) { captured.download = v; }, get() { return captured.download; },
    });
    captured.anchor = a;
    return a;
  });
});

afterEach(() => vi.restoreAllMocks());

const text = () => captured.blob.parts.join('');

describe('D-42 — exportCsv', () => {
  it('writes the header row and every data row', () => {
    exportCsv(['Ism', 'Familiya'], [['Nigora', 'Saidova'], ['Zuhra', 'Ibragimova']], 'ota-onalar');
    const lines = text().replace('﻿', '').split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('"Ism","Familiya"');
    expect(lines[1]).toBe('"Nigora","Saidova"');
  });

  it('leads with a BOM — without it Excel renders Uzbek headers as mojibake', () => {
    exportCsv(['Ism'], [['Nigora']], 'x');
    expect(text().charCodeAt(0)).toBe(0xfeff);
  });

  it('escapes embedded quotes rather than breaking the row', () => {
    exportCsv(['Izoh'], [['She said "hello"']], 'x');
    expect(text()).toContain('"She said ""hello"""');
  });

  it('a comma in a value does not become a new column', () => {
    exportCsv(['Manzil'], [['Toshkent, Chilonzor']], 'x');
    const lines = text().replace('﻿', '').split('\n');
    expect(lines[1]).toBe('"Toshkent, Chilonzor"');
  });

  it('null and undefined become empty, never the strings "null"/"undefined"', () => {
    exportCsv(['A', 'B'], [[null, undefined]], 'x');
    expect(text().replace('﻿', '').split('\n')[1]).toBe('"",""');
    expect(text()).not.toMatch(/null|undefined/);
  });

  it('names the file with the base name and an ISO date', () => {
    exportCsv(['A'], [['1']], 'ota-onalar');
    expect(captured.download).toMatch(/^ota-onalar-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('an empty result still produces a valid file with its header', () => {
    const r = exportCsv(['Ism'], [], 'x');
    expect(r.rows).toBe(0);
    expect(text().replace('﻿', '')).toBe('"Ism"');
  });

  it('revokes the object URL — an export loop must not leak', () => {
    exportCsv(['A'], [['1']], 'x');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});
