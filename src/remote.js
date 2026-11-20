'use strict';
/* Telefon arayüzü — bilgisayardaki uygulamanın yerel ağ sunucusuyla konuşur. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (id) => `<svg><use href="#i-${id}"/></svg>`;

const ACTION_ORDER = ['shutdown', 'restart', 'sleep', 'hibernate', 'logoff', 'lock'];
const MAX = { duration: 48 * 60, idle: 600 };

// ---------------------------------------------------------------------------
// Bağlantı anahtarı: QR koddaki adresin # kısmından gelir, sonra telefonda saklanır
// ---------------------------------------------------------------------------
let token = '';
try {
  const m = location.hash.match(/k=([A-Za-z0-9_-]+)/);
  if (m) {
    token = m[1];
    localStorage.setItem('zk', token);
    history.replaceState(null, '', location.pathname);
  } else {
    token = localStorage.getItem('zk') || '';
  }
} catch { /* gizli sekme: yalnızca bu oturumda çalışır */ }

let settings = { language: (navigator.language || 'en').slice(0, 2), theme: 'system', accent: 'amber' };
let presets = [];
let server = { active: false };
let receivedAt = 0;
let failures = 0;
let busy = false;

const lang = () => (I18N.LANGS[settings.language] ? settings.language : 'en');
const t = (k, v) => I18N.t(lang(), k, v);
const th = (k, v) => { const s = {}; for (const x in v) s[x] = esc(v[x]); return I18N.t(lang(), k, s); };
const actionName = (a) => t(`action.${a}`);
const fmtMinutes = (m) => I18N.fmtMinutes(lang(), m);

// ---------------------------------------------------------------------------
// Kurulum değerleri (telefonda hatırlanır)
// ---------------------------------------------------------------------------
function defaultClock() {
  const d = new Date(Date.now() + 60 * 60000);
  return (d.getHours() * 60 + Math.ceil(d.getMinutes() / 15) * 15) % 1440;
}
const setup = { action: 'shutdown', mode: 'duration', duration: 30, clock: defaultClock(), idle: 30, repeat: false };
try { Object.assign(setup, JSON.parse(localStorage.getItem('zsetup') || '{}')); } catch { /* yok say */ }
setup.clock = defaultClock();
const saveSetup = () => { try { localStorage.setItem('zsetup', JSON.stringify(setup)); } catch { /* yok say */ } };

// ---------------------------------------------------------------------------
// Ağ
// ---------------------------------------------------------------------------
async function api(path, body) {
  const res = await fetch(`/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'X-Token': token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw Object.assign(new Error('unauthorized'), { auth: true });
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function poll() {
  if (!token) return showMessage('key', t('remote.unauthorized'), t('remote.unauthorizedDesc'));
  try {
    const d = await api('state');
    failures = 0;
    const langChanged = d.settings.language !== settings.language;
    settings = d.settings;
    presets = d.presets || [];
    server = d.state;
    receivedAt = Date.now();
    $('#offlineBanner').hidden = true;
    showMain();
    applyTheme();
    if (langChanged || !applied) applyI18n();
    render();
  } catch (e) {
    if (e.auth) return showMessage('key', t('remote.unauthorized'), t('remote.unauthorizedDesc'));
    failures += 1;
    if (failures >= 2) {
      if (!applied) showMessage('wifi', t('remote.offline'), t('remote.offlineDesc'));
      else $('#offlineBanner').hidden = false;
    }
  }
}

async function act(path, body) {
  if (busy) return null;
  busy = true;
  try {
    const r = await api(path, body);
    if (r.state) { server = r.state; receivedAt = Date.now(); render(); }
    return r;
  } catch (e) {
    toast(e.auth ? t('remote.unauthorized') : e.message, 'error');
    return null;
  } finally {
    busy = false;
  }
}

// ---------------------------------------------------------------------------
// Görünüm
// ---------------------------------------------------------------------------
let applied = false;

function applyTheme() {
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = settings.theme === 'system' ? (dark ? 'dark' : 'light') : (settings.theme || 'dark');
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.accent = settings.accent || 'amber';
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  $('meta[name="theme-color"]').setAttribute('content', bg || '#0b0c11');
}

function applyI18n() {
  applied = true;
  document.documentElement.lang = lang();
  document.title = t('app.name');
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $('#actions').innerHTML = ACTION_ORDER.map((a) => `
    <button class="action" data-action="${a}">${icon(a)}<span>${esc(t(`short.${a}`)).replace('\n', '<br>')}</span></button>`).join('');
  writeInputs();
}

function showMessage(ic, title, desc) {
  $('#screenMain').hidden = true;
  $('#screenMsg').hidden = false;
  $('#msgIcon').setAttribute('href', `#i-${ic}`);
  $('#msgTitle').textContent = title;
  $('#msgDesc').textContent = desc;
  $('#pill').hidden = true;
}

function showMain() {
  $('#screenMsg').hidden = true;
  $('#screenMain').hidden = false;
  $('#pill').hidden = false;
}

const fmtHM = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
function dayWord(ts) {
  const d = new Date(ts), n = new Date();
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 86400000);
  if (diff === 0) return t('day.today');
  if (diff === 1) return t('day.tomorrow');
  return d.toLocaleDateString(I18N.LOCALES[lang()], { day: 'numeric', month: 'short' });
}
function clockTarget(min) {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(Math.floor(min / 60), min % 60);
  if (d.getTime() <= Date.now() + 1000) d.setDate(d.getDate() + 1);
  return d.getTime();
}
function countdownHTML(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const c = '<span class="colon">:</span>';
  return h ? `${h}${c}${pad(m)}${c}${pad(s)}` : `${pad(m)}${c}${pad(s)}`;
}

// Halka çizgileri
const ticks = [];
(function buildTicks() {
  const g = $('#ticks');
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const major = i % 5 === 0;
    const r1 = major ? 133 : 136, r2 = 142;
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', 150 + Math.sin(a) * r1); l.setAttribute('y1', 150 - Math.cos(a) * r1);
    l.setAttribute('x2', 150 + Math.sin(a) * r2); l.setAttribute('y2', 150 - Math.cos(a) * r2);
    l.setAttribute('class', major ? 'tick major' : 'tick');
    g.appendChild(l);
    ticks.push(l);
  }
})();
function setArc(frac) {
  frac = clamp(frac || 0, 0, 1);
  const arc = $('#arc');
  arc.style.strokeDasharray = `${(frac * 1000).toFixed(1)} 1000`;
  arc.style.opacity = frac <= 0.0005 ? 0 : 1;
  const on = Math.round(frac * 60);
  ticks.forEach((tk, i) => tk.classList.toggle('on', i < on));
}

/** Son sunucu durumunu, aradaki geçen süreyle güncelleyerek döndürür (akıcı geri sayım). */
function live() {
  const s = { ...server };
  if (s.active && s.remainingMs != null && !s.paused) s.remainingMs -= Date.now() - receivedAt;
  if (s.active && s.mode === 'idle' && s.phase !== 'warning') s.idleSeconds = (s.idleSeconds || 0) + (Date.now() - receivedAt) / 1000;
  return s;
}

function render() {
  const s = live();
  const running = !!s.active;
  const warning = running && s.phase === 'warning';
  document.body.classList.toggle('running', running);
  document.body.classList.toggle('warning', warning);
  document.body.classList.toggle('paused', running && !!s.paused);
  $('#running').hidden = !running;
  $('#setupSec').hidden = running;
  $('#presetsSec').hidden = running || !presets.length;

  const pill = $('#pill');
  pill.className = 'state-pill' + (running ? (warning ? ' warn' : ' on') : '');
  pill.textContent = t(!running ? 'state.ready' : warning ? 'state.warning' : s.paused ? 'state.paused' : s.mode === 'idle' ? 'state.watching' : 'state.running');

  if (running) renderRunning(s, warning);
  else renderSetup();
}

function renderRunning(s, warning) {
  $('#runTop').innerHTML = `${icon(s.action)}${esc(actionName(s.action))}${s.repeat ? icon('repeat') : ''}`;
  const digits = $('#runDigits');
  let frac;
  if (s.mode === 'idle' && !warning) {
    frac = s.idleSeconds / (s.idleMinutes * 60);
    digits.innerHTML = countdownHTML(s.idleSeconds * 1000);
    digits.classList.remove('long');
    $('#runSub').innerHTML = th('sub.idleRun', { n: s.idleMinutes });
  } else {
    const total = warning && s.mode === 'idle' ? s.warningSeconds * 1000 : s.totalMs;
    frac = s.remainingMs / total;
    digits.innerHTML = countdownHTML(s.remainingMs);
    digits.classList.toggle('long', s.remainingMs >= 36000000);
    if (warning) $('#runSub').textContent = t(`will.${s.action}`);
    else if (s.paused) $('#runSub').innerHTML = `<b>${esc(t('sub.paused'))}</b>`;
    else {
      const end = new Date(s.targetTime);
      $('#runSub').innerHTML = th(s.repeat ? 'sub.nextDaily' : 'sub.end', { day: dayWord(end), time: fmtHM(end) });
    }
  }
  setArc(frac);
  const isIdle = s.mode === 'idle', isDur = s.mode === 'duration';
  $('#runCtrls').hidden = isIdle;
  $('#runCtrls').classList.toggle('two', !isDur);
  $('#btnPause').hidden = !isDur;
  $('#btnPause').innerHTML = s.paused ? `${icon('play')}<span>${esc(t('btn.resume'))}</span>` : `${icon('pause')}<span>${esc(t('btn.pause'))}</span>`;
}

function renderSetup() {
  $$('.action').forEach((b) => b.classList.toggle('active', b.dataset.action === setup.action));
  const modes = $$('#modes button');
  modes.forEach((b) => b.classList.toggle('active', b.dataset.mode === setup.mode));
  $('#modeThumb').style.transform = `translateX(${modes.findIndex((b) => b.dataset.mode === setup.mode) * 100}%)`;
  $$('.p-fields').forEach((f) => f.classList.toggle('show', f.dataset.for === setup.mode));
  $('#repeatRow').hidden = setup.mode !== 'clock';
  $('#repeat').checked = !!setup.repeat;
  $('#startLabel').textContent = t(setup.mode === 'idle' ? 'btn.startIdle' : 'btn.start');

  const h = t('unit.h'), m = t('unit.m');
  let chips;
  if (setup.mode === 'duration') {
    chips = [['+5', 5], ['+15', 15], ['+30', 30], [`+1 ${h}`, 60], [`+2 ${h}`, 120]].map(([l, v]) => `<button class="chip" data-add="${v}">${l}</button>`);
    chips.push(`<button class="chip reset" data-set="0">${esc(t('btn.reset'))}</button>`);
  } else if (setup.mode === 'clock') {
    chips = ['22:00', '23:00', '23:30', '00:00', '01:00', '02:00'].map((x) => {
      const [hh, mm] = x.split(':').map(Number);
      return `<button class="chip" data-set="${hh * 60 + mm}">${x}</button>`;
    });
  } else {
    chips = [5, 10, 15, 30, 60, 120].map((v) => `<button class="chip" data-set="${v}">${v >= 60 ? `${v / 60} ${h}` : `${v} ${m}`}</button>`);
  }
  const html = chips.join('');
  if ($('#chips').__html !== html) { $('#chips').innerHTML = html; $('#chips').__html = html; }
  renderSub();
}

function renderSub() {
  const v = setup[setup.mode];
  let html;
  if (setup.mode === 'duration') {
    if (v > 0) { const end = new Date(Date.now() + v * 60000); html = th('sub.around', { day: dayWord(end), time: fmtHM(end) }); }
    else html = esc(t('sub.pick'));
  } else if (setup.mode === 'clock') {
    const target = clockTarget(v);
    html = th('sub.in', { day: dayWord(target), d: fmtMinutes(Math.max(1, Math.round((target - Date.now()) / 60000))) });
  } else html = esc(t('sub.idle'));
  $('#valueSub').innerHTML = html;
}

// ---------------------------------------------------------------------------
// Kutulara yazma — seçili moda uygun aralıklarla
// ---------------------------------------------------------------------------
const focused = (el) => document.activeElement === el;

function writeInputs() {
  const d = setup.duration;
  if (!focused($('#inH'))) $('#inH').value = String(Math.floor(d / 60));
  if (!focused($('#inM'))) $('#inM').value = pad(d % 60);
  if (!focused($('#inT'))) $('#inT').value = `${pad(Math.floor(setup.clock / 60))}:${pad(setup.clock % 60)}`;
  if (!focused($('#inI'))) $('#inI').value = String(setup.idle);
}

function readDuration() {
  const h = clamp(parseInt($('#inH').value, 10) || 0, 0, MAX.duration / 60);
  const m = clamp(parseInt($('#inM').value, 10) || 0, 0, 999);
  setup.duration = clamp(h * 60 + m, 0, MAX.duration);
}

for (const id of ['inH', 'inM', 'inI']) {
  const el = $(`#${id}`);
  el.addEventListener('focus', () => setTimeout(() => el.select(), 0));
  el.addEventListener('input', () => {
    el.value = el.value.replace(/\D/g, '');
    if (id === 'inI') setup.idle = clamp(parseInt(el.value, 10) || 1, 1, MAX.idle);
    else readDuration();
    saveSetup();
    renderSub();
  });
  el.addEventListener('blur', () => { writeInputs(); renderSub(); }); // 90 dk → 1 sa 30 dk
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
}
$('#inT').addEventListener('input', () => {
  const [h, m] = ($('#inT').value || '').split(':').map(Number);
  if (Number.isFinite(h) && Number.isFinite(m)) { setup.clock = h * 60 + m; saveSetup(); renderSub(); }
});

// ---------------------------------------------------------------------------
// Olaylar
// ---------------------------------------------------------------------------
$('#actions').addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]');
  if (!b) return;
  setup.action = b.dataset.action;
  saveSetup();
  renderSetup();
});
$('#modes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]');
  if (!b) return;
  setup.mode = b.dataset.mode;
  saveSetup();
  renderSetup();
});
$('#chips').addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  if (b.dataset.add) setup.duration = clamp(setup.duration + Number(b.dataset.add), 0, MAX.duration);
  else if (setup.mode === 'duration') setup.duration = Number(b.dataset.set);
  else setup[setup.mode] = Number(b.dataset.set);
  saveSetup();
  writeInputs();
  renderSetup();
});
$('#repeat').addEventListener('change', (e) => { setup.repeat = e.target.checked; saveSetup(); });

$('#btnStart').addEventListener('click', async () => {
  document.activeElement && document.activeElement.blur();
  let cfg;
  if (setup.mode === 'duration') {
    if (!setup.duration) return toast(t('toast.pickDuration'), 'error');
    cfg = { action: setup.action, mode: 'duration', seconds: setup.duration * 60 };
  } else if (setup.mode === 'clock') {
    cfg = { action: setup.action, mode: 'clock', time: `${pad(Math.floor(setup.clock / 60))}:${pad(setup.clock % 60)}`, repeat: !!setup.repeat };
  } else {
    cfg = { action: setup.action, mode: 'idle', idleMinutes: setup.idle };
  }
  if (await act('start', cfg)) {
    toast(t('toast.started', { action: actionName(setup.action) }));
    if (navigator.vibrate) navigator.vibrate(30);
  }
});
$('#btnCancel').addEventListener('click', async () => {
  if (await act('cancel', {})) toast(t('toast.cancelled'));
});
$('#runCtrls').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.extend) {
    if (await act('extend', { minutes: Number(b.dataset.extend) })) toast(t('toast.added', { n: b.dataset.extend }));
  } else if (b.id === 'btnPause') {
    await act(server.paused ? 'resume' : 'pause', {});
  }
});
$('#presetList').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-play]');
  if (b && (await act('preset', { id: b.dataset.play }))) toast(t('toast.presetStarted'));
});

function renderPresets() {
  const html = presets.map((p) => `
    <div class="item">
      <div class="item-icon">${icon(p.action)}</div>
      <div class="item-body">
        <div class="item-title">${esc(p.name)}</div>
        <div class="item-sub">${esc(actionName(p.action))} · ${esc(I18N.describe(lang(), p))}</div>
      </div>
      <button class="mini-btn play" data-play="${esc(p.id)}">${icon('play')}</button>
    </div>`).join('');
  const list = $('#presetList');
  if (list.__html !== html) { list.innerHTML = html; list.__html = html; }
}

let toastTimer;
function toast(text, kind = 'ok') {
  const el = $('#toast');
  el.className = 'toast ' + kind;
  el.innerHTML = `${icon(kind === 'error' ? 'alert' : 'check')}<span>${esc(text)}</span>`;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// ---------------------------------------------------------------------------
// Başlat
// ---------------------------------------------------------------------------
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
poll().then(() => renderPresets());
setInterval(() => { if (!document.hidden) poll().then(renderPresets); }, 1500);
setInterval(() => { if (applied && server.active) render(); }, 250);
document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
