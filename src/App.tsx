import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { TablePage } from './components/TablePage';
import HomePage from './components/HomePage';
import { Company, Metric, MetricValue, IPOData, CompsCategory } from './types';
import { compsCategories } from './compsData';
import { getCompanyLogoUrl } from './config';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'table' | 'home'>('home');
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
    fetch('/data.json')
      .then((res) => res.json())
      .then((data: IPOData[]) => {
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
              ]
            },
            {
              companyId,
              metricId: 'grossProceeds',
              value: ipo['Gross Proceeds'],
              sources: [
                { type: 'filing', name: '424B4 Filing', value: ipo['Gross Proceeds'], date: filingDate, url: ipo['Filing URL'] },
              ]
            },
            {
              companyId,
              metricId: 'netProceeds',
              value: ipo['Net Proceeds'],
              sources: [
                { type: 'filing', name: '424B4 Filing', value: ipo['Net Proceeds'], date: filingDate, url: ipo['Filing URL'] },
              ]
            },
            {
              companyId,
              metricId: 'sharesOffered',
              value: ipo['Shares Offered (Primary)'],
              sources: [
                { type: 'filing', name: '424B4 Filing', value: ipo['Shares Offered (Primary)'], date: filingDate, url: ipo['Filing URL'] },
              ]
            },
            {
              companyId,
              metricId: 'underwriterDiscount',
              value: ipo['Underwriter Discount (Total)'],
              sources: [
                { type: 'filing', name: '424B4 Filing', value: ipo['Underwriter Discount (Total)'], date: filingDate, url: ipo['Filing URL'] },
              ]
            }
          );
        });
        setMetricValues(values);
      })
      .catch((error) => console.error('Error loading IPO data:', error));
  }, []);

  const handleCategoryClick = (category: CompsCategory) => {
    setSelectedCategory(category);
    setCurrentView('table');
  };

  const handleBackToLanding = () => {
    setCurrentView('home');
    setSelectedCategory(null);
  };

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
