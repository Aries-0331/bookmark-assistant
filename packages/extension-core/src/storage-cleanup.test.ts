import { describe, expect, it } from 'vitest';
import {
  cleanErrorReports,
  planStorageCleanup,
  validatePartialSyncInfo,
  type ErrorReport,
} from './index';

const NOW = new Date('2026-07-02T00:00:00.000Z');

function errorReport(timestamp: string, message = 'Error'): ErrorReport {
  return {
    message,
    timestamp,
    userAgent: 'Test',
    version: '1.0.0',
  };
}

describe('storage cleanup helpers', () => {
  it('validates partial sync info and normalizes invalid counters to zero', () => {
    expect(
      validatePartialSyncInfo({
        new_count: '3',
        failed_count: Number.NaN,
        total_synced: 'bad',
        message: 'Partial sync completed',
        ignored: true,
      })
    ).toEqual({
      new_count: 3,
      failed_count: 0,
      total_synced: 0,
      message: 'Partial sync completed',
    });
  });

  it('rejects malformed partial sync info', () => {
    expect(validatePartialSyncInfo(null)).toBeNull();
    expect(validatePartialSyncInfo('{"new_count":1}')).toBeNull();
    expect(validatePartialSyncInfo([])).toBeNull();
  });

  it('keeps only recent error reports up to the configured limit', () => {
    const reports = [
      errorReport('2026-06-29T23:59:59.000Z', 'old'),
      errorReport('2026-07-01T00:00:01.000Z', 'one'),
      errorReport('2026-07-01T01:00:00.000Z', 'two'),
      errorReport('not-a-date', 'bad timestamp'),
      { message: 'bad shape' },
    ];

    expect(cleanErrorReports(reports, { now: NOW, maxReports: 1 })).toEqual([
      errorReport('2026-07-01T01:00:00.000Z', 'two'),
    ]);
  });

  it('returns an empty error report list for malformed input', () => {
    expect(cleanErrorReports('not an array', { now: NOW })).toEqual([]);
  });

  it('plans obsolete storage key removal without touching runtime storage', () => {
    expect(
      planStorageCleanup({
        last_sync_hash: 'legacy-hash',
        hasTriedInitialLoad: true,
      })
    ).toEqual({
      removeKeys: ['last_sync_hash', 'hasTriedInitialLoad'],
      updateValues: {},
    });
  });

  it('plans partial sync info updates from object and string values', () => {
    expect(
      planStorageCleanup({
        last_sync_partial_info: '{"new_count":"4","failed_count":"bad"}',
      })
    ).toEqual({
      removeKeys: [],
      updateValues: {
        last_sync_partial_info: {
          new_count: 4,
          failed_count: 0,
        },
      },
    });
  });

  it('plans malformed partial sync info removal', () => {
    expect(
      planStorageCleanup({
        last_sync_partial_info: '{"new_count":',
      })
    ).toEqual({
      removeKeys: ['last_sync_partial_info'],
      updateValues: {},
    });

    expect(
      planStorageCleanup({
        last_sync_partial_info: 12,
      })
    ).toEqual({
      removeKeys: ['last_sync_partial_info'],
      updateValues: {},
    });
  });

  it('plans error report cleanup updates', () => {
    expect(
      planStorageCleanup(
        {
          error_reports: [
            errorReport('2026-06-29T00:00:00.000Z', 'old'),
            errorReport('2026-07-01T00:00:00.000Z', 'recent'),
          ],
        },
        { now: NOW }
      )
    ).toEqual({
      removeKeys: [],
      updateValues: {
        error_reports: [errorReport('2026-07-01T00:00:00.000Z', 'recent')],
      },
    });
  });

  it('plans malformed error report cleanup updates', () => {
    expect(
      planStorageCleanup({
        error_reports: 'not an array',
      })
    ).toEqual({
      removeKeys: [],
      updateValues: {
        error_reports: [],
      },
    });
  });

  it('keeps validated partial sync info when no report cleanup is needed', () => {
    expect(
      planStorageCleanup(
        {
          error_reports: [errorReport('2026-07-01T00:00:00.000Z', 'recent')],
          last_sync_partial_info: {
            new_count: 1,
          },
        },
        { now: NOW }
      )
    ).toEqual({
      removeKeys: [],
      updateValues: {
        last_sync_partial_info: {
          new_count: 1,
        },
      },
    });
  });
});
