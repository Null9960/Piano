import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(root, 'node_modules', '@mediapipe', 'hands');
const targetDir = join(root, 'public', 'mediapipe', 'hands');

const assets = [
  'hands.binarypb',
  'hands.js',
  'hands_solution_packed_assets.data',
  'hands_solution_packed_assets_loader.js',
  'hands_solution_simd_wasm_bin.data',
  'hands_solution_simd_wasm_bin.js',
  'hands_solution_simd_wasm_bin.wasm',
  'hands_solution_wasm_bin.js',
  'hands_solution_wasm_bin.wasm',
  'hand_landmark_full.tflite',
  'hand_landmark_lite.tflite',
];

async function main() {
  if (!existsSync(sourceDir)) {
    console.warn('[mediapipe] @mediapipe/hands is not installed; camera will use CDN fallback.');
    return;
  }

  try {
    await mkdir(targetDir, { recursive: true });
  } catch (error) {
    console.warn(`[mediapipe] Cannot create ${targetDir}; camera will use CDN fallback.`);
    console.warn(`[mediapipe] ${formatError(error)}`);
    return;
  }

  let copied = 0;
  for (const asset of assets) {
    const source = join(sourceDir, asset);
    if (!existsSync(source)) {
      console.warn(`[mediapipe] Missing ${asset}; skipping.`);
      continue;
    }

    try {
      await copyFile(source, join(targetDir, asset));
      copied += 1;
    } catch (error) {
      console.warn(`[mediapipe] Could not copy ${asset}; skipping local MediaPipe asset.`);
      console.warn(`[mediapipe] ${formatError(error)}`);
    }
  }

  if (copied === assets.length) {
    console.log(`[mediapipe] Copied ${copied} Hands assets to public/mediapipe/hands.`);
  } else {
    console.warn(`[mediapipe] Copied ${copied}/${assets.length} Hands assets. Missing assets will fall back to CDN at runtime.`);
  }
}

function formatError(error) {
  if (error && typeof error === 'object' && 'code' in error) {
    return `${error.code}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

await main();
