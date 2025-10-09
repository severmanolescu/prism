// Display all apps
async function displayAllApps(apps) {
    const appsContainer = document.querySelector('.apps-grid');
    const sectionHeader = document.querySelector('.all-apps-section .section-header');
    const allAppsSection = document.querySelector('.all-apps-section');
    const recentSection = document.querySelector('.recent-section');
    const categoryOverview = document.querySelector('.category-overview');
    const detailsIframe = document.querySelector('.app-details-iframe-wrapper');

    // Show all apps section and recent section, hide others
    if (allAppsSection) allAppsSection.style.display = 'block';
    if (recentSection) recentSection.style.display = 'block';
    if (categoryOverview) categoryOverview.style.display = 'none';
    if (detailsIframe) detailsIframe.style.display = 'none';

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

    // Show apps grouped by categories (either all categories or just the selected one)
    if (currentCategory === 'All Apps' || (currentCategory !== 'Favorites' && currentCategory !== 'Hidden')) {
        // Hide the section header when showing categorized view
        if (sectionHeader) {
            sectionHeader.style.display = 'none';
        }
        
        // Change the apps-grid to not use CSS grid when showing categories
        appsContainer.classList.add('categorized-view');
        
        const appsByCategory = await groupAppsByCategory(apps);
        
        // Display each category with its apps
        Object.keys(appsByCategory).forEach(categoryName => {
            const categoryApps = appsByCategory[categoryName];

            if(categoryApps.apps.length != 0){
                // Create category section wrapper
                const categorySection = document.createElement('div');
                categorySection.className = 'category-section';
                
                // Get sort preference from category data or default to name-asc
                const sortPreference = categoryApps.sortPreference || 'name-asc';

                // Determine if we should show the category productivity dropdown
                // Only show when viewing a specific category (not when viewing "All Apps")
                const showProductivityDropdown = currentCategory !== 'All Apps';
                const categoryProductivity = categoryApps.productivity_level || 'neutral';

                // Create category header with collapse toggle and sort dropdown
                const categoryHeader = document.createElement('div');
                categoryHeader.className = 'category-header';
                categoryHeader.innerHTML = `
                    <div class="category-header-content">
                        <div class="category-title">
                            <span class="category-icon">${getCategoryIcon(categoryName)}</span>
                            <h3>${categoryName} <span class="category-app-count">(${categoryApps.apps.length})</span></h3>
                            ${showProductivityDropdown ? `
                                <div class="category-productivity-dropdown" data-category="${escapeHtml(categoryName)}">
                                    <label class="productivity-label">Productivity:</label>
                                    <select class="category-productivity-select">
                                        <option value="productive" ${categoryProductivity === 'productive' ? 'selected' : ''}>✅ Productive</option>
                                        <option value="neutral" ${categoryProductivity === 'neutral' ? 'selected' : ''}>⚪ Neutral</option>
                                        <option value="unproductive" ${categoryProductivity === 'unproductive' ? 'selected' : ''}>❌ Unproductive</option>
                                    </select>
                                </div>
                            ` : ''}
                        </div>
                        <div class="category-header-actions">
                            <div class="category-sort-dropdown" data-category="${escapeHtml(categoryName)}">
                                <label class="sort-label">Sort by:</label>
                                <select class="category-sort-btn">
                                    <option value="name-asc" ${sortPreference === 'name-asc' ? 'selected' : ''}>Name (A-Z)</option>
                                    <option value="name-desc" ${sortPreference === 'name-desc' ? 'selected' : ''}>Name (Z-A)</option>
                                    <option value="time-desc" ${sortPreference === 'time-desc' ? 'selected' : ''}>Most Used</option>
                                    <option value="time-asc" ${sortPreference === 'time-asc' ? 'selected' : ''}>Least Used</option>
                                    <option value="recent" ${sortPreference === 'recent' ? 'selected' : ''}>Recently Used</option>
                                </select>
                            </div>
                            <button class="category-section-toggle" data-category="${escapeHtml(categoryName)}">
                                <svg width="12" height="12" viewBox="0 0 12 12">
                                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
                categorySection.appendChild(categoryHeader);

                // Sort apps according to preference
                const sortedApps = sortCategoryApps(categoryApps.apps, sortPreference);

                // Create grid for this category's apps
                const categoryGrid = document.createElement('div');
                categoryGrid.className = 'category-apps-grid';
                categoryGrid.dataset.category = categoryName;

                sortedApps.forEach((app, index) => {
                    const appItem = createAppElement(app, appsByCategory[categoryName].color);
                    categoryGrid.appendChild(appItem);
                });
                
                categorySection.appendChild(categoryGrid);
                appsContainer.appendChild(categorySection);

                // Restore collapsed state from localStorage
                const collapsedSections = JSON.parse(localStorage.getItem('collapsed-home-sections') || '[]');
                if (collapsedSections.includes(categoryName)) {
                    categorySection.classList.add('collapsed');
                    categoryGrid.style.maxHeight = '0';
                    const toggleBtn = categorySection.querySelector('.category-section-toggle');
                    if (toggleBtn) toggleBtn.classList.add('collapsed');
                }

                // Don't set maxHeight initially for expanded sections - let it be 'none' for proper display
                // maxHeight will only be set during collapse/expand animations
            }
        });

        // Apply saved grid size preference after all categories are rendered
        if (window.homeToolbar && window.homeToolbar.applyGridSize) {
            window.homeToolbar.applyGridSize();
        }
    } else {
        // For Favorites and Hidden views, remove categorized view class
        appsContainer.classList.remove('categorized-view');

        bgColor = await getCategoryColor(currentCategory);

        // Show the category name as section header
        if (sectionHeader) {
            sectionHeader.style.display = 'block';
            const categoryIcon = getCategoryIcon(currentCategory);
            sectionHeader.innerHTML = `${categoryIcon} ${currentCategory}`;
        }
        
        // Show apps in a regular grid without individual category headers
        apps.forEach((app) => {
            const appItem = createAppElement(app, bgColor);
            appsContainer.appendChild(appItem);
        });
    }
}

// Display recent apps
async function displayRecentApps(apps) {
    const recentContainer = document.querySelector('.recent-games');
    if (!recentContainer) {
        console.error('Recent container not found!');
        return;
    }
    
    recentContainer.innerHTML = '';
    
    if (!apps || apps.length === 0) {
        console.log('No recent apps to display');
        recentContainer.innerHTML = '<p style="color: #8f98a0; padding: 20px; text-align: center;">No recent apps found</p>';
        return;
    }

    for (const app of apps) {
        const color = await getCategoryColor(app.category || 'Uncategorized');
        const appItem = createRecentAppElement(app, color);
        recentContainer.appendChild(appItem);
    }
}

// Re-sort a specific category without refreshing the entire page
function resortCategory(categoryName, sortType) {
    // Find the category section
    const categorySection = document.querySelector(`.category-section .category-header-content .category-title h3`);
    if (!categorySection) return;

    // Find the specific category section by matching the category name
    const allSections = document.querySelectorAll('.category-section');
    let targetSection = null;

    allSections.forEach(section => {
        const titleElement = section.querySelector('.category-title h3');
        if (titleElement && titleElement.textContent.includes(categoryName)) {
            targetSection = section;
        }
    });

    if (!targetSection) return;

    // Get the category grid
    const categoryGrid = targetSection.querySelector('.category-apps-grid');
    if (!categoryGrid) return;

    // Get all apps from this category from the cache
    const categoryApps = allAppsCache.filter(app => app.category === categoryName);

    // Sort the apps
    const sortedApps = sortCategoryApps(categoryApps, sortType);

    // Get the current scroll position
    const scrollTop = document.querySelector('.content-area')?.scrollTop || 0;

    // Clear and repopulate the grid
    categoryGrid.innerHTML = '';

    // Get category color
    const getCategoryColor = async (category) => {
        const categories = await window.electronAPI.getCategories();
        const cat = categories.find(c => c.name === category);
        return cat?.color || '#092442';
    };

    getCategoryColor(categoryName).then(color => {
        sortedApps.forEach(app => {
            const appItem = createAppElement(app, color);
            categoryGrid.appendChild(appItem);
        });

        // Restore scroll position
        requestAnimationFrame(() => {
            const contentArea = document.querySelector('.content-area');
            if (contentArea) {
                contentArea.scrollTop = scrollTop;
            }
        });

        // Update maxHeight for animation
        requestAnimationFrame(() => {
            categoryGrid.style.maxHeight = categoryGrid.scrollHeight + 'px';
        });
    });

    // Update the select value
    const sortSelect = targetSection.querySelector('.category-sort-btn');
    if (sortSelect) {
        sortSelect.value = sortType;
    }
}

// Sort apps based on selected criteria
function sortCategoryApps(apps, sortType) {
    const sorted = [...apps];

    switch(sortType) {
        case 'name-asc':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            sorted.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'time-desc':
            // Most used: highest time first, then by name
            sorted.sort((a, b) => {
                const aTime = a.total_time || a.totalTime || 0;
                const bTime = b.total_time || b.totalTime || 0;
                const timeDiff = bTime - aTime;
                if (timeDiff !== 0) return timeDiff;
                return a.name.localeCompare(b.name);
            });
            break;
        case 'time-asc':
            // Least used: lowest time first (excluding 0), then 0s by name
            sorted.sort((a, b) => {
                const aTime = a.total_time || a.totalTime || 0;
                const bTime = b.total_time || b.totalTime || 0;

                // If both are 0, sort by name
                if (aTime === 0 && bTime === 0) {
                    return a.name.localeCompare(b.name);
                }
                // Put 0s at the end
                if (aTime === 0) return 1;
                if (bTime === 0) return -1;

                // Otherwise sort by time ascending
                const timeDiff = aTime - bTime;
                if (timeDiff !== 0) return timeDiff;
                return a.name.localeCompare(b.name);
            });
            break;
        case 'recent':
            sorted.sort((a, b) => {
                const aTime = a.last_used ? new Date(a.last_used).getTime() : 0;
                const bTime = b.last_used ? new Date(b.last_used).getTime() : 0;
                return bTime - aTime;
            });
            break;
    }

    return sorted;
}

// Handle sort dropdown change
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('category-sort-btn')) {
        const select = e.target;
        const sortType = select.value;
        const dropdown = select.closest('.category-sort-dropdown');
        const categoryName = dropdown.dataset.category;

        // Save preference to database
        window.electronAPI.updateCategorySort(categoryName, sortType);

        // Re-sort only this category without full refresh
        resortCategory(categoryName, sortType);
    }

    // Handle category productivity change
    if (e.target.classList.contains('category-productivity-select')) {
        const select = e.target;
        const productivityLevel = select.value;
        const dropdown = select.closest('.category-productivity-dropdown');
        const categoryName = dropdown.dataset.category;

        // Update category productivity
        updateCategoryProductivityLevel(categoryName, productivityLevel);
    }
});

// Update category productivity level
async function updateCategoryProductivityLevel(categoryName, productivityLevel) {
    try {
        const categories = await window.electronAPI.getCategories();
        const category = categories.find(c => c.name === categoryName);

        if (category) {
            const result = await window.electronAPI.editCollection(category.id, {
                productivityLevel: productivityLevel
            });

            // Force reload all apps to refresh the cache
            if (typeof loadAllApps === 'function') {
                await loadAllApps();
            }

            // Reload the current view to reflect changes
            if (typeof loadAppsByCategory === 'function' && currentCategory) {
                await loadAppsByCategory(currentCategory, false);
            }
        }
    } catch (error) {
        console.error('Error updating category productivity:', error);
    }
}