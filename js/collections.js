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
      alert('Please enter a collection name');
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
      } else {
        alert(result.error || 'Failed to create collection');
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