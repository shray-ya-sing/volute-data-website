/**
 * Mock data utilities for testing the Data View system
 * This can be used to add test data to slides for UI development
 */

import { SlideDataPoint, VerificationResult } from "../types/slideData";

/**
 * Generate mock data points for a slide
 */
export function generateMockDataPoints(slideNumber: number): SlideDataPoint[] {
  const mockDataPoints: SlideDataPoint[] = [
    {
      id: `dp-${slideNumber}-1`,
      label: "Market Share Growth",
      value: "42.5%",
      sourceUrls: [
        "https://example.com/market-research-2024",
        "https://example.com/quarterly-report"
      ],
      verifications: [
        {
          sourceType: "company_website",
          verified: true,
          confidence: 0.95,
          timestamp: Date.now(),
          url: "https://example.com/market-research-2024",
          snippet: "Market share increased to 42.5% in Q4 2024"
        },
        {
          sourceType: "filing",
          verified: true,
          confidence: 0.92,
          timestamp: Date.now(),
          url: "https://example.com/quarterly-report",
          snippet: "Annual growth rate of 42.5%"
        }
      ]
    },
    {
      id: `dp-${slideNumber}-2`,
      label: "Revenue Increase",
      value: "$2.8M",
      sourceUrls: [
        "https://example.com/financial-statement"
      ],
      verifications: [
        {
          sourceType: "filing",
          verified: true,
          confidence: 0.88,
          timestamp: Date.now(),
          url: "https://example.com/financial-statement",
          snippet: "Total revenue: $2.8M"
        }
      ]
    },
    {
      id: `dp-${slideNumber}-3`,
      label: "Customer Satisfaction",
      value: "94.2/100",
      sourceUrls: [
        "https://example.com/customer-survey",
        "https://example.com/nps-results",
        "https://example.com/feedback-analysis"
      ],
      verifications: [
        {
          sourceType: "company_website",
          verified: true,
          confidence: 0.91,
          timestamp: Date.now(),
          url: "https://example.com/customer-survey",
          snippet: "Customer satisfaction score: 94.2/100"
        },
        {
          sourceType: "news",
          verified: true,
          confidence: 0.85,
          timestamp: Date.now(),
          url: "https://example.com/nps-results"
        },
        {
          sourceType: "management_presentation",
          verified: false,
          confidence: 0.45,
          timestamp: Date.now(),
          url: "https://example.com/feedback-analysis"
        }
      ]
    },
    {
      id: `dp-${slideNumber}-4`,
      label: "User Base",
      value: "1.2M active users",
      sourceUrls: [
        "https://example.com/analytics-dashboard"
      ],
      verifications: [] // Pending verification
    }
  ];

  return mockDataPoints;
}