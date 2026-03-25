import React from 'react';
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
  const accent = accentColors[0];
  const accent2 = accentColors[3];
  const accent3 = accentColors[4];
  const rows = [
    {
      logo: `https://img.logo.dev/ticker/BTSG?token=process.env.LOGO_DEV_PUBLIC_KEY`,
      company: 'BrightSpring Health',
      ticker: 'BTSG',
      sector: 'Home & Community Health',
      sponsor: 'KKR',
      ipoDate: 'Jan 2024',
      shares: '53.3M',
      priceRange: '$15.00–$18.00',
      finalPrice: '$13.00',
      proceeds: '$1,108M',
      marketCap: '~$3.0B',
      ltmRev: '$8,830M',
      ltmEbitda: '~$280M',
      evRev: '0.3x',
      evEbitda: '~10.7x',
    },
    {
      logo: `https://img.logo.dev/ticker/PACS?token=process.env.LOGO_DEV_PUBLIC_KEY`,
      company: 'PACS Group',
      ticker: 'PACS',
      sector: 'Skilled Nursing / Post-Acute',
      sponsor: 'PE-backed (undisclosed)',
      ipoDate: 'Apr 2024',
      shares: '21.4M',
      priceRange: '$18.00–$21.00',
      finalPrice: '$21.00',
      proceeds: '$450M',
      marketCap: '~$3.0B',
      ltmRev: '~$2,000M',
      ltmEbitda: '~$230M',
      evRev: '~1.5x',
      evEbitda: '~13.0x',
    },
    {
      logo: `https://img.logo.dev/ticker/WAY?token=process.env.LOGO_DEV_PUBLIC_KEY`,
      company: 'Waystar Holding',
      ticker: 'WAY',
      sector: 'Healthcare IT / RCM',
      sponsor: 'EQT',
      ipoDate: 'Jun 2024',
      shares: '45.0M',
      priceRange: '$20.00–$23.00',
      finalPrice: '$21.50',
      proceeds: '$909M',
      marketCap: '~$5.3B',
      ltmRev: '~$854M',
      ltmEbitda: '~$340M',
      evRev: '~6.2x',
      evEbitda: '~15.6x',
    },
    {
      logo: `https://img.logo.dev/ticker/ARDT?token=process.env.LOGO_DEV_PUBLIC_KEY`,
      company: 'Ardent Health Partners',
      ticker: 'ARDT',
      sector: 'Hospital Systems',
      sponsor: 'Equity Group Investments',
      ipoDate: 'Jul 2024',
      shares: '12.0M',
      priceRange: '$16.00–$19.00',
      finalPrice: '$16.00',
      proceeds: '$192M',
      marketCap: '~$2.7B',
      ltmRev: '~$5,400M',
      ltmEbitda: '~$314M',
      evRev: '0.5x',
      evEbitda: '~8.6x',
    },
    {
      logo: `https://img.logo.dev/ticker/LMRI?token=process.env.LOGO_DEV_PUBLIC_KEY`,
      company: 'Lumexa Imaging',
      ticker: 'LMRI',
      sector: 'Outpatient Imaging',
      sponsor: 'Welsh, Carson, Anderson & Stowe',
      ipoDate: 'Dec 2025',
      shares: '25.0M',
      priceRange: '$17.00–$20.00',
      finalPrice: '$18.50',
      proceeds: '$463M',
      marketCap: '~$2.8B',
      ltmRev: '~$800M',
      ltmEbitda: '~$180M',
      evRev: '~3.5x',
      evEbitda: '~15.6x',
    },
    {
      logo: `https://img.logo.dev/ticker/MDLN?token=process.env.LOGO_DEV_PUBLIC_KEY`,
      company: 'Medline Industries',
      ticker: 'MDLN',
      sector: 'Medical Supplies',
      sponsor: 'Blackstone / Carlyle / H&F',
      ipoDate: 'Dec 2025',
      shares: '216.0M',
      priceRange: '$27.00–$30.00',
      finalPrice: '$29.00',
      proceeds: '$6,264M',
      marketCap: '~$37.3B',
      ltmRev: '~$23,000M',
      ltmEbitda: '~$1,700M',
      evRev: '~1.6x',
      evEbitda: '~22.0x',
    },
  ];
  const cellStyle = (isAlt: boolean): React.CSSProperties => ({
    padding: '3px 4px',
    fontSize: `${bodyFontSize * 0.72}px`,
    fontFamily: bodyFont,
    color: bodyTextColor,
    backgroundColor: isAlt ? `${accent3}55` : '#ffffff',
    borderBottom: `1px solid ${accent3}`,
    verticalAlign: 'middle',
    lineHeight: '1.2',
  });
  const numericCellStyle = (isAlt: boolean): React.CSSProperties => ({
    ...cellStyle(isAlt),
    textAlign: 'right',
  });
  const highlightCellStyle = (isAlt: boolean): React.CSSProperties => ({
    ...numericCellStyle(isAlt),
    fontWeight: 700,
    color: accent,
  });
  return (
    <div
      style={{
        width: '960px',
        height: '540px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: bodyFont,
        backgroundColor: backgroundColor || '#ffffff',
      }}
    >
      {/* Header accent bar */}
      <div
        data-pptx-type="shape"
        data-pptx-id="1"
        style={{
          position: 'absolute',
          top: '0px',
          left: '0px',
          width: '960px',
          height: '4px',
          backgroundColor: accent,
        }}
      />
      {/* Confidential label */}
      <div
        data-pptx-type="text"
        data-pptx-id="2"
        style={{
          position: 'absolute',
          top: '8px',
          left: '0px',
          width: '960px',
          textAlign: 'center',
          fontFamily: bodyFont,
          fontSize: `${bodyFontSize * 0.75}px`,
          color: '#9ca3af',
          letterSpacing: '0.12em',
        }}
      >
        — CONFIDENTIAL —
      </div>
      {/* Title */}
      <div
        data-pptx-type="heading"
        data-pptx-id="3"
        style={{
          position: 'absolute',
          top: '22px',
          left: '30px',
          width: '900px',
          fontFamily: headingFont,
          fontSize: `${headingFontSize * 1.05}px`,
          fontWeight: 700,
          color: headingTextColor,
        }}
      >
        PE-Backed Healthcare IPOs (2024–2025)
      </div>
      {/* Subtitle */}
      <div
        data-pptx-type="subheading"
        data-pptx-id="4"
        style={{
          position: 'absolute',
          top: '46px',
          left: '30px',
          width: '900px',
          fontFamily: bodyFont,
          fontSize: `${bodyFontSize * 0.85}px`,
          color: '#6b7280',
          fontStyle: 'italic',
        }}
      >
        Select sponsor-backed healthcare companies that completed IPOs since 2023
      </div>
      {/* Divider */}
      <div
        data-pptx-type="divider"
        data-pptx-id="5"
        style={{
          position: 'absolute',
          top: '62px',
          left: '30px',
          width: '900px',
          height: '2px',
          backgroundColor: accent,
        }}
      />
      {/* Unit label */}
      <div
        data-pptx-type="text"
        data-pptx-id="6"
        style={{
          position: 'absolute',
          top: '67px',
          left: '30px',
          fontFamily: bodyFont,
          fontSize: `${bodyFontSize * 0.7}px`,
          color: '#9ca3af',
          fontStyle: 'italic',
        }}
      >
        ($ in millions, unless otherwise noted)
      </div>
      {/* Table */}
      <div
        data-pptx-type="table"
        data-pptx-id="7"
        style={{
          position: 'absolute',
          top: '78px',
          left: '30px',
          width: '900px',
          height: '430px',
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
          <colgroup>
            <col style={{ width: '100px' }} /> {/* Company */}
            <col style={{ width: '38px' }} /> {/* Ticker */}
            <col style={{ width: '90px' }} /> {/* Sector */}
            <col style={{ width: '90px' }} /> {/* Sponsor */}
            <col style={{ width: '42px' }} /> {/* IPO Date */}
            <col style={{ width: '40px' }} /> {/* Shares */}
            <col style={{ width: '72px' }} /> {/* Price Range */}
            <col style={{ width: '44px' }} /> {/* Final Price */}
            <col style={{ width: '52px' }} /> {/* Proceeds */}
            <col style={{ width: '50px' }} /> {/* Mkt Cap */}
            <col style={{ width: '56px' }} /> {/* LTM Rev */}
            <col style={{ width: '54px' }} /> {/* LTM EBITDA */}
            <col style={{ width: '40px' }} /> {/* EV/Rev */}
            <col style={{ width: '42px' }} /> {/* EV/EBITDA */}
          </colgroup>
          <thead>
            {/* Group headers */}
            {/* 
              Column mapping (14 total):
              1: Company
              2: Ticker
              3: Sector
              4: PE Sponsor
              → "Company Information" colSpan=4

              5: IPO Date
              6: Shares Offered
              7: Offer Price Range
              8: Final IPO Price
              9: Total Proceeds
              10: IPO Mkt Cap
              → "IPO Details" colSpan=6

              11: LTM Revenue
              12: LTM Adj. EBITDA
              → "LTM Financials" colSpan=2

              13: EV/Rev
              14: EV/EBITDA
              → "Valuation" colSpan=2
            */}
            <tr>
              <th
                colSpan={4}
                style={{
                  fontFamily: headingFont,
                  fontSize: `${bodyFontSize * 0.68}px`,
                  backgroundColor: accent,
                  color: '#ffffff',
                  padding: '3px 4px',
                  textAlign: 'center',
                  fontWeight: 700,
                  borderRight: '2px solid #ffffff',
                }}
              >
                Company Information
              </th>
              <th
                colSpan={6}
                style={{
                  fontFamily: headingFont,
                  fontSize: `${bodyFontSize * 0.68}px`,
                  backgroundColor: accentColors[1],
                  color: '#ffffff',
                  padding: '3px 4px',
                  textAlign: 'center',
                  fontWeight: 700,
                  borderRight: '2px solid #ffffff',
                }}
              >
                IPO Details
              </th>
              <th
                colSpan={2}
                style={{
                  fontFamily: headingFont,
                  fontSize: `${bodyFontSize * 0.68}px`,
                  backgroundColor: accentColors[2],
                  color: '#ffffff',
                  padding: '3px 4px',
                  textAlign: 'center',
                  fontWeight: 700,
                  borderRight: '2px solid #ffffff',
                }}
              >
                LTM Financials
              </th>
              <th
                colSpan={2}
                style={{
                  fontFamily: headingFont,
                  fontSize: `${bodyFontSize * 0.68}px`,
                  backgroundColor: accent3,
                  color: accent,
                  padding: '3px 4px',
                  textAlign: 'center',
                  fontWeight: 700,
                }}
              >
                Valuation
              </th>
            </tr>
            {/* Column headers */}
            <tr style={{ backgroundColor: `${accent}15` }}>
              <th style={{ fontFamily: headingFont, fontSize: `${bodyFontSize * 0.68}px`, color: headingTextColor, padding: '3px 4px', textAlign: 'left', fontWeight: 700, borderBottom: `2px solid ${accent}` }}>Company</th>
              <th style={{ fontFamily: headingFont, fontSize: `${bodyFontSize * 0.68}px`, color: headingTextColor, padding: '3px 4px', textAlign: 'center', fontWeight: 700, borderBottom: `2px solid ${accent}` }}>Ticker</th>
              <th style={{ fontFamily: headingFont, fontSize: `${bodyFontSize * 0.68}px`, color: headingTextColor, padding: '3px 4px', textAlign: 'left', fontWeight: 700, borderBottom: `2px solid ${accent}` }}>Sector</th>
              <th style={{ fontFamily: headingFont, fontSize: `${bodyFontSize * 0.68}px`, color: headingTextColor, padding: '3px 4px', textAlign: 'left', fontWeight: 700, borderBottom: `2px solid ${accent}` }}>PE Sponsor</th>
              <th style={{ fontFamily: headingFont, fontSize: `${bodyFontSize * 0.68}px`, color: headingTextColor, padding: '3px 4px', textAlign: 'center', fontWeight: 700, borderBottom: `2px solid ${accent}` }}>IPO Date</th>
              <th style={{ fontFamily: headingFont, fontSize: `${bodyFontSize * 0.68}px`, color: headingTextColor, padding: '3px 4px', textAlign: 'right', fontWeight: 700, borderBottom: `2px solid ${accent}` }}>Shares Offered</th>
              <th style={{ fontFamily: headingFont, fontSize: `${bodyFontSize * 0.68}px`, color: headingTextColor, padding: '3px 4px', textAlign: 'center', fontWeight: 700, borderBottom: `2px solid ${accent}` }}>Offer Price Range</th>
              <th style={{ fontFamily: headingFont, fontSize: `${bodyFontSize * 0.68}px`, color: headingTextColor, padding: '3px 4px', textAlign: 'right', fontWeight: 700, borderBottom: `2px solid ${accent}` }}>Final IPO Price</th>
              <th style={{ fontFamily: headingFont, fontSize: `${bodyFontSize * 0.68}px`, color: headingTextColor, padding: '3px 4px', textAlign: 'right', fontWeight: 700, borderBottom: `2px solid ${accent}` }}>Total Proceeds</th>
              <th style={{ fontFamily: headingFont, fontSize: `${bodyFontSize * 0.68}px`, color: headingTextColor, padding: '3px 4px', textAlign: 'right', fontWeight: 700, borderBottom: `2px solid ${accent}` }}>IPO Mkt Cap</th>
              <th style={{ fontFamily: headingFont, fontSize: `${bodyFontSize * 0.68}px`, color: headingTextColor, padding: '3px 4px', textAlign: 'right', fontWeight: 700, borderBottom: `2px solid ${accent}` }}>LTM Revenue</th>
              <th style={{ fontFamily: headingFont, fontSize: `${bodyFontSize * 0.68}px`, color: headingTextColor, padding: '3px 4px', textAlign: 'right', fontWeight: 700, borderBottom: `2px solid ${accent}` }}>LTM Adj. EBITDA</th>
              <th style={{ fontFamily: headingFont, fontSize: `${bodyFontSize * 0.68}px`, color: headingTextColor, padding: '3px 4px', textAlign: 'right', fontWeight: 700, borderBottom: `2px solid ${accent}` }}>EV / Rev</th>
              <th style={{ fontFamily: headingFont, fontSize: `${bodyFontSize * 0.68}px`, color: headingTextColor, padding: '3px 4px', textAlign: 'right', fontWeight: 700, borderBottom: `2px solid ${accent}` }}>EV / EBITDA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isAlt = i % 2 === 1;
              return (
                <tr key={i}>
                  {/* Company with logo */}
                  <td style={{ ...cellStyle(isAlt), textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <img
                        src={row.logo}
                        alt={row.company}
                        style={{ width: '14px', height: '14px', objectFit: 'contain', flexShrink: 0 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span style={{ fontFamily: bodyFont, fontSize: `${bodyFontSize * 0.72}px`, color: headingTextColor, fontWeight: 600, lineHeight: '1.2' }}>
                        {row.company}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...cellStyle(isAlt), textAlign: 'center', fontWeight: 600, color: accent }}>
                    {row.ticker}
                  </td>
                  <td style={{ ...cellStyle(isAlt), textAlign: 'left', fontSize: `${bodyFontSize * 0.66}px` }}>
                    {row.sector}
                  </td>
                  <td style={{ ...cellStyle(isAlt), textAlign: 'left', fontSize: `${bodyFontSize * 0.65}px` }}>
                    {row.sponsor}
                  </td>
                  <td style={{ ...cellStyle(isAlt), textAlign: 'center' }}>
                    {row.ipoDate}
                  </td>
                  <td style={{ ...numericCellStyle(isAlt) }}>
                    {row.shares}
                  </td>
                  <td style={{ ...cellStyle(isAlt), textAlign: 'center' }}>
                    {row.priceRange}
                  </td>
                  <td style={{ ...numericCellStyle(isAlt), fontWeight: 600 }}>
                    {row.finalPrice}
                  </td>
                  <td style={{ ...numericCellStyle(isAlt), fontWeight: 600 }}>
                    {row.proceeds}
                  </td>
                  <td style={{ ...numericCellStyle(isAlt) }}>
                    {row.marketCap}
                  </td>
                  <td style={{ ...numericCellStyle(isAlt) }}>
                    {row.ltmRev}
                  </td>
                  <td style={{ ...numericCellStyle(isAlt) }}>
                    {row.ltmEbitda}
                  </td>
                  <td style={{ ...highlightCellStyle(isAlt) }}>
                    {row.evRev}
                  </td>
                  <td style={{ ...highlightCellStyle(isAlt) }}>
                    {row.evEbitda}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Footer divider */}
      <div
        data-pptx-type="divider"
        data-pptx-id="8"
        style={{
          position: 'absolute',
          top: '497px',
          left: '30px',
          width: '900px',
          height: '1px',
          backgroundColor: `${accent}40`,
        }}
      />
      {/* Footnote */}
      <div
        data-pptx-type="text"
        data-pptx-id="9"
        style={{
          position: 'absolute',
          top: '500px',
          left: '30px',
          width: '780px',
          fontFamily: bodyFont,
          fontSize: `${bodyFontSize * 0.62}px`,
          color: '#9ca3af',
          lineHeight: '1.3',
        }}
      >
        <span style={{ fontWeight: 700 }}>Sources:</span> S-1 filings, company press releases, Renaissance Capital. LTM figures as reported at IPO. Multiples calculated at IPO equity market cap; may differ from EV-based multiples. PACS Group pre-IPO sponsor details not publicly confirmed.
      </div>
      {/* Page number */}
      <div
        data-pptx-type="text"
        data-pptx-id="10"
        style={{
          position: 'absolute',
          top: '502px',
          left: '880px',
          width: '50px',
          fontFamily: bodyFont,
          fontSize: `${bodyFontSize * 0.75}px`,
          color: accent,
          fontWeight: 700,
          textAlign: 'right',
        }}
      >
        1
      </div>
    </div>
  );
}