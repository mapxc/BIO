'use strict';
(() => {
// Защита от встраивания в чужой iframe (GitHub Pages не даёт ставить заголовки)
if (window.top !== window.self) {
  document.documentElement.textContent = '';
  try { window.top.location = window.self.location; } catch (e) {}
  return;
}

const DATA = 'data.json';
const DEFAULT = { name: 'Имя Фамилия', tagline: '', about: '', socials: [], links: [] };
const $ = (s) => document.querySelector(s);
const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };

// ===== Проверка данных (защита от XSS и javascript: ссылок) =====
const S = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, n);
function safeUrl(u) {
  try { const x = new URL(String(u).trim()); return ['https:', 'mailto:'].includes(x.protocol) ? x.href : null; } catch (e) { return null; }
}
function hostOf(u) { try { const x = new URL(u); return x.protocol === 'mailto:' ? x.pathname : x.hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
const LANGS = ['ru', 'ky', 'en', 'ja'];
const LANG_NAMES = { ru: 'Русский', ky: 'Кыргызча', en: 'English', ja: '日本語' };
// Значение может быть строкой или объектом {ru, ky, en, ja}
const LS = (v, n) => { if (v && typeof v === 'object') { const o = {}; LANGS.forEach((l) => { const s = S(v[l], n); if (s) o[l] = s; }); return o; } return S(v, n); };
const E = (v) => (typeof v === 'string' ? !v : !Object.keys(v).length);
const item = (x) => { const u = x && safeUrl(x.url); return u ? { title: S(x.title, 60) || hostOf(u), url: u, desc: LS(x.desc, 160) } : null; };
const list = (a, n) => (Array.isArray(a) ? a : []).slice(0, n).map(item).filter(Boolean);
const safeFile = (f) => { f = String(f == null ? '' : f).trim(); return /^(?:[\w-]+\/)*[\w-][\w\-. ]{0,80}\.pdf$/i.test(f) && f.length < 120 ? f : null; };
const rlist = (a) => {
  const r = (Array.isArray(a) ? a : []).slice(0, 10).map((x) => { const f = safeFile(x && x.file); return f ? { title: LS(x.title, 40), file: f, lang: LANGS.includes(x.lang) ? x.lang : '' } : null; }).filter(Boolean);
  return r.length ? r : [{ title: '', file: 'resume.pdf', lang: '' }];
};
const clean = (d) => { d = d || {}; return { name: E(LS(d.name, 60)) ? DEFAULT.name : LS(d.name, 60), tagline: LS(d.tagline, 140), about: LS(d.about, 1200), socials: list(d.socials, 30), resumes: rlist(d.resumes) }; };

// ===== Языки =====
const TX = {
  resume:  { ru: 'РЕЗЮМЕ', ky: 'РЕЗЮМЕ', en: 'RESUME', ja: '履歴書' },
  resumeT: { ru: 'Резюме', ky: 'Резюме', en: 'Resume', ja: '履歴書' },
  contact: { ru: 'Связаться', ky: 'Байланышуу', en: 'Contact', ja: '連絡先' },
  about:   { ru: 'Навыки', ky: 'Көндүмдөр', en: 'Skills', ja: 'スキル' },
  none:    { ru: 'Резюме пока не загружено.', ky: 'Резюме азырынча жүктөлө элек.', en: 'The resume has not been uploaded yet.', ja: '履歴書はまだアップロードされていません。' },
  hint:    { ru: 'Открой резюме в просмотрщике PDF на устройстве или скачай файл.', ky: 'Резюмени түзмөктөгү PDF көрсөткүчтө ач же файлды жүктөп ал.', en: "Open the resume in your device's PDF viewer or download the file.", ja: '履歴書は端末のPDFビューアで開くか、ファイルをダウンロードしてください。' },
  open:    { ru: 'Открыть', ky: 'Ачуу', en: 'Open', ja: '開く' },
  dl:      { ru: 'Скачать', ky: 'Жүктөп алуу', en: 'Download', ja: 'ダウンロード' },
  close:   { ru: 'Закрыть', ky: 'Жабуу', en: 'Close', ja: '閉じる' },
  empty:   { ru: 'Пока ничего нет.', ky: 'Азырынча эч нерсе жок.', en: 'Nothing here yet.', ja: 'まだ何もありません。' }
};
let lang = 'ru', data = clean(DEFAULT), rsel = 0, drawN = 0;
const t = (k) => TX[k][lang];
const L = (v) => (typeof v === 'string' ? v : (v && (v[lang] || v.en || v.ru || Object.values(v)[0])) || '');
function pickLang() {
  try { const s = localStorage.getItem('noir_lang'); if (LANGS.includes(s)) return s; } catch (e) {}
  const n = (navigator.language || '').slice(0, 2).toLowerCase(); return LANGS.includes(n) ? n : 'en';
}
function renderLangs() {
  const n = $('#langs'); n.replaceChildren();
  LANGS.forEach((l) => {
    const b = el('button', 'lang', LANG_NAMES[l]); b.type = 'button'; b.title = LANG_NAMES[l]; b.lang = l;
    b.setAttribute('aria-pressed', String(l === lang));
    b.onclick = () => { lang = l; try { localStorage.setItem('noir_lang', l); } catch (e) {} renderAll(); };
    n.append(b);
  });
}

// ===== Рендер =====
function card(x) {
  const u = safeUrl(x.url); if (!u) return null;
  const a = el('a', 'card', x.title); a.href = u;
  if (u.startsWith('https:')) { a.target = '_blank'; a.rel = 'noopener noreferrer nofollow'; }
  if (L(x.desc)) a.title = L(x.desc);
  return a;
}
function renderAll() {
  document.documentElement.lang = lang;
  $('#resumeBar').textContent = t('resume'); $('#h-soc').textContent = t('contact'); $('#h-abt').textContent = t('about'); renderLangs();
  $('#name').textContent = L(data.name); document.title = L(data.name);
  $('#tagline').textContent = L(data.tagline); $('#about').textContent = L(data.about);
  ['socials'].forEach((k) => {
    const box = $('#' + k); box.replaceChildren();
    data[k].forEach((x) => { const c = card(x); if (c) box.append(c); });
    if (!box.children.length) box.append(el('div', 'empty', t('empty')));
  });
  $('#yr').textContent = '© ' + new Date().getFullYear() + ' ' + L(data.name);
}

// ===== Резюме =====
function closeDlg() { drawN++; $('#overlay').hidden = true; $('#dlg').replaceChildren(); }
const rname = (r, i) => L(r.title) || (t('resumeT') + (data.resumes.length > 1 ? ' ' + (i + 1) : ''));
function openResume() {
  const i = data.resumes.findIndex((r) => r.lang === lang); rsel = Math.max(0, i);
  $('#dlg').className = 'dlg wide'; $('#overlay').hidden = false; drawResume();
}
async function drawResume() {
  const my = ++drawN, d = $('#dlg'), rs = data.resumes, r = rs[rsel], url = encodeURI(r.file);
  d.replaceChildren(); d.append(el('h3', '', t('resumeT')));
  if (rs.length > 1) {
    const tabs = el('div', 'tabs');
    rs.forEach((x, i) => {
      const b = el('button', 'lang', rname(x, i)); b.type = 'button'; b.setAttribute('aria-pressed', String(i === rsel));
      b.onclick = () => { rsel = i; drawResume(); }; tabs.append(b);
    });
    d.append(tabs);
  }
  let ok = false;
  try { ok = (await fetch(url, { method: 'HEAD', cache: 'no-store' })).ok; } catch (e) {}
  if (my !== drawN) return;
  // На телефонах и планшетах PDF в iframe показывается плохо (Android: пусто, iOS: одна страница)
  const small = matchMedia('(max-width:800px), (pointer:coarse)').matches;
  if (ok && !small) { const fr = el('iframe'); fr.src = url; fr.title = rname(r, rsel) + ' (PDF)'; d.append(fr); }
  else if (ok) d.append(el('p', '', t('hint')));
  else d.append(el('p', '', t('none')));
  const row = el('div', 'row');
  if (ok) {
    const o = el('a', 'btn', t('open')); o.href = url; o.target = '_blank'; o.rel = 'noopener noreferrer';
    const a = el('a', 'btn', t('dl')); a.href = url; a.download = '';
    row.append(o, a);
  }
  const c = el('button', 'btn', t('close')); c.type = 'button'; c.onclick = closeDlg; row.append(c); d.append(row);
}

// ===== Запуск =====
async function load() {
  try { const r = await fetch(DATA + '?t=' + Date.now(), { cache: 'no-store' }); data = clean(await r.json()); }
  catch (e) { data = clean(DEFAULT); }
}
$('#resumeBar').onclick = openResume;
$('#overlay').addEventListener('click', (e) => { if (e.target.id === 'overlay') closeDlg(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDlg(); });
(async () => { lang = pickLang(); await load(); renderAll(); })();
})();
