'use strict';

/* =========================================================
   «MrCHAO» — смены и финансовый учёт
   Чистый JS без сборки. Работает локально и с Firebase.
   ========================================================= */

const SDK_BASE = 'https://www.gstatic.com/firebasejs/10.12.2/';
const SDK_APP = SDK_BASE + 'firebase-app-compat.js';
const SDK_AUTH = SDK_BASE + 'firebase-auth-compat.js';
const SDK_DB = SDK_BASE + 'firebase-database-compat.js';
const CFG = window.SMENA_CONFIG || {};

/* Администраторы MrCHAO. Email сравнивается без учёта регистра. */
const ADMIN_EMAILS = ['artem_rusan@mail.ru'];
const ROLE_LABEL = { employee: 'Сотрудник', manager: 'Менеджер', admin: 'Администратор' };

const K_SETTINGS = 'smena.settings.v1';

const COLORS = [
  '#e2a45c', '#cf5b3a', '#8a9a5b', '#d9b98a', '#b3452f', '#c98f4a',
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

/* Финансовый учёт: колонки таблицы.
   group 'head' — верхний блок (точка / сотрудник / дата),
   group 'body' — остальные поля, отделены визуальным «пропуском». */
const FIN_HEAD = 'head';
const FIN_BODY = 'body';
const FIN_DEFAULT_COLUMNS = [
  { id: 'point', title: 'Точка', type: 'text', group: FIN_HEAD },
  { id: 'emp', title: 'ФИО сотрудника', type: 'auto', auto: 'emp', group: FIN_HEAD },
  { id: 'date', title: 'Дата', type: 'auto', auto: 'date', group: FIN_HEAD },
  { id: 'start', title: 'Начало смены', type: 'auto', auto: 'start', group: FIN_BODY },
  { id: 'lunch', title: 'Обед', type: 'money', group: FIN_BODY },
  { id: 'revenue', title: 'Выручка', type: 'money', group: FIN_BODY },
  { id: 'cash', title: 'Наличный расчёт', type: 'money', group: FIN_BODY },
  { id: 'noncash', title: 'Безналичный расчёт', type: 'money', calc: 'revenue-cash', group: FIN_BODY },
  { id: 'collection', title: 'Инкассация', type: 'money', group: FIN_BODY },
  { id: 'remainder', title: 'Остаток в кассе', type: 'money', calc: 'cash-collection', group: FIN_BODY },
  { id: 'change', title: 'Размен', type: 'money', group: FIN_BODY },
];
const FIN_TYPE_LABEL = { text: 'Текст', money: 'Сумма', time: 'Время', auto: 'Из смены' };

const IC = {
  edit: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  download: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
  upload: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>',
  layers: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
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
  authUser: null,
  profile: null,
  authReady: false,
  authMode: 'login',
  authError: '',
  profileError: '',
  joinTeam: null,
  teams: [],
};

let fb = null;
let auth = null;
let teamRef = null;
let connectedBound = false;
let pendingRegName = '';
let toastTimer = 0;
let connectTimer = 0;
let everConnected = false;

/* Несохранённые правки таблицы учёта: shiftId -> { colId: value }.
   Нужны, чтобы ответ сервера не затирал то, что человек печатает прямо сейчас. */
const finDrafts = new Map();
const finWriteTimers = {};
let pendingRender = false;

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

function fmtDateTime(ts) {
  if (!ts) return '';
  const d = new Date(Number(ts));
  if (isNaN(d.getTime())) return '';
  return d.getDate() + ' ' + MONTH_GEN[d.getMonth()] + ', ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
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
    members: {},
    finance: normalizeFinance(raw.finance),
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
      const shift = {
        id: s.id || id,
        date: s.date,
        empId: String(s.empId),
        start: m2t(t2m(s.start)),
        end: m2t(t2m(s.end)),
        note: s.note ? String(s.note).slice(0, 120) : '',
        by: s.by ? String(s.by).slice(0, 40) : '',
        at: Number(s.at) || 0,
      };
      const fin = normalizeFinBlock(raw.fin && raw.fin[id]) || normalizeFinBlock(s.fin);
      if (fin) shift.fin = fin;
      team.shifts[id] = shift;
    });
  }
  if (raw.members && typeof raw.members === 'object') {
    Object.keys(raw.members).slice(0, 300).forEach((memberId) => {
      const m = raw.members[memberId];
      if (!m || typeof m !== 'object') return;
      team.members[memberId] = {
        name: String(m.name || '').slice(0, 60),
        role: m.role === 'admin' ? 'admin' : (m.role === 'manager' ? 'manager' : 'employee'),
        empId: m.empId ? String(m.empId).slice(0, 40) : '',
        at: Number(m.at) || 0,
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

function normalizeFinBlock(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const values = {};
  if (raw.values && typeof raw.values === 'object') {
    Object.keys(raw.values).slice(0, 80).forEach((key) => {
      const v = raw.values[key];
      if (v == null || typeof v === 'object') return;
      const str = String(v).trim().slice(0, 200);
      if (str) values[key] = str;
    });
  }
  const meta = {};
  if (raw.meta && typeof raw.meta === 'object') {
    Object.keys(raw.meta).slice(0, 80).forEach((key) => {
      const m = raw.meta[key];
      if (!m || typeof m !== 'object') return;
      meta[key] = {
        by: String(m.by || '').slice(0, 60),
        at: Number(m.at) || 0,
        role: m.role === 'manager' ? 'manager' : '',
      };
    });
  }
  if (!Object.keys(values).length && !Object.keys(meta).length) return null;
  const out = { values };
  if (Object.keys(meta).length) out.meta = meta;
  return out;
}

function normalizeFinance(raw) {
  const defs = finDefaultColumns();
  const defById = {};
  defs.forEach((d) => { defById[d.id] = d; });

  const out = [];
  const seen = {};
  const source = raw && Array.isArray(raw.columns) && raw.columns.length ? raw.columns : defs;
  source.forEach((c) => {
    if (!c || typeof c !== 'object') return;
    const id = String(c.id || '').trim().slice(0, 40);
    if (!id || seen[id]) return;
    seen[id] = true;
    const def = defById[id];
    if (def) {
      out.push({
        id,
        title: String(c.title || def.title).slice(0, 60),
        type: def.type,
        auto: def.auto || null,
        calc: def.calc || null,
        group: def.group,
        hidden: !!c.hidden,
        core: true,
      });
      return;
    }
    const type = ['text', 'money', 'time'].indexOf(c.type) >= 0 ? c.type : 'text';
    out.push({
      id,
      title: String(c.title || 'Колонка').slice(0, 60),
      type,
      auto: null,
      calc: null,
      group: FIN_BODY,
      hidden: !!c.hidden,
      core: false,
    });
  });

  /* Колонки «из смены» — опора таблицы: если их нет в сохранённых данных, возвращаем. */
  ['point', 'emp', 'date', 'start'].forEach((id) => {
    if (seen[id]) return;
    const def = defById[id];
    if (!def) return;
    out.push({
      id: def.id,
      title: def.title,
      type: def.type,
      auto: def.auto || null,
      calc: def.calc || null,
      group: def.group,
      hidden: false,
      core: true,
    });
  });

  return {
    title: String((raw && raw.title) || 'Финансовый учёт').slice(0, 60),
    columns: out,
  };
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
    finance: normalizeFinance(null),
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

/* ---------- finance (таблица учёта) ---------- */

function finHas(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function finDefaultColumns() {
  return FIN_DEFAULT_COLUMNS.map((c) => Object.assign({ core: true, hidden: false }, c));
}

function finColumnById(id) {
  const cols = (state.team && state.team.finance && state.team.finance.columns) || [];
  return cols.find((c) => c.id === id) || null;
}

function finVisibleColumns() {
  const cols = (state.team && state.team.finance && state.team.finance.columns) || [];
  return cols.filter((c) => !c.hidden);
}

function finValues(shift) {
  return (shift && shift.fin && shift.fin.values) || {};
}

function parseMoney(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(/\u00a0/g, '').replace(/\s+/g, '').replace(',', '.');
  if (!s) return null;
  const cleaned = s.replace(/[^\d.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.' || cleaned === '.-') return null;
  const n = Number(cleaned);
  return isFinite(n) ? n : null;
}

function fmtMoney(v) {
  const n = typeof v === 'number' ? v : parseMoney(v);
  if (n == null || isNaN(n)) return '';
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

function finCalcFromValues(vals, col) {
  const v = vals || {};
  if (!col || !col.calc) return '';
  if (col.calc === 'revenue-cash') {
    const rev = parseMoney(v.revenue);
    const cash = parseMoney(v.cash);
    if (rev == null && cash == null) return '';
    return String((rev || 0) - (cash || 0));
  }
  if (col.calc === 'cash-collection') {
    const cash = parseMoney(v.cash);
    const coll = parseMoney(v.collection);
    if (cash == null && coll == null) return '';
    return String((cash || 0) - (coll || 0));
  }
  return '';
}

function finAutoValue(shift, col) {
  if (!shift || !col || !col.auto) return '';
  if (col.auto === 'emp') {
    const emp = empById(shift.empId);
    return emp ? emp.name : 'Удалён';
  }
  if (col.auto === 'date') return fmtDayShort(shift.date);
  if (col.auto === 'start') return shift.start + '–' + shift.end;
  return '';
}

function finValue(shift, col) {
  if (!shift || !col) return '';
  if (col.auto) return finAutoValue(shift, col);
  const vals = finValues(shift);
  if (finHas(vals, col.id) && String(vals[col.id]).trim() !== '') return String(vals[col.id]);
  if (col.calc) return finCalcFromValues(vals, col);
  return '';
}

function setFinValue(shift, colId, raw) {
  const val = String(raw == null ? '' : raw).trim();
  if (!shift.fin || typeof shift.fin !== 'object') shift.fin = { values: {} };
  if (!shift.fin.values || typeof shift.fin.values !== 'object') shift.fin.values = {};
  if (val) shift.fin.values[colId] = val.slice(0, 200);
  else delete shift.fin.values[colId];
  if (!Object.keys(shift.fin.values).length) delete shift.fin;
}

function setFinDraft(shiftId, colId, value) {
  let draft = finDrafts.get(shiftId);
  if (!draft) { draft = {}; finDrafts.set(shiftId, draft); }
  draft[colId] = String(value == null ? '' : value).trim();
}

function applyFinDrafts(team) {
  if (!team || !team.shifts || !finDrafts.size) return team;
  finDrafts.forEach((draft, id) => {
    const shift = team.shifts[id];
    if (!shift) return;
    const values = Object.assign({}, finValues(shift));
    Object.keys(draft).forEach((colId) => {
      if (draft[colId]) values[colId] = draft[colId];
      else delete values[colId];
    });
    if (Object.keys(values).length) shift.fin = { values };
    else delete shift.fin;
  });
  return team;
}

function queueFinWrite(shiftId) {
  persist();
  if (!fb) return;
  clearTimeout(finWriteTimers[shiftId]);
  finWriteTimers[shiftId] = setTimeout(() => {
    const shift = state.team && state.team.shifts ? state.team.shifts[shiftId] : null;
    if (shift) remoteSet('fin/' + shiftId, shift.fin || null);
  }, 600);
}

function finPointList() {
  const set = new Set();
  const shifts = (state.team && state.team.shifts) || {};
  Object.keys(shifts).forEach((id) => {
    const v = shifts[id] && shifts[id].fin && shifts[id].fin.values && shifts[id].fin.values.point;
    if (v) set.add(String(v).slice(0, 60));
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
}

function isFinEditing() {
  const el = document.activeElement;
  return !!(el && el.closest && el.closest('[data-fin-scope]'));
}

/* Пересчитывает автоматические поля («авто: …») в строке таблицы или в форме смены. */
function refreshFinAutoFields(scope) {
  const inputs = scope.querySelectorAll('[data-fin-field]');
  const vals = {};
  inputs.forEach((i) => {
    const v = String(i.value || '').trim();
    if (v) vals[i.dataset.finField] = v;
  });
  inputs.forEach((i) => {
    const col = finColumnById(i.dataset.finField);
    if (!col || !col.calc) return;
    if (String(i.value || '').trim()) {
      i.classList.remove('is-auto');
      i.placeholder = '';
      return;
    }
    const auto = finCalcFromValues(vals, col);
    i.classList.add('is-auto');
    i.placeholder = auto === '' ? '' : 'авто: ' + fmtMoney(auto);
  });
}

function refreshFinTotals(scope) {
  const cols = finVisibleColumns();
  const sums = {};
  scope.querySelectorAll('[data-fin-row]').forEach((row) => {
    const vals = {};
    row.querySelectorAll('[data-fin-field]').forEach((i) => {
      const v = String(i.value || '').trim();
      if (v) vals[i.dataset.finField] = v;
    });
    cols.forEach((col) => {
      if (!(col.type === 'money' || col.calc)) return;
      let v = vals[col.id];
      if (v == null && col.calc) v = finCalcFromValues(vals, col);
      const n = parseMoney(v);
      if (n != null) sums[col.id] = (sums[col.id] || 0) + n;
    });
  });
  cols.forEach((col) => {
    const cell = scope.querySelector('[data-fin-total="' + col.id + '"]');
    if (!cell) return;
    cell.textContent = sums[col.id] == null ? '—' : fmtMoney(sums[col.id]);
  });
}

/* ---------- auth / roles ---------- */

const emailLower = (v) => String(v || '').trim().toLowerCase();

function myEmail() { return state.authUser ? emailLower(state.authUser.email) : ''; }
function isAdminEmail() { return ADMIN_EMAILS.indexOf(myEmail()) >= 0; }
function myRole() {
  if (isAdminEmail()) return 'admin';
  if (state.profile && state.profile.role === 'admin') return 'admin';
  const code = state.settings.teamCode;
  const m = code && myMemberships()[code];
  if (m && m.role === 'manager') return 'manager';
  if (!code && state.profile && state.profile.role === 'manager') return 'manager';
  return 'employee';
}
function isAdmin() { return myRole() === 'admin'; }
function isManager() { return myRole() === 'manager'; }
function isStaff() { return isAdmin() || isManager(); }
function myName() { return (state.profile && state.profile.name) || state.settings.name || 'Сотрудник'; }
function myMemberships() { return (state.profile && state.profile.memberships) || {}; }
function myTeams() {
  if (isAdmin()) {
    const list = state.teams.slice();
    if (state.settings.teamCode && list.indexOf(state.settings.teamCode) < 0) list.unshift(state.settings.teamCode);
    return list;
  }
  return Object.keys(myMemberships());
}
function myEmpId(code) {
  const m = myMemberships()[code];
  return m && m.empId ? String(m.empId) : '';
}

function shiftTs(shift) {
  const d = fromYmd(shift.date);
  const [sh, sm] = String(shift.start).split(':').map(Number);
  const [eh, em] = String(shift.end).split(':').map(Number);
  const start = d.getTime() + (sh || 0) * 3600000 + (sm || 0) * 60000;
  let end = d.getTime() + (eh || 0) * 3600000 + (em || 0) * 60000;
  if (end <= start) end += 86400000;
  return { start, end };
}

/* Смена: доступна за 15 минут до начала и в течение суток после окончания. */
function isCurrentShift(shift) {
  if (!shift || !validYmd(shift.date)) return false;
  const t = shiftTs(shift);
  const now = Date.now();
  return now >= t.start - 15 * 60000 && now <= t.end + 24 * 3600000;
}

/* В базу графика пишем только расписание — финансы лежат отдельно,
   чтобы правила Firebase могли ограничить их по роли. */
function scheduleOnly(shift) {
  const t = shiftTs(shift);
  return {
    id: shift.id,
    date: shift.date,
    empId: shift.empId,
    start: shift.start,
    end: shift.end,
    note: shift.note || '',
    by: shift.by || '',
    at: shift.at || 0,
    tsStart: t.start,
    tsEnd: t.end,
  };
}

/* Сотрудник может вносить финансы за 15 минут до начала смены
   и в течение суток после окончания, менеджер и админ — за любой день. */
function canEditFinance(shift) {
  if (!shift) return false;
  if (isStaff()) return true;
  return isCurrentShift(shift);
}

function normalizeProfile(raw, user) {
  const email = emailLower(user && user.email);
  const src = raw && raw.memberships && typeof raw.memberships === 'object' ? raw.memberships : {};
  const memberships = {};
  Object.keys(src).slice(0, 40).forEach((code) => {
    const m = src[code];
    if (!m || typeof m !== 'object') return;
    const clean = String(code).trim().slice(0, 40);
    if (!clean) return;
    memberships[clean] = {
      empId: m.empId ? String(m.empId).slice(0, 40) : '',
      role: m.role === 'manager' ? 'manager' : 'employee',
    };
  });
  let role = raw && raw.role === 'manager' ? 'manager' : (raw && raw.role === 'admin' ? 'admin' : 'employee');
  if (ADMIN_EMAILS.indexOf(email) >= 0) role = 'admin';
  return {
    name: String((raw && raw.name) || (user && user.displayName) || email.split('@')[0] || 'Сотрудник').slice(0, 60),
    email,
    role,
    memberships,
  };
}

function profilePayload() {
  if (!state.profile) return null;
  return {
    name: state.profile.name,
    email: state.profile.email,
    role: state.profile.role,
    memberships: state.profile.memberships || {},
    updatedAt: Date.now(),
  };
}

async function saveProfile() {
  if (!state.profile || !state.authUser) return;
  state.settings.name = state.profile.name;
  saveSettings();
  try { LS.set('smena.profile.' + state.authUser.uid, state.profile); } catch (e) { /* ignore */ }
  try {
    await firebase.database().ref('users/' + state.authUser.uid).set(profilePayload());
  } catch (e) {
    console.warn(e);
  }
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

async function loadFirebaseSdk() {
  await loadScript(SDK_APP);
  await loadScript(SDK_AUTH);
  await loadScript(SDK_DB);
  if (!window.firebase) throw new Error('Firebase не загрузился');
  const cfg = state.settings.firebase;
  if (!cfg) return;
  if (!cfg.databaseURL && cfg.projectId) {
    cfg.databaseURL = 'https://' + cfg.projectId + '-default-rtdb.firebaseio.com';
  }
  if (!cfg.databaseURL) throw new Error('В конфигурации нет databaseURL');
  if (!firebase.apps.length) firebase.initializeApp(cfg);
}

async function initCloud() {
  if (!state.settings.firebase) {
    state.authReady = true;
    setSync('local');
    return;
  }
  setSync('connecting');
  try {
    await loadFirebaseSdk();
    auth = firebase.auth();
    auth.onAuthStateChanged((user) => { onAuthChanged(user); });
  } catch (e) {
    console.error(e);
    state.authReady = true;
    setSync('error');
    toast(e && e.message ? e.message : 'Ошибка подключения');
    render();
  }
}

async function onAuthChanged(user) {
  state.authUser = user || null;
  state.profileError = '';
  if (!user) {
    state.profile = null;
    state.team = null;
    state.teams = [];
    state.authReady = true;
    if (teamRef) { teamRef.off(); teamRef = null; }
    fb = null;
    setSync('local');
    render();
    return;
  }
  const cacheKey = 'smena.profile.' + user.uid;
  let cached = null;
  try { cached = LS.get(cacheKey, null); } catch (e) { cached = null; }
  try {
    const snap = await firebase.database().ref('users/' + user.uid).once('value');
    const exists = snap.exists();
    state.profile = normalizeProfile(snap.val(), user);
    if (!exists) {
      if (pendingRegName) state.profile.name = pendingRegName;
      await firebase.database().ref('users/' + user.uid).set(profilePayload());
    }
    await finishAuthFlow(cacheKey, false);
  } catch (e) {
    console.error(e);
    if (cached) {
      /* Нет сети или база недоступна — работаем на сохранённых данных. */
      state.profile = normalizeProfile(cached, user);
      await finishAuthFlow(cacheKey, true);
      toast('Нет сети — показаны сохранённые данные');
      return;
    }
    state.authReady = true;
    setSync('error');
    const denied = e && e.code === 'PERMISSION_DENIED';
    state.profileError = denied
      ? 'Нет доступа к профилю. В Firebase Realtime Database опубликуйте правила из файла database.rules.json — после этого войдите снова.'
      : 'Не удалось загрузить профиль: ' + (e && e.message ? e.message : 'ошибка сети');
    toast(denied ? 'Нужно опубликовать правила Firebase' : state.profileError);
    render();
  }
}

async function finishAuthFlow(cacheKey, offline) {
  pendingRegName = '';
  state.settings.name = state.profile.name;
  saveSettings();
  state.authReady = true;
  if (cacheKey) LS.set(cacheKey, state.profile);
  if (offline) state.teams = Object.keys(myMemberships());
  else await loadTeamList();
  const codes = myTeams();
  let code = state.settings.teamCode;
  if (!isAdmin()) {
    code = codes.indexOf(code) >= 0 ? code : (codes[0] || '');
  } else if (codes.length && codes.indexOf(code) < 0) {
    code = codes[0];
  }
  state.settings.teamCode = code || '';
  saveSettings();
  render();
  if (code) connectTeam(code);
  else setSync('online');
}

async function loadTeamList() {
  state.teams = [];
  if (!state.authUser) return;
  if (isAdmin()) {
    try {
      const snap = await firebase.database().ref('teams').once('value');
      state.teams = Object.keys(snap.val() || {}).sort();
    } catch (e) {
      console.warn(e);
    }
  } else {
    state.teams = Object.keys(myMemberships());
  }
}

function connectTeam(code) {
  if (!state.settings.firebase || !code || !state.authUser) {
    setSync('local');
    return;
  }
  setSync('connecting');
  const db = firebase.database();
  if (teamRef) teamRef.off();
  const ref = db.ref('teams/' + code);
  teamRef = ref;
  fb = { db, ref, code };

  if (!connectedBound) {
    connectedBound = true;
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
  }

  armConnectTimeout();
  ref.on('value', (snap) => {
    clearTimeout(connectTimer);
    const raw = snap.val();
    if (raw) {
      state.team = applyFinDrafts(normalizeTeam(raw));
      if (isAdmin() && state.authUser && !state.team.members[state.authUser.uid]) {
        const member = { name: myName(), role: 'admin', empId: '', at: Date.now() };
        state.team.members[state.authUser.uid] = member;
        remoteSet('members/' + state.authUser.uid, member);
      }
      /* Финансы из старых версий лежали внутри смены — переносим в отдельную ветку. */
      if (isAdmin()) {
        const rawFin = raw.fin && typeof raw.fin === 'object' ? raw.fin : {};
        Object.keys(state.team.shifts).forEach((sid) => {
          const sh = state.team.shifts[sid];
          if (sh.fin && !rawFin[sid]) remoteSet('fin/' + sid, sh.fin);
        });
      }
      persist();
      render();
      setSync(state.connected ? 'online' : 'offline');
    } else {
      state.team = null;
      setSync(state.connected ? 'online' : 'offline');
      render();
      if (isAdmin()) {
        if (!state.promptedCreate) {
          state.promptedCreate = true;
          openCreateTeam();
        }
      } else {
        toast('Команда ' + code + ' не найдена');
      }
    }
  }, (err) => {
    clearTimeout(connectTimer);
    console.warn(err);
    setSync('error');
    state.team = null;
    render();
    toast('Нет доступа к команде: ' + code);
  });
}

async function doLogin(email, pass) {
  await auth.signInWithEmailAndPassword(email, pass);
}

async function doRegister(name, email, pass) {
  pendingRegName = name;
  const cred = await auth.createUserWithEmailAndPassword(email, pass);
  try { await cred.user.updateProfile({ displayName: name }); } catch (e) { /* не критично */ }
}

async function doReset(email) {
  await auth.sendPasswordResetEmail(email);
}

async function doLogout() {
  if (auth) await auth.signOut();
}

async function switchTeam(code) {
  if (!code) return;
  if (code === state.settings.teamCode) return;
  state.settings.teamCode = code;
  saveSettings();
  finDrafts.clear();
  state.team = normalizeTeam(LS.get(teamKey(), null));
  state.promptedCreate = false;
  state.tab = 'month';
  render();
  connectTeam(code);
}

async function lookupTeam(code) {
  if (!state.settings.firebase) return;
  if (!firebase.apps.length) await loadFirebaseSdk();
  const clean = normalizeCode(code);
  if (!clean) { toast('Введите код команды'); return; }
  try {
    const snap = await firebase.database().ref('teams/' + clean + '/employees').once('value');
    if (!snap.exists()) {
      if (isAdmin()) {
        const ok = await confirmDialog('Команда не найдена', 'Создать новую команду с кодом «' + clean + '»?', 'Создать');
        if (ok) { closeSheet(); state.settings.teamCode = clean; await createTeam(clean); }
      } else {
        toast('Команда с кодом ' + clean + ' не найдена');
      }
      return;
    }
    if (isAdmin()) {
      state.joinTeam = null;
      closeSheet();
      if (clean === state.settings.teamCode) render();
      else await switchTeam(clean);
      return;
    }
    state.joinTeam = { code: clean, employees: snap.val() || {} };
    render();
  } catch (e) {
    toast('Не удалось найти команду: ' + (e && e.message ? e.message : ''));
  }
}

function authErrorText(code) {
  const map = {
    'auth/invalid-email': 'Некорректный email.',
    'auth/user-not-found': 'Аккаунт с таким email не найден.',
    'auth/wrong-password': 'Неверный пароль.',
    'auth/invalid-credential': 'Неверный email или пароль.',
    'auth/invalid-login-credentials': 'Неверный email или пароль.',
    'auth/email-already-in-use': 'Этот email уже зарегистрирован — войдите.',
    'auth/weak-password': 'Пароль слишком простой: нужно не меньше 6 символов.',
    'auth/too-many-requests': 'Слишком много попыток. Подождите пару минут.',
    'auth/network-request-failed': 'Нет связи с сервером. Проверьте интернет.',
    'auth/operation-not-allowed': 'Вход по email выключен в Firebase. Включите Email/Password в консоли.',
  };
  return map[code] || 'Не удалось выполнить действие. Проверьте данные и попробуйте ещё раз.';
}

function openJoinSheet() {
  if (!state.authUser) return;
  openSheet(
    '<div class="sheet-head"><div class="grow"><div class="sheet-title">Подключить команду</div>' +
      '<div class="tiny muted">Код выдаёт администратор MrCHAO</div></div>' +
      '<button class="icon-btn" data-action="close-modal" aria-label="Закрыть">' + IC.close + '</button></div>' +
    '<form class="sheet-form" data-form="join-lookup">' +
      '<div class="sheet-body">' +
        '<label class="field"><span class="label">Код команды</span>' +
          '<input class="input" type="text" name="code" placeholder="например, mrchao-podsolnuh" autocomplete="off" required></label>' +
        '<p class="tiny muted">Если вы уже в команде, она появится в списке команд.</p>' +
      '</div>' +
      '<div class="sheet-foot"><button type="submit" class="btn primary grow">Найти команду</button></div>' +
    '</form>'
  );
}

function openJoinEmployeesSheet() {
  if (!state.joinTeam) return;
  const list = Object.keys(state.joinTeam.employees || {}).map((id) => {
    const e = state.joinTeam.employees[id];
    return { id, name: String(e && e.name ? e.name : 'Сотрудник') };
  }).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  openSheet(
    '<div class="sheet-head"><div class="grow"><div class="sheet-title">Вступить в команду</div>' +
      '<div class="tiny muted">Код: ' + esc(state.joinTeam.code) + '</div></div>' +
      '<button class="icon-btn" data-action="close-modal" aria-label="Закрыть">' + IC.close + '</button></div>' +
    '<div class="sheet-body">' +
      '<label class="field"><span class="label">Кто вы в списке сотрудников?</span>' +
        '<select class="select-full" id="join-emp">' +
          '<option value="">— выберите своё имя —</option>' +
          list.map((e) => '<option value="' + esc(e.id) + '">' + esc(e.name) + '</option>').join('') +
        '</select></label>' +
      (list.length ? '<p class="tiny muted">Это нужно, чтобы приложение показывало ваши смены.</p>'
        : '<p class="tiny muted">В команде пока нет сотрудников. Попросите администратора добавить вас.</p>') +
      '<button type="button" class="btn primary block" data-action="join-confirm"' + (list.length ? '' : ' disabled') + '>Вступить</button>' +
    '</div>'
  );
}

async function joinTeam(code, empId) {
  if (!state.authUser || !state.profile) return;
  const clean = normalizeCode(code);
  if (!clean) return;
  try {
    const member = { name: state.profile.name, role: 'employee', empId: empId || '', at: Date.now() };
    await firebase.database().ref('teams/' + clean + '/members/' + state.authUser.uid).set(member);
    state.profile.memberships[clean] = { empId: empId || '', role: 'employee' };
    await firebase.database().ref('users/' + state.authUser.uid + '/memberships/' + clean).set({ empId: empId || '', role: 'employee' });
    await saveProfile();
    state.joinTeam = null;
    state.settings.teamCode = clean;
    saveSettings();
    await loadTeamList();
    render();
    connectTeam(clean);
    toast('Вы в команде');
  } catch (e) {
    console.error(e);
    toast('Не удалось вступить: ' + (e && e.message ? e.message : ''));
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
  if (meta) meta.setAttribute('content', dark ? '#12100d' : '#f6efe3');
}

function render() {
  const app = $('#app');
  if (!app) return;
  if (isFinEditing()) {
    pendingRender = true;
    return;
  }
  pendingRender = false;

  if (state.settings.firebase) {
    if (!state.authReady) {
      app.innerHTML = '<div class="boot-screen"><div class="boot-logo">' + IC.calendar + '</div>' +
        '<div class="brand-name">MrCHAO</div><p class="muted">Загрузка…</p></div>';
      return;
    }
    if (!state.authUser) {
      app.innerHTML = authScreenHTML();
      return;
    }
    if (!state.profile) {
      app.innerHTML = state.profileError ? accessErrorHTML(state.profileError)
        : '<div class="boot-screen"><p class="muted">Загрузка профиля…</p></div>';
      return;
    }
    if (!state.settings.teamCode) {
      app.innerHTML = joinScreenHTML();
      return;
    }
  }

  app.innerHTML = headerHTML() + '<main class="main">' + mainHTML() + '</main>';
  const chip = $('.sync');
  if (chip) chip.style.setProperty('--dot', syncMeta().color);
}

function authScreenHTML() {
  const mode = state.authMode === 'register' ? 'register' : (state.authMode === 'reset' ? 'reset' : 'login');
  const err = state.authError;
  const busy = state.authBusy;
  const title = mode === 'register' ? 'Регистрация' : (mode === 'reset' ? 'Восстановление пароля' : 'Вход');
  return '<div class="auth-wrap"><div class="auth-card">' +
    '<div class="welcome-logo">' + IC.calendar + '</div>' +
    '<h2>MrCHAO</h2>' +
    '<p class="muted auth-sub">Смены и финансовый учёт</p>' +
    (mode === 'reset' ? '' :
      '<div class="auth-tabs">' +
        '<button type="button" class="auth-tab' + (mode === 'login' ? ' active' : '') + '" data-action="auth-mode" data-mode="login">Вход</button>' +
        '<button type="button" class="auth-tab' + (mode === 'register' ? ' active' : '') + '" data-action="auth-mode" data-mode="register">Регистрация</button>' +
      '</div>') +
    '<div class="auth-title">' + title + '</div>' +
    (err ? '<div class="form-error show" role="alert">' + esc(err) + '</div>' : '') +
    '<form class="auth-form" data-form="' + (mode === 'login' ? 'auth-login' : (mode === 'register' ? 'auth-register' : 'auth-reset')) + '">' +
      (mode === 'register'
        ? '<label class="field"><span class="label">Как вас зовут</span>' +
          '<input class="input" type="text" name="name" maxlength="50" placeholder="Например, Артём" autocomplete="name" required></label>'
        : '') +
      '<label class="field"><span class="label">Email</span>' +
        '<input class="input" type="email" name="email" placeholder="name@example.com" autocomplete="email" required></label>' +
      (mode === 'reset' ? '' :
        '<label class="field"><span class="label">Пароль</span>' +
          '<input class="input" type="password" name="password" minlength="6" autocomplete="' + (mode === 'login' ? 'current-password' : 'new-password') + '" required></label>') +
      (mode === 'register' ? '<p class="tiny muted" style="margin:-4px 0 12px">Пароль — не короче 6 символов. Он нужен только для входа в приложение.</p>' : '') +
      '<button class="btn primary block" type="submit"' + (busy ? ' disabled' : '') + '>' +
        (busy ? 'Подождите…' : (mode === 'login' ? 'Войти' : (mode === 'register' ? 'Создать аккаунт' : 'Отправить ссылку'))) +
      '</button>' +
    '</form>' +
    (mode === 'login' ? '<button type="button" class="link-btn" data-action="auth-mode" data-mode="reset">Забыли пароль?</button>' : '') +
    (mode === 'reset' ? '<button type="button" class="link-btn" data-action="auth-mode" data-mode="login">Вернуться ко входу</button>' : '') +
    '<p class="tiny muted auth-foot">Доступ только для сотрудников MrCHAO.<br>Роли: сотрудник, менеджер, администратор.</p>' +
  '</div></div>';
}

function accessErrorHTML(message) {
  return '<div class="auth-wrap"><div class="auth-card">' +
    '<div class="welcome-logo">' + IC.calendar + '</div>' +
    '<h2>Нет доступа</h2>' +
    '<p class="muted auth-sub">' + esc(message) + '</p>' +
    '<button type="button" class="btn primary block" data-action="retry-sync">Повторить</button>' +
    '<button type="button" class="link-btn" data-action="logout">Выйти из аккаунта</button>' +
  '</div></div>';
}

function joinScreenHTML() {
  if (state.joinTeam) {
    const list = Object.keys(state.joinTeam.employees || {}).map((id) => {
      const e = state.joinTeam.employees[id];
      return { id, name: String(e && e.name ? e.name : 'Сотрудник') };
    }).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    return '<div class="auth-wrap"><div class="auth-card">' +
      '<div class="welcome-logo">' + IC.calendar + '</div>' +
      '<h2>Вы в команде</h2>' +
      '<p class="muted auth-sub">Код: <b style="color:var(--text)">' + esc(state.joinTeam.code) + '</b></p>' +
      '<form class="auth-form" data-form="join-team">' +
        '<label class="field"><span class="label">Кто вы в списке сотрудников?</span>' +
          '<select class="select-full" name="empId" required>' +
            '<option value="">— выберите своё имя —</option>' +
            list.map((e) => '<option value="' + esc(e.id) + '">' + esc(e.name) + '</option>').join('') +
          '</select></label>' +
        (list.length ? '' : '<p class="tiny muted" style="margin:-4px 0 12px">В команде пока нет сотрудников. Попросите администратора добавить вас в разделе «Команда».</p>') +
        '<button class="btn primary block" type="submit"' + (list.length ? '' : ' disabled') + '>Вступить в команду</button>' +
      '</form>' +
      '<button type="button" class="link-btn" data-action="join-back">Другая команда</button>' +
    '</div></div>';
  }

  return '<div class="auth-wrap"><div class="auth-card">' +
    '<div class="welcome-logo">' + IC.calendar + '</div>' +
    '<h2>MrCHAO</h2>' +
    '<p class="muted auth-sub">Введите код команды, чтобы подключиться</p>' +
    (state.authError ? '<div class="form-error show" role="alert">' + esc(state.authError) + '</div>' : '') +
    '<form class="auth-form" data-form="join-lookup">' +
      '<label class="field"><span class="label">Код команды</span>' +
        '<input class="input" type="text" name="code" placeholder="например, mrchao-podsolnuh" autocomplete="off" required></label>' +
      '<button class="btn primary block" type="submit">Найти команду</button>' +
    '</form>' +
    (isAdmin() ? '<button type="button" class="link-btn" data-action="join-create">Создать новую команду с этим кодом</button>' : '') +
    '<p class="tiny muted auth-foot">Код команды выдаёт администратор MrCHAO.</p>' +
    '<button type="button" class="link-btn" data-action="logout">Выйти из аккаунта</button>' +
  '</div></div>';
}

function openTeamSwitcher() {
  const codes = myTeams();
  const items = codes.map((code) => {
    const cached = LS.get('smena.team.' + code, null);
    const name = cached && cached.name ? cached.name : code;
    const meta = myMemberships()[code];
    const role = isAdmin() ? 'админ' : (meta && meta.role === 'manager' ? 'менеджер' : 'сотрудник');
    return '<button type="button" class="team-item' + (code === state.settings.teamCode ? ' active' : '') + '" data-action="switch-team" data-code="' + esc(code) + '">' +
      '<span class="team-item-name">' + esc(name) + '</span>' +
      '<span class="team-item-meta">' + esc(code) + ' · ' + role + '</span>' +
    '</button>';
  }).join('');
  openSheet(
    '<div class="sheet-head"><div class="grow"><div class="sheet-title">Команды</div>' +
      '<div class="tiny muted">' + (isAdmin() ? 'Доступны все команды' : 'Ваши команды') + '</div></div>' +
      '<button class="icon-btn" data-action="close-modal" aria-label="Закрыть">' + IC.close + '</button></div>' +
    '<div class="sheet-body">' +
      (items || '<div class="empty">Пока нет команд</div>') +
      '<button type="button" class="btn block" data-action="open-join" style="margin-top:12px">' + IC.plus + ' Подключить другую команду</button>' +
    '</div>'
  );
}

function headerHTML() {
  const meta = syncMeta();
  const initial = (myName() || '?').trim().charAt(0).toUpperCase() || '?';
  const teamName = state.team && state.team.name ? state.team.name : 'график работы';
  const teamsCount = myTeams().length;
  return '' +
    '<header class="top">' +
      '<div class="brand">' +
        '<div class="logo" aria-hidden="true">' + IC.calendar + '</div>' +
        '<div class="brand-text">' +
          '<div class="brand-name">MrCHAO</div>' +
          '<div class="brand-sub">' + esc(teamName) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="top-actions">' +
        (teamsCount > 1 || isAdmin()
          ? '<button class="icon-btn" data-action="teams" title="Команды" aria-label="Команды">' + IC.layers + '</button>'
          : '') +
        '<button class="sync" data-action="open-settings" style="--dot:' + meta.color + '" title="Настройки синхронизации">' +
          '<span class="sync-dot"></span><span class="sync-text">' + meta.label + '</span>' +
        '</button>' +
        '<button class="avatar" data-action="open-settings" title="' + esc(myName() + ' · ' + ROLE_LABEL[myRole()]) + '">' + esc(initial) + '</button>' +
      '</div>' +
    '</header>' +
    '<nav class="tabs">' +
      [['month', 'Месяц'], ['list', 'Список'], ['finance', 'Учёт'], ['team', 'Команда'], ['summary', 'Итого']].map((t) =>
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
  if (state.tab === 'finance') return viewFinance();
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
          (isStaff() ? '<button class="icon-btn" data-action="edit-employee" data-id="' + e.id + '" aria-label="Изменить">' + IC.edit + '</button>' : '') +
        '</div>';
      }).join('') + '</div>'
    : '<div class="empty">Сотрудников пока нет. Добавьте первого — и можно ставить смены.</div>';

  return codeCard +
    '<div class="section-head"><h2>Сотрудники</h2>' +
      (isStaff() ? '<button class="btn primary sm" data-action="new-employee">' + IC.plus + ' Добавить</button>' : '') +
    '</div>' + cards;
}

/* ---------- finance view ---------- */

function finGroupCells(cols, render, tag) {
  let group = '';
  return cols.map((col, i) => {
    let gap = '';
    if (group && col.group !== group) {
      gap = '<' + tag + ' class="fin-sep" aria-hidden="true"></' + tag + '>';
    }
    group = col.group;
    return gap + render(col, i);
  }).join('');
}

function finTableCell(shift, col) {
  if (col.auto) {
    const auto = finAutoValue(shift, col);
    return '<td class="fin-auto" title="' + esc(auto) + '">' + esc(auto) + '</td>';
  }
  const vals = finValues(shift);
  const raw = vals[col.id];
  const has = raw != null && String(raw).trim() !== '';
  const auto = col.calc ? finCalcFromValues(vals, col) : '';
  const ph = !has && auto !== '' ? 'авто: ' + fmtMoney(auto) : '';
  const numeric = col.type === 'money' || col.type === 'number';
  const editable = canEditFinance(shift);
  const meta = shift.fin && shift.fin.meta ? shift.fin.meta[col.id] : null;
  const mark = meta
    ? '<span class="fin-mark" title="Изменено менеджером: ' + esc(meta.by || '') + ' · ' + esc(fmtDateTime(meta.at)) + '">M</span>'
    : '';
  return '<td class="fin-td' + (numeric ? ' num' : '') + '">' +
    '<input class="fin-input' + (!has && col.calc ? ' is-auto' : '') + (editable ? '' : ' is-locked') + '"' +
      (col.id === 'point' ? ' list="fin-points"' : '') +
      ' data-fin-shift="' + shift.id + '" data-fin-col="' + col.id + '" data-fin-field="' + col.id + '"' +
      ' value="' + esc(has ? raw : '') + '"' +
      (ph ? ' placeholder="' + esc(ph) + '"' : '') +
      (editable ? '' : ' readonly title="Сотрудник может менять данные до истечения суток после смены"') +
      ' inputmode="' + (numeric ? 'decimal' : 'text') + '"' +
      ' aria-label="' + esc(col.title) + '">' +
    mark +
  '</td>';
}

function finFootCell(col, list, isFirst) {
  if (isFirst) return '<td class="fin-total-label">Итого</td>';
  if (!(col.type === 'money' || col.calc)) return '<td></td>';
  let sum = 0;
  let any = false;
  list.forEach((s) => {
    const n = parseMoney(finValue(s, col));
    if (n != null) { sum += n; any = true; }
  });
  return '<td class="num" data-fin-total="' + col.id + '">' + (any ? fmtMoney(sum) : '—') + '</td>';
}

function viewFinance() {
  const fin = (state.team && state.team.finance) || normalizeFinance(null);
  const cols = fin.columns.filter((c) => !c.hidden);
  const list = monthShifts().sort((a, b) => a.date.localeCompare(b.date) || t2m(a.start) - t2m(b.start));
  const points = finPointList();
  const datalist = '<datalist id="fin-points">' + points.map((p) => '<option value="' + esc(p) + '"></option>').join('') + '</datalist>';

  const head = '<div class="section-head"><h2>' + esc(fin.title) + '</h2>' +
    '<div class="export-row">' +
      (isStaff() ? '<button class="btn ghost sm" data-action="finance-settings">Настроить колонки</button>' : '') +
      '<button class="btn ghost sm" data-action="export-csv">' + IC.download + ' CSV</button>' +
    '</div></div>';

  if (!cols.length) {
    return hintHTML() + monthBar() + head +
      '<div class="empty">Все колонки скрыты. Нажмите «Настроить колонки», чтобы вернуть их.</div>';
  }
  if (!list.length) {
    return hintHTML() + monthBar() + head + datalist +
      '<div class="empty">В этом месяце пока нет смен.<br><span class="tiny">Учёт ведётся по сменам: сначала добавьте смену в календаре.</span></div>';
  }

  const th = finGroupCells(cols, (c) => '<th class="' + (c.type === 'text' ? '' : 'num') + '">' + esc(c.title) + '</th>', 'th');
  const body = list.map((s) => {
    const tds = finGroupCells(cols, (c) => finTableCell(s, c), 'td');
    return '<tr data-fin-row="' + s.id + '">' + tds +
      '<td class="fin-ops"><button class="icon-btn" data-action="edit-shift" data-id="' + s.id + '" aria-label="Открыть смену" title="Открыть смену">' + IC.edit + '</button></td>' +
    '</tr>';
  }).join('');
  const foot = finGroupCells(cols, (c, i) => finFootCell(c, list, i === 0), 'td');

  return hintHTML() + monthBar() + head + datalist +
    '<div class="fin-wrap" data-fin-scope="table">' +
      '<table class="fin-table">' +
        '<thead><tr>' + th + '<th class="fin-ops"></th></tr></thead>' +
        '<tbody>' + body + '</tbody>' +
        '<tfoot><tr>' + foot + '<td class="fin-ops"></td></tr></tfoot>' +
      '</table>' +
    '</div>' +
    '<p class="tiny muted" style="margin-top:10px">Безнал = Выручка − Наличные. Остаток в кассе = Наличные − Инкассация; размен в остатке не учитывается. Любое значение можно переписать вручную — очистите поле, чтобы вернуть авторасчёт.' +
      (!isStaff() ? '<br><b>Сотрудник</b> может вносить данные за 15 минут до начала смены и в течение суток после её окончания.' : '') +
      (isManager() ? '<br>Правки менеджера отмечаются значком <span class="fin-mark">M</span>; наведите на него, чтобы увидеть автора и время.' : '') +
    '</p>';
}

function finColRow(c) {
  const typeHtml = c.core || c.auto || c.calc
    ? '<span class="fin-col-type">' + (c.auto ? 'из смены' : (c.calc ? 'авто' : (FIN_TYPE_LABEL[c.type] || c.type))) + '</span>'
    : '<select class="select fin-type" data-col-type aria-label="Тип колонки">' +
        ['text', 'money', 'time'].map((t) =>
          '<option value="' + t + '"' + (c.type === t ? ' selected' : '') + '>' + FIN_TYPE_LABEL[t] + '</option>'
        ).join('') +
      '</select>';
  return '<div class="fin-col-row" data-col-id="' + esc(c.id) + '" data-core="' + (c.core ? '1' : '0') + '">' +
    '<div class="fin-col-move">' +
      '<button type="button" class="icon-btn" data-action="fin-col-up" aria-label="Выше">↑</button>' +
      '<button type="button" class="icon-btn" data-action="fin-col-down" aria-label="Ниже">↓</button>' +
    '</div>' +
    '<input class="input fin-col-title" data-col-title maxlength="60" value="' + esc(c.title) + '" aria-label="Название колонки">' +
    typeHtml +
    '<label class="fin-col-show"><input type="checkbox" data-col-show' + (c.hidden ? '' : ' checked') + '><span class="tiny muted">видна</span></label>' +
    (c.core ? '' : '<button type="button" class="icon-btn danger" data-action="fin-col-del" aria-label="Удалить колонку">' + IC.trash + '</button>') +
  '</div>';
}

function openFinanceSettings() {
  const fin = (state.team && state.team.finance) || normalizeFinance(null);
  const rows = fin.columns.map(finColRow).join('');
  openSheet(
    '<div class="sheet-head">' +
      '<div class="grow"><div class="sheet-title">Таблица учёта</div>' +
      '<div class="tiny muted">Колонки видны всей команде</div></div>' +
      '<button class="icon-btn" data-action="close-modal" aria-label="Закрыть">' + IC.close + '</button>' +
    '</div>' +
    '<form class="sheet-form" data-form="finance-cols" novalidate>' +
      '<div class="sheet-body">' +
        '<div class="form-error" data-error></div>' +
        '<label class="field"><span class="label">Название таблицы</span>' +
          '<input class="input" type="text" name="title" maxlength="60" value="' + esc(fin.title) + '"></label>' +
        '<p class="tiny muted" style="margin:-4px 0 12px">«ФИО», «Дата» и «Начало смены» берутся из смены. Базовые колонки можно скрыть и переименовать, свои колонки — удалить.</p>' +
        '<div class="fin-cols" id="fin-cols">' + rows + '</div>' +
        '<div class="fin-col-add">' +
          '<input class="input" id="fin-new-title" maxlength="60" placeholder="Новая колонка" aria-label="Название новой колонки">' +
          '<select class="select fin-type" id="fin-new-type" aria-label="Тип новой колонки">' +
            ['text', 'money', 'time'].map((t) => '<option value="' + t + '">' + FIN_TYPE_LABEL[t] + '</option>').join('') +
          '</select>' +
          '<button type="button" class="btn sm" data-action="fin-col-add">' + IC.plus + ' Добавить</button>' +
        '</div>' +
        '<button type="button" class="btn danger sm" data-action="fin-cols-reset" style="margin-top:12px">Сбросить к шаблону</button>' +
      '</div>' +
      '<div class="sheet-foot">' +
        '<button type="button" class="btn ghost" data-action="close-modal">Отмена</button>' +
        '<button type="submit" class="btn primary grow">Сохранить</button>' +
      '</div>' +
    '</form>'
  );
}

function saveFinanceFromForm(form) {
  if (!isStaff()) { showFormError(form, 'Настройка колонок доступна менеджеру и администратору.'); return; }
  const title = String(form.elements.title.value || '').trim().slice(0, 60) || 'Финансовый учёт';
  const prev = (state.team && state.team.finance) || normalizeFinance(null);
  const byId = {};
  prev.columns.forEach((c) => { byId[c.id] = c; });

  const columns = [];
  const seen = {};
  form.querySelectorAll('#fin-cols .fin-col-row').forEach((row) => {
    const id = row.dataset.colId;
    if (!id || seen[id]) return;
    seen[id] = true;
    const titleInput = row.querySelector('[data-col-title]');
    const showInput = row.querySelector('[data-col-show]');
    const typeSelect = row.querySelector('[data-col-type]');
    const titleVal = String((titleInput && titleInput.value) || '').trim().slice(0, 60);
    const base = byId[id];
    if (base) {
      columns.push(Object.assign({}, base, {
        title: titleVal || base.title,
        hidden: !(showInput && showInput.checked),
      }));
    } else {
      const type = typeSelect && ['text', 'money', 'time'].indexOf(typeSelect.value) >= 0 ? typeSelect.value : 'text';
      columns.push({
        id,
        title: titleVal || 'Колонка',
        type,
        auto: null,
        calc: null,
        group: FIN_BODY,
        hidden: !(showInput && showInput.checked),
        core: false,
      });
    }
  });

  if (!columns.length) return showFormError(form, 'Оставьте хотя бы одну колонку.');

  state.team.finance = { title, columns };
  persist();
  remoteSet('finance', state.team.finance);
  closeSheet();
  render();
  toast('Таблица обновлена');
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

function finFieldHTML(shift, col) {
  const vals = finValues(shift);
  const raw = vals[col.id];
  const has = raw != null && String(raw).trim() !== '';
  const auto = col.calc ? finCalcFromValues(vals, col) : '';
  const ph = !has && auto !== '' ? 'авто: ' + fmtMoney(auto) : '';
  const numeric = col.type === 'money' || col.type === 'number';
  const editable = canEditFinance(shift);
  const meta = shift.fin && shift.fin.meta ? shift.fin.meta[col.id] : null;
  const mark = meta
    ? ' <span class="fin-mark" title="Изменено менеджером: ' + esc(meta.by || '') + ' · ' + esc(fmtDateTime(meta.at)) + '">M</span>'
    : '';
  return '<label class="field fin-field"><span class="label">' + esc(col.title) + mark +
      (editable ? '' : ' <span class="tiny muted">(смена и сутки после)</span>') + '</span>' +
    '<input class="input' + (!has && col.calc ? ' is-auto' : '') + (editable ? '' : ' is-locked') + '"' +
      ' data-fin-field="' + col.id + '"' + (col.calc ? ' data-fin-calc="1"' : '') +
      ' data-auto="' + (!has && col.calc ? '1' : '0') + '"' +
      (col.id === 'point' ? ' list="fin-points"' : '') +
      ' value="' + esc(has ? raw : '') + '"' +
      (ph ? ' placeholder="' + esc(ph) + '"' : '') +
      (editable ? '' : ' readonly') +
      ' inputmode="' + (numeric ? 'decimal' : 'text') + '">' +
  '</label>';
}

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

  const finCols = finVisibleColumns();
  const finHeadCols = finCols.filter((c) => !c.auto && c.group === FIN_HEAD);
  const finBodyCols = finCols.filter((c) => !c.auto && c.group !== FIN_HEAD);
  const finOpen = Object.keys(finValues(shift)).length > 0;
  const finPoints = finPointList();
  const finBlock = (finHeadCols.length || finBodyCols.length)
    ? '<details class="fin-block" data-fin-scope="form"' + (finOpen ? ' open' : '') + '>' +
        '<summary>Финансовый учёт <span class="tiny muted">— необязательно</span></summary>' +
        '<div class="fin-block-body">' +
          (finHeadCols.length ? '<div class="fin-grid">' + finHeadCols.map((c) => finFieldHTML(shift, c)).join('') + '</div>' : '') +
          (finHeadCols.length && finBodyCols.length ? '<div class="fin-split" aria-hidden="true"></div>' : '') +
          (finBodyCols.length ? '<div class="fin-grid">' + finBodyCols.map((c) => finFieldHTML(shift, c)).join('') + '</div>' : '') +
          '<p class="tiny muted" style="margin:-2px 0 4px">Безнал = Выручка − Наличные. Остаток в кассе = Наличные − Инкассация; размен в остатке не учитывается. Очистите поле, чтобы вернуть авторасчёт.</p>' +
          '<datalist id="fin-points">' + finPoints.map((p) => '<option value="' + esc(p) + '"></option>').join('') + '</datalist>' +
        '</div>' +
      '</details>'
    : '';

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
        finBlock +
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
    form.addEventListener('input', (e) => {
      const inp = e.target.closest('[data-fin-field]');
      if (!inp) return;
      if (inp.dataset.finCalc === '1') inp.dataset.auto = String(inp.value || '').trim() ? '0' : '1';
      refreshFinAutoFields(form);
    });
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

  /* Финансовый учёт: сохраняем только заполненные поля.
     Значения для скрытых/удалённых колонок не трогаем. */
  const existingShift = state.team.shifts[id];
  const existingVals = finValues(existingShift);
  const existingMeta = (existingShift && existingShift.fin && existingShift.fin.meta) || {};
  const finVals = Object.assign({}, existingVals);
  const finMeta = Object.assign({}, existingMeta);
  form.querySelectorAll('[data-fin-field]').forEach((inp) => {
    const colId = inp.dataset.finField;
    const col = finColumnById(colId);
    if (!col) return;
    const val = String(inp.value || '').trim().slice(0, 200);
    const isAutoCalc = col.calc && inp.dataset.auto === '1';
    const next = isAutoCalc || !val ? '' : val;
    const prev = existingVals[colId] || '';
    if (next) finVals[colId] = next;
    else delete finVals[colId];
    if (next !== prev) {
      if (isManager()) finMeta[colId] = { by: myName(), at: Date.now(), role: 'manager' };
      else if (isAdmin()) delete finMeta[colId];
    }
  });
  const nextFin = { values: finVals };
  if (Object.keys(finMeta).length) nextFin.meta = finMeta;
  candidate.fin = (Object.keys(finVals).length || Object.keys(finMeta).length) ? nextFin : null;

  const clash = shiftsOf(date).find((s) => s.id !== id && s.empId === empId && overlaps(candidate, s));
  if (clash) {
    return showFormError(form, 'Пересечение: у сотрудника «' + emp.name + '» уже есть смена ' + clash.start + '–' + clash.end + ' в этот день.');
  }

  const isNew = !state.team.shifts[id];
  const shift = Object.assign({}, candidate, {
    by: myName(),
    at: Date.now(),
  });

  state.team.shifts[id] = shift;
  persist();
  remoteSet('shifts/' + id, scheduleOnly(shift));
  if (isStaff() || canEditFinance(shift)) remoteSet('fin/' + id, shift.fin || null);
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
  if (isStaff() || canEditFinance(shift)) remoteRemove('fin/' + id);
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
  if (!isStaff()) return showFormError(form, 'Менять список сотрудников может менеджер или администратор.');
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
  if (!isStaff()) { toast('Удалять сотрудников может менеджер или администратор'); return; }
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
      remoteRemove('fin/' + sid);
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

function teamSettingsHTML() {
  const s = state.settings;
  const teams = myTeams();
  const teamOptions = teams.map((code) => {
    const cached = LS.get('smena.team.' + code, null);
    const nm = cached && cached.name ? cached.name : code;
    return '<option value="' + esc(code) + '"' + (code === s.teamCode ? ' selected' : '') + '>' + esc(nm) + ' · ' + esc(code) + '</option>';
  }).join('');
  const members = state.team && state.team.members
    ? Object.keys(state.team.members).map((uid) => Object.assign({ uid }, state.team.members[uid]))
    : [];
  const emps = empList();
  const rows = isAdmin() ? members.map((m) => {
    const empOpts = '<option value="">— не привязан —</option>' + emps.map((e) =>
      '<option value="' + esc(e.id) + '"' + (e.id === m.empId ? ' selected' : '') + '>' + esc(e.name) + '</option>'
    ).join('');
    const self = state.authUser && m.uid === state.authUser.uid;
    return '<div class="member-row">' +
      '<div class="member-head">' +
        '<span class="member-name">' + esc(m.name || 'Без имени') + '</span>' +
        '<span class="role-badge role-' + esc(m.role || 'employee') + '">' +
          (m.role === 'admin' ? 'админ' : (m.role === 'manager' ? 'менеджер' : 'сотрудник')) + '</span>' +
      '</div>' +
      (m.role === 'admin' || self
        ? '<div class="tiny muted">' + (self ? 'Это вы' : 'Полный доступ') + '</div>'
        : '<div class="member-controls">' +
            '<select class="select" data-member-role="' + esc(m.uid) + '" aria-label="Роль">' +
              '<option value="employee"' + (m.role === 'employee' ? ' selected' : '') + '>Сотрудник</option>' +
              '<option value="manager"' + (m.role === 'manager' ? ' selected' : '') + '>Менеджер</option>' +
            '</select>' +
            '<select class="select" data-member-emp="' + esc(m.uid) + '" aria-label="Сотрудник">' + empOpts + '</select>' +
          '</div>') +
    '</div>';
  }).join('') : '';

  return '<div class="settings-section">' +
    '<h3>Команда</h3>' +
    '<div class="status-line"><span class="sync-dot" style="--dot:' + syncMeta().color + '"></span>' + syncMeta().label + '</div>' +
    (teams.length > 1
      ? '<label class="field"><span class="label">Активная команда</span>' +
          '<select class="select-full" data-team-switch>' + teamOptions + '</select></label>'
      : '') +
    (isStaff()
      ? '<label class="field"><span class="label">Название команды</span>' +
          '<input class="input" type="text" name="teamName" maxlength="50" value="' +
            esc(state.team ? state.team.name : '') + '" placeholder="Например, MrCHAO Подсолнух"></label>'
      : '') +
    '<div class="status-line">Код: <b style="color:var(--text)">' + esc(s.teamCode) + '</b></div>' +
    '<div class="export-row" style="margin-bottom:14px">' +
      '<button type="button" class="btn sm" data-action="copy-code">Скопировать код</button>' +
      '<button type="button" class="btn sm" data-action="open-join">Подключить команду</button>' +
    '</div>' +
    (isAdmin()
      ? '<h4 class="settings-sub">Участники и роли</h4>' +
        (rows || '<div class="empty">Пока никто не подключился</div>') +
        '<p class="tiny muted" style="margin-top:8px">Менеджер видит график своих команд и может менять финансы за любой день. Сотрудник — за 15 минут до начала смены и в течение суток после её окончания.</p>'
      : '') +
  '</div>';
}

async function setMemberRole(uid, role) {
  if (!isAdmin() || !uid) return;
  const code = state.settings.teamCode;
  if (!code) return;
  try {
    await firebase.database().ref('teams/' + code + '/members/' + uid).update({ role });
    const snap = await firebase.database().ref('users/' + uid).once('value');
    const prof = snap.val() || {};
    const memberships = prof.memberships || {};
    if (memberships[code]) memberships[code].role = role === 'manager' ? 'manager' : 'employee';
    const anyManager = Object.keys(memberships).some((key) => memberships[key] && memberships[key].role === 'manager');
    const nextRole = prof.role === 'admin' ? 'admin' : (anyManager ? 'manager' : 'employee');
    await firebase.database().ref('users/' + uid).update({ memberships, role: nextRole });
    if (state.team && state.team.members[uid]) state.team.members[uid].role = role;
    persist();
    toast('Роль обновлена');
    openSettings();
  } catch (e) {
    console.error(e);
    toast('Не удалось изменить роль: ' + (e && e.message ? e.message : ''));
  }
}

async function setMemberEmp(uid, empId) {
  if (!isAdmin() || !uid) return;
  const code = state.settings.teamCode;
  if (!code) return;
  try {
    await firebase.database().ref('teams/' + code + '/members/' + uid).update({ empId: empId || '' });
    await firebase.database().ref('users/' + uid + '/memberships/' + code).update({ empId: empId || '' });
    if (state.team && state.team.members[uid]) state.team.members[uid].empId = empId || '';
    persist();
    toast('Привязка обновлена');
  } catch (e) {
    console.error(e);
    toast('Не удалось обновить привязку: ' + (e && e.message ? e.message : ''));
  }
}

function openSettings() {
  const s = state.settings;
  const meta = syncMeta();
  const role = ROLE_LABEL[myRole()];
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
          '<h3>Аккаунт</h3>' +
          '<div class="status-line"><b style="color:var(--text)">' + esc(myEmail()) + '</b> · ' + esc(role) + '</div>' +
          '<button type="button" class="btn sm" data-action="logout">Выйти из аккаунта</button>' +
        '</div>' +

        '<div class="settings-section">' +
          '<h3>Вы</h3>' +
          '<label class="field"><span class="label">Ваше имя (для истории изменений)</span>' +
            '<input class="input" type="text" name="name" maxlength="60" value="' + esc(myName()) + '" placeholder="Например, Анна"></label>' +
          '<label class="field"><span class="label">Оформление</span>' +
            '<select class="select-full" name="theme">' +
              '<option value="auto"' + (s.theme === 'auto' ? ' selected' : '') + '>Как в системе</option>' +
              '<option value="dark"' + (s.theme === 'dark' ? ' selected' : '') + '>Тёмное</option>' +
              '<option value="light"' + (s.theme === 'light' ? ' selected' : '') + '>Светлое</option>' +
            '</select></label>' +
        '</div>' +

        teamSettingsHTML() +

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
  const name = String(fd.get('name') || '').trim().slice(0, 60);
  const teamName = String(fd.get('teamName') || '').trim().slice(0, 50);
  const theme = String(fd.get('theme') || 'auto');

  if (teamName && state.team && teamName !== state.team.name && !isStaff()) {
    return showFormError(form, 'Менять название команды может менеджер или администратор.');
  }

  state.settings.theme = theme;
  if (name) {
    state.settings.name = name;
    if (state.profile) {
      state.profile.name = name;
      saveProfile();
    }
  }
  saveSettings();
  applyTheme();

  if (state.team && teamName && teamName !== state.team.name) {
    state.team.name = teamName;
    persist();
    remoteSet('name', teamName);
    logEntry('Название команды изменено', '«' + teamName + '»');
  }

  closeSheet();
  render();
  toast('Настройки сохранены');
}

/* ---------- welcome / create team ---------- */

function openWelcome() {
  openSheet(
    '<div class="sheet-body welcome">' +
      '<div class="welcome-logo">' + IC.calendar + '</div>' +
      '<h2>MrCHAO — вход в смены</h2>' +
      '<p class="muted">График работы и финансовый учёт MrCHAO. Стандартная смена 10:00–21:00 или разделённая на двоих.</p>' +
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
  if (!isAdmin()) return;
  const hasLocal = state.team && (Object.keys(state.team.employees || {}).length || Object.keys(state.team.shifts || {}).length);
  openSheet(
    '<div class="sheet-head"><div class="grow"><div class="sheet-title">Команда не найдена</div>' +
      '<div class="tiny muted">Код: ' + esc(state.settings.teamCode) + '</div></div>' +
      '<button class="icon-btn" data-action="close-modal" aria-label="Закрыть">' + IC.close + '</button></div>' +
    '<div class="sheet-body">' +
      '<p class="muted" style="margin-bottom:16px">В облаке пока нет команды с таким кодом. Создать её? ' +
        (hasLocal ? 'Данные с этого устройства будут загружены в облако.' : '') + '</p>' +
      '<button class="btn primary block" data-action="create-team" style="margin-bottom:8px">Создать команду ' + esc(state.settings.teamCode) + '</button>' +
      '<button class="btn block" data-action="open-join">Подключиться к другой команде</button>' +
    '</div>'
  );
}

async function createTeam(codeOverride) {
  if (!isAdmin()) { toast('Создавать команды может только администратор'); return; }
  if (!state.settings.firebase || !state.authUser) return;
  const code = normalizeCode(codeOverride || state.settings.teamCode);
  if (!code) { toast('Введите код команды'); return; }
  if (!firebase.apps.length) await loadFirebaseSdk();
  if (!state.team) {
    state.team = {
      name: '',
      employees: {},
      shifts: {},
      log: {},
      members: {},
      finance: normalizeFinance(null),
      createdAt: Date.now(),
    };
  }
  const team = state.team;
  team.name = team.name || ('MrCHAO ' + code);
  team.members = team.members || {};
  team.members[state.authUser.uid] = { name: myName(), role: 'admin', empId: '', at: Date.now() };
  try {
    await firebase.database().ref('teams/' + code).set(team);
    state.settings.teamCode = code;
    saveSettings();
    state.team = team;
    persist();
    closeSheet();
    render();
    connectTeam(code);
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
  const finCols = finVisibleColumns().filter((c) => !c.auto);
  const rows = [['Дата', 'День', 'Сотрудник', 'Начало', 'Конец', 'Часы', 'Примечание'].concat(finCols.map((c) => c.title))];
  list.forEach((s) => {
    const emp = empById(s.empId);
    const base = [
      fmtDayShort(s.date),
      WEEK_SHORT[weekdayIndex(s.date)],
      emp ? emp.name : 'Удалён',
      s.start,
      s.end,
      String(Math.round((durMin(s) / 60) * 10) / 10).replace('.', ','),
      s.note || '',
    ];
    const fin = finCols.map((c) => {
      const v = finValue(s, c);
      if (c.type === 'money' || c.calc) {
        const n = parseMoney(v);
        return n == null ? '' : String(n).replace('.', ',');
      }
      return v;
    });
    rows.push(base.concat(fin));
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

async function handleAuthSubmit(kind, form) {
  const fd = new FormData(form);
  const email = String(fd.get('email') || '').trim();
  const password = String(fd.get('password') || '');
  const name = String(fd.get('name') || '').trim();
  state.authError = '';
  if (kind === 'auth-register' && !name) {
    state.authError = 'Введите имя.';
    render();
    return;
  }
  state.authBusy = true;
  render();
  try {
    if (kind === 'auth-login') {
      await doLogin(email, password);
    } else if (kind === 'auth-register') {
      await doRegister(name, email, password);
    } else {
      await doReset(email);
      state.authMode = 'login';
      toast('Ссылка для восстановления отправлена на ' + email);
    }
  } catch (e) {
    console.error(e);
    state.authError = authErrorText(e && e.code);
  } finally {
    state.authBusy = false;
    render();
  }
}

async function confirmJoin() {
  if (!state.joinTeam) return;
  const sel = $('#join-emp') || $('#app select[name="empId"]');
  const empId = sel ? sel.value : '';
  if (!empId) { toast('Выберите своё имя в списке'); return; }
  await joinTeam(state.joinTeam.code, empId);
}

async function handleJoinLookup(form) {
  const fd = new FormData(form);
  const code = normalizeCode(fd.get('code'));
  if (!code) return showFormError(form, 'Введите код команды.');
  state.authError = '';
  await lookupTeam(code);
  if (state.joinTeam) {
    if (state.settings.teamCode) openJoinEmployeesSheet();
    else render();
  }
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
      if (!isStaff()) { toast('Добавлять сотрудников может менеджер или администратор'); break; }
      openEmployeeForm();
      break;
    case 'edit-employee':
      if (!isStaff()) { toast('Менять список сотрудников может менеджер или администратор'); break; }
      openEmployeeForm(el.dataset.id);
      break;
    case 'delete-employee':
      if (!isStaff()) { toast('Удалять сотрудников может менеджер или администратор'); break; }
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
    case 'teams':
      openTeamSwitcher();
      break;
    case 'switch-team':
      closeSheet();
      await switchTeam(el.dataset.code);
      break;
    case 'auth-mode':
      state.authMode = el.dataset.mode || 'login';
      state.authError = '';
      render();
      break;
    case 'logout': {
      const ok = await confirmDialog('Выйти из аккаунта?', 'Данные команды останутся в облаке. Чтобы вернуться, снова войдите по email.', 'Выйти');
      if (ok) { closeSheet(); await doLogout(); }
      break;
    }
    case 'join-back':
      state.joinTeam = null;
      state.authError = '';
      render();
      break;
    case 'join-create': {
      const inp = $('#app input[name="code"]');
      const code = inp ? inp.value : '';
      if (!normalizeCode(code)) { toast('Введите код команды'); break; }
      await createTeam(code);
      break;
    }
    case 'open-join':
      openJoinSheet();
      break;
    case 'join-confirm':
      await confirmJoin();
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
    case 'finance-settings':
      if (!isStaff()) { toast('Настройка колонок доступна менеджеру и администратору'); break; }
      openFinanceSettings();
      break;
    case 'fin-col-add': {
      const form = el.closest('form');
      if (!form) break;
      const titleInput = form.querySelector('#fin-new-title');
      const typeSelect = form.querySelector('#fin-new-type');
      const title = String((titleInput && titleInput.value) || '').trim();
      if (!title) { if (titleInput) titleInput.focus(); break; }
      const type = typeSelect && ['text', 'money', 'time'].indexOf(typeSelect.value) >= 0 ? typeSelect.value : 'text';
      const row = finColRow({ id: 'f_' + uid(), title, type, group: FIN_BODY, hidden: false, core: false });
      form.querySelector('#fin-cols').insertAdjacentHTML('beforeend', row);
      titleInput.value = '';
      titleInput.focus();
      break;
    }
    case 'fin-col-del': {
      const row = el.closest('.fin-col-row');
      if (row) row.remove();
      break;
    }
    case 'fin-col-up': {
      const row = el.closest('.fin-col-row');
      if (row && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
      break;
    }
    case 'fin-col-down': {
      const row = el.closest('.fin-col-row');
      if (row && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
      break;
    }
    case 'fin-cols-reset': {
      const form = el.closest('form');
      const ok = await confirmDialog('Сбросить колонки?',
        'Колонки вернутся к стандартному финансовому шаблону. Введённые суммы сохранятся.', 'Сбросить');
      if (ok && form) form.querySelector('#fin-cols').innerHTML = finDefaultColumns().map(finColRow).join('');
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

/* Ввод в таблице учёта: сразу считаем итоги, в облако отправляем с задержкой. */
document.addEventListener('input', (e) => {
  const inp = e.target.closest('[data-fin-shift][data-fin-col]');
  if (!inp) return;
  const shiftId = inp.dataset.finShift;
  const shift = state.team && state.team.shifts ? state.team.shifts[shiftId] : null;
  if (!shift) return;
  const col = finColumnById(inp.dataset.finCol);
  if (!col) return;

  if (!canEditFinance(shift)) {
    inp.value = finValue(shift, col) || '';
    toast('Сотрудник может менять данные за 15 минут до начала смены и в течение суток после её окончания');
    return;
  }

  const val = String(inp.value || '').trim();
  setFinValue(shift, col.id, inp.value);
  setFinDraft(shiftId, col.id, inp.value);

  if (isManager()) {
    if (val) {
      if (!shift.fin) shift.fin = { values: {} };
      shift.fin.meta = shift.fin.meta || {};
      shift.fin.meta[col.id] = { by: myName(), at: Date.now(), role: 'manager' };
    } else if (shift.fin && shift.fin.meta) {
      delete shift.fin.meta[col.id];
      if (!Object.keys(shift.fin.meta).length) delete shift.fin.meta;
    }
  } else if (isAdmin() && shift.fin && shift.fin.meta) {
    delete shift.fin.meta[col.id];
    if (!Object.keys(shift.fin.meta).length) delete shift.fin.meta;
  }

  if (col.calc) inp.classList.toggle('is-auto', !val);
  const row = inp.closest('[data-fin-row]');
  if (row) refreshFinAutoFields(row);
  const scope = inp.closest('[data-fin-scope]');
  if (scope) refreshFinTotals(scope);

  /* Метка «изменено менеджером» появляется сразу, без перерисовки. */
  const td = inp.closest('td');
  if (td) {
    let mark = td.querySelector('.fin-mark');
    const meta = shift.fin && shift.fin.meta ? shift.fin.meta[col.id] : null;
    if (meta) {
      if (!mark) {
        mark = document.createElement('span');
        mark.className = 'fin-mark';
        mark.textContent = 'M';
        td.appendChild(mark);
      }
      mark.title = 'Изменено менеджером: ' + (meta.by || '') + ' · ' + fmtDateTime(meta.at);
    } else if (mark) {
      mark.remove();
    }
  }

  queueFinWrite(shiftId);
});

/* Ушли из поля — отправляем сразу, не дожидаясь задержки. */
document.addEventListener('change', (e) => {
  const inp = e.target && e.target.closest ? e.target.closest('[data-fin-shift][data-fin-col]') : null;
  if (!inp) return;
  const shiftId = inp.dataset.finShift;
  clearTimeout(finWriteTimers[shiftId]);
  persist();
  const shift = state.team && state.team.shifts ? state.team.shifts[shiftId] : null;
  if (shift) remoteSet('fin/' + shiftId, shift.fin || null);
});

/* Смена команды и роли участников — из настроек. */
document.addEventListener('change', (e) => {
  const teamSel = e.target.closest('[data-team-switch]');
  if (teamSel) {
    closeSheet();
    switchTeam(teamSel.value);
    return;
  }
  const roleSel = e.target.closest('[data-member-role]');
  if (roleSel) {
    setMemberRole(roleSel.dataset.memberRole, roleSel.value);
    return;
  }
  const empSel = e.target.closest('[data-member-emp]');
  if (empSel) {
    setMemberEmp(empSel.dataset.memberEmp, empSel.value);
    return;
  }
});

/* Пока человек печатает в таблице, не перерисовываем экран —
   иначе слетает курсор. Отложенная отрисовка выполнится после выхода из поля. */
document.addEventListener('focusout', () => {
  setTimeout(() => {
    if (pendingRender && !isFinEditing()) render();
  }, 0);
});

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const kind = form.dataset.form;
  try {
    if (kind === 'shift') saveShiftFromForm(form);
    else if (kind === 'employee') saveEmployeeFromForm(form);
    else if (kind === 'settings') saveSettingsFromForm(form);
    else if (kind === 'finance-cols') saveFinanceFromForm(form);
    else if (kind === 'auth-login' || kind === 'auth-register' || kind === 'auth-reset') await handleAuthSubmit(kind, form);
    else if (kind === 'join-lookup') await handleJoinLookup(form);
    else if (kind === 'join-team') await confirmJoin();
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

  if (state.settings.firebase) {
    render();
    initCloud();
  } else {
    if (!state.team) {
      state.team = seedTeam();
      persist();
    }
    render();
    setSync('local');
    if (!state.settings.name) openWelcome();
  }

  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if (state.settings.theme === 'auto') applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
  }

  registerSW();
}

boot();
