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
const REQUIRED_ENV_VARS = [
  'ASTRA_DB_APPLICATION_TOKEN',
  'ASTRA_DB_API_ENDPOINT',
  'ASTRA_DB_DB_NAME'
];

function loadEnvFiles() {
  try {
    const dotenv = require('dotenv');
    const envFiles = [
      { file: '.env', override: false },
      { file: '.env.local', override: true }
    ];

    for (const { file, override } of envFiles) {
      const envPath = path.join(packageDir, file);
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override });
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not load dotenv for startup checks:', error.message);
  }
}

function getMissingRequiredEnvVars() {
  return REQUIRED_ENV_VARS.filter((name) => !process.env[name] || !String(process.env[name]).trim());
}

function printEnvSetupInstructions(missingVars) {
  const envPath = path.join(packageDir, '.env');

  console.error('\n❌ Missing required environment variables.');
  console.error(`Missing: ${missingVars.join(', ')}`);
  console.error('\nCreate a `.env` file in the project root and restart the app.\n');
  console.error(`Suggested file: ${envPath}\n`);
  console.error('Sample `.env`:\n');
  console.error(`ASTRA_DB_APPLICATION_TOKEN=AstraCS:your-application-token
ASTRA_DB_API_ENDPOINT=https://<database-id>-<region>.apps.astra.datastax.com
ASTRA_DB_DB_NAME=default_keyspace
ASTRA_DB_CATALOG_COLLECTION=tool_catalog

# Optional (for tool generation features)
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini
`);
  console.error('Instructions:');
  console.error('1. Create the `.env` file in the project root.');
  console.error('2. Fill in your Astra DB credentials.');
  console.error('3. Save the file.');
  console.error('4. Restart the app (`npx agentic-astra-ui`).\n');
}

async function runNextDev() {
  loadEnvFiles();

  const missingVars = getMissingRequiredEnvVars();
  if (missingVars.length > 0) {
    printEnvSetupInstructions(missingVars);
    process.exit(1);
  }

  const port = process.env.PORT || '5150';
  const hostname = process.env.HOSTNAME || 'localhost';
  
  console.log(`🚀 Starting Agentic Astra UI...`);
  console.log(`📦 Package directory: ${packageDir}`);
  console.log(`🌐 Server will be available at http://${hostname}:${port}`);
  console.log(`\n✅ Environment variables loaded. Starting Next.js dev server...\n`);

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
      runNextDev().catch((error) => {
        console.error('❌ Startup checks failed:', error.message || error);
        process.exit(1);
      });
    } else {
      console.error('❌ Failed to install dependencies');
      process.exit(1);
    }
  });
} else {
  runNextDev().catch((error) => {
    console.error('❌ Startup checks failed:', error.message || error);
    process.exit(1);
  });
}
