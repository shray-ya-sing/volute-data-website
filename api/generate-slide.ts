import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

interface ImageInput {
  /** Base64-encoded image data (without the data URI prefix) */
  data: string;
  /** MIME type of the image */
  mediaType?: SupportedMediaType;
}

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
    prompt, 
    slideNumber = 1, 
    context = '',
    theme = {},
    /**
     * Optional array of images to include in the prompt.
     * Each image should be a base64-encoded string (with or without the
     * "data:<mediaType>;base64," prefix — both are handled).
     *
     * Example:
     *   images: [
     *     { data: "<base64string>", mediaType: "image/png" },
     *     { data: "data:image/jpeg;base64,<base64string>" }   // prefix auto-stripped
     *   ]
     */
    images = [] as ImageInput[],
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Validate images array
  if (!Array.isArray(images)) {
    return res.status(400).json({ error: '`images` must be an array' });
  }

  const SUPPORTED_MEDIA_TYPES: SupportedMediaType[] = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  console.log(`[generate-slide] Generating slide ${slideNumber} with ${images.length} image(s)...`);

  try {
    // Build theme props documentation for the prompt
    const themePropsDoc = `
Theme Properties (use these as props):
- headingFont: "${theme.headingFont || "'Inter', sans-serif"}" (for titles and headings)
- bodyFont: "${theme.bodyFont || "'Inter', sans-serif"}" (for body text and paragraphs)
- accentColors: ${JSON.stringify(theme.accentColors || ['#667eea', '#764ba2'])} (array of accent colors for highlights, buttons, etc.)
- headingTextColor: "${theme.headingTextColor || '#000000'}" (color for heading text)
- bodyTextColor: "${theme.bodyTextColor || '#333333'}" (color for body text)
- headingFontSize: "${theme.headingFontSize || '72px'}" (base size for main headings)
- bodyFontSize: "${theme.bodyFontSize || '24px'}" (base size for body text)`;

    const systemPrompt = `You are an expert at creating beautiful, professional presentation slides using React and TypeScript.

## Component Requirements

CRITICAL: Generate a React component that accepts theme props:
{ headingFont, bodyFont, accentColors, headingTextColor, bodyTextColor, headingFontSize, bodyFontSize }
${themePropsDoc}

## Styling Rules

1. **CRITICAL: Use theme props for ALL styling** - Never hardcode fonts, colors, or sizes
   - Headings: Use headingFont, headingTextColor, headingFontSize
   - Body text: Use bodyFont, bodyTextColor, bodyFontSize
   - Accents: Use accentColors[0-5] for backgrounds, borders, icons

2. **Font Size Scaling:**
   - h1: headingFontSize (base)
   - h2: calc(headingFontSize * 0.7) or use template literals
   - h3: calc(headingFontSize * 0.5) or use template literals
   - p: bodyFontSize (base)
   - small: calc(bodyFontSize * 0.875) or use template literals

3. **Color Usage:**
   - Primary headings → headingTextColor
   - Body/paragraphs → bodyTextColor
   - Highlights/accents → accentColors[0] (primary accent)
   - Secondary accents → accentColors[1-5]
   - For transparency: Use template literals like \${accentColors[0]}15 for 15% opacity

4. **Layout:**
   - Container: width: '100%', height: '100%' (not fixed 1920x1080)
   - Use flexbox for layouts
   - Standard padding: '48px'

## Available Dependencies (USE ONLY THESE)

- lucide-react - For icons (import { IconName } from 'lucide-react')
- recharts - For charts (BarChart, LineChart, PieChart, AreaChart, etc.)

DO NOT import any other packages. DO NOT use external images or assets.

## Output Requirements

- Return ONLY the TypeScript code
- NO markdown code blocks, NO explanations, NO additional text
- Start directly with import statements (if needed) or export default function
- The code must be production-ready and immediately executable
- Use inline styles only - no CSS files or styled-components

## Example Output Format:

import { TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function Slide${slideNumber}({ 
  headingFont, 
  bodyFont, 
  accentColors, 
  headingTextColor,
  bodyTextColor,
  headingFontSize,
  bodyFontSize 
}) {
  const data = [
    { name: 'Q1', value: 4000 },
    { name: 'Q2', value: 5000 }
  ];

  return (
    <div style={{
      width: '100%',
      height: '100%',
      fontFamily: bodyFont,
      padding: '48px',
      backgroundColor: '#ffffff'
    }}>
      <h1 style={{
        fontFamily: headingFont,
        fontSize: headingFontSize,
        color: headingTextColor,
        marginBottom: '32px'
      }}>
        Revenue Growth
      </h1>

      <div style={{
        padding: '24px',
        backgroundColor: \`\${accentColors[0]}15\`,
        borderLeft: \`4px solid \${accentColors[0]}\`,
        borderRadius: '8px'
      }}>
        <TrendingUp size={32} color={accentColors[0]} />
        <p style={{
          fontFamily: bodyFont,
          fontSize: bodyFontSize,
          color: bodyTextColor
        }}>
          25% Growth
        </p>
      </div>

      <BarChart width={800} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill={accentColors[0]} />
      </BarChart>
    </div>
  );
}

Now generate the slide component based on the user's request.`;

    const userPromptText = context 
      ? `${context}\n\nSlide ${slideNumber} requirements:\n${prompt}`
      : `Create slide ${slideNumber}:\n${prompt}`;

    // Build the content array — start with any images, then the text prompt.
    // Placing images before the text gives Claude visual context before reading instructions.
    const userContent: Anthropic.MessageParam['content'] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];

      // Strip data URI prefix if present, e.g. "data:image/png;base64,<data>"
      let rawBase64 = img.data;
      let detectedMediaType: SupportedMediaType | undefined;

      const dataUriMatch = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUriMatch) {
        detectedMediaType = dataUriMatch[1] as SupportedMediaType;
        rawBase64 = dataUriMatch[2];
      }

      const mediaType: SupportedMediaType = img.mediaType ?? detectedMediaType ?? 'image/png';

      if (!SUPPORTED_MEDIA_TYPES.includes(mediaType)) {
        return res.status(400).json({
          error: `Unsupported media type "${mediaType}" for image at index ${i}. Supported types: ${SUPPORTED_MEDIA_TYPES.join(', ')}`,
        });
      }

      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: rawBase64,
        },
      });

      console.log(`[generate-slide] Added image ${i + 1}/${images.length} (${mediaType}, ${rawBase64.length} base64 chars)`);
    }

    // Append the text prompt after all images
    userContent.push({
      type: 'text',
      text: userPromptText,
    });

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 4096,
      temperature: 1.0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
    });

    // Extract the code from the response
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => 'text' in block ? block.text : '')
      .join('\n')
      .trim();

    // Clean up response - remove markdown code fences if Claude added them anyway
    let code = responseText;
    
    const codeBlockMatch = code.match(/```(?:typescript|tsx|ts|jsx|javascript)?\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      code = codeBlockMatch[1].trim();
    }

    // Log code in chunks to avoid truncation in Vercel logs
    const CHUNK_SIZE = 500;
    const chunks = Math.ceil(code.length / CHUNK_SIZE);
    console.log(`[generate-slide] Code output (${code.length} chars, ${chunks} chunks):`);
    for (let i = 0; i < chunks; i++) {
      console.log(`[chunk ${i + 1}/${chunks}]\n${code.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)}`);
    }

    if (!code.startsWith('export default function') && !code.startsWith('import')) {
      console.warn('[generate-slide] Response does not start with expected export/import statement');
      console.warn('[generate-slide] Raw response:', responseText.substring(0, 200));
    }

    console.log(`[generate-slide] Successfully generated slide ${slideNumber} (${code.length} chars)`);

    return res.status(200).json({
      code,
      slideNumber,
      theme,
      imageCount: images.length,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });

  } catch (error: any) {
    console.error('[generate-slide] Error:', error.message);
    return res.status(500).json({ 
      error: error.message,
      details: error.stack,
    });
  }
}