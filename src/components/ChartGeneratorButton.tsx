import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ChartGeneratorDialog } from './ChartGeneratorDialog';
import { Company, Metric, MetricValue } from '../types';

interface ChartGeneratorButtonProps {
  companies: Company[];
  metrics: Metric[];
  metricValues: MetricValue[];
  className?: string;
}

export function ChartGeneratorButton({
  companies,
  metrics,
  metricValues,
  className = '',
}: ChartGeneratorButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        className={`flex items-center justify-center gap-3 w-48 py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors shadow-lg ${className}`}
        title="Generate chart with AI"
      >
        <Sparkles className="w-5 h-5" />
        <span>Transform</span>
      </button>

      <ChartGeneratorDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        companies={companies}
        metrics={metrics}
        metricValues={metricValues}
      />
    </>
  );
}
