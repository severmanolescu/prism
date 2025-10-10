const { ipcMain, dialog, BrowserWindow } = require('electron');
const fs = require('fs').promises;
const path = require('path');

function initializeAnalyticsExporter() {
  /**
   * Generate PDF from analytics page
   * Creates a hidden window with full content height and exports to PDF
   */
  ipcMain.handle('export-analytics-pdf', async (event, data) => {
    let pdfWindow = null;

    try {
      const { dateRange } = data;

      // Fetch analytics data using the existing service
      const { getAnalyticsData } = require('../../services/data-access');
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
      const htmlContent = await generateAnalyticsHTML(analyticsData, dateRange);
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
  async function generateAnalyticsHTML(data, dateRange) {
    const formatTime = (ms) => {
      const hours = Math.floor(ms / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      return `${hours}h ${minutes}m`;
    };

    // Read CSS and chart renderer files
    const cssPath = path.join(__dirname, 'export.css');
    const cssContent = await fs.readFile(cssPath, 'utf-8');

    const chartRendererPath = path.join(__dirname, 'chart-renderer.js');
    const chartRendererScript = await fs.readFile(chartRendererPath, 'utf-8');

    // Calculate additional stats
    const totalTime = data.overallStats.totalTime;
    const dailyAverage = totalTime / Math.max(1, data.overallStats.dayCount || 1);
    const avgSessionLength = totalTime / Math.max(1, data.overallStats.totalSessions);

    // Build category color map from the data
    const categoryColors = {};
    data.categoryBreakdown.forEach(cat => {
      if (cat.color) {
        categoryColors[cat.category] = cat.color;
      }
    });

    // Default color for categories without a color
    const defaultCategoryColor = '#66c0f4';

    // Build app category color map
    const appCategoryColors = {};
    data.topApps.forEach(app => {
      if (app.category && categoryColors[app.category]) {
        appCategoryColors[app.name] = categoryColors[app.category];
      }
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${cssContent}
        </style>
      </head>
      <body>
        <h1>📊 Analytics Report</h1>
        <div class="date-range">${dateRange.start} to ${dateRange.end}</div>

        <h2>Daily Usage</h2>
        <div class="chart-container">
          <canvas id="daily-chart" width="1000" height="300"></canvas>
        </div>

        <h2>Overview</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Time</div>
            <div class="stat-value">${formatTime(totalTime)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Daily Average</div>
            <div class="stat-value">${formatTime(dailyAverage)}</div>
            <div class="stat-subtitle">Across ${data.dateRange?.days || data.overallStats.dayCount || 1} days</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Unique Apps</div>
            <div class="stat-value">${data.overallStats.uniqueApps}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Sessions</div>
            <div class="stat-value">${data.overallStats.totalSessions}</div>
            <div class="stat-subtitle">Avg. ${Math.floor((data.overallStats.avgSessionDuration || avgSessionLength) / 60000)} min</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Most Active</div>
            <div class="stat-value">${data.mostActiveDay ? formatTime(data.mostActiveDay.total_time) : '0h 0m'}</div>
            <div class="stat-subtitle">${data.mostActiveDay?.date || 'Never'}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Least Active</div>
            <div class="stat-value">${data.leastActiveDay ? formatTime(data.leastActiveDay.total_time) : '0h 0m'}</div>
            <div class="stat-subtitle">${data.leastActiveDay?.date || 'Never'}</div>
          </div>
        </div>

        <h2>All Applications</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th>Application</th>
              <th style="width: 120px;">Category</th>
              <th style="width: 120px;">Time</th>
              <th style="width: 100px;">Sessions</th>
              <th style="width: 100px;">Avg. Session</th>
            </tr>
          </thead>
          <tbody>
            ${data.topApps.slice(0, 200).map((app, i) => {
              const avgSession = app.total_time / Math.max(1, app.session_count || 1);
              const categoryColor = categoryColors[app.category] || defaultCategoryColor;
              return `
              <tr style="border-left: 3px solid ${categoryColor};">
                <td>${i + 1}</td>
                <td>${app.name}</td>
                <td><span style="color: ${categoryColor};">${app.category || 'Uncategorized'}</span></td>
                <td>${formatTime(app.total_time)}</td>
                <td>${app.session_count || 0}</td>
                <td>${Math.round(avgSession / 60000)} min</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <h2>Category Breakdown</h2>
        <div class="category-grid">
          ${data.categoryBreakdown.map(cat => {
            const percentage = ((cat.total_time / totalTime) * 100).toFixed(1);
            const color = cat.color || defaultCategoryColor;
            return `
            <div class="category-item" style="border-left-color: ${color};">
              <div class="category-name">${cat.category}</div>
              <div class="category-time">${formatTime(cat.total_time)}</div>
              <div class="category-apps">${cat.app_count} apps • ${percentage}% of total</div>
            </div>
            `;
          }).join('')}
        </div>

        <script>
          ${chartRendererScript}

          // Render chart when page loads
          const dailyBreakdown = ${JSON.stringify(data.dailyBreakdown || [])};
          renderDailyChart(dailyBreakdown);
        </script>
      </body>
      </html>
    `;
  }
}

module.exports = { initializeAnalyticsExporter };
