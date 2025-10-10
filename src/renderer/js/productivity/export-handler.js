// Export productivity data using shared export utilities

// Initialize export menu once on page load
function initializeExportMenu() {
  setupExportMenu({
    triggerSelector: '#exportBtn',
    onCSVExport: exportProductivityAsCSV,
    onJSONExport: exportProductivityAsJSON,
    onPDFExport: exportProductivityAsPDF
  });
}

async function exportProductivityAsPDF() {
  if (!currentProductivityData) {
    alert('No data to export');
    return;
  }

  // Send message to parent window to handle PDF export
  window.parent.postMessage({
    type: 'EXPORT_PRODUCTIVITY_PDF',
    dateRange: {
      start: currentDateRange.startDate,
      end: currentDateRange.endDate
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


function exportProductivityAsCSV() {
  if (!currentProductivityData) {
    alert('No data to export');
    return;
  }

  const data = currentProductivityData;
  const dateRange = `${currentDateRange.startDate}_to_${currentDateRange.endDate}`;

  let csv = 'Productivity Data Export\n\n';
  csv += `Date Range: ${currentDateRange.startDate} to ${currentDateRange.endDate}\n\n`;

  // Overall Score
  csv += 'PRODUCTIVITY SCORE\n';
  csv += `Overall Score,${data.score || 0}\n\n`;

  // Time Breakdown
  csv += 'TIME BREAKDOWN\n';
  csv += `Category,Time,Percentage\n`;
  csv += `Productive,${formatTime(data.breakdown.productive.time)},${data.breakdown.productive.percentage}%\n`;
  csv += `Neutral,${formatTime(data.breakdown.neutral.time)},${data.breakdown.neutral.percentage}%\n`;
  csv += `Unproductive,${formatTime(data.breakdown.unproductive.time)},${data.breakdown.unproductive.percentage}%\n\n`;

  // Top Productive Apps
  if (data.topProductive && data.topProductive.length > 0) {
    csv += 'TOP PRODUCTIVE APPS\n';
    csv += 'App Name,Total Time\n';
    data.topProductive.forEach(app => {
      csv += `"${app.name}",${formatTime(app.total_time)}\n`;
    });
    csv += '\n';
  }

  // Top Unproductive Apps
  if (data.topUnproductive && data.topUnproductive.length > 0) {
    csv += 'TOP DISTRACTING APPS\n';
    csv += 'App Name,Total Time\n';
    data.topUnproductive.forEach(app => {
      csv += `"${app.name}",${formatTime(app.total_time)}\n`;
    });
  }

  // Use shared export utility
  exportAsCSV(`productivity_${dateRange}`, csv);
}

function exportProductivityAsJSON() {
  if (!currentProductivityData) {
    alert('No data to export');
    return;
  }

  const data = currentProductivityData;
  const dateRange = `${currentDateRange.startDate}_to_${currentDateRange.endDate}`;

  const exportData = {
    exportDate: new Date().toISOString(),
    dateRange: {
      start: currentDateRange.startDate,
      end: currentDateRange.endDate,
      period: currentDateRange.period
    },
    productivityScore: data.score || 0,
    breakdown: {
      productive: {
        time: data.breakdown.productive.time,
        timeFormatted: formatTime(data.breakdown.productive.time),
        percentage: data.breakdown.productive.percentage,
        sessions: data.breakdown.productive.sessions
      },
      neutral: {
        time: data.breakdown.neutral.time,
        timeFormatted: formatTime(data.breakdown.neutral.time),
        percentage: data.breakdown.neutral.percentage,
        sessions: data.breakdown.neutral.sessions
      },
      unproductive: {
        time: data.breakdown.unproductive.time,
        timeFormatted: formatTime(data.breakdown.unproductive.time),
        percentage: data.breakdown.unproductive.percentage,
        sessions: data.breakdown.unproductive.sessions
      }
    },
    topProductiveApps: data.topProductive?.map(app => ({
      name: app.name,
      totalTime: app.total_time,
      totalTimeFormatted: formatTime(app.total_time)
    })) || [],
    topUnproductiveApps: data.topUnproductive?.map(app => ({
      name: app.name,
      totalTime: app.total_time,
      totalTimeFormatted: formatTime(app.total_time)
    })) || [],
    dailyScores: data.dailyScores || [],
    deepWorkSessions: data.deepWorkSessions,
    peakProductivityHour: data.peakProductivityHour
  };

  // Use shared export utility
  exportAsJSON(`productivity_${dateRange}`, exportData);
}
