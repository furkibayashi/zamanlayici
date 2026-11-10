'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const ACTION_ORDER = ['shutdown', 'restart', 'sleep', 'hibernate', 'logoff', 'lock'];
const ACCENTS = {
  amber: ['#ffb86b', '#ff7a59'],
  cyan: ['#5ee7ff', '#3d8bff'],
  violet: ['#b49cff', '#7a5cff'],
  green: ['#7ef0a8', '#2ec8a0'],
  rose: ['#ff8fb1', '#ff5d7a'],
};
const MAX = { duration: 48 * 60, idle: 600 };

const icon = (id) => `<svg><use href="#i-${id}"/></svg>`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let ctx = { settings: { language: 'tr' }, presets: [], history: [], version: '', dryRun: false };
let state = { active: false };
let currentView = 'timer';

const lang = () => ctx.settings.language || 'en';
const t = (key, vars) => I18N.t(lang(), key, vars);
/** HTML şablonlu çeviri: değişkenler kaçışlanır */
const th = (key, vars) => {
  const safe = {};
  for (const k in vars) safe[k] = esc(vars[k]);
  return I18N.t(lang(), key, safe);
};
const actionName = (a) => t(`action.${a}`);
const fmtMinutes = (m) => I18N.fmtMinutes(lang(), m);

// ---------------------------------------------------------------------------
// Kurulum durumu (son seçimler bu cihazda hatırlanır)
// ---------------------------------------------------------------------------
function defaultClock() {
  const d = new Date(Date.now() + 60 * 60000);
  return (d.getHours() * 60 + Math.ceil(d.getMinutes() / 15) * 15) % 1440;
}

const setup = { action: 'shutdown', mode: 'duration', duration: 30, clock: defaultClock(), idle: 30, repeat: false };
try {
  const saved = JSON.parse(localStorage.getItem('setup') || '{}');
  if (ACTION_ORDER.includes(saved.action)) setup.action = saved.action;
  if (['duration', 'clock', 'idle'].includes(saved.mode)) setup.mode = saved.mode;
  if (Number.isFinite(saved.duration)) setup.duration = clamp(saved.duration, 0, MAX.duration);
  if (Number.isFinite(saved.idle)) setup.idle = clamp(saved.idle, 1, MAX.idle);
  setup.repeat = !!saved.repeat;
} catch { /* yok say */ }

function saveSetup() {
  try {
    localStorage.setItem('setup', JSON.stringify({
      action: setup.action, mode: setup.mode, duration: setup.duration, idle: setup.idle, repeat: setup.repeat,
    }));
  } catch { /* yok say */ }
}

const value = () => setup[setup.mode];

function adjust(delta) {
  if (state.active) return;
  const m = setup.mode;
  if (m === 'clock') setup.clock = (((setup.clock + delta) % 1440) + 1440) % 1440;
  else if (m === 'duration') setup.duration = clamp(setup.duration + delta, 0, MAX.duration);
  else setup.idle = clamp(setup.idle + delta, 1, MAX.idle);
  saveSetup();
  renderTimer();
}

function setValue(v) {
  const m = setup.mode;
  if (m === 'clock') setup.clock = ((v % 1440) + 1440) % 1440;
  else setup[m] = clamp(v, m === 'idle' ? 1 : 0, MAX[m]);
  saveSetup();
  renderTimer();
}

// ---------------------------------------------------------------------------
// Biçimlendirme
// ---------------------------------------------------------------------------
const fmtHM = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

function dayWord(ts) {
  const d = new Date(ts), now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - start) / 86400000);
  if (diff === 0) return t('day.today');
  if (diff === 1) return t('day.tomorrow');
  if (diff === -1) return t('day.yesterday');
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

const describe = (d) => I18N.describe(lang(), d);

// ---------------------------------------------------------------------------
// Dil ve tema
// ---------------------------------------------------------------------------
function applyI18n() {
  document.documentElement.lang = lang();
  document.title = t('app.name');
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  $$('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  buildActions();
}

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const s = ctx.settings;
  const theme = s.theme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : (s.theme || 'dark');
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.accent = s.accent || 'amber';
}
darkQuery.addEventListener('change', applyTheme);

// ---------------------------------------------------------------------------
// Kadran
// ---------------------------------------------------------------------------
const dial = $('#dial');
const arc = $('#arc');
const knob = $('#knob');
const ticks = [];

(function buildTicks() {
  const g = $('#ticks');
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const major = i % 5 === 0;
    const r1 = major ? 133 : 136, r2 = 142;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', 150 + Math.sin(a) * r1);
    line.setAttribute('y1', 150 - Math.cos(a) * r1);
    line.setAttribute('x2', 150 + Math.sin(a) * r2);
    line.setAttribute('y2', 150 - Math.cos(a) * r2);
    line.setAttribute('class', major ? 'tick major' : 'tick');
    g.appendChild(line);
    ticks.push(line);
  }
})();

function setArc(frac, showKnob) {
  frac = clamp(frac, 0, 1);
  arc.style.strokeDasharray = `${(frac * 1000).toFixed(1)} 1000`;
  arc.style.opacity = frac <= 0.0005 ? 0 : 1;
  const on = Math.round(frac * 60);
  ticks.forEach((tk, i) => tk.classList.toggle('on', i < on));
  if (showKnob) {
    const a = frac * Math.PI * 2;
    knob.setAttribute('cx', 150 + Math.sin(a) * 118);
    knob.setAttribute('cy', 150 - Math.cos(a) * 118);
  }
}

function pointerAngle(e) {
  const r = dial.getBoundingClientRect();
  return (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI;
}

let drag = null;
dial.addEventListener('pointerdown', (e) => {
  if (state.active) return;
  dial.setPointerCapture(e.pointerId);
  dial.classList.add('dragging');
  drag = { last: pointerAngle(e), acc: 0 };
});
dial.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const a = pointerAngle(e);
  let d = a - drag.last;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  drag.last = a;
  drag.acc += d / 6; // 6° = 1 dakika, tam tur = 1 saat
  const step = Math.trunc(drag.acc);
  if (step) {
    drag.acc -= step;
    adjust(step);
  }
});
const endDrag = () => { drag = null; dial.classList.remove('dragging'); };
dial.addEventListener('pointerup', endDrag);
dial.addEventListener('pointercancel', endDrag);

$('.dial-wrap').addEventListener('wheel', (e) => {
  if (state.active) return;
  e.preventDefault();
  const dir = e.deltaY < 0 ? 1 : -1;
  const seg = e.target.closest('[data-seg]');
  let step = e.shiftKey ? 10 : 1;
  if (seg && seg.dataset.seg === 'h') step = 60;
  else if (!seg && !e.shiftKey) step = 5;
  adjust(dir * step);
}, { passive: false });

// ---------------------------------------------------------------------------
// Zamanlayıcı görünümü
// ---------------------------------------------------------------------------
function setHTML(el, html) { if (el.__html !== html) { el.innerHTML = html; el.__html = html; } }

function buildActions() {
  $('#actions').innerHTML = ACTION_ORDER.map((a, i) => `
    <button class="action" data-action="${a}" title="${esc(actionName(a))} (${i + 1})">
      <span class="key">${i + 1}</span>${icon(a)}<span>${esc(t(`short.${a}`)).replace('\n', '<br>')}</span>
    </button>`).join('');
}

function renderSetupControls() {
  $$('.action').forEach((b) => b.classList.toggle('active', b.dataset.action === setup.action));
  const modes = $$('#modes button');
  modes.forEach((b) => b.classList.toggle('active', b.dataset.mode === setup.mode));
  const idx = modes.findIndex((b) => b.dataset.mode === setup.mode);
  $('#modeThumb').style.transform = `translateX(${idx * 100}%)`;

  const h = t('unit.h'), m = t('unit.m');
  let chips;
  if (setup.mode === 'duration') {
    chips = [[`+5`, 5], [`+15`, 15], [`+30`, 30], [`+1 ${h}`, 60], [`+2 ${h}`, 120]].map(([l, v]) => `<button class="chip" data-add="${v}">${l}</button>`);
    chips.push(`<button class="chip reset" data-set="0">${esc(t('btn.reset'))}</button>`);
  } else if (setup.mode === 'clock') {
    chips = ['22:00', '23:00', '23:30', '00:00', '01:00', '02:00'].map((x) => {
      const [hh, mm] = x.split(':').map(Number);
      return `<button class="chip" data-set="${hh * 60 + mm}">${x}</button>`;
    });
  } else {
    chips = [5, 10, 15, 30, 60, 120].map((v) => `<button class="chip" data-set="${v}">${v >= 60 ? `${v / 60} ${h}` : `${v} ${m}`}</button>`);
  }
  setHTML($('#chips'), chips.join(''));
  $('#repeat').checked = setup.repeat;
}

function renderTimer() {
  const s = state;
  const running = !!s.active;
  const warning = running && s.phase === 'warning';
  document.body.classList.toggle('running', running);
  document.body.classList.toggle('warning', warning);
  document.body.classList.toggle('paused', running && !!s.paused);

  const top = $('#centerTop'), digits = $('#digits'), sub = $('#centerSub');
  const pill = $('#statePill');

  if (!running) {
    renderSetupControls();
    const v = value();
    setHTML(top, `${icon(setup.action)}${esc(actionName(setup.action))}`);
    digits.classList.remove('long');

    if (setup.mode === 'duration') {
      const h = Math.floor(v / 60), m = v % 60;
      setHTML(digits, `<span class="seg-num" data-seg="h">${h}</span><span class="unit">${esc(t('unit.h'))}</span><span class="seg-num" data-seg="m">${pad(m)}</span><span class="unit">${esc(t('unit.m'))}</span>`);
      if (v > 0) {
        const end = new Date(Date.now() + v * 60000);
        setHTML(sub, th('sub.around', { day: dayWord(end), time: fmtHM(end) }));
      } else setHTML(sub, esc(t('sub.pick')));
      setArc(v === 0 ? 0 : ((v % 60) || 60) / 60, true);
    } else if (setup.mode === 'clock') {
      const h = Math.floor(v / 60), m = v % 60;
      setHTML(digits, `<span class="seg-num" data-seg="h">${pad(h)}</span><span class="colon">:</span><span class="seg-num" data-seg="m">${pad(m)}</span>`);
      const target = clockTarget(v);
      const mins = Math.round((target - Date.now()) / 60000);
      setHTML(sub, th('sub.in', { day: dayWord(target), d: fmtMinutes(Math.max(1, mins)) }));
      setArc(((v % 60) || 60) / 60, true);
    } else {
      setHTML(digits, `<span class="seg-num" data-seg="m">${v}</span><span class="unit">${esc(t('unit.m'))}</span>`);
      setHTML(sub, esc(t('sub.idle')));
      setArc(((v % 60) || 60) / 60, true);
    }

    pill.textContent = t('state.ready');
    pill.className = 'state-pill';
    $('#runControls').hidden = true;
    $('#btnStart').hidden = false;
    $('#btnSavePreset').hidden = false;
    $('#btnCancel').hidden = true;
    $('#repeatRow').hidden = setup.mode !== 'clock';
    $('#hint').hidden = setup.mode === 'clock';
    $('#startLabel').textContent = t(setup.mode === 'idle' ? 'btn.startIdle' : 'btn.start');
  } else {
    setHTML(top, `${icon(s.action)}${esc(actionName(s.action))}${s.repeat ? icon('repeat') : ''}`);
    let frac;
    if (s.mode === 'idle' && !warning) {
      frac = (s.idleSeconds || 0) / (s.idleMinutes * 60);
      setHTML(digits, countdownHTML((s.idleSeconds || 0) * 1000));
      digits.classList.remove('long');
      setHTML(sub, th('sub.idleRun', { n: s.idleMinutes }));
    } else {
      const total = warning && s.mode === 'idle' ? s.warningSeconds * 1000 : s.totalMs;
      frac = s.remainingMs / total;
      setHTML(digits, countdownHTML(s.remainingMs));
      digits.classList.toggle('long', s.remainingMs >= 36000000);
      if (warning) setHTML(sub, esc(t(`will.${s.action}`)));
      else if (s.paused) setHTML(sub, `<b>${esc(t('sub.paused'))}</b>`);
      else {
        const end = new Date(s.targetTime);
        setHTML(sub, th(s.repeat ? 'sub.nextDaily' : 'sub.end', { day: dayWord(end), time: fmtHM(end) }));
      }
    }
    setArc(frac, false);

    pill.className = 'state-pill ' + (warning ? 'warn' : 'on');
    pill.textContent = t(warning ? 'state.warning' : s.paused ? 'state.paused' : s.mode === 'idle' ? 'state.watching' : 'state.running');

    const isDur = s.mode === 'duration';
    const isIdle = s.mode === 'idle';
    $$('#runControls [data-extend]').forEach((b) => { b.hidden = isIdle; });
    $('#btnPause').hidden = !isDur;
    $('#btnMini').classList.toggle('on', !!s.miniOpen);
    $('#runControls').hidden = false;
    $('#runControls').dataset.cols = isDur ? '4' : isIdle ? '1' : '3';
    setHTML($('#btnPause'), s.paused ? `${icon('play')}<span>${esc(t('btn.resume'))}</span>` : `${icon('pause')}<span>${esc(t('btn.pause'))}</span>`);
    $('#btnStart').hidden = true;
    $('#btnSavePreset').hidden = true;
    $('#btnCancel').hidden = false;
    $('#repeatRow').hidden = true;
    $('#hint').hidden = true;
  }

  const dot = $('#tabbar [data-view="timer"] .dot');
  if (running && currentView !== 'timer') {
    if (!dot) $('#tabbar [data-view="timer"]').insertAdjacentHTML('beforeend', '<span class="dot"></span>');
  } else if (dot) dot.remove();
}

// ---------------------------------------------------------------------------
// Ön ayarlar, geçmiş, ayarlar
// ---------------------------------------------------------------------------
function renderPresets() {
  const list = $('#presetList');
  if (!ctx.presets.length) {
    list.innerHTML = `<div class="empty">${icon('bookmark')}<div>${t('presets.empty')}</div></div>`;
    return;
  }
  list.innerHTML = ctx.presets.map((p, i) => `
    <div class="item" style="animation-delay:${i * 30}ms">
      <div class="item-icon">${icon(p.action)}</div>
      <div class="item-body clickable" data-load="${p.id}" title="${esc(t('presets.load'))}">
        <div class="item-title">${esc(p.name)}</div>
        <div class="item-sub">${esc(actionName(p.action))} · ${esc(describe(p))}</div>
      </div>
      <div class="item-actions">
        <button class="mini-btn del" data-del="${p.id}" title="${esc(t('presets.delete'))}">${icon('trash')}</button>
        <button class="mini-btn play" data-play="${p.id}" title="${esc(t('presets.play'))}">${icon('play')}</button>
      </div>
    </div>`).join('');
}

function renderHistory() {
  const h = ctx.history;
  const executed = h.filter((x) => x.result === 'executed').length;
  $('#stats').innerHTML = `
    <div class="stat"><b>${h.length}</b><span>${esc(t('stat.total'))}</span></div>
    <div class="stat accent"><b>${executed}</b><span>${esc(t('stat.executed'))}</span></div>
    <div class="stat"><b>${h.length - executed}</b><span>${esc(t('stat.other'))}</span></div>`;
  const list = $('#historyList');
  if (!h.length) {
    list.innerHTML = `<div class="empty">${icon('history')}<div>${esc(t('history.empty'))}</div></div>`;
    return;
  }
  list.innerHTML = h.map((x, i) => {
    const cls = x.result === 'executed' ? '' : x.result === 'missed' ? 'bad' : 'muted';
    const label = x.desc ? describe(x.desc) : (x.label || '');
    return `
    <div class="item" style="animation-delay:${Math.min(i, 12) * 25}ms">
      <div class="item-icon ${cls}">${icon(x.action)}</div>
      <div class="item-body">
        <div class="item-title">${esc(actionName(x.action))} · ${esc(label)}</div>
        <div class="item-sub">${esc(dayWord(x.endedAt))} ${fmtHM(new Date(x.endedAt))}</div>
      </div>
      <span class="badge ${x.result}">${esc(t(`result.${x.result}`))}</span>
    </div>`;
  }).join('');
}

function renderSettings() {
  const s = ctx.settings;
  applyTheme();
  const sel = $('#language');
  if (!sel.options.length) {
    sel.innerHTML = Object.entries(I18N.LANGS).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('');
  }
  sel.value = lang();
  $('#swatches').innerHTML = Object.entries(ACCENTS).map(([k, [c1, c2]]) =>
    `<button class="swatch ${s.accent === k ? 'active' : ''}" data-accent="${k}" style="--c1:${c1};--c2:${c2}" title="${k}"></button>`).join('');
  $$('.seg[data-setting]').forEach((seg) => {
    const v = String(s[seg.dataset.setting]);
    $$('button', seg).forEach((b) => b.classList.toggle('active', b.dataset.v === v));
  });
  $$('input[data-setting]').forEach((inp) => { inp.checked = !!s[inp.dataset.setting]; });
  $('#version').textContent = `${t('app.name')} · ${t('about.version', { v: ctx.version })}${ctx.dryRun ? ` · ${t('about.dry')}` : ''}`;
}

function renderAll() {
  applyI18n();
  renderSettings();
  renderPresets();
  renderHistory();
  for (const el of [$('#centerTop'), $('#digits'), $('#centerSub'), $('#chips'), $('#btnPause')]) el.__html = null;
  renderTimer();
}

// ---------------------------------------------------------------------------
// Bildirim balonu & modal
// ---------------------------------------------------------------------------
let toastTimer;
function toast(text, kind = 'ok') {
  const el = $('#toast');
  el.className = 'toast ' + kind;
  el.innerHTML = `${icon(kind === 'error' ? 'alert' : 'check')}<span>${esc(text)}</span>`;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function currentConfig() {
  const v = value();
  if (setup.mode === 'duration') return { action: setup.action, mode: 'duration', seconds: v * 60, minutes: v };
  if (setup.mode === 'clock') return { action: setup.action, mode: 'clock', time: `${pad(Math.floor(v / 60))}:${pad(v % 60)}`, repeat: setup.repeat };
  return { action: setup.action, mode: 'idle', idleMinutes: v };
}

function openPresetModal() {
  const c = currentConfig();
  if (c.mode === 'duration' && !c.minutes) return toast(t('toast.pickDuration'), 'error');
  $('#modalDesc').textContent = `${actionName(c.action)} · ${describe(c)}`;
  $('#modalInput').value = '';
  $('#modal').hidden = false;
  setTimeout(() => $('#modalInput').focus(), 30);
}
const closeModal = () => { $('#modal').hidden = true; };

$('#modalForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const c = currentConfig();
  const name = $('#modalInput').value.trim() || `${actionName(c.action)} · ${describe(c)}`;
  try {
    await window.api.savePresets([...ctx.presets, { name, ...c }]);
    closeModal();
    toast(t('toast.presetSaved'));
  } catch (err) { toast(err.message, 'error'); }
});
$('#modalCancel').addEventListener('click', closeModal);
$('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(); });

// ---------------------------------------------------------------------------
// Olaylar
// ---------------------------------------------------------------------------
function switchView(v) {
  currentView = v;
  $$('.view').forEach((el) => el.classList.toggle('active', el.id === `view-${v}`));
  $$('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  renderTimer();
}

async function start() {
  const c = currentConfig();
  if (c.mode === 'duration' && !c.seconds) return toast(t('toast.pickDuration'), 'error');
  try {
    state = await window.api.start(c);
    renderTimer();
    toast(t('toast.started', { action: actionName(c.action) }));
  } catch (err) { toast(err.message, 'error'); }
}

async function cancel() {
  state = await window.api.cancel();
  renderTimer();
  toast(t('toast.cancelled'));
}

$('#tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-view]');
  if (b) switchView(b.dataset.view);
});

$('#actions').addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]');
  if (!b) return;
  setup.action = b.dataset.action;
  saveSetup();
  renderTimer();
});

$('#modes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]');
  if (!b) return;
  setup.mode = b.dataset.mode;
  if (setup.mode === 'clock') setup.clock = defaultClock();
  saveSetup();
  renderTimer();
});

$('#chips').addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  if (b.dataset.add) adjust(Number(b.dataset.add));
  else setValue(Number(b.dataset.set));
});

$('#repeat').addEventListener('change', (e) => { setup.repeat = e.target.checked; saveSetup(); });
$('#btnStart').addEventListener('click', start);
$('#btnCancel').addEventListener('click', cancel);
$('#btnSavePreset').addEventListener('click', openPresetModal);
$('#btnAddPreset').addEventListener('click', () => { switchView('timer'); openPresetModal(); });
$('#runControls').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.extend) {
    state = await window.api.extend(Number(b.dataset.extend));
    toast(t('toast.added', { n: b.dataset.extend }));
  } else if (b.id === 'btnPause') {
    state = state.paused ? await window.api.resume() : await window.api.pause();
  } else if (b.id === 'btnMini') {
    state.miniOpen = await window.api.toggleMini();
  }
  renderTimer();
});

$('#presetList').addEventListener('click', async (e) => {
  const play = e.target.closest('[data-play]');
  const del = e.target.closest('[data-del]');
  const load = e.target.closest('[data-load]');
  if (play) {
    try {
      state = await window.api.startPreset(play.dataset.play);
      switchView('timer');
      toast(t('toast.presetStarted'));
    } catch (err) { toast(err.message, 'error'); }
  } else if (del) {
    await window.api.savePresets(ctx.presets.filter((p) => p.id !== del.dataset.del));
    toast(t('toast.presetDeleted'));
  } else if (load) {
    const p = ctx.presets.find((x) => x.id === load.dataset.load);
    if (!p) return;
    setup.action = p.action;
    setup.mode = p.mode;
    if (p.mode === 'duration') setup.duration = p.minutes;
    if (p.mode === 'clock') { const [h, m] = p.time.split(':').map(Number); setup.clock = h * 60 + m; setup.repeat = !!p.repeat; }
    if (p.mode === 'idle') setup.idle = p.idleMinutes;
    saveSetup();
    switchView('timer');
  }
});

$('#btnClearHistory').addEventListener('click', async () => {
  await window.api.clearHistory();
  toast(t('toast.historyCleared'));
});

$('#view-settings').addEventListener('click', async (e) => {
  const sw = e.target.closest('.swatch');
  const segBtn = e.target.closest('.seg button');
  if (sw) {
    ctx.settings.accent = sw.dataset.accent;
    applyTheme();
    await window.api.setSettings({ accent: sw.dataset.accent });
  } else if (segBtn) {
    const seg = segBtn.parentElement;
    const v = seg.dataset.type === 'string' ? segBtn.dataset.v : Number(segBtn.dataset.v);
    await window.api.setSettings({ [seg.dataset.setting]: v });
  }
});
$('#language').addEventListener('change', (e) => window.api.setSettings({ language: e.target.value }));
$$('input[data-setting]').forEach((inp) => inp.addEventListener('change', () => {
  window.api.setSettings({ [inp.dataset.setting]: inp.checked });
}));

$('#btnRepo').addEventListener('click', () => window.api.open('repo'));
$('#btnCheck').addEventListener('click', async () => {
  const st = $('#updateStatus');
  st.className = 'about-status';
  st.textContent = t('about.checking');
  try {
    const r = await window.api.checkUpdate();
    if (r.newer) {
      st.className = 'about-status new';
      st.innerHTML = `<button class="link" id="openRelease">${esc(t('about.newVersion', { v: r.latest }))} →</button>`;
      $('#openRelease').addEventListener('click', () => window.api.open('release'));
    } else {
      st.className = 'about-status ok';
      st.textContent = t('about.upToDate');
    }
  } catch {
    st.className = 'about-status bad';
    st.textContent = t('about.checkFailed');
  }
});
$('#btnQuit').addEventListener('click', () => window.api.quit());
$('#btnMin').addEventListener('click', () => window.api.minimize());
$('#btnClose').addEventListener('click', () => window.api.close());

document.addEventListener('keydown', (e) => {
  if (!$('#modal').hidden) {
    if (e.key === 'Escape') closeModal();
    return;
  }
  if (['INPUT', 'SELECT'].includes(e.target.tagName)) return;
  if (currentView !== 'timer') return;
  if (e.key === 'Escape' && state.active) return void cancel();
  if (state.active) return;
  if (e.key === 'Enter') { e.preventDefault(); start(); }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); adjust(e.shiftKey ? 10 : 1); }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); adjust(e.shiftKey ? -10 : -1); }
  else if (/^[1-6]$/.test(e.key)) { setup.action = ACTION_ORDER[Number(e.key) - 1]; saveSetup(); renderTimer(); }
});

// ---------------------------------------------------------------------------
// Başlat
// ---------------------------------------------------------------------------
(async function init() {
  const data = await window.api.init();
  ctx = { settings: data.settings, presets: data.presets, history: data.history, version: data.version, dryRun: data.dryRun };
  state = data.state;
  renderAll();

  window.api.onState((s) => { state = s; renderTimer(); });
  window.api.onStore((d) => {
    const langChanged = d.settings.language !== ctx.settings.language;
    ctx.settings = d.settings;
    ctx.presets = d.presets;
    ctx.history = d.history;
    if (langChanged) renderAll();
    else {
      renderSettings();
      renderPresets();
      renderHistory();
    }
  });
  window.api.onDone((d) => toast(t(`past.${d.action}`)));
})();
