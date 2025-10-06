// Script to clear goals and goal_progress tables
// Run this with: node clear-goals.js

const path = require('path');
const Database = require('better-sqlite3');

// Database path
const dbPath = path.join(__dirname, 'data', 'tracker.db');

console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);

  console.log('\nClearing goal_progress table...');
  const progressResult = db.prepare('DELETE FROM goal_progress').run();
  console.log(`✓ Deleted ${progressResult.changes} records from goal_progress`);

  console.log('\nClearing goals table...');
  const goalsResult = db.prepare('DELETE FROM goals').run();
  console.log(`✓ Deleted ${goalsResult.changes} records from goals`);

  console.log('\nResetting auto-increment counters...');
  db.prepare('DELETE FROM sqlite_sequence WHERE name = "goals"').run();
  db.prepare('DELETE FROM sqlite_sequence WHERE name = "goal_progress"').run();
  console.log('✓ Counters reset');

  db.close();

  console.log('\n✅ Successfully cleared all goals data!');
  console.log('You can now restart your app and create fresh goals.');

} catch (error) {
  console.error('❌ Error clearing goals:', error.message);
  process.exit(1);
}
