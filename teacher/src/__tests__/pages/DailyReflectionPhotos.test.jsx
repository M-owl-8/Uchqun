import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';

/**
 * Regression guard for the defect this feature fixes: DailyReflection's
 * handleJournalSend destructured only { subject, body, recipientIds }, so the
 * composer's `photos` array was silently discarded — while the UI told the
 * teacher "Photos are only visible to selected parents".
 *
 * These tests drive the real handleJournalSend (via a stubbed composer that
 * hands it photos) and assert the photos actually reach POST /media/upload.
 */

const mockApi = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
vi.mock('../../shared/services/api', () => ({ default: mockApi }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }),
}));

// Stub composer: exposes a button that invokes the real onSend with photos.
let lastResult = null;
vi.mock('../../components/ParentJournalComposer', () => ({
  ParentJournalComposer: ({ onSend }) => (
    <button
      data-testid="send"
      onClick={async () => {
        lastResult = await onSend({
          subject: 'Bugun',
          body: 'Bugungi kun juda yaxshi otdi',
          recipientIds: ['c1', 'c2'],
          photos: [
            new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }),
            new File([new Uint8Array([2])], 'b.png', { type: 'image/png' }),
          ],
        });
      }}
    >
      send
    </button>
  ),
}));

const DailyReflection = (await import('../../pages/DailyReflection')).default;

const uploadCalls = () => mockApi.post.mock.calls.filter(([url]) => url === '/media/upload');

describe('DailyReflection — journal photo delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastResult = null;
    mockApi.get.mockResolvedValue({ data: { data: [] } });
    mockApi.post.mockImplementation((url) => {
      if (url === '/teacher/journal/bulk') {
        return Promise.resolve({
          data: { success: true, data: { created: [{ childId: 'c1' }, { childId: 'c2' }], failed: [] } },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('uploads each photo for each child whose entry was created', async () => {
    render(<DailyReflection />);
    fireEvent.click(screen.getByTestId('send'));

    // 2 photos x 2 children
    await waitFor(() => expect(uploadCalls()).toHaveLength(4));

    const childIds = uploadCalls().map(([, fd]) => fd.get('childId')).sort();
    expect(childIds).toEqual(['c1', 'c1', 'c2', 'c2']);
  });

  it('sends the journal entry before any photo', async () => {
    render(<DailyReflection />);
    fireEvent.click(screen.getByTestId('send'));
    await waitFor(() => expect(uploadCalls()).toHaveLength(4));

    const urls = mockApi.post.mock.calls.map(([u]) => u);
    expect(urls[0]).toBe('/teacher/journal/bulk');
  });

  it('only attaches photos to children whose entry actually persisted', async () => {
    mockApi.post.mockImplementation((url) => {
      if (url === '/teacher/journal/bulk') {
        // c2 failed — it must receive no photos.
        return Promise.resolve({
          data: { success: true, data: { created: [{ childId: 'c1' }], failed: [{ childId: 'c2' }] } },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<DailyReflection />);
    fireEvent.click(screen.getByTestId('send'));

    await waitFor(() => expect(uploadCalls()).toHaveLength(2)); // 2 photos x 1 child
    const childIds = new Set(uploadCalls().map(([, fd]) => fd.get('childId')));
    expect(childIds).toEqual(new Set(['c1']));
  });

  it('reports photo failures back to the composer instead of swallowing them', async () => {
    mockApi.post.mockImplementation((url) => {
      if (url === '/teacher/journal/bulk') {
        return Promise.resolve({
          data: { success: true, data: { created: [{ childId: 'c1' }], failed: [] } },
        });
      }
      return Promise.reject(new Error('storage down'));
    });

    render(<DailyReflection />);
    fireEvent.click(screen.getByTestId('send'));

    await waitFor(() => expect(lastResult?.photos).toBeDefined());
    expect(lastResult.photos).toEqual({ attempted: 2, uploaded: 0, failed: 2 });
  });

  it('a photo-upload outage still leaves the journal entry sent', async () => {
    mockApi.post.mockImplementation((url) => {
      if (url === '/teacher/journal/bulk') {
        return Promise.resolve({
          data: { success: true, data: { created: [{ childId: 'c1' }], failed: [] } },
        });
      }
      return Promise.reject(new Error('storage down'));
    });

    render(<DailyReflection />);
    fireEvent.click(screen.getByTestId('send'));

    await waitFor(() => expect(lastResult).toBeTruthy());
    expect(lastResult.success).toBe(true);
    expect(lastResult.data.created).toHaveLength(1);
  });
});
