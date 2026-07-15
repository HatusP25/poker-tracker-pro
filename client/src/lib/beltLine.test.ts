import { describe, it, expect } from 'vitest';
import { deriveBeltLine } from './beltLine';
import type { BeltLineage } from '@/types';

const makeBelt = (overrides: Partial<BeltLineage['current']> = {}): BeltLineage => ({
  current: {
    playerId: 'p1',
    playerName: 'Marcus',
    fromDate: '2026-06-01',
    toDate: null,
    nightsHeld: 5,
    defenses: 3,
    takenFromPlayerName: 'Dani',
    ...overrides,
  },
  history: [],
  totalTitleChanges: 1,
});

describe('deriveBeltLine', () => {
  it('returns undefined when there is no belt / no current holder', () => {
    expect(deriveBeltLine({ sessionDate: '2026-07-10', sessionPlayerIds: ['p1'], belt: null })).toBeUndefined();
    expect(
      deriveBeltLine({ sessionDate: '2026-07-10', sessionPlayerIds: ['p1'], belt: { current: null, history: [], totalTitleChanges: 0 } })
    ).toBeUndefined();
  });

  it('announces a takeover when the reign started on this session date', () => {
    const belt = makeBelt({ fromDate: '2026-07-10', takenFromPlayerName: 'Dani' });
    expect(deriveBeltLine({ sessionDate: '2026-07-10', sessionPlayerIds: ['p1'], belt })).toBe(
      'Marcus takes The Belt from Dani'
    );
  });

  it('announces the first champion when the reign started tonight with no prior holder', () => {
    const belt = makeBelt({ fromDate: '2026-07-10', takenFromPlayerName: null });
    expect(deriveBeltLine({ sessionDate: '2026-07-10', sessionPlayerIds: ['p1'], belt })).toBe(
      'Marcus becomes the first champion'
    );
  });

  it('announces a defense (with correct ordinal) when the holder played and reign predates this session', () => {
    const belt = makeBelt({ fromDate: '2026-06-01', defenses: 4 });
    expect(deriveBeltLine({ sessionDate: '2026-07-10', sessionPlayerIds: ['p1', 'p2'], belt })).toBe(
      'Marcus defends (4th defense)'
    );
  });

  it('formats ordinals correctly for 1st/2nd/3rd/11th', () => {
    expect(
      deriveBeltLine({ sessionDate: '2026-07-10', sessionPlayerIds: ['p1'], belt: makeBelt({ fromDate: '2026-06-01', defenses: 1 }) })
    ).toBe('Marcus defends (1st defense)');
    expect(
      deriveBeltLine({ sessionDate: '2026-07-10', sessionPlayerIds: ['p1'], belt: makeBelt({ fromDate: '2026-06-01', defenses: 2 }) })
    ).toBe('Marcus defends (2nd defense)');
    expect(
      deriveBeltLine({ sessionDate: '2026-07-10', sessionPlayerIds: ['p1'], belt: makeBelt({ fromDate: '2026-06-01', defenses: 3 }) })
    ).toBe('Marcus defends (3rd defense)');
    expect(
      deriveBeltLine({ sessionDate: '2026-07-10', sessionPlayerIds: ['p1'], belt: makeBelt({ fromDate: '2026-06-01', defenses: 11 }) })
    ).toBe('Marcus defends (11th defense)');
  });

  it('omits the line when the holder did not play and no title change happened tonight', () => {
    const belt = makeBelt({ fromDate: '2026-06-01' });
    expect(deriveBeltLine({ sessionDate: '2026-07-10', sessionPlayerIds: ['p2', 'p3'], belt })).toBeUndefined();
  });
});
