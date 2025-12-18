import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, getSeriesColor } from '../../types/charts';

interface HorizontalBarChartProps {
  config: ChartConfig;
}

export function HorizontalBarChart({ config }: HorizontalBarChartProps) {
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
      <BarChart data={data} layout="horizontal" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis type="number" label={{ value: xAxis.label, position: 'insideBottom', offset: -5 }} />
        <YAxis type="category" dataKey={yAxis.key} label={{ value: yAxis.label, angle: -90, position: 'insideLeft' }} />
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
