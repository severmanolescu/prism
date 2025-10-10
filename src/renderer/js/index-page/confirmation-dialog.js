class ConfirmationDialog {
    constructor() {
        this.overlay = null;
        this.preferences = this.loadPreferences();
    }

    loadPreferences() {
        try {
            return JSON.parse(localStorage.getItem('confirmationPreferences') || '{}');
        } catch {
            return {};
        }
    }

    savePreferences() {
        localStorage.setItem('confirmationPreferences', JSON.stringify(this.preferences));
    }

    async show(options = {}) {
        const {
            title = 'Confirm Action',
            message = 'Are you sure you want to proceed?',
            icon = '⚠️',
            iconColor = '#f39c12',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            dangerMode = false,
            showDontAskAgain = false,
            dontAskKey = null,
            extraContent = null,
            onConfirm = null,
            onCancel = null
        } = options;

        // Check if user has opted out of this type of confirmation
        if (dontAskKey && this.preferences[dontAskKey]) {
            return true;
        }

        return new Promise((resolve) => {
            this.createDialog({
                title,
                message,
                icon,
                iconColor,
                confirmText,
                cancelText,
                dangerMode,
                showDontAskAgain,
                dontAskKey,
                extraContent,
                onConfirm: (dontAskAgain) => {
                    if (dontAskAgain && dontAskKey) {
                        this.preferences[dontAskKey] = true;
                        this.savePreferences();
                    }
                    this.hide();
                    if (onConfirm) onConfirm();
                    resolve(true);
                },
                onCancel: () => {
                    this.hide();
                    if (onCancel) onCancel();
                    resolve(false);
                }
            });
        });
    }

    createDialog(options) {
        // Remove existing dialog if any
        this.hide();

        this.overlay = document.createElement('div');
        this.overlay.className = 'confirmation-overlay';

        const iconStyle = `background: linear-gradient(135deg, ${options.iconColor}, ${this.adjustBrightness(options.iconColor, -20)})`;

        const extraContentHTML = options.extraContent || '';

        const dontAskHTML = options.showDontAskAgain ? `
            <div class="dont-ask-again" id="dontAskToggle">
                <div class="dont-ask-checkbox" id="dontAskCheckbox"></div>
                <span class="dont-ask-label">Don't ask again</span>
            </div>
        ` : '';

        const confirmButtonClass = options.dangerMode ? 'btn-danger' : 'btn-confirm';

        this.overlay.innerHTML = `
            <div class="confirmation-dialog">
                <div class="confirmation-header">
                    <div class="confirmation-icon" style="${escapeHtml(iconStyle)}">${escapeHtml(options.icon)}</div>
                    <h3 class="confirmation-title">${escapeHtml(options.title)}</h3>
                </div>
                <div class="confirmation-body">
                    <div class="confirmation-message">
                        ${escapeHtml(options.message)}
                    </div>
                        ${escapeHtml(extraContentHTML)}
                        ${escapeHtml(dontAskHTML)}
                </div>
                <div class="confirmation-footer">
                    <button class="confirmation-btn btn-cancel" id="confirmCancel">${escapeHtml(options.cancelText)}</button>
                    <button class="confirmation-btn ${escapeHtml(confirmButtonClass)}" id="confirmOk">${escapeHtml(options.confirmText)}</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Set up event listeners
        const cancelBtn = this.overlay.querySelector('#confirmCancel');
        const confirmBtn = this.overlay.querySelector('#confirmOk');
        const dontAskToggle = this.overlay.querySelector('#dontAskToggle');
        const dontAskCheckbox = this.overlay.querySelector('#dontAskCheckbox');

        let dontAskAgain = false;

        if (dontAskToggle) {
            dontAskToggle.addEventListener('click', () => {
                dontAskAgain = !dontAskAgain;
                dontAskCheckbox.classList.toggle('checked', dontAskAgain);
            });
        }

        cancelBtn.addEventListener('click', options.onCancel);
        confirmBtn.addEventListener('click', () => options.onConfirm(dontAskAgain));

        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                options.onCancel();
            }
        });

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEscape);
                options.onCancel();
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Show with animation
        requestAnimationFrame(() => {
            this.overlay.classList.add('show');
        });

        // Focus the appropriate button
        if (options.dangerMode) {
            cancelBtn.focus(); // Focus cancel for dangerous actions
        } else {
            confirmBtn.focus(); // Focus confirm for normal actions
        }
    }

    hide() {
        if (this.overlay) {
            this.overlay.classList.remove('show');
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
                this.overlay = null;
            }, 300);
        }
    }

    // Helper function to adjust color brightness
    adjustBrightness(hex, percent) {
        const num = parseInt(hex.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    // Reset specific or all preferences
    resetPreferences(key = null) {
        if (key) {
            delete this.preferences[key];
        } else {
            this.preferences = {};
        }
        this.savePreferences();
    }
}

// Create global instance
window.confirmationDialog = new ConfirmationDialog();
