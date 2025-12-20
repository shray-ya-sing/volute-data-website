import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, getSeriesColor } from '../../types/charts';

interface GroupedBarChartProps {
  config: ChartConfig;
}

export function GroupedBarChart({ config }: GroupedBarChartProps) {
  const {
    data,
    xAxis,
    yAxis,
    series,
    colors,
    height = 400,
    showLegend = true,
    showGrid = true,
    showTooltip = true,
  } = config;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={xAxis.key} label={{ value: xAxis.label, position: 'insideBottom', offset: -5 }} />
        <YAxis label={{ value: yAxis.label, angle: -90, position: 'insideLeft' }} />
        {showTooltip && <Tooltip />}
        {showLegend && <Legend />}
        {series.map((s, index) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color || colors?.[index] || getSeriesColor(index)}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
