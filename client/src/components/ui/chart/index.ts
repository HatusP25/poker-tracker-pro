export { ChartFrame } from './ChartFrame';
export type { ChartFrameProps } from './ChartFrame';

export { ChartTooltip } from './ChartTooltip';
export type { ChartTooltipProps, ChartTooltipItem } from './ChartTooltip';

// Re-exported so a chart needs one import for its frame, its tooltip and its
// theme. Neither file here pulls in Recharts.
export {
  resolveChartTheme,
  CHART_HEIGHT,
  CHART_MARGIN,
  axisProps,
  gridProps,
} from '@/components/insights/charts/chartTheme';
export type { ChartTheme, ChartHeightName } from '@/components/insights/charts/chartTheme';
