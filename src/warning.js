'use strict';

const $ = (s) => document.querySelector(s);
let settings = { language: 'en', sound: true };
let lastBeep = null;
let audio;
let last = null;

const t = (k, v) => I18N.t(settings.language, k, v);

function applySettings() {
  document.documentElement.lang = settings.language;
  const theme = settings.theme === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : (settings.theme || 'dark');
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.accent = settings.accent || 'amber';
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  if (last) render(last);
}

function beep(final) {
  if (!settings.sound) return;
  try {
    audio = audio || new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = 'sine';
    o.frequency.value = final ? 660 : 880;
    g.gain.setValueAtTime(0.0001, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.18);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.2);
  } catch { /* ses yoksa sorun değil */ }
}

function render(s) {
  last = s;
  if (!s.active) return;
  $('#actIcon').setAttribute('href', `#i-${s.action}`);
  $('#title').textContent = t(`will.${s.action}`);
  $('#desc').textContent = t(s.mode === 'idle' ? 'warn.descIdle' : 'warn.desc');
  const total = s.warningSeconds * 1000;
  const rem = Math.max(0, s.remainingMs ?? 0);
  const secs = Math.ceil(rem / 1000);
  $('#count').textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  $('#bar').style.width = `${Math.min(100, (rem / total) * 100)}%`;
  $('#snoozeLabel').textContent = t(s.mode === 'idle' ? 'warn.backToWait' : 'warn.snooze');
  if (secs <= 10 && secs > 0 && secs !== lastBeep) {
    lastBeep = secs;
    beep(secs <= 3);
  }
}

$('#btnCancel').addEventListener('click', () => window.api.cancel());
$('#btnSnooze').addEventListener('click', () => window.api.snooze(10));
$('#btnNow').addEventListener('click', () => window.api.runNow());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.api.cancel(); });

(async () => {
  const data = await window.api.init();
  settings = data.settings;
  applySettings();
  render(data.state);
  window.api.onState(render);
  window.api.onStore((d) => { settings = d.settings; applySettings(); });
})();
