import './admin.css';

const STATUS = { new: 'جديد', contacted: 'تم التواصل', visit: 'زيارة مجدولة', quoted: 'تم التسعير', done: 'مكتمل' };
const SERVICE = { consultation: 'حجز استشارة', free_visit: 'زيارة منزلية مجانية', fabrics: 'معاينة الأقمشة', quote: 'تسعيرة بالمقاسات', other: 'أخرى' };
const app = document.getElementById('app');
let token = sessionStorage.getItem('noor_admin') || '';
let all = [], filter = 'all', q = '', seen = new Set(), first = true, timer;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const waPhone = (p) => { let d = String(p).replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.length === 8) d = '965' + d; return d; };
const fmt = (iso) => new Date(iso).toLocaleString('ar-KW', { dateStyle: 'medium', timeStyle: 'short' });

async function api(path, opt = {}) {
  const r = await fetch(path, { ...opt, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...(opt.headers || {}) } });
  if (r.status === 401) { logout(); throw new Error('unauthorized'); }
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}
function logout() { token = ''; sessionStorage.removeItem('noor_admin'); clearInterval(timer); renderLogin(); }
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }

function renderLogin(msg = '') {
  app.innerHTML = `<div class="login"><form id="lf"><h1>نور</h1><p>لوحة التحكم — للإدارة فقط</p>
    <input type="password" name="password" placeholder="كلمة المرور" autocomplete="current-password" required autofocus />
    <button class="btn">دخول</button><div class="err">${esc(msg)}</div></form></div>`;
  document.getElementById('lf').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: e.target.password.value }) });
      if (r.status === 429) return renderLogin('محاولات كثيرة، حاول بعد قليل.');
      if (!r.ok) return renderLogin('كلمة المرور غير صحيحة.');
      token = (await r.json()).token; sessionStorage.setItem('noor_admin', token); start();
    } catch { renderLogin('تعذر الاتصال بالخادم.'); }
  });
}

function shell() {
  app.innerHTML = `<header class="bar"><div class="b">نور <small>لوحة الطلبات</small></div>
    <div class="row"><button class="btn sm" id="add">+ طلب جديد</button><button class="btn ghost sm" id="out">خروج</button></div></header>
    <div class="wrap"><div class="stats" id="stats"></div>
    <div class="tools"><input id="q" placeholder="بحث بالاسم أو الرقم أو المنطقة…" /></div>
    <div class="chips" id="chips"></div><div class="list" id="list"></div></div>
    <dialog id="dlg"><form method="dialog" id="nf"><h3>إضافة طلب يدوي</h3>
      <label>الاسم<input name="name" required maxlength="80" /></label>
      <label>الجوال<input name="phone" inputmode="tel" maxlength="25" /></label>
      <label>المنطقة<input name="area" maxlength="60" /></label>
      <label>الخدمة<select name="service">${Object.entries(SERVICE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label>المقاسات<input name="size" maxlength="200" /></label>
      <label>ملاحظات<textarea name="notes" rows="2" maxlength="1000"></textarea></label>
      <div class="row"><button class="btn" value="ok">حفظ</button><button class="btn ghost" value="cancel" formnovalidate>إلغاء</button></div></form></dialog>`;
  document.getElementById('out').onclick = logout;
  document.getElementById('add').onclick = () => document.getElementById('dlg').showModal();
  document.getElementById('q').oninput = (e) => { q = e.target.value.trim().toLowerCase(); draw(); };
  document.getElementById('nf').addEventListener('submit', async (e) => {
    if (e.submitter?.value !== 'ok') return;
    const d = Object.fromEntries(new FormData(e.target));
    try { await api('/api/admin/requests', { method: 'POST', body: JSON.stringify(d) }); e.target.reset(); toast('تمت الإضافة'); load(); } catch { toast('تعذرت الإضافة'); }
  });
  document.getElementById('list').addEventListener('click', onListClick);
  document.getElementById('list').addEventListener('change', onListChange);
  document.getElementById('chips').addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) { filter = c.dataset.k; draw(); } });
}

function draw() {
  const today = new Date().toDateString();
  const count = (s) => all.filter((r) => r.status === s).length;
  document.getElementById('stats').innerHTML = [
    ['جديد', count('new')], ['اليوم', all.filter((r) => new Date(r.createdAt).toDateString() === today).length],
    ['قيد المتابعة', all.filter((r) => ['contacted', 'visit', 'quoted'].includes(r.status)).length], ['الإجمالي', all.length],
  ].map(([l, n]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('');
  document.getElementById('chips').innerHTML = [['all', 'الكل'], ...Object.entries(STATUS)].map(([k, v]) => `<button class="chip ${filter === k ? 'on' : ''}" data-k="${k}">${v}${k !== 'all' ? ' (' + count(k) + ')' : ''}</button>`).join('');
  const rows = all.filter((r) => (filter === 'all' || r.status === filter) && (!q || [r.name, r.phone, r.area, r.message, r.size].join(' ').toLowerCase().includes(q)));
  document.getElementById('list').innerHTML = rows.length ? rows.map((r) => `
    <article class="req ${!first && !seen.has(r.id) ? 'fresh' : ''}" data-id="${r.id}">
      <div class="top"><div><h3>${esc(r.name)}</h3><div class="meta"><span dir="ltr">${esc(r.phone) || '—'}</span>${r.area ? `<span>📍 ${esc(r.area)}</span>` : ''}<span>${fmt(r.createdAt)}</span><span class="src">${r.source === 'manual' ? 'يدوي' : 'من الموقع'}</span></div></div>
      <span class="tag">${SERVICE[r.service] || 'أخرى'}</span></div>
      ${r.size ? `<div class="msg">📏 ${esc(r.size)}</div>` : ''}${r.message ? `<div class="msg">${esc(r.message)}</div>` : ''}
      <div class="row">
        <select data-act="status" class="st-${r.status}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${r.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        ${r.phone ? `<a class="btn wa sm" target="_blank" rel="noopener" href="https://wa.me/${waPhone(r.phone)}?text=${encodeURIComponent('أهلاً ' + r.name + '، معك نور للمفروشات بخصوص طلبك.')}">واتساب</a><a class="btn ghost sm" href="tel:${esc(r.phone)}">اتصال</a>` : ''}
        <button class="btn danger sm" data-act="del">حذف</button></div>
      <div class="row"><textarea data-act="notes" placeholder="ملاحظات داخلية (مقاسات، تسعيرة، موعد الزيارة…)">${esc(r.notes)}</textarea></div>
    </article>`).join('') : '<div class="empty">لا توجد طلبات</div>';
  rows.forEach((r) => seen.add(r.id)); all.forEach((r) => seen.add(r.id)); first = false;
}

async function onListChange(e) {
  const id = e.target.closest('.req')?.dataset.id; if (!id) return;
  const act = e.target.dataset.act;
  try {
    if (act === 'status') { await api('/api/admin/requests/' + id, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) }); all.find((r) => r.id === id).status = e.target.value; draw(); toast('تم تحديث الحالة'); }
    if (act === 'notes') { await api('/api/admin/requests/' + id, { method: 'PATCH', body: JSON.stringify({ notes: e.target.value }) }); all.find((r) => r.id === id).notes = e.target.value; toast('تم حفظ الملاحظة'); }
  } catch { toast('تعذر الحفظ'); }
}
async function onListClick(e) {
  if (e.target.dataset.act !== 'del') return;
  const id = e.target.closest('.req').dataset.id; const r = all.find((x) => x.id === id);
  if (!confirm(`حذف طلب "${r.name}" نهائياً؟`)) return;
  try { await api('/api/admin/requests/' + id, { method: 'DELETE' }); all = all.filter((x) => x.id !== id); draw(); toast('تم الحذف'); } catch { toast('تعذر الحذف'); }
}
async function load() { try { all = await api('/api/admin/requests'); draw(); } catch {} }
function start() { shell(); load(); clearInterval(timer); timer = setInterval(() => { if (!document.hidden && !document.activeElement?.matches('textarea,input')) load(); }, 30000); }

token ? start() : renderLogin();
