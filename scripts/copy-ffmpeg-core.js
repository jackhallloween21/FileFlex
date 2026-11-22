const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'umd');
const destination = path.join(__dirname, '..', 'public', 'ffmpeg');

// 8 MiB chunk size: keeps every emitted file well below the 25MiB per-file
// limit enforced by EdgeOne Makers while remaining fully static/offline.
const CHUNK_SIZE = 8 * 1024 * 1024;

if (!fs.existsSync(source)) {
  throw new Error(`FFmpeg core assets not found at ${source}. Install dependencies before building.`);
}

fs.mkdirSync(destination, { recursive: true });

// Build hygiene: the destination is gitignored, so previous builds may have left
// an oversized monolithic wasm or stale part files behind. Remove them first.
for (const entry of fs.readdirSync(destination)) {
  if (entry === 'ffmpeg-core.wasm' || entry.startsWith('ffmpeg-core.wasm.part')) {
    fs.rmSync(path.join(destination, entry), { force: true, recursive: true });
  }
}

// ffmpeg-core.js is only ~115KB, so it is copied as a single file.
const coreJsSource = path.join(source, 'ffmpeg-core.js');
if (!fs.existsSync(coreJsSource)) {
  throw new Error(`FFmpeg core script not found at ${coreJsSource}.`);
}
fs.copyFileSync(coreJsSource, path.join(destination, 'ffmpeg-core.js'));

// ffmpeg-core.wasm is ~32MB, which exceeds the platform's 25MiB per-file limit.
// Slice it into 8MiB parts and record the layout in a manifest so the browser
// loader can reassemble the exact original bytes without hardcoded part counts.
const wasmSource = path.join(source, 'ffmpeg-core.wasm');
if (!fs.existsSync(wasmSource)) {
  throw new Error(`FFmpeg wasm not found at ${wasmSource}.`);
}

const wasm = fs.readFileSync(wasmSource);
const parts = [];

for (let offset = 0, index = 0; offset < wasm.length; offset += CHUNK_SIZE, index += 1) {
  const name = `ffmpeg-core.wasm.part${index}`;
  fs.writeFileSync(path.join(destination, name), wasm.subarray(offset, offset + CHUNK_SIZE));
  parts.push(name);
}

if (parts.length === 0) {
  throw new Error(`FFmpeg wasm at ${wasmSource} is empty.`);
}

const manifest = {
  wasmSize: wasm.length,
  parts,
};

fs.writeFileSync(path.join(destination, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `[ffmpeg] copied ffmpeg-core.js and split ffmpeg-core.wasm (${wasm.length} bytes) into ${parts.length} part(s) under ${destination}`
);
