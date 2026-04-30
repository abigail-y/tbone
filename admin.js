const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxIphldN8swI1SKbZ6XSKkNEMTQeIYStpdQlxswf8kUUMB1GfxA2Yerymzkwfdm_fhwEw/exec';

const MONTH_NAMES = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
];

const MONTH_NAMES_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
];

let selectedMonths = new Set([4, 5, 6, 7]);

const elTitle           = document.getElementById('input-title');
const elSubtitle        = document.getElementById('input-subtitle');
const elYear            = document.getElementById('input-year');
const elMonthGrid       = document.getElementById('month-grid');
const elOutputLink      = document.getElementById('output-link');
const elBtnCopy         = document.getElementById('btn-copy');
const elCopyConfirm     = document.getElementById('copy-confirm');
const elOpenPreview     = document.getElementById('open-preview');
const elBtnLoad         = document.getElementById('btn-load');
const elPlaceholder     = document.getElementById('results-placeholder');
const elResultsContent  = document.getElementById('results-content');
const elStatResponses   = document.getElementById('stat-responses');
const elStatBestDay     = document.getElementById('stat-best-day');
const elStatOverlap     = document.getElementById('stat-overlap');
const elBarList         = document.getElementById('bar-list');
const elPersonList      = document.getElementById('person-list');

function buildMonthGrid() {
  elMonthGrid.innerHTML = '';
  MONTH_NAMES.forEach((name, i) => {
    const pill = document.createElement('div');
    pill.className = 'month-pill' + (selectedMonths.has(i) ? ' selected' : '');
    pill.textContent = name;
    pill.addEventListener('click', () => {
      if (selectedMonths.has(i)) {
        selectedMonths.delete(i);
        pill.classList.remove('selected');
      } else {
        selectedMonths.add(i);
        pill.classList.add('selected');
      }
      updateLink();
    });
    elMonthGrid.appendChild(pill);
  });
}


function buildLink() {
  const year = parseInt(elYear.value) || 2026;
  const months = Array.from(selectedMonths)
    .sort((a, b) => a - b)
    .map(i => `${year}-${String(i + 1).padStart(2, '0')}`)
    .join(',');

  const params = new URLSearchParams({
    title:    elTitle.value.trim()    || 'Availability',
    subtitle: elSubtitle.value.trim() || '',
    months:   months || `${year}-06`,
  });

  const base = window.location.href.replace(/admin\.html.*$/, 'index.html');
  return `${base}?${params.toString()}`;
}

function updateLink() {
  const url = buildLink();
  elOutputLink.value = url;
  elOpenPreview.href = url;
}

elBtnCopy.addEventListener('click', async () => {
  const url = elOutputLink.value;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    elOutputLink.select();
    document.execCommand('copy');
  }
  elCopyConfirm.textContent = '✓ Link copied to clipboard!';
  setTimeout(() => { elCopyConfirm.textContent = ''; }, 2500);
});

[elTitle, elSubtitle, elYear].forEach(el => el.addEventListener('input', updateLink));

function formatDateShort(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTH_NAMES_SHORT[m - 1]} ${d}`;
}

function getInitials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function renderResults(data) {
  const { submissions, dateTotals } = data;

  if (!submissions || submissions.length === 0) {
    elPlaceholder.textContent = 'No responses yet — share the link and check back soon!';
    return;
  }

  // Sort dates by count descending
  const sorted = Object.entries(dateTotals)
    .sort((a, b) => b[1] - a[1]);

  const totalResponses = submissions.length;
  const bestDay = sorted[0] ? formatDateShort(sorted[0][0]) : '—';
  const topCount = sorted[0] ? sorted[0][1] : 0;
  const maxPossible = totalResponses;

  // Stats
  elStatResponses.textContent = totalResponses;
  elStatBestDay.textContent   = bestDay;
  elStatOverlap.textContent   = topCount > 0 ? `${topCount}/${maxPossible}` : '—';

  // Bar chart — top 8 days
  const maxCount = topCount || 1;
  elBarList.innerHTML = '';
  sorted.slice(0, 8).forEach(([iso, count]) => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-date">${formatDateShort(iso)}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${Math.round((count / maxCount) * 100)}%"></div>
      </div>
      <div class="bar-count">${count}</div>
    `;
    elBarList.appendChild(row);
  });

  // People list
  elPersonList.innerHTML = '';
  submissions.forEach(sub => {
    const row = document.createElement('div');
    row.className = 'person-row';
    row.innerHTML = `
      <div class="avatar">${getInitials(sub.name)}</div>
      <div class="person-name">${sub.name}</div>
      <div class="person-days">${sub.availableDays.length} day${sub.availableDays.length !== 1 ? 's' : ''} selected</div>
    `;
    elPersonList.appendChild(row);
  });

  // Show content
  elPlaceholder.style.display = 'none';
  elResultsContent.classList.add('visible');
}

elBtnLoad.addEventListener('click', async () => {
  elBtnLoad.textContent = 'Loading…';
  elBtnLoad.disabled = true;
  elPlaceholder.textContent = 'Fetching responses…';
  elPlaceholder.style.display = '';
  elResultsContent.classList.remove('visible');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(`${SCRIPT_URL}?action=getAll`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Bad response (not JSON): ${text.slice(0, 120)}`);
    }
    renderResults(data);
  } catch (err) {
    clearTimeout(timeout);
    elPlaceholder.style.display = '';
    elResultsContent.classList.remove('visible');
    if (err.name === 'AbortError') {
      elPlaceholder.textContent = 'Timed out after 20 s — Apps Script may be on a cold start. Wait a moment and try again.';
    } else {
      elPlaceholder.textContent = `Couldn't load results: ${err.message}`;
    }
  } finally {
    elBtnLoad.textContent = 'Refresh';
    elBtnLoad.disabled = false;
  }
});

buildMonthGrid();
updateLink();
