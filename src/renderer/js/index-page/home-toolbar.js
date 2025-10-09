/**
 * Home View Toolbar
 * Handles search, filters, and view options
 */

// Wrap in IIFE to avoid global variable conflicts
(function() {
    let currentProductivityFilter = 'all';
    let currentGridSize = localStorage.getItem('grid-size') || 'normal';
    let categoriesCache = null;

    // Load categories for productivity lookups
    async function loadCategories() {
        if (!categoriesCache) {
            categoriesCache = await window.electronAPI.getCategories();
        }
        return categoriesCache;
    }

    // Initialize toolbar
    function initializeHomeToolbar() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const gridSizeSelect = document.getElementById('grid-size');

        // Load categories on init
        loadCategories();

        // Filter buttons
        filterButtons.forEach(btn => {
            btn.addEventListener('click', async () => {
                // Update active state
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                currentProductivityFilter = btn.dataset.filter;
                await applyFilters();
            });
        });

        // Grid size select
        if (gridSizeSelect) {
            // Set the select value to match current preference
            gridSizeSelect.value = currentGridSize;

            gridSizeSelect.addEventListener('change', (e) => {
                currentGridSize = e.target.value;
                localStorage.setItem('grid-size', currentGridSize);
                applyGridSize();
            });
        }

        // Apply saved preferences
        applyGridSize();
    }

    // Apply filters
    async function applyFilters() {
        const allSections = document.querySelectorAll('.category-section');
        let visibleAppCount = 0;

        // Ensure categories are loaded
        const categories = await loadCategories();

        allSections.forEach(section => {
            const categoryGrid = section.querySelector('.category-apps-grid');
            if (!categoryGrid) return;

            // Get category name from section - extract icon emoji first
            const categoryTitle = section.querySelector('.category-title h3');
            const categoryFullText = categoryTitle?.textContent || '';
            // Remove the app count part (everything after and including the opening parenthesis)
            const categoryNameMatch = categoryFullText.match(/^([^(]+)/);
            const categoryName = categoryNameMatch ? categoryNameMatch[1].trim() : '';

            // Get category's default productivity level
            const category = categories.find(c => c.name === categoryName);
            const categoryProductivityLevel = category?.productivity_level || 'neutral';

            const appItems = categoryGrid.querySelectorAll('.app-item');
            let visibleInCategory = 0;

            appItems.forEach(appItem => {
                // Get productivity level from app data
                let productivityLevel = categoryProductivityLevel; // Default to category level
                const appId = appItem.dataset.appId;

                if (appId && window.allAppsCache) {
                    const app = window.allAppsCache.find(a => a.id === appId);
                    if (app) {
                        // If app has override, use it; otherwise use category default
                        if (app.productivity_level_override !== null && app.productivity_level_override !== undefined) {
                            productivityLevel = app.productivity_level_override;
                        }
                    }
                }

                // Productivity filter
                const matchesProductivity = currentProductivityFilter === 'all' || productivityLevel === currentProductivityFilter;

                // Show/hide app
                if (matchesProductivity) {
                    appItem.style.display = '';
                    visibleInCategory++;
                    visibleAppCount++;
                } else {
                    appItem.style.display = 'none';
                }
            });

            // Show/hide entire category section if no visible apps
            if (visibleInCategory === 0) {
                section.style.display = 'none';
            } else {
                section.style.display = 'block';
            }
        });

        // Show message if no results
        showNoResultsMessage(visibleAppCount);
    }

    // Show "no results" message
    function showNoResultsMessage(count) {
        const appsContainer = document.querySelector('.apps-grid');
        if (!appsContainer) return;

        // Remove existing message
        const existingMessage = document.getElementById('no-results-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Show message if no results and filters are active
        if (count === 0 && currentProductivityFilter !== 'all') {
            const message = document.createElement('div');
            message.id = 'no-results-message';
            message.className = 'no-results-message';
            message.innerHTML = `
                <div class="no-results-icon">🔍</div>
                <div class="no-results-text">No apps found</div>
                <div class="no-results-subtext">Try adjusting your filter</div>
            `;
            appsContainer.appendChild(message);
        }
    }


    // Apply grid size
    function applyGridSize() {
    const appsGrid = document.querySelector('.apps-grid');
    const categoryGrids = document.querySelectorAll('.category-apps-grid');
    const recentGames = document.querySelector('.recent-games');

    // Remove all size classes
    [appsGrid, recentGames, ...categoryGrids].forEach(grid => {
        if (grid) {
            grid.classList.remove('size-compact', 'size-normal', 'size-large');
                grid.classList.add(`size-${currentGridSize}`);
            }
        });

        // Reset max-height to 'none' for expanded grids to allow proper sizing
        requestAnimationFrame(() => {
            categoryGrids.forEach(grid => {
                if (grid && !grid.closest('.category-section')?.classList.contains('collapsed')) {
                    grid.style.maxHeight = 'none';
                }
            });
        });
    }

    // Show/hide toolbar based on current view
    function updateToolbarVisibility() {
    const toolbar = document.querySelector('.home-toolbar');
    const categoryOverview = document.querySelector('.category-overview');
    const detailsIframe = document.querySelector('.app-details-iframe-wrapper');

    if (!toolbar) return;

    // Hide toolbar when viewing collections or app details
    const isCollectionsView = categoryOverview && categoryOverview.style.display !== 'none';
    const isDetailsView = detailsIframe && detailsIframe.style.display !== 'none';

    if (isCollectionsView || isDetailsView) {
        toolbar.style.display = 'none';
        } else {
            toolbar.style.display = 'flex';
        }
    }

    // Reset filters
    function resetFilters() {
        currentProductivityFilter = 'all';

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const allFilterBtn = document.getElementById('filter-all');
        if (allFilterBtn) allFilterBtn.classList.add('active');

        applyFilters();
    }

    // Re-apply filters after data changes
    function reapplyFilters() {
        if (currentProductivityFilter !== 'all') {
            applyFilters();
        }
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        initializeHomeToolbar();
    });

    // Expose functions to global scope if needed
    window.homeToolbar = {
        reapplyFilters,
        resetFilters,
        updateToolbarVisibility,
        applyGridSize,
        getCurrentGridSize: () => currentGridSize
    };
})();
