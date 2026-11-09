'use strict';

/* =========================================================
   «Смена» — совместный график работы
   Чистый JS без сборки. Работает локально и с Firebase.
   ========================================================= */

const SDK_BASE = 'https://www.gstatic.com/firebasejs/10.12.2/';
const SDK_APP = SDK_BASE + 'firebase-app-compat.js';
const SDK_DB = SDK_BASE + 'firebase-database-compat.js';
const CFG = window.SMENA_CONFIG || {};

const K_SETTINGS = 'smena.settings.v1';

const COLORS = [
  '#7c6cff', '#4cc9f0', '#3ddc97', '#ffb020', '#ff5d7a', '#f472b6',
  '#a3e635', '#fb923c', '#22d3ee', '#c084fc', '#facc15', '#94a3b8',
];

const WEEK_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const WEEK_FULL = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
const MONTH_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTH_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const DAY_START = 10 * 60;
const DAY_END = 21 * 60;
const DEFAULT_START = '10:00';
const DEFAULT_END = '21:00';

const IC = {
  edit: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  download: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
  upload: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>',
};

/* ---------- state ---------- */

const state = {
  settings: { name: '', teamCode: '', firebase: null, theme: 'auto' },
  team: null,
  monthDate: new Date(),
  tab: 'month',
  sync: 'local',
  connected: false,
  filterEmp: '',
  showEmpty: false,
  promptedCreate: false,
  pendingCreate: false,
  openDate: null,
};

let fb = null;
let toastTimer = 0;
let connectTimer = 0;
let everConnected = false;

/* ---------- utils ---------- */

const $ = (sel, root) => (root || document).querySelector(sel);
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const pad2 = (n) => String(n).padStart(2, '0');
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

function t2m(t) {
  if (typeof t !== 'string') return NaN;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

function m2t(mins) {
  let m = Math.round(mins);
  m = ((m % 1440) + 1440) % 1440;
  return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
}

function durMin(shift) {
  const a = t2m(shift.start);
  let b = t2m(shift.end);
  if (isNaN(a) || isNaN(b)) return 0;
  let d = b - a;
  if (d <= 0) d += 1440;
  return d;
}

function fmtDuration(mins) {
  if (!mins) return '0 ч';
  const h = Math.round((mins / 60) * 10) / 10;
  return String(h).replace('.', ',') + ' ч';
}

function shortTime(t) {
  const m = t2m(t);
  if (isNaN(m)) return t;
  return m % 60 === 0 ? pad2(Math.floor(m / 60)) : m2t(m);
}

function ymd(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function fromYmd(s) {
  const p = String(s).split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
}

function validYmd(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !isNaN(fromYmd(s).getTime());
}

function fmtDay(dateStr) {
  const d = fromYmd(dateStr);
  return d.getDate() + ' ' + MONTH_GEN[d.getMonth()];
}

function fmtDayShort(dateStr) {
  const d = fromYmd(dateStr);
  return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1);
}

function weekdayIndex(dateStr) {
  return (fromYmd(dateStr).getDay() + 6) % 7;
}

function hexA(hex, a) {
  const h = String(hex || '#888888').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

function firstName(name) {
  return String(name || '?').trim().split(/\s+/)[0];
}

function plural(n, forms) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ---------- storage ---------- */

const LS = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  },
};

function teamKey() {
  return 'smena.team.' + (state.settings.teamCode || 'local');
}

function loadSettings() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(K_SETTINGS) || '{}') || {}; } catch (e) { saved = {}; }
  const defaults = {
    name: '',
    teamCode: CFG.teamCode || '',
    firebase: CFG.firebase || null,
    theme: 'auto',
  };
  state.settings = Object.assign(defaults, saved);
  if (!state.settings.teamCode && CFG.teamCode) state.settings.teamCode = CFG.teamCode;
  if (!state.settings.firebase && CFG.firebase && !state.settings.syncDisabled) state.settings.firebase = CFG.firebase;
  if (!state.settings.firebase) state.settings.firebase = null;

  const width = window.innerWidth || 1024;
  state.tab = width < 700 ? 'list' : 'month';
}

function saveSettings() {
  LS.set(K_SETTINGS, state.settings);
}

function normalizeTeam(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const team = {
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Моя команда',
    employees: {},
    shifts: {},
    log: {},
    createdAt: Number(raw.createdAt) || Date.now(),
  };
  if (raw.employees && typeof raw.employees === 'object') {
    Object.keys(raw.employees).forEach((id) => {
      const e = raw.employees[id];
      if (!e || typeof e !== 'object' || !e.name) return;
      team.employees[id] = {
        id: e.id || id,
        name: String(e.name).slice(0, 60),
        color: /^#[0-9a-fA-F]{3,8}$/.test(e.color || '') ? e.color : COLORS[Object.keys(team.employees).length % COLORS.length],
      };
    });
  }
  if (raw.shifts && typeof raw.shifts === 'object') {
    Object.keys(raw.shifts).forEach((id) => {
      const s = raw.shifts[id];
      if (!s || typeof s !== 'object') return;
      if (!validYmd(s.date) || !s.empId || isNaN(t2m(s.start)) || isNaN(t2m(s.end))) return;
      team.shifts[id] = {
        id: s.id || id,
        date: s.date,
        empId: String(s.empId),
        start: m2t(t2m(s.start)),
        end: m2t(t2m(s.end)),
        note: s.note ? String(s.note).slice(0, 120) : '',
        by: s.by ? String(s.by).slice(0, 40) : '',
        at: Number(s.at) || 0,
      };
    });
  }
  if (raw.log && typeof raw.log === 'object') {
    const ids = Object.keys(raw.log).slice(-300);
    ids.forEach((id) => {
      const l = raw.log[id];
      if (!l || typeof l !== 'object') return;
      team.log[id] = {
        at: Number(l.at) || 0,
        by: String(l.by || ''),
        action: String(l.action || ''),
        details: String(l.details || ''),
      };
    });
  }
  return team;
}

function persist() {
  if (state.team) LS.set(teamKey(), state.team);
}

function seedTeam() {
  const team = {
    name: CFG.teamCode ? 'Команда ' + CFG.teamCode : 'Моя команда',
    employees: {},
    shifts: {},
    log: {},
    createdAt: Date.now(),
  };
  ['Анна', 'Пётр', 'Мария', 'Игорь'].forEach((name, i) => {
    const id = uid();
    team.employees[id] = { id, name, color: COLORS[i % COLORS.length] };
  });
  return team;
}

/* ---------- data helpers ---------- */

function empList() {
  if (!state.team || !state.team.employees) return [];
  return Object.values(state.team.employees).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function empById(id) {
  return (state.team && state.team.employees && state.team.employees[id]) || null;
}

function shiftsOf(date) {
  if (!state.team || !state.team.shifts) return [];
  return Object.values(state.team.shifts).filter((s) => s && s.date === date);
}

function byStart(a, b) {
  const d = t2m(a.start) - t2m(b.start);
  if (d) return d;
  const ea = empById(a.empId), eb = empById(b.empId);
  return (ea ? ea.name : '').localeCompare(eb ? eb.name : '', 'ru');
}

function monthPrefix() {
  return state.monthDate.getFullYear() + '-' + pad2(state.monthDate.getMonth() + 1);
}

function monthShifts() {
  if (!state.team || !state.team.shifts) return [];
  const prefix = monthPrefix();
  return Object.values(state.team.shifts).filter((s) => s && s.date && s.date.slice(0, 7) === prefix);
}

function mergeIntervals(list) {
  const arr = list.filter((x) => x[1] > x[0]).sort((a, b) => a[0] - b[0]);
  const out = [];
  arr.forEach((iv) => {
    const last = out[out.length - 1];
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
    else out.push([iv[0], iv[1]]);
  });
  return out;
}

function dayCoverage(date) {
  const list = shiftsOf(date);
  const intervals = [];
  list.forEach((s) => {
    let a = t2m(s.start);
    let b = t2m(s.end);
    if (isNaN(a) || isNaN(b)) return;
    if (b <= a) b += 1440;
    a = Math.max(a, DAY_START);
    b = Math.min(b, DAY_END);
    if (b > a) intervals.push([a, b]);
  });
  const merged = mergeIntervals(intervals);
  const gaps = [];
  let cur = DAY_START;
  merged.forEach((iv) => {
    if (iv[0] > cur) gaps.push([cur, iv[0]]);
    cur = Math.max(cur, iv[1]);
  });
  if (cur < DAY_END) gaps.push([cur, DAY_END]);
  return { gaps, covered: gaps.length === 0 };
}

function gapsText(gaps) {
  return gaps.map((g) => m2t(g[0]) + '–' + m2t(g[1])).join(', ');
}

function overlaps(a, b) {
  const a1 = t2m(a.start), a2 = a1 + durMin(a);
  const b1 = t2m(b.start), b2 = b1 + durMin(b);
  return a1 < b2 && b1 < a2;
}

function statsForMonth() {
  const shifts = monthShifts();
  const map = {};
  empList().forEach((e) => {
    map[e.id] = { emp: e, mins: 0, count: 0, days: new Set() };
  });
  shifts.forEach((s) => {
    if (!map[s.empId]) return;
    map[s.empId].mins += durMin(s);
    map[s.empId].count += 1;
    map[s.empId].days.add(s.date);
  });
  return Object.values(map).sort((a, b) => b.mins - a.mins || a.emp.name.localeCompare(b.emp.name, 'ru'));
}

/* ---------- sync ---------- */

function setSync(mode) {
  state.sync = mode;
  const chip = $('.sync');
  if (!chip) return;
  const meta = syncMeta();
  chip.style.setProperty('--dot', meta.color);
  const txt = chip.querySelector('.sync-text');
  if (txt) txt.textContent = meta.label;
}

function syncMeta() {
  if (!state.settings.firebase) return { label: 'Локально', color: '#8a93a8' };
  if (state.sync === 'online') return { label: 'Онлайн', color: '#3ddc97' };
  if (state.sync === 'connecting') return { label: 'Подключение', color: '#ffb020' };
  if (state.sync === 'offline') return { label: 'Офлайн', color: '#ffb020' };
  return { label: 'Ошибка', color: '#ff5d7a' };
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="' + src + '"]')) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Не удалось загрузить ' + src));
    document.head.appendChild(s);
  });
}

function remoteSet(path, value) {
  if (!fb) return;
  fb.ref.child(path).set(value).catch((err) => {
    console.warn(err);
    toast('Не удалось сохранить: ' + (err && err.message ? err.message : 'ошибка сети'));
  });
}

function remoteRemove(path) {
  if (!fb) return;
  fb.ref.child(path).remove().catch((err) => {
    console.warn(err);
    toast('Не удалось удалить: ' + (err && err.message ? err.message : 'ошибка сети'));
  });
}

async function connectFirebase() {
  if (!state.settings.firebase || !state.settings.teamCode) {
    setSync('local');
    return;
  }
  setSync('connecting');
  try {
    await loadScript(SDK_APP);
    await loadScript(SDK_DB);
    if (!window.firebase) throw new Error('Firebase не загрузился');

    const cfg = state.settings.firebase;
    if (!cfg.databaseURL && cfg.projectId) {
      cfg.databaseURL = 'https://' + cfg.projectId + '-default-rtdb.firebaseio.com';
    }
    if (!cfg.databaseURL) throw new Error('В конфигурации нет databaseURL');

    if (!firebase.apps.length) firebase.initializeApp(cfg);
    const db = firebase.database();
    const ref = db.ref('teams/' + state.settings.teamCode);
    fb = { db, ref };
    armConnectTimeout();

    db.ref('.info/connected').on('value', (snap) => {
      state.connected = snap.val() === true;
      if (state.connected) {
        everConnected = true;
        clearTimeout(connectTimer);
        setSync('online');
      } else if (everConnected) {
        setSync('offline');
      }
    });

    ref.on('value', (snap) => {
      clearTimeout(connectTimer);
      const raw = snap.val();
      if (raw) {
        state.team = normalizeTeam(raw);
        persist();
        render();
        setSync(state.connected ? 'online' : 'offline');
      } else {
        setSync(state.connected ? 'online' : 'offline');
        if (!state.promptedCreate) {
          state.promptedCreate = true;
          state.pendingCreate = true;
          if (state.settings.name) {
            state.pendingCreate = false;
            openCreateTeam();
          } else {
            openWelcome();
          }
        }
      }
    }, (err) => {
      clearTimeout(connectTimer);
      console.warn(err);
      setSync('error');
      toast('Ошибка синхронизации: ' + (err && err.message ? err.message : 'нет доступа'));
      render();
    });
  } catch (err) {
    clearTimeout(connectTimer);
    console.error(err);
    setSync('error');
    toast(err && err.message ? err.message : 'Ошибка подключения');
    render();
  }
}

function armConnectTimeout() {
  clearTimeout(connectTimer);
  connectTimer = setTimeout(() => {
    if (!state.team) {
      setSync('error');
      render();
    }
  }, 9000);
}

/* ---------- render ---------- */

function applyTheme() {
  const setting = state.settings.theme || 'auto';
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = setting === 'dark' || (setting === 'auto' && prefersDark);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0d0f16' : '#f2f4fa');
}

function render() {
  const app = $('#app');
  if (!app) return;
  app.innerHTML = headerHTML() + '<main class="main">' + mainHTML() + '</main>';
  const chip = $('.sync');
  if (chip) chip.style.setProperty('--dot', syncMeta().color);
}

function headerHTML() {
  const meta = syncMeta();
  const initial = (state.settings.name || '?').trim().charAt(0).toUpperCase() || '?';
  const teamName = state.team && state.team.name ? state.team.name : 'график работы';
  return '' +
    '<header class="top">' +
      '<div class="brand">' +
        '<div class="logo" aria-hidden="true">' + IC.calendar + '</div>' +
        '<div class="brand-text">' +
          '<div class="brand-name">Смена</div>' +
          '<div class="brand-sub">' + esc(teamName) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="top-actions">' +
        '<button class="sync" data-action="open-settings" style="--dot:' + meta.color + '" title="Настройки синхронизации">' +
          '<span class="sync-dot"></span><span class="sync-text">' + meta.label + '</span>' +
        '</button>' +
        '<button class="avatar" data-action="open-settings" title="Настройки">' + esc(initial) + '</button>' +
      '</div>' +
    '</header>' +
    '<nav class="tabs">' +
      [['month', 'Месяц'], ['list', 'Список'], ['team', 'Команда'], ['summary', 'Итого']].map((t) =>
        '<button class="tab' + (state.tab === t[0] ? ' active' : '') + '" data-action="tab" data-tab="' + t[0] + '">' + t[1] + '</button>'
      ).join('') +
    '</nav>';
}

function mainHTML() {
  if (!state.team) {
    if (state.sync === 'error') {
      return '<div class="empty-state">' +
        '<p style="margin-bottom:8px">Не удалось загрузить график.</p>' +
        '<p class="tiny" style="margin-bottom:18px">Проверьте интернет и настройки Firebase. Данные на этом устройстве не потеряны.</p>' +
        '<div class="export-row" style="justify-content:center">' +
          '<button class="btn" data-action="retry-sync">Повторить</button>' +
          '<button class="btn ghost" data-action="open-settings">Настройки</button>' +
        '</div>' +
      '</div>';
    }
    return '<div class="empty-state"><div class="spinner" style="margin:0 auto 14px"></div>Загрузка графика…</div>';
  }
  if (state.tab === 'list') return viewList();
  if (state.tab === 'team') return viewTeam();
  if (state.tab === 'summary') return viewSummary();
  return viewMonth();
}

function hintHTML() {
  if (state.settings.firebase) return '';
  return '<div class="hint">Данные хранятся только на этом устройстве. ' +
    '<button data-action="open-settings">Включить синхронизацию с командой →</button></div>';
}

function monthBar() {
  const m = state.monthDate.getMonth();
  const y = state.monthDate.getFullYear();
  return '<div class="monthbar">' +
    '<button class="nav-btn" data-action="prev-month" aria-label="Предыдущий месяц">‹</button>' +
    '<h1 class="month-title">' + MONTH_NOM[m] + ' ' + y + '</h1>' +
    '<button class="nav-btn" data-action="next-month" aria-label="Следующий месяц">›</button>' +
    '<button class="btn ghost sm" data-action="today">Сегодня</button>' +
  '</div>';
}

function viewMonth() {
  const y = state.monthDate.getFullYear();
  const m = state.monthDate.getMonth();
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const dim = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const emps = empList();
  const legend = emps.length
    ? '<div class="legend">' + emps.slice(0, 12).map((e) =>
        '<span class="item"><span class="swatch" style="background:' + e.color + '"></span>' + esc(e.name) + '</span>'
      ).join('') + '</div>'
    : '';

  return hintHTML() + monthBar() + legend +
    '<div class="calendar">' +
      WEEK_SHORT.map((w, i) => '<div class="weekday' + (i > 4 ? ' we' : '') + '">' + w + '</div>').join('') +
      cells.map(dayCell).join('') +
    '</div>';
}

function dayCell(d) {
  if (!d) return '<div class="day blank"></div>';
  const date = ymd(d);
  const list = shiftsOf(date).sort(byStart);
  const cov = dayCoverage(date);
  const today = date === ymd(new Date());
  const wd = (d.getDay() + 6) % 7;
  const chips = list.map((s) => {
    const emp = empById(s.empId);
    const color = emp ? emp.color : '#8a93a8';
    return '<span class="chip" style="background:' + hexA(color, 0.16) + ';box-shadow:inset 3px 0 0 ' + color + '">' +
      '<span class="cdot" style="background:' + color + '"></span>' +
      '<span class="cname">' + esc(firstName(emp ? emp.name : '—')) + '</span>' +
      '<span class="ctime">' + shortTime(s.start) + '–' + shortTime(s.end) + '</span>' +
    '</span>';
  }).join('');

  return '<button class="day' + (today ? ' today' : '') + (wd > 4 ? ' weekend' : '') +
    (list.length && !cov.covered ? ' gap' : '') + '" data-action="day" data-date="' + date + '">' +
    '<span class="dnum">' + d.getDate() + '</span>' +
    '<span class="chips">' + chips + '</span>' +
    (list.length && !cov.covered ? '<span class="gap-dot" title="Смена 10:00–21:00 не покрыта полностью"></span>' : '') +
  '</button>';
}

function viewList() {
  const y = state.monthDate.getFullYear();
  const m = state.monthDate.getMonth();
  const dim = new Date(y, m + 1, 0).getDate();
  const today = ymd(new Date());
  const emps = empList();
  const rows = [];

  for (let d = 1; d <= dim; d++) {
    const date = y + '-' + pad2(m + 1) + '-' + pad2(d);
    let list = shiftsOf(date).sort(byStart);
    if (state.filterEmp) list = list.filter((s) => s.empId === state.filterEmp);
    if (!list.length && !state.showEmpty) continue;
    rows.push({ date, d, list });
  }

  const filter = '<div class="filterbar">' +
    '<select class="select" data-change="filter-emp" aria-label="Фильтр по сотруднику">' +
      '<option value="">Все сотрудники</option>' +
      emps.map((e) => '<option value="' + e.id + '"' + (state.filterEmp === e.id ? ' selected' : '') + '>' + esc(e.name) + '</option>').join('') +
    '</select>' +
    '<button class="btn ghost sm" data-action="toggle-empty">' + (state.showEmpty ? 'Скрыть пустые дни' : 'Показать пустые дни') + '</button>' +
  '</div>';

  const body = rows.length
    ? '<div class="agenda-list">' + rows.map((row) => {
        const isToday = row.date === today;
        const shiftRows = row.list.length
          ? row.list.map(agendaShift).join('')
          : '<div class="agenda-empty">нет смен</div>';
        return '<div class="agenda-row' + (isToday ? ' today' : '') + '">' +
          '<div class="agenda-left"><div class="agenda-daynum">' + row.d + '</div><div class="agenda-wd">' + WEEK_SHORT[weekdayIndex(row.date)] + '</div></div>' +
          '<div class="agenda-shifts">' + shiftRows +
            '<button class="add-mini" data-action="new-shift" data-date="' + row.date + '">' + IC.plus + ' смена</button>' +
          '</div>' +
        '</div>';
      }).join('') + '</div>'
    : (() => {
        const now = new Date();
        const sameMonth = state.monthDate.getFullYear() === now.getFullYear() && state.monthDate.getMonth() === now.getMonth();
        const addDate = sameMonth ? today : y + '-' + pad2(m + 1) + '-01';
        return '<div class="empty">В этом месяце пока нет смен.<br><span class="tiny">Добавьте первую смену — дальше будет проще.</span>' +
          '<div style="margin-top:14px"><button class="btn primary" data-action="new-shift" data-date="' + addDate + '">' + IC.plus + ' Добавить смену</button></div></div>';
      })();

  return hintHTML() + monthBar() + filter + body;
}

function agendaShift(s) {
  const emp = empById(s.empId);
  const color = emp ? emp.color : '#8a93a8';
  return '<button class="agenda-shift" data-action="edit-shift" data-id="' + s.id + '">' +
    '<span class="dot" style="background:' + color + '"></span>' +
    '<span class="who">' + esc(emp ? emp.name : 'Удалён') + '</span>' +
    (s.note ? '<span class="muted tiny" style="margin-left:2px">' + esc(s.note) + '</span>' : '') +
    '<span class="when"><span class="hm">' + s.start + '–' + s.end + '</span> · ' + fmtDuration(durMin(s)) + '</span>' +
  '</button>';
}

function viewTeam() {
  const emps = empList();
  const stats = statsForMonth();
  const statById = {};
  stats.forEach((st) => { statById[st.emp.id] = st; });

  const codeCard = state.settings.firebase && state.settings.teamCode
    ? '<div class="code-card card">' +
        '<div class="grow"><div class="tiny muted">Код команды — передайте его сотрудникам</div>' +
        '<div class="code">' + esc(state.settings.teamCode) + '</div></div>' +
        '<button class="btn sm" data-action="copy-code">Скопировать</button>' +
      '</div>'
    : '';

  const cards = emps.length
    ? '<div class="emp-grid">' + emps.map((e) => {
        const st = statById[e.id] || { mins: 0, count: 0 };
        return '<div class="emp-card">' +
          '<span class="dot" style="background:' + e.color + '"></span>' +
          '<div class="emp-info"><div class="emp-name">' + esc(e.name) + '</div>' +
          '<div class="tiny muted">' + fmtDuration(st.mins) + ' · ' + st.count + ' ' + plural(st.count, ['смена', 'смены', 'смен']) + '</div></div>' +
          '<button class="icon-btn" data-action="edit-employee" data-id="' + e.id + '" aria-label="Изменить">' + IC.edit + '</button>' +
        '</div>';
      }).join('') + '</div>'
    : '<div class="empty">Сотрудников пока нет. Добавьте первого — и можно ставить смены.</div>';

  return codeCard +
    '<div class="section-head"><h2>Сотрудники</h2>' +
      '<button class="btn primary sm" data-action="new-employee">' + IC.plus + ' Добавить</button>' +
    '</div>' + cards;
}

function viewSummary() {
  const stats = statsForMonth();
  const totalMins = stats.reduce((a, s) => a + s.mins, 0);
  const totalShifts = stats.reduce((a, s) => a + s.count, 0);

  const y = state.monthDate.getFullYear();
  const m = state.monthDate.getMonth();
  const dim = new Date(y, m + 1, 0).getDate();
  const issues = [];
  let emptyDays = 0;

  for (let d = 1; d <= dim; d++) {
    const date = y + '-' + pad2(m + 1) + '-' + pad2(d);
    const list = shiftsOf(date);
    if (!list.length) { emptyDays++; continue; }
    const cov = dayCoverage(date);
    if (!cov.covered) issues.push({ date, gaps: cov.gaps });
  }

  const table = stats.length
    ? '<table class="stats-table"><thead><tr><th>Сотрудник</th><th class="num">Смен</th><th class="num">Дней</th><th class="num">Часов</th></tr></thead><tbody>' +
      stats.map((st) => '<tr>' +
        '<td><span class="who"><span class="cdot" style="background:' + st.emp.color + ';width:8px;height:8px;border-radius:50%"></span>' + esc(st.emp.name) + '</span></td>' +
        '<td class="num">' + st.count + '</td>' +
        '<td class="num">' + st.days.size + '</td>' +
        '<td class="num">' + fmtDuration(st.mins) + '</td>' +
      '</tr>').join('') +
      '</tbody><tfoot><tr><td>Всего</td><td class="num">' + totalShifts + '</td><td class="num">—</td><td class="num">' + fmtDuration(totalMins) + '</td></tr></tfoot></table>'
    : '<div class="empty">Нет данных за этот месяц.</div>';

  const issuesHTML = issues.length
    ? issues.map((it) => '<div class="issue-row">' +
        '<span class="badge warn">разрыв</span>' +
        '<span class="grow">' + fmtDay(it.date) + ', ' + WEEK_SHORT[weekdayIndex(it.date)] + '</span>' +
        '<span class="muted tiny">не покрыто ' + gapsText(it.gaps) + '</span>' +
      '</div>').join('')
    : '<div class="issue-row"><span class="badge ok">ок</span><span class="grow">Все дни со сменами покрывают 10:00–21:00</span></div>';

  const log = Object.values(state.team.log || {}).sort((a, b) => b.at - a.at).slice(0, 25);
  const historyHTML = log.length
    ? log.map((l) => '<div class="history-row">' +
        '<span class="when">' + new Date(l.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</span>' +
        '<span class="grow"><b>' + esc(l.by || 'Гость') + '</b> — ' + esc(l.action || '') + (l.details ? ': ' + esc(l.details) : '') + '</span>' +
      '</div>').join('')
    : '<div class="muted tiny">Изменений пока не было.</div>';

  return '<div class="section-head"><h2>Итого за ' + MONTH_NOM[m].toLowerCase() + '</h2>' +
      '<button class="btn ghost sm" data-action="print">Печать</button></div>' +
    '<div class="card" style="margin-bottom:16px">' + table + '</div>' +
    '<div class="card" style="margin-bottom:16px"><h3 style="font-size:15px;margin-bottom:6px">Покрытие смен 10:00–21:00</h3>' +
      '<div class="tiny muted" style="margin-bottom:8px">Дней без смен в месяце: ' + emptyDays + '</div>' + issuesHTML + '</div>' +
    '<div class="card" style="margin-bottom:16px"><h3 style="font-size:15px;margin-bottom:10px">Данные</h3>' +
      '<div class="export-row">' +
        '<button class="btn sm" data-action="export-csv">' + IC.download + ' CSV для Excel</button>' +
        '<button class="btn sm" data-action="backup">' + IC.download + ' Резервная копия</button>' +
        '<button class="btn sm" data-action="import">' + IC.upload + ' Восстановить</button>' +
      '</div></div>' +
    '<div class="card"><h3 style="font-size:15px;margin-bottom:10px">История изменений</h3>' + historyHTML + '</div>';
}

/* ---------- modal ---------- */

function lockBody() {
  document.body.classList.add('modal-open');
}

function unlockIfIdle() {
  const m = $('#modal-root');
  const d = $('#dialog-root');
  const hasModal = m && m.innerHTML.trim();
  const hasDialog = d && d.innerHTML.trim();
  if (!hasModal && !hasDialog) document.body.classList.remove('modal-open');
}

function openSheet(html, extraClass) {
  const root = $('#modal-root');
  if (!root) return;
  root.innerHTML = '<div class="backdrop" data-action="close-modal"></div>' +
    '<div class="sheet ' + (extraClass || '') + '" role="dialog" aria-modal="true">' + html + '</div>';
  lockBody();
}

function closeSheet() {
  const root = $('#modal-root');
  if (root) root.innerHTML = '';
  unlockIfIdle();
}

function confirmDialog(title, text, okLabel, danger) {
  return new Promise((resolve) => {
    const root = $('#dialog-root');
    if (!root) return resolve(false);
    root.innerHTML = '<div class="backdrop" data-dialog="no"></div>' +
      '<div class="sheet"><div class="sheet-body" style="padding-top:24px">' +
        '<h2 class="sheet-title" style="margin-bottom:8px">' + esc(title) + '</h2>' +
        '<p class="muted" style="margin-bottom:20px">' + esc(text) + '</p>' +
        '<div class="row-2">' +
          '<button class="btn" type="button" data-dialog="no">Отмена</button>' +
          '<button class="btn ' + (danger === false ? 'primary' : 'danger') + '" type="button" data-dialog="yes">' + esc(okLabel || 'Удалить') + '</button>' +
        '</div>' +
      '</div></div>';
    lockBody();

    const cleanup = (val) => {
      document.removeEventListener('click', onClick, true);
      root.innerHTML = '';
      unlockIfIdle();
      resolve(val);
    };
    const onClick = (e) => {
      const btn = e.target.closest('[data-dialog]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      cleanup(btn.dataset.dialog === 'yes');
    };
    setTimeout(() => document.addEventListener('click', onClick, true), 0);
  });
}

/* ---------- day sheet ---------- */

function openDay(date) {
  if (!state.team) return;
  state.openDate = date;
  const list = shiftsOf(date).sort(byStart);
  const cov = list.length ? dayCoverage(date) : null;
  const wd = weekdayIndex(date);
  const today = date === ymd(new Date());

  const coverage = cov
    ? '<div class="coverage ' + (cov.covered ? 'ok' : 'warn') + '">' +
        (cov.covered ? '✓ Смена 10:00–21:00 покрыта полностью' : '⚠ Не покрыто: ' + gapsText(cov.gaps)) +
      '</div>'
    : '';

  const rows = list.length
    ? '<div class="shift-list">' + list.map((s) => {
        const emp = empById(s.empId);
        const color = emp ? emp.color : '#8a93a8';
        return '<div class="shift-row">' +
          '<span class="dot" style="background:' + color + '"></span>' +
          '<div class="shift-main"><div class="shift-name">' + esc(emp ? emp.name : 'Удалённый сотрудник') + '</div>' +
            '<div class="shift-time">' + s.start + '–' + s.end + ' · ' + fmtDuration(durMin(s)) +
            (s.note ? ' · ' + esc(s.note) : '') + '</div></div>' +
          '<button class="icon-btn" data-action="edit-shift" data-id="' + s.id + '" aria-label="Изменить">' + IC.edit + '</button>' +
          '<button class="icon-btn danger" data-action="delete-shift" data-id="' + s.id + '" aria-label="Удалить">' + IC.trash + '</button>' +
        '</div>';
      }).join('') + '</div>'
    : '<div class="empty">Смен пока нет</div>';

  openSheet(
    '<div class="sheet-head">' +
      '<div class="grow"><div class="sheet-title">' + fmtDay(date) + (today ? ' · сегодня' : '') + '</div>' +
      '<div class="tiny muted">' + WEEK_FULL[wd] + '</div></div>' +
      '<button class="icon-btn" data-action="close-modal" aria-label="Закрыть">' + IC.close + '</button>' +
    '</div>' +
    '<div class="sheet-body">' + coverage + rows +
      (empList().length
        ? '<button class="btn primary block" data-action="new-shift" data-date="' + date + '">' + IC.plus + ' Добавить смену</button>'
        : '<button class="btn primary block" data-action="new-employee">' + IC.plus + ' Сначала добавьте сотрудника</button>') +
      '<p class="tiny muted" style="margin-top:12px">Стандартная смена — 10:00–21:00. Разделённая смена: добавьте две записи, например 10:00–15:00 и 15:00–21:00.</p>' +
    '</div>'
  );
}

/* ---------- shift form ---------- */

function openShiftForm(id, date) {
  if (!state.team) return;
  const emps = empList();
  if (!emps.length) {
    toast('Сначала добавьте сотрудника');
    openEmployeeForm();
    return;
  }
  const existing = id ? state.team.shifts[id] : null;
  const shift = existing || {
    id: uid(),
    date: date || state.openDate || ymd(new Date()),
    empId: emps[0].id,
    start: DEFAULT_START,
    end: DEFAULT_END,
    note: '',
  };
  state.openDate = shift.date;

  const options = emps.map((e) =>
    '<option value="' + e.id + '"' + (e.id === shift.empId ? ' selected' : '') + '>' + esc(e.name) + '</option>'
  ).join('');

  openSheet(
    '<div class="sheet-head">' +
      '<button class="icon-btn" data-action="back-day" data-date="' + shift.date + '" aria-label="Назад">' + IC.back + '</button>' +
      '<div class="grow"><div class="sheet-title">' + (existing ? 'Изменить смену' : 'Новая смена') + '</div>' +
      '<div class="tiny muted">' + fmtDay(shift.date) + ', ' + WEEK_SHORT[weekdayIndex(shift.date)] + '</div></div>' +
      '<button class="icon-btn" data-action="close-modal" aria-label="Закрыть">' + IC.close + '</button>' +
    '</div>' +
    '<form class="sheet-form" data-form="shift" data-id="' + (existing ? shift.id : '') + '" data-date="' + shift.date + '" novalidate>' +
      '<div class="sheet-body">' +
        '<div class="form-error" data-error></div>' +
        '<label class="field"><span class="label">Сотрудник</span>' +
          '<select class="select-full" name="empId">' + options + '</select></label>' +
        '<div class="field"><span class="label">Время смены</span>' +
          '<div class="time-row">' +
            '<input class="input" type="time" name="start" step="300" value="' + shift.start + '" required>' +
            '<span class="dash">—</span>' +
            '<input class="input" type="time" name="end" step="300" value="' + shift.end + '" required>' +
          '</div>' +
        '</div>' +
        '<div class="presets">' +
          '<button type="button" class="preset" data-action="preset" data-start="10:00" data-end="21:00">Полная 10:00–21:00</button>' +
          '<button type="button" class="preset" data-action="preset" data-start="10:00" data-end="15:00">Утро 10:00–15:00</button>' +
          '<button type="button" class="preset" data-action="preset" data-start="15:00" data-end="21:00">Вечер 15:00–21:00</button>' +
        '</div>' +
        '<label class="field"><span class="label">Примечание (необязательно)</span>' +
          '<input class="input" type="text" name="note" maxlength="120" value="' + esc(shift.note || '') + '" placeholder="например, стажировка"></label>' +
        '<p class="tiny muted">Если конец раньше начала, смена считается ночной (через полночь).</p>' +
      '</div>' +
      '<div class="sheet-foot">' +
        (existing ? '<button type="button" class="btn ghost" data-action="delete-shift" data-id="' + shift.id + '">' + IC.trash + '</button>' : '') +
        '<button type="submit" class="btn primary grow">' + (existing ? 'Сохранить' : 'Добавить смену') + '</button>' +
      '</div>' +
    '</form>'
  );

  const form = $('#modal-root form[data-form="shift"]');
  if (form) {
    syncPresetUI(form);
    form.addEventListener('input', () => syncPresetUI(form));
    const first = form.querySelector('input[name="start"]');
    if (first && !existing) setTimeout(() => first.focus(), 250);
  }
}

function syncPresetUI(form) {
  const start = form.elements.start.value;
  const end = form.elements.end.value;
  form.querySelectorAll('.preset').forEach((b) => {
    b.classList.toggle('on', b.dataset.start === start && b.dataset.end === end);
  });
}

function showFormError(form, msg) {
  if (!form) { toast(msg); return; }
  let box = form.querySelector('[data-error]');
  if (!box) {
    box = document.createElement('div');
    box.className = 'form-error';
    box.setAttribute('data-error', '');
    const host = form.querySelector('.sheet-body') || form;
    host.insertBefore(box, host.firstChild);
  }
  box.textContent = msg;
  box.classList.add('show');
  box.setAttribute('role', 'alert');
  // Ошибка всегда вверху прокручиваемой области — поднимаем её к началу,
  // иначе при сохранении из нижней части формы её просто не видно.
  const scroller = form.querySelector('.sheet-body');
  if (scroller) scroller.scrollTop = 0;
  box.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

async function saveShiftFromForm(form) {
  const fd = new FormData(form);
  const empId = String(fd.get('empId') || '');
  const emp = empById(empId);
  const start = String(fd.get('start') || '');
  const end = String(fd.get('end') || '');
  const note = String(fd.get('note') || '').trim();
  const date = form.dataset.date;
  const id = form.dataset.id || uid();

  if (!emp) return showFormError(form, 'Выберите сотрудника.');
  if (isNaN(t2m(start)) || isNaN(t2m(end))) return showFormError(form, 'Укажите время начала и окончания.');
  if (t2m(start) === t2m(end)) return showFormError(form, 'Начало и конец смены не могут совпадать.');

  const candidate = { id, date, empId, start: m2t(t2m(start)), end: m2t(t2m(end)), note };
  const clash = shiftsOf(date).find((s) => s.id !== id && s.empId === empId && overlaps(candidate, s));
  if (clash) {
    return showFormError(form, 'Пересечение: у сотрудника «' + emp.name + '» уже есть смена ' + clash.start + '–' + clash.end + ' в этот день.');
  }

  const isNew = !state.team.shifts[id];
  const shift = Object.assign({}, candidate, {
    by: state.settings.name || 'Гость',
    at: Date.now(),
  });

  state.team.shifts[id] = shift;
  persist();
  remoteSet('shifts/' + id, shift);
  logEntry(isNew ? 'Добавлена смена' : 'Смена изменена',
    emp.name + ', ' + fmtDay(date) + ', ' + shift.start + '–' + shift.end);

  render();
  openDay(date);
  toast(isNew ? 'Смена добавлена' : 'Сохранено');
}

async function deleteShift(id) {
  const shift = state.team && state.team.shifts ? state.team.shifts[id] : null;
  if (!shift) return;
  const emp = empById(shift.empId);
  const ok = await confirmDialog('Удалить смену?',
    (emp ? emp.name : 'Сотрудник') + ', ' + fmtDay(shift.date) + ', ' + shift.start + '–' + shift.end, 'Удалить');
  if (!ok) return;

  delete state.team.shifts[id];
  persist();
  remoteRemove('shifts/' + id);
  logEntry('Удалена смена', (emp ? emp.name : 'Сотрудник') + ', ' + fmtDay(shift.date) + ', ' + shift.start + '–' + shift.end);
  if (state.openDate) openDay(state.openDate);
  render();
  toast('Смена удалена');
}

/* ---------- employee form ---------- */

function nextColor() {
  const used = empList().map((e) => e.color);
  for (let i = 0; i < COLORS.length; i++) {
    if (!used.includes(COLORS[i])) return COLORS[i];
  }
  return COLORS[empList().length % COLORS.length];
}

function openEmployeeForm(id) {
  if (!state.team) return;
  const existing = id ? state.team.employees[id] : null;
  const emp = existing || { id: uid(), name: '', color: nextColor() };

  openSheet(
    '<div class="sheet-head">' +
      '<div class="grow"><div class="sheet-title">' + (existing ? 'Сотрудник' : 'Новый сотрудник') + '</div>' +
      '<div class="tiny muted">Имя видно всем в графике</div></div>' +
      '<button class="icon-btn" data-action="close-modal" aria-label="Закрыть">' + IC.close + '</button>' +
    '</div>' +
    '<form class="sheet-form" data-form="employee" data-id="' + (existing ? emp.id : '') + '" novalidate>' +
      '<div class="sheet-body">' +
        '<div class="form-error" data-error></div>' +
        '<label class="field"><span class="label">Имя</span>' +
          '<input class="input" type="text" name="empName" maxlength="40" value="' + esc(emp.name) + '" placeholder="Например, Анна" autocomplete="off" required></label>' +
        '<div class="field"><span class="label">Цвет в графике</span>' +
          '<input type="hidden" name="color" value="' + emp.color + '">' +
          '<div class="swatches">' + COLORS.map((c) =>
            '<button type="button" class="swatch-btn' + (c === emp.color ? ' on' : '') + '" data-action="pick-color" data-color="' + c + '" style="--sw:' + c + '" aria-label="' + c + '"></button>'
          ).join('') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="sheet-foot">' +
        (existing ? '<button type="button" class="btn ghost" data-action="delete-employee" data-id="' + emp.id + '">' + IC.trash + '</button>' : '') +
        '<button type="submit" class="btn primary grow">' + (existing ? 'Сохранить' : 'Добавить') + '</button>' +
      '</div>' +
    '</form>'
  );
  const input = $('#modal-root input[name="empName"]');
  if (input) setTimeout(() => input.focus(), 250);
}

function saveEmployeeFromForm(form) {
  const fd = new FormData(form);
  const name = String(fd.get('empName') || '').trim();
  const color = String(fd.get('color') || COLORS[0]);
  const isNew = !form.dataset.id;
  const id = form.dataset.id || uid();
  if (!name) return showFormError(form, 'Введите имя сотрудника.');

  const emp = { id, name, color };
  state.team.employees[id] = emp;
  persist();
  remoteSet('employees/' + id, emp);
  logEntry(isNew ? 'Добавлен сотрудник' : 'Сотрудник изменён', name);

  closeSheet();
  render();
  toast(isNew ? 'Сотрудник добавлен' : 'Сохранено');
}

async function deleteEmployee(id) {
  const emp = state.team && state.team.employees ? state.team.employees[id] : null;
  if (!emp) return;
  const count = Object.values(state.team.shifts || {}).filter((s) => s.empId === id).length;
  const ok = await confirmDialog('Удалить сотрудника?',
    emp.name + (count ? '. Вместе с ним удалятся его смены: ' + count + ' шт.' : '.'), 'Удалить');
  if (!ok) return;

  delete state.team.employees[id];
  Object.keys(state.team.shifts || {}).forEach((sid) => {
    if (state.team.shifts[sid].empId === id) {
      delete state.team.shifts[sid];
      remoteRemove('shifts/' + sid);
    }
  });
  persist();
  remoteRemove('employees/' + id);
  logEntry('Удалён сотрудник', emp.name);
  closeSheet();
  render();
  toast('Сотрудник удалён');
}

/* ---------- settings ---------- */

function openSettings() {
  const s = state.settings;
  const meta = syncMeta();
  const fbText = s.firebase ? JSON.stringify(s.firebase, null, 2) : '';

  openSheet(
    '<div class="sheet-head">' +
      '<div class="grow"><div class="sheet-title">Настройки</div>' +
      '<div class="tiny muted">' + (s.firebase ? 'Синхронизация включена' : 'Локальный режим') + '</div></div>' +
      '<button class="icon-btn" data-action="close-modal" aria-label="Закрыть">' + IC.close + '</button>' +
    '</div>' +
    '<form class="sheet-form" data-form="settings" novalidate>' +
      '<div class="sheet-body">' +
        '<div class="form-error" data-error></div>' +

        '<div class="settings-section">' +
          '<h3>Вы</h3>' +
          '<label class="field"><span class="label">Ваше имя (для истории изменений)</span>' +
            '<input class="input" type="text" name="name" maxlength="30" value="' + esc(s.name) + '" placeholder="Например, Анна"></label>' +
          '<label class="field"><span class="label">Оформление</span>' +
            '<select class="select-full" name="theme">' +
              '<option value="auto"' + (s.theme === 'auto' ? ' selected' : '') + '>Как в системе</option>' +
              '<option value="dark"' + (s.theme === 'dark' ? ' selected' : '') + '>Тёмное</option>' +
              '<option value="light"' + (s.theme === 'light' ? ' selected' : '') + '>Светлое</option>' +
            '</select></label>' +
        '</div>' +

        '<div class="settings-section">' +
          '<h3>Команда и синхронизация</h3>' +
          '<div class="status-line"><span class="sync-dot" style="--dot:' + meta.color + '"></span>' + meta.label +
            (s.teamCode ? ' · код: <b style="color:var(--text)">' + esc(s.teamCode) + '</b>' : '') + '</div>' +
          '<label class="field"><span class="label">Название команды</span>' +
            '<input class="input" type="text" name="teamName" maxlength="50" value="' + esc(state.team ? state.team.name : '') + '" placeholder="Например, Магазин на Ленина"></label>' +
          '<label class="field"><span class="label">Код команды</span>' +
            '<input class="input" type="text" name="teamCode" maxlength="40" value="' + esc(s.teamCode) + '" placeholder="например, magazin-7"></label>' +
          '<p class="tiny muted" style="margin:-6px 0 14px">У всех сотрудников должен быть одинаковый код и одинаковый Firebase.</p>' +
          '<label class="field"><span class="label">Конфигурация Firebase (для синхронизации)</span>' +
            '<textarea class="input" name="firebase" spellcheck="false" placeholder=\'{"apiKey":"...","databaseURL":"https://...firebasedatabase.app", ...}\'>' + esc(fbText) + '</textarea></label>' +
          '<p class="tiny muted" style="margin:-6px 0 14px">Можно вставить весь код, который показывает Firebase, — приложение само найдёт в нём настройки. Главное, чтобы в конфигурации был <code>databaseURL</code>.</p>' +
          '<details class="help"><summary>Как включить синхронизацию (бесплатно)</summary>' +            '<div class="help-body">' +
              '<ol>' +
                '<li>Откройте <code>console.firebase.google.com</code> и создайте проект (тариф Spark — бесплатно).</li>' +
                '<li>В меню проекта: <code>Build → Realtime Database → Create Database</code>. Регион — любой, режим — <code>Start in test mode</code>.</li>' +
                '<li>Нажмите шестерёнку → <code>Project settings → Your apps → Web (</>)</code>, зарегистрируйте приложение и скопируйте объект <code>firebaseConfig</code>.</li>' +
                '<li>Вставьте этот объект в поле выше, придумайте код команды и нажмите «Сохранить».</li>' +
                '<li>В Realtime Database откройте <code>Rules</code>, вставьте правила ниже и нажмите <code>Publish</code>:</li>' +
              '</ol>' +
              '<code>{"rules":{"teams":{"$team":{".read":true,".write":true}}}}</code>' +
              '<p style="margin-top:10px"><b>Важно:</b> тестовый режим Firebase закрывает доступ через 30 дней. Обязательно замените правила на указанные выше и нажмите <code>Publish</code>.</p>' +
              '<p style="margin-top:10px">Код команды — это фактически пароль: кто его знает, тот может смотреть и менять график. Для небольшой команды этого достаточно.</p>' +
              '<p>Чтобы не вводить настройки на каждом устройстве, их можно прописать один раз в файле <code>config.js</code> перед публикацией сайта.</p>' +
            '</div>' +
          '</details>' +
          (s.firebase ? '<button type="button" class="btn danger sm" data-action="disconnect-sync" style="margin-top:12px">Отключить синхронизацию</button>' : '') +
        '</div>' +

        '<div class="settings-section">' +
          '<h3>Данные</h3>' +
          '<div class="export-row">' +
            '<button type="button" class="btn sm" data-action="backup">' + IC.download + ' Скачать копию</button>' +
            '<button type="button" class="btn sm" data-action="import">' + IC.upload + ' Загрузить копию</button>' +
          '</div>' +
          '<input type="file" id="import-file" accept="application/json,.json" hidden>' +
        '</div>' +

      '</div>' +
      '<div class="sheet-foot">' +
        '<button type="button" class="btn ghost" data-action="close-modal">Отмена</button>' +
        '<button type="submit" class="btn primary grow">Сохранить</button>' +
      '</div>' +
    '</form>'
  );
}

function normalizeCode(code) {
  return String(code || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9а-яё_-]/gi, '').slice(0, 40);
}

function sameFirebase(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.apiKey === b.apiKey && a.projectId === b.projectId && a.databaseURL === b.databaseURL;
}

/* Вырезает объект { … } начиная с позиции start, корректно пропуская
   строки, шаблонные литералы и комментарии. Возвращает '' если объект не закрыт. */
function sliceObject(text, start) {
  let depth = 0;
  let quote = '';
  let comment = '';
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (comment === 'line') {
      if (ch === '\n') comment = '';
      continue;
    }
    if (comment === 'block') {
      if (ch === '*' && next === '/') { comment = ''; i++; }
      continue;
    }
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '/' && next === '/') { comment = 'line'; i++; continue; }
    if (ch === '/' && next === '*') { comment = 'block'; i++; continue; }
    if (ch === '{' || ch === '[' || ch === '(') depth++;
    else if (ch === '}' || ch === ']' || ch === ')') {
      depth--;
      if (depth === 0 && ch === '}') return text.slice(start, i + 1);
      if (depth < 0) return '';
    }
  }
  return '';
}

function parseFirebase(text) {
  const src = String(text || '').trim();
  if (!src) return null;

  /* Пользователь часто вставляет весь сниппет из консоли Firebase:
     import { initializeApp } from "..."; const firebaseConfig = {...};
     Поэтому сначала ищем именно объект firebaseConfig, и только потом —
     первый { в тексте (иначе попадёт import { initializeApp }). */
  let body = '';
  const labelled = /(?:firebaseConfig|firebase_config|config)\s*[:=]\s*\{/i.exec(src);
  if (labelled) body = sliceObject(src, labelled.index + labelled[0].length - 1);
  if (!body) {
    const first = src.indexOf('{');
    if (first >= 0) body = sliceObject(src, first);
  }
  if (!body) {
    throw new Error('Не найден объект конфигурации Firebase вида { … }. Скопируйте его в поле целиком.');
  }

  let cfg = null;
  try {
    cfg = JSON.parse(body);
  } catch (e) {
    /* JSON может не подойти из-за комментариев, одинарных кавычек
       или запятой в конце — пробуем как JS-объект. */
  }
  if (!cfg) {
    try {
      cfg = new Function('"use strict"; return (' + body + ');')();
    } catch (e) {
      throw new Error('Не удалось разобрать конфигурацию Firebase. Вставьте только объект { … } без лишнего кода.');
    }
  }
  if (cfg && typeof cfg === 'object' && cfg.firebaseConfig) cfg = cfg.firebaseConfig;

  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
    throw new Error('Конфигурация Firebase пустая или имеет неверный формат.');
  }
  if (!cfg.apiKey || !cfg.projectId) {
    throw new Error('В конфигурации нет apiKey или projectId. Скопируйте объект firebaseConfig из Firebase целиком.');
  }
  if (!cfg.databaseURL) {
    throw new Error('В конфигурации нет databaseURL. Включите Realtime Database (Build → Realtime Database) и скопируйте конфигурацию заново.');
  }

  const clean = {};
  Object.keys(cfg).forEach((key) => {
    const v = cfg[key];
    if (v == null || typeof v === 'object' || typeof v === 'function') return;
    clean[key] = String(v).trim();
  });
  return clean;
}

function saveSettingsFromForm(form) {
  const fd = new FormData(form);
  const name = String(fd.get('name') || '').trim().slice(0, 30);
  const teamName = String(fd.get('teamName') || '').trim().slice(0, 50);
  const teamCode = normalizeCode(fd.get('teamCode'));
  const theme = String(fd.get('theme') || 'auto');
  let firebase = null;
  const fbRaw = String(fd.get('firebase') || '').trim();

  if (fbRaw) {
    try {
      firebase = parseFirebase(fbRaw);
    } catch (e) {
      return showFormError(form, e.message);
    }
    if (!teamCode) return showFormError(form, 'Придумайте код команды — он нужен для синхронизации.');
  }

  if (!firebase && fbRaw) return showFormError(form, 'Проверьте конфигурацию Firebase.');

  const prev = state.settings;
  const syncChanged = (prev.teamCode || '') !== teamCode || !sameFirebase(prev.firebase, firebase);

  if (!firebase && prev.teamCode !== teamCode) {
    const oldTeam = LS.get('smena.team.' + (prev.teamCode || 'local'), null);
    if (oldTeam) LS.set('smena.team.' + (teamCode || 'local'), oldTeam);
  }

  if (firebase && teamCode && !prev.firebase) {
    const newKey = 'smena.team.' + teamCode;
    if (!LS.get(newKey, null)) {
      const localTeam = LS.get('smena.team.local', null);
      if (localTeam) LS.set(newKey, localTeam);
    }
  }

  const syncDisabled = firebase ? false : (prev.firebase ? true : !!prev.syncDisabled);
  state.settings = Object.assign({}, prev, { name, teamCode, firebase, theme, syncDisabled });
  saveSettings();
  applyTheme();

  if (state.team && teamName && teamName !== state.team.name) {
    state.team.name = teamName;
    persist();
    remoteSet('name', teamName);
  }

  closeSheet();
  render();

  if (syncChanged) {
    location.reload();
  } else {
    toast('Настройки сохранены');
  }
}

/* ---------- welcome / create team ---------- */

function openWelcome() {
  openSheet(
    '<div class="sheet-body welcome">' +
      '<div class="welcome-logo">' + IC.calendar + '</div>' +
      '<h2>Добро пожаловать в «Смену»</h2>' +
      '<p class="muted">Совместный график работы. Стандартная смена 10:00–21:00 или разделённая на двоих.</p>' +
      '<form data-form="welcome">' +
        '<label class="field"><span class="label">Как вас зовут?</span>' +
          '<input class="input" type="text" name="name" maxlength="30" placeholder="Например, Анна" autocomplete="given-name" required></label>' +
        '<button type="submit" class="btn primary block">Начать</button>' +
      '</form>' +
      '<p class="tiny muted">Данные сохраняются на устройстве. Синхронизацию с командой можно включить в настройках.</p>' +
    '</div>'
  );
  const input = $('#modal-root input[name="name"]');
  if (input) setTimeout(() => input.focus(), 250);
}

function openCreateTeam() {
  if (!state.settings.name) { openWelcome(); return; }
  const hasLocal = state.team && (Object.keys(state.team.employees || {}).length || Object.keys(state.team.shifts || {}).length);
  openSheet(
    '<div class="sheet-head"><div class="grow"><div class="sheet-title">Команда не найдена</div>' +
      '<div class="tiny muted">Код: ' + esc(state.settings.teamCode) + '</div></div>' +
      '<button class="icon-btn" data-action="close-modal" aria-label="Закрыть">' + IC.close + '</button></div>' +
    '<div class="sheet-body">' +
      '<p class="muted" style="margin-bottom:16px">В облаке пока нет команды с таким кодом. Создать её? ' +
        (hasLocal ? 'Данные с этого устройства будут загружены в облако.' : '') + '</p>' +
      '<button class="btn primary block" data-action="create-team" style="margin-bottom:8px">Создать команду ' + esc(state.settings.teamCode) + '</button>' +
      '<button class="btn block" data-action="open-settings">Изменить код / настройки</button>' +
    '</div>'
  );
}

async function createTeam() {
  if (!fb) return;
  const local = state.team;
  const hasData = local && (Object.keys(local.employees || {}).length || Object.keys(local.shifts || {}).length);
  const team = hasData ? local : {
    name: 'Моя команда',
    employees: {},
    shifts: {},
    log: {},
    createdAt: Date.now(),
  };
  try {
    await fb.ref.set(team);
    state.team = team;
    persist();
    closeSheet();
    render();
    toast('Команда создана');
  } catch (e) {
    console.error(e);
    toast('Не удалось создать команду: ' + (e && e.message ? e.message : 'ошибка'));
  }
}

/* ---------- export / import ---------- */

function download(filename, content, type) {
  const blob = new Blob([content], { type: type || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

function exportCSV() {
  const list = monthShifts().sort((a, b) => a.date.localeCompare(b.date) || t2m(a.start) - t2m(b.start));
  if (!list.length) { toast('В этом месяце нет смен'); return; }
  const rows = [['Дата', 'День', 'Сотрудник', 'Начало', 'Конец', 'Часы', 'Примечание']];
  list.forEach((s) => {
    const emp = empById(s.empId);
    rows.push([
      fmtDayShort(s.date),
      WEEK_SHORT[weekdayIndex(s.date)],
      emp ? emp.name : 'Удалён',
      s.start,
      s.end,
      String(Math.round((durMin(s) / 60) * 10) / 10).replace('.', ','),
      s.note || '',
    ]);
  });
  const csv = rows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  download('smena-' + monthPrefix() + '.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
}

function backup() {
  if (!state.team) return;
  download('smena-backup-' + ymd(new Date()) + '.json', JSON.stringify(state.team, null, 2), 'application/json');
  toast('Копия скачана');
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = normalizeTeam(JSON.parse(String(reader.result)));
      if (!data) throw new Error('Некорректный файл');
      const ok = await confirmDialog('Заменить данные?',
        'Текущий график будет заменён данными из файла. Это действие необратимо.', 'Заменить', false);
      if (!ok) return;
      state.team = data;
      persist();
      if (fb) {
        await fb.ref.set(data);
      }
      render();
      closeSheet();
      toast('Данные восстановлены');
    } catch (e) {
      toast('Не удалось прочитать файл');
    }
  };
  reader.readAsText(file);
}

/* ---------- log ---------- */

function logEntry(action, details) {
  if (!state.team) return;
  const entry = {
    at: Date.now(),
    by: state.settings.name || 'Гость',
    action,
    details: details || '',
  };
  const id = uid();
  state.team.log = state.team.log || {};
  state.team.log[id] = entry;
  persist();
  remoteSet('log/' + id, entry);
}

/* ---------- events ---------- */

async function handleAction(action, el, ev) {
  switch (action) {
    case 'tab':
      state.tab = el.dataset.tab;
      render();
      break;
    case 'prev-month':
      state.monthDate = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() - 1, 1);
      render();
      break;
    case 'next-month':
      state.monthDate = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() + 1, 1);
      render();
      break;
    case 'today':
      state.monthDate = new Date();
      render();
      break;
    case 'day':
      openDay(el.dataset.date);
      break;
    case 'new-shift':
      openShiftForm(null, el.dataset.date);
      break;
    case 'edit-shift':
      openShiftForm(el.dataset.id);
      break;
    case 'back-day':
      openDay(el.dataset.date);
      break;
    case 'delete-shift':
      await deleteShift(el.dataset.id);
      break;
    case 'preset': {
      const form = el.closest('form');
      if (!form) break;
      form.elements.start.value = el.dataset.start;
      form.elements.end.value = el.dataset.end;
      syncPresetUI(form);
      break;
    }
    case 'new-employee':
      openEmployeeForm();
      break;
    case 'edit-employee':
      openEmployeeForm(el.dataset.id);
      break;
    case 'delete-employee':
      await deleteEmployee(el.dataset.id);
      break;
    case 'pick-color': {
      const form = el.closest('form');
      if (!form) break;
      form.elements.color.value = el.dataset.color;
      form.querySelectorAll('.swatch-btn').forEach((b) => b.classList.toggle('on', b.dataset.color === el.dataset.color));
      break;
    }
    case 'open-settings':
      openSettings();
      break;
    case 'close-modal':
      closeSheet();
      break;
    case 'toggle-empty':
      state.showEmpty = !state.showEmpty;
      render();
      break;
    case 'copy-code':
      try {
        await navigator.clipboard.writeText(state.settings.teamCode);
        toast('Код скопирован');
      } catch (e) {
        toast('Код: ' + state.settings.teamCode);
      }
      break;
    case 'create-team':
      await createTeam();
      break;
    case 'retry-sync':
      location.reload();
      break;
    case 'disconnect-sync': {
      const ok = await confirmDialog('Отключить синхронизацию?',
        'Приложение перестанет отправлять изменения в облако. Данные останутся на этом устройстве.', 'Отключить');
      if (!ok) break;
      state.settings.firebase = null;
      state.settings.syncDisabled = true;
      saveSettings();
      location.reload();
      break;
    }
    case 'export-csv':
      exportCSV();
      break;
    case 'backup':
      backup();
      break;
    case 'import':
      $('#import-file') ? $('#import-file').click() : toast('Откройте настройки и повторите');
      break;
    case 'print':
      window.print();
      break;
    default:
      break;
  }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  e.preventDefault();
  handleAction(el.dataset.action, el, e).catch((err) => {
    console.error(err);
    toast('Что-то пошло не так');
  });
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  if (el.dataset.change === 'filter-emp') {
    state.filterEmp = el.value;
    render();
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const kind = form.dataset.form;
  try {
    if (kind === 'shift') saveShiftFromForm(form);
    else if (kind === 'employee') saveEmployeeFromForm(form);
    else if (kind === 'settings') saveSettingsFromForm(form);
    else if (kind === 'welcome') {
      const fd = new FormData(form);
      const name = String(fd.get('name') || '').trim();
      if (!name) return showFormError(form, 'Введите имя.');
      state.settings.name = name;
      saveSettings();
      closeSheet();
      render();
      toast('Здравствуйте, ' + name + '!');
      if (state.pendingCreate) {
        state.pendingCreate = false;
        setTimeout(openCreateTeam, 250);
      }
    }
  } catch (err) {
    console.error(err);
    toast(err && err.message ? err.message : 'Ошибка');
  }
});

document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'import-file') {
    importBackup(e.target.files && e.target.files[0]);
    e.target.value = '';
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const dialog = $('#dialog-root');
  if (dialog && dialog.innerHTML.trim()) {
    const no = dialog.querySelector('[data-dialog="no"]');
    if (no) no.click();
    return;
  }
  closeSheet();
});

/* ---------- boot ---------- */

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      if (navigator.serviceWorker.controller) reg.update().catch(() => {});
    }).catch((e) => console.warn('SW:', e));
  });
}

function boot() {
  loadSettings();
  applyTheme();

  const cached = LS.get(teamKey(), null);
  if (cached) state.team = normalizeTeam(cached);

  const remoteMode = !!(state.settings.firebase && state.settings.teamCode);
  if (!state.team && !remoteMode) {
    state.team = seedTeam();
    persist();
  }

  render();

  if (!state.settings.name) {
    openWelcome();
  }

  if (remoteMode) {
    connectFirebase();
  } else {
    setSync('local');
  }

  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if (state.settings.theme === 'auto') applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
  }

  registerSW();
}

boot();
