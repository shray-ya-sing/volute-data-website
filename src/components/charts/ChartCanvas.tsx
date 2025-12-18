import { ChartConfig } from '../../types/charts';
import { VerticalBarChart } from './VerticalBarChart';
import { HorizontalBarChart } from './HorizontalBarChart';
import { LineChart } from './LineChart';
import { AreaChart } from './AreaChart';
import { PieChart } from './PieChart';
import { DonutChart } from './DonutChart';
import { StackedBarChart } from './StackedBarChart';
import { GroupedBarChart } from './GroupedBarChart';
import { ComboChart } from './ComboChart';
import { ScatterChart } from './ScatterChart';

interface ChartCanvasProps {
  config: ChartConfig;
  className?: string;
}

/**
 * ChartCanvas - Main component for rendering charts dynamically
 *
 * This component takes a ChartConfig object (typically from LLM) and renders
 * the appropriate chart type with the provided data.
 *
 * Usage:
 * ```tsx
 * const config: ChartConfig = {
 *   type: 'vertical-bar',
 *   data: [...],
 *   xAxis: { key: 'company', label: 'Company' },
 *   yAxis: { key: 'value', label: 'Revenue ($M)' },
 *   series: [{ key: 'value', name: 'Revenue' }]
 * };
 *
 * <ChartCanvas config={config} />
 * ```
 */
export function ChartCanvas({ config, className = '' }: ChartCanvasProps) {
  // Render chart title and description if provided
  const renderHeader = () => {
    if (!config.title && !config.description) return null;

    return (
      <div className="mb-6">
        {config.title && (
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">
            {config.title}
          </h3>
        )}
        {config.description && (
          <p className="text-gray-600">
            {config.description}
          </p>
        )}
      </div>
    );
  };

  // Render the appropriate chart based on type
  const renderChart = () => {
    switch (config.type) {
      case 'vertical-bar':
        return <VerticalBarChart config={config} />;

      case 'horizontal-bar':
        return <HorizontalBarChart config={config} />;

      case 'line':
        return <LineChart config={config} />;

      case 'area':
        return <AreaChart config={config} />;

      case 'pie':
        return <PieChart config={config} />;

      case 'donut':
        return <DonutChart config={config} />;

      case 'stacked-bar':
        return <StackedBarChart config={config} />;

      case 'grouped-bar':
        return <GroupedBarChart config={config} />;

      case 'combo':
        return <ComboChart config={config} />;

      case 'scatter':
        return <ScatterChart config={config} />;

      default:
        return (
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <p className="text-gray-500">
              Unknown chart type: {config.type}
            </p>
          </div>
        );
    }
  };

  return (
    <div className={`chart-canvas bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {renderHeader()}
      <div className="chart-container">
        {renderChart()}
      </div>
    </div>
  );
}
