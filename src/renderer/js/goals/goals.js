// Goals page functionality

let currentDate = new Date();
let currentPeriod = 'today';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupDateRangeControls();
  setupEventListeners();
  setupModalListeners();
  loadGoalsForDate(currentDate);
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

        datePicker.valueAsDate = currentDate;
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

  // Set initial date
  datePicker.valueAsDate = currentDate;
}

// Load goals for specific date
function loadGoalsForDate(date) {
  try {
    const dateString = formatDate(date);

    //updateDateDisplay(date);
    //updateStats(data.stats);
    //renderGoals(data.goals);
  } catch (error) {
    console.error('Error loading goals for date:', error);
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
    statCards[2].querySelector('.stat-value').textContent = stats.dayStreak;
  }
  if (statCards[3]) {
    statCards[3].querySelector('.stat-value').textContent = `${stats.successRate}%`;
  }
}

// Render goals
function renderGoals(goals) {
  renderProductivityGoals(goals.productivity);
  renderAppGoals(goals.apps);
  renderCategoryGoals(goals.categories);
}

// Render productivity goals
function renderProductivityGoals(goals) {
  const section = document.querySelector('.goals-section:nth-of-type(1) .goals-list');
  if (!section) return;

  if (!goals || goals.length === 0) {
    section.innerHTML = '<p style="text-align: center; color: #8f98a0; padding: 20px;">No productivity goals set</p>';
    return;
  }

  section.innerHTML = goals.map(goal => createGoalCard(goal)).join('');
  attachGoalEventListeners(section);
}

// Render app goals
function renderAppGoals(goals) {
  const section = document.querySelector('.goals-section:nth-of-type(2) .goals-list');
  if (!section) return;

  if (!goals || goals.length === 0) {
    section.innerHTML = '<p style="text-align: center; color: #8f98a0; padding: 20px;">No app goals set</p>';
    return;
  }

  section.innerHTML = goals.map(goal => createGoalCard(goal, true)).join('');
  attachGoalEventListeners(section);
}

// Render category goals
function renderCategoryGoals(goals) {
  const section = document.querySelector('.goals-section:nth-of-type(3) .goals-list');
  if (!section) return;

  if (!goals || goals.length === 0) {
    section.innerHTML = '<p style="text-align: center; color: #8f98a0; padding: 20px;">No category goals set</p>';
    return;
  }

  section.innerHTML = goals.map(goal => createCategoryGoalCard(goal)).join('');
  attachGoalEventListeners(section);
}

// Create goal card HTML
function createGoalCard(goal, showCategory = false) {
  const progress = calculateProgress(goal);
  const progressText = formatProgress(goal);
  const statusText = getStatusText(goal);

  return `
    <div class="goal-card ${goal.status}">
      <div class="goal-header">
        <div class="goal-info">
          <div class="goal-icon-large">${goal.icon}</div>
          <div class="goal-details">
            <h3 class="goal-name">${goal.name}</h3>
            <p class="goal-description">${goal.description}</p>
          </div>
        </div>
        <div class="goal-actions">
          <button class="icon-btn" title="Edit goal">✏️</button>
          <button class="icon-btn" title="Delete goal">🗑️</button>
        </div>
      </div>
      <div class="goal-progress-section">
        <div class="progress-bar-container">
          <div class="progress-bar-fill ${goal.status}" style="width: ${Math.min(progress, 150)}%;"></div>
        </div>
        <div class="progress-info">
          <span class="progress-current">${progressText}</span>
          <span class="progress-status ${goal.status}">${statusText}</span>
        </div>
      </div>
      <div class="goal-meta">
        <span class="goal-frequency">📅 ${goal.frequency}</span>
        ${goal.streak !== undefined ? `<span class="goal-streak">🔥 ${goal.streak} day streak</span>` : ''}
        ${showCategory && goal.category ? `<span class="goal-category" style="background: ${getCategoryColor(goal.category)};">${goal.category}</span>` : ''}
      </div>
    </div>
  `;
}

// Create category goal card HTML
function createCategoryGoalCard(goal) {
  const progress = calculateProgress(goal);
  const progressText = formatProgress(goal);
  const statusText = getStatusText(goal);

  return `
    <div class="goal-card ${goal.status}">
      <div class="goal-header">
        <div class="goal-info">
          <div class="goal-icon-large">${goal.icon}</div>
          <div class="goal-details">
            <h3 class="goal-name">${goal.name}</h3>
            <p class="goal-description">${goal.description}</p>
          </div>
        </div>
        <div class="goal-actions">
          <button class="icon-btn" title="Edit goal">✏️</button>
          <button class="icon-btn" title="Delete goal">🗑️</button>
        </div>
      </div>
      <div class="goal-progress-section">
        <div class="progress-bar-container">
          <div class="progress-bar-fill ${goal.status}" style="width: ${Math.min(progress, 150)}%;"></div>
        </div>
        <div class="progress-info">
          <span class="progress-current">${progressText}</span>
          <span class="progress-status ${goal.status}">${statusText}</span>
        </div>
      </div>
      <div class="goal-meta">
        <span class="goal-frequency">📅 ${goal.frequency}</span>
        <span class="goal-apps">${goal.appCount} apps in category</span>
      </div>
    </div>
  `;
}

// Calculate progress percentage
function calculateProgress(goal) {
  return Math.round((goal.current / goal.target) * 100);
}

// Format progress text
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

// Get status text
function getStatusText(goal) {
  const progress = calculateProgress(goal);

  switch (goal.status) {
    case 'achieved':
      return '✓ Achieved';
    case 'failed':
      return '✗ Failed';
    case 'warning':
      return '⚠️ Near Limit';
    case 'in-progress':
      return `${progress}% Complete`;
    default:
      return 'Pending';
  }
}

// Format minutes to hours and minutes
function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

// Get category color
function getCategoryColor(category) {
  const colors = {
    'Development': '#66c0f4',
    'Productivity': '#27ae60',
    'Entertainment': '#e74c3c',
    'Uncategorized': '#95a5a6'
  };
  return colors[category] || '#95a5a6';
}

// Format date to YYYY-MM-DD (compatible with date inputs)
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format date to long format
function formatDateLong(date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Setup event listeners
function setupEventListeners() {
  const addGoalBtn = document.getElementById('addGoalBtn');
  if (addGoalBtn) {
    addGoalBtn.addEventListener('click', handleAddGoal);
  }
}

// Attach event listeners to goal cards
function attachGoalEventListeners(section) {
  if (!section) return;

  // Edit buttons
  section.querySelectorAll('.icon-btn[title="Edit goal"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const goalCard = e.target.closest('.goal-card');
      if (goalCard) {
        handleEditGoal(goalCard);
      }
    });
  });

  // Delete buttons
  section.querySelectorAll('.icon-btn[title="Delete goal"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
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
    modal.classList.add('show');
    resetModalForm();
  }
}

// Reset modal form
function resetModalForm() {
  const form = document.getElementById('addGoalForm');
  if (form) {
    form.reset();

    // Reset goal type to first option
    const goalTypeBtns = document.querySelectorAll('.goal-type-btn');
    goalTypeBtns.forEach(btn => btn.classList.remove('active'));
    if (goalTypeBtns[0]) {
      goalTypeBtns[0].classList.add('active');
    }

    // Hide conditional sections
    document.getElementById('referenceSection').style.display = 'none';
    document.getElementById('sessionDurationSection').style.display = 'none';
  }
}

// Close modal
function closeModal() {
  const modal = document.getElementById('addGoalModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

// Setup modal event listeners
function setupModalListeners() {
  const modal = document.getElementById('addGoalModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelModalBtn');
  const form = document.getElementById('addGoalForm');

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // Cancel button
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeModal);
  }

  // Click outside modal to close
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });

  // Goal type selector
  const goalTypeBtns = document.querySelectorAll('.goal-type-btn');
  goalTypeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();

      // Remove active from all
      goalTypeBtns.forEach(b => b.classList.remove('active'));

      // Add active to clicked
      btn.classList.add('active');

      // Show/hide conditional fields
      const type = btn.dataset.type;
      handleGoalTypeChange(type);
    });
  });

  // Form submit
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
}

// Handle goal type change
function handleGoalTypeChange(type) {
  const referenceSection = document.getElementById('referenceSection');
  const sessionDurationSection = document.getElementById('sessionDurationSection');
  const targetUnit = document.getElementById('targetUnit');

  // Reset visibility
  referenceSection.style.display = 'none';
  sessionDurationSection.style.display = 'none';

  // Show relevant sections based on type
  switch (type) {
    case 'app':
    case 'category':
      referenceSection.style.display = 'block';
      // TODO: Populate with actual apps/categories
      break;
    case 'work_sessions':
      sessionDurationSection.style.display = 'block';
      targetUnit.value = 'sessions';
      break;
    case 'productivity_score':
      targetUnit.value = 'score';
      break;
    case 'productivity_time':
      targetUnit.value = 'minutes';
      break;
  }
}

// Handle form submit
function handleFormSubmit(e) {
  e.preventDefault();

  // Get selected goal type
  const selectedType = document.querySelector('.goal-type-btn.active');
  if (!selectedType) {
    alert('Please select a goal type');
    return;
  }

  // Collect form data
  const formData = {
    type: selectedType.dataset.type,
    name: document.getElementById('goalName').value,
    description: document.getElementById('goalDescription').value,
    icon: document.getElementById('goalIcon').value || '🎯',
    target_value: parseFloat(document.getElementById('targetValue').value),
    target_unit: document.getElementById('targetUnit').value,
    target_type: document.getElementById('targetType').value,
    frequency: document.getElementById('frequency').value,
    reference_id: document.getElementById('referenceId').value || null,
    min_session_duration: document.getElementById('minSessionDuration').value || null
  };

  console.log('Creating goal:', formData);

  // TODO: Save to database via IPC
  // For now, just show success message
  alert(`Goal "${formData.name}" created successfully!\n\n(Database integration coming soon)`);

  closeModal();
}

// Handle edit goal
function handleEditGoal(goalCard) {
  const goalName = goalCard.querySelector('.goal-name').textContent;
  console.log('Edit goal:', goalName);
  alert(`Edit goal "${goalName}" feature coming soon!`);
}

// Handle delete goal
function handleDeleteGoal(goalCard) {
  const goalName = goalCard.querySelector('.goal-name').textContent;
  
  if (confirm(`Are you sure you want to delete the goal "${goalName}"?`)) {
    console.log('Delete goal:', goalName);
    alert('Delete goal feature coming soon!');
  }
}
