import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, getSeriesColor } from '../../types/charts';

interface PieChartProps {
  config: ChartConfig;
}

export function PieChart({ config }: PieChartProps) {
  const {
    data,
    series,
    colors,
    height = 400,
    showLegend = true,
    showTooltip = true,
  } = config;

  // For pie charts, we use the first series as the data key
  const dataKey = series[0]?.key || 'value';
  const nameKey = config.xAxis.key; // Category names

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          outerRadius={120}
          label
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors?.[index] || getSeriesColor(index)} />
          ))}
        </Pie>
        {showTooltip && <Tooltip />}
        {showLegend && <Legend />}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
