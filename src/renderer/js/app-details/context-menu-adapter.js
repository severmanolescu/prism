/**
 * Context Menu Adapter for App Details Page
 * Adapts the existing index page context menu for use in app details
 */

class AppDetailsContextMenu {
    constructor() {
        this.menu = document.getElementById('contextMenu');
        this.optionsBtn = document.getElementById('options-btn');
        this.currentApp = null;
        this.init();
    }

    init() {
        // Setup gear icon click handler
        if (this.optionsBtn) {
            this.optionsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showFromButton(e);
            });
        }

        // Hide on click outside
        document.addEventListener('click', (e) => {
            if (!this.menu.contains(e.target) && e.target !== this.optionsBtn && !this.optionsBtn?.contains(e.target)) {
                this.hide();
            }
        });

        // Hide on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });

        // Initialize menu HTML and handlers
        this.updateContextMenuHTML();
        this.removeRedundantItems();
        this.setupSubmenuHandlers();
        this.setupMenuClickHandler();
    }

    /**
     * Remove items that are already available as buttons
     */
    removeRedundantItems() {
        // Remove favorite option since there's already a button
        const favoriteItem = this.menu.querySelector('[data-action="favorite"]');
        if (favoriteItem) {
            const separator = favoriteItem.nextElementSibling;
            favoriteItem.remove();
            // Remove the separator after it if it exists
            if (separator && separator.classList.contains('context-menu-separator')) {
                separator.remove();
            }
        }
    }

    /**
     * Setup menu item click handler
     */
    setupMenuClickHandler() {
        this.menu.addEventListener('click', (e) => {
            // Don't handle if click is on submenu content
            if (e.target.closest('.submenu')) {
                return;
            }

            const menuItem = e.target.closest('.context-menu-item');
            if (menuItem && !menuItem.classList.contains('disabled') && !menuItem.classList.contains('submenu-item')) {
                const action = menuItem.dataset.action;
                this.handleAction(action);
                this.hide();
            }
        });
    }

    /**
     * Show context menu from button click
     */
    async showFromButton(event) {
        if (!appDetails) {
            console.error('No app details available');
            return;
        }

        this.currentApp = {
            id: appDetails.app.id,
            name: appDetails.app.name,
            appName: appDetails.app.name,
            path: appDetails.app.path,
            category: appDetails.app.category
        };

        // Get button position
        const btnRect = this.optionsBtn.getBoundingClientRect();

        this.menu.style.left = '0px';
        this.menu.style.top = '0px';
        this.menu.classList.add('show');

        // Get menu dimensions and position properly
        const menuRect = this.menu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Position below and to the left of the button
        let finalX = btnRect.right - menuRect.width;
        let finalY = btnRect.bottom + 4;

        // Adjust if menu goes off screen
        if (finalX < 5) {
            finalX = 5;
        }

        if (finalY + menuRect.height > windowHeight) {
            finalY = btnRect.top - menuRect.height - 4;
        }

        this.menu.style.left = finalX + 'px';
        this.menu.style.top = finalY + 'px';

        // Update menu items based on app context
        await this.updateMenuItems();
    }

    /**
     * Hide context menu
     */
    hide() {
        this.menu.classList.remove('show');
        this.currentApp = null;
    }

    /**
     * Override handleAction to use postMessage for iframe communication
     */
    async handleAction(action) {
        if (!action || !this.currentApp) return;

        switch(action) {
            case 'open':
                window.parent.postMessage({
                    type: 'LAUNCH_APP',
                    appId: this.currentApp.id
                }, '*');
                break;
            case 'properties':
                // Call the local showProperties function
                if (typeof showProperties === 'function') {
                    await showProperties();
                }
                break;
            case 'hide':
                window.parent.postMessage({
                    type: 'HIDE_APP',
                    appId: this.currentApp.id
                }, '*');
                break;
            case 'restore':
                window.parent.postMessage({
                    type: 'RESTORE_APP',
                    appId: this.currentApp.id
                }, '*');
                break;
            case 'remove':
                window.parent.postMessage({
                    type: 'REMOVE_APP',
                    appId: this.currentApp.id,
                    appName: this.currentApp.name
                }, '*');
                break;
            case 'location':
                window.parent.postMessage({
                    type: 'OPEN_FILE_LOCATION',
                    path: this.currentApp.path
                }, '*');
                break;
            case 'remove-permanently':
                window.parent.postMessage({
                    type: 'REMOVE_APP_PERMANENTLY',
                    appId: this.currentApp.id,
                    appName: this.currentApp.name
                }, '*');
                break;
        }
    }

    /**
     * Override moveAppToCategory to use postMessage
     */
    async moveAppToCategory(newCategory) {
        if (!this.currentApp) return;

        window.parent.postMessage({
            type: 'MOVE_APP_TO_CATEGORY',
            appId: this.currentApp.id,
            category: newCategory
        }, '*');
    }

    /**
     * Override populateAddToSubmenu to request categories from parent
     */
    async populateAddToSubmenu(submenu) {
        window.parent.postMessage({
            type: 'GET_CATEGORIES'
        }, '*');

        submenu.innerHTML = '<div class="submenu-disabled">Loading...</div>';
        window.addToSubmenuElement = submenu;
    }

    /**
     * Override updateMenuItems - simplified since we removed favorites
     */
    async updateMenuItems() {
        // Nothing to update anymore since favorites is removed
    }

    /**
     * Override populateMoreOptionsSubmenu to use parent's electronAPI
     */
    async populateMoreOptionsSubmenu(submenu) {
        // We can't easily check hidden status from iframe, so just keep default
        // The parent window will handle the actual hide/restore logic
    }
}

// Extend with core UI methods from ContextMenuCore
Object.assign(AppDetailsContextMenu.prototype, ContextMenuCore);

// Listen for messages from parent window for categories data
window.addEventListener('message', (event) => {
    if (event.source !== window.parent) {
        return;
    }

    if (event.data.type === 'CATEGORIES_DATA' && window.addToSubmenuElement) {
        const submenu = window.addToSubmenuElement;
        const categories = event.data.categories;
        const contextMenu = window.appDetailsContextMenu;

        if (!contextMenu || !contextMenu.currentApp) {
            return;
        }

        const currentCategory = contextMenu.currentApp.category;
        const availableCategories = categories.filter(cat => cat.name !== currentCategory);

        if (availableCategories.length === 0) {
            submenu.innerHTML = '<div class="submenu-disabled">No other categories available</div>';
            return;
        }

        submenu.innerHTML = '';
        availableCategories.forEach(category => {
            const color = category.color || '#4a90e2';
            const div = document.createElement('div');
            div.className = 'submenu-item-option';
            div.dataset.category = category.name;
            div.innerHTML = `
                <span class="category-color" style="background-color: ${color}; width: 12px; height: 12px; border-radius: 2px; display: inline-block;"></span>
                <span>${category.name}</span>
            `;
            submenu.appendChild(div);
        });

        // Clear reference
        window.addToSubmenuElement = null;
    }
});

// Initialize context menu when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.appDetailsContextMenu = new AppDetailsContextMenu();
});
