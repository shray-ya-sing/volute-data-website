/**
 * Screenshot capture utility
 * 
 * In production, this will call an endpoint that takes screenshots of URLs.
 * For now, we use a mock implementation.
 */

interface ScreenshotRequest {
  url: string;
  dataPointId: string;
  label: string;
  value: string;
  snippets?: string[];
}

interface ScreenshotResponse {
  url: string;
  screenshotDataUrl: string;
  timestamp: number;
}

/**
 * Mock screenshot capture - simulates API call
 * In production, replace this with actual API call
 */
async function mockCaptureScreenshot(url: string): Promise<string> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
  
  // Return a placeholder screenshot (1x1 pixel data URL with a color derived from URL)
  // In production, this would be actual screenshot data
  const hash = url.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  
  // Create a simple colored rectangle as placeholder
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 800);
    gradient.addColorStop(0, `hsl(${hue}, 70%, 95%)`);
    gradient.addColorStop(1, `hsl(${hue}, 60%, 85%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 800);
    
    // Add some visual elements to simulate a webpage
    ctx.fillStyle = `hsl(${hue}, 50%, 60%)`;
    ctx.fillRect(0, 0, 1200, 60);
    
    // Add URL text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px system-ui';
    ctx.fillText(new URL(url).hostname, 20, 35);
    
    // Add some content blocks
    ctx.fillStyle = `hsl(${hue}, 40%, 90%)`;
    ctx.fillRect(40, 100, 520, 200);
    ctx.fillRect(600, 100, 560, 200);
    ctx.fillRect(40, 340, 1120, 400);
    
    // Add text label
    ctx.fillStyle = `hsl(${hue}, 30%, 40%)`;
    ctx.font = '14px system-ui';
    ctx.fillText('Screenshot Preview', 40, 780);
  }
  
  return canvas.toDataURL('image/png');
}

/**
 * Capture screenshots for multiple URLs
 * 
 * @param requests - Array of screenshot requests with URLs and metadata
 * @returns Map of URL to screenshot data URL
 */
export async function captureScreenshots(
  requests: ScreenshotRequest[]
): Promise<Record<string, string>> {
  console.log(`[captureScreenshots] Capturing ${requests.length} screenshots...`);
  
  const screenshots: Record<string, string> = {};
  
  // In production, this would be a single API call with all URLs
  // For now, we simulate individual captures
  await Promise.all(
    requests.map(async (request) => {
      try {
        // TODO: Replace with actual API call
        // const response = await fetch('/api/screenshots', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     url: request.url,
        //     dataPointId: request.dataPointId,
        //     label: request.label,
        //     value: request.value,
        //     snippets: request.snippets,
        //   }),
        // });
        // const data = await response.json();
        // screenshots[request.url] = data.screenshotDataUrl;
        
        const screenshotDataUrl = await mockCaptureScreenshot(request.url);
        screenshots[request.url] = screenshotDataUrl;
        
        console.log(`[captureScreenshots] ✓ Captured screenshot for ${request.url}`);
      } catch (error) {
        console.warn(`[captureScreenshots] Failed to capture ${request.url}:`, error);
      }
    })
  );
  
  console.log(`[captureScreenshots] Completed: ${Object.keys(screenshots).length}/${requests.length} successful`);
  
  return screenshots;
}

/**
 * Capture screenshots for a single data point's source URLs
 */
export async function captureDataPointScreenshots(
  dataPointId: string,
  label: string,
  value: string,
  sourceUrls: string[]
): Promise<Record<string, string>> {
  const requests: ScreenshotRequest[] = sourceUrls.map(url => ({
    url,
    dataPointId,
    label,
    value,
  }));
  
  return captureScreenshots(requests);
}
