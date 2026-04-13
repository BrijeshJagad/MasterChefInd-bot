const { getWeekKey } = require('../src/services/utils');

describe('Week Key Utility', () => {
  test('calculates correct week key for April 13, 2026', () => {
    const date = new Date('2026-04-13');
    expect(getWeekKey(date)).toBe('202616');
  });

  test('calculates correct week key for January 1, 2026', () => {
    const date = new Date('2026-01-01');
    expect(getWeekKey(date)).toBe('202601');
  });

  test('handles December end-of-year weeks correctly', () => {
    const date = new Date('2026-12-31');
    expect(getWeekKey(date)).toBe('202653');
  });
});
