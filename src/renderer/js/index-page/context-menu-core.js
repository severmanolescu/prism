/**
 * Context Menu Core
 * Contains menu UI logic, positioning, and display handlers
 * This file is imported by context-menu.js
 */

// Core menu display methods for ContextMenu class
const ContextMenuCore = {
    /**
     * Initialize menu HTML structure
     */
    updateContextMenuHTML() {
        const existingMenu = document.getElementById('contextMenu');
        if (!existingMenu) return;

        existingMenu.innerHTML = `
            <div class="context-menu-item" data-action="open">
                <span class="context-menu-icon">🚀</span>
                <span>Launch Application</span>
            </div>
            <div class="context-menu-item" data-action="details">
                <span class="context-menu-icon">📊</span>
                <span>View Details</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="favorite">
                <span class="context-menu-icon">⭐</span>
                <span>Add to Favorites</span>
            </div>
            <div class="context-menu-item submenu-item" data-action="add-to">
                <span class="context-menu-icon">➕</span>
                <span>Add to</span>
                <span class="submenu-arrow">▶</span>
                <div class="submenu" id="addToSubmenu"></div>
            </div>
            <div class="context-menu-item submenu-item" data-action="remove-from">
                <span class="context-menu-icon">➖</span>
                <span>Remove from</span>
                <span class="submenu-arrow">▶</span>
                <div class="submenu" id="removeFromSubmenu"></div>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item submenu-item" data-action="more-options">
                <span class="context-menu-icon">⋯</span>
                <span>More</span>
                <span class="submenu-arrow">▶</span>
                <div class="submenu" id="moreOptionsSubmenu">
                    <div class="submenu-item-option hide-restore-item" data-action="hide">
                        <span class="context-menu-icon">👁️</span>
                        <span>Hide from Library</span>
                    </div>
                    <div class="submenu-item-option" data-action="remove">
                        <span class="context-menu-icon">❌</span>
                        <span>Remove from Tracker</span>
                    </div>
                    <div class="submenu-item-option" data-action="remove-permanently">
                        <span class="context-menu-icon">🗑️</span>
                        <span>Remove Permanently</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Setup submenu hover and click handlers
     */
    setupSubmenuHandlers() {
        const submenuItems = this.menu.querySelectorAll('.submenu-item');

        submenuItems.forEach(item => {
            const submenu = item.querySelector('.submenu');

            item.addEventListener('mouseenter', () => {
                this.showSubmenu(item, submenu);
            });

            item.addEventListener('mouseleave', (e) => {
                setTimeout(() => {
                    if (!submenu.matches(':hover') && !item.matches(':hover')) {
                        this.hideSubmenu(submenu);
                    }
                }, 100);
            });

            submenu.addEventListener('mouseleave', () => {
                this.hideSubmenu(submenu);
            });

            // Add click handler for submenu items
            submenu.addEventListener('click', (e) => {
                const submenuOption = e.target.closest('.submenu-item-option');
                if (submenuOption) {
                    e.stopPropagation();
                    const action = submenuOption.dataset.action;
                    const category = submenuOption.dataset.category;

                    if (category) {
                        // Handle collection moves
                        this.moveAppToCategory(category);
                    } else {
                        // Handle other actions
                        this.handleAction(action);
                    }
                    this.hide();
                }
            });
        });
    },

    /**
     * Show submenu and populate it based on action type
     */
    async showSubmenu(parentItem, submenu) {
        const action = parentItem.dataset.action;

        if (action === 'add-to') {
            await this.populateAddToSubmenu(submenu);
        } else if (action === 'remove-from') {
            await this.populateRemoveFromSubmenu(submenu);
        } else if (action === 'more-options') {
            await this.populateMoreOptionsSubmenu(submenu);
        }

        submenu.classList.add('show');

        // Position submenu
        const parentRect = parentItem.getBoundingClientRect();
        const submenuRect = submenu.getBoundingClientRect();
        const windowWidth = window.innerWidth;

        let left = parentRect.width - 5;

        if (parentRect.right + submenuRect.width > windowWidth) {
            left = -submenuRect.width + 5;
        }

        submenu.style.left = left + 'px';
        submenu.style.top = '0px';
    },

    /**
     * Hide submenu
     */
    hideSubmenu(submenu) {
        submenu.classList.remove('show');
    },

    /**
     * Populate "More Options" submenu
     */
    async populateMoreOptionsSubmenu(submenu) {
        // Update the hide/restore option text
        try {
            const hiddenApps = await window.electronAPI.getHiddenApps();
            const isHidden = hiddenApps.some(app => app.id === this.currentApp.id);

            const hideOption = submenu.querySelector('[data-action="hide"]');
            if (hideOption) {
                const hideIcon = hideOption.querySelector('.context-menu-icon');
                const hideText = hideOption.querySelector('span:last-child');

                if (isHidden) {
                    hideIcon.textContent = '👁️';
                    hideText.textContent = 'Restore to Library';
                    hideOption.dataset.action = 'restore';
                } else {
                    hideIcon.textContent = '👁️';
                    hideText.textContent = 'Hide from Library';
                    hideOption.dataset.action = 'hide';
                }
            }
        } catch (error) {
            console.error('Error checking hidden status:', error);
        }

        // Add click handlers for submenu options
        submenu.querySelectorAll('.submenu-item-option').forEach(option => {
            // Remove existing listeners to prevent duplicates
            option.removeEventListener('click', this.handleSubmenuAction);
            option.addEventListener('click', (e) => this.handleSubmenuAction(e));
        });
    },

    /**
     * Show context menu at cursor position
     */
    async show(event, element) {
        let appName, appId;

        // Check if it's a nav item or app item
        if (element.classList.contains('nav-item') && element.closest('.nav-subitems')) {
            // It's a navigation item
            appName = element.querySelector('span:last-child')?.textContent || 'Unknown App';
            appId = element.dataset.appId;
        } else {
            // It's an app/recent item
            appName = element.querySelector('.app-item-name, .recent-item-name')?.textContent || 'Unknown App';
            appId = element.dataset.appId;
        }

        this.currentApp = {
            id: appId,
            name: appName,
            element: element
        };

        // Position the menu
        const x = event.clientX;
        const y = event.clientY;

        this.menu.style.left = '0px';
        this.menu.style.top = '0px';
        this.menu.classList.add('show');

        // Get menu dimensions and position properly
        const menuRect = this.menu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let finalX = x;
        let finalY = y;

        if (x + menuRect.width > windowWidth) {
            finalX = x - menuRect.width;
        }

        if (y + menuRect.height > windowHeight) {
            finalY = y - menuRect.height;
        }

        finalX = Math.max(5, finalX);
        finalY = Math.max(5, finalY);

        this.menu.style.left = finalX + 'px';
        this.menu.style.top = finalY + 'px';

        // Update menu items based on app context
        await this.updateMenuItems();
    },

    /**
     * Hide context menu
     */
    hide() {
        this.menu.classList.remove('show');
        this.currentApp = null;
    },

    /**
     * Update menu items based on current app state
     */
    async updateMenuItems() {
        const favoriteItem = this.menu.querySelector('[data-action="favorite"]');
        const hideItem = this.menu.querySelector('[data-action="hide"]');

        if (this.currentApp && favoriteItem) {
            const isFavorite = favoritesCache.includes(this.currentApp.id);
            const favoriteIcon = favoriteItem.querySelector('.context-menu-icon');
            const favoriteText = favoriteItem.querySelector('span:last-child');

            if (isFavorite) {
                favoriteIcon.textContent = '⭐';
                favoriteText.textContent = 'Remove from Favorites';
            } else {
                favoriteIcon.textContent = '⭐';
                favoriteText.textContent = 'Add to Favorites';
            }
        }

        // Check directly against hidden apps
        if (this.currentApp && hideItem) {
            try {
                const hiddenApps = await window.electronAPI.getHiddenApps();

                const isHidden = hiddenApps.some(app => app.id === this.currentApp.id);

                const hideIcon = hideItem.querySelector('.context-menu-icon');
                const hideText = hideItem.querySelector('span:last-child');

                if (isHidden) {
                    hideIcon.textContent = '👁️';
                    hideText.textContent = 'Restore to Library';
                    hideItem.dataset.action = 'restore';
                } else {
                    hideIcon.textContent = '👁️';
                    hideText.textContent = 'Hide from Library';
                    hideItem.dataset.action = 'hide';
                }
            } catch (error) {
                console.error('Error checking hidden status:', error);
            }
        } else {
            this.updateContextMenuHTML();
            this.setupSubmenuHandlers();

            // Try again after regenerating
            await this.updateMenuItems();
        }
    },

    /**
     * Submenu action handler
     */
    handleSubmenuAction(e) {
        const option = e.target.closest('.submenu-item-option');
        if (option) {
            const action = option.dataset.action;
            this.handleAction(action);
            this.hide();
        }
    }
};
