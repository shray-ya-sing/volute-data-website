# Article Cleaning Scripts

Scripts for downloading and cleaning web articles by removing ads, popups, and extracting main content.

## Overview

You have three approaches for getting clean articles:

1. **clean-articles.ts** - Clean already-downloaded HTML files (works with SingleFile output)
2. **download-with-playwright.ts** - Download with ad-blocking and popup handling built-in
3. **Combined approach** - Download with SingleFile, then clean with clean-articles.ts

## Installation

```bash
# For cleaning existing files
npm install jsdom @mozilla/readability @types/jsdom --save-dev

# For downloading with Playwright
npm install playwright
npx playwright install chromium
```

## Usage

### Option 1: Clean Existing Downloads

If you've already downloaded articles with SingleFile:

```bash
# Clean all HTML files in a directory
tsx scripts/clean-articles.ts ./singlefile-downloads ./cleaned-articles

# Clean a single file
tsx scripts/clean-articles.ts ./raw/article.html ./clean/article.html
```

**What it does:**
- Removes ads, popups, cookie banners, and overlays using CSS selectors
- Extracts main article content using Mozilla Readability (same tech as Firefox Reader View)
- Generates clean, readable HTML with nice styling
- Preserves article images and links

### Option 2: Download with Built-in Cleaning

Download articles with Playwright for cleaner initial results:

```bash
# From a URLs file
tsx scripts/download-with-playwright.ts urls.txt ./playwright-downloads

# From inline URLs
tsx scripts/download-with-playwright.ts --urls "https://example.com,https://other.com" ./output
```

**What it does:**
- Blocks ads and trackers at network level (before they load)
- Automatically handles cookie banners, modals, and popups
- Waits for content to load properly
- Removes overlay elements
- Re-enables scrolling if blocked by modals

### Option 3: Combined Approach (Best Results)

For the cleanest results, use both:

```bash
# Step 1: Download with SingleFile or Playwright
tsx scripts/download-with-singlefile.ts urls.txt ./raw-downloads
# OR
tsx scripts/download-with-playwright.ts urls.txt ./raw-downloads

# Step 2: Clean the downloads
tsx scripts/clean-articles.ts ./raw-downloads ./clean-articles
```

## Working with Paywalled Content

If you have subscriptions to bypass paywalls:

### For Playwright (Recommended for paywalls)

You can add authentication by modifying `download-with-playwright.ts`:

```typescript
// Add this after creating context
await context.addCookies([
  {
    name: 'auth_token',
    value: 'your-token-here',
    domain: '.example.com',
    path: '/',
  },
]);

// Or login programmatically
await page.goto('https://example.com/login');
await page.fill('input[name="email"]', 'your@email.com');
await page.fill('input[name="password"]', 'your-password');
await page.click('button[type="submit"]');
await page.waitForNavigation();
```

### For SingleFile with Authentication

```bash
# Export cookies from your browser (use a browser extension like "EditThisCookie")
# Save cookies to a file: cookies.json

# Then modify download-with-singlefile.ts to use cookies
# (SingleFile supports --browser-cookie-file option)
```

## Example Workflows

### Workflow 1: News Articles

```bash
# Create a file with URLs
echo "https://example.com/article1" > news-urls.txt
echo "https://example.com/article2" >> news-urls.txt

# Download with Playwright (blocks ads)
tsx scripts/download-with-playwright.ts news-urls.txt ./raw

# Clean for maximum readability
tsx scripts/clean-articles.ts ./raw ./clean
```

### Workflow 2: Research Papers

```bash
# Download with SingleFile (better for complex layouts)
tsx scripts/download-with-singlefile.ts research-urls.txt ./raw

# Clean to extract main content
tsx scripts/clean-articles.ts ./raw ./clean
```

### Workflow 3: Bulk Processing

```bash
# Process hundreds of URLs
tsx scripts/download-with-playwright.ts large-url-list.txt ./raw
tsx scripts/clean-articles.ts ./raw ./clean

# The cleaned articles will be in ./clean
```

## Comparing the Scripts

| Feature | SingleFile | Playwright | Clean Articles |
|---------|-----------|------------|----------------|
| Preserves original styling | ✅ | ✅ | ❌ |
| Blocks ads at network level | ❌ | ✅ | N/A |
| Handles popups/modals | ❌ | ✅ | ✅ |
| Extracts main content only | ❌ | ❌ | ✅ |
| Works with paywalls | Limited | ✅ (with auth) | N/A |
| Speed | Fast | Slower | Fast |
| File size | Large | Large | Small |

## Tips

1. **For best quality**: Use Playwright to download, then clean with clean-articles.ts
2. **For speed**: Use SingleFile to download, then clean
3. **For paywalled content**: Use Playwright with authentication
4. **For many URLs**: Use concurrent downloads (adjust maxConcurrent in scripts)

## Customization

### Add More Ad Selectors

Edit `clean-articles.ts` and add to the `adSelectors` array:

```typescript
const adSelectors = [
  // Your custom selectors
  '.my-custom-ad-class',
  '#sidebar-ads',
  '[data-ad-type]',
  // ... existing selectors
];
```

### Block More Ad Domains

Edit `download-with-playwright.ts` and add to `AD_DOMAINS`:

```typescript
const AD_DOMAINS = [
  'your-ad-domain.com',
  'another-tracker.net',
  // ... existing domains
];
```

### Adjust Readability Settings

In `clean-articles.ts`, modify the Readability options:

```typescript
const reader = new Readability(document, {
  debug: false,
  keepClasses: false,
  charThreshold: 500, // Minimum content length
});
```

## Troubleshooting

**Problem**: "Failed to extract article content"
- **Solution**: The page might not have clear article structure. Try using Playwright to download first, or check if the content is behind JavaScript rendering.

**Problem**: "Too many elements removed"
- **Solution**: Some sites use common class names. Edit the selectors to be more specific.

**Problem**: "Playwright timeout"
- **Solution**: Increase timeout in the script: `timeout: 60000` (60 seconds)

**Problem**: "Images not loading in cleaned articles"
- **Solution**: Images should be preserved. If not, check if they're lazy-loaded or base64-encoded.
