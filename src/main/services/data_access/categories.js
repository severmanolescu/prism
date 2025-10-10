const { getDb } = require('../database');

// Get all categories
function getAllCategories() {
    const db = getDb();
    return db.prepare('SELECT * FROM categories ORDER BY name').all();
}

// Create category
function createCategory(category) {
    const db = getDb();
    const { id, name, color, icon, productivityLevel } = category;

    return db.prepare(`
    INSERT INTO categories (id, name, color, icon, productivity_level, is_default, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).run([id, name, color, icon, productivityLevel || 'neutral', Date.now()]);
}

// Update category
function updateCategory(categoryId, updates) {
    const db = getDb();
    const { name, color, icon, productivityLevel, sortPreference } = updates;

    // If name is being changed, we need to update apps table as well
    if (name) {
        // Get the old category name first
        const oldCategory = db.prepare('SELECT name FROM categories WHERE id = ?').get(categoryId);

        if (oldCategory) {
            // Update all apps that reference the old category name
            db.prepare(`
        UPDATE apps
        SET category = ?
        WHERE category = ?
      `).run([name, oldCategory.name]);
        }
    }

    return db.prepare(`
    UPDATE categories
    SET name = COALESCE(?, name),
        color = COALESCE(?, color),
        icon = COALESCE(?, icon),
        productivity_level = COALESCE(?, productivity_level),
        sort_preference = COALESCE(?, sort_preference)
    WHERE id = ?
  `).run([name, color, icon, productivityLevel, sortPreference, categoryId]);
}

// Update category sort preference
function updateCategorySortPreference(categoryName, sortPreference) {
    const db = getDb();
    return db.prepare(`
    UPDATE categories
    SET sort_preference = ?
    WHERE name = ?
  `).run([sortPreference, categoryName]);
}

// Delete category (moves apps to uncategorized)
function deleteCategory(categoryId) {
    const db = getDb();

    // Get the category name first (needed to update apps)
    const category = db.prepare('SELECT name FROM categories WHERE id = ?').get(categoryId);

    if (category) {
        // Move apps to uncategorized using the category name
        db.prepare(
            'UPDATE apps SET category = ? WHERE category = ?'
        ).run(['uncategorized', category.name]);
    }

    // Delete category by id
    return db.prepare(
        'DELETE FROM categories WHERE id = ? AND is_default = 0'
    ).run(categoryId);
}

// Move app to category
function moveAppToCategory(appId, categoryId) {
    const db = getDb();
    return db.prepare(
        'UPDATE apps SET category = ? WHERE id = ?'
    ).run([categoryId, appId]);
}

module.exports = {
    getAllCategories,
    createCategory,
    updateCategory,
    updateCategorySortPreference,
    deleteCategory,
    moveAppToCategory
}