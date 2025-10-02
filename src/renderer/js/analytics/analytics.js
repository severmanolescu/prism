let topAppsListCount = 8;

function setupDateRangeControls() {
  const tabs = document.querySelectorAll('.time-range-btn');
  const dateInputs = document.querySelectorAll('.custom-date-picker input[type="date"]');

  tabs.forEach((tab, index) => {
    // Set data-period based on button text
    const periods = ['today', 'week', 'month', 'year', 'alltime'];
    tab.dataset.period = periods[index];

    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      // Add active class to clicked tab
      tab.classList.add('active');
      // Update the analytics view based on selected period
      currentPeriod = tab.dataset.period;

      // Update custom date inputs based on selected period
      updateCustomDatesForPeriod(tab.dataset.period, dateInputs);

      loadAnalyticsData(currentPeriod);
    });
  });

  // Setup custom date picker
  dateInputs.forEach(input => {
    input.addEventListener('change', () => {
      // When custom dates are changed, deactivate all buttons
      tabs.forEach(t => t.classList.remove('active'));

      // Load data for custom range
      const startDate = dateInputs[0].value;
      const endDate = dateInputs[1].value;
      if (startDate && endDate) {
        currentPeriod = 'custom';
        loadAnalyticsData('custom', startDate, endDate);
      }
    });
  });
}

// Update custom date inputs based on the selected period
function updateCustomDatesForPeriod(period, dateInputs) {
  const today = new Date();
  let startDate, endDate;

  switch(period) {
    case 'today':
      startDate = endDate = today;
      break;
    case 'week':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      endDate = today;
      break;
    case 'month':
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 1);
      endDate = today;
      break;
    case 'year':
      startDate = new Date(today);
      startDate.setFullYear(today.getFullYear() - 1);
      endDate = today;
      break;
    case 'alltime':
      // Set to earliest possible date in your app
      startDate = new Date(2020, 0, 1); // Jan 1, 2020
      endDate = today;
      break;
  }

  // Format dates as YYYY-MM-DD for input fields
  if (dateInputs[0]) dateInputs[0].value = formatDateForInput(startDate);
  if (dateInputs[1]) dateInputs[1].value = formatDateForInput(endDate);
}

// Helper function to format date for input fields
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Listen for data from parent window
window.addEventListener('message', (event) => {
  if (event.data.type === 'ANALYTICS_DATA_RESPONSE') {
    // Received analytics data from parent window
    console.log('Received analytics data:', event.data.data);
    updateAnalyticsUI(event.data.data);

    // Load heatmap data after main UI renders
    setTimeout(() => {
      loadHeatmapData(event.data.data.dateRange.start, event.data.data.dateRange.end);
    }, 50);
  } else if (event.data.type === 'HEATMAP_DATA_RESPONSE') {
    // Received heatmap data
    console.log('Received heatmap data');
    if (currentAnalyticsData) {
      updateHourlyHeatmap(event.data.data, currentAnalyticsData.topApps);
    }
  } else if (event.data.type === 'CATEGORIES_RESPONSE') {
    // Received categories from parent window
    console.log('Received categories:', event.data.categories);
    // Store categories in cache
    event.data.categories.forEach(cat => {
      categoriesCache[cat.name] = cat.color || '#092442';
    });
  }
});

let currentPeriod = 'today';
let categoriesCache = {}; // Cache for category colors
let heatmapAppCount = 5; // Default to top 5 apps
let currentAnalyticsData = null; // Cache analytics data for heatmap updates

// Calculate date range based on period
function calculateDateRange(period) {
  const today = new Date();
  let startDate, endDate;

  switch(period) {
    case 'today':
      startDate = endDate = today;
      break;
    case 'week':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      endDate = today;
      break;
    case 'month':
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 1);
      endDate = today;
      break;
    case 'year':
      startDate = new Date(today);
      startDate.setFullYear(today.getFullYear() - 1);
      endDate = today;
      break;
    case 'alltime':
      startDate = new Date(2020, 0, 1); // Jan 1, 2020
      endDate = today;
      break;
  }

  return { startDate, endDate };
}

// Load analytics data for the selected period
async function loadAnalyticsData(period, customStartDate, customEndDate) {
  try {
    let startDate, endDate;

    if (period === 'custom' && customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      const range = calculateDateRange(period);
      startDate = formatDateForInput(range.startDate);
      endDate = formatDateForInput(range.endDate);
    }

    // Request data from parent window (main renderer process)
    window.parent.postMessage({
      type: 'REQUEST_ANALYTICS_DATA',
      startDate: startDate,
      endDate: endDate
    }, '*');
  } catch (error) {
    console.error('Error loading analytics data:', error);
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

// Update the UI with analytics data
function updateAnalyticsUI(data) {
  // Cache the data for heatmap updates
  currentAnalyticsData = data;

  // Update stats cards
  updateStatsCards(data);
  // Update daily usage chart
  updateDailyUsageChart(data.dailyBreakdown);
  // Update top apps list
  updateTopAppsList(data.topApps);
  // Update All Applications list
  updateAllApplications(data.topApps);
  // Update category breakdown
  updateCategoryBreakdown(data.categoryBreakdown);
  // Update insights
  updateInsights(data);
  // Update date info
  updateDateInfo(data.dateRange);

  // Show loading state for heatmap
  showHeatmapLoading();
}

function updateStatsCards(data) {
  const { overallStats, mostActiveDay, leastActiveDay, dateRange } = data;

  // Total Time
  document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = formatTime(overallStats.totalTime);

  // Daily Average
  const dailyAvg = overallStats.totalTime / dateRange.days;
  document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = formatTime(dailyAvg);
  document.querySelector('.stat-card:nth-child(2) .stat-subtitle').textContent = `Across ${dateRange.days} days`;

  // Unique Apps
  document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = overallStats.uniqueApps;

  // Total Sessions
  document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = overallStats.totalSessions;
  const avgSessionTime = overallStats.avgSessionDuration || 0;
  document.querySelector('.stat-card:nth-child(4) .stat-subtitle').textContent =
    `Avg. ${Math.floor(avgSessionTime / (1000 * 60))} min`;

  // Most Active Day
  if (mostActiveDay) {
    document.querySelector('.stat-card:nth-child(5) .stat-value').textContent = formatTime(mostActiveDay.total_time);
    document.querySelector('.stat-card:nth-child(5) .stat-subtitle').textContent = mostActiveDay.date;
  }

  // Least Active Day
  if (leastActiveDay) {
    document.querySelector('.stat-card:nth-child(6) .stat-value').textContent = formatTime(leastActiveDay.total_time);
    document.querySelector('.stat-card:nth-child(6) .stat-subtitle').textContent = leastActiveDay.date;
  }
}

function updateTopAppsList(topApps) {
    console.log(topApps)
    const top_apps_list = document.querySelector('.top-apps-list');
    if (!top_apps_list) return;

    // Clear the list
    top_apps_list.innerHTML = '';

    // Check if we have apps
    if (!topApps || topApps.length === 0) {
        top_apps_list.innerHTML = '<div class="app-row">No apps found for this period</div>';
        return;
    }

    // Only show up to 6 apps or however many we have
    const appsToShow = Math.min(topApps.length, topAppsListCount);

    for (let i = 0; i < appsToShow; i++) {
        const app = topApps[i];
        top_apps_list.innerHTML += `
        <div class="app-row">
            <div class="app-rank">${i + 1}</div>
            <div class="app-info">
                <div class="app-name">${app.name}</div>
            </div>
            <div class="app-time">${formatTime(app.total_time)}</div>
        </div>
        `;
    }
}

function updateAllApplications(allApps){
    console.log(allApps)
    const top_apps_list = document.querySelector('.apps-used-grid');
    if (!top_apps_list) return;

    // Update section header with app count
    const sectionHeader = document.querySelector('.full-width-section .section-header');
    if (sectionHeader && allApps) {
        sectionHeader.textContent = `All Applications (${allApps.length})`;
    }

    // Clear the list
    top_apps_list.innerHTML = '';

    // Check if we have apps
    if (!allApps || allApps.length === 0) {
        top_apps_list.innerHTML = '<div class="app-row">No apps found for this period</div>';
        if (sectionHeader) {
            sectionHeader.textContent = 'All Applications (0)';
        }
        return;
    }

    for (let i = 0; i < allApps.length; i++) {
        const app = allApps[i];

        // Check for icon_path (database column name)
        const iconHtml = app.icon_path
        ? `<img src="app-icon://${app.icon_path.replace('icons/', '')}" alt="${app.name}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none';">`
        : `<div class="app-icon-small">${getAppIcon(app.name, app.category)}</div>`;

        top_apps_list.innerHTML += `
        <div class="recent-item" data-app-name="${app.name}">
            <div class="recent-item-bg" style="background: ${categoriesCache[app.category] || '#092442'};">
                ${iconHtml}
            </div>
            <div class="recent-item-info">
                <div class="recent-item-name">${app.name}</div>
                <div class="recent-item-time">${formatTime(app.total_time)}</div>
            </div>
        </div>
        `;
    }
}

function updateCategoryBreakdown(categoryBreakdown) {
    console.log('Category breakdown:', categoryBreakdown);

    const category_grid = document.querySelector('.category-grid');
    if (!category_grid) return;

    // Update section header with category count
    const categoryHeader = document.querySelectorAll('.section-header')[1]; // Second section header
    if (categoryHeader && categoryBreakdown) {
        categoryHeader.textContent = `Category Breakdown (${categoryBreakdown.length || 0})`;
    }

    // Clear the list
    category_grid.innerHTML = '';

    // Check if we have categories
    if (!categoryBreakdown || categoryBreakdown.length === 0) {
        category_grid.innerHTML = `
        <div class="category-item" style="border-left-color: #66c0f4;">
            <div class="category-name">No Categories found</div>
            <div class="category-time">0h</div>
            <div class="category-percentage">0% of total time</div>
        </div>
        `;
        if (categoryHeader) {
            categoryHeader.textContent = 'Category Breakdown (0)';
        }
        return;
    }

    // Calculate total time
    let totalTime = 0;
    for (let i = 0; i < categoryBreakdown.length; i++) {
        totalTime += categoryBreakdown[i].total_time;
    }

    // Render category items
    for (let i = 0; i < categoryBreakdown.length; i++) {
        const category = categoryBreakdown[i];
        const percentage = Math.round((category.total_time / totalTime) * 100);

        category_grid.innerHTML += `
        <div class="category-item" style="border-left-color: ${categoriesCache[category.category] || '#66c0f4'}">
            <div class="category-name">${category.category}</div>
            <div class="category-time">${formatTime(category.total_time)}</div>
            <div class="category-percentage">${percentage}% of total time</div>
        </div>
        `;
    }
}

function updateInsights(data) {
  const insightsGrid = document.querySelector('.insights-grid');
  if (!insightsGrid) return;

  insightsGrid.innerHTML = '';

  // 1. Focus Time (Longest Session)
  if (data.longestSession && data.longestSession.duration) {
    const focusTime = formatTime(data.longestSession.duration);
    const sessionDate = new Date(data.longestSession.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    insightsGrid.innerHTML += `
      <div class="insight-card">
        <div class="insight-icon">🎯</div>
        <div class="insight-content">
          <div class="insight-title">Focus Time</div>
          <div class="insight-text">Longest session: ${focusTime} on ${data.longestSession.app_name} (${sessionDate}).</div>
        </div>
      </div>
    `;
  }

  // 3. Variety Score (App Diversity)
  const varietyPercentage = Math.round((data.overallStats.uniqueApps / (data.topApps.length || 1)) * 100);
  let varietyMessage = '';
  if (data.overallStats.uniqueApps === 1) {
    varietyMessage = 'Highly focused - using only 1 app.';
  } else if (data.overallStats.uniqueApps <= 3) {
    varietyMessage = `Very focused - using ${data.overallStats.uniqueApps} different apps.`;
  } else if (data.overallStats.uniqueApps <= 7) {
    varietyMessage = `Balanced variety - ${data.overallStats.uniqueApps} apps used regularly.`;
  } else {
    varietyMessage = `High variety - switching between ${data.overallStats.uniqueApps} different apps.`;
  }

  insightsGrid.innerHTML += `
    <div class="insight-card">
      <div class="insight-icon">🎨</div>
      <div class="insight-content">
        <div class="insight-title">Variety Score</div>
        <div class="insight-text">${varietyMessage}</div>
      </div>
    </div>
  `;

  // 4. Time of Day Pattern (Peak Activity Hours)
  if (data.hourlyBreakdown && data.hourlyBreakdown.length > 0) {
    // Find peak hours
    let maxTime = 0;
    let peakHours = [];

    data.hourlyBreakdown.forEach(hour => {
      if (hour.total_time > maxTime) {
        maxTime = hour.total_time;
        peakHours = [hour.hour];
      } else if (hour.total_time === maxTime) {
        peakHours.push(hour.hour);
      }
    });

    // Group consecutive hours into ranges
    const formatHour = (h) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${hour12} ${period}`;
    };

    let peakTimeText = '';
    if (peakHours.length === 1) {
      peakTimeText = formatHour(peakHours[0]);
    } else if (peakHours.length === 2) {
      peakTimeText = `${formatHour(peakHours[0])} and ${formatHour(peakHours[1])}`;
    } else {
      const firstHour = Math.min(...peakHours);
      const lastHour = Math.max(...peakHours);
      peakTimeText = `${formatHour(firstHour)} - ${formatHour(lastHour)}`;
    }

    insightsGrid.innerHTML += `
      <div class="insight-card">
        <div class="insight-icon">⏰</div>
        <div class="insight-content">
          <div class="insight-title">Peak Activity Hours</div>
          <div class="insight-text">Most active around ${peakTimeText} (${formatTime(maxTime)} total).</div>
        </div>
      </div>
    `;
  }

  // 5. App Switching Rate
  if (data.overallStats.totalSessions > 0 && data.overallStats.totalTime > 0) {
    const totalHours = data.overallStats.totalTime / (1000 * 60 * 60);
    const switchesPerHour = Math.round(data.overallStats.totalSessions / totalHours);

    let switchingMessage = '';
    if (switchesPerHour <= 2) {
      switchingMessage = `Very focused - ${switchesPerHour} app switches per hour on average.`;
    } else if (switchesPerHour <= 5) {
      switchingMessage = `Moderately focused - ${switchesPerHour} app switches per hour.`;
    } else if (switchesPerHour <= 10) {
      switchingMessage = `Active switching - ${switchesPerHour} app switches per hour.`;
    } else {
      switchingMessage = `Highly dynamic - ${switchesPerHour} app switches per hour.`;
    }

    insightsGrid.innerHTML += `
      <div class="insight-card">
        <div class="insight-icon">🔄</div>
        <div class="insight-content">
          <div class="insight-title">App Switching Rate</div>
          <div class="insight-text">${switchingMessage}</div>
        </div>
      </div>
    `;
  }

  // Multitasking Score removed - was too slow (1.4s query time)
}

function updateDateInfo(dateRange) {
  const dateInfo = document.querySelector('.date-info');
  if (dateInfo) {
    dateInfo.textContent = `${dateRange.days} days of data available`;
  }
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
  const appHourlyData = {};
  hourlyAppBreakdown.forEach(item => {
    if (!appHourlyData[item.name]) {
      appHourlyData[item.name] = {
        name: item.name,
        category: item.category,
        hours: {}
      };
    }
    appHourlyData[item.name].hours[item.hour] = item.total_time;
  });

  // Get category colors from cache for each app
  const getAppColor = (category) => {
    return categoriesCache[category] || '#66c0f4';
  };

  // Render each top app's hourly data
  topAppsToShow.forEach(app => {
    const appData = appHourlyData[app.name];
    if (!appData) return;

    // Find max time for this app to normalize opacity
    const maxTime = Math.max(...Object.values(appData.hours));

    // Add app label
    heatmapGrid.innerHTML += `<div class="heatmap-label">${app.name}</div>`;

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
      const timeInHour = appData.hours[hour] || 0;
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

// Initialize analytics
function initAnalytics() {
  setupDateRangeControls();
  setupHeatmapControls();
  // Request categories from parent window
  window.parent.postMessage({
    type: 'REQUEST_CATEGORIES'
  }, '*');
  // Load default period (today)
  loadAnalyticsData(currentPeriod);

  // Add export button handler
  const exportBtn = document.querySelector('.export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportAnalytics);
  }

  // Add click handler for app cards
  document.addEventListener('click', (e) => {
    const appCard = e.target.closest('.recent-item');
    if (appCard) {
      const appName = appCard.dataset.appName;
      if (appName) {
        // Send message to parent to show app details
        window.parent.postMessage({
          type: 'OPEN_APP_DETAILS',
          appName: appName
        }, '*');
      }
    }
  });
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initAnalytics);
