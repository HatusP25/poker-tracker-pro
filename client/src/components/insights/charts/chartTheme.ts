// Centralized palette + formatters for the Insights "nicer graphs" layer.
export const CHART = {
  grid: '#374151',
  axis: '#9CA3AF',
  zeroLine: '#6B7280',
  positive: '#10B981',
  negative: '#EF4444',
  // Stable per-series palette for multi-player charts.
  series: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316', '#06B6D4'],
};

export const colorForIndex = (i: number) => CHART.series[i % CHART.series.length];

export const formatCurrency = (value: number) =>
  `${value < 0 ? '-' : ''}$${Math.abs(value).toFixed(0)}`;

export const formatSignedCurrency = (value: number) =>
  `${value >= 0 ? '+' : ''}$${value.toFixed(0)}`;
