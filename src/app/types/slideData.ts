/**
 * Types for slide data verification and auditing system
 */

// Verification source types
export type VerificationSourceType = 
  | 'filing' 
  | 'news' 
  | 'company_website' 
  | 'management_presentation';

// Single verification result
export interface VerificationResult {
  sourceType: VerificationSourceType;
  verified: boolean;
  confidence: number; // 0-1
  timestamp: number;
  url?: string;
  snippet?: string;
}

// Single datapoint from a slide
export interface SlideDataPoint {
  id: string;
  label: string;           // e.g., "Revenue (FY 2024)"
  value: string;           // e.g., "$3.1B"
  sourceUrls: string[];    // Original source URLs from agent
  verifications: VerificationResult[];  // Verification results
  position?: { x: number; y: number }; // Optional: position on slide
}

// Table data for a slide
export interface SlideDataTable {
  slideId: string;
  slideNumber: number;
  dataPoints: SlideDataPoint[];
  lastVerified?: number;
}

// Verification status for UI display
export type VerificationStatus = 'verified' | 'partial' | 'unverified' | 'pending';

// Helper to get overall verification status for a datapoint
export function getDataPointVerificationStatus(dataPoint: SlideDataPoint): VerificationStatus {
  if (dataPoint.verifications.length === 0) {
    return 'pending';
  }
  
  const verifiedCount = dataPoint.verifications.filter(v => v.verified && v.confidence > 0.7).length;
  const totalCount = dataPoint.verifications.length;
  
  if (verifiedCount === totalCount) {
    return 'verified';
  } else if (verifiedCount > 0) {
    return 'partial';
  } else {
    return 'unverified';
  }
}

// Helper to get verification result by type
export function getVerificationByType(
  dataPoint: SlideDataPoint, 
  type: VerificationSourceType
): VerificationResult | undefined {
  return dataPoint.verifications.find(v => v.sourceType === type);
}
