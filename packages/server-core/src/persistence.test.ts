import { describe, expect, it } from 'vitest';
import { isRetryablePersistenceError } from './persistence';

describe('server persistence core', () => {
  it('classifies transient Prisma connection error codes as retryable', () => {
    expect(isRetryablePersistenceError({ code: 'P2024' })).toBe(true);
    expect(isRetryablePersistenceError({ code: 'P1001' })).toBe(true);
  });

  it('classifies transient connection pool messages as retryable', () => {
    expect(isRetryablePersistenceError({ message: 'connection pool exhausted' })).toBe(true);
    expect(isRetryablePersistenceError({ message: 'Timed out fetching a new connection' })).toBe(
      true
    );
    expect(isRetryablePersistenceError({ message: 'MaxClientsInSessionMode reached' })).toBe(true);
    expect(isRetryablePersistenceError({ message: 'max clients reached' })).toBe(true);
  });

  it('keeps non-persistence and validation errors non-retryable', () => {
    expect(isRetryablePersistenceError({ code: 'P2002' })).toBe(false);
    expect(isRetryablePersistenceError({ message: 'Unique constraint failed' })).toBe(false);
    expect(isRetryablePersistenceError(new Error('Invalid request payload'))).toBe(false);
  });

  it('handles missing or non-string error fields', () => {
    expect(isRetryablePersistenceError(undefined)).toBe(false);
    expect(isRetryablePersistenceError(null)).toBe(false);
    expect(isRetryablePersistenceError({ code: 2024, message: 1001 })).toBe(false);
  });
});
