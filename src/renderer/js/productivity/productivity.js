// Productivity page functionality

let currentDateRange = null;

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

// Format time helper
function formatTime(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Load productivity data
async function loadProductivityData(period = 'week') {
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

// Update trend chart
function updateTrendChart(dailyScores) {
  const chartContainer = document.querySelector('.productivity-trend-chart');
  if (!chartContainer) return;

  if (!dailyScores || dailyScores.length === 0) {
    chartContainer.innerHTML = '<p style="text-align: center; color: #8f98a0;">No data available</p>';
    return;
  }

  // Take last 7 days
  const last7Days = dailyScores.slice(-7);
  const maxScore = Math.max(...last7Days.map(d => d.score), 1);

  chartContainer.innerHTML = '';

  last7Days.forEach(day => {
    const date = new Date(day.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const height = (day.score / maxScore) * 100;

    chartContainer.innerHTML += `
      <div class="trend-bar" style="height: ${height}%;">
        <span class="bar-value">${day.score}</span>
        <span class="bar-label">${dayName}</span>
      </div>
    `;
  });
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

  tabs.forEach((tab, index) => {
    const periods = ['today', 'week', 'month', 'year'];
    tab.dataset.period = periods[index];

    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      // Add active class to clicked tab
      tab.classList.add('active');

      // Load data for the selected period
      loadProductivityData(tab.dataset.period);
    });
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupDateRangeControls();

  // Load default data (week view)
  loadProductivityData('week');

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
