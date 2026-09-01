import { describe, it, expect } from 'vitest';
import type { PlayerForm } from '@/types';
import { heatScore, splitFormBoard } from './formBoard';

const form = (overrides: Partial<PlayerForm> & Pick<PlayerForm, 'playerId' | 'playerName'>): PlayerForm => ({
  recentResults: [],
  recentWins: 0,
  recentGames: 5,
  trajectory: 'flat',
  currentStreak: 0,
  streakType: 'none',
  badge: null,
  ...overrides,
});

describe('heatScore', () => {
  it('puts a heater above anyone without the badge', () => {
    const heater = form({ playerId: 'a', playerName: 'Alice', badge: 'heater', recentWins: 3 });
    const winner = form({ playerId: 'b', playerName: 'Bob', trajectory: 'up', recentWins: 5 });

    expect(heatScore(heater)).toBeGreaterThan(heatScore(winner));
  });

  it('puts a slump below anyone without the badge', () => {
    const slump = form({ playerId: 'a', playerName: 'Alice', badge: 'slump' });
    const loser = form({ playerId: 'b', playerName: 'Bob', trajectory: 'down', recentWins: 0 });

    expect(heatScore(slump)).toBeLessThan(heatScore(loser));
  });

  it('separates two heaters by their actual recent record', () => {
    const better = form({ playerId: 'a', playerName: 'Alice', badge: 'heater', recentWins: 4 });
    const worse = form({ playerId: 'b', playerName: 'Bob', badge: 'heater', recentWins: 2 });

    expect(heatScore(better)).toBeGreaterThan(heatScore(worse));
  });
});

describe('splitFormBoard', () => {
  it('lifts the hottest and coldest player out of the pack', () => {
    const board = splitFormBoard([
      form({ playerId: 'a', playerName: 'Alice', recentWins: 2 }),
      form({ playerId: 'b', playerName: 'Bob', badge: 'heater', recentWins: 4, trajectory: 'up' }),
      form({ playerId: 'c', playerName: 'Cara', badge: 'slump', trajectory: 'down' }),
    ]);

    expect(board.hot?.playerId).toBe('b');
    expect(board.cold?.playerId).toBe('c');
    expect(board.rest.map((p) => p.playerId)).toEqual(['a']);
  });

  it('never crowns a player with no recent games, in either direction', () => {
    const board = splitFormBoard([
      form({ playerId: 'a', playerName: 'Alice', recentGames: 0, recentWins: 0 }),
      form({ playerId: 'b', playerName: 'Bob', recentWins: 3, trajectory: 'up' }),
      form({ playerId: 'c', playerName: 'Cara', recentWins: 1, trajectory: 'down' }),
    ]);

    expect(board.hot?.playerId).toBe('b');
    expect(board.cold?.playerId).toBe('c');
    expect(board.rest.map((p) => p.playerId)).toEqual(['a']);
  });

  it('sorts the pack hottest first and parks the players with no evidence at the end', () => {
    const board = splitFormBoard([
      form({ playerId: 'z', playerName: 'Zoe', recentGames: 0 }),
      form({ playerId: 'a', playerName: 'Alice', recentWins: 5, badge: 'heater' }),
      form({ playerId: 'b', playerName: 'Bob', recentWins: 3 }),
      form({ playerId: 'c', playerName: 'Cara', recentWins: 2 }),
      form({ playerId: 'd', playerName: 'Dan', recentWins: 0, badge: 'slump' }),
    ]);

    expect(board.hot?.playerId).toBe('a');
    expect(board.cold?.playerId).toBe('d');
    expect(board.rest.map((p) => p.playerId)).toEqual(['b', 'c', 'z']);
  });

  it('does not name the same player both hottest and coldest', () => {
    const board = splitFormBoard([form({ playerId: 'a', playerName: 'Alice', recentWins: 3 })]);

    expect(board.hot?.playerId).toBe('a');
    expect(board.cold).toBeNull();
    expect(board.rest).toEqual([]);
  });

  it('shows nobody as hot when nobody has played recently', () => {
    const board = splitFormBoard([
      form({ playerId: 'a', playerName: 'Alice', recentGames: 0 }),
      form({ playerId: 'b', playerName: 'Bob', recentGames: 0 }),
    ]);

    expect(board.hot).toBeNull();
    expect(board.cold).toBeNull();
    expect(board.rest.map((p) => p.playerId)).toEqual(['a', 'b']);
  });

  it('handles an empty board', () => {
    expect(splitFormBoard([])).toEqual({ hot: null, cold: null, rest: [] });
  });

  it('breaks ties by name so the board does not reshuffle between renders', () => {
    const board = splitFormBoard([
      form({ playerId: 'z', playerName: 'Zoe', recentWins: 2 }),
      form({ playerId: 'a', playerName: 'Alice', recentWins: 2 }),
      form({ playerId: 'm', playerName: 'Mia', recentWins: 2 }),
    ]);

    expect(board.hot?.playerId).toBe('a');
    expect(board.cold?.playerId).toBe('z');
    expect(board.rest.map((p) => p.playerId)).toEqual(['m']);
  });
});
