#!/bin/bash
# Quick script to test the automated pipeline manually

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Automated 424B4 Pipeline${NC}\n"

# Check if CRON_SECRET and DOMAIN are set
if [ -z "$CRON_SECRET" ]; then
    echo -e "${RED}❌ CRON_SECRET not set${NC}"
    echo "Get it from: Vercel Dashboard → Settings → Environment Variables"
    echo "Then run: export CRON_SECRET=\"your_secret\""
    exit 1
fi

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ DOMAIN not set${NC}"
    echo "Example: export DOMAIN=\"your-app.vercel.app\""
    exit 1
fi

echo -e "${GREEN}✓ Configuration loaded${NC}"
echo "Domain: $DOMAIN"
echo ""

# Step 1: Check for new filings
echo -e "${BLUE}📡 Step 1: Checking for new 424B4 filings...${NC}"
response=$(curl -s -X GET "https://$DOMAIN/api/cron/check-new-filings" \
  -H "Authorization: Bearer $CRON_SECRET")

echo "$response" | jq '.'
new_filings=$(echo "$response" | jq -r '.newFilings // 0')

if [ "$new_filings" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $new_filings new filing(s)${NC}\n"
else
    echo -e "${YELLOW}⚠ No new filings found (they may already be in database)${NC}\n"
fi

# Wait a bit
sleep 3

# Step 2: Submit batch
echo -e "${BLUE}📤 Step 2: Submitting batch for processing...${NC}"
response=$(curl -s -X GET "https://$DOMAIN/api/cron/submit-batch" \
  -H "Authorization: Bearer $CRON_SECRET")

echo "$response" | jq '.'
batch_id=$(echo "$response" | jq -r '.batchId // "none"')
filing_count=$(echo "$response" | jq -r '.filingCount // 0')

if [ "$batch_id" != "none" ] && [ "$batch_id" != "null" ]; then
    echo -e "${GREEN}✓ Batch submitted: $batch_id${NC}"
    echo -e "${GREEN}✓ Processing $filing_count filing(s)${NC}\n"

    echo -e "${YELLOW}⏳ Batch is processing... This typically takes 30-90 minutes${NC}"
    echo -e "${YELLOW}   You can check status with: curl https://$DOMAIN/api/cron/status${NC}\n"
else
    echo -e "${YELLOW}⚠ No batch submitted (no filings ready)${NC}\n"
fi

# Step 3: Check batch status
echo -e "${BLUE}🔍 Step 3: Checking batch status...${NC}"
response=$(curl -s -X GET "https://$DOMAIN/api/cron/poll-batches" \
  -H "Authorization: Bearer $CRON_SECRET")

echo "$response" | jq '.'

# Step 4: Overall status
echo ""
echo -e "${BLUE}📊 Step 4: Overall pipeline status${NC}"
curl -s "https://$DOMAIN/api/cron/status" | jq '.'

echo ""
echo -e "${GREEN}✅ Test complete!${NC}\n"

echo -e "${BLUE}Next steps:${NC}"
echo "1. Check Vercel Blob: Dashboard → Storage → Blob → filings/424b4/"
echo "2. Check Neon Database: Run queries from TESTING_PIPELINE.md"
echo "3. Monitor logs: Vercel Dashboard → Functions → View logs"
echo "4. Wait 30-90 min for batch to complete, then run this script again"
echo ""
echo "Status dashboard: https://$DOMAIN/api/cron/status"
