// Run this to migrate existing JSON data to SQLite database
// node migrate-json-to-database.js

const fs = require('fs');
const path = require('path');

async function findJsonFiles() {
  // Common locations for Electron user data
  const possiblePaths = [
    './data',
    './user-data',
    './storage',
    path.join(__dirname, 'data'),
    path.join(__dirname, 'user-data'),
    path.join(__dirname, 'storage'),
    path.join(__dirname, 'src', 'data'),
  ];
  
  console.log('Searching for JSON data files...\n');
  
  let appDataPath = null;
  let sessionsDataPath = null;
  
  // Search for the files
  for (const basePath of possiblePaths) {
    const appPath = path.join(basePath, 'apps.json');
    const sessionsPath = path.join(basePath, 'sessions.json');
    
    if (fs.existsSync(appPath)) {
      console.log('✓ Found app-data.json at:', appPath);
      appDataPath = appPath;
    }
    
    if (fs.existsSync(sessionsPath)) {
      console.log('✓ Found sessions-data.json at:', sessionsPath);
      sessionsDataPath = sessionsPath;
    }
  }
  
  // If not found, ask user to specify
  if (!appDataPath && !sessionsDataPath) {
    console.log('\n⚠ Could not find JSON files automatically.');
    console.log('\nPlease search for these files manually:');
    console.log('  - app-data.json');
    console.log('  - sessions-data.json');
    console.log('\nSearching your project directory...\n');
    
    // Recursive search
    const searchDir = (dir, filename, results = []) => {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            searchDir(filePath, filename, results);
          } else if (file === filename) {
            results.push(filePath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
      return results;
    };
    
    const appFiles = searchDir('.', 'app-data.json');
    const sessionFiles = searchDir('.', 'sessions-data.json');
    
    if (appFiles.length > 0) {
      console.log('Found app-data.json files:');
      appFiles.forEach(f => console.log('  -', f));
      appDataPath = appFiles[0]; // Use first one found
    }
    
    if (sessionFiles.length > 0) {
      console.log('Found sessions-data.json files:');
      sessionFiles.forEach(f => console.log('  -', f));
      sessionsDataPath = sessionFiles[0]; // Use first one found
    }
  }
  
  return { appDataPath, sessionsDataPath };
}

async function migrateData() {
  console.log('=== MIGRATING JSON DATA TO DATABASE ===\n');
  
  try {
    // Find JSON files
    const { appDataPath, sessionsDataPath } = await findJsonFiles();
    
    if (!appDataPath && !sessionsDataPath) {
      console.error('\n✗ No JSON data files found!');
      console.log('\nPlease manually locate:');
      console.log('  - app-data.json');
      console.log('  - sessions-data.json');
      console.log('\nAnd place them in the project root, or specify their location.');
      return;
    }
    
    // Initialize database
    const { initDatabase, getDb } = require('./src/main/services/database');
    await initDatabase();
    
    const db = getDb();
    if (!db) {
      console.error('Failed to initialize database');
      return;
    }
    
    console.log('\n✓ Database initialized\n');
    
    // Load and migrate app data
    let appData = {};
    if (appDataPath) {
      console.log('Loading app data from:', appDataPath);
      const rawAppData = fs.readFileSync(appDataPath, 'utf8');
      appData = JSON.parse(rawAppData);
      
      const appCount = Object.keys(appData).length;
      console.log(`Found ${appCount} apps in JSON file\n`);
      
      if (appCount > 0) {
        console.log('Migrating apps to database...');
        let migratedApps = 0;
        
        for (const [appId, app] of Object.entries(appData)) {
          try {
            // Check if app already exists
            const existing = await db.get('SELECT id FROM apps WHERE id = ?', appId);
            
            if (!existing) {
              // Convert timestamps
              const firstUsed = app.createdAt ? new Date(app.createdAt).getTime() : Date.now();
              const lastUsed = app.lastUsed ? new Date(app.lastUsed).getTime() : Date.now();
              
              // Convert total time (assuming it's in seconds, convert to milliseconds)
              const totalTime = app.totalTime ? app.totalTime * 1000 : 0;
              
              await db.run(`
                INSERT INTO apps (id, name, path, executable, category, icon_path, hidden, first_used, last_used, total_time, launch_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                appId,
                app.name || 'Unknown',
                app.path || '',
                app.executable || appId,
                app.category || 'uncategorized',
                app.iconPath || null,
                0,
                firstUsed,
                lastUsed,
                totalTime,
                app.launchCount || 0
              ]);
              
              migratedApps++;
              console.log(`  ✓ ${app.name} (${Math.round(totalTime/1000)}s)`);
            } else {
              console.log(`  - Skipped (exists): ${app.name}`);
            }
          } catch (error) {
            console.error(`  ✗ Failed to migrate ${app.name}:`, error.message);
          }
        }
        
        console.log(`\n✓ Migrated ${migratedApps} apps to database\n`);
      }
    }
    
    // Load and migrate sessions data
    let sessionsData = [];
    if (sessionsDataPath) {
      console.log('Loading sessions data from:', sessionsDataPath);
      const rawSessionsData = fs.readFileSync(sessionsDataPath, 'utf8');
      sessionsData = JSON.parse(rawSessionsData);
      
      console.log(`Found ${sessionsData.length} sessions in JSON file\n`);
      
      if (sessionsData.length > 0) {
        console.log('Migrating sessions to database...');
        let migratedSessions = 0;
        
        for (const session of sessionsData) {
          try {
            const startTime = session.startTime ? new Date(session.startTime).getTime() : Date.now();
            const endTime = session.endTime ? new Date(session.endTime).getTime() : null;
            const duration = session.duration ? session.duration * 1000 : 0; // Convert to milliseconds
            
            await db.run(`
              INSERT INTO sessions (app_id, start_time, end_time, duration)
              VALUES (?, ?, ?, ?)
            `, [
              session.appId,
              startTime,
              endTime,
              duration
            ]);
            
            migratedSessions++;
            
            if (migratedSessions % 100 === 0) {
              console.log(`  Migrated ${migratedSessions} sessions...`);
            }
          } catch (error) {
            console.error(`  ✗ Failed to migrate session:`, error.message);
          }
        }
        
        console.log(`✓ Migrated ${migratedSessions} sessions to database\n`);
      }
    }
    
    // Show final stats
    console.log('=== FINAL DATABASE STATS ===');
    const finalAppCount = await db.get('SELECT COUNT(*) as count FROM apps');
    const finalSessionCount = await db.get('SELECT COUNT(*) as count FROM sessions');
    const totalTime = await db.get('SELECT SUM(total_time) as total FROM apps');
    
    console.log(`Total apps: ${finalAppCount.count}`);
    console.log(`Total sessions: ${finalSessionCount.count}`);
    console.log(`Total tracked time: ${Math.round(totalTime.total / 1000 / 60)} minutes`);
    
    console.log('\n✓ Migration complete!');
    console.log('\nNext steps:');
    console.log('1. Start your Electron app');
    console.log('2. You should now see all your tracked apps and time');
    console.log('3. New tracking will save directly to the database');
    
  } catch (error) {
    console.error('ERROR during migration:', error);
    console.error('Stack:', error.stack);
  }
}

migrateData();