/**
 * Calculate profit from buy-in and cash-out amounts
 */
export const calculateProfit = (cashOut: number, buyIn: number): number => {
  return cashOut - buyIn;
};

/**
 * Calculate number of rebuys based on buy-in amount and standard buy-in
 */
export const calculateRebuys = (buyIn: number, standardBuyIn: number): number => {
  if (buyIn <= standardBuyIn) {
    return 0;
  }
  return (buyIn - standardBuyIn) / standardBuyIn;
};

/**
 * Calculate ROI (Return on Investment) percentage
 */
export const calculateROI = (totalCashOut: number, totalBuyIn: number): number => {
  if (totalBuyIn === 0) {
    return 0;
  }
  return ((totalCashOut - totalBuyIn) / totalBuyIn) * 100;
};

/**
 * Calculate win rate percentage
 */
export const calculateWinRate = (wins: number, totalGames: number): number => {
  if (totalGames === 0) {
    return 0;
  }
  return (wins / totalGames) * 100;
};

/**
 * Calculate average profit per game
 */
export const calculateAvgProfit = (totalProfit: number, totalGames: number): number => {
  if (totalGames === 0) {
    return 0;
  }
  return totalProfit / totalGames;
};

/**
 * Determine if a session is balanced (difference < threshold)
 */
export const isSessionBalanced = (totalBuyIn: number, totalCashOut: number, threshold = 1): boolean => {
  return Math.abs(totalBuyIn - totalCashOut) <= threshold;
};

/**
 * Calculate streak information from session results
 */
export const calculateStreak = (
  sessionResults: Array<{ profit: number; date: Date }>
): { type: 'win' | 'loss' | 'none'; count: number } => {
  if (sessionResults.length === 0) {
    return { type: 'none', count: 0 };
  }

  // Sort by date descending (most recent first)
  const sorted = [...sessionResults].sort((a, b) => b.date.getTime() - a.date.getTime());

  let streakType: 'win' | 'loss' | 'none' = 'none';
  let streakCount = 0;

  // Determine streak type from most recent session
  if (sorted[0].profit > 0) {
    streakType = 'win';
  } else if (sorted[0].profit < 0) {
    streakType = 'loss';
  } else {
    return { type: 'none', count: 0 };
  }

  // Count consecutive sessions of the same type
  for (const result of sorted) {
    if (streakType === 'win' && result.profit > 0) {
      streakCount++;
    } else if (streakType === 'loss' && result.profit < 0) {
      streakCount++;
    } else {
      break;
    }
  }

  return { type: streakType, count: streakCount };
};

/**
 * Calculate longest win streak from session results
 */
export const calculateLongestWinStreak = (
  sessionResults: Array<{ profit: number; date: Date }>
): number => {
  if (sessionResults.length === 0) {
    return 0;
  }

  // Sort by date ascending (oldest first)
  const sorted = [...sessionResults].sort((a, b) => a.date.getTime() - b.date.getTime());

  let maxStreak = 0;
  let currentStreak = 0;

  for (const result of sorted) {
    if (result.profit > 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
};

/**
 * Calculate longest loss streak from session results
 */
export const calculateLongestLossStreak = (
  sessionResults: Array<{ profit: number; date: Date }>
): number => {
  if (sessionResults.length === 0) {
    return 0;
  }

  // Sort by date ascending (oldest first)
  const sorted = [...sessionResults].sort((a, b) => a.date.getTime() - b.date.getTime());

  let maxStreak = 0;
  let currentStreak = 0;

  for (const result of sorted) {
    if (result.profit < 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
};

/**
 * Round number to 2 decimal places
 */
export const round = (num: number, decimals = 2): number => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};
