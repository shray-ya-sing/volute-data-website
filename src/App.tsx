import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { TablePage } from './components/TablePage';
import HomePage from './components/HomePage';
import { PdfAnnotationTool } from './components/PdfAnnotationTool';
import { Company, Metric, MetricValue, IPOData, CompsCategory } from './types';
import { compsCategories } from './compsData';
import { getCompanyLogoUrl } from './config';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'table' | 'home' | 'annotate'>(() => {
    // Check URL hash for annotation tool
    if (window.location.hash === '#annotate') {
      return 'annotate';
    }
    return 'landing';
  });
  const [selectedCategory, setSelectedCategory] = useState<CompsCategory | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [metrics] = useState<Metric[]>([
    { id: 'finalPrice', name: 'Final Price' },
    { id: 'grossProceeds', name: 'Gross Proceeds' },
    { id: 'netProceeds', name: 'Net Proceeds' },
    { id: 'sharesOffered', name: 'Shares Offered' },
    { id: 'underwriterDiscount', name: 'Underwriter Discount' },
  ]);
  const [metricValues, setMetricValues] = useState<MetricValue[]>([]);

  useEffect(() => {
    // Load data.json and enhanced sources for multiple companies
    Promise.all([
      fetch('/data.json').then((res) => res.json()),
      fetch('/data/astera-sources.json')
        .then((res) => res.json())
        .catch(() => null), // Gracefully handle if enhanced sources don't exist
      fetch('/data/rubrik-sources.json')
        .then((res) => res.json())
        .catch(() => null),
    ])
      .then(([data, asteraData, rubrikData]: [IPOData[], any, any]) => {
        // Convert IPO data to companies
        const companiesList: Company[] = data.map((ipo, index) => ({
          id: (index + 1).toString(),
          name: ipo['Company Name'],
          ticker: ipo['Company Ticker'],
          logo: getCompanyLogoUrl(ipo['Company Ticker']),
        }));
        setCompanies(companiesList);

        // Convert IPO data to metric values
        const values: MetricValue[] = [];
        data.forEach((ipo, index) => {
          const companyId = (index + 1).toString();
          const filingDate = ipo['IPO Date'];

          values.push(
            {
              companyId,
              metricId: 'finalPrice',
              value: ipo['Final Price'],
              sources: [
                { type: 'filing', name: '424B4 Filing', value: ipo['Final Price'], date: filingDate, url: ipo['Filing URL'] },
              ],
            },
            {
              companyId,
              metricId: 'grossProceeds',
              value: ipo['Gross Proceeds'],
              sources: [
                { type: 'filing', name: '424B4 Filing', value: ipo['Gross Proceeds'], date: filingDate, url: ipo['Filing URL'] },
              ],
            },
            {
              companyId,
              metricId: 'netProceeds',
              value: ipo['Net Proceeds'],
              sources: [
                { type: 'filing', name: '424B4 Filing', value: ipo['Net Proceeds'], date: filingDate, url: ipo['Filing URL'] },
              ],
            },
            {
              companyId,
              metricId: 'sharesOffered',
              value: ipo['Shares Offered (Primary)'],
              sources: [
                { type: 'filing', name: '424B4 Filing', value: ipo['Shares Offered (Primary)'], date: filingDate, url: ipo['Filing URL'] },
              ],
            },
            {
              companyId,
              metricId: 'underwriterDiscount',
              value: ipo['Underwriter Discount (Total)'],
              sources: [
                { type: 'filing', name: '424B4 Filing', value: ipo['Underwriter Discount (Total)'], date: filingDate, url: ipo['Filing URL'] },
              ],
            }
          );
        });

        // Merge enhanced sources for companies with additional data
        if (asteraData) {
          mergeEnhancedSources(values, asteraData, companiesList);
        }
        if (rubrikData) {
          mergeEnhancedSources(values, rubrikData, companiesList);
        }

        setMetricValues(values);
      })
      .catch((error) => console.error('Error loading IPO data:', error));
  }, []);

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

    // Update metric values with enhanced sources
    Object.entries(enhancedData.metrics).forEach(([metricKey, metricData]: any) => {
      const valueIndex = values.findIndex(
        (v) => v.companyId === company.id && v.metricId === metricKey
      );

      if (valueIndex !== -1) {
        // Replace with enhanced data
        values[valueIndex] = {
          ...values[valueIndex],
          value: metricData.aggregatedValue,
          sources: metricData.sources,
        };
      }
    });
  }

  const handleCategoryClick = (category: CompsCategory) => {
    setSelectedCategory(category);
    setCurrentView('table');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
    setSelectedCategory(null);
  };

  if (currentView === 'annotate') {
    return <PdfAnnotationTool />;
  }

  if (currentView === 'home') {
    return <HomePage />;
  }

  if (currentView === 'landing') {
    return <LandingPage categories={compsCategories} onCategoryClick={handleCategoryClick} />;
  }

  return (
    <TablePage
      companies={companies}
      metrics={metrics}
      metricValues={metricValues}
      categoryName={selectedCategory?.name || 'IPO Metrics Dashboard'}
      onBack={handleBackToLanding}
    />
  );
}
