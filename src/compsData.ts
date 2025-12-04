import { CompsCategory, Company, Metric, MetricValue } from './types';
import { getCompanyLogoUrl } from './config';

// Define comps categories
export const compsCategories: CompsCategory[] = [
  {
    id: 'saas-ipos-2024',
    name: 'SaaS IPOs 2024',
    description: 'Cloud security and infrastructure companies that went public in 2024',
    category: 'IPO Comps',
    companyCount: 2,
    metricCount: 5,
  },
  {
    id: 'cloud-infrastructure',
    name: 'Cloud Infrastructure',
    description: 'Public cloud infrastructure and security platform companies',
    category: 'Technology',
    companyCount: 2,
    metricCount: 5,
  },
];

// Define companies (using the 2 companies from the actual data)
export const companies: Company[] = [
  { id: 'rubrik', name: 'Rubrik', ticker: 'RBRK', logo: getCompanyLogoUrl('RBRK') },
  { id: 'reddit', name: 'Reddit', ticker: 'RDDT', logo: getCompanyLogoUrl('RDDT') },
];

// Define metrics
export const metrics: Metric[] = [
  { id: 'revenue', name: 'Revenue (M)' },
  { id: 'employees', name: 'Employees' },
  { id: 'growth', name: 'YoY Growth' },
  { id: 'valuation', name: 'Valuation (B)' },
  { id: 'funding', name: 'Total Funding (M)' },
];

// Define metric values with sources
export const metricValues: MetricValue[] = [
  // Rubrik
  {
    companyId: 'rubrik',
    metricId: 'revenue',
    value: '$628M',
    sources: [
      { type: 'filing', name: 'S-1 Filing', value: '$628M', date: '2024-03-29', url: '#' },
      { type: 'news', name: 'TechCrunch Report', value: '$627M', date: '2024-03-28', url: '#' },
      { type: 'database', name: 'S&P Capital IQ', value: '$628M', date: '2024-03-30', url: '#' },
    ]
  },
  {
    companyId: 'rubrik',
    metricId: 'employees',
    value: '3,452',
    sources: [
      { type: 'website', name: 'LinkedIn Company Page', value: '3,452', date: '2024-04-01', url: '#' },
      { type: 'filing', name: 'S-1 Filing', value: '3,400', date: '2024-03-29', url: '#' },
      { type: 'database', name: 'Crunchbase', value: '3,450', date: '2024-03-25', url: '#' },
    ]
  },
  {
    companyId: 'rubrik',
    metricId: 'growth',
    value: '+41%',
    sources: [
      { type: 'filing', name: 'S-1 Financial Data', value: '+41%', date: '2024-03-29', url: '#' },
      { type: 'news', name: 'Bloomberg Analysis', value: '+40.8%', date: '2024-03-30', url: '#' },
    ]
  },
  {
    companyId: 'rubrik',
    metricId: 'valuation',
    value: '$5.3B',
    sources: [
      { type: 'news', name: 'IPO Valuation', value: '$5.3B', date: '2024-04-25', url: '#' },
      { type: 'database', name: 'PitchBook', value: '$5.2B', date: '2024-04-24', url: '#' },
      { type: 'news', name: 'WSJ Report', value: '$5.3B', date: '2024-04-26', url: '#' },
    ]
  },
  {
    companyId: 'rubrik',
    metricId: 'funding',
    value: '$553M',
    sources: [
      { type: 'filing', name: 'S-1 Filing', value: '$553M', date: '2024-03-29', url: '#' },
      { type: 'database', name: 'Crunchbase', value: '$553M', date: '2024-03-30', url: '#' },
      { type: 'website', name: 'Company IR Page', value: '$553M', date: '2024-04-01', url: '#' },
    ]
  },
  // Reddit
  {
    companyId: 'reddit',
    metricId: 'revenue',
    value: '$804M',
    sources: [
      { type: 'filing', name: 'S-1 Filing', value: '$804M', date: '2024-02-22', url: '#' },
      { type: 'news', name: 'Financial Times', value: '$801M', date: '2024-02-23', url: '#' },
      { type: 'database', name: 'S&P Capital IQ', value: '$804M', date: '2024-02-24', url: '#' },
    ]
  },
  {
    companyId: 'reddit',
    metricId: 'employees',
    value: '2,013',
    sources: [
      { type: 'website', name: 'LinkedIn Company Page', value: '2,013', date: '2024-03-15', url: '#' },
      { type: 'filing', name: 'S-1 Filing', value: '2,000', date: '2024-02-22', url: '#' },
      { type: 'database', name: 'Glassdoor', value: '2,010', date: '2024-03-10', url: '#' },
    ]
  },
  {
    companyId: 'reddit',
    metricId: 'growth',
    value: '+21%',
    sources: [
      { type: 'filing', name: 'S-1 Financial Data', value: '+21%', date: '2024-02-22', url: '#' },
      { type: 'news', name: 'MarketWatch', value: '+20.9%', date: '2024-02-24', url: '#' },
    ]
  },
  {
    companyId: 'reddit',
    metricId: 'valuation',
    value: '$6.4B',
    sources: [
      { type: 'news', name: 'IPO Valuation', value: '$6.4B', date: '2024-03-21', url: '#' },
      { type: 'database', name: 'Bloomberg Terminal', value: '$6.3B', date: '2024-03-20', url: '#' },
      { type: 'news', name: 'Reuters', value: '$6.4B', date: '2024-03-22', url: '#' },
    ]
  },
  {
    companyId: 'reddit',
    metricId: 'funding',
    value: '$1.3B',
    sources: [
      { type: 'filing', name: 'S-1 Filing', value: '$1.3B', date: '2024-02-22', url: '#' },
      { type: 'database', name: 'Crunchbase', value: '$1.3B', date: '2024-02-23', url: '#' },
      { type: 'website', name: 'Company About Page', value: '$1.3B', date: '2024-02-24', url: '#' },
    ]
  },
];

// Function to get data for a specific category
export function getCategoryData(categoryId: string) {
  const category = compsCategories.find(c => c.id === categoryId);
  return {
    category,
    companies,
    metrics,
    metricValues,
  };
}
