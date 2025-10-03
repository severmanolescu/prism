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
        ? (() => {
            // Extract just the filename from the path (handles both full paths and relative paths)
            const iconFilename = app.icon_path.replace(/^.*[\\\/]/, '').replace('icons/', '');
            return `<img src="app-icon://${iconFilename}" alt="${app.name}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none';">`;
          })()
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

function updateDateInfo(dateRange) {
  const dateInfo = document.querySelector('.date-info');
  if (dateInfo) {
    dateInfo.textContent = `${dateRange.days} days of data available`;
  }
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
