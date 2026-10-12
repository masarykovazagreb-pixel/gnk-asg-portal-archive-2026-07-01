const { app, BrowserWindow, Menu, Tray, session, shell, ipcMain, nativeImage } = require('electron');
const path = require('node:path');

const ECB_DAILY_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const CBK_FOREX_URL = 'https://www.centralbank.go.ke/forex/';
const TWELVE_DATA_REFERENCE_URL = 'https://api.twelvedata.com/exchange_rate';
const BACKGROUND_INTERVALS = new Set([1, 5, 15, 60]);
let ecbCache = null;
let cbkCache = null;
let twelveDataCache = null;
let mainWindow = null;
let tray = null;
let backgroundTimer = null;
let appIsQuitting = false;
const startedFromLogin = app.commandLine.hasSwitch('background');
let backgroundPreferences = {
  enabled: true,
  intervalMinutes: 5,
  keepRunningInTray: false,
  startWithWindows: false
};

async function fetchEcbDailyReference() {
  try {
    if (ecbCache && Date.now() - ecbCache.fetchedAt < 60 * 60 * 1000) return { ok: true, ...ecbCache, cached: true };
    const response = await fetch(ECB_DAILY_URL, {
      headers: { Accept: 'application/xml,text/xml' },
      redirect: 'error',
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('ECB feed response was unsuccessful.');
    const xml = await response.text();
    if (xml.length > 1_000_000 || !/<(?:[A-Za-z][\w.-]*:)?Cube\b/.test(xml)) throw new Error('ECB feed format was unexpected.');
    ecbCache = { xml, source: ECB_DAILY_URL, fetchedAt: Date.now() };
    return { ok: true, ...ecbCache, cached: false };
  } catch {
    return { ok: false, error: 'The public ECB daily reference feed is currently unavailable.' };
  }
}
async function fetchCbkDailyReference() {
  try {
    if (cbkCache && Date.now() - cbkCache.fetchedAt < 60 * 60 * 1000) return { ok: true, ...cbkCache, cached: true };
    const response = await fetch(CBK_FOREX_URL, {
      headers: { Accept: 'text/html' },
      redirect: 'error',
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('CBK page response was unsuccessful.');
    const html = await response.text();
    if (html.length > 5_000_000 || !/Daily KES Exchange Rates/i.test(html)) throw new Error('CBK page format was unexpected.');
    cbkCache = { html, source: CBK_FOREX_URL, fetchedAt: Date.now() };
    return { ok: true, ...cbkCache, cached: false };
  } catch {
    return { ok: false, error: 'The public CBK daily indicative rate page is currently unavailable.' };
  }
}

async function fetchTwelveDataReference() {
  const apiKey = String(process.env.TWELVEDATA_API_KEY || '').trim();
  if (!apiKey) return { ok: false, configured: false, message: 'Optional market-data feed is not configured.' };
  if (twelveDataCache && Date.now() - twelveDataCache.fetchedAt < 60_000) return { ok: true, configured: true, ...twelveDataCache.value, cached: true };
  try {
    const url = new URL(TWELVE_DATA_REFERENCE_URL);
    url.searchParams.set('symbol', 'EUR/USD');
    url.searchParams.set('apikey', apiKey);
    const response = await fetch(url, {
      headers: { Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('Market-data upstream request failed.');
    const text = await response.text();
    if (text.length > 64_000) throw new Error('Market-data response was too large.');
    const { parseTwelveDataExchangeRate } = await import('../src/market-data.mjs');
    const reference = parseTwelveDataExchangeRate(JSON.parse(text));
    twelveDataCache = { value: reference, fetchedAt: Date.now() };
    return { ok: true, configured: true, ...reference, cached: false };
  } catch {
    // API errors are deliberately generic; never expose a request URL or key to the renderer.
    return { ok: false, configured: true, message: 'Optional market-data reference is currently unavailable.' };
  }
}

function updateTray() {
  if (!tray) return;
  const activity = backgroundPreferences.enabled
    ? `Synthetic activity · every ${backgroundPreferences.intervalMinutes} min`
    : 'Synthetic activity paused';
  tray.setToolTip(`Adria Bank Demo · ${activity} · no bank connectivity`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: activity, enabled: false },
    { label: 'Open Adria Bank Demo', click: () => { if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { label: 'Quit Adria Bank Demo', click: () => app.quit() }
  ]));
}

function ensureTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, '..', 'assets', 'adria.ico');
  const image = nativeImage.createFromPath(iconPath);
  tray = new Tray(image.isEmpty() ? iconPath : image);
  tray.on('click', () => { if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); } });
  updateTray();
}

function stopBackgroundTimer() {
  if (backgroundTimer) clearInterval(backgroundTimer);
  backgroundTimer = null;
}
function syncBackgroundTimer() {
  stopBackgroundTimer();
  if (backgroundPreferences.enabled) {
    backgroundTimer = setInterval(() => {
      if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return;
      mainWindow.webContents.send('demo:background-tick', {
        scheduledAt: new Date().toISOString(),
        intervalMinutes: backgroundPreferences.intervalMinutes,
        source: 'desktop-scheduler'
      });
    }, backgroundPreferences.intervalMinutes * 60 * 1000);
    backgroundTimer.unref?.();
  }
  updateTray();
}

function applyBackgroundPreferences(input = {}) {
  const intervalMinutes = Number(input.intervalMinutes);
  backgroundPreferences = {
    enabled: input.enabled !== false,
    intervalMinutes: BACKGROUND_INTERVALS.has(intervalMinutes) ? intervalMinutes : 5,
    keepRunningInTray: Boolean(input.keepRunningInTray),
    startWithWindows: process.platform === 'win32' && Boolean(input.startWithWindows) && Boolean(input.keepRunningInTray)
  };
  try {
    if (process.platform === 'win32') {
      const args = backgroundPreferences.startWithWindows
        ? (app.isPackaged ? ['--background'] : [`--app-path=${app.getAppPath()}`, '--background'])
        : [];
      app.setLoginItemSettings({
        openAtLogin: backgroundPreferences.startWithWindows,
        path: app.getPath('exe'),
        args
      });
    }
  } catch { /* unsupported or restricted machine policy; UI reports this as a desktop preference only */ }

  if (backgroundPreferences.keepRunningInTray) ensureTray();
  else if (tray) { tray.destroy(); tray = null; }
  if (startedFromLogin && mainWindow && !mainWindow.isDestroyed()) {
    if (backgroundPreferences.keepRunningInTray) mainWindow.hide();
    else mainWindow.show();
  }
  syncBackgroundTimer();
  return { ...backgroundPreferences, supported: process.platform === 'win32' };
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1500,
    height: 960,
    minWidth: 980,
    minHeight: 680,
    show: false,
    backgroundColor: '#f5f7f8',
    title: 'Adria Bank Demo',
    icon: path.join(__dirname, '..', 'assets', 'adria.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false
    }
  });
  mainWindow = window;

  window.once('ready-to-show', () => { if (!startedFromLogin) window.show(); });
  window.on('close', event => {
    if (backgroundPreferences.keepRunningInTray && !appIsQuitting) {
      event.preventDefault();
      window.hide();
      ensureTray();
    }
  });
  window.on('closed', () => { if (mainWindow === window) mainWindow = null; });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url).catch(() => {});
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url).catch(() => {});
    }
  });
  window.loadFile(path.join(__dirname, '..', 'welcome.html'));
  return window;
}

app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId('hr.adria.demo.bank');
  Menu.setApplicationMenu(null);
  ipcMain.handle('demo:fetch-ecb-daily-reference', fetchEcbDailyReference);
  ipcMain.handle('demo:fetch-cbk-daily-reference', fetchCbkDailyReference);
  ipcMain.handle('demo:fetch-twelve-data-reference', async event => {
    if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error('Market-data access is restricted to the Adria Bank demo window.');
    return fetchTwelveDataReference();
  });
  ipcMain.handle('demo:set-background-preferences', (event, preferences) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error('Background settings are restricted to the Adria Bank demo window.');
    return applyBackgroundPreferences(preferences);
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const protocol = new URL(details.url).protocol;
    callback({ cancel: !['file:', 'blob:', 'devtools:'].includes(protocol) });
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
});

app.on('before-quit', () => {
  appIsQuitting = true;
  stopBackgroundTimer();
  if (tray) { tray.destroy(); tray = null; }
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
