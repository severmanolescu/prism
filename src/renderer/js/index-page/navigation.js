
// Create navigation sections based on app categories
async function createCategoryNavigation(apps) {    
    const libraryNav = document.querySelector('.library-nav');
    if (!libraryNav) {
        console.error('Library nav container not found!');
        return;
    }
    
    // Clear existing navigation
    libraryNav.innerHTML = '';
    
    // Create favorites section first if there are any favorites
    if (favoritesCache.length > 0) {
        const favoriteIds = favoritesCache.map(app => app.id);
        const favoriteApps = apps.filter(app => favoriteIds.includes(app.id));
        if (favoriteApps.length > 0) {
            const favoritesSection = createNavSection('Favorites', favoriteApps, true);
            libraryNav.appendChild(favoritesSection);
        }
    }
    
    // Group apps by category using helper function
    const appsByCategory = await groupAppsByCategory(apps);
    
    // Create nav sections for each category
    Object.keys(appsByCategory).sort().forEach(categoryName => {
        const categoryApps = appsByCategory[categoryName];
        if(categoryApps.apps.length != 0){
            const navSection = createNavSection(categoryName, categoryApps.apps);
            libraryNav.appendChild(navSection);
        }
    });
}

// Update library title
function updateLibraryTitle(categoryName) {
    const libraryTitle = document.querySelector('.library-title');
    if (libraryTitle) {
        const icon = getCategoryIcon(categoryName);
        libraryTitle.innerHTML = `${icon} ${escapeHtml(categoryName)}`;
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

let draggedApp = null;
let collectionsOverlay = null;
let isDragging = false;

function handleDragStart(e) {
    isDragging = true;
    draggedApp = {
        id: e.target.dataset.appId,
        name: e.target.dataset.appName,
        element: e.target
    };
    
    e.target.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    
    // Delay showing overlay slightly to ensure drag is properly started
    setTimeout(() => {
        if (isDragging) {
            showCollectionsOverlay();
        }
    }, 100);
}

function handleDragEnd(e) {
    isDragging = false;
    e.target.style.opacity = '1';
    
    // Delay hiding to allow drop to complete
    setTimeout(() => {
        draggedApp = null;
        hideCollectionsOverlay();
    }, 100);
}

async function showCollectionsOverlay() {
    if (collectionsOverlay) return;
    
    collectionsOverlay = document.createElement('div');
    collectionsOverlay.className = 'collections-overlay';
    collectionsOverlay.innerHTML = `
        <div class="overlay-header">
            <h3>Drop to move to collection</h3>
        </div>
        <div class="overlay-content">
            <!-- Reuse the collections grid structure -->
            <div class="collections-grid" id="overlayCollectionsGrid">
                <!-- Collections will be populated here -->
            </div>
        </div>
    `;
    
    document.body.appendChild(collectionsOverlay);
    
    // Populate using the same logic as showCategoryOverview but without create button
    await populateOverlayCollections();
    
    setTimeout(() => {
        collectionsOverlay.classList.add('show');
    }, 10);
}

function hideCollectionsOverlay() {
    if (!collectionsOverlay) return;
    
    collectionsOverlay.classList.remove('show');
    setTimeout(() => {
        if (collectionsOverlay) {
            collectionsOverlay.remove();
            collectionsOverlay = null;
        }
    }, 300);
}

async function populateOverlayCollections() {
    const categoryGrid = document.getElementById('overlayCollectionsGrid');
    if (!categoryGrid) return;
    
    // Group apps by categories (same as in showCategoryOverview)
    const appsByCategory = await groupAppsByCategory(allAppsCache);
    
    // Add favorites if they exist
    if (favoritesCache.length > 0) {
        const favoriteIds = favoritesCache.map(app => app.id);
        const favoriteApps = allAppsCache.filter(app => favoriteIds.includes(app.id));
        if (favoriteApps.length > 0) {
            appsByCategory['Favorites'] = {
                apps: favoriteApps,
                color: '#ffd700',
                isDefault: false
            };
        }
    }
    
    // Sort categories (same logic as showCategoryOverview)
    const sortedCategories = Object.keys(appsByCategory).sort((a, b) => {
        if (a === 'Favorites') return -1;
        if (b === 'Favorites') return 1;
        if (a === 'Uncategorized') return -1;
        if (b === 'Uncategorized') return 1;
        return a.localeCompare(b);
    });
    
    // Create cards for all categories (reuse createCategoryCard but make them droppable)
    sortedCategories.forEach(categoryName => {
        const categoryData = appsByCategory[categoryName];
        const categoryCard = createDroppableCategoryCard(categoryName, categoryData.apps, categoryData.color);
        categoryGrid.appendChild(categoryCard);
    });
}

function createDroppableCategoryCard(categoryName, apps, color = '#4a90e2') {
    const card = document.createElement('div');
    card.className = 'collection-card droppable-card';
    card.dataset.category = categoryName;
    
    const bgColor = `linear-gradient(135deg, ${color} 0%, ${adjustBrightness(color, -20)} 80%)`;
    
    // Same grid logic as original createCategoryCard
    let gridClass, maxApps, totalSlots;
    
    if (apps.length === 0) {
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
    `;
    
    // Add drop handlers
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('dragenter', handleDragEnter);
    card.addEventListener('dragleave', handleDragLeave);
    card.addEventListener('drop', handleDrop);
    
    return card;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    const card = e.target.closest('.collection-card');
    if (card) {
        card.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    e.preventDefault();
    const card = e.target.closest('.collection-card');
    if (card) {
        // Only remove if we're actually leaving the card (not moving to a child element)
        const rect = card.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            card.classList.remove('drag-over');
        }
    }
}

async function handleDrop(e) {
    e.preventDefault();
    
    const collectionCard = e.target.closest('.collection-card');
    if (!collectionCard || !draggedApp) return;
    
    const targetCategory = collectionCard.dataset.category;
    collectionCard.classList.remove('drag-over');
    
    try {
        const result = await window.electronAPI.moveAppToCollection(draggedApp.id, targetCategory);
        
        if (result.success) {
            // Update app in cache
            const app = allAppsCache.find(app => app.id === draggedApp.id);
            if (app) {
                app.category = targetCategory;
            }
            
            // Refresh navigation
            createCategoryNavigation(allAppsCache);
            
            // Refresh current view based on what's displayed
            const categoryOverview = document.querySelector('.category-overview');
            const isCategoryOverviewVisible = categoryOverview && categoryOverview.style.display !== 'none';

            if (isCategoryOverviewVisible) {
                // Refresh collections view
                showCategoryOverview();
            } else if (currentCategory === 'All Apps') {
                displayAllApps(allAppsCache);
            } else if (currentCategory === 'Favorites') {
                await loadFavoriteApps();
            } else {
                await loadAppsByCategory(currentCategory);
            }
            
            showFeedback(`Moved ${draggedApp.name} to ${targetCategory}`, true);
        } else {
            showFeedback('Failed to move app', false);
        }
    } catch (error) {
        console.error('Error moving app:', error);
        showFeedback('Error moving app', false);
    }
}
