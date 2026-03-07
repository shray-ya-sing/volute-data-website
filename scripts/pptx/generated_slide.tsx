import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function Slide1({
  headingFont,
  bodyFont,
  accentColors,
  headingTextColor,
  bodyTextColor,
  headingFontSize,
  bodyFontSize,
}: {
  headingFont: string;
  bodyFont: string;
  accentColors: string[];
  headingTextColor: string;
  bodyTextColor: string;
  headingFontSize: number;
  bodyFontSize: number;
}) {
  const h1Size = headingFontSize;
  const h2Size = headingFontSize * 0.55;
  const h3Size = headingFontSize * 0.45;
  const bodySize = bodyFontSize;
  const smallSize = bodyFontSize * 0.8;
  const tinySize = bodyFontSize * 0.7;

  const darkBlue = accentColors[0];
  const green = accentColors[1];
  const amber = accentColors[2];
  const navyBg = '#1e3a5f';

  const revenueData = [
    { year: 'FY23A', mgmt: 1192, street: 1192 },
    { year: 'FY24A', mgmt: 1217, street: 1217 },
    { year: 'FY25E', mgmt: 1127, street: 1044 },
    { year: 'FY26E', mgmt: 1236, street: 1127 },
    { year: 'FY27E', mgmt: 1283, street: 1236 },
    { year: 'FY28E', mgmt: 1472, street: 1394 },
    { year: 'FY29E', mgmt: 1713, street: 1472 },
    { year: 'FY30E', mgmt: 1974, street: 1713 },
  ];

  const acvData = [
    { year: 'FY23A', mgmt: 885, street: 885 },
    { year: 'FY24A', mgmt: 1035, street: 1019 },
    { year: 'FY25E', mgmt: 1156, street: 1109 },
    { year: 'FY26E', mgmt: 1299, street: 1212 },
    { year: 'FY27E', mgmt: 1469, street: 1299 },
    { year: 'FY28E', mgmt: 1669, street: null },
    { year: 'FY29E', mgmt: 1898, street: null },
    { year: 'FY30E', mgmt: null, street: null },
  ];

  const opIncomeData = [
    { year: 'FY23A', mgmt: 395, street: 395 },
    { year: 'FY24A', mgmt: 456, street: 456 },
    { year: 'FY25E', mgmt: 562, street: 521 },
    { year: 'FY26E', mgmt: 576, street: 510 },
    { year: 'FY27E', mgmt: 726, street: 650 },
    { year: 'FY28E', mgmt: 926, street: null },
    { year: 'FY29E', mgmt: 1147, street: null },
    { year: 'FY30E', mgmt: 1301, street: null },
  ];

  const lfcfData = [
    { year: 'FY23A', mgmt: 306, street: 306 },
    { year: 'FY24A', mgmt: 336, street: 336 },
    { year: 'FY25E', mgmt: 360, street: 342 },
    { year: 'FY26E', mgmt: 480, street: 411 },
    { year: 'FY27E', mgmt: 501, street: 477 },
    { year: 'FY28E', mgmt: 638, street: null },
    { year: 'FY29E', mgmt: 735, street: null },
    { year: 'FY30E', mgmt: 834, street: null },
  ];

  const chartJson1 = JSON.stringify({
    chartType: 'lineChart',
    series: [
      {
        name: 'Mgmt Plan',
        color: darkBlue,
        smooth: false,
        markerSize: 4,
        points: revenueData.map(d => ({ label: d.year, value: d.mgmt })),
      },
      {
        name: 'Street Case',
        color: green,
        smooth: false,
        markerSize: 4,
        points: revenueData.map(d => ({ label: d.year, value: d.street })),
      },
    ],
    axes: {
      catAx: { labelColor: bodyTextColor, labelFontSize: 700 },
      valAx: { labelColor: bodyTextColor, labelFontSize: 700 },
    },
    legend: { visible: true, position: 'b' },
    dataLabels: { visible: false },
  });

  const chartJson2 = JSON.stringify({
    chartType: 'lineChart',
    series: [
      {
        name: 'Mgmt Plan',
        color: darkBlue,
        smooth: false,
        markerSize: 4,
        points: opIncomeData.map(d => ({ label: d.year, value: d.mgmt || 0 })),
      },
      {
        name: 'Street Case',
        color: green,
        smooth: false,
        markerSize: 4,
        points: opIncomeData.filter(d => d.street !== null).map(d => ({ label: d.year, value: d.street || 0 })),
      },
    ],
    axes: {
      catAx: { labelColor: bodyTextColor, labelFontSize: 700 },
      valAx: { labelColor: bodyTextColor, labelFontSize: 700 },
    },
    legend: { visible: false },
    dataLabels: { visible: false },
  });

  const tableData = [
    { metric: 'ACV ($MM)', fy23: '$885', fy24: '$1,035', fy25m: '$1,156', fy25s: '$1,109', fy27m: '$1,469', fy27s: '$1,299', fy30m: '$1,898', cagr: '13%' },
    { metric: 'Revenue ($MM)', fy23: '$1,192', fy24: '$1,217', fy25m: '$1,127', fy25s: '$1,044', fy27m: '$1,283', fy27s: '$1,236', fy30m: '$1,974', cagr: '12%' },
    { metric: 'Non-GAAP Op. Inc.', fy23: '$395', fy24: '$456', fy25m: '$562', fy25s: '$521', fy27m: '$726', fy27s: '$650', fy30m: '$1,301', cagr: '19%' },
    { metric: 'Levered FCF ($MM)', fy23: '$306', fy24: '$336', fy25m: '$360', fy25s: '$342', fy27m: '$501', fy27s: '$477', fy30m: '$834', cagr: '16%' },
  ];

  const tableHeaders = ['Metric', 'FY23A', 'FY24A', 'FY25E (M)', 'FY25E (S)', 'FY27E (M)', 'FY27E (S)', 'FY30E (M)', 'CAGR'];
  const colWidths = ['140px', '70px', '70px', '80px', '80px', '80px', '80px', '80px', '60px'];

  return (
    <div
      style={{
        width: '960px',
        height: '540px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: bodyFont,
        backgroundColor: '#ffffff',
      }}
    >
      {/* Header bar */}
      <div
        data-pptx-type="shape"
        data-pptx-id="1"
        style={{
          position: 'absolute',
          top: '0px',
          left: '0px',
          width: '960px',
          height: '50px',
          backgroundColor: navyBg,
        }}
      />
      <span
        data-pptx-type="heading"
        data-pptx-id="2"
        style={{
          position: 'absolute',
          top: '10px',
          left: '30px',
          width: '600px',
          height: '32px',
          fontFamily: headingFont,
          fontSize: `${h1Size * 0.75}px`,
          fontWeight: 700,
          color: '#ffffff',
          lineHeight: '32px',
        }}
      >
        Alpha Management Plan vs. Street
      </span>

      {/* Legend */}
      <div
        data-pptx-type="shape"
        data-pptx-id="3"
        style={{
          position: 'absolute',
          top: '8px',
          left: '720px',
          width: '220px',
          height: '34px',
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: '4px',
          border: '1px solid rgba(255,255,255,0.3)',
        }}
      />
      <span
        data-pptx-type="text"
        data-pptx-id="4"
        style={{
          position: 'absolute',
          top: '14px',
          left: '745px',
          width: '80px',
          height: '20px',
          fontFamily: bodyFont,
          fontSize: `${tinySize}px`,
          color: '#ffffff',
          fontWeight: 600,
        }}
      >
        ● Mgmt Plan
      </span>
      <span
        data-pptx-type="text"
        data-pptx-id="5"
        style={{
          position: 'absolute',
          top: '14px',
          left: '845px',
          width: '80px',
          height: '20px',
          fontFamily: bodyFont,
          fontSize: `${tinySize}px`,
          color: '#ffffff',
          fontWeight: 600,
        }}
      >
        <span style={{ color: green }}>●</span> Street Case
      </span>

      {/* Chart 1: Revenue ($MM) */}
      <div
        data-pptx-type="shape"
        data-pptx-id="6"
        style={{
          position: 'absolute',
          top: '58px',
          left: '20px',
          width: '450px',
          height: '22px',
          backgroundColor: navyBg,
          borderRadius: '3px 3px 0 0',
        }}
      />
      <span
        data-pptx-type="subheading"
        data-pptx-id="7"
        style={{
          position: 'absolute',
          top: '59px',
          left: '30px',
          width: '430px',
          height: '20px',
          fontFamily: headingFont,
          fontSize: `${h3Size}px`,
          fontWeight: 700,
          color: '#ffffff',
          lineHeight: '20px',
        }}
      >
        Revenue ($MM)
      </span>

      {/* CAGR info for Revenue */}
      <span
        data-pptx-type="text"
        data-pptx-id="8"
        style={{
          position: 'absolute',
          top: '84px',
          left: '30px',
          width: '200px',
          height: '32px',
          fontFamily: bodyFont,
          fontSize: `${tinySize}px`,
          color: bodyTextColor,
          lineHeight: '1.3',
        }}
      >
        <strong>FY24A–FY30E CAGR:</strong><br />
        Mgmt Plan: 12% &nbsp;|&nbsp; Street (FY27E): 7%
      </span>

      {(() => {
        return (
          <div
            data-pptx-type="chart"
            data-pptx-id="9"
            data-chart-json={chartJson1}
            style={{
              position: 'absolute',
              top: '115px',
              left: '20px',
              width: '450px',
              height: '170px',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 10, right: 15, bottom: 5, left: 5 }}>
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: tinySize, fill: bodyTextColor, fontFamily: bodyFont }}
                  axisLine={{ stroke: '#ccc' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: tinySize, fill: bodyTextColor, fontFamily: bodyFont }}
                  axisLine={false}
                  tickLine={false}
                  domain={[800, 2200]}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{ fontSize: `${tinySize}px`, fontFamily: bodyFont }}
                  formatter={(value: number) => [`$${value}M`]}
                />
                <Line type="monotone" dataKey="mgmt" stroke={darkBlue} strokeWidth={2.5} dot={{ r: 3, fill: darkBlue }} name="Mgmt Plan" />
                <Line type="monotone" dataKey="street" stroke={green} strokeWidth={2.5} dot={{ r: 3, fill: green }} name="Street Case" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* Chart 2: Non-GAAP Operating Income ($MM) */}
      <div
        data-pptx-type="shape"
        data-pptx-id="10"
        style={{
          position: 'absolute',
          top: '58px',
          left: '490px',
          width: '450px',
          height: '22px',
          backgroundColor: navyBg,
          borderRadius: '3px 3px 0 0',
        }}
      />
      <span
        data-pptx-type="subheading"
        data-pptx-id="11"
        style={{
          position: 'absolute',
          top: '59px',
          left: '500px',
          width: '430px',
          height: '20px',
          fontFamily: headingFont,
          fontSize: `${h3Size}px`,
          fontWeight: 700,
          color: '#ffffff',
          lineHeight: '20px',
        }}
      >
        Non-GAAP Operating Income ($MM)
      </span>

      <span
        data-pptx-type="text"
        data-pptx-id="12"
        style={{
          position: 'absolute',
          top: '84px',
          left: '500px',
          width: '220px',
          height: '32px',
          fontFamily: bodyFont,
          fontSize: `${tinySize}px`,
          color: bodyTextColor,
          lineHeight: '1.3',
        }}
      >
        <strong>FY24A–FY30E CAGR:</strong><br />
        Mgmt Plan: 19% &nbsp;|&nbsp; Street (FY27E): 13%
      </span>

      {(() => {
        return (
          <div
            data-pptx-type="chart"
            data-pptx-id="13"
            data-chart-json={chartJson2}
            style={{
              position: 'absolute',
              top: '115px',
              left: '490px',
              width: '450px',
              height: '170px',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={opIncomeData} margin={{ top: 10, right: 15, bottom: 5, left: 5 }}>
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: tinySize, fill: bodyTextColor, fontFamily: bodyFont }}
                  axisLine={{ stroke: '#ccc' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: tinySize, fill: bodyTextColor, fontFamily: bodyFont }}
                  axisLine={false}
                  tickLine={false}
                  domain={[200, 1400]}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{ fontSize: `${tinySize}px`, fontFamily: bodyFont }}
                  formatter={(value: number) => [`$${value}M`]}
                />
                <Line type="monotone" dataKey="mgmt" stroke={darkBlue} strokeWidth={2.5} dot={{ r: 3, fill: darkBlue }} name="Mgmt Plan" />
                <Line type="monotone" dataKey="street" stroke={green} strokeWidth={2.5} dot={{ r: 3, fill: green }} name="Street Case" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* Divider line */}
      <div
        data-pptx-type="divider"
        data-pptx-id="14"
        style={{
          position: 'absolute',
          top: '295px',
          left: '20px',
          width: '920px',
          height: '1px',
          backgroundColor: '#d1d5db',
        }}
      />

      {/* Summary section header */}
      <span
        data-pptx-type="subheading"
        data-pptx-id="15"
        style={{
          position: 'absolute',
          top: '302px',
          left: '30px',
          width: '400px',
          height: '20px',
          fontFamily: headingFont,
          fontSize: `${h2Size}px`,
          fontWeight: 700,
          color: headingTextColor,
        }}
      >
        Key Financial Summary — Mgmt Plan vs. Street
      </span>

      {/* Table */}
      <div
        data-pptx-type="table"
        data-pptx-id="16"
        style={{
          position: 'absolute',
          top: '328px',
          left: '20px',
          width: '920px',
          height: '180px',
          overflow: 'hidden',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr>
              {tableHeaders.map((h, i) => (
                <th
                  key={i}
                  style={{
                    width: colWidths[i],
                    fontFamily: headingFont,
                    fontSize: `${smallSize}px`,
                    fontWeight: 700,
                    color: '#ffffff',
                    backgroundColor: navyBg,
                    textAlign: i === 0 ? 'left' : 'right',
                    padding: '6px 8px',
                    borderBottom: `2px solid ${navyBg}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIdx) => {
              const values = [row.metric, row.fy23, row.fy24, row.fy25m, row.fy25s, row.fy27m, row.fy27s, row.fy30m, row.cagr];
              const bgColor = rowIdx % 2 === 0 ? '#f8fafc' : '#ffffff';
              return (
                <tr key={rowIdx}>
                  {values.map((val, colIdx) => (
                    <td
                      key={colIdx}
                      style={{
                        fontFamily: colIdx === 0 ? headingFont : bodyFont,
                        fontSize: `${smallSize}px`,
                        fontWeight: colIdx === 0 || colIdx === 8 ? 600 : 400,
                        color: colIdx === 8 ? darkBlue : bodyTextColor,
                        textAlign: colIdx === 0 ? 'left' : 'right',
                        padding: '5px 8px',
                        backgroundColor: bgColor,
                        borderBottom: '1px solid #e5e7eb',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {val}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Callout box */}
      <div
        data-pptx-type="shape"
        data-pptx-id="17"
        style={{
          position: 'absolute',
          top: '490px',
          left: '20px',
          width: '540px',
          height: '30px',
          backgroundColor: `${amber}18`,
          border: `1px solid ${amber}`,
          borderRadius: '4px',
        }}
      />
      <span
        data-pptx-type="text"
        data-pptx-id="18"
        style={{
          position: 'absolute',
          top: '496px',
          left: '32px',
          width: '520px',
          height: '20px',
          fontFamily: bodyFont,
          fontSize: `${tinySize}px`,
          color: bodyTextColor,
          fontWeight: 500,
        }}
      >
        ⚠ Revenue and profitability metrics are impacted by timing of bookings. (M) = Mgmt, (S) = Street.
      </span>

      {/* Footer labels */}
      <span
        data-pptx-type="text"
        data-pptx-id="19"
        style={{
          position: 'absolute',
          top: '524px',
          left: '30px',
          width: '300px',
          height: '14px',
          fontFamily: bodyFont,
          fontSize: `${tinySize * 0.85}px`,
          color: '#9ca3af',
        }}
      >
        Source: Alpha company filings, Management Plan, Wall Street estimates
      </span>

      <span
        data-pptx-type="text"
        data-pptx-id="20"
        style={{
          position: 'absolute',
          top: '524px',
          left: '780px',
          width: '160px',
          height: '14px',
          fontFamily: bodyFont,
          fontSize: `${tinySize * 0.85}px`,
          color: '#9ca3af',
          textAlign: 'right',
        }}
      >
        CONFIDENTIAL | DRAFT
      </span>

      {/* Accent stripe at bottom */}
      <div
        data-pptx-type="shape"
        data-pptx-id="21"
        style={{
          position: 'absolute',
          top: '537px',
          left: '0px',
          width: '960px',
          height: '3px',
          backgroundColor: darkBlue,
        }}
      />
    </div>
  );
}