#!/usr/bin/env node
// Verify Next.js is installed before build
try {
  // Try to require Next.js directly (it should be in node_modules)
  const nextPackage = require('next/package.json');
  console.log(`✓ Next.js ${nextPackage.version} found`);
  process.exit(0);
} catch (error) {
  // Fallback: check if node_modules/next exists using process.cwd()
  const fs = require('fs');
  const path = require('path');
  
  console.log('Current working directory:', process.cwd());
  
  // Try multiple possible locations
  const possiblePaths = [
    path.join(process.cwd(), 'node_modules', 'next', 'package.json'),
    path.join(process.cwd(), '..', 'node_modules', 'next', 'package.json'),
    path.join(process.cwd(), '..', '..', 'node_modules', 'next', 'package.json'),
  ];
  
  for (const nextPath of possiblePaths) {
    console.log('Checking:', nextPath);
    if (fs.existsSync(nextPath)) {
      const nextPackage = JSON.parse(fs.readFileSync(nextPath, 'utf8'));
      console.log(`✓ Next.js ${nextPackage.version} found at ${nextPath}`);
      process.exit(0);
    }
  }
  
  console.error('ERROR: Next.js not found in any expected location');
  console.error('Tried paths:', possiblePaths);
  process.exit(1);
}

