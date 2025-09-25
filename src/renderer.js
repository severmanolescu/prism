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
            const categoryName = toggleButton.dataset.category;
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
        }
    });

    const homeButton = document.getElementById("home")

    homeButton.addEventListener('click', (e) => {
        const categoryOverview = document.getElementById('categoryOverview');
        if (categoryOverview) {
            toggleView('grid');
            document.querySelector('.view-toggle-btn[data-view="categories"]').classList.remove('active');
        }
        
        currentCategory = 'All Apps';
        loadAppData();
        updateLibraryTitle('All Apps');
        
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    })
    
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
    
    // Initialize the app
    console.log('Steam Time Tracker initialized!');
    displayCurrentTime();
    
    // Update time every second
    setInterval(displayCurrentTime, 1000);

    window.contextMenu = new ContextMenu();

    window.collectionContextMenu = new CollectionContextMenu();
});
