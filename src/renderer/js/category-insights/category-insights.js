let categoryData = null;
let currentCategoryName = null;
let currentPeriod = 'today';

// Listen for messages from parent window
window.addEventListener('message', (event) => {
    if (event.source !== window.parent) {
        return;
    }

    if (event.data.type === 'CATEGORY_INSIGHTS') {
        // Store category name but don't load the data yet
        currentCategoryName = event.data.categoryName;
        initCategoryInsights();
    } else if (event.data.type === 'CATEGORY_DATA_RESPONSE') {
        categoryData = event.data.data;
        loadCategoryInsights();
    } else if (event.data.type === 'CATEGORIES_COMPARISON_RESPONSE') {
        updateCategoryComparison(categoryData, event.data.categories);
    } else if (event.data.type === 'CATEGORY_UPDATED') {
        // Reload the current category data after it was updated
        // Update the category name if it changed
        if (event.data.newCategoryName) {
            currentCategoryName = event.data.newCategoryName;
        }
        loadCategoryData(currentPeriod);
    }
});

// Initialize category insights
function initCategoryInsights() {
    // Setup date range controls using shared utility
    setupDateRangeControls({
        onPeriodChange: (period, startDate, endDate) => {
            currentPeriod = period;
            loadCategoryData(period, startDate, endDate);
        },
        onCustomDateChange: (startDate, endDate) => {
            currentPeriod = 'custom';
            loadCategoryData('custom', startDate, endDate);
        }
    });

    // Load default period
    loadCategoryData(currentPeriod);
}

// Load category data for the selected period
function loadCategoryData(period, customStartDate, customEndDate) {
    if (!currentCategoryName) return;

    let startDate, endDate;

    if (period === 'custom' && customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
    } else {
        const range = calculateDateRange(period);
        startDate = range.startDate;
        endDate = range.endDate;
    }

    // Calculate days for date info
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Update date info
    const dateInfo = document.querySelector('.date-info');
    if (dateInfo) {
        dateInfo.textContent = `${days} day${days !== 1 ? 's' : ''} of data available`;
    }

    // Request data from parent window
    window.parent.postMessage({
        type: 'REQUEST_CATEGORY_DATA',
        categoryName: currentCategoryName,
        startDate: startDate,
        endDate: endDate
    }, '*');
}

// Load category insights
async function loadCategoryInsights() {
    if (!categoryData) {
        console.error('No category data available');
        return;
    }

    try {
        const { category, stats } = categoryData;

        // Update hero section
        updateHeroSection(category);

        // Update quick stats
        updateQuickStats(stats);

        // Update monthly calendar
        updateMonthlyCalendar(categoryData);

        // Update top apps
        updateTopApps(categoryData.topApps || [], category.color);

        // Update daily usage chart with the filtered data
        updateDailyUsageChart(categoryData.dailyUsage || []);

        // Update pie chart with app distribution
        updateAppPieChart(categoryData.topApps || [], stats.totalTime || 0);

        // Update heatmap
        updateHeatmap(categoryData.heatmapData || []);

        // Update insights
        updateInsights(categoryData);

        // Request category comparison data
        requestCategoryComparison();
    } catch (error) {
        console.error('Error loading category insights:', error);
    }
}

function updateHeroSection(category) {
    const heroTitle = document.querySelector('.category-title');
    const heroIcon = document.querySelector('.category-icon-large');
    const heroBg = document.querySelector('.category-hero');

    if (heroTitle) {
        heroTitle.textContent = category.name;
    }

    if (heroIcon) {
        heroIcon.textContent = category.icon || '📁';
    }

    if (heroBg && category.color) {
        // Convert hex to RGB for gradient (matching app-details)
        const rgb = hexToRgb(category.color);

        if (rgb) {
            const gradient = `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8) 0%, rgba(${Math.floor(rgb.r * 0.7)}, ${Math.floor(rgb.g * 0.7)}, ${Math.floor(rgb.b * 0.7)}, 0.9) 100%)`;
            heroBg.style.background = gradient;
        }
    }

    // Setup edit button
    setupEditButton(category);
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function updateQuickStats(stats) {
    const statCards = document.querySelectorAll('.stat-card');

    if (statCards[0]) {
        statCards[0].querySelector('.stat-value').textContent = formatTime(stats.totalTime || 0);
        // Calculate weekly change
        const weeklyChange = stats.lastWeek > 0 ? Math.round(((stats.thisWeek - stats.lastWeek) / stats.lastWeek) * 100) : 0;
        const arrow = weeklyChange >= 0 ? '↑' : '↓';
        statCards[0].querySelector('.stat-subtitle').textContent = `${arrow} ${Math.abs(weeklyChange)}% from last week`;
    }

    if (statCards[1]) {
        statCards[1].querySelector('.stat-value').textContent = stats.appCount || 0;
        statCards[1].querySelector('.stat-subtitle').textContent = `${stats.appCount || 0} apps tracked`;
    }

    if (statCards[2]) {
        statCards[2].querySelector('.stat-value').textContent = formatTime(stats.avgDaily || 0);
        const activeDays = Math.round(stats.totalTime / (stats.avgDaily || 1));
        statCards[2].querySelector('.stat-subtitle').textContent = `Across ${activeDays} day${activeDays !== 1 ? 's' : ''}`;
    }

    if (statCards[3]) {
        statCards[3].querySelector('.stat-value').textContent = stats.sessionCount || 0;
        const avgSessionMin = Math.round((stats.avgSession || 0) / 60);
        statCards[3].querySelector('.stat-subtitle').textContent = `Avg. ${avgSessionMin} min`;
    }

    if (statCards[4]) {
        statCards[4].querySelector('.stat-value').textContent = formatTime(stats.avgSession || 0);
        statCards[4].querySelector('.stat-subtitle').textContent = 'Per session';
    }

    if (statCards[5]) {
        statCards[5].querySelector('.stat-value').textContent = `${(stats.usagePercentage || 0).toFixed(1)}%`;
        statCards[5].querySelector('.stat-subtitle').textContent = 'Of total time';
    }
}

// Removed chart tabs - now using analytics style single chart

function updateMonthlyCalendar(data) {
    const calendar = document.querySelector('.monthly-calendar');
    if (!calendar) return;

    const dailyData = data.dailyUsage || [];

    if (dailyData.length === 0) {
        calendar.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 20px; grid-column: 1 / -1;">No data available for the selected period</div>';
        return;
    }

    const maxDuration = Math.max(...dailyData.map(d => d.total_duration || 0), 1);

    // Get date range from inputs or default to last 30 days
    let startDate, endDate;
    const startInput = document.getElementById('start-date');
    const endInput = document.getElementById('end-date');

    if (startInput?.value && endInput?.value) {
        startDate = new Date(startInput.value);
        endDate = new Date(endInput.value);
    } else {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 29);
    }

    // Generate all dates in range
    const days = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        days.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    let html = [];

    // Add day labels
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayLabels.forEach(label => {
        html.push(`<div class="calendar-day-label">${label}</div>`);
    });

    // Add empty cells for alignment
    const firstDay = new Date(days[0]).getDay();
    for (let i = 0; i < firstDay; i++) {
        html.push('<div class="calendar-day empty"></div>');
    }

    // Add calendar days
    days.forEach(date => {
        const dayData = dailyData.find(d => d.date === date);
        const duration = dayData?.total_duration || 0;
        const intensity = duration > 0 ? 0.2 + (duration / maxDuration) * 0.8 : 0.05;
        const day = new Date(date).getDate();

        html.push(`
            <div class="calendar-day"
                 style="background: rgba(102, 192, 244, ${intensity});"
                 title="${date}: ${formatTime(duration)}">
                ${day}
            </div>
        `);
    });

    calendar.innerHTML = html.join('');

    // Update trend stats
    updateTrendStats(data.stats);
}

function updateTrendStats(stats) {
    const trendStats = document.querySelectorAll('.trend-stat');
    if (trendStats.length < 4) return;

    const thisWeek = stats.thisWeek || 0;
    const lastWeek = stats.lastWeek || 0;
    const peakDay = stats.peakDay || 0;
    const usagePercentage = stats.usagePercentage || 0;

    const weeklyChange = lastWeek > 0
        ? ((thisWeek - lastWeek) / lastWeek) * 100
        : (thisWeek > 0 ? 100 : 0);

    // This Week
    trendStats[0].querySelector('.trend-value').textContent = formatTime(thisWeek);
    const changeEl = trendStats[0].querySelector('.trend-change');
    changeEl.textContent = `${weeklyChange >= 0 ? '+' : ''}${Math.round(weeklyChange)}%`;
    changeEl.className = `trend-change ${weeklyChange >= 0 ? 'positive' : 'negative'}`;

    // Last Week
    trendStats[1].querySelector('.trend-value').textContent = formatTime(lastWeek);

    // Peak Day
    trendStats[2].querySelector('.trend-value').textContent = formatTime(peakDay);

    // All Categories
    trendStats[3].querySelector('.trend-value').textContent = `${usagePercentage.toFixed(1)}%`;
}

// Helper function to adjust color brightness
function adjustBrightness(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
}

// Request category comparison data
function requestCategoryComparison() {
    if (!categoryData) return;

    // Get current date range
    const startInput = document.getElementById('start-date');
    const endInput = document.getElementById('end-date');

    let startDate, endDate;
    if (startInput?.value && endInput?.value) {
        startDate = startInput.value;
        endDate = endInput.value;
    } else {
        const range = calculateDateRange(currentPeriod);
        startDate = range.startDate;
        endDate = range.endDate;
    }

    // Request comparison data from parent window
    window.parent.postMessage({
        type: 'REQUEST_CATEGORIES_COMPARISON',
        startDate: startDate,
        endDate: endDate
    }, '*');
}

// Setup edit button click handler
function setupEditButton(category) {
    const editBtn = document.querySelector('.btn-edit-category');
    if (!editBtn) return;

    // Remove any existing listeners
    const newBtn = editBtn.cloneNode(true);
    editBtn.parentNode.replaceChild(newBtn, editBtn);

    // Add click listener
    newBtn.addEventListener('click', () => {
        // Send message to parent window to show edit modal
        window.parent.postMessage({
            type: 'SHOW_EDIT_CATEGORY_MODAL',
            categoryName: category.name
        }, '*');
    });
}
