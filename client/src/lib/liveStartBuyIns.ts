import { validateBuyIn } from './moneyValidation';
import type { Group } from '@/types';

/**
 * The live-session start form keeps each buy-in as the raw text the user typed, so a
 * field can be cleared and retyped. Validation happens here, not on every keystroke.
 */
export function resolveStartBuyIns(drafts: Record<string, string>): {
  players: { playerId: string; buyIn: number }[];
  errors: Record<string, string>;
} {
  const players: { playerId: string; buyIn: number }[] = [];
  const errors: Record<string, string> = {};

  for (const [playerId, draft] of Object.entries(drafts)) {
    const buyIn = draft.trim() === '' ? NaN : Number(draft);
    const validity = validateBuyIn(buyIn);
    if (validity.valid) {
      players.push({ playerId, buyIn });
    } else {
      errors[playerId] = validity.message ?? 'Invalid buy-in';
    }
  }

  return { players, errors };
}

/**
 * The selected group is persisted to localStorage when picked, so settings changed
 * later (e.g. the default buy-in) would otherwise never reach the UI. Returns the
 * fresh server copy when it differs, or the current object unchanged.
 */
export function refreshSelectedGroup(current: Group, fresh: Group | undefined): Group {
  if (!fresh || fresh.id !== current.id) return current;
  const changed =
    fresh.name !== current.name ||
    fresh.defaultBuyIn !== current.defaultBuyIn ||
    fresh.currency !== current.currency;
  return changed ? fresh : current;
}
