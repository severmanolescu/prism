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

        // Update category comparison
        updateCategoryComparison(categoryData);
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
    const statValues = document.querySelectorAll('.quick-stat-value');

    if (statValues[0]) statValues[0].textContent = formatTime(stats.totalTime || 0);
    if (statValues[1]) statValues[1].textContent = stats.appCount || 0;
    if (statValues[2]) statValues[2].textContent = formatTime(stats.avgDaily || 0);
    if (statValues[3]) statValues[3].textContent = stats.sessionCount || 0;
    if (statValues[4]) statValues[4].textContent = formatTime(stats.avgSession || 0);
    if (statValues[5]) statValues[5].textContent = `${(stats.usagePercentage || 0).toFixed(1)}%`;
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
