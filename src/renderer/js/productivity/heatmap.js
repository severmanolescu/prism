// Update productivity heatmap
function updateProductivityHeatmap(heatmapData) {
    const heatmapContainer = document.getElementById('productivityHeatmap');
    if (!heatmapContainer) return;

    if (!heatmapData || heatmapData.length === 0) {
        heatmapContainer.innerHTML = '<p style="text-align: center; color: #8f98a0; padding: 40px;">No data available for heatmap</p>';
        return;
    }

    // Process heatmap data into a 2D structure [date][hour]
    const heatmap = {};
    const dates = new Set();

    // Collect all unique dates and initialize structure
    heatmapData.forEach(entry => {
        const date = entry.date;
        dates.add(date);

        if (!heatmap[date]) {
            heatmap[date] = {};
            for (let hour = 0; hour < 24; hour++) {
                heatmap[date][hour] = {
                    productive: 0,
                    neutral: 0,
                    unproductive: 0,
                    total: 0
                };
            }
        }

        const hour = entry.hour;
        const level = entry.productivity_level;
        const time = entry.total_time;

        heatmap[date][hour][level] = time;
        heatmap[date][hour].total += time;
    });

    // Sort dates
    const sortedDates = Array.from(dates).sort();
    const dateCount = sortedDates.length;

    // Determine what to display based on date range
    let displayDates;
    let showMessage = false;

    if (dateCount <= 7) {
        // Show all days for week or less
        displayDates = sortedDates;
    } else if (dateCount <= 30) {
        // Show last 14 days for up to a month
        displayDates = sortedDates.slice(-14);
    } else {
        // For longer ranges, show last 14 days with a message
        displayDates = sortedDates.slice(-14);
        showMessage = true;
    }

    // Generate HTML
    let html = '';

    // Show message if we're limiting the display
    if (showMessage) {
        html += `<div style="text-align: center; color: #8f98a0; font-size: 12px; margin-bottom: 12px; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 3px;">
      Showing last 14 days of ${dateCount} total days. Select a shorter date range for full heatmap view.
    </div>`;
    } else if (dateCount > 7 && dateCount <= 30) {
        html += `<div style="text-align: center; color: #8f98a0; font-size: 12px; margin-bottom: 12px; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 3px;">
      Showing last 14 of ${dateCount} days
    </div>`;
    }

    html += '<div class="heatmap-time-labels">';
    for (let h = 0; h < 24; h += 3) {
        const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const period = h < 12 ? 'AM' : 'PM';
        html += `<div class="time-label">${hour} ${period}</div>`;
    }
    html += '</div><div class="heatmap-rows">';

    // Generate rows for each date
    displayDates.forEach(date => {
        const dateObj = new Date(date);
        const dayLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        html += `<div class="heatmap-row">`;
        html += `<div class="day-label">${dayLabel}</div>`;
        html += `<div class="heatmap-cells">`;

        for (let hour = 0; hour < 24; hour++) {
            const cell = heatmap[date][hour];
            const totalMinutes = Math.round(cell.total / (1000 * 60));

            // Determine dominant productivity level (only if there's time)
            let productivityAttr = '';
            if (totalMinutes > 0) {
                let productivityLevel = 'neutral';
                if (cell.productive > cell.neutral && cell.productive > cell.unproductive) {
                    productivityLevel = 'productive';
                } else if (cell.unproductive > cell.neutral && cell.unproductive > cell.productive) {
                    productivityLevel = 'unproductive';
                }
                productivityAttr = `data-productivity="${productivityLevel}"`;
            }

            // Format time for tooltip
            const hours = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            let timeStr = totalMinutes === 0 ? '0m' : '';
            if (hours > 0) {
                timeStr = `${hours}h ${mins}m`;
            } else if (mins > 0) {
                timeStr = `${mins}m`;
            }

            const hourDisplay = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;

            html += `<div class="heatmap-cell" ${productivityAttr} data-intensity="${totalMinutes > 0 ? 'active' : 'inactive'}" title="${dayLabel} ${hourDisplay} - ${timeStr}"></div>`;
        }

        html += `</div></div>`;
    });

    html += '</div>';

    // Add legend
    html += `
    <div class="heatmap-legend">
      <div class="legend-item">
        <div class="legend-box productive"></div>
        <span>Productive</span>
      </div>
      <div class="legend-item">
        <div class="legend-box neutral"></div>
        <span>Neutral</span>
      </div>
      <div class="legend-item">
        <div class="legend-box unproductive"></div>
        <span>Unproductive</span>
      </div>
      <div class="legend-item">
        <div class="legend-box" style="background: rgba(255, 255, 255, 0.05);"></div>
        <span>No Activity</span>
      </div>
    </div>
  `;

    heatmapContainer.innerHTML = html;
}
