const { contextBridge, ipcRenderer } = require('electron');

const call = async (channel, ...args) => {
  const res = await ipcRenderer.invoke(channel, ...args);
  if (!res || !res.ok) throw new Error((res && res.error) || 'Bilinmeyen hata');
  return res.value;
};

const on = (channel) => (cb) => {
  const handler = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('api', {
  init: () => call('init'),
  start: (cfg) => call('timer:start', cfg),
  cancel: () => call('timer:cancel'),
  pause: () => call('timer:pause'),
  resume: () => call('timer:resume'),
  extend: (minutes) => call('timer:extend', minutes),
  snooze: (minutes) => call('timer:snooze', minutes),
  runNow: () => call('timer:now'),
  setSettings: (patch) => call('settings:set', patch),
  savePresets: (list) => call('presets:save', list),
  startPreset: (id) => call('presets:start', id),
  clearHistory: () => call('history:clear'),
  toggleMini: () => call('mini:toggle'),
  checkUpdate: () => call('update:check'),
  open: (which) => call('app:open', which),
  minimize: () => call('win:minimize'),
  close: () => ipcRenderer.invoke('win:close'),
  quit: () => call('app:quit'),
  onState: on('state'),
  onStore: on('store'),
  onDone: on('done'),
});
