import ExcelJS from 'exceljs';
import { Company, Metric, MetricValue } from '../types';

export async function exportToExcel(
  companies: Company[],
  metrics: Metric[],
  metricValues: MetricValue[],
  categoryName: string
) {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(categoryName);

  // Get metric value helper function
  const getMetricValue = (companyId: string, metricId: string): string => {
    const metricValue = metricValues.find(
      (mv) => mv.companyId === companyId && mv.metricId === metricId
    );
    return metricValue?.value || '-';
  };

  // Create header row with logo column
  const headerRow = worksheet.addRow(['Company Logo', 'Company Name', ...metrics.map(m => m.name)]);

  // Style header row - Lazard style (black background, white text)
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF000000' } // Black background
    };
    cell.font = {
      name: 'Arial',
      size: 12,
      bold: true,
      color: { argb: 'FFFFFFFF' } // White text
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
    };
  });

  // Add data rows with logos
  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const rowData = [
      '', // Empty cell for logo
      company.name,
      ...metrics.map(metric => getMetricValue(company.id, metric.id))
    ];
    const dataRow = worksheet.addRow(rowData);

    // Style data rows - white background with alternating subtle gray
    const bgColor = i % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB'; // White or very light gray

    dataRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor }
      };
      cell.font = {
        name: 'Arial',
        size: 11,
        color: { argb: 'FF000000' } // Black text
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    });

    // Add logo image
    try {
      // Fetch the image and convert to base64
      const response = await fetch(company.logo);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Determine image extension
      const extension = company.logo.includes('.png') ? 'png' : 'jpeg';

      // Add image to workbook
      const imageId = workbook.addImage({
        base64,
        extension
      });

      // Add image to worksheet at the logo cell
      worksheet.addImage(imageId, {
        tl: { col: 0, row: i + 1 }, // Top-left corner (col A, row index + 1 for header)
        ext: { width: 50, height: 50 }, // Image size in pixels
        editAs: 'oneCell'
      });
    } catch (error) {
      console.warn(`Could not add logo for ${company.name}:`, error);
    }
  }

  // Set column widths
  worksheet.getColumn(1).width = 12; // Logo column
  worksheet.getColumn(2).width = 25; // Company name column
  for (let i = 3; i <= metrics.length + 2; i++) {
    worksheet.getColumn(i).width = 20; // Metric columns
  }

  // Set row heights (taller to accommodate logos)
  worksheet.getRow(1).height = 25; // Header row
  for (let i = 2; i <= companies.length + 1; i++) {
    worksheet.getRow(i).height = 40; // Data rows (taller for logos)
  }

  // Generate and download the file
  const buffer = await workbook.xlsx.writeBuffer();
  const blobFile = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blobFile);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${categoryName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}
