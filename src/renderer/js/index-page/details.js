// Listen for messages from app-details iframe
window.addEventListener('message', async (event) => {
    const appDetailsIframe = document.querySelector('.app-details-iframe-wrapper iframe');
    if (!appDetailsIframe || event.source !== appDetailsIframe.contentWindow) {
        return;
    }

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
            const favoriteIds = favoritesCache.map(app => app.id);
            const isFavorite = favoriteIds.includes(event.data.appId);
            if (isFavorite) {
                await window.electronAPI.removeFromFavorites(event.data.appId);
                favoritesCache = await window.electronAPI.getFavorites();
            } else {
                await window.electronAPI.addToFavorites(event.data.appId);
                favoritesCache = await window.electronAPI.getFavorites();
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
        const favoriteIds = favoritesCache.map(app => app.id);
        const isFavorite = favoriteIds.includes(event.data.appId);
        const iframe = document.querySelector('#app-details-iframe');
        if (iframe) {
            iframe.contentWindow.postMessage({
                type: 'FAVORITE_UPDATED',
                isFavorite: isFavorite
            }, '*');
        }
    } else if (event.data.type === 'SET_PRODUCTIVITY_LEVEL') {
        // Handle productivity level update from iframe
        try {
                await window.electronAPI.setAppProductivityOverride(
                    event.data.appId,
                    event.data.level === 'inherit' ? null : event.data.level
            );
        } catch (error) {
            console.error('Parent: Error setting productivity level:', error);
        }
    } else if (event.data.type === 'GET_PRODUCTIVITY_DATA') {
        // Send productivity data back to iframe
        try {
            const appData = await window.electronAPI.getAppById(event.data.appId);
            const categories = await window.electronAPI.getCategories();

            const iframe = document.querySelector('#app-details-iframe');
            if (iframe) {
                iframe.contentWindow.postMessage({
                    type: 'PRODUCTIVITY_DATA',
                    appData: appData,
                    categories: categories
                }, '*');
            }
        } catch (error) {
            console.error('Parent: Error getting productivity data:', error);
        }
    } else if (event.data.type === 'GET_CATEGORIES') {
        // Send categories back to iframe
        try {
            const categories = await window.electronAPI.getCategories();

            const iframe = document.querySelector('#app-details-iframe');
            if (iframe) {
                iframe.contentWindow.postMessage({
                    type: 'CATEGORIES_DATA',
                    categories: categories
                }, '*');
            }
        } catch (error) {
            console.error('Parent: Error getting categories:', error);
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