'use strict';

const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
let settings = { language: 'en' };
let last = null;
const t = (k, v) => I18N.t(settings.language, k, v);

function fmt(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function applySettings() {
  const theme = settings.theme === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : (settings.theme || 'dark');
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.accent = settings.accent || 'amber';
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  if (last) render(last);
}

function render(s) {
  last = s;
  if (!s.active) return;
  const warning = s.phase === 'warning';
  document.body.classList.toggle('warning', warning);
  document.body.classList.toggle('paused', !!s.paused);
  $('#actIcon').setAttribute('href', `#i-${s.action}`);
  let frac;
  if (s.mode === 'idle' && !warning) {
    $('#time').textContent = fmt((s.idleSeconds || 0) * 1000);
    $('#lbl').textContent = `${t(`action.${s.action}`)} · ${t('mini.idle')} / ${s.idleMinutes} ${t('unit.m')}`;
    frac = (s.idleSeconds || 0) / (s.idleMinutes * 60);
  } else {
    const total = warning && s.mode === 'idle' ? s.warningSeconds * 1000 : s.totalMs;
    $('#time').textContent = fmt(s.remainingMs);
    $('#lbl').textContent = s.paused ? `${t(`action.${s.action}`)} · ${t('state.paused')}` : t(`action.${s.action}`);
    frac = s.remainingMs / total;
  }
  $('#bar').style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
}

$('#btnOpen').addEventListener('click', () => window.api.open('main'));
$('#btnClose').addEventListener('click', () => window.api.close());

(async () => {
  const data = await window.api.init();
  settings = data.settings;
  applySettings();
  render(data.state);
  window.api.onState(render);
  window.api.onStore((d) => { settings = d.settings; applySettings(); });
})();
