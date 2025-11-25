// Application state
let allData = [];
let selectedCompanies = [];
let selectedColumns = [];
let allColumns = [];

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
    if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
        top = e.pageY - tooltipRect.height - padding;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

// Tooltip functionality
function initializeTooltip() {
    const tooltip = document.getElementById('tooltip');
    const tableCells = document.querySelectorAll('#dataTable tbody td');

    tableCells.forEach(cell => {
        cell.addEventListener('mouseenter', function(e) {
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

// Extract all unique columns from data
function extractColumns(data) {
    const columns = new Set();
    data.forEach(company => {
        Object.keys(company).forEach(key => {
            // Exclude special objects and Filing URL
            if (key !== 'Notes' && key !== 'Page Number' && key !== 'Filing URL') {
                columns.add(key);
            }
        });
    });
    return Array.from(columns);
}

// Populate column selector dropdown
function populateColumnOptions() {
    const columnOptions = document.getElementById('columnOptions');
    columnOptions.innerHTML = '';

    allColumns.forEach((column, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'dropdown-option';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `col-${index}`;
        checkbox.value = column;
        checkbox.checked = selectedColumns.includes(column);

        const label = document.createElement('label');
        label.htmlFor = `col-${index}`;
        label.textContent = column;

        checkbox.addEventListener('change', function() {
            if (this.checked) {
                if (!selectedColumns.includes(column)) {
                    selectedColumns.push(column);
                }
            } else {
                selectedColumns = selectedColumns.filter(col => col !== column);
            }
            renderTable();
        });

        optionDiv.appendChild(checkbox);
        optionDiv.appendChild(label);
        columnOptions.appendChild(optionDiv);
    });
}

// Search functionality for company search
function setupCompanySearch() {
    const searchInput = document.getElementById('companySearch');
    const searchResults = document.getElementById('searchResults');

    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();

        if (query === '') {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            return;
        }

        const matches = allData.filter(company => {
            const companyName = company['Company Name'] || '';
            const companyTicker = company['Company Ticker'] || '';
            return companyName.toLowerCase().includes(query) ||
                   companyTicker.toLowerCase().includes(query);
        });

        if (matches.length > 0) {
            searchResults.innerHTML = matches.map(company => {
                const alreadySelected = selectedCompanies.some(c => c['Company Name'] === company['Company Name']);
                return `<div class="search-result-item ${alreadySelected ? 'disabled' : ''}" data-company="${company['Company Name']}">
                    ${company['Company Name']} (${company['Company Ticker']})
                    ${alreadySelected ? '<span class="already-added">Added</span>' : ''}
                </div>`;
            }).join('');
            searchResults.classList.add('active');

            // Add click handlers
            searchResults.querySelectorAll('.search-result-item:not(.disabled)').forEach(item => {
                item.addEventListener('click', function() {
                    const companyName = this.getAttribute('data-company');
                    const company = allData.find(c => c['Company Name'] === companyName);
                    addCompany(company);
                    searchInput.value = '';
                    searchResults.innerHTML = '';
                    searchResults.classList.remove('active');
                });
            });
        } else {
            searchResults.innerHTML = '<div class="no-results">No companies found</div>';
            searchResults.classList.add('active');
        }
    });

    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
}

// Column search functionality
function setupColumnSearch() {
    const columnSearchInput = document.getElementById('columnSearchInput');

    columnSearchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        const options = document.querySelectorAll('.dropdown-option');

        options.forEach(option => {
            const label = option.querySelector('label');
            const text = label.textContent.toLowerCase();

            if (text.includes(query)) {
                option.style.display = 'flex';
            } else {
                option.style.display = 'none';
            }
        });
    });
}

// Add company to selected list
function addCompany(company) {
    if (!selectedCompanies.some(c => c['Company Name'] === company['Company Name'])) {
        selectedCompanies.push(company);
        renderSelectedCompanies();
        renderTable();
    }
}

// Remove company from selected list
function removeCompany(companyName) {
    selectedCompanies = selectedCompanies.filter(c => c['Company Name'] !== companyName);
    renderSelectedCompanies();
    renderTable();
}

// Render selected companies as chips
function renderSelectedCompanies() {
    const container = document.getElementById('selectedCompanies');

    if (selectedCompanies.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = selectedCompanies.map(company => {
        return `<div class="company-chip">
            <span>${company['Company Name']}</span>
            <button class="remove-chip" data-company="${company['Company Name']}">&times;</button>
        </div>`;
    }).join('');

    // Add remove handlers
    container.querySelectorAll('.remove-chip').forEach(btn => {
        btn.addEventListener('click', function() {
            const companyName = this.getAttribute('data-company');
            removeCompany(companyName);
        });
    });
}

// Render the table based on selected companies and columns
function renderTable() {
    const tableHead = document.getElementById('headerRow');
    const tableBody = document.getElementById('dataBody');
    const emptyState = document.getElementById('emptyState');
    const tableWrapper = document.querySelector('.table-wrapper');

    // Show/hide empty state
    if (selectedCompanies.length === 0 || selectedColumns.length === 0) {
        emptyState.style.display = 'block';
        tableWrapper.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    tableWrapper.style.display = 'block';

    // Render headers
    tableHead.innerHTML = '';
    selectedColumns.forEach((column, index) => {
        const th = document.createElement('th');
        th.textContent = column;
        if (index === 0) {
            th.classList.add('sticky-col');
        }
        tableHead.appendChild(th);
    });

    // Render rows
    tableBody.innerHTML = '';
    selectedCompanies.forEach(company => {
        const row = document.createElement('tr');
        const filingURL = company['Filing URL'];

        selectedColumns.forEach((column, colIndex) => {
            const cell = document.createElement('td');
            let value = company[column] || 'N/A';
            cell.textContent = value;

            if (colIndex === 0) {
                cell.classList.add('sticky-col');
            }

            // Add Page Number and Notes from nested objects
            if (company['Page Number'] && company['Page Number'][column]) {
                cell.setAttribute('data-page', company['Page Number'][column]);
            }
            if (company['Notes'] && company['Notes'][column]) {
                cell.setAttribute('data-notes', company['Notes'][column]);
            }

            // Add click handler for cells with page numbers
            if (filingURL && cell.getAttribute('data-page') && cell.getAttribute('data-page') !== 'N/A') {
                cell.classList.add('clickable');
                cell.style.cursor = 'pointer';
                cell.addEventListener('click', function() {
                    window.open(filingURL, '_blank');
                });
            }

            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });

    // Reinitialize tooltips
    initializeTooltip();
}

// Setup column selector dropdown
function setupColumnDropdown() {
    const dropdownBtn = document.getElementById('columnSelectorBtn');
    const dropdown = document.getElementById('columnDropdown');

    dropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target) && !dropdownBtn.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    // Prevent dropdown from closing when clicking inside
    dropdown.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// CSV Download functionality
function setupCSVDownload() {
    document.getElementById('downloadBtn').addEventListener('click', function() {
        if (selectedCompanies.length === 0 || selectedColumns.length === 0) {
            alert('Please add companies and select columns to export data.');
            return;
        }

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
        link.setAttribute('download', 'ipo-data-custom.csv');
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    // Fetch data
    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            allData = data;
            console.log('Data loaded:', allData);

            // Extract all available columns
            allColumns = extractColumns(data);
            console.log('Columns extracted:', allColumns);

            // Populate column options
            populateColumnOptions();
            console.log('Column options populated');

            // Setup all interactions
            setupCompanySearch();
            setupColumnSearch();
            setupColumnDropdown();
            setupCSVDownload();

            // Initial render
            renderTable();

            console.log('App initialized successfully');
        })
        .catch(error => console.error('Error loading IPO data:', error));
});
