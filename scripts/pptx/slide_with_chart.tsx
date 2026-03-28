import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

interface SlideProps {
  headingFont: string;
  bodyFont: string;
  accentColors: string[];
  headingTextColor: string;
  bodyTextColor: string;
  headingFontSize: number;
  bodyFontSize: number;
  backgroundColor: string;
}

export default function Slide1({
  headingFont,
  bodyFont,
  accentColors,
  headingTextColor,
  bodyTextColor,
  headingFontSize,
  bodyFontSize,
  backgroundColor,
}: SlideProps) {
  const h1Size = headingFontSize;
  const h2Size = headingFontSize * 0.65;
  const h3Size = headingFontSize * 0.52;
  const bodySize = bodyFontSize;
  const smallSize = bodyFontSize * 0.85;
  const tinySize = bodyFontSize * 0.75;

  const revenueData = [
    { year: 'FY2022', value: 7200 },
    { year: 'FY2023', value: 8900 },
    { year: 'FY2024', value: 10072 },
    { year: 'FY2025E', value: 13200 },
  ];

  const chartJson = JSON.stringify({
    chartType: 'barChart',
    barDir: 'col',
    series: [
      {
        name: 'Net Revenue ($M)',
        color: accentColors[0],
        points: revenueData.map(d => ({ label: d.year, value: d.value })),
      },
    ],
    axes: {
      catAx: { labelFontSize: 800 },
      valAx: { labelFontSize: 800 },
    },
    legend: { visible: false },
    dataLabels: { visible: true },
  });

  const financials = [
    { label: 'Net Revenue', fy2024: '$10,072M', q3_2025: '$3,330M' },
    { label: 'Gross Profit', fy2024: '$1,266M', q3_2025: '—' },
    { label: 'Adj. EBITDA', fy2024: '$460M', q3_2025: '—' },
    { label: 'Net Income (Loss)', fy2024: '($68.9M)', q3_2025: '$55.8M' },
  ];

  return (
    <div
      style={{
        width: '960px',
        height: '540px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: bodyFont,
        backgroundColor: backgroundColor,
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
          height: '52px',
          backgroundColor: accentColors[0],
        }}
      />

      {/* Title */}
      <div
        data-pptx-type="heading"
        data-pptx-id="2"
        style={{
          position: 'absolute',
          top: '10px',
          left: '24px',
          width: '600px',
          height: '34px',
          fontFamily: headingFont,
          fontSize: `${h1Size}px`,
          fontWeight: 700,
          color: '#ffffff',
          lineHeight: '34px',
        }}
      >
        BrightSpring Health Services — Company Overview
      </div>

      {/* Logo */}
      <img
        src="https://img.logo.dev/ticker/BTSG?token=pk_FWXQQBIjTXq43nROeVQcWA"
        alt="BTSG Logo"
        style={{
          position: 'absolute',
          top: '8px',
          left: '860px',
          width: '80px',
          height: '36px',
          objectFit: 'contain',
          filter: 'brightness(0) invert(1)',
        }}
      />

      {/* Ticker / HQ bar */}
      <div
        data-pptx-type="shape"
        data-pptx-id="3"
        style={{
          position: 'absolute',
          top: '52px',
          left: '0px',
          width: '960px',
          height: '22px',
          backgroundColor: accentColors[3],
        }}
      />
      <div
        data-pptx-type="text"
        data-pptx-id="4"
        style={{
          position: 'absolute',
          top: '55px',
          left: '24px',
          width: '500px',
          height: '16px',
          fontFamily: bodyFont,
          fontSize: `${tinySize}px`,
          color: '#ffffff',
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}
      >
        NASDAQ: BTSG &nbsp;|&nbsp; Louisville, Kentucky &nbsp;|&nbsp; CEO: Jon Rousseau &nbsp;|&nbsp; Founded: ~1974
      </div>

      {/* ─── LEFT COLUMN ─── */}

      {/* Business Overview section label */}
      <div
        data-pptx-type="subheading"
        data-pptx-id="5"
        style={{
          position: 'absolute',
          top: '83px',
          left: '24px',
          width: '340px',
          height: '16px',
          fontFamily: headingFont,
          fontSize: `${h3Size}px`,
          fontWeight: 700,
          color: accentColors[0],
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          borderBottom: `2px solid ${accentColors[0]}`,
          paddingBottom: '2px',
        }}
      >
        Business Overview
      </div>

      {/* Business bullets */}
      <div
        data-pptx-type="text"
        data-pptx-id="6"
        style={{
          position: 'absolute',
          top: '105px',
          left: '24px',
          width: '340px',
          height: '200px',
          fontFamily: bodyFont,
          fontSize: `${smallSize}px`,
          color: bodyTextColor,
          lineHeight: '1.55',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
          <span style={{ color: accentColors[0], fontWeight: 700, flexShrink: 0 }}>■</span>
          <span>Leading provider of home- and community-based healthcare and pharmacy services for complex, high-need populations across all 50 U.S. states</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
          <span style={{ color: accentColors[0], fontWeight: 700, flexShrink: 0 }}>■</span>
          <span>Operates through two segments: <strong>Pharmacy Solutions</strong> and <strong>Provider Services</strong></span>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
          <span style={{ color: accentColors[0], fontWeight: 700, flexShrink: 0 }}>■</span>
          <span>Serves individuals with disabilities, seniors, and patients with complex medical needs in lower-cost, preferred care settings</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
          <span style={{ color: accentColors[0], fontWeight: 700, flexShrink: 0 }}>■</span>
          <span>IPO raised <strong>$880M</strong> in January 2024; YTD stock return ~111% at time of coverage</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ color: accentColors[0], fontWeight: 700, flexShrink: 0 }}>■</span>
          <span>Analyst consensus price target ~$41.93/share; Q3 2025 profitability turnaround with net income of $55.8M</span>
        </div>
      </div>

      {/* Segments section label */}
      <div
        data-pptx-type="subheading"
        data-pptx-id="7"
        style={{
          position: 'absolute',
          top: '318px',
          left: '24px',
          width: '340px',
          height: '16px',
          fontFamily: headingFont,
          fontSize: `${h3Size}px`,
          fontWeight: 700,
          color: accentColors[0],
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          borderBottom: `2px solid ${accentColors[0]}`,
          paddingBottom: '2px',
        }}
      >
        Business Segments
      </div>

      {/* Segment 1 box */}
      <div
        data-pptx-type="shape"
        data-pptx-id="8"
        style={{
          position: 'absolute',
          top: '340px',
          left: '24px',
          width: '164px',
          height: '80px',
          backgroundColor: accentColors[0],
          borderRadius: '3px',
        }}
      />
      <div
        data-pptx-type="text"
        data-pptx-id="9"
        style={{
          position: 'absolute',
          top: '348px',
          left: '30px',
          width: '152px',
          height: '64px',
          fontFamily: bodyFont,
          fontSize: `${tinySize}px`,
          color: '#ffffff',
          lineHeight: '1.4',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: `${smallSize}px`, marginBottom: '4px' }}>Pharmacy Solutions</div>
        <div>Specialty &amp; institutional pharmacy; includes PharMerica and Onco360 (oncology); national pharmacy partner for cancer/rare disease drugs</div>
      </div>

      {/* Segment 2 box */}
      <div
        data-pptx-type="shape"
        data-pptx-id="10"
        style={{
          position: 'absolute',
          top: '340px',
          left: '198px',
          width: '164px',
          height: '80px',
          backgroundColor: accentColors[3],
          borderRadius: '3px',
        }}
      />
      <div
        data-pptx-type="text"
        data-pptx-id="11"
        style={{
          position: 'absolute',
          top: '348px',
          left: '204px',
          width: '152px',
          height: '64px',
          fontFamily: bodyFont,
          fontSize: `${tinySize}px`,
          color: '#ffffff',
          lineHeight: '1.4',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: `${smallSize}px`, marginBottom: '4px' }}>Provider Services</div>
        <div>Home health, hospice, and community-based behavioral &amp; personal care across all 50 states</div>
      </div>

      {/* Recent Highlights */}
      <div
        data-pptx-type="subheading"
        data-pptx-id="12"
        style={{
          position: 'absolute',
          top: '432px',
          left: '24px',
          width: '340px',
          height: '16px',
          fontFamily: headingFont,
          fontSize: `${h3Size}px`,
          fontWeight: 700,
          color: accentColors[0],
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          borderBottom: `2px solid ${accentColors[0]}`,
          paddingBottom: '2px',
        }}
      >
        Recent Highlights
      </div>
      <div
        data-pptx-type="text"
        data-pptx-id="13"
        style={{
          position: 'absolute',
          top: '452px',
          left: '24px',
          width: '340px',
          height: '68px',
          fontFamily: bodyFont,
          fontSize: `${tinySize}px`,
          color: bodyTextColor,
          lineHeight: '1.5',
        }}
      >
        <div style={{ display: 'flex', gap: '5px', marginBottom: '4px' }}>
          <span style={{ color: accentColors[0], fontWeight: 700, flexShrink: 0 }}>■</span>
          <span>Raised full-year 2025 revenue and Adj. EBITDA guidance; Acquired Advanced Home Care (2020) and Haven Hospice (2024)</span>
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <span style={{ color: accentColors[0], fontWeight: 700, flexShrink: 0 }}>■</span>
          <span>Ownership: ~48% private equity; ~20% public companies</span>
        </div>
      </div>

      {/* Vertical divider */}
      <div
        data-pptx-type="divider"
        data-pptx-id="14"
        style={{
          position: 'absolute',
          top: '74px',
          left: '376px',
          width: '1px',
          height: '454px',
          backgroundColor: accentColors[4],
        }}
      />

      {/* ─── RIGHT COLUMN ─── */}

      {/* Summary Financials label */}
      <div
        data-pptx-type="subheading"
        data-pptx-id="15"
        style={{
          position: 'absolute',
          top: '83px',
          left: '390px',
          width: '560px',
          height: '16px',
          fontFamily: headingFont,
          fontSize: `${h3Size}px`,
          fontWeight: 700,
          color: accentColors[0],
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          borderBottom: `2px solid ${accentColors[0]}`,
          paddingBottom: '2px',
        }}
      >
        Summary Financials
      </div>

      {/* Financial table header */}
      <div
        data-pptx-type="shape"
        data-pptx-id="16"
        style={{
          position: 'absolute',
          top: '105px',
          left: '390px',
          width: '560px',
          height: '22px',
          backgroundColor: accentColors[0],
        }}
      />
      <div
        data-pptx-type="text"
        data-pptx-id="17"
        style={{
          position: 'absolute',
          top: '108px',
          left: '396px',
          width: '200px',
          height: '16px',
          fontFamily: bodyFont,
          fontSize: `${tinySize}px`,
          color: '#ffffff',
          fontWeight: 600,
        }}
      >
        ($ in millions)
      </div>
      <div
        data-pptx-type="text"
        data-pptx-id="18"
        style={{
          position: 'absolute',
          top: '108px',
          left: '650px',
          width: '130px',
          height: '16px',
          fontFamily: bodyFont,
          fontSize: `${tinySize}px`,
          color: '#ffffff',
          fontWeight: 700,
          textAlign: 'right',
        }}
      >
        FY2024A
      </div>
      <div
        data-pptx-type="text"
        data-pptx-id="19"
        style={{
          position: 'absolute',
          top: '108px',
          left: '800px',
          width: '140px',
          height: '16px',
          fontFamily: bodyFont,
          fontSize: `${tinySize}px`,
          color: '#ffffff',
          fontWeight: 700,
          textAlign: 'right',
        }}
      >
        Q3 2025
      </div>

      {/* Financial table rows */}
      {financials.map((row, i) => {
        const isEven = i % 2 === 0;
        const topPos = 127 + i * 24;
        return (
          <React.Fragment key={i}>
            <div
              data-pptx-type="shape"
              data-pptx-id={`${20 + i * 3}`}
              style={{
                position: 'absolute',
                top: `${topPos}px`,
                left: '390px',
                width: '560px',
                height: '22px',
                backgroundColor: isEven ? `${accentColors[4]}60` : '#ffffff',
              }}
            />
            <div
              data-pptx-type="text"
              data-pptx-id={`${21 + i * 3}`}
              style={{
                position: 'absolute',
                top: `${topPos + 4}px`,
                left: '396px',
                width: '250px',
                height: '16px',
                fontFamily: bodyFont,
                fontSize: `${tinySize}px`,
                color: headingTextColor,
                fontWeight: row.label === 'Net Revenue' || row.label === 'Adj. EBITDA' ? 700 : 400,
              }}
            >
              {row.label}
            </div>
            <div
              data-pptx-type="text"
              data-pptx-id={`${22 + i * 3}`}
              style={{
                position: 'absolute',
                top: `${topPos + 4}px`,
                left: '650px',
                width: '130px',
                height: '16px',
                fontFamily: bodyFont,
                fontSize: `${tinySize}px`,
                color: row.fy2024.startsWith('(') ? '#b91c1c' : headingTextColor,
                fontWeight: row.label === 'Net Revenue' || row.label === 'Adj. EBITDA' ? 700 : 400,
                textAlign: 'right',
              }}
            >
              {row.fy2024}
            </div>
            <div
              data-pptx-type="text"
              data-pptx-id={`${23 + i * 3}`}
              style={{
                position: 'absolute',
                top: `${topPos + 4}px`,
                left: '800px',
                width: '140px',
                height: '16px',
                fontFamily: bodyFont,
                fontSize: `${tinySize}px`,
                color: headingTextColor,
                fontWeight: row.label === 'Net Revenue' ? 700 : 400,
                textAlign: 'right',
              }}
            >
              {row.q3_2025}
            </div>
          </React.Fragment>
        );
      })}

      {/* Revenue Chart label */}
      <div
        data-pptx-type="subheading"
        data-pptx-id="36"
        style={{
          position: 'absolute',
          top: '228px',
          left: '390px',
          width: '270px',
          height: '16px',
          fontFamily: headingFont,
          fontSize: `${h3Size}px`,
          fontWeight: 700,
          color: accentColors[0],
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          borderBottom: `2px solid ${accentColors[0]}`,
          paddingBottom: '2px',
        }}
      >
        Net Revenue Growth ($M)
      </div>

      {/* Bar Chart */}
      {(() => {
        const color0 = accentColors[0];
        const color3 = accentColors[3];
        return (
          <div
            data-pptx-type="chart"
            data-pptx-id="37"
            data-chart-json={chartJson}
            style={{
              position: 'absolute',
              top: '248px',
              left: '384px',
              width: '278px',
              height: '220px',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 18, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${accentColors[4]}`} vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fontFamily: bodyFont, fontSize: tinySize, fill: bodyTextColor }}
                  axisLine={{ stroke: accentColors[4] }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontFamily: bodyFont, fontSize: tinySize, fill: bodyTextColor }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}B`}
                  domain={[0, 15000]}
                  width={36}
                />
                <Bar dataKey="value" radius={[2, 2, 0, 0]} label={{ position: 'top', fontSize: tinySize, fontFamily: bodyFont, fill: headingTextColor, formatter: (v: number) => `$${v.toLocaleString()}` }}>
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 3 ? color3 : color0} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* Valuation Summary label */}
      <div
        data-pptx-type="subheading"
        data-pptx-id="38"
        style={{
          position: 'absolute',
          top: '228px',
          left: '674px',
          width: '276px',
          height: '16px',
          fontFamily: headingFont,
          fontSize: `${h3Size}px`,
          fontWeight: 700,
          color: accentColors[0],
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          borderBottom: `2px solid ${accentColors[0]}`,
          paddingBottom: '2px',
        }}
      >
        Valuation Summary
      </div>

      {/* Valuation metrics */}
      {[
        { label: 'Current Share Price', value: '~$19.50', bold: false },
        { label: 'Consensus Price Target', value: '~$41.93', bold: false },
        { label: 'Market Capitalization', value: '~$3.2B', bold: true },
        { label: 'IPO Price (Jan 2024)', value: '$15–$18', bold: false },
        { label: 'IPO Proceeds', value: '$880M', bold: false },
        { label: 'YTD Stock Return', value: '~+111%', bold: true },
        { label: 'Ownership: PE Firms', value: '~48%', bold: false },
        { label: 'Ownership: Public Cos.', value: '~20%', bold: false },
      ].map((row, i) => {
        const topPos = 250 + i * 26;
        const isEven = i % 2 === 0;
        return (
          <React.Fragment key={i}>
            <div
              data-pptx-type="shape"
              data-pptx-id={`${50 + i * 3}`}
              style={{
                position: 'absolute',
                top: `${topPos}px`,
                left: '674px',
                width: '276px',
                height: '24px',
                backgroundColor: isEven ? `${accentColors[4]}60` : '#ffffff',
              }}
            />
            <div
              data-pptx-type="text"
              data-pptx-id={`${51 + i * 3}`}
              style={{
                position: 'absolute',
                top: `${topPos + 5}px`,
                left: '678px',
                width: '180px',
                height: '16px',
                fontFamily: bodyFont,
                fontSize: `${tinySize}px`,
                color: bodyTextColor,
                fontWeight: row.bold ? 700 : 400,
              }}
            >
              {row.label}
            </div>
            <div
              data-pptx-type="text"
              data-pptx-id={`${52 + i * 3}`}
              style={{
                position: 'absolute',
                top: `${topPos + 5}px`,
                left: '858px',
                width: '88px',
                height: '16px',
                fontFamily: bodyFont,
                fontSize: `${tinySize}px`,
                color: row.bold ? accentColors[0] : headingTextColor,
                fontWeight: row.bold ? 700 : 400,
                textAlign: 'right',
              }}
            >
              {row.value}
            </div>
          </React.Fragment>
        );
      })}

      {/* Footer */}
      <div
        data-pptx-type="shape"
        data-pptx-id="80"
        style={{
          position: 'absolute',
          top: '520px',
          left: '0px',
          width: '960px',
          height: '20px',
          backgroundColor: `${accentColors[0]}15`,
          borderTop: `1px solid ${accentColors[4]}`,
        }}
      />
      <div
        data-pptx-type="text"
        data-pptx-id="81"
        style={{
          position: 'absolute',
          top: '524px',
          left: '24px',
          width: '700px',
          height: '14px',
          fontFamily: bodyFont,
          fontSize: `${tinySize * 0.85}px`,
          color: bodyTextColor,
          opacity: 0.7,
        }}
      >
        Sources: stocktitan.net, renaissancecapital.com, finance.yahoo.com &nbsp;|&nbsp; Note: FY2025E revenue estimate is analyst consensus projection. All figures approximate.
      </div>
      <div
        data-pptx-type="text"
        data-pptx-id="82"
        style={{
          position: 'absolute',
          top: '524px',
          left: '900px',
          width: '50px',
          height: '14px',
          fontFamily: bodyFont,
          fontSize: `${tinySize}px`,
          color: bodyTextColor,
          fontWeight: 700,
          textAlign: 'right',
        }}
      >
        1
      </div>
    </div>
  );
}