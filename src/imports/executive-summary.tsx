2026-03-03 21:59:29.442 [info] [chunk 1/24]
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    { date: '05-2015', price: 150, ev: 20 },
    { date: '11-2015', price: 180, ev: 22 },
    { date: '05-2016', price: 220, ev: 30 },
    { date: '11-
2026-03-03 21:59:29.442 [info] [chunk 2/24]
2016', price: 280, ev: 35 },
    { date: '05-2017', price: 320, ev: 40 },
    { date: '11-2017', price: 380, ev: 45 },
    { date: '05-2018', price: 420, ev: 50 },
    { date: '11-2018', price: 350, ev: 48 },
    { date: '05-2019', price: 380, ev: 52 }
  ];

  const revenueData = [
    { year: '2015A', americas: 1983.4, japan: 1189.7, other: 1257.3 },
    { year: '2016A', americas: 1382.7, japan: 887.6, other: 1069.3 },
    { year: '2017A', americas: 3840.4, japan: 2273.4, other: 3075.0 },
    {
2026-03-03 21:59:29.442 [info] [chunk 3/24]
 year: '2018A', americas: 2412.7, japan: 4802.2, other: 3685.8 },
    { year: 'LTM', americas: 3697.6, japan: 3772.0, other: 3705.6 }
  ];

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#ffffff',
      padding: '48px',
      fontFamily: bodyFont
    }}>
      <h1 style={{
        fontFamily: headingFont,
        fontSize: `${parseInt(headingFontSize) * 1.5}px`,
        color: headingTextColor,
        marginBottom: '32px',
        fontWeight: '70
2026-03-03 21:59:29.442 [info] [chunk 4/24]
0'
      }}>
        Executive Summary
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#1e3a5f',
            color: '#ffffff',
            padding: '16px 24px',
            fontSize: `${parseInt(bodyFontS
2026-03-03 21:59:29.442 [info] [chunk 5/24]
ize) * 1.25}px`,
            fontWeight: '600',
            fontFamily: headingFont
          }}>
            Business Overview
          </div>
          <div style={{
            padding: '24px',
            fontSize: bodyFontSize,
            color: bodyTextColor,
            lineHeight: '1.6'
          }}>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '16px' }}>
                Nintendo (TYO:7974) is a best-in-class international video g
2026-03-03 21:59:29.442 [info] [chunk 6/24]
ame developer and video game console manufacturer, headquartered in Kyoto, Japan
              </li>
              <li style={{ marginBottom: '16px' }}>
                The company is a global market leader, having contributed heavily to the industry's inception in the 1980s and experiencing multi-decade success ever since
              </li>
              <li style={{ marginBottom: '16px' }}>
                Nintendo's stock is currently trading at a discount to its intrinsic value as well as r
2026-03-03 21:59:29.442 [info] [chunk 7/24]
elative to peers, making now an opportune time to invest in the company
              </li>
              <li>
                High grow rates since 2016 are driven largely by the company's release of the Nintendo Switch in 2017
              </li>
            </ul>
          </div>
        </div>

        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#1e3a5f',
2026-03-03 21:59:29.442 [info] [chunk 8/24]
        color: '#ffffff',
            padding: '16px 24px',
            fontSize: `${parseInt(bodyFontSize) * 1.25}px`,
            fontWeight: '600',
            fontFamily: headingFont
          }}>
            Historical Financials
          </div>
          <div style={{
            padding: '24px',
            fontSize: `${parseInt(bodyFontSize) * 0.875}px`
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style
2026-03-03 21:59:29.442 [info] [chunk 9/24]
={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: '600' }}></th>
                  <th style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>2015A</th>
                  <th style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>2016A</th>
                  <th style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>2017A</th>
                  <th style={{ textAlign: 'right', padding: '8px',
2026-03-03 21:59:29.442 [info] [chunk 10/24]
 fontWeight: '600' }}>2018A</th>
                  <th style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>LTM</th>
                  <th style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>CAGR</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: '600' }}>Revenue</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$4,430.3</td>
2026-03-03 21:59:29.442 [info] [chunk 11/24]
<td style={{ textAlign: 'right', padding: '8px' }}>$3,339.8</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$9,188.8</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$10,900.7</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$11,175.2</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>26.0%</td>
                </tr>
                <tr>
                  <td style={{ padding: '8
2026-03-03 21:59:29.442 [info] [chunk 12/24]
px 0', fontStyle: 'italic', color: '#6b7280' }}>YoY Growth</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}></td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>(24.6%)</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>175.1%</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'it
2026-03-03 21:59:29.442 [info] [chunk 13/24]
alic', color: '#6b7280' }}>18.6%</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>2.5%</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}></td>
                </tr>
                <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 0', fontWeight: '600' }}>Gross Profit</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$1,871.4</td>
2026-03-03 21:59:29.442 [info] [chunk 14/24]
      <td style={{ textAlign: 'right', padding: '8px' }}>$1,522.3</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$3,419.3</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$4,432.5</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$4,654.8</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>25.6%</td>
                </tr>
                <tr>
                  <td style={{ padding
2026-03-03 21:59:29.442 [info] [chunk 15/24]
: '8px 0', fontStyle: 'italic', color: '#6b7280' }}>Margin</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>42.2%</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>45.6%</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>37.2%</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: '
2026-03-03 21:59:29.442 [info] [chunk 16/24]
italic', color: '#6b7280' }}>40.7%</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>41.7%</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}></td>
                </tr>
                <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 0', fontWeight: '600' }}>EBITDA</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$365.9</td>
2026-03-03 21:59:29.443 [info] [chunk 17/24]
 <td style={{ textAlign: 'right', padding: '8px' }}>$222.2</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$1,485.3</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$2,285.1</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$2,377.7</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>59.7%</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px
2026-03-03 21:59:29.443 [info] [chunk 18/24]
0', fontStyle: 'italic', color: '#6b7280' }}>YoY Growth</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}></td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>(39.3%)</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>568.3%</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'itali
2026-03-03 21:59:29.443 [info] [chunk 19/24]
c', color: '#6b7280' }}>53.8%</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>4.1%</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}></td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontStyle: 'italic', color: '#6b7280' }}>Margin</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>8.3%</td>
2026-03-03 21:59:29.443 [info] [chunk 20/24]
         <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>6.7%</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>16.2%</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>21.0%</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>21.3%</td>
                  <td style={{ tex
2026-03-03 21:59:29.443 [info] [chunk 21/24]
tAlign: 'right', padding: '8px' }}></td>
                </tr>
                <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 0', fontWeight: '600' }}>Note: R&D</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$526.9</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$591.6</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$525.6</td>
                  <td style={{ textAlign: 'ri
2026-03-03 21:59:29.443 [info] [chunk 22/24]
ght', padding: '8px' }}>$583.6</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$583.6</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}></td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: '600' }}>EBITDA Excl. R&D</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$892.8</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$813.8</td>
2026-03-03 21:59:29.443 [info] [chunk 23/24]
       <td style={{ textAlign: 'right', padding: '8px' }}>$2,010.9</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$2,868.7</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$2,961.4</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>35.0%</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontStyle: 'italic', color: '#6b7280' }}>Margin</td>
2026-03-03 21:59:29.443 [info] [chunk 24/24]
<td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>20.2%</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>24.4%</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: 'italic', color: '#6b7280' }}>21.9%</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontStyle: '
2026-03-03 21:59:29.443 [info] [generate-slide] Successfully generated slide 1 (11918 chars)