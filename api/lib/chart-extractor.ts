import type { LayoutNode } from './layout-engine';
import type { ElementDefinition } from './types';

/**
 * Extract chart data from Recharts components (LineChart, BarChart, etc.)
 */
export function extractChartData(
  node: LayoutNode,
  id: number,
  componentData: Map<string, any>
): ElementDefinition | null {
  if (!node.position) return null;

  const chartType = getChartType(node.tagName);
  if (!chartType) return null;

  // Extract data prop
  let data = node.props.data;
  if (typeof data === 'string' && componentData.has(data)) {
    data = componentData.get(data);
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.warn(`Chart data is empty or invalid for ${node.tagName}`);
    return null;
  }

  // Extract series from child Line/Bar components
  const series = extractSeriesFromChildren(node, data);

  if (series.length === 0) {
    console.warn(`No series found for ${node.tagName}`);
    return null;
  }

  // Extract axes configuration
  const axes = extractAxesConfiguration(node);

  // Extract legend configuration
  const legend = extractLegendConfiguration(node);

  // Build chart element
  const chartElement: ElementDefinition = {
    type: 'chart',
    id,
    name: `chart-${id}`,
    position: {
      x: node.position.x,
      y: node.position.y,
      cx: node.position.width,
      cy: node.position.height,
    },
    chartType,
    series,
    axes,
    legend,
    dataLabels: { visible: false },
  };

  // Add plot area styling if background is specified
  if (node.styles.backgroundColor) {
    chartElement.plotArea = {
      fill: {
        type: 'solid',
        color: normalizeColor(node.styles.backgroundColor),
      },
    };
  }

  // For bar charts, determine direction
  if (chartType === 'barChart') {
    chartElement.barDir = 'col'; // Default to column
  }

  return chartElement;
}

/**
 * Get PowerPoint chart type from Recharts component name
 */
function getChartType(tagName: string): string | null {
  switch (tagName) {
    case 'LineChart':
      return 'lineChart';
    case 'BarChart':
      return 'barChart';
    case 'PieChart':
      return 'pieChart';
    default:
      return null;
  }
}

/**
 * Extract series from child Line/Bar components
 */
function extractSeriesFromChildren(
  chartNode: LayoutNode,
  data: any[]
): any[] {
  const series: any[] = [];

  // Find Line or Bar child components
  chartNode.children.forEach((child) => {
    if (child.tagName === 'Line' || child.tagName === 'Bar') {
      const dataKey = child.props.dataKey;
      if (!dataKey) return;

      const seriesName = child.props.name || dataKey;
      const color = normalizeColor(child.props.stroke || child.props.fill || '#000000');
      const smooth = child.props.type === 'monotone' || child.props.smooth === true;

      // Extract data points
      const points = data.map((item) => ({
        label: item[data[0] ? Object.keys(data[0])[0] : 'label'] || '', // First key as label
        value: parseFloat(item[dataKey]) || 0,
      }));

      series.push({
        name: seriesName,
        color,
        smooth,
        markerSize: 5,
        markerColor: color,
        points,
      });
    }
  });

  return series;
}

/**
 * Extract axes configuration from XAxis/YAxis children
 */
function extractAxesConfiguration(chartNode: LayoutNode): any {
  const axes: any = {
    catAx: {
      visible: true,
      labelColor: 'FFFFFF',
      labelFontSize: 800,
    },
    valAx: {
      visible: true,
      labelColor: 'FFFFFF',
      labelFontSize: 800,
      gridLine: { type: 'none' },
    },
  };

  chartNode.children.forEach((child) => {
    if (child.tagName === 'XAxis') {
      // Category axis configuration
      if (child.props.tick && typeof child.props.tick === 'object') {
        if (child.props.tick.fill) {
          axes.catAx.labelColor = normalizeColor(child.props.tick.fill);
        }
        if (child.props.tick.fontSize) {
          axes.catAx.labelFontSize = child.props.tick.fontSize * 100;
        }
      }
    } else if (child.tagName === 'YAxis') {
      // Value axis configuration
      if (child.props.tick && typeof child.props.tick === 'object') {
        if (child.props.tick.fill) {
          axes.valAx.labelColor = normalizeColor(child.props.tick.fill);
        }
        if (child.props.tick.fontSize) {
          axes.valAx.labelFontSize = child.props.tick.fontSize * 100;
        }
      }

      // Domain (min/max)
      if (child.props.domain && Array.isArray(child.props.domain)) {
        if (typeof child.props.domain[0] === 'number') {
          axes.valAx.min = child.props.domain[0];
        }
        if (typeof child.props.domain[1] === 'number') {
          axes.valAx.max = child.props.domain[1];
        }
      }
    } else if (child.tagName === 'CartesianGrid') {
      // Grid lines
      axes.valAx.gridLine = {
        type: 'solid',
        color: normalizeColor(child.props.stroke || '#E5E7EB'),
      };
    }
  });

  return axes;
}

/**
 * Extract legend configuration from Legend child
 */
function extractLegendConfiguration(chartNode: LayoutNode): any {
  const legendChild = chartNode.children.find((child) => child.tagName === 'Legend');

  if (legendChild) {
    return {
      visible: true,
      position: 'b', // Default to bottom
    };
  }

  return {
    visible: false,
  };
}

/**
 * Normalize color to 6-char uppercase hex without #
 */
function normalizeColor(color: string): string {
  if (!color) return '000000';

  // Remove # if present
  color = color.replace('#', '');

  // If it's already 6 chars, uppercase and return
  if (color.length === 6) {
    return color.toUpperCase();
  }

  // If it's 3 chars, expand (e.g., 'abc' -> 'aabbcc')
  if (color.length === 3) {
    return color
      .split('')
      .map((c) => c + c)
      .join('')
      .toUpperCase();
  }

  // Default to black
  return '000000';
}
