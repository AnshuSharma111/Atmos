// build-script.js - Build script for Vercel deployment
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Make sure public directory exists
if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

// Make sure uploads directory exists
if (!fs.existsSync('public/uploads')) {
  fs.mkdirSync('public/uploads', { recursive: true });
}

// Copy static files
const filesToCopy = [
  'index.html',
  'viewer.html'
];

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join('public', file));
    console.log(`Copied ${file} to public/`);
  } else {
    console.log(`Warning: ${file} does not exist`);
  }
});

// Copy package.json and package-lock.json for dependencies
fs.copyFileSync('package.json', 'public/package.json');
console.log('Copied package.json to public/');

if (fs.existsSync('package-lock.json')) {
  fs.copyFileSync('package-lock.json', 'public/package-lock.json');
  console.log('Copied package-lock.json to public/');
}

// Create a new minimal package.json for the public directory
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Strip down package.json to only what's needed
const minimalPackage = {
  name: packageJson.name,
  version: packageJson.version,
  private: true,
  dependencies: {
    express: packageJson.dependencies.express,
    cors: packageJson.dependencies.cors,
    'socket.io': packageJson.dependencies['socket.io'],
    'socket.io-client': packageJson.dependencies['socket.io-client']
  },
  engines: {
    node: packageJson.engines?.node || '>=16'
  }
};

fs.writeFileSync('public/package.json', JSON.stringify(minimalPackage, null, 2));
console.log('Created minimal package.json in public/');

console.log('Build completed successfully!');