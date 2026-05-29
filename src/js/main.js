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

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function retriggerAnimationClass(el, className) {
  if (!el || prefersReducedMotion()) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

function getBaseChartIdFromElement(el) {
  const chartRoot = el?.closest?.('div[id^="chart-"], div[id^="fullscreen-chart-"]');
  if (!chartRoot) return null;
  return chartRoot.id.startsWith('fullscreen-')
    ? chartRoot.id.slice('fullscreen-'.length)
    : chartRoot.id;
}

function animateChartEntrance(chartId, targetEl = null) {
  if (!chartId) return;
  const nodes = [];
  if (targetEl) nodes.push(targetEl);
  const inlineEl = document.getElementById(chartId);
  if (inlineEl && inlineEl !== targetEl) nodes.push(inlineEl);
  const fullscreenEl = document.getElementById(`fullscreen-${chartId}`);
  if (fullscreenEl && fullscreenEl !== targetEl) nodes.push(fullscreenEl);
  nodes.forEach(node => retriggerAnimationClass(node, 'chart-anim-enter'));
}

function animateChartSwitch(chartId, targetEl = null) {
  if (!chartId) return;
  const nodes = [];
  if (targetEl) nodes.push(targetEl);
  const inlineEl = document.getElementById(chartId);
  if (inlineEl && inlineEl !== targetEl) nodes.push(inlineEl);
  const fullscreenEl = document.getElementById(`fullscreen-${chartId}`);
  if (fullscreenEl && fullscreenEl !== targetEl) nodes.push(fullscreenEl);
  nodes.forEach(node => retriggerAnimationClass(node, 'chart-anim-switch'));
}

function getChartInteractionHost(chartId, targetEl = null) {
  const baseEl = targetEl
    || document.getElementById(chartId)
    || document.getElementById(`fullscreen-${chartId}`);
  if (!baseEl) return null;
  return baseEl.closest('.chart-box')
    || baseEl.closest('.fullscreen-chart-wrap')
    || baseEl;
}

function ensureChartLoadingOverlay(host) {
  if (!host) return null;
  let overlay = host.querySelector('.chart-loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'chart-loading-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    host.appendChild(overlay);
  }
  return overlay;
}

function setChartLoading(host, isLoading) {
  if (!host) return;
  host.classList.add('chart-loading-host');
  ensureChartLoadingOverlay(host);
  host.classList.toggle('is-loading', Boolean(isLoading));
}

function pulseChartBusy(chartId, targetEl = null) {
  const host = getChartInteractionHost(chartId, targetEl);
  if (!host) return;
  host.classList.add('chart-loading-host');
  host.classList.remove('chart-busy');
  void host.offsetWidth;
  host.classList.add('chart-busy');
}

async function withChartLoading(chartId, renderFn, targetEl = null) {
  const host = getChartInteractionHost(chartId, targetEl);
  const t0 = performance.now();
  setChartLoading(host, true);
  try {
    return await renderFn();
  } finally {
    const elapsed = performance.now() - t0;
    const minVisibleMs = 180;
    const wait = Math.max(0, minVisibleMs - elapsed);
    setTimeout(() => setChartLoading(host, false), wait);
  }
}

function initChartInteractionAnimations() {
  const shouldSkipButton = (btn) =>
    btn.classList.contains('chart-fullscreen-btn') ||
    btn.classList.contains('fullscreen-modal-close') ||
    btn.classList.contains('act-segment');

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('button');
    if (!btn || shouldSkipButton(btn)) return;
    const chartId = getBaseChartIdFromElement(btn);
    if (chartId) animateChartSwitch(chartId);
  });

  document.addEventListener('change', (event) => {
    const control = event.target.closest('select, input');
    if (!control) return;
    const chartId = getBaseChartIdFromElement(control);
    if (chartId) animateChartSwitch(chartId);
  });

  document.addEventListener('pointerup', (event) => {
    const range = event.target.closest('input[type="range"]');
    if (!range) return;
    const chartId = getBaseChartIdFromElement(range);
    if (chartId) animateChartSwitch(chartId);
  });

  document.addEventListener('click', (event) => {
    const chartRoot = event.target.closest('div[id^="chart-"], div[id^="fullscreen-chart-"]');
    if (!chartRoot) return;
    if (event.target.closest('button, input, select, a')) return;
    const chartId = getBaseChartIdFromElement(chartRoot);
    if (!chartId) return;
    pulseChartBusy(chartId, chartRoot);
    animateChartSwitch(chartId, chartRoot);
  });
}

const MOBILE_ROTATED_CHARTS = new Set([
  'chart-1-1', // choropleth + controls
  'chart-4-2', // map / regional trend hybrid
  'chart-5-1', // chord / migration flows
]);

const MISSING_DATA_NOTES = {
  'chart-1-1': [
    'Categoria Reddito pro capite: copertura quasi completa.',
    'Categoria Aspettativa di vita: copertura quasi completa.',
    'Categoria Povertà estrema: 49 paesi senza serie completa.',
    'Esempi mancanti (Povertà): Aruba, Afghanistan, Andorra, Argentina, Bahrain, Bahamas.'
  ].join('\n'),
  'chart-1-2': [
    'Categoria geografica: il grafico visualizza solo Africa + Europa (gli altri continenti non sono inclusi in questa vista).',
    'Categoria Reddito pro capite: copertura quasi completa nel sottoinsieme mostrato.',
    'Categoria Aspettativa di vita: copertura quasi completa nel sottoinsieme mostrato.',
    'Categoria Popolazione: copertura quasi completa nel sottoinsieme mostrato.'
  ].join('\n'),
  'chart-2-1': [
    'Categoria MPI (globale): 103 paesi senza dato.',
    'Categoria MPI (solo Africa): 7 paesi senza dato.',
    'Esempi mancanti (MPI Africa): Capo Verde, Gibuti, Eritrea, Somalia, Sud Sudan, Mauritius, Guinea Equatoriale.'
  ].join('\n'),
  'chart-3-1': [
    'Categoria Spesa istruzione (globale): 13 paesi senza serie.',
    'Categoria Spesa istruzione (Africa+Europa usate nel grafico): 5 paesi senza serie.',
    'Esempi mancanti (Africa+Europa): Libia, Montenegro, Guinea Equatoriale, Faroe Islands, Isle of Man.'
  ].join('\n'),
  'chart-3-2': [
    'Categoria GPI secondaria (globale): 31 paesi senza dato.',
    'Categoria GPI secondaria (Africa+Europa del grafico): 13 paesi senza dato.',
    'Esempi mancanti (GPI Africa+Europa): RD Congo, Gibuti, Croazia, Irlanda, Libia, Faroe Islands.'
  ].join('\n'),
  'chart-3-3': [
    'Categoria Alfabetizzazione (globale): 61 paesi senza dato.',
    'Categoria Alfabetizzazione (Africa+Europa del grafico): 27 paesi senza dato.',
    'Categoria Out-of-school (Africa+Europa): 7 paesi senza dato.',
    'Categoria GPI (Africa+Europa): 13 paesi senza dato.',
    'Esempi mancanti frequenti: Andorra, Austria, Belgio, Svizzera, Gibuti, RD Congo, Libia.'
  ].join('\n'),
  'chart-4-1': [
    'Categoria Lavoro minorile (survey): copertura limitata, 93 paesi con dato.',
    'Categoria Lavoro minorile (solo Africa nel grafico): 14 paesi senza dato.',
    'Esempi mancanti (Africa): Botswana, Capo Verde, Gibuti, Libia, Marocco, Mauritius, Eritrea.'
  ].join('\n'),
  'chart-4-2': [
    'Categoria Matrimoni precoci by18 (globale): 71 paesi senza dato.',
    'Categoria Africa: 4 paesi senza dato (Botswana, Libia, Mauritius, Seychelles).',
    'Categoria Europa: 29 paesi senza dato.',
    'Esempi mancanti (Europa): Andorra, Austria, Bulgaria, Svizzera, Germania, Estonia.'
  ].join('\n'),
  'chart-4-3': [
    'Categoria Mortalità materna (globale): 19 paesi senza dato.',
    'Categoria Mortalità infantile (globale): 19 paesi senza dato.',
    'Categoria Africa+Europa nel grafico: 3 paesi senza dato in entrambe le metriche.',
    'Paesi mancanti (Africa+Europa): Faroe Islands, Isle of Man, Liechtenstein.'
  ].join('\n'),
  'chart-5-1': [
    'Categoria Migrazione: dati disponibili come stock bilaterali quinquennali (2000-2020), non come flussi annuali.',
    'Categoria Paesi origine: copertura quasi completa, 2 codici non allineati.',
    'Categoria Paesi destinazione: copertura quasi completa, 2 codici non allineati.',
    'Codici/paesi non allineati: Saint Martin (MAF) e Sudan (SDN).'
  ].join('\n'),
};

const CHART_HELP_NOTES = {
  'chart-1-1': [
    'Questo grafico è una mappa mondiale multi-metrica: ogni paese è colorato in base al valore selezionato (reddito, aspettativa di vita, povertà o disuguaglianza).',
    'La legenda mostra il significato dei colori: tonalità più intense indicano valori più alti nella metrica attiva.',
    'Con slider e play puoi cambiare anno e vedere come la distribuzione evolve nel tempo.',
    'Interazioni: hover su un paese per il tooltip, click su un paese per aprire il pannello con la sua serie storica, zoom/pan per esplorare aree specifiche.'
  ].join('\n'),
  'chart-1-2': [
    'Ogni bolla rappresenta un paese: la posizione orizzontale (asse X) è il reddito pro capite, la posizione verticale (asse Y) è l\'aspettativa di vita o la metrica selezionata.',
    'La dimensione della bolla rappresenta la popolazione: bolle più grandi = paesi più popolosi.',
    'Play e slider animano la traiettoria 2000-2024 per mostrare spostamenti nel tempo.',
    'Interazioni: hover per tooltip dettagliato e filtri/toggle per cambiare lettura degli assi.'
  ].join('\n'),
  'chart-2-1': [
    'Il grafico ha due viste: distribuzione (istogramma) e mappa.',
    'Nella distribuzione, asse X = valore MPI, asse Y = numero di paesi in ogni intervallo; serve a capire dove si concentra la povertà multidimensionale.',
    'Nella mappa, il colore mostra l\'intensità del MPI paese per paese.',
    'Interazioni: toggle distribuzione/mappa, hover per tooltip, e card narrative che cambiano focus interpretativo.'
  ].join('\n'),
  'chart-3-1': [
    'Le linee mostrano l\'andamento medio della spesa pubblica in istruzione per continente nel tempo.',
    'Asse X = anno; asse Y = spesa, visualizzabile come % del PIL o come valore assoluto in USD tramite toggle.',
    'La distanza tra le linee indica il gap tra continenti; la pendenza indica accelerazioni o rallentamenti nel periodo.',
    'Interazioni: hover per leggere i valori puntuali e cambio metrica con i pulsanti in alto.'
  ].join('\n'),
  'chart-3-2': [
    'Questo grafico mostra il gap di genere nella scuola secondaria usando il GPI.',
    'Asse X = distanza dalla parità (GPI = 1): valori a sinistra indicano svantaggio per le bambine, a destra svantaggio per i bambini.',
    'La vista iniziale confronta i continenti; con click su un continente entri nel drill-down per paese.',
    'Interazioni: hover per dettagli, click per drill-down e pulsante back per tornare alla vista aggregata.'
  ].join('\n'),
  'chart-3-3': [
    'Ogni punto rappresenta un anno aggregato per continente: la traiettoria mostra come i sistemi educativi si muovono nel tempo.',
    'Asse X = spesa in istruzione (% PIL o USD, in base al toggle); asse Y = alfabetizzazione oppure bambini fuori scuola.',
    'La forma della traiettoria aiuta a capire se più spesa è associata a miglioramenti educativi.',
    'Interazioni: toggle assi/metriche, filtri di focus e hover con valori completi anno per anno.'
  ].join('\n'),
  'chart-4-1': [
    'Scatter per paesi africani: ogni punto è un paese.',
    'Asse X (logaritmico) = reddito pro capite; asse Y = quota di lavoro minorile (%).',
    'Le linee mediane dividono il grafico in quattro quadranti per identificare i profili di rischio relativi.',
    'Interazioni: hover sui punti per dettagli e lettura rapida dei quadranti con etichette e conteggi.'
  ].join('\n'),
  'chart-4-2': [
    'La vista principale è un waffle: ogni cella vale 1% di donne 20-24 sposate prima dei 18 anni.',
    'I colori distinguono i matrimoni prima dei 15 anni e tra 15-18 anni.',
    'La lettura combina percentuali e volumi assoluti per evitare interpretazioni distorte.',
    'Interazioni: hover per dettagli, click sul continente per drill-down per paese e confronto più fine.'
  ].join('\n'),
  'chart-4-3': [
    'Confronto temporale tra Africa ed Europa su due metriche: mortalità materna e mortalità infantile.',
    'Asse X = anno; asse Y = livello di mortalità della metrica selezionata.',
    'Il toggle cambia metrica mantenendo lo stesso impianto di lettura, così il confronto tra aree resta immediato.',
    'Interazioni: hover sui punti per valori annuali e rapporto tra continenti.'
  ].join('\n'),
  'chart-5-1': [
    'Questo grafico ha due modalità: rete dei collegamenti migratori e mappa delle rotte geografiche.',
    'Lo spessore dei collegamenti rappresenta l\'intensità dello stock migratorio tra origine e destinazione.',
    'Slider e play mostrano l\'evoluzione tra 2000 e 2020 (con interpolazione tra anni quinquennali).',
    'Interazioni: hover per valori dei collegamenti, filtri/toggle vista e funzioni di esplorazione spaziale.'
  ].join('\n'),
};

const DATASET_NOTES = {
  'chart-1-1': [
    'Dataset principale: datasets/processed/income.csv',
    'Dataset integrativi: datasets/processed/life_expectancy.csv, datasets/processed/poverty.csv',
    'Base geografica: World Atlas TopoJSON (countries-110m)'
  ].join('\n'),
  'chart-1-2': [
    'Dataset principale: datasets/processed/income.csv',
    'Dataset integrativi: datasets/processed/life_expectancy.csv, datasets/processed/population.csv'
  ].join('\n'),
  'chart-2-1': [
    'Dataset principale: datasets/processed/mpi.csv',
    'Base geografica (vista mappa): World Atlas TopoJSON (countries-110m)'
  ].join('\n'),
  'chart-3-1': [
    'Dataset principale: datasets/processed/edu_spending.csv',
    'Dataset integrativi: datasets/processed/income.csv, datasets/processed/population.csv'
  ].join('\n'),
  'chart-3-2': [
    'Dataset principale: datasets/processed/gpi_secondary.csv',
    'Dataset integrativo: datasets/processed/out_of_school.csv'
  ].join('\n'),
  'chart-3-3': [
    'Dataset principali: datasets/processed/edu_spending.csv, datasets/processed/literacy.csv',
    'Dataset integrativi: datasets/processed/out_of_school.csv, datasets/processed/income.csv, datasets/processed/population.csv'
  ].join('\n'),
  'chart-4-1': [
    'Dataset principale: datasets/processed/child_labor.csv',
    'Dataset integrativo: datasets/processed/income.csv'
  ].join('\n'),
  'chart-4-2': [
    'Dataset principale: datasets/processed/child_marriage_cmmm.csv'
  ].join('\n'),
  'chart-4-3': [
    'Dataset principali: datasets/processed/maternal_mortality.csv, datasets/processed/child_mortality.csv'
  ].join('\n'),
  'chart-5-1': [
    'Dataset principale: datasets/processed/migration.csv',
    'Base geografica (vista mappa): World Atlas TopoJSON (countries-110m)'
  ].join('\n'),
};

const MISSING_DATA_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <ellipse cx="12" cy="5.5" rx="7.25" ry="2.75"></ellipse>
    <path d="M4.75 5.5v5.2c0 1.5 3.25 2.75 7.25 2.75s7.25-1.25 7.25-2.75V5.5"></path>
    <path d="M4.75 10.7v5.2c0 1.5 3.25 2.75 7.25 2.75s7.25-1.25 7.25-2.75v-5.2"></path>
    <path d="M5 19l14-14"></path>
  </svg>
`;

const DATASET_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="4.5" y="5.5" width="15" height="13" rx="2"></rect>
    <path d="M4.5 10h15M9.5 5.5v13M14.5 5.5v13"></path>
  </svg>
`;

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
        await withChartLoading(chartId, renderFn);
        animateChartEntrance(chartId);
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
  initMissingDataHints();
  initAdaptiveHintButtons();
  initChartInteractionAnimations();
  window.addEventListener('resize', debounce(() => {
    syncAllMobilePlaceholders();
    updateAdaptiveHintButtons();
    renderInlineChartsIfNeeded();
  }, 120));
  await renderInlineChartsIfNeeded();
}

/* ── Narrative Cards ─────────────────────────────────────── */
function triggerChartState(chartId, state, targetEl = null, options = {}) {
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
    else if (state === 2 && el._mpiShowMap) el._mpiShowMap();
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
    else if (state === 1 && el._exclusionFocusAfrica) el._exclusionFocusAfrica();
    else if (state === 2 && el._exclusionFocusEurope) el._exclusionFocusEurope();
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

  pulseChartBusy(chartId, el);
  if (!options.skipAnimation) animateChartSwitch(chartId, targetEl);
  syncMobilePlaceholder(chartId);
  updateFullscreenModalMeta(chartId);
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
    card.setAttribute('role', 'button');
    if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
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

function initMissingDataHints() {
  const formatTooltipMarkup = (title, bodyText, className) => {
    const lines = String(bodyText || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    const listItems = lines.map(line => `<li>${line}</li>`).join('');
    return `
      <span class="${className}">
        <span class="${className}-title">${title}</span>
        <ul class="${className}-list">${listItems}</ul>
      </span>
    `;
  };

  const chartBoxes = document.querySelectorAll('.chart-box');
  chartBoxes.forEach((box) => {
    const chartEl = box.querySelector('div[id^="chart-"]');
    if (!chartEl) return;
    const missingNote = MISSING_DATA_NOTES[chartEl.id];
    const helpNote = CHART_HELP_NOTES[chartEl.id];
    const datasetNote = DATASET_NOTES[chartEl.id];

    if (missingNote && !box.querySelector('.missing-data-hint')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'missing-data-hint';
      btn.setAttribute('aria-label', 'Informazioni sui dati mancanti');
      btn.innerHTML = `${MISSING_DATA_ICON}${formatTooltipMarkup('Dati mancanti e copertura', missingNote, 'missing-data-tooltip')}`;
      box.appendChild(btn);
    }

    if (datasetNote && !box.querySelector('.chart-dataset-hint')) {
      const datasetBtn = document.createElement('button');
      datasetBtn.type = 'button';
      datasetBtn.className = 'chart-dataset-hint';
      datasetBtn.setAttribute('aria-label', 'Dataset utilizzati');
      datasetBtn.innerHTML = `${DATASET_ICON}${formatTooltipMarkup('Dataset utilizzati', datasetNote, 'chart-dataset-tooltip')}`;
      box.appendChild(datasetBtn);
    }

    if (helpNote && !box.querySelector('.chart-help-hint')) {
      const helpBtn = document.createElement('button');
      helpBtn.type = 'button';
      helpBtn.className = 'chart-help-hint';
      helpBtn.setAttribute('aria-label', 'Come leggere il grafico');
      helpBtn.innerHTML = `<span aria-hidden="true">?</span>${formatTooltipMarkup('Come leggere questo grafico', helpNote, 'chart-help-tooltip')}`;
      box.appendChild(helpBtn);
    }
  });
}

function applyAdaptiveHintClass(box) {
  if (!box) return;
  const w = box.clientWidth || 0;
  const h = box.clientHeight || 0;
  box.classList.remove('chart-hints-compact', 'chart-hints-roomy');

  if (w <= 760 || h <= 430) {
    box.classList.add('chart-hints-compact');
    return;
  }
  if (w >= 1120 && h >= 560) {
    box.classList.add('chart-hints-roomy');
  }
}

function updateAdaptiveHintButtons() {
  document.querySelectorAll('.chart-box').forEach(applyAdaptiveHintClass);
}

function initAdaptiveHintButtons() {
  updateAdaptiveHintButtons();

  if (typeof ResizeObserver === 'undefined') return;
  const ro = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      if (entry?.target?.classList?.contains('chart-box')) {
        applyAdaptiveHintClass(entry.target);
      }
    });
  });

  document.querySelectorAll('.chart-box').forEach((box) => ro.observe(box));
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
      await withChartLoading(chartId, async () => {
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
      }, wrap);
    } catch (e) {
      wrap.innerHTML = '<p style="color:#c00;padding:2rem;">Errore nel caricamento del grafico.</p>';
    }

    animateChartEntrance(chartId, wrap);

    // Apply the last selected narrative state (if any) to the fullscreen chart
    const savedState = window._chartStates?.[chartId] ?? 0;
    const fsEl = document.getElementById(`fullscreen-${chartId}`);
    if (fsEl) triggerChartState(chartId, savedState, fsEl, { skipAnimation: true });
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
