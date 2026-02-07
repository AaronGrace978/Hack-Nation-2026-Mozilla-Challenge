#!/usr/bin/env node
/**
 * Nexus dev launcher — build the extension and open the browser extensions page.
 * Usage: node scripts/launch.mjs [chrome|firefox|none]
 * Default: tries Chrome, then Firefox; "none" skips opening the browser.
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

const target = (process.argv[2] || 'chrome').toLowerCase();

function run(cmd, args, opts = {}) {
  return new Promise((resolvePromise, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: true, cwd: root, ...opts });
    p.on('exit', (code) => (code === 0 ? resolvePromise() : reject(new Error(`Exit ${code}`))));
  });
}

function openChrome() {
  const paths = [
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  const exe = paths.find((p) => p && existsSync(p));
  if (exe) {
    spawn(exe, ['--no-first-run', 'chrome://extensions'], { detached: true, stdio: 'ignore' });
    console.log('\nChrome opened at chrome://extensions — click "Load unpacked" and select the dist/ folder.');
    return true;
  }
  return false;
}

function openFirefox() {
  const paths = [
    'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
    'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
  ];
  const exe = paths.find((p) => existsSync(p));
  if (exe) {
    spawn(exe, ['about:debugging#/runtime/this-firefox'], { detached: true, stdio: 'ignore' });
    console.log('\nFirefox opened — click "Load Temporary Add-on" and select dist/manifest.json.');
    return true;
  }
  return false;
}

async function main() {
  console.log('Building Nexus extension...\n');
  await run('npm', ['run', 'build']);
  console.log('\nBuild done. Output in dist/\n');

  if (target === 'none') {
    console.log('Load the extension:');
    console.log('  Chrome: chrome://extensions → Load unpacked → select dist/');
    console.log('  Firefox: about:debugging#/runtime/this-firefox → Load Temporary Add-on → dist/manifest.json');
    return;
  }

  if (target === 'firefox') {
    if (!openFirefox()) console.log('Firefox not found in default paths. Open about:debugging#/runtime/this-firefox and load dist/manifest.json.');
    return;
  }

  // chrome or default
  if (!openChrome()) {
    console.log('Chrome not found in default paths. Open chrome://extensions, enable Developer mode, then Load unpacked and select:');
    console.log('  ', dist);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
