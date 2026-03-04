2026-03-03 22:22:32.199 [info] [generate-slide] Generating slide 1 with 1 image(s)...
2026-03-03 22:22:32.199 [info] [generate-slide] Added image 1/1 (image/png, 757568 base64 chars)
2026-03-03 22:23:56.172 [info] [generate-slide] Code output (22793 chars, 46 chunks):
2026-03-03 22:23:56.172 [info] [chunk 1/46]
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell, LabelList } from 'recharts';

export default function Slide1({
  headingFont,
  bodyFont,
  accentColors,
  headingTextColor,
  bodyTextColor,
  headingFontSize,
  bodyFontSize
}) {
  const stockData = [
    { date: '05-2015', sharePrice: 155, evEbitda: 25, ltAvg: 30 },
    { date: '', sharePrice: 160, evEbitda: 24, ltAvg: 30
2026-03-03 22:23:56.172 [info] [chunk 2/46]
},
    { date: '', sharePrice: 148, evEbitda: 22, ltAvg: 30 },
    { date: '05-2016', sharePrice: 150, evEbitda: 20, ltAvg: 30 },
    { date: '', sharePrice: 180, evEbitda: 25, ltAvg: 30 },
    { date: '', sharePrice: 240, evEbitda: 30, ltAvg: 30 },
    { date: '', sharePrice: 280, evEbitda: 35, ltAvg: 30 },
    { date: '05-2017', sharePrice: 300, evEbitda: 40, ltAvg: 30 },
    { date: '', sharePrice: 370, evEbitda: 50, ltAvg: 30 },
    { date: '', sharePrice: 420, evEbitda: 55, ltAvg: 30 },
2026-03-03 22:23:56.172 [info] [chunk 3/46]
 { date: '', sharePrice: 450, evEbitda: 60, ltAvg: 30 },
    { date: '05-2018', sharePrice: 470, evEbitda: 65, ltAvg: 30 },
    { date: '', sharePrice: 380, evEbitda: 45, ltAvg: 30 },
    { date: '', sharePrice: 310, evEbitda: 35, ltAvg: 30 },
    { date: '', sharePrice: 290, evEbitda: 30, ltAvg: 30 },
    { date: '05-2019', sharePrice: 350, evEbitda: 38, ltAvg: 30 },
  ];

  const revenueData = [
    {
      year: '2015A',
      Americas: 1983.4,
      Japan: 1189.7,
      Other: 1257.3,
2026-03-03 22:23:56.172 [info] [chunk 4/46]
total: 4430.3
    },
    {
      year: '2016A',
      Americas: 1392.7,
      Japan: 887.8,
      Other: 1059.3,
      total: 3339.8
    },
    {
      year: '2017A',
      Americas: 3840.4,
      Japan: 3075.0,
      Other: 2273.4,
      total: 9188.8
    },
    {
      year: '2018A',
      Americas: 2412.7,
      Japan: 3685.8,
      Other: 4802.2,
      total: 10900.7
    },
    {
      year: 'LTM',
      Americas: 3697.6,
      Japan: 3705.6,
      Other: 3772.0,
      total: 11175.2
    },
2026-03-03 22:23:56.172 [info] [chunk 5/46]
  ];

  const financialData = [
    {
      metric: 'Revenue',
      sub: 'YoY Growth',
      y2015: '$4,430.3',
      y2016: '$3,339.8',
      y2017: '$9,188.8',
      y2018: '$10,900.7',
      ltm: '$11,175.2',
      cagr: '26.0%',
      y2016sub: '(24.6%)',
      y2017sub: '175.1%',
      y2018sub: '18.6%',
      ltmsub: '2.5%',
    },
    {
      metric: 'Gross Profit',
      sub: 'Margin',
      y2015: '$1,871.4',
      y2016: '$1,522.3',
      y2017: '$3,419.3',
      y2018: '$4,432.5',
2026-03-03 22:23:56.173 [info] [chunk 6/46]
    ltm: '$4,654.6',
      cagr: '25.6%',
      y2016sub: '45.6%',
      y2017sub: '37.2%',
      y2018sub: '40.7%',
      ltmsub: '41.7%',
    },
    {
      metric: 'EBITDA',
      sub: 'YoY Growth',
      sub2: 'Margin',
      y2015: '$365.9',
      y2016: '$222.2',
      y2017: '$1,485.3',
      y2018: '$2,285.1',
      ltm: '$2,377.7',
      cagr: '59.7%',
      y2016sub: '(39.3%)',
      y2017sub: '568.3%',
      y2018sub: '53.8%',
      ltmsub: '4.1%',
      y2015sub2: '',
      y2016sub2
2026-03-03 22:23:56.173 [info] [chunk 7/46]
: '6.7%',
      y2017sub2: '16.2%',
      y2018sub2: '21.0%',
      ltmsub2: '21.3%',
    },
  ];

  const navyBlue = '#1B2A4A';
  const darkGray = '#333333';
  const medGray = '#666666';
  const lightGray = '#E5E7EB';
  const tableHeaderBg = '#F3F4F6';

  const cellStyle = {
    fontFamily: bodyFont,
    fontSize: `${Number(bodyFontSize) * 0.65}px`,
    color: darkGray,
    padding: '2px 6px',
    textAlign: 'right' as const,
    verticalAlign: 'top' as const,
    lineHeight: 1.3,
  };

  const
2026-03-03 22:23:56.173 [info] [chunk 8/46]
 metricCellStyle = {
    ...cellStyle,
    textAlign: 'left' as const,
    fontWeight: 700,
  };

  const subCellStyle = {
    ...cellStyle,
    fontStyle: 'italic' as const,
    color: medGray,
    fontSize: `${Number(bodyFontSize) * 0.6}px`,
  };

  const headerCellStyle = {
    ...cellStyle,
    fontWeight: 700,
    textDecoration: 'underline' as const,
    borderBottom: 'none',
    paddingBottom: '4px',
  };

  const sectionHeaderStyle = {
    fontFamily: headingFont,
    fontSize: `${Number
2026-03-03 22:23:56.173 [info] [chunk 9/46]
(headingFontSize) * 0.45}px`,
    fontWeight: 700,
    color: '#FFFFFF',
    backgroundColor: navyBlue,
    padding: '6px 14px',
    textAlign: 'center' as const,
    borderRadius: '2px',
    marginBottom: '8px',
  };

  const CustomBarLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    const labels = [
      ['$1,983.4', '$1,189.7', '$1,257.3'],
      ['$1,392.7', '$887.8', '$1,059.3'],
      ['$3,840.4', '$3,075.0', '$2,273.4'],
      ['$2,412.7', '$3,685.8', '$4,802
2026-03-03 22:23:56.173 [info] [chunk 10/46]
.2'],
      ['$3,697.6', '$3,705.6', '$3,772.0'],
    ];
    return null;
  };

  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (height < 15) return null;
    return (
      <text
        x={x + width / 2}
        y={y + height / 2 + 4}
        fill="#FFFFFF"
        textAnchor="middle"
        fontSize={9}
        fontFamily={bodyFont}
        fontWeight={600}
      >
        ${(value / 1000).toFixed(1) === '0.0' ? value.toLocaleString()
2026-03-03 22:23:56.173 [info] [chunk 11/46]
 : value < 1000 ? value.toFixed(1) : value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
      </text>
    );
  };

  const formatBarValue = (val: number) => {
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      fontFamily: bodyFont,
      padding: '28px 36px 20px 36px',
      backgroundColor: '#FFFFFF',
      display: 'flex'
2026-03-03 22:23:56.173 [info] [chunk 12/46]
,
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Title */}
      <h1 style={{
        fontFamily: headingFont,
        fontSize: `${Number(headingFontSize) * 0.85}px`,
        color: headingTextColor,
        fontWeight: 800,
        marginBottom: '4px',
        borderBottom: `2px solid ${headingTextColor}`,
        paddingBottom: '6px',
        lineHeight: 1.1,
      }}>
        Executive Summary
      </h1>

      {/* Top Row */}
      <d
2026-03-03 22:23:56.173 [info] [chunk 13/46]
iv style={{
        display: 'flex',
        gap: '16px',
        flex: '0 0 auto',
        marginTop: '10px',
      }}>
        {/* Business Overview */}
        <div style={{ flex: '1', minWidth: 0 }}>
          <div style={sectionHeaderStyle}>Business Overview</div>
          <div style={{
            backgroundColor: '#F9FAFB',
            padding: '10px 14px',
            borderRadius: '2px',
            border: `1px solid ${lightGray}`,
            height: 'calc(100% - 36px)',
          }}
2026-03-03 22:23:56.173 [info] [chunk 14/46]
>
            <ul style={{
              fontFamily: bodyFont,
              fontSize: `${Number(bodyFontSize) * 0.68}px`,
              color: bodyTextColor,
              lineHeight: 1.55,
              margin: 0,
              paddingLeft: '16px',
            }}>
              <li style={{ marginBottom: '6px' }}>
                Nintendo (TYO:7974) is a best-in-class international video game developer and video game console manufacturer, headquartered in Kyoto, Japan
              </li>
2026-03-03 22:23:56.173 [info] [chunk 15/46]
         <li style={{ marginBottom: '6px' }}>
                The company is a global market leader, having contributed heavily to the industry's inception in the 1980s and experiencing multi-decade success ever since
              </li>
              <li style={{ marginBottom: '6px' }}>
                Nintendo's stock is currently trading at a discount to its intrinsic value as well as relative to peers, making now an opportune time to invest in the company
              </li>
              <l
2026-03-03 22:23:56.173 [info] [chunk 16/46]
i>
                High grow rates since 2016 are driven largely by the company's release of the Nintendo Switch in 2017
              </li>
            </ul>
          </div>
        </div>

        {/* Historical Financials */}
        <div style={{ flex: '1.15', minWidth: 0 }}>
          <div style={sectionHeaderStyle}>Historical Financials</div>
          <div style={{
            backgroundColor: '#FFFFFF',
            border: `1px solid ${lightGray}`,
            borderRadius: '2px',
2026-03-03 22:23:56.173 [info] [chunk 17/46]
       padding: '6px 8px',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
            }}>
              <thead>
                <tr>
                  <th style={{ ...headerCellStyle, textAlign: 'left', textDecoration: 'none', width: '18%' }}></th>
                  <th style={{ ...headerCellStyle, width: '14%' }}>2015A</th>
                  <th style={{ ...headerCellStyle, width: '14%' }}>2016
2026-03-03 22:23:56.173 [info] [chunk 18/46]
A</th>
                  <th style={{ ...headerCellStyle, width: '14%' }}>2017A</th>
                  <th style={{ ...headerCellStyle, width: '14%' }}>2018A</th>
                  <th style={{ ...headerCellStyle, width: '14%' }}>LTM</th>
                  <th style={{ ...headerCellStyle, width: '12%' }}>CAGR</th>
                </tr>
              </thead>
              <tbody>
                {/* Revenue */}
                <tr>
                  <td style={metricCellStyle}>Revenue</td>
2026-03-03 22:23:56.173 [info] [chunk 19/46]
             <td style={cellStyle}>$4,430.3</td>
                  <td style={cellStyle}>$3,339.8</td>
                  <td style={cellStyle}>$9,188.8</td>
                  <td style={cellStyle}>$10,900.7</td>
                  <td style={cellStyle}>$11,175.2</td>
                  <td style={{ ...cellStyle, fontWeight: 700 }}>26.0%</td>
                </tr>
                <tr>
                  <td style={{ ...subCellStyle, textAlign: 'left' }}>YoY Growth</td>
                  <td style={s
2026-03-03 22:23:56.173 [info] [chunk 20/46]
ubCellStyle}></td>
                  <td style={subCellStyle}>(24.6%)</td>
                  <td style={subCellStyle}>175.1%</td>
                  <td style={subCellStyle}>18.6%</td>
                  <td style={subCellStyle}>2.5%</td>
                  <td style={subCellStyle}></td>
                </tr>
                {/* Gross Profit */}
                <tr style={{ borderTop: `1px solid ${lightGray}` }}>
                  <td style={metricCellStyle}>Gross Profit</td>
                  <td
2026-03-03 22:23:56.173 [info] [chunk 21/46]
style={cellStyle}>$1,871.4</td>
                  <td style={cellStyle}>$1,522.3</td>
                  <td style={cellStyle}>$3,419.3</td>
                  <td style={cellStyle}>$4,432.5</td>
                  <td style={cellStyle}>$4,654.6</td>
                  <td style={{ ...cellStyle, fontWeight: 700 }}>25.6%</td>
                </tr>
                <tr>
                  <td style={{ ...subCellStyle, textAlign: 'left' }}>Margin</td>
                  <td style={subCellStyle}></td>
2026-03-03 22:23:56.173 [info] [chunk 22/46]
              <td style={subCellStyle}>45.6%</td>
                  <td style={subCellStyle}>37.2%</td>
                  <td style={subCellStyle}>40.7%</td>
                  <td style={subCellStyle}>41.7%</td>
                  <td style={subCellStyle}></td>
                </tr>
                {/* EBITDA */}
                <tr style={{ borderTop: `1px solid ${lightGray}` }}>
                  <td style={metricCellStyle}>EBITDA</td>
                  <td style={cellStyle}>$365.9</td>
2026-03-03 22:23:56.173 [info] [chunk 23/46]
           <td style={cellStyle}>$222.2</td>
                  <td style={cellStyle}>$1,485.3</td>
                  <td style={cellStyle}>$2,285.1</td>
                  <td style={cellStyle}>$2,377.7</td>
                  <td style={{ ...cellStyle, fontWeight: 700 }}>59.7%</td>
                </tr>
                <tr>
                  <td style={{ ...subCellStyle, textAlign: 'left' }}>YoY Growth</td>
                  <td style={subCellStyle}></td>
                  <td style={subCellStyle
2026-03-03 22:23:56.173 [info] [chunk 24/46]
}>(39.3%)</td>
                  <td style={subCellStyle}>568.3%</td>
                  <td style={subCellStyle}>53.8%</td>
                  <td style={subCellStyle}>4.1%</td>
                  <td style={subCellStyle}></td>
                </tr>
                <tr>
                  <td style={{ ...subCellStyle, textAlign: 'left' }}>Margin</td>
                  <td style={subCellStyle}></td>
                  <td style={subCellStyle}>6.7%</td>
                  <td style={subCellStyle}>16.2%
2026-03-03 22:23:56.173 [info] [chunk 25/46]
</td>
                  <td style={subCellStyle}>21.0%</td>
                  <td style={subCellStyle}>21.3%</td>
                  <td style={subCellStyle}></td>
                </tr>
                {/* Note R&D */}
                <tr style={{ borderTop: `1px solid ${darkGray}` }}>
                  <td style={{ ...cellStyle, textAlign: 'left', fontSize: `${Number(bodyFontSize) * 0.58}px` }}>Note: R&D</td>
                  <td style={{ ...cellStyle, fontSize: `${Number(bodyFontSize) * 0.58}p
2026-03-03 22:23:56.173 [info] [chunk 26/46]
x` }}>$526.9</td>
                  <td style={{ ...cellStyle, fontSize: `${Number(bodyFontSize) * 0.58}px` }}>$591.6</td>
                  <td style={{ ...cellStyle, fontSize: `${Number(bodyFontSize) * 0.58}px` }}>$525.6</td>
                  <td style={{ ...cellStyle, fontSize: `${Number(bodyFontSize) * 0.58}px` }}>$583.6</td>
                  <td style={{ ...cellStyle, fontSize: `${Number(bodyFontSize) * 0.58}px` }}>$583.6</td>
                  <td style={{ ...cellStyle, fontSize: `${Numb
2026-03-03 22:23:56.173 [info] [chunk 27/46]
er(bodyFontSize) * 0.58}px` }}></td>
                </tr>
                <tr>
                  <td style={{ ...metricCellStyle, fontSize: `${Number(bodyFontSize) * 0.6}px` }}>EBITDA Excl. R&D</td>
                  <td style={{ ...cellStyle, fontWeight: 700, fontSize: `${Number(bodyFontSize) * 0.6}px` }}>$892.8</td>
                  <td style={{ ...cellStyle, fontWeight: 700, fontSize: `${Number(bodyFontSize) * 0.6}px` }}>$813.8</td>
                  <td style={{ ...cellStyle, fontWeight: 7
2026-03-03 22:23:56.173 [info] [chunk 28/46]
00, fontSize: `${Number(bodyFontSize) * 0.6}px` }}>$2,010.9</td>
                  <td style={{ ...cellStyle, fontWeight: 700, fontSize: `${Number(bodyFontSize) * 0.6}px` }}>$2,868.7</td>
                  <td style={{ ...cellStyle, fontWeight: 700, fontSize: `${Number(bodyFontSize) * 0.6}px` }}>$2,961.4</td>
                  <td style={{ ...cellStyle, fontWeight: 700, fontSize: `${Number(bodyFontSize) * 0.6}px` }}>35.0%</td>
                </tr>
                <tr>
                  <td styl
2026-03-03 22:23:56.174 [info] [chunk 29/46]
e={{ ...subCellStyle, textAlign: 'left' }}>Margin</td>
                  <td style={subCellStyle}></td>
                  <td style={subCellStyle}>24.4%</td>
                  <td style={subCellStyle}>21.9%</td>
                  <td style={subCellStyle}>26.3%</td>
                  <td style={subCellStyle}>26.5%</td>
                  <td style={subCellStyle}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Ro
2026-03-03 22:23:56.174 [info] [chunk 30/46]
w */}
      <div style={{
        display: 'flex',
        gap: '16px',
        flex: 1,
        marginTop: '10px',
        minHeight: 0,
      }}>
        {/* Stock Performance */}
        <div style={{ flex: '1', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={sectionHeaderStyle}>Stock Performance</div>
          <div style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            border: `1px solid ${lightGray}`,
            borderRadius: '2px
2026-03-03 22:23:56.174 [info] [chunk 31/46]
',
            padding: '8px 4px 4px 4px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stockData} margin={{ top: 5, right: 35, left: 5, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fontFamily: bodyFont, fill: medGray }}
2026-03-03 22:23:56.174 [info] [chunk 32/46]
    tickLine={false}
                  axisLine={{ stroke: '#D1D5DB' }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 9, fontFamily: bodyFont, fill: medGray }}
                  tickFormatter={(v) => `$${v}`}
                  domain={[0, 500]}
                  ticks={[0, 100, 200, 300, 400, 500]}
                  axisLine={{ stroke: '#D1D5DB' }}
                  tickLine={false}
                />
                <YAxis
2026-03-03 22:23:56.174 [info] [chunk 33/46]
           yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 9, fontFamily: bodyFont, fill: medGray }}
                  tickFormatter={(v) => `${v}x`}
                  domain={[0, 70]}
                  ticks={[0, 10, 20, 30, 40, 50, 60, 70]}
                  axisLine={{ stroke: '#D1D5DB' }}
                  tickLine={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dat
2026-03-03 22:23:56.185 [info] [chunk 34/46]
aKey="sharePrice"
                  stroke={navyBlue}
                  strokeWidth={2}
                  dot={false}
                  name="Share Price"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="evEbitda"
                  stroke={navyBlue}
                  strokeWidth={1.5}
                  dot={false}
                  name="EV / EBITDA"
                  opacity={0.6}
                />
2026-03-03 22:23:56.185 [info] [chunk 35/46]
       <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ltAvg"
                  stroke="#9CA3AF"
                  strokeWidth={2}
                  strokeDasharray="8 6"
                  dot={false}
                  name="LT Avg EV / EBITDA"
                />
                <Legend
                  verticalAlign="bottom"
                  height={20}
                  iconSize={12}
                  wrapperStyle={{ fontSize: 9, fontFamil
2026-03-03 22:23:56.185 [info] [chunk 36/46]
y: bodyFont }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Growth */}
        <div style={{ flex: '1.15', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={sectionHeaderStyle}>Robust Top-Line Growth Profile</div>
          <div style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            border: `1px solid ${lightGray}`,
            borderRadius: '2px',
2026-03-03 22:23:56.185 [info] [chunk 37/46]
         padding: '8px 4px 4px 4px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}>
            {/* CAGR annotation */}
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%) rotate(-8deg)',
              fontFamily: bodyFont,
              fontSize: `${Number(bodyFontSize) * 0.75}px`,
              fontWeight: 800,
2026-03-03 22:23:56.185 [info] [chunk 38/46]
   color: darkGray,
              zIndex: 10,
            }}>
              2015-19 CAGR: 26.0%
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 30, right: 10, left: 10, bottom: 20 }}>
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 10, fontFamily: bodyFont, fill: darkGray, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke:
2026-03-03 22:23:56.185 [info] [chunk 39/46]
'#D1D5DB' }}
                />
                <YAxis hide />
                <Bar dataKey="Americas" stackId="a" fill={navyBlue}>
                  <LabelList
                    dataKey="Americas"
                    position="center"
                    formatter={(v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 1 })}`}
                    style={{ fontSize: 8, fill: '#FFFFFF', fontFamily: bodyFont, fontWeight: 600 }}
                  />
                </Bar>
2026-03-03 22:23:56.185 [info] [chunk 40/46]
         <Bar dataKey="Japan" stackId="a" fill="#6B7280">
                  <LabelList
                    dataKey="Japan"
                    position="center"
                    formatter={(v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 1 })}`}
                    style={{ fontSize: 8, fill: '#FFFFFF', fontFamily: bodyFont, fontWeight: 600 }}
                  />
                </Bar>
                <Bar dataKey="Other" stackId="a" fill="#D1D5DB" radius={[2, 2, 0, 0]
2026-03-03 22:23:56.185 [info] [chunk 41/46]
}>
                  <LabelList
                    dataKey="Other"
                    position="center"
                    formatter={(v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 1 })}`}
                    style={{ fontSize: 8, fill: darkGray, fontFamily: bodyFont, fontWeight: 600 }}
                  />
                  <LabelList
                    dataKey="total"
                    position="top"
                    formatter={(v: number) => `$${v.toLocaleStr
2026-03-03 22:23:56.185 [info] [chunk 42/46]
ing(undefined, { minimumFractionDigits: 1 })}`}
                    style={{ fontSize: 9, fill: darkGray, fontFamily: bodyFont, fontWeight: 800 }}
                    offset={6}
                  />
                </Bar>
                <Legend
                  verticalAlign="bottom"
                  height={20}
                  iconSize={10}
                  wrapperStyle={{ fontSize: 9, fontFamily: bodyFont }}
                  formatter={(value: string) => (
                    <span styl
2026-03-03 22:23:56.185 [info] [chunk 43/46]
e={{ color: darkGray, fontWeight: 500 }}>■ {value}</span>
                  )}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '8px',
        paddingTop: '6px',
        borderTop: `1px solid ${navyBlue}`,
      }}>
        <div style={{ display: 'flex', alignItems:
2026-03-03 22:23:56.185 [info] [chunk 44/46]
'center', gap: '2px' }}>
          <div style={{
            backgroundColor: navyBlue,
            color: '#FFFFFF',
            fontFamily: headingFont,
            fontSize: `${Number(headingFontSize) * 0.5}px`,
            fontWeight: 900,
            padding: '4px 8px',
            lineHeight: 1,
          }}>D</div>
          <div style={{
            backgroundColor: navyBlue,
            color: '#FFFFFF',
            fontFamily: headingFont,
            fontSize: `${Number(headingFontSiz
2026-03-03 22:23:56.185 [info] [chunk 45/46]
e) * 0.5}px`,
            fontWeight: 900,
            padding: '4px 8px',
            lineHeight: 1,
          }}>W</div>
        </div>
        <span style={{
          fontFamily: bodyFont,
          fontSize: `${Number(bodyFontSize) * 0.75}px`,
          color: medGray,
        }}>4</span>
      </div>

      {/* Bottom Banner */}
      <div style={{
        backgroundColor: navyBlue,
        margin: '8px -36px -20px -36px',
        padding: '16px 36px',
      }}>
        <h2 style={{
2026-03-03 22:23:56.185 [info] [chunk 46/46]
    fontFamily: headingFont,
          fontSize: `${Number(headingFontSize) * 0.8}px`,
          fontWeight: 900,
          color: '#FFFFFF',
          margin: 0,
          lineHeight: 1.1,
        }}>
          Investment Presentation / Pitch Deck
        </h2>
      </div>
    </div>
  );
}
2026-03-03 22:23:56.185 [info] [generate-slide] Successfully generated slide 1 (22793 chars)