// Setup keyboard shortcuts for time ranges
document.addEventListener('keydown', (e) => {
    // Skip if user is typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    const key = e.key.toLowerCase();
    let period = null;

    // Letter shortcuts for time ranges
    switch (key) {
        case 'd':
            period = 'today';
            break;
        case 'w':
            period = 'week';
            break;
        case 'm':
            period = 'month';
            break;
        case 'y':
            period = 'year';
            break;
        case 'a':
            period = 'alltime';
            break;
    }

    if (period) {
        e.preventDefault();
        // Find and click the corresponding tab
        const tabs = document.querySelectorAll('.time-range-btn');
        const tab = Array.from(tabs).find(t => t.dataset.period === period);
        if (tab) {
            tab.click();
        }
        return;
    }

    // Arrow key shortcuts for date navigation
    const dateInputs = document.querySelectorAll('.custom-date-picker input[type="date"]');
    const startDateInput = dateInputs[0];
    const endDateInput = dateInputs[1];

    if (!startDateInput || !endDateInput) return;

    // Ctrl + Arrow: Move date range backward/forward
    if (e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();

        const direction = e.key === 'ArrowLeft' ? -1 : 1;
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        const rangeDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));

        // Move the entire range by its duration
        startDate.setDate(startDate.getDate() + (direction * (rangeDays + 1)));
        endDate.setDate(endDate.getDate() + (direction * (rangeDays + 1)));

        startDateInput.value = formatDateForInput(startDate);
        endDateInput.value = formatDateForInput(endDate);

        // Trigger change event
        startDateInput.dispatchEvent(new Event('change'));
    }
    // Shift + Arrow: Adjust start date
    else if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();

        const direction = e.key === 'ArrowLeft' ? -1 : 1;
        const startDate = new Date(startDateInput.value);
        startDate.setDate(startDate.getDate() + direction);

        startDateInput.value = formatDateForInput(startDate);
        startDateInput.dispatchEvent(new Event('change'));
    }
    // Alt + Arrow: Adjust end date
    else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();

        const direction = e.key === 'ArrowLeft' ? -1 : 1;
        const endDate = new Date(endDateInput.value);
        endDate.setDate(endDate.getDate() + direction);

        endDateInput.value = formatDateForInput(endDate);
        endDateInput.dispatchEvent(new Event('change'));
    }
});