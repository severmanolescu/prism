async function recalculateTimes() {
  const { initDatabase, getDb } = require('./src/main/services/database');
  await initDatabase();
  
  const db = getDb();
  const apps = await db.all('SELECT id FROM apps');
  
  for (const app of apps) {
    const result = await db.get(`
      SELECT SUM(duration) as total
      FROM sessions
      WHERE app_id = ? AND end_time IS NOT NULL
    `, app.id);
    
    const correctTotal = result.total || 0;
    
    await db.run(
      'UPDATE apps SET total_time = ? WHERE id = ?',
      [correctTotal, app.id]
    );
  }
  
  console.log(`Recalculated ${apps.length} apps`);
}

recalculateTimes();