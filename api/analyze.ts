import { Sandbox } from '@vercel/sandbox';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import ms from 'ms';
import path from 'path';

const activeSandboxes = new Set<string>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { query, sandboxId, action } = req.body;
  const requestId = Math.random().toString(36).substring(7);

  console.log(`\n[${requestId}] 🚀 New Request: "${query?.substring(0, 30)}..."`);
  console.time(`[${requestId}] Total Duration`);

  try {
    // --- SHUTDOWN LOGIC ---
    if (action === 'shutdown' && sandboxId) {
      console.log(`[${requestId}] 🛑 Shutting down sandbox: ${sandboxId}`);
      const sandboxToClose = await Sandbox.get({ sandboxId });
      await sandboxToClose.stop();
      activeSandboxes.delete(sandboxId);
      return res.status(200).json({ message: `Sandbox ${sandboxId} terminated.` });
    }

    if (action === 'shutdown_all') {
      console.log(`[Cleanup] Shutting down ${activeSandboxes.size} sandboxes...`);
      const tasks = Array.from(activeSandboxes).map(async (id) => {
        try {
          const sbx = await Sandbox.get({ sandboxId: id });
          await sbx.stop();
          activeSandboxes.delete(id);
        } catch (e) {
          console.error(`Failed to stop ${id}`);
        }
      });
      await Promise.all(tasks);
      return res.status(200).json({ message: "All tracked sandboxes terminated." });
    }

    // --- SANDBOX INITIALIZATION ---
    let sandbox;
    if (sandboxId) {
      console.log(`[${requestId}] 🔗 Reconnecting to Sandbox: ${sandboxId}`);
      sandbox = await Sandbox.get({ sandboxId });
      activeSandboxes.add(sandbox.sandboxId);
    } else {
      console.log(`[${requestId}] 🔨 Creating New Sandbox...`);
      sandbox = await Sandbox.create({
        resources: { vcpus: 4 },
        timeout: ms('5m'),
        runtime: 'node22',
      });
      activeSandboxes.add(sandbox.sandboxId);

      console.group(`[${requestId}] 📦 Initialization`);
      
      // Install Node.js dependencies
      console.log('Installing Node.js dependencies...');
      const installNode = await sandbox.runCommand({
        cmd: 'npm',
        args: ['install', '@anthropic-ai/sdk'],
      });
      
      if (installNode.exitCode !== 0) {
        const installErr = await installNode.stderr();
        throw new Error(`Node installation failed: ${installErr}`);
      }
      console.log('✓ Node.js SDK installed');

      // Install Python and pip properly
      console.log('Installing Python and pip...');
      const installPython = await sandbox.runCommand({
        cmd: 'apt-get',
        args: ['update', '&&', 'apt-get', 'install', '-y', 'python3', 'python3-pip'],
        sudo: true,
      });
      
      // Alternative: Try installing python3-pip directly
      const installPip = await sandbox.runCommand({
        cmd: 'bash',
        args: ['-c', 'curl -sS https://bootstrap.pypa.io/get-pip.py | python3 -'],
        sudo: true,
      });
      
      console.log('✓ Python setup complete');

      // Install python-pptx
      console.log('Installing python-pptx...');
      const installPptx = await sandbox.runCommand({
        cmd: 'python3',
        args: ['-m', 'pip', 'install', '--user', 'python-pptx'],
      });
      
      if (installPptx.exitCode !== 0) {
        const pptxErr = await installPptx.stderr();
        console.warn('python-pptx installation output:', pptxErr);
      }
      console.log('✓ python-pptx installed');

      // Create output directory
      await sandbox.runCommand({
        cmd: 'mkdir',
        args: ['-p', '/vercel/sandbox/output'],
      });

      // --- AGENT SCRIPT WITH PYTHON POWERPOINT TOOL ---
      const agentScript = `
import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Track all sources globally
const sourcesMap = {};
let citationCounter = 1;

// Tool: Vector Search with source tracking
async function vectorSearch(query) {
  console.error(JSON.stringify({ type: 'tool_call', tool: 'vectorSearch', query }));
  
  try {
    const response = await fetch('https://getvolute.com/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK: 10, rerank: true })
    });

    if (!response.ok) {
      throw new Error(\`Search API returned \${response.status}\`);
    }

    const result = await response.json();
    
    // Track sources with citation IDs
    const searchResults = result.results || [];
    const startCitation = citationCounter;
    
    searchResults.forEach((item, idx) => {
      const citationId = citationCounter++;
      sourcesMap[citationId] = {
        url: item.metadata?.url || item.url || '',
        title: item.metadata?.title || item.title || 'Untitled',
        score: item.score || 0,
        textPreview: (item.metadata?.text_preview || '').substring(0, 300),
        searchQuery: query
      };
    });
    
    // Format results with citation numbers for Claude
    const formattedResults = searchResults.map((item, idx) => {
      const citationId = startCitation + idx;
      return \`[Source \${citationId}]
Title: \${item.metadata?.title || 'Untitled'}
URL: \${item.metadata?.url || ''}
Content: \${item.metadata?.text_preview || ''}
Relevance Score: \${(item.score * 100).toFixed(1)}%
---\`;
    }).join('\\n\\n');
    
    console.error(JSON.stringify({ 
      type: 'tool_result', 
      tool: 'vectorSearch', 
      success: true,
      resultCount: searchResults.length,
      citationRange: [startCitation, citationCounter - 1]
    }));
    
    return \`Found \${searchResults.length} relevant sources. Reference them using {{cite:N}} where N is the Source number:\\n\\n\${formattedResults}\`;
    
  } catch (error) {
    console.error(JSON.stringify({ type: 'tool_error', tool: 'vectorSearch', error: error.message }));
    return \`Error searching database: \${error.message}\`;
  }
}
// Tool: Create PowerPoint using Python
async function createCompanySlide(params) {
  const {
    companyName,
    overview,
    keyPoints,
    financials = null,
    dealHistory = null,
    recentNews = null
  } = params;
  
  console.error(JSON.stringify({ type: 'tool_call', tool: 'createCompanySlide', companyName }));
  
  try {
    // FIXED: Changed placeholder text to use triple quotes
    const pythonScript = \`
import json
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

# Parse input
data = json.loads(sys.argv[1])
company_name = data['companyName']
overview = data['overview']
key_points = data['keyPoints']
financials = data.get('financials')
deal_history = data.get('dealHistory', [])
recent_news = data.get('recentNews', [])

# Create presentation
prs = Presentation()
prs.slide_width = Inches(10)
prs.slide_height = Inches(7.5)

# Add blank slide
slide = prs.slides.add_slide(prs.slide_layouts[6])

# Define colors
NAVY_BLUE = RGBColor(0, 32, 91)
LIGHT_GRAY = RGBColor(242, 242, 242)
BLACK = RGBColor(0, 0, 0)
WHITE = RGBColor(255, 255, 255)
DARK_GRAY = RGBColor(89, 89, 89)

def add_textbox(slide, left, top, width, height, text, font_size, bold=False, 
                color=BLACK, align=PP_ALIGN.LEFT, bg_color=None, italic=False):
    """Helper function to add text box"""
    textbox = slide.shapes.add_textbox(left, top, width, height)
    text_frame = textbox.text_frame
    text_frame.text = text
    text_frame.word_wrap = True
    text_frame.margin_left = Inches(0.1)
    text_frame.margin_right = Inches(0.1)
    
    p = text_frame.paragraphs[0]
    p.alignment = align
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.italic = italic
    p.font.color.rgb = color
    
    if bg_color:
        fill = textbox.fill
        fill.solid()
        fill.fore_color.rgb = bg_color
    
    return textbox

def add_rectangle(slide, left, top, width, height, fill_color):
    """Helper function to add rectangle"""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        left, top, width, height
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.color.rgb = fill_color
    return shape

def set_cell_background(cell, fill_color):
    """Set cell background color"""
    try:
        cell.fill.solid()
        cell.fill.fore_color.rgb = fill_color
    except:
        pass

# Title
title_box = add_textbox(slide, Inches(0.5), Inches(0.3), Inches(9), Inches(0.6),
                         "Executive Summary", 48, bold=True, color=BLACK)

# Business Overview Section
box_width = Inches(4.5)
box_height = Inches(0.4)

# Business Overview Header
overview_header = add_rectangle(slide, Inches(0.4), Inches(1.1), box_width, box_height, NAVY_BLUE)
overview_title = add_textbox(slide, Inches(0.4), Inches(1.1), box_width, box_height,
                              "Business Overview", 16, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
overview_title.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE

# Business Overview Content
content_top = Inches(1.6)

# Add overview text
textbox = slide.shapes.add_textbox(Inches(0.5), content_top, Inches(4.3), Inches(0.6))
text_frame = textbox.text_frame
text_frame.word_wrap = True
p = text_frame.paragraphs[0]
p.text = overview
p.font.size = Pt(9)
p.font.color.rgb = BLACK
p.space_before = Pt(2)
p.space_after = Pt(8)

# Add key points as bullets
for i, bullet in enumerate(key_points):
    textbox = slide.shapes.add_textbox(Inches(0.5), content_top + Inches(0.7) + Inches(i * 0.45), 
                                       Inches(4.3), Inches(0.4))
    text_frame = textbox.text_frame
    text_frame.word_wrap = True
    p = text_frame.paragraphs[0]
    p.text = bullet
    p.font.size = Pt(9)
    p.font.color.rgb = BLACK
    p.level = 0
    p.space_before = Pt(2)
    p.space_after = Pt(2)

# Historical Financials Section
fin_left = Inches(5.1)
fin_header = add_rectangle(slide, fin_left, Inches(1.1), box_width, box_height, NAVY_BLUE)
fin_title = add_textbox(slide, fin_left, Inches(1.1), box_width, box_height,
                        "Historical Financials", 16, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
fin_title.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE

# Financials Content - Table if provided
if financials and 'table_data' in financials:
    table_left = fin_left + Inches(0.05)
    table_top = Inches(1.6)
    table_width = box_width - Inches(0.1)
    table_height = Inches(2.0)
    
    table_data = financials['table_data']
    rows = len(table_data)
    cols = len(table_data[0]) if table_data else 0
    
    if rows > 0 and cols > 0:
        table_shape = slide.shapes.add_table(rows, cols, table_left, table_top, table_width, table_height)
        table = table_shape.table
        
        # Dynamic column width calculation
        # Make first column wider for labels, distribute rest evenly
        first_col_width = Inches(1.2) if cols > 3 else Inches(1.0)
        remaining_width = table_width - first_col_width
        other_col_width = remaining_width / (cols - 1) if cols > 1 else remaining_width
        
        table.columns[0].width = first_col_width
        for col_idx in range(1, cols):
            table.columns[col_idx].width = other_col_width
        
        # Populate table with dynamic formatting
        for row_idx in range(rows):
            for col_idx in range(cols):
                cell = table.cell(row_idx, col_idx)
                cell_value = str(table_data[row_idx][col_idx])
                cell.text = cell_value
                
                # Format cell
                text_frame = cell.text_frame
                text_frame.margin_left = Pt(3)
                text_frame.margin_right = Pt(3)
                text_frame.margin_top = Pt(2)
                text_frame.margin_bottom = Pt(2)
                text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
                
                if text_frame.paragraphs:
                    p = text_frame.paragraphs[0]
                    
                    # Alignment: center for headers, right for numbers, left for labels
                    if row_idx == 0:
                        p.alignment = PP_ALIGN.CENTER
                    elif col_idx == 0:
                        p.alignment = PP_ALIGN.LEFT
                    else:
                        p.alignment = PP_ALIGN.RIGHT
                    
                    # Font size based on content density
                    if cols <= 4:
                        font_size = 8 if row_idx > 0 else 9
                    elif cols <= 6:
                        font_size = 7 if row_idx > 0 else 8
                    else:
                        font_size = 6 if row_idx > 0 else 7
                    
                    p.font.size = Pt(font_size)
                    p.font.bold = row_idx == 0 or col_idx == 0
                    p.font.color.rgb = BLACK
                
                # Header row background
                if row_idx == 0:
                    set_cell_background(cell, LIGHT_GRAY)
                    
                # Alternate row shading for readability if many rows
                elif rows > 6 and row_idx % 2 == 0:
                    set_cell_background(cell, RGBColor(250, 250, 250))
else:
    # FIXED: Using proper string concatenation
    fin_content = slide.shapes.add_textbox(
        fin_left + Inches(0.1), 
        Inches(1.6), 
        box_width - Inches(0.2), 
        Inches(2.0)
    )
    fin_text_frame = fin_content.text_frame
    fin_text_frame.word_wrap = True
    p = fin_text_frame.paragraphs[0]
    p.text = "[FINANCIAL DATA PLACEHOLDER]"
    p.font.size = Pt(10)
    p.font.color.rgb = DARK_GRAY
    p.font.italic = True
    
    # Add blank paragraph
    fin_text_frame.add_paragraph()
    
    for i in range(3):
        p = fin_text_frame.add_paragraph()
        p.text = "• Financial metrics to be populated"
        p.font.size = Pt(9)
        p.font.color.rgb = DARK_GRAY
        p.font.italic = True

# Deal History Section
deal_left = Inches(0.4)
deal_top = Inches(3.8)
deal_header = add_rectangle(slide, deal_left, deal_top, box_width, box_height, NAVY_BLUE)
deal_title = add_textbox(slide, deal_left, deal_top, box_width, box_height,
                          "Deal History", 16, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
deal_title.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE

# Deal History Content
deal_content = slide.shapes.add_textbox(
    deal_left + Inches(0.1), 
    deal_top + Inches(0.5), 
    box_width - Inches(0.2), 
    Inches(2.4)
)
deal_text_frame = deal_content.text_frame
deal_text_frame.word_wrap = True

if deal_history and len(deal_history) > 0:
    # Populate with actual deal history
    for i, deal in enumerate(deal_history):
        if i == 0:
            p = deal_text_frame.paragraphs[0]
        else:
            p = deal_text_frame.add_paragraph()
        
        p.text = deal
        p.font.size = Pt(9)
        p.font.color.rgb = BLACK
        p.level = 0
        p.space_after = Pt(6)
else:
    # FIXED: Using proper string handling
    p = deal_text_frame.paragraphs[0]
    p.text = "[DEAL HISTORY PLACEHOLDER]"
    p.font.size = Pt(10)
    p.font.color.rgb = DARK_GRAY
    p.font.italic = True
    
    # Add blank paragraph
    deal_text_frame.add_paragraph()
    
    for i in range(3):
        p = deal_text_frame.add_paragraph()
        p.text = "• Deal details to be populated here"
        p.font.size = Pt(9)
        p.font.color.rgb = DARK_GRAY
        p.font.italic = True
        p.space_after = Pt(6)

# Recent News Section
news_left = fin_left
news_header = add_rectangle(slide, news_left, deal_top, box_width, box_height, NAVY_BLUE)
news_title = add_textbox(slide, news_left, deal_top, box_width, box_height,
                           "Recent News", 16, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
news_title.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE

# Recent News Content
news_content = slide.shapes.add_textbox(
    news_left + Inches(0.1), 
    deal_top + Inches(0.5), 
    box_width - Inches(0.2), 
    Inches(2.4)
)
news_text_frame = news_content.text_frame
news_text_frame.word_wrap = True

if recent_news and len(recent_news) > 0:
    # Populate with actual news
    for i, news_item in enumerate(recent_news):
        if i == 0:
            p = news_text_frame.paragraphs[0]
        else:
            p = news_text_frame.add_paragraph()
        
        p.text = news_item
        p.font.size = Pt(9)
        p.font.color.rgb = BLACK
        p.level = 0
        p.space_after = Pt(6)
else:
    # FIXED: Using proper string handling
    p = news_text_frame.paragraphs[0]
    p.text = "[RECENT NEWS PLACEHOLDER]"
    p.font.size = Pt(10)
    p.font.color.rgb = DARK_GRAY
    p.font.italic = True
    
    # Add blank paragraph
    news_text_frame.add_paragraph()
    
    for i in range(3):
        p = news_text_frame.add_paragraph()
        p.text = "• News item to be populated here"
        p.font.size = Pt(9)
        p.font.color.rgb = DARK_GRAY
        p.font.italic = True
        p.space_after = Pt(6)

# Page number
add_textbox(slide, Inches(9.2), Inches(7.0), Inches(0.3), Inches(0.3),
            "1", 14, color=BLACK, align=PP_ALIGN.RIGHT)

# Save
filename = company_name.replace(" ", "_").replace("/", "-")
output_path = f'/vercel/sandbox/output/{filename}_executive_summary.pptx'
prs.save(output_path)
print(output_path)
\`;

    // Write Python script to file
    const scriptPath = '/tmp/create_pptx_' + Date.now() + '.py';
    writeFileSync(scriptPath, pythonScript);

    // Execute Python script with all parameters
    const input = JSON.stringify({
      companyName,
      overview,
      keyPoints,
      financials,
      dealHistory,
      recentNews
    });
    
    const result = execSync(\`python3 "\${scriptPath}" '\${input.replace(/'/g, "'\\\\''")}\'\`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });

    const outputPath = result.trim();
    console.error(JSON.stringify({ 
      type: 'tool_result', 
      tool: 'createCompanySlide', 
      success: true,
      outputPath 
    }));
    
    return \`Executive Summary PowerPoint created successfully at: \${outputPath}\`;
  } catch (error) {
    console.error(JSON.stringify({ 
      type: 'tool_error', 
      tool: 'createCompanySlide', 
      error: error.message,
      stack: error.stack
    }));
    return \`Error creating PowerPoint: \${error.message}\`;
  }
}

// Define tools
// Define tools
const tools = [
  {
    name: 'vectorSearch',
    description: 'Search the Volute ipo and spac news database. Returns relevant articles, studies, clinical trials, and research findings with citation numbers. You MUST cite sources using {{cite:N}} format in your response.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant information'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'createCompanySlide',
    description: \`Create a comprehensive Executive Summary PowerPoint presentation with dynamic financial data tables.

IMPORTANT - Financial Data Guidelines:
- ALWAYS include financial data if available from your research
- Structure financial data as a 2D array (rows x columns)
- First row MUST be column headers (e.g., time periods: "Q1 2024", "Q2 2024", "2022", "2023", "LTM", etc.)
- First column MUST be row labels (e.g., "Revenue", "EBITDA", "Net Income", "Gross Margin", etc.)
- Use whatever time periods are available: quarters, years, funding rounds, or mixed
- Include as many financial metrics as available: revenue, profit, margins, growth rates, valuations, etc.
- Format numbers with appropriate units (e.g., "$1.2B", "$500M", "15.3%", "2.5x")
- For early-stage companies, include funding data: "Seed Round", "Series A", "Series B", "Total Raised"
- For public companies, prioritize: Revenue, Gross Profit, EBITDA, Net Income, margins, growth rates
- You can have different numbers of rows and columns based on available data

Example formats:

Public Company (Multi-year):
[
  ["", "2021", "2022", "2023", "LTM", "CAGR"],
  ["Revenue", "$1.2B", "$1.5B", "$2.1B", "$2.3B", "24%"],
  ["Gross Profit", "$500M", "$650M", "$900M", "$1.0B", "26%"],
  ["EBITDA", "$200M", "$280M", "$420M", "$480M", "34%"],
  ["Net Income", "$120M", "$180M", "$300M", "$340M", "42%"]
]

Private Company (Quarterly):
[
  ["", "Q1 2024", "Q2 2024", "Q3 2024", "QoQ Growth"],
  ["Revenue", "$45M", "$52M", "$61M", "17%"],
  ["ARR", "$180M", "$208M", "$244M", "17%"],
  ["Gross Margin", "72%", "74%", "75%", "+1pp"]
]

Startup (Funding):
[
  ["Round", "Date", "Amount", "Valuation", "Lead Investor"],
  ["Seed", "Jan 2020", "$2M", "$10M", "Sequoia"],
  ["Series A", "Jun 2021", "$15M", "$75M", "a16z"],
  ["Series B", "Mar 2023", "$50M", "$300M", "Tiger Global"],
  ["Total Raised", "", "$67M", "", ""]
]

If optional sections are not provided, they will show as placeholders.\`,
    input_schema: {
      type: 'object',
      properties: {
        companyName: {
          type: 'string',
          description: 'The name of the company'
        },
        overview: {
          type: 'string',
          description: 'A comprehensive overview paragraph about the company (2-4 sentences)'
        },
        keyPoints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of 3-5 key highlights or bullet points about the company'
        },
        financials: {
          type: 'object',
          description: 'Financial data to populate a dynamic table. ALWAYS include this if you found any financial information.',
          properties: {
            table_data: {
              type: 'array',
              items: {
                type: 'array',
                items: { type: 'string' }
              },
              description: \`2D array for financial table. First row = column headers, first column = row labels.
              
Examples:
- ["", "2022", "2023", "2024"] as header row
- ["Revenue", "$1.2B", "$1.8B", "$2.4B"] as data row
- ["YoY Growth", "", "50%", "33%"] as calculated metric row
- Can include any number of rows and columns based on available data\`
            }
          },
          required: ['table_data']
        },
        dealHistory: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of deal history bullet points (e.g., ["Acquired Company X for $500M in 2022", "Series C funding of $100M in 2021"])'
        },
        recentNews: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of recent news bullet points (e.g., ["Launched new product line in Q1 2024", "Partnership announced with Major Corp"])'
        }
      },
      required: ['companyName', 'overview', 'keyPoints']
    }
  }
];

// Main agent loop with enhanced system prompt
// Main agent loop with citation enforcement
async function main() {
  const userQuery = process.argv[2];
  
  console.error(JSON.stringify({ type: 'agent_start', query: userQuery }));
  
  if (!userQuery) {
    console.error(JSON.stringify({ error: 'No query provided' }));
    process.exit(1);
  }

  try {
    const messages = [{ role: 'user', content: userQuery }];
    let continueLoop = true;
    let iterationCount = 0;
    const maxIterations = 10;

    while (continueLoop && iterationCount < maxIterations) {
      iterationCount++;
      console.error(JSON.stringify({ type: 'iteration', count: iterationCount }));

      const response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8192,
        system: \`You are a research assistant with access to a database of company information.

CRITICAL CITATION RULES:
1. When you use information from vectorSearch results, you MUST cite sources
2. Use this EXACT format: {{cite:N}} where N is the Source number from the search results
3. Place citations immediately after the relevant sentence or fact
4. You can cite multiple sources together: {{cite:1,3,5}}
5. Every fact or claim derived from search results MUST have a citation

EXAMPLES:
 WRONG: "Alto Neuroscience reported positive Phase II results for ALTO-100."
 CORRECT: "Alto Neuroscience reported positive Phase II results for ALTO-100 {{cite:1}}."

 WRONG: "The trial showed statistical superiority at weeks 26 and 52."
 CORRECT: "The trial showed statistical superiority at weeks 26 and 52 {{cite:2}}."

When vectorSearch returns results, they are numbered [Source 1], [Source 2], etc.
Use those numbers in your {{cite:N}} tags.

Be precise and cite the specific source for each distinct piece of information.\`,
        tools: tools,
        messages: messages
      });

      console.log(JSON.stringify({ 
        type: 'response', 
        stopReason: response.stop_reason,
        contentBlocks: response.content.length
      }));

      if (response.stop_reason === 'tool_use') {
        const toolResults = [];
        
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            console.error(JSON.stringify({ 
              type: 'executing_tool', 
              tool: block.name,
              input: block.input 
            }));

            let toolResult;
            
            if (block.name === 'vectorSearch') {
              toolResult = await vectorSearch(block.input.query);
            } else if (block.name === 'createCompanySlide') {
              toolResult = await createCompanySlide(block.input);
            } else {
              toolResult = \`Unknown tool: \${block.name}\`;
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: toolResult
            });
          }
        }

        messages.push(
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults }
        );
      } else {
        const textContent = response.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\\n');

        console.log(JSON.stringify({ 
          type: 'final_response',
          text: textContent
        }));
        
        // Output sources map for the API to parse
        console.log(JSON.stringify({
          type: 'sources_map',
          sources: sourcesMap
        }));
        
        continueLoop = false;
      }
    }

    console.error(JSON.stringify({ type: 'agent_complete', iterations: iterationCount }));
    console.log(JSON.stringify({ type: 'complete' }));

  } catch (error) {
    console.error(JSON.stringify({ 
      type: 'error', 
      error: error.message,
      stack: error.stack 
    }));
    process.exit(1);
  }
}


main();
`;

      await sandbox.writeFiles([{
        path: '/vercel/sandbox/agent.mjs',
        content: Buffer.from(agentScript.trim()),
      }]);
      
      console.log('✓ Agent script created');
      console.groupEnd();
    }

    // --- RUN THE AGENT ---
    console.log(`[${requestId}] 🤖 Running Agent...`);
    
    const result = await sandbox.runCommand({
      cmd: 'node',
      args: ['/vercel/sandbox/agent.mjs', query],
      env: { 
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
      }
    });

    const rawOutput = await result.stdout();
    const rawError = await result.stderr();

    console.log('=== AGENT OUTPUT ===');
    console.log(rawOutput);
    console.log('=== DIAGNOSTICS ===');
    console.log(rawError);

    // Parse events (your existing code)
    const events = rawOutput
      .split('\n')
      .filter(line => line.trim().startsWith('{'))
      .map(line => {
        try { return JSON.parse(line); } 
        catch (e) { return null; }
      })
      .filter(Boolean);

    const diagnostics = rawError
      .split('\n')
      .filter(line => line.trim().startsWith('{'))
      .map(line => {
        try { return JSON.parse(line); } 
        catch (e) { return null; }
      })
      .filter(Boolean);

    // NEW SECTION to extract final response and sources:
    let finalResponse = '';
    let sourcesMap = {};

    events.forEach(event => {
      if (event.type === 'final_response') {
        finalResponse = event.text;
      }
      if (event.type === 'sources_map') {
        sourcesMap = event.sources || {};
      }
    });

    // If no final_response event found, try to extract from last text block
    if (!finalResponse) {
      const lastEvent = events.filter(e => e.type === 'response').pop();
      if (lastEvent) {
        finalResponse = lastEvent.text || '';
      }
    }

    console.log('\n=== PARSED RESPONSE ===');
    console.log('Final Response:', finalResponse.substring(0, 200) + '...');
    console.log('Sources Count:', Object.keys(sourcesMap).length);

    // Check for generated files
    const listFiles = await sandbox.runCommand({
      cmd: 'find',
      args: ['/vercel/sandbox/output', '-type', 'f', '-name', '*.pptx'],
    });

    const outputFiles = (await listFiles.stdout())
      .split('\n')
      .filter(Boolean);

    console.log('Generated files:', outputFiles);

    // Replace your existing "Read generated files" block with this:
    const files = await Promise.all(outputFiles.map(async (filePath) => {
      // 1. Use readFileToBuffer instead of readFile
      const fileContent = await sandbox.readFileToBuffer({ path: filePath });
      const filename = path.basename(filePath);
      
      if (!fileContent) {
        throw new Error(`Failed to read generated file: ${filePath}`);
      }

      return {
        filename,
        path: filePath,
        // 2. Explicitly cast to Buffer to satisfy TypeScript
        content: Buffer.from(fileContent).toString('base64'), 
      };
    }));

    // RETURN FINAL RESPONSE 
    console.timeEnd(`[${requestId}] Total Duration`);

    return res.status(200).json({
      sandboxId: sandbox.sandboxId,
      finalResponse,        // NEW: Direct access to final text
      sourcesMap,           // NEW: Citation ID -> source details mapping
      events,
      diagnostics,
      files,
      exitCode: result.exitCode,
      // Helper field for frontend:
      hasCitations: Object.keys(sourcesMap).length > 0
    });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Handler Error:`, error.message);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}