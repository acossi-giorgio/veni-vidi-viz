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
  if (document.getElementById('chart-1-1')) await renderChoroplethMulti('#chart-1-1');
  if (document.getElementById('chart-1-2')) await renderGapminderBubble('#chart-1-2');
  if (document.getElementById('chart-2-1')) await renderMpiBreakdown('#chart-2-1');
  if (document.getElementById('chart-3-1')) await renderEduTreemap('#chart-3-1');
  if (document.getElementById('chart-3-2')) await renderQualityScatter('#chart-3-2');
  if (document.getElementById('chart-3-3')) await renderExclusionChart('#chart-3-3');
  if (document.getElementById('chart-4-1')) await renderChildLaborBubble('#chart-4-1');
  if (document.getElementById('chart-4-2')) await renderMarriageChart('#chart-4-2');
  if (document.getElementById('chart-4-3')) await renderMortalityChart('#chart-4-3');
  if (document.getElementById('chart-5-1')) await renderMigrationChord('#chart-5-1');
  // if (document.getElementById('chart-5-2')) await renderRemittancesChart('#chart-5-2');

  initProgressBar();
  initMobilePlaceholders();
  initFullscreenModal();
  initNarrativeCards();
}

/* ── Narrative Cards ─────────────────────────────────────── */
function triggerChartState(chartId, state, targetEl = null) {
  window._chartStates = window._chartStates || {};
  window._chartStates[chartId] = state;

  const el = targetEl || document.getElementById(chartId);
  if (!el) return;

  if (chartId === 'chart-1-1') {
    if (state === 0 && el._choroplethReset) el._choroplethReset();
    else if (state === 1 && el._choroplethSetMetric) el._choroplethSetMetric('life_expectancy');
    else if (state === 2 && el._choroplethSetMetric) el._choroplethSetMetric('poverty');
  }

  if (chartId === 'chart-1-2') {
    if (state === 0 && el._gapminderReset) el._gapminderReset();
    else if (state === 1 && el._gapminderAnimate) el._gapminderAnimate();
    else if (state === 2 && el._gapminderSwitchY) el._gapminderSwitchY('mpi');
  }

  if (chartId === 'chart-2-1') {
    if (state === 0 && el._mpiReset) el._mpiReset();
    else if (state === 1 && el._mpiFilterContinent) el._mpiFilterContinent('Africa');
    else if (state === 2 && el._mpiFilterContinent) el._mpiFilterContinent('Europe');
  }

  if (chartId === 'chart-3-1') {
    if (state === 0 && el._treemapReset) el._treemapReset();
    else if (state === 1 && el._treemapHighlight) el._treemapHighlight('Europe');
    else if (state === 2 && el._treemapHighlight) el._treemapHighlight('Africa');
  }

  if (chartId === 'chart-3-2') {
    if (state === 0 && el._bumpReset) el._bumpReset();
    else if (state === 1 && el._bumpHighlightAfrica) el._bumpHighlightAfrica();
    else if (state === 2 && el._bumpHighlightEurope) el._bumpHighlightEurope();
  }

  if (chartId === 'chart-3-3') {
    if (state === 0 && el._exclusionShowBase) el._exclusionShowBase();
    else if (state === 1 && el._exclusionOverlayGPI) el._exclusionOverlayGPI();
    else if (state === 2 && el._exclusionShowTrend) el._exclusionShowTrend();
  }

  if (chartId === 'chart-4-1') {
    if (state === 0 && el._bubbleReset) el._bubbleReset();
    else if (state === 1 && el._bubbleHighlightContinent) el._bubbleHighlightContinent('Africa');
    else if (state === 2 && el._bubbleReset) el._bubbleReset();
  }

  if (chartId === 'chart-4-2') {
    if (state === 0 && el._marriageReset) el._marriageReset();
    else if (state === 1 && el._marriageHighlight) el._marriageHighlight('Africa');
    else if (state === 2 && el._marriageShowTrend) el._marriageShowTrend();
  }

  if (chartId === 'chart-4-3') {
    if (state === 0 && el._mortalityScatter) el._mortalityScatter();
    else if (state === 1 && el._mortalityHighlightMarriage) el._mortalityHighlightMarriage();
    else if (state === 2 && el._mortalitySlope) el._mortalitySlope();
  }

  if (chartId === 'chart-5-1') {
    if (state === 0 && el._migrationShowYear) el._migrationShowYear(2020);
    else if (state === 1 && el._migrationAnimate) el._migrationAnimate();
    else if (state === 2 && el._migrationShowMap) el._migrationShowMap();
  }
}

function initNarrativeCards() {
  const cards = document.querySelectorAll('.narrative-card');
  const activate = (card) => {
    const chartId = card.dataset.chart;
    const state = parseInt(card.dataset.state, 10);
    document.querySelectorAll(`.narrative-card[data-chart="${chartId}"]`)
      .forEach(c => c.classList.remove('is-active'));
    card.classList.add('is-active');
    triggerChartState(chartId, state);
  };
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => activate(card));
    card.addEventListener('click', () => activate(card));
  });
}

/* ── Mobile Placeholders ─────────────────────────────────── */
function initMobilePlaceholders() {
  document.querySelectorAll('.chart-box').forEach(box => {
    const chartDiv = box.querySelector('div[id^="chart-"]');
    if (!chartDiv || box.querySelector('.chart-mobile-placeholder')) return;

    const ph = document.createElement('div');
    ph.className = 'chart-mobile-placeholder';
    ph.dataset.target = '#' + chartDiv.id;
    ph.setAttribute('role', 'button');
    ph.setAttribute('tabindex', '0');
    ph.setAttribute('aria-label', 'Apri grafico interattivo a schermo intero');
    ph.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" fill="none"/><path d="M2 12h20M12 2v20" stroke="currentColor" stroke-dasharray="4 3"/></svg>
      <span class="chart-mobile-placeholder-title">Grafico interattivo</span>
      <span class="chart-mobile-placeholder-hint">Tocca per esplorare a schermo intero</span>
    `;
    ph.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        ph.click();
      }
    });
    box.appendChild(ph);
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
  const container = document.getElementById('fullscreenChartContainer');
  if (!modal || !closeBtn || !container) return;

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
      if (chartId === 'chart-1-1') await renderChoroplethMulti(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-1-2') await renderGapminderBubble(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-2-1') await renderMpiBreakdown(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-3-1') await renderEduTreemap(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-3-2') await renderQualityScatter(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-3-3') await renderExclusionChart(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-4-1') await renderChildLaborBubble(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-4-2') await renderMarriageChart(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-4-3') await renderMortalityChart(`#fullscreen-${chartId}`, true);
      else if (chartId === 'chart-5-1') await renderMigrationChord(`#fullscreen-${chartId}`, true);
      // else if (chartId === 'chart-5-2') await renderRemittancesChart(`#fullscreen-${chartId}`, true);
    } catch (e) {
      wrap.innerHTML = '<p style="color:#c00;padding:2rem;">Errore nel caricamento del grafico.</p>';
    }

    // Apply the last selected narrative state (if any) to the fullscreen chart
    const savedState = window._chartStates?.[chartId] ?? 0;
    const fsEl = document.getElementById(`fullscreen-${chartId}`);
    if (fsEl) triggerChartState(chartId, savedState, fsEl);
  }

  // Event delegation: handles both inline fullscreen buttons and mobile placeholders
  document.addEventListener('click', e => {
    const trigger = e.target.closest('.chart-fullscreen-btn, .chart-mobile-placeholder');
    if (!trigger) return;
    e.stopPropagation();
    const id = (trigger.dataset.target || '').replace(/^#/, '');
    if (id) open(id);
  });

  closeBtn.addEventListener('click', e => { e.stopPropagation(); close(); });
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

document.addEventListener('DOMContentLoaded', init);
