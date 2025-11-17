#!/usr/bin/env node

/**
 * CLI entry point for agentic-astra-ui
 * This script runs the Next.js development server
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the directory where the package is installed
const packageDir = path.resolve(__dirname, '..');

// Check if node_modules exists, if not, install dependencies
const nodeModulesPath = path.join(packageDir, 'node_modules');
const nextPath = path.join(nodeModulesPath, '.bin', 'next');

function runNextDev() {
  const port = process.env.PORT || '3000';
  const hostname = process.env.HOSTNAME || 'localhost';
  
  console.log(`🚀 Starting Agentic Astra UI...`);
  console.log(`📦 Package directory: ${packageDir}`);
  console.log(`🌐 Server will be available at http://${hostname}:${port}`);
  console.log(`\n💡 Make sure to set up your .env.local file with Astra DB credentials!\n`);

  // Spawn next dev process
  const nextProcess = spawn('npx', ['next', 'dev', '-p', port, '-H', hostname], {
    cwd: packageDir,
    stdio: 'inherit',
    shell: true
  });

  nextProcess.on('error', (error) => {
    console.error('❌ Error starting server:', error.message);
    process.exit(1);
  });

  nextProcess.on('exit', (code) => {
    process.exit(code || 0);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down...');
    nextProcess.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    nextProcess.kill();
    process.exit(0);
  });
}

// Check if dependencies are installed
if (!fs.existsSync(nodeModulesPath) || !fs.existsSync(nextPath)) {
  console.log('📦 Installing dependencies...');
  const installProcess = spawn('npm', ['install'], {
    cwd: packageDir,
    stdio: 'inherit',
    shell: true
  });

  installProcess.on('exit', (code) => {
    if (code === 0) {
      runNextDev();
    } else {
      console.error('❌ Failed to install dependencies');
      process.exit(1);
    }
  });
} else {
  runNextDev();
}

