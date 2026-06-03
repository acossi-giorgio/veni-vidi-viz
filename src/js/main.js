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

function getCssToken(name, fallback = '') {
  const token = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return token || fallback;
}

function resolveChartColor(ref, fallback = '') {
  if (!ref) return fallback;
  if (typeof ref !== 'string') return fallback;
  if (ref.startsWith('--')) return getCssToken(ref.slice(2), fallback);
  return ref;
}

function hexToRgbComponents(hex) {
  const normalized = resolveChartColor(hex, hex).replace('#', '').trim();
  if (!normalized) return null;
  const full = normalized.length === 3
    ? normalized.split('').map(ch => ch + ch).join('')
    : normalized;
  if (full.length !== 6 || /[^0-9a-f]/i.test(full)) return null;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function colorToRgba(ref, alpha, fallback = '#000000') {
  const rgb = hexToRgbComponents(ref || fallback) || hexToRgbComponents(fallback);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function mixColors(a, b, t = 0.5) {
  const c1 = hexToRgbComponents(a);
  const c2 = hexToRgbComponents(b);
  if (!c1 || !c2) return resolveChartColor(a, b);
  const clamp = Math.max(0, Math.min(1, t));
  const r = Math.round(c1.r + (c2.r - c1.r) * clamp);
  const g = Math.round(c1.g + (c2.g - c1.g) * clamp);
  const bCh = Math.round(c1.b + (c2.b - c1.b) * clamp);
  return `#${[r, g, bCh].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function tintColor(ref, amount = 0.3) {
  return mixColors(resolveChartColor(ref, ref), '#ffffff', amount);
}

function shadeColor(ref, amount = 0.25) {
  return mixColors(resolveChartColor(ref, ref), '#111111', amount);
}

const CONTINENT_TOKEN_MAP = {
  'Africa': 'continent-africa',
  'Asia': 'continent-asia',
  'Europe': 'continent-europe',
  'North America': 'continent-north-america',
  'South America': 'continent-south-america',
  'Oceania': 'continent-oceania',
};

const METRIC_TOKEN_MAP = {
  income: ['metric-income-0', 'metric-income-1', 'metric-income-2', 'metric-income-3', 'metric-income-4'],
  education: ['metric-education-0', 'metric-education-1', 'metric-education-2', 'metric-education-3', 'metric-education-4'],
  risk: ['metric-risk-0', 'metric-risk-1', 'metric-risk-2', 'metric-risk-3', 'metric-risk-4'],
  migration: ['metric-migration-0', 'metric-migration-1', 'metric-migration-2', 'metric-migration-3', 'metric-migration-4'],
};

function getContinentColor(continent, fallback = '#888888') {
  const token = CONTINENT_TOKEN_MAP[continent];
  return token ? getCssToken(token, fallback) : fallback;
}

function getMetricStops(metric, fallback = []) {
  const tokens = METRIC_TOKEN_MAP[metric];
  if (!tokens) return fallback;
  const stops = tokens.map(token => getCssToken(token)).filter(Boolean);
  return stops.length ? stops : fallback;
}

function getUiColor(key, fallback = '') {
  const tokenMap = {
    controlActive: 'control-active',
    controlActiveStrong: 'control-active-strong',
    controlMuted: 'control-muted',
    controlMutedBorder: 'control-muted-border',
    controlMutedInk: 'control-muted-ink',
    chartWater: 'chart-water',
    chartBaseFill: 'chart-base-fill',
    chartNoDataFill: 'chart-nodata-fill',
    chartNoDataStripe: 'chart-nodata-stripe',
    chartGrid: 'chart-grid',
    chartAxis: 'chart-axis',
    chartLabel: 'chart-label',
    chartPanel: 'chart-panel',
    chartTooltipBg: 'chart-tooltip-bg',
    chartTooltipInk: 'chart-tooltip-ink',
    genderGirls: 'gender-girls',
    genderBoys: 'gender-boys',
  };
  const token = tokenMap[key];
  return token ? getCssToken(token, fallback) : fallback;
}

function ensureNoDataPattern(svg, patternId, options = {}) {
  if (!svg || typeof svg.select !== 'function' || !patternId) return '';
  const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
  defs.select(`#${patternId}`).remove();

  const background = options.background || getUiColor('chartNoDataFill', '#c3baad');
  const stripe = options.stripe || getUiColor('chartNoDataStripe', shadeColor(background, 0.24));
  const size = options.size || 6;
  const strokeWidth = options.strokeWidth || 1.15;
  const opacity = options.opacity == null ? 0.85 : options.opacity;

  const pattern = defs.append('pattern')
    .attr('id', patternId)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', size)
    .attr('height', size);

  pattern.append('rect')
    .attr('width', size)
    .attr('height', size)
    .attr('fill', background);

  pattern.append('path')
    .attr('d', [
      `M-${size * 0.5},${size * 0.5} l${size},-${size}`,
      `M0,${size} l${size},-${size}`,
      `M${size * 0.5},${size * 1.5} l${size},-${size}`,
    ].join(' '))
    .attr('fill', 'none')
    .attr('stroke', stripe)
    .attr('stroke-width', strokeWidth)
    .attr('stroke-linecap', 'square')
    .attr('opacity', opacity);

  return `url(#${patternId})`;
}

window.getCssToken = getCssToken;
window.resolveChartColor = resolveChartColor;
window.colorToRgba = colorToRgba;
window.mixColors = mixColors;
window.tintColor = tintColor;
window.shadeColor = shadeColor;
window.getContinentColor = getContinentColor;
window.getMetricStops = getMetricStops;
window.getUiColor = getUiColor;
window.ensureNoDataPattern = ensureNoDataPattern;
window.runChartViewTransition = runChartViewTransition;

function getNarrativeCards(chartId) {
  return Array.from(document.querySelectorAll(`.narrative-card[data-chart="${chartId}"]`));
}

function getActiveNarrativeCard(chartId, options = {}) {
  const { fallbackToFirst = true } = options;
  const activeCard = document.querySelector(`.narrative-card[data-chart="${chartId}"].is-active`);
  if (activeCard) return activeCard;
  if (!fallbackToFirst) return null;
  return getNarrativeCards(chartId)[0] || null;
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 760px), (pointer: coarse) and (max-height: 500px) and (orientation: landscape)').matches;
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

function runChartViewTransition(host, renderFn, options = {}) {
  if (typeof renderFn !== 'function') return;
  if (!host || prefersReducedMotion()) {
    renderFn();
    return;
  }

  const duration = Number.isFinite(options.duration) ? options.duration : 170;
  const enterDuration = Number.isFinite(options.enterDuration) ? options.enterDuration : duration + 110;
  const offsetY = Number.isFinite(options.offsetY) ? options.offsetY : 10;
  const easing = options.easing || 'cubic-bezier(.22,.61,.36,1)';

  host._chartViewTransitionToken = (host._chartViewTransitionToken || 0) + 1;
  const token = host._chartViewTransitionToken;

  const animateChildren = (children, phase) => {
    children.forEach((child) => {
      child.style.willChange = 'opacity, transform, filter';
      if (phase === 'out') {
        child.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}, filter ${duration}ms ${easing}`;
        child.style.opacity = '0';
        child.style.transform = `translateY(${Math.max(4, offsetY * 0.7)}px)`;
        child.style.filter = 'saturate(0.98)';
      } else {
        child.style.transition = 'none';
        child.style.opacity = '0';
        child.style.transform = `translateY(${offsetY}px)`;
        child.style.filter = 'saturate(0.98)';
        requestAnimationFrame(() => {
          if (host._chartViewTransitionToken !== token) return;
          child.style.transition = `opacity ${enterDuration}ms ${easing}, transform ${enterDuration}ms ${easing}, filter ${enterDuration}ms ${easing}`;
          child.style.opacity = '1';
          child.style.transform = 'translateY(0)';
          child.style.filter = 'saturate(1)';
        });
      }
    });
  };

  const commit = () => {
    if (host._chartViewTransitionToken !== token) return;
    renderFn();
    const nextChildren = Array.from(host.children);
    if (!nextChildren.length) return;
    animateChildren(nextChildren, 'in');
  };

  const currentChildren = Array.from(host.children);
  if (!currentChildren.length) {
    commit();
    return;
  }

  animateChildren(currentChildren, 'out');
  window.setTimeout(commit, duration - 12);
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
    const minVisibleMs = 240;
    const wait = Math.max(0, minVisibleMs - elapsed);
    setTimeout(() => setChartLoading(host, false), wait);
  }
}

function initChartInteractionAnimations() {
  const shouldSkipButton = (btn) =>
    btn.classList.contains('chart-fullscreen-btn') ||
    btn.classList.contains('fullscreen-modal-close') ||
    btn.classList.contains('chart-info-modal-close') ||
    btn.classList.contains('missing-data-hint') ||
    btn.classList.contains('chart-dataset-hint') ||
    btn.classList.contains('chart-help-hint') ||
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

  // Disable click pulse on chart canvas to avoid bounce effect during exploration.
  // We keep animations only for explicit UI controls (buttons/select/slider release).
}

function initHeroCarousel() {
  const carousel = document.querySelector('.hero-carousel');
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll('.hero-carousel-slide'));
  const dots = Array.from(carousel.querySelectorAll('.hero-carousel-dot'));
  if (!slides.length) return;

  let activeIndex = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
  let timerId = null;

  const setActiveSlide = (nextIndex) => {
    activeIndex = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      slide.classList.toggle('is-active', index === activeIndex);
      slide.setAttribute('aria-hidden', index === activeIndex ? 'false' : 'true');
    });
    dots.forEach((dot, index) => {
      const isActive = index === activeIndex;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const stopAutoRotate = () => {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
  };

  const startAutoRotate = () => {
    stopAutoRotate();
    if (prefersReducedMotion()) return;
    timerId = window.setInterval(() => {
      setActiveSlide(activeIndex + 1);
    }, 5500);
  };

  carousel.addEventListener('mouseenter', stopAutoRotate);
  carousel.addEventListener('mouseleave', startAutoRotate);
  carousel.addEventListener('focusin', stopAutoRotate);
  carousel.addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!carousel.contains(document.activeElement)) startAutoRotate();
    }, 0);
  });

  setActiveSlide(activeIndex);
  startAutoRotate();
}

const MOBILE_ROTATED_CHARTS = new Set([
  'chart-1-1', // choropleth + controls
  'chart-4-2', // map / regional trend hybrid
  'chart-5-1', // chord / migration flows
]);

let MISSING_DATA_NOTES = {
  'chart-1-1': [
    'Paesi senza alcun dato — Reddito pro capite (2000-2023, Africa+Europa): Gibraltar; Guernsey; Holy See; Jersey; Mayotte; Reunion; Saint Helena; Svalbard & Jan Mayen Islands; Western Sahara; Åland Islands.',
    'Paesi con serie incompleta — Reddito pro capite (2000-2023, Africa+Europa): Eritrea; Isle of Man; Liechtenstein; San Marino; South Sudan.',
  ].join('\n'),
  'chart-1-2': [
    'Paesi senza alcun dato — Reddito pro capite (2000-2023, Africa+Europa): Gibraltar; Guernsey; Holy See; Jersey; Mayotte; Reunion; Saint Helena; Svalbard & Jan Mayen Islands; Western Sahara; Åland Islands.',
    'Paesi con serie incompleta — Reddito pro capite (2000-2023, Africa+Europa): Eritrea; Isle of Man; Liechtenstein; San Marino; South Sudan.',
    'Paesi senza alcun dato — Aspettativa di vita (2000-2023, Africa+Europa): Svalbard & Jan Mayen Islands; Åland Islands.',
    'Paesi con serie incompleta — Aspettativa di vita (2000-2023, Africa+Europa): nessuno.',
    'Paesi senza alcun dato — Popolazione (2000-2023, Africa+Europa): Svalbard & Jan Mayen Islands; Åland Islands.',
    'Paesi con serie incompleta — Popolazione (2000-2023, Africa+Europa): nessuno.',
  ].join('\n'),
  'chart-2-1': [
    'Paesi senza alcun dato MPI (ultimo anno disponibile, Africa): Cape Verde; Djibouti; Equatorial Guinea; Eritrea; Mauritius; Somalia; South Sudan.',
    'Paesi con serie incompleta: non applicabile (il grafico usa l\'ultimo valore disponibile per paese).',
  ].join('\n'),
  'chart-3-1': [
    'Nota: la popolazione viene usata solo nella modalità "$ Assoluto" per stimare la spesa totale (spesa % PIL × reddito pro capite × popolazione).',
    'Paesi senza alcun dato — Spesa istruzione % PIL (2000-2022, Africa+Europa): Equatorial Guinea; Faroe Islands; Gibraltar; Guernsey; Holy See; Isle of Man; Jersey; Libyan Arab Jamahiriya; Mayotte; Montenegro; Reunion; Saint Helena; Svalbard & Jan Mayen Islands; Western Sahara; Åland Islands.',
    'Paesi con serie incompleta — Spesa istruzione % PIL (2000-2022, Africa+Europa): Albania; Algeria; Andorra; Angola; Belarus; Belgium; Benin; Bosnia and Herzegovina; Botswana; Bulgaria; Burkina Faso; Burundi; Cameroon; Cape Verde; Central African Republic; Chad; Comoros; Congo; Croatia; Cyprus; Denmark; Djibouti; DR Congo; Egypt; Eritrea; Estonia; Eswatini; Ethiopia; France; Gabon; Germany; Ghana; Greece; Guinea; Guinea-Bissau; Ireland; Kazakhstan; Kenya; Latvia; Lesotho; Liberia; Liechtenstein; Lithuania; Luxembourg; Malawi; Mali; Malta; Mauritania; Monaco; Morocco; Mozambique; Namibia; Niger; Nigeria; North Macedonia; Portugal; Russia; Rwanda; San Marino; Sao Tome and Principe; Senegal; Serbia; Seychelles; Sierra Leone; Slovenia; Somalia; South Sudan; Sudan; Tanzania; Tunisia; Turkey; Uganda; Ukraine; United Kingdom; Zambia; Zimbabwe.',
    'Paesi senza alcun dato — Vista assoluta (join spesa+reddito+popolazione, 2000-2022, Africa+Europa): Equatorial Guinea; Faroe Islands; Gibraltar; Guernsey; Holy See; Isle of Man; Jersey; Libyan Arab Jamahiriya; Mayotte; Montenegro; Reunion; Saint Helena; Svalbard & Jan Mayen Islands; Western Sahara; Åland Islands.',
    'Paesi con serie incompleta — Vista assoluta (join spesa+reddito+popolazione, 2000-2022, Africa+Europa): Albania; Algeria; Andorra; Angola; Belarus; Belgium; Benin; Bosnia and Herzegovina; Botswana; Bulgaria; Burkina Faso; Burundi; Cameroon; Cape Verde; Central African Republic; Chad; Comoros; Congo; Croatia; Cyprus; Denmark; Djibouti; DR Congo; Egypt; Eritrea; Estonia; Eswatini; Ethiopia; France; Gabon; Germany; Ghana; Greece; Guinea; Guinea-Bissau; Ireland; Kazakhstan; Kenya; Latvia; Lesotho; Liberia; Liechtenstein; Lithuania; Luxembourg; Malawi; Mali; Malta; Mauritania; Monaco; Morocco; Mozambique; Namibia; Niger; Nigeria; North Macedonia; Portugal; Russia; Rwanda; San Marino; Sao Tome and Principe; Senegal; Serbia; Seychelles; Sierra Leone; Slovenia; Somalia; South Sudan; Sudan; Tanzania; Tunisia; Turkey; Uganda; Ukraine; United Kingdom; Zambia; Zimbabwe.',
  ].join('\n'),
  'chart-3-2': [
    'Paesi senza alcun dato — GPI secondaria (2000-2024, Africa+Europa): Croatia; Djibouti; DR Congo; Equatorial Guinea; Ireland; Kosovo; Libyan Arab Jamahiriya; Monaco; Nigeria; Somalia; Tunisia; Zambia.',
    'Paesi con serie incompleta — GPI secondaria (2000-2024, Africa+Europa): Albania; Algeria; Andorra; Angola; Austria; Belarus; Belgium; Benin; Bosnia and Herzegovina; Botswana; Bulgaria; Burkina Faso; Burundi; Cameroon; Cape Verde; Central African Republic; Chad; Comoros; Congo; Cote d\'Ivoire; Cyprus; Czechia; Denmark; Egypt; Eritrea; Estonia; Eswatini; Ethiopia; Finland; France; Gabon; Gambia; Germany; Ghana; Greece; Guinea; Guinea-Bissau; Hungary; Iceland; Italy; Kenya; Latvia; Lesotho; Liberia; Liechtenstein; Lithuania; Luxembourg; Madagascar; Malawi; Mali; Malta; Mauritania; Mauritius; Moldova; Montenegro; Morocco; Mozambique; Namibia; Netherlands; Niger; North Macedonia; Norway; Poland; Portugal; Romania; Russia; Rwanda; San Marino; Sao Tome and Principe; Senegal; Serbia; Seychelles; Sierra Leone; Slovakia; Slovenia; South Africa; South Sudan; Spain; Sudan; Sweden; Switzerland; Tanzania; Togo; Uganda; Ukraine; United Kingdom; Zimbabwe.',
  ].join('\n'),
  'chart-3-3': [
    'Paesi senza alcun dato utile al grafico (join spesa+reddito+popolazione+alfabetizzazione, 2000-2022, Africa+Europa): Andorra; Austria; Belgium; Bosnia and Herzegovina; Botswana; Comoros; Croatia; Czechia; Denmark; Djibouti; Equatorial Guinea; Faroe Islands; Finland; France; Germany; Gibraltar; Guernsey; Guinea-Bissau; Holy See; Hungary; Iceland; Ireland; Isle of Man; Jersey; Liberia; Libyan Arab Jamahiriya; Liechtenstein; Luxembourg; Malawi; Mayotte; Monaco; Montenegro; Netherlands; Norway; Poland; Reunion; Saint Helena; Slovakia; Slovenia; South Sudan; Svalbard & Jan Mayen Islands; Sweden; Switzerland; United Kingdom; Western Sahara; Zimbabwe; Åland Islands.',
    'Paesi con serie incompleta (almeno un anno mancante, stesso join 2000-2022): Albania; Algeria; Angola; Armenia; Azerbaijan; Belarus; Benin; Bulgaria; Burkina Faso; Burundi; Cameroon; Cape Verde; Central African Republic; Chad; Congo; Cote d\'Ivoire; Cyprus; DR Congo; Egypt; Eritrea; Estonia; Eswatini; Ethiopia; Gabon; Gambia; Georgia; Ghana; Greece; Guinea; Italy; Kazakhstan; Kenya; Latvia; Lesotho; Lithuania; Madagascar; Mali; Malta; Mauritania; Mauritius; Moldova; Morocco; Mozambique; Namibia; Niger; Nigeria; North Macedonia; Portugal; Romania; Russia; Rwanda; San Marino; Sao Tome and Principe; Senegal; Serbia; Seychelles; Sierra Leone; Somalia; South Africa; Spain; Sudan; Tanzania; Togo; Tunisia; Turkey; Uganda; Ukraine; Zambia.',
  ].join('\n'),
  'chart-4-1': [
    'Paesi senza alcun dato — Lavoro minorile (Africa): Botswana; Cape Verde; Djibouti; Equatorial Guinea; Eritrea; Libyan Arab Jamahiriya; Mauritius; Morocco; Namibia; Rwanda; Seychelles; Somalia; South Africa; South Sudan.',
    'Paesi con dato lavoro minorile ma senza reddito nello stesso anno (join grafico): nessuno.',
    'Paesi con serie incompleta: non applicabile (il grafico usa l\'ultimo dato survey disponibile per paese).',
  ].join('\n'),
  'chart-4-2': [
    'Paesi senza alcun dato — Matrimoni precoci by18 (2000-2024, Africa+Europa): Andorra; Austria; Botswana; Bulgaria; Croatia; Cyprus; Czechia; Estonia; France; Germany; Greece; Hungary; Iceland; Ireland; Italy; Latvia; Libyan Arab Jamahiriya; Liechtenstein; Luxembourg; Malta; Mauritius; Monaco; Netherlands; Poland; Portugal; San Marino; Seychelles; Slovakia; Slovenia; Spain; Sweden; Switzerland.',
    'Paesi con serie incompleta — Matrimoni precoci by18 (2000-2024, Africa+Europa): Albania; Algeria; Angola; Belarus; Belgium; Benin; Bosnia and Herzegovina; Burkina Faso; Burundi; Cameroon; Cape Verde; Central African Republic; Chad; Comoros; Congo; Cote d\'Ivoire; Denmark; Djibouti; DR Congo; Egypt; Equatorial Guinea; Eritrea; Eswatini; Ethiopia; Finland; Gabon; Gambia; Ghana; Guinea; Guinea-Bissau; Kenya; Kosovo; Lesotho; Liberia; Lithuania; Madagascar; Malawi; Mali; Mauritania; Moldova; Montenegro; Morocco; Mozambique; Namibia; Niger; Nigeria; North Macedonia; Norway; Romania; Russia; Rwanda; Sao Tome and Principe; Senegal; Serbia; Sierra Leone; Somalia; South Africa; South Sudan; Sudan; Tanzania; Togo; Tunisia; Uganda; Ukraine; United Kingdom; Zambia; Zimbabwe.',
  ].join('\n'),
  'chart-4-3': [
    'Paesi senza alcun dato - FGM quintili (ultimo valore disponibile, Africa): in caricamento dal registro automatico.',
    'Paesi con serie incompleta: non applicabile (dataset snapshot per paese).',
  ].join('\n'),
  'chart-5-1': [
    'Paesi africani senza stock migratorio registrato verso destinazioni non africane nel 2020: Cape Verde; Comoros; Mauritius; Sao Tome and Principe; Seychelles.',
    'Paesi africani con dato incompleto nel 2020: nessuno.',
    'Codici non mappabili nella base geografica (scala 110m): nessuno (risolto in ETL).',
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
    'Play e slider animano la traiettoria 2000-2023 per mostrare spostamenti nel tempo.',
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
    'Il grafico si legge in due parti. Il pannello sopra mostra la traiettoria annuale di Africa ed Europa. Il pannello sotto sintetizza, anno per anno, il rapporto tra variazione dell\'outcome e variazione della spesa.',
    'Pannello sopra: ogni punto corrisponde a un anno aggregato per continente. Sull\'asse X trovi la spesa in istruzione, espressa in % del PIL o in USD. Sull\'asse Y trovi alfabetizzazione o bambini fuori scuola, a seconda della metrica selezionata.',
    'Pannello sotto: qui vedi l\'indice corretto annuale. L\'indice confronta il cambiamento dell\'outcome con la variazione di spesa tra un anno e il successivo.',
    'Formula: I = ΔOutcome / |ΔSpesa|',
    'Definizioni: ΔOutcome = Outcome(t) - Outcome(t-1). ΔSpesa = Spesa(t) - Spesa(t-1). Il valore assoluto al denominatore evita inversioni di segno quando la spesa diminuisce.',
    'Direzione outcome: con Alfabetizzazione, un aumento è positivo. Con Fuori scuola, una diminuzione è positiva: il segno viene quindi corretto internamente.',
    'Interpretazione: se I > 0, l\'outcome migliora rispetto alla variazione di spesa. Se I < 0, peggiora. Più il valore si allontana da zero, più intensa è la variazione. L\'asse dell\'indice usa una scala logaritmica per mantenere leggibili anche i picchi più estremi.',
    'Interazioni: usa i toggle per cambiare metrica e focus. Passa sui punti, sopra e sotto, per leggere valori annuali e delta.'
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
    'L\'anno di riferimento e\' fisso al 2020.',
    'Interazioni: hover per valori dei collegamenti, filtri/toggle vista e funzioni di esplorazione spaziale.'
  ].join('\n'),
};

const DATASET_NOTES = {
  'chart-1-1': [
    'Dataset principale: datasets/processed/income.csv',
    'Base geografica: World Atlas TopoJSON (countries-110m)'
  ].join('\n'),
  'chart-1-2': [
    'Dataset principale: datasets/processed/income.csv',
    'Dataset integrativi: datasets/processed/life_expectancy.csv, datasets/processed/population.csv'
  ].join('\n'),
  'chart-2-1': [
    'Dataset principale: datasets/processed/multidimensional_poverty_index.csv',
    'Base geografica (vista mappa): World Atlas TopoJSON (countries-110m)'
  ].join('\n'),
  'chart-3-1': [
    'Dataset principale: datasets/processed/education_spending.csv',
    'Dataset integrativi: datasets/processed/income.csv, datasets/processed/population.csv'
  ].join('\n'),
  'chart-3-2': [
    'Dataset principale: datasets/processed/gender_parity_secondary.csv',
    'Dataset integrativo: datasets/processed/out_of_school_children.csv'
  ].join('\n'),
  'chart-3-3': [
    'Dataset principali: datasets/processed/education_spending.csv, datasets/processed/youth_literacy.csv',
    'Dataset integrativi: datasets/processed/out_of_school_children.csv, datasets/processed/income.csv, datasets/processed/population.csv'
  ].join('\n'),
  'chart-4-1': [
    'Dataset principale: datasets/processed/child_labor.csv',
    'Dataset integrativo: datasets/processed/income.csv'
  ].join('\n'),
  'chart-4-2': [
    'Dataset principale: datasets/processed/child_marriage_prevalence.csv'
  ].join('\n'),
  'chart-4-3': [
    'Dataset principale: datasets/processed/fgm_quintile_prevalence.csv',
    'Dataset raw di origine: datasets/raw/fgm_quintile_prevalence_raw.xlsx',
    'Base geografica (vista mappa): World Atlas TopoJSON (countries-110m)'
  ].join('\n'),
  'chart-5-1': [
    'Dataset principale: datasets/processed/migration.csv',
    'Base geografica (vista mappa): World Atlas TopoJSON (countries-110m)'
  ].join('\n'),
};

const CHART_MISSING_DATASETS = {
  'chart-1-1': ['income.csv'],
  'chart-1-2': ['income.csv', 'life_expectancy.csv', 'population.csv'],
  'chart-2-1': ['multidimensional_poverty_index.csv'],
  'chart-3-1': ['education_spending.csv', 'income.csv', 'population.csv'],
  'chart-3-2': ['gender_parity_secondary.csv', 'out_of_school_children.csv'],
  'chart-3-3': ['education_spending.csv', 'youth_literacy.csv', 'out_of_school_children.csv', 'income.csv', 'population.csv'],
  'chart-4-1': ['child_labor.csv', 'income.csv'],
  'chart-4-2': ['child_marriage_prevalence.csv'],
  'chart-4-3': ['fgm_quintile_prevalence.csv'],
  'chart-5-1': ['migration.csv'],
};
const CHART_LATEST_VALUE_MISSING_NOTE = new Set([
  'chart-2-1',
  'chart-4-1',
  'chart-4-2',
  'chart-4-3',
]);

async function loadMissingDataNotesFromCsv() {
  try {
    const rows = await d3.csv('datasets/processed/missing_data_registry.csv', d3.autoType);
    if (!Array.isArray(rows) || !rows.length) return;

    const byDataset = new Map();
    rows
      .filter(r => r && r.dataset && r.country && r.missing_type)
      .forEach((r) => {
        const dataset = String(r.dataset).trim();
        const type = String(r.missing_type).trim().toLowerCase();
        const country = String(r.country).trim();
        if (!dataset || !country || !type) return;
        if (!byDataset.has(dataset)) byDataset.set(dataset, { noData: new Set(), incomplete: new Set() });
        const bucket = byDataset.get(dataset);
        if (type === 'no_data') bucket.noData.add(country);
        else if (type === 'incomplete') bucket.incomplete.add(country);
      });

    if (!byDataset.size) return;

    const nextNotes = {};
    Object.entries(CHART_MISSING_DATASETS).forEach(([chartId, datasets]) => {
      const noDataSet = new Set();
      const incompleteSet = new Set();
      datasets.forEach((dataset) => {
        const bucket = byDataset.get(dataset);
        if (!bucket) return;
        bucket.noData.forEach((country) => noDataSet.add(country));
        bucket.incomplete.forEach((country) => incompleteSet.add(country));
      });
      noDataSet.forEach((country) => incompleteSet.delete(country));
      const noData = Array.from(noDataSet).sort((a, b) => a.localeCompare(b));
      const incomplete = Array.from(incompleteSet).sort((a, b) => a.localeCompare(b));
      const line1 = `PAESI SENZA DATI: ${noData.length ? noData.join('; ') : 'nessuno.'}`;
      const line2 = CHART_LATEST_VALUE_MISSING_NOTE.has(chartId)
        ? 'PAESI CON DATI INCOMPLETI: non necessario per questa visualizzazione. Il grafico mostra l\'ultimo valore disponibile per ciascun paese e i dati non sono necessariamente allineati allo stesso anno.'
        : `PAESI CON DATI INCOMPLETI: ${incomplete.length ? incomplete.join('; ') : 'nessuno.'}`;
      nextNotes[chartId] = [line1, line2].join('\n');
    });

    MISSING_DATA_NOTES = nextNotes;
  } catch (err) {
    console.warn('missing_data_registry.csv non disponibile, uso fallback hardcoded.', err);
  }
}

function getNarrativeState(chartId) {
  const activeCard = getActiveNarrativeCard(chartId);
  const fromCard = activeCard ? parseInt(activeCard.dataset.state, 10) : NaN;
  if (Number.isFinite(fromCard)) return fromCard;
  const fromMemory = window._chartStates?.[chartId];
  return Number.isFinite(fromMemory) ? fromMemory : 0;
}

function getChartHelpPayload(chartId) {
  const activeCard = getActiveNarrativeCard(chartId);
  const chartEl = document.getElementById(chartId);
  const state = getNarrativeState(chartId);
  const chart = chartEl && typeof chartEl._getHelpContext === 'function'
    ? (chartEl._getHelpContext() || {})
    : {};
  const ctx = {
    chartId,
    state,
    chart,
    activeCardTitle: activeCard?.querySelector('h3')?.textContent?.trim() || '',
    activeCardText: activeCard?.querySelector('p')?.textContent?.trim() || '',
  };
  const builder = CHART_HELP_BUILDERS[chartId];
  if (typeof builder === 'function') return builder(ctx);
  return {
    description: 'Questo grafico non ha ancora una guida contestuale dedicata.',
    reading: 'Osserva assi, legenda e vista attiva per interpretare il dato mostrato.',
    interactions: 'Usa hover, filtri e controlli del grafico per approfondire.',
  };
}

const CHART_HELP_BUILDERS = {
  'chart-1-1': ({ chart }) => {
    const isTrend = chart.viewType === 'trend';
    return {
      description: isTrend
        ? 'La vista attuale mostra l\'andamento medio del reddito pro capite in Africa ed Europa nel tempo. Serve a confrontare la distanza tra le due traiettorie, non il singolo paese.'
        : 'La vista attuale mostra il reddito pro capite per paese su mappa. Colori più intensi indicano paesi con valori più alti nell\'anno selezionato.',
      reading: isTrend
        ? 'Asse X = anno. Asse Y = reddito pro capite medio. Le due linee confrontano Africa ed Europa; la loro distanza mostra il divario tra le aree.'
        : 'La legenda colore traduce il reddito pro capite: toni più chiari = livelli più bassi, toni più intensi = livelli più alti. L\'anno attivo è ' + (chart.currentYear || 'quello selezionato') + '.',
      interactions: isTrend
        ? 'Usa il toggle in alto per tornare alla mappa. Nella vista mappa puoi usare hover sui paesi, click per aprire il dettaglio e player per cambiare anno.'
        : 'Puoi usare slider e play per cambiare anno, hover per leggere il valore del paese, click per aprire il dettaglio laterale e toggle per passare alla vista trend.',
    };
  },
  'chart-1-2': ({ chart }) => ({
    description: 'Ogni bolla rappresenta un paese di Africa o Europa con reddito, aspettativa di vita e popolazione disponibili nello stesso anno. I paesi senza un trio completo per l\'anno selezionato vengono esclusi dalla vista.',
    reading: 'Asse X = reddito pro capite in scala logaritmica. Asse Y = aspettativa di vita. La dimensione della bolla rappresenta la popolazione. L\'anno mostrato ora è ' + (chart.currentYear || 'quello selezionato') + '.',
    interactions: 'Usa play e slider per far scorrere il tempo. Passa sulle bolle per leggere i dettagli del paese. La nota di copertura indica quanti paesi restano nel frame dopo il filtro sui tre valori.',
  }),
  'chart-2-1': ({ chart }) => {
    const isMap = chart.viewType === 'map';
    const severe = chart.mode === 'severe';
    return {
      description: isMap
        ? 'La vista attuale mostra l\'MPI su mappa. È utile per capire dove la povertà multidimensionale si concentra nello spazio.'
        : severe
          ? 'La vista attuale mostra la distribuzione dell\'MPI con focus sui paesi africani più esposti. Serve a capire quanti paesi si accumulano nella fascia più critica.'
          : 'La vista attuale mostra la distribuzione dell\'MPI. Serve a leggere come i paesi si distribuiscono lungo il livello di povertà multidimensionale.',
      reading: isMap
        ? 'La mappa non usa assi cartesiani: la lettura passa da posizione geografica, legenda colore e tooltip sui singoli paesi.'
        : 'Asse X = valore MPI. Asse Y = numero di paesi presenti in ogni intervallo. Barre più alte indicano fasce in cui si concentrano più paesi.',
      interactions: isMap
        ? 'Usa il toggle per passare alla distribuzione. Passa sui paesi per vedere il valore e confrontare rapidamente aree vicine.'
        : 'Usa il toggle per passare alla mappa. Hover e card narrative cambiano il focus tra vista generale e lettura più severa.',
    };
  },
  'chart-3-1': ({ chart }) => {
    const abs = chart.viewMetric === 'abs';
    return {
      description: abs
        ? 'La vista attuale confronta la spesa pubblica in istruzione come valore assoluto stimato in USD. È utile per capire la massa di risorse mobilitata.'
        : 'La vista attuale confronta la spesa pubblica in istruzione come quota del PIL. È utile per capire il peso relativo dell\'istruzione nelle economie considerate.',
      reading: 'Asse X = anno. Asse Y = ' + (abs ? 'spesa totale stimata in USD.' : 'spesa in istruzione come % del PIL.') + ' Le linee mostrano le medie continentali di Africa ed Europa.',
      interactions: 'Usa i pulsanti in alto per passare da % PIL a USD assoluti. I pallini restano sempre visibili lungo le linee: quando la copertura dati del continente scende sotto l\'80%, compare attorno al pallino un anello rosso tratteggiato. Nel tooltip trovi anche la percentuale di copertura per Africa ed Europa nell\'anno selezionato.',
    };
  },
  'chart-3-2': ({ chart }) => ({
    description: chart.drill
      ? `La vista attuale è il drill-down su ${chart.drill}. Mostra i singoli paesi, così puoi vedere dove il gap di genere è più lontano dalla parità.`
      : 'La vista attuale confronta Africa ed Europa sul GPI della scuola secondaria. Serve a leggere se il divario penalizza di più bambine o bambini.',
    reading: chart.drill
      ? 'Asse X = paesi della regione selezionata. Asse Y = valore del GPI. La linea di parità è a 1: sotto 1 c\'è svantaggio per le bambine, sopra 1 c\'è svantaggio per i bambini.'
      : 'Asse X = distanza dalla parità. Il valore 1 è la linea di equilibrio: a sinistra prevale lo svantaggio per le bambine, a destra quello per i bambini.',
    interactions: chart.drill
      ? 'Usa hover per leggere il valore del singolo paese e il pulsante back per tornare al confronto aggregato.'
      : 'Passa sui punti per leggere il dettaglio e clicca su un continente per entrare nel drill-down per paese.',
  }),
  'chart-3-3': ({ chart }) => {
    const outcome = chart.yMode === 'oos' ? 'bambini fuori scuola' : 'alfabetizzazione';
    const xLabel = 'spesa in istruzione in USD assoluti';
    const focus = chart.focusCont ? ` con focus su ${chart.focusCont}` : '';
    return {
      sections: [
        {
          label: 'Descrizione del grafico',
          text: `Il grafico si legge in due pannelli${focus}. In alto confronti la traiettoria annuale di Africa ed Europa con la spesa sempre in USD assoluti; in basso leggi un indice che riassume come cambia ${outcome} rispetto alla variazione della spesa.`,
        },
        {
          label: 'Grafico sopra',
          text: `Asse X = ${xLabel}. Asse Y = ${outcome}. Ogni punto corrisponde a un anno e la linea unisce la sequenza temporale del continente, così puoi vedere insieme livello, distanza tra Africa ed Europa e direzione del cambiamento.`,
        },
        {
          label: 'Grafico sotto',
          text: 'Asse X = anno. Asse Y = indice corretto annuale. Formula: I = ΔOutcome / |ΔSpesa|. Il grafico confronta la variazione dell\'outcome con la variazione di spesa tra un anno e il successivo. In modalità Fuori scuola, una diminuzione viene trattata come miglioramento, quindi il segno viene corretto internamente.',
        },
        {
          label: 'Interazioni possibili',
          text: 'Puoi cambiare continente e metrica con i pulsanti in alto. Passa sui punti del pannello sopra e sotto per leggere valori annuali, delta e indice calcolato.',
        },
      ],
    };
  },
  'chart-4-1': () => ({
    description: 'Ogni punto rappresenta un paese africano. Il grafico mette in relazione reddito pro capite e lavoro minorile per individuare aree di rischio relativo.',
    reading: 'Asse X = reddito pro capite in scala logaritmica. Asse Y = quota di lavoro minorile. Le due linee mediane dividono il piano in quattro quadranti, che aiutano a leggere i profili più critici o più protetti.',
    interactions: 'Passa sui punti per leggere il dettaglio del paese. Puoi anche fermarti sui quadranti per vedere quante osservazioni cadono in ciascuna area.',
  }),
  'chart-4-2': ({ chart }) => ({
    description: chart.drillDown
      ? `La vista attuale entra nei singoli paesi di ${chart.selectedContinent || 'Africa'}. Serve a confrontare la quota di matrimoni precoci paese per paese.`
      : 'La vista attuale mostra un waffle aggregato: ogni cella vale 1% di donne 20-24 sposate prima dei 18 anni. Serve a capire subito il peso del fenomeno.',
    reading: chart.drillDown
      ? 'Asse X = paesi del continente selezionato. Asse Y = quota di matrimoni precoci. I colori distinguono il contributo prima dei 15 anni e tra 15 e 18 anni.'
      : 'Non ci sono assi cartesiani. La lettura passa dalla griglia percentuale e dalla legenda colore: una tonalità rappresenta i matrimoni prima dei 15 anni, l\'altra quelli tra 15 e 18.',
    interactions: chart.drillDown
      ? 'Usa hover per leggere i dettagli dei singoli paesi e il pulsante back per tornare alla vista aggregata.'
      : 'Passa sulla griglia per leggere percentuali e volumi. Clicca su Africa o Europa per aprire il dettaglio per paese.',
  }),
  'chart-4-3': ({ chart }) => {
    const isMap = chart.mode === 'map';
    const selected = chart.selectedCountry ? `Paese selezionato: ${chart.selectedCountry}.` : '';
    return {
      description: isMap
        ? 'La vista attuale mostra una mappa coropletica dell\'Africa con intensita colore basata sulla media dei quintili FGM per paese.'
        : 'La vista attuale mostra un bar chart con la media africana per quintile di ricchezza sul fenomeno FGM tra ragazze 0-14 anni.',
      reading: isMap
        ? 'La mappa non usa assi cartesiani: il colore sintetizza la media dei cinque quintili (Poorest->Richest). Cliccando un paese, il popup mostra un grouped bar chart locale con confronto rispetto alla media africana.'
        : 'Il bar chart mostra cinque barre (Poorest, Second, Middle, Fourth, Richest). Barre piu alte significano prevalenza percentuale piu alta in quel quintile.',
      interactions: isMap
        ? `Clicca un paese per aggiornare il grouped bar chart locale. ${selected}Usa hover per leggere media e anno di riferimento.`
        : 'Usa il toggle in alto per passare alla mappa. In entrambe le viste, hover sulle barre per vedere i valori puntuali.',
    };
  },
  'chart-5-1': ({ chart }) => {
    const isMap = chart.mode === 'map';
    return {
      description: isMap
        ? 'La vista attuale mostra le rotte migratorie su base geografica. Serve a vedere dove si concentrano origine, destinazione e intensità dei collegamenti.'
        : 'La vista attuale mostra la rete dei collegamenti migratori. Serve a capire quali corridoi sono più forti e come si distribuiscono tra le aree.',
      reading: isMap
        ? 'La geografia conta più degli assi: leggi la mappa attraverso posizione, direzione delle rotte e spessore degli archi. Archi più spessi indicano stock migratori più elevati.'
        : 'Lo spessore dei collegamenti rappresenta l\'intensità dello stock migratorio. I nodi e i collegamenti aiutano a leggere quali aree pesano di più nella rete.',
      interactions: 'L\'anno resta fisso al 2020. Puoi passare da rete a mappa con i toggle in alto e usare hover sui collegamenti per leggere i valori.',
    };
  },
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

  const activeCard = getActiveNarrativeCard(chartId, { fallbackToFirst: !isMobileViewport() });
  const stateEl = placeholder.querySelector('.chart-mobile-placeholder-state');
  const hintEl = placeholder.querySelector('.chart-mobile-placeholder-hint');
  const rotateEl = placeholder.querySelector('.chart-mobile-placeholder-rotate');
  const title = activeCard?.querySelector('h3')?.textContent?.trim() || 'Vista iniziale';
  const needsRotate = isMobileViewport();

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

  const chartRoot = document.getElementById(chartId)?.closest('.chart-box');
  const chartHeader = chartRoot?.querySelector('.chart-header');
  const chartTitle = chartHeader?.querySelector('.chart-title')?.textContent?.trim();
  const chartSubtitle = chartHeader?.querySelector('.chart-subtitle')?.textContent?.trim();
  const activeCard = getActiveNarrativeCard(chartId, { fallbackToFirst: !isMobileViewport() });
  const section = chartRoot?.closest('section[data-act]') || activeCard?.closest('section[data-act]');
  const act = section?.dataset.act;

  kickerEl.textContent = act ? `Atto ${act}` : 'Grafico interattivo';
  titleEl.textContent = chartTitle || activeCard?.querySelector('h3')?.textContent?.trim() || 'Grafico interattivo';
  hintEl.textContent = chartSubtitle || 'Usa i controlli del grafico per esplorare i dati a schermo intero.';
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
    ['chart-1-1', () => renderIncomeChoroplethChart('#chart-1-1')],
    ['chart-1-2', () => renderIncomeLifeExpectancyBubbleChart('#chart-1-2')],
    ['chart-2-1', () => renderMpiBreakdown('#chart-2-1')],
    ['chart-3-1', () => renderEducationSpendingChart('#chart-3-1')],
    ['chart-3-2', () => renderGenderParityChart('#chart-3-2')],
    ['chart-3-3', () => renderEducationOutcomesChart('#chart-3-3')],
    ['chart-4-1', () => renderChildLaborChart('#chart-4-1')],
    ['chart-4-2', () => renderChildMarriageChart('#chart-4-2')],
    ['chart-4-3', () => renderFgmChart('#chart-4-3')],
    ['chart-5-1', () => renderMigrationChart('#chart-5-1')],
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
  initHeroCarousel();
  initMobilePlaceholders();
  initFullscreenModal();
  initNarrativeCards();
  await loadMissingDataNotesFromCsv();
  initMissingDataHints();
  initChartInfoModal();
  initAdaptiveHintButtons();
  initChartInteractionAnimations();
  window.addEventListener('resize', debounce(() => {
    syncNarrativeCardInteractivity();
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

function syncNarrativeCardInteractivity() {
  const mobile = isMobileViewport();
  const cards = document.querySelectorAll('.narrative-card');
  cards.forEach((card) => {
    if (mobile) {
      card.classList.remove('is-active');
      card.setAttribute('aria-disabled', 'true');
      card.removeAttribute('role');
      card.removeAttribute('tabindex');
    } else {
      card.removeAttribute('aria-disabled');
      card.setAttribute('role', 'button');
      if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
    }
  });

  if (mobile) return;

  [...new Set(Array.from(cards).map(card => card.dataset.chart))].forEach((chartId) => {
    const chartCards = getNarrativeCards(chartId);
    if (!chartCards.length || chartCards.some(card => card.classList.contains('is-active'))) return;

    const savedState = window._chartStates?.[chartId];
    const nextActive = Number.isFinite(savedState)
      ? chartCards.find(card => parseInt(card.dataset.state, 10) === savedState)
      : null;

    (nextActive || chartCards[0])?.classList.add('is-active');
  });
}

function initNarrativeCards() {
  const cards = document.querySelectorAll('.narrative-card');
  const activate = (card) => {
    if (isMobileViewport()) return;
    const chartId = card.dataset.chart;
    const state = parseInt(card.dataset.state, 10);
    document.querySelectorAll(`.narrative-card[data-chart="${chartId}"]`)
      .forEach(c => c.classList.remove('is-active'));
    card.classList.add('is-active');
    triggerChartState(chartId, state);
  };
  syncNarrativeCardInteractivity();

  cards.forEach(card => {
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
  const setHintModalPayload = (btn, title, bodyText) => {
    const lines = String(bodyText || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    btn.dataset.modalTitle = title;
    btn.dataset.modalLines = JSON.stringify(lines);
    btn.setAttribute('aria-haspopup', 'dialog');
  };

  const chartBoxes = document.querySelectorAll('.chart-box');
  chartBoxes.forEach((box) => {
    const chartEl = box.querySelector('div[id^="chart-"]');
    if (!chartEl) return;
    const missingNote = MISSING_DATA_NOTES[chartEl.id];
    const helpBuilder = CHART_HELP_BUILDERS[chartEl.id];
    const datasetNote = DATASET_NOTES[chartEl.id];

    if (missingNote && !box.querySelector('.missing-data-hint')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'missing-data-hint';
      btn.setAttribute('aria-label', 'Informazioni sui dati mancanti');
      btn.innerHTML = MISSING_DATA_ICON;
      setHintModalPayload(btn, 'Dati mancanti e copertura', missingNote);
      box.appendChild(btn);
    }

    if (datasetNote && !box.querySelector('.chart-dataset-hint')) {
      const datasetBtn = document.createElement('button');
      datasetBtn.type = 'button';
      datasetBtn.className = 'chart-dataset-hint';
      datasetBtn.setAttribute('aria-label', 'Dataset utilizzati');
      datasetBtn.innerHTML = DATASET_ICON;
      setHintModalPayload(datasetBtn, 'Dataset utilizzati', datasetNote);
      box.appendChild(datasetBtn);
    }

    if (helpBuilder && !box.querySelector('.chart-help-hint')) {
      const helpBtn = document.createElement('button');
      helpBtn.type = 'button';
      helpBtn.className = 'chart-help-hint';
      helpBtn.setAttribute('aria-label', 'Come leggere il grafico');
      helpBtn.innerHTML = '<span aria-hidden="true">?</span>';
      helpBtn.dataset.chartId = chartEl.id;
      helpBtn.dataset.modalTitle = 'Come leggere questo grafico';
      helpBtn.dataset.modalKind = 'chart-help';
      helpBtn.setAttribute('aria-haspopup', 'dialog');
      box.appendChild(helpBtn);
    }
  });
}

function initChartInfoModal() {
  if (document.getElementById('chartInfoModal')) return;

  const modal = document.createElement('div');
  modal.id = 'chartInfoModal';
  modal.className = 'chart-info-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="chart-info-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="chartInfoModalTitle">
      <button type="button" class="chart-info-modal-close" aria-label="Chiudi informazioni">×</button>
      <h3 id="chartInfoModalTitle" class="chart-info-modal-title"></h3>
      <div id="chartInfoModalContent" class="chart-info-modal-content"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const titleEl = modal.querySelector('#chartInfoModalTitle');
  const contentEl = modal.querySelector('#chartInfoModalContent');
  const closeBtn = modal.querySelector('.chart-info-modal-close');
  let lastTrigger = null;

  const fullscreenModal = () => document.getElementById('fullscreenModal');
  const shouldKeepBodyLocked = () => fullscreenModal()?.classList.contains('is-active');

  const closeModal = () => {
    modal.classList.remove('is-active');
    modal.hidden = true;
    if (!shouldKeepBodyLocked()) document.body.style.overflow = '';
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  };

  const openModal = (triggerBtn) => {
    if (!triggerBtn) return;
    lastTrigger = triggerBtn;
    const isChartHelp = triggerBtn.classList.contains('chart-help-hint');
    const title = triggerBtn.dataset.modalTitle || triggerBtn.getAttribute('aria-label') || 'Informazioni';
    let payload;

    if (isChartHelp) {
      payload = getChartHelpPayload(triggerBtn.dataset.chartId);
    } else {
      let lines = [];
      try {
        lines = JSON.parse(triggerBtn.dataset.modalLines || '[]');
      } catch (err) {
        lines = [];
      }
      payload = Array.isArray(lines) && lines.length
        ? lines
        : ['Informazioni non disponibili.'];
    }

    const renderStructuredContent = (host, sectionTitle, sectionPayload) => {
      host.innerHTML = '';
      if (sectionPayload && typeof sectionPayload === 'object' && !Array.isArray(sectionPayload)) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-info-sections';
        const sections = Array.isArray(sectionPayload.sections) && sectionPayload.sections.length
          ? sectionPayload.sections
          : [
              { label: 'Descrizione del grafico', text: sectionPayload.description || '' },
              { label: 'Assi, legenda e chiavi di lettura', text: sectionPayload.reading || '' },
              { label: 'Interazioni possibili', text: sectionPayload.interactions || '' },
            ].filter(section => section.text);

        sections.forEach((section) => {
          const block = document.createElement('section');
          block.className = 'chart-info-section';

          const h = document.createElement('h4');
          h.className = 'chart-info-label';
          h.textContent = section.label;
          block.appendChild(h);

          const p = document.createElement('p');
          p.className = 'chart-info-text';
          p.textContent = section.text;
          block.appendChild(p);

          wrapper.appendChild(block);
        });
        host.appendChild(wrapper);
        return;
      }

      const titleNorm = String(sectionTitle || '').toLowerCase();
      const isReadingHelp = titleNorm.includes('come leggere');
      const rows = sectionPayload
        .map(line => String(line || '').trim())
        .filter(Boolean);

      if (!rows.length) return;

      if (isReadingHelp) {
        const intro = document.createElement('p');
        intro.className = 'chart-info-intro';
        intro.textContent = rows[0];
        host.appendChild(intro);
      }

      const sections = document.createElement('div');
      sections.className = 'chart-info-sections';

      rows.forEach((line, index) => {
        if (isReadingHelp && index === 0) return;

        const block = document.createElement('section');
        block.className = 'chart-info-section';
        const sep = line.indexOf(':');
        const hasLabel = sep > 0 && sep < line.length - 1;

        if (hasLabel) {
          const label = line.slice(0, sep).trim();
          const text = line.slice(sep + 1).trim();

          const h = document.createElement('h4');
          h.className = 'chart-info-label';
          h.textContent = label;
          block.appendChild(h);

          if (/^formula$/i.test(label)) {
            const formula = document.createElement('pre');
            formula.className = 'chart-info-formula';
            formula.textContent = text;
            block.appendChild(formula);
          } else {
            const p = document.createElement('p');
            p.className = 'chart-info-text';
            p.textContent = text;
            block.appendChild(p);
          }
        } else {
          const p = document.createElement('p');
          p.className = 'chart-info-text';
          p.textContent = line;
          block.appendChild(p);
        }

        sections.appendChild(block);
      });

      host.appendChild(sections);
    };

    titleEl.textContent = title;
    renderStructuredContent(contentEl, title, payload);
    modal.hidden = false;
    modal.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('.missing-data-hint, .chart-dataset-hint, .chart-help-hint');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    openModal(trigger);
  });

  closeBtn.addEventListener('click', (event) => {
    event.preventDefault();
    closeModal();
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
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
      <span class="chart-mobile-placeholder-rotate">Questo grafico rende meglio in orizzontale. Se puoi, ruota il telefono prima di aprirlo.</span>
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
  const closeBtn = document.querySelector('.fullscreen-modal-close');
  const container = document.getElementById('fullscreenChartContainer');
  if (!modal || !closeBtn || !container) return;

  let currentChartId = null;
  let reopenTimer = null;

  function close() {
    modal.classList.remove('is-active');
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

    const stage = document.createElement('div');
    stage.className = 'fullscreen-chart-stage';
    const wrap = document.createElement('div');
    wrap.className = 'fullscreen-chart-wrap';
    wrap.id = `fullscreen-${chartId}`;
    stage.appendChild(wrap);
    container.appendChild(stage);

    try {
      await withChartLoading(chartId, async () => {
        if (chartId === 'chart-1-1') await renderIncomeChoroplethChart(`#fullscreen-${chartId}`, true);
        else if (chartId === 'chart-1-2') await renderIncomeLifeExpectancyBubbleChart(`#fullscreen-${chartId}`, true);
        else if (chartId === 'chart-2-1') await renderMpiBreakdown(`#fullscreen-${chartId}`, true);
        else if (chartId === 'chart-3-1') await renderEducationSpendingChart(`#fullscreen-${chartId}`, true);
        else if (chartId === 'chart-3-2') await renderGenderParityChart(`#fullscreen-${chartId}`, true);
        else if (chartId === 'chart-3-3') await renderEducationOutcomesChart(`#fullscreen-${chartId}`, true);
        else if (chartId === 'chart-4-1') await renderChildLaborChart(`#fullscreen-${chartId}`, true);
        else if (chartId === 'chart-4-2') await renderChildMarriageChart(`#fullscreen-${chartId}`, true);
        else if (chartId === 'chart-4-3') await renderFgmChart(`#fullscreen-${chartId}`, true);
        else if (chartId === 'chart-5-1') await renderMigrationChart(`#fullscreen-${chartId}`, true);
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
    if (!modal.classList.contains('is-active') || !currentChartId) return;
    clearTimeout(reopenTimer);
    reopenTimer = setTimeout(() => open(currentChartId), 180);
  });
}

document.addEventListener('DOMContentLoaded', init);
