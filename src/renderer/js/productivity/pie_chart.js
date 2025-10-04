// Update category pie chart
function updateCategoryPieChart(categoryBreakdown, totalTime) {
    if (!categoryBreakdown || categoryBreakdown.length === 0 || totalTime === 0) {
        // Show empty state
        const pieChartContainer = document.querySelector('.pie-chart');
        if (pieChartContainer) {
            pieChartContainer.innerHTML = '<p style="text-align: center; color: #8f98a0; padding: 40px;">No category data available</p>';
        }
        return;
    }

    // Default colors
    const defaultColor = '#95a5a6';
    const uncategorizedColor = '#1a5699';

    // Calculate percentages
    const categoriesWithPercentage = categoryBreakdown.map(cat => ({
        ...cat,
        percentage: Math.round((cat.total_time / totalTime) * 100),
        color: cat.color || (cat.category === 'Uncategorized' ? uncategorizedColor : defaultColor)
    })).filter(cat => cat.percentage > 0); // Only show categories with >0%

    // Limit to top 4 categories, combine rest as "Others"
    let categories = categoriesWithPercentage.slice(0, 4);
    if (categoriesWithPercentage.length > 4) {
        const otherTime = categoriesWithPercentage.slice(4).reduce((sum, cat) => sum + cat.total_time, 0);
        const otherPercentage = Math.round((otherTime / totalTime) * 100);
        if (otherPercentage > 0) {
            categories.push({
                category: 'Others',
                total_time: otherTime,
                percentage: otherPercentage,
                color: defaultColor
            });
        }
    }

    // Fix rounding errors - adjust the largest category to make total = 100%
    const totalPercentage = categories.reduce((sum, cat) => sum + cat.percentage, 0);
    if (totalPercentage !== 100 && categories.length > 0) {
        const diff = 100 - totalPercentage;
        // Find the largest category and adjust it
        const largestCat = categories.reduce((max, cat) => cat.percentage > max.percentage ? cat : max);
        largestCat.percentage += diff;
    }

    // Calculate SVG circle parameters
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;

    // Generate SVG circles
    const svgCircles = categories.map((cat, index) => {
        const dashLength = (cat.percentage / 100) * circumference;
        const circle = `<circle class="pie-slice" data-category="${cat.category}" data-percentage="${cat.percentage}" cx="100" cy="100" r="${radius}" fill="none" stroke="${cat.color}" stroke-width="40" stroke-dasharray="${dashLength} ${circumference}" stroke-dashoffset="-${currentOffset}" transform="rotate(-90 100 100)" style="cursor: pointer; transition: stroke-width 0.2s;"/>`;
        currentOffset += dashLength;
        return circle;
    }).join('\n          ');

    // Generate legend items
    const legendItems = categories.map(cat => {
        return `
          <div class="legend-item">
            <span class="legend-color" style="background: ${cat.color};"></span>
            <span class="legend-text">${cat.category} (${cat.percentage}%)</span>
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
        setupPieChartTooltips();
    }
}

// Setup pie chart tooltips
function setupPieChartTooltips() {
    const pieSlices = document.querySelectorAll('.pie-slice');
    const tooltip = document.getElementById('pie-tooltip');
    const tooltipText = tooltip.querySelector('.pie-tooltip-text');
    const pieChart = document.querySelector('.pie-chart');

    pieSlices.forEach(slice => {
        slice.addEventListener('mouseenter', (e) => {
            const category = slice.dataset.category;
            const percentage = slice.dataset.percentage;
            tooltipText.textContent = `${category}: ${percentage}%`;
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
