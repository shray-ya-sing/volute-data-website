import pptxgen from 'pptxgenjs';
import { Company, Metric, MetricValue } from '../types';

export async function exportToPowerPoint(
  companies: Company[],
  metrics: Metric[],
  metricValues: MetricValue[],
  categoryName: string
) {
  // Create a new presentation
  const pptx = new pptxgen();

  // Add a slide
  const slide = pptx.addSlide();

  // Add title
  slide.addText(categoryName, {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.5,
    fontSize: 24,
    bold: true,
    color: '000000',
    fontFace: 'Arial'
  });

  // Get metric value helper function
  const getMetricValue = (companyId: string, metricId: string): string => {
    const metricValue = metricValues.find(
      (mv) => mv.companyId === companyId && mv.metricId === metricId
    );
    return metricValue?.value || '-';
  };

  // Prepare table data
  const tableData: any[][] = [];

  // Header row - now includes Logo column
  const headerRow = [
    { text: 'Company Logo', options: { bold: true, color: 'FFFFFF', fill: '000000', fontSize: 11, fontFace: 'Arial' } },
    { text: 'Company Name', options: { bold: true, color: 'FFFFFF', fill: '000000', fontSize: 11, fontFace: 'Arial' } },
    ...metrics.map(m => ({
      text: m.name,
      options: { bold: true, color: 'FFFFFF', fill: '000000', fontSize: 11, fontFace: 'Arial' }
    }))
  ];
  tableData.push(headerRow);

  // Data rows - now includes logo images
  companies.forEach((company, index) => {
    const bgColor = index % 2 === 0 ? 'FFFFFF' : 'F9FAFB'; // Alternating rows
    const row = [
      {
        text: '',
        options: {
          color: '000000',
          fill: bgColor,
          fontSize: 10,
          fontFace: 'Arial'
        }
      },
      { text: company.name, options: { color: '000000', fill: bgColor, fontSize: 10, fontFace: 'Arial' } },
      ...metrics.map(metric => ({
        text: getMetricValue(company.id, metric.id),
        options: { color: '000000', fill: bgColor, fontSize: 10, fontFace: 'Arial' }
      }))
    ];
    tableData.push(row);
  });

  // Calculate column widths
  const totalWidth = 9; // Total table width in inches
  const logoColWidth = 1.0; // Width for logo column
  const companyColWidth = 2.0; // Width for company name column
  const metricColWidth = (totalWidth - logoColWidth - companyColWidth) / metrics.length; // Distribute remaining width

  const colWidths = [logoColWidth, companyColWidth, ...metrics.map(() => metricColWidth)];

  // Add table to slide
  const tableY = 1.2;
  slide.addTable(tableData, {
    x: 0.5,
    y: tableY,
    w: totalWidth,
    colW: colWidths,
    border: { type: 'solid', pt: 0.5, color: 'D1D5DB' },
    align: 'left',
    valign: 'middle',
    margin: 0.1,
    rowH: 0.5
  });

  // Add logo images on top of the table cells
  companies.forEach((company, index) => {
    const rowY = tableY + 0.5 + (index * 0.5); // Header height + row index * row height
    const logoX = 0.5 + 0.1; // Table x + small padding
    const logoSize = 0.35; // Logo size in inches

    try {
      slide.addImage({
        path: company.logo,
        x: logoX + (logoColWidth - logoSize) / 2, // Center the logo in the cell
        y: rowY + (0.5 - logoSize) / 2, // Center vertically in the cell
        w: logoSize,
        h: logoSize
      });
    } catch (error) {
      console.warn(`Could not add logo for ${company.name}:`, error);
    }
  });

  // Add footer
  slide.addText(`Generated on ${new Date().toLocaleDateString()}`, {
    x: 0.5,
    y: 7,
    w: 9,
    h: 0.3,
    fontSize: 9,
    color: '666666',
    fontFace: 'Arial',
    align: 'right'
  });

  // Generate and download the file
  await pptx.writeFile({
    fileName: `${categoryName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pptx`
  });
}
