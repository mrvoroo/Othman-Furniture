// Tiny dependency-free server: serves the built site + stores customer requests in a JSON file.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'noor-change-me';
const SECRET = process.env.SECRET || crypto.createHash('sha256').update('noor:' + ADMIN_PASSWORD).digest('hex');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'requests.json');
const DIST = path.join(__dirname, 'dist');
const STATUSES = ['new', 'contacted', 'visit', 'quoted', 'done'];
const SERVICES = ['consultation', 'free_visit', 'fabrics', 'quote', 'other'];

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
const load = () => { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return []; } };
const save = (d) => { const t = DATA_FILE + '.tmp'; fs.writeFileSync(t, JSON.stringify(d, null, 2)); fs.renameSync(t, DATA_FILE); };

const sign = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('hex');
const makeToken = () => { const exp = Date.now() + 1000 * 60 * 60 * 12; return `${exp}.${sign(String(exp))}`; };
const okToken = (t = '') => {
  const [exp, sig] = t.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const isAdmin = (req) => okToken((req.headers.authorization || '').replace('Bearer ', ''));

const hits = new Map(); // naive rate limit: ip -> [timestamps]
const limited = (ip, max, windowMs) => {
  const now = Date.now(); const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(ip, arr); return arr.length > max;
};

const clean = (v, n) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, n);
const readBody = (req) => new Promise((res, rej) => {
  let b = ''; req.on('data', (c) => { b += c; if (b.length > 20000) { rej(new Error('big')); req.destroy(); } });
  req.on('end', () => { try { res(JSON.parse(b || '{}')); } catch { rej(new Error('json')); } });
});
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.mp4': 'video/mp4', '.webm': 'video/webm', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const ip = req.socket.remoteAddress || '';
  try {
    if (url.pathname === '/api/requests' && req.method === 'POST') {
      if (limited(ip, 6, 60_000)) return send(res, 429, { error: 'too_many' });
      const b = await readBody(req);
      const r = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        name: clean(b.name, 80), phone: clean(b.phone, 25), area: clean(b.area, 60),
        service: SERVICES.includes(b.service) ? b.service : 'other',
        size: clean(b.size, 200), message: clean(b.message, 1000),
        status: 'new', source: 'website', notes: '',
      };
      if (!r.name || r.phone.replace(/\D/g, '').length < 7) return send(res, 400, { error: 'invalid' });
      const all = load(); all.unshift(r); save(all);
      return send(res, 201, { ok: true, id: r.id });
    }
    if (url.pathname === '/api/login' && req.method === 'POST') {
      if (limited('login' + ip, 8, 5 * 60_000)) return send(res, 429, { error: 'too_many' });
      const b = await readBody(req);
      const a = Buffer.from(String(b.password || '')), p = Buffer.from(ADMIN_PASSWORD);
      if (a.length === p.length && crypto.timingSafeEqual(a, p)) return send(res, 200, { token: makeToken() });
      return send(res, 401, { error: 'bad_password' });
    }
    if (url.pathname.startsWith('/api/admin/')) {
      if (!isAdmin(req)) return send(res, 401, { error: 'unauthorized' });
      const all = load();
      if (url.pathname === '/api/admin/requests' && req.method === 'GET') return send(res, 200, all);
      if (url.pathname === '/api/admin/requests' && req.method === 'POST') {
        const b = await readBody(req);
        const r = {
          id: crypto.randomUUID(), createdAt: new Date().toISOString(),
          name: clean(b.name, 80), phone: clean(b.phone, 25), area: clean(b.area, 60),
          service: SERVICES.includes(b.service) ? b.service : 'other',
          size: clean(b.size, 200), message: clean(b.message, 1000),
          status: STATUSES.includes(b.status) ? b.status : 'new', source: 'manual', notes: clean(b.notes, 1000),
        };
        if (!r.name) return send(res, 400, { error: 'invalid' });
        all.unshift(r); save(all); return send(res, 201, r);
      }
      const m = url.pathname.match(/^\/api\/admin\/requests\/([\w-]+)$/);
      if (m) {
        const i = all.findIndex((x) => x.id === m[1]);
        if (i < 0) return send(res, 404, { error: 'not_found' });
        if (req.method === 'DELETE') { all.splice(i, 1); save(all); return send(res, 200, { ok: true }); }
        if (req.method === 'PATCH') {
          const b = await readBody(req);
          if (STATUSES.includes(b.status)) all[i].status = b.status;
          if ('notes' in b) all[i].notes = clean(b.notes, 1000);
          save(all); return send(res, 200, all[i]);
        }
      }
      return send(res, 404, { error: 'not_found' });
    }
    // static
    let p = url.pathname === '/admin' || url.pathname === '/admin/' ? '/admin.html' : url.pathname;
    const file = path.normalize(path.join(DIST, p));
    if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
    const target = fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(DIST, 'index.html');
    if (!fs.existsSync(target)) { res.writeHead(404); return res.end('Run: npm run build'); }
    const ext = path.extname(target);
    const size = fs.statSync(target).size; const range = req.headers.range;
    if (range && /^bytes=\d*-\d*$/.test(range)) { // video scrubbing needs Range support (Safari requires it)
      let [a, b] = range.replace('bytes=', '').split('-'); let start = a === '' ? size - Number(b) : Number(a); let end = a !== '' && b !== '' ? Number(b) : size - 1;
      start = Math.max(0, start); end = Math.min(end, size - 1);
      if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end(); }
      res.writeHead(206, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'public, max-age=86400' });
      return fs.createReadStream(target, { start, end }).pipe(res);
    }
    res.writeHead(200, { 'Accept-Ranges': 'bytes', 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : (ext === '.glb' || ext === '.mp4') ? 'public, max-age=86400' : 'public, max-age=31536000, immutable' });
    fs.createReadStream(target).pipe(res);
  } catch (e) { send(res, 400, { error: 'bad_request' }); }
}).listen(PORT, () => console.log(`Noor server on :${PORT}`));
