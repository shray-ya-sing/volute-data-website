/**
 * TypeScript types matching the C# SlideSchema model
 * These types correspond to Models.cs in DocLayer.Core
 */

export interface SlideSchema {
  slide: SlideDefinition;
}

export interface SlideDefinition {
  width: number; // EMU
  height: number; // EMU
  background?: BackgroundDefinition;
  elements?: ElementDefinition[];
}

export interface BackgroundDefinition {
  fill?: FillDefinition;
}

export interface ElementDefinition {
  // Common fields
  type: 'sp' | 'cxnSp' | 'chart' | 'table' | 'pic';
  id: number;
  name: string;
  position: PositionDefinition;

  // Image
  imageData?: string; // Base64 or binary data

  // Shape properties
  fill?: FillDefinition;
  border?: BorderDefinition;
  line?: LineDefinition;
  headEnd?: ArrowEndDefinition;
  tailEnd?: ArrowEndDefinition;
  text?: TextDefinition;

  // Chart properties
  chartType?: 'lineChart' | 'barChart' | 'pieChart';
  plotArea?: PlotAreaDefinition;
  series?: SeriesDefinition[];
  barDir?: 'col' | 'bar';
  axes?: AxesDefinition;
  legend?: LegendDefinition;
  dataLabels?: DataLabelsDefinition;

  // Table properties
  columns?: ColumnDefinition[];
  rows?: RowDefinition[];
}

export interface PositionDefinition {
  x: number; // EMU
  y: number; // EMU
  cx: number; // EMU
  cy: number; // EMU
}

export interface FillDefinition {
  type: 'solid' | 'none' | 'gradient' | 'pattern';
  color?: string; // 6-char hex without #
}

export interface BorderDefinition {
  type: 'solid' | 'none';
  color?: string; // 6-char hex without #
  width?: number; // EMU
}

export interface LineDefinition {
  color: string; // 6-char hex without #
  width: number; // EMU
}

export interface ArrowEndDefinition {
  type: 'arrow' | 'stealth' | 'diamond' | 'oval' | 'block' | 'none';
}

export interface TextDefinition {
  type?: string; // "none" to suppress
  body?: TextBodyDefinition;
}

export interface TextBodyDefinition {
  anchor?: 't' | 'ctr' | 'b'; // Vertical alignment
  autofit?: boolean;
  paragraphs?: ParagraphDefinition[];
}

export interface ParagraphDefinition {
  alignment?: 'left' | 'ctr' | 'right';
  runs?: RunDefinition[];
  lineSpacing?: number;
}

export interface RunDefinition {
  text: string;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number; // Half-points (e.g., 1800 = 18pt)
  fontFace?: string;
  color?: string; // 6-char hex without #
  baseline?: number; // Superscript/subscript (30000 = superscript)
}

export interface PlotAreaDefinition {
  fill?: FillDefinition;
  border?: BorderDefinition;
}

export interface SeriesDefinition {
  name: string;
  color: string; // 6-char hex without #
  negativeColor?: string;
  smooth?: boolean;
  markerSize?: number;
  markerColor?: string;
  points: DataPoint[];
}

export interface DataPoint {
  label: string;
  value: number;
}

export interface AxesDefinition {
  catAx?: AxisDefinition; // Category axis (X)
  valAx?: AxisDefinition; // Value axis (Y)
}

export interface AxisDefinition {
  visible: boolean;
  labelColor?: string; // 6-char hex without #
  labelFontSize?: number; // Half-points
  min?: number;
  max?: number;
  majorUnit?: number;
  numFmt?: string;
  tickMark?: string;
  axLine?: BorderDefinition;
  gridLine?: GridLineDefinition;
}

export interface GridLineDefinition {
  type: 'none' | 'solid';
  color?: string; // 6-char hex without #
}

export interface LegendDefinition {
  visible: boolean;
  position?: 'b' | 't' | 'l' | 'r' | 'tr';
}

export interface DataLabelsDefinition {
  visible: boolean;
  position?: string;
  color?: string;
  fontSize?: number;
}

export interface ColumnDefinition {
  width: number; // EMU
}

export interface RowDefinition {
  height: number; // EMU
  cells?: CellDefinition[];
}

export interface CellDefinition {
  text: string;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number; // Half-points
  color?: string; // 6-char hex without #
  fill?: FillDefinition;
  alignment?: 'left' | 'ctr' | 'right';
}
