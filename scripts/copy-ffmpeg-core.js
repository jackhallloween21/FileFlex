const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'umd');
const destination = path.join(__dirname, '..', 'public', 'ffmpeg');

if (!fs.existsSync(source)) {
  throw new Error(`FFmpeg core assets not found at ${source}. Install dependencies before building.`);
}

fs.mkdirSync(destination, { recursive: true });
fs.cpSync(source, destination, { recursive: true });
