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
        navItem.dataset.appId = app.id;  // Make sure this line exists
        navItem.dataset.appName = app.name;  // Add this line too
        
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


function createCategoryCard(categoryName, apps) {
    const card = document.createElement('div');
    card.className = 'collection-card';
    card.dataset.category = categoryName;
    
    const bgColor = getCategoryColor(categoryName);
    
    // Determine grid layout based on number of apps
    let gridClass, maxApps, totalSlots;
    
    if (apps.length === 1) {
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
    
    // Get sample apps
    const sampleApps = apps.slice(0, maxApps);
    
    // Fill remaining slots with empty divs if needed
    const backgroundIcons = [];
    for (let i = 0; i < totalSlots; i++) {
        if (i < sampleApps.length) {
            const app = sampleApps[i];
            if (app.iconPath) {
                backgroundIcons.push(`<img src="app-icon://${app.iconPath.replace('icons/', '')}" alt="${app.name}">`);
            } else {
                backgroundIcons.push(`<span class="bg-icon">${getAppIcon(app.name, app.category)}</span>`);
            }
        } else {
            backgroundIcons.push(`<div class="bg-empty"></div>`);
        }
    }
    
    card.innerHTML = `
        <div class="collection-card-bg" style="background: ${bgColor};">
            <div class="collection-bg-icons ${gridClass}">${backgroundIcons.join('')}</div>
        </div>
        <div class="collection-card-content">
            <div class="collection-title">${categoryName.toUpperCase()}</div>
            <div class="collection-count">( ${apps.length} )</div>
        </div>
    `;
    
    // Add click handler (same as before)
    card.addEventListener('click', () => {
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