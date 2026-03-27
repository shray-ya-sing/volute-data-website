import { CheckCircle2, HelpCircle } from "lucide-react";
import { SlideDataPoint } from "../types/slideData";

interface DataPointsTableProps {
  dataPoints: SlideDataPoint[];
  onDataPointClick: (dataPoint: SlideDataPoint) => void;
  selectedDataPointId?: string | null;
}

export function DataPointsTable({ dataPoints, onDataPointClick, selectedDataPointId }: DataPointsTableProps) {
  return (
    <div className="bg-[var(--volute-surface)] rounded-lg border border-[var(--volute-border)] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--volute-border)] bg-[var(--volute-surface-2)]">
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--volute-text-primary)] w-2/5">
                Label
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--volute-text-primary)] w-1/3">
                Value
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--volute-text-primary)] w-1/4">
                Sources
              </th>
            </tr>
          </thead>
          <tbody>
            {dataPoints.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-[var(--volute-text-muted)] text-sm">
                  No data points available for this slide
                </td>
              </tr>
            ) : (
              dataPoints.map((dataPoint) => {
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