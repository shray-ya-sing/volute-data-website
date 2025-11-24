// Tooltip functionality
const tooltip = document.getElementById('tooltip');
const tableCells = document.querySelectorAll('td');

tableCells.forEach(cell => {
    cell.addEventListener('mouseenter', function(e) {
        const notes = this.getAttribute('data-notes');
        const page = this.getAttribute('data-page');
        
        if (notes || page) {
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

function positionTooltip(e) {
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 10;
    
    let left = e.pageX + padding;
    let top = e.pageY + padding;
    
    // Adjust if tooltip goes off right edge
    if (left + tooltipRect.width > window.innerWidth) {
        left = e.pageX - tooltipRect.width - padding;
    }
    
    // Adjust if tooltip goes off bottom edge
    if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
        top = e.pageY - tooltipRect.height - padding;
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

// CSV Download functionality
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
