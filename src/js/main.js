/* ============================================================
   VENI VIDI VIZ — main.js v3
   Scroll normale. Niente slide-mode, niente overlay card.
   ============================================================ */

/* ── Utilities ───────────────────────────────────────────── */

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
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

function getChartColors() {
  return window.CHART_COLORS || {};
}

function getContinentColor(continent, fallback = '#888888') {
  return getChartColors().continents?.[continent] || fallback;
}

function getMetricStops(metric, fallback = []) {
  const stops = getChartColors().metrics?.[metric];
  return Array.isArray(stops) && stops.length ? stops : fallback;
}

function getThemeColor(theme, fallback = '') {
  return getChartColors().themes?.[theme] || fallback;
}

function getActColor(act, fallback = '') {
  return getCssToken('control-active', getCssToken('accent-1', fallback));
}

function getActColorStrong(act, fallback = '') {
  return getCssToken('control-active-strong', getCssToken('accent-1-strong', fallback));
}

function getCountryPalette(fallback = []) {
  const palette = getChartColors().countries;
  return Array.isArray(palette) && palette.length ? palette : fallback;
}

function getCountryColor(countryKey, fallback = '#888888') {
  const palette = getCountryPalette();
  if (!palette.length || !countryKey) return fallback;
  const input = String(countryKey).trim().toUpperCase();
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % palette.length;
  return palette[index] || fallback;
}

function getUiColor(key, fallback = '') {
  return getChartColors().ui?.[key] || fallback;
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
window.getThemeColor = getThemeColor;
window.getActColor = getActColor;
window.getActColorStrong = getActColorStrong;
window.getCountryPalette = getCountryPalette;
window.getCountryColor = getCountryColor;
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
    btn.classList.contains('chart-dataset-hint') ||
    btn.classList.contains('chart-help-hint') ||
    btn.classList.contains('player-control-btn') ||
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
    }, 3000);
  };

  carousel.addEventListener('focusin', stopAutoRotate);
  carousel.addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!carousel.contains(document.activeElement)) startAutoRotate();
    }, 0);
  });

  setActiveSlide(activeIndex);
  startAutoRotate();
}

const DATASET_NOTES = {
  'chart-1-1': [
    'Income per capita'
  ].join('\n'),
  'chart-1-2': [
    'Income per capita',
    'Life expectancy',
    'Population'
  ].join('\n'),
  'chart-2-1': [
    'Multidimensional Poverty Index (MPI)'
  ].join('\n'),
  'chart-3-1': [
    'Public spending on education',
    'Income per capita',
    'Population'
  ].join('\n'),
  'chart-3-2': [
    'Gender Parity Index (GPI)',
  ].join('\n'),
  'chart-3-3': [
    'Public spending on education',
    'Youth literacy',
    'Out-of-school children',
    'Income per capita',
    'Population'
  ].join('\n'),
  'chart-4-1': [
    'Child labor',
    'Income per capita'
  ].join('\n'),
  'chart-4-2': [
    'Child marriage'
  ].join('\n'),
  'chart-4-3': [
    'Female genital mutilation (FGM)'
  ].join('\n'),
  'chart-5-1': [
    'International migration'
  ].join('\n'),
};

const CHART_WARNING_NOTES = {
  'chart-2-1': 'The data show the latest available year for each country. Years are not perfectly aligned.',
  'chart-3-2': 'The data show the latest available year for each country. Years are not perfectly aligned.',
  'chart-3-3': 'The data show the latest available year for each country. Years are not perfectly aligned.',
  'chart-4-1': 'The data show the latest sampled year for each country. Years are not perfectly aligned.',
  'chart-4-2': 'The data show the latest sampled year for each country. Years are not perfectly aligned.',
  'chart-4-3': 'The data show the latest sampled year for each country. Years are not perfectly aligned.',
};

function getChartContext(chartId) {
  const chartEl = document.getElementById(chartId);
  return chartEl && typeof chartEl._getHelpContext === 'function'
    ? (chartEl._getHelpContext() || {})
    : {};
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
  const state = getNarrativeState(chartId);
  const chart = getChartContext(chartId);
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
    description: 'This chart does not yet have a dedicated contextual guide.',
    reading: 'Use axes, legend, and the active view to interpret the data being shown.',
    interactions: 'Use hover, filters, and chart controls to explore further.',
  };
}

const CHART_HELP_BUILDERS = {
  'chart-1-1': ({ chart }) => {
    const isTrend = chart.viewType === 'trend';
    return {
      description: isTrend
        ? 'The current view shows the average trend of income per capita in Africa and Europe over time. It is meant to compare the distance between the two trajectories, not individual countries.'
        : 'The current view shows income per capita by country on a map. Stronger colors indicate countries with higher values in the selected year.',
      reading: isTrend
        ? 'X axis = year. Y axis = average income per capita. The two lines compare Africa and Europe; the distance between them shows the gap between the areas.'
        : 'The color legend encodes income per capita: lighter tones = lower levels, stronger tones = higher levels. The active year is ' + (chart.currentYear || 'the selected one') + '.',
      interactions: isTrend
        ? 'Use the top toggle to return to the map. In map view you can hover over countries, click to open details, and use the player to change year.'
        : 'You can use the slider and play button to change year, hover to read country values, click to open the side detail, and use the toggle to switch to trend view.',
    };
  },
  'chart-1-2': ({ chart }) => ({
    description: 'Each bubble represents a country in Africa or Europe with income, life expectancy, and population available for the same year. Countries without a complete trio for the selected year are excluded from the view.',
    reading: 'X axis = income per capita on a logarithmic scale. Y axis = life expectancy. Bubble size represents population. The year currently shown is ' + (chart.currentYear || 'the selected one') + '.',
    interactions: 'Use play and the slider to move through time. Hover over bubbles to read country details. The coverage note shows how many countries remain in frame after the three-value filter.',
  }),
  'chart-2-1': ({ chart }) => {
    const isMap = chart.viewType === 'map';
    const severe = chart.mode === 'severe';
    return {
      description: isMap
        ? 'The current view shows the MPI on a map. It is useful for understanding where multidimensional poverty is concentrated in space.'
        : severe
          ? 'The current view shows the distribution of MPI with a focus on the most exposed African countries. It helps show how many countries accumulate in the most critical range.'
          : 'The current view shows the distribution of MPI. It helps read how countries are distributed along the multidimensional poverty scale.',
      reading: isMap
        ? 'The map does not use Cartesian axes: interpretation depends on geographic position, color legend, and country tooltips.'
        : 'X axis = MPI value. Y axis = number of countries in each interval. Higher bars indicate ranges where more countries are concentrated.',
      interactions: isMap
        ? 'Use the toggle to switch to the distribution. Hover over countries to see the value and quickly compare nearby areas.'
        : 'Use the toggle to switch to the map. Hover and narrative cards shift the focus between the general view and a harsher reading.',
    };
  },
  'chart-3-1': ({ chart }) => {
    const abs = chart.viewMetric === 'abs';
    return {
      description: abs
        ? 'The current view compares public spending on education as an estimated absolute value in USD. It is useful for understanding the total mass of resources mobilized.'
        : 'The current view compares public spending on education as a share of GDP. It is useful for understanding the relative weight of education in the economies considered.',
      reading: 'X axis = year. Y axis = ' + (abs ? 'estimated total spending in USD.' : 'education spending as % of GDP.') + ' The lines show continental averages for Africa and Europe.',
      interactions: 'Use the top buttons to switch from % of GDP to absolute USD. The dots remain visible along the lines. The tooltip also reports coverage percentage for Africa and Europe in the selected year.',
    };
  },
  'chart-3-2': ({ chart }) => ({
    description: chart.drill
      ? `The current view is the drill-down for ${chart.drill}. It shows individual countries so you can see who is below the parity band, who falls inside it, and who exceeds it.`
      : 'The current view compares Africa and Europe on the secondary-school GPI. It helps show whether the gap penalizes girls or boys more.',
    reading: chart.drill
      ? 'X axis = countries in the selected region. Y axis = GPI value. Parity is represented as a band between 0.97 and 1.03: below 0.97 there is disadvantage for girls, above 1.03 for boys.'
      : 'X axis = GPI value relative to the parity band. Left of 0.97 disadvantage for girls prevails, between 0.97 and 1.03 the country is in parity, above 1.03 disadvantage for boys prevails.',
    interactions: chart.drill
      ? 'Use hover to read the value for each country and the back button to return to the aggregate comparison.'
      : 'Hover over points to read details and click on a continent to enter the country drill-down.',
  }),
  'chart-3-3': ({ chart }) => {
    const outcomeLabel = chart.yMode === 'oos' ? 'primary out-of-school rate' : 'literacy';
    const xLabel = 'education spending as an estimated absolute value in USD';
    const focus = chart.focusCont ? ` con focus su ${chart.focusCont}` : '';
    return {
      sections: [
        {
          label: 'Chart Description',
          text: `The chart shows a single annual aggregated trajectory${focus ? focus.replace(' con focus su ', ' with a focus on ') : ''}. Spending is expressed as an estimated absolute value in USD and is related to ${outcomeLabel}.`,
        },
        {
          label: 'How To Read It',
          text: `X axis = ${xLabel}. Y axis = ${outcomeLabel}. Each point corresponds to one year and the line links Africa's time sequence, so you can read level, direction, and irregularity of change together.`,
        },
        {
          label: 'Regression Line',
          text: 'The dashed diagonal summarizes the overall average trend. It helps distinguish the general direction of the phenomenon from local oscillations in the path.',
        },
        {
          label: 'Available Interactions',
          text: 'You can change metric with the top buttons. Hover over points to read year, values, and available data coverage.',
        },
      ],
    };
  },
  'chart-4-1': () => ({
    description: 'Each point represents an African country. The chart relates income per capita and child labor to identify areas of relative risk.',
    reading: 'X axis = income per capita on a logarithmic scale. Y axis = share of child labor. The two median lines divide the plane into four quadrants, helping read the most critical or protected profiles.',
    interactions: 'Hover over points to read country details. You can also stop on the quadrants to see how many observations fall into each area.',
  }),
  'chart-4-2': ({ chart }) => ({
    description: chart.drillDown
      ? `The current view drills into individual countries in ${chart.selectedContinent || 'Africa'}. It is used to compare the share of child marriage country by country.`
      : 'The current view shows an aggregated waffle chart: each cell equals 1% of women aged 20-24 married before 18. It helps show the weight of the phenomenon immediately.',
    reading: chart.drillDown
      ? 'X axis = countries in the selected continent. Y axis = share of child marriage. Colors distinguish the contribution before age 15 and between 15 and 18.'
      : 'There are no Cartesian axes. Interpretation relies on the percentage grid and the color legend: one tone represents marriages before 15, the other those between 15 and 18.',
    interactions: chart.drillDown
      ? 'Use hover to read individual country details and the back button to return to the aggregated view.'
      : 'Hover over the grid to read percentages and volumes. Click on Africa or Europe to open the country detail.',
  }),
  'chart-4-3': ({ chart }) => {
    const isMap = chart.mode === 'map';
    const selected = chart.selectedCountry ? `Selected country: ${chart.selectedCountry}.` : '';
    return {
      description: isMap
        ? 'The current view shows a choropleth map of Africa with color intensity based on the average FGM quintile value for each country.'
        : 'The current view shows a bar chart with the African average by wealth quintile for FGM among girls aged 0-14.',
      reading: isMap
        ? 'The map does not use Cartesian axes: color summarizes the average across the five quintiles (Poorest -> Richest). Clicking a country opens a local grouped bar chart compared with the African average.'
        : 'The bar chart shows five bars (Poorest, Second, Middle, Fourth, Richest). Higher bars mean higher prevalence in that quintile.',
      interactions: isMap
        ? `Click a country to update the local grouped bar chart. ${selected}Use hover to read average and reference year.`
        : 'Use the top toggle to switch to the map. In both views, hover over bars to see exact values.',
    };
  },
  'chart-5-1': ({ chart }) => {
    const isMap = chart.mode === 'map';
    return {
      description: isMap
        ? 'The current view shows migration routes on a geographic basis. It helps reveal where origins, destinations, and connection intensity are concentrated.'
        : 'The current view shows the network of migration links. It helps identify which corridors are stronger and how they are distributed across areas.',
      reading: isMap
        ? 'Geography matters more than axes: read the map through position, route direction, and arc thickness. Thicker arcs indicate higher migrant stocks.'
        : 'Link thickness represents the intensity of migrant stock. Nodes and links help identify which areas carry more weight in the network.',
      interactions: 'The year stays fixed at 2020. You can switch from network to map with the top toggles and use hover on links to read values.',
    };
  },
};

const DATASET_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="4.5" y="5.5" width="15" height="13" rx="2"></rect>
    <path d="M4.5 10h15M9.5 5.5v13M14.5 5.5v13"></path>
  </svg>
`;

function syncMobilePlaceholder(chartId) {
  const chartEl = document.getElementById(chartId);
  if (!chartEl) return;

  const placeholder = chartEl.closest('.chart-box')?.querySelector('.chart-mobile-placeholder');
  if (!placeholder) return;

  const activeCard = getActiveNarrativeCard(chartId, { fallbackToFirst: !isMobileViewport() });
  const stateEl = placeholder.querySelector('.chart-mobile-placeholder-state');
  const hintEl = placeholder.querySelector('.chart-mobile-placeholder-hint');
  const rotateEl = placeholder.querySelector('.chart-mobile-placeholder-rotate');
  const title = activeCard?.querySelector('h3')?.textContent?.trim() || 'Initial view';
  const needsRotate = isMobileViewport();

  placeholder.dataset.hasSelection = activeCard ? 'true' : 'false';
  placeholder.dataset.needsRotate = needsRotate ? 'true' : 'false';
  if (stateEl) stateEl.textContent = title;
  placeholder.setAttribute('aria-label', `Open the interactive chart in the "${title}" view`);
  if (hintEl) {
    hintEl.textContent = isMobileViewport()
      ? (needsRotate ? 'Tap to open the chart' : 'Tap to open the chart fullscreen')
      : 'Open the chart';
  }
  if (rotateEl) {
    rotateEl.textContent = 'This chart works better in landscape mode. If possible, rotate your phone before opening it.';
  }
}

function updateFullscreenModalMeta(chartId) {
  const modal = document.getElementById('fullscreenModal');
  const titleEl = document.getElementById('fullscreenModalTitle');
  const kickerEl = document.getElementById('fullscreenModalKicker');
  const hintEl = document.getElementById('fullscreenModalHint');
  if (!modal || !titleEl || !kickerEl || !hintEl) return;

  const chartRoot = document.getElementById(chartId)?.closest('.chart-box');
  const chartHeader = chartRoot?.querySelector('.chart-header');
  const chartTitle = chartHeader?.querySelector('.chart-title')?.textContent?.trim();
  const chartSubtitle = chartHeader?.querySelector('.chart-subtitle')?.textContent?.trim();
  const activeCard = getActiveNarrativeCard(chartId, { fallbackToFirst: !isMobileViewport() });
  const section = chartRoot?.closest('section[data-act]') || activeCard?.closest('section[data-act]');
  const act = section?.dataset.act;

  modal.style.setProperty('--fullscreen-accent', 'var(--control-active)');

  kickerEl.textContent = act ? `Act ${act}` : 'Interactive chart';
  titleEl.textContent = chartTitle || activeCard?.querySelector('h3')?.textContent?.trim() || 'Interactive chart';
  hintEl.textContent = chartSubtitle || 'Use the chart controls to explore the data in fullscreen.';
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
  initNavbar();
  initHeroCarousel();
  initMobilePlaceholders();
  initFullscreenModal();
  initNarrativeCards();
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
    if (state === 0 && el._choroplethShowPlayMap) el._choroplethShowPlayMap();
    else if (state === 1 && el._choroplethShowTrend) el._choroplethShowTrend();
    else if (state === 2 && el._choroplethZoomAfrica) el._choroplethZoomAfrica();
  }

  if (chartId === 'chart-1-2') {
    if (state === 0 && el._gapminderReset) el._gapminderReset();
    else if (state === 1 && el._gapminderAnimate) el._gapminderAnimate();
  }

  if (chartId === 'chart-2-1') {
    if (state === 0 && el._mpiReset) el._mpiReset();
    else if (state === 1 && el._mpiFilterContinent) el._mpiFilterContinent('Africa');
    else if (state === 2 && el._mpiZoomAfrica) el._mpiZoomAfrica();
  }

  if (chartId === 'chart-3-1') {
    if (state === 0 && el._treemapReset) el._treemapReset();
    else if (state === 1 && el._treemapSetMetric) el._treemapSetMetric('abs');
  }

  if (chartId === 'chart-3-2') {
    if (state === 0 && el._bumpReset) el._bumpReset();
    else if (state === 1 && el._bumpHighlightAfrica) el._bumpHighlightAfrica();
    else if (state === 2 && el._bumpHighlightEurope) el._bumpHighlightEurope();
  }

  if (chartId === 'chart-3-3') {
    if (state === 0 && el._exclusionShowBase) el._exclusionShowBase();
    else if (state === 1 && el._exclusionShowGpi) el._exclusionShowGpi();
    else if (state === 2 && el._exclusionShowGpi) el._exclusionShowGpi();
  }

  if (chartId === 'chart-4-1') {
    if (state === 0 && el._bubbleReset) el._bubbleReset();
  }

  if (chartId === 'chart-4-2') {
    if (state === 0 && el._marriageReset) el._marriageReset();
    else if (state === 2 && el._marriageShowTrend) el._marriageShowTrend();
  }

  if (chartId === 'chart-4-3') {
    if (state === 0 && el._mortalityScatter) el._mortalityScatter();
    else if (state === 1 && el._mortalityHighlightMarriage) el._mortalityHighlightMarriage();
    else if (state === 2 && el._mortalitySlope) el._mortalitySlope();
  }

  if (chartId === 'chart-5-1') {
    if (state === 0 && el._migrationShowYear) el._migrationShowYear(2020);
    else if (state === 1 && el._migrationShowMap) el._migrationShowMap();
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
  const DATASET_TOOLTIP_TITLE = 'Datasets used';
  const datasetTooltip = window.ensureHoverTooltip('chart-dataset-tooltip', {
    className: 'chart-hover-tooltip chart-hover-tooltip--light chart-dataset-tooltip',
    maxWidth: 'min(92vw, 24rem)',
  });
  let activeDatasetHint = null;

  const parseDatasetLines = (bodyText) => String(bodyText || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const getDatasetTooltipLines = (triggerBtn) => {
    if (!triggerBtn) return [];
    try {
      const parsed = JSON.parse(triggerBtn.dataset.tooltipLines || '[]');
      if (Array.isArray(parsed)) return parsed.map(line => String(line || '').trim()).filter(Boolean);
    } catch (err) {
      // Fall back to plain-text parsing if the dataset payload is not valid JSON.
    }
    return parseDatasetLines(triggerBtn.dataset.tooltipLines || '');
  };

  const positionDatasetTooltip = (triggerBtn) => {
    if (!triggerBtn) return;
    const rect = triggerBtn.getBoundingClientRect();
    window.positionHoverTooltip(datasetTooltip, {
      clientX: rect.right,
      clientY: rect.top + (rect.height / 2),
    }, {
      offsetX: 12,
      offsetY: -18,
      margin: 12,
    });
  };

  const hideDatasetTooltip = () => {
    if (activeDatasetHint) activeDatasetHint.setAttribute('aria-expanded', 'false');
    activeDatasetHint = null;
    window.hideHoverTooltip(datasetTooltip);
  };

  const showDatasetTooltip = (triggerBtn) => {
    if (!triggerBtn) return;
    const rows = getDatasetTooltipLines(triggerBtn);
    if (!rows.length) {
      hideDatasetTooltip();
      return;
    }
    if (activeDatasetHint && activeDatasetHint !== triggerBtn) {
      activeDatasetHint.setAttribute('aria-expanded', 'false');
    }
    activeDatasetHint = triggerBtn;
    triggerBtn.setAttribute('aria-expanded', 'true');
    window.showHoverTooltip(datasetTooltip, {
      clientX: triggerBtn.getBoundingClientRect().right,
      clientY: triggerBtn.getBoundingClientRect().top + (triggerBtn.getBoundingClientRect().height / 2),
    }, {
      title: DATASET_TOOLTIP_TITLE,
      rows: rows.map(line => ({
        html: `<span class="chart-dataset-tooltip__item">${window.escapeHtml(line)}</span>`,
      })),
    }, {
      offsetX: 12,
      offsetY: -18,
      margin: 12,
    });
    positionDatasetTooltip(triggerBtn);
  };

  const mountDatasetHint = (host, chartId) => {
    if (!host || !chartId) return;
    const datasetNote = DATASET_NOTES[chartId];

    host.querySelectorAll('.chart-dataset-hint, .chart-help-hint')
      .forEach((el) => el.remove());

    if (!datasetNote || host.querySelector('.chart-dataset-hint')) return;

    const datasetBtn = document.createElement('button');
    datasetBtn.type = 'button';
    datasetBtn.className = 'chart-dataset-hint';
    datasetBtn.setAttribute('aria-label', 'Datasets used');
    datasetBtn.setAttribute('aria-expanded', 'false');
    datasetBtn.innerHTML = DATASET_ICON;
    datasetBtn.dataset.tooltipLines = JSON.stringify(parseDatasetLines(datasetNote));
    datasetBtn.addEventListener('mouseenter', () => showDatasetTooltip(datasetBtn));
    datasetBtn.addEventListener('focus', () => showDatasetTooltip(datasetBtn));
    datasetBtn.addEventListener('mousemove', () => positionDatasetTooltip(datasetBtn));
    datasetBtn.addEventListener('mouseleave', () => {
      if (activeDatasetHint === datasetBtn && document.activeElement !== datasetBtn) hideDatasetTooltip();
    });
    datasetBtn.addEventListener('blur', () => {
      window.setTimeout(() => {
        if (document.activeElement !== datasetBtn && activeDatasetHint === datasetBtn) hideDatasetTooltip();
      }, 0);
    });
    datasetBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (activeDatasetHint === datasetBtn) hideDatasetTooltip();
      else showDatasetTooltip(datasetBtn);
    });
    host.appendChild(datasetBtn);
  };

  const mountStaticWarningHint = (host, chartId) => {
    if (!host || !chartId || typeof window.mountChartWarningHint !== 'function') return;
    const warningNote = CHART_WARNING_NOTES[chartId];
    if (!warningNote) {
      host.classList.remove('has-warning-hint');
      return;
    }
    if (host.querySelector('.chart-warning-hint-inline')) {
      host.classList.add('has-warning-hint');
      return;
    }
    window.mountChartWarningHint(host, warningNote);
  };

  const chartBoxes = document.querySelectorAll('.chart-box');
  chartBoxes.forEach((box) => {
    const chartEl = box.querySelector('div[id^="chart-"]');
    if (!chartEl) return;
    mountStaticWarningHint(box, chartEl.id);
    mountDatasetHint(box, chartEl.id);
  });

  window.mountDatasetHint = mountDatasetHint;

  document.addEventListener('pointerdown', (event) => {
    if (!activeDatasetHint) return;
    if (event.target.closest('.chart-dataset-hint') === activeDatasetHint) return;
    hideDatasetTooltip();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeDatasetHint) hideDatasetTooltip();
  });

  window.addEventListener('scroll', () => {
    if (activeDatasetHint) positionDatasetTooltip(activeDatasetHint);
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (activeDatasetHint) positionDatasetTooltip(activeDatasetHint);
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
      <button type="button" class="chart-info-modal-close" aria-label="Close information">×</button>
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
    const modalKind = triggerBtn.dataset.modalKind || '';
    const title = triggerBtn.dataset.modalTitle || triggerBtn.getAttribute('aria-label') || 'Information';
    let payload;

    if (modalKind === 'chart-help') {
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
        : ['Information not available.'];
    }

    const renderStructuredContent = (host, sectionTitle, sectionPayload) => {
      host.innerHTML = '';
      if (sectionPayload && typeof sectionPayload === 'object' && !Array.isArray(sectionPayload)) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-info-sections';
        const sections = Array.isArray(sectionPayload.sections) && sectionPayload.sections.length
          ? sectionPayload.sections
          : [
              { label: 'Chart description', text: sectionPayload.description || '' },
              { label: 'Axes, legend, and reading keys', text: sectionPayload.reading || '' },
              { label: 'Possible interactions', text: sectionPayload.interactions || '' },
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
    const trigger = event.target.closest('.chart-help-hint');
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

function applyChartScaleClass(box, scaleClass = 'chart-scale-default') {
  if (!box) return;
  const scales = ['chart-scale-default', 'chart-scale-xs', 'chart-scale-sm', 'chart-scale-lg', 'chart-scale-xl'];
  scales.forEach(cls => box.classList.remove(cls));
  box.classList.add(scaleClass);
}

function updateAdaptiveHintButtons() {
  document.querySelectorAll('.chart-box').forEach(applyAdaptiveHintClass);
}

function initAdaptiveHintButtons() {
  updateAdaptiveHintButtons();
  document.querySelectorAll('.chart-box').forEach(box => applyChartScaleClass(box));

  if (typeof ResizeObserver === 'undefined') return;
  const ro = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      if (entry?.target?.classList?.contains('chart-box')) {
        applyAdaptiveHintClass(entry.target);
        applyChartScaleClass(entry.target);
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
    ph.setAttribute('aria-label', 'Open interactive chart fullscreen');
    ph.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" fill="none"/><path d="M2 12h20M12 2v20" stroke="currentColor" stroke-dasharray="4 3"/></svg>
      <span class="chart-mobile-placeholder-title">Interactive chart</span>
      <span class="chart-mobile-placeholder-state">Initial view</span>
      <span class="chart-mobile-placeholder-hint">Tap to explore fullscreen</span>
      <span class="chart-mobile-placeholder-rotate">This chart works better in landscape mode. If possible, rotate your phone before opening it.</span>
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

/* ── Navbar ──────────────────────────────────────────────── */
function initNavbar() {
  const navbar = document.querySelector('[data-navbar]');
  if (!navbar) return;

  const menu = navbar.querySelector('.site-navbar-menu');
  const toggle = navbar.querySelector('.site-navbar-toggle');
  const titleEl = navbar.querySelector('[data-navbar-title]');
  const brandEl = navbar.querySelector('[data-navbar-brand]');
  const storyNav = document.querySelector('[data-story-nav]');
  const storyToggle = storyNav?.querySelector('.story-nav-toggle');
  const storyPanel = storyNav?.querySelector('.story-nav-panel');
  const sectionLinks = Array.from(document.querySelectorAll('.story-nav-link[data-act-link]'));
  const actAnchors = Array.from(document.querySelectorAll('.act-header[data-act], .chart-section[data-act]'));
  const isHome = document.body.classList.contains('home-page');
  const hero = document.querySelector('.hero');
  const isMobileNavbar = () => window.innerWidth <= 760;
  const homeTitle = isHome
    ? document.querySelector('.hero-title')?.textContent?.trim() || 'The weight of being born here'
    : '';
  const actTitles = new Map(
    Array.from(document.querySelectorAll('.act-header[data-act]'))
      .map((section) => [section.dataset.act, getNavbarSectionTitle(section)])
      .filter(([, title]) => title)
  );
  const staticPageTitle = !isHome
    ? document.querySelector('.page-hero h1, .page-hero h2, .site-navbar-link.is-current')?.textContent?.trim() || ''
    : '';

  const syncNavbarHeight = () => {
    const navbarHeight = Math.round(navbar.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--navbar-h', `${navbarHeight}px`);
  };

  const setNavbarTitle = (title = '', mode = 'default') => {
    if (!titleEl) return;
    if (brandEl && homeTitle) brandEl.textContent = homeTitle;
    titleEl.textContent = title;
    titleEl.classList.toggle('is-empty', !title);
    navbar.classList.toggle('has-section-title', mode === 'section' && !!title);
  };

  const isHeroVisible = () => {
    if (!isHome || !hero) return false;
    const heroBottom = hero.offsetTop + hero.offsetHeight - navbar.getBoundingClientRect().height;
    return window.scrollY < Math.max(heroBottom, 1);
  };

  const getActiveSectionTitle = () => {
    if (!actAnchors.length) return '';
    const probe = window.scrollY + navbar.getBoundingClientRect().height + Math.min(window.innerHeight * 0.18, 160);
    let activeAct = actAnchors[0]?.dataset.act || '';
    actAnchors.forEach((section) => {
      if (section.offsetTop <= probe && section.dataset.act) activeAct = section.dataset.act;
    });
    return actTitles.get(activeAct) || '';
  };

  const closeMenu = () => {
    if (!toggle) return;
    navbar.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
  };

  const closeStoryNav = () => {
    if (!storyNav || !storyToggle || !storyPanel) return;
    storyNav.classList.remove('is-open');
    storyToggle.setAttribute('aria-expanded', 'false');
    storyPanel.hidden = true;
  };

  const openStoryNav = () => {
    if (!storyNav || !storyToggle || !storyPanel) return;
    storyNav.classList.add('is-open');
    storyToggle.setAttribute('aria-expanded', 'true');
    storyPanel.hidden = false;
  };

  const updateNavbarTheme = () => {
    const isAtTop = isHome && window.scrollY <= 0;
    const isInHero = isHeroVisible();
    const isScrolled = !isAtTop;
    navbar.classList.toggle('is-scrolled', isScrolled);
    navbar.classList.toggle('is-transparent', isAtTop);
    if (isHome) {
      if (isInHero) setNavbarTitle('', 'default');
      else setNavbarTitle(getActiveSectionTitle(), 'section');
    } else {
      setNavbarTitle(staticPageTitle, 'default');
    }

    if (!storyNav || !sectionLinks.length || !actAnchors.length) return;

    const showStoryNav = isHome && !isInHero && !isMobileNavbar();
    storyNav.hidden = !showStoryNav;
    if (!showStoryNav) {
      closeStoryNav();
      return;
    }

    const mid = window.scrollY + window.innerHeight / 2;
    let active = '1';
    actAnchors.forEach((el) => {
      const act = el.dataset.act;
      if (act && act !== '0' && el.offsetTop <= mid) active = act;
    });
    sectionLinks.forEach((link) => link.classList.toggle('is-active', link.dataset.actLink === active));
  };

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const nextExpanded = toggle.getAttribute('aria-expanded') !== 'true';
      navbar.classList.toggle('is-open', nextExpanded);
      document.body.classList.toggle('nav-open', nextExpanded);
      toggle.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
      toggle.setAttribute('aria-label', nextExpanded ? 'Close navigation' : 'Open navigation');
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    document.addEventListener('click', (event) => {
      if (!navbar.contains(event.target)) closeMenu();
    });
  }

  if (storyToggle && storyPanel) {
    storyToggle.addEventListener('click', () => {
      const nextExpanded = storyToggle.getAttribute('aria-expanded') !== 'true';
      if (nextExpanded) openStoryNav();
      else closeStoryNav();
    });

    sectionLinks.forEach((link) => {
      link.addEventListener('click', () => {
        closeStoryNav();
      });
    });

    document.addEventListener('click', (event) => {
      if (!storyNav.contains(event.target)) closeStoryNav();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      closeStoryNav();
    }
  });

  window.addEventListener('scroll', updateNavbarTheme, { passive: true });
  window.addEventListener('resize', debounce(() => {
    syncNavbarHeight();
    updateNavbarTheme();
    if (window.innerWidth > 760) closeMenu();
  }, 120));

  syncNavbarHeight();
  updateNavbarTheme();
}

function getNavbarSectionTitle(section) {
  if (!section) return '';
  return (
    section.querySelector('.act-title')?.textContent?.trim() ||
    section.querySelector('h2, h3')?.textContent?.trim() ||
    ''
  );
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
    applyChartScaleClass(wrap);
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
