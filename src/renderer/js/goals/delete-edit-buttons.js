// Handle edit goal
async function handleEditGoal(goalCard) {
    const goalId = goalCard.dataset.goalId;

    if (!goalId) {
        console.error('Goal ID not found');
        return;
    }

    // Find the goal data from the current goals list
    const api = window.electronAPI || parent.electronAPI;

    try {
        const data = await api.getGoalsForDate(formatDateString(currentDate));
        const goal = data.goals.find(g => g.id === parseInt(goalId));

        if (!goal) {
            console.error('Goal not found');
            return;
        }

        // Open modal in edit mode
        openEditModal(goal);
    } catch (error) {
        console.error('Error loading goal for edit:', error);
        showFeedback(`Failed to load goal: ${error.message}`, false);
    }
}

// Open modal in edit mode
function openEditModal(goal) {
    const modal = document.getElementById('addGoalModal');
    const modalTitle = document.querySelector('.modal-header h3');
    const submitBtn = document.querySelector('#addGoalForm button[type="submit"]');

    if (!modal) return;

    // Set modal to edit mode
    modal.dataset.editMode = 'true';
    modal.dataset.editGoalId = goal.id;

    // Update modal title and button
    if (modalTitle) modalTitle.textContent = 'Edit Goal';
    if (submitBtn) submitBtn.textContent = 'Update Goal';

    // Populate form with goal data
    populateFormWithGoal(goal);

    // Show modal
    modal.style.display = 'flex';
}

// Populate form with goal data
async function populateFormWithGoal(goal) {
    // Set basic fields
    document.getElementById('goalName').value = goal.name || '';
    document.getElementById('goalDescription').value = goal.description || '';
    document.getElementById('goalIcon').value = goal.icon || '';
    document.getElementById('targetValue').value = goal.target_value || '';
    document.getElementById('targetType').value = goal.target_type || 'minimum';
    document.getElementById('frequency').value = goal.frequency || 'daily';

    // Set active goal type button and disable all type buttons
    const goalTypeBtns = document.querySelectorAll('.goal-type-btn');
    goalTypeBtns.forEach(btn => {
        if (btn.dataset.type === goal.type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
        // Disable goal type buttons in edit mode
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
    });

    // Handle type-specific fields
    await handleGoalTypeChange(goal.type);

    // Set unit based on goal type (after handleGoalTypeChange)
    const targetUnitSelect = document.getElementById('targetUnit');
    if (targetUnitSelect && goal.target_unit) {
        // Check if the value exists in the options
        const optionExists = Array.from(targetUnitSelect.options).some(opt => opt.value === goal.target_unit);
        if (optionExists) {
            targetUnitSelect.value = goal.target_unit;
        } else {
            console.error('Target unit not found in dropdown options:', goal.target_unit);
        }
    }

    // Set reference ID for app/category goals
    if (goal.type === 'app' || goal.type === 'category') {
        const referenceId = document.getElementById('referenceId');
        if (referenceId) {
            referenceId.value = goal.reference_id || '';
        }
    }

    // Set productivity level for productivity_time goals
    if (goal.type === 'productivity_time') {
        const productivityLevel = document.getElementById('productivityLevel');
        if (productivityLevel) {
            productivityLevel.value = goal.reference_id || 'productive';
        }
    }

    // Set min session duration for work_sessions goals
    if (goal.type === 'work_sessions') {
        const minSessionDuration = document.getElementById('minSessionDuration');
        if (minSessionDuration) {
            minSessionDuration.value = goal.min_session_duration || 25;
        }
    }
}

// Handle delete goal
async function handleDeleteGoal(goalCard) {
    const goalName = goalCard.querySelector('.goal-name').textContent;
    const goalId = goalCard.dataset.goalId;

    if (!goalId) {
        console.error('Goal ID not found');
        return;
    }

    // Access confirmation dialog through window or parent
    const confirmDialog = window.confirmationDialog || parent.confirmationDialog;

    if (!confirmDialog) {
        console.error('Confirmation dialog not available');
        return;
    }

    const confirmed = await confirmDialog.show({
        title: 'Delete Goal',
        message: `Are you sure you want to delete the goal "${goalName}"? This action cannot be undone.`,
        icon: '🗑️',
        iconColor: '#d32f2f',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        dangerMode: true
    });

    if (confirmed) {
        // Access API through parent for iframe
        const api = window.electronAPI || parent.electronAPI;

        try {
            await api.deleteGoal(parseInt(goalId));
            // Reload goals for current date
            await loadGoalsForDate(currentDate);
        } catch (error) {
            console.error('Error deleting goal:', error);
            showFeedback(`Failed to delete goal: ${error.message}`, true);
        }
    }
}
