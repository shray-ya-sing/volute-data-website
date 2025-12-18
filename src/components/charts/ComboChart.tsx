import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, getSeriesColor } from '../../types/charts';

interface ComboChartProps {
  config: ChartConfig;
}

export function ComboChart({ config }: ComboChartProps) {
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
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={xAxis.key} label={{ value: xAxis.label, position: 'insideBottom', offset: -5 }} />
        <YAxis label={{ value: yAxis.label, angle: -90, position: 'insideLeft' }} />
        {showTooltip && <Tooltip />}
        {showLegend && <Legend />}
        {series.map((s, index) => {
          const color = s.color || colors?.[index] || getSeriesColor(index);

          // Render based on series type (bar or line)
          if (s.type === 'line') {
            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={color}
                strokeWidth={2}
              />
            );
          }

          return (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={color}
            />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
