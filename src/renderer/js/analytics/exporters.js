// Export analytics data
function exportAnalytics() {
  if (!currentAnalyticsData) {
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

  const exportBtn = document.querySelector('.export-btn');
  exportBtn.style.position = 'relative';
  exportBtn.appendChild(exportOptions);

  // Handle export format selection
  exportOptions.addEventListener('click', (e) => {
    const format = e.target.dataset.format;
    if (format) {
      if (format === 'csv') {
        exportAsCSV();
      } else if (format === 'json') {
        exportAsJSON();
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

function exportAsCSV() {
  const data = currentAnalyticsData;
  const dateRange = `${data.dateRange.start}_to_${data.dateRange.end}`;

  // Create CSV content
  let csv = 'App Time Analytics Export\n\n';
  csv += `Period: ${data.dateRange.start} to ${data.dateRange.end}\n`;
  csv += `Total Days: ${data.dateRange.days}\n\n`;

  csv += 'OVERVIEW\n';
  csv += `Total Time,${formatTime(data.overallStats.totalTime)}\n`;
  csv += `Unique Apps,${data.overallStats.uniqueApps}\n`;
  csv += `Total Sessions,${data.overallStats.totalSessions}\n`;
  csv += `Avg Session,${Math.floor(data.overallStats.avgSessionDuration / (1000 * 60))} min\n\n`;

  csv += 'TOP APPLICATIONS\n';
  csv += 'App Name,Total Time,Sessions\n';
  data.topApps.forEach(app => {
    csv += `"${app.name}",${formatTime(app.total_time)},${app.session_count}\n`;
  });

  csv += '\nCATEGORY BREAKDOWN\n';
  csv += 'Category,Total Time,Apps,Sessions\n';
  data.categoryBreakdown.forEach(cat => {
    csv += `"${cat.category}",${formatTime(cat.total_time)},${cat.app_count},${cat.session_count}\n`;
  });

  // Download CSV
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics_${dateRange}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAsJSON() {
  const data = currentAnalyticsData;
  const dateRange = `${data.dateRange.start}_to_${data.dateRange.end}`;

  // Create clean JSON export
  const exportData = {
    exportDate: new Date().toISOString(),
    period: {
      start: data.dateRange.start,
      end: data.dateRange.end,
      days: data.dateRange.days
    },
    summary: {
      totalTime: data.overallStats.totalTime,
      totalTimeFormatted: formatTime(data.overallStats.totalTime),
      uniqueApps: data.overallStats.uniqueApps,
      totalSessions: data.overallStats.totalSessions,
      avgSessionDuration: data.overallStats.avgSessionDuration,
      avgSessionDurationFormatted: `${Math.floor(data.overallStats.avgSessionDuration / (1000 * 60))} min`
    },
    topApplications: data.topApps.map(app => ({
      name: app.name,
      category: app.category,
      totalTime: app.total_time,
      totalTimeFormatted: formatTime(app.total_time),
      sessionCount: app.session_count
    })),
    categoryBreakdown: data.categoryBreakdown.map(cat => ({
      category: cat.category,
      totalTime: cat.total_time,
      totalTimeFormatted: formatTime(cat.total_time),
      appCount: cat.app_count,
      sessionCount: cat.session_count
    })),
    dailyBreakdown: data.dailyBreakdown.map(day => ({
      date: day.date,
      totalTime: day.total_time,
      totalTimeFormatted: formatTime(day.total_time),
      sessionCount: day.session_count,
      appCount: day.app_count
    })),
    mostActiveDay: data.mostActiveDay,
    leastActiveDay: data.leastActiveDay,
    longestSession: data.longestSession
  };

  // Download JSON
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics_${dateRange}.json`;
  a.click();
  URL.revokeObjectURL(url);
}