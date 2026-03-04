import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    prompt, 
    slideNumber = 1, 
    context = '',
    theme = {}
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  console.log(`[generate-slide] Generating slide ${slideNumber}...`);

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

    const userPrompt = context 
      ? `${context}\n\nSlide ${slideNumber} requirements:\n${prompt}`
      : `Create slide ${slideNumber}:\n${prompt}`;

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 4096,
      temperature: 1.0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
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
    
    // Remove markdown code fences
    const codeBlockMatch = code.match(/```(?:typescript|tsx|ts|jsx|javascript)?\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      code = codeBlockMatch[1].trim();
    }

    // Validate that the code starts with export
    if (!code.startsWith('export default function')) {
      console.warn('[generate-slide] Response does not start with expected export statement');
      console.warn('[generate-slide] Raw response:', responseText.substring(0, 200));
    }

    console.log(`[generate-slide] Successfully generated slide ${slideNumber} (${code.length} chars)`);

    return res.status(200).json({
      code,
      slideNumber,
      theme: theme,
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
