const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('adriaDemo', Object.freeze({
  getEcbDailyReference: () => ipcRenderer.invoke('demo:fetch-ecb-daily-reference'),
  getCbkDailyReference: () => ipcRenderer.invoke('demo:fetch-cbk-daily-reference'),
  getOptionalMarketReference: () => ipcRenderer.invoke('demo:fetch-twelve-data-reference'),
  setBackgroundPreferences: preferences => ipcRenderer.invoke('demo:set-background-preferences', preferences),
  onBackgroundTick: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('demo:background-tick', listener);
    return () => ipcRenderer.removeListener('demo:background-tick', listener);
  }
}));
