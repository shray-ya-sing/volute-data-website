/**
 * Chart Configuration Types
 * These types define the structure for chart data that will come from the LLM
 */

export type ChartType =
  | 'vertical-bar'
  | 'horizontal-bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'stacked-bar'
  | 'grouped-bar'
  | 'combo'
  | 'scatter';

export interface ChartDataPoint {
  [key: string]: string | number;
}

export interface ChartSeries {
  key: string;
  name: string;
  color?: string;
  type?: 'bar' | 'line' | 'area'; // For combo charts
}

export interface ChartAxis {
  key: string;
  label: string;
  type?: 'category' | 'number' | 'time';
}

export interface ChartConfig {
  type: ChartType;
  title?: string;
  description?: string;
  data: ChartDataPoint[];
  xAxis: ChartAxis;
  yAxis: ChartAxis;
  series: ChartSeries[];
  colors?: string[];
  width?: number;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
}

// Preset color schemes
export const COLOR_SCHEMES = {
  default: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
  professional: ['#1e40af', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777'],
  pastel: ['#93c5fd', '#86efac', '#fcd34d', '#fca5a5', '#c4b5fd', '#f9a8d4'],
  vibrant: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
  monochrome: ['#1f2937', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'],
};

// Helper to get color for a series
export function getSeriesColor(index: number, scheme: keyof typeof COLOR_SCHEMES = 'default'): string {
  const colors = COLOR_SCHEMES[scheme];
  return colors[index % colors.length];
}

// Example LLM response structure (for reference)
export interface LLMChartResponse {
  chartConfig: ChartConfig;
  reasoning?: string;
  suggestions?: string[];
}
