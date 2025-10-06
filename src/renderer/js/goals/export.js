// Export goals for current date
async function handleExportGoals() {
    try {
        const dateString = formatDateString(currentDate);
        const api = window.electronAPI || parent.electronAPI;
        const data = await api.getGoalsForDate(dateString);

        if (!data || !data.goals) {
            alert('No data to export');
            return;
        }

        // Create export options menu
        const exportOptions = document.createElement('div');
        exportOptions.className = 'export-menu';
        exportOptions.innerHTML = `
      <div class="export-menu-item" data-format="csv">Export as CSV</div>
      <div class="export-menu-item" data-format="json">Export as JSON</div>
    `;
        exportOptions.style.cssText = `
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 4px;
      background: #16202d;
      border: 1px solid rgba(102, 192, 244, 0.3);
      border-radius: 3px;
      min-width: 150px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      z-index: 1000;
    `;

        const exportBtn = document.getElementById('exportBtn');
        exportBtn.style.position = 'relative';
        exportBtn.appendChild(exportOptions);

        // Handle export format selection
        exportOptions.addEventListener('click', async (e) => {
            const format = e.target.dataset.format;
            if (format) {
                await performExport(format, data, dateString);
                exportOptions.remove();
            }
        });

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!exportBtn.contains(e.target)) {
                    exportOptions.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 0);
    } catch (error) {
        console.error('Error preparing export:', error);
        alert('Failed to prepare export. Please try again.');
    }
}

async function performExport(format, data, dateString) {
    try {
        // Prepare export data
        const exportData = {
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
                targetType: goal.target_type,
                frequency: goal.frequency,
                status: goal.status,
                currentValue: goal.current_value,
                progress: goal.progress_percentage,
                streak: goal.streak_days
            }))
        };

        let blob, filename;

        if (format === 'csv') {
            // Convert to CSV
            const csvRows = [];
            csvRows.push('Name,Description,Type,Target,Target Type,Frequency,Status,Current Value,Progress %,Streak Days');

            exportData.goals.forEach(goal => {
                const row = [
                    `"${goal.name}"`,
                    `"${goal.description || ''}"`,
                    goal.type,
                    `"${goal.target}"`,
                    goal.targetType,
                    goal.frequency,
                    goal.status,
                    goal.currentValue,
                    goal.progress,
                    goal.streak
                ];
                csvRows.push(row.join(','));
            });

            const csvString = csvRows.join('\n');
            blob = new Blob([csvString], { type: 'text/csv' });
            filename = `goals-${dateString}.csv`;
        } else {
            // Convert to JSON
            const jsonString = JSON.stringify(exportData, null, 2);
            blob = new Blob([jsonString], { type: 'application/json' });
            filename = `goals-${dateString}.json`;
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`Goals exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
        console.error('Error exporting goals:', error);
        alert('Failed to export goals. Please try again.');
    }
}
