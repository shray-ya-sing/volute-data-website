// Helper function to position the tooltip
function positionTooltip(e) {
    const tooltip = document.getElementById('tooltip');
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 10;
    
    let left = e.pageX + padding;
    let top = e.pageY + padding;
    
    // Adjust if tooltip goes off right edge
    if (left + tooltipRect.width > window.innerWidth) {
        left = e.pageX - tooltipRect.width - padding;
    }
    
    // Adjust if tooltip goes off bottom edge
    // Check against viewport height + scroll position
    if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
        top = e.pageY - tooltipRect.height - padding;
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}


// Tooltip functionality, now wrapped in a function to be called after data load
function initializeTooltip() {
    const tooltip = document.getElementById('tooltip');
    // Selects all data cells, which are now present in the DOM
    const tableCells = document.querySelectorAll('#dataTable tbody td'); 

    tableCells.forEach(cell => {
        cell.addEventListener('mouseenter', function(e) {
            // Get notes/page from attributes generated from JSON
            const notes = this.getAttribute('data-notes');
            const page = this.getAttribute('data-page');
            
            if (notes || (page && page !== 'N/A')) {
                let tooltipContent = '';
                
                if (notes) {
                    tooltipContent += `<strong>Notes:</strong> ${notes}`;
                }
                
                if (page && page !== 'N/A') {
                    if (tooltipContent) tooltipContent += '<br><br>';
                    tooltipContent += `<strong>Page:</strong> ${page}`;
                }
                
                if (tooltipContent) {
                    tooltip.innerHTML = tooltipContent;
                    tooltip.classList.add('show');
                    positionTooltip(e);
                }
            }
        });
        
        cell.addEventListener('mousemove', function(e) {
            if (tooltip.classList.contains('show')) {
                positionTooltip(e);
            }
        });
        
        cell.addEventListener('mouseleave', function() {
            tooltip.classList.remove('show');
        });
    });
}


// Main execution block
document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('dataBody');
    const tableHeaders = Array.from(document.querySelectorAll('#dataTable thead th')).map(th => th.textContent.trim());

    // 1. Fetch Data and Build Table
    fetch('data/data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            data.forEach(company => {
                const row = document.createElement('tr');
                let isFirstColumn = true;

                tableHeaders.forEach(header => {
                    const dataKey = header; 
                    const cell = document.createElement('td');
                    // Get the main value, defaulting to N/A
                    let value = company[dataKey] || 'N/A'; 

                    // Set value and classes
                    cell.textContent = value;
                    if (isFirstColumn) {
                        cell.classList.add('sticky-col');
                        isFirstColumn = false;
                    }
                    
                    // Add Page Number and Notes from nested objects
                    if (company['Page Number'] && company['Page Number'][dataKey]) {
                        cell.setAttribute('data-page', company['Page Number'][dataKey]);
                    }
                    if (company['Notes'] && company['Notes'][dataKey]) {
                        cell.setAttribute('data-notes', company['Notes'][dataKey]);
                    } else if (dataKey === 'Company Name' && company['Notes']['Company Name']) {
                        // Special handling if Company Name has a note
                        cell.setAttribute('data-notes', company['Notes']['Company Name']); 
                    }


                    row.appendChild(cell);
                });

                tableBody.appendChild(row);
            });
            
            // 2. Initialize Tooltip AFTER table is fully built
            initializeTooltip();
        })
        .catch(error => console.error('Error loading IPO data:', error));


    // 3. CSV Download functionality (UNCHANGED and still works with dynamic content)
    document.getElementById('downloadBtn').addEventListener('click', function() {
        const table = document.getElementById('dataTable');
        const rows = table.querySelectorAll('tr');
        
        let csvContent = '';
        
        // Iterate through each row
        rows.forEach((row) => {
            const cells = row.querySelectorAll('th, td');
            const rowData = Array.from(cells).map(cell => {
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                let cellText = cell.textContent.trim();
                if (cellText.includes(',') || cellText.includes('"') || cellText.includes('\n')) {
                    cellText = '"' + cellText.replace(/"/g, '""') + '"';
                }
                return cellText;
            });
            csvContent += rowData.join(',') + '\n';
        });
        
        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', 'ipo-data.csv');
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});