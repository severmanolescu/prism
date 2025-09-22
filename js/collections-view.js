function toggleView(viewType) {
    const contentArea = document.querySelector('.content-area');
    const appsGrid = document.querySelector('.apps-grid');
    
    if (!contentArea || !appsGrid) return;
    
    if (viewType === 'categories') {
        // Hide the main content and show category overview
        contentArea.style.display = 'none';
        showCategoryOverview();
    } else {
        // Show normal content
        contentArea.style.display = 'block';
        hideCategoryOverview();
        
        if (viewType === 'list') {
            appsGrid.classList.add('list-view');
        } else {
            appsGrid.classList.remove('list-view');
        }
    }
    
    console.log(`Switched to ${viewType} view`);
}


function showCategoryOverview() {
    // Remove existing category overview if it exists
    hideCategoryOverview();
    
    // Create category overview container
    const categoryOverview = document.createElement('div');
    categoryOverview.className = 'category-overview';
    categoryOverview.id = 'categoryOverview';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'collections-header';
    header.innerHTML = `
        <h2>YOUR COLLECTIONS</h2>
    `;
    categoryOverview.appendChild(header);
    
    // Group apps by category
    const appsByCategory = groupAppsByCategory(allAppsCache);
    
    // Add favorites if they exist
    if (favoritesCache.length > 0) {
        const favoriteApps = allAppsCache.filter(app => favoritesCache.includes(app.id));
        if (favoriteApps.length > 0) {
            appsByCategory['Favorites'] = favoriteApps;
        }
    }
    
    // Create category grid
    const categoryGrid = document.createElement('div');
    categoryGrid.className = 'collections-grid';
    
    // Add "Create New Collection" card first
    const createCard = document.createElement('div');
    createCard.className = 'collection-card create-card';
    createCard.innerHTML = `
        <div class="collection-card-content">
            <div class="create-icon">+</div>
            <div class="create-text">CREATE A NEW<br>COLLECTION</div>
        </div>
    `;
    categoryGrid.appendChild(createCard);
    
    // Create a category card for each category
    Object.keys(appsByCategory).sort((a, b) => {
        if (a === 'Favorites') return -1;
        if (b === 'Favorites') return 1;
        return a.localeCompare(b);
    }).forEach(categoryName => {
        const apps = appsByCategory[categoryName];
        const categoryCard = createCategoryCard(categoryName, apps);
        categoryGrid.appendChild(categoryCard);
    });
    
    categoryOverview.appendChild(categoryGrid);
    
    // Insert after main content
    const mainContent = document.querySelector('.main-content');
    mainContent.appendChild(categoryOverview);
}

function hideCategoryOverview() {
    const existing = document.getElementById('categoryOverview');
    if (existing) {
        existing.remove();
    }
}
