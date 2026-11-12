import './style.css';
import { createScene, FABRICS } from './scene.js';
import { waLink } from './config.js';
import { initShowcase } from './showcase.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* WhatsApp links */
const hello = 'السلام عليكم، أبي أحجز استشارة مع نور';
$('#fab').href = waLink(hello);
$('#waMain').href = waLink(hello);

/* Swatches */
const sw = $('#swatches'), swName = $('#swatchName');
let api = null;
FABRICS.forEach((f, i) => {
  const b = document.createElement('button');
  b.style.background = f.hex; b.setAttribute('aria-label', f.name); b.setAttribute('aria-pressed', i === 0);
  b.addEventListener('click', () => { $$('button', sw).forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); swName.textContent = f.name; api?.setFabric(f.hex); });
  sw.appendChild(b);
});
swName.textContent = FABRICS[0].name;

/* Service buttons preselect the form */
$$('[data-service]').forEach((a) => a.addEventListener('click', () => { $('select[name=service]').value = a.dataset.service; }));

const mobileFlag = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
try { initShowcase($('#showcase'), { mobile: mobileFlag }); } catch (e) { console.error(e); }

/* 3D tour */
const tour = $('#tour'), chapters = $$('.chapter'), bar = $('#progressBar'), hint = $('#hint'), loader = $('#loader');
const mobile = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
if (mobile) tour.style.height = '800vh';

function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

/* Real-footage mode: if /media/tour*.mp4 exists, scroll scrubs the video instead of the 3D scene */
async function tryVideoTour() {
  const src = mobile ? '/media/tour-m.mp4' : '/media/tour.mp4';
  try { const h = await fetch(src, { method: 'HEAD' }); if (!h.ok || !(h.headers.get('content-type') || '').includes('video')) return false; } catch { return false; }
  const v = document.createElement('video');
  Object.assign(v, { muted: true, playsInline: true, preload: 'auto', src, poster: '/media/poster.jpg' });
  v.setAttribute('playsinline', ''); v.id = 'footage'; v.disablePictureInPicture = true;
  $('#gl').replaceWith(v);
  await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = rej; setTimeout(rej, 12000); });
  let cur = 0, target = 0, visible = true;
  const calc = () => { const r = tour.getBoundingClientRect(); const total = r.height - innerHeight; target = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0; };
  addEventListener('scroll', calc, { passive: true }); addEventListener('resize', calc); calc(); cur = target;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(tour);
  let prev = performance.now(), lastSet = -1;
  const loop = (now) => {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) { prev = now; return; }
    const dt = Math.min(.05, (now - prev) / 1000); prev = now;
    cur += (target - cur) * (1 - Math.exp(-dt * 6));
    const t = cur * Math.max(0, v.duration - 0.05);
    if (Math.abs(t - lastSet) > 0.012 && !v.seeking) { v.currentTime = t; lastSet = t; }
    bar.style.transform = `scaleX(${cur})`;
    chapters.forEach((c) => c.classList.toggle('on', c.dataset.vfrom != null && cur >= +c.dataset.vfrom && cur <= +c.dataset.vto));
    hint.style.opacity = cur > .03 ? 0 : 1;
  };
  requestAnimationFrame(loop);
  loader.classList.add('done');
  return true;
}

if (await tryVideoTour().catch(() => false)) {
  document.body.classList.add('video-mode');
} else if (!webglOK()) {
  document.body.classList.add('no-gl'); loader.classList.add('done');
  tour.style.height = '100vh'; chapters[0].classList.add('on'); hint.style.display = 'none';
} else {
  try {
    api = createScene($('#gl'), { mobile });
    let cur = 0, target = 0, visible = true;
    const calc = () => { const r = tour.getBoundingClientRect(); const total = r.height - innerHeight; target = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0; };
    addEventListener('scroll', calc, { passive: true }); addEventListener('resize', calc); calc(); cur = target;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(tour);
    addEventListener('pointermove', (e) => { api.state.px = (e.clientX / innerWidth - .5) * 2; api.state.py = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
    let prev = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (!visible || document.hidden) { prev = now; return; }
      const dt = Math.min(.05, (now - prev) / 1000); prev = now;
      cur += (target - cur) * (1 - Math.exp(-dt * 5));
      if (Math.abs(target - cur) < 1e-5) cur = target;
      api.frame(now, cur);
      bar.style.transform = `scaleX(${cur})`;
      chapters.forEach((c) => c.classList.toggle('on', cur >= +c.dataset.from && cur <= +c.dataset.to));
      hint.style.opacity = cur > .03 ? 0 : 1;
    };
    requestAnimationFrame(loop);
    (document.fonts?.ready || Promise.resolve()).then(() => { setTimeout(() => loader.classList.add('done'), 350); });
    setTimeout(() => loader.classList.add('done'), 2500);
  } catch (e) {
    console.error(e); document.body.classList.add('no-gl'); loader.classList.add('done'); tour.style.height = '100vh'; chapters[0].classList.add('on');
  }
}

/* Contact form */
const form = $('#form'), status = $('#status');
const SERVICE_LABEL = { consultation: 'حجز استشارة', free_visit: 'زيارة منزلية مجانية', fabrics: 'معاينة الأقمشة', quote: 'تسعيرة بالمقاسات', other: 'استفسار' };
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  if (d.website) return; // honeypot
  status.className = 'status'; status.textContent = '';
  if (!d.name.trim() || d.phone.replace(/\D/g, '').length < 7) { status.classList.add('err'); status.textContent = 'فضلاً اكتب الاسم ورقم جوال صحيح.'; return; }
  const btn = $('button[type=submit]', form); btn.disabled = true;
  const msg = `السلام عليكم، أنا ${d.name}\nالطلب: ${SERVICE_LABEL[d.service]}\n${d.area ? 'المنطقة: ' + d.area + '\n' : ''}${d.size ? 'المقاسات: ' + d.size + '\n' : ''}${d.message || ''}`.trim();
  try {
    const r = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    if (!r.ok) throw new Error('x');
    status.classList.add('ok'); status.innerHTML = 'وصلنا طلبك، بنتواصل معك قريب 🌿 <a href="' + waLink(msg) + '" target="_blank" rel="noopener" style="text-decoration:underline">أو كمّل معنا عبر واتساب</a>';
    form.reset();
  } catch {
    status.classList.add('err'); status.textContent = 'تعذر الإرسال الآن، سنفتح واتساب لإكمال طلبك.';
    open(waLink(msg), '_blank');
  } finally { btn.disabled = false; }
});
