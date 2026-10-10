const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const nodeDir = path.dirname(process.execPath);
process.env.PATH = `${nodeDir};${process.env.PATH}`;

const bindingDir = path.join(__dirname, 'node_modules', '@rolldown', 'binding-win32-x64-msvc');
if (!fs.existsSync(bindingDir)) {
  console.log('Installing @rolldown/binding-win32-x64-msvc...');
  const res = execSync(`npm install --no-save --no-audit --legacy-peer-deps @rolldown/binding-win32-x64-msvc`, {
    env: process.env,
    encoding: 'utf8'
  });
  console.log(res);
}

// Now run tsc and vite build
console.log('Running tsc...');
execSync('npx tsc', { env: process.env, stdio: 'inherit' });
console.log('Running vite build...');
execSync('npx vite build', { env: process.env, stdio: 'inherit' });
console.log('Build completed successfully!');
