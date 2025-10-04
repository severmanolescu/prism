// Productivity page functionality

let currentDateRange = null;
let currentPeriod = 'today';

// Listen for data from parent window
window.addEventListener('message', (event) => {
  // Verify message comes from parent window
  if (event.source !== window.parent) {
    return;
  }
  if (event.data.type === 'PRODUCTIVITY_DATA_RESPONSE') {
    // Received productivity data from parent window
    updateProductivityUI(event.data.data);
  }
});

// Calculate date ranges for different periods
function getDateRange(period) {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'today':
      startDate = endDate = formatDateForInput(now);
      break;
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 6);
      startDate = formatDateForInput(weekAgo);
      endDate = formatDateForInput(now);
      break;
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      startDate = formatDateForInput(monthAgo);
      endDate = formatDateForInput(now);
      break;
    case 'year':
      const yearAgo = new Date(now);
      yearAgo.setFullYear(now.getFullYear() - 1);
      startDate = formatDateForInput(yearAgo);
      endDate = formatDateForInput(now);
      break;
    default:
      startDate = endDate = formatDateForInput(now);
  }

  return { startDate, endDate };
}

// Load productivity data
function loadProductivityData(period, customStartDate, customEndDate) {
  try {
    let startDate, endDate;

    if (period === 'custom' && customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      const range = getDateRange(period);
      startDate = range.startDate;
      endDate = range.endDate;
    }

    currentDateRange = { startDate, endDate, period };

    // Request data from parent window (main renderer process)
    window.parent.postMessage({
      type: 'REQUEST_PRODUCTIVITY_DATA',
      startDate: startDate,
      endDate: endDate
    }, '*');
  } catch (error) {
    console.error('Error loading productivity data:', error);
  }
}

// Update UI with productivity data
function updateProductivityUI(data) {
  // Update productivity score
  document.querySelector('.score-value').textContent = data.score || 0;

  // Update breakdown bars
  const productiveBar = document.querySelector('.score-bar-fill.productive');
  const neutralBar = document.querySelector('.score-bar-fill.neutral');
  const unproductiveBar = document.querySelector('.score-bar-fill.unproductive');

  if (productiveBar && data.breakdown.productive) {
    productiveBar.style.width = `${data.breakdown.productive.percentage}%`;
    const productiveText = productiveBar.closest('.score-item').querySelector('.score-text');
    productiveText.innerHTML = `
      <span class="score-category">Productive</span>
      <span class="score-time">${formatTime(data.breakdown.productive.time)} (${data.breakdown.productive.percentage}%)</span>
    `;
  }

  if (neutralBar && data.breakdown.neutral) {
    neutralBar.style.width = `${data.breakdown.neutral.percentage}%`;
    const neutralText = neutralBar.closest('.score-item').querySelector('.score-text');
    neutralText.innerHTML = `
      <span class="score-category">Neutral</span>
      <span class="score-time">${formatTime(data.breakdown.neutral.time)} (${data.breakdown.neutral.percentage}%)</span>
    `;
  }

  if (unproductiveBar && data.breakdown.unproductive) {
    unproductiveBar.style.width = `${data.breakdown.unproductive.percentage}%`;
    const unproductiveText = unproductiveBar.closest('.score-item').querySelector('.score-text');
    unproductiveText.innerHTML = `
      <span class="score-category">Unproductive</span>
      <span class="score-time">${formatTime(data.breakdown.unproductive.time)} (${data.breakdown.unproductive.percentage}%)</span>
    `;
  }

  // Update key metrics
  const statValues = document.querySelectorAll('.stat-value');
  const statSubtitles = document.querySelectorAll('.stat-subtitle');

  statValues[0].textContent = formatTime(data.breakdown.productive.time); // Focus Time
  statValues[1].textContent = formatTime(data.breakdown.unproductive.time); // Distraction Time

  // Calculate total time and sessions from all productivity levels
  const totalTime = data.breakdown.productive.time + data.breakdown.neutral.time + data.breakdown.unproductive.time;
  const totalSessions = data.breakdown.productive.sessions + data.breakdown.neutral.sessions + data.breakdown.unproductive.sessions;

  const totalHours = totalTime / (1000 * 60 * 60);
  const switchesPerHour = totalHours > 0 ? Math.round(totalSessions / totalHours) : 0;

  statValues[2].textContent = switchesPerHour; // Context Switches

  // Update deep work sessions
  if (data.deepWorkSessions && statValues[3]) {
    statValues[3].textContent = data.deepWorkSessions.count;
    if (statSubtitles[3] && data.deepWorkSessions.count > 0) {
      const avgMinutes = Math.round(data.deepWorkSessions.avgDuration / (1000 * 60));
      statSubtitles[3].textContent = `Avg. ${avgMinutes} min per session`;
    }
  }

  // Update peak productivity hour
  if (data.peakProductivityHour && statValues[4]) {
    const hour = data.peakProductivityHour.hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    statValues[4].textContent = `${displayHour} ${period}`;
    if (statSubtitles[4]) {
      statSubtitles[4].textContent = `${data.peakProductivityHour.percentage}% productive`;
    }
  }

  // Update most productive day
  if (data.dailyScores && data.dailyScores.length > 0 && statValues[5]) {
    const mostProductiveDay = data.dailyScores.reduce((max, day) =>
      day.score > max.score ? day : max
    );
    const date = new Date(mostProductiveDay.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    statValues[5].textContent = dayName;
    if (statSubtitles[5]) {
      statSubtitles[5].textContent = `Score: ${mostProductiveDay.score}`;
    }
  }

  // Update date info
  if (data.dailyScores) {
    const dateInfo = document.querySelector('.date-info');
    if (dateInfo) {
      const dayCount = data.dailyScores.length;
      dateInfo.textContent = `${dayCount} ${dayCount === 1 ? 'day' : 'days'} of data available`;
    }
  }

  // Update productivity trend chart
  updateTrendChart(data.dailyScores);

  // Update top apps lists
  updateTopApps(data.topProductive, data.topUnproductive);

  // Update category pie chart
  updateCategoryPieChart(data.categoryBreakdown, data.totalTime);

  // Update insights
  updateInsights(data);

  // Update heatmap
  updateProductivityHeatmap(data.heatmapData);

  // Update new charts
  updateSessionLengthChart(data.sessionLengthDistribution);
  updateAppSwitchingChart(data.appSwitchingFrequency);
  updateProductivityByHourChart(data.productivityByHour);
}

// Update top apps lists
function updateTopApps(topProductive, topUnproductive) {
  // Update productive apps
  const productiveList = document.querySelector('.app-lists-grid .app-list-section:nth-child(1) .app-list');
  if (productiveList) {
    productiveList.innerHTML = '';

    if (!topProductive || topProductive.length === 0) {
      productiveList.innerHTML = '<p style="text-align: center; color: #8f98a0; padding: 20px;">No productive apps yet</p>';
    } else {
      topProductive.slice(0, 4).forEach((app, index) => {
        productiveList.innerHTML += `
          <div class="app-list-item productive">
            <div class="app-rank">${index + 1}</div>
            <div class="app-info">
              <div class="app-name">${app.name}</div>
              <div class="app-time">${formatTime(app.total_time)}</div>
            </div>
          </div>
        `;
      });
    }
  }

  // Update unproductive apps
  const unproductiveList = document.querySelector('.app-lists-grid .app-list-section:nth-child(2) .app-list');
  if (unproductiveList) {
    unproductiveList.innerHTML = '';

    if (!topUnproductive || topUnproductive.length === 0) {
      unproductiveList.innerHTML = '<p style="text-align: center; color: #8f98a0; padding: 20px;">No distracting apps</p>';
    } else {
      topUnproductive.slice(0, 4).forEach((app, index) => {
        unproductiveList.innerHTML += `
          <div class="app-list-item unproductive">
            <div class="app-rank">${index + 1}</div>
            <div class="app-info">
              <div class="app-name">${app.name}</div>
              <div class="app-time">${formatTime(app.total_time)}</div>
            </div>
          </div>
        `;
      });
    }
  }
}

// Setup date range controls
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

      loadProductivityData(currentPeriod)
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
        loadProductivityData('custom', startDate, endDate);
      }
    });
  });

  // Initialize with default period (today)
  const activeTab = document.querySelector('.time-range-btn.active');
  if (activeTab && activeTab.dataset.period) {
    updateCustomDatesForPeriod(activeTab.dataset.period, dateInputs);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupDateRangeControls();
  setupPieChartTooltips();

  // Load default data (today)
  loadProductivityData(currentPeriod);

  // Add smooth scroll behavior
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});
