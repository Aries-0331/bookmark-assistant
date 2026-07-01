import { describe, expect, it } from 'vitest';
import { createSyncFingerprint, type SyncFingerprintItem } from './index';

const bookmarkItem: SyncFingerprintItem = {
  title: 'Bookmark',
  url: 'https://example.com/bookmark',
  path: 'Bookmarks / Articles',
  type: 'bookmark',
  syncId: 'bookmark-1',
};

const readingListItem: SyncFingerprintItem = {
  title: 'Reading',
  url: 'https://example.com/read',
  path: 'Reading List',
  type: 'reading_list',
  readState: 'UNREAD',
  source: 'reading_list',
  syncId: 'reading-1',
};

const currentPageItem: SyncFingerprintItem = {
  title: 'Current',
  url: 'https://example.com/current',
  path: 'Saved Pages',
  source: 'current_page',
  syncId: 'current-1',
};

describe('sync fingerprint helpers', () => {
  it('creates the same fingerprint regardless of input order', async () => {
    const first = await createSyncFingerprint([bookmarkItem, readingListItem, currentPageItem]);
    const second = await createSyncFingerprint([currentPageItem, bookmarkItem, readingListItem]);

    expect(first).toBe(second);
  });

  it('changes when path url or title changes', async () => {
    const original = await createSyncFingerprint([bookmarkItem]);

    await expect(
      createSyncFingerprint([{ ...bookmarkItem, path: 'Bookmarks / Changed' }])
    ).resolves.not.toBe(original);
    await expect(
      createSyncFingerprint([{ ...bookmarkItem, url: 'https://example.com/changed' }])
    ).resolves.not.toBe(original);
    await expect(createSyncFingerprint([{ ...bookmarkItem, title: 'Changed' }])).resolves.not.toBe(
      original
    );
  });

  it('ignores metadata fields that are not part of the fingerprint payload', async () => {
    const original = await createSyncFingerprint([bookmarkItem]);
    const withMetadataChanged = await createSyncFingerprint([
      {
        ...bookmarkItem,
        source: 'reading_list',
        type: 'reading_list',
        readState: 'READ',
        syncId: 'different-sync-id',
      },
    ]);

    expect(withMetadataChanged).toBe(original);
  });

  it('uses the fallback hash path when Web Crypto is unavailable', async () => {
    await expect(
      createSyncFingerprint([bookmarkItem], {
        crypto: null,
      })
    ).resolves.toBe('bb2b0425');
  });

  it('uses the fallback hash path when Web Crypto digest fails', async () => {
    const failingCrypto = {
      subtle: {
        async digest() {
          throw new Error('digest failed');
        },
      },
    };

    await expect(createSyncFingerprint([bookmarkItem], { crypto: failingCrypto })).resolves.toBe(
      'bb2b0425'
    );
  });

  it('creates a stable fingerprint for empty input', async () => {
    await expect(createSyncFingerprint([], { crypto: null })).resolves.toBe('811c9dc5');
  });

  it('supports bookmark reading list and current page fingerprint inputs', async () => {
    const fingerprint = await createSyncFingerprint(
      [bookmarkItem, readingListItem, currentPageItem],
      {
        crypto: null,
      }
    );

    expect(fingerprint).toEqual(expect.any(String));
    expect(fingerprint).not.toBe('');
  });
});
