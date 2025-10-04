// Steam Time Tracker - Frontend Logic

let currentCategory = 'All Apps';
let allAppsCache = []; // Cache all apps for filtering
let currentSearchTerm = ''; // Track current search term
let favoritesCache = [];

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
                loadAppsByCategory(currentCategory);
                updateLibraryTitle(libraryName);
            }
        }
    });

    // Handle category section clicks
    document.addEventListener('click', (e) => {
        // Handle category toggle button clicks
        if (e.target.closest('.category-toggle')) {
            e.preventDefault();
            e.stopPropagation();
            
            const toggleButton = e.target.closest('.category-toggle');
            const navSection = toggleButton.closest('.nav-section');
            const subitemsContainer = navSection.querySelector('.nav-subitems');
            
            // Toggle the collapsed state
            const isCollapsed = navSection.classList.contains('collapsed');
            
            if (isCollapsed) {
                // Expand
                navSection.classList.remove('collapsed');
                subitemsContainer.style.maxHeight = subitemsContainer.scrollHeight + 'px';
                toggleButton.classList.remove('collapsed');
            } else {
                // Collapse
                navSection.classList.add('collapsed');
                subitemsContainer.style.maxHeight = '0';
                toggleButton.classList.add('collapsed');
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
            
            console.log('Category clicked:', categoryName);
            
            currentCategory = categoryName;
            
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
        
        // Handle search clear (Escape key)
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.target.value = '';
                filterNavigation('');
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

    // Initialize the app
    console.log('Steam Time Tracker initialized!');
    displayCurrentTime();
    
    // Update time every second
    setInterval(displayCurrentTime, 1000);

    window.contextMenu = new ContextMenu();

    window.collectionContextMenu = new CollectionContextMenu();

    // Handle analytics and productivity data requests from iframes
    window.addEventListener('message', async (event) => {
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
