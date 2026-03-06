/**
 * Simple test script for the slide parser
 * Run with: npx tsx api/lib/test-parser.ts
 */

import { parseComponentToSlideSchema } from './slide-parser';
import * as fs from 'fs';

const testCode = `
import { useState } from 'react';

export function SimpleSlide() {
  const [data] = useState([
    { year: 'FY23A', revenue: 1038 },
    { year: 'FY24A', revenue: 1149 },
    { year: 'FY25E', revenue: 1235 },
  ]);

  return (
    <div className="w-full min-h-screen bg-white p-8">
      <h1 className="text-3xl font-bold text-gray-900">Simple Test Slide</h1>
      <p className="text-sm text-gray-600">This is a test paragraph</p>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-blue-500 text-white p-4">
          <div className="text-lg font-semibold">Box 1</div>
          <div className="text-xs">Some content here</div>
        </div>

        <div className="bg-green-500 text-white p-4">
          <div className="text-lg font-semibold">Box 2</div>
          <div className="text-xs">More content here</div>
        </div>
      </div>
    </div>
  );
}
`;

try {
  console.log('Testing slide parser...\n');

  const result = parseComponentToSlideSchema(testCode);

  console.log('Parse successful!');
  console.log('\nSlide dimensions:');
  console.log(`  Width: ${result.slide.width} EMU`);
  console.log(`  Height: ${result.slide.height} EMU`);
  console.log(`\nElements found: ${result.slide.elements?.length || 0}`);

  if (result.slide.elements) {
    result.slide.elements.forEach((el, idx) => {
      console.log(`\n  Element ${idx + 1}:`);
      console.log(`    Type: ${el.type}`);
      console.log(`    ID: ${el.id}`);
      console.log(`    Name: ${el.name}`);
      console.log(`    Position: (${el.position.x}, ${el.position.y})`);
      console.log(`    Size: ${el.position.cx} x ${el.position.cy} EMU`);

      if (el.text && el.text.body && el.text.body.paragraphs) {
        const textContent = el.text.body.paragraphs
          .map(p => p.runs?.map(r => r.text).join('') || '')
          .join('\n');
        if (textContent) {
          console.log(`    Text: "${textContent}"`);
        }
      }
    });
  }

  // Write result to file
  fs.writeFileSync(
    'test-output.json',
    JSON.stringify(result, null, 2),
    'utf-8'
  );

  console.log('\n✓ Test passed! Output written to test-output.json');

} catch (error: any) {
  console.error('❌ Test failed:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
