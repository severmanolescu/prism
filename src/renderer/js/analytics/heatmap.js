// Setup heatmap controls
function setupHeatmapControls() {
  const heatmapBtns = document.querySelectorAll('.heatmap-count-btn');

  heatmapBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      heatmapBtns.forEach(b => b.classList.remove('active'));
      // Add active class to clicked button
      btn.classList.add('active');

      // Update the count
      const count = btn.dataset.count;
      heatmapAppCount = count === 'all' ? 'all' : parseInt(count);

      // Refresh heatmap - reload the data with new count
      if (currentAnalyticsData) {
        showHeatmapLoading();
        loadHeatmapData(currentAnalyticsData.dateRange.start, currentAnalyticsData.dateRange.end);
      }
    });
  });
}

function updateHourlyHeatmap(hourlyAppBreakdown, topApps) {
  const heatmapGrid = document.querySelector('.heatmap-grid');
  if (!heatmapGrid) return;

  // Clear existing content except the hour headers
  heatmapGrid.innerHTML = '';

  // Add empty corner cell
  heatmapGrid.innerHTML += '<div></div>';

  // Add hour headers (0-23)
  for (let i = 0; i < 24; i++) {
    heatmapGrid.innerHTML += `<div class="heatmap-hour">${i}</div>`;
  }

  if (!hourlyAppBreakdown || hourlyAppBreakdown.length === 0) {
    heatmapGrid.innerHTML += `<div class="heatmap-label">No data</div>`;
    for (let i = 0; i < 24; i++) {
      heatmapGrid.innerHTML += `<div class="heatmap-cell" style="background: rgba(255, 255, 255, 0.02);"></div>`;
    }
    return;
  }

  // Get apps to display based on selected count
  const topAppsToShow = heatmapAppCount === 'all'
    ? topApps
    : topApps ? topApps.slice(0, heatmapAppCount) : [];

  // Group hourly data by app
  const appHourlyData = new Map();
  hourlyAppBreakdown.forEach(item => {
    if (!appHourlyData.has(item.name)) {
      appHourlyData.set(item.name, {
        name: item.name,
        category: item.category,
        hours: new Map()
      });
    }
    appHourlyData.get(item.name).hours.set(item.hour, item.total_time);
  });

  // Get category colors from cache for each app
  const getAppColor = (category) => {
    return categoriesCache.get(category) || '#66c0f4';
  };

  // Render each top app's hourly data
  topAppsToShow.forEach(app => {
    const appData = appHourlyData.get(app.name);
    if (!appData) return;

    // Find max time for this app to normalize opacity
    const maxTime = Math.max(...appData.hours.values());

    // Add app label
    heatmapGrid.innerHTML += `<div class="heatmap-label">${escapeHtml(app.name)}</div>`;

    // Get base color for this app
    const baseColor = getAppColor(app.category);
    // Extract RGB from hex color
    const rgbMatch = baseColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    const rgb = rgbMatch ? {
      r: parseInt(rgbMatch[1], 16),
      g: parseInt(rgbMatch[2], 16),
      b: parseInt(rgbMatch[3], 16)
    } : { r: 102, g: 192, b: 244 }; // Default Steam blue

    // Add hourly cells
    for (let hour = 0; hour < 24; hour++) {
      const timeInHour = appData.hours.get(hour) || 0;
      const opacity = timeInHour > 0 ? Math.max(0.1, (timeInHour / maxTime)) : 0.05;

      const tooltip = timeInHour > 0 ?
        `title="${hour}:00 - ${formatTime(timeInHour)}"` : '';

      heatmapGrid.innerHTML += `
        <div class="heatmap-cell"
             style="background: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity});"
             ${tooltip}></div>
      `;
    }
  });
}

function showHeatmapLoading() {
  const heatmapGrid = document.querySelector('.heatmap-grid');
  if (!heatmapGrid) return;

  heatmapGrid.innerHTML = '';
  heatmapGrid.innerHTML += '<div></div>';
  for (let i = 0; i < 24; i++) {
    heatmapGrid.innerHTML += `<div class="heatmap-hour">${i}</div>`;
  }
  heatmapGrid.innerHTML += `<div class="heatmap-label" style="color: #66c0f4;">Loading...</div>`;
  for (let i = 0; i < 24; i++) {
    heatmapGrid.innerHTML += `<div class="heatmap-cell" style="background: rgba(102, 192, 244, 0.1);"></div>`;
  }
}

// Load heatmap data asynchronously
function loadHeatmapData(startDate, endDate) {
  // Request heatmap data from parent window
  window.parent.postMessage({
    type: 'REQUEST_HEATMAP_DATA',
    startDate: startDate,
    endDate: endDate
  }, '*');
}
