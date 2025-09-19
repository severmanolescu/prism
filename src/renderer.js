// Steam Time Tracker - Frontend Logic

let currentCategory = 'All Apps';
let allAppsCache = []; // Cache all apps for filtering
let currentSearchTerm = ''; // Track current search term

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
            console.log('Available categories:', Object.keys(groupAppsByCategory(allAppsCache)));
            
            currentCategory = categoryName;
            loadAppsByCategory(categoryName);
            updateLibraryTitle(categoryName);
            
            // Remove active from all and add to category
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            categoryItem.classList.add('active');
        }
    });

    const homeButton = document.getElementById("home")

    homeButton.addEventListener('click', (e) => {
        currentCategory = 'All Apps';
        loadAppData();
        updateLibraryTitle('All Apps');
        
        // Remove active from all nav items
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
});

// Load and display app data
async function loadAppData() {
    try {
        console.log('Loading app data...');
        
        // Load recent apps
        const recentApps = await window.electronAPI.getRecentApps();
        console.log('Recent apps loaded:', recentApps.length, 'apps');
        displayRecentApps(recentApps);
        
        // Load all apps
        const allApps = await window.electronAPI.getAllApps();
        console.log('All apps loaded:', allApps.length, 'apps');
        
        // Cache all apps for filtering
        allAppsCache = allApps;
        
        displayAllApps(allApps);
        
        // Create navigation based on categories
        createCategoryNavigation(allApps);
        
        console.log('App data loaded successfully');
    } catch (error) {
        console.error('Error loading app data:', error);
    }
}

// Group apps by category helper function
function groupAppsByCategory(apps) {
    const appsByCategory = {};
    apps.forEach(app => {
        const category = app.category || 'Uncategorized';
        if (!appsByCategory[category]) {
            appsByCategory[category] = [];
        }
        appsByCategory[category].push(app);
    });
    return appsByCategory;
}

// Create navigation sections based on app categories
function createCategoryNavigation(apps) {
    console.log('Creating category navigation for apps:', apps);
    
    const libraryNav = document.querySelector('.library-nav');
    if (!libraryNav) {
        console.error('Library nav container not found!');
        return;
    }
    
    // Clear existing navigation
    libraryNav.innerHTML = '';
    
    // Group apps by category using helper function
    const appsByCategory = groupAppsByCategory(apps);
    console.log('Apps grouped by category:', appsByCategory);
    
    // Create nav sections for each category
    Object.keys(appsByCategory).sort().forEach(categoryName => {
        const categoryApps = appsByCategory[categoryName];
        const navSection = createNavSection(categoryName, categoryApps);
        libraryNav.appendChild(navSection);
    });
}

// Create a navigation section for a category
function createNavSection(categoryName, apps) {
    const navSection = document.createElement('div');
    navSection.className = 'nav-section';
    
    // Get category icon
    const categoryIcon = getCategoryIcon(categoryName);
    
    // Create category header with expand/collapse button
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'nav-item category';
    categoryHeader.innerHTML = `
        <div class="category-main">
            <span class="icon">${categoryIcon}</span>
            <span>${categoryName}</span>
            <span class="category-count">(${apps.length})</span>
        </div>
        <button class="category-toggle" data-category="${categoryName}">
            <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
    `;
    
    // Create subitems container
    const subitemsContainer = document.createElement('div');
    subitemsContainer.className = 'nav-subitems';
    subitemsContainer.dataset.category = categoryName;
    
    // Add each app as a nav item
    apps.forEach(app => {
        const navItem = document.createElement('div');
        navItem.className = 'nav-item';
        navItem.dataset.appId = app.id;
        
        const iconHtml = app.iconPath
            ? `<img src="app-icon://${app.iconPath.replace('icons/', '')}" alt="${app.name}" 
                style="width: 18px; height: 18px; object-fit: contain; margin-right: 6px;">`
            : `<span class="icon">${getAppIcon(app.name, app.category)}</span>`;
        
        navItem.innerHTML = `
            ${iconHtml}
            <span>${app.name}</span>
        `;
        
        subitemsContainer.appendChild(navItem);
    });
    
    navSection.appendChild(categoryHeader);
    navSection.appendChild(subitemsContainer);
    
    return navSection;
}

// Get category icon
function getCategoryIcon(categoryName) {
    switch (categoryName) {
        case 'Development': return '💻';
        case 'Browsers': return '🌐';
        case 'Games': return '🎮';
        case 'Creative': return '🎨';
        case 'Communication': return '💬';
        case 'Productivity': return '📊';
        case 'Media': return '🎵';
        case 'Utilities': return '🛠️';
        case 'Uncategorized': return '📁';
        default: return '⚙️';
    }
}

// Update library title
function updateLibraryTitle(categoryName) {
    const libraryTitle = document.querySelector('.library-title');
    if (libraryTitle) {
        const icon = getCategoryIcon(categoryName);
        libraryTitle.innerHTML = `${icon} ${categoryName}`;
    }
}

// Load apps by category
async function loadAppsByCategory(category) {
    try {
        console.log('Loading apps by category:', category);
        
        // If "All Apps" is selected, show all cached apps
        if (category === 'All Apps') {
            console.log('Showing all apps from cache:', allAppsCache.length);
            displayAllApps(allAppsCache);
            return;
        }
        
        // Filter from cached apps
        const filteredApps = allAppsCache.filter(app => {
            const appCategory = app.category || 'Uncategorized';
            return appCategory === category;
        });
        
        console.log('Filtered apps for category "' + category + '":', filteredApps.length);
        console.log('Apps in this category:', filteredApps.map(app => app.name));
        
        displayAllApps(filteredApps);
        
    } catch (error) {
        console.error('Error loading apps by category:', error);
    }
}

// Display recent apps
function displayRecentApps(apps) {
    console.log('Displaying recent apps:', apps);
    const recentContainer = document.querySelector('.recent-games');
    if (!recentContainer) {
        console.error('Recent container not found!');
        return;
    }
    
    recentContainer.innerHTML = '';
    
    if (apps.length === 0) {
        console.log('No recent apps to display');
        recentContainer.innerHTML = '<p style="color: #8f98a0; padding: 20px; text-align: center;">No recent apps found</p>';
        return;
    }
    
    apps.forEach((app, index) => {
        console.log(`Creating recent app element ${index + 1}:`, app.name);
        const recentItem = createRecentAppElement(app);
        recentContainer.appendChild(recentItem);
    });
}

// Display all apps
function displayAllApps(apps) {
    console.log('Displaying all apps:', apps);
    const appsContainer = document.querySelector('.apps-grid');
    const sectionHeader = document.querySelector('.all-apps-section .section-header');
    
    if (!appsContainer) {
        console.error('Apps container not found!');
        return;
    }
    
    appsContainer.innerHTML = '';
    
    if (apps.length === 0) {
        console.log('No apps to display');
        appsContainer.innerHTML = '<p style="color: #8f98a0; padding: 20px; text-align: center;">No applications found</p>';
        return;
    }
    
    // If we're showing all apps (currentCategory is 'All Apps'), group by categories
    if (currentCategory === 'All Apps') {
        // Update section header to "All Applications"
        if (sectionHeader) {
            sectionHeader.textContent = 'All Applications';
        }
        
        // Change the apps-grid to not use CSS grid when showing categories
        appsContainer.classList.add('categorized-view');
        
        const appsByCategory = groupAppsByCategory(apps);
        
        // Display each category with its apps
        Object.keys(appsByCategory).sort().forEach(categoryName => {
            const categoryApps = appsByCategory[categoryName];
            
            // Create category section wrapper
            const categorySection = document.createElement('div');
            categorySection.className = 'category-section';
            
            // Create category header
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header';
            categoryHeader.innerHTML = `
                <div class="category-title">
                    <span class="category-icon">${getCategoryIcon(categoryName)}</span>
                    <h3>${categoryName}</h3>
                    <span class="category-app-count">${categoryApps.length} apps</span>
                </div>
            `;
            categorySection.appendChild(categoryHeader);
            
            // Create grid for this category's apps
            const categoryGrid = document.createElement('div');
            categoryGrid.className = 'category-apps-grid';
            
            categoryApps.forEach((app, index) => {
                console.log(`Creating app element ${index + 1} for ${categoryName}:`, app.name);
                const appItem = createAppElement(app);
                categoryGrid.appendChild(appItem);
            });
            
            categorySection.appendChild(categoryGrid);
            appsContainer.appendChild(categorySection);
        });
    } else {
        // For specific categories, remove categorized view class
        appsContainer.classList.remove('categorized-view');
        
        // Show the category name as section header
        if (sectionHeader) {
            const categoryIcon = getCategoryIcon(currentCategory);
            sectionHeader.innerHTML = `${categoryIcon} ${currentCategory}`;
        }
        
        // Show apps in a regular grid without individual category headers
        apps.forEach((app, index) => {
            console.log(`Creating app element ${index + 1}:`, app.name);
            const appItem = createAppElement(app);
            appsContainer.appendChild(appItem);
        });
    }
}

// Create recent app element
function createRecentAppElement(app) {
    const item = document.createElement('div');
    item.className = 'recent-item';
    item.dataset.appId = app.id;
    
    const iconHtml = app.iconPath 
        ? `<img src="app-icon://${app.iconPath.replace('icons/', '')}" alt="${app.name}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none';">` 
        : `<div class="app-icon-small">${getAppIcon(app.name, app.category)}</div>`;
    
    const bgColor = getCategoryColor(app.category);
    
    item.innerHTML = `
        <div class="recent-item-bg" style="background: ${bgColor};">
            ${iconHtml}
        </div>
        <div class="recent-item-info">
            <div class="recent-item-name">${app.name}</div>
            <div class="recent-item-time">${app.lastUsedFormatted}</div>
        </div>
    `;
    
    return item;
}

// Create app element  
function createAppElement(app) {
    const item = document.createElement('div');
    item.className = 'app-item';
    item.dataset.appId = app.id;
    item.dataset.category = app.category;
    
    const iconHtml = app.iconPath 
        ? `<img src="app-icon://${app.iconPath.replace('icons/', '')}" alt="${app.name}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none';">` 
        : `<div class="app-icon-small">${getAppIcon(app.name, app.category)}</div>`;
    
    const bgColor = getCategoryColor(app.category);
    
    item.innerHTML = `
        <div class="app-item-bg" style="background: ${bgColor};">
            ${iconHtml}
        </div>
        <div class="app-item-overlay">
            <div class="app-item-name">${app.name}</div>
            <div class="app-item-stats">
                <span class="app-item-hours">${app.totalTimeFormatted}</span>
                <span class="app-item-last-played">${app.lastUsedFormatted}</span>
            </div>
        </div>
    `;
    
    return item;
}

// Get app icon based on name and category
function getAppIcon(name, category) {
    const nameLower = name.toLowerCase();
    
    // Specific app icons
    if (nameLower.includes('chrome')) return '🌐';
    if (nameLower.includes('firefox')) return '🦊';
    if (nameLower.includes('edge')) return '🌊';
    if (nameLower.includes('code') || nameLower.includes('vscode')) return '💻';
    if (nameLower.includes('steam')) return '🎮';
    if (nameLower.includes('discord')) return '💬';
    if (nameLower.includes('spotify')) return '🎵';
    if (nameLower.includes('photoshop')) return '🎨';
    if (nameLower.includes('excel')) return '📊';
    if (nameLower.includes('word')) return '📝';
    if (nameLower.includes('powerpoint')) return '📋';
    if (nameLower.includes('outlook')) return '📧';
    if (nameLower.includes('teams')) return '👥';
    if (nameLower.includes('slack')) return '💼';
    if (nameLower.includes('notion')) return '📓';
    if (nameLower.includes('figma')) return '🎯';
    if (nameLower.includes('unity')) return '🎮';
    if (nameLower.includes('blender')) return '📺';
    if (nameLower.includes('terminal')) return '🛠️';
    if (nameLower.includes('calculator')) return '🧮';
    if (nameLower.includes('notepad')) return '📋';
    if (nameLower.includes('whatsapp')) return '📱';
    if (nameLower.includes('telegram')) return '✈️';
    
    // Category-based icons
    switch (category) {
        case 'Development': return '💻';
        case 'Browsers': return '🌐';
        case 'Games': return '🎮';
        case 'Creative': return '🎨';
        case 'Communication': return '💬';
        default: return '⚙️';
    }
}

// Get category color gradient
function getCategoryColor(category) {
    switch (category) {
        case 'Development':
            return 'linear-gradient(135deg, #4a90e2 0%, #357abd 80%)';
        case 'Browsers':
            return 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 80%)';
        case 'Games':
            return 'linear-gradient(135deg, #a55eea 0%, #8b46ff 80%)';
        case 'Creative':
            return 'linear-gradient(135deg, #26de81 0%, #20bf6b 80%)';
        case 'Communication':
            return 'linear-gradient(135deg, #fd79a8 0%, #e84393 80%)';
        default:
            return 'linear-gradient(135deg, #092442 0%, #07417a 80%)';
    }
}

// Set up real-time updates
function setupRealTimeUpdates() {
    // Listen for app usage updates
    window.electronAPI.onAppUsageUpdated((event, data) => {
        updateAppDisplay(data);
    });
    
    // Listen for icon updates
    window.electronAPI.onAppIconUpdated((event, data) => {
        updateAppIcon(data.appId, data.iconPath);
    });
    
    // Refresh data periodically
    setInterval(() => {
        loadAppsByCategory(currentCategory);
        loadRecentApps();
    }, 30000); // Every 30 seconds
}

// Update app icon when it's extracted
function updateAppIcon(appId, iconPath) {
    const appElements = document.querySelectorAll(`[data-app-id="${appId}"]`);
    appElements.forEach(element => {
        const iconContainer = element.querySelector('.recent-item-bg, .app-item-bg');
        if (iconContainer) {
            // Replace emoji with real icon
            iconContainer.innerHTML = `<img src="${iconPath}" alt="App Icon" style="width: 48px; height: 48px; object-fit: contain;">`;
        }
    });
    
    console.log(`Updated icon for app ${appId}: ${iconPath}`);
}

// Update app display when usage changes
function updateAppDisplay(data) {
    const appElement = document.querySelector(`[data-app-id="${data.appId}"]`);
    if (appElement) {
        const hoursElement = appElement.querySelector('.app-item-hours');
        if (hoursElement) {
            hoursElement.textContent = formatTime(data.totalTime);
        }
    }
}

// Load recent apps separately
async function loadRecentApps() {
    try {
        const recentApps = await window.electronAPI.getRecentApps();
        displayRecentApps(recentApps);
    } catch (error) {
        console.error('Error loading recent apps:', error);
    }
}

// Show app details
function showAppDetails(appName) {
    console.log(`Opening details for: ${appName}`);
    alert(`App Details: ${appName}\n\nFeature coming soon:\n• Session history\n• Usage charts\n• Time breakdown\n• Launch count`);
}

// Format time helper
function formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = (seconds / 3600).toFixed(1);
    return `${hours}h`;
}

// Display current time
function displayCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.title = `Steam Time Tracker - ${timeString}`;
}

// Window control functions
function setupWindowControls() {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');
    
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });
    }
    
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            window.electronAPI.maximizeWindow();
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });
    }
    
    // Listen for window state changes to update maximize button
    window.electronAPI.onWindowMaximized(() => {
        updateMaximizeButton(true);
    });
    
    window.electronAPI.onWindowUnmaximized(() => {
        updateMaximizeButton(false);
    });
    
    // Set initial maximize button state
    window.electronAPI.isWindowMaximized().then(isMaximized => {
        updateMaximizeButton(isMaximized);
    });
}

function updateMaximizeButton(isMaximized) {
    const maximizeBtn = document.getElementById('maximize-btn');
    if (maximizeBtn) {
        const svg = maximizeBtn.querySelector('svg');
        if (isMaximized) {
            // Show restore/unmaximize icon
            svg.innerHTML = `
                <path d="M2,2 L8,2 L8,8 L2,8 Z" fill="none" stroke="currentColor" stroke-width="1"/>
                <path d="M2,2 L2,0 L10,0 L10,8 L8,8" fill="none" stroke="currentColor" stroke-width="1"/>
            `;
        } else {
            // Show maximize icon
            svg.innerHTML = `<path d="M0,0 L10,0 L10,10 L0,10 Z" fill="none" stroke="currentColor" stroke-width="1"/>`;
        }
    }
}

// Filter navigation based on search term
function filterNavigation(searchTerm) {
    const navSections = document.querySelectorAll('.nav-section');
    
    if (searchTerm === '') {
        // Show all items when search is empty and restore original collapsed states
        navSections.forEach(section => {
            section.style.display = 'block';
            const navItems = section.querySelectorAll('.nav-subitems .nav-item');
            navItems.forEach(item => {
                item.style.display = 'flex';
            });
            
            // Don't auto-expand when clearing search - keep original collapsed state
            // Just ensure subitems container is properly sized
            const subitems = section.querySelector('.nav-subitems');
            const toggleButton = section.querySelector('.category-toggle');
            
            if (section.classList.contains('collapsed')) {
                // Keep it collapsed
                subitems.style.maxHeight = '0';
            } else {
                // Keep it expanded
                subitems.style.maxHeight = subitems.scrollHeight + 'px';
            }
        });
        return;
    }
    
    navSections.forEach(section => {
        const subitems = section.querySelector('.nav-subitems');
        const navItems = section.querySelectorAll('.nav-subitems .nav-item');
        let hasMatchingApps = false;
        
        // Check each app in this category
        navItems.forEach(navItem => {
            const appName = navItem.querySelector('span:last-child').textContent.toLowerCase();
            const matches = appName.includes(searchTerm);
            
            if (matches) {
                hasMatchingApps = true;
                navItem.style.display = 'flex';
            } else {
                navItem.style.display = 'none';
            }
        });
        
        // Show/hide entire category based on whether it has matches
        if (hasMatchingApps) {
            section.style.display = 'block';
            // Auto-expand categories with matches during search
            section.classList.remove('collapsed');
            subitems.style.maxHeight = subitems.scrollHeight + 'px';
            const toggleButton = section.querySelector('.category-toggle');
            if (toggleButton) toggleButton.classList.remove('collapsed');
        } else {
            section.style.display = 'none';
        }
    });
}