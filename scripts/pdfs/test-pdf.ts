import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';

// ---------------------------------------------------------------------------
// Full slide code from logs
// ---------------------------------------------------------------------------
const slideCode = `import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

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
  const darkNavy = '#1a2744';
  const mediumBlue = '#4a6fa5';
  const lightBlue = '#8bb0d6';
  const paleBlue = '#c5d8ea';
  const olive = '#8a9a5b';
  const mauve = '#9c8aa5';
  const tan = '#c4b9a0';

  const newInvestmentData = [
    { quarter: "Q4 '17", date: '12/31/2017', total: 142, firstLien: 43, firstLienLOU: 5, secondLien: 51, unsecured: 0, preferred: 0, common: 0, invFunds: 1 },
    { quarter: "Q1 '18", date: '3/31/2018', total: 67, firstLien: 26, firstLienLOU: 19, secondLien: 51, unsecured: 2, preferred: 0, common: 0, invFunds: 2 },
    { quarter: "Q2 '18", date: '6/30/2018', total: 93, firstLien: 78, firstLienLOU: 7, secondLien: 9, unsecured: 2, preferred: 3, common: 0, invFunds: 1 },
    { quarter: "Q3 '18", date: '9/30/2018', total: 206, firstLien: 89, firstLienLOU: 0, secondLien: 11, unsecured: 0, preferred: 0, common: 0, invFunds: 0 },
    { quarter: "Q4 '18", date: '12/31/2018', total: 154, firstLien: 79, firstLienLOU: 4, secondLien: 11, unsecured: 4, preferred: 1, common: 1, invFunds: 0 },
  ];

  const endPeriodData = [
    { quarter: "Q4'17", date: '12/31/2017', total: 1179, firstLien: 32, firstLienLOU: 22, secondLien: 35, unsecured: 7, preferred: 2, common: 1, invFunds: 1 },
    { quarter: "Q1 '18", date: '3/31/2018', total: 1257, firstLien: 33, firstLienLOU: 19, secondLien: 37, unsecured: 7, preferred: 2, common: 1, invFunds: 1 },
    { quarter: "Q2 '18", date: '6/30/2018', total: 1237, firstLien: 36, firstLienLOU: 17, secondLien: 36, unsecured: 8, preferred: 2, common: 1, invFunds: 0 },
    { quarter: "Q3 '18", date: '9/30/2018', total: 1318, firstLien: 46, firstLienLOU: 10, secondLien: 33, unsecured: 7, preferred: 2, common: 1, invFunds: 1 },
    { quarter: "Q4 '18", date: '12/31/2018', total: 1375, firstLien: 53, firstLienLOU: 8, secondLien: 28, unsecured: 7, preferred: 2, common: 2, invFunds: 0 },
  ];

  const legendItems = [
    { label: '1st Lien', color: darkNavy },
    { label: '1st Lien, Last-Out Unitranche', color: mediumBlue },
    { label: '2nd Lien', color: lightBlue },
    { label: 'Unsecured Debt', color: paleBlue },
    { label: 'Preferred Stock', color: tan },
    { label: 'Common Stock', color: mauve },
    { label: 'Investment Funds & Vehicles', color: olive },
  ];

  const labelFontSize = bodyFontSize * 0.6;
  const tinyFont = bodyFontSize * 0.55;

  const renderStackedBarChart = (
    data: typeof newInvestmentData,
    chartLeft: number,
    chartTop: number,
    chartWidth: number,
    chartHeight: number,
    maxVal: number,
    isLargeValues: boolean
  ) => {
    const barCount = data.length;
    const barAreaWidth = chartWidth - 20;
    const barSpacing = barAreaWidth / barCount;
    const barWidth = barSpacing * 0.55;
    const xStart = 10;
    const yBottom = chartHeight - 35;
    const yTop = 25;
    const barMaxHeight = yBottom - yTop;

    const segments = [
      { key: 'firstLien', color: darkNavy },
      { key: 'firstLienLOU', color: mediumBlue },
      { key: 'secondLien', color: lightBlue },
      { key: 'unsecured', color: paleBlue },
      { key: 'preferred', color: tan },
      { key: 'common', color: mauve },
      { key: 'invFunds', color: olive },
    ];

    return (
      <svg
        style={{ position: 'absolute', top: \`\${chartTop}px\`, left: \`\${chartLeft}px\` }}
        width={chartWidth}
        height={chartHeight}
        viewBox={\`0 0 \${chartWidth} \${chartHeight}\`}
      >
        {data.map((d, i) => {
          const cx = xStart + barSpacing * i + barSpacing / 2;
          const bx = cx - barWidth / 2;
          let cumPercent = 0;
          const rects: React.ReactNode[] = [];
          const labels: React.ReactNode[] = [];

          segments.forEach((seg, si) => {
            const pct = (d as any)[seg.key] as number;
            if (pct <= 0) return;
            const segHeight = (pct / 100) * barMaxHeight;
            const segY = yBottom - ((cumPercent + pct) / 100) * barMaxHeight;
            rects.push(
              <rect
                key={\`\${i}-\${si}\`}
                x={bx}
                y={segY}
                width={barWidth}
                height={segHeight}
                fill={seg.color}
                stroke="#fff"
                strokeWidth={0.5}
              />
            );
            if (pct >= 3) {
              labels.push(
                <text
                  key={\`lbl-\${i}-\${si}\`}
                  x={cx}
                  y={segY + segHeight / 2 + 3}
                  textAnchor="middle"
                  fontSize={tinyFont}
                  fill="#fff"
                  fontFamily={bodyFont}
                  fontWeight="bold"
                >
                  {pct}%
                </text>
              );
            } else if (pct > 0) {
              labels.push(
                <text
                  key={\`lbl-\${i}-\${si}\`}
                  x={bx + barWidth + 2}
                  y={segY + segHeight / 2 + 3}
                  textAnchor="start"
                  fontSize={tinyFont * 0.9}
                  fill={bodyTextColor}
                  fontFamily={bodyFont}
                >
                  {pct < 1 ? '<1%' : \`\${pct}%\`}
                </text>
              );
            }
            cumPercent += pct;
          });

          const totalBarHeight = (cumPercent / 100) * barMaxHeight;
          const totalY = yBottom - totalBarHeight;

          return (
            <g key={i}>
              {rects}
              {labels}
              <text
                x={cx}
                y={totalY - 6}
                textAnchor="middle"
                fontSize={labelFontSize * 1.3}
                fill={headingTextColor}
                fontFamily={headingFont}
                fontWeight="bold"
              >
                {isLargeValues ? \`$\${d.total.toLocaleString()}\` : \`$\${d.total}\`}
              </text>
              <text
                x={cx}
                y={yBottom + 12}
                textAnchor="middle"
                fontSize={tinyFont * 1.1}
                fill={headingTextColor}
                fontFamily={headingFont}
                fontWeight="bold"
              >
                {d.quarter}
              </text>
              <text
                x={cx}
                y={yBottom + 22}
                textAnchor="middle"
                fontSize={tinyFont * 0.9}
                fill={bodyTextColor}
                fontFamily={bodyFont}
              >
                {d.date}
              </text>
            </g>
          );
        })}
        <line x1={xStart} y1={yBottom} x2={xStart + barAreaWidth} y2={yBottom} stroke="#999" strokeWidth={1} />
      </svg>
    );
  };

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
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '30px',
          width: '900px',
          height: '32px',
          fontFamily: headingFont,
          fontSize: \`\${headingFontSize * 0.85}px\`,
          fontWeight: '400',
          color: headingTextColor,
        }}
      >
        Portfolio Asset Composition
      </div>

      <div
        style={{
          position: 'absolute',
          top: '48px',
          left: '30px',
          width: '900px',
          height: '20px',
          fontFamily: bodyFont,
          fontSize: \`\${bodyFontSize * 0.9}px\`,
          color: '#6b7280',
        }}
      >
        Quarter Ended December 31, 2018
      </div>

      <div
        style={{
          position: 'absolute',
          top: '72px',
          left: '30px',
          width: '900px',
          height: '2px',
          backgroundColor: '#2563EB',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '84px',
          left: '30px',
          width: '435px',
          height: '340px',
          border: '1px solid #d1d5db',
          backgroundColor: '#fff',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '84px',
          left: '30px',
          width: '435px',
          height: '28px',
          backgroundColor: '#6b88b0',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '5px',
            left: '0px',
            width: '435px',
            height: '20px',
            textAlign: 'center',
            fontFamily: headingFont,
            fontSize: \`\${bodyFontSize * 0.78}px\`,
            fontWeight: 'bold',
            color: '#ffffff',
          }}
        >
          New Investment Commitments (at cost, $mm)
        </span>
      </div>

      {renderStackedBarChart(newInvestmentData, 30, 115, 435, 305, 206, false)}

      <div
        style={{
          position: 'absolute',
          top: '84px',
          left: '495px',
          width: '435px',
          height: '340px',
          border: '1px solid #d1d5db',
          backgroundColor: '#fff',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '84px',
          left: '495px',
          width: '435px',
          height: '28px',
          backgroundColor: '#6b88b0',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '5px',
            left: '0px',
            width: '435px',
            height: '20px',
            textAlign: 'center',
            fontFamily: headingFont,
            fontSize: \`\${bodyFontSize * 0.78}px\`,
            fontWeight: 'bold',
            color: '#ffffff',
          }}
        >
          End of Period Investments (at fair value, $mm)
        </span>
      </div>

      {renderStackedBarChart(endPeriodData, 495, 115, 435, 305, 1375, true)}

      <div
        style={{
          position: 'absolute',
          top: '430px',
          left: '30px',
          width: '435px',
          height: '70px',
        }}
      >
        {legendItems.map((item, idx) => {
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                top: \`\${row * 16}px\`,
                left: \`\${col * 148}px\`,
                width: '145px',
                height: '14px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: '0px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: item.color,
                  borderRadius: '1px',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: '0px',
                  left: '12px',
                  width: '130px',
                  height: '14px',
                  fontFamily: bodyFont,
                  fontSize: \`\${tinyFont * 1.05}px\`,
                  color: bodyTextColor,
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          top: '430px',
          left: '495px',
          width: '435px',
          height: '70px',
        }}
      >
        {legendItems.map((item, idx) => {
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                top: \`\${row * 16}px\`,
                left: \`\${col * 148}px\`,
                width: '145px',
                height: '14px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: '0px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: item.color,
                  borderRadius: '1px',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: '0px',
                  left: '12px',
                  width: '130px',
                  height: '14px',
                  fontFamily: bodyFont,
                  fontSize: \`\${tinyFont * 1.05}px\`,
                  color: bodyTextColor,
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          top: '500px',
          left: '30px',
          width: '860px',
          height: '14px',
          fontFamily: bodyFont,
          fontSize: \`\${tinyFont * 0.85}px\`,
          color: '#9ca3af',
          lineHeight: '1.4',
        }}
      >
        Investment Funds & Vehicles represents the investment in the SCF. Figures may not sum due to rounding.
      </div>

      <div
        style={{
          position: 'absolute',
          top: '512px',
          left: '30px',
          width: '860px',
          height: '14px',
          fontFamily: bodyFont,
          fontSize: \`\${tinyFont * 0.85}px\`,
          color: '#9ca3af',
          lineHeight: '1.4',
        }}
      >
        The discussion of the investment portfolio excludes the investment in a money market fund managed by an affiliate of Group, Inc.
      </div>

      <div
        style={{
          position: 'absolute',
          top: '520px',
          left: '910px',
          width: '30px',
          height: '16px',
          fontFamily: bodyFont,
          fontSize: \`\${tinyFont}px\`,
          color: '#9ca3af',
          textAlign: 'right',
        }}
      >
        6
      </div>
    </div>
  );
}`;

// ---------------------------------------------------------------------------
// Send to endpoint and save PDF
// ---------------------------------------------------------------------------

const payload = JSON.stringify({
  slides: [{ code: slideCode, slideNumber: 1 }],
  theme: {
    headingFont: 'Inter, sans-serif',
    bodyFont: 'Inter, sans-serif',
    accentColors: ['#1a2744', '#4a6fa5', '#8bb0d6'],
    headingTextColor: '#1a2744',
    bodyTextColor: '#333333',
    headingFontSize: 36,
    bodyFontSize: 14,
  },
  format: 'pdf',
});

const options: https.RequestOptions = {
  hostname: 'www.getvolute.com',
  port: 443,
  path: '/api/pdf',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
};

console.log('[test] Sending slide to https://www.getvolute.com/api/pdf ...');
console.log('[test] Payload size:', (Buffer.byteLength(payload) / 1024).toFixed(1), 'KB');

const req = https.request(options, (res) => {
  console.log('[test] HTTP status:', res.statusCode);
  console.log('[test] Content-Type:', res.headers['content-type']);

  const chunks: Buffer[] = [];

  res.on('data', (chunk: Buffer) => chunks.push(chunk));

  res.on('end', () => {
    const body = Buffer.concat(chunks);
    const contentType = res.headers['content-type'] || '';

    if (res.statusCode === 200 && contentType.includes('application/pdf')) {
      const outputPath = path.resolve('./slide-output2.pdf');
      fs.writeFileSync(outputPath, body);
      console.log(`[test] ✅ PDF saved to: ${outputPath}`);
      console.log(`[test] PDF size: ${(body.length / 1024).toFixed(1)} KB`);
    } else {
      // Error response — print as JSON
      try {
        const json = JSON.parse(body.toString());
        console.error('[test] ❌ Error response:', JSON.stringify(json, null, 2));
      } catch {
        console.error('[test] ❌ Raw response:', body.toString().slice(0, 500));
      }
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('[test] ❌ Request failed:', err.message);
  if ((err as any).code === 'ECONNREFUSED') {
    console.error('[test] Is your server running on getvolute.com?');
  }
  process.exit(1);
});

// Set a generous timeout — Playwright can take 20-30s locally
req.setTimeout(120_000, () => {
  console.error('[test] ❌ Request timed out after 120s');
  req.destroy();
  process.exit(1);
});

req.write(payload);
req.end();
