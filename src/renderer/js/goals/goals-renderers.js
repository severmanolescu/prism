// Render goals (legacy - keeping for compatibility)
function renderGoals(goals) {
    renderProductivityGoals(goals.productivity);
    renderAppGoals(goals.apps);
    renderCategoryGoals(goals.categories);
}

// Render productivity goals
function renderProductivityGoals(goals, isToday = true, hasNoGoalsAtAll = false) {
    const section = document.querySelector('.goals-section:nth-of-type(1) .goals-list');
    if (!section) return;

    if (!goals || goals.length === 0) {
        const message = hasNoGoalsAtAll && !isToday
            ? 'No saved progress for this date'
            : 'No productivity goals set';
        section.innerHTML = `<p style="text-align: center; color: #8f98a0; padding: 20px;">${message}</p>`;
        return;
    }

    section.innerHTML = goals.map(goal => createGoalCard(goal, false, isToday)).join('');
    attachGoalEventListeners(section);
}

// Render app goals
function renderAppGoals(goals, isToday = true, hasNoGoalsAtAll = false) {
    const section = document.querySelector('.goals-section:nth-of-type(2) .goals-list');
    if (!section) return;

    if (!goals || goals.length === 0) {
        const message = hasNoGoalsAtAll && !isToday
            ? 'No saved progress for this date'
            : 'No app goals set';
        section.innerHTML = `<p style="text-align: center; color: #8f98a0; padding: 20px;">${message}</p>`;
        return;
    }

    section.innerHTML = goals.map(goal => createGoalCard(goal, true, isToday)).join('');
    attachGoalEventListeners(section);
}

// Render category goals
function renderCategoryGoals(goals, isToday = true, hasNoGoalsAtAll = false) {
    const section = document.querySelector('.goals-section:nth-of-type(3) .goals-list');
    if (!section) return;

    if (!goals || goals.length === 0) {
        const message = hasNoGoalsAtAll && !isToday
            ? 'No saved progress for this date'
            : 'No category goals set';
        section.innerHTML = `<p style="text-align: center; color: #8f98a0; padding: 20px;">${message}</p>`;
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

    console.log('Goal:', goal.name, 'Progress:', progress, 'Status:', goal.status);

    // Determine what to show in meta section
    let metaHtml = `<span class="goal-frequency">📅 ${goal.frequency}</span>`;

    if (showAppOrCategory && goal.reference_name) {
        // Show app or category name
        const icon = goal.reference_type === 'app' ? '💻' : '📁';
        metaHtml += ` <span class="goal-category" style="background: rgba(103, 193, 245, 0.2);">${icon} ${goal.reference_name}</span>`;
    }

    // Only show edit/delete buttons for today
    const actionsHtml = isToday ? `
    <div class="goal-actions">
      <button class="icon-btn" title="Edit goal">✏️</button>
      <button class="icon-btn" title="Delete goal">🗑️</button>
    </div>
  ` : '';

    return `
    <div class="goal-card ${goal.status}" data-goal-id="${goal.id}">
      <div class="goal-header">
        <div class="goal-info">
          <div class="goal-icon-large">${goal.icon || '🎯'}</div>
          <div class="goal-details">
            <h3 class="goal-name">${goal.name}</h3>
            <p class="goal-description">${goal.description || ''}</p>
          </div>
        </div>
        ${actionsHtml}
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
        ${metaHtml}
      </div>
    </div>
  `;
}