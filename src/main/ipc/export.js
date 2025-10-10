const { ipcMain, dialog, BrowserWindow, app } = require('electron');
const fs = require('fs').promises;
const path = require('path');

function initializeExportHandlers() {
  /**
   * Generate PDF from analytics page
   * Creates a hidden window with full content height and exports to PDF
   */
  ipcMain.handle('export-analytics-pdf', async (event, data) => {
    let pdfWindow = null;

    try {
      const { dateRange } = data;

      // Fetch analytics data using the existing service
      const { getAnalyticsData } = require('../services/data-access');
      const analyticsData = await getAnalyticsData(dateRange.start, dateRange.end);

      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Save Analytics Report as PDF',
        defaultPath: `analytics_${dateRange.start}_to_${dateRange.end}.pdf`,
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] }
        ]
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      // Create hidden window
      pdfWindow = new BrowserWindow({
        width: 1200,
        height: 1600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      // Generate and load HTML
      const htmlContent = generateAnalyticsHTML(analyticsData, dateRange);
      await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate PDF
      const pdfData = await pdfWindow.webContents.printToPDF({
        marginsType: 0,
        printBackground: true,
        printSelectionOnly: false,
        landscape: false,
        pageSize: 'A4',
        scaleFactor: 100
      });

      // Save and cleanup
      await fs.writeFile(result.filePath, pdfData);
      pdfWindow.close();

      return { success: true, path: result.filePath };

    } catch (error) {
      if (pdfWindow) pdfWindow.close();
      return { success: false, error: error.message };
    }
  });

  // Helper function to generate HTML for PDF
  function generateAnalyticsHTML(data, dateRange) {
    const formatTime = (ms) => {
      const hours = Math.floor(ms / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      return `${hours}h ${minutes}m`;
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #0e1419;
            color: #c6d4df;
            padding: 20px;
            margin: 0;
          }
          h1 { color: #66c0f4; margin-bottom: 10px; }
          h2 { color: #8f98a0; margin-top: 30px; margin-bottom: 15px; }
          .date-range { color: #8f98a0; font-size: 14px; margin-bottom: 30px; }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .stat-card {
            background: rgba(27, 40, 56, 0.95);
            padding: 15px;
            border-radius: 4px;
            border-left: 3px solid #66c0f4;
          }
          .stat-label { font-size: 12px; color: #8f98a0; }
          .stat-value { font-size: 24px; font-weight: bold; color: #fff; margin-top: 5px; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background: rgba(27, 40, 56, 0.95);
            padding: 10px;
            text-align: left;
            font-size: 12px;
            color: #8f98a0;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 14px;
          }
          tr:hover { background: rgba(255, 255, 255, 0.05); }
        </style>
      </head>
      <body>
        <h1>📊 Analytics Report</h1>
        <div class="date-range">${dateRange.start} to ${dateRange.end}</div>

        <h2>Overview</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Time</div>
            <div class="stat-value">${formatTime(data.overallStats.totalTime)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Unique Apps</div>
            <div class="stat-value">${data.overallStats.uniqueApps}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Sessions</div>
            <div class="stat-value">${data.overallStats.totalSessions}</div>
          </div>
        </div>

        <h2>Top Applications</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Application</th>
              <th>Time</th>
              <th>Sessions</th>
            </tr>
          </thead>
          <tbody>
            ${data.topApps.slice(0, 20).map((app, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${app.name}</td>
                <td>${formatTime(app.total_time)}</td>
                <td>${app.session_count || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Category Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Time</th>
              <th>Apps</th>
            </tr>
          </thead>
          <tbody>
            ${data.categoryBreakdown.map(cat => `
              <tr>
                <td>${cat.category}</td>
                <td>${formatTime(cat.total_time)}</td>
                <td>${cat.app_count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }
}

module.exports = { initializeExportHandlers };
