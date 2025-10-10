// Handle browse templates
async function handleBrowseTemplates() {
    const api = window.electronAPI || parent.electronAPI;

    try {
        // Get templates grouped by category
        const templatesByCategory = await api.getGoalTemplatesByCategory();

        // Render templates in modal
        renderTemplates(templatesByCategory);

        // Show modal
        const modal = document.getElementById('templatesModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading templates:', error);
        showFeedback('Failed to load templates. Please try again.', false);
    }
}

// Render templates grouped by category
function renderTemplates(templatesByCategory) {
    const container = document.getElementById('templatesContainer');
    if (!container) return;

    let html = '';

    Object.keys(templatesByCategory).forEach(category => {
        const templates = templatesByCategory[category];

        html += `
      <div class="template-category">
        <h3 class="template-category-title">${category}</h3>
        <div class="template-grid">
          ${templates.map(template => createTemplateCard(template)).join('')}
        </div>
      </div>
    `;
    });

    container.innerHTML = html;

    // Attach click listeners to template cards
    container.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
            const templateId = card.dataset.templateId;
            handleAddFromTemplate(templateId);
        });
    });
}

// Create template card HTML
function createTemplateCard(template) {
    return `
    <div class="template-card" data-template-id="${template.id}">
      <div class="template-icon">${template.icon}</div>
      <div class="template-info">
        <div class="template-name">${template.name}</div>
        <div class="template-description">${template.description}</div>
        <div class="template-meta">
          <span class="template-frequency">${capitalize(template.frequency)}</span>
          <span class="template-target">${template.target_value} ${template.target_unit}</span>
        </div>
      </div>
    </div>
  `;
}

// Handle adding goal from template
async function handleAddFromTemplate(templateId) {
    const api = window.electronAPI || parent.electronAPI;
    const confirmDialog = window.confirmationDialog || parent.confirmationDialog;

    try {
        // Get the template details
        const templates = await api.getGoalTemplates();
        const template = templates.find(t => t.id === templateId);

        if (!template) {
            showFeedback('Template not found.', false);
            return;
        }

        // Confirm before adding
        const confirmed = await confirmDialog.show({
            title: 'Add Goal from Template',
            message: `Add "${template.name}" to your goals?\n\n${template.description}`,
            icon: template.icon,
            iconColor: '#66c0f4',
            confirmText: 'Add Goal',
            cancelText: 'Cancel'
        });

        if (!confirmed) return;

        // Create goal from template
        const result = await api.createGoalFromTemplate(templateId);

        if (result.success) {
            // Close templates modal
            closeTemplatesModalFunc();

            // Reload goals
            await loadGoalsForDate(currentDate);

            // Show success message
            showFeedback(`Goal "${template.name}" added successfully!`, true);
        }
    } catch (error) {
        console.error('Error adding goal from template:', error);
        showFeedback(`Failed to add goal: ${error.message}`, false);
    }
}

// Close templates modal
function closeTemplatesModalFunc() {
    const modal = document.getElementById('templatesModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Helper function to capitalize
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
