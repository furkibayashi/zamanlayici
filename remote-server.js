// Telefondan kontrol: aynı Wi-Fi'deki bir telefona küçük bir web arayüzü sunar.
// Varsayılan olarak KAPALIDIR; yalnızca kullanıcı Ayarlar'dan açınca çalışır.
// Her API isteği, QR koddaki rastgele bağlantı anahtarını (X-Token) ister.
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATIC = {
  '/': ['src/remote.html', 'text/html; charset=utf-8'],
  '/remote.js': ['src/remote.js', 'text/javascript; charset=utf-8'],
  '/remote.css': ['src/remote.css', 'text/css; charset=utf-8'],
  '/styles.css': ['src/styles.css', 'text/css; charset=utf-8'],
  '/i18n.js': ['src/i18n.js', 'text/javascript; charset=utf-8'],
  '/icon.png': ['assets/icon.png', 'image/png'],
};

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
};

const VIRTUAL_ADAPTER = /vethernet|virtualbox|vmware|wsl|hyper-v|loopback|bluetooth|tailscale|zerotier|hamachi|vpn|docker/i;

/** Telefonun ulaşabileceği yerel IPv4 adreslerini, en olası olan başta olacak şekilde döndürür. */
function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' || a.internal || a.address.startsWith('169.254.')) continue;
      const ip = a.address;
      let score = 0;
      if (ip.startsWith('192.168.')) score += 30;
      else if (ip.startsWith('10.')) score += 20;
      else if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) score += 10;
      if (/wi-?fi|wlan|kablosuz|wireless/i.test(name)) score += 15;
      if (/ethernet/i.test(name)) score += 8;
      if (VIRTUAL_ADAPTER.test(name)) score -= 50;
      out.push({ ip, name, score });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function readJson(req, limit = 8 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}

/**
 * @param {object} o
 * @param {string} o.root           Uygulama kök klasörü (statik dosyalar için)
 * @param {() => string} o.getToken Geçerli bağlantı anahtarı
 * @param {object} o.api            { state(), start(cfg), cancel(), pause(), resume(), extend(m), preset(id) }
 * @param {(agent:string) => void} o.onSeen Telefon her istek yaptığında
 */
function createRemoteServer({ root, getToken, api, onSeen }) {
  let server = null;
  let port = null;

  const send = (res, status, body, type = 'application/json; charset=utf-8') => {
    res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': type });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };

  async function handle(req, res) {
    // DNS rebinding'e karşı: yalnızca IP adresi veya localhost ile gelen isteklere yanıt ver.
    const host = String(req.headers.host || '').replace(/:\d+$/, '');
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(host) && host !== 'localhost') return send(res, 421, { error: 'host' });

    const url = new URL(req.url, 'http://x');
    const p = url.pathname;

    if (req.method === 'GET' && STATIC[p]) {
      const [file, type] = STATIC[p];
      try { return send(res, 200, fs.readFileSync(path.join(root, file)), type); } catch { return send(res, 404, { error: 'not found' }); }
    }

    if (!p.startsWith('/api/')) return send(res, 404, { error: 'not found' });
    if (!safeEqual(req.headers['x-token'], getToken())) return send(res, 401, { error: 'unauthorized' });
    onSeen(String(req.headers['user-agent'] || ''));

    try {
      if (req.method === 'GET' && p === '/api/state') return send(res, 200, api.state());
      if (req.method !== 'POST') return send(res, 405, { error: 'method' });
      const body = await readJson(req);
      let result;
      switch (p) {
        case '/api/start': result = api.start(body); break;
        case '/api/cancel': result = api.cancel(); break;
        case '/api/pause': result = api.pause(); break;
        case '/api/resume': result = api.resume(); break;
        case '/api/extend': result = api.extend(body.minutes); break;
        case '/api/preset': result = api.preset(body.id); break;
        default: return send(res, 404, { error: 'not found' });
      }
      return send(res, 200, { ok: true, state: result });
    } catch (e) {
      return send(res, 400, { error: e.message });
    }
  }

  function start(preferredPort, host = '0.0.0.0') {
    return new Promise((resolve, reject) => {
      let tryPort = preferredPort;
      const attempt = () => {
        const s = http.createServer((req, res) => {
          handle(req, res).catch(() => { try { send(res, 500, { error: 'server' }); } catch { /* yok say */ } });
        });
        s.requestTimeout = 10000;
        s.headersTimeout = 8000;
        s.once('error', (err) => {
          if (err.code === 'EADDRINUSE' && tryPort < preferredPort + 10) {
            tryPort += 1;
            attempt();
          } else reject(err);
        });
        s.listen(tryPort, host, () => {
          server = s;
          port = tryPort;
          resolve(port);
        });
      };
      attempt();
    });
  }

  function stop() {
    if (server) {
      server.close();
      server.closeAllConnections();
    }
    server = null;
    port = null;
  }

  return { start, stop, get port() { return port; }, get running() { return !!server; } };
}

module.exports = { createRemoteServer, lanAddresses };
