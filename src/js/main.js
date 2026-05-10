/* ============================================================
   VENI VIDI VIZ — main.js v3
   Scroll normale. Niente slide-mode, niente overlay card.
   ============================================================ */

/* ── Utilities ───────────────────────────────────────────── */
async function loadData(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) { console.error(`Failed to load ${path}:`, res.statusText); return []; }
    return parseCSV(await res.text());
  } catch (e) { console.error(`Error loading ${path}:`, e); return []; }
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = isNaN(vals[i]) ? vals[i] : Number(vals[i]); });
    return row;
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function formatNumber(n, d = 0) {
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}

/* ── Init ────────────────────────────────────────────────── */
async function init() {
  // Render charts
  if (document.getElementById('chart-1-1')) renderGdpLineChart('#chart-1-1');
  if (document.getElementById('chart-1-2')) await renderGdpMapChart('#chart-1-2');
  if (document.getElementById('chart-2-1')) renderDumbbellChart('#chart-2-1');

  initProgressBar();
  initFullscreenModal();
}

/* ── Progress Bar ────────────────────────────────────────── */
function initProgressBar() {
  const segments = document.querySelectorAll('.act-segment');
  if (!segments.length) return;

  // Click → scroll to act
  segments.forEach(seg => {
    seg.addEventListener('click', () => {
      const target = document.querySelector(seg.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Update active segment based on which act headers are above the fold
  function update() {
    const mid = window.scrollY + window.innerHeight / 2;
    let active = '1';
    document.querySelectorAll('[data-act]').forEach(el => {
      const act = el.dataset.act;
      if (act && act !== '0' && el.offsetTop <= mid) active = act;
    });
    segments.forEach(s => s.classList.toggle('is-active', s.dataset.act === active));
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ── Fullscreen Modal ────────────────────────────────────── */
function initFullscreenModal() {
  const modal = document.getElementById('fullscreenModal');
  const closeBtn = document.querySelector('.fullscreen-modal-close');
  const btns = document.querySelectorAll('.chart-fullscreen-btn');
  const container = document.getElementById('fullscreenChartContainer');
  if (!modal || !closeBtn || !btns.length) return;

  function close() {
    modal.classList.remove('is-active');
    container.innerHTML = '';
    document.body.style.overflow = '';
  }

  async function open(chartId) {
    modal.classList.add('is-active');
    document.body.style.overflow = 'hidden';
    container.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.id = `fullscreen-${chartId}`;
    wrap.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
    container.appendChild(wrap);

    try {
      if (chartId === 'chart-1-1') await renderGdpLineChart(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-1-2') await renderGdpMapChart(`#fullscreen-${chartId}`, 2023, true);
      else if (chartId === 'chart-2-1') await renderDumbbellChart(`#fullscreen-${chartId}`, true);
    } catch (e) {
      wrap.innerHTML = '<p style="color:#c00;padding:2rem;">Errore nel caricamento del grafico.</p>';
    }
  }

  btns.forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = (btn.dataset.target || '').replace(/^#/, '');
      if (id) open(id);
    });
  });

  closeBtn.addEventListener('click', e => { e.stopPropagation(); close(); });
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

document.addEventListener('DOMContentLoaded', init);
