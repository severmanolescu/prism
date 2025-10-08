// Keyboard shortcuts help modal
(function() {
    // Create help modal HTML
    const helpModalHTML = `
        <div id="keyboardHelpModal" class="keyboard-help-modal" style="display: none;">
            <div class="keyboard-help-overlay"></div>
            <div class="keyboard-help-content">
                <div class="keyboard-help-header">
                    <h2>⌨️ Keyboard Shortcuts</h2>
                    <button class="keyboard-help-close" id="closeKeyboardHelp">&times;</button>
                </div>
                <div class="keyboard-help-body">
                    <div class="shortcut-section">
                        <h3 class="shortcut-header">Navigation</h3>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>1</kbd>
                                <span>Home / Library</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>2</kbd>
                                <span>Analytics</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>3</kbd>
                                <span>Productivity</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>4</kbd>
                                <span>Goals</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>5</kbd>
                                <span>Settings</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>H</kbd>
                                <span>Home View</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>C</kbd>
                                <span>Collections View</span>
                            </div>
                        </div>
                    </div>

                    <div class="shortcut-section">
                        <h3 class="shortcut-header">Search & Navigation</h3>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>F</kbd> or <kbd>/</kbd>
                                <span>Focus Search</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>↑</kbd> <kbd>↓</kbd>
                                <span>Navigate Results</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Enter</kbd>
                                <span>Open Selected</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Esc</kbd>
                                <span>Clear Search</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>G</kbd>
                                <span>Jump to Top</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Shift</kbd> + <kbd>G</kbd>
                                <span>Jump to Bottom</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>X</kbd>
                                <span>Expand/Collapse All Categories</span>
                            </div>
                        </div>
                    </div>

                    <div class="shortcut-section">
                        <h3 class="shortcut-header">Analytics & Productivity</h3>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <kbd>D</kbd>
                                <span>Today</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>W</kbd>
                                <span>Week</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>M</kbd>
                                <span>Month</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Y</kbd>
                                <span>Year</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>A</kbd>
                                <span>All Time</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>←</kbd> / <kbd>→</kbd>
                                <span>Previous/Next Period</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Shift</kbd> + <kbd>←</kbd> / <kbd>→</kbd>
                                <span>Adjust Start Date</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Alt</kbd> + <kbd>←</kbd> / <kbd>→</kbd>
                                <span>Adjust End Date</span>
                            </div>
                        </div>
                    </div>

                    <div class="shortcut-section">
                        <h3 class="shortcut-header">Goals Page</h3>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <kbd>D</kbd>
                                <span>Today</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Y</kbd>
                                <span>Yesterday</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>N</kbd>
                                <span>New Goal</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>T</kbd>
                                <span>Browse Templates</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>I</kbd>
                                <span>Expand/Colapse Insights & Analytics</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>↑</kbd> <kbd>↓</kbd>
                                <span>Navigate Goals</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Enter</kbd>
                                <span>Edit Selected Goal</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Delete</kbd> / <kbd>Backspace</kbd>
                                <span>Delete Selected Goal</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>←</kbd> / <kbd>→</kbd>
                                <span>Previous/Next Period</span>
                            </div>
                        </div>
                    </div>

                    <div class="shortcut-section">
                        <h3 class="shortcut-header">App Details Page</h3>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <kbd>D</kbd>
                                <span>Today</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>W</kbd>
                                <span>Week</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>M</kbd>
                                <span>Month</span>
                            </div>
                        </div>
                    </div>

                    <div class="shortcut-section">
                        <h3 class="shortcut-header">General</h3>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <kbd>?</kbd>
                                <span>Show This Help</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Esc</kbd>
                                <span>Close Modals</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>H</kbd>
                                <span>Go to Home View</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>C</kbd>
                                <span>Go to Collection View</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to body when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // Add modal HTML to body
        document.body.insertAdjacentHTML('beforeend', helpModalHTML);

        const modal = document.getElementById('keyboardHelpModal');
        const closeBtn = document.getElementById('closeKeyboardHelp');
        const overlay = modal.querySelector('.keyboard-help-overlay');

        // Close button
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Click overlay to close
        overlay.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Listen for ? key
        document.addEventListener('keydown', (e) => {
            // Skip if typing in input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                modal.style.display = 'flex';
            }

            // ESC to close
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
    }
})();
