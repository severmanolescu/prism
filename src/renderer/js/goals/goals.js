// Goals page functionality

let currentDate = new Date();
let currentPeriod = 'today';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupDateRangeControls();
  setupEventListeners();
  setupModalListeners();
  setupInsightsSection();
  loadGoalsForDate(currentDate);
  loadInsights();

  setUpShortcuts();
});

// Setup date range controls
function setupDateRangeControls() {
  const tabs = document.querySelectorAll('.time-range-btn');
  const datePicker = document.getElementById('goalDatePicker');

  if (!tabs.length || !datePicker) {
    console.error('Date navigation elements not found');
    return;
  }

  // Setup time range buttons
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      try {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tab.classList.add('active');

        currentPeriod = tab.dataset.period;

        // Calculate date based on period
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (currentPeriod) {
          case 'today':
            currentDate = new Date(today);
            break;
          case 'yesterday':
            currentDate = new Date(today);
            currentDate.setDate(currentDate.getDate() - 1);
            break;
          case '2days':
            currentDate = new Date(today);
            currentDate.setDate(currentDate.getDate() - 2);
            break;
          case '3days':
            currentDate = new Date(today);
            currentDate.setDate(currentDate.getDate() - 3);
            break;
        }

        // Use value property to avoid timezone issues
        datePicker.value = formatDateString(currentDate);
        loadGoalsForDate(currentDate);
      } catch (error) {
        console.error('Error loading goals for period:', error);
      }
    });
  });

  // Setup custom date picker
  datePicker.addEventListener('change', (e) => {
    try {
      // When custom date is changed, deactivate all buttons
      tabs.forEach(t => t.classList.remove('active'));

      currentDate = new Date(e.target.value);
      currentPeriod = 'custom';
      loadGoalsForDate(currentDate);
    } catch (error) {
      console.error('Error loading goals for selected date:', error);
    }
  });

  // Set initial date (use value to avoid timezone issues)
  datePicker.value = formatDateString(currentDate);
}

// Load goals for specific date
async function loadGoalsForDate(date) {
  try {
    const dateString = formatDateString(date);

    // Fetch goals data from database (access through parent for iframe)
    const api = window.electronAPI || parent.electronAPI;
    const data = await api.getGoalsForDate(dateString);

    updateDateDisplay(date);
    updateStats(data.stats);
    renderGoalsFromDatabase(data.goals, data.isToday);
  } catch (error) {
    console.error('Error loading goals for date:', error);

    // Show empty state on error
    updateDateDisplay(date);
    updateStats({
      activeGoals: 0,
      achievedToday: 0,
      dayStreak: 0,
      successRate: 0
    });
    renderGoalsFromDatabase([], false);
  }
}

// Update date display
function updateDateDisplay(date) {
  const dateInfo = document.getElementById('dateInfo');

  if (!dateInfo) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);

  const isToday = selectedDate.getTime() === today.getTime();

  let displayText = '';
  if (isToday) {
    displayText = "Viewing today's goals";
  } else {
    const daysAgo = Math.floor((today - selectedDate) / (1000 * 60 * 60 * 24));
    if (daysAgo === 1) {
      displayText = "Viewing yesterday's goals";
    } else if (daysAgo > 1) {
      displayText = `Viewing goals from ${daysAgo} days ago`;
    } else {
      displayText = `Viewing goals for ${formatDateLong(date)}`;
    }
  }

  dateInfo.textContent = displayText;
}

// Update stats
function updateStats(stats) {
  const statCards = document.querySelectorAll('.stat-card');

  if (statCards[0]) {
    statCards[0].querySelector('.stat-value').textContent = stats.activeGoals;
  }
  if (statCards[1]) {
    statCards[1].querySelector('.stat-value').textContent = stats.achievedToday;
  }
  if (statCards[2]) {
    statCards[2].querySelector('.stat-value').textContent = stats.activeGoals - stats.achievedToday;
  }
  if (statCards[3]) {
    statCards[3].querySelector('.stat-value').textContent = stats.dayStreak;
  }
  if (statCards[4]) {
    statCards[4].querySelector('.stat-value').textContent = `${stats.successRate}%`;
  }
}

// Render goals from database
function renderGoalsFromDatabase(goals, isToday = true) {
  // Group goals by type
  const groupedGoals = {
    productivity: [],
    apps: [],
    categories: []
  };

  goals.forEach(goal => {
    if (goal.type === 'productivity_score' || goal.type === 'productivity_time' || goal.type === 'work_sessions') {
      groupedGoals.productivity.push(goal);
    } else if (goal.type === 'app') {
      groupedGoals.apps.push(goal);
    } else if (goal.type === 'category') {
      groupedGoals.categories.push(goal);
    }
  });

  // Check if we have no goals at all
  const hasNoGoals = goals.length === 0;

  renderProductivityGoals(groupedGoals.productivity, isToday, hasNoGoals);
  renderAppGoals(groupedGoals.apps, isToday, hasNoGoals);
  renderCategoryGoals(groupedGoals.categories, isToday, hasNoGoals);
}

// Calculate progress percentage (legacy)
function calculateProgress(goal) {
  return Math.round((goal.current / goal.target) * 100);
}

// Format progress text from database goal object
function formatProgressFromGoal(goal) {
  const current = goal.current_value || 0;
  const target = goal.target_value || 0;
  const unit = goal.target_unit;

  if (unit === 'hours' || unit === 'minutes') {
    // Convert to milliseconds for formatTime (both are already in their respective units)
    let currentMs, targetMs;

    if (unit === 'hours') {
      currentMs = current * 3600000; // hours to milliseconds
      targetMs = target * 3600000;
    } else {
      currentMs = current * 60000; // minutes to milliseconds
      targetMs = target * 60000;
    }

    return `${formatTime(currentMs)} / ${formatTime(targetMs)}`;
  } else if (unit === 'score') {
    return `Score: ${current} / ${target}`;
  } else if (unit === 'sessions') {
    return `${current} / ${target} sessions`;
  }
  return `${current} / ${target}`;
}

// Format progress text (legacy)
function formatProgress(goal) {
  if (goal.unit === 'minutes') {
    return `${formatMinutes(goal.current)} / ${formatMinutes(goal.target)}`;
  } else if (goal.unit === 'score') {
    return `Score: ${goal.current} / ${goal.target}`;
  } else if (goal.unit === 'sessions') {
    return `${goal.current} / ${goal.target} sessions`;
  }
  return `${goal.current} / ${goal.target}`;
}

// Setup event listeners
function setupEventListeners() {
  const addGoalBtn = document.getElementById('addGoalBtn');
  if (addGoalBtn) {
    addGoalBtn.addEventListener('click', handleAddGoal);
  }

  // Setup export menu
  initializeExportMenu();

  const browseTemplatesBtn = document.getElementById('browseTemplatesBtn');
  if (browseTemplatesBtn) {
    browseTemplatesBtn.addEventListener('click', handleBrowseTemplates);
  }

  const closeTemplatesModalBtn = document.getElementById('closeTemplatesModal');
  if (closeTemplatesModalBtn) {
    closeTemplatesModalBtn.addEventListener('click', closeTemplatesModalFunc);
  }

  // Close templates modal when clicking outside
  const templatesModal = document.getElementById('templatesModal');
  if (templatesModal) {
    templatesModal.addEventListener('click', (e) => {
      if (e.target === templatesModal) {
        closeTemplatesModalFunc();
      }
    });
  }
}

// Attach event listeners to goal cards
function attachGoalEventListeners(section) {
  if (!section) return;

  // Edit buttons
  section.querySelectorAll('.goal-action-btn[title="Edit goal"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card click
      const goalCard = e.target.closest('.goal-card');
      if (goalCard) {
        handleEditGoal(goalCard);
      }
    });
  });

  // Delete buttons
  section.querySelectorAll('.goal-action-btn[title="Delete goal"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card click
      const goalCard = e.target.closest('.goal-card');
      if (goalCard) {
        handleDeleteGoal(goalCard);
      }
    });
  });
}

// Handle add new goal
function handleAddGoal() {
  const modal = document.getElementById('addGoalModal');
  if (modal) {
    modal.style.display = 'flex';
    resetModalForm();
  }
}

// Setup insights section toggle
function setupInsightsSection() {
  const insightsToggle = document.getElementById('insightsToggle');
  const insightsSection = document.getElementById('insightsSection');

  if (insightsToggle && insightsSection) {
    insightsToggle.addEventListener('click', () => {
      insightsSection.classList.toggle('collapsed');

      // Re-render chart when section is expanded (to fix canvas sizing issues)
      if (!insightsSection.classList.contains('collapsed')) {
        // Re-load insights to refresh the chart
        setTimeout(() => {
          loadInsights();
        }, 300); // Small delay to allow CSS transition to complete
      }
    });
  }
}

// Load and render insights
async function loadInsights() {
  const api = window.electronAPI || parent.electronAPI;

  try {
    // Load 30 days of data for heatmap and 7 days for chart
    const insights = await api.getGoalInsights(30);

    // Render success rate chart (last 7 days)
    renderSuccessRateChart(insights.dailySuccessRate.slice(-7));

    // Render calendar heatmap (all 30 days)
    renderCalendarHeatmap(insights.calendarHeatmap);
  } catch (error) {
    console.error('Error loading insights:', error);
  }
}

// Render calendar heatmap
function renderCalendarHeatmap(data) {
  const container = document.getElementById('calendarHeatmap');
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 20px; grid-column: 1 / -1;">No data available</div>';
    return;
  }

  // Calculate max success rate for intensity
  const maxRate = 100;

  let html = [];

  // Add day labels first
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayLabels.forEach(label => {
    html.push(`<div class="calendar-day-label">${label}</div>`);
  });

  // Add empty cells for alignment to start on correct day
  const firstDay = new Date(data[0].date).getDay();
  for (let i = 0; i < firstDay; i++) {
    html.push('<div class="calendar-day empty"></div>');
  }

  // Add calendar days
  data.forEach(day => {
    const successRate = day.successRate !== null && day.total > 0 ? day.successRate : 0;
    const intensity = successRate > 0 ? 0.2 + (successRate / maxRate) * 0.8 : 0.05;
    const dayNum = new Date(day.date).getDate();
    const dateStr = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const tooltip = day.total > 0
      ? `${dateStr}: ${day.successRate}% (${day.achieved}/${day.total})`
      : `${dateStr}: No goals`;

    html.push(`
      <div class="calendar-day"
           style="background: rgba(102, 192, 244, ${intensity});"
           title="${tooltip}">
        ${dayNum}
      </div>
    `);
  });

  container.innerHTML = html.join('');
}

