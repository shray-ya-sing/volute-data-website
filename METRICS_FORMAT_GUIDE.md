# Volute Metrics Format Guide

## PDF Source Files

### Where to Place PDF Files
- Store all source PDFs in: `public/source-content/[company-slug]/`
- Example structure:
  ```
  public/source-content/
    ├── astera-labs/
    │   ├── ALAB_S1A.pdf
    │   └── ALAB_424B.pdf
    ├── coreweave/
    │   ├── CRWV_424B.pdf
    │   └── CRWV_S1A_3.20.2025.pdf
    └── rubrik/
        └── RBRK_S1A.pdf
  ```

### How to Reference PDFs in Admin Panel
- **Correct:** `/source-content/coreweave/CRWV_424B.pdf`
- **Incorrect:** `C:\Users\shrey\volute-data-website\public\source-content\coreweave\CRWV_424B.pdf`
- **Incorrect:** `c:\Users\...\` (never use Windows file paths)

Use the dropdown in the admin panel to select from existing PDFs, or type the web path starting with `/`.

---

## General Principles
- **Always use EXACT values, never rounded**
- **Never use abbreviations** like "20M" or "1.5B" - always write full numbers
- **Be consistent** with formatting across all entries
- **Include units** where applicable (shares, per share, etc.)

---

## Date Formats

### IPO Date
- **Format:** `YYYY-MM-DD` (ISO 8601)
- **Examples:**
  - `2024-03-20`
  - `2024-11-14`
- **Notes:** Use the actual IPO date (first trading day)

---

## Price Metrics (Per Share)

### Final Price, Opening Price, First Day Closing Price
- **Format:** `$XX.XX per share`
- **Examples:**
  - `$36.00 per share`
  - `$28.50 per share`
  - `$42.75 per share`
- **Notes:** Always include 2 decimal places, even for whole dollars

### Expected Price Range
- **Format:** `$XX.XX - $YY.YY per share`
- **Examples:**
  - `$32.00 - $34.00 per share`
  - `$28.00 - $30.00 per share`
- **Notes:** This is the expected IPO price range from the prospectus

---

## Share Counts (Always Exact Numbers)

### Shares Offered (Primary)
- **Format:** `XXX,XXX,XXX shares`
- **Examples:**
  - `20,000,000 shares`
  - `15,625,000 shares`
- **Notes:** Total primary shares offered in the IPO (NOT including greenshoe)

### Shares Sold by Company
- **Format:** `XXX,XXX,XXX shares`
- **Examples:**
  - `18,000,000 shares`
  - `12,500,000 shares`
- **Notes:** Primary shares sold by the company itself

### Shares Sold by Selling Stockholders
- **Format:** `XXX,XXX,XXX shares`
- **Examples:**
  - `2,000,000 shares`
  - `0 shares` (if none)
- **Notes:** Secondary shares sold by existing shareholders

### Greenshoe Shares (Over-allotment Option)
- **Format:** `XXX,XXX,XXX shares`
- **Examples:**
  - `3,000,000 shares`
  - `2,343,750 shares`
- **Notes:** Additional shares that can be sold if underwriters exercise the option (typically 15% of base offering)

### Common Stock Outstanding (Post-IPO)
- **Format:** `XXX,XXX,XXX shares`
- **Examples:**
  - `245,000,000 shares`
  - `189,750,500 shares`
- **Notes:** Total shares outstanding after IPO (assuming greenshoe fully exercised unless otherwise noted)

---

## Valuation Metrics (Large Dollar Amounts)

### IPO Valuation
- **Format:** `$X,XXX,XXX,XXX` or `$XXX,XXX,XXX,XXX`
- **Examples:**
  - `$8,820,000,000` (8.82 billion)
  - `$23,450,000,000` (23.45 billion)
- **Notes:** Fully diluted market cap at IPO price. Use commas for readability but exact amounts.

### Last Private Valuation
- **Format:** `$X,XXX,XXX,XXX` or `$XXX,XXX,XXX,XXX`
- **Examples:**
  - `$5,000,000,000`
  - `$12,500,000,000`
- **Notes:** Most recent private funding round valuation. Add date in notes if relevant.

---

## Proceeds (Dollar Amounts)

### Gross Proceeds
- **Format:** `$XXX,XXX,XXX` (exact amount)
- **Examples:**
  - `$720,000,000`
  - `$445,312,500`
- **Notes:** Total proceeds before underwriting discount (shares × price)

### Net Proceeds
- **Format:** `$XXX,XXX,XXX` (exact amount)
- **Examples:**
  - `$669,600,000`
  - `$413,940,625`
- **Notes:** Proceeds after deducting underwriting discount

### Proceeds to Company
- **Format:** `$XXX,XXX,XXX` (exact amount)
- **Examples:**
  - `$600,000,000`
  - `$380,500,000`
- **Notes:** Net proceeds going to the company (from primary shares)

### Proceeds to Selling Stockholders
- **Format:** `$XXX,XXX,XXX` (exact amount)
- **Examples:**
  - `$69,600,000`
  - `$0` (if no secondary shares)
- **Notes:** Net proceeds going to selling stockholders (from secondary shares)

---

## Fees

### Underwriter Discount (Total)
- **Format:** `$XX,XXX,XXX (X.XX%)`
- **Examples:**
  - `$50,400,000 (7.0%)`
  - `$31,371,875 (7.05%)`
- **Notes:** Total underwriting fees/discount. Include percentage for context.

---

## Deal Participants

### Bookrunning Banks
- **Format:** Comma-separated list, lead books first
- **Examples:**
  - `Morgan Stanley, Goldman Sachs, J.P. Morgan`
  - `BofA Securities, Barclays, Citigroup, Wells Fargo Securities`
- **Notes:** List lead bookrunners first, then co-managers

### Attorneys
- **Format:** `Company Counsel: [Firm] | Underwriter Counsel: [Firm]`
- **Examples:**
  - `Company Counsel: Wilson Sonsini Goodrich & Rosati | Underwriter Counsel: Latham & Watkins`
  - `Company Counsel: Cooley LLP | Underwriter Counsel: Davis Polk & Wardwell`
- **Notes:** Use pipe `|` to separate company and underwriter counsel

---

## Qualitative Metrics

### Upsized/Downsized
- **Format:** Free text description with exact numbers
- **Examples:**
  - `Upsized from 18,000,000 shares to 20,000,000 shares`
  - `Priced above range ($36.00 vs. $32.00-$34.00)`
  - `No changes`
  - `Downsized from $30.00-$32.00 to $26.00-$28.00 range`
- **Notes:** Describe any changes from initial filing to final pricing

### Notes
- **Format:** Free text, but include exact numbers and dates
- **Examples:**
  - `Greenshoe fully exercised on 2024-03-27`
  - `First AI infrastructure IPO of 2024`
  - `Dual-class share structure: Class A (1 vote), Class B (10 votes)`
- **Notes:** Any additional context, caveats, or important details

---

## Common Calculations

### How to calculate IPO Valuation:
```
IPO Valuation = Common Stock Outstanding × Final Price
Example: 245,000,000 shares × $36.00 = $8,820,000,000
```

### How to calculate Gross Proceeds:
```
Gross Proceeds = Shares Offered × Final Price
Example: 20,000,000 shares × $36.00 = $720,000,000
```

### How to calculate Net Proceeds:
```
Net Proceeds = Gross Proceeds - Underwriter Discount
Example: $720,000,000 - $50,400,000 = $669,600,000
```

---

## Quick Format Reference Table

| Metric | Format | Example |
|--------|--------|---------|
| IPO Date | `YYYY-MM-DD` | `2024-03-20` |
| Prices | `$XX.XX per share` | `$36.00 per share` |
| Share Counts | `XXX,XXX,XXX shares` | `20,000,000 shares` |
| Large $ Amounts | `$X,XXX,XXX,XXX` | `$8,820,000,000` |
| Proceeds | `$XXX,XXX,XXX` | `$720,000,000` |
| Fees | `$XX,XXX,XXX (X.X%)` | `$50,400,000 (7.0%)` |
| Banks | `Lead1, Lead2, Co-mgr1` | `Morgan Stanley, Goldman Sachs` |

---

## Data Entry Tips

1. **Copy exact numbers from source documents** - don't round or approximate
2. **Use commas for readability** in large numbers (e.g., `20,000,000` not `20000000`)
3. **Always include "shares" or "per share"** to indicate what the number represents
4. **Be consistent with decimal places** - use `.00` for whole dollar amounts
5. **When in doubt, add clarification in Notes** field
6. **Verify your math** - proceeds should equal shares × price
7. **Double-check before saving** - it's easier to enter correctly than to fix later

---

## Example: Complete Astera Labs IPO Entry

```
Company: Astera Labs (ALAB)
IPO Date: 2024-03-20

finalPrice: $36.00 per share
openingPrice: $52.56 per share
firstDayClosingPrice: $53.25 per share
priceRange: $32.00 - $34.00 per share

sharesOffered: 20,000,000 shares
sharesCompany: 18,000,000 shares
sharesSellingStockholders: 2,000,000 shares
greenshoeShares: 3,000,000 shares
commonStockOutstanding: 245,000,000 shares

grossProceeds: $720,000,000
underwriterDiscount: $50,400,000 (7.0%)
netProceeds: $669,600,000
proceedsToCompany: $597,600,000
proceedsToSellingStockholders: $72,000,000

ipoValuation: $8,820,000,000
lastPrivateValuation: $3,150,000,000

bookrunners: Morgan Stanley, BofA Securities, Stifel
attorneys: Company Counsel: Wilson Sonsini Goodrich & Rosati | Underwriter Counsel: Latham & Watkins

upsizedOrDownsized: Upsized from 18,000,000 shares and priced above $32.00-$34.00 range at $36.00
notes: Greenshoe fully exercised. First AI infrastructure company to go public in 2024. Strong first-day pop of 47.9%.
```
