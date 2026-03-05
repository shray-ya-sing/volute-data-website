import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
    /** The TypeScript/TSX source code for a single slide component */
    code,
    /** 1-based slide index — passed through to the response for Redux storage */
    slideNumber = 1,
  } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: '`code` (string) is required' });
  }

  console.log(`[slide-to-json] Converting slide ${slideNumber} (${code.length} chars)...`);

  const systemPrompt = `You are a slide-to-JSON compiler. You receive TypeScript/React slide component code and output a single JSON object that exactly conforms to the schema below. The JSON is consumed by a C# PresentationExporter which builds a native .pptx file — correctness of every field is critical.

## Your only output

A single valid JSON object. No explanation, no markdown fences, no preamble. Start the response with { and end it with }.

---

## Slide schema

\`\`\`
root
└── slide
    ├── width         long  (EMU)   9144000 = standard, 12192000 = widescreen 16:9
    ├── height        long  (EMU)   5143500 = standard, 6858000  = widescreen 16:9
    ├── background
    │   └── fill      FillDefinition
    └── elements[]    ElementDefinition
\`\`\`

### ElementDefinition — shared fields
| field    | type               | notes                                    |
|----------|--------------------|------------------------------------------|
| type     | string             | sp \| cxnSp \| chart \| table \| pic     |
| id       | int                | unique per slide, start at 2             |
| name     | string             | human-readable label                     |
| position | PositionDefinition | always required                          |

### PositionDefinition (all values in EMU)
| field | notes                          |
|-------|--------------------------------|
| x     | left edge from slide origin    |
| y     | top edge from slide origin     |
| cx    | width                          |
| cy    | height                         |

EMU reference: 1 inch = 914400 EMU. 1 px (at 96 dpi) = 9525 EMU. 1 pt = 12700 EMU.
The React canvas is 960×540 px. The slide canvas is 12192000×6858000 EMU (widescreen 16:9).
Pixel-to-EMU conversion: multiply every px value by 9525 (= 914400 / 96).

---

## Element type definitions

### sp — shape / text box
\`\`\`json
{
  "type": "sp",
  "id": 2,
  "name": "header-bg",
  "position": { "x": 0, "y": 0, "cx": 12192000, "cy": 685800 },
  "fill": { "type": "solid", "color": "1F2937" },
  "border": { "type": "none" },
  "text": {
    "body": {
      "anchor": "ctr",
      "autofit": false,
      "paragraphs": [
        {
          "alignment": "left",
          "lineSpacing": 0,
          "runs": [
            { "text": "Hello", "bold": true, "fontSize": 2400, "color": "FFFFFF" }
          ]
        }
      ]
    }
  }
}
\`\`\`

- fill.type: **solid** | **none**
- fill.color: 6-char hex, no #
- border.type: **solid** | **none**
- border.width: EMU (9525 = 0.75pt, 12700 = 1pt, 19050 = 1.5pt)
- text.body.anchor: **t** | **ctr** | **b**
- paragraph.alignment: **left** | **ctr** | **right**
- run.fontSize: **half-points** — multiply pt size by 100, or px ÷ 0.75 × 100. Examples: 14px → 1867, 14pt → 1400, 24pt → 2400, 36pt → 3600
- run.color: 6-char hex, no #
- run.baseline: 30000 = superscript, -25000 = subscript, 0 = normal (omit if 0)
- Omit bold/italic when false. Omit fontFace unless explicitly set. Omit lineSpacing when 0.

### cxnSp — connector / divider line
\`\`\`json
{
  "type": "cxnSp",
  "id": 3,
  "name": "divider",
  "position": { "x": 571500, "y": 342900, "cx": 11049000, "cy": 0 },
  "line": { "color": "374151", "width": 9525 },
  "headEnd": { "type": "none" },
  "tailEnd":  { "type": "none" }
}
\`\`\`
- line.width: EMU
- arrowEnd.type: **arrow** | **stealth** | **diamond** | **oval** | **block** | **none**

### chart
\`\`\`json
{
  "type": "chart",
  "id": 4,
  "name": "revenue-chart",
  "position": { "x": 571500, "y": 1143000, "cx": 11049000, "cy": 4800600 },
  "chartType": "lineChart",
  "plotArea": { "fill": { "type": "solid", "color": "1F2937" } },
  "series": [
    {
      "name": "Revenue",
      "color": "3B82F6",
      "smooth": false,
      "markerSize": 5,
      "markerColor": "3B82F6",
      "points": [
        { "label": "Q1", "value": 4.2 },
        { "label": "Q2", "value": 5.8 }
      ]
    }
  ],
  "axes": {
    "catAx": { "visible": true, "labelColor": "9CA3AF", "labelFontSize": 800 },
    "valAx": { "visible": true, "labelColor": "9CA3AF", "labelFontSize": 800, "min": 0, "gridLine": { "type": "none" } }
  },
  "legend": { "visible": true, "position": "b" },
  "dataLabels": { "visible": false }
}
\`\`\`
- chartType: **lineChart** | **barChart**
- barDir: **col** | **bar** (barChart only)
- labelFontSize: half-points
- gridLine.type: **solid** | **none**

### table
\`\`\`json
{
  "type": "table",
  "id": 5,
  "name": "data-table",
  "position": { "x": 571500, "y": 1371600, "cx": 11049000, "cy": 4572000 },
  "columns": [
    { "width": 3683000 },
    { "width": 3683000 },
    { "width": 3683000 }
  ],
  "rows": [
    {
      "height": 457200,
      "cells": [
        { "text": "Label", "bold": true, "fontSize": 800, "color": "FFFFFF", "fill": { "type": "solid", "color": "1F2937" }, "alignment": "left" },
        { "text": "Value", "bold": true, "fontSize": 800, "color": "FFFFFF", "fill": { "type": "solid", "color": "1F2937" }, "alignment": "right" },
        { "text": "Change", "bold": true, "fontSize": 800, "color": "FFFFFF", "fill": { "type": "solid", "color": "1F2937" }, "alignment": "right" }
      ]
    }
  ]
}
\`\`\`
- column count must match cell count in every row
- cell.fontSize: half-points
- cell.alignment: **left** | **ctr** | **right**

---

## Translation rules

### Coordinate conversion
- The React canvas is 960px × 540px. The target slide is 12192000 × 6858000 EMU (widescreen 16:9).
- Convert every px value to EMU: multiply by 9525.
  - left: 60px → x: 571500
  - top: 140px → y: 1333500
  - width: 840px → cx: 7999200 (but check: 960px wide canvas → 9144000 EMU, so scale = 9144000/960 = 9525 exactly)
- For values expressed as percentages of the 960px canvas, resolve to px first, then multiply by 9525.

### Colour conversion
- Strip all # prefixes. Convert to 6-char uppercase hex.
- Tailwind → hex reference:
  - gray-950=030712, gray-900=111827, gray-800=1F2937, gray-700=374151, gray-600=4B5563
  - gray-500=6B7280, gray-400=9CA3AF, gray-300=D1D5DB, gray-200=E5E7EB, gray-100=F3F4F6
  - white=FFFFFF, black=000000
  - blue-600=2563EB, blue-500=3B82F6, blue-400=60A5FA, blue-300=93C5FD
  - green-500=22C55E, green-400=4ADE80, red-500=EF4444, red-400=F87171
  - yellow-500=EAB308, yellow-400=FACC15, purple-500=A855F7, indigo-500=6366F1
- For hex colours with opacity suffix (e.g. accentColors[0] + '20'), resolve the opacity separately — do not include it in the color field; instead emit the base 6-char hex and note that opacity is handled by the element's fill.
- For rgba() values, convert to the nearest opaque hex (ignore alpha).

### Font sizes
- All fontSize fields are in **half-points**: multiply pt size by 100.
- px → half-points: (px ÷ 0.75) × 100. Examples: 12px → 1600, 14px → 1867 (round to 1800), 16px → 2133 (round to 2100), 18px → 2400, 24px → 3200, 32px → 4267 (round to 4300), 36px → 4800.
- When font size is derived from a prop (e.g. headingFontSize * 0.7), evaluate the expression using the default value headingFontSize=36 unless a theme was provided.

### Element type mapping
| React element                                   | JSON type |
|-------------------------------------------------|-----------|
| div/span with background-color or border        | sp        |
| div/span text-only (no background)              | sp with fill: none |
| hr, or div used purely as a horizontal rule     | cxnSp     |
| Recharts LineChart                              | chart, chartType: lineChart |
| Recharts BarChart                               | chart, chartType: barChart |
| table / thead / tbody                           | table     |
| img                                             | pic       |

### Text extraction
- Each visually distinct styled span or text node becomes its own RunDefinition.
- A CSS line break or <br/> becomes a new ParagraphDefinition.
- Preserve all text content exactly — do not paraphrase or summarise.
- When text is split across multiple styled spans within the same line, group them as runs in a single paragraph.

### Charts
- Extract the data array from the Recharts data prop. Map each item to a DataPoint with label and value.
- Each <Line> or <Bar> child → one SeriesDefinition. Map stroke/fill to color.
- <XAxis dataKey="..."> → catAx labels come from that key on the data objects.
- <YAxis domain={[0, max]}> → valAx min/max.
- <CartesianGrid> present → gridLine: solid. Absent → gridLine: none.
- <Legend> present → legend.visible: true.
- <Tooltip> only → do not emit dataLabels.

### Tables
- Map each <th>/<td> to a CellDefinition.
- Map borderBottom/borderRight styles to the nearest border definition.
- Preserve header row fill separately from body row fill.

### Z-order
- Emit elements in the same order as in the React tree (top to bottom = back to front in PowerPoint).

### What to omit
- Omit any field that equals its default/zero value (e.g. bold: false, baseline: 0, lineSpacing: 0).
- Omit wrapper divs that have no visual output (no background, no border, no text).
- Omit imageData on pic elements (the caller will supply image bytes separately).
- Omit elements that are purely invisible (opacity: 0, display: none, etc).

---

## Validation — apply before outputting

1. Every element has a unique id starting at 2.
2. Every position has non-zero cx and cy (except cxnSp dividers where cy=0 is valid).
3. All color values are 6-char uppercase hex with no #.
4. All font sizes are in half-points (a 14pt label = 1400).
5. All positions/sizes are in EMU.
6. Chart elements have at least one series with at least one point.
7. Table elements: column count = cell count in every row.
8. Root object has exactly one "slide" key.
9. No JSON syntax errors — all strings quoted, no trailing commas.`;

  try {
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      temperature: 0,  // Deterministic — we want exact schema compliance, not creativity
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Convert this slide component to JSON:\n\n${code}`,
        },
      ],
    });

    const message = await stream.finalMessage();

    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => ('text' in block ? block.text : ''))
      .join('\n')
      .trim();

    // Strip markdown fences if the model added them despite instructions
    let jsonText = responseText;
    const fenceMatch = jsonText.match(/```(?:json)?\n?([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }

    // Validate it parses before sending
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError: any) {
      console.error(`[slide-to-json] JSON parse failed for slide ${slideNumber}:`, parseError.message);
      console.error('[slide-to-json] Raw response:', jsonText.substring(0, 500));
      return res.status(500).json({
        error: 'Model output was not valid JSON.',
        details: parseError.message,
        raw: jsonText.substring(0, 1000),
      });
    }

    console.log(`[slide-to-json] Successfully converted slide ${slideNumber} (${jsonText.length} chars)`);

    return res.status(200).json({
      slideNumber,
      slideJson: parsed,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });

  } catch (error: any) {
    console.error('[slide-to-json] Error:', error.message);
    return res.status(500).json({
      error: error.message,
      details: error.stack,
    });
  }
}