import { motion } from 'motion/react';
import { ArrowLeft, ExternalLink, Building2, Calendar, DollarSign, Users } from 'lucide-react';
import { SearchResult } from '../types';

interface IPODetailViewProps {
  result: SearchResult;
  onClose: () => void;
}

const categoryColors: Record<string, string> = {
  'IPO Filing Data': 'bg-blue-500 text-white',
  'Financial Metrics': 'bg-emerald-500 text-white',
  'Underwriter Info': 'bg-purple-500 text-white',
};

export function IPODetailView({ result, onClose }: IPODetailViewProps) {
  const { fullData } = result;

  // Group data by sections
  const basicInfo = [
    { label: 'Company Name', value: fullData['Company Name'] },
    { label: 'Ticker', value: fullData['Company Ticker'] },
    { label: 'Exchange', value: fullData['Exchange'] },
    { label: 'S1 Filing Date', value: fullData['S1 Filing Date'] },
    { label: 'IPO Date', value: fullData['IPO Date'] },
    { label: 'Shares Delivery Date', value: fullData['Shares Delivery Date'] },
  ];

  const pricingInfo = [
    { label: 'IPO Price Range', value: fullData['IPO Price Range'] },
    { label: 'Final Price', value: fullData['Final Price'] },
    { label: 'Shares Offered (Primary)', value: fullData['Shares Offered (Primary)'] },
    { label: 'Shares Offered (Secondary)', value: fullData['Shares Offered (Secondary)'] },
    { label: 'Total Shares Outstanding', value: fullData['Total Shares Outstanding'] },
  ];

  const financialInfo = [
    { label: 'Gross Proceeds', value: fullData['Gross Proceeds'] },
    { label: 'Net Proceeds', value: fullData['Net Proceeds'] },
    { label: 'Underwriter Discount (Per Share)', value: fullData['Underwriter Discount (Per Share)'] },
    { label: 'Underwriter Discount (Total)', value: fullData['Underwriter Discount (Total)'] },
    { label: 'Greenshoe Option', value: fullData['Greenshoe Option'] },
    { label: 'Directed Share Program', value: fullData['Directed Share Program'] },
  ];

  const underwriterInfo = [
    { label: 'Lead Bookrunners', value: fullData['Lead Bookrunners'] },
    { label: 'Co-Bookrunners', value: fullData['Co-Bookrunners'] },
    { label: 'Syndicate Members', value: fullData['Syndicate Members'] },
  ];

  const additionalInfo = [
    { label: 'Post-IPO Voting Control', value: fullData['Post-IPO Voting Control'] },
  ];

  const renderSection = (title: string, items: { label: string; value: string }[], icon: any) => {
    const Icon = icon;
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Icon className="size-5 text-indigo-600" />
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-2 hover:bg-gray-50 transition-colors">
                <div className="p-4 font-medium text-gray-700 bg-gray-50">{item.label}</div>
                <div className="p-4 text-gray-900">{item.value || 'N/A'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white z-50 overflow-y-auto"
    >
      {/* Header with back button */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-200 z-10">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="size-5" />
              <span>Back to results</span>
            </button>
            {fullData['Filing URL'] && (
              <a
                href={fullData['Filing URL']}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <span>View 424B4 Filing</span>
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="mb-2">{result.companyName}</h1>
                <div className="flex items-center gap-4 text-gray-600">
                  <span className="font-semibold text-indigo-600 text-xl">{result.ticker}</span>
                  <span>•</span>
                  <span>{result.exchange}</span>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full ${
                  categoryColors[result.category] || 'bg-gray-500 text-white'
                }`}
              >
                {result.category}
              </span>
            </div>
            <p className="text-gray-700">{result.description}</p>
          </div>
        </motion.div>

        {/* Data Sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {renderSection('Basic Information', basicInfo, Building2)}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {renderSection('Pricing & Shares', pricingInfo, DollarSign)}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {renderSection('Financial Details', financialInfo, DollarSign)}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {renderSection('Underwriters', underwriterInfo, Users)}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {renderSection('Additional Information', additionalInfo, Calendar)}
        </motion.div>

        {/* Notes Section */}
        {fullData.Notes && Object.keys(fullData.Notes).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-xl"
          >
            <h3 className="font-semibold text-lg mb-4">Notes</h3>
            <div className="space-y-3 text-sm">
              {Object.entries(fullData.Notes).map(([key, value]) => (
                <div key={key}>
                  <strong className="text-gray-700">{key}:</strong>
                  <span className="text-gray-600 ml-2">{value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
