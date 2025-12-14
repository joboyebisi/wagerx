#!/usr/bin/env node
// Verify Next.js is installed before build
const fs = require('fs');
const path = require('path');

const nextPath = path.join(__dirname, '..', 'node_modules', 'next', 'package.json');

if (!fs.existsSync(nextPath)) {
  console.error('ERROR: Next.js not found at', nextPath);
  process.exit(1);
}

const nextPackage = JSON.parse(fs.readFileSync(nextPath, 'utf8'));
console.log(`✓ Next.js ${nextPackage.version} found`);
process.exit(0);

