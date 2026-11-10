const {
  app, BrowserWindow, ipcMain, Tray, Menu, Notification, powerMonitor,
  nativeImage, nativeTheme, dialog, screen, globalShortcut, shell, net,
} = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const I18N = require('./src/i18n.js');

const APP_ID = 'com.kapat.zamanlayici';
const REPO = 'furkibayashi/zamanlayici';
const REPO_URL = `https://github.com/${REPO}`;
const DRY_RUN = process.env.ZAMANLAYICI_DRY_RUN === '1';
const START_HIDDEN = process.argv.includes('--hidden');
const asset = (...p) => path.join(__dirname, ...p);

const ACTIONS = ['shutdown', 'restart', 'sleep', 'hibernate', 'logoff', 'lock'];
const MODES = ['duration', 'clock', 'idle'];
const THEMES = ['system', 'dark', 'light', 'oled'];
const ACCENTS = ['amber', 'cyan', 'violet', 'green', 'rose'];

// ---------------------------------------------------------------------------
// Eylemler — yalnızca Windows'un kendi araçları kullanılır
// ---------------------------------------------------------------------------
function commandFor(action, force) {
  const f = force ? ' /f' : '';
  switch (action) {
    case 'shutdown': return `shutdown /s${f} /t 0`;
    case 'restart': return `shutdown /r${f} /t 0`;
    case 'logoff': return `shutdown /l${f}`;
    case 'hibernate': return 'shutdown /h';
    case 'lock': return 'rundll32.exe user32.dll,LockWorkStation';
    case 'sleep':
      return 'powershell -NoProfile -WindowStyle Hidden -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState(\'Suspend\', $false, $false)"';
    default: return null;
  }
}

function runCommand(cmd) {
  if (DRY_RUN) {
    console.log('[DRY RUN]', cmd);
    return;
  }
  exec(cmd, { windowsHide: true }, (err) => {
    if (err) console.error('Komut başarısız:', cmd, err.message);
  });
}

// ---------------------------------------------------------------------------
// Kalıcı depo
// ---------------------------------------------------------------------------
const DEFAULT_SETTINGS = {
  language: null,
  theme: 'dark',
  accent: 'amber',
  warningSeconds: 60,
  notifyMinutes: 5,
  forceClose: false,
  closeToTray: true,
  launchAtStartup: false,
  sound: true,
  miniAuto: false,
  globalShortcuts: true,
  checkUpdates: true,
  trayHintShown: false,
  miniPos: null,
  lastNotifiedVersion: null,
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const L = () => store.settings.language || 'en';
const tr = (key, vars) => I18N.t(L(), key, vars);

function defaultPresets(lang) {
  const t = (k) => I18N.t(lang, k);
  return [
    { id: uid(), name: t('preset.film'), action: 'shutdown', mode: 'duration', minutes: 120 },
    { id: uid(), name: t('preset.music'), action: 'sleep', mode: 'duration', minutes: 45 },
    { id: uid(), name: t('preset.midnight'), action: 'shutdown', mode: 'clock', time: '00:00' },
    { id: uid(), name: t('preset.download'), action: 'shutdown', mode: 'idle', idleMinutes: 30 },
  ];
}

let storePath;
let store = { settings: { ...DEFAULT_SETTINGS }, presets: [], history: [], active: null };

function loadStore() {
  storePath = path.join(app.getPath('userData'), 'zamanlayici.json');
  let data = null;
  try { data = JSON.parse(fs.readFileSync(storePath, 'utf8')); } catch { /* ilk çalıştırma */ }
  const settings = { ...DEFAULT_SETTINGS, ...((data && data.settings) || {}) };
  if (!I18N.LANGS[settings.language]) settings.language = I18N.detect(app.getLocale());
  store = {
    settings,
    presets: data && Array.isArray(data.presets) ? data.presets : defaultPresets(settings.language),
    history: data && Array.isArray(data.history) ? data.history : [],
    active: (data && data.active) || null,
  };
}

function saveStore() {
  try {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const tmp = storePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
    fs.renameSync(tmp, storePath);
  } catch (e) {
    console.error('Depo kaydedilemedi:', e.message);
  }
}

function descOf(t) {
  return { mode: t.mode, totalMs: t.totalMs, time: t.time, idleMinutes: t.idleMinutes, repeat: !!t.repeat };
}

function addHistory(t, result) {
  store.history.unshift({
    id: uid(),
    action: t.action,
    desc: descOf(t),
    startedAt: t.startedAt,
    endedAt: Date.now(),
    result,
  });
  store.history = store.history.slice(0, 50);
}

// ---------------------------------------------------------------------------
// Zamanlayıcı motoru
// ---------------------------------------------------------------------------
let timer = null;
let tickHandle = null;

function nextClockTarget(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(h, m);
  if (d.getTime() <= Date.now() + 1000) d.setDate(d.getDate() + 1);
  return d.getTime();
}

const describe = (t) => I18N.describe(L(), descOf(t));
const actionName = (a) => tr(`action.${a}`);

function validate(cfg) {
  if (!cfg || !ACTIONS.includes(cfg.action) || !MODES.includes(cfg.mode)) throw new Error(tr('err.invalid'));
  if (cfg.mode === 'duration') {
    const s = Math.round(Number(cfg.seconds));
    if (!Number.isFinite(s) || s < 1 || s > 7 * 24 * 3600) throw new Error(tr('err.duration'));
    return { seconds: s };
  }
  if (cfg.mode === 'clock') {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cfg.time || '')) throw new Error(tr('err.time'));
    return { time: cfg.time, repeat: !!cfg.repeat };
  }
  const im = Math.round(Number(cfg.idleMinutes));
  if (!Number.isFinite(im) || im < 1 || im > 24 * 60) throw new Error(tr('err.idle'));
  return { idleMinutes: im };
}

function makeClockTimer(base, time, repeat) {
  const now = Date.now();
  const target = nextClockTarget(time);
  return {
    ...base,
    id: uid(),
    mode: 'clock',
    time,
    repeat,
    startedAt: now,
    targetTime: target,
    totalMs: target - now,
    phase: 'running',
    paused: false,
    notified: false,
  };
}

function startTimer(cfg) {
  const v = validate(cfg);
  if (timer) stopTimer('cancelled', { silent: true });
  const now = Date.now();
  let t = { id: uid(), action: cfg.action, mode: cfg.mode, startedAt: now, phase: 'running', paused: false, notified: false };
  if (cfg.mode === 'duration') {
    t.totalMs = v.seconds * 1000;
    t.targetTime = now + t.totalMs;
  } else if (cfg.mode === 'clock') {
    t = makeClockTimer({ action: cfg.action }, v.time, v.repeat);
  } else {
    t.idleMinutes = v.idleMinutes;
  }
  timer = t;
  persistActive();
  onTimerChanged();
  if (store.settings.miniAuto) showMini();
  return snapshot();
}

function stopTimer(result, { silent = false } = {}) {
  if (!timer) return;
  const t = timer;
  timer = null;
  addHistory(t, result);
  store.active = null;
  saveStore();
  hideWarning();
  hideMini();
  onTimerChanged();
  if (!silent && result === 'cancelled') notify(tr('n.cancelled'), `${actionName(t.action)} · ${describe(t)}`);
  if (!silent && result === 'missed') notify(tr('n.missedTitle'), tr('n.missedBody'));
}

function persistActive() {
  store.active = timer ? { ...timer } : null;
  saveStore();
}

function remainingMs(now = Date.now()) {
  if (!timer) return 0;
  if (timer.mode === 'idle') return timer.phase === 'warning' ? timer.warnDeadline - now : null;
  if (timer.paused) return timer.remainingMs;
  return timer.targetTime - now;
}

function snapshot() {
  const s = store.settings;
  if (!timer) return { active: false, warningSeconds: s.warningSeconds };
  return {
    active: true,
    id: timer.id,
    action: timer.action,
    mode: timer.mode,
    phase: timer.phase,
    paused: timer.paused,
    repeat: !!timer.repeat,
    time: timer.time || null,
    remainingMs: remainingMs(),
    totalMs: timer.totalMs || null,
    targetTime: timer.mode === 'idle' || timer.paused ? null : timer.targetTime,
    idleMinutes: timer.idleMinutes || null,
    idleSeconds: timer.mode === 'idle' ? powerMonitor.getSystemIdleTime() : null,
    warningSeconds: s.warningSeconds,
    startedAt: timer.startedAt,
  };
}

function tick() {
  if (timer) {
    const now = Date.now();
    const s = store.settings;
    const warnMs = s.warningSeconds * 1000;

    if (timer.mode === 'idle') {
      const idle = powerMonitor.getSystemIdleTime();
      if (timer.phase === 'running' && idle >= timer.idleMinutes * 60) {
        timer.phase = 'warning';
        timer.warnDeadline = now + warnMs;
        showWarning();
      } else if (timer.phase === 'warning') {
        if (idle < 2 && now - (timer.warnShownAt || 0) > 1500) {
          // Kullanıcı geri döndü: bu tetiklemeyi bırak, izlemeye devam et.
          timer.phase = 'running';
          hideWarning();
          notify(tr('n.activityTitle'), tr('n.activityBody'));
          onTimerChanged();
        } else if (timer.warnDeadline - now <= 0) {
          return executeNow();
        }
      }
    } else if (!timer.paused) {
      const rem = timer.targetTime - now;
      if (rem < -15000) {
        // Bilgisayar uykudan yeni uyandı: geç kalınmış eylemi uygulama.
        if (timer.repeat) {
          addHistory(timer, 'missed');
          timer = makeClockTimer({ action: timer.action }, timer.time, true);
          persistActive();
          onTimerChanged();
        } else {
          stopTimer('missed');
        }
        return;
      }
      if (rem <= 0) return executeNow();
      if (s.notifyMinutes > 0 && !timer.notified && rem <= s.notifyMinutes * 60000 && rem > warnMs) {
        timer.notified = true;
        notify(tr('n.leftTitle', { n: s.notifyMinutes }), tr('n.leftBody', { will: tr(`will.${timer.action}`) }), showMain);
      }
      if (rem <= warnMs && timer.phase !== 'warning') {
        timer.phase = 'warning';
        showWarning();
        updateTray();
      }
    }
  }
  broadcast();
}

function executeNow() {
  if (!timer) return;
  const t = timer;
  const cmd = commandFor(t.action, store.settings.forceClose);
  addHistory(t, 'executed');
  if (t.repeat && t.mode === 'clock') {
    // Her gün tekrarla: bir sonraki günü şimdiden kur ve kaydet.
    timer = makeClockTimer({ action: t.action }, t.time, true);
    store.active = { ...timer };
  } else {
    timer = null;
    store.active = null;
    hideMini();
  }
  saveStore();
  hideWarning();
  onTimerChanged();
  sendAll('done', { action: t.action });
  if (['shutdown', 'restart', 'logoff'].includes(t.action) && !DRY_RUN) quitting = true;
  runCommand(cmd);
}

function extend(minutes) {
  if (!timer || timer.mode === 'idle') return snapshot();
  const add = Math.max(1, Math.min(600, Number(minutes) || 0)) * 60000;
  if (timer.paused) timer.remainingMs += add;
  else timer.targetTime = Math.max(timer.targetTime, Date.now()) + add;
  timer.totalMs = Math.max(timer.totalMs + add, remainingMs());
  if (remainingMs() > store.settings.warningSeconds * 1000) {
    timer.phase = 'running';
    hideWarning();
  }
  if (remainingMs() > store.settings.notifyMinutes * 60000) timer.notified = false;
  persistActive();
  onTimerChanged();
  return snapshot();
}

function snooze(minutes = 10) {
  if (!timer) return snapshot();
  if (timer.mode === 'idle') {
    timer.phase = 'running';
    hideWarning();
    onTimerChanged();
    return snapshot();
  }
  return extend(minutes);
}

function pause() {
  if (!timer || timer.mode !== 'duration' || timer.paused) return snapshot();
  timer.remainingMs = Math.max(0, timer.targetTime - Date.now());
  timer.paused = true;
  timer.phase = 'running';
  hideWarning();
  persistActive();
  onTimerChanged();
  return snapshot();
}

function resume() {
  if (!timer || !timer.paused) return snapshot();
  timer.targetTime = Date.now() + timer.remainingMs;
  timer.paused = false;
  delete timer.remainingMs;
  persistActive();
  onTimerChanged();
  return snapshot();
}

function restoreActive() {
  const a = store.active;
  if (!a || !ACTIONS.includes(a.action)) return;
  if (a.mode === 'idle' || a.paused || a.targetTime - Date.now() > 5000) {
    timer = { ...a, phase: 'running' };
  } else if (a.repeat && a.mode === 'clock') {
    addHistory(a, 'missed');
    timer = makeClockTimer({ action: a.action }, a.time, true);
    persistActive();
  } else {
    addHistory(a, 'missed');
    store.active = null;
    saveStore();
  }
}

// ---------------------------------------------------------------------------
// Tema
// ---------------------------------------------------------------------------
const BG = { dark: '#0b0c11', light: '#f4f5f8', oled: '#000000' };

function applyTheme() {
  const th = store.settings.theme;
  const source = th === 'light' ? 'light' : th === 'system' ? 'system' : 'dark';
  if (nativeTheme.themeSource !== source) nativeTheme.themeSource = source;
  applyBackground();
}

function applyBackground() {
  const bg = bgColor();
  for (const w of [mainWindow, warningWindow, miniWindow]) {
    if (w && !w.isDestroyed()) w.setBackgroundColor(bg);
  }
}

function bgColor() {
  const th = store.settings.theme;
  if (th === 'system') return nativeTheme.shouldUseDarkColors ? BG.dark : BG.light;
  return BG[th] || BG.dark;
}

// ---------------------------------------------------------------------------
// Pencereler
// ---------------------------------------------------------------------------
let mainWindow = null;
let warningWindow = null;
let miniWindow = null;
let tray = null;
let quitting = false;

const secureWebPrefs = () => ({
  preload: asset('preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  spellcheck: false,
});

function hardenWindow(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 460,
    height: 780,
    minWidth: 420,
    minHeight: 690,
    show: false,
    frame: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: bgColor(),
    title: tr('app.name'),
    icon: asset('assets', 'icon.png'),
    webPreferences: secureWebPrefs(),
  });
  hardenWindow(mainWindow);
  mainWindow.loadFile(asset('src', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    if (!START_HIDDEN) mainWindow.show();
  });
  mainWindow.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    if (store.settings.closeToTray) {
      mainWindow.hide();
      if (!store.settings.trayHintShown) {
        store.settings.trayHintShown = true;
        saveStore();
        notify(tr('n.trayTitle'), tr('n.trayBody'), showMain);
      }
    } else {
      requestQuit();
    }
  });
  // Windows kapanırken pencere kapanmayı engellemesin
  mainWindow.on('session-end', () => { quitting = true; });
  mainWindow.on('query-session-end', () => { quitting = true; });
}

function showMain() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function toggleMain() {
  if (!mainWindow) return;
  if (mainWindow.isVisible() && mainWindow.isFocused()) mainWindow.hide();
  else showMain();
}

function showWarning() {
  if (!timer) return;
  timer.warnShownAt = Date.now();
  if (warningWindow && !warningWindow.isDestroyed()) {
    warningWindow.showInactive();
    return;
  }
  const { workArea } = screen.getPrimaryDisplay();
  const w = 460, h = 300;
  warningWindow = new BrowserWindow({
    width: w,
    height: h,
    x: Math.round(workArea.x + (workArea.width - w) / 2),
    y: Math.round(workArea.y + (workArea.height - h) / 2),
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    show: false,
    backgroundColor: bgColor(),
    title: tr('app.name'),
    icon: asset('assets', 'icon.png'),
    webPreferences: secureWebPrefs(),
  });
  hardenWindow(warningWindow);
  warningWindow.setAlwaysOnTop(true, 'screen-saver');
  warningWindow.loadFile(asset('src', 'warning.html'));
  warningWindow.once('ready-to-show', () => {
    if (warningWindow && !warningWindow.isDestroyed()) {
      warningWindow.show();
      warningWindow.flashFrame(true);
    }
  });
  warningWindow.on('closed', () => { warningWindow = null; });
}

function hideWarning() {
  if (warningWindow && !warningWindow.isDestroyed()) warningWindow.destroy();
  warningWindow = null;
}

function showMini() {
  if (!timer) return;
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.showInactive();
    return;
  }
  const w = 248, h = 76;
  const { workArea } = screen.getPrimaryDisplay();
  let pos = store.settings.miniPos;
  const visible = pos && screen.getAllDisplays().some((d) =>
    pos.x >= d.workArea.x - 20 && pos.y >= d.workArea.y - 20 &&
    pos.x + w <= d.workArea.x + d.workArea.width + 20 && pos.y + h <= d.workArea.y + d.workArea.height + 20);
  if (!visible) pos = { x: workArea.x + workArea.width - w - 24, y: workArea.y + workArea.height - h - 24 };
  miniWindow = new BrowserWindow({
    width: w,
    height: h,
    x: pos.x,
    y: pos.y,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    backgroundColor: bgColor(),
    title: tr('btn.mini'),
    webPreferences: secureWebPrefs(),
  });
  hardenWindow(miniWindow);
  miniWindow.setAlwaysOnTop(true, 'floating');
  miniWindow.loadFile(asset('src', 'mini.html'));
  miniWindow.once('ready-to-show', () => miniWindow && miniWindow.showInactive());
  miniWindow.on('moved', () => {
    if (!miniWindow) return;
    const [x, y] = miniWindow.getPosition();
    store.settings.miniPos = { x, y };
    saveStore();
  });
  miniWindow.on('closed', () => { miniWindow = null; updateTray(); });
  updateTray();
}

function hideMini() {
  if (miniWindow && !miniWindow.isDestroyed()) miniWindow.destroy();
  miniWindow = null;
}

function toggleMini() {
  if (miniWindow) hideMini();
  else showMini();
  updateTray();
  return !!miniWindow;
}

function sendAll(channel, payload) {
  for (const w of [mainWindow, warningWindow, miniWindow]) {
    if (w && !w.isDestroyed()) w.webContents.send(channel, payload);
  }
}

let lastTrayText = '';
function broadcast() {
  const snap = snapshot();
  snap.miniOpen = !!miniWindow;
  sendAll('state', snap);

  if (mainWindow && !mainWindow.isDestroyed()) {
    if (snap.active && snap.totalMs && snap.remainingMs != null) {
      const p = 1 - Math.max(0, snap.remainingMs) / snap.totalMs;
      mainWindow.setProgressBar(Math.min(1, Math.max(0.001, p)), {
        mode: snap.paused ? 'paused' : snap.phase === 'warning' ? 'error' : 'normal',
      });
    } else if (snap.active && snap.mode === 'idle') {
      mainWindow.setProgressBar(snap.phase === 'warning' ? 1 : 2, { mode: snap.phase === 'warning' ? 'error' : 'indeterminate' });
    } else {
      mainWindow.setProgressBar(-1);
    }
  }

  if (tray) {
    const text = trayTooltip(snap);
    if (text !== lastTrayText) {
      lastTrayText = text;
      tray.setToolTip(text);
    }
  }
}

function fmtClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function trayTooltip(snap) {
  const app_ = tr('app.name');
  if (!snap.active) return tr('tip.ready', { app: app_ });
  const head = `${app_} — ${actionName(snap.action)}${snap.paused ? ' ' + tr('tip.paused') : ''}`;
  if (snap.mode === 'idle' && snap.phase !== 'warning') return `${head}\n${describe(timer)}`;
  return `${head}\n${tr('tip.remaining', { time: fmtClock(snap.remainingMs) })}`;
}

// ---------------------------------------------------------------------------
// Sistem tepsisi
// ---------------------------------------------------------------------------
function createTray() {
  tray = new Tray(nativeImage.createFromPath(asset('assets', 'tray.png')));
  tray.on('click', showMain);
  tray.on('double-click', showMain);
  updateTray();
}

function quickStart(action, minutes) {
  startTimer({ action, mode: 'duration', seconds: minutes * 60 });
  notify(tr('n.startedTitle'), `${actionName(action)} · ${describe(timer)}`, showMain);
}

function updateTray() {
  if (!tray) return;
  tray.setImage(nativeImage.createFromPath(asset('assets', timer ? 'tray-active.png' : 'tray.png')));
  const items = [{ label: tr('tray.show'), click: showMain }, { type: 'separator' }];
  if (timer) {
    items.push({ label: `${actionName(timer.action)} · ${describe(timer)}`, enabled: false });
    if (timer.mode !== 'idle') {
      items.push({ label: tr('tray.snooze', { n: 5 }), click: () => extend(5) });
      items.push({ label: tr('tray.snooze', { n: 15 }), click: () => extend(15) });
    }
    if (timer.mode === 'duration') {
      items.push(timer.paused ? { label: tr('btn.resume'), click: resume } : { label: tr('btn.pause'), click: pause });
    }
    items.push({ label: tr('btn.mini'), type: 'checkbox', checked: !!miniWindow, click: toggleMini });
    items.push({ label: tr('btn.cancel'), click: () => stopTimer('cancelled') });
  } else {
    const q = (action, min) => ({
      label: tr('tray.quickItem', { action: actionName(action), d: I18N.fmtMinutes(L(), min) }),
      click: () => quickStart(action, min),
    });
    items.push({
      label: tr('tray.quick'),
      submenu: [q('shutdown', 30), q('shutdown', 60), q('shutdown', 120), { type: 'separator' }, q('sleep', 30), q('sleep', 60)],
    });
    if (store.presets.length) {
      items.push({
        label: tr('tray.presets'),
        submenu: store.presets.map((p) => ({ label: p.name, click: () => startPreset(p) })),
      });
    }
  }
  items.push({ type: 'separator' }, { label: tr('tray.quit'), click: requestQuit });
  tray.setContextMenu(Menu.buildFromTemplate(items));
}

function presetConfig(p) {
  return { action: p.action, mode: p.mode, seconds: (p.minutes || 0) * 60, time: p.time, idleMinutes: p.idleMinutes, repeat: !!p.repeat };
}

function startPreset(p) {
  try {
    startTimer(presetConfig(p));
    notify(tr('n.presetStarted', { name: p.name }), `${actionName(p.action)} · ${describe(timer)}`, showMain);
  } catch (e) {
    notify(tr('n.presetFailed'), e.message);
  }
}

function onTimerChanged() {
  updateTray();
  broadcast();
  sendAll('store', storePayload());
}

// ---------------------------------------------------------------------------
// Bildirimler, kısayollar, güncelleme, çıkış
// ---------------------------------------------------------------------------
function notify(title, body, onClick) {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: asset('assets', 'icon.png'), silent: !store.settings.sound });
  if (onClick) n.on('click', onClick);
  n.show();
}

function applyShortcuts() {
  globalShortcut.unregisterAll();
  if (!store.settings.globalShortcuts) return;
  try {
    globalShortcut.register('CommandOrControl+Alt+Z', toggleMain);
    globalShortcut.register('CommandOrControl+Alt+X', () => { if (timer) stopTimer('cancelled'); });
  } catch (e) {
    console.error('Kısayol kaydedilemedi:', e.message);
  }
}

function newerThan(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

let latestRelease = null;
async function checkForUpdates() {
  // Uygulamanın yaptığı TEK ağ isteği: GitHub'daki son sürüm bilgisini okumak.
  const res = await net.fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { 'User-Agent': 'Zamanlayici-update-check', Accept: 'application/vnd.github+json' },
  });
  if (res.status === 404) return { current: app.getVersion(), latest: app.getVersion(), newer: false };
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  const latest = String(data.tag_name || '').replace(/^v/, '');
  const url = String(data.html_url || '');
  latestRelease = url.startsWith(`${REPO_URL}/releases/`) ? url : `${REPO_URL}/releases/latest`;
  return { current: app.getVersion(), latest, newer: newerThan(latest, app.getVersion()) };
}

async function startupUpdateCheck() {
  if (!store.settings.checkUpdates || !app.isPackaged) return;
  try {
    const r = await checkForUpdates();
    if (r.newer && store.settings.lastNotifiedVersion !== r.latest) {
      store.settings.lastNotifiedVersion = r.latest;
      saveStore();
      notify(tr('n.updateTitle', { v: r.latest }), tr('n.updateBody'), () => shell.openExternal(latestRelease));
    }
  } catch { /* çevrimdışı olabilir */ }
}

async function requestQuit() {
  if (timer) {
    const handoff = (timer.action === 'shutdown' || timer.action === 'restart') && timer.mode !== 'idle' && !timer.paused;
    const buttons = handoff ? [tr('q.handoff'), tr('q.cancelQuit'), tr('q.back')] : [tr('q.cancelQuit'), tr('q.back')];
    const parent = mainWindow && mainWindow.isVisible() ? mainWindow : undefined;
    const { response } = await dialog.showMessageBox(parent, {
      type: 'question',
      title: tr('q.title'),
      message: tr('q.message'),
      detail: handoff ? tr('q.detailHandoff') : tr('q.detailCancel'),
      buttons,
      defaultId: 0,
      cancelId: buttons.length - 1,
      noLink: true,
    });
    if (response === buttons.length - 1) return;
    if (handoff && response === 0) {
      const secs = Math.max(1, Math.round(remainingMs() / 1000));
      runCommand(`shutdown ${timer.action === 'restart' ? '/r' : '/s'} /t ${secs}`);
      stopTimer('handoff', { silent: true });
    } else {
      stopTimer('cancelled', { silent: true });
    }
  }
  quitting = true;
  app.quit();
}

function applyLoginItem() {
  if (!app.isPackaged) return;
  const exe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  app.setLoginItemSettings({ openAtLogin: !!store.settings.launchAtStartup, path: exe, args: ['--hidden'] });
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------
function storePayload() {
  return { settings: store.settings, presets: store.presets, history: store.history };
}

function wrap(fn) {
  return async (_e, ...args) => {
    try {
      return { ok: true, value: await fn(...args) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };
}

function sanitizeSettings(patch) {
  const s = store.settings;
  const p = patch || {};
  if (p.language in I18N.LANGS) s.language = p.language;
  if (THEMES.includes(p.theme)) s.theme = p.theme;
  if (ACCENTS.includes(p.accent)) s.accent = p.accent;
  if ('warningSeconds' in p) s.warningSeconds = Math.max(10, Math.min(300, Number(p.warningSeconds) || 60));
  if ('notifyMinutes' in p) s.notifyMinutes = Math.max(0, Math.min(60, Number(p.notifyMinutes) || 0));
  for (const k of ['forceClose', 'closeToTray', 'launchAtStartup', 'sound', 'miniAuto', 'globalShortcuts', 'checkUpdates']) {
    if (k in p) s[k] = !!p[k];
  }
}

function registerIpc() {
  ipcMain.handle('init', wrap(() => ({
    ...storePayload(),
    state: { ...snapshot(), miniOpen: !!miniWindow },
    version: app.getVersion(),
    dryRun: DRY_RUN,
    repo: REPO_URL,
  })));
  ipcMain.handle('timer:start', wrap((cfg) => startTimer(cfg)));
  ipcMain.handle('timer:cancel', wrap(() => { stopTimer('cancelled'); return snapshot(); }));
  ipcMain.handle('timer:pause', wrap(() => pause()));
  ipcMain.handle('timer:resume', wrap(() => resume()));
  ipcMain.handle('timer:extend', wrap((m) => extend(m)));
  ipcMain.handle('timer:snooze', wrap((m) => snooze(m)));
  ipcMain.handle('timer:now', wrap(() => { executeNow(); return snapshot(); }));

  ipcMain.handle('settings:set', wrap((patch) => {
    const before = { ...store.settings };
    sanitizeSettings(patch);
    saveStore();
    const s = store.settings;
    if (before.launchAtStartup !== s.launchAtStartup) applyLoginItem();
    if (before.theme !== s.theme) applyTheme();
    if (before.globalShortcuts !== s.globalShortcuts) applyShortcuts();
    if (before.language !== s.language) {
      updateTray();
      lastTrayText = '';
    }
    sendAll('store', storePayload());
    broadcast();
    return s;
  }));

  ipcMain.handle('presets:save', wrap((list) => {
    if (!Array.isArray(list)) throw new Error(tr('err.invalid'));
    store.presets = list
      .filter((p) => p && ACTIONS.includes(p.action) && MODES.includes(p.mode))
      .slice(0, 24)
      .map((p) => ({
        id: p.id || uid(),
        name: String(p.name || '').slice(0, 40) || actionName(p.action),
        action: p.action,
        mode: p.mode,
        minutes: p.mode === 'duration' ? Math.max(1, Math.round(p.minutes)) : undefined,
        time: p.mode === 'clock' ? p.time : undefined,
        repeat: p.mode === 'clock' ? !!p.repeat : undefined,
        idleMinutes: p.mode === 'idle' ? Math.max(1, Math.round(p.idleMinutes)) : undefined,
      }));
    saveStore();
    updateTray();
    sendAll('store', storePayload());
    return store.presets;
  }));
  ipcMain.handle('presets:start', wrap((id) => {
    const p = store.presets.find((x) => x.id === id);
    if (!p) throw new Error(tr('err.notFound'));
    return startTimer(presetConfig(p));
  }));

  ipcMain.handle('history:clear', wrap(() => {
    store.history = [];
    saveStore();
    sendAll('store', storePayload());
    return [];
  }));

  ipcMain.handle('mini:toggle', wrap(() => { const open = toggleMini(); broadcast(); return open; }));
  ipcMain.handle('update:check', wrap(() => checkForUpdates()));
  ipcMain.handle('app:open', wrap((which) => {
    // Yalnızca bilinen GitHub adresleri açılabilir.
    if (which === 'repo') return shell.openExternal(REPO_URL);
    if (which === 'release') return shell.openExternal(latestRelease || `${REPO_URL}/releases/latest`);
    if (which === 'main') return showMain();
    return null;
  }));

  ipcMain.handle('win:minimize', wrap(() => mainWindow && mainWindow.minimize()));
  ipcMain.handle('win:close', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w === warningWindow) hideWarning();
    else if (w === miniWindow) { hideMini(); updateTray(); broadcast(); }
    else if (w) w.close();
    return { ok: true };
  });
  ipcMain.handle('app:quit', wrap(() => requestQuit()));
}

// ---------------------------------------------------------------------------
// Başlangıç
// ---------------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showMain);
  app.setAppUserModelId(APP_ID);
  Menu.setApplicationMenu(null);

  app.whenReady().then(() => {
    loadStore();
    applyTheme();
    restoreActive();
    registerIpc();
    createMainWindow();
    createTray();
    applyLoginItem();
    applyShortcuts();
    nativeTheme.on('updated', applyBackground);

    powerMonitor.on('resume', () => tick());
    tickHandle = setInterval(tick, 250);
    tick();
    setTimeout(startupUpdateCheck, 8000);
  });

  app.on('before-quit', () => {
    quitting = true;
    if (tickHandle) clearInterval(tickHandle);
    if (timer) persistActive();
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => { /* tepside yaşamaya devam et */ });
}
