// Create app element  
function createAppElement(app, bgColor) {
    const item = document.createElement('div');
    item.className = 'app-item';
    item.dataset.appId = app.id;
    item.dataset.category = app.category;

    const iconFilename = app.iconPath ? app.iconPath.replace(/^.*[\\\/]/, '').replace('icons/', '') : null;
    const iconHtml = iconFilename
        ? `<img src="app-icon://${escapeHtml(iconFilename)}" alt="${escapeHtml(app.name)}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none';">`
        : `<div class="app-icon-small">${getAppIcon(app.name, app.category)}</div>`;

    item.innerHTML = `
        <div class="app-item-bg" style="background: ${bgColor};">
            ${iconHtml}
        </div>
        <div class="app-item-overlay">
            <div class="app-item-name">${escapeHtml(app.name)}</div>
            <div class="app-item-stats">
                <span class="app-item-hours">${escapeHtml(app.totalTimeFormatted)}</span>
                <span class="app-item-last-played">${escapeHtml(app.lastUsedFormatted)}</span>
            </div>
        </div>
    `;
    
    return item;
}

// Create recent app element
function createRecentAppElement(app, bgColor) {
    const item = document.createElement('div');
    item.className = 'recent-item';
    item.dataset.appId = app.id;
    
    const iconFilename = app.iconPath ? app.iconPath.replace(/^.*[\\\/]/, '').replace('icons/', '') : null;
    const iconHtml = iconFilename
        ? `<img src="app-icon://${escapeHtml(iconFilename)}" alt="${escapeHtml(app.name)}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none';">`
        : `<div class="app-icon-small">${getAppIcon(app.name, app.category)}</div>`;

    item.innerHTML = `
        <div class="recent-item-bg" style="background: ${bgColor || getCategoryColor(app.category)};">
            ${iconHtml}
        </div>
        <div class="recent-item-info">
            <div class="recent-item-name">${escapeHtml(app.name)}</div>
            <div class="recent-item-time">${escapeHtml(app.lastUsedFormatted)}</div>
        </div>
    `;
    
    return item;
}

// Create a navigation section for a category
function createNavSection(categoryName, apps, isFavorites = false) {
    const navSection = document.createElement('div');
    navSection.className = 'nav-section';
    
    // Get category icon
    const categoryIcon = isFavorites ? '⭐' : getCategoryIcon(categoryName);
    
    // Create category header with expand/collapse button
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'nav-item category';
    categoryHeader.innerHTML = `
        <div class="category-main">
            <span class="icon">${categoryIcon}</span>
            <span>${escapeHtml(categoryName)}</span>
            <span class="category-count">(${apps.length})</span>
        </div>
        <button class="category-toggle" data-category="${escapeHtml(categoryName)}">
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
        navItem.dataset.appId = app.id;  // Make sure this line exists
        navItem.dataset.appName = app.name;  // Add this line too
        navItem.draggable = true; 
        
        const iconHtml = app.iconPath
            ? (() => {
                // Extract just the filename from the path (handles both full paths and relative paths)
                const iconFilename = app.iconPath.replace(/^.*[\\\/]/, '').replace('icons/', '');
                return `<img src="app-icon://${escapeHtml(iconFilename)}" alt="${escapeHtml(app.name)}"
                    style="width: 18px; height: 18px; object-fit: contain; margin-right: 6px;">`;
              })()
            : `<span class="icon">${getAppIcon(app.name, app.category)}</span>`;

        navItem.innerHTML = `
            ${iconHtml}
            <span>${escapeHtml(app.name)}</span>
        `;
        
        // Add drag event handlers
        navItem.addEventListener('dragstart', handleDragStart);
        navItem.addEventListener('dragend', handleDragEnd);
        
        subitemsContainer.appendChild(navItem);
    });
    
    navSection.appendChild(categoryHeader);
    navSection.appendChild(subitemsContainer);

    // Restore collapsed state from localStorage
    const collapsedNav = JSON.parse(localStorage.getItem('collapsed-nav-sections') || '[]');
    if (collapsedNav.includes(categoryName)) {
        navSection.classList.add('collapsed');
        subitemsContainer.style.maxHeight = '0';
        const toggleBtn = categoryHeader.querySelector('.category-toggle');
        if (toggleBtn) toggleBtn.classList.add('collapsed');
    } else {
        // Set initial maxHeight for smooth collapse animation (only for expanded sections)
        requestAnimationFrame(() => {
            subitemsContainer.style.maxHeight = subitemsContainer.scrollHeight + 'px';
        });
    }

    return navSection;
}


function createCategoryCard(categoryName, apps, color = '#4a90e2') {
    const card = document.createElement('div');
    card.className = 'collection-card';
    card.dataset.category = categoryName;
    
    // Use the category's custom color as background gradient
    const bgColor = `linear-gradient(135deg, ${color} 0%, ${adjustBrightness(color, -20)} 80%)`;
    
    // Determine grid layout based on number of apps
    let gridClass, maxApps, totalSlots;
    
    if (apps.length === 0) {
        // Handle empty categories
        gridClass = 'grid-empty';
        maxApps = 0;
        totalSlots = 1;
    } else if (apps.length === 1) {
        gridClass = 'grid-1x1';
        maxApps = 1;
        totalSlots = 1;
    } else if (apps.length === 2) {
        gridClass = 'grid-1x2';
        maxApps = 2;
        totalSlots = 2;
    } else if (apps.length === 3) {
        gridClass = 'grid-1x3';
        maxApps = 3;
        totalSlots = 3;
    } else if (apps.length <= 4) {
        gridClass = 'grid-2x2';
        maxApps = 4;
        totalSlots = 4;
    } else {
        gridClass = 'grid-3x3';
        maxApps = 9;
        totalSlots = 9;
    }
    
    let backgroundIcons = [];
    
    if (apps.length === 0) {
        backgroundIcons.push('<div class="empty-category">Empty Collection</div>');
    } else {
        const sampleApps = apps.slice(0, maxApps);
        
        for (let i = 0; i < totalSlots; i++) {
            if (i < sampleApps.length) {
                const app = sampleApps[i];
                if (app.iconPath) {
                    // Extract just the filename from the path (handles both full paths and relative paths)
                    const iconFilename = app.iconPath.replace(/^.*[\\\/]/, '').replace('icons/', '');
                    backgroundIcons.push(`<img src="app-icon://${escapeHtml(iconFilename)}" alt="${escapeHtml(app.name)}">`);
                } else {
                    backgroundIcons.push(`<span class="bg-icon">${getAppIcon(app.name, app.category)}</span>`);
                }
            } else {
                backgroundIcons.push(`<div class="bg-empty"></div>`);
            }
        }
    }
    
    card.innerHTML = `
        <div class="collection-card-bg" style="background: ${bgColor};">
            <div class="collection-bg-icons ${gridClass}">${backgroundIcons.join('')}</div>
        </div>
        <div class="collection-card-content">
            <div class="collection-title">${escapeHtml(categoryName.toUpperCase())}</div>
            <div class="collection-count">( ${apps.length} )</div>
        </div>
        <div class="collection-card-actions">
            <button class="collection-action-btn insights-btn" title="View Insights" data-action="insights">
                <span>📊</span>
            </button>
            <button class="collection-action-btn edit-btn" title="Edit Collection" data-action="edit" ${categoryName === 'Uncategorized' || categoryName === 'Favorites' ? 'disabled' : '' }>
                <span>✏️</span>
            </button>
            <button class="collection-action-btn delete-btn" title="Delete Collection" data-action="delete" ${categoryName === 'Uncategorized' || categoryName === 'Favorites' ? 'disabled' : ''}>
                <span>🗑️</span>
            </button>
        </div>
    `;

    // Add click handler for action buttons
    const insightsBtn = card.querySelector('.insights-btn');
    const editBtn = card.querySelector('.edit-btn');
    const deleteBtn = card.querySelector('.delete-btn');

    insightsBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        showCategoryInsights(categoryName);
    });

    editBtn?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const categories = await window.electronAPI.getCategories();
        const currentCategory = categories.find(cat => cat.name === categoryName);
        if (currentCategory) {
            const success = await showEditCollectionModal(currentCategory);
            if (success) {
                await loadAppData();
                showCategoryOverview();
            }
        }
    });

    deleteBtn?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (categoryName !== 'Uncategorized' && categoryName !== 'Favorites') {
            const confirmed = await window.confirmationDialog.show({
                title: 'Delete Collection',
                message: `Are you sure you want to delete "${categoryName}"? All apps will be moved to Uncategorized.`,
                icon: '🗑️',
                iconColor: '#e74c3c',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                dangerMode: true
            });

            if (confirmed) {
                try {
                    const result = await window.electronAPI.deleteCollection(categoryName);
                    if (result.success) {
                        const allApps = await window.electronAPI.getAllApps();
                        allAppsCache = allApps;
                        await createCategoryNavigation(allApps);
                        showCategoryOverview();
                        showFeedback("Collection deleted successfully!", true);
                    } else {
                        showFeedback(result.error || 'Failed to delete collection', false);
                    }
                } catch (error) {
                    console.error('Error deleting collection:', error);
                    showFeedback('Failed to delete collection', false);
                }
            }
        }
    });

    // Add click handler for card body (excluding action buttons)
    card.addEventListener('click', (e) => {
        // Don't trigger if clicking on action buttons
        if (e.target.closest('.collection-card-actions')) {
            return;
        }

        currentCategory = categoryName;
        if (categoryName === 'Favorites') {
            loadFavoriteApps();
        } else {
            loadAppsByCategory(categoryName);
        }
        updateLibraryTitle(categoryName);

        toggleView('grid');
        document.querySelector('.view-toggle-btn[data-view="categories"]').classList.remove('active');

        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        const navItem = document.querySelector(`[data-category="${categoryName}"]`)?.closest('.nav-item');
        if (navItem) navItem.classList.add('active');
    });

    return card;
}

function showHiddenView() {
    // Show Hidden Apps
    const recentSection = document.querySelector('.recent-section');
    const allAppsSection = document.querySelector('.all-apps-section');
    const sidebar = document.querySelector('.sidebar');

    if (recentSection) recentSection.style.display = 'block';
    if (allAppsSection) allAppsSection.style.display = 'block';
    if (sidebar) sidebar.style.display = 'flex';

    // Hide other views
    const categoryOverview = document.querySelector('.category-overview');
    const analyticsContainer = document.querySelector('.analytics-iframe-wrapper');
    const detailsContainer = document.querySelector('.app-details-iframe-wrapper');
    const productivityContainer = document.querySelector('.productivity-iframe-wrapper');
    const goalsContainer = document.querySelector('.goals-iframe-wrapper');
    const categoryInsightsContainer = document.querySelector('.category-insights-iframe-wrapper');

    if (categoryOverview) categoryOverview.style.display = 'none';
    if (analyticsContainer) analyticsContainer.style.display = 'none';
    if (detailsContainer) detailsContainer.style.display = 'none';
    if (productivityContainer) productivityContainer.style.display = 'none';
    if (goalsContainer) goalsContainer.style.display = 'none';
    if (categoryInsightsContainer) categoryInsightsContainer.style.display = 'none';

    // Reset view state
    toggleView('grid');
    document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));

    // Load data
    currentCategory = 'Hidden';
    loadAppsByCategory("Hidden", true);
    updateLibraryTitle('Hidden');

    // Clear selections
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.library-submenu-item').forEach(item => item.classList.remove('active'));

    // Activate hidden submenu
    const homeSubmenu = document.querySelector('.library-submenu-item[data-submenu="hidden"]');
    if (homeSubmenu) homeSubmenu.classList.add('active');

    // Update nav tab
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    const libraryTab = document.querySelector('.nav-tab[data-tab="library"]');
    if (libraryTab) libraryTab.classList.add('active');
}

function showHomeView() {
    // Show home content
    const recentSection = document.querySelector('.recent-section');
    const allAppsSection = document.querySelector('.all-apps-section');
    const sidebar = document.querySelector('.sidebar');

    if (recentSection) recentSection.style.display = 'block';
    if (allAppsSection) allAppsSection.style.display = 'block';
    if (sidebar) sidebar.style.display = 'flex';

    // Hide other views
    const categoryOverview = document.querySelector('.category-overview');
    const analyticsContainer = document.querySelector('.analytics-iframe-wrapper');
    const detailsContainer = document.querySelector('.app-details-iframe-wrapper');
    const productivityContainer = document.querySelector('.productivity-iframe-wrapper');
    const goalsContainer = document.querySelector('.goals-iframe-wrapper');
    const categoryInsightsContainer = document.querySelector('.category-insights-iframe-wrapper');

    if (categoryOverview) categoryOverview.style.display = 'none';
    if (analyticsContainer) analyticsContainer.style.display = 'none';
    if (detailsContainer) detailsContainer.style.display = 'none';
    if (productivityContainer) productivityContainer.style.display = 'none';
    if (goalsContainer) goalsContainer.style.display = 'none';
    if (categoryInsightsContainer) categoryInsightsContainer.style.display = 'none';

    // Reset view state
    toggleView('grid');
    document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));

    // Load data
    currentCategory = 'All Apps';
    loadAppData();

    // Clear selections
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.library-submenu-item').forEach(item => item.classList.remove('active'));

    // Activate home submenu
    const homeSubmenu = document.querySelector('.library-submenu-item[data-submenu="home"]');
    if (homeSubmenu) homeSubmenu.classList.add('active');

    // Update nav tab
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    const libraryTab = document.querySelector('.nav-tab[data-tab="library"]');
    if (libraryTab) libraryTab.classList.add('active');
}

function showCollectionsView() {
    // Hide current content
    const recentSection = document.querySelector('.recent-section');
    const allAppsSection = document.querySelector('.all-apps-section');
    const sidebar = document.querySelector('.sidebar');

    if (recentSection) recentSection.style.display = 'none';
    if (allAppsSection) allAppsSection.style.display = 'none';
    if (sidebar) sidebar.style.display = 'flex';

    // Show collections view (categories view)
    toggleView('categories');
    
    // Update the view toggle button state - categories button should be active
    document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));
    const categoriesBtn = document.querySelector('.view-toggle-btn[data-view="categories"]');
    if (categoriesBtn) {
        categoriesBtn.classList.add('active');
    }
    
    // Update library title
    updateLibraryTitle('Collections');
    
    // Update submenu state - set Collections as active
    document.querySelectorAll('.library-submenu-item').forEach(item => item.classList.remove('active'));
    const collectionsSubmenu = document.querySelector('.library-submenu-item[data-submenu="collections"]');
    if (collectionsSubmenu) {
        collectionsSubmenu.classList.add('active');
    }

    // Update nav tab
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    const libraryTab = document.querySelector('.nav-tab[data-tab="library"]');
    if (libraryTab) libraryTab.classList.add('active');
}

function showAnalyticsView() {
    // Hide current content
    const recentSection = document.querySelector('.recent-section');
    const allAppsSection = document.querySelector('.all-apps-section');
    const categoryOverview = document.querySelector('.category-overview');
    const detailsContainer = document.querySelector('.app-details-iframe-wrapper');
    const sidebar = document.querySelector('.sidebar');
    const productivityContainer = document.querySelector('.productivity-iframe-wrapper');
    const goalsContainer = document.querySelector('.goals-iframe-wrapper');
    const categoryInsightsContainer = document.querySelector('.category-insights-iframe-wrapper');

    if (recentSection) recentSection.style.display = 'none';
    if (allAppsSection) allAppsSection.style.display = 'none';
    if (categoryOverview) categoryOverview.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
    if (detailsContainer) detailsContainer.style.display = 'none';
    if (productivityContainer) productivityContainer.style.display = 'none';
    if (goalsContainer) goalsContainer.style.display = 'none';
    if (categoryInsightsContainer) categoryInsightsContainer.style.display = 'none';

    // Adjust main-content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.marginLeft = '0';
        mainContent.style.width = '100%';
    }
    
    // Create iframe to completely isolate analytics
    let analyticsContainer = document.querySelector('.analytics-iframe-wrapper');
    
    if (!analyticsContainer) {
        analyticsContainer = document.createElement('div');
        analyticsContainer.className = 'analytics-iframe-wrapper';
        analyticsContainer.style.width = '100%';
        analyticsContainer.style.height = '100%';
        analyticsContainer.style.overflow = 'hidden';
        
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.display = 'block';
        iframe.src = 'analytics.html';
        
        iframe.onload = () => {
            iframe.contentWindow.postMessage({
                type: 'ANALYTICS',
            }, '*');
        };

        analyticsContainer.appendChild(iframe);
        
        if (mainContent) {
            mainContent.appendChild(analyticsContainer);
        }
    } else {
        analyticsContainer.style.display = 'block';
    }

    // Clear selections
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.library-submenu-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));

    // Update nav tab
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    const analyticsTab = document.querySelector('.nav-tab[data-tab="analytics"]');
    if (analyticsTab) analyticsTab.classList.add('active');

    // Focus iframe for keyboard shortcuts
    setTimeout(() => {
        const iframe = analyticsContainer.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.focus();
        }
    }, 100);
}

function showProductivityView() {
    // Hide current content
    const recentSection = document.querySelector('.recent-section');
    const allAppsSection = document.querySelector('.all-apps-section');
    const categoryOverview = document.querySelector('.category-overview');
    const detailsContainer = document.querySelector('.app-details-iframe-wrapper');
    const analyticsContainer = document.querySelector('.analytics-iframe-wrapper');
    const goalsContainer = document.querySelector('.goals-iframe-wrapper');
    const sidebar = document.querySelector('.sidebar');
    const categoryInsightsContainer = document.querySelector('.category-insights-iframe-wrapper');
    
    if (recentSection) recentSection.style.display = 'none';
    if (allAppsSection) allAppsSection.style.display = 'none';
    if (categoryOverview) categoryOverview.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
    if (detailsContainer) detailsContainer.style.display = 'none';
    if (goalsContainer) goalsContainer.style.display = 'none';
    if (analyticsContainer) analyticsContainer.style.display = 'none';
    if (categoryInsightsContainer) categoryInsightsContainer.style.display = 'none';
    
    // Adjust main-content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.marginLeft = '0';
        mainContent.style.width = '100%';
    }
    
    // Create iframe to completely isolate analytics
    let productivityContainer = document.querySelector('.productivity-iframe-wrapper');
    
    if (!productivityContainer) {
        productivityContainer = document.createElement('div');
        productivityContainer.className = 'productivity-iframe-wrapper';
        productivityContainer.style.width = '100%';
        productivityContainer.style.height = '100%';
        productivityContainer.style.overflow = 'hidden';
        
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.display = 'block';
        iframe.src = 'productivity.html';

        productivityContainer.appendChild(iframe);
        
        if (mainContent) {
            mainContent.appendChild(productivityContainer);
        }
    } else {
        productivityContainer.style.display = 'block';
    }

    // Clear selections
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.library-submenu-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));

    // Update nav tab
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    const analyticsTab = document.querySelector('.nav-tab[data-tab="productivity"]');
    if (analyticsTab) analyticsTab.classList.add('active');

    // Focus iframe for keyboard shortcuts
    setTimeout(() => {
        const iframe = productivityContainer.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.focus();
        }
    }, 100);
}

function showGoalsView(){
    // Hide current content
    const recentSection = document.querySelector('.recent-section');
    const allAppsSection = document.querySelector('.all-apps-section');
    const categoryOverview = document.querySelector('.category-overview');
    const detailsContainer = document.querySelector('.app-details-iframe-wrapper');
    const analyticsContainer = document.querySelector('.analytics-iframe-wrapper');
    const productivityContainer = document.querySelector('.productivity-iframe-wrapper');
    const sidebar = document.querySelector('.sidebar');
    const categoryInsightsContainer = document.querySelector('.category-insights-iframe-wrapper');

    if (recentSection) recentSection.style.display = 'none';
    if (allAppsSection) allAppsSection.style.display = 'none';
    if (categoryOverview) categoryOverview.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
    if (detailsContainer) detailsContainer.style.display = 'none';
    if (productivityContainer) productivityContainer.style.display = 'none';
    if (analyticsContainer) analyticsContainer.style.display = 'none';
    if (categoryInsightsContainer) categoryInsightsContainer.style.display = 'none';

    // Adjust main-content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.marginLeft = '0';
        mainContent.style.width = '100%';
    }

    // Create iframe to completely isolate analytics
    let goalsContainer = document.querySelector('.goals-iframe-wrapper');

    if (!goalsContainer) {
        goalsContainer = document.createElement('div');
        goalsContainer.className = 'goals-iframe-wrapper';
        goalsContainer.style.width = '100%';
        goalsContainer.style.height = '100%';
        goalsContainer.style.overflow = 'hidden';

        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.display = 'block';
        iframe.src = 'goals.html';

        goalsContainer.appendChild(iframe);

        if (mainContent) {
            mainContent.appendChild(goalsContainer);
        }
    } else {
        goalsContainer.style.display = 'block';
    }

    // Clear selections
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.library-submenu-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));

    // Update nav tab
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    const analyticsTab = document.querySelector('.nav-tab[data-tab="goals"]');
    if (analyticsTab) analyticsTab.classList.add('active');

    // Focus iframe for keyboard shortcuts
    setTimeout(() => {
        const iframe = goalsContainer.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.focus();
        }
    }, 100);
}

async function showCategoryInsights(categoryName) {
    console.log('Opening category insights for:', categoryName);

    try {
        // Hide current content
        const recentSection = document.querySelector('.recent-section');
        const allAppsSection = document.querySelector('.all-apps-section');
        const categoryOverview = document.querySelector('.category-overview');
        const analyticsContainer = document.querySelector('.analytics-iframe-wrapper');
        const detailsContainer = document.querySelector('.app-details-iframe-wrapper');
        const productivityContainer = document.querySelector('.productivity-iframe-wrapper');
        const goalsContainer = document.querySelector('.goals-iframe-wrapper');
        const sidebar = document.querySelector('.sidebar');

        if (recentSection) recentSection.style.display = 'none';
        if (allAppsSection) allAppsSection.style.display = 'none';
        if (categoryOverview) categoryOverview.style.display = 'none';
        if (analyticsContainer) analyticsContainer.style.display = 'none';
        if (detailsContainer) detailsContainer.style.display = 'none';
        if (productivityContainer) productivityContainer.style.display = 'none';
        if (goalsContainer) goalsContainer.style.display = 'none';

        // Show sidebar
        if (sidebar) sidebar.style.display = 'flex';

        const mainContent = document.querySelector('.main-content');

        // Reset main-content margin
        if (mainContent) {
            mainContent.style.marginLeft = '';
            mainContent.style.width = '';
        }

        // Create or show category insights iframe
        let insightsContainer = document.querySelector('.category-insights-iframe-wrapper');

        if (!insightsContainer) {
            insightsContainer = document.createElement('div');
            insightsContainer.className = 'category-insights-iframe-wrapper';
            insightsContainer.style.width = '100%';
            insightsContainer.style.height = '100%';
            insightsContainer.style.overflow = 'hidden';

            const iframe = document.createElement('iframe');
            iframe.id = 'category-insights-iframe';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.style.display = 'block';
            iframe.src = 'category-insights.html';

            // Send category name to iframe when it loads
            iframe.onload = () => {
                iframe.contentWindow.postMessage({
                    type: 'CATEGORY_INSIGHTS',
                    categoryName: categoryName
                }, '*');
            };

            insightsContainer.appendChild(iframe);

            if (mainContent) {
                mainContent.appendChild(insightsContainer);
            }
        } else {
            const iframe = insightsContainer.querySelector('iframe');
            if (iframe) {
                // If iframe already exists, just send category name
                iframe.contentWindow.postMessage({
                    type: 'CATEGORY_INSIGHTS',
                    categoryName: categoryName
                }, '*');
            }
            insightsContainer.style.display = 'block';
        }

        // Clear selections
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.library-submenu-item').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));

        // Update nav tab
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        const libraryTab = document.querySelector('.nav-tab[data-tab="library"]');
        if (libraryTab) libraryTab.classList.add('active');

        // Focus iframe for keyboard shortcuts
        setTimeout(() => {
            const iframe = insightsContainer.querySelector('iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.focus();
            }
        }, 100);

    } catch (error) {
        console.error('Error showing category insights:', error);
        showFeedback('Failed to load category insights', false);
    }
}

async function showAppDetails(appName) {

    // Get the app ID from the clicked element or find it
    let appData = allAppsCache.find(app => app.name === appName);
    if (!appData) {
        console.log('App not found:', appName, ", trying to find it in hidden apps!");

        const hiddenIds = await window.electronAPI.getHiddenApps();

        appData = hiddenIds.find(app => app.name === appName);

        if (!appData) {
            console.error("App not found!");
            return;
        }
    }

    // Fetch app details from main process
    const details = await window.electronAPI.getAppDetails(appData.id);

    // Get category color
    const categoryColor = await getCategoryColor(details.app.category);
    details.categoryColor = categoryColor;

    // Hide current content
    const recentSection = document.querySelector('.recent-section');
    const allAppsSection = document.querySelector('.all-apps-section');
    const categoryOverview = document.querySelector('.category-overview');
    const analyticsContainer = document.querySelector('.analytics-iframe-wrapper');
    const sidebar = document.querySelector('.sidebar');
    const categoryInsightsContainer = document.querySelector('.category-insights-iframe-wrapper');

    if (recentSection) recentSection.style.display = 'none';
    if (allAppsSection) allAppsSection.style.display = 'none';
    if (categoryOverview) categoryOverview.style.display = 'none';
    if (analyticsContainer) analyticsContainer.style.display = 'none';
    if (categoryInsightsContainer) categoryInsightsContainer.style.display = 'none';

    // Show sidebar (in case it was hidden by analytics view)
    if (sidebar) sidebar.style.display = 'flex';

    const mainContent = document.querySelector('.main-content');

    // Reset main-content margin (in case it was changed by analytics view)
    if (mainContent) {
        mainContent.style.marginLeft = '';
        mainContent.style.width = '';
    }

    // Create or show app details iframe
    let detailsContainer = document.querySelector('.app-details-iframe-wrapper');

    if (!detailsContainer) {
        detailsContainer = document.createElement('div');
        detailsContainer.className = 'app-details-iframe-wrapper';
        detailsContainer.style.width = '100%';
        detailsContainer.style.height = '100%';
        detailsContainer.style.overflow = 'hidden';

        const iframe = document.createElement('iframe');
        iframe.id = 'app-details-iframe';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.display = 'block';
        iframe.src = 'app-details.html';

        // Send appId to iframe when it loads (it will request data with date range)
        iframe.onload = () => {
            iframe.contentWindow.postMessage({
                type: 'APP_DETAILS',
                appId: appData.id
            }, '*');
        };

        detailsContainer.appendChild(iframe);

        if (mainContent) {
            mainContent.appendChild(detailsContainer);
        }
    } else {
        const iframe = detailsContainer.querySelector('iframe');
        if (iframe) {
            // If iframe already exists, just send new appId (it will request data with date range)
            iframe.contentWindow.postMessage({
                type: 'APP_DETAILS',
                appId: appData.id
            }, '*');
        }
        detailsContainer.style.display = 'block';
    }

    // Clear selections
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.library-submenu-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));

    // Update nav tab
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    const libraryTab = document.querySelector('.nav-tab[data-tab="library"]');
    if (libraryTab) libraryTab.classList.add('active');

    // Focus iframe for keyboard shortcuts
    setTimeout(() => {
        const iframe = detailsContainer.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.focus();
        }
    }, 100);
}
