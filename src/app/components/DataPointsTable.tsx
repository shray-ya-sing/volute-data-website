import { CheckCircle2, HelpCircle } from "lucide-react";
import { SlideDataPoint } from "../types/slideData";

interface DataPointsTableProps {
  dataPoints: SlideDataPoint[];
  onDataPointClick: (dataPoint: SlideDataPoint) => void;
  selectedDataPointId?: string | null;
}

export function DataPointsTable({ dataPoints, onDataPointClick, selectedDataPointId }: DataPointsTableProps) {
  // Calculate confidence from verifications (mock for now - will be real when verification system is built)
  const getConfidence = (dataPoint: SlideDataPoint): number => {
    if (dataPoint.verifications.length === 0) {
      // Use source count as a proxy for confidence when no verifications exist yet
      return Math.min(dataPoint.sourceUrls.length * 25, 100);
    }
    const avgConfidence = dataPoint.verifications.reduce((sum, v) => sum + v.confidence, 0) / dataPoint.verifications.length;
    return avgConfidence * 100;
  };

  const getVerificationIcon = (confidence: number) => {
    if (confidence >= 90) {
      return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    } else if (confidence >= 60) {
      return <CheckCircle2 className="w-5 h-5 text-amber-500" />;
    } else if (confidence >= 40) {
      return <CheckCircle2 className="w-5 h-5 text-gray-400" />;
    } else {
      return <HelpCircle className="w-5 h-5 text-gray-300" />;
    }
  };

  return (
    <div className="bg-[var(--volute-surface)] rounded-lg border border-[var(--volute-border)] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--volute-border)] bg-[var(--volute-surface-2)]">
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--volute-text-primary)] w-2/5">
                Label
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--volute-text-primary)] w-1/4">
                Value
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--volute-text-primary)] w-1/6">
                Sources
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-[var(--volute-text-primary)] w-1/6">
                Verification
              </th>
            </tr>
          </thead>
          <tbody>
            {dataPoints.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-[var(--volute-text-muted)] text-sm">
                  No data points available for this slide
                </td>
              </tr>
            ) : (
              dataPoints.map((dataPoint) => {
                const confidence = getConfidence(dataPoint);
                const isSelected = selectedDataPointId === dataPoint.id;
                
                return (
                  <tr
                    key={dataPoint.id}
                    className={`border-b border-[var(--volute-border)] hover:bg-[var(--volute-surface-2)] transition-colors cursor-pointer ${
                      isSelected ? 'bg-[var(--volute-accent-dim)]' : ''
                    }`}
                    onClick={() => onDataPointClick(dataPoint)}
                  >
                    <td className="px-6 py-4 text-sm text-[var(--volute-text-primary)] font-medium">
                      {dataPoint.label}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--volute-text-primary)] font-semibold">
                      {dataPoint.value}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--volute-text-secondary)]">
                      <span className="inline-flex items-center px-2.5 py-1 bg-[var(--volute-accent-dim)] text-[var(--volute-accent)] rounded-full text-xs font-medium">
                        {dataPoint.sourceUrls.length}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center">
                        {getVerificationIcon(confidence)}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}