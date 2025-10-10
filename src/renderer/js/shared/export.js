/**
 * Shared Export Utilities
 * Generic CSV and JSON export functions
 */

/**
 * Trigger a file download in the browser
 * @param {string} filename - Name of the file to download
 * @param {Blob} blob - Blob containing the file data
 */
function downloadFile(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export data as CSV file
 * @param {string} filename - Name for the CSV file (without extension)
 * @param {string} csvContent - CSV content as a string
 */
function exportAsCSV(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(`${filename}.csv`, blob);
}

/**
 * Export data as JSON file
 * @param {string} filename - Name for the JSON file (without extension)
 * @param {Object} jsonData - Data to export as JSON
 */
function exportAsJSON(filename, jsonData) {
  const jsonString = JSON.stringify(jsonData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  downloadFile(`${filename}.json`, blob);
}

/**
 * Show export menu and handle export type selection
 * @param {Object} options Configuration options
 * @param {string} options.triggerSelector - CSS selector for the export button
 * @param {Function} options.onCSVExport - Callback for CSV export
 * @param {Function} options.onJSONExport - Callback for JSON export
 */
function setupExportMenu(options) {
  const {
    triggerSelector = '#exportBtn',
    onCSVExport,
    onJSONExport,
    onPDFExport
  } = options;

  const exportBtn = document.querySelector(triggerSelector);
  if (!exportBtn) return;

  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    // Remove any existing menu and toggle
    const existingMenu = document.querySelector('.export-dropdown-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // Always create new menu (removed toggle behavior)
    // Create dropdown menu
    const menu = document.createElement('div');
    menu.className = 'export-dropdown-menu';
    menu.style.cssText = `
      position: fixed;
      background: #1b2838;
      border: 1px solid rgba(102, 192, 244, 0.3);
      border-radius: 3px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      min-width: 150px;
    `;

    menu.innerHTML = `
      <div class="export-menu-item" data-type="csv">Export as CSV</div>
      <div class="export-menu-item" data-type="json">Export as JSON</div>
      <div class="export-menu-item" data-type="pdf">Export as PDF</div>
    `;

    // Position menu below button (using fixed positioning)
    const rect = exportBtn.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.left}px`;

    document.body.appendChild(menu);

    // Handle menu item clicks
    menu.querySelectorAll('.export-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = item.dataset.type;

        if (type === 'csv' && onCSVExport) {
          onCSVExport();
        } else if (type === 'json' && onJSONExport) {
          onJSONExport();
        } else if(type === 'pdf' && onPDFExport){
          onPDFExport();
        }

        menu.remove();
      });
    });

    // Close menu when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      });
    }, 0);
  });
}
