/**
 * Cron Job: Check SEC RSS feed for new 424B4 filings
 * Runs: Every hour
 * Filters for specific 2025 IPO tickers
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// SEC RSS feed for 424B4 filings
const SEC_RSS_URL = 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=424B4&count=100&output=atom';
// SEC company tickers JSON for mapping tickers to CIKs
const SEC_COMPANY_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';

// 2025 IPO tickers to monitor
const IPO_TICKERS = [
  'BEBE', 'ADAC', 'LPCV', 'VHCP', 'ANDG', 'CCXI', 'IRHO', 'MDLN', 'CRAN', 'ITHA',
  'TWLV', 'WLTH', 'BLRK', 'KBON', 'LMRI', 'CDNL', 'JMG', 'MESH', 'DSAC', 'LFAC',
  'AEAQ', 'NWAX', 'RGNT', 'SAC', 'SMJF', 'GPAC', 'PARK', 'SBXE', 'BIXI', 'SCII',
  'IGAC', 'HCAC', 'GLOO', 'OTH', 'POAS', 'BPAC', 'EVOX', 'CRAC', 'TDWD', 'AERO',
  'BLLN', 'EVMN', 'ELWT', 'XZO', 'BETA', 'CEPV', 'WSTN', 'VACI', 'DNMX', 'NAVN',
  'DYOR', 'APXT', 'MPLT', 'LAFA', 'HAVA', 'MMTX', 'AGCC', 'ALIS', 'NPT', 'AHMA',
  'BGIN', 'MCTA', 'ACCL', 'SLGB', 'TCGL', 'RPGL', 'ALH', 'LFS', 'PXED', 'YDDL',
  'POM', 'LKSP', 'GIW', 'AIIA', 'CCHH', 'RNGT', 'CBK', 'AGRZ', 'FRMI', 'KRSP',
  'NP', 'YCY', 'APAC', 'BCSS', 'BDCI', 'KNRX', 'AEXA', 'FCRS', 'MGN', 'DMII',
  'EMIS', 'LATA', 'PLTS', 'PTRN', 'NTSK', 'STUB', 'WBI', 'CHEC', 'CHOW', 'BRCB',
  'FOFO', 'GEMI', 'LGN', 'OTGA', 'VIA', 'FIGR', 'LBRX', 'BLZR', 'KLAR', 'TLNC',
  'ZGM', 'FCHL', 'GSRF', 'SVAC', 'PMI', 'ELOG', 'TGHL', 'THH', 'KOYN', 'MBVI',
  'CURX', 'CEPF', 'ETS', 'YMT', 'NUTR', 'BUUU', 'MIAX', 'NSRX', 'RYOJ', 'BLSH',
  'HVMC', 'MAGH', 'MKLY', 'DKI', 'EFTY', 'HTFL', 'SSEA', 'FLY', 'WYFI', 'CTW',
  'QUMS', 'HCMA', 'BCAR', 'FIG', 'SI', 'AMBQ', 'APAD', 'YMAT', 'ARX', 'LHAI',
  'MH', 'CARL', 'CRE', 'NIQ', 'TDIC', 'MJID', 'LAWR', 'PAII', 'KMRK', 'MGRT',
  'SOCA', 'SPEG', 'BMHL', 'DLXY', 'GTER', 'ANPA', 'MSGY', 'TLIH', 'MAMK', 'CV',
  'EMPG', 'EVAC', 'ONCH', 'ORIQ', 'VNME', 'CCII', 'GRAN', 'INAC', 'NMP', 'FIGX',
  'YORK', 'CAEP', 'JCAP', 'JLHL', 'FMFC', 'LWAC', 'OBA', 'HCHL', 'AXIN', 'CAI',
  'EGG', 'PACH', 'SLDE', 'AIRO', 'BACC', 'BSAA', 'CHYM', 'VNTG', 'ASIC', 'VOYG',
  'BLUW', 'JEM', 'OMDA', 'CRCL', 'PTNM', 'JENA', 'WTG', 'KCHV', 'CRA', 'FTRK',
  'PELI', 'HNGE', 'MNTN', 'OYSE', 'AACI', 'OFAL', 'PCAP', 'CCCM', 'WENN', 'RTAC',
  'TVAI', 'ANTA', 'CCCX', 'ETOR', 'OMSE', 'PMTR', 'APUS', 'EGHA', 'AHL', 'AII',
  'IPOD', 'CEPT', 'CGCT', 'GTEN', 'SDM', 'COPL', 'RDAG', 'LCCC', 'TACO', 'YB',
  'DAAQ', 'RAAQ', 'CHAC', 'IPCX', 'PHOE', 'NPAC', 'TVA', 'CIGL', 'PFAI', 'TMDE',
  'CHA', 'EDHL', 'HXHX', 'ATHR', 'CUPR', 'IOTR', 'MB', 'TACH', 'FATN', 'RYET',
  'BLIV', 'LHSW', 'SMA', 'SORA', 'SZZL', 'ENGS', 'SDHI', 'WTF', 'WXM', 'NMAX',
  'UYSC', 'CRWV', 'NCT', 'WFF', 'EPSM', 'LGPS', 'BIYA', 'GSHR', 'RCT', 'QSEA',
  'MWYN', 'MCRP', 'SAGT', 'ADVB', 'JFB', 'KMTS', 'TBH', 'PN', 'FERA', 'LOKV',
  'NHIC', 'LUD', 'LZMH', 'RAC', 'WETO', 'STAK', 'BMGL', 'WGRX', 'NNNN', 'NPB',
  'AACB', 'AARD', 'IPEX', 'KRMN', 'SAIL', 'XHLD', 'AGH', 'ATII', 'SION', 'TTAM',
  'EPWK', 'FBGL', 'CJMB', 'HCAI', 'KFII', 'PLUT', 'INR', 'MAZE', 'MTSR', 'BBNX',
  'SVCC', 'FGMC', 'DMAA', 'SFD', 'AAPG', 'VG', 'COLA', 'SKBL', 'DGNX', 'DXST',
  'MCTR', 'TOPP', 'HVII', 'FLOC', 'PCLA', 'HKPD', 'PLMK', 'RIBB', 'UFG', 'MIMI',
  'MASK', 'CEPO', 'ZYBT', 'INLF'
];

interface SECFiling {
  ticker: string;
  companyName: string;
  cik: string;
  accessionNumber: string;
  filingDate: string;
  filingUrl: string;
}

interface TickerCIKMap {
  [ticker: string]: string;
}

/**
 * Parse SEC Atom feed for 424B4 filings
 */
async function parseRSSFeed(): Promise<SECFiling[]> {
  console.log('📡 Fetching SEC RSS feed...');

  const response = await fetch(SEC_RSS_URL, {
    headers: {
      'User-Agent': process.env.SEC_USER_AGENT || 'Volute Data support@volute.com',
    },
  });

  if (!response.ok) {
    throw new Error(`SEC RSS fetch failed: ${response.statusText}`);
  }

  const xmlText = await response.text();
  console.log(`✓ Downloaded RSS feed (${(xmlText.length / 1024).toFixed(1)}KB)`);

  // Parse XML manually (lightweight approach for serverless)
  const filings: SECFiling[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  const entries = [...xmlText.matchAll(entryRegex)];

  for (const entryMatch of entries) {
    const entry = entryMatch[1];

    // Extract fields
    const title = entry.match(/<title>(.*?)<\/title>/)?.[1] || '';
    const link = entry.match(/<link[^>]*href="([^"]+)"/)?.[1] || '';
    const updated = entry.match(/<updated>(.*?)<\/updated>/)?.[1] || '';

    // Parse title: "424B4 - SERVICETITAN, INC. (0001941106) (Filer)"
    const titleMatch = title.match(/424B4\s*-\s*(.*?)\s*\((\d+)\)/);
    if (!titleMatch) continue;

    const companyName = titleMatch[1].trim();
    const cik = titleMatch[2];

    // Extract accession number from link
    const accessionMatch = link.match(/accession[nN]umber=(\d{10}-\d{2}-\d{6})/);
    if (!accessionMatch) continue;

    const accessionNumber = accessionMatch[1];

    // Get filing date
    const filingDate = updated.split('T')[0]; // YYYY-MM-DD

    // Construct PDF URL (we'll need to find the actual PDF filename)
    // For now, store the EDGAR viewer link
    const filingUrl = `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${accessionNumber.replace(/-/g, '')}&xbrl_type=v`;

    // Use company name as temporary ticker (will be extracted by Claude later)
    // Example: "SERVICETITAN, INC." -> "SERVICETITAN"
    const tempTicker = companyName
      .replace(/,?\s+(INC\.?|CORP\.?|LTD\.?|LLC|CO\.?)$/i, '')
      .trim()
      .substring(0, 20); // Limit length for database

    filings.push({
      ticker: tempTicker,
      companyName,
      cik,
      accessionNumber,
      filingDate,
      filingUrl,
    });
  }

  console.log(`✓ Parsed ${filings.length} 424B4 filings from RSS`);
  return filings;
}

/**
 * Check if filing already exists in database
 */
async function filingExists(accessionNumber: string): Promise<boolean> {
  const result = await sql`
    SELECT id FROM filings
    WHERE accession_number = ${accessionNumber}
    LIMIT 1
  `;
  return result.length > 0;
}

/**
 * Insert new filing into database
 */
async function insertFiling(filing: SECFiling): Promise<number> {
  const result = await sql`
    INSERT INTO filings (
      ticker, cik, accession_number, filing_date,
      filing_url, status, created_at
    )
    VALUES (
      ${filing.ticker},
      ${filing.cik},
      ${filing.accessionNumber},
      ${filing.filingDate},
      ${filing.filingUrl},
      'pending',
      NOW()
    )
    RETURNING id
  `;
  return result[0].id;
}

/**
 * Update pipeline state
 */
async function updatePipelineState() {
  await sql`
    INSERT INTO pipeline_state (id, last_rss_check, updated_at)
    VALUES (1, NOW(), NOW())
    ON CONFLICT (id)
    DO UPDATE SET last_rss_check = NOW(), updated_at = NOW()
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret (only if CRON_SECRET is set)
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized: Invalid or missing cron secret');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    console.warn('⚠️ CRON_SECRET not set - running without authentication');
  }

  console.log('🔍 Starting SEC RSS check...');

  try {
    // Parse RSS feed
    const filings = await parseRSSFeed();

    // Check for new filings
    let newCount = 0;
    const newFilings: string[] = [];

    for (const filing of filings) {
      const exists = await filingExists(filing.accessionNumber);

      if (!exists) {
        const filingId = await insertFiling(filing);
        newFilings.push(`${filing.companyName} (${filing.accessionNumber})`);
        newCount++;
        console.log(`✅ Added new filing: ${filing.companyName} (ID: ${filingId})`);
      }
    }

    // Update last check time
    await updatePipelineState();

    console.log(`✅ RSS check complete. Found ${newCount} new filings.`);

    return res.status(200).json({
      success: true,
      checked: filings.length,
      newFilings: newCount,
      filings: newFilings,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error checking RSS feed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
