import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { TablePage } from './components/TablePage';
import HomePage from './components/HomePage';
import { PdfAnnotationTool } from './components/PdfAnnotationTool';
import { AdminPanel } from './components/AdminPanel';
import { Company, Metric, MetricValue, IPOData, CompsCategory } from './types';
import { compsCategories } from './compsData';
import { getCompanyLogoUrl } from './config';
import { SearchResult } from './services/searchService';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'table' | 'home' | 'annotate' | 'admin'>(() => {
    // Check URL hash for special views
    console.log('Initial hash:', window.location.hash);
    if (window.location.hash === '#annotate') {
      return 'annotate';
    }
    if (window.location.hash === '#admin') {
      console.log('Admin view detected!');
      return 'admin';
    }
    return 'landing';
  });
  const [selectedCategory, setSelectedCategory] = useState<CompsCategory | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [metrics] = useState<Metric[]>([
    { id: 'ipoDate', name: 'IPO Date' },
    { id: 'finalPrice', name: 'Final Price' },
    { id: 'openingPrice', name: 'Opening Price' },
    { id: 'firstDayClosingPrice', name: 'First Day Closing Price' },
    { id: 'priceRange', name: 'Expected Price Range' },
    { id: 'ipoValuation', name: 'IPO Valuation' },
    { id: 'lastPrivateValuation', name: 'Last Private Valuation' },
    { id: 'upsizedOrDownsized', name: 'Upsized/Downsized' },
    { id: 'sharesOffered', name: 'Shares Offered (Primary)' },
    { id: 'sharesCompany', name: 'Shares Sold by Company' },
    { id: 'sharesSellingStockholders', name: 'Shares Sold by Selling Stockholders' },
    { id: 'greenshoeShares', name: 'Greenshoe Shares' },
    { id: 'commonStockOutstanding', name: 'Common Stock Outstanding' },
    { id: 'grossProceeds', name: 'Gross Proceeds' },
    { id: 'netProceeds', name: 'Net Proceeds' },
    { id: 'proceedsToCompany', name: 'Proceeds to Company' },
    { id: 'proceedsToSellingStockholders', name: 'Proceeds to Selling Stockholders' },
    { id: 'underwriterDiscount', name: 'Underwriter Discount' },
    { id: 'bookrunners', name: 'Bookrunning Banks' },
    { id: 'attorneys', name: 'Attorneys' },
    { id: 'notes', name: 'Notes' },
  ]);
  const [metricValues, setMetricValues] = useState<MetricValue[]>([]);

  // Handle hash changes
  useEffect(() => {
    const handleHashChange = () => {
      console.log('Hash changed to:', window.location.hash);
      if (window.location.hash === '#admin') {
        setCurrentView('admin');
      } else if (window.location.hash === '#annotate') {
        setCurrentView('annotate');
      } else if (window.location.hash === '') {
        setCurrentView('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Load data function (extracted so we can reload)
  const loadData = async () => {
    // Import the data service
    const { fetchAllFilings } = await import('./services/dataService');

    // Load data from API (Neon), fallback to local JSON, and enhanced sources
    Promise.all([
      fetchAllFilings(), // This now fetches from Neon API or falls back to JSON
      fetch('/data/astera-sources.json')
        .then((res) => res.json())
        .catch(() => null), // Gracefully handle if enhanced sources don't exist
      fetch('/data/rubrik-sources.json')
        .then((res) => res.json())
        .catch(() => null),
    ])
      .then(([data, asteraData, rubrikData]: [IPOData[], any, any]) => {
        // Load localStorage data
        const localStorageData = localStorage.getItem('volute-admin-data');
        let localData = null;
        if (localStorageData) {
          try {
            localData = JSON.parse(localStorageData);
          } catch (error) {
            console.error('Error parsing localStorage data:', error);
          }
        }
        // Convert IPO data to companies
        let companiesList: Company[] = data.map((ipo, index) => ({
          id: (index + 1).toString(),
          name: ipo['Company Name'],
          ticker: ipo['Company Ticker'],
          logo: getCompanyLogoUrl(ipo['Company Ticker']),
        }));

        // Add companies from localStorage
        if (localData && localData.companies) {
          localData.companies.forEach((localCompany: any) => {
            // Check if company already exists
            const exists = companiesList.find((c) => c.ticker === localCompany.ticker);
            if (!exists) {
              companiesList.push({
                id: localCompany.id,
                name: localCompany.name,
                ticker: localCompany.ticker,
                logo: localCompany.logoUrl || getCompanyLogoUrl(localCompany.ticker),
              });
            }
          });
        }

        setCompanies(companiesList);

        // Helper function to create source with page number and bounding box
        const createSource = (ipo: IPOData, metricName: string, value: any) => {
          const filingDate = ipo['IPO Date'] || ipo['Filing Date'];
          const pageNumber = ipo['Page Number']?.[metricName];
          const boundingBox = ipo['Bounding Boxes']?.[metricName];

          // Create highlights array if we have bounding box data
          const highlights = boundingBox && pageNumber ? [{
            searchText: value?.toString() || '',
            pageNumber: pageNumber,
            boundingBox: boundingBox,
            highlightColor: '#FFEB3B', // Yellow highlight
          }] : [];

          return {
            type: 'filing' as const,
            name: '424B4 Filing',
            value: value,
            date: filingDate,
            url: ipo['Filing URL'],
            contentPath: ipo['Filing URL'],
            contentType: 'pdf' as const,
            pageNumber: pageNumber,
            boundingBox: boundingBox,
            highlights: highlights,
          };
        };

        // Mapping from API field names to metricIds
        const metricMapping: Record<string, string> = {
          'IPO Date': 'ipoDate',
          'Final Price': 'finalPrice',
          'Opening Price': 'openingPrice',
          'First Day Closing Price': 'firstDayClosingPrice',
          'Expected Price Range': 'priceRange',
          'IPO Valuation': 'ipoValuation',
          'Last Private Valuation': 'lastPrivateValuation',
          'Upsized/Downsized': 'upsizedOrDownsized',
          'Shares Offered (Primary)': 'sharesOffered',
          'Shares Sold by Company': 'sharesCompany',
          'Shares Offered (Secondary)': 'sharesSellingStockholders',
          'Greenshoe Option': 'greenshoeShares',
          'Total Shares Outstanding': 'commonStockOutstanding',
          'Gross Proceeds': 'grossProceeds',
          'Net Proceeds': 'netProceeds',
          'Proceeds to Company': 'proceedsToCompany',
          'Proceeds to Selling Stockholders': 'proceedsToSellingStockholders',
          'Underwriter Discount (Per Share)': 'underwriterDiscount',
          'Underwriter Discount (Total)': 'underwriterDiscount',
          'Lead Bookrunners': 'bookrunners',
          'Co-Bookrunners': 'bookrunners', // Append to bookrunners
          'Syndicate Members': 'bookrunners', // Append to bookrunners
          'Directed Share Program': 'notes',
          'Shares Delivery Date': 'notes',
        };

        // Convert IPO data to metric values
        const values: MetricValue[] = [];
        data.forEach((ipo, index) => {
          const companyId = (index + 1).toString();

          // Dynamically create metric values for all fields in the response
          Object.entries(ipo).forEach(([fieldName, fieldValue]) => {
            // Skip metadata fields
            if (
              fieldName === 'Company Name' ||
              fieldName === 'Company Ticker' ||
              fieldName === 'Filing URL' ||
              fieldName === 'Exchange' ||
              fieldName === 'Filing Date' ||
              fieldName === 'Page Number' ||
              fieldName === 'Bounding Boxes' ||
              !fieldValue
            ) {
              return;
            }

            // Get the metricId for this field
            const metricId = metricMapping[fieldName];
            if (!metricId) {
              console.warn(`No metricId mapping for field: ${fieldName}`);
              return;
            }

            // Check if this metric already exists (for bookrunners, we might append)
            const existingValueIndex = values.findIndex(
              (v) => v.companyId === companyId && v.metricId === metricId
            );

            if (existingValueIndex !== -1 && metricId === 'bookrunners') {
              // Append to existing bookrunners value
              const existingValue = values[existingValueIndex].value;
              values[existingValueIndex].value = `${existingValue}, ${fieldValue}`;
              // Add source to existing sources array
              values[existingValueIndex].sources.push(createSource(ipo, fieldName, fieldValue));
            } else if (existingValueIndex === -1) {
              // Create new metric value
              values.push({
                companyId,
                metricId,
                value: fieldValue,
                sources: [createSource(ipo, fieldName, fieldValue)],
              });
            }
          });
        });

        // Merge enhanced sources for companies with additional data
        if (asteraData) {
          mergeEnhancedSources(values, asteraData, companiesList);
        }
        if (rubrikData) {
          mergeEnhancedSources(values, rubrikData, companiesList);
        }

        // Merge localStorage metrics
        if (localData && localData.metrics) {
          localData.metrics.forEach((localMetric: any) => {
            // Find the company in our companies list
            const company = companiesList.find((c) => c.id === localMetric.companyId);
            if (!company) {
              console.warn(`Company with id ${localMetric.companyId} not found`);
              return;
            }

            // Check if metric already exists
            const valueIndex = values.findIndex(
              (v) => v.companyId === company.id && v.metricId === localMetric.metricId
            );

            // Process sources to ensure contentPath and contentType are set
            const processedSources = (localMetric.sources || []).map((source: any) => {
              const processedSource = { ...source };

              // If contentPath is missing but url exists, copy it
              if (!processedSource.contentPath && source.url) {
                processedSource.contentPath = source.url;
              }

              // If contentType is missing, infer from URL
              if (!processedSource.contentType && (source.url || source.contentPath)) {
                const path = source.contentPath || source.url;
                if (path.toLowerCase().endsWith('.pdf')) {
                  processedSource.contentType = 'pdf';
                } else {
                  processedSource.contentType = 'html';
                }
              }

              return processedSource;
            });

            const metricValue = {
              companyId: company.id,
              metricId: localMetric.metricId,
              value: localMetric.aggregatedValue,
              notes: localMetric.notes,
              sources: processedSources,
            };

            if (valueIndex !== -1) {
              // Replace existing metric
              values[valueIndex] = metricValue;
            } else {
              // Add new metric
              values.push(metricValue);
            }
          });
        }

        setMetricValues(values);
      })
      .catch((error) => console.error('Error loading IPO data:', error));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when returning from admin panel
  useEffect(() => {
    if (currentView === 'table' || currentView === 'landing') {
      loadData();
    }
  }, [currentView]);

  // Function to merge enhanced sources for specific companies
  function mergeEnhancedSources(
    values: MetricValue[],
    enhancedData: any,
    companiesList: Company[]
  ) {
    // Find the company ID for the enhanced data
    const company = companiesList.find((c) => c.ticker === enhancedData.ticker);
    if (!company) {
      console.warn(`Company with ticker ${enhancedData.ticker} not found`);
      return;
    }

    // Update or add metric values with enhanced sources
    Object.entries(enhancedData.metrics).forEach(([metricKey, metricData]: any) => {
      const valueIndex = values.findIndex(
        (v) => v.companyId === company.id && v.metricId === metricKey
      );

      if (valueIndex !== -1) {
        // Replace existing metric with enhanced data
        values[valueIndex] = {
          ...values[valueIndex],
          value: metricData.aggregatedValue,
          sources: metricData.sources,
        };
      } else {
        // Add new metric that doesn't exist in base data
        values.push({
          companyId: company.id,
          metricId: metricKey,
          value: metricData.aggregatedValue,
          sources: metricData.sources,
        });
      }
    });
  }

  const handleCategoryClick = (category: CompsCategory) => {
    setSelectedCategory(category);
    setSearchResult(null); // Clear search results when clicking category
    setCurrentView('table');
  };

  const handleSearchResults = (result: SearchResult) => {
    setSearchResult(result);
    setSelectedCategory(null); // Clear category when showing search results
    setCurrentView('table');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
    setSelectedCategory(null);
    setSearchResult(null); // Clear search results when going back
  };

  if (currentView === 'annotate') {
    return <PdfAnnotationTool />;
  }

  if (currentView === 'admin') {
    return <AdminPanel />;
  }

  if (currentView === 'home') {
    return <HomePage />;
  }

  if (currentView === 'landing') {
    return (
      <LandingPage
        categories={compsCategories}
        onCategoryClick={handleCategoryClick}
        companies={companies}
        metrics={metrics}
        metricValues={metricValues}
        onSearchResults={handleSearchResults}
      />
    );
  }

  // Determine what data to show in table: search results or category data
  const tableData = searchResult
    ? {
        companies: searchResult.companies,
        metrics: searchResult.metrics,
        metricValues: searchResult.metricValues,
        categoryName: searchResult.meta.interpretation,
      }
    : {
        companies: companies,
        metrics: metrics,
        metricValues: metricValues,
        categoryName: selectedCategory?.name || 'IPO Metrics Dashboard',
      };

  return (
    <TablePage
      companies={tableData.companies}
      metrics={tableData.metrics}
      metricValues={tableData.metricValues}
      categoryName={tableData.categoryName}
      onBack={handleBackToLanding}
    />
  );
}
