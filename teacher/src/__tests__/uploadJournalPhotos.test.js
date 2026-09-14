import { describe, it, expect, vi } from 'vitest';
import { uploadJournalPhotos } from '../utils/uploadJournalPhotos';

const mkApi = (impl) => ({ post: vi.fn(impl ?? (() => Promise.resolve({ data: {} }))) });
const mkFile = (name) => new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });

const fieldsOf = (formData) => {
  const out = {};
  for (const [k, v] of formData.entries()) out[k] = v;
  return out;
};

describe('uploadJournalPhotos', () => {
  it('uploads every photo for every child (cartesian fan-out)', async () => {
    const api = mkApi();
    const res = await uploadJournalPhotos({
      api,
      photos: [mkFile('a.png'), mkFile('b.png')],
      childIds: ['c1', 'c2', 'c3'],
      subject: 'Bugungi kun',
      date: '2026-09-15',
    });

    expect(api.post).toHaveBeenCalledTimes(6); // 2 photos x 3 children
    expect(res).toEqual({ attempted: 6, uploaded: 6, failed: 0 });
  });

  it('posts to /media/upload with childId, title, date and file', async () => {
    const api = mkApi();
    await uploadJournalPhotos({
      api,
      photos: [mkFile('a.png')],
      childIds: ['child-1'],
      subject: 'Sayr',
      date: '2026-09-15',
    });

    const [url, payload] = api.post.mock.calls[0];
    expect(url).toBe('/media/upload');
    const f = fieldsOf(payload);
    expect(f.childId).toBe('child-1');
    expect(f.title).toBe('Sayr');
    expect(f.date).toBe('2026-09-15');
    expect(f.file).toBeInstanceOf(File);
  });

  it('falls back to a default title when subject is blank (API requires non-empty)', async () => {
    const api = mkApi();
    await uploadJournalPhotos({ api, photos: [mkFile('a.png')], childIds: ['c1'], subject: '   ' });
    expect(fieldsOf(api.post.mock.calls[0][1]).title).toBeTruthy();
  });

  it('truncates an over-long title to the 500-char API limit', async () => {
    const api = mkApi();
    await uploadJournalPhotos({ api, photos: [mkFile('a.png')], childIds: ['c1'], subject: 'x'.repeat(900) });
    expect(fieldsOf(api.post.mock.calls[0][1]).title).toHaveLength(500);
  });

  it('one failed upload does not abort the others', async () => {
    let n = 0;
    const api = mkApi(() => {
      n += 1;
      return n === 2 ? Promise.reject(new Error('boom')) : Promise.resolve({ data: {} });
    });

    const res = await uploadJournalPhotos({
      api,
      photos: [mkFile('a.png')],
      childIds: ['c1', 'c2', 'c3', 'c4'],
      subject: 's',
    });

    expect(api.post).toHaveBeenCalledTimes(4);
    expect(res).toEqual({ attempted: 4, uploaded: 3, failed: 1 });
  });

  it('never rejects even when every upload fails', async () => {
    const api = mkApi(() => Promise.reject(new Error('down')));
    const res = await uploadJournalPhotos({ api, photos: [mkFile('a.png')], childIds: ['c1', 'c2'], subject: 's' });
    expect(res).toEqual({ attempted: 2, uploaded: 0, failed: 2 });
  });

  it('is a no-op with no photos or no children', async () => {
    const api = mkApi();
    const none = { attempted: 0, uploaded: 0, failed: 0 };
    expect(await uploadJournalPhotos({ api, photos: [], childIds: ['c1'], subject: 's' })).toEqual(none);
    expect(await uploadJournalPhotos({ api, photos: [mkFile('a.png')], childIds: [], subject: 's' })).toEqual(none);
    expect(await uploadJournalPhotos({ api, photos: undefined, childIds: undefined, subject: 's' })).toEqual(none);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('bounds concurrency — never more than 4 uploads in flight', async () => {
    let inFlight = 0;
    let peak = 0;
    const api = mkApi(
      () =>
        new Promise((resolve) => {
          inFlight += 1;
          peak = Math.max(peak, inFlight);
          setTimeout(() => {
            inFlight -= 1;
            resolve({ data: {} });
          }, 5);
        }),
    );

    await uploadJournalPhotos({
      api,
      photos: [mkFile('a.png'), mkFile('b.png'), mkFile('c.png')],
      childIds: Array.from({ length: 10 }, (_, i) => `c${i}`),
      subject: 's',
    });

    expect(api.post).toHaveBeenCalledTimes(30);
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1); // actually parallel, not accidentally serial
  });
});
