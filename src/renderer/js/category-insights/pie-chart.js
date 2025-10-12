// Update app distribution pie chart
function updateAppPieChart(topApps, totalTime) {
    if (!topApps || topApps.length === 0 || totalTime === 0) {
        // Show empty state
        const pieChartContainer = document.querySelector('.pie-chart');
        if (pieChartContainer) {
            pieChartContainer.innerHTML = '<p style="text-align: center; color: #8f98a0; padding: 40px;">No app data available</p>';
        }
        return;
    }

    // Default color for others
    const defaultColor = '#95a5a6';

    // Calculate percentages
    const appsWithPercentage = topApps.map(app => ({
        ...app,
        percentage: Math.round((app.totalTime / totalTime) * 100)
    })).filter(app => app.percentage > 0); // Only show apps with >0%

    // Limit to top 4 apps, combine rest as "Others"
    let apps = appsWithPercentage.slice(0, 4);
    if (appsWithPercentage.length > 4) {
        const otherTime = appsWithPercentage.slice(4).reduce((sum, app) => sum + app.totalTime, 0);
        const otherPercentage = Math.round((otherTime / totalTime) * 100);
        if (otherPercentage > 0) {
            apps.push({
                name: 'Others',
                totalTime: otherTime,
                percentage: otherPercentage
            });
        }
    }

    // Fix rounding errors - adjust the largest app to make total = 100%
    const totalPercentage = apps.reduce((sum, app) => sum + app.percentage, 0);
    if (totalPercentage !== 100 && apps.length > 0) {
        const diff = 100 - totalPercentage;
        // Find the largest app and adjust it
        const largestApp = apps.reduce((max, app) => app.percentage > max.percentage ? app : max);
        largestApp.percentage += diff;
    }

    // Generate colors for apps
    const colors = ['#66c0f4', '#f39c12', '#e74c3c', '#9b59b6', '#95a5a6'];
    apps.forEach((app, index) => {
        app.color = colors[index] || defaultColor;
    });

    // Calculate SVG circle parameters
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;

    // Generate SVG circles
    const svgCircles = apps.map((app, index) => {
        const dashLength = (app.percentage / 100) * circumference;
        const circle = `<circle class="pie-slice" data-app="${app.name}" data-percentage="${app.percentage}" cx="100" cy="100" r="${radius}" fill="none" stroke="${app.color}" stroke-width="40" stroke-dasharray="${dashLength} ${circumference}" stroke-dashoffset="-${currentOffset}" transform="rotate(-90 100 100)" style="cursor: pointer; transition: stroke-width 0.2s;"/>`;
        currentOffset += dashLength;
        return circle;
    }).join('\n          ');

    // Generate legend items
    const legendItems = apps.map(app => {
        return `
          <div class="legend-item">
            <span class="legend-color" style="background: ${app.color};"></span>
            <span class="legend-text">${escapeHtml(app.name)} (${app.percentage}%)</span>
          </div>`;
    }).join('');

    // Update the pie chart HTML
    const pieChartContainer = document.querySelector('.pie-chart');
    if (pieChartContainer) {
        pieChartContainer.innerHTML = `
        <svg viewBox="-10 -10 220 220" style="width: 100%; max-width: 200px; margin: 0 auto; display: block; overflow: visible;">
          ${svgCircles}
        </svg>
        <div id="pie-tooltip" class="pie-tooltip" style="display: none;">
          <div class="pie-tooltip-text"></div>
        </div>
        <div class="pie-legend">
          ${legendItems}
        </div>`;

        // Re-setup tooltips after updating the DOM
        setupAppPieChartTooltips();
    }
}

// Setup pie chart tooltips
function setupAppPieChartTooltips() {
    const pieSlices = document.querySelectorAll('.pie-slice');
    const tooltip = document.getElementById('pie-tooltip');
    if (!tooltip) return;

    const tooltipText = tooltip.querySelector('.pie-tooltip-text');
    const pieChart = document.querySelector('.pie-chart');

    pieSlices.forEach(slice => {
        slice.addEventListener('mouseenter', (e) => {
            const appName = slice.dataset.app;
            const percentage = slice.dataset.percentage;
            tooltipText.textContent = `${appName}: ${percentage}%`;
            tooltip.style.display = 'block';
        });

        slice.addEventListener('mousemove', (e) => {
            const rect = pieChart.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            tooltip.style.left = x + 'px';
            tooltip.style.top = (y - 40) + 'px';
        });

        slice.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });
}
