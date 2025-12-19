import { useState } from 'react';
import { ArrowRight, Sparkles, Loader2, X } from 'lucide-react';
import { ChartCanvas } from './charts';
import { ChartConfig } from '../types/charts';
import { Company, Metric, MetricValue } from '../types';

interface ChartGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  metrics: Metric[];
  metricValues: MetricValue[];
}

export function ChartGeneratorDialog({
  isOpen,
  onClose,
  companies,
  metrics,
  metricValues,
}: ChartGeneratorDialogProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);

  // Prepare table context for LLM
  const prepareTableContext = () => {
    // Get a sample of the data (first 10 rows)
    const sampleData = metricValues.slice(0, 10).map(mv => {
      const company = companies.find(c => c.id === mv.companyId);
      const metric = metrics.find(m => m.id === mv.metricId);

      return {
        company: company?.name,
        metric: metric?.name,
        value: mv.value,
      };
    });

    // Create a structured representation of the table
    const tableStructure = {
      companies: companies.map(c => ({ id: c.id, name: c.name })),
      metrics: metrics.map(m => ({ id: m.id, name: m.name, category: m.category })),
      sampleData,
      totalRows: metricValues.length,
    };

    return tableStructure;
  };

  const handleSubmit = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setChartConfig(null);

    try {
      const tableContext = prepareTableContext();

      // Get Flask API URL from environment
      const apiUrl = import.meta.env.VITE_CHART_API_URL;

      if (!apiUrl) {
        throw new Error('Chart API URL not configured. Please set VITE_CHART_API_URL in .env.local');
      }

      // Send user message and table data (system prompt is in the API)
      const userMessage = `${query}

Table Context:
- Companies: ${tableContext.companies.map(c => c.name).join(', ')}
- Metrics: ${tableContext.metrics.map(m => m.name).join(', ')}
- Total data points: ${tableContext.totalRows}

Sample Data:
${JSON.stringify(tableContext.sampleData, null, 2)}`;

      const requestPayload = {
        prompt: userMessage,
      };

      console.group('🚀 Chart Generation Request');
      console.log('API URL:', apiUrl);
      console.log('Query:', query);
      console.log('Table Context:', tableContext);
      console.log('Full Request Payload:', requestPayload);
      console.groupEnd();

      // Call your Flask API proxy
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      console.group('📥 Chart Generation Response');
      console.log('Status:', response.status, response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error Response:', errorData);
        console.groupEnd();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Raw Response Data:', responseData);

      // Handle different response formats from Flask API
      let text;
      if (responseData.chartConfig) {
        text = responseData.chartConfig;
      } else if (responseData.response) {
        text = responseData.response;
      } else if (responseData.text) {
        text = responseData.text;
      } else {
        // If response is directly the config
        text = responseData;
      }

      console.log('Chart Config (raw):', text);
      console.log('Chart Config Type:', typeof text);

      // Parse the JSON response
      let parsedConfig: ChartConfig;
      try {
        // Handle if text is already an object
        if (typeof text === 'object' && text !== null) {
          console.log('Chart config is already an object');
          parsedConfig = text as ChartConfig;
        } else {
          // Try to extract JSON from markdown code blocks if present
          const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || text.match(/(\{[\s\S]*\})/);
          const jsonText = jsonMatch ? jsonMatch[1] : text;
          console.log('Extracted JSON text:', jsonText.substring(0, 200) + '...');
          parsedConfig = JSON.parse(jsonText.trim());
        }
        console.log('Parsed Config:', parsedConfig);
      } catch (parseError) {
        console.error('Parse Error:', parseError);
        console.error('Failed to parse LLM response:', text);
        console.groupEnd();
        throw new Error('Failed to parse chart configuration. Please try rephrasing your question.');
      }

      // Validate the config has required fields
      console.log('Validating config...');
      console.log('Has type:', !!parsedConfig.type);
      console.log('Has data:', !!parsedConfig.data);
      console.log('Has xAxis:', !!parsedConfig.xAxis);
      console.log('Has yAxis:', !!parsedConfig.yAxis);
      console.log('Has series:', !!parsedConfig.series);

      if (!parsedConfig.type || !parsedConfig.data || !parsedConfig.xAxis || !parsedConfig.yAxis || !parsedConfig.series) {
        console.error('Validation failed - missing required fields');
        console.groupEnd();
        throw new Error('Invalid chart configuration received. Please try again.');
      }

      console.log('✅ Validation successful!');
      console.log('Final Chart Config:', parsedConfig);
      console.groupEnd();

      setChartConfig(parsedConfig);
    } catch (err) {
      console.group('❌ Chart Generation Error');
      console.error('Error:', err);
      console.groupEnd();
      setError(err instanceof Error ? err.message : 'Failed to generate chart. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleReset = () => {
    setQuery('');
    setChartConfig(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-[70vw] min-h-[70vh] max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex-1 text-center">
              <h2 className="text-gray-900 mb-1">Transform to Chart</h2>
              <p className="text-gray-600">Describe the visualization you want to create</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors absolute right-8"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8">
            {/* Input Form */}
            {!chartConfig && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div>
                  <div className="relative">
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (query.trim()) {
                            handleSubmit();
                          }
                        }
                      }}
                      placeholder="Describe the chart you want to create...&#10;&#10;e.g., Show opening prices by company&#10;e.g., Compare opening and closing prices&#10;e.g., Plot valuation vs first day return"
                      className="w-full px-6 py-4 pr-14 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-lg resize-none h-48"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={!query.trim() || isLoading}
                      className="absolute right-3 bottom-3 p-2.5 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ArrowRight className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Loading State */}
                {isLoading && (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-black" />
                  </div>
                )}
              </div>
            )}

            {/* Chart Display */}
            {chartConfig && !isLoading && (
              <div className="space-y-6">
                <ChartCanvas config={chartConfig} className="shadow-none" />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            {chartConfig ? (
              <>
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Generate another chart
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Done
                </button>
              </>
            ) : (
              <div className="w-full"></div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
