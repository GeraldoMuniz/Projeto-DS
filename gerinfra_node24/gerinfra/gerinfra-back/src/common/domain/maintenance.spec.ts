import { describe, expect, it } from 'vitest';
import { calendarDate } from './maintenance';

describe('Datas de manutenções', () => {
  it('aceita anos bissextos e rejeita dias inexistentes', () => {
    expect(calendarDate.safeParse('2028-02-29').success).toBe(true);
    expect(calendarDate.safeParse('2026-02-29').success).toBe(false);
    expect(calendarDate.safeParse('2026-04-31').success).toBe(false);
    expect(calendarDate.safeParse('12/10/2026').success).toBe(false);
  });
});
