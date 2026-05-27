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

function getNarrativeCards(chartId) {
  return Array.from(document.querySelectorAll(`.narrative-card[data-chart="${chartId}"]`));
}

function getActiveNarrativeCard(chartId) {
  return document.querySelector(`.narrative-card[data-chart="${chartId}"].is-active`)
    || getNarrativeCards(chartId)[0]
    || null;
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 760px), (pointer: coarse) and (max-height: 500px) and (orientation: landscape)').matches;
}

function isMobilePortraitViewport() {
  return isMobileViewport() && window.innerHeight > window.innerWidth;
}

const MOBILE_ROTATED_CHARTS = new Set([
  'chart-1-1', // choropleth + controls
  'chart-4-2', // map / regional trend hybrid
  'chart-5-1', // chord / migration flows
]);

function shouldRotateMobileChart(chartId) {
  return MOBILE_ROTATED_CHARTS.has(chartId);
}

function syncMobilePlaceholder(chartId) {
  const chartEl = document.getElementById(chartId);
  if (!chartEl) return;

  const placeholder = chartEl.closest('.chart-box')?.querySelector('.chart-mobile-placeholder');
  if (!placeholder) return;

  const activeCard = getActiveNarrativeCard(chartId);
  const stateEl = placeholder.querySelector('.chart-mobile-placeholder-state');
  const hintEl = placeholder.querySelector('.chart-mobile-placeholder-hint');
  const rotateEl = placeholder.querySelector('.chart-mobile-placeholder-rotate');
  const title = activeCard?.querySelector('h3')?.textContent?.trim() || 'Vista iniziale';
  const needsRotate = shouldRotateMobileChart(chartId);

  placeholder.dataset.hasSelection = activeCard ? 'true' : 'false';
  placeholder.dataset.needsRotate = needsRotate ? 'true' : 'false';
  if (stateEl) stateEl.textContent = title;
  placeholder.setAttribute('aria-label', `Apri il grafico interattivo nella vista "${title}"`);
  if (hintEl) {
    hintEl.textContent = isMobileViewport()
      ? (needsRotate ? 'Tocca per aprire il grafico' : 'Tocca per aprire il grafico a schermo intero')
      : 'Apri il grafico';
  }
  if (rotateEl) {
    rotateEl.textContent = 'Questo grafico rende meglio in orizzontale. Se puoi, ruota il telefono prima di aprirlo.';
  }
}

function updateFullscreenModalMeta(chartId) {
  const titleEl = document.getElementById('fullscreenModalTitle');
  const kickerEl = document.getElementById('fullscreenModalKicker');
  const hintEl = document.getElementById('fullscreenModalHint');
  if (!titleEl || !kickerEl || !hintEl) return;

  const activeCard = getActiveNarrativeCard(chartId);
  const section = activeCard?.closest('section[data-act]');
  const act = section?.dataset.act;

  kickerEl.textContent = act ? `Atto ${act}` : 'Grafico interattivo';
  titleEl.textContent = activeCard?.querySelector('h3')?.textContent?.trim() || 'Grafico interattivo';
  hintEl.textContent = 'Vista attiva selezionata dalle card narrative. Usa filtri, slider e tooltip del grafico per approfondire.';
}

function syncAllMobilePlaceholders() {
  const chartIds = new Set(
    Array.from(document.querySelectorAll('.narrative-card[data-chart]')).map(card => card.dataset.chart)
  );
  chartIds.forEach(syncMobilePlaceholder);
}

let inlineChartsInitialized = false;
let inlineChartsRendering = false;

async function renderInlineChartsIfNeeded() {
  if (inlineChartsInitialized || inlineChartsRendering) return;
  if (isMobileViewport()) return;

  inlineChartsRendering = true;

  const renderSteps = [
    ['chart-1-1', () => renderChoroplethMulti('#chart-1-1')],
    ['chart-1-2', () => renderGapminderBubble('#chart-1-2')],
    ['chart-2-1', () => renderMpiBreakdown('#chart-2-1')],
    ['chart-3-1', () => renderEduTreemap('#chart-3-1')],
    ['chart-3-2', () => renderQualityScatter('#chart-3-2')],
    ['chart-3-3', () => renderExclusionChart('#chart-3-3')],
    ['chart-4-1', () => renderChildLaborBubble('#chart-4-1')],
    ['chart-4-2', () => renderMarriageChart('#chart-4-2')],
    ['chart-4-3', () => renderMortalityChart('#chart-4-3')],
    ['chart-5-1', () => renderMigrationChord('#chart-5-1')],
    // ['chart-5-2', () => renderRemittancesChart('#chart-5-2')],
  ];

  try {
    for (const [chartId, renderFn] of renderSteps) {
      if (!document.getElementById(chartId)) continue;
      try {
        await renderFn();
      } catch (err) {
        console.error(`Render failed for ${chartId}:`, err);
      }
    }
    inlineChartsInitialized = true;
  } finally {
    inlineChartsRendering = false;
  }
}

/* ── Init ────────────────────────────────────────────────── */
async function init() {
  initProgressBar();
  initMobilePlaceholders();
  initFullscreenModal();
  initNarrativeCards();
  window.addEventListener('resize', debounce(() => {
    syncAllMobilePlaceholders();
    renderInlineChartsIfNeeded();
  }, 120));
  await renderInlineChartsIfNeeded();
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

  syncMobilePlaceholder(chartId);
  updateFullscreenModalMeta(chartId);
}

function initNarrativeCards() {
  const cards = document.querySelectorAll('.narrative-card');
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const activate = (card) => {
    const chartId = card.dataset.chart;
    const state = parseInt(card.dataset.state, 10);
    document.querySelectorAll(`.narrative-card[data-chart="${chartId}"]`)
      .forEach(c => c.classList.remove('is-active'));
    card.classList.add('is-active');
    triggerChartState(chartId, state);
  };
  cards.forEach(card => {
    card.setAttribute('role', 'button');
    if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
    if (supportsHover) card.addEventListener('mouseenter', () => activate(card));
    card.addEventListener('click', () => activate(card));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate(card);
      }
    });
  });

  [...new Set(Array.from(cards).map(card => card.dataset.chart))].forEach(syncMobilePlaceholder);
}

/* ── Mobile Placeholders ─────────────────────────────────── */
function initMobilePlaceholders() {
  document.querySelectorAll('.chart-box').forEach(box => {
    const chartDiv = box.querySelector('div[id^="chart-"]');
    if (!chartDiv || box.querySelector('.chart-mobile-placeholder')) return;

    const ph = document.createElement('div');
    ph.className = 'chart-mobile-placeholder';
    ph.dataset.target = '#' + chartDiv.id;
    ph.dataset.hasSelection = 'false';
    ph.setAttribute('role', 'button');
    ph.setAttribute('tabindex', '0');
    ph.setAttribute('aria-label', 'Apri grafico interattivo a schermo intero');
    const act = box.closest('section[data-act]')?.dataset.act;
    if (act) ph.style.setProperty('--placeholder-accent', `var(--accent-${act})`);
    ph.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" fill="none"/><path d="M2 12h20M12 2v20" stroke="currentColor" stroke-dasharray="4 3"/></svg>
      <span class="chart-mobile-placeholder-title">Grafico interattivo</span>
      <span class="chart-mobile-placeholder-state">Vista iniziale</span>
      <span class="chart-mobile-placeholder-hint">Tocca per esplorare a schermo intero</span>
      <span class="chart-mobile-placeholder-rotate"></span>
    `;
    ph.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        ph.click();
      }
    });
    box.appendChild(ph);
    syncMobilePlaceholder(chartDiv.id);
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
  const modalContent = modal?.querySelector('.fullscreen-modal-content');
  const closeBtn = document.querySelector('.fullscreen-modal-close');
  const container = document.getElementById('fullscreenChartContainer');
  if (!modal || !modalContent || !closeBtn || !container) return;

  let currentChartId = null;
  let reopenTimer = null;

  function applyOrientationMode() {
    const useRotatedLayout = modal.classList.contains('is-active')
      && isMobilePortraitViewport()
      && shouldRotateMobileChart(currentChartId);
    modalContent.classList.toggle('is-mobile-portrait', useRotatedLayout);
  }

  function close() {
    modal.classList.remove('is-active');
    modalContent.classList.remove('is-mobile-portrait');
    container.innerHTML = '';
    document.body.style.overflow = '';
    currentChartId = null;
  }

  async function open(chartId) {
    currentChartId = chartId;
    updateFullscreenModalMeta(chartId);
    modal.classList.add('is-active');
    document.body.style.overflow = 'hidden';
    container.innerHTML = '';
    applyOrientationMode();

    const stage = document.createElement('div');
    stage.className = 'fullscreen-chart-stage';
    const wrap = document.createElement('div');
    wrap.className = 'fullscreen-chart-wrap';
    wrap.id = `fullscreen-${chartId}`;
    stage.appendChild(wrap);
    container.appendChild(stage);

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
  window.addEventListener('resize', () => {
    applyOrientationMode();
    if (!modal.classList.contains('is-active') || !currentChartId) return;
    clearTimeout(reopenTimer);
    reopenTimer = setTimeout(() => open(currentChartId), 180);
  });
}

document.addEventListener('DOMContentLoaded', init);
