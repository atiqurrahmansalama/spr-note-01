/**
 * SPR Note - Unified Full Stack Development Launcher
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// Detect Python executable (prefer project venv if present)
const venvPythonWin = path.join(rootDir, 'venv', 'Scripts', 'python.exe');
const venvPythonUnix = path.join(rootDir, 'venv', 'bin', 'python');
let pythonCmd = 'python';

if (isWin && fs.existsSync(venvPythonWin)) {
  pythonCmd = venvPythonWin;
} else if (!isWin && fs.existsSync(venvPythonUnix)) {
  pythonCmd = venvPythonUnix;
}

// Colors for terminal output
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const reset = '\x1b[0m';

console.log(`${yellow}====================================================${reset}`);
console.log(`${yellow}    SPR Note - Unified Full-Stack Dev Launcher     ${reset}`);
console.log(`${yellow}====================================================${reset}\n`);

// 1. Start Backend (Django)
console.log(`${yellow}[LAUNCHER] Starting Django Backend on http://127.0.0.1:8000 ...${reset}`);
const backendProcess = spawn(pythonCmd, ['manage.py', 'runserver'], {
  cwd: backendDir,
  shell: false,
  env: { ...process.env, PYTHONUNBUFFERED: '1' }
});

backendProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.trim()) console.log(`${cyan}[BACKEND]${reset} ${line}`);
  }
});

backendProcess.stderr.on('data', (data) => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.trim()) console.log(`${cyan}[BACKEND]${reset} ${line}`);
  }
});

backendProcess.on('error', (err) => {
  console.error(`${red}[BACKEND ERROR] ${err.message}${reset}`);
});

// 2. Start Frontend (Vite)
console.log(`${yellow}[LAUNCHER] Starting Vite Frontend on http://localhost:5173 ...${reset}`);
const frontendProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: frontendDir,
  shell: isWin
});

frontendProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.trim()) console.log(`${green}[FRONTEND]${reset} ${line}`);
  }
});

frontendProcess.stderr.on('frontend', (data) => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.trim()) console.log(`${green}[FRONTEND]${reset} ${line}`);
  }
});

frontendProcess.on('error', (err) => {
  console.error(`${red}[FRONTEND ERROR] ${err.message}${reset}`);
});

// Handle graceful shutdown
const shutdown = () => {
  console.log(`\n${yellow}[LAUNCHER] Stopping development servers...${reset}`);
  backendProcess.kill();
  frontendProcess.kill();
  process.exit();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
