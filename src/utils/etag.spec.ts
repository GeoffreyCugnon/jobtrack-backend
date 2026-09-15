import { describe, expect, it } from 'vitest';
import { buildETag, matchesETag } from './etag';

describe('buildETag', () => {
  it('is stable for identical parts', () => {
    const date = new Date('2026-09-10T00:00:00Z');
    expect(buildETag(1, date)).toBe(buildETag(1, date));
  });

  it('changes when any part changes', () => {
    const date = new Date('2026-09-10T00:00:00Z');
    expect(buildETag(1, date)).not.toBe(buildETag(2, date));
    expect(buildETag(1, date)).not.toBe(
      buildETag(1, new Date('2026-09-11T00:00:00Z')),
    );
  });

  it('is quoted, per the ETag header format', () => {
    expect(buildETag(1)).toMatch(/^".+"$/);
  });
});

describe('matchesETag', () => {
  it('returns false when If-None-Match is absent', () => {
    expect(matchesETag(undefined, '"abc"')).toBe(false);
  });

  it('matches a single value', () => {
    expect(matchesETag('"abc"', '"abc"')).toBe(true);
    expect(matchesETag('"abc"', '"def"')).toBe(false);
  });

  it('matches within a comma-separated list', () => {
    expect(matchesETag('"abc", "def"', '"def"')).toBe(true);
  });
});
