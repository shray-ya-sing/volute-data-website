import { CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";
import { SlideDataPoint, VerificationSourceType, getVerificationByType } from "../types/slideData";

interface VerificationBadgesProps {
  dataPoint: SlideDataPoint;
}

const sourceTypeLabels: Record<VerificationSourceType, string> = {
  filing: "SEC Filing",
  news: "News Article",
  company_website: "Company Website",
  management_presentation: "Mgmt. Presentation",
};

export function VerificationBadges({ dataPoint }: VerificationBadgesProps) {
  const sourceTypes: VerificationSourceType[] = [
    "filing",
    "news",
    "company_website",
    "management_presentation",
  ];

  const getStatusIcon = (type: VerificationSourceType) => {
    const verification = getVerificationByType(dataPoint, type);

    if (!verification) {
      return <Clock className="w-4 h-4 text-gray-300" />;
    }

    if (verification.verified && verification.confidence > 0.7) {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    } else if (verification.verified && verification.confidence > 0.4) {
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getTooltipText = (type: VerificationSourceType): string => {
    const verification = getVerificationByType(dataPoint, type);
    const label = sourceTypeLabels[type];

    if (!verification) {
      return `${label}: Not verified yet`;
    }

    if (verification.verified && verification.confidence > 0.7) {
      return `${label}: Verified (${Math.round(verification.confidence * 100)}% confidence)`;
    } else if (verification.verified && verification.confidence > 0.4) {
      return `${label}: Partial match (${Math.round(verification.confidence * 100)}% confidence)`;
    } else {
      return `${label}: Not found or low confidence`;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {sourceTypes.map((type) => (
        <div
          key={type}
          className="relative group"
          title={getTooltipText(type)}
        >
          {getStatusIcon(type)}
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {getTooltipText(type)}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      ))}
    </div>
  );
}
