/* ============================================================
   Grafico 3-3 (Atto II) — Scatter: spesa × alfabetizzazione / fuori scuola
   Mostra solo la traiettoria principale dell'Africa con retta di regressione.
   ============================================================ */
async function renderEducationOutcomesChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;

  container.innerHTML = '';
  container.style.cssText += ';position:relative;font-family:inherit;display:flex;flex-direction:column;box-sizing:border-box;width:100%;align-self:stretch;';

  const AFRICA = 'Africa';
  const COLOR = getContinentColor(AFRICA, '#c96a3d');
  const UI_ACTIVE = getActColor(2, getUiColor('controlActive', '#5169b2'));
  const UI_MUTED_INK = getUiColor('controlMutedInk', '#75695d');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const CHART_GRID = getUiColor('chartGrid', '#e8e1d7');
  const CHART_AXIS = getUiColor('chartAxis', '#a49788');
  const TOOLTIP_BG = getUiColor('chartTooltipBg', 'rgba(28, 25, 23, 0.94)');
  const TOOLTIP_INK = getUiColor('chartTooltipInk', '#fffdf8');
  const DISPLAY_MIN_YEAR = 2000;
  const DISPLAY_MAX_YEAR = 2022;
  const SLOPE_EPSILON = 1e-6;

  const [eduRaw, litRaw, oosRaw, incRaw, popRaw] = await Promise.all([
    d3.csv('datasets/processed/education_spending.csv', d3.autoType),
    d3.csv('datasets/processed/youth_literacy.csv', d3.autoType),
    d3.csv('datasets/processed/out_of_school_rate.csv', d3.autoType),
    d3.csv('datasets/processed/income.csv', d3.autoType),
    d3.csv('datasets/processed/population.csv', d3.autoType),
  ]);

  if (typeof window.mountChartWarningHint === 'function') {
    window.mountChartWarningHint(
      container,
      'Le serie usate per questo grafico possono essere incomplete anno per anno. I punti aggregati riflettono solo i paesi africani con dati disponibili nello stesso anno.'
    );
  }

  function idx(rows) {
    const map = new Map();
    rows.forEach((d) => {
      if (d.code && d.year != null && d.value != null) map.set(`${d.code}|${d.year}`, d.value);
    });
    return map;
  }

  const eduIdx = idx(eduRaw);
  const litIdx = idx(litRaw);
  const oosIdx = idx(oosRaw);
  const incIdx = idx(incRaw);
  const popIdx = idx(popRaw);

  const codeContinent = new Map();
  [...eduRaw, ...litRaw, ...oosRaw, ...incRaw, ...popRaw].forEach((d) => {
    if (d.code && d.continent) codeContinent.set(d.code, d.continent);
  });

  function codesFor(rows, cont) {
    return new Set(rows.filter((d) => d.continent === cont && d.value != null).map((d) => d.code));
  }

  const eligibleCodes = {
    education: codesFor(eduRaw, AFRICA),
    income: codesFor(incRaw, AFRICA),
    population: codesFor(popRaw, AFRICA),
    literacy: codesFor(litRaw, AFRICA),
    outOfSchool: codesFor(oosRaw, AFRICA),
  };

  const allYears = [...new Set(incRaw.map((d) => d.year))]
    .filter((year) => year >= DISPLAY_MIN_YEAR && year <= DISPLAY_MAX_YEAR)
    .sort((a, b) => a - b);

  const africaCodes = [...codeContinent.entries()]
    .filter(([, continent]) => continent === AFRICA)
    .map(([code]) => code);

  const points = [];
  allYears.forEach((year) => {
    let spendB = 0;
    let literacySum = 0;
    let literacyWeight = 0;
    let oosSum = 0;
    let oosWeight = 0;

    const coverage = {
      education: new Set(),
      income: new Set(),
      population: new Set(),
      literacy: new Set(),
      outOfSchool: new Set(),
      effectiveLiteracy: new Set(),
      effectiveOutOfSchool: new Set(),
    };

    africaCodes.forEach((code) => {
      const edu = eduIdx.get(`${code}|${year}`);
      const inc = incIdx.get(`${code}|${year}`);
      const pop = popIdx.get(`${code}|${year}`);
      const lit = litIdx.get(`${code}|${year}`);
      const oos = oosIdx.get(`${code}|${year}`);

      if (edu != null) coverage.education.add(code);
      if (inc != null) coverage.income.add(code);
      if (pop != null) coverage.population.add(code);
      if (lit != null) coverage.literacy.add(code);
      if (oos != null) coverage.outOfSchool.add(code);

      if (edu != null && inc != null && pop != null) {
        spendB += (edu / 100) * inc * pop / 1e9;
      }
      if (lit != null && pop != null) {
        literacySum += lit * pop;
        literacyWeight += pop;
      }
      if (oos != null && pop != null) {
        oosSum += oos * pop;
        oosWeight += pop;
      }
      if (edu != null && inc != null && pop != null && lit != null) coverage.effectiveLiteracy.add(code);
      if (edu != null && inc != null && pop != null && oos != null) coverage.effectiveOutOfSchool.add(code);
    });

    if (spendB > 0 && (literacyWeight > 0 || oosWeight > 0)) {
      points.push({
        continent: AFRICA,
        year,
        spendB,
        litPct: literacyWeight > 0 ? literacySum / literacyWeight : null,
        oosPct: oosWeight > 0 ? oosSum / oosWeight : null,
        coverage,
      });
    }
  });

  let yMode = 'literacy';
  const compact = isFullscreen && (
    (container.clientWidth || window.innerWidth * 0.85) < 760 ||
    (container.clientHeight || window.innerHeight * 0.82) < 420
  );
  const tooltip = window.ensureHoverTooltip('education-outcomes-tooltip', { maxWidth: 'min(92vw, 20rem)' });

  function fmtSpend(value) {
    if (value >= 1000) return `${(value / 1000).toFixed(1)} T$`;
    if (value >= 1) return `${value.toFixed(1)} B$`;
    return `${(value * 1000).toFixed(0)} M$`;
  }

  function linearFitXY(series, xAccessor, yAccessor) {
    const pts = series
      .map((d) => ({ x: xAccessor(d), y: yAccessor(d) }))
      .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));
    if (pts.length < 2) return null;

    const meanX = d3.mean(pts, (d) => d.x);
    const meanY = d3.mean(pts, (d) => d.y);
    const denom = d3.sum(pts, (d) => (d.x - meanX) ** 2);
    if (!Number.isFinite(denom) || denom < SLOPE_EPSILON) return null;

    const numer = d3.sum(pts, (d) => (d.x - meanX) * (d.y - meanY));
    const slope = numer / denom;
    const intercept = meanY - (slope * meanX);
    if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return null;
    return { slope, intercept };
  }

  function coverageValue(set) {
    return set instanceof Set ? set.size : 0;
  }

  function activeCoverage(point) {
    const outcomeKey = yMode === 'literacy' ? 'effectiveLiteracy' : 'effectiveOutOfSchool';
    const effectiveTotal = Math.min(
      eligibleCodes.education.size,
      eligibleCodes.income.size,
      eligibleCodes.population.size,
      yMode === 'literacy' ? eligibleCodes.literacy.size : eligibleCodes.outOfSchool.size
    );
    return `${coverageValue(point.coverage[outcomeKey])}/${effectiveTotal}`;
  }

  function hideTip() {
    window.hideHoverTooltip(tooltip);
  }

  function showTip(event, point) {
    const spendValue = fmtSpend(point.spendB);
    const outcomeLabel = yMode === 'literacy' ? 'Literacy' : 'Out of primary school';
    const outcomeValue = `${point[yMode === 'literacy' ? 'litPct' : 'oosPct'].toFixed(2)}%`;
    const coverage = activeCoverage(point);
    window.showHoverTooltip(tooltip, event, window.buildHoverTooltipHtml({
      title: AFRICA,
      meta: `Year: ${point.year}`,
      rows: [
        { label: 'Spending', value: spendValue },
        { label: outcomeLabel, value: outcomeValue },
        { label: 'Data coverage', value: coverage },
      ],
    }), {
      offsetX: 14,
      offsetY: 10,
    });
  }

  const topBar = d3.select(container).append('div')
    .style('display', 'flex')
    .style('align-items', 'center')
    .style('width', '100%')
    .style('justify-content', 'flex-start')
    .style('padding', compact ? '6px 10px 2px' : '8px 16px 4px')
    .style('flex-shrink', '0');

  const pillBar = topBar.append('div')
    .style('display', 'flex')
    .style('align-items', 'center')
    .style('background', 'rgba(255,255,255,0.92)')
    .style('border-radius', compact ? '8px' : '9px')
    .style('border', `1px solid ${UI_MUTED_BORDER}`)
    .style('padding', compact ? '2px' : '3px')
    .style('gap', '2px')
    .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)');

  function mkBtn(label, onClick) {
    return pillBar.append('button')
      .style('font-size', compact ? '10px' : '11px')
      .style('padding', compact ? '4px 8px' : '5px 12px')
      .style('border-radius', compact ? '5px' : '6px')
      .style('border', 'none')
      .style('cursor', 'pointer')
      .style('font-weight', '600')
      .style('transition', 'all 0.15s')
      .text(label)
      .on('click', onClick);
  }

  const btnLit = mkBtn('Literacy', () => {
    yMode = 'literacy';
    updateBtns();
    draw();
  });
  const btnOos = mkBtn('Out of primary school', () => {
    yMode = 'oos';
    updateBtns();
    draw();
  });

  function updateBtns() {
    const setState = (btn, active) => btn
      .style('background', active ? UI_ACTIVE : 'transparent')
      .style('color', active ? '#fff' : UI_MUTED_INK)
      .style('box-shadow', active ? `0 1px 4px ${colorToRgba(UI_ACTIVE, 0.3)}` : 'none');
    setState(btnLit, yMode === 'literacy');
    setState(btnOos, yMode === 'oos');
  }
  updateBtns();

  const vizDiv = d3.select(container).append('div')
    .style('flex', '1 1 0')
    .style('position', 'relative')
    .style('min-height', '0');

  function draw() {
    vizDiv.html('');

    const W = container.clientWidth || 600;
    const H = vizDiv.node().clientHeight || 340;
    const margin = compact
      ? { top: 34, right: 16, bottom: 48, left: 56 }
      : { top: 38, right: 22, bottom: 56, left: 64 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const yKey = yMode === 'literacy' ? 'litPct' : 'oosPct';
    const series = points
      .filter((d) => Number.isFinite(d.spendB) && Number.isFinite(d[yKey]))
      .sort((a, b) => a.year - b.year);

    if (!series.length) return;

    const xExtent = d3.extent(series, (d) => d.spendB);
    const xSpan = Math.max(0, (xExtent[1] ?? 0) - (xExtent[0] ?? 0));
    const xPad = Math.max(xSpan * 0.08, 0.25);
    const xScale = d3.scaleLinear()
      .domain([Math.max(0, (xExtent[0] ?? 0) - xPad), (xExtent[1] ?? 0) + xPad])
      .range([0, innerW])
      .nice();

    const yExtent = d3.extent(series, (d) => d[yKey]);
    const ySpan = Math.max(0, (yExtent[1] ?? 0) - (yExtent[0] ?? 0));
    const yPad = yMode === 'literacy'
      ? Math.max(ySpan * 0.14, 1.6)
      : Math.max(ySpan * 0.14, 0.8);
    const yScale = d3.scaleLinear()
      .domain([Math.max(0, (yExtent[0] ?? 0) - yPad), (yExtent[1] ?? 0) + yPad])
      .range([innerH, 0])
      .nice();

    const svg = vizDiv.append('svg')
      .attr('width', W)
      .attr('height', H)
      .style('display', 'block')
      .style('font-family', 'inherit');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(yMode === 'literacy' ? 5 : 6).tickSize(-innerW).tickFormat(''))
      .call((axis) => {
        axis.select('.domain').remove();
        axis.selectAll('line').attr('stroke', CHART_GRID);
      });

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(-innerH).tickFormat(''))
      .call((axis) => {
        axis.select('.domain').remove();
        axis.selectAll('line').attr('stroke', CHART_GRID);
      });

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(yMode === 'literacy' ? 5 : 6).tickFormat((value) => `${value.toFixed(0)}%`))
      .call((axis) => {
        axis.select('.domain').remove();
        axis.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS);
        axis.selectAll('.tick line').remove();
      });

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat((value) => fmtSpend(value)))
      .call((axis) => {
        axis.select('.domain').remove();
        axis.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS);
        axis.selectAll('.tick line').remove();
      });

    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + (compact ? 32 : 38))
      .attr('class', 'chart-axis-label')
      .attr('text-anchor', 'middle')
      .attr('font-size', compact ? 9 : 10)
      .attr('fill', CHART_AXIS)
      .text('Public spending on education (absolute USD)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -42)
      .attr('class', 'chart-axis-label')
      .attr('text-anchor', 'middle')
      .attr('font-size', compact ? 9 : 10)
      .attr('fill', CHART_AXIS)
      .text(yMode === 'literacy' ? 'Literacy (%)' : 'Children out of primary school (%)');

    const line = d3.line()
      .x((d) => xScale(d.spendB))
      .y((d) => yScale(d[yKey]))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const path = g.append('path')
      .datum(series)
      .attr('fill', 'none')
      .attr('stroke', COLOR)
      .attr('stroke-width', compact ? 2.2 : 2.6)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('opacity', 0.88)
      .attr('d', line)
      .node();

    if (path) {
      const totalLen = path.getTotalLength();
      d3.select(path)
        .attr('stroke-dasharray', totalLen)
        .attr('stroke-dashoffset', totalLen)
        .transition()
        .duration(2200)
        .ease(d3.easeCubicInOut)
        .attr('stroke-dashoffset', 0);
    }

    const regression = linearFitXY(series, (d) => d.spendB, (d) => d[yKey]);
    if (regression) {
      const [xStart, xEnd] = xScale.domain();
      g.append('line')
        .attr('x1', xScale(xStart))
        .attr('y1', yScale(regression.intercept + (regression.slope * xStart)))
        .attr('x2', xScale(xEnd))
        .attr('y2', yScale(regression.intercept + (regression.slope * xEnd)))
        .attr('stroke', COLOR)
        .attr('stroke-width', compact ? 1.7 : 2)
        .attr('stroke-dasharray', '9,6')
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0)
        .style('pointer-events', 'none')
        .transition()
        .delay(2300)
        .duration(420)
        .ease(d3.easeCubicOut)
        .attr('opacity', 0.58);
    }

    const dotRadius = compact ? 4.2 : 4.8;
    const hitRadius = dotRadius + (compact ? 3 : 4);

    g.selectAll('.edu-top-dot')
      .data(series)
      .join('circle')
      .attr('class', 'edu-top-dot')
      .attr('cx', (d) => xScale(d.spendB))
      .attr('cy', (d) => yScale(d[yKey]))
      .attr('r', dotRadius)
      .attr('fill', COLOR)
      .attr('stroke', '#f7f7f5')
      .attr('stroke-width', compact ? 1.4 : 1.7)
      .attr('opacity', 0)
      .transition()
      .delay((d, index) => 2200 + 90 + (240 * (index / Math.max(1, series.length - 1))))
      .duration(180)
      .attr('opacity', 1);

    g.selectAll('.edu-top-hit')
      .data(series)
      .join('circle')
      .attr('class', 'edu-top-hit')
      .attr('cx', (d) => xScale(d.spendB))
      .attr('cy', (d) => yScale(d[yKey]))
      .attr('r', hitRadius)
      .attr('fill', 'rgba(255,255,255,0.001)')
      .style('cursor', 'default')
      .on('mousemove', (event, point) => showTip(event, point))
      .on('mouseleave', hideTip);
  }

  draw();

  container._exclusionShowBase = () => {
    yMode = 'literacy';
    updateBtns();
    draw();
  };
  container._exclusionFocusAfrica = () => {
    yMode = 'literacy';
    updateBtns();
    draw();
  };
  container._exclusionFocusEurope = () => {
    yMode = 'literacy';
    updateBtns();
    draw();
  };
  container._exclusionShowGpi = () => {
    yMode = 'oos';
    updateBtns();
    draw();
  };
  container._exclusionShowTrend = () => {
    yMode = 'literacy';
    updateBtns();
    draw();
  };
  container._getHelpContext = () => ({
    yMode,
    focusCont: AFRICA,
  });
}
