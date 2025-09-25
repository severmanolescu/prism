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
              <div class="preset-color" data-color="#4a90e2" style="background: #4a90e2;"></div>
              <div class="preset-color" data-color="#ff6b6b" style="background: #ff6b6b;"></div>
              <div class="preset-color" data-color="#a55eea" style="background: #a55eea;"></div>
              <div class="preset-color" data-color="#26de81" style="background: #26de81;"></div>
              <div class="preset-color" data-color="#fd79a8" style="background: #fd79a8;"></div>
              <div class="preset-color" data-color="#f39c12" style="background: #f39c12;"></div>
              <div class="preset-color" data-color="#e74c3c" style="background: #e74c3c;"></div>
              <div class="preset-color" data-color="#9b59b6" style="background: #9b59b6;"></div>
            </div>
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
      showDragFeedback('Please input a name!', false);
      return;
    }
    
    try {
      const result = await window.electronAPI.createCollection({
        name: name,
        color: selectedColor
      });
      
      if (result.success) {
        modal.remove();
        showCategoryOverview();
        showDragFeedback("Collection created successfully!", true)
      } else {
        showDragFeedback(result.error || 'Failed to create collection, please try again', false);
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
        if (confirm(`Delete "${collectionName}" collection? All apps will be moved to Uncategorized.`)) {
            try {
                const result = await window.electronAPI.deleteCollection(collectionName);
                if (result.success) {
                    showCategoryOverview(); // Refresh view
                    showDragFeedback("Callection deleted successfully!", true);
                } else {
                    showDragFeedback(result.error || 'Failed to delete collection', false);
                }
            } catch (error) {
                console.error('Error deleting collection:', error);
                showDragFeedback('Failed to delete collection');
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
                <div class="preset-color" data-color="#4a90e2" style="background: #4a90e2;"></div>
                <div class="preset-color" data-color="#ff6b6b" style="background: #ff6b6b;"></div>
                <div class="preset-color" data-color="#a55eea" style="background: #a55eea;"></div>
                <div class="preset-color" data-color="#26de81" style="background: #26de81;"></div>
                <div class="preset-color" data-color="#fd79a8" style="background: #fd79a8;"></div>
                <div class="preset-color" data-color="#f39c12" style="background: #f39c12;"></div>
                <div class="preset-color" data-color="#e74c3c" style="background: #e74c3c;"></div>
                <div class="preset-color" data-color="#9b59b6" style="background: #9b59b6;"></div>
              </div>
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
          color: selectedColor
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