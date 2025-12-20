import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, getSeriesColor } from '../../types/charts';

interface DonutChartProps {
  config: ChartConfig;
}

export function DonutChart({ config }: DonutChartProps) {
  const {
    data,
    series,
    colors,
    height = 400,
    showLegend = true,
    showTooltip = true,
  } = config;

  // For donut charts, we use the first series as the data key
  const dataKey = series[0]?.key || 'value';
  const nameKey = config.xAxis.key; // Category names

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={120}
          label
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors?.[index] || getSeriesColor(index)} />
          ))}
        </Pie>
        {showTooltip && <Tooltip />}
        {showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );
}
