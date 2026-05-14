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

if (!existsSync(sourceDir)) {
  console.warn('[mediapipe] @mediapipe/hands is not installed; skipping asset copy.');
  process.exit(0);
}

await mkdir(targetDir, { recursive: true });

for (const asset of assets) {
  const source = join(sourceDir, asset);
  if (!existsSync(source)) {
    console.warn(`[mediapipe] Missing ${asset}; skipping.`);
    continue;
  }
  await copyFile(source, join(targetDir, asset));
}

console.log(`[mediapipe] Copied ${assets.length} Hands assets to public/mediapipe/hands.`);
