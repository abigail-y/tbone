const MONTH_NAMES = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
];

// Default to June, July, August (0-indexed)
let selectedMonths = new Set([5, 6, 7]);

// ─── Elements ─────────────────────────────────────────────────────────────────
const elTitle       = document.getElementById('input-title');
const elSubtitle    = document.getElementById('input-subtitle');
const elYear        = document.getElementById('input-year');
const elMonthGrid   = document.getElementById('month-grid');
const elOutputLink  = document.getElementById('output-link');
const elBtnCopy     = document.getElementById('btn-copy');
const elCopyConfirm = document.getElementById('copy-confirm');
const elOpenPreview = document.getElementById('open-preview');

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

  // Points to index.html in the same folder as admin.html
  const base = window.location.href.replace(/admin\.html.*$/, 'index.html');
  return `${base}?${params.toString()}`;
}

function updateLink() {
  const url = buildLink();
  elOutputLink.value = url;
  elOpenPreview.href = url;
}

// ─── Copy to clipboard ────────────────────────────────────────────────────────
elBtnCopy.addEventListener('click', async () => {
  const url = elOutputLink.value;
  if (!url) return;

  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Fallback for browsers without clipboard API
    elOutputLink.select();
    document.execCommand('copy');
  }

  elCopyConfirm.textContent = '✓ Link copied to clipboard!';
  setTimeout(() => { elCopyConfirm.textContent = ''; }, 2500);
});

// ─── Live update on any change ────────────────────────────────────────────────
[elTitle, elSubtitle, elYear].forEach(el => {
  el.addEventListener('input', updateLink);
});

// ─── Init ─────────────────────────────────────────────────────────────────────
buildMonthGrid();
updateLink();
