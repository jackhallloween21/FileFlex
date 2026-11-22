// imports
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

interface FfmpegCoreManifest {
  /** Total byte length of the original ffmpeg-core.wasm */
  wasmSize: number;
  /** Ordered list of chunk file names relative to /ffmpeg */
  parts: string[];
}

const BASE_URL = '/ffmpeg';

async function loadManifest(): Promise<FfmpegCoreManifest> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/manifest.json`, { cache: 'no-store' });
  } catch (error) {
    throw new Error(
      `Failed to fetch /ffmpeg/manifest.json: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch /ffmpeg/manifest.json: HTTP ${res.status}`);
  }

  const data: unknown = await res.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    typeof (data as FfmpegCoreManifest).wasmSize !== 'number' ||
    !Array.isArray((data as FfmpegCoreManifest).parts) ||
    !(data as FfmpegCoreManifest).parts.every((part) => typeof part === 'string')
  ) {
    throw new Error('Invalid /ffmpeg/manifest.json: expected { wasmSize: number, parts: string[] }');
  }

  return { wasmSize: (data as FfmpegCoreManifest).wasmSize, parts: (data as FfmpegCoreManifest).parts };
}

/**
 * Downloads every wasm chunk in parallel and concatenates them back into a single
 * buffer matching the original ffmpeg-core.wasm byte-for-byte.
 */
async function loadWasm(manifest: FfmpegCoreManifest): Promise<Blob> {
  const chunks: Uint8Array[] = await Promise.all(
    manifest.parts.map(async (part) => {
      const res = await fetch(`${BASE_URL}/${part}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to fetch /ffmpeg/${part}: HTTP ${res.status}`);
      }
      return new Uint8Array(await res.arrayBuffer());
    })
  );

  const merged = new Uint8Array(manifest.wasmSize);
  let offset = 0;

  for (const chunk of chunks) {
    if (offset + chunk.length > manifest.wasmSize) {
      throw new Error(
        `FFmpeg wasm chunk overflow: expected ${manifest.wasmSize} bytes, got more while merging.`
      );
    }
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  if (offset !== manifest.wasmSize) {
    throw new Error(`FFmpeg wasm size mismatch: expected ${manifest.wasmSize} bytes, got ${offset} bytes.`);
  }

  return new Blob([merged], { type: 'application/wasm' });
}

export default async function loadFfmpeg(): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();
  // Served locally from /public/ffmpeg so the app works fully offline.
  // The wasm is stored as 8MiB chunks (platform per-file limit is 25MiB) and is
  // reassembled in the browser into a blob URL before FFmpeg loads it.
  const coreURL = await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, 'text/javascript');
  const manifest = await loadManifest();
  const wasmBlob = await loadWasm(manifest);

  await ffmpeg.load({
    coreURL,
    wasmURL: URL.createObjectURL(wasmBlob),
  });
  return ffmpeg;
}
