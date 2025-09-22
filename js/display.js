
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