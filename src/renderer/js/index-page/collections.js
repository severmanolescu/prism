function showCreateCollectionModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content collection-modal">
      <div class="modal-header">
        <h3>Create New Collection</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Collection Name</label>
          <input type="text" id="collectionName" placeholder="Enter collection name..." maxlength="50">
        </div>
        <div class="form-group">
          <label>Color</label>
          <div class="color-picker-container">
            <input type="color" id="colorPicker" value="#4a90e2" class="color-input">
            <div class="color-preview" id="colorPreview"></div>
            <div class="preset-colors">
              <!-- Blues / Purples -->
              <div class="preset-color" data-color="#4a90e2" style="background: #4a90e2;"></div>
              <div class="preset-color" data-color="#3498db" style="background: #3498db;"></div>
              <div class="preset-color" data-color="#9b59b6" style="background: #9b59b6;"></div>
              <div class="preset-color" data-color="#a55eea" style="background: #a55eea;"></div>

              <!-- Greens / Teals -->
              <div class="preset-color" data-color="#26de81" style="background: #26de81;"></div>
              <div class="preset-color" data-color="#2ecc71" style="background: #2ecc71;"></div>
              <div class="preset-color" data-color="#1abc9c" style="background: #1abc9c;"></div>
              <div class="preset-color" data-color="#16a085" style="background: #16a085;"></div>

              <!-- Oranges / Reds -->
              <div class="preset-color" data-color="#f39c12" style="background: #f39c12;"></div>
              <div class="preset-color" data-color="#e67e22" style="background: #e67e22;"></div>
              <div class="preset-color" data-color="#e74c3c" style="background: #e74c3c;"></div>
              <div class="preset-color" data-color="#c0392b" style="background: #c0392b;"></div>

              <!-- Pinks / Accents -->
              <div class="preset-color" data-color="#fd79a8" style="background: #fd79a8;"></div>
              <div class="preset-color" data-color="#ff6b6b" style="background: #ff6b6b;"></div>
              <div class="preset-color" data-color="#d35400" style="background: #d35400;"></div>
              <div class="preset-color" data-color="#8e44ad" style="background: #8e44ad;"></div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Productivity Level</label>
          <div class="productivity-selector">
            <button type="button" class="productivity-btn" data-level="productive">
              <span class="productivity-icon">✅</span>
              <span>Productive</span>
            </button>
            <button type="button" class="productivity-btn active" data-level="neutral">
              <span class="productivity-icon">⚪</span>
              <span>Neutral</span>
            </button>
            <button type="button" class="productivity-btn" data-level="unproductive">
              <span class="productivity-icon">❌</span>
              <span>Unproductive</span>
            </button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-cancel">Cancel</button>
        <button class="btn btn-primary" id="createCollectionBtn">Create Collection</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const colorPicker = modal.querySelector('#colorPicker');
  const colorPreview = modal.querySelector('#colorPreview');
  let selectedColor = '#4a90e2';
  let selectedProductivityLevel = 'neutral';

  // Update preview
  function updateColorPreview(color) {
    selectedColor = color;
    colorPreview.style.background = color;
    colorPicker.value = color;
  }

  updateColorPreview(selectedColor);

  // Handle color picker change
  colorPicker.addEventListener('input', (e) => {
    updateColorPreview(e.target.value);
  });

  // Handle preset color clicks
  modal.querySelectorAll('.preset-color').forEach(preset => {
    preset.onclick = () => {
      updateColorPreview(preset.dataset.color);
    };
  });

  // Handle productivity level selection
  modal.querySelectorAll('.productivity-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.productivity-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedProductivityLevel = btn.dataset.level;
    };
  });
  
  // Handle modal interactions
  modal.querySelector('.modal-close').onclick = () => modal.remove();
  modal.querySelector('.btn-cancel').onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  
  // Create collection
  modal.querySelector('#createCollectionBtn').onclick = async () => {
    const name = modal.querySelector('#collectionName').value.trim();
    
    if (!name) {
      showFeedback('Please input a name!', false);
      return;
    }
    
    try {
      const result = await window.electronAPI.createCollection({
        name: name,
        color: selectedColor,
        productivityLevel: selectedProductivityLevel
      });

      if (result.success) {
        modal.remove();
        showCategoryOverview();
        showFeedback("Collection created successfully!", true);
      } else {
        showFeedback(result.error || 'Failed to create collection, please try again', false);
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      alert('Failed to create collection');
    }
  };
  
  setTimeout(() => {
    modal.querySelector('#collectionName').focus();
  }, 100);
}

class CollectionContextMenu {
    constructor() {
        this.menu = null;
        this.currentCollection = null;
        this.createMenu();
        this.init();
    }

    createMenu() {
        this.menu = document.createElement('div');
        this.menu.className = 'context-menu collection-context-menu';
        this.menu.innerHTML = `
            <div class="context-menu-item" data-action="edit">
                <span class="context-menu-icon">✏️</span>
                <span>Edit Collection</span>
            </div>
            <div class="context-menu-item" data-action="delete">
                <span class="context-menu-icon">🗑️</span>
                <span>Delete Collection</span>
            </div>
        `;
        document.body.appendChild(this.menu);
    }

    init() {
        // Handle right clicks on collection cards
        document.addEventListener('contextmenu', (e) => {
            const collectionCard = e.target.closest('.collection-card:not(.create-card)');
            if (collectionCard) {
                e.preventDefault();
                this.show(e, collectionCard);
            } else if (!e.target.closest('.context-menu')) {
                this.hide();
            }
        });

        // Hide on outside click
        document.addEventListener('click', (e) => {
            if (!this.menu.contains(e.target)) {
                this.hide();
            }
        });

        // Handle menu clicks
        this.menu.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.context-menu-item');
            if (menuItem) {
                const action = menuItem.dataset.action;
                this.handleAction(action);
                this.hide();
            }
        });
    }

    show(event, collectionCard) {
        const categoryName = collectionCard.dataset.category;
        this.currentCollection = { name: categoryName, element: collectionCard };

        // Position menu
        const x = event.clientX;
        const y = event.clientY;
        
        this.menu.classList.add('show');
        
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

        // Update menu items based on collection
        this.updateMenuItems();
    }

    hide() {
        this.menu.classList.remove('show');
        this.currentCollection = null;
    }

    updateMenuItems() {
        const deleteItem = this.menu.querySelector('[data-action="delete"]');
        
        // Disable delete for default categories like Uncategorized
        if (this.currentCollection && this.currentCollection.name === 'Uncategorized') {
            deleteItem.classList.add('disabled');
        } else {
            deleteItem.classList.remove('disabled');
        }
    }

    async handleAction(action) {
        if (!this.currentCollection) return;

        const collectionName = this.currentCollection.name;

        switch (action) {
            case 'edit':
                await this.editCollection(collectionName);
                break;
            case 'delete':
                if (collectionName !== 'Uncategorized') {
                    await this.deleteCollection(collectionName);
                }
                break;
        }
    }

  async editCollection(collectionName) {
    const categories = await window.electronAPI.getCategories();
    const currentCategory = categories.find(cat => cat.name === collectionName);
    
    if (!currentCategory) return;

    const success = await showEditCollectionModal(currentCategory);
    
    if (success) {
        // Reload app data to get updated categories
        await loadAppData();
        // Then refresh the collections view
        showCategoryOverview();
    }
  }

    async deleteCollection(collectionName) {

        const confirmed = await window.confirmationDialog.show({
          title: 'Delete Collection',
          message: `Are you sure you want to delete "${collectionName}"? All apps will be moved to Uncategorized.`,
          icon: '🗑️',
          iconColor: '#e74c3c',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          dangerMode: true
      });

      if (confirmed) {
            try {
                const result = await window.electronAPI.deleteCollection(collectionName);
                if (result.success) {
                    // Refresh navigation to remove deleted category
                    const allApps = await window.electronAPI.getAllApps();
                    allAppsCache = allApps;
                    await createCategoryNavigation(allApps);

                    showCategoryOverview(); // Refresh view
                  showFeedback("Collection deleted successfully!", true);
                } else {
                  showFeedback(result.error || 'Failed to delete collection', false);
                }
            } catch (error) {
                console.error('Error deleting collection:', error);
              showFeedback('Failed to delete collection');
            }
        }
    }
}

function showEditCollectionModal(category) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content collection-modal">
        <div class="modal-header">
          <h3>Edit Collection</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Collection Name</label>
            <input type="text" id="collectionName" value="${category.name}" maxlength="50">
          </div>
          <div class="form-group">
            <label>Color</label>
            <div class="color-picker-container">
              <input type="color" id="colorPicker" value="${category.color}" class="color-input">
              <div class="color-preview" id="colorPreview"></div>
                <div class="preset-colors">
                  <!-- Blues / Purples -->
                  <div class="preset-color" data-color="#4a90e2" style="background: #4a90e2;"></div>
                  <div class="preset-color" data-color="#3498db" style="background: #3498db;"></div>
                  <div class="preset-color" data-color="#9b59b6" style="background: #9b59b6;"></div>
                  <div class="preset-color" data-color="#a55eea" style="background: #a55eea;"></div>

                  <!-- Greens / Teals -->
                  <div class="preset-color" data-color="#26de81" style="background: #26de81;"></div>
                  <div class="preset-color" data-color="#2ecc71" style="background: #2ecc71;"></div>
                  <div class="preset-color" data-color="#1abc9c" style="background: #1abc9c;"></div>
                  <div class="preset-color" data-color="#16a085" style="background: #16a085;"></div>

                  <!-- Oranges / Reds -->
                  <div class="preset-color" data-color="#f39c12" style="background: #f39c12;"></div>
                  <div class="preset-color" data-color="#e67e22" style="background: #e67e22;"></div>
                  <div class="preset-color" data-color="#e74c3c" style="background: #e74c3c;"></div>
                  <div class="preset-color" data-color="#c0392b" style="background: #c0392b;"></div>

                  <!-- Pinks / Accents -->
                  <div class="preset-color" data-color="#fd79a8" style="background: #fd79a8;"></div>
                  <div class="preset-color" data-color="#ff6b6b" style="background: #ff6b6b;"></div>
                  <div class="preset-color" data-color="#d35400" style="background: #d35400;"></div>
                  <div class="preset-color" data-color="#8e44ad" style="background: #8e44ad;"></div>
                </div>
            </div>
          </div>
          <div class="form-group">
            <label>Productivity Level</label>
            <div class="productivity-selector">
              <button type="button" class="productivity-btn ${category.productivity_level === 'productive' ? 'active' : ''}" data-level="productive">
                <span class="productivity-icon">✅</span>
                <span>Productive</span>
              </button>
              <button type="button" class="productivity-btn ${!category.productivity_level || category.productivity_level === 'neutral' ? 'active' : ''}" data-level="neutral">
                <span class="productivity-icon">⚪</span>
                <span>Neutral</span>
              </button>
              <button type="button" class="productivity-btn ${category.productivity_level === 'unproductive' ? 'active' : ''}" data-level="unproductive">
                <span class="productivity-icon">❌</span>
                <span>Unproductive</span>
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel">Cancel</button>
          <button class="btn btn-primary" id="saveCollectionBtn">Save Changes</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const colorPicker = modal.querySelector('#colorPicker');
    const colorPreview = modal.querySelector('#colorPreview');
    let selectedColor = category.color;
    let selectedProductivityLevel = category.productivity_level || 'neutral';

    function updateColorPreview(color) {
      selectedColor = color;
      colorPreview.style.background = color;
      colorPicker.value = color;
    }

    updateColorPreview(selectedColor);

    colorPicker.addEventListener('input', (e) => updateColorPreview(e.target.value));

    modal.querySelectorAll('.preset-color').forEach(preset => {
      preset.onclick = () => updateColorPreview(preset.dataset.color);
    });

    // Handle productivity level selection
    modal.querySelectorAll('.productivity-btn').forEach(btn => {
      btn.onclick = () => {
        modal.querySelectorAll('.productivity-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedProductivityLevel = btn.dataset.level;
      };
    });
    
    // Close handlers
    const closeModal = (success = false) => {
      modal.remove();
      resolve(success);
    };
    
    modal.querySelector('.modal-close').onclick = () => closeModal(false);
    modal.querySelector('.btn-cancel').onclick = () => closeModal(false);
    modal.onclick = (e) => {
      if (e.target === modal) closeModal(false);
    };
    
    // Save handler
    modal.querySelector('#saveCollectionBtn').onclick = async () => {
      const newName = modal.querySelector('#collectionName').value.trim();
      
      if (!newName) {
        alert('Please enter a collection name');
        return;
      }
      
      try {
        const result = await window.electronAPI.editCollection(category.id, {
          name: newName,
          color: selectedColor,
          productivityLevel: selectedProductivityLevel
        });

        if (result.success) {
          closeModal(true);
        } else {
          alert(result.error || 'Failed to edit collection');
        }
      } catch (error) {
        console.error('Error editing collection:', error);
        alert('Failed to edit collection');
      }
    };
    
    setTimeout(() => {
      modal.querySelector('#collectionName').focus();
    }, 100);
  });
}