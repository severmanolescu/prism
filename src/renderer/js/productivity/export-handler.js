// Export productivity data
function handleExportProductivity() {
  if (!currentProductivityData) {
    alert('No data to export');
    return;
  }

  // Create export options menu
  const exportOptions = document.createElement('div');
  exportOptions.className = 'export-menu';
  exportOptions.innerHTML = `
    <div class="export-menu-item" data-format="csv">Export as CSV</div>
    <div class="export-menu-item" data-format="json">Export as JSON</div>
  `;
  exportOptions.style.cssText = `
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 4px;
    background: #16202d;
    border: 1px solid rgba(102, 192, 244, 0.3);
    border-radius: 3px;
    min-width: 150px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    z-index: 1000;
  `;

  const exportBtn = document.getElementById('exportBtn');
  exportBtn.style.position = 'relative';
  exportBtn.appendChild(exportOptions);

  // Handle export format selection
  exportOptions.addEventListener('click', (e) => {
    const format = e.target.dataset.format;
    if (format) {
      if (format === 'csv') {
        exportProductivityAsCSV();
      } else if (format === 'json') {
        exportProductivityAsJSON();
      }
      exportOptions.remove();
    }
  });

  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!exportBtn.contains(e.target)) {
        exportOptions.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 0);
}

function exportProductivityAsCSV() {
  const data = currentProductivityData;
  const dateRange = `${currentDateRange.startDate}_to_${currentDateRange.endDate}`;

  let csv = 'Productivity Data Export\n\n';
  csv += `Period: ${currentDateRange.startDate} to ${currentDateRange.endDate}\n\n`;

  csv += 'PRODUCTIVITY SCORE\n';
  csv += `Overall Score,${data.score || 0}\n`;
  csv += `Productive Time,${formatTime(data.breakdown.productive.time)}\n`;
  csv += `Neutral Time,${formatTime(data.breakdown.neutral.time)}\n`;
  csv += `Unproductive Time,${formatTime(data.breakdown.unproductive.time)}\n\n`;

  csv += 'TOP PRODUCTIVE APPS\n';
  csv += 'App Name,Time Spent\n';
  if (data.topProductive && data.topProductive.length > 0) {
    data.topProductive.forEach(app => {
      csv += `"${app.name}",${formatTime(app.total_time)}\n`;
    });
  }

  csv += '\nTOP UNPRODUCTIVE APPS\n';
  csv += 'App Name,Time Spent\n';
  if (data.topUnproductive && data.topUnproductive.length > 0) {
    data.topUnproductive.forEach(app => {
      csv += `"${app.name}",${formatTime(app.total_time)}\n`;
    });
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `productivity_${dateRange}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportProductivityAsJSON() {
  const data = currentProductivityData;
  const dateRange = `${currentDateRange.startDate}_to_${currentDateRange.endDate}`;

  const exportData = {
    exportDate: new Date().toISOString(),
    period: {
      start: currentDateRange.startDate,
      end: currentDateRange.endDate
    },
    productivityScore: data.score || 0,
    timeBreakdown: {
      productive: {
        time: data.breakdown.productive.time,
        formatted: formatTime(data.breakdown.productive.time),
        percentage: data.breakdown.productive.percentage
      },
      neutral: {
        time: data.breakdown.neutral.time,
        formatted: formatTime(data.breakdown.neutral.time),
        percentage: data.breakdown.neutral.percentage
      },
      unproductive: {
        time: data.breakdown.unproductive.time,
        formatted: formatTime(data.breakdown.unproductive.time),
        percentage: data.breakdown.unproductive.percentage
      }
    },
    topProductiveApps: data.topProductive || [],
    topUnproductiveApps: data.topUnproductive || []
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `productivity_${dateRange}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
