const fs = require('fs');
const path = require('path');

const SRC_SYSTEM_TYPES = path.join(__dirname, '..', 'cli', 'system-types.ts');
const DEST_SYSTEM_TYPES = path.join(__dirname, '..', '..', 'dist', 'cli', 'system-types.ts');

function copySystemTypes() {
  if (!fs.existsSync(SRC_SYSTEM_TYPES)) {
    console.error(`Source file not found: ${SRC_SYSTEM_TYPES}`);
    process.exit(1);
  }
  // Ensure dist/cli exists
  const destDir = path.dirname(DEST_SYSTEM_TYPES);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(SRC_SYSTEM_TYPES, DEST_SYSTEM_TYPES);
  console.log(`Copied system-types.ts to dist/cli/system-types.ts`);
}

copySystemTypes();
