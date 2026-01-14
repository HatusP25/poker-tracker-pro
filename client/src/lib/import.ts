/**
 * CSV Import Utilities
 * Handles parsing and validating CSV files for import
 */

import type { Player } from '../types';

/**
 * CSV parsing result
 */
export interface CSVParseResult {
  headers: string[];
  rows: string[][];
  errors: string[];
}

/**
 * Session import data
 */
export interface SessionImportData {
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  playerName: string;
  buyIn: number;
  cashOut: number;
  notes?: string;
}

/**
 * Column mapping configuration
 */
export interface ColumnMapping {
  date?: number;
  startTime?: number;
  endTime?: number;
  location?: number;
  playerName: number;
  buyIn: number;
  cashOut: number;
  notes?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Parse CSV file content
 */
export const parseCSV = (content: string): CSVParseResult => {
  const errors: string[] = [];

  try {
    // Split by lines and handle different line endings
    const lines = content.split(/\r?\n/).filter(line => line.trim());

    if (lines.length === 0) {
      errors.push('CSV file is empty');
      return { headers: [], rows: [], errors };
    }

    // Parse headers
    const headers = parseCSVLine(lines[0]);

    if (headers.length === 0) {
      errors.push('No headers found in CSV file');
      return { headers: [], rows: [], errors };
    }

    // Parse data rows
    const rows = lines.slice(1).map((line, index) => {
      try {
        return parseCSVLine(line);
      } catch (error) {
        errors.push(`Error parsing line ${index + 2}: ${error}`);
        return [];
      }
    }).filter(row => row.length > 0);

    return { headers, rows, errors };
  } catch (error) {
    errors.push(`Failed to parse CSV: ${error}`);
    return { headers: [], rows: [], errors };
  }
};

/**
 * Parse a single CSV line handling quoted values
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
};

/**
 * Auto-detect column mappings based on header names
 */
export const autoDetectColumns = (headers: string[]): Partial<ColumnMapping> => {
  const mapping: Partial<ColumnMapping> = {};

  headers.forEach((header, index) => {
    const lower = header.toLowerCase().trim();

    // Date column
    if (lower.includes('date') || lower === 'session date') {
      mapping.date = index;
    }
    // Start time
    else if (lower.includes('start') && lower.includes('time')) {
      mapping.startTime = index;
    }
    // End time
    else if (lower.includes('end') && lower.includes('time')) {
      mapping.endTime = index;
    }
    // Location
    else if (lower.includes('location') || lower.includes('venue')) {
      mapping.location = index;
    }
    // Player name
    else if (
      lower.includes('player') ||
      lower.includes('name') ||
      lower === 'player name'
    ) {
      mapping.playerName = index;
    }
    // Buy-in
    else if (
      lower.includes('buy') ||
      lower.includes('buyin') ||
      lower === 'buy-in'
    ) {
      mapping.buyIn = index;
    }
    // Cash-out
    else if (
      lower.includes('cash') ||
      lower.includes('cashout') ||
      lower === 'cash-out'
    ) {
      mapping.cashOut = index;
    }
    // Notes
    else if (lower.includes('note')) {
      mapping.notes = index;
    }
  });

  return mapping;
};

/**
 * Validate column mapping
 */
export const validateColumnMapping = (mapping: Partial<ColumnMapping>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (mapping.playerName === undefined) {
    errors.push('Player name column is required');
  }
  if (mapping.buyIn === undefined) {
    errors.push('Buy-in column is required');
  }
  if (mapping.cashOut === undefined) {
    errors.push('Cash-out column is required');
  }

  // Warnings for optional but recommended fields
  if (mapping.date === undefined) {
    warnings.push('Date column not mapped - sessions will use current date');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Parse import data from CSV rows using column mapping
 */
export const parseImportData = (
  rows: string[][],
  mapping: ColumnMapping,
  players: Player[]
): { data: SessionImportData[]; errors: string[] } => {
  const data: SessionImportData[] = [];
  const errors: string[] = [];
  const playerNameMap = new Map(players.map(p => [p.name.toLowerCase(), p.name]));

  rows.forEach((row, rowIndex) => {
    try {
      // Extract values based on mapping
      const playerNameRaw = mapping.playerName !== undefined ? row[mapping.playerName]?.trim() : '';
      const buyInStr = mapping.buyIn !== undefined ? row[mapping.buyIn]?.trim() : '';
      const cashOutStr = mapping.cashOut !== undefined ? row[mapping.cashOut]?.trim() : '';

      // Validate required fields
      if (!playerNameRaw) {
        errors.push(`Row ${rowIndex + 2}: Player name is missing`);
        return;
      }

      // Match player name (case-insensitive)
      const playerNameLower = playerNameRaw.toLowerCase();
      const playerName = playerNameMap.get(playerNameLower);

      if (!playerName) {
        errors.push(`Row ${rowIndex + 2}: Player "${playerNameRaw}" not found in group`);
        return;
      }

      // Parse numbers
      const buyIn = parseFloat(buyInStr.replace(/[^0-9.-]/g, ''));
      const cashOut = parseFloat(cashOutStr.replace(/[^0-9.-]/g, ''));

      if (isNaN(buyIn)) {
        errors.push(`Row ${rowIndex + 2}: Invalid buy-in value "${buyInStr}"`);
        return;
      }
      if (isNaN(cashOut)) {
        errors.push(`Row ${rowIndex + 2}: Invalid cash-out value "${cashOutStr}"`);
        return;
      }

      // Optional fields
      const date = mapping.date !== undefined ? row[mapping.date]?.trim() : '';
      const startTime = mapping.startTime !== undefined ? row[mapping.startTime]?.trim() : '';
      const endTime = mapping.endTime !== undefined ? row[mapping.endTime]?.trim() : '';
      const location = mapping.location !== undefined ? row[mapping.location]?.trim() : '';
      const notes = mapping.notes !== undefined ? row[mapping.notes]?.trim() : '';

      // Validate date format if provided
      let parsedDate = date;
      if (date) {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
          errors.push(`Row ${rowIndex + 2}: Invalid date format "${date}"`);
          return;
        }
        parsedDate = dateObj.toISOString().split('T')[0];
      } else {
        // Use current date if not provided
        parsedDate = new Date().toISOString().split('T')[0];
      }

      data.push({
        date: parsedDate,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        location: location || undefined,
        playerName,
        buyIn,
        cashOut,
        notes: notes || undefined,
      });
    } catch (error) {
      errors.push(`Row ${rowIndex + 2}: ${error}`);
    }
  });

  return { data, errors };
};

/**
 * Group import data by session (same date, location, times)
 */
export const groupBySession = (data: SessionImportData[]): SessionImportData[][] => {
  const sessionMap = new Map<string, SessionImportData[]>();

  data.forEach(entry => {
    // Create a unique key for each session
    const key = `${entry.date}|${entry.startTime || ''}|${entry.endTime || ''}|${entry.location || ''}`;

    if (!sessionMap.has(key)) {
      sessionMap.set(key, []);
    }
    sessionMap.get(key)!.push(entry);
  });

  return Array.from(sessionMap.values());
};

/**
 * Read file as text
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
