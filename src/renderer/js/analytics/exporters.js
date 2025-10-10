// Export analytics data using shared export utilities

// Initialize export menu once on page load
function initializeExportMenu() {
  setupExportMenu({
    triggerSelector: '.export-btn',
    onCSVExport: exportAnalyticsAsCSV,
    onJSONExport: exportAnalyticsAsJSON,
    onPDFExport: exportAnalyticsAsPDF
  });
}

async function exportAnalyticsAsPDF() {
  if (!currentAnalyticsData) {
    alert('No data to export');
    return;
  }

  const data = currentAnalyticsData;

  // Send message to parent window to handle PDF export
  window.parent.postMessage({
    type: 'EXPORT_ANALYTICS_PDF',
    dateRange: {
      start: data.dateRange.start,
      end: data.dateRange.end
    }
  }, '*');
}

// Listen for PDF export response from parent window
window.addEventListener('message', (event) => {
  if (event.source !== window.parent) {
    return;
  }

  if (event.data.type === 'EXPORT_PDF_RESPONSE') {
    const result = event.data.result;

    if (result.success) {
      showFeedback('PDF exported successfully!', true);
    } else if (!result.canceled) {
      showFeedback(`Failed to export PDF: ${result.error}`, false);
    }
  }
});

function exportAnalyticsAsCSV() {
  if (!currentAnalyticsData) {
    alert('No data to export');
    return;
  }

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

  // Use shared export utility
  exportAsCSV(`analytics_${dateRange}`, csv);
}

function exportAnalyticsAsJSON() {
  if (!currentAnalyticsData) {
    alert('No data to export');
    return;
  }

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

  // Use shared export utility
  exportAsJSON(`analytics_${dateRange}`, exportData);
}
