#!/usr/bin/env python3
"""
Download 424B4 filings for specific tickers using the free SEC EDGAR API
"""

import requests
import os
import time
from datetime import datetime, timedelta
import json

# SEC requires a User-Agent header with contact information
HEADERS = {
    'User-Agent': 'Vapid contact-vapid@pm.me'
}

# Rate limiting: SEC allows 10 requests per second
RATE_LIMIT_DELAY = 0.11  # 110ms between requests (just over 0.1s for safety)

tickers2023 = [
    'IROH',
'LGCB',
'BAYA',
'ZKH',
'INHD',
'AFJK',
'GSIW',
'FEBO',
'CLBR',
'ELAB',
'DDC',
'RR',
'GLAC',
'SGN',
'SHIM',
'CRGX',
'HG',
'AITR',
'ANSC',
'GVH',
'LXEO',
'PAPL',
'ATGL',
'MNR',
'NCL',
'WBUY',
'BIRK',
'GMM',
'LRHC',
'PMEC',
'GPAK',
'QETA',
'SPKL',
'MSS',
'ANL',
'SYRA',
'VSME',
'LRE',
'TURB',
'MDBH',
'KVYO',
'CART',
'DTCK',
'NMRA',
'RYZB',
'ARM',
'SPPL',
'NWGL',
'AXG',
'IVP',
'NNAG',
'SPGC',
'SRM',
'LQR',
'NRXS',
'FTEL',
'MIRA',
'CTNT',
'HRYU',
'PXDT',
'PRZO',
'SRFM',
'HYAC',
'ELWS',
'JNVR',
'KVAC',
'WRNT',
'TSBX',
'ODD',
'APGE',
'NETD',
'SGMT',
'BOWN',
'SXTP',
'PWM',
'INTS',
'VTMX',
'FIHL',
'KGS',
'SVV',
'BUJA',
'GENK',
'AZTR',
'BOF',
'CAVA',
'ESHA',
'ATMU',
'ATS',
'IPXX',
'CWD',
'SGE',
'ALCY',
'SLRN',
'KVUE',
'GODN',
'TRNR',
'AACT',
'JYD',
'UCAR',
'USGO',
'WLGS',
'TPET',
'WAI',
'GDTC',
'VCIG',
'GDHG',
'ARBB',
'ISPR',
'MGIH',
'MWG',
'HKIT',
'HSHP',
'SFWL',
'SYT',
'CHSN',
'HLP',
'TBMC',
'TMTC',
'YGFGF',
'ZJYL',
'OAKU',
'BANL',
'MGRX',
'OMH',
'FORL',
'ICG',
'IZM',
'AESI',
'AIXI',
'BMR',
'SBXC',
'DIST',
'GXAI',
'BFRG',
'MARX',
'BLAC',
'ENLT',
'MLYS',
'PTHR',
'HSAI',
'LSDIF',
'NXT',
'LICN',
'ASST',
'GPCR',
'CETU',
'BREA',
'TXO',
'GNLX',
'HERE',
'CVKD',
'ISRL',
'MGOL',
'SKWD',

]
tickers_2025 = [
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
]

def get_cik_from_ticker(ticker):
    """Get CIK number from ticker symbol using SEC's company tickers JSON"""
    try:
        url = "https://www.sec.gov/files/company_tickers.json"
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        data = response.json()

        # Search for the ticker
        for item in data.values():
            if item['ticker'] == ticker:
                # CIK needs to be zero-padded to 10 digits
                return str(item['cik_str']).zfill(10)
        return None
    except Exception as e:
        print(f"    Error getting CIK for {ticker}: {str(e)}")
        return None

def get_424b4_filings(cik, start_date, end_date):
    """Get 424B4 filings for a CIK within a date range"""
    try:
        url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        data = response.json()

        filings = []
        recent_filings = data.get('filings', {}).get('recent', {})

        if not recent_filings:
            return filings

        # Parse the filings
        for i in range(len(recent_filings.get('accessionNumber', []))):
            form_type = recent_filings['form'][i]
            filing_date = recent_filings['filingDate'][i]

            # Check if it's a 424B4 and within date range
            if form_type == '424B4' and start_date <= filing_date <= end_date:
                accession = recent_filings['accessionNumber'][i]
                primary_doc = recent_filings['primaryDocument'][i]

                filings.append({
                    'accessionNumber': accession,
                    'filingDate': filing_date,
                    'primaryDocument': primary_doc,
                    'cik': cik
                })

        return filings
    except Exception as e:
        print(f"    Error getting filings: {str(e)}")
        return []

def download_filing_html(cik, accession, primary_doc, output_path):
    """Download the HTML filing document from SEC EDGAR"""
    try:
        # Remove dashes from accession number for URL
        accession_no_dash = accession.replace('-', '')

        # Construct the URL
        url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession_no_dash}/{primary_doc}"

        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()

        # Save the content
        with open(output_path, 'wb') as f:
            f.write(response.content)

        return len(response.content)
    except Exception as e:
        raise Exception(f"Download failed: {str(e)}")

# Create output directory
output_dir = "424B4_filings_free/2023"
os.makedirs(output_dir, exist_ok=True)

# Look back 1 year
end_date = datetime.now() - timedelta(days=730)
start_date = end_date - timedelta(days=365)
start_str = start_date.strftime("%Y-%m-%d")
end_str = end_date.strftime("%Y-%m-%d")

print(f"Downloading 424B4 filings from {start_str} to {end_str}")
print(f"Saving to: {os.path.abspath(output_dir)}")
print(f"Using FREE SEC EDGAR API")
print("=" * 70)
print()

total_downloaded = 0
total_found = 0

for ticker in tickers2023:
    print(f"Processing {ticker}...")

    # Get CIK for ticker
    time.sleep(RATE_LIMIT_DELAY)
    cik = get_cik_from_ticker(ticker)

    if not cik:
        print(f"  CIK not found for ticker {ticker}\n")
        continue

    print(f"  CIK: {cik}")

    # Get 424B4 filings
    time.sleep(RATE_LIMIT_DELAY)
    filings = get_424b4_filings(cik, start_str, end_str)

    if len(filings) == 0:
        print(f"  No filings found\n")
        continue

    print(f"  Found {len(filings)} filing(s)")
    total_found += len(filings)

    for i, filing in enumerate(filings, 1):
        filing_date = filing['filingDate']
        accession = filing['accessionNumber']
        primary_doc = filing['primaryDocument']

        # Create safe filename
        clean_accession = accession.replace('-', '_')
        # Determine file extension from primary document
        file_ext = os.path.splitext(primary_doc)[1] or '.html'
        filename = f"{ticker}_{filing_date}_{clean_accession}{file_ext}"
        filepath = os.path.join(output_dir, filename)

        # Skip if already exists
        if os.path.exists(filepath):
            size = os.path.getsize(filepath)
            print(f"  [{i}/{len(filings)}] SKIP: {filename} (already exists, {size:,} bytes)")
            total_downloaded += 1
            continue

        print(f"  [{i}/{len(filings)}] Downloading: {filename}")
        print(f"      Filed: {filing_date}")

        try:
            time.sleep(RATE_LIMIT_DELAY)
            size = download_filing_html(cik, accession, primary_doc, filepath)
            print(f"      SUCCESS: {size:,} bytes ({size/1024:.1f} KB)")
            total_downloaded += 1
        except Exception as e:
            print(f"      ERROR: {str(e)}")
            continue

    print()

print("=" * 70)
print(f"Download complete!")
print(f"Total filings found: {total_found}")
print(f"Total files downloaded: {total_downloaded}")
print(f"Location: {os.path.abspath(output_dir)}")
print()
print("NOTE: Files are downloaded as HTML/HTM format (SEC's native format).")
print("To convert to PDF, you'll need additional tools like wkhtmltopdf or similar.")
