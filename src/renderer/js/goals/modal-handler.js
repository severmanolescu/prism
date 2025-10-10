// Reset modal form
function resetModalForm() {
    const form = document.getElementById('addGoalForm');
    const modal = document.getElementById('addGoalModal');
    const modalTitle = document.querySelector('.modal-header h3');
    const submitBtn = document.querySelector('#addGoalForm button[type="submit"]');

    if (form) {
        form.reset();

        // Reset edit mode
        if (modal) {
            modal.dataset.editMode = 'false';
            delete modal.dataset.editGoalId;
        }

        // Reset modal title and button
        if (modalTitle) modalTitle.textContent = 'Add New Goal';
        if (submitBtn) submitBtn.textContent = 'Create Goal';

        // Reset goal type to first option and re-enable buttons
        const goalTypeBtns = document.querySelectorAll('.goal-type-btn');
        goalTypeBtns.forEach(btn => {
            btn.classList.remove('active');
            // Re-enable goal type buttons
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
        if (goalTypeBtns[0]) {
            goalTypeBtns[0].classList.add('active');
            // Set the correct units for the default goal type
            const defaultType = goalTypeBtns[0].dataset.type;
            handleGoalTypeChange(defaultType);
        }

        // Re-enable all form inputs
        const inputs = form.querySelectorAll('input, textarea, select, button');
        inputs.forEach(input => {
            input.disabled = false;
            input.readOnly = false;
        });
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('addGoalModal');
    if (modal) {
        modal.style.display = 'none';
        // Reset form after closing to clear edit mode and re-enable buttons
        resetModalForm();
    }
}

// Track if modal listeners are set up
let modalListenersSetup = false;

// Setup modal event listeners
function setupModalListeners() {
    if (modalListenersSetup) return; // Only set up once
    modalListenersSetup = true;

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
        if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
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

    // Icon input validation - only allow emojis
    const iconInput = document.getElementById('goalIcon');
    if (iconInput) {
        iconInput.addEventListener('input', (e) => {
            const value = e.target.value;
            // Regex to match emoji characters
            const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
            const emojis = value.match(emojiRegex);

            if (emojis && emojis.length > 0) {
                // Keep only the first emoji
                e.target.value = emojis[0];
            } else if (value.length > 0) {
                // If no emoji found, clear the input
                e.target.value = '';
            }
        });

        // Prevent pasting non-emoji text
        iconInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedText = e.clipboardData.getData('text');
            const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
            const emojis = pastedText.match(emojiRegex);

            if (emojis && emojis.length > 0) {
                iconInput.value = emojis[0];
            }
        });
    }

    // Emoji picker functionality
    const emojiPickerBtn = document.getElementById('emojiPickerBtn');
    const emojiPickerPopup = document.getElementById('emojiPickerPopup');

    if (emojiPickerBtn && emojiPickerPopup) {
        // Toggle emoji picker
        emojiPickerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = emojiPickerPopup.style.display === 'block';
            emojiPickerPopup.style.display = isVisible ? 'none' : 'block';
        });

        // Select emoji from picker
        const emojiOptions = emojiPickerPopup.querySelectorAll('.emoji-option');
        emojiOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                if (iconInput) {
                    iconInput.value = option.textContent;
                }
                emojiPickerPopup.style.display = 'none';
            });
        });

        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!emojiPickerBtn.contains(e.target) && !emojiPickerPopup.contains(e.target)) {
                emojiPickerPopup.style.display = 'none';
            }
        });
    }
}

// Handle goal type change
async function handleGoalTypeChange(type) {
    const referenceSection = document.getElementById('referenceSection');
    const referenceLabel = document.getElementById('referenceLabel');
    const productivityLevelSection = document.getElementById('productivityLevelSection');
    const sessionDurationSection = document.getElementById('sessionDurationSection');
    const targetUnit = document.getElementById('targetUnit');

    // Reset visibility
    referenceSection.style.display = 'none';
    productivityLevelSection.style.display = 'none';
    sessionDurationSection.style.display = 'none';

    // Update unit options based on goal type
    switch (type) {
        case 'productivity_score':
            targetUnit.innerHTML = '<option value="score">Score</option>';
            targetUnit.value = 'score';
            break;

        case 'productivity_time':
            targetUnit.innerHTML = `
        <option value="minutes">Minutes</option>
        <option value="hours">Hours</option>
      `;
            targetUnit.value = 'minutes';
            productivityLevelSection.style.display = 'block';
            break;

        case 'work_sessions':
            targetUnit.innerHTML = '<option value="sessions">Sessions</option>';
            targetUnit.value = 'sessions';
            sessionDurationSection.style.display = 'block';
            break;

        case 'app':
            targetUnit.innerHTML = `
        <option value="minutes">Minutes</option>
        <option value="hours">Hours</option>
      `;
            targetUnit.value = 'minutes';
            referenceSection.style.display = 'block';
            referenceLabel.textContent = 'Select App';
            await populateApps();
            break;

        case 'category':
            targetUnit.innerHTML = `
        <option value="minutes">Minutes</option>
        <option value="hours">Hours</option>
      `;
            targetUnit.value = 'minutes';
            referenceSection.style.display = 'block';
            referenceLabel.textContent = 'Select Category';
            await populateCategories();
            break;

        default:
            targetUnit.innerHTML = `
        <option value="score">Score</option>
        <option value="minutes">Minutes</option>
        <option value="hours">Hours</option>
        <option value="sessions">Sessions</option>
      `;
            break;
    }
}

// Populate apps dropdown
async function populateApps() {
    const referenceId = document.getElementById('referenceId');
    const api = window.electronAPI || parent.electronAPI;

    try {
        const apps = await api.getAllApps();

        // Sort apps by name
        apps.sort((a, b) => a.name.localeCompare(b.name));

        // Populate dropdown
        referenceId.innerHTML = '<option value="">-- Select an App --</option>';
        apps.forEach(app => {
            const option = document.createElement('option');
            option.value = app.id;
            option.textContent = app.name;
            referenceId.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading apps:', error);
        referenceId.innerHTML = '<option value="">Error loading apps</option>';
    }
}

// Populate categories dropdown
async function populateCategories() {
    const referenceId = document.getElementById('referenceId');
    const api = window.electronAPI || parent.electronAPI;

    try {
        const categories = await api.getCategories();

        // Sort categories by name
        categories.sort((a, b) => a.name.localeCompare(b.name));

        // Populate dropdown
        referenceId.innerHTML = '<option value="">-- Select a Category --</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            referenceId.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        referenceId.innerHTML = '<option value="">Error loading categories</option>';
    }
}

// Handle form submit
async function handleFormSubmit(e) {
    e.preventDefault();

    // Get the form element
    const form = e.target;

    // Get selected goal type
    const selectedType = document.querySelector('.goal-type-btn.active');
    if (!selectedType) {
        alert('Please select a goal type');
        return;
    }

    // Collect form data
    const targetUnitValue = document.getElementById('targetUnit').value;

    // Validate target_unit
    const validUnits = ['score', 'minutes', 'hours', 'sessions'];
    if (!validUnits.includes(targetUnitValue)) {
        console.error('Invalid target_unit:', targetUnitValue);
        alert('Invalid unit selected. Please select a valid unit.');
        return;
    }

    // Get selected active days
    const selectedDays = Array.from(document.querySelectorAll('.day-checkbox-input:checked'))
        .map(checkbox => checkbox.value)
        .join(',');

    const formData = {
        type: selectedType.dataset.type,
        name: document.getElementById('goalName').value,
        description: document.getElementById('goalDescription').value,
        icon: document.getElementById('goalIcon').value || '🎯',
        target_value: parseFloat(document.getElementById('targetValue').value),
        target_unit: targetUnitValue,
        target_type: document.getElementById('targetType').value,
        frequency: document.getElementById('frequency').value,
        active_days: selectedDays || null,
        reference_type: null,
        reference_id: null,
        min_session_duration: null
    };

    // Set reference type and ID for app/category goals
    if (formData.type === 'app' || formData.type === 'category') {
        formData.reference_type = formData.type;
        formData.reference_id = document.getElementById('referenceId').value || null;

        // Validate that an app or category is selected
        if (!formData.reference_id) {
            alert(`Please select ${formData.type === 'app' ? 'an app' : 'a category'}`);
            return;
        }
    }

    // Set reference for productivity_time goals
    if (formData.type === 'productivity_time') {
        formData.reference_type = 'productivity_level';
        formData.reference_id = document.getElementById('productivityLevel').value || 'productive';
    }

    // Set min session duration for work_sessions
    if (formData.type === 'work_sessions') {
        formData.min_session_duration = parseInt(document.getElementById('minSessionDuration').value) || 25;
    }

    // Check if we're in edit mode
    const modal = document.getElementById('addGoalModal');
    const isEditMode = modal && modal.dataset.editMode === 'true';
    const editGoalId = modal ? modal.dataset.editGoalId : null;

    // Save to database via IPC (access through parent for iframe)
    const api = window.electronAPI || parent.electronAPI;

    // Disable form while submitting
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = isEditMode ? 'Updating...' : 'Creating...';
    }

    try {
        if (isEditMode && editGoalId) {
            // Update existing goal - remove type field as it cannot be changed
            const { type, ...updateData } = formData;
            await api.updateGoal(parseInt(editGoalId), updateData);
        } else {
            // Create new goal
            await api.createGoal(formData);
        }

        closeModal();
        // Reload goals for current date
        await loadGoalsForDate(currentDate);
        showFeedback('Goal edited with success!', true);
    } catch (error) {
        console.error(isEditMode ? 'Error updating goal:' : 'Error creating goal:', error);
        alert(`Failed to ${isEditMode ? 'update' : 'create'} goal: ${error.message}`);
        // Re-enable form on error
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }
}
