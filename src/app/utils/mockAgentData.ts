// Mock data generator for testing data view components without backend
export interface MockSlideDataPoint {
  label: string;
  value: string;
  sourceUrls: string[];
}

export interface MockSlideData {
  action: 'created' | 'edited';
  code: string;
  slideNumber: number;
  dataPoints: MockSlideDataPoint[];
}

export function generateMockSlide(slideNumber: number = 1): MockSlideData {
  // Use Reddit IPO data to match real backend format
  const mockDataPoints: MockSlideDataPoint[] = [
    {
      label: "Reddit IPO Date",
      value: "March 21, 2024",
      sourceUrls: [
        "https://www.sec.gov/Archives/edgar/data/1713445/000171344524000007/rddt-20240321.htm",
        "https://www.reuters.com/technology/reddit-ipo-2024-03-21"
      ]
    },
    {
      label: "Reddit Offer Price",
      value: "$34.00",
      sourceUrls: [
        "https://www.sec.gov/Archives/edgar/data/1713445/000171344524000007/rddt-20240321.htm"
      ]
    },
    {
      label: "Market Cap at IPO",
      value: "$6.4B",
      sourceUrls: [
        "https://www.sec.gov/Archives/edgar/data/1713445/000171344524000007/rddt-20240321.htm",
        "https://www.bloomberg.com/news/reddit-market-cap-2024"
      ]
    },
    {
      label: "Shares Offered",
      value: "22 million",
      sourceUrls: [
        "https://www.sec.gov/Archives/edgar/data/1713445/000171344524000007/rddt-20240321.htm"
      ]
    },
    {
      label: "First Day Pop",
      value: "+48%",
      sourceUrls: [
        "https://www.cnbc.com/reddit-ipo-first-day-trading",
        "https://finance.yahoo.com/news/reddit-stock-debut-march-2024"
      ]
    }
  ];

  const mockSlideCode = `export default function Slide${slideNumber}() {
  return (
    <div className="w-full h-full bg-white p-8 flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900">
          Reddit IPO Overview
        </h1>
        <p className="text-base text-gray-600 mt-2">
          March 2024 Public Offering
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1">
        <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
          <div className="text-sm text-gray-600 mb-2">IPO Date</div>
          <div className="text-4xl font-semibold text-gray-900">March 21, 2024</div>
        </div>

        <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
          <div className="text-sm text-gray-600 mb-2">Offer Price</div>
          <div className="text-4xl font-semibold text-gray-900">$34.00</div>
        </div>

        <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
          <div className="text-sm text-gray-600 mb-2">Market Cap</div>
          <div className="text-4xl font-semibold text-gray-900">$6.4B</div>
        </div>

        <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
          <div className="text-sm text-gray-600 mb-2">First Day Pop</div>
          <div className="text-4xl font-semibold text-gray-900">+48%</div>
          <div className="text-sm text-emerald-600 mt-2">Strong debut</div>
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500">
        Sources: SEC EDGAR, Reuters, Bloomberg
      </div>
    </div>
  );
}`;

  return {
    action: 'created',
    code: mockSlideCode,
    slideNumber,
    dataPoints: mockDataPoints
  };
}

export async function mockAgentStream(
  prompt: string,
  onEvent: (event: any) => void,
  delay: number = 100
): Promise<void> {
  // Simulate text streaming
  await new Promise(resolve => setTimeout(resolve, delay));
  onEvent({ type: 'text_delta', delta: 'I\'ll create a' });
  
  await new Promise(resolve => setTimeout(resolve, delay));
  onEvent({ type: 'text_delta', delta: ' market overview' });
  
  await new Promise(resolve => setTimeout(resolve, delay));
  onEvent({ type: 'text_delta', delta: ' slide with Q4 2024' });
  
  await new Promise(resolve => setTimeout(resolve, delay));
  onEvent({ type: 'text_delta', delta: ' private equity data.' });

  // Simulate tool start
  await new Promise(resolve => setTimeout(resolve, delay * 2));
  onEvent({ 
    type: 'tool_start', 
    name: 'data_search',
    input: { query: 'Q4 2024 private equity fundraising and deal activity' }
  });

  await new Promise(resolve => setTimeout(resolve, delay * 5));
  onEvent({ 
    type: 'tool_result', 
    name: 'data_search',
    preview: 'Found 8 relevant sources with Q4 2024 data'
  });

  // Simulate registering data points
  await new Promise(resolve => setTimeout(resolve, delay * 2));
  const mockSlide = generateMockSlide(1);
  
  onEvent({ 
    type: 'tool_start', 
    name: 'register_slide_data_points',
    input: { 
      slideNumber: 1,
      dataPoints: mockSlide.dataPoints
    }
  });

  await new Promise(resolve => setTimeout(resolve, delay * 2));
  onEvent({ 
    type: 'slide_data_points',
    slideNumber: 1,
    dataPoints: mockSlide.dataPoints
  });

  onEvent({ 
    type: 'tool_result', 
    name: 'register_slide_data_points',
    preview: `Registered ${mockSlide.dataPoints.length} datapoints for slide 1`
  });

  // Simulate slide generation
  await new Promise(resolve => setTimeout(resolve, delay * 3));
  onEvent({ 
    type: 'tool_start', 
    name: 'create_or_edit_slide',
    input: { 
      prompt: 'Create a market overview slide with Q4 2024 data',
      slideNumber: 1,
      templateCategory: 'market_overview'
    }
  });

  await new Promise(resolve => setTimeout(resolve, delay * 8));
  onEvent({ 
    type: 'slide_generated',
    action: 'created',
    code: mockSlide.code,
    slideNumber: 1
  });

  onEvent({ 
    type: 'tool_result', 
    name: 'create_or_edit_slide',
    preview: 'Slide created (1247 chars)'
  });

  // Done
  await new Promise(resolve => setTimeout(resolve, delay));
  onEvent({ 
    type: 'done',
    sessionId: 'mock-session-' + Date.now(),
    isNewSession: true,
    historyLength: 2
  });
}