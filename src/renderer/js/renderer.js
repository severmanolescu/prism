// Steam Time Tracker - Frontend Logic

let currentCategory = 'All Apps';
let allAppsCache = []; // Cache all apps for filtering
let currentSearchTerm = ''; // Track current search term
let favoritesCache = [];

// Expose currentCategory on window so other modules can access it
window.currentCategory = currentCategory;

document.addEventListener('DOMContentLoaded', () => {
    // Window control handlers
    setupWindowControls();
    
    // Set up real-time updates
    setupRealTimeUpdates();
    
    // Load app data initially
    setTimeout(() => {
        loadAppData();
    }, 1000);
    
    // Handle library navigation - Updated to use event delegation
    document.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item:not(.category)');
        if (navItem) {
            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            navItem.classList.add('active');
            
            // Update content based on selection
            const libraryName = navItem.textContent.trim();
            
            // Check if it's a specific app or category
            const appId = navItem.dataset.appId;
            if (appId) {
                // Individual app selected
                showAppDetails(libraryName);
            } else {
                // Category selected
                currentCategory = libraryName;
                window.currentCategory = currentCategory; // Keep window in sync
                loadAppsByCategory(currentCategory);
                updateLibraryTitle(libraryName);
            }
        }
    });

    // Handle category section clicks
    document.addEventListener('click', (e) => {
        // Handle category section toggle button clicks (in home view)
        if (e.target.closest('.category-section-toggle')) {
            e.preventDefault();
            e.stopPropagation();

            const toggleButton = e.target.closest('.category-section-toggle');
            const categorySection = toggleButton.closest('.category-section');
            const categoryGrid = categorySection.querySelector('.category-apps-grid');

            // Get category name
            const categoryTitle = categorySection.querySelector('.category-title h3');
            const categoryFullText = categoryTitle?.textContent || '';
            const categoryNameMatch = categoryFullText.match(/^([^(]+)/);
            const categoryName = categoryNameMatch ? categoryNameMatch[1].trim() : '';

            // Toggle the collapsed state
            const isCollapsed = categorySection.classList.contains('collapsed');

            if (isCollapsed) {
                // Expand
                categorySection.classList.remove('collapsed');
                categoryGrid.style.maxHeight = categoryGrid.scrollHeight + 'px';
                toggleButton.classList.remove('collapsed');

                // Save to localStorage
                const collapsedSections = JSON.parse(localStorage.getItem('collapsed-home-sections') || '[]');
                const index = collapsedSections.indexOf(categoryName);
                if (index > -1) {
                    collapsedSections.splice(index, 1);
                    localStorage.setItem('collapsed-home-sections', JSON.stringify(collapsedSections));
                }
            } else {
                // Collapse
                categorySection.classList.add('collapsed');
                categoryGrid.style.maxHeight = '0';
                toggleButton.classList.add('collapsed');

                // Save to localStorage
                const collapsedSections = JSON.parse(localStorage.getItem('collapsed-home-sections') || '[]');
                if (!collapsedSections.includes(categoryName)) {
                    collapsedSections.push(categoryName);
                    localStorage.setItem('collapsed-home-sections', JSON.stringify(collapsedSections));
                }
            }

            return;
        }

        // Handle category toggle button clicks (in left nav)
        if (e.target.closest('.category-toggle')) {
            e.preventDefault();
            e.stopPropagation();

            const toggleButton = e.target.closest('.category-toggle');
            const navSection = toggleButton.closest('.nav-section');
            const subitemsContainer = navSection.querySelector('.nav-subitems');

            // Get category name
            const categoryName = subitemsContainer.dataset.category;

            // Toggle the collapsed state
            const isCollapsed = navSection.classList.contains('collapsed');

            if (isCollapsed) {
                // Expand
                navSection.classList.remove('collapsed');
                subitemsContainer.style.maxHeight = subitemsContainer.scrollHeight + 'px';
                toggleButton.classList.remove('collapsed');

                // Save to localStorage
                const collapsedNav = JSON.parse(localStorage.getItem('collapsed-nav-sections') || '[]');
                const index = collapsedNav.indexOf(categoryName);
                if (index > -1) {
                    collapsedNav.splice(index, 1);
                    localStorage.setItem('collapsed-nav-sections', JSON.stringify(collapsedNav));
                }
            } else {
                // Collapse
                navSection.classList.add('collapsed');
                subitemsContainer.style.maxHeight = '0';
                toggleButton.classList.add('collapsed');

                // Save to localStorage
                const collapsedNav = JSON.parse(localStorage.getItem('collapsed-nav-sections') || '[]');
                if (!collapsedNav.includes(categoryName)) {
                    collapsedNav.push(categoryName);
                    localStorage.setItem('collapsed-nav-sections', JSON.stringify(collapsedNav));
                }
            }

            return;
        }
        
        // Handle category header clicks (but not the toggle button)
        const categoryItem = e.target.closest('.nav-item.category');
        if (categoryItem && !e.target.closest('.category-toggle')) {
            e.preventDefault();
            e.stopPropagation();
            
            // Get category name from the span element (not including count)
            const categorySpans = categoryItem.querySelectorAll('span');
            const categoryName = categorySpans[1] ? categorySpans[1].textContent.trim() : 
                                categorySpans[0].textContent.trim();
            
            currentCategory = categoryName;
            window.currentCategory = currentCategory; // Keep window in sync

            // Handle Favorites category specially
            if (categoryName === 'Favorites') {
                loadFavoriteApps();
            } else {
                loadAppsByCategory(categoryName);
            }
            
            updateLibraryTitle(categoryName);
            
            // Remove active from all and add to category
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            categoryItem.classList.add('active');
        }
    });

    document.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-toggle-btn');
        if (viewBtn) {
            const view = viewBtn.dataset.view;
            toggleView(view);
            
            // Update active state
            document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));
            viewBtn.classList.add('active');
            
            // Update submenu state based on view
            document.querySelectorAll('.library-submenu-item').forEach(item => item.classList.remove('active'));
            
            if (view === 'categories') {
                // If switching to categories view, activate Collections in submenu
                const collectionsSubmenu = document.querySelector('.library-submenu-item[data-submenu="collections"]');
                if (collectionsSubmenu) {
                    collectionsSubmenu.classList.add('active');
                }
            } else {
                // If switching to grid/list view, activate Home in submenu
                const homeSubmenu = document.querySelector('.library-submenu-item[data-submenu="home"]');
                if (homeSubmenu) {
                    homeSubmenu.classList.add('active');
                }
            }
        }

        // Handle library submenu clicks
        const submenuItem = e.target.closest('.library-submenu-item');
        if (submenuItem) {
            const submenuType = submenuItem.dataset.submenu;
            
            // Update active state in submenu
            document.querySelectorAll('.library-submenu-item').forEach(item => item.classList.remove('active'));
            submenuItem.classList.add('active');
            
            // Handle navigation
            switch(submenuType) {
                case 'home':
                    showHomeView();
                    break;
                case 'collections':
                    showCollectionsView();
                    break;
                case 'hidden':
                    showHiddenView();
                    break;
            }
        }
    });

    const homeButton = document.getElementById("home");

    homeButton.addEventListener('click', (e) => {
        showHomeView();
    });

    // Handle Library tab click to show home view
    const libraryTab = document.querySelector('.nav-tab.library-tab');
    if (libraryTab) {
        libraryTab.addEventListener('click', (e) => {
            // Only trigger if clicking the tab itself, not the submenu
            if (!e.target.closest('.library-submenu-item')) {
                showHomeView();
            }
        });
    }
    
    // Handle search input
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim().toLowerCase();
            filterNavigation(searchTerm);
        });

        // Handle search navigation with arrow keys
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (e.target.value.trim() === '') {
                    // If empty, unfocus the search input
                    e.target.blur();
                } else {
                    // If has text, clear it
                    e.target.value = '';
                    filterNavigation('');
                }
                return;
            }

            // Arrow key navigation through visible nav items
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();

                // Get all visible nav items (not categories, not hidden)
                const visibleItems = Array.from(document.querySelectorAll('.nav-subitems .nav-item'))
                    .filter(item => {
                        const parent = item.closest('.nav-section');
                        return item.offsetParent !== null && // is visible
                               parent && !parent.classList.contains('collapsed'); // parent not collapsed
                    });

                if (visibleItems.length === 0) return;

                // Find currently active item
                const currentActive = visibleItems.findIndex(item => item.classList.contains('active'));
                let nextIndex;

                if (e.key === 'ArrowDown') {
                    // Move down (or select first if none active)
                    nextIndex = currentActive === -1 ? 0 : Math.min(currentActive + 1, visibleItems.length - 1);
                } else {
                    // Move up
                    nextIndex = currentActive === -1 ? 0 : Math.max(currentActive - 1, 0);
                }

                // Remove active from all and add to selected
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                visibleItems[nextIndex].classList.add('active');

                // Scroll into view
                visibleItems[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // Enter key to open selected app
            if (e.key === 'Enter') {
                e.preventDefault();
                const activeItem = document.querySelector('.nav-subitems .nav-item.active');
                if (activeItem) {
                    const appName = activeItem.dataset.appName;
                    if (appName) {
                        showAppDetails(appName);
                        // Blur search input
                        searchInput.blur();
                    }
                }
            }
        });
    }
    document.addEventListener('click', (e) => {
        const appCard = e.target.closest('.app-item, .recent-item');
        if (appCard && !e.target.closest('.nav-item')) { // Avoid conflicts with nav items
            const appName = appCard.querySelector('.app-item-name, .recent-item-name')?.textContent;
            if (appName) {
                showAppDetails(appName);
            }
        }
    });

    const analyticsButton = document.getElementById("analytics");

    if (analyticsButton) {
        analyticsButton.addEventListener('click', (e) => {
            showAnalyticsView();
        });
    }

    const pruducivityButton = document.getElementById("productivity");

    if (pruducivityButton) {
        pruducivityButton.addEventListener('click', (e) => {
            showProductivityView();
        });
    }

    const goalsButton = document.getElementById("goals");

    if (goalsButton) {
        goalsButton.addEventListener('click', (e) => {
            showGoalsView();
        });
    }

    // Keyboard shortcuts for top navigation
    document.addEventListener('keydown', (e) => {
        // Skip if typing in input/textarea (except for special keys)
        const isInputField = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';

        // Check if Ctrl (or Cmd on Mac) is pressed
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case '1':
                    e.preventDefault();
                    showHomeView();
                    break;
                case '2':
                    e.preventDefault();
                    showAnalyticsView();
                    break;
                case '3':
                    e.preventDefault();
                    showProductivityView();
                    break;
                case '4':
                    e.preventDefault();
                    showGoalsView();
                    break;
                case '5':
                    e.preventDefault();
                    // Settings tab
                    const settingsTab = document.querySelector('.nav-tab[data-tab="settings"]');
                    if (settingsTab) settingsTab.click();
                    break;
                case 'f':
                    e.preventDefault();
                    // Focus search input
                    const searchInput = document.querySelector('.search-input');
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.select();
                    }
                    break;
                case 'c':
                    e.preventDefault();
                    showCollectionsView();
                    break;
                case 'h':
                    e.preventDefault();
                    showHomeView();
                    break;
            }
            return;
        }

        // Non-modifier key shortcuts (skip if in input field)
        if (isInputField && e.key !== '/') return;

        switch(e.key) {
            case 'G':
                // Shift+G - Jump to bottom
                if (e.shiftKey) {
                    e.preventDefault();
                    const scrollContainer = document.querySelector('.library-nav') ||
                                          document.querySelector('.main-content') ||
                                          document.querySelector('.content-area');
                    if (scrollContainer) {
                        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
                    }
                }
                break;
            case 'g':
                // g - Jump to top
                e.preventDefault();
                const scrollContainer = document.querySelector('.library-nav') ||
                                      document.querySelector('.main-content') ||
                                      document.querySelector('.content-area');
                if (scrollContainer) {
                    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                }
                break;
            case '/':
                // / - Focus search
                if (!isInputField) {
                    e.preventDefault();
                    const searchInput = document.querySelector('.search-input');
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.select();
                    }
                }
                break;
            case 'x':
            case 'X':
                // X - Expand/collapse all categories
                if (!isInputField) {
                    e.preventDefault();
                    const navSections = document.querySelectorAll('.nav-section');
                    const allCollapsed = Array.from(navSections).every(section =>
                        section.classList.contains('collapsed')
                    );

                    navSections.forEach(section => {
                        const subitemsContainer = section.querySelector('.nav-subitems');
                        const toggleButton = section.querySelector('.category-toggle');

                        if (allCollapsed) {
                            // Expand all
                            section.classList.remove('collapsed');
                            if (subitemsContainer) {
                                subitemsContainer.style.maxHeight = subitemsContainer.scrollHeight + 'px';
                            }
                            if (toggleButton) {
                                toggleButton.classList.remove('collapsed');
                            }
                        } else {
                            // Collapse all
                            section.classList.add('collapsed');
                            if (subitemsContainer) {
                                subitemsContainer.style.maxHeight = '0';
                            }
                            if (toggleButton) {
                                toggleButton.classList.add('collapsed');
                            }
                        }
                    });
                }
                break;
        }
    });

    // Initialize the app
    console.log('Steam Time Tracker initialized!');
    displayCurrentTime();

    // Update time every second
    setInterval(displayCurrentTime, 1000);

    window.contextMenu = new ContextMenu();

    window.collectionContextMenu = new CollectionContextMenu();

    // Handle analytics and productivity data requests from iframes
    window.addEventListener('message', async (event) => {
        // Handle keyboard shortcuts from iframes
        if (event.data.type === 'KEYBOARD_SHORTCUT') {
            const key = event.data.key;
            switch(key) {
                case '1':
                    showHomeView();
                    break;
                case '2':
                    showAnalyticsView();
                    break;
                case '3':
                    showProductivityView();
                    break;
                case '4':
                    showGoalsView();
                    break;
                case '5':
                    const settingsTab = document.querySelector('.nav-tab[data-tab="settings"]');
                    if (settingsTab) settingsTab.click();
                    break;
                case 'f':
                    const searchInput = document.querySelector('.search-input');
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.select();
                    }
                    break;
                case 'c':
                    const collectionBtn = document.querySelector('.library-submenu-item[data-submenu="collections"');
                    if(collectionBtn){
                        showCollectionsView();
                    }
                    break;
                case 'h':
                    const homeBtn = document.querySelector('.library-submenu-item[data-submenu="home"');
                    if (homeBtn) {
                        showHomeView();
                    }
                    break;
            }
            return;
        }

        // Verify message comes from our analytics or productivity iframe
        const analyticsIframe = document.querySelector('.analytics-iframe-wrapper iframe');
        const productivityIframe = document.querySelector('.productivity-iframe-wrapper iframe');

        const isAnalyticsSource = analyticsIframe && event.source === analyticsIframe.contentWindow;
        const isProductivitySource = productivityIframe && event.source === productivityIframe.contentWindow;

        if (!isAnalyticsSource && !isProductivitySource) {
            return;
        }

        if (event.data.type === 'REQUEST_PRODUCTIVITY_DATA') {
            const { startDate, endDate } = event.data;

            try {
                // Fetch productivity data (placeholder - you'll need to implement this)
                const data = await window.electronAPI.getProductivityStats(startDate, endDate);

                // Send response back to productivity iframe
                if (productivityIframe && productivityIframe.contentWindow) {
                    productivityIframe.contentWindow.postMessage({
                        type: 'PRODUCTIVITY_DATA_RESPONSE',
                        data: data
                    }, '*');
                }
            } catch (error) {
                console.error('Error fetching productivity data:', error);
            }
        } else if (event.data.type === 'REQUEST_ANALYTICS_DATA') {
            const { startDate, endDate } = event.data;

            try {
                // Fetch analytics data
                const data = await window.electronAPI.getAnalyticsData(startDate, endDate);

                // Send response back to iframe
                const analyticsIframe = document.querySelector('.analytics-iframe-wrapper iframe');
                if (analyticsIframe && analyticsIframe.contentWindow) {
                    analyticsIframe.contentWindow.postMessage({
                        type: 'ANALYTICS_DATA_RESPONSE',
                        data: data
                    }, '*');
                }
            } catch (error) {
                console.error('Error fetching analytics data:', error);
            }
        } else if (event.data.type === 'REQUEST_HEATMAP_DATA') {
            const { startDate, endDate } = event.data;

            try {
                // Fetch hourly app breakdown data
                const heatmapData = await window.electronAPI.getHourlyAppBreakdown(startDate, endDate);

                // Send response back to iframe
                const analyticsIframe = document.querySelector('.analytics-iframe-wrapper iframe');
                if (analyticsIframe && analyticsIframe.contentWindow) {
                    analyticsIframe.contentWindow.postMessage({
                        type: 'HEATMAP_DATA_RESPONSE',
                        data: heatmapData
                    }, '*');
                }
            } catch (error) {
                console.error('Error fetching heatmap data:', error);
            }
        } else if (event.data.type === 'REQUEST_CATEGORIES') {
            try {
                // Fetch categories
                const categories = await window.electronAPI.getCategories();

                // Send response back to iframe
                const analyticsIframe = document.querySelector('.analytics-iframe-wrapper iframe');
                if (analyticsIframe && analyticsIframe.contentWindow) {
                    analyticsIframe.contentWindow.postMessage({
                        type: 'CATEGORIES_RESPONSE',
                        categories: categories
                    }, '*');
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        } else if (event.data.type === 'OPEN_APP_DETAILS') {
            // Open app details from analytics iframe
            const appName = event.data.appName;
            if (appName && typeof showAppDetails === 'function') {
                showAppDetails(appName);
            }
        }
    });
});
