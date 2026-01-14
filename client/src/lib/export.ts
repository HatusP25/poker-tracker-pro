/**
 * CSV Export Utilities
 * Handles exporting data to CSV format for sessions, rankings, and player stats
 */

import type { Session, SessionEntry, Player, LeaderboardEntry, PlayerStats } from '../types';

/**
 * Converts data to CSV format
 */
const convertToCSV = (headers: string[], rows: string[][]): string => {
  const escapeCSVValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const csvHeaders = headers.map(escapeCSVValue).join(',');
  const csvRows = rows.map(row => row.map(escapeCSVValue).join(',')).join('\n');

  return `${csvHeaders}\n${csvRows}`;
};

/**
 * Downloads CSV file to user's computer
 */
const downloadCSV = (filename: string, csvContent: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/**
 * Formats date to YYYY-MM-DD
 */
const formatDate = (date: string): string => {
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Formats time to HH:MM
 */
const formatTime = (time: string | null): string => {
  if (!time) return '';
  return time;
};

/**
 * Export sessions with all entries
 */
export const exportSessionsCSV = (
  sessions: Session[],
  playerMap: Map<string, Player>
): void => {
  const headers = [
    'Session Date',
    'Start Time',
    'End Time',
    'Location',
    'Player Name',
    'Buy-In',
    'Cash-Out',
    'Profit/Loss',
    'Rebuys',
    'Notes'
  ];

  const rows: string[][] = [];

  sessions.forEach(session => {
    session.entries.forEach(entry => {
      const player = playerMap.get(entry.playerId);
      const profit = entry.cashOut - entry.buyIn;
      const rebuys = 0; // Calculated from buy-in vs default, but we'll keep it simple

      rows.push([
        formatDate(session.date),
        formatTime(session.startTime),
        formatTime(session.endTime),
        session.location || '',
        player?.name || 'Unknown Player',
        entry.buyIn.toFixed(2),
        entry.cashOut.toFixed(2),
        profit.toFixed(2),
        rebuys.toString(),
        session.notes || ''
      ]);
    });
  });

  const csv = convertToCSV(headers, rows);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  downloadCSV(`poker-sessions-${timestamp}.csv`, csv);
};

/**
 * Export leaderboard/rankings
 */
export const exportRankingsCSV = (rankings: LeaderboardEntry[]): void => {
  const headers = [
    'Rank',
    'Player Name',
    'Games Played',
    'Total Buy-In',
    'Total Cash-Out',
    'Balance',
    'ROI %',
    'Win Rate %',
    'Current Streak',
    'Avg Profit per Session'
  ];

  const rows: string[][] = rankings.map((entry, index) => [
    (index + 1).toString(),
    entry.playerName,
    entry.totalGames.toString(),
    entry.totalBuyIn.toFixed(2),
    entry.totalCashOut.toFixed(2),
    entry.balance.toFixed(2),
    entry.roi.toFixed(2),
    entry.winRate.toFixed(2),
    `${entry.currentStreak.count} ${entry.currentStreak.type}`,
    entry.avgProfit.toFixed(2)
  ]);

  const csv = convertToCSV(headers, rows);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  downloadCSV(`poker-rankings-${timestamp}.csv`, csv);
};

/**
 * Export individual player stats and session history
 */
export const exportPlayerStatsCSV = (
  player: Player,
  stats: PlayerStats,
  sessions: Session[]
): void => {
  // Part 1: Player Overview
  const overviewHeaders = [
    'Player Name',
    'Games Played',
    'Total Buy-In',
    'Total Cash-Out',
    'Balance',
    'ROI %',
    'Win Rate %',
    'Avg Profit per Session',
    'Best Session',
    'Worst Session',
    'Current Streak',
    'Longest Win Streak',
    'Longest Loss Streak'
  ];

  const overviewRow = [
    player.name,
    stats.totalGames.toString(),
    stats.totalBuyIn.toFixed(2),
    stats.totalCashOut.toFixed(2),
    stats.balance.toFixed(2),
    stats.roi.toFixed(2),
    stats.winRate.toFixed(2),
    stats.avgProfit.toFixed(2),
    stats.bestSession.toFixed(2),
    stats.worstSession.toFixed(2),
    `${stats.currentStreak.count} ${stats.currentStreak.type}`,
    stats.longestWinStreak.toString(),
    stats.longestLossStreak.toString()
  ];

  // Part 2: Session History
  const sessionHeaders = [
    'Date',
    'Start Time',
    'End Time',
    'Location',
    'Buy-In',
    'Cash-Out',
    'Profit/Loss',
    'Notes'
  ];

  const sessionRows: string[][] = [];
  sessions.forEach(session => {
    const entry = session.entries.find(e => e.playerId === player.id);
    if (entry) {
      const profit = entry.cashOut - entry.buyIn;
      sessionRows.push([
        formatDate(session.date),
        formatTime(session.startTime),
        formatTime(session.endTime),
        session.location || '',
        entry.buyIn.toFixed(2),
        entry.cashOut.toFixed(2),
        profit.toFixed(2),
        session.notes || ''
      ]);
    }
  });

  // Combine both parts with a blank line separator
  const overviewCSV = convertToCSV(overviewHeaders, [overviewRow]);
  const sessionsCSV = convertToCSV(sessionHeaders, sessionRows);
  const fullCSV = `${overviewCSV}\n\n${sessionsCSV}`;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  downloadCSV(`poker-player-${player.name.replace(/\s+/g, '-')}-${timestamp}.csv`, fullCSV);
};

/**
 * Export single session details
 */
export const exportSessionDetailsCSV = (
  session: Session,
  playerMap: Map<string, Player>
): void => {
  const headers = [
    'Player Name',
    'Buy-In',
    'Cash-Out',
    'Profit/Loss'
  ];

  const rows: string[][] = session.entries.map(entry => {
    const player = playerMap.get(entry.playerId);
    const profit = entry.cashOut - entry.buyIn;

    return [
      player?.name || 'Unknown Player',
      entry.buyIn.toFixed(2),
      entry.cashOut.toFixed(2),
      profit.toFixed(2)
    ];
  });

  const csv = convertToCSV(headers, rows);
  const dateStr = formatDate(session.date);
  downloadCSV(`poker-session-${dateStr}.csv`, csv);
};
