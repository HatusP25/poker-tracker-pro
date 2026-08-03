/**
 * Validation utilities for API requests
 */

export const isValidDate = (date: string): boolean => {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
};

export const isPositiveNumber = (value: number): boolean => {
  return typeof value === 'number' && value >= 0;
};

export const isValidBuyIn = (buyIn: number, maxBuyIn = 1000): boolean => {
  return typeof buyIn === 'number' && buyIn > 0 && buyIn <= maxBuyIn;
};

export const isValidCashOut = (cashOut: number, maxCashOut = 10000): boolean => {
  return isPositiveNumber(cashOut) && cashOut <= maxCashOut;
};

export const isValidGroupName = (name: string): boolean => {
  return typeof name === 'string' && name.trim().length >= 3 && name.trim().length <= 50;
};

export const isValidPlayerName = (name: string): boolean => {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 50;
};

/**
 * A nickname is optional; when given it must be short enough to sit next to the
 * name on a share card without wrapping.
 */
export const isValidNickname = (nickname: unknown): boolean => {
  if (nickname === undefined || nickname === null) return true;
  if (typeof nickname !== 'string') return false;
  // Blank (or whitespace-only) means "no nickname" and is how one gets cleared —
  // the service stores it as null. Only a too-long handle is actually invalid.
  return nickname.trim().length <= 24;
};

export const isFutureDate = (date: Date): boolean => {
  return date.getTime() > Date.now();
};

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
