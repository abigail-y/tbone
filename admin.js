const SUPABASE_URL     = 'https://jojysnwoqbhdnocnipka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvanlzbndvcWJoZG5vY25pcGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjUyMjUsImV4cCI6MjA5MzE0MTIyNX0.IUumn_rCCpgVpllUhKBNT6qOKL0a_DssO8Qz1hFHq38';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let selectedMonths = new Set([4, 5, 6, 7]);

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
const elStatBestDay    = document.getElementById('stat-best-day');
const elStatOverlap    = document.getElementById('stat-overlap');
const elBarList        = document.getElementById('bar-list');
const elPersonList     = document.getElementById('person-list');

// ─── Month pills ──────────────────────────────────────────────────────────────
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

// ─── Link generation ──────────────────────────────────────────────────────────
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

// ─── Copy ─────────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateShort(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}`;
}

function formatSubmittedAt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  return `Submitted ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function getInitials(name) {
  return String(name).trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderResults(rows) {
  if (!rows || rows.length === 0) {
    elPlaceholder.textContent = 'No responses yet — share the link and check back soon!';
    return;
  }

  // Build date totals
  const dateTotals = {};
  const submissions = rows.map(row => {
    const days = row.available_days || [];
    days.forEach(iso => {
      dateTotals[iso] = (dateTotals[iso] || 0) + 1;
    });
    return { name: row.name, submittedAt: row.submitted_at, availableDays: days };
  });

  const sorted       = Object.entries(dateTotals).sort((a, b) => b[1] - a[1]);
  const totalRes     = submissions.length;
  const bestDay      = sorted[0] ? formatDateShort(sorted[0][0]) : '—';
  const topCount     = sorted[0] ? sorted[0][1] : 0;

  // Stats
  elStatResponses.textContent = totalRes;
  elStatBestDay.textContent   = bestDay;
  elStatOverlap.textContent   = topCount > 0 ? `${topCount}/${totalRes}` : '—';

  // Bar chart — top 8
  const maxCount = topCount || 1;
  elBarList.innerHTML = '';
  sorted.slice(0, 8).forEach(([iso, count], idx) => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-date">${formatDateShort(iso)}</div>
      <div class="bar-track">
        <div class="bar-fill${idx === 0 ? ' top' : ''}" style="width:${Math.round((count / maxCount) * 100)}%"></div>
      </div>
      <div class="bar-count">${count}</div>
    `;
    elBarList.appendChild(row);
  });

  // People list — sorted by most days selected
  elPersonList.innerHTML = '';
  const sortedPeople = [...submissions].sort((a, b) => b.availableDays.length - a.availableDays.length);
  sortedPeople.forEach((sub, idx) => {
    const isTop  = idx === 0 && sub.availableDays.length > 0;
    const isZero = sub.availableDays.length === 0;
    const row    = document.createElement('div');
    row.className = 'person-row';
    row.innerHTML = `
      <div class="avatar${isTop ? ' top' : ''}">${getInitials(sub.name)}</div>
      <div class="person-info">
        <div class="person-name">${sub.name}</div>
        <div class="person-sub">${formatSubmittedAt(sub.submittedAt)}</div>
      </div>
      <div class="person-badge${isZero ? ' zero' : ''}">
        ${sub.availableDays.length} day${sub.availableDays.length !== 1 ? 's' : ''}
      </div>
    `;
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
      headers: {
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    renderResults(rows);
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