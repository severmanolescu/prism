async function showAppDetails(appName) {
    console.log(`Opening details for: ${appName}`);
    
    // Get the app ID from the clicked element or find it
    const appData = allAppsCache.find(app => app.name === appName);
    if (!appData) {
        console.error('App not found:', appName);
        return;
    }
    
    // Fetch app details from main process
    const details = await window.electronAPI.getAppDetails(appData.id);

    // Get category color
    const categoryColor = await getCategoryColor(details.app.category);
    details.categoryColor = categoryColor;
    console.log(`Category: ${details.app.category}, Color: ${categoryColor}`);

    // Hide current content
    const recentSection = document.querySelector('.recent-section');
    const allAppsSection = document.querySelector('.all-apps-section');
    const categoryOverview = document.querySelector('.category-overview');
    const analyticsContainer = document.querySelector('.analytics-iframe-wrapper');
    const sidebar = document.querySelector('.sidebar');

    if (recentSection) recentSection.style.display = 'none';
    if (allAppsSection) allAppsSection.style.display = 'none';
    if (categoryOverview) categoryOverview.style.display = 'none';
    if (analyticsContainer) analyticsContainer.style.display = 'none';

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
        
        // Send data to iframe when it loads
        iframe.onload = () => {
            iframe.contentWindow.postMessage({
                type: 'APP_DETAILS',
                data: details
            }, '*');
        };
        
        detailsContainer.appendChild(iframe);
        
        if (mainContent) {
            mainContent.appendChild(detailsContainer);
        }
    } else {
        const iframe = detailsContainer.querySelector('iframe');
        if (iframe) {
            // If iframe already exists, just send new data
            iframe.contentWindow.postMessage({
                type: 'APP_DETAILS',
                data: details
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
}

// Listen for messages from app-details iframe
window.addEventListener('message', async (event) => {
    if (event.data.type === 'LAUNCH_APP') {
        try {
            const result = await window.electronAPI.launchApp(event.data.appId);
            if (result.success) {
                console.log('App launched successfully');
            } else {
                console.error('Failed to launch app:', result.error);
            }
        } catch (error) {
            console.error('Error launching app:', error);
        }
    } else if (event.data.type === 'TOGGLE_FAVORITE') {
        try {
            const isFavorite = favoritesCache.includes(event.data.appId);
            if (isFavorite) {
                await window.electronAPI.removeFromFavorites(event.data.appId);
                favoritesCache = favoritesCache.filter(id => id !== event.data.appId);
            } else {
                await window.electronAPI.addToFavorites(event.data.appId);
                favoritesCache.push(event.data.appId);
            }

            // Update button text in iframe
            const iframe = document.querySelector('#app-details-iframe');
            if (iframe) {
                iframe.contentWindow.postMessage({
                    type: 'FAVORITE_UPDATED',
                    isFavorite: !isFavorite
                }, '*');
            }

            // Refresh navigation
            createCategoryNavigation(allAppsCache);
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    } else if (event.data.type === 'CHECK_FAVORITE') {
        // Check if app is in favorites and send back result
        const isFavorite = favoritesCache.includes(event.data.appId);
        const iframe = document.querySelector('#app-details-iframe');
        if (iframe) {
            iframe.contentWindow.postMessage({
                type: 'FAVORITE_UPDATED',
                isFavorite: isFavorite
            }, '*');
        }
    } else if (event.data.type === 'BACK_TO_LIBRARY') {
        // Show sidebar again
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.display = 'flex';
        }

        // Restore main content margin
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.marginLeft = '240px';
        }

        // Hide app details iframe
        const detailsContainer = document.querySelector('.app-details-iframe-wrapper');
        if (detailsContainer) {
            detailsContainer.style.display = 'none';
        }

        // Show library content again
        const recentSection = document.querySelector('.recent-section');
        const allAppsSection = document.querySelector('.all-apps-section');
        const categoryOverview = document.querySelector('.category-overview');

        if (recentSection) recentSection.style.display = 'block';
        if (allAppsSection) allAppsSection.style.display = 'block';
        if (categoryOverview) categoryOverview.style.display = 'grid';
    }
});