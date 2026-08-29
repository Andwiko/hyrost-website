#!/usr/bin/env node
/**
 * install_deps.js — Emergency dependency installer for Pterodactyl/NuraHost
 * 
 * Usage (paste into NuraHost Console):
 *   node install_deps.js
 *   
 * Or if you're in /home/container:
 *   node www/install_deps.js
 *
 * This script fixes the HOME=/nonexistent problem that prevents npm install
 * from working on Pterodactyl containers.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Fix HOME environment
process.env.HOME = '/home/container';

// Ensure npm directories exist
const dirs = [
  '/home/container/.npm-cache',
  '/home/container/.npm-logs',
  '/home/container/tmp',
  '/home/container/logs'
];
dirs.forEach(d => { try { fs.mkdirSync(d, { recursive: true }); } catch (_) {} });

// Create .npmrc if missing
const npmrc = path.join('/home/container', '.npmrc');
if (!fs.existsSync(npmrc)) {
  fs.writeFileSync(npmrc, [
    'cache=/home/container/.npm-cache',
    'logs-dir=/home/container/.npm-logs',
    'fund=false',
    'audit=false',
    ''
  ].join('\n'));
  console.log('✅ Created ~/.npmrc');
}

// Find npm binary
let npmBin = '';
const candidates = [
  '/home/container/.nodejs/bin/npm',
  '/usr/local/bin/npm',
  '/usr/bin/npm',
];
for (const c of candidates) {
  try { if (fs.statSync(c).isFile()) { npmBin = c; break; } } catch (_) {}
}
if (!npmBin) {
  try { npmBin = execSync('which npm 2>/dev/null').toString().trim(); } catch (_) {}
}

if (!npmBin) {
  console.error('❌ npm not found! Install Node.js first.');
  process.exit(1);
}

console.log(`📦 Using npm: ${npmBin}`);

// Determine install directory (where package.json with express is)
const wwwDir = '/home/container/www';
const rootDir = '/home/container';

let installDir = wwwDir;
if (fs.existsSync(path.join(wwwDir, 'package.json'))) {
  installDir = wwwDir;
} else if (fs.existsSync(path.join(rootDir, 'package.json'))) {
  installDir = rootDir;
}

console.log(`📂 Installing in: ${installDir}`);
console.log('⏳ Running npm install --production ...');

try {
  execSync(`HOME=/home/container ${npmBin} install --production --no-audit --no-fund`, {
    cwd: installDir,
    stdio: 'inherit',
    env: { ...process.env, HOME: '/home/container' },
    timeout: 120000,
  });
  console.log('');
  console.log('✅ Dependencies installed successfully!');
} catch (err) {
  console.error('');
  console.error('⚠️  npm install had errors. Trying direct install of critical packages...');
  
  const critical = [
    'express', 'cors', 'dotenv', 'jsonwebtoken', 'mysql2',
    'bcryptjs', 'mongoose', 'multer', 'nodemailer', 'qrcode', 'speakeasy'
  ];
  
  try {
    execSync(`HOME=/home/container ${npmBin} install ${critical.join(' ')} --no-audit --no-fund`, {
      cwd: installDir,
      stdio: 'inherit',
      env: { ...process.env, HOME: '/home/container' },
      timeout: 120000,
    });
    console.log('✅ Critical dependencies installed!');
  } catch (e2) {
    console.error('❌ Failed to install dependencies:', e2.message);
    process.exit(1);
  }
}

// Verify
const expressPath = path.join(installDir, 'node_modules', 'express');
if (fs.existsSync(expressPath)) {
  console.log('✅ Verified: express module found');
  console.log('');
  console.log('🚀 Now restart the server from the NuraHost panel!');
} else {
  console.error('❌ express module still not found after install');
  process.exit(1);
}
