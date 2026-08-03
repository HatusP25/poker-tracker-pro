import { format } from 'date-fns';
import { parseLocalDate } from './dateUtils';
import { CHART } from '@/components/insights/charts/chartTheme';
import type { NightMessageResult } from './nightMessage';

/**
 * Layout for shareable result images.
 *
 * "Copy for WhatsApp" landed, but text gets skimmed in a group chat — images get
 * forwarded. This builds a declarative scene (positions + colours, no canvas), so
 * the layout maths is pure and testable; `renderShareCard` turns a scene into a
 * PNG. Every input already exists in the app — no new data, no schema.
 */

export type SceneItem =
  | {
      kind: 'text';
      text: string;
      x: number;
      y: number;
      size: number;
      color: string;
      weight?: 'normal' | 'bold';
      align?: 'left' | 'center' | 'right';
    }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; color: string; radius?: number }
  | { kind: 'line'; x: number; y: number; w: number; color: string };

export interface Scene {
  width: number;
  height: number;
  background: string;
  items: SceneItem[];
}

// Square-ish and 1080 wide: reads well inline in every chat client.
const W = 1080;
const PAD = 72;
const BG = '#0B1220';
const FG = '#F8FAFC';
const MUTED = '#94A3B8';
const ACCENT = '#22C55E';

const ROW_H = 76;
const SECTION_GAP = 48;

const signed = (amount: number, currency: string) =>
  `${amount >= 0 ? '+' : '-'}${currency}${Math.abs(amount).toFixed(0)}`;

const plain = (amount: number, currency: string) =>
  `${currency}${Math.abs(amount).toFixed(0)}`;

/** Colour by sign, matching the charts and the rest of the UI. */
const profitColor = (amount: number) =>
  amount > 0 ? CHART.positive : amount < 0 ? CHART.negative : MUTED;

interface Builder {
  items: SceneItem[];
  y: number;
}

const heading = (b: Builder, text: string) => {
  b.items.push({ kind: 'text', text, x: PAD, y: b.y, size: 30, color: MUTED, weight: 'bold' });
  b.y += 52;
};

const divider = (b: Builder) => {
  b.items.push({ kind: 'line', x: PAD, y: b.y, w: W - PAD * 2, color: '#1E293B' });
  b.y += SECTION_GAP;
};

/** Name on the left, amount on the right, both on one baseline. */
const row = (b: Builder, left: string, right: string, rightColor: string) => {
  b.items.push({ kind: 'text', text: left, x: PAD, y: b.y, size: 40, color: FG });
  b.items.push({
    kind: 'text',
    text: right,
    x: W - PAD,
    y: b.y,
    size: 40,
    color: rightColor,
    weight: 'bold',
    align: 'right',
  });
  b.y += ROW_H;
};

const footer = (b: Builder): Scene => {
  b.y += 8;
  b.items.push({
    kind: 'text',
    text: 'Poker Tracker Pro',
    x: W / 2,
    y: b.y,
    size: 26,
    color: '#475569',
    align: 'center',
  });
  b.y += PAD;
  return { width: W, height: Math.round(b.y), background: BG, items: b.items };
};

const start = (title: string, subtitle: string): Builder => {
  const b: Builder = { items: [], y: PAD + 56 };
  b.items.push({ kind: 'text', text: title, x: PAD, y: b.y, size: 60, color: FG, weight: 'bold' });
  b.y += 56;
  b.items.push({ kind: 'text', text: subtitle, x: PAD, y: b.y, size: 32, color: ACCENT });
  // Header needs real air before the first row, or the card reads as cramped.
  b.y += SECTION_GAP + 44;
  return b;
};

/**
 * Font size for the belt hero, stepped down so a long name plus a nickname still
 * fits the card width. Approximates at ~0.55em average glyph width.
 */
export function heroSize(text: string): number {
  const usable = W - PAD * 2;
  for (const size of [104, 88, 72, 60, 48]) {
    if (text.length * size * 0.55 <= usable) return size;
  }
  return 40;
}

/** One centred line — used where a card has a single subject rather than a list. */
const centered = (b: Builder, text: string, size: number, color: string, bold = false) => {
  b.items.push({
    kind: 'text',
    text,
    x: W / 2,
    y: b.y,
    size,
    color,
    align: 'center',
    ...(bold ? { weight: 'bold' as const } : {}),
  });
  b.y += size + 24;
};

export interface NightCardInput {
  date: string;
  currency: string;
  results: NightMessageResult[];
  settlements: Array<{ from: string; to: string; amount: number }>;
  belt?: { line: string };
}

/** The night's results, transfers and belt line — the image twin of the WhatsApp text. */
export function buildNightCardScene(input: NightCardInput): Scene {
  const { date, currency, results, settlements, belt } = input;

  const b = start('Poker Night', format(parseLocalDate(date), 'EEEE, MMMM d'));

  // Same ordering as the text message so the two never disagree.
  const sorted = [...results].sort((a, b2) => b2.profit - a.profit || a.name.localeCompare(b2.name));

  for (const r of sorted) {
    // Titles earned that night ride along with the name, as they do in the text.
    const badges = r.titles.map((t) => t.emoji).join(' ');
    const label = badges ? `${badges}  ${r.name}` : r.name;
    row(b, label, signed(r.profit, currency), profitColor(r.profit));
  }

  if (settlements.length > 0) {
    divider(b);
    heading(b, 'SETTLE UP');
    for (const s of settlements) {
      row(b, `${s.from}  →  ${s.to}`, plain(s.amount, currency), FG);
    }
  }

  if (belt) {
    divider(b);
    b.items.push({ kind: 'text', text: `🥇 ${belt.line}`, x: PAD, y: b.y, size: 34, color: FG });
    b.y += 60;
  }

  return footer(b);
}

export interface BeltCardInput {
  holderName: string;
  takenFromName?: string | null;
  nightsHeld: number;
  defenses: number;
}

/** A belt change — the single most forwardable moment in the group's story. */
export function buildBeltCardScene(input: BeltCardInput): Scene {
  const { holderName, takenFromName, nightsHeld, defenses } = input;

  const b = start('🥇 The Belt', takenFromName ? `Taken from ${takenFromName}` : 'Reigning champion');

  // A hero layout rather than a list: this card has one subject, and centring the
  // whole block keeps the name from floating above left-aligned rows.
  b.y += 40;
  // A long name plus a nickname would run off a fixed-size hero, and this image
  // gets posted — so step the size down as the name grows.
  centered(b, holderName, heroSize(holderName), ACCENT, true);
  b.y += 16;
  centered(
    b,
    `${nightsHeld} ${nightsHeld === 1 ? 'night' : 'nights'} held · ` +
      `${defenses} ${defenses === 1 ? 'defense' : 'defenses'}`,
    36,
    MUTED
  );
  b.y += 24;

  return footer(b);
}

export interface SeasonCardInput {
  period: string;
  currency: string;
  totalSessions: number;
  totalPot: number;
  champion?: { playerName: string; value: number } | null;
  attendanceKing?: { playerName: string; value: number } | null;
  biggestMover?: { playerName: string; positionsGained: number } | null;
  bestSingleNight?: { playerName: string; value: number } | null;
  mostRebuys?: { playerName: string; value: number } | null;
}

/** Season Wrapped, as a card people actually post. */
export function buildSeasonCardScene(input: SeasonCardInput): Scene {
  const b = start(`${input.period} Wrapped`, `${input.totalSessions} nights · ${plain(input.totalPot, input.currency)} across the table`);

  if (input.champion) {
    row(b, '👑  Champion', `${input.champion.playerName}  ${signed(input.champion.value, input.currency)}`, ACCENT);
  }
  if (input.bestSingleNight) {
    row(b, '🔥  Best night', `${input.bestSingleNight.playerName}  ${signed(input.bestSingleNight.value, input.currency)}`, FG);
  }
  if (input.attendanceKing) {
    row(b, '📅  Most nights', `${input.attendanceKing.playerName}  ${input.attendanceKing.value}`, FG);
  }
  if (input.biggestMover) {
    row(b, '📈  Biggest mover', `${input.biggestMover.playerName}  +${input.biggestMover.positionsGained}`, FG);
  }
  if (input.mostRebuys) {
    row(b, '🏧  Most rebuys', `${input.mostRebuys.playerName}  ${input.mostRebuys.value}`, FG);
  }

  return footer(b);
}
