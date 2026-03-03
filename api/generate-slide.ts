import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, slideNumber = 1, context = '' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  console.log(`[generate-slide] Generating slide ${slideNumber}...`);

  try {
    const systemPrompt = `You are an expert at creating beautiful, professional presentation slides using React and TypeScript.

Generate a SINGLE slide component based on the user's description. Follow these rules:

1. Export format: Always use "export default function Slide${slideNumber}() { ... }"
2. Use inline styles with style={{ ... }} - no CSS files or styled-components
3. Use modern, clean, professional design principles
4. The slide dimensions are 1920x1080 (16:9 aspect ratio)
5. Wrap everything in a container div with full dimensions
6. Use appropriate typography, spacing, and color schemes
7. Only return the code - no explanations, no markdown code fences, no additional text
8. The code should be production-ready and immediately executable
9. Use semantic HTML and proper React patterns
10. Include proper TypeScript types if needed

IMPORTANT: Return ONLY the TypeScript code. Do not wrap it in markdown code blocks. Start directly with "export default function".

Example output format:
export default function Slide${slideNumber}() {
  return (
    <div style={{
      width: '1920px',
      height: '1080px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: "'Inter', sans-serif",
      color: '#ffffff',
      padding: '80px'
    }}>
      <h1 style={{ fontSize: '72px', marginBottom: '40px', fontWeight: 'bold' }}>
        Your Title Here
      </h1>
      <p style={{ fontSize: '32px', textAlign: 'center', maxWidth: '1200px' }}>
        Your content here
      </p>
    </div>
  );
}`;

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
