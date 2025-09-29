const { ipcMain } = require('electron');
const dataStorage = require('../services/data-storage');

function initializeCollectionHandlers() {
  ipcMain.handle('get-categories', () => {
    const categories = dataStorage.categoriesData;
    return categories || [];
  });

  ipcMain.handle('create-collection', (event, collectionData) => {
    console.log(collectionData.color);
    const result = dataStorage.addCategory(collectionData.name, collectionData.color);
    return result;
  });

  ipcMain.handle('edit-collection', (event, categoryId, newData) => {
    const category = dataStorage.categoriesData.find(cat => cat.id === categoryId);
    
    if (!category) {
      return { success: false, error: 'Category not found' };
    }
    
    const oldName = category.name;
    
    category.name = newData.name;
    category.color = newData.color;
    
    Object.keys(dataStorage.appData).forEach(appId => {
      if (dataStorage.appData[appId].category === oldName) {
        dataStorage.appData[appId].category = newData.name;
      }
    });
    
    dataStorage.saveAppData();
    dataStorage.saveCategoriesData();
    
    return { success: true };
  });

  ipcMain.handle('delete-collection', (event, categoryName) => {
    const categoryIndex = dataStorage.categoriesData.findIndex(cat => cat.name === categoryName);
    
    if (categoryIndex === -1) {
      return { success: false, error: 'Category not found' };
    }
    
    const category = dataStorage.categoriesData[categoryIndex];
    
    if (category.isDefault) {
      return { success: false, error: 'Cannot delete default category' };
    }
    
    Object.keys(dataStorage.appData).forEach(appId => {
      if (dataStorage.appData[appId].category === categoryName) {
        dataStorage.appData[appId].category = 'Uncategorized';
      }
    });
    
    dataStorage.categoriesData.splice(categoryIndex, 1);
    
    dataStorage.saveAppData();
    dataStorage.saveCategoriesData();
    
    return { success: true };
  });

  ipcMain.handle('move-app-to-collection', (event, appId, newCategory) => {
    if (dataStorage.appData[appId]) {
      dataStorage.appData[appId].category = dataStorage.validateCategory(newCategory);
      dataStorage.saveAppData();
      return { success: true };
    }
    return { success: false, error: 'App not found' };
  });
}

module.exports = { initializeCollectionHandlers };