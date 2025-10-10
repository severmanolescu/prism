// Setup export menu once on page load
function initializeExportMenu() {
    setupExportMenu({
        triggerSelector: '#exportBtn',
        onCSVExport: handleExportGoalsCSV,
        onJSONExport: handleExportGoalsJSON,
        onPDFExport: handleExportGoalsPDF
    });
}

async function handleExportGoalsCSV() {
    try {
        const dateString = formatDateString(currentDate);
        const api = window.electronAPI || parent.electronAPI;
        const data = await api.getGoalsForDate(dateString);

        if (!data || !data.goals) {
            alert('No data to export');
            return;
        }

        exportGoalsAsCSV(data, dateString);
    } catch (error) {
        console.error('Error preparing CSV export:', error);
        alert('Failed to export. Please try again.');
    }
}

async function handleExportGoalsJSON() {
    try {
        const dateString = formatDateString(currentDate);
        const api = window.electronAPI || parent.electronAPI;
        const data = await api.getGoalsForDate(dateString);

        if (!data || !data.goals) {
            alert('No data to export');
            return;
        }

        exportGoalsAsJSON(data, dateString);
    } catch (error) {
        console.error('Error preparing JSON export:', error);
        alert('Failed to export. Please try again.');
    }
}

async function handleExportGoalsPDF() {
    try {
        const dateString = formatDateString(currentDate);

        // Send message to parent window to handle PDF export
        window.parent.postMessage({
            type: 'EXPORT_GOALS_PDF',
            date: dateString,
            dateFormatted: currentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        }, '*');
    } catch (error) {
        console.error('Error exporting PDF:', error);
        showFeedback('Failed to export PDF', false);
    }
}

// Listen for PDF export response from parent window
window.addEventListener('message', (event) => {
    if (event.source !== window.parent) {
        return;
    }

    if (event.data.type === 'EXPORT_PDF_RESPONSE') {
        const result = event.data.result;

        if (result.success) {
            showFeedback('PDF exported successfully!', true);
        } else if (!result.canceled) {
            showFeedback(`Failed to export PDF: ${result.error}`, false);
        }
    }
});

function exportGoalsAsCSV(data, dateString) {
    // Prepare CSV content
    let csv = 'Goals Export\n\n';
    csv += `Date: ${currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}\n\n`;

    csv += 'GOALS\n';
    csv += 'Name,Description,Type,Target,Target Type,Frequency,Status,Current Value,Progress %,Streak Days\n';

    data.goals.forEach(goal => {
        const row = [
            `"${goal.name}"`,
            `"${goal.description || ''}"`,
            goal.goal_type,
            `"${goal.target_value} ${goal.target_unit}"`,
            goal.target_type,
            goal.frequency,
            goal.status,
            goal.current_value,
            goal.progress_percentage,
            goal.streak_days
        ];
        csv += row.join(',') + '\n';
    });

    // Use shared export utility
    exportAsCSV(`goals_${dateString}`, csv);
}

function exportGoalsAsJSON(data, dateString) {
    // Prepare export data
    const exportData = {
        exportDate: new Date().toISOString(),
        date: dateString,
        dateFormatted: currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        stats: data.stats,
        goals: data.goals.map(goal => ({
            name: goal.name,
            description: goal.description,
            type: goal.goal_type,
            target: `${goal.target_value} ${goal.target_unit}`,
            targetValue: goal.target_value,
            targetUnit: goal.target_unit,
            targetType: goal.target_type,
            frequency: goal.frequency,
            status: goal.status,
            currentValue: goal.current_value,
            progress: goal.progress_percentage,
            streak: goal.streak_days,
            createdAt: goal.created_at
        }))
    };

    // Use shared export utility
    exportAsJSON(`goals_${dateString}`, exportData);
}
