// Listen for messages from app-details iframe
window.addEventListener('message', async (event) => {
    const appDetailsIframe = document.querySelector('.app-details-iframe-wrapper iframe');
    const categoryInsightsIframe = document.querySelector('.category-insights-iframe-wrapper iframe');

    // Handle messages from category insights iframe
    if (categoryInsightsIframe && event.source === categoryInsightsIframe.contentWindow) {
        if (event.data.type === 'SHOW_APP_DETAILS') {
            showAppDetails(event.data.appName);
        }
        return;
    }

    // Handle messages from app details iframe
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
    } else if (event.data.type === 'OPEN_FILE_LOCATION') {
        // Open file location
        try {
            await window.electronAPI.openFileLocation(event.data.path);
        } catch (error) {
            console.error('Error opening file location:', error);
        }
    } else if (event.data.type === 'HIDE_APP') {
        // Hide app from library
        try {
            const result = await window.electronAPI.hideAppFromLibrary(event.data.appId);
            if (result.success) {
                showFeedback('App hidden from library', true);
                allAppsCache = await window.electronAPI.getAllApps();
                await createCategoryNavigation(allAppsCache);

                // Go back to library
                const backToLibraryEvent = { data: { type: 'BACK_TO_LIBRARY' } };
                window.dispatchEvent(new MessageEvent('message', {
                    data: backToLibraryEvent.data,
                    source: appDetailsIframe.contentWindow
                }));
            }
        } catch (error) {
            console.error('Error hiding app:', error);
            showFeedback('Failed to hide app', false);
        }
    } else if (event.data.type === 'RESTORE_APP') {
        // Restore app to library
        try {
            const result = await window.electronAPI.restoreHiddenApp(event.data.appId);
            if (result.success) {
                showFeedback('App restored to library', true);
                allAppsCache = await window.electronAPI.getAllApps();
                await createCategoryNavigation(allAppsCache);
            }
        } catch (error) {
            console.error('Error restoring app:', error);
            showFeedback('Failed to restore app', false);
        }
    } else if (event.data.type === 'REMOVE_APP') {
        // Remove app from tracker
        try {
            const confirmed = await window.confirmationDialog.show({
                title: 'Remove from Tracker',
                message: `Are you sure you want to stop tracking "${event.data.appName}"? This will keep your existing data.`,
                icon: '❌',
                iconColor: '#e74c3c',
                confirmText: 'Remove',
                cancelText: 'Cancel',
                dangerMode: false
            });

            if (!confirmed) return;

            const result = await window.electronAPI.removeAppFromTracker(event.data.appId);
            if (result.success) {
                showFeedback('App removed from tracker', true);
                allAppsCache = await window.electronAPI.getAllApps();
                await createCategoryNavigation(allAppsCache);

                // Go back to library
                const backToLibraryEvent = { data: { type: 'BACK_TO_LIBRARY' } };
                window.dispatchEvent(new MessageEvent('message', {
                    data: backToLibraryEvent.data,
                    source: appDetailsIframe.contentWindow
                }));
            }
        } catch (error) {
            console.error('Error removing app:', error);
            showFeedback('Failed to remove app', false);
        }
    } else if (event.data.type === 'REMOVE_APP_PERMANENTLY') {
        // Remove app permanently
        try {
            const confirmed = await window.confirmationDialog.show({
                title: 'Permanently Delete',
                message: `Are you sure you want to permanently delete "${event.data.appName}" and ALL its data? This cannot be undone.`,
                icon: '🗑️',
                iconColor: '#c0392b',
                confirmText: 'Delete Permanently',
                cancelText: 'Cancel',
                dangerMode: true
            });

            if (!confirmed) return;

            const result = await window.electronAPI.removeAppPermanently(event.data.appId);
            if (result.success) {
                showFeedback('App permanently deleted', true);
                allAppsCache = await window.electronAPI.getAllApps();
                await createCategoryNavigation(allAppsCache);

                // Go back to library
                const backToLibraryEvent = { data: { type: 'BACK_TO_LIBRARY' } };
                window.dispatchEvent(new MessageEvent('message', {
                    data: backToLibraryEvent.data,
                    source: appDetailsIframe.contentWindow
                }));
            }
        } catch (error) {
            console.error('Error deleting app:', error);
            showFeedback('Failed to delete app', false);
        }
    } else if (event.data.type === 'MOVE_APP_TO_CATEGORY') {
        // Move app to category
        try {
            const result = await window.electronAPI.moveAppToCollection(event.data.appId, event.data.category);
            if (result.success) {
                showFeedback(`Moved to ${event.data.category}`, true);

                // Update the app in the cache
                const app = allAppsCache.find(app => app.id === event.data.appId);
                if (app) {
                    app.category = event.data.category;
                }

                // Update favorites cache
                favoritesCache = await window.electronAPI.getFavorites();

                // Refresh navigation
                await createCategoryNavigation(allAppsCache);

                // Reload app details with updated category and color
                const appDetails = await window.electronAPI.getAppDetails(event.data.appId);
                const categories = await window.electronAPI.getCategories();
                const categoryData = categories.find(cat => cat.name === event.data.category);

                // Add category color to the app details
                if (categoryData && categoryData.color) {
                    appDetails.categoryColor = categoryData.color;
                }

                const iframe = document.querySelector('#app-details-iframe');
                if (iframe) {
                    iframe.contentWindow.postMessage({
                        type: 'APP_DETAILS',
                        data: appDetails
                    }, '*');
                }
            }
        } catch (error) {
            console.error('Error moving app to category:', error);
            showFeedback('Failed to move app', false);
        }
    } else if (event.data.type === 'GET_FAVORITES') {
        // Send favorites to iframe
        try {
            const iframe = document.querySelector('#app-details-iframe');
            if (iframe) {
                iframe.contentWindow.postMessage({
                    type: 'FAVORITES_DATA',
                    favorites: favoritesCache
                }, '*');
            }
        } catch (error) {
            console.error('Error sending favorites:', error);
        }
    } else if (event.data.type === 'REQUEST_APP_DETAILS') {
        // Request app details with date range
        try {
            const appDetails = await window.electronAPI.getAppDetailsByDateRange(
                event.data.appId,
                event.data.startDate,
                event.data.endDate
            );
            const categories = await window.electronAPI.getCategories();
            const app = allAppsCache.find(a => a.id === event.data.appId);
            const categoryData = categories.find(cat => cat.name === app?.category);

            // Add category color to the app details
            if (categoryData && categoryData.color) {
                appDetails.categoryColor = categoryData.color;
            }

            const iframe = document.querySelector('#app-details-iframe');
            if (iframe) {
                iframe.contentWindow.postMessage({
                    type: 'APP_DETAILS_RESPONSE',
                    data: appDetails
                }, '*');
            }
        } catch (error) {
            console.error('Error getting app details by date range:', error);
        }
    }
});
