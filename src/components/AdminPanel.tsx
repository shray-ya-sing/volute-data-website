import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Document, Page, pdfjs } from 'react-pdf';
import { Download, Upload, Trash2, X, FileText, Edit } from 'lucide-react';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface Company {
  id: string;
  name: string;
  ticker: string;
  logoUrl?: string;
  categories?: string[];
}

interface MetricDefinition {
  id: string;
  name: string;
  category: string;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Highlight {
  searchText: string;
  pageNumber: number;
  boundingBox: BoundingBox;
  highlightColor?: string;
}

interface Source {
  id: string;
  type: string;
  name: string;
  value: string;
  date: string;
  url?: string;
  contentType?: string;
  blobUrl?: string;
  highlights?: Highlight[];
}

interface CompanyMetric {
  companyId: string;
  metricId: string;
  aggregatedValue: string;
  notes?: string;
  sources: Source[];
}

interface LocalData {
  companies: Company[];
  metrics: CompanyMetric[];
}

const STORAGE_KEY = 'volute-admin-data';

export function AdminPanel() {
  // Helper functions inside component to avoid hot reload issues
  const getPlaceholderForMetric = (metricId: string): string => {
    const placeholders: Record<string, string> = {
      ipoDate: '2024-03-20',
      finalPrice: '$36.00 per share',
      openingPrice: '$52.56 per share',
      firstDayClosingPrice: '$53.25 per share',
      priceRange: '$32.00 - $34.00 per share',
      ipoValuation: '$8,820,000,000',
      lastPrivateValuation: '$3,150,000,000',
      upsizedOrDownsized: 'Upsized from 18,000,000 shares to 20,000,000 shares',
      sharesOffered: '20,000,000 shares',
      sharesCompany: '18,000,000 shares',
      sharesSellingStockholders: '2,000,000 shares',
      greenshoeShares: '3,000,000 shares',
      commonStockOutstanding: '245,000,000 shares',
      grossProceeds: '$720,000,000',
      netProceeds: '$669,600,000',
      proceedsToCompany: '$597,600,000',
      proceedsToSellingStockholders: '$72,000,000',
      underwriterDiscount: '$50,400,000 (7.0%)',
      bookrunners: 'Morgan Stanley, Goldman Sachs, J.P. Morgan',
      attorneys: 'Company Counsel: Wilson Sonsini | Underwriter Counsel: Latham & Watkins',
      notes: 'Any additional context, dates, or important details',
    };
    return placeholders[metricId] || 'Enter value';
  };

  const getFormatHintForMetric = (metricId: string): string => {
    const hints: Record<string, string> = {
      ipoDate: 'Format: YYYY-MM-DD (ISO date format)',
      finalPrice: 'Format: $XX.XX per share (always 2 decimals)',
      openingPrice: 'Format: $XX.XX per share (always 2 decimals)',
      firstDayClosingPrice: 'Format: $XX.XX per share (always 2 decimals)',
      priceRange: 'Format: $XX.XX - $YY.YY per share',
      ipoValuation: 'Format: $X,XXX,XXX,XXX (exact amount with commas, no abbreviations)',
      lastPrivateValuation: 'Format: $X,XXX,XXX,XXX (exact amount with commas)',
      upsizedOrDownsized: 'Describe changes with exact numbers (e.g., share count changes, price range changes)',
      sharesOffered: 'Format: XXX,XXX,XXX shares (exact count with commas, never "20M")',
      sharesCompany: 'Format: XXX,XXX,XXX shares (exact count, primary shares)',
      sharesSellingStockholders: 'Format: XXX,XXX,XXX shares (exact count, secondary shares)',
      greenshoeShares: 'Format: XXX,XXX,XXX shares (exact over-allotment option)',
      commonStockOutstanding: 'Format: XXX,XXX,XXX shares (total post-IPO)',
      grossProceeds: 'Format: $XXX,XXX,XXX (exact proceeds before fees)',
      netProceeds: 'Format: $XXX,XXX,XXX (exact proceeds after underwriter discount)',
      proceedsToCompany: 'Format: $XXX,XXX,XXX (net proceeds from primary shares)',
      proceedsToSellingStockholders: 'Format: $XXX,XXX,XXX (net proceeds from secondary shares)',
      underwriterDiscount: 'Format: $XX,XXX,XXX (X.XX%) - include dollar amount and percentage',
      bookrunners: 'Comma-separated list, lead bookrunners first',
      attorneys: 'Format: Company Counsel: [Firm] | Underwriter Counsel: [Firm]',
      notes: 'Free text - include exact numbers and dates where relevant',
    };
    return hints[metricId] || '';
  };

  const [activeTab, setActiveTab] = useState<'company' | 'metric'>('company');

  // Company form state
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [ticker, setTicker] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Metric form state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [metricDefinitions] = useState<MetricDefinition[]>([
    { id: 'ipoDate', name: 'IPO Date', category: 'IPO Metrics' },
    { id: 'finalPrice', name: 'Final Price', category: 'IPO Metrics' },
    { id: 'openingPrice', name: 'Opening Price', category: 'IPO Metrics' },
    { id: 'firstDayClosingPrice', name: 'First Day Closing Price', category: 'IPO Metrics' },
    { id: 'priceRange', name: 'Expected Price Range', category: 'IPO Metrics' },
    { id: 'ipoValuation', name: 'IPO Valuation', category: 'Valuation Metrics' },
    { id: 'lastPrivateValuation', name: 'Last Private Valuation', category: 'Valuation Metrics' },
    { id: 'upsizedOrDownsized', name: 'Upsized/Downsized', category: 'IPO Metrics' },
    { id: 'sharesOffered', name: 'Shares Offered (Primary)', category: 'Share Structure' },
    { id: 'sharesCompany', name: 'Shares Sold by Company', category: 'Share Structure' },
    { id: 'sharesSellingStockholders', name: 'Shares Sold by Selling Stockholders', category: 'Share Structure' },
    { id: 'greenshoeShares', name: 'Greenshoe Shares', category: 'Share Structure' },
    { id: 'commonStockOutstanding', name: 'Common Stock Outstanding', category: 'Share Structure' },
    { id: 'grossProceeds', name: 'Gross Proceeds', category: 'Financial Metrics' },
    { id: 'netProceeds', name: 'Net Proceeds', category: 'Financial Metrics' },
    { id: 'proceedsToCompany', name: 'Proceeds to Company', category: 'Financial Metrics' },
    { id: 'proceedsToSellingStockholders', name: 'Proceeds to Selling Stockholders', category: 'Financial Metrics' },
    { id: 'underwriterDiscount', name: 'Underwriter Discount', category: 'Financial Metrics' },
    { id: 'bookrunners', name: 'Bookrunning Banks', category: 'Deal Information' },
    { id: 'attorneys', name: 'Attorneys', category: 'Deal Information' },
    { id: 'notes', name: 'Notes', category: 'Other' },
  ]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedMetricId, setSelectedMetricId] = useState('');
  const [aggregatedValue, setAggregatedValue] = useState('');
  const [notes, setNotes] = useState('');
  const [sources, setSources] = useState<Source[]>([]);

  // Annotation modal state
  const [annotationModalOpen, setAnnotationModalOpen] = useState(false);
  const [annotatingSourceIndex, setAnnotatingSourceIndex] = useState<number | null>(null);
  const [pdfFile, setPdfFile] = useState<string>('');
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);
  const [tempHighlights, setTempHighlights] = useState<Highlight[]>([]);
  const [searchText, setSearchText] = useState<string>('');

  const pageRef = useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed: LocalData = JSON.parse(data);
        setCompanies(parsed.companies || []);
      }
    } catch (error) {
      console.error('Error loading local data:', error);
    }
  };

  const saveLocalData = (updatedCompanies: Company[], updatedMetrics?: CompanyMetric[]) => {
    try {
      const currentData = localStorage.getItem(STORAGE_KEY);
      const parsed: LocalData = currentData ? JSON.parse(currentData) : { companies: [], metrics: [] };

      const dataToSave: LocalData = {
        companies: updatedCompanies,
        metrics: updatedMetrics || parsed.metrics || []
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving local data:', error);
      throw error;
    }
  };

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const newCompany: Company = {
        id: companyId,
        name: companyName,
        ticker: ticker.toUpperCase(),
        logoUrl: logoUrl || undefined,
        categories: ['saas-ipos-2024']
      };

      const updatedCompanies = [...companies, newCompany];
      setCompanies(updatedCompanies);
      saveLocalData(updatedCompanies);

      setMessage('✅ Company added successfully!');
      setCompanyId('');
      setCompanyName('');
      setTicker('');
      setLogoUrl('');
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMetric = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const currentData = localStorage.getItem(STORAGE_KEY);
      const parsed: LocalData = currentData ? JSON.parse(currentData) : { companies: [], metrics: [] };

      // Process sources to add contentType and contentPath
      const processedSources = sources.map(source => {
        const processedSource = { ...source };

        // If URL is provided, set contentPath and contentType
        if (source.url) {
          processedSource.contentPath = source.url;

          // Determine content type from URL
          if (source.url.toLowerCase().endsWith('.pdf')) {
            processedSource.contentType = 'pdf';
          } else {
            processedSource.contentType = 'html';
          }
        }

        return processedSource;
      });

      const newMetric: CompanyMetric = {
        companyId: selectedCompanyId,
        metricId: selectedMetricId,
        aggregatedValue,
        notes: notes || undefined,
        sources: processedSources
      };

      // Check if metric already exists, if so update it
      const existingIndex = parsed.metrics.findIndex(
        m => m.companyId === selectedCompanyId && m.metricId === selectedMetricId
      );

      if (existingIndex >= 0) {
        parsed.metrics[existingIndex] = newMetric;
      } else {
        parsed.metrics.push(newMetric);
      }

      saveLocalData(parsed.companies, parsed.metrics);

      setMessage('✅ Metric saved successfully!');
      setAggregatedValue('');
      setNotes('');
      setSources([]);
      setSelectedMetricId('');
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addSource = () => {
    setSources([...sources, {
      id: `src-${selectedCompanyId}-${Date.now()}`,
      type: 'filing',
      name: '',
      value: '',
      date: new Date().toISOString().split('T')[0]
    }]);
  };

  const updateSource = (index: number, field: keyof Source, value: string) => {
    const updated = [...sources];
    updated[index] = { ...updated[index], [field]: value };
    setSources(updated);
  };

  const removeSource = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
  };

  const openAnnotationModal = (index: number, sourceUrl?: string) => {
    setAnnotatingSourceIndex(index);
    setTempHighlights(sources[index].highlights || []);

    // If source has a URL, try to use it
    if (sourceUrl) {
      setPdfFile(sourceUrl);
    } else {
      setPdfFile('');
    }

    setCurrentPage(1);
    setAnnotationModalOpen(true);
  };

  const closeAnnotationModal = () => {
    setAnnotationModalOpen(false);
    setAnnotatingSourceIndex(null);
    setTempHighlights([]);
    setPdfFile('');
    setSearchText('');
  };

  const saveAnnotations = () => {
    if (annotatingSourceIndex !== null) {
      const updated = [...sources];
      updated[annotatingSourceIndex] = {
        ...updated[annotatingSourceIndex],
        highlights: tempHighlights
      };
      setSources(updated);
      setMessage('✅ Annotations saved to source');
    }
    closeAnnotationModal();
  };

  // PDF Annotation handlers
  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, width: 0, height: 0 });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDrawing || !startPos || !pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const width = currentX - startPos.x;
    const height = currentY - startPos.y;

    setCurrentBox({
      x: width > 0 ? startPos.x : currentX,
      y: height > 0 ? startPos.y : currentY,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  }

  function handleMouseUp() {
    if (!isDrawing || !currentBox) return;

    setIsDrawing(false);

    if (currentBox.width > 10 && currentBox.height > 10) {
      const normalizedBox: BoundingBox = {
        x: Math.round(currentBox.x / scale),
        y: Math.round(currentBox.y / scale),
        width: Math.round(currentBox.width / scale),
        height: Math.round(currentBox.height / scale)
      };

      const newHighlight: Highlight = {
        searchText: searchText || 'Update this text',
        pageNumber: currentPage,
        boundingBox: normalizedBox,
        highlightColor: '#FFEB3B'
      };

      setTempHighlights([...tempHighlights, newHighlight]);
    }

    setCurrentBox(null);
    setStartPos(null);
  }

  const deleteHighlight = (index: number) => {
    setTempHighlights(tempHighlights.filter((_, i) => i !== index));
  };

  // Export all data to JSON
  const handleExportData = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      setMessage('❌ No data to export');
      return;
    }

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `volute-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('✅ Data exported successfully');
  };

  // Import data from JSON
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsed: LocalData = JSON.parse(json);

        // Validate structure
        if (!parsed.companies || !Array.isArray(parsed.companies)) {
          throw new Error('Invalid data format');
        }

        localStorage.setItem(STORAGE_KEY, json);
        loadLocalData();
        setMessage('✅ Data imported successfully');
      } catch (error: any) {
        setMessage(`❌ Import error: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  const pageHighlights = tempHighlights.filter(h => h.pageNumber === currentPage);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Volute Admin Panel</h1>
          <div className="flex gap-2">
            <Button onClick={handleExportData} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportData}
              />
            </label>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Formatting Guidelines</h3>
              <p className="text-sm text-blue-800 mb-2">
                Always use exact amounts (never "20M" or "1.5B"). See <strong>METRICS_FORMAT_GUIDE.md</strong> for detailed formatting rules.
              </p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Dates: <code className="bg-blue-100 px-1 rounded">YYYY-MM-DD</code> (e.g., 2024-03-20)</li>
                <li>• Prices: <code className="bg-blue-100 px-1 rounded">$XX.XX per share</code> (e.g., $36.00 per share)</li>
                <li>• Share counts: <code className="bg-blue-100 px-1 rounded">XXX,XXX,XXX shares</code> (e.g., 20,000,000 shares)</li>
                <li>• Large amounts: <code className="bg-blue-100 px-1 rounded">$X,XXX,XXX,XXX</code> (e.g., $8,820,000,000)</li>
              </ul>
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-md mb-6 ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        <div className="mb-6 flex gap-2">
          <Button
            variant={activeTab === 'company' ? 'default' : 'outline'}
            onClick={() => setActiveTab('company')}
          >
            Add Company
          </Button>
          <Button
            variant={activeTab === 'metric' ? 'default' : 'outline'}
            onClick={() => setActiveTab('metric')}
          >
            Add/Update Metric
          </Button>
        </div>

        {activeTab === 'company' && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Add New Company</h2>
            <form onSubmit={handleAddCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company ID (slug)</label>
                <input
                  type="text"
                  placeholder="e.g., coreweave"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g., CoreWeave"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ticker</label>
                <input
                  type="text"
                  placeholder="e.g., CRWV"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Logo URL (optional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Company'}
              </Button>
            </form>
          </div>
        )}

        {activeTab === 'metric' && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Add/Update Metric</h2>
            <form onSubmit={handleAddMetric} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  required
                >
                  <option value="">Select a company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.ticker})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Metric</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  value={selectedMetricId}
                  onChange={(e) => setSelectedMetricId(e.target.value)}
                  required
                >
                  <option value="">Select a metric</option>
                  {metricDefinitions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.category})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Aggregated Value
                  <span className="text-xs text-gray-500 ml-2 font-normal">
                    (See METRICS_FORMAT_GUIDE.md for exact formats)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder={getPlaceholderForMetric(selectedMetricId)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  value={aggregatedValue}
                  onChange={(e) => setAggregatedValue(e.target.value)}
                  required
                />
                {selectedMetricId && (
                  <p className="text-xs text-gray-600 mt-1">
                    {getFormatHintForMetric(selectedMetricId)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  placeholder="Any additional context or caveats"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Sources</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addSource}>
                    + Add Source
                  </Button>
                </div>
                {sources.map((source, index) => (
                  <div key={index} className="border p-4 rounded-md mb-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-1">Type</label>
                        <select
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          value={source.type}
                          onChange={(e) => updateSource(index, 'type', e.target.value)}
                        >
                          <option value="filing">Filing</option>
                          <option value="news">News</option>
                          <option value="presentation">Presentation</option>
                          <option value="database">Database</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Date</label>
                        <input
                          type="date"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          value={source.date}
                          onChange={(e) => updateSource(index, 'date', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Source Name</label>
                      <input
                        type="text"
                        placeholder="e.g., S-1/A Filing"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        value={source.name}
                        onChange={(e) => updateSource(index, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Value in Source
                        <span className="text-gray-500 font-normal ml-1">(exact value found in document)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Exact value as it appears in source (e.g., $36.00, 20,000,000 shares)"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        value={source.value}
                        onChange={(e) => updateSource(index, 'value', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        URL (required for annotation)
                      </label>
                      <div className="space-y-1">
                        <select
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              updateSource(index, 'url', e.target.value);
                            }
                          }}
                        >
                          <option value="">Quick Select PDF...</option>
                          <optgroup label="Astera Labs">
                            <option value="/source-content/astera-labs/ALAB_S1A.pdf">Astera Labs S-1/A</option>
                            <option value="/source-content/astera-labs/ALAB_424B.pdf">Astera Labs 424B</option>
                          </optgroup>
                          <optgroup label="CoreWeave">
                            <option value="/source-content/coreweave/CRWV_424B.pdf">CoreWeave 424B</option>
                            <option value="/source-content/coreweave/CRWV_S1A_3.20.2025.pdf">CoreWeave S-1/A (3/20)</option>
                            <option value="/source-content/coreweave/CRWV_S1A_3.12.2025.pdf">CoreWeave S-1/A (3/12)</option>
                            <option value="/source-content/coreweave/CRWV_S1A_3.3.2025.pdf">CoreWeave S-1/A (3/3)</option>
                          </optgroup>
                          <optgroup label="Rubrik">
                            <option value="/source-content/rubrik/RBRK_S1A.pdf">Rubrik S-1/A</option>
                          </optgroup>
                        </select>
                        <input
                          type="text"
                          placeholder="/source-content/company-name/TICKER_Filing.pdf"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          value={source.url || ''}
                          onChange={(e) => updateSource(index, 'url', e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️ Use web path starting with / (e.g., /source-content/coreweave/CRWV_424B.pdf)
                        <br />NOT file system path (e.g., C:\Users\...)
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openAnnotationModal(index, source.url)}
                        disabled={!source.url}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Annotate Source {source.highlights && source.highlights.length > 0 && `(${source.highlights.length})`}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSource(index)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Metric'}
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Annotation Modal */}
      {annotationModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-bold">Annotate Source Document</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {pdfFile ? pdfFile : 'No document loaded'}
                </p>
              </div>
              <button
                onClick={closeAnnotationModal}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex">
              {/* Left: PDF Viewer */}
              <div className="flex-1 p-4 overflow-auto">
                {pdfFile && pdfFile.endsWith('.pdf') ? (
                  <>
                    <div className="flex items-center justify-between mb-4 pb-4 border-b">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                        >
                          Prev
                        </button>
                        <span className="text-sm text-gray-700 min-w-[100px] text-center">
                          Page {currentPage} / {numPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                          disabled={currentPage >= numPages}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                        >
                          -
                        </button>
                        <span className="text-sm text-gray-700 min-w-[60px] text-center">
                          {Math.round(scale * 100)}%
                        </span>
                        <button
                          onClick={() => setScale(s => Math.min(2.5, s + 0.25))}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded overflow-auto max-h-[600px]">
                      <div
                        ref={pageRef}
                        className="relative inline-block cursor-crosshair select-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      >
                        <Document
                          file={pdfFile}
                          onLoadSuccess={onDocumentLoadSuccess}
                          loading={<div className="p-8 text-white">Loading PDF...</div>}
                        >
                          <Page
                            pageNumber={currentPage}
                            scale={scale}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </Document>

                        {/* Saved Highlights */}
                        {pageHighlights.map((highlight, idx) => (
                          <div
                            key={idx}
                            className="absolute border-[3px] border-yellow-400 bg-yellow-400/20 pointer-events-none transition-all"
                            style={{
                              left: `${highlight.boundingBox.x * scale}px`,
                              top: `${highlight.boundingBox.y * scale}px`,
                              width: `${highlight.boundingBox.width * scale}px`,
                              height: `${highlight.boundingBox.height * scale}px`,
                              boxShadow: '0 0 0 2px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2)',
                            }}
                          >
                            {/* Label badge */}
                            <div className="absolute -top-7 left-0 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded shadow-md border border-yellow-500">
                              #{idx + 1}
                            </div>
                            {/* Text overlay */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-black text-xs font-semibold px-2 py-1 rounded shadow-lg max-w-[200px] truncate">
                              {highlight.searchText}
                            </div>
                          </div>
                        ))}

                        {/* Current Drawing Box */}
                        {currentBox && (
                          <div
                            className="absolute border-[4px] border-blue-500 bg-blue-500/25 pointer-events-none animate-pulse"
                            style={{
                              left: `${currentBox.x}px`,
                              top: `${currentBox.y}px`,
                              width: `${currentBox.width}px`,
                              height: `${currentBox.height}px`,
                              boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.5)',
                            }}
                          >
                            {/* Preview label */}
                            <div className="absolute -top-7 left-0 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded shadow-md animate-none">
                              Drawing...
                            </div>
                            {/* Dimensions display */}
                            {currentBox.width > 50 && currentBox.height > 30 && (
                              <div className="absolute bottom-1 right-1 bg-blue-500 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow animate-none">
                                {Math.round(currentBox.width)} × {Math.round(currentBox.height)}
                              </div>
                            )}
                            {/* Preview text if available */}
                            {searchText && currentBox.width > 80 && currentBox.height > 40 && (
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded shadow-lg max-w-[200px] truncate animate-none">
                                {searchText}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Corner guides for easier drawing */}
                        {isDrawing && currentBox && currentBox.width > 5 && currentBox.height > 5 && (
                          <>
                            {/* Top-left corner */}
                            <div
                              className="absolute w-3 h-3 bg-blue-500 rounded-full pointer-events-none"
                              style={{
                                left: `${currentBox.x - 6}px`,
                                top: `${currentBox.y - 6}px`,
                              }}
                            />
                            {/* Bottom-right corner */}
                            <div
                              className="absolute w-3 h-3 bg-blue-500 rounded-full pointer-events-none"
                              style={{
                                left: `${currentBox.x + currentBox.width}px`,
                                top: `${currentBox.y + currentBox.height}px`,
                              }}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                        <div className="font-semibold text-blue-900 mb-2">📍 How to Annotate:</div>
                        <ol className="text-blue-800 space-y-1 ml-4 list-decimal">
                          <li>Enter the search text in the right panel (e.g., "$36.00")</li>
                          <li>Click and drag on the PDF to draw a box around the value</li>
                          <li>Release mouse to save the bounding box</li>
                          <li>The box will turn yellow once saved</li>
                        </ol>
                      </div>

                      <div className="p-3 bg-gray-50 border border-gray-300 rounded text-xs">
                        <div className="font-semibold text-gray-900 mb-2">Color Legend:</div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-5 border-[3px] border-blue-500 bg-blue-500/25 rounded"></div>
                            <span className="text-gray-700"><strong>Blue (pulsing)</strong> - Currently drawing</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-5 border-[3px] border-yellow-400 bg-yellow-400/20 rounded"></div>
                            <span className="text-gray-700"><strong>Yellow</strong> - Saved highlights</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p>No PDF loaded or HTML annotation not yet supported</p>
                      <p className="text-sm mt-2">Add a PDF URL to the source to enable annotation</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Controls & Highlights */}
              <div className="w-80 border-l p-4 overflow-auto space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Search Text (for next box)</label>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="e.g., $36.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">
                    Highlights ({tempHighlights.length})
                  </h3>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {tempHighlights.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">
                        No highlights yet. Draw a box on the PDF.
                      </p>
                    ) : (
                      tempHighlights.map((highlight, index) => (
                        <div
                          key={index}
                          className="p-3 border-2 border-gray-200 rounded hover:border-yellow-400 hover:bg-yellow-50 transition-all cursor-pointer group"
                          onClick={() => {
                            if (highlight.pageNumber !== currentPage) {
                              setCurrentPage(highlight.pageNumber);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-bold flex items-center justify-center">
                                {index + 1}
                              </div>
                              <span className="text-xs font-semibold text-gray-600">
                                Page {highlight.pageNumber}
                              </span>
                              {highlight.pageNumber !== currentPage && (
                                <span className="text-xs text-blue-600 group-hover:underline">
                                  (click to jump)
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteHighlight(index);
                              }}
                              className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                              title="Delete highlight"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="text-sm space-y-2">
                            <div className="bg-yellow-100 border border-yellow-300 rounded px-2 py-1.5">
                              <div className="text-xs text-gray-600 mb-0.5">Text:</div>
                              <div className="font-semibold text-gray-900">{highlight.searchText}</div>
                            </div>

                            <div className="bg-gray-100 rounded px-2 py-1.5">
                              <div className="text-xs text-gray-600 mb-0.5">Bounding Box:</div>
                              <div className="text-xs font-mono text-gray-700 grid grid-cols-2 gap-x-2">
                                <div>x: {highlight.boundingBox.x}</div>
                                <div>y: {highlight.boundingBox.y}</div>
                                <div>w: {highlight.boundingBox.width}</div>
                                <div>h: {highlight.boundingBox.height}</div>
                              </div>
                            </div>

                            {/* Visual preview */}
                            <div className="bg-white border border-gray-300 rounded p-2 flex items-center justify-center">
                              <div
                                className="border-2 border-yellow-400 bg-yellow-400/20"
                                style={{
                                  width: `${Math.min(120, highlight.boundingBox.width / 3)}px`,
                                  height: `${Math.min(40, highlight.boundingBox.height / 3)}px`,
                                  minWidth: '40px',
                                  minHeight: '20px',
                                }}
                              >
                                <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500 font-mono">
                                  preview
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t p-4 flex justify-end gap-2">
              <Button variant="outline" onClick={closeAnnotationModal}>
                Cancel
              </Button>
              <Button onClick={saveAnnotations}>
                Save Annotations
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
