import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface FinancialChart {
  title: string;
  data: any[];
  lines: { key: string; color: string; label: string; }[];
  yAxisLabel?: string;
  isPercentage?: boolean;
}

export function AlphaManagementPlanSlide() {
  const [acyData] = useState([
    { year: 'FY23A', mgmt: 1038, street: 988 },
    { year: 'FY24A', mgmt: 1149, street: 933 },
    { year: 'FY25E', mgmt: 1235, street: 1199 },
    { year: 'FY26E', mgmt: 1412, street: 1298 },
    { year: 'FY27E', mgmt: 1630, street: 1498 },
    { year: 'FY28E', mgmt: 1998, street: 1698 }
  ]);

  const [revenueData] = useState([
    { year: 'FY23A', mgmt: 1181, street: 1181 },
    { year: 'FY24A', mgmt: 1212, street: 1127 },
    { year: 'FY25E', mgmt: 1236, street: 1217 },
    { year: 'FY26E', mgmt: 1285, street: 1231 },
    { year: 'FY27E', mgmt: 1477, street: 1285 },
    { year: 'FY28E', mgmt: 1677, street: 1477 }
  ]);

  const [operatingIncomeData] = useState([
    { year: 'FY23A', mgmt: 370, street: 456 },
    { year: 'FY24A', mgmt: 462, street: 456 },
    { year: 'FY25E', mgmt: 650, street: 650 },
    { year: 'FY26E', mgmt: 726, street: 726 },
    { year: 'FY27E', mgmt: 1147, street: 618 },
    { year: 'FY28E', mgmt: 1361, street: 726 }
  ]);

  const [cashFlowData] = useState([
    { year: 'FY23A', mgmt: 336, street: 336 },
    { year: 'FY24A', mgmt: 350, street: 350 },
    { year: 'FY25E', mgmt: 373, street: 373 },
    { year: 'FY26E', mgmt: 411, street: 411 },
    { year: 'FY27E', mgmt: 638, street: 501 },
    { year: 'FY28E', mgmt: 834, street: 620 }
  ]);

  // Convert data to chart JSON format for parser
  const acyChartJson = JSON.stringify({
    chartType: 'lineChart',
    series: [
      {
        name: 'Management Plan',
        color: '4a5fa5',
        smooth: false,
        markerSize: 3,
        markerColor: '4a5fa5',
        points: acyData.map(d => ({ label: d.year, value: d.mgmt }))
      },
      {
        name: 'Street Case',
        color: '22c55e',
        smooth: false,
        markerSize: 3,
        markerColor: '22c55e',
        points: acyData.map(d => ({ label: d.year, value: d.street }))
      }
    ],
    axes: {
      catAx: { labelColor: 'ffffff', labelFontSize: 800 },
      valAx: { labelColor: 'ffffff', labelFontSize: 800 }
    },
    legend: { visible: false },
    dataLabels: { visible: false }
  });

  const revenueChartJson = JSON.stringify({
    chartType: 'lineChart',
    series: [
      {
        name: 'Management Plan',
        color: '4a5fa5',
        smooth: false,
        markerSize: 3,
        markerColor: '4a5fa5',
        points: revenueData.map(d => ({ label: d.year, value: d.mgmt }))
      },
      {
        name: 'Street Case',
        color: '22c55e',
        smooth: false,
        markerSize: 3,
        markerColor: '22c55e',
        points: revenueData.map(d => ({ label: d.year, value: d.street }))
      }
    ],
    axes: {
      catAx: { labelColor: 'ffffff', labelFontSize: 800 },
      valAx: { labelColor: 'ffffff', labelFontSize: 800 }
    },
    legend: { visible: false },
    dataLabels: { visible: false }
  });

  const operatingIncomeChartJson = JSON.stringify({
    chartType: 'lineChart',
    series: [
      {
        name: 'Management Plan',
        color: '4a5fa5',
        smooth: false,
        markerSize: 3,
        markerColor: '4a5fa5',
        points: operatingIncomeData.map(d => ({ label: d.year, value: d.mgmt }))
      },
      {
        name: 'Street Case',
        color: '22c55e',
        smooth: false,
        markerSize: 3,
        markerColor: '22c55e',
        points: operatingIncomeData.map(d => ({ label: d.year, value: d.street }))
      }
    ],
    axes: {
      catAx: { labelColor: 'ffffff', labelFontSize: 800 },
      valAx: { labelColor: 'ffffff', labelFontSize: 800 }
    },
    legend: { visible: false },
    dataLabels: { visible: false }
  });

  const cashFlowChartJson = JSON.stringify({
    chartType: 'lineChart',
    series: [
      {
        name: 'Management Plan',
        color: '4a5fa5',
        smooth: false,
        markerSize: 3,
        markerColor: '4a5fa5',
        points: cashFlowData.map(d => ({ label: d.year, value: d.mgmt }))
      },
      {
        name: 'Street Case',
        color: '22c55e',
        smooth: false,
        markerSize: 3,
        markerColor: '22c55e',
        points: cashFlowData.map(d => ({ label: d.year, value: d.street }))
      }
    ],
    axes: {
      catAx: { labelColor: 'ffffff', labelFontSize: 800 },
      valAx: { labelColor: 'ffffff', labelFontSize: 800 }
    },
    legend: { visible: false },
    dataLabels: { visible: false }
  });

  return (
    <div className="w-full min-h-screen bg-white p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-3xl" data-pptx-type="text" data-pptx-id="title">Alpha Management Plan vs. Street</h1>
        <div className="border-2 border-gray-400 p-3" data-pptx-type="shape" data-pptx-id="legend-box">
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-[#4a5fa5]"></div>
              <span className="italic" data-pptx-type="text" data-pptx-id="legend-mgmt">Management Plan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-green-600"></div>
              <span className="italic" data-pptx-type="text" data-pptx-id="legend-street">Street Case</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Row Charts */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* ACY Chart */}
        <div className="bg-[#4a5fa5] text-white p-3" data-pptx-type="chart" data-pptx-id="acy-chart" data-chart-json={acyChartJson}>
          <div className="text-sm font-semibold mb-2" data-pptx-type="text" data-pptx-id="acy-title">ACY ($MM)<sup>(1)</sup></div>
          <div className="text-xs text-green-400 italic" data-pptx-type="text" data-pptx-id="acy-cagr">FY24A-FY'28E CAGR:<br/>Mgmt. Plan 15%<br/>Street (FY'23-'28): 9%</div>
          <LineChart width={220} height={180} data={acyData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="year" tick={{ fontSize: 8, fill: '#fff' }} />
            <YAxis tick={{ fontSize: 8, fill: '#fff' }} />
            <Line type="monotone" dataKey="mgmt" stroke="#4a5fa5" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="street" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </div>

        {/* Revenue Chart */}
        <div className="bg-[#4a5fa5] text-white p-3" data-pptx-type="chart" data-pptx-id="revenue-chart" data-chart-json={revenueChartJson}>
          <div className="text-sm font-semibold mb-2" data-pptx-type="text" data-pptx-id="revenue-title">Revenue ($MM)</div>
          <div className="text-xs text-green-400 italic" data-pptx-type="text" data-pptx-id="revenue-cagr">FY24A-FY'28E CAGR:<br/>Mgmt. Plan 8%<br/>Street (FY'23-'28): 7%</div>
          <LineChart width={220} height={180} data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="year" tick={{ fontSize: 8, fill: '#fff' }} />
            <YAxis tick={{ fontSize: 8, fill: '#fff' }} />
            <Line type="monotone" dataKey="mgmt" stroke="#4a5fa5" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="street" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </div>

        {/* Operating Income Chart */}
        <div className="bg-[#4a5fa5] text-white p-3" data-pptx-type="chart" data-pptx-id="operating-income-chart" data-chart-json={operatingIncomeChartJson}>
          <div className="text-sm font-semibold mb-2" data-pptx-type="text" data-pptx-id="operating-income-title">Non-GAAP Operating Income ($MM)</div>
          <div className="text-xs text-green-400 italic" data-pptx-type="text" data-pptx-id="operating-income-cagr">FY24A-FY'28E CAGR:<br/>Mgmt. Plan 19%<br/>Street (FY'23-'28): 14%</div>
          <LineChart width={220} height={180} data={operatingIncomeData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="year" tick={{ fontSize: 8, fill: '#fff' }} />
            <YAxis tick={{ fontSize: 8, fill: '#fff' }} />
            <Line type="monotone" dataKey="mgmt" stroke="#4a5fa5" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="street" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </div>

        {/* Cash Flow Chart */}
        <div className="bg-[#4a5fa5] text-white p-3" data-pptx-type="chart" data-pptx-id="cash-flow-chart" data-chart-json={cashFlowChartJson}>
          <div className="text-sm font-semibold mb-2" data-pptx-type="text" data-pptx-id="cash-flow-title">Levered Free Cash Flow ($MM)</div>
          <div className="text-xs text-green-400 italic" data-pptx-type="text" data-pptx-id="cash-flow-cagr">FY24A-FY'28E CAGR:<br/>Mgmt. Plan 21%<br/>Street (FY'23-'28): 12%</div>
          <LineChart width={220} height={180} data={cashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="year" tick={{ fontSize: 8, fill: '#fff' }} />
            <YAxis tick={{ fontSize: 8, fill: '#fff' }} />
            <Line type="monotone" dataKey="mgmt" stroke="#4a5fa5" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="street" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </div>
      </div>

      {/* Bottom Row - Growth Charts */}
      <div className="grid grid-cols-4 gap-4">
        {/* ACY Growth */}
        <div className="bg-[#4a5fa5] text-white p-3" data-pptx-type="shape" data-pptx-id="acy-growth-container">
          <div className="text-sm font-semibold mb-2" data-pptx-type="text" data-pptx-id="acy-growth-title">ACY Growth (%)<sup>(1)</sup></div>
          <div className="h-48 flex items-end justify-around px-2">
            {[12, 7, 11, 12, 15, 13, 14].map((val, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="text-xs mb-1" data-pptx-type="text" data-pptx-id={`acy-growth-label-${idx}`}>{val}%</div>
                <div className="w-8 bg-green-500" style={{ height: `${val * 10}px` }}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Growth with annotation */}
        <div className="bg-[#4a5fa5] text-white p-3 relative" data-pptx-type="shape" data-pptx-id="revenue-growth-container">
          <div className="text-sm font-semibold mb-2" data-pptx-type="text" data-pptx-id="revenue-growth-title">Revenue Growth (%)</div>
          <div className="h-48 flex items-end justify-around px-2">
            {[3, -7, 2, 9, 15, 21, 10, 15, 13].map((val, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="text-xs mb-1" data-pptx-type="text" data-pptx-id={`revenue-growth-label-${idx}`}>{val}%</div>
                <div className={`w-6 ${val < 0 ? 'bg-red-500' : 'bg-green-500'}`} style={{ height: `${Math.abs(val) * 8}px` }}></div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-16 right-8 bg-white text-black text-xs p-2 border border-gray-400" data-pptx-type="text" data-pptx-id="revenue-annotation">
            Revenue and profitability<br/>metrics are impacted by<br/>timing of bookings
          </div>
        </div>

        {/* Operating Margin */}
        <div className="bg-[#4a5fa5] text-white p-3" data-pptx-type="shape" data-pptx-id="operating-margin-container">
          <div className="text-sm font-semibold mb-2" data-pptx-type="text" data-pptx-id="operating-margin-title">Non-GAAP Operating Margin (%)</div>
          <div className="h-48">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center" data-pptx-type="text" data-pptx-id="operating-margin-header-mgmt">Mgmt</div>
              <div className="text-center" data-pptx-type="text" data-pptx-id="operating-margin-header-street">Street</div>
              {['27%', '23%', '38%', '36%', '36%', '36%', '43%', '43%', '45%', '45%', '49%', '49%', '58%', '58%', '68%', '68%'].map((val, idx) => (
                <div key={idx} className="text-center py-1" data-pptx-type="text" data-pptx-id={`operating-margin-value-${idx}`}>{val}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Cash Flow Margin */}
        <div className="bg-[#4a5fa5] text-white p-3" data-pptx-type="shape" data-pptx-id="cash-flow-margin-container">
          <div className="text-sm font-semibold mb-2" data-pptx-type="text" data-pptx-id="cash-flow-margin-title">Levered Free Cash Flow Margin (%)</div>
          <div className="h-48">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center" data-pptx-type="text" data-pptx-id="cash-flow-margin-header-mgmt">Mgmt</div>
              <div className="text-center" data-pptx-type="text" data-pptx-id="cash-flow-margin-header-street">Street</div>
              {['33%', '33%', '33%', '33%', '29%', '32%', '34%', '37%', '37%', '37%', '37%', '37%'].map((val, idx) => (
                <div key={idx} className="text-center py-1" data-pptx-type="text" data-pptx-id={`cash-flow-margin-value-${idx}`}>{val}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-end mt-6">
        <div className="text-xs text-gray-600" data-pptx-type="text" data-pptx-id="source">
          <div>Source: Public Filings, Company Guidance</div>
        </div>
        <div className="text-2xl font-serif text-gray-700" data-pptx-type="text" data-pptx-id="catalyst-logo">Catalyst</div>
        <div className="text-sm text-gray-500" data-pptx-type="text" data-pptx-id="page-number">10</div>
      </div>
      
      <div className="text-center text-xs text-gray-500 mt-2" data-pptx-type="text" data-pptx-id="confidential">CONFIDENTIAL | DRAFT</div>
    </div>
  );
}