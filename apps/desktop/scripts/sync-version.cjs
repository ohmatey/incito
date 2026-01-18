const fs = require('fs');
const path = require('path');

// 1. Read the new version from package.json (which npm just updated)
const packageJson = require('../package.json');
const newVersion = packageJson.version;

// 2. Path to tauri.conf.json
const tauriConfigPath = path.join(__dirname, '../src-tauri/tauri.conf.json');
const tauriConfig = require(tauriConfigPath);

// 3. Update the version in tauri.conf.json
console.log(`Syncing Tauri version to ${newVersion}...`);
tauriConfig.version = newVersion;

// 4. Write it back
fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2));
console.log('Done.');
