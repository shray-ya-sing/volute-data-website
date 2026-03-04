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

// Vercel timeout handling - allows up to 5 minutes for generation (requires Pro or higher)
export const config = {
  maxDuration: 300,
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
Theme Properties (use these as props — font sizes are NUMBERS, not strings):
- headingFont: "${theme.headingFont || "'Inter', sans-serif"}" (for titles and headings)
- bodyFont: "${theme.bodyFont || "'Inter', sans-serif"}" (for body text and paragraphs)
- accentColors: ${JSON.stringify(theme.accentColors || ['#667eea', '#764ba2'])} (array of accent colors for highlights, buttons, etc.)
- headingTextColor: "${theme.headingTextColor || '#000000'}" (color for heading text)
- bodyTextColor: "${theme.bodyTextColor || '#333333'}" (color for body text)
- headingFontSize: ${theme.headingFontSize || 36} (number — base px size for main headings, render as \`\${headingFontSize}px\`)
- bodyFontSize: ${theme.bodyFontSize || 14} (number — base px size for body text, render as \`\${bodyFontSize}px\`)`;

    const systemPrompt = `You are an expert at creating beautiful, professional presentation slides using React and TypeScript.

## Canvas Specification

**CRITICAL: Every slide MUST be exactly 960px × 540px (16:9 aspect ratio)**

\`\`\`tsx
<div style={{
  width: '960px',
  height: '540px',
  position: 'relative',
  overflow: 'hidden',
  fontFamily: bodyFont
}}>
  {/* ALL children use position: 'absolute' */}
</div>
\`\`\`

## Component Requirements

Generate a React component with this exact TypeScript interface:

\`\`\`tsx
import React from 'react';

interface SlideProps {
  headingFont: string;
  bodyFont: string;
  accentColors: string[];
  headingTextColor: string;
  bodyTextColor: string;
  headingFontSize: number;
  bodyFontSize: number;
}

export default function Slide${slideNumber}({
  headingFont,
  bodyFont,
  accentColors,
  headingTextColor,
  bodyTextColor,
  headingFontSize,
  bodyFontSize,
}: SlideProps) { ... }
\`\`\`

${themePropsDoc}

## Layout Rules — READ CAREFULLY

### 1. Root Container (MANDATORY)
- width: '960px', height: '540px'
- position: 'relative'
- overflow: 'hidden'
- Sets default fontFamily: bodyFont

### 2. ALL Child Elements (MANDATORY)
- MUST use position: 'absolute'
- MUST specify top, left, width, and height in pixels
- MUST NOT exceed canvas bounds (960px wide, 540px tall)
- DO NOT use flexbox, grid, or relative positioning on any element

### 3. Safe Zones
- Title area: top: 40–80px, left: 60px, width: 840px
- Content area: top: 140px, left: 60px, width: 840px, height: 340px
- Footer: top: 500px, left: 60px, width: 840px

### 4. Typography Scaling (font sizes are numbers)
\`\`\`tsx
const h1Size = headingFontSize;           // e.g. 36
const h2Size = headingFontSize * 0.7;     // e.g. ~25
const h3Size = headingFontSize * 0.5;     // e.g. 18
const bodySize = bodyFontSize;            // e.g. 14
const smallSize = bodyFontSize * 0.875;   // e.g. ~12

// Always render as:
fontSize: \`\${h1Size}px\`
\`\`\`

### 5. Styling Rules
- Use theme props for ALL fonts, colors, and sizes — never hardcode
- Headings: headingFont, headingTextColor, headingFontSize
- Body text: bodyFont, bodyTextColor, bodyFontSize
- Accents: accentColors[0] (primary), accentColors[1–5] (secondary)
- Transparency: template literal e.g. \`\${accentColors[0]}20\` for 20% opacity hex suffix

## Multi-Column Layouts

For 2-column layouts, calculate pixel widths explicitly:
\`\`\`tsx
// Two equal columns with gap, within 840px content width
const colWidth = 400;  // (840 - 40px gap) / 2
const col1Left = 60;
const col2Left = 60 + colWidth + 40;  // = 500

<div style={{ position: 'absolute', top: '140px', left: \`\${col1Left}px\`, width: \`\${colWidth}px\`, height: '340px' }}>
  {/* column 1 content */}
</div>
<div style={{ position: 'absolute', top: '140px', left: \`\${col2Left}px\`, width: \`\${colWidth}px\`, height: '340px' }}>
  {/* column 2 content */}
</div>
\`\`\`

## Charts (recharts)

Chart containers MUST have fixed pixel dimensions — never use percentages:
\`\`\`tsx
// CORRECT
<div style={{ position: 'absolute', top: '120px', left: '60px', width: '840px', height: '370px' }}>
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>...</BarChart>
  </ResponsiveContainer>
</div>

// WRONG — do not do this
<ResponsiveContainer width="100%" height={300}>
\`\`\`

## Tables

Position tables absolutely. Use fixed column widths and compact padding for data-dense slides:
\`\`\`tsx
<div style={{ position: 'absolute', top: '140px', left: '60px', width: '840px', height: '340px', overflow: 'hidden' }}>
  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
    <thead>
      <tr>
        <th style={{ fontFamily: headingFont, fontSize: \`\${bodyFontSize * 0.85}px\`, textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #333' }}>Label</th>
        <th style={{ fontFamily: headingFont, fontSize: \`\${bodyFontSize * 0.85}px\`, textAlign: 'right', padding: '6px 8px', borderBottom: '2px solid #333' }}>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style={{ fontFamily: bodyFont, fontSize: \`\${bodyFontSize * 0.8}px\`, padding: '4px 8px' }}>Row</td>
        <td style={{ fontFamily: bodyFont, fontSize: \`\${bodyFontSize * 0.8}px\`, textAlign: 'right', padding: '4px 8px' }}>$1,234</td>
      </tr>
    </tbody>
  </table>
</div>
\`\`\`

## Common Mistakes to AVOID

❌ Using flexbox or grid on the root or major layout containers
❌ Using height: '100%' or width: '100%' on absolutely positioned children
❌ Omitting width or height on any absolutely positioned element
❌ Exceeding 960px width or 540px height with any element
❌ Hardcoding font sizes as strings like '16px' — use \`\${bodyFontSize}px\`
❌ Importing any package other than lucide-react and recharts

✅ Every element: position absolute, explicit top/left/width/height in px
✅ Font sizes: always \`\${headingFontSize}px\` or \`\${bodyFontSize * 0.8}px\` etc.
✅ Root div: exactly 960×540, position relative, overflow hidden

## Available Dependencies (USE ONLY THESE)

- lucide-react — icons: \`import { TrendingUp } from 'lucide-react'\`
- recharts — charts: \`import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'\`

DO NOT import any other packages. DO NOT use external images or assets.

## Output Requirements

- Return ONLY the TypeScript/TSX code — no markdown fences, no explanations
- Start directly with import statements or the export default function
- Code must be production-ready and immediately executable
- Use inline styles only — no CSS files, no styled-components, no Tailwind

## Citation Markers

If the user's prompt contains citation markers in the format [cite:N] or [cite:N,M]:
- Render them as small interactive badges positioned near the cited data
- Use this pattern for each citation:

\`\`\`tsx
<span
  data-citation="1"
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: accentColors[0] + '20',
    color: accentColors[0],
    fontSize: '9px',
    fontWeight: 700,
    fontFamily: bodyFont,
    cursor: 'pointer',
    marginLeft: '2px',
    verticalAlign: 'super',
    lineHeight: 1,
  }}
>
  1
</span>
\`\`\`

- For multiple citations [cite:1,3], render adjacent badges
- Place citation badges inline right after the specific number or fact they cite
- The data-citation attribute MUST contain the citation number as a string
- Keep badges small (16x16px) so they don't disrupt the layout
- Use accentColors[0] with 20% opacity for the badge background


Now generate the slide component based on the user's request.`;

    const userPromptText = context
      ? `${context}\n\nSlide ${slideNumber} requirements:\n${prompt}`
      : `Create slide ${slideNumber}:\n${prompt}`;

    // Build the content array — images first, then text prompt.
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

    // Use streaming to avoid SDK timeout on large outputs (>10 min threshold)
    const stream = await anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 25000,
      temperature: 1.0,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' }, // Cache system prompt to reduce input token costs on repeat requests
        },
      ],
      messages: [{ role: 'user', content: userContent }],
    });

    const message = await stream.finalMessage();

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

    // Detect truncation — a complete component always ends with a closing brace
    if (!code.trimEnd().endsWith('}')) {
      console.error(`[generate-slide] WARNING: Output appears truncated! Last 100 chars: ${code.slice(-100)}`);
      return res.status(500).json({
        error: 'Generated code was truncated. Try simplifying the slide or increasing max_tokens.',
        truncated: true,
      });
    }

    if (!code.startsWith('export default function') && !code.startsWith('import')) {
      console.warn('[generate-slide] Response does not start with expected export/import statement');
      console.warn('[generate-slide] Raw response:', responseText.substring(0, 200));
    }

    // Log code in chunks to avoid Vercel log line truncation
    const CHUNK_SIZE = 500;
    const totalChunks = Math.ceil(code.length / CHUNK_SIZE);
    console.log(`[generate-slide] Code output (${code.length} chars, ${totalChunks} chunks):`);
    for (let i = 0; i < totalChunks; i++) {
      console.log(`[chunk ${i + 1}/${totalChunks}]\n${code.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)}`);
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
