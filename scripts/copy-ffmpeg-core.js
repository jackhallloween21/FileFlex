const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const source = path.join(__dirname, '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'umd');
const destination = path.join(__dirname, '..', 'public', 'ffmpeg');

// 8 MiB chunk size: keeps every emitted file well below the 25MiB per-file
// limit enforced by EdgeOne Makers while remaining fully static/offline.
const CHUNK_SIZE = 8 * 1024 * 1024;
const HASH_CHUNK_SIZE = 64 * 1024;

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath, { highWaterMark: HASH_CHUNK_SIZE });
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function copyFfmpegCore() {
  if (!fs.existsSync(source)) {
    throw new Error(`FFmpeg core assets not found at ${source}. Install dependencies before building.`);
  }

  fs.mkdirSync(destination, { recursive: true });

  const coreJsSource = path.join(source, 'ffmpeg-core.js');
  if (!fs.existsSync(coreJsSource)) {
    throw new Error(`FFmpeg core script not found at ${coreJsSource}.`);
  }
  fs.copyFileSync(coreJsSource, path.join(destination, 'ffmpeg-core.js'));

  const wasmSource = path.join(source, 'ffmpeg-core.wasm');
  if (!fs.existsSync(wasmSource)) {
    throw new Error(`FFmpeg wasm not found at ${wasmSource}.`);
  }

  const wasmSize = fs.statSync(wasmSource).size;
  const wasmSha256 = await hashFile(wasmSource);
  const partCount = Math.ceil(wasmSize / CHUNK_SIZE);
  const parts = Array.from({ length: partCount }, (_, index) => `ffmpeg-core.wasm.part${index}`);
  const manifestPath = path.join(destination, 'manifest.json');
  let existingManifest = null;

  if (fs.existsSync(manifestPath)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }

  const partsAreCurrent =
    wasmSize > 0 &&
    existingManifest?.wasmSize === wasmSize &&
    existingManifest?.wasmSha256 === wasmSha256 &&
    Array.isArray(existingManifest.parts) &&
    existingManifest.parts.length === parts.length &&
    existingManifest.parts.every((part, index) => part === parts[index]) &&
    parts.every((part, index) => {
      const partPath = path.join(destination, part);
      const expectedSize = Math.min(CHUNK_SIZE, wasmSize - index * CHUNK_SIZE);
      return fs.existsSync(partPath) && fs.statSync(partPath).size === expectedSize;
    });

  if (partsAreCurrent) {
    console.log(`[ffmpeg] wasm chunks are unchanged; skipped splitting under ${destination}`);
    return;
  }

  for (const entry of fs.readdirSync(destination)) {
    if (entry === 'manifest.json' || entry === 'ffmpeg-core.wasm' || entry.startsWith('ffmpeg-core.wasm.part')) {
      fs.rmSync(path.join(destination, entry), { force: true, recursive: true });
    }
  }

  if (wasmSize === 0) {
    throw new Error(`FFmpeg wasm at ${wasmSource} is empty.`);
  }

  const wasmFd = fs.openSync(wasmSource, 'r');
  try {
    for (let offset = 0, index = 0; offset < wasmSize; offset += CHUNK_SIZE, index += 1) {
      const length = Math.min(CHUNK_SIZE, wasmSize - offset);
      const chunk = Buffer.allocUnsafe(length);
      let bytesRead = 0;
      while (bytesRead < length) {
        const count = fs.readSync(wasmFd, chunk, bytesRead, length - bytesRead, offset + bytesRead);
        if (count === 0) throw new Error(`Unexpected end of FFmpeg wasm at byte ${offset + bytesRead}.`);
        bytesRead += count;
      }
      fs.writeFileSync(path.join(destination, parts[index]), chunk);
    }
  } finally {
    fs.closeSync(wasmFd);
  }

  const manifest = { wasmSize, wasmSha256, parts };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(
    `[ffmpeg] copied and split ffmpeg-core.wasm (${wasmSize} bytes) into ${parts.length} part(s) under ${destination}`
  );
}

copyFfmpegCore().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
