function setUpShortcuts() {
    let selectedGoalIndex = -1;

    window.addEventListener('keydown', async (e) => {
        // Handle ESC for modals (works even in input fields)
        if (e.key === 'Escape') {
            const addGoalModal = document.getElementById('addGoalModal');
            const templatesModal = document.getElementById('templatesModal');

            if (addGoalModal && addGoalModal.style.display === 'flex') {
                e.preventDefault();
                closeModal();
                return;
            }
            if (templatesModal && templatesModal.style.display === 'flex') {
                e.preventDefault();
                closeTemplatesModalFunc();
                return;
            }
        }

        // Skip if typing in input field for other keys
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        // Get all goal items (from all sections)
        const goalItems = Array.from(document.querySelectorAll('.goals-grid .goal-card'));

        switch (e.key) {
            case 'n':
                e.preventDefault();
                const addGoalModal = document.getElementById('addGoalModal');
                // Toggle: if modal is open, close it; otherwise open it
                if (addGoalModal && addGoalModal.style.display === 'flex') {
                    closeModal();
                } else {
                    closeTemplatesModalFunc();
                    setTimeout(() => handleAddGoal(), 50);
                }
                break;
            case 't':
                e.preventDefault();
                const templatesModal = document.getElementById('templatesModal');
                // Toggle: if modal is open, close it; otherwise open it
                if (templatesModal && templatesModal.style.display === 'flex') {
                    closeTemplatesModalFunc();
                } else {
                    closeModal();
                    setTimeout(() => handleBrowseTemplates(), 50);
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (goalItems.length > 0) {
                    // Remove previous selection
                    if (selectedGoalIndex >= 0 && goalItems[selectedGoalIndex]) {
                        goalItems[selectedGoalIndex].classList.remove('keyboard-selected');
                    }
                    // Move down
                    selectedGoalIndex = Math.min(selectedGoalIndex + 1, goalItems.length - 1);
                    if (goalItems[selectedGoalIndex]) {
                        goalItems[selectedGoalIndex].classList.add('keyboard-selected');
                        goalItems[selectedGoalIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (goalItems.length > 0) {
                    // Remove previous selection
                    if (selectedGoalIndex >= 0 && goalItems[selectedGoalIndex]) {
                        goalItems[selectedGoalIndex].classList.remove('keyboard-selected');
                    }
                    // Move up
                    selectedGoalIndex = Math.max(selectedGoalIndex - 1, 0);
                    if (goalItems[selectedGoalIndex]) {
                        goalItems[selectedGoalIndex].classList.add('keyboard-selected');
                        goalItems[selectedGoalIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedGoalIndex >= 0 && goalItems[selectedGoalIndex]) {
                    // Find edit button and click it
                    const editBtn = goalItems[selectedGoalIndex].querySelector('.goal-action-btn[title="Edit goal"]');
                    if (editBtn) {
                        editBtn.click();
                    }
                }
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                if (selectedGoalIndex >= 0 && goalItems[selectedGoalIndex]) {
                    // Find delete button and click it
                    const deleteBtn = goalItems[selectedGoalIndex].querySelector('.goal-action-btn[title="Delete goal"]');
                    if (deleteBtn) {
                        deleteBtn.click();
                    }
                }
                break;
            case 'd':
                // Today
                e.preventDefault();
                const todayBtn = document.querySelector('.time-range-btn[data-period="today"]');
                if (todayBtn) todayBtn.click();
                break;
            case 'y':
                // Yesterday
                e.preventDefault();
                const yesterdayBtn = document.querySelector('.time-range-btn[data-period="yesterday"]');
                if (yesterdayBtn) yesterdayBtn.click();
                break;
            case 'ArrowLeft':
                // Ctrl + Left Arrow: Previous day
                if (e.ctrlKey) {
                    e.preventDefault();
                    const datePicker = document.getElementById('goalDatePicker');
                    if (datePicker && datePicker.value) {
                        const currentDate = new Date(datePicker.value);
                        currentDate.setDate(currentDate.getDate() - 1);
                        datePicker.value = formatDateString(currentDate);
                        datePicker.dispatchEvent(new Event('change'));
                    }
                }
                break;
            case 'ArrowRight':
                // Ctrl + Right Arrow: Next day
                if (e.ctrlKey) {
                    e.preventDefault();
                    const datePicker = document.getElementById('goalDatePicker');
                    if (datePicker && datePicker.value) {
                        const currentDate = new Date(datePicker.value);
                        currentDate.setDate(currentDate.getDate() + 1);
                        datePicker.value = formatDateString(currentDate);
                        datePicker.dispatchEvent(new Event('change'));
                    }
                }
                break;
            case "i":
                const insightsSection = document.getElementById('insightsSection');
                if(insightsSection){
                    insightsSection.classList.toggle('collapsed');
                }
                break;
            case "z":
                // All Goals
                e.preventDefault();
                const allGoalsBtn = document.querySelector('.filter-btn[data-filter="all"]');
                if (allGoalsBtn) allGoalsBtn.click();
                break;
            case "x":
                // All Goals
                e.preventDefault();
                const achievedGoalsBtn = document.querySelector('.filter-btn[data-filter="achieved"]');
                if (achievedGoalsBtn) achievedGoalsBtn.click();
                break;
            case "c":
                // All Goals
                e.preventDefault();
                const inProgressGoalsBtn = document.querySelector('.filter-btn[data-filter="in_progress"]');
                if (inProgressGoalsBtn) inProgressGoalsBtn.click();
                break;
            case "v":
                // All Goals
                e.preventDefault();
                const warningGoalsBtn = document.querySelector('.filter-btn[data-filter="warning"]');
                if (warningGoalsBtn) warningGoalsBtn.click();
                break;
            case "b":
                // All Goals
                e.preventDefault();
                const failedGoalsBtn = document.querySelector('.filter-btn[data-filter="failed"]');
                if (failedGoalsBtn) failedGoalsBtn.click();
                break;
        }
    });
}
