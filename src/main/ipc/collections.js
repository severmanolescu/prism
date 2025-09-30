const { ipcMain } = require('electron');
const {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  moveAppToCategory
} = require('../services/data-access');

function initializeCollectionHandlers() {
  ipcMain.handle('get-categories', async () => {
    const categories = await getAllCategories();
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      isDefault: cat.is_default === 1,
      createdAt: cat.created_at
    }));
  });

  ipcMain.handle('create-collection', async (event, collectionData) => {
    try {
      const id = collectionData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      await createCategory({
        id,
        name: collectionData.name,
        color: collectionData.color || '#092442',
        icon: collectionData.icon || '📁'
      });
      return { success: true };
    } catch (error) {
      console.error('Error creating collection:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('edit-collection', async (event, categoryId, newData) => {
    try {
      await updateCategory(categoryId, newData);
      return { success: true };
    } catch (error) {
      console.error('Error editing collection:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-collection', async (event, categoryName) => {
    try {
      await deleteCategory(categoryName);
      return { success: true };
    } catch (error) {
      console.error('Error deleting collection:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('move-app-to-collection', async (event, appId, category) => {
    try {
      await moveAppToCategory(appId, category);
      return { success: true };
    } catch (error) {
      console.error('Error moving app:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { initializeCollectionHandlers };