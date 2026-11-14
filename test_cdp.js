const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Database } = require('./desktop/src/db');
const { createServer } = require('./desktop/src/server');

const userDataDir = path.join(process.env.APPDATA, 'warm-epub-desktop');
const dbPath = path.join(userDataDir, 'warmepub.db');
const storageDir = path.join(userDataDir, 'storage');
const staticDir = path.join(__dirname, 'desktop', 'frontend_dist');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\veiro\\.gemini\\antigravity\\brain\\55ed3421-cc0c-4db0-ae27-7538140c5d53';

async function main() {
  const db = new Database(dbPath);
  await db.init();
  const app = createServer(db, storageDir, staticDir);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5185, '127.0.0.1', resolve));
  console.log('Server running on 5185');

  const famBook = db.get("SELECT id FROM books WHERE title LIKE '%Everyone In My Family%'");

  // Launch Chrome with debugging port
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,850',
    `http://127.0.0.1:5185/?bookId=${famBook.id}&chapter=17`,
  ]);

  // Wait 3 seconds for page to load and API to finish
  await new Promise((r) => setTimeout(r, 3000));

  // Fetch targets from CDP
  const targetsRes = await fetch('http://127.0.0.1:9222/json');
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === 'page');

  if (pageTarget && pageTarget.webSocketDebuggerUrl) {
    const WebSocket = require('./desktop/node_modules/electron/node_modules/ws') || null;
    // If ws is not there, we can send command via CDP HTTP or use standard fetch
    console.log('Target found:', pageTarget.title, pageTarget.url);
  }

  // Also take a direct screenshot after waiting
  const ssProc = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,850',
    `--screenshot=${path.join(artifactDir, 'desktop_verified_ch7_live.png')}`,
    `http://127.0.0.1:5185/?bookId=${famBook.id}&chapter=17`,
  ]);
  await new Promise((r) => ssProc.on('close', r));

  chrome.kill();
  server.close();
  console.log('Saved:', path.join(artifactDir, 'desktop_verified_ch7_live.png'));
}

main().catch(console.error);

