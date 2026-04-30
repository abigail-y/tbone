// ─── Replace this with your deployed Google Apps Script URL ───────────────────
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz0Lq93b7pxd-a8-RqdIqWpv6W66k1KyKxdhtK57cJMASNcSML8vp-g6XhgIyLwedr1fA/exec';


const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const DAY_HEADERS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// Default months shown if no URL params are set (admin overrides these)
const DEFAULT_MONTHS = ['2026-06','2026-07','2026-08'];

// ─── State ────────────────────────────────────────────────────────────────────
let userName    = '';
let selectedDays = new Set();  // stores date strings like "2026-06-15"
let config      = {};

// ─── Elements ─────────────────────────────────────────────────────────────────
const elLoading        = document.getElementById('loading');
const elScreenName     = document.getElementById('screen-name');
const elScreenCalendar = document.getElementById('screen-calendar');
const elScreenConfirm  = document.getElementById('screen-confirm');
const elFormTitle      = document.getElementById('form-title');
const elFormSubtitle   = document.getElementById('form-subtitle');
const elNameInput      = document.getElementById('name-input');
const elNameError      = document.getElementById('name-error');
const elBtnContinue    = document.getElementById('btn-continue');
const elCalGreeting    = document.getElementById('cal-greeting');
const elMonthsContainer= document.getElementById('months-container');
const elBtnSubmit      = document.getElementById('btn-submit');
const elConfirmText    = document.getElementById('confirm-text');
const elBtnEdit        = document.getElementById('btn-edit');

// ─── Config ───────────────────────────────────────────────────────────────────
function readConfig() {
  const p = new URLSearchParams(window.location.search);
  return {
    title:    p.get('title')    || 'Summer 2026 Availability',
    subtitle: p.get('subtitle') || 'Availability Survey for bone activities hehehe.',
    months:   p.get('months')   ? p.get('months').split(',') : DEFAULT_MONTHS,
  };
}

function applyConfig() {
  document.getElementById('page-title').textContent = config.title;
  elFormTitle.textContent    = config.title;
  elFormSubtitle.textContent = config.subtitle;
}

// ─── Screen helpers ───────────────────────────────────────────────────────────
function showScreen(screen) {
  [elScreenName, elScreenCalendar, elScreenConfirm].forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('active');
  });
  screen.classList.remove('hidden');
  screen.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showLoading()  { elLoading.classList.remove('hidden'); }
function hideLoading()  { elLoading.classList.add('hidden');    }

// ─── Name screen ──────────────────────────────────────────────────────────────
elBtnContinue.addEventListener('click', handleContinue);
elNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleContinue(); });

async function handleContinue() {
  const name = elNameInput.value.trim();
  if (!name) {
    elNameError.classList.remove('hidden');
    elNameInput.focus();
    return;
  }
  elNameError.classList.add('hidden');
  userName = name;

  showLoading();
  try {
    const existing = await fetchExistingSubmission(name);
    if (existing?.availableDays?.length) {
      selectedDays = new Set(existing.availableDays);
    }
  } catch {
    // Network issue or script not yet connected — continue with empty selection
  } finally {
    hideLoading();
  }

  elCalGreeting.textContent = `Hola! Por favor, click all the days you're free and around UCF. hehehe`;
  renderCalendars();
  showScreen(elScreenCalendar);
}

// ─── Calendar rendering ───────────────────────────────────────────────────────
function renderCalendars() {
  elMonthsContainer.innerHTML = '';
  config.months.forEach(monthStr => {
    const [year, month] = monthStr.split('-').map(Number);
    elMonthsContainer.appendChild(buildMonthBlock(year, month));
  });
}

function buildMonthBlock(year, month) {
  const block = document.createElement('div');
  block.className = 'month-block';

  // Title
  const title = document.createElement('div');
  title.className = 'month-title';
  title.textContent = `${MONTH_NAMES[month - 1]} ${year}`;
  block.appendChild(title);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'cal-grid';

  // Day-of-week headers
  DAY_HEADERS.forEach(d => {
    const h = document.createElement('div');
    h.className = 'day-header';
    h.textContent = d;
    grid.appendChild(h);
  });

  // Empty filler cells before the 1st
  const startDow = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  for (let i = 0; i < startDow; i++) {
    const empty = document.createElement('div');
    empty.className = 'day-cell empty';
    grid.appendChild(empty);
  }

  // Day cells
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.textContent = d;
    cell.dataset.date = dateStr;

    if (selectedDays.has(dateStr)) cell.classList.add('selected');

    cell.addEventListener('click', () => toggleDay(cell, dateStr));
    grid.appendChild(cell);
  }

  block.appendChild(grid);
  return block;
}

function toggleDay(cell, dateStr) {
  if (selectedDays.has(dateStr)) {
    selectedDays.delete(dateStr);
    cell.classList.remove('selected');
  } else {
    selectedDays.add(dateStr);
    cell.classList.add('selected');
  }
}

// ─── Submit ───────────────────────────────────────────────────────────────────
elBtnSubmit.addEventListener('click', handleSubmit);

async function handleSubmit() {
  showLoading();
  try {
    await submitToSheets({
      name:         userName,
      submittedAt:  new Date().toISOString(),
      availableDays: Array.from(selectedDays).sort(),
    });
    elConfirmText.textContent = `Thanks, ${userName}! muahaha.`;
    showScreen(elScreenConfirm);
  } catch {
    alert('Something went wrong. oops try again bruh');
  } finally {
    hideLoading();
  }
}

// ─── Edit ─────────────────────────────────────────────────────────────────────
elBtnEdit.addEventListener('click', () => {
  renderCalendars();   // re-renders with selectedDays still in memory
  showScreen(elScreenCalendar);
});

// ─── Google Sheets fetch calls ────────────────────────────────────────────────
// No Content-Type header on POST → browser sends as text/plain (simple request,
// no CORS preflight). Apps Script redirects to googleusercontent.com which
// returns proper CORS headers, so redirect:'follow' lets us read the response.

async function fetchExistingSubmission(name) {
  const url = `${SCRIPT_URL}?action=get&name=${encodeURIComponent(name)}`;
  const res  = await fetch(url, { redirect: 'follow' });
  if (!res.ok) return null;
  return res.json();
}

async function submitToSheets(data) {
  await fetch(SCRIPT_URL, {
    method:   'POST',
    redirect: 'follow',
    body:     JSON.stringify(data),   // no Content-Type → simple request
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
config = readConfig();
applyConfig();
