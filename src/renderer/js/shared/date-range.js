/**
 * Shared Date Range Utilities
 * Used by Analytics, Productivity, and Goals pages
 */

/**
 * Calculate date range based on period
 * @param {string} period - 'today', 'week', 'month', 'year', 'alltime'
 * @returns {{startDate: string, endDate: string}} Date range in YYYY-MM-DD format
 */
function calculateDateRange(period) {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'today':
      startDate = endDate = formatDateForInput(now);
      break;
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 6);
      startDate = formatDateForInput(weekAgo);
      endDate = formatDateForInput(now);
      break;
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      startDate = formatDateForInput(monthAgo);
      endDate = formatDateForInput(now);
      break;
    case 'year':
      const yearAgo = new Date(now);
      yearAgo.setFullYear(now.getFullYear() - 1);
      startDate = formatDateForInput(yearAgo);
      endDate = formatDateForInput(now);
      break;
    case 'alltime':
      // Set to earliest possible date
      startDate = '2020-01-01';
      endDate = formatDateForInput(now);
      break;
    default:
      startDate = endDate = formatDateForInput(now);
  }

  return { startDate, endDate };
}

/**
 * Setup date range controls - tabs and custom date picker
 * @param {Object} options Configuration options
 * @param {string} options.tabSelector - CSS selector for tab buttons
 * @param {string} options.dateInputSelector - CSS selector for date inputs
 * @param {Function} options.onPeriodChange - Callback when period changes
 * @param {Function} options.onCustomDateChange - Callback when custom dates change
 * @param {Array<string>} options.periods - Array of period names (defaults to ['today', 'week', 'month', 'year', 'alltime'])
 */
function setupDateRangeControls(options) {
  const {
    tabSelector = '.time-range-btn',
    dateInputSelector = '.custom-date-picker input[type="date"]',
    onPeriodChange,
    onCustomDateChange,
    periods = ['today', 'week', 'month', 'year', 'alltime']
  } = options;

  const tabs = document.querySelectorAll(tabSelector);
  const dateInputs = document.querySelectorAll(dateInputSelector);

  // Setup period tabs
  tabs.forEach((tab, index) => {
    // Set data-period based on position or existing attribute
    if (!tab.dataset.period && periods[index]) {
      tab.dataset.period = periods[index];
    }

    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      // Add active class to clicked tab
      tab.classList.add('active');

      const period = tab.dataset.period;

      // Update custom date inputs to match period
      const range = calculateDateRange(period);
      if (dateInputs[0]) dateInputs[0].value = range.startDate;
      if (dateInputs[1]) dateInputs[1].value = range.endDate;

      // Call callback
      if (onPeriodChange) {
        onPeriodChange(period, range.startDate, range.endDate);
      }
    });
  });

  // Setup custom date picker
  dateInputs.forEach(input => {
    input.addEventListener('change', () => {
      // When custom dates are changed, deactivate all tab buttons
      tabs.forEach(t => t.classList.remove('active'));

      // Get custom date range
      const startDate = dateInputs[0]?.value;
      const endDate = dateInputs[1]?.value;

      if (startDate && endDate) {
        // Call callback
        if (onCustomDateChange) {
          onCustomDateChange(startDate, endDate);
        }
      }
    });
  });

  // Initialize with active tab's period
  const activeTab = document.querySelector(`${tabSelector}.active`);
  if (activeTab && activeTab.dataset.period) {
    const range = calculateDateRange(activeTab.dataset.period);
    if (dateInputs[0]) dateInputs[0].value = range.startDate;
    if (dateInputs[1]) dateInputs[1].value = range.endDate;
  }
}
