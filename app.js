'use strict';
(() => {
// Защита от встраивания в чужой iframe (GitHub Pages не даёт ставить заголовки)
if (window.top !== window.self) {
  document.documentElement.textContent = '';
  try { window.top.location = window.self.location; } catch (e) {}
  return;
}

// ===== Настройки =====
// Для адресов вида https://USER.github.io/REPO/ значения определяются сами.
// Для своего домена впиши вручную: owner: 'USER', repo: 'REPO'.
const CFG = { owner: '', repo: '', data: 'data.json', resume: 'resume.pdf' };
const host = location.hostname, seg = location.pathname.split('/').filter(Boolean)[0] || '';
if (host.endsWith('.github.io')) {
  CFG.owner = CFG.owner || host.split('.')[0];
  CFG.repo = CFG.repo || (seg && !seg.includes('.') ? seg : host);
}
const IDLE_MS = 20 * 60 * 1000;
const KEY = 'noir_admin_token';

const DEFAULT = { name: 'Имя Фамилия', tagline: '', about: '', socials: [], links: [] };
const $ = (s) => document.querySelector(s);
const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };

// ===== Санитайзинг данных (защита от XSS и javascript: ссылок) =====
const S = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, n);
function safeUrl(u) {
  try { const x = new URL(String(u).trim()); return ['https:', 'mailto:'].includes(x.protocol) ? x.href : null; } catch (e) { return null; }
}
const LANGS = ['ru', 'ky', 'en', 'ja'];
const LANG_NAMES = { ru: 'Русский', ky: 'Кыргызча', en: 'English', ja: '日本語' };
// Значение может быть строкой или объектом {ru, ky, en, ja}
const LS = (v, n) => { if (v && typeof v === 'object') { const o = {}; LANGS.forEach((l) => { const s = S(v[l], n); if (s) o[l] = s; }); return o; } return S(v, n); };
const E = (v) => (typeof v === 'string' ? !v : !Object.keys(v).length);
const item = (x) => { const u = x && safeUrl(x.url); return u ? { title: S(x.title, 60) || hostOf(u), url: u, desc: LS(x.desc, 160) } : null; };
const list = (a, n) => (Array.isArray(a) ? a : []).slice(0, n).map(item).filter(Boolean);
const clean = (d) => { d = d || {}; return { name: E(LS(d.name, 60)) ? DEFAULT.name : LS(d.name, 60), tagline: LS(d.tagline, 140), about: LS(d.about, 1200), socials: list(d.socials, 30), links: list(d.links, 100) }; };
function hostOf(u) { try { const x = new URL(u); return x.protocol === 'mailto:' ? x.pathname : x.hostname.replace(/^www\./, ''); } catch (e) { return ''; } }

// ===== Языки интерфейса =====
const TX = {
  resume:  { ru: 'РЕЗЮМЕ', ky: 'РЕЗЮМЕ', en: 'RESUME', ja: '履歴書' },
  resumeT: { ru: 'Резюме', ky: 'Резюме', en: 'Resume', ja: '履歴書' },
  contact: { ru: 'Связаться', ky: 'Байланышуу', en: 'Contact', ja: '連絡先' },
  profiles:{ ru: 'Профили и площадки', ky: 'Профилдер жана платформалар', en: 'Profiles and platforms', ja: 'プロフィールとプラットフォーム' },
  about:   { ru: 'О себе', ky: 'Өзүм жөнүндө', en: 'About', ja: '自己紹介' },
  none:    { ru: 'Резюме пока не загружено.', ky: 'Резюме азырынча жүктөлө элек.', en: 'The resume has not been uploaded yet.', ja: '履歴書はまだアップロードされていません。' },
  hint:    { ru: 'Открой резюме в просмотрщике PDF на устройстве или скачай файл.', ky: 'Резюмени түзмөктөгү PDF көрсөткүчтө ач же файлды жүктөп ал.', en: "Open the resume in your device's PDF viewer or download the file.", ja: '履歴書は端末のPDFビューアで開くか、ファイルをダウンロードしてください。' },
  open:    { ru: 'Открыть PDF', ky: 'PDF ачуу', en: 'Open PDF', ja: 'PDFを開く' },
  dl:      { ru: 'Скачать', ky: 'Жүктөп алуу', en: 'Download', ja: 'ダウンロード' },
  close:   { ru: 'Закрыть', ky: 'Жабуу', en: 'Close', ja: '閉じる' },
  empty:   { ru: 'Пока ничего нет.', ky: 'Азырынча эч нерсе жок.', en: 'Nothing here yet.', ja: 'まだ何もありません。' },
  adm:     { ru: 'Вход для владельца', ky: 'Ээси үчүн кирүү', en: 'Owner sign-in', ja: 'オーナー用ログイン' }
};
let lang = 'ru';
const t = (k) => TX[k][lang];
const L = (v) => (typeof v === 'string' ? v : (v && (v[lang] || v.en || v.ru || Object.values(v)[0])) || '');
const own = (v, l) => (typeof v === 'string' ? (l === 'ru' ? v : '') : (v && v[l]) || '');
function setL(old, l, val, n) {
  const o = typeof old === 'string' ? (old ? { ru: old } : {}) : Object.assign({}, old || {});
  val = S(val, n); if (val) o[l] = val; else delete o[l]; return o;
}
const langNote = () => 'Текст для языка: ' + LANG_NAMES[lang] + '. Чтобы править другие языки, переключи язык на странице.';
function pickLang() {
  try { const s = localStorage.getItem('noir_lang'); if (LANGS.includes(s)) return s; } catch (e) {}
  const n = (navigator.language || '').slice(0, 2).toLowerCase(); return LANGS.includes(n) ? n : 'en';
}
function renderLangs() {
  const n = $('#langs'); n.replaceChildren();
  LANGS.forEach((l) => {
    const b = el('button', 'lang', l.toUpperCase()); b.type = 'button'; b.title = LANG_NAMES[l]; b.lang = l;
    b.setAttribute('aria-pressed', String(l === lang));
    b.onclick = () => { lang = l; try { localStorage.setItem('noir_lang', l); } catch (e) {} renderAll(); };
    n.append(b);
  });
}
function applyI18n() {
  document.documentElement.lang = lang;
  $('#resumeBar').textContent = t('resume'); $('#h-soc').textContent = t('contact');
  $('#h-lnk').textContent = t('profiles'); $('#h-abt').textContent = t('about');
  $('#adm').setAttribute('aria-label', t('adm')); renderLangs();
}

// ===== Состояние =====
let data = clean(DEFAULT), admin = false, dirty = false, token = '', branch = '', sha = null, idleT = null;
const store = {
  get() { try { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || ''; } catch (e) { return ''; } },
  set(t, remember) { try { (remember ? localStorage : sessionStorage).setItem(KEY, t); } catch (e) {} },
  clear() { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (e) {} }
};

// ===== Рендер =====
function card(x, i, key) {
  const u = safeUrl(x.url); if (!u) return null;
  const a = el('a', 'card'); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer nofollow';
  a.append(el('b', '', x.title));
  if (L(x.desc)) a.append(el('span', '', L(x.desc)));
  a.append(el('small', '', hostOf(u)));
  if (!admin) return a;
  const w = el('div', 'cw'); w.append(a);
  const c = el('div', 'ctl');
  [['↑', () => move(key, i, -1)], ['↓', () => move(key, i, 1)], ['✎', () => editItem(key, i)], ['✕', () => delItem(key, i)]].forEach(([t, fn]) => {
    const b = el('button', '', t); b.type = 'button'; b.onclick = fn; c.append(b);
  });
  w.append(c); return w;
}
function renderAll() {
  applyI18n();
  $('#name').textContent = L(data.name); document.title = L(data.name);
  $('#tagline').textContent = L(data.tagline); $('#about').textContent = L(data.about);
  ['socials', 'links'].forEach((k) => {
    const box = $('#' + k); box.replaceChildren();
    data[k].forEach((x, i) => { const c = card(x, i, k); if (c) box.append(c); });
    if (!box.children.length) box.append(el('div', 'empty', admin ? 'Пусто. Нажми «Добавить».' : t('empty')));
  });
  $('#yr').textContent = '© ' + new Date().getFullYear() + ' ' + L(data.name);
  renderBar();
}
function renderBar() {
  const b = $('#adminbar'); b.hidden = !admin; b.replaceChildren(); if (!admin) return;
  const add = (t, fn) => { const x = el('button', 'btn', t); x.type = 'button'; x.onclick = fn; b.append(x); return x; };
  add('Добавить', addItem); add('Профиль', editProfile); add('PDF резюме', uploadResumeDlg);
  b.append(el('span', 'grow', dirty ? 'Есть несохранённые изменения' : 'Режим владельца'));
  add(dirty ? 'Сохранить в GitHub *' : 'Сохранить в GitHub', save); add('Выйти', logout);
}

// ===== Диалоги =====
function openDlg(wide) { $('#dlg').className = 'dlg' + (wide ? ' wide' : ''); $('#overlay').hidden = false; }
function closeDlg() { $('#overlay').hidden = true; $('#dlg').replaceChildren(); }
function toast(t) { const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (e.hidden = true), 3500); }
function form(title, fields, onOk, okText, note) {
  const d = $('#dlg'); d.replaceChildren(); openDlg(false); d.append(el('h3', '', title));
  if (note) d.append(el('p', '', note));
  const f = el('form'), ins = {};
  fields.forEach((x) => {
    const l = el('label', '', x.label); let i;
    if (x.type === 'select') { i = el('select'); x.options.forEach((o) => { const op = el('option', '', o); op.value = o; i.append(op); }); }
    else if (x.type === 'textarea') i = el('textarea');
    else { i = el('input'); i.type = x.type || 'text'; if (x.accept) i.accept = x.accept; }
    if (x.type !== 'select' && x.type !== 'file') i.maxLength = x.max || 200;
    if (x.value != null && x.type !== 'file') i.value = x.value;
    i.required = x.req !== false; i.autocomplete = 'off'; ins[x.k] = i; l.append(i); f.append(l);
  });
  const msg = el('p', 'err'), row = el('div', 'row');
  const ok = el('button', 'btn', okText || 'Сохранить'); ok.type = 'submit';
  const no = el('button', 'btn', 'Отмена'); no.type = 'button'; no.onclick = closeDlg;
  row.append(ok, no); f.append(msg, row); d.append(f);
  f.onsubmit = async (e) => {
    e.preventDefault(); const v = {};
    for (const k in ins) v[k] = ins[k].type === 'file' ? ins[k].files[0] : ins[k].type === 'checkbox' ? ins[k].checked : ins[k].value;
    ok.disabled = true; msg.textContent = '';
    try { await onOk(v); } catch (err) { msg.textContent = err.message || 'Ошибка'; ok.disabled = false; }
  };
  const first = f.querySelector('input,textarea,select'); if (first) first.focus();
}

// ===== Резюме =====
async function openResume() {
  const d = $('#dlg'); d.replaceChildren(); openDlg(true); d.append(el('h3', '', t('resumeT')));
  let ok = false;
  try { ok = (await fetch(CFG.resume, { method: 'HEAD', cache: 'no-store' })).ok; } catch (e) {}
  // На телефонах и планшетах PDF в iframe показывается плохо (Android: пусто, iOS: одна страница)
  const small = matchMedia('(max-width:800px), (pointer:coarse)').matches;
  if (ok && !small) { const fr = el('iframe'); fr.src = CFG.resume; fr.title = t('resumeT') + ' (PDF)'; d.append(fr); }
  else if (ok) d.append(el('p', '', t('hint')));
  else d.append(el('p', '', t('none')));
  const row = el('div', 'row');
  if (ok) {
    const o = el('a', 'btn', t('open')); o.href = CFG.resume; o.target = '_blank'; o.rel = 'noopener noreferrer';
    const a = el('a', 'btn', t('dl')); a.href = CFG.resume; a.download = '';
    row.append(o, a);
  }
  const c = el('button', 'btn', t('close')); c.type = 'button'; c.onclick = closeDlg; row.append(c); d.append(row);
}

// ===== GitHub API =====
const API = 'https://api.github.com';
async function gh(path, opt) {
  opt = opt || {};
  const r = await fetch(API + path, Object.assign({}, opt, { headers: Object.assign({ Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', Authorization: 'Bearer ' + token }, opt.headers || {}) }));
  if (!r.ok) { const e = new Error(r.status === 401 ? 'Токен недействителен или истёк' : r.status === 403 ? 'Доступ запрещён (права токена или лимит запросов)' : 'GitHub: ошибка ' + r.status); e.status = r.status; throw e; }
  return r.json();
}
const cp = (p) => `/repos/${encodeURIComponent(CFG.owner)}/${encodeURIComponent(CFG.repo)}/contents/${p}`;
function bytesToB64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
const b64ToBytes = (b) => Uint8Array.from(atob(b.replace(/\s/g, '')), (c) => c.charCodeAt(0));
async function putFile(path, bytes, msg, prevSha) {
  const body = { message: msg, content: bytesToB64(bytes), branch };
  if (prevSha) body.sha = prevSha;
  return gh(cp(path), { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
}
async function remoteSha(path) { try { return (await gh(cp(path) + '?ref=' + encodeURIComponent(branch))).sha; } catch (e) { if (e.status === 404) return null; throw e; } }

async function unlock(t) {
  token = t;
  try {
    if (!CFG.owner || !CFG.repo) throw new Error('Не определён репозиторий: заполни CFG.owner и CFG.repo в app.js');
    const u = await gh('/user');
    if (u.login.toLowerCase() !== CFG.owner.toLowerCase()) throw new Error('Токен принадлежит не владельцу сайта');
    const r = await gh(`/repos/${encodeURIComponent(CFG.owner)}/${encodeURIComponent(CFG.repo)}`);
    if (!r.permissions || !r.permissions.push) throw new Error('У токена нет права записи в этот репозиторий');
    branch = r.default_branch;
    try {
      const f = await gh(cp(CFG.data) + '?ref=' + encodeURIComponent(branch));
      sha = f.sha; data = clean(JSON.parse(new TextDecoder().decode(b64ToBytes(f.content))));
    } catch (e) { if (e.status !== 404) throw e; sha = null; }
    admin = true; dirty = false; renderAll(); resetIdle();
  } catch (e) { token = ''; admin = false; throw e; }
}
async function save() {
  try {
    data = clean(data);
    const remote = await remoteSha(CFG.data);
    if (remote !== sha) throw new Error('Файл на GitHub изменён в другом месте. Выйди и зайди снова, чтобы подтянуть актуальные данные.');
    const res = await putFile(CFG.data, new TextEncoder().encode(JSON.stringify(data, null, 2) + '\n'), 'content: update via admin panel', sha);
    sha = res.content.sha; dirty = false; renderAll();
    toast('Сохранено. Публикация на Pages займёт ~1 минуту');
  } catch (e) { toast(e.message); }
}
function logout(force) {
  if (dirty && force !== true && !confirm('Есть несохранённые изменения. Выйти без сохранения?')) return;
  token = ''; admin = false; dirty = false; store.clear(); clearTimeout(idleT);
  closeDlg(); load().then(renderAll); toast('Вы вышли');
}
function resetIdle() { clearTimeout(idleT); if (admin) idleT = setTimeout(() => logout(true), IDLE_MS); }
['click', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, resetIdle, { passive: true }));
addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

// ===== Админ-действия =====
const touch = () => { dirty = true; renderAll(); };
const KINDS = { 'Соцсеть': 'socials', 'Площадка': 'links' };
function addItem() {
  form('Добавить', [
    { k: 'kind', label: 'Куда', type: 'select', options: Object.keys(KINDS) },
    { k: 'title', label: 'Название', max: 60 },
    { k: 'url', label: 'Ссылка (https://…)', type: 'url', max: 300 },
    { k: 'desc', label: 'Описание', max: 160, req: false }
  ], async (v) => {
    const x = item(Object.assign({}, v, { desc: setL(undefined, lang, v.desc, 160) })); if (!x) throw new Error('Нужна корректная ссылка https:// или mailto:');
    data[KINDS[v.kind]].push(x); closeDlg(); touch();
  }, 'Добавить', langNote());
}
function editItem(key, i) {
  const x = data[key][i];
  form('Изменить', [
    { k: 'title', label: 'Название', value: x.title, max: 60 },
    { k: 'url', label: 'Ссылка', type: 'url', value: x.url, max: 300 },
    { k: 'desc', label: 'Описание', value: own(x.desc, lang), max: 160, req: false }
  ], async (v) => { const n = item(Object.assign({}, v, { desc: setL(x.desc, lang, v.desc, 160) })); if (!n) throw new Error('Некорректная ссылка'); data[key][i] = n; closeDlg(); touch(); }, 'Сохранить', langNote());
}
function delItem(key, i) { if (confirm('Удалить «' + data[key][i].title + '»?')) { data[key].splice(i, 1); touch(); } }
function move(key, i, d) { const a = data[key], j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; touch(); }
function editProfile() {
  form('Профиль', [
    { k: 'name', label: 'Имя', value: own(data.name, lang), max: 60, req: false },
    { k: 'tagline', label: 'Подзаголовок', value: own(data.tagline, lang), max: 140, req: false },
    { k: 'about', label: 'О себе', type: 'textarea', value: own(data.about, lang), max: 1200, req: false }
  ], async (v) => {
    data.name = setL(data.name, lang, v.name, 60); data.tagline = setL(data.tagline, lang, v.tagline, 140); data.about = setL(data.about, lang, v.about, 1200);
    data = clean(data); closeDlg(); touch();
  }, 'Сохранить', langNote());
}
function uploadResumeDlg() {
  form('PDF резюме', [{ k: 'file', label: 'Файл PDF (до 5 МБ)', type: 'file', accept: 'application/pdf' }], async (v) => {
    const f = v.file; if (!f) throw new Error('Выбери файл');
    if (f.size > 5 * 1024 * 1024) throw new Error('Файл больше 5 МБ');
    const bytes = new Uint8Array(await f.arrayBuffer());
    if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw new Error('Это не PDF');
    await putFile(CFG.resume, bytes, 'content: update resume', await remoteSha(CFG.resume));
    closeDlg(); toast('Резюме загружено. Появится на сайте через ~1 минуту');
  }, 'Загрузить');
}
function loginDlg() {
  if (admin) return;
  form('Вход для владельца', [
    { k: 't', label: 'GitHub fine-grained токен', type: 'password', max: 255 },
    { k: 'r', label: 'Запомнить на этом устройстве', type: 'checkbox', req: false }
  ], async (v) => { await unlock(v.t.trim()); store.set(token, v.r); closeDlg(); toast('Режим владельца включён'); },
  'Войти', 'Токен только на один репозиторий с правом Contents: Read and write. Он не отправляется никуда, кроме api.github.com.');
}

// ===== Запуск =====
async function load() {
  try { const r = await fetch(CFG.data + '?t=' + Date.now(), { cache: 'no-store' }); data = clean(await r.json()); }
  catch (e) { data = clean(DEFAULT); }
}
$('#resumeBar').onclick = openResume;
$('#adm').onclick = loginDlg;
$('#overlay').addEventListener('click', (e) => { if (e.target.id === 'overlay') closeDlg(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDlg(); });
addEventListener('hashchange', () => { if (location.hash === '#admin') { history.replaceState(null, '', location.pathname); loginDlg(); } });
(async () => {
  lang = pickLang(); await load(); renderAll();
  const t = store.get();
  if (t) { try { await unlock(t); } catch (e) { store.clear(); } }
  if (location.hash === '#admin') { history.replaceState(null, '', location.pathname); loginDlg(); }
})();
})();
