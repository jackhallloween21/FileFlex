const fs = require('fs');
const path = require('path');

const source = path.join(
  __dirname,
  '..',
  'node_modules',
  'pdfjs-dist',
  'legacy',
  'build',
  'pdf.worker.min.mjs',
);
const destination = path.join(__dirname, '..', 'public', 'pdfjs');

if (!fs.existsSync(source)) {
  throw new Error(`PDF.js worker not found at ${source}. Install dependencies before building.`);
}

fs.mkdirSync(destination, { recursive: true });
fs.copyFileSync(source, path.join(destination, 'pdf.worker.min.mjs'));
console.log(`[pdfjs] copied PDF.js worker to ${destination}`);
