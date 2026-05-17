// Generates icon-192.png and icon-512.png from icon.svg
// Requires: npm install -D sharp
// Run from frontend/: node scripts/generate-icons.js
//
// Run this once to create proper PNG icons for iOS apple-touch-icon.
// After running, commit the generated files in public/.

import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(join(__dirname, '../public/icon.svg'))
const out = join(__dirname, '../public')

await sharp(svg).resize(192, 192).png().toFile(join(out, 'icon-192.png'))
await sharp(svg).resize(512, 512).png().toFile(join(out, 'icon-512.png'))
console.log('Generated icon-192.png and icon-512.png in public/')
