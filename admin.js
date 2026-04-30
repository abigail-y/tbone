const SUPABASE_URL      = 'https://jojysnwoqbhdnocnipka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvanlzbndvcWJoZG5vY25pcGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjUyMjUsImV4cCI6MjA5MzE0MTIyNX0.IUumn_rCCpgVpllUhKBNT6qOKL0a_DssO8Qz1hFHq38';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAL_MONTHS  = ['2026-05','2026-06','2026-07','2026-08'];

let selectedMonths = new Set([4, 5, 6, 7]);
let calIdx         = 0;
let dateTotals     = {};
let dateNames      = {};  // iso -> [names]
let totalResponses = 0;
let selectedCell   = null;

// ─── Elements ─────────────────────────────────────────────────────────────────
const elTitle          = document.getElementById('input-title');
const elSubtitle       = document.getElementById('input-subtitle');
const elYear           = document.getElementById('input-year');
const elMonthGrid      = document.getElementById('month-grid');
const elOutputLink     = document.getElementById('output-link');
const elBtnCopy        = document.getElementById('btn-copy');
const elCopyConfirm    = document.getElementById('copy-confirm');
const elOpenPreview    = document.getElementById('open-preview');
const elBtnLoad        = document.getElementById('btn-load');
const elPlaceholder    = document.getElementById('results-placeholder');
const elResultsContent = document.getElementById('results-content');
const elStatResponses  = document.getElementById('stat-responses');
const elPersonList     = document.getElementById('person-list');
const elCalGrid        = document.getElementById('results-cal-grid');
const elCalTitle       = document.getElementById('cal-month-title');
const elCalPrev        = document.getElementById('cal-prev');
const elCalNext        = document.getElementById('cal-next');
const elDayDetail      = document.getElementById('day-detail');
const elDayDetailTitle = document.getElementById('day-detail-title');
const elDayDetailNames = document.getElementById('day-detail-names');
const elDayDetailClose = document.getElementById('day-detail-close');

// ─── Month pills ──────────────────────────────────────────────────────────────
function buildMonthGrid() {
  elMonthGrid.innerHTML = '';
  MONTH_NAMES.forEach((name, i) => {
    const pill = document.createElement('div');
    pill.className = 'month-pill' + (selectedMonths.has(i) ? ' selected' : '');
    pill.textContent = name;
    pill.addEventListener('click', () => {
      if (selectedMonths.has(i)) { selectedMonths.delete(i); pill.classList.remove('selected'); }
      else { selectedMonths.add(i); pill.classList.add('selected'); }
      updateLink();
    });
    elMonthGrid.appendChild(pill);
  });
}

// ─── Link ─────────────────────────────────────────────────────────────────────
function buildLink() {
  const year   = parseInt(elYear.value) || 2026;
  const months = Array.from(selectedMonths).sort((a,b)=>a-b).map(i=>`${year}-${String(i+1).padStart(2,'0')}`).join(',');
  const params = new URLSearchParams({ title: elTitle.value.trim()||'Availability', subtitle: elSubtitle.value.trim()||'', months: months||`${year}-06` });
  const base   = window.location.href.replace(/admin\.html.*$/, 'index.html');
  return `${base}?${params.toString()}`;
}

function updateLink() { const url = buildLink(); elOutputLink.value = url; elOpenPreview.href = url; }

elBtnCopy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(elOutputLink.value); } catch { elOutputLink.select(); document.execCommand('copy'); }
  elCopyConfirm.textContent = '✓ Link copied to clipboard!';
  setTimeout(() => { elCopyConfirm.textContent = ''; }, 2500);
});

[elTitle, elSubtitle, elYear].forEach(el => el.addEventListener('input', updateLink));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateShort(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTH_FULL[m-1]} ${d}, 2026`;
}

function formatSubmittedAt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return isNaN(d) ? '' : `Submitted ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function getInitials(name) {
  return String(name).trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
}

// ─── Day detail panel ─────────────────────────────────────────────────────────
function showDayDetail(iso, cell) {
  // Deselect previous
  if (selectedCell) selectedCell.classList.remove('selected-day');

  // If clicking same cell again, close
  if (selectedCell === cell) {
    selectedCell = null;
    elDayDetail.classList.remove('visible');
    return;
  }

  selectedCell = cell;
  cell.classList.add('selected-day');

  const names = dateNames[iso] || [];
  elDayDetailTitle.textContent = formatDateShort(iso);
  elDayDetailNames.innerHTML   = '';

  if (names.length === 0) {
    const empty = document.createElement('div');
    empty.className   = 'detail-empty';
    empty.textContent = 'Nobody selected this day.';
    elDayDetailNames.appendChild(empty);
  } else {
    names.forEach(name => {
      const row = document.createElement('div');
      row.className = 'detail-person';
      row.innerHTML = `
        <div class="detail-avatar">${getInitials(name)}</div>
        <div class="detail-name">${name}</div>
      `;
      elDayDetailNames.appendChild(row);
    });
  }

  elDayDetail.classList.add('visible');
}

elDayDetailClose.addEventListener('click', () => {
  if (selectedCell) { selectedCell.classList.remove('selected-day'); selectedCell = null; }
  elDayDetail.classList.remove('visible');
});

// ─── Calendar render ──────────────────────────────────────────────────────────
function renderCalendar() {
  const key    = CAL_MONTHS[calIdx];
  const [y, m] = key.split('-').map(Number);
  elCalTitle.textContent = `${MONTH_FULL[m-1]} ${y}`;
  elCalGrid.innerHTML    = '';

  // Close detail panel when switching months
  elDayDetail.classList.remove('visible');
  selectedCell = null;

  const startDow    = new Date(y, m-1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();

  for (let i = 0; i < startDow; i++) {
    const e = document.createElement('div');
    e.className = 'rcal-cell empty';
    elCalGrid.appendChild(e);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const iso   = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const count = dateTotals[iso] || 0;
    const cell  = document.createElement('div');

    let shade = 'shade-none';
    if (totalResponses > 0) {
      const ratio = count / totalResponses;
      if (ratio === 1)       shade = 'shade-all';
      else if (ratio >= 0.6) shade = 'shade-most';
      else if (ratio > 0)    shade = 'shade-some';
    }

    cell.className = `rcal-cell ${shade}`;

    const num = document.createElement('div');
    num.className   = 'rcal-num';
    num.textContent = d;
    cell.appendChild(num);

    if (count > 0) {
      const dots = document.createElement('div');
      dots.className = 'rcal-dots';
      for (let i = 0; i < Math.min(count, 6); i++) {
        const dot = document.createElement('div');
        dot.className = 'rcal-dot';
        dots.appendChild(dot);
      }
      cell.appendChild(dots);
    }

    cell.addEventListener('click', () => showDayDetail(iso, cell));
    elCalGrid.appendChild(cell);
  }

  elCalPrev.disabled = calIdx === 0;
  elCalNext.disabled = calIdx === CAL_MONTHS.length - 1;
}

elCalPrev.addEventListener('click', () => { if (calIdx > 0) { calIdx--; renderCalendar(); } });
elCalNext.addEventListener('click', () => { if (calIdx < CAL_MONTHS.length-1) { calIdx++; renderCalendar(); } });

// ─── Render results ───────────────────────────────────────────────────────────
function renderResults(rows) {
  if (!rows || rows.length === 0) {
    elPlaceholder.textContent = 'No responses yet — share the link and check back soon!';
    return;
  }

  dateTotals     = {};
  dateNames      = {};
  totalResponses = rows.length;

  const submissions = rows.map(row => {
    const days = row.available_days || [];
    days.forEach(iso => {
      dateTotals[iso] = (dateTotals[iso] || 0) + 1;
      if (!dateNames[iso]) dateNames[iso] = [];
      dateNames[iso].push(row.name);
    });
    return { name: row.name, submittedAt: row.submitted_at, availableDays: days };
  });

  // Stat
  elStatResponses.textContent = totalResponses;

  // Calendar
  calIdx = 0;
  renderCalendar();

  // People list sorted by most days
  const sortedPeople = [...submissions].sort((a,b) => b.availableDays.length - a.availableDays.length);
  elPersonList.innerHTML = '';
  sortedPeople.forEach((sub, idx) => {
    const isTop = idx === 0 && sub.availableDays.length > 0;
    const row   = document.createElement('div');
    row.className = 'person-row';
    row.innerHTML = `
      <div class="avatar${isTop?' top':''}">${getInitials(sub.name)}</div>
      <div class="person-info">
        <div class="person-name">${sub.name}</div>
        <div class="person-sub">${formatSubmittedAt(sub.submittedAt)}</div>
      </div>    `;
    elPersonList.appendChild(row);
  });

  elPlaceholder.style.display = 'none';
  elResultsContent.classList.add('visible');
}

// ─── Load from Supabase ───────────────────────────────────────────────────────
elBtnLoad.addEventListener('click', async () => {
  elBtnLoad.textContent       = 'Loading…';
  elBtnLoad.disabled          = true;
  elPlaceholder.textContent   = 'Fetching responses…';
  elPlaceholder.style.display = '';
  elResultsContent.classList.remove('visible');

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/responses?select=*&order=submitted_at.desc`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) throw new Error(await res.text());
    renderResults(await res.json());
  } catch (err) {
    console.error(err);
    elPlaceholder.textContent = 'Couldn\'t load results. Check your Supabase setup and try again.';
  } finally {
    elBtnLoad.textContent = 'Refresh';
    elBtnLoad.disabled    = false;
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
buildMonthGrid();
updateLink();