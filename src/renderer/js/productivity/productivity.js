// Productivity page functionality

let currentDateRange = null;
let currentPeriod = 'today';

// Calculate date ranges for different periods
function getDateRange(period) {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'today':
      startDate = endDate = now.toISOString().split('T')[0];
      break;
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 6);
      startDate = weekAgo.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
      break;
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      startDate = monthAgo.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
      break;
    case 'year':
      const yearAgo = new Date(now);
      yearAgo.setFullYear(now.getFullYear() - 1);
      startDate = yearAgo.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
      break;
    default:
      startDate = endDate = now.toISOString().split('T')[0];
  }

  return { startDate, endDate };
}

// Load productivity data
async function loadProductivityData(period, customStartDate, customEndDate) {
  const { startDate, endDate } = getDateRange(period);
  currentDateRange = { startDate, endDate, period };

  try {
    const data = await window.electronAPI.invoke('get-productivity-stats', startDate, endDate);
    updateProductivityUI(data);
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
  statValues[0].textContent = formatTime(data.breakdown.productive.time); // Focus Time
  statValues[1].textContent = formatTime(data.breakdown.unproductive.time); // Distraction Time

  // Update productivity trend chart
  updateTrendChart(data.dailyScores);

  // Update top apps lists
  updateTopApps(data.topProductive, data.topUnproductive);
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
        loadAnalyticsData('custom', startDate, endDate);
      }
    });
  });

  // Initialize with default period (today)
  const activeTab = document.querySelector('.time-range-btn.active');
  if (activeTab && activeTab.dataset.period) {
    updateCustomDatesForPeriod(activeTab.dataset.period, dateInputs);
  }
}

// Setup pie chart tooltips
function setupPieChartTooltips() {
  const pieSlices = document.querySelectorAll('.pie-slice');
  const tooltip = document.getElementById('pie-tooltip');
  const tooltipText = tooltip.querySelector('.pie-tooltip-text');
  const pieChart = document.querySelector('.pie-chart');

  pieSlices.forEach(slice => {
    slice.addEventListener('mouseenter', (e) => {
      const category = slice.dataset.category;
      const percentage = slice.dataset.percentage;
      tooltipText.textContent = `${category}: ${percentage}%`;
      tooltip.style.display = 'block';
    });

    slice.addEventListener('mousemove', (e) => {
      const rect = pieChart.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      tooltip.style.left = x + 'px';
      tooltip.style.top = (y - 40) + 'px';
    });

    slice.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupDateRangeControls();
  setupPieChartTooltips();

  // Load default data (week view)
  // loadProductivityData('week');

  // Initialize chart with dummy data for now
  updateTrendChart([
    { date: '2024-01-01', score: 68 },
    { date: '2024-01-02', score: 75 },
    { date: '2024-01-03', score: 82 },
    { date: '2024-01-04', score: 58 },
    { date: '2024-01-05', score: 85 },
    { date: '2024-01-06', score: 72 },
    { date: '2024-01-07', score: 78 }
  ]);

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
