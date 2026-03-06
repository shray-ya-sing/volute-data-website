import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseComponentToSlideSchema } from './lib/slide-parser';

// Vercel timeout handling
export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    /** The TypeScript/TSX source code for a single slide component */
    code,
    /** 1-based slide index — passed through to the response for Redux storage */
    slideNumber = 1,
    /** Optional: directly call C# API and return PPTX bytes */
    exportToPptx = false,
    /** Optional: C# API URL */
    csharpApiUrl = 'http://localhost:5000/api/presentation/export',
  } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: '`code` (string) is required' });
  }

  console.log(`[parse-slide] Parsing slide ${slideNumber} (${code.length} chars)...`);

  try {
    // Parse the TypeScript/React component to SlideSchema JSON
    const slideSchema = parseComponentToSlideSchema(code);

    console.log(`[parse-slide] Successfully parsed slide ${slideNumber}`);

    // If exportToPptx is true, call C# API and return PPTX bytes
    if (exportToPptx) {
      console.log(`[parse-slide] Calling C# API at ${csharpApiUrl}`);

      const response = await fetch(csharpApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slideJsonArray: [slideSchema],
          presentationName: `Slide_${slideNumber}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`C# API returned ${response.status}: ${response.statusText}`);
      }

      const pptxBytes = await response.arrayBuffer();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename="slide_${slideNumber}.pptx"`);

      return res.status(200).send(Buffer.from(pptxBytes));
    }

    // Otherwise, just return the parsed JSON
    return res.status(200).json({
      slideNumber,
      slideJson: slideSchema,
    });

  } catch (error: any) {
    console.error('[parse-slide] Error:', error.message);
    console.error('[parse-slide] Stack:', error.stack);

    return res.status(500).json({
      error: error.message,
      details: error.stack,
    });
  }
}
