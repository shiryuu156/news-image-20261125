// news-image-20261125 — entry program (Node 22).
//
// The front page is drawn from scratch by draw.mjs (standard library only:
// a hand-built raster canvas, a 5x7 bitmap font and a hand-rolled PNG
// encoder). This entrypoint just runs the renderer into the output dir the
// harness provides, so the image is produced fresh on every run and is
// byte-identical across runs — no network, no clock, no randomness.
//
// Local check:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
execFileSync(process.execPath, [join(root, 'draw.mjs'), outDir], { stdio: 'inherit' });
