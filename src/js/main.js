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
  if (document.getElementById('chart-1-1')) await renderGdpLineChart('#chart-1-1');
  if (document.getElementById('chart-1-2')) await renderGdpMapChart('#chart-1-2');
  if (document.getElementById('chart-2-1')) await renderDumbbellChart('#chart-2-1');
  if (document.getElementById('chart-3-1')) await renderEduTreemap('#chart-3-1');
  if (document.getElementById('chart-3-2')) await renderCompletionWaffle('#chart-3-2');
  if (document.getElementById('chart-3-3')) await renderLiteracySlope('#chart-3-3');
  if (document.getElementById('chart-4-1')) await renderChildLaborBubble('#chart-4-1');
  if (document.getElementById('chart-4-2')) await renderMarriageSankey('#chart-4-2');
  if (document.getElementById('chart-4-3')) await renderTrendsMultimode('#chart-4-3');
  if (document.getElementById('chart-5-1')) await renderMigrationChord('#chart-5-1');

  initProgressBar();
  initFullscreenModal();
  initNarrativeCards();
}

/* ── Narrative Cards ─────────────────────────────────────── */
function triggerChartState(chartId, state) {
  if (chartId === 'chart-1-1') {
    const el = document.getElementById('chart-1-1');
    if (!el || !el._gdpHighlightContinents) return;
    const highlights = [null, ['Europe'], ['Africa']];
    el._gdpHighlightContinents(highlights[state] ?? null);
  }

  if (chartId === 'chart-1-2') {
    const el = document.getElementById('chart-1-2');
    if (!el) return;
    if (el._gdpClearAnimation) el._gdpClearAnimation();
    const years = [2000, 2010, 2024];
    if (el._gdpUpdate) el._gdpUpdate(years[state] ?? 2024);
    // Zoom to region of interest
    if (state === 1 && el._gdpZoomToAsia) el._gdpZoomToAsia();
    else if (el._gdpZoomToWorld) el._gdpZoomToWorld();
  }

  if (chartId === 'chart-2-1') {
    const el = document.getElementById('chart-2-1');
    if (!el) return;
    if (state === 1 && el._dumbbellDrillDown) el._dumbbellDrillDown('Africa');
    else if (el._dumbbellShowOverview) el._dumbbellShowOverview();
  }

  if (chartId === 'chart-3-1') {
    const el = document.getElementById('chart-3-1');
    if (!el) return;
    if (state === 0 && el._treemapReset) el._treemapReset();
    else if (state === 1 && el._treemapHighlight) el._treemapHighlight('Europe');
    else if (state === 2 && el._treemapHighlight) el._treemapHighlight('Africa');
  }

  if (chartId === 'chart-3-2') {
    const el = document.getElementById('chart-3-2');
    if (!el) return;
    if (state === 0 && el._waffleShowAll) el._waffleShowAll();
    else if (state === 1 && el._waffleHighlightPair) el._waffleHighlightPair('Africa', 'Europe');
    else if (state === 2 && el._waffleShowAll) el._waffleShowAll();
  }

  if (chartId === 'chart-3-3') {
    const el = document.getElementById('chart-3-3');
    if (!el) return;
    if (state === 0 && el._slopeShowAll) el._slopeShowAll();
    else if (state === 1 && el._slopeHighlightProgress) el._slopeHighlightProgress();
    else if (state === 2 && el._slopeEnableControls) el._slopeEnableControls();
  }

  if (chartId === 'chart-4-1') {
    const el = document.getElementById('chart-4-1');
    if (!el) return;
    if (state === 0 && el._bubbleReset) el._bubbleReset();
    else if (state === 1 && el._bubbleHighlightContinent) el._bubbleHighlightContinent('Africa');
    else if (state === 2 && el._bubbleReset) el._bubbleReset();
  }

  if (chartId === 'chart-4-2') {
    const el = document.getElementById('chart-4-2');
    if (!el) return;
    if (state === 0 && el._sankeyReset) el._sankeyReset();
    else if (state === 1 && el._sankeyHighlight) el._sankeyHighlight(['Sub-Saharan Africa', 'Central and Southern Asia']);
    else if (state === 2 && el._sankeyReset) el._sankeyReset();
  }

  if (chartId === 'chart-4-3') {
    const el = document.getElementById('chart-4-3');
    if (!el) return;
    if (state === 0 && el._trendsShowAll) el._trendsShowAll();
    else if (state === 1 && el._trendsHighlightIndicator) el._trendsHighlightIndicator('child_marriage');
    else if (state === 2 && el._trendsActivateToggle) el._trendsActivateToggle();
  }

  if (chartId === 'chart-5-1') {
    const el = document.getElementById('chart-5-1');
    if (!el) return;
    if (state === 0 && el._migrationShowYear) el._migrationShowYear(2024);
    else if (state === 1 && el._migrationAnimate) el._migrationAnimate();
    else if (state === 2 && el._migrationHighlight) el._migrationHighlight(['Africa', 'Asia']);
  }
}

function initNarrativeCards() {
  const cards = document.querySelectorAll('.narrative-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const chartId = card.dataset.chart;
      const state = parseInt(card.dataset.state, 10);

      // Deactivate sibling cards, activate this one
      document.querySelectorAll(`.narrative-card[data-chart="${chartId}"]`)
        .forEach(c => c.classList.remove('is-active'));
      card.classList.add('is-active');

      triggerChartState(chartId, state);
    });
  });
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
      else if (chartId === 'chart-3-1') await renderEduTreemap(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-3-2') await renderCompletionWaffle(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-3-3') await renderLiteracySlope(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-4-1') await renderChildLaborBubble(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-4-2') await renderMarriageSankey(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-4-3') await renderTrendsMultimode(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-5-1') await renderMigrationChord(`#fullscreen-${chartId}`, true);
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
