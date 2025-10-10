// Helper function to get human-readable status text
function getStatusText(goal) {
    const statusMap = {
        'achieved': '✅ Achieved',
        'in_progress': '⏳ In Progress',
        'warning': '⚠️ Warning',
        'failed': '❌ Failed',
        'pending': '⏸️ Pending'
    };
    return statusMap[goal.status] || goal.status;
}

// Render goals (legacy - keeping for compatibility)
function renderGoals(goals) {
    renderProductivityGoals(goals.productivity);
    renderAppGoals(goals.apps);
    renderCategoryGoals(goals.categories);
}

// Render productivity goals
function renderProductivityGoals(goals, isToday = true, hasNoGoalsAtAll = false) {
    const section = document.querySelector('.goals-section:nth-of-type(1) .goals-grid');
    if (!section) return;

    if (!goals || goals.length === 0) {
        const message = hasNoGoalsAtAll && !isToday
            ? 'No saved progress for this date'
            : 'No productivity goals set';
        section.innerHTML = `<p style="text-align: center; color: #8f98a0; padding: 20px; grid-column: 1 / -1;">${message}</p>`;
        return;
    }

    section.innerHTML = goals.map(goal => createGoalCard(goal, false, isToday)).join('');
    attachGoalEventListeners(section);
}

// Render app goals
function renderAppGoals(goals, isToday = true, hasNoGoalsAtAll = false) {
    const section = document.querySelector('.goals-section:nth-of-type(2) .goals-grid');
    if (!section) return;

    if (!goals || goals.length === 0) {
        const message = hasNoGoalsAtAll && !isToday
            ? 'No saved progress for this date'
            : 'No app goals set';
        section.innerHTML = `<p style="text-align: center; color: #8f98a0; padding: 20px; grid-column: 1 / -1;">${message}</p>`;
        return;
    }

    section.innerHTML = goals.map(goal => createGoalCard(goal, true, isToday)).join('');
    attachGoalEventListeners(section);
}

// Render category goals
function renderCategoryGoals(goals, isToday = true, hasNoGoalsAtAll = false) {
    const section = document.querySelector('.goals-section:nth-of-type(3) .goals-grid');
    if (!section) return;

    if (!goals || goals.length === 0) {
        const message = hasNoGoalsAtAll && !isToday
            ? 'No saved progress for this date'
            : 'No category goals set';
        section.innerHTML = `<p style="text-align: center; color: #8f98a0; padding: 20px; grid-column: 1 / -1;">${message}</p>`;
        return;
    }

    section.innerHTML = goals.map(goal => createGoalCard(goal, true, isToday)).join('');
    attachGoalEventListeners(section);
}

// Create goal card HTML
function createGoalCard(goal, showAppOrCategory = false, isToday = true) {
    const progress = goal.progress_percentage || 0;
    const progressText = formatProgressFromGoal(goal);
    const statusText = getStatusText(goal);

    // Build reference badge if applicable
    let referenceBadge = '';
    if (showAppOrCategory && goal.reference_name) {
        const icon = goal.reference_type === 'app' ? '💻' : '📁';
        referenceBadge = `<span class="goal-reference-badge">${icon} ${goal.reference_name}</span>`;
    }

    // Only show edit/delete buttons for today
    const actionsHtml = isToday ? `
    <div class="goal-card-actions">
      <button class="goal-action-btn" title="Edit goal">✏️</button>
      <button class="goal-action-btn" title="Delete goal">🗑️</button>
    </div>
  ` : '';

    return `
    <div class="goal-card ${goal.status}" data-goal-id="${goal.id}">
      ${actionsHtml}

      <div class="goal-card-icon-section">
        <div class="goal-icon-wrapper">
          <div class="goal-icon-large">${goal.icon || '🎯'}</div>
        </div>
      </div>

      <div class="goal-card-content">
        <div class="goal-card-header">
          <div class="goal-card-title-row">
            <h3 class="goal-card-name">${goal.name}</h3>
            <div class="goal-status-badge ${goal.status}">${statusText}</div>
          </div>
          ${goal.description ? `<p class="goal-card-description">${goal.description}</p>` : ''}
        </div>

        <div class="goal-card-meta">
          <span class="goal-frequency-badge">📅 ${goal.frequency}</span>
          ${referenceBadge}
        </div>

        <div class="goal-card-progress">
          <div class="progress-bar-container">
            <div class="progress-bar-fill ${goal.status}" style="width: ${Math.min(progress, 100)}%;"></div>
          </div>
          <div class="progress-info">
            <span class="progress-text">${progressText}</span>
            <span class="progress-percentage">${Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  `;
}