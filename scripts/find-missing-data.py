"""
Data Integrity Analysis Script

This script analyzes filings.csv and metrics.csv to identify missing datapoints
for each company across all expected fields in both datasets.
"""

import pandas as pd
import numpy as np
from collections import defaultdict
import json

def load_data(filings_path, metrics_path):
    """Load and prepare the data from both CSV files."""
    print("Loading data from CSV files...")
    
    # Load filings data
    filings_df = pd.read_csv(filings_path)
    print(f"Loaded {len(filings_df)} filing records")
    
    # Load metrics data
    metrics_df = pd.read_csv(metrics_path)
    print(f"Loaded {len(metrics_df)} metric records")
    
    return filings_df, metrics_df

def check_filings(filings_df):
    """Check filing records for missing datapoints."""
    print("\nChecking filing records for missing data...")
    
    # Define expected fields for filings
    filing_fields = filings_df.columns.tolist()
    
    filings_missing = {}
    
    for index, row in filings_df.iterrows():
        filing_id = row['id']
        ticker = row['ticker'] if pd.notna(row['ticker']) and row['ticker'] != 'N/A' else f"Filing_{filing_id}"
        
        missing_fields = []
        for field in filing_fields:
            if field in filings_df.columns:
                value = row[field]
                # Consider missing if NaN, None, empty string, or 'N/A'
                if pd.isna(value) or value == '' or value == 'N/A':
                    missing_fields.append(field)
        
        if missing_fields:
            filings_missing[ticker] = {
                'filing_id': filing_id,
                'missing_fields': missing_fields
            }
    
    return filings_missing, filing_fields

def check_metrics(metrics_df, filings_df):
    """Check metrics records for missing datapoints."""
    print("\nChecking metrics records for missing data...")
    
    # Get all unique metric types from the data
    all_metric_types = metrics_df['metric_name'].unique()
    print(f"Found {len(all_metric_types)} unique metric types:")
    for metric in sorted(all_metric_types):
        print(f"  - {metric}")
    
    # Group metrics by filing_id
    metrics_by_filing = metrics_df.groupby('filing_id')
    
    # Create company mapping from filings
    filing_lookup = {}
    for _, row in filings_df.iterrows():
        filing_id = row['id']
        ticker = row['ticker'] if pd.notna(row['ticker']) and row['ticker'] != 'N/A' else f"Filing_{filing_id}"
        filing_lookup[filing_id] = ticker
    
    # Analyze metrics completeness
    metrics_completeness = {}
    
    for filing_id, group in metrics_by_filing:
        ticker = filing_lookup.get(filing_id, f"Filing_{filing_id}")
        
        # Get metrics present for this filing
        present_metrics = set(group['metric_name'].tolist())
        
        # Find missing metrics
        missing_metrics = []
        metrics_with_na_values = []
        
        for metric_type in all_metric_types:
            if metric_type not in present_metrics:
                missing_metrics.append(metric_type)
            else:
                # Check if metric has N/A value
                metric_rows = group[group['metric_name'] == metric_type]
                for _, metric_row in metric_rows.iterrows():
                    if pd.isna(metric_row['metric_value']) or metric_row['metric_value'] == 'N/A' or metric_row['metric_value'] == '':
                        metrics_with_na_values.append(metric_type)
        
        if missing_metrics or metrics_with_na_values:
            metrics_completeness[ticker] = {
                'filing_id': filing_id,
                'missing_metrics': missing_metrics,
                'na_value_metrics': list(set(metrics_with_na_values)),
                'total_metrics_present': len(present_metrics),
                'completion_rate': len(present_metrics) / len(all_metric_types) * 100
            }
    
    return metrics_completeness, all_metric_types

def summary_stats(filings_missing, metrics_completeness, all_metric_types, filing_fields):
    """Generate summary report."""

    # Overall statistics
    total_companies_with_filing_issues = len(filings_missing)
    total_companies_with_metric_issues = len(metrics_completeness)
    
    print(f"\nSummary Statistics:")
    print(f"├── Companies with filing data issues: {total_companies_with_filing_issues}")
    print(f"├── Companies with metric data issues: {total_companies_with_metric_issues}")
    print(f"├── Total unique metric types expected: {len(all_metric_types)}")
    print(f"└── Total filing fields expected: {len(filing_fields)}")
    
    # Filings completeness summary
    print(f"\nIssues with filing records:")
    if not filings_missing:
        print("All companies have complete filing data")
    else:
        field_issue_counts = defaultdict(int)
        for company, data in filings_missing.items():
            for field in data['missing_fields']:
                field_issue_counts[field] += 1
        
        print("Most common missing filing fields:")
        for field, count in sorted(field_issue_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"  - {field}: {count} companies missing")
    
    # Metrics completeness summary
    print(f"\nIssues with metrics records:")
    if not metrics_completeness:
        print("All companies have complete metric data")
    else:
        # Count missing metrics across all companies
        metric_issue_counts = defaultdict(int)
        na_value_counts = defaultdict(int)
        
        for company, data in metrics_completeness.items():
            for metric in data['missing_metrics']:
                metric_issue_counts[metric] += 1
            for metric in data['na_value_metrics']:
                na_value_counts[metric] += 1
        
        print("Most common completely missing metrics:")
        for metric, count in sorted(metric_issue_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"  - {metric}: {count} companies missing")
        
        print("\nMost common metrics with N/A values:")
        for metric, count in sorted(na_value_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"  - {metric}: {count} companies with N/A")

def missing_data_report(filings_missing, metrics_completeness, filings_df):
    """Generate report formatted by company showing all missing fields."""
    
    # Get all companies with issues
    all_companies_with_issues = set(filings_missing.keys()) | set(metrics_completeness.keys())
    
    if not all_companies_with_issues:
        print("\nNo companies have any data completeness issues!")
        return
    
    print(f"\n{len(all_companies_with_issues)} companies with missing data:")
    
    for company in sorted(all_companies_with_issues):
        print(f"\nCOMPANY: {company}")
        
        # Get filing ID for context
        filing_id = None
        if company in filings_missing:
            filing_id = filings_missing[company]['filing_id']
        elif company in metrics_completeness:
            filing_id = metrics_completeness[company]['filing_id']
        
        print(f"Filing ID: {filing_id}")
        
        # Filing data issues
        if company in filings_missing:
            filing_data = filings_missing[company]
            print(f"\nMISSING FILING FIELDS ({len(filing_data['missing_fields'])} fields):")
            if filing_data['missing_fields']:
                for field in sorted(filing_data['missing_fields']):
                    print(f"  - {field}")
            else:
                print("  None")
        else:
            print(f"\nMISSING FILING FIELDS:")
            print("  None - All filing fields present")
        
        # Metric data issues
        if company in metrics_completeness:
            metric_data = metrics_completeness[company]
            completion_rate = metric_data['completion_rate']
            
            print(f"\nMETRIC DATA STATUS:")
            print(f"  Completion rate: {completion_rate:.1f}%")
            
            # Completely missing metrics
            if metric_data['missing_metrics']:
                print(f"\n  COMPLETELY MISSING METRICS ({len(metric_data['missing_metrics'])} metrics):")
                for metric in sorted(metric_data['missing_metrics']):
                    print(f"    - {metric}")
            
            # Metrics with N/A values
            if metric_data['na_value_metrics']:
                print(f"\n  METRICS WITH N/A VALUES ({len(metric_data['na_value_metrics'])} metrics):")
                for metric in sorted(metric_data['na_value_metrics']):
                    print(f"    - {metric}")
            
            # Show what metrics are actually present and valid
            total_possible = len(metric_data['missing_metrics']) + len(metric_data['na_value_metrics']) + metric_data['total_metrics_present']
            valid_metrics = metric_data['total_metrics_present'] - len(metric_data['na_value_metrics'])
            if valid_metrics > 0:
                print(f"\n  VALID METRICS PRESENT: {valid_metrics} out of {total_possible} possible")
        else:
            print(f"\nMETRIC DATA STATUS:")
            print("  All metrics present and valid")
        
def save_report(filings_missing, metrics_completeness, all_metric_types, filing_fields, output_path):
    """Save a detailed JSON report organized by company."""
    
    # Get all companies with issues
    all_companies_with_issues = set(filings_missing.keys()) | set(metrics_completeness.keys())
    
    # Build company-centric report structure
    companies_report = {}
    
    for company in all_companies_with_issues:
        company_data = {
            "company_name": company,
            "filing_id": None,
            "filing_issues": {
                "has_missing_fields": False,
                "missing_fields": [],
                "missing_fields_count": 0
            },
            "metric_issues": {
                "has_issues": False,
                "completion_rate": 100.0,
                "completely_missing_metrics": [],
                "completely_missing_count": 0,
                "na_value_metrics": [],
                "na_value_count": 0,
                "total_metrics_present": 0,
                "valid_metrics_count": 0
            }
        }
        
        # Get filing ID
        if company in filings_missing:
            company_data["filing_id"] = filings_missing[company]['filing_id']
        elif company in metrics_completeness:
            company_data["filing_id"] = metrics_completeness[company]['filing_id']
        
        # Filing data issues
        if company in filings_missing:
            filing_data = filings_missing[company]
            company_data["filing_issues"] = {
                "has_missing_fields": True,
                "missing_fields": sorted(filing_data['missing_fields']),
                "missing_fields_count": len(filing_data['missing_fields'])
            }
        
        # Metric data issues
        if company in metrics_completeness:
            metric_data = metrics_completeness[company]
            valid_metrics = metric_data['total_metrics_present'] - len(metric_data['na_value_metrics'])
            
            company_data["metric_issues"] = {
                "has_issues": True,
                "completion_rate": metric_data['completion_rate'],
                "completely_missing_metrics": sorted(metric_data['missing_metrics']),
                "completely_missing_count": len(metric_data['missing_metrics']),
                "na_value_metrics": sorted(metric_data['na_value_metrics']),
                "na_value_count": len(metric_data['na_value_metrics']),
                "total_metrics_present": metric_data['total_metrics_present'],
                "valid_metrics_count": valid_metrics
            }
        
        companies_report[company] = company_data
    
    # Build complete report structure
    report = {
        "report_metadata": {
            "report_type": "missing_data",
            "generated_at": pd.Timestamp.now().isoformat(),
            "total_companies_analyzed": len(all_companies_with_issues),
            "companies_with_filing_issues": len(filings_missing),
            "companies_with_metric_issues": len(metrics_completeness),
            "expected_filing_fields": len(filing_fields),
            "expected_metric_types": len(all_metric_types)
        },
        "expected_fields": {
            "filing_fields": sorted(filing_fields),
            "metric_types": sorted(all_metric_types)
        },
        "companies": companies_report,
        "summary_statistics": {
            "filing_field_issues": {},
            "metric_issues": {}
        }
    }
    
    # Add summary statistics for filing fields
    filing_field_counts = {}
    for company, data in filings_missing.items():
        for field in data['missing_fields']:
            filing_field_counts[field] = filing_field_counts.get(field, 0) + 1
    report["summary_statistics"]["filing_field_issues"] = dict(sorted(filing_field_counts.items(), key=lambda x: x[1], reverse=True))
    
    # Add summary statistics for metrics
    missing_metric_counts = {}
    na_metric_counts = {}
    for company, data in metrics_completeness.items():
        for metric in data['missing_metrics']:
            missing_metric_counts[metric] = missing_metric_counts.get(metric, 0) + 1
        for metric in data['na_value_metrics']:
            na_metric_counts[metric] = na_metric_counts.get(metric, 0) + 1
    
    report["summary_statistics"]["metric_issues"] = {
        "completely_missing_metrics": dict(sorted(missing_metric_counts.items(), key=lambda x: x[1], reverse=True)),
        "na_value_metrics": dict(sorted(na_metric_counts.items(), key=lambda x: x[1], reverse=True))
    }
    
    # Save to file
    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"\nJSON report saved to: {output_path}")
    return report

def main():
    # File paths
    filings_path = 'filings.csv'
    metrics_path = 'metrics.csv'
    output_path = 'missing-data-report.json'
    
    try:
        # Load data
        filings_df, metrics_df = load_data(filings_path, metrics_path)
        
        # Analyze filings completeness
        filings_missing, filing_fields = check_filings(filings_df)
        
        # Analyze metrics completeness
        metrics_completeness, all_metric_types = check_metrics(metrics_df, filings_df)
        
        # Generate summary report
        summary_stats(filings_missing, metrics_completeness, all_metric_types, filing_fields)
        
        # Generate detailed company-formatted report
        missing_data_report(filings_missing, metrics_completeness, filings_df)
        
        # Save JSON report
        save_report(filings_missing, metrics_completeness, all_metric_types, filing_fields, output_path)
        
        print(f"\nAnalysis complete!")
        print(f"Summary: {len(filings_missing)} companies with filing data issues, {len(metrics_completeness)} with metric data issues")
        
    except Exception as e:
        print(f"Error during analysis: {str(e)}")
        raise

if __name__ == "__main__":
    # For detailed analysis with summary statistics, use:
    main()