const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const { Database } = require('./db');
const { createServer } = require('./server');

let mainWindow = null;
let serverInstance = null;

async function startApp() {
  // 1. Setup persistent storage in user's OS AppData folder
  const userDataDir = app.getPath('userData');
  const dbPath = path.join(userDataDir, 'warmepub.db');
  const storageDir = path.join(userDataDir, 'storage');

  console.log('WarmEpub AppData directory:', userDataDir);
  console.log('Database path:', dbPath);

  // 2. Initialize embedded SQLite
  const db = new Database(dbPath);
  await db.init();

  // 3. Static assets directory (built React frontend)
  const fs = require('fs');
  let staticDir = path.join(__dirname, '..', 'frontend_dist');
  if (!fs.existsSync(staticDir)) {
    staticDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
  }
  if (!fs.existsSync(staticDir) && process.resourcesPath) {
    staticDir = path.join(process.resourcesPath, 'frontend_dist');
  }

  // 4. Create embedded Express server
  const expressApp = createServer(db, storageDir, staticDir);

  // Find an available port or use 8080
  const port = await new Promise((resolve) => {
    const srv = http.createServer(expressApp);
    srv.listen(0, '127.0.0.1', () => {
      const assignedPort = srv.address().port;
      serverInstance = srv;
      resolve(assignedPort);
    });
  });

  console.log(`WarmEpub desktop server running on http://127.0.0.1:${port}`);

  // 5. Create native Electron BrowserWindow
  mainWindow = new BrowserWindow({
    title: 'WarmEpub — AI Reader',
    width: 1300,
    height: 880,
    minWidth: 960,
    minHeight: 650,
    backgroundColor: '#141210',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the web app from our embedded local server
  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(startApp);

app.on('window-all-closed', () => {
  if (serverInstance) {
    serverInstance.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
