import { useState } from 'react';
import { ChartCanvas } from './charts';
import { ChartConfig } from '../types/charts';

/**
 * Example component demonstrating how to use the chart system
 *
 * This shows sample configurations for all 10 chart types using
 * real IPO data from your database.
 */

const EXAMPLE_CHARTS: Record<string, ChartConfig> = {
  'vertical-bar': {
    type: 'vertical-bar',
    title: 'IPO Opening Prices',
    description: 'First trade prices for recent tech IPOs',
    data: [
      { company: 'CoreWeave', openingPrice: 63.5 },
      { company: 'Rubrik', openingPrice: 38.5 },
      { company: 'Astera Labs', openingPrice: 52.56 },
    ],
    xAxis: { key: 'company', label: 'Company' },
    yAxis: { key: 'openingPrice', label: 'Opening Price ($)' },
    series: [{ key: 'openingPrice', name: 'Opening Price' }],
    height: 400,
  },

  'horizontal-bar': {
    type: 'horizontal-bar',
    title: 'Companies by First Day Return',
    description: 'Percentage gain from IPO price to first day close',
    data: [
      { company: 'CoreWeave', return: 110.16 },
      { company: 'Astera Labs', return: 91.0 },
      { company: 'Rubrik', return: 37.34 },
    ],
    xAxis: { key: 'return', label: 'First Day Return (%)' },
    yAxis: { key: 'company', label: 'Company' },
    series: [{ key: 'return', name: 'Return %' }],
    height: 300,
  },

  'line': {
    type: 'line',
    title: 'IPO Price Progression',
    description: 'From final IPO price to first day close',
    data: [
      { stage: 'Final IPO Price', coreweave: 32, rubrik: 32, astera: 36 },
      { stage: 'Opening Price', coreweave: 63.5, rubrik: 38.5, astera: 52.56 },
      { stage: 'First Day Close', coreweave: 67.25, rubrik: 38.35, astera: 68.75 },
    ],
    xAxis: { key: 'stage', label: 'Stage' },
    yAxis: { key: 'price', label: 'Price ($)' },
    series: [
      { key: 'coreweave', name: 'CoreWeave' },
      { key: 'rubrik', name: 'Rubrik' },
      { key: 'astera', name: 'Astera Labs' },
    ],
    height: 400,
  },

  'area': {
    type: 'area',
    title: 'Cumulative Shares Offered',
    description: 'Total shares including greenshoe options',
    data: [
      { company: 'CoreWeave', primary: 7142857, withGreenshoe: 8214285 },
      { company: 'Rubrik', primary: 23000000, withGreenshoe: 26450000 },
      { company: 'Astera Labs', primary: 19841270, withGreenshoe: 22817460 },
    ],
    xAxis: { key: 'company', label: 'Company' },
    yAxis: { key: 'shares', label: 'Shares Offered' },
    series: [
      { key: 'primary', name: 'Primary Offering' },
      { key: 'withGreenshoe', name: 'With Greenshoe' },
    ],
    height: 400,
  },

  'pie': {
    type: 'pie',
    title: 'Market Share by Valuation',
    description: 'IPO valuations as percentage of total',
    data: [
      { company: 'CoreWeave', valuation: 19100000000 },
      { company: 'Rubrik', valuation: 5650000000 },
      { company: 'Astera Labs', valuation: 5500000000 },
    ],
    xAxis: { key: 'company', label: 'Company' },
    yAxis: { key: 'valuation', label: 'Valuation' },
    series: [{ key: 'valuation', name: 'Valuation ($)' }],
    height: 400,
  },

  'donut': {
    type: 'donut',
    title: 'Gross Proceeds Distribution',
    description: 'Total capital raised in IPOs',
    data: [
      { company: 'CoreWeave', proceeds: 1100000000 },
      { company: 'Rubrik', proceeds: 752000000 },
      { company: 'Astera Labs', proceeds: 821000000 },
    ],
    xAxis: { key: 'company', label: 'Company' },
    yAxis: { key: 'proceeds', label: 'Gross Proceeds' },
    series: [{ key: 'proceeds', name: 'Gross Proceeds ($)' }],
    height: 400,
  },

  'stacked-bar': {
    type: 'stacked-bar',
    title: 'Share Distribution',
    description: 'Breakdown of shares by source',
    data: [
      {
        company: 'CoreWeave',
        companyShares: 7142857,
        sellingShares: 0,
        greenshoe: 1071428,
      },
      {
        company: 'Rubrik',
        companyShares: 23000000,
        sellingShares: 0,
        greenshoe: 3450000,
      },
      {
        company: 'Astera Labs',
        companyShares: 19841270,
        sellingShares: 0,
        greenshoe: 2976190,
      },
    ],
    xAxis: { key: 'company', label: 'Company' },
    yAxis: { key: 'shares', label: 'Total Shares' },
    series: [
      { key: 'companyShares', name: 'Company Shares' },
      { key: 'sellingShares', name: 'Selling Stockholders' },
      { key: 'greenshoe', name: 'Greenshoe Options' },
    ],
    height: 400,
  },

  'grouped-bar': {
    type: 'grouped-bar',
    title: 'Opening vs Closing Prices',
    description: 'First day price comparison',
    data: [
      { company: 'CoreWeave', opening: 63.5, closing: 67.25 },
      { company: 'Rubrik', opening: 38.5, closing: 38.35 },
      { company: 'Astera Labs', opening: 52.56, closing: 68.75 },
    ],
    xAxis: { key: 'company', label: 'Company' },
    yAxis: { key: 'price', label: 'Price ($)' },
    series: [
      { key: 'opening', name: 'Opening Price' },
      { key: 'closing', name: 'First Day Close' },
    ],
    height: 400,
  },

  'combo': {
    type: 'combo',
    title: 'Valuation vs First Day Return',
    description: 'IPO valuation (bars) and performance (line)',
    data: [
      { company: 'CoreWeave', valuation: 19.1, return: 110.16 },
      { company: 'Rubrik', valuation: 5.65, return: 37.34 },
      { company: 'Astera Labs', valuation: 5.5, return: 91.0 },
    ],
    xAxis: { key: 'company', label: 'Company' },
    yAxis: { key: 'value', label: 'Value' },
    series: [
      { key: 'valuation', name: 'Valuation ($B)', type: 'bar' },
      { key: 'return', name: 'First Day Return (%)', type: 'line' },
    ],
    height: 400,
  },

  'scatter': {
    type: 'scatter',
    title: 'IPO Price vs First Day Performance',
    description: 'Correlation between IPO price and first day return',
    data: [
      { ipoPrice: 32, return: 110.16, name: 'CoreWeave' },
      { ipoPrice: 32, return: 37.34, name: 'Rubrik' },
      { ipoPrice: 36, return: 91.0, name: 'Astera Labs' },
    ],
    xAxis: { key: 'ipoPrice', label: 'IPO Price ($)' },
    yAxis: { key: 'return', label: 'First Day Return (%)' },
    series: [{ key: 'data', name: 'Companies' }],
    height: 400,
  },
};

export function ChartExample() {
  const [selectedChart, setSelectedChart] = useState<string>('vertical-bar');

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Chart System Examples</h1>
        <p className="text-gray-600">
          Select a chart type to see it rendered with IPO data
        </p>
      </div>

      {/* Chart Type Selector */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(EXAMPLE_CHARTS).map((chartType) => (
          <button
            key={chartType}
            onClick={() => setSelectedChart(chartType)}
            className={`px-4 py-2 rounded-lg transition-all ${
              selectedChart === chartType
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {chartType.split('-').map(word =>
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')}
          </button>
        ))}
      </div>

      {/* Chart Display */}
      <ChartCanvas config={EXAMPLE_CHARTS[selectedChart]} />

      {/* Configuration Display */}
      <details className="bg-gray-50 rounded-lg p-4">
        <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
          View Configuration JSON
        </summary>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
          {JSON.stringify(EXAMPLE_CHARTS[selectedChart], null, 2)}
        </pre>
      </details>

      {/* Usage Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          How to Use in Your LLM Integration
        </h3>
        <ol className="space-y-2 text-blue-800 list-decimal list-inside">
          <li>User enters a natural language query (e.g., "show opening prices")</li>
          <li>Send query + your data to LLM API</li>
          <li>LLM returns a ChartConfig JSON object like the ones shown above</li>
          <li>Pass the config to: <code className="bg-blue-100 px-2 py-1 rounded">&lt;ChartCanvas config=&#123;config&#125; /&gt;</code></li>
          <li>Chart renders automatically!</li>
        </ol>
      </div>
    </div>
  );
}
