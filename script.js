// ─── Replace this with your deployed Google Apps Script URL ───────────────────
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw4cIKrOTYE7F4SieKSSd12MECPZgfbWCqRfFwOXLrN6XHXHVw0miRSOiSsbtdlz-J2lQ/exec';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const DAY_HEADERS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const DEFAULT_MONTHS = ['2026-05','2026-06','2026-07','2026-08'];

let userName    = '';
let selectedDays = new Set();  // stores "YYYY-MM-DD"
let config      = {};

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

function readConfig() {
  const p = new URLSearchParams(window.location.search);
  return {
    title:    p.get('title')    || 'Summer 2026 Availability',
    subtitle: p.get('subtitle') || 'Availability Survey',
    months:   p.get('months')   ? p.get('months').split(',') : DEFAULT_MONTHS,
  };
}

function applyConfig() {
  document.getElementById('page-title').textContent = config.title;
  elFormTitle.textContent    = config.title;
  elFormSubtitle.textContent = config.subtitle;
}

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
    selectedDays = new Set();
  } finally {
    hideLoading();
  }

  elCalGreeting.textContent = `Hola! Click all the days you're free and around UCF.`;
  renderCalendars();
  showScreen(elScreenCalendar);
}

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

  const title = document.createElement('div');
  title.className = 'month-title';
  title.textContent = `${MONTH_NAMES[month - 1]} ${year}`;
  block.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'cal-grid';

  DAY_HEADERS.forEach(d => {
    const h = document.createElement('div');
    h.className = 'day-header';
    h.textContent = d;
    grid.appendChild(h);
  });

  const startDow = new Date(year, month - 1, 1).getDay();
  for (let i = 0; i < startDow; i++) {
    const empty = document.createElement('div');
    empty.className = 'day-cell empty';
    grid.appendChild(empty);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.textContent = d;

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

elBtnSubmit.addEventListener('click', handleSubmit);

async function handleSubmit() {
  showLoading();
  try {
    await submitToSheets({
      name: userName,
      submittedAt: new Date().toISOString(),
      availableDays: Array.from(selectedDays).sort(),
    });

    elConfirmText.textContent = `Thanks!`;
    showScreen(elScreenConfirm);
  } catch {
    alert('Something went wrong. Try again.');
  } finally {
    hideLoading();
  }
}

elBtnEdit.addEventListener('click', () => {
  renderCalendars();
  showScreen(elScreenCalendar);
});

async function submitToSheets(data) {
  const params = new URLSearchParams({
    action:      'submit',
    name:        data.name,
    submittedAt: data.submittedAt,
    days:        data.availableDays.join(','),
  });

  await fetch(`${SCRIPT_URL}?${params}`, { mode: 'no-cors' });
}

config = readConfig();
applyConfig();