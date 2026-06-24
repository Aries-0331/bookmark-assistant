import { describe, expect, it } from 'vitest';
import * as publicApi from './index';

describe('contracts public runtime API', () => {
  it('keeps contracts type-only at runtime', () => {
    expect(Object.keys(publicApi)).toEqual([]);
  });
});
