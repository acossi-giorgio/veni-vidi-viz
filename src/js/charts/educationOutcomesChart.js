/* ============================================================
   Grafico 3-3 (Atto II) — Scatter: spesa × alfabetizzazione / fuori scuola
   Africa (corallo) / Europa (teal)  ·  2000–2023
   X = spesa istruzione (USD assoluti stimati)
   Y = alfabetizzazione % OR bambini fuori scuola (%)
   Pannello sotto: rendimento marginale cumulativo 2000-t
   ============================================================ */
async function renderEducationOutcomesChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText += ';position:relative;font-family:inherit;display:flex;flex-direction:column;box-sizing:border-box;width:100%;align-self:stretch;';

  const CONTS  = ['Africa', 'Europe'];
  const COLORS = {
    Africa: getContinentColor('Africa', '#c96a3d'),
    Europe: getContinentColor('Europe', '#5169b2'),
  };
  const UI_ACTIVE = getActColor(2, getUiColor('controlActive', '#5169b2'));
  const UI_MUTED = getUiColor('controlMuted', '#f4efe7');
  const UI_MUTED_INK = getUiColor('controlMutedInk', '#75695d');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const CHART_GRID = getUiColor('chartGrid', '#e8e1d7');
  const CHART_AXIS = getUiColor('chartAxis', '#a49788');
  const TOOLTIP_BG = getUiColor('chartTooltipBg', 'rgba(28, 25, 23, 0.94)');
  const TOOLTIP_INK = getUiColor('chartTooltipInk', '#fffdf8');
  const HISTORY_MIN_YEAR = 1995;
  const DISPLAY_MIN_YEAR = 2000;
  const DISPLAY_MAX_YEAR = 2022;
  const MIN_CUMULATIVE_SPAN_YEARS = 5;
  const INDEX_START_YEAR = DISPLAY_MIN_YEAR + MIN_CUMULATIVE_SPAN_YEARS;

  /* ── Load data ──────────────────────────────────────────── */
  const [eduRaw, litRaw, oosRaw, incRaw, popRaw] = await Promise.all([
    d3.csv('datasets/processed/education_spending.csv',  d3.autoType),
    d3.csv('datasets/processed/youth_literacy.csv',      d3.autoType),
    d3.csv('datasets/processed/out_of_school_rate.csv', d3.autoType),
    d3.csv('datasets/processed/income.csv',        d3.autoType),
    d3.csv('datasets/processed/population.csv',    d3.autoType),
  ]);

  if (typeof window.mountChartWarningHint === 'function') {
    window.mountChartWarningHint(
      container,
      `Le serie usate per questo grafico possono essere incomplete anno per anno. Il pannello inferiore usa un indice cumulativo dal 2000 all'anno osservato e i punti aggregati riflettono solo i paesi con dati disponibili nel periodo considerato.`
    );
  }

  /* ── Index helpers ──────────────────────────────────────── */
  function idx(rows) {
    const m = new Map();
    rows.forEach(d => { if (d.code && d.year != null && d.value != null) m.set(`${d.code}|${d.year}`, d.value); });
    return m;
  }
  const eduIdx = idx(eduRaw);
  const litIdx = idx(litRaw);
  const oosIdx = idx(oosRaw);
  const incIdx = idx(incRaw);
  const popIdx = idx(popRaw);

  /* ── Continent → codes map ──────────────────────────────── */
  const codeContinent = new Map();
  [...eduRaw, ...litRaw, ...oosRaw, ...incRaw, ...popRaw].forEach(d => {
    if (d.code && d.continent && CONTS.includes(d.continent)) codeContinent.set(d.code, d.continent);
  });

  function codesFor(rows, cont) {
    return new Set(rows.filter(d => d.continent === cont && d.value != null).map(d => d.code));
  }

  const eligibleCodes = {
    education: new Map(CONTS.map(cont => [cont, codesFor(eduRaw, cont)])),
    income: new Map(CONTS.map(cont => [cont, codesFor(incRaw, cont)])),
    population: new Map(CONTS.map(cont => [cont, codesFor(popRaw, cont)])),
    literacy: new Map(CONTS.map(cont => [cont, codesFor(litRaw, cont)])),
    outOfSchool: new Map(CONTS.map(cont => [cont, codesFor(oosRaw, cont)])),
    effectiveLiteracy: new Map(CONTS.map(cont => [cont, intersectSets(
      codesFor(eduRaw, cont),
      codesFor(incRaw, cont),
      codesFor(popRaw, cont),
      codesFor(litRaw, cont),
    )])),
    effectiveOutOfSchool: new Map(CONTS.map(cont => [cont, intersectSets(
      codesFor(eduRaw, cont),
      codesFor(incRaw, cont),
      codesFor(popRaw, cont),
      codesFor(oosRaw, cont),
    )])),
  };

  function intersectSets(...sets) {
    const filtered = sets.filter(set => set instanceof Set);
    if (!filtered.length) return new Set();
    const [first, ...rest] = filtered;
    return new Set([...first].filter(code => rest.every(set => set.has(code))));
  }

  /* ── All years available ────────────────────────────────── */
  const allYears = [...new Set(incRaw.map(d => d.year))]
    .filter(y => y >= HISTORY_MIN_YEAR && y <= DISPLAY_MAX_YEAR)
    .sort((a, b) => a - b);

  /* ── Aggregate per continent × year ────────────────────── */
  const points = [];
  CONTS.forEach(cont => {
    const codes = [...codeContinent.entries()].filter(([, c]) => c === cont).map(([k]) => k);
    allYears.forEach(yr => {
      let totalSpendB = 0, eduPctSum = 0, eduPctW = 0;
      let litSum = 0, litW = 0, oosWeightedSum = 0, oosWeight = 0;
      const coverageCodes = {
        education: new Set(),
        income: new Set(),
        population: new Set(),
        literacy: new Set(),
        outOfSchool: new Set(),
        effectiveLiteracy: new Set(),
        effectiveOutOfSchool: new Set(),
      };
      codes.forEach(code => {
        const edu = eduIdx.get(`${code}|${yr}`);
        const inc = incIdx.get(`${code}|${yr}`);
        const pop = popIdx.get(`${code}|${yr}`);
        const lit = litIdx.get(`${code}|${yr}`);
        const oos = oosIdx.get(`${code}|${yr}`);
        if (edu != null && inc != null && pop != null) {
          totalSpendB += (edu / 100) * inc * pop / 1e9;
          eduPctSum   += edu * pop;
          eduPctW     += pop;
        }
        if (edu != null) coverageCodes.education.add(code);
        if (inc != null) coverageCodes.income.add(code);
        if (pop != null) coverageCodes.population.add(code);
        if (lit != null && pop != null) {
          litSum += lit * pop;
          litW += pop;
          coverageCodes.literacy.add(code);
        }
        if (oos != null && pop != null) {
          oosWeightedSum += oos * pop;
          oosWeight += pop;
          coverageCodes.outOfSchool.add(code);
        }
        if (edu != null && inc != null && pop != null && lit != null) coverageCodes.effectiveLiteracy.add(code);
        if (edu != null && inc != null && pop != null && oos != null) coverageCodes.effectiveOutOfSchool.add(code);
      });
      if (eduPctW > 0 && (litW > 0 || oosWeight > 0)) {
        points.push({
          continent: cont,
          year:      yr,
          spendB:    totalSpendB,
          eduPct:    eduPctSum / eduPctW,
          litPct:    litW > 0 ? litSum / litW : null,
          oosPct:    oosWeight > 0 ? oosWeightedSum / oosWeight : null,
          coverage: {
            education: coverageCodes.education,
            income: coverageCodes.income,
            population: coverageCodes.population,
            literacy: coverageCodes.literacy,
            outOfSchool: coverageCodes.outOfSchool,
            effectiveLiteracy: coverageCodes.effectiveLiteracy,
            effectiveOutOfSchool: coverageCodes.effectiveOutOfSchool,
            effectiveEligibleLiteracy: eligibleCodes.effectiveLiteracy.get(cont),
            effectiveEligibleOutOfSchool: eligibleCodes.effectiveOutOfSchool.get(cont),
          },
        });
      }
    });
  });

  /* ── State ──────────────────────────────────────────────── */
  let yMode     = 'literacy'; // 'literacy' | 'oos'
  let focusCont = 'Africa';
  const compact = isFullscreen && (
    (container.clientWidth  || window.innerWidth  * 0.85) < 760 ||
    (container.clientHeight || window.innerHeight * 0.82) < 420
  );
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const SERIES_STROKE_W = compact ? 2.2 : 2.5;
  const SERIES_DOT_R = compact ? 4.2 : 4.8;
  const SERIES_DOT_STROKE_W = compact ? 1.4 : 1.7;
  const SERIES_DOT_STROKE = '#f7f7f5';
  const TOP_LINE_DRAW_MS = 2200;
  const BOTTOM_LINE_DRAW_MS = 1600;
  const DOT_FADE_MS = 180;

  /* ── Tooltip ────────────────────────────────────────────── */
  const tooltip = window.ensureHoverTooltip('education-outcomes-tooltip', { maxWidth: 'min(92vw, 20rem)' });

  function fmtSpend(b) {
    if (b >= 1000) return (b / 1000).toFixed(1) + ' T$';
    if (b >= 1)    return b.toFixed(1) + ' B$';
    return (b * 1000).toFixed(0) + ' M$';
  }
  function fmtSignedSpend(b) {
    const sign = b >= 0 ? '+' : '-';
    return `${sign}${fmtSpend(Math.abs(b))}`;
  }
  const fmtSigned = (v, digits = 2) => `${v >= 0 ? '+' : ''}${v.toFixed(digits)}`;
  const fmtIndex = v => {
    const abs = Math.abs(v);
    if (abs >= 100) return v.toFixed(0);
    if (abs >= 10) return v.toFixed(1);
    if (abs >= 1) return v.toFixed(2);
    return v.toFixed(3);
  };
  const SLOPE_EPSILON = 1e-6;
  const currentXMode = () => 'abs';

  function linearSlope(windowPoints, accessor) {
    const pts = windowPoints
      .map(d => ({ year: d.year, value: accessor(d) }))
      .filter(d => Number.isFinite(d.year) && Number.isFinite(d.value));
    if (pts.length < 2) return null;
    const meanX = d3.mean(pts, d => d.year);
    const meanY = d3.mean(pts, d => d.value);
    const denom = d3.sum(pts, d => (d.year - meanX) ** 2);
    if (!Number.isFinite(denom) || denom < SLOPE_EPSILON) return null;
    const numer = d3.sum(pts, d => (d.year - meanX) * (d.value - meanY));
    const slope = numer / denom;
    return Number.isFinite(slope) ? slope : null;
  }

  function linearFit(windowPoints, accessor) {
    const pts = windowPoints
      .map(d => ({ year: d.year, value: accessor(d) }))
      .filter(d => Number.isFinite(d.year) && Number.isFinite(d.value));
    if (pts.length < 2) return null;
    const meanX = d3.mean(pts, d => d.year);
    const meanY = d3.mean(pts, d => d.value);
    const denom = d3.sum(pts, d => (d.year - meanX) ** 2);
    if (!Number.isFinite(denom) || denom < SLOPE_EPSILON) return null;
    const numer = d3.sum(pts, d => (d.year - meanX) * (d.value - meanY));
    const slope = numer / denom;
    const intercept = meanY - (slope * meanX);
    if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return null;
    return { slope, intercept };
  }

  function linearFitXY(series, xAccessor, yAccessor) {
    const pts = series
      .map(d => ({ x: xAccessor(d), y: yAccessor(d) }))
      .filter(d => Number.isFinite(d.x) && Number.isFinite(d.y));
    if (pts.length < 2) return null;
    const meanX = d3.mean(pts, d => d.x);
    const meanY = d3.mean(pts, d => d.y);
    const denom = d3.sum(pts, d => (d.x - meanX) ** 2);
    if (!Number.isFinite(denom) || denom < SLOPE_EPSILON) return null;
    const numer = d3.sum(pts, d => (d.x - meanX) * (d.y - meanY));
    const slope = numer / denom;
    const intercept = meanY - (slope * meanX);
    if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return null;
    return { slope, intercept };
  }

  function extendTrendSegment(fitStart, fitEnd, actualStart, actualEnd) {
    const dx = fitEnd.x - fitStart.x;
    const dy = fitEnd.y - fitStart.y;
    const lenSq = (dx * dx) + (dy * dy);
    if (!Number.isFinite(lenSq) || lenSq < SLOPE_EPSILON) return null;

    const projectScalar = (pt) => (((pt.x - fitStart.x) * dx) + ((pt.y - fitStart.y) * dy)) / lenSq;
    const scalars = [0, 1, projectScalar(actualStart), projectScalar(actualEnd)].filter(Number.isFinite);
    const minScalar = d3.min(scalars);
    const maxScalar = d3.max(scalars);
    const pad = 0.08;

    return {
      startX: fitStart.x + ((minScalar - pad) * dx),
      startY: fitStart.y + ((minScalar - pad) * dy),
      endX: fitStart.x + ((maxScalar + pad) * dx),
      endY: fitStart.y + ((maxScalar + pad) * dy),
    };
  }

  function hideTip() { window.hideHoverTooltip(tooltip); }
  function showTipHtml(e, html) {
    window.showHoverTooltip(tooltip, e, html, { offsetX: 14, offsetY: 10 });
  }

  function sizeOf(set) {
    return set instanceof Set ? set.size : 0;
  }

  function unionSize(series, key) {
    const merged = new Set();
    series.forEach(pt => {
      const set = pt?.coverage?.[key];
      if (set instanceof Set) set.forEach(code => merged.add(code));
    });
    return merged.size;
  }

  function buildCoverageLines(point, windowSeries = [], options = {}) {
    const includeOutcomeCoverage = options.includeOutcomeCoverage !== false;
    const outcomeLabel = yMode === 'literacy' ? 'Alfabetizzazione' : 'Fuori scuola primaria';
    const outcomeKey = yMode === 'literacy' ? 'literacy' : 'outOfSchool';
    const effectiveKey = yMode === 'literacy' ? 'effectiveLiteracy' : 'effectiveOutOfSchool';
    const effectiveEligibleKey = yMode === 'literacy' ? 'effectiveEligibleLiteracy' : 'effectiveEligibleOutOfSchool';
    const baseCoverage = point?.coverage || {};
    const lines = [
      { label: 'Spesa istruzione', covered: sizeOf(baseCoverage.education), total: sizeOf(eligibleCodes.education.get(point.continent)) },
      { label: 'Reddito', covered: sizeOf(baseCoverage.income), total: sizeOf(eligibleCodes.income.get(point.continent)) },
      { label: 'Popolazione', covered: sizeOf(baseCoverage.population), total: sizeOf(eligibleCodes.population.get(point.continent)) },
      {
        label: 'Aggregazione effettiva',
        covered: sizeOf(baseCoverage[effectiveKey]),
        total: sizeOf(baseCoverage[effectiveEligibleKey]),
      },
    ];

    if (includeOutcomeCoverage) {
      lines.splice(3, 0, {
        label: outcomeLabel,
        covered: sizeOf(baseCoverage[outcomeKey]),
        total: sizeOf(eligibleCodes[outcomeKey].get(point.continent)),
      });
    }

    if (!windowSeries.length) return lines;

    return lines.map((line) => {
      if (line.label === 'Aggregazione effettiva') {
        return {
          ...line,
          covered: unionSize(windowSeries, effectiveKey),
        };
      }
      return {
        ...line,
        covered: unionSize(windowSeries, normalizeCoverageKey(line.label)),
      };
    });
  }

  function normalizeCoverageKey(label) {
    if (label === 'Spesa istruzione') return 'education';
    if (label === 'Reddito') return 'income';
    if (label === 'Popolazione') return 'population';
    if (label === 'Alfabetizzazione') return 'literacy';
    if (label === 'Fuori scuola primaria') return 'outOfSchool';
    return 'effective';
  }

  function findCoverageLine(lines, label) {
    return lines.find(line => line.label === label) || { covered: 0, total: 0 };
  }

  function compactCoverage(label, covered, total) {
    return formatCoverageCount(covered, total, { label, includePercent: false });
  }

  function buildCoverageSummaryHtml(point, windowSeries = []) {
    const lines = windowSeries.length
      ? (point.coverageWindow || buildCoverageLines(point, windowSeries))
      : buildCoverageLines(point);
    const educationLine = findCoverageLine(lines, 'Spesa istruzione');
    const incomeLine = findCoverageLine(lines, 'Reddito');
    const populationLine = findCoverageLine(lines, 'Popolazione');
    const outcomeLine = findCoverageLine(lines, yMode === 'literacy' ? 'Alfabetizzazione' : 'Fuori scuola primaria');
    const effectiveLine = findCoverageLine(lines, 'Aggregazione effettiva');

    return (
      `<span style="opacity:.72">Copertura dati</span><br>` +
      `${compactCoverage('Spesa', educationLine.covered, educationLine.total)}<br>` +
      `${compactCoverage('Reddito', incomeLine.covered, incomeLine.total)}<br>` +
      `${compactCoverage('Popolazione', populationLine.covered, populationLine.total)}<br>` +
      `${compactCoverage(yMode === 'literacy' ? 'Alfabetizzazione' : 'Fuori scuola primaria', outcomeLine.covered, outcomeLine.total)}<br>` +
      `${compactCoverage('Aggregazione', effectiveLine.covered, effectiveLine.total)}`
    );
  }

  function buildTopTooltipHtml(point, color, context, dx = null, dy = null) {
    const { fmtXVal, fmtYVal, xVal, yVal } = context;
    const lines = buildCoverageLines(point);
    const effectiveLine = findCoverageLine(lines, 'Aggregazione effettiva');
    const outcomeLabel = yMode === 'literacy' ? 'Alfabetizzazione' : 'Fuori scuola primaria';
    return {
      title: point.continent,
      titleColor: color,
      meta: `Anno: ${point.year}`,
      rows: [
        { label: 'Spesa', value: fmtXVal(xVal(point)) },
        { label: outcomeLabel, value: fmtYVal(yVal(point)) },
        { label: 'Copertura dati', value: `${effectiveLine.covered}/${effectiveLine.total} paesi` },
      ],
    };
  }

  function buildBottomTooltipHtml(point, color, context) {
    const effectiveLine = findCoverageLine(point.coverageWindow || [], 'Aggregazione effettiva');
    return {
      title: point.continent,
      titleColor: color,
      meta: `Anno: ${point.year}`,
      rows: [
        { label: 'Periodo', value: `${point.startYear}-${point.year}` },
        { label: 'Indice I', value: fmtIndex(point.indexValue) },
        { label: 'Aggregazione', value: `${effectiveLine.covered}/${effectiveLine.total} paesi` },
      ],
    };
  }

  /* ── Top bar: outcome controls ──────────────────────────── */
  const topBar = d3.select(container).append('div')
    .style('display', 'flex').style('align-items', 'center')
    .style('width', '100%')
    .style('justify-content', 'flex-start')
    .style('padding', compact ? '6px 10px 2px' : '8px 16px 4px').style('flex-shrink', '0');

  const pillBar = topBar.append('div')
    .style('display', 'flex').style('align-items', 'center')
    .style('flex-wrap', compact ? 'wrap' : 'nowrap')
    .style('background', 'rgba(255,255,255,0.92)')
    .style('border-radius', compact ? '8px' : '9px').style('border', `1px solid ${UI_MUTED_BORDER}`)
    .style('padding', compact ? '2px' : '3px').style('gap', '2px')
    .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)');

  function mkBtn(label, onClick) {
    return pillBar.append('button')
      .style('font-size', compact ? '10px' : '11px').style('padding', compact ? '4px 8px' : '5px 12px').style('border-radius', compact ? '5px' : '6px')
      .style('border', 'none').style('cursor', 'pointer').style('font-weight', '600')
      .style('transition', 'all 0.15s').text(label)
      .on('click', onClick);
  }
  const btnLit = mkBtn('Alfabetizzazione', () => { yMode = 'literacy'; updateBtns(); draw(); });
  const btnOos = mkBtn('Fuori scuola primaria',     () => { yMode = 'oos';     updateBtns(); draw(); });

  function updateBtns() {
    const set = (btn, active) => btn
      .style('background', active ? UI_ACTIVE : 'transparent')
      .style('color',      active ? '#fff'    : UI_MUTED_INK)
      .style('box-shadow', active ? `0 1px 4px ${colorToRgba(UI_ACTIVE, 0.3)}` : 'none');
    set(btnLit, yMode === 'literacy');
    set(btnOos, yMode === 'oos');
  }
  updateBtns();

  /* ── Viz container ──────────────────────────────────────── */
  const vizDiv = d3.select(container).append('div')
    .style('flex', '1 1 0').style('position', 'relative').style('min-height', '0');

  /* ── Draw ───────────────────────────────────────────────── */
  function draw() {
    vizDiv.html('');
    const W = container.clientWidth  || 600;
    const H = vizDiv.node().clientHeight || 340;
    const topPanelH = Math.max(160, Math.round(H * (compact ? 0.58 : 0.62)));
    const bottomPanelH = Math.max(110, H - topPanelH);
    const topPanelTitle = yMode === 'literacy'
      ? 'Traiettoria della spesa e dell alfabetizzazione in Africa'
      : 'Traiettoria della spesa e del tasso di fuori scuola primaria in Africa';
    const bottomPanelTitle = yMode === 'literacy'
      ? 'Indice cumulativo di spesa e alfabetizzazione in Africa'
      : 'Indice cumulativo di spesa e fuori scuola primaria in Africa';

    const topMargin = compact
      ? { top: 30, right: 12, bottom: 42, left: 58 }
      : { top: 34, right: 20, bottom: 52, left: 64 };
    const bottomMargin = compact
      ? { top: 28, right: 12, bottom: 30, left: 58 }
      : { top: 30, right: 20, bottom: 34, left: 64 };
    const topIw = W - topMargin.left - topMargin.right;
    const topIh = topPanelH - topMargin.top - topMargin.bottom;
    const botIw = W - bottomMargin.left - bottomMargin.right;
    const botIh = bottomPanelH - bottomMargin.top - bottomMargin.bottom;

    const xVal = d => d.spendB;
    const yVal = d => yMode === 'literacy' ? d.litPct : d.oosPct;
    const visiblePoints = points.filter(d => d.year >= DISPLAY_MIN_YEAR && d.year <= DISPLAY_MAX_YEAR);
    const scalePts = focusCont ? visiblePoints.filter(d => d.continent === focusCont) : visiblePoints;

    /* Tight axes on selected focus, otherwise both continents together */
    const xExt = d3.extent(scalePts, xVal);
    const xSpan = Math.max(0, (xExt[1] ?? 0) - (xExt[0] ?? 0));
    const xPad = Math.max(xSpan * 0.05, 0.2);
    const xScale = d3.scaleLinear()
      .domain([Math.max(0, (xExt[0] ?? 0) - xPad), (xExt[1] ?? 1) + xPad])
      .range([0, topIw]).nice();

    const xFmt = v => fmtSpend(v);
    const yFmt = v => v.toFixed(0) + '%';
    const fmtXVal = v => fmtSpend(v);
    const fmtYVal = v => `${v.toFixed(2)}%`;
    const xLabel = 'Spesa pubblica istruzione (USD totali stimati)';
    const yLabel = yMode === 'literacy' ? 'Alfabetizzazione' : 'Fuori scuola primaria';
    const slopeLabel = 'Trend spesa medio (USD stimati)';
    const fmtXSlope = v => `${fmtSignedSpend(v)}/anno`;
    const tooltipContext = { xLabel, yLabel, fmtXVal, fmtYVal, xVal, yVal, slopeLabel, fmtXSlope };
    const metricKey = yMode === 'literacy' ? 'litPct' : 'oosPct';
    const metricSeriesAll = (focusCont ? points.filter(d => d.continent === focusCont) : points)
      .filter(d => Number.isFinite(d[metricKey]));
    if (!metricSeriesAll.length) return;
    const metricExtent = d3.extent(metricSeriesAll, d => d[metricKey]);
    const metricMin = metricExtent[0] ?? 0;
    let metricMax = metricExtent[1] ?? 1;
    if (yMode === 'oos') metricMax = Math.min(metricMax, 40);
    const metricSpan = Math.max(0, metricMax - metricMin);
    const metricPad = yMode === 'literacy'
      ? Math.max(metricSpan * 0.12, 1.5)
      : Math.max(metricSpan * 0.12, 0.6);
    const sharedMetricDomain = d3.scaleLinear()
      .domain([Math.max(0, metricMin - metricPad), metricMax + metricPad])
      .nice()
      .domain();
    const sharedMetricTicks = d3.scaleLinear()
      .domain(sharedMetricDomain)
      .ticks(yMode === 'literacy' ? 5 : 8);
    const yScale = d3.scaleLinear()
      .domain(sharedMetricDomain)
      .range([topIh, 0]);

    const byContYear = new Map(points.map(d => [`${d.continent}|${d.year}`, d]));
    const HOVER_DIM = 0.18;
    const HOVER_LINE_DIM = 0.16;
    let activeHoverKey = null;

    let topTrendPreview = null;
    function setLinkedHover(keyOrKeys = null, bottomKey = null, trendPoint = null) {
      const topKeys = Array.isArray(keyOrKeys)
        ? keyOrKeys.filter(Boolean)
        : (keyOrKeys ? [keyOrKeys] : []);
      const topKeySet = new Set(topKeys);
      const resolvedBottomKey = bottomKey || (topKeys.length === 1 ? topKeys[0] : null);
      const showTopLabels = Boolean(bottomKey && topKeySet.size);
      activeHoverKey = resolvedBottomKey || topKeys[0] || null;
      const activeCont = activeHoverKey ? activeHoverKey.split('|')[0] : null;
      const targetKey = topKeys.length ? topKeys[topKeys.length - 1] : null;
      const sourceKey = topKeys.length > 1 ? topKeys[0] : null;

      vizDiv.selectAll('.excl-top-dot').each(function() {
        const el = d3.select(this);
        const dotKey = el.attr('data-key');
        const isTarget = targetKey && dotKey === targetKey;
        const isSource = sourceKey && dotKey === sourceKey;
        const same = topKeySet.has(dotKey);
        const baseFill = +el.attr('data-base-fill-opacity');
        const baseStroke = +el.attr('data-base-stroke-opacity');
        const baseR = +el.attr('data-base-r');
        const baseSW = +el.attr('data-base-stroke-width');
        if (!topKeySet.size) {
          el.attr('fill-opacity', baseFill).attr('stroke-opacity', baseStroke).attr('r', baseR).attr('stroke-width', baseSW);
        } else if (same) {
          el
            .attr('fill-opacity', isSource ? 0.84 : 0.98)
            .attr('stroke-opacity', 1)
            .attr('r', baseR + (isTarget ? 2.4 : 1.6))
            .attr('stroke-width', baseSW + (isTarget ? 0.9 : 0.5));
        } else {
          el.attr('fill-opacity', Math.max(0.06, baseFill * HOVER_DIM)).attr('stroke-opacity', Math.max(0.08, baseStroke * HOVER_DIM)).attr('r', baseR).attr('stroke-width', baseSW);
        }
      });

      vizDiv.selectAll('.excl-bottom-dot').each(function() {
        const el = d3.select(this);
        const same = resolvedBottomKey && el.attr('data-key') === resolvedBottomKey;
        const baseOpacity = +el.attr('data-base-opacity');
        const baseR = +el.attr('data-base-r');
        if (!resolvedBottomKey) {
          el.attr('opacity', baseOpacity).attr('r', baseR);
        } else if (same) {
          el.attr('opacity', 0.98).attr('r', baseR + 2.1);
        } else {
          el.attr('opacity', Math.max(0.06, baseOpacity * HOVER_DIM)).attr('r', baseR);
        }
      });

      vizDiv.selectAll('.excl-hover-line').each(function() {
        const el = d3.select(this);
        const baseOpacity = +el.attr('data-base-opacity');
        const sameCont = activeHoverKey && el.attr('data-cont') === activeCont;
        if (!activeHoverKey) {
          el.attr('opacity', baseOpacity);
        } else if (sameCont) {
          el.attr('opacity', Math.max(baseOpacity, 0.82));
        } else {
          el.attr('opacity', Math.max(0.06, baseOpacity * HOVER_LINE_DIM));
        }
      });

      vizDiv.selectAll('.excl-top-label').each(function() {
        const el = d3.select(this);
        const labelKey = el.attr('data-key');
        el.attr('opacity', showTopLabels && topKeySet.has(labelKey) ? 0.96 : 0);
      });

      if (topTrendPreview) {
        topTrendPreview.remove();
        topTrendPreview = null;
      }

      if (trendPoint && Number.isFinite(trendPoint.trendStartX) && Number.isFinite(trendPoint.trendEndX) && Number.isFinite(trendPoint.trendStartY) && Number.isFinite(trendPoint.trendEndY)) {
        topTrendPreview = g.append('line')
          .attr('class', 'excl-top-trend-preview')
          .attr('clip-path', `url(#${topClipId})`)
          .attr('x1', xScale(trendPoint.trendStartX))
          .attr('y1', yScale(trendPoint.trendStartY))
          .attr('x2', xScale(trendPoint.trendEndX))
          .attr('y2', yScale(trendPoint.trendEndY))
          .attr('stroke', COLORS[trendPoint.continent] || CHART_AXIS)
          .attr('stroke-width', compact ? 2 : 2.4)
          .attr('stroke-dasharray', '7,5')
          .attr('stroke-linecap', 'round')
          .attr('opacity', 0.95)
          .style('pointer-events', 'none');
      }
    }

    const topClipId = `edu-outcomes-top-clip-${isFullscreen ? 'fs' : 'sm'}-${yMode}`;
    const topSvg = vizDiv.append('svg').attr('width', W).attr('height', topPanelH)
      .style('display', 'block').style('font-family', 'inherit');
    topSvg.append('defs').append('clipPath')
      .attr('id', topClipId)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', topIw)
      .attr('height', topIh);

    const g = topSvg.append('g').attr('transform', `translate(${topMargin.left},${topMargin.top})`);

    g.append('text')
      .attr('x', 0).attr('y', compact ? -12 : -14)
      .attr('font-size', compact ? 9 : 10)
      .attr('font-weight', 700)
      .attr('fill', CHART_AXIS)
      .text(topPanelTitle);

    /* Grid */
    g.append('g').call(d3.axisLeft(yScale).tickValues(sharedMetricTicks).tickSize(-topIw).tickFormat(''))
      .call(a => { a.select('.domain').remove(); a.selectAll('line').attr('stroke', CHART_GRID); });
    g.append('g').attr('transform', `translate(0,${topIh})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(-topIh).tickFormat(''))
      .call(a => { a.select('.domain').remove(); a.selectAll('line').attr('stroke', CHART_GRID); });

    /* Axes */
    g.append('g').call(d3.axisLeft(yScale).tickValues(sharedMetricTicks).tickFormat(yFmt))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS); a.selectAll('.tick line').remove(); });
    g.append('g').attr('transform', `translate(0,${topIh})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(xFmt))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS); a.selectAll('.tick line').remove(); });

    /* Axis labels */
    g.append('text').attr('x', topIw / 2).attr('y', topIh + 32)
      .attr('class', 'chart-axis-label').attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_AXIS)
      .text(xLabel);
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -topIh / 2).attr('y', -42)
      .attr('class', 'chart-axis-label').attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_AXIS)
      .text(yMode === 'literacy' ? 'Tasso di alfabetizzazione (%)' : 'Tasso di fuori scuola primaria (%)');

    const line = d3.line()
      .x(d => xScale(xVal(d)))
      .y(d => yScale(yVal(d)))
      .curve(d3.curveCatmullRom.alpha(0.5));

    CONTS.forEach(cont => {
      if (focusCont && cont !== focusCont) return;
      const col = COLORS[cont];
      const pts = visiblePoints.filter(d => d.continent === cont).sort((a, b) => a.year - b.year);
      if (!pts.length) return;

      const isFocus = !focusCont || focusCont === cont;
      const lineOpacity = focusCont ? (isFocus ? 0.82 : 0.18) : 0.74;
      const dotOpacity = focusCont ? (isFocus ? 1 : 0.22) : 1;
      const strokeOpacity = focusCont ? (isFocus ? 1 : 0.4) : 1;
      const regressionOpacity = focusCont ? (isFocus ? 0.7 : 0.14) : 0.55;

      const pathEl = g.append('path').datum(pts).attr('d', line)
        .attr('class', 'excl-hover-line')
        .attr('data-cont', cont)
        .attr('data-base-opacity', lineOpacity)
        .attr('fill', 'none').attr('stroke', col)
        .attr('stroke-width', SERIES_STROKE_W)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('opacity', lineOpacity).node();
      const totalLen = pathEl.getTotalLength();
      d3.select(pathEl)
        .attr('stroke-dasharray', totalLen)
        .attr('stroke-dashoffset', totalLen)
        .transition().duration(TOP_LINE_DRAW_MS).ease(d3.easeCubicInOut)
        .attr('stroke-dashoffset', 0);

      const regression = linearFitXY(pts, xVal, yVal);
      if (regression) {
        const [xStart, xEnd] = xScale.domain();
        if (Number.isFinite(xStart) && Number.isFinite(xEnd)) {
          g.append('line')
            .attr('class', 'excl-top-regression-line')
            .attr('clip-path', `url(#${topClipId})`)
            .attr('x1', xScale(xStart))
            .attr('y1', yScale(regression.intercept + (regression.slope * xStart)))
            .attr('x2', xScale(xEnd))
            .attr('y2', yScale(regression.intercept + (regression.slope * xEnd)))
            .attr('stroke', col)
            .attr('stroke-width', compact ? 1.6 : 1.9)
            .attr('stroke-dasharray', '9,6')
            .attr('stroke-linecap', 'round')
            .attr('opacity', regressionOpacity)
            .style('pointer-events', 'none');
        }
      }

      const R = SERIES_DOT_R;
      const hoverR = SERIES_DOT_R + (compact ? 3 : 4);
      pts.forEach((d, i) => {
        const cx = xScale(xVal(d)), cy = yScale(yVal(d));
        const prev = byContYear.get(`${d.continent}|${d.year - 1}`) || null;
        const dx = prev ? xVal(d) - xVal(prev) : null;
        const dy = prev ? yVal(d) - yVal(prev) : null;
        const key = `${d.continent}|${d.year}`;
        const delay = TOP_LINE_DRAW_MS + 80 + (220 * (i / Math.max(1, pts.length - 1)));
        g.append('circle')
          .attr('class', 'excl-top-dot')
          .attr('data-key', key)
          .attr('data-base-fill-opacity', dotOpacity)
          .attr('data-base-stroke-opacity', strokeOpacity)
          .attr('data-base-r', R)
          .attr('data-base-stroke-width', SERIES_DOT_STROKE_W)
          .attr('cx', cx).attr('cy', cy).attr('r', R)
          .attr('fill', col).attr('fill-opacity', 0)
          .attr('stroke', SERIES_DOT_STROKE).attr('stroke-opacity', 0).attr('stroke-width', SERIES_DOT_STROKE_W)
          .style('cursor', 'default')
          .on('mouseenter', () => setLinkedHover(key))
          .on('mousemove', e => showTipHtml(e, buildTopTooltipHtml(d, col, tooltipContext, dx, dy)))
          .on('mouseleave', () => { hideTip(); setLinkedHover(null); })
          .transition().delay(delay).duration(DOT_FADE_MS)
          .attr('fill-opacity', dotOpacity)
          .attr('stroke-opacity', strokeOpacity);
        g.append('circle')
          .attr('class', 'excl-top-hit')
          .attr('data-key', key)
          .attr('cx', cx).attr('cy', cy).attr('r', hoverR)
          .attr('fill', 'rgba(255,255,255,0.001)')
          .style('pointer-events', 'all')
          .style('cursor', 'default')
          .on('mouseenter', () => setLinkedHover(key))
          .on('mousemove', e => showTipHtml(e, buildTopTooltipHtml(d, col, tooltipContext, dx, dy)))
          .on('mouseleave', () => { hideTip(); setLinkedHover(null); });
      });

      const edgePoints = [pts[0], pts[pts.length - 1]].filter(Boolean);
      const edgeMeta = edgePoints.map((d, idx) => ({
        d,
        kind: idx === 0 ? 'start' : 'end',
        x: xScale(xVal(d)),
        y: yScale(yVal(d)),
      }));

      g.append('g')
        .attr('class', `excl-top-edge-markers-${cont}`)
        .selectAll('circle')
        .data(edgeMeta)
        .join('circle')
        .attr('cx', p => p.x)
        .attr('cy', p => p.y)
        .attr('r', compact ? 5.8 : 6.6)
        .attr('fill', col)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', compact ? 2 : 2.4)
        .attr('opacity', 1)
        .style('pointer-events', 'none');

      g.append('g')
        .attr('aria-hidden', 'true')
        .style('pointer-events', 'none')
        .selectAll('text')
        .data(pts)
        .join('text')
        .attr('class', 'excl-top-label')
        .attr('data-key', d => `${d.continent}|${d.year}`)
        .attr('x', d => xScale(xVal(d)) + 6)
        .attr('y', d => yScale(yVal(d)) - 6)
        .attr('font-size', compact ? 8 : 9)
        .attr('font-weight', 600)
        .attr('fill', col)
        .attr('opacity', 0)
        .text(d => d.year);

    });

    /* ── Bottom panel: cumulative index computed from 2000 to year t ── */
    const indexSeriesByCont = new Map();
    CONTS.forEach((cont) => {
      const xMetricKey = 'spendB';
      const series = points
        .filter(d => d.continent === cont && Number.isFinite(d[metricKey]) && Number.isFinite(d[xMetricKey]))
        .sort((a, b) => a.year - b.year);
      const cumulativeSeries = series.filter(d => d.year >= DISPLAY_MIN_YEAR && d.year <= DISPLAY_MAX_YEAR);
      const indexSeries = [];
      for (let i = 1; i < cumulativeSeries.length; i += 1) {
        const start = cumulativeSeries[0];
        const curr = cumulativeSeries[i];
        const windowPoints = cumulativeSeries.slice(0, i + 1);
        const xSlope = linearSlope(windowPoints, d => d[xMetricKey]);
        const outcomeSlopeRaw = linearSlope(windowPoints, d => d[metricKey]);
        const xFit = linearFit(windowPoints, d => d[xMetricKey]);
        const outcomeFit = linearFit(windowPoints, d => d[metricKey]);
        if (!Number.isFinite(xSlope) || Math.abs(xSlope) < SLOPE_EPSILON || !Number.isFinite(outcomeSlopeRaw)) continue;
        if (!xFit || !outcomeFit) continue;
        const outcomeSlopeCorrected = yMode === 'literacy' ? outcomeSlopeRaw : -outcomeSlopeRaw;
        const indexValue = outcomeSlopeCorrected / Math.abs(xSlope);
        if (!Number.isFinite(indexValue)) continue;
        const coverageWindow = buildCoverageLines(curr, windowPoints);
        const fitStart = {
          x: xFit.intercept + (xFit.slope * start.year),
          y: outcomeFit.intercept + (outcomeFit.slope * start.year),
        };
        const fitEnd = {
          x: xFit.intercept + (xFit.slope * curr.year),
          y: outcomeFit.intercept + (outcomeFit.slope * curr.year),
        };
        const extendedTrend = extendTrendSegment(
          fitStart,
          fitEnd,
          { x: start[xMetricKey], y: start[metricKey] },
          { x: curr[xMetricKey], y: curr[metricKey] },
        );
        if (!extendedTrend) continue;
        const indexPoint = {
          continent: cont,
          year: curr.year,
          startYear: start.year,
          eduPct: curr.eduPct,
          spendB: curr.spendB,
          litPct: curr.litPct,
          oosPct: curr.oosPct,
          rawOutcome: curr[metricKey],
          prevOutcome: start[metricKey],
          prevYear: start.year,
          xMetricValue: curr[xMetricKey],
          deltaXMetric: curr[xMetricKey] - start[xMetricKey],
          deltaOutcomeRaw: curr[metricKey] - start[metricKey],
          deltaOutcomeCorrected: yMode === 'literacy' ? (curr[metricKey] - start[metricKey]) : -(curr[metricKey] - start[metricKey]),
          xSlope,
          outcomeSlopeRaw,
          outcomeSlopeCorrected,
          indexValue,
          coverageWindow,
          trendStartX: extendedTrend.startX,
          trendEndX: extendedTrend.endX,
          trendStartY: extendedTrend.startY,
          trendEndY: extendedTrend.endY,
        };
        if (curr.year >= INDEX_START_YEAR) {
          indexSeries.push(indexPoint);
        }
      }
      indexSeriesByCont.set(cont, indexSeries);
    });

    const indexSeriesAll = (focusCont
      ? (indexSeriesByCont.get(focusCont) || [])
      : [...indexSeriesByCont.values()].flat()
    ).filter(d => Number.isFinite(d.indexValue));
    if (!indexSeriesAll.length) return;

    const xYearExtent = d3.extent(indexSeriesAll, d => d.year);
    const xYearMin = INDEX_START_YEAR;
    const xYearMax = xYearExtent[1] ?? xYearMin;
    const xYearPad = xYearMin === xYearMax ? 1 : 0.2;
    const xYearScale = d3.scaleLinear()
      .domain([xYearMin - xYearPad, xYearMax + xYearPad])
      .range([0, botIw]);

    const indexExtent = d3.extent(indexSeriesAll, d => d.indexValue);
    const maxIndexAbs = Math.max(Math.abs(indexExtent[0] ?? 0), Math.abs(indexExtent[1] ?? 0), 0.5);
    const yTrendScale = d3.scaleLinear()
      .domain([-maxIndexAbs, maxIndexAbs])
      .range([botIh, 0])
      .nice();
    const trendTicks = yTrendScale.ticks(compact ? 5 : 7).filter(v => Number.isFinite(v));
    const trendAxisFmt = v => fmtIndex(v);

    const bottomSvg = vizDiv.append('svg').attr('width', W).attr('height', bottomPanelH)
      .style('display', 'block').style('font-family', 'inherit');
    const gb = bottomSvg.append('g').attr('transform', `translate(${bottomMargin.left},${bottomMargin.top})`);

    gb.append('text')
      .attr('x', 0).attr('y', compact ? -12 : -14)
      .attr('font-size', compact ? 9 : 10)
      .attr('font-weight', 700)
      .attr('fill', CHART_AXIS)
      .text(bottomPanelTitle);

    gb.append('g').call(d3.axisLeft(yTrendScale).tickValues(trendTicks).tickSize(-botIw).tickFormat(''))
      .call(a => { a.select('.domain').remove(); a.selectAll('line').attr('stroke', CHART_GRID); });
    gb.append('line')
      .attr('x1', 0).attr('x2', botIw)
      .attr('y1', yTrendScale(0)).attr('y2', yTrendScale(0))
      .attr('stroke', CHART_AXIS)
      .attr('stroke-opacity', 0.45)
      .attr('stroke-dasharray', '4,4');
    gb.append('g').call(d3.axisLeft(yTrendScale).tickValues(trendTicks).tickFormat(trendAxisFmt))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS); a.selectAll('.tick line').remove(); });
    gb.append('g').attr('transform', `translate(0,${botIh})`)
      .call(d3.axisBottom(xYearScale).ticks(compact ? 4 : 6).tickFormat(d3.format('d')))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS); a.selectAll('.tick line').remove(); });

    gb.append('text')
      .attr('x', botIw / 2).attr('y', botIh + (compact ? 20 : 24))
      .attr('class', 'chart-axis-label').attr('text-anchor', 'middle').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS)
      .text('Anno');
    gb.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('class', 'chart-axis-label').attr('x', -botIh / 2).attr('y', -42)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS)
      .text('Indice cumulativo corretto (2000-t)');

    const lineTrend = d3.line()
      .defined(d => Number.isFinite(d.indexValue))
      .x(d => xYearScale(d.year))
      .y(d => yTrendScale(d.indexValue))
      .curve(d3.curveMonotoneX);

    CONTS.forEach((cont) => {
      if (focusCont && cont !== focusCont) return;
      const series = indexSeriesByCont.get(cont) || [];
      if (!series.length) return;
      const col = COLORS[cont];
      const isFocus = !focusCont || focusCont === cont;
      const baseLineOp = focusCont ? (isFocus ? 0.82 : 0.2) : 0.74;
      const baseDotOp = focusCont ? (isFocus ? 1 : 0.22) : 1;
      const baseR = SERIES_DOT_R;

      const bottomPath = gb.append('path')
        .datum(series)
        .attr('class', 'excl-hover-line')
        .attr('data-cont', cont)
        .attr('data-base-opacity', baseLineOp)
        .attr('fill', 'none')
        .attr('stroke', col)
        .attr('stroke-width', SERIES_STROKE_W)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('opacity', baseLineOp)
        .attr('d', lineTrend)
        .node();

      if (bottomPath && !prefersReducedMotion) {
        const bottomLen = bottomPath.getTotalLength();
        d3.select(bottomPath)
          .attr('stroke-dasharray', bottomLen)
          .attr('stroke-dashoffset', bottomLen)
          .transition().duration(BOTTOM_LINE_DRAW_MS).ease(d3.easeCubicInOut)
          .attr('stroke-dashoffset', 0);
      }

      gb.selectAll(`.marg-dot-${cont}`)
        .data(series)
        .join('circle')
        .attr('class', `marg-dot-${cont} excl-bottom-dot`)
        .attr('data-key', d => `${d.continent}|${d.year}`)
        .attr('data-base-opacity', baseDotOp)
        .attr('data-base-r', baseR)
        .attr('cx', d => xYearScale(d.year))
        .attr('cy', d => yTrendScale(d.indexValue))
        .attr('r', baseR)
        .attr('fill', col)
        .attr('stroke', SERIES_DOT_STROKE)
        .attr('stroke-width', SERIES_DOT_STROKE_W)
        .attr('opacity', prefersReducedMotion ? baseDotOp : 0)
        .style('pointer-events', 'none')
        .transition()
        .delay((d, i) => prefersReducedMotion ? 0 : BOTTOM_LINE_DRAW_MS + 60 + (220 * (i / Math.max(1, series.length - 1))))
        .duration(prefersReducedMotion ? 0 : DOT_FADE_MS)
        .attr('opacity', baseDotOp);

      gb.selectAll(`.marg-hit-${cont}`)
        .data(series)
        .join('circle')
        .attr('class', `marg-hit-${cont}`)
        .attr('data-key', d => `${d.continent}|${d.year}`)
        .attr('cx', d => xYearScale(d.year))
        .attr('cy', d => yTrendScale(d.indexValue))
        .attr('r', isFocus ? 7 : 6)
        .attr('fill', 'rgba(255,255,255,0.001)')
        .style('pointer-events', 'all')
        .style('cursor', 'default')
        .on('mouseenter', (e, d) => setLinkedHover([`${d.continent}|${d.prevYear}`, `${d.continent}|${d.year}`], `${d.continent}|${d.year}`, d))
        .on('mousemove', (e, d) => showTipHtml(e, buildBottomTooltipHtml(d, col, tooltipContext)))
        .on('mouseleave', () => { hideTip(); setLinkedHover(null); });
    });

    vizDiv.on('mouseleave', () => {
      hideTip();
      if (activeHoverKey) setLinkedHover(null);
    });
  }

  draw();

  container._exclusionShowBase   = () => { focusCont = 'Africa'; yMode = 'literacy'; updateBtns(); draw(); };
  container._exclusionFocusAfrica = () => { focusCont = 'Africa'; updateBtns(); draw(); };
  container._exclusionFocusEurope = () => { focusCont = 'Africa'; updateBtns(); draw(); };
  container._exclusionShowGpi    = () => { focusCont = 'Africa'; yMode = 'oos';      updateBtns(); draw(); };
  container._exclusionShowTrend  = () => { focusCont = 'Africa'; yMode = 'literacy'; updateBtns(); draw(); };
  container._getHelpContext = () => ({
    xMode: currentXMode(),
    yMode,
    focusCont,
    cumulativeStartYear: DISPLAY_MIN_YEAR,
  });
}
