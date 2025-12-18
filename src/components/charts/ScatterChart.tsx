import { ScatterChart as RechartsScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, getSeriesColor } from '../../types/charts';

interface ScatterChartProps {
  config: ChartConfig;
}

export function ScatterChart({ config }: ScatterChartProps) {
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
      <RechartsScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis
          type="number"
          dataKey={xAxis.key}
          name={xAxis.label}
          label={{ value: xAxis.label, position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          type="number"
          dataKey={yAxis.key}
          name={yAxis.label}
          label={{ value: yAxis.label, angle: -90, position: 'insideLeft' }}
        />
        {showTooltip && <Tooltip cursor={{ strokeDasharray: '3 3' }} />}
        {showLegend && <Legend />}
        {series.map((s, index) => (
          <Scatter
            key={s.key}
            name={s.name}
            data={data}
            fill={s.color || colors?.[index] || getSeriesColor(index)}
          />
        ))}
      </RechartsScatterChart>
    </ResponsiveContainer>
  );
}
