import { describe, expect, it } from 'vitest';
import { getPrimaryNotionDataSourceId, hasNotionDataSourceId } from './notion-database';

describe('server Notion database core', () => {
  it('extracts the first data source id from a Notion database-like object', () => {
    expect(
      getPrimaryNotionDataSourceId({
        data_sources: [{ id: 'ds-primary' }, { id: 'ds-secondary' }],
      })
    ).toBe('ds-primary');
  });

  it('returns undefined when data sources are missing or empty', () => {
    expect(getPrimaryNotionDataSourceId(undefined)).toBeUndefined();
    expect(getPrimaryNotionDataSourceId(null)).toBeUndefined();
    expect(getPrimaryNotionDataSourceId({})).toBeUndefined();
    expect(getPrimaryNotionDataSourceId({ data_sources: [] })).toBeUndefined();
  });

  it('returns undefined for malformed primary data source entries', () => {
    expect(getPrimaryNotionDataSourceId({ data_sources: null })).toBeUndefined();
    expect(getPrimaryNotionDataSourceId({ data_sources: [{ id: '' }] })).toBeUndefined();
    expect(getPrimaryNotionDataSourceId({ data_sources: [{ id: 123 }] })).toBeUndefined();
  });

  it('detects whether a database-like object contains a data source id', () => {
    expect(
      hasNotionDataSourceId(
        {
          data_sources: [{ id: 'ds-primary' }, { id: 'ds-secondary' }],
        },
        'ds-secondary'
      )
    ).toBe(true);

    expect(
      hasNotionDataSourceId(
        {
          data_sources: [{ id: 'ds-primary' }],
        },
        'ds-missing'
      )
    ).toBe(false);
  });

  it('returns false when matching malformed database-like inputs', () => {
    expect(hasNotionDataSourceId(undefined, 'ds-primary')).toBe(false);
    expect(hasNotionDataSourceId(null, 'ds-primary')).toBe(false);
    expect(hasNotionDataSourceId({ data_sources: null }, 'ds-primary')).toBe(false);
    expect(hasNotionDataSourceId({ data_sources: [{ id: 123 }] }, 'ds-primary')).toBe(false);
    expect(hasNotionDataSourceId({ data_sources: [{ id: 'ds-primary' }] }, '')).toBe(false);
    expect(hasNotionDataSourceId({ data_sources: [{ id: 'ds-primary' }] }, 123)).toBe(false);
  });
});
