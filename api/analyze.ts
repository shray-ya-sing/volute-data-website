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
        timeout: ms('15m'),
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

// Tool: Vector Search
async function vectorSearch(query) {
  console.error(JSON.stringify({ type: 'tool_call', tool: 'vectorSearch', query }));
  
  try {
    const response = await fetch('https://getvolute.com/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(\`Search API returned \${response.status}\`);
    }

    const result = await response.text();
    console.error(JSON.stringify({ type: 'tool_result', tool: 'vectorSearch', success: true }));
    
    return result;
  } catch (error) {
    console.error(JSON.stringify({ type: 'tool_error', tool: 'vectorSearch', error: error.message }));
    return \`Error searching database: \${error.message}\`;
  }
}

// Tool: Create PowerPoint using Python
async function createCompanySlide(companyName, overview, keyPoints) {
  console.error(JSON.stringify({ type: 'tool_call', tool: 'createCompanySlide', companyName }));
  
  try {
    // Beautiful Python script for PowerPoint generation
    const pythonScript = \`
import json
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

# Parse input
data = json.loads(sys.argv[1])
company_name = data['companyName']
overview = data['overview']
key_points = data['keyPoints']

# Create presentation
prs = Presentation()
prs.slide_width = Inches(10)
prs.slide_height = Inches(7.5)

# === TITLE SLIDE ===
title_slide_layout = prs.slide_layouts[0]
slide = prs.slides.add_slide(title_slide_layout)

# Set background color
background = slide.background
fill = background.fill
fill.solid()
fill.fore_color.rgb = RGBColor(31, 78, 120)  # Dark blue

# Title
title = slide.shapes.title
title.text = company_name
title.text_frame.paragraphs[0].font.size = Pt(54)
title.text_frame.paragraphs[0].font.bold = True
title.text_frame.paragraphs[0].font.color.rgb = RGBColor(255, 255, 255)

# Subtitle
if len(slide.placeholders) > 1:
    subtitle = slide.placeholders[1]
    subtitle.text = "Company Overview"
    subtitle.text_frame.paragraphs[0].font.size = Pt(32)
    subtitle.text_frame.paragraphs[0].font.color.rgb = RGBColor(255, 255, 255)

# === CONTENT SLIDE ===
bullet_slide_layout = prs.slide_layouts[1]
slide = prs.slides.add_slide(bullet_slide_layout)

# Title
title_shape = slide.shapes.title
title_shape.text = f"{company_name} Overview"
title_shape.text_frame.paragraphs[0].font.size = Pt(40)
title_shape.text_frame.paragraphs[0].font.bold = True
title_shape.text_frame.paragraphs[0].font.color.rgb = RGBColor(31, 78, 120)

# Body
body_shape = slide.placeholders[1]
tf = body_shape.text_frame
tf.text = overview
tf.paragraphs[0].font.size = Pt(18)
tf.paragraphs[0].space_after = Pt(20)

# Add key points with bullets
for i, point in enumerate(key_points):
    p = tf.add_paragraph()
    p.text = point
    p.level = 0
    p.font.size = Pt(16)
    p.space_after = Pt(12)

# Save
filename = company_name.replace(" ", "_").replace("/", "-")
output_path = f'/vercel/sandbox/output/{filename}_overview.pptx'
prs.save(output_path)
print(output_path)
\`;

    // Write Python script to file
    const scriptPath = '/tmp/create_pptx_' + Date.now() + '.py';
    writeFileSync(scriptPath, pythonScript);

    // Execute Python script
    const input = JSON.stringify({ companyName, overview, keyPoints });
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
    
    return \`PowerPoint presentation created successfully at: \${outputPath}\`;
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
const tools = [
  {
    name: 'vectorSearch',
    description: 'Search the Volute clinical trials and medical news database. Returns relevant articles, studies, clinical trials, and research findings. Use this to find information about companies, drugs, treatments, or medical topics.',
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
    description: 'Create a professional PowerPoint presentation with company overview. Generates slides with title, overview text, and key bullet points in a polished format.',
    input_schema: {
      type: 'object',
      properties: {
        companyName: {
          type: 'string',
          description: 'The name of the company'
        },
        overview: {
          type: 'string',
          description: 'A brief 2-3 sentence overview of the company'
        },
        keyPoints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of 3-5 key highlights or bullet points about the company'
        }
      },
      required: ['companyName', 'overview', 'keyPoints']
    }
  }
];

// Main agent loop
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
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
              toolResult = await createCompanySlide(
                block.input.companyName,
                block.input.overview,
                block.input.keyPoints
              );
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

    // Parse events
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

    // Check for generated files
    const listFiles = await sandbox.runCommand({
      cmd: 'find',
      args: ['/vercel/sandbox/output', '-type', 'f', '-name', '*.pptx'],
    });

    const outputFiles = (await listFiles.stdout())
      .split('\n')
      .filter(Boolean);

    console.log('Generated files:', outputFiles);

    // Read generated files
    const files = await Promise.all(outputFiles.map(async (filePath) => {
      const fileContent = await sandbox.readFile({ path: filePath });
      const filename = path.basename(filePath);
      if (!fileContent) {
        throw new Error(`Failed to read generated file: ${filePath}`);
      }
      else {
        return {
        filename,
        path: filePath,
        content: fileContent.toString(),
      };
      }
      
    }));

    console.timeEnd(`[${requestId}] Total Duration`);
    
    return res.status(200).json({
      sandboxId: sandbox.sandboxId,
      events,
      diagnostics,
      files,
      exitCode: result.exitCode
    });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Handler Error:`, error.message);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}