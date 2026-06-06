/* ============================================================
   Grafico 3-1 (Atto II) — Multi-line: spesa pubblica istruzione
   Vista 1: % PIL  |  Vista 2: $ assoluto (% × PIL × pop)
   ============================================================ */
async function renderEducationSpendingChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const CONT_COLOR = {
    'Africa': getContinentColor('Africa', '#c96a3d'),
    'Europe': getContinentColor('Europe', '#5169b2'),
  };
  const UI_ACTIVE = getActColor(2, getUiColor('controlActive', '#5169b2'));
  const UI_MUTED_INK = getUiColor('controlMutedInk', '#75695d');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const CHART_GRID = getUiColor('chartGrid', '#e8e1d7');
  const CHART_AXIS = getUiColor('chartAxis', '#a49788');
  const TOOLTIP_BG = getUiColor('chartTooltipBg', 'rgba(28, 25, 23, 0.94)');
  const TOOLTIP_INK = getUiColor('chartTooltipInk', '#fffdf8');
  const CONTS = ['Africa', 'Europe'];
  const MIN_YEAR = 2000;
  const MAX_YEAR = 2022;

  const [spendRaw, incomeRaw, popRaw] = await Promise.all([
    d3.csv('datasets/processed/education_spending.csv', d3.autoType),
    d3.csv('datasets/processed/income.csv', d3.autoType),
    d3.csv('datasets/processed/population.csv', d3.autoType),
  ]);

  const incByYear = new Map();
  incomeRaw.forEach(d => { if (d.code && d.value != null) incByYear.set(`${d.code}|${d.year}`, d.value); });
  const popByYear = new Map();
  popRaw.forEach(d => { if (d.code && d.value != null) popByYear.set(`${d.code}|${d.year}`, d.value); });

  const spendData = spendRaw.filter(d =>
    d.value != null && d.year >= MIN_YEAR && d.year <= MAX_YEAR &&
    (d.continent === 'Africa' || d.continent === 'Europe')
  );

  // Absolute: (spend% / 100) × GDP_per_capita × population → total USD
  const absData = spendData.map(d => {
    const gdp = incByYear.get(`${d.code}|${d.year}`);
    const pop = popByYear.get(`${d.code}|${d.year}`);
    if (gdp == null || pop == null) return null;
    return { ...d, value: (d.value / 100) * gdp * pop };
  }).filter(Boolean);

  const coverageEligibleByMetric = {
    pct: new Map(CONTS.map(cont => [
      cont,
      new Set(spendData.filter(d => d.continent === cont).map(d => d.code)),
    ])),
    abs: new Map(CONTS.map(cont => [
      cont,
      new Set(absData.filter(d => d.continent === cont).map(d => d.code)),
    ])),
    income: new Map(CONTS.map(cont => [
      cont,
      new Set(incomeRaw.filter(d => d.continent === cont && d.value != null).map(d => d.code)),
    ])),
    population: new Map(CONTS.map(cont => [
      cont,
      new Set(popRaw.filter(d => d.continent === cont && d.value != null).map(d => d.code)),
    ])),
  };

  let viewMetric = 'pct'; // 'pct' | 'abs'

  function currentData() { return viewMetric === 'pct' ? spendData : absData; }

  function buildSeries(data) {
    const cs = new Map();
    d3.group(data, d => d.continent).forEach((rows, cont) => {
      const countries = new Map();
      d3.group(rows, d => d.code).forEach((pts, code) => {
        const sorted = pts.slice().sort((a, b) => a.year - b.year);
        countries.set(code, { country: sorted[0].country, pts: sorted });
      });
      const byYear = d3.rollup(rows, v => {
        if (viewMetric === 'abs') {
          const total = d3.sum(v, d => d.value);
          return { mean: total, lo: total, hi: total };
        }
        const mean = d3.mean(v, d => d.value);
        const std  = d3.deviation(v, d => d.value) || 0;
        return { mean, lo: Math.max(0, mean - std), hi: mean + std };
      }, d => d.year);
      const mean = Array.from(byYear, ([year, s]) => ({ year, ...s })).sort((a, b) => a.year - b.year);
      cs.set(cont, { mean, countries });
    });
    return cs;
  }

  const allYears = [...new Set(spendData.map(d => d.year))].sort((a, b) => a - b);
  const xDomain  = [MIN_YEAR, MAX_YEAR];

  // ── Layout ───────────────────────────────────────────────
  const W = container.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 760);
  const H = container.clientHeight || (isFullscreen ? window.innerHeight * 0.82 : 480);
  const compact = isFullscreen && (W < 760 || H < 420);
  const veryCompact = isFullscreen && (W < 620 || H < 360);
  const SERIES_STROKE_W = compact ? 2.2 : 2.5;
  const SERIES_DOT_R = compact ? 4.2 : 4.8;
  const SERIES_DOT_STROKE_W = compact ? 1.4 : 1.7;
  const SERIES_DOT_STROKE = '#f7f7f5';
  const LINE_DRAW_MS = 900;
  const DOT_FADE_MS = 320;
  const LABEL_FADE_MS = 220;
  const CONTROLS_SAFE_H = compact ? 58 : 74;
  const MARGIN = compact
    ? { top: CONTROLS_SAFE_H, right: veryCompact ? 48 : 56, bottom: 48, left: 54 }
    : { top: CONTROLS_SAFE_H, right: 88, bottom: 56, left: 72 };
  const iw = W - MARGIN.left - MARGIN.right;
  const ih = H - MARGIN.top  - MARGIN.bottom;

  const xS = d3.scaleLinear().domain(xDomain).range([0, iw]);

  // ── Controls row (top-left) ───────────────────────────────
  const ctrlRow = d3.select(container).append('div')
    .style('position', 'absolute').style('top', compact ? '8px' : '10px').style('left', compact ? '8px' : '10px')
    .style('display', 'flex').style('gap', compact ? '6px' : '8px').style('z-index', '20').style('align-items', 'center');

  function makePillBar(parent) {
    return parent.append('div')
      .style('display', 'flex').style('background', 'rgba(255,255,255,0.92)')
      .style('border-radius', compact ? '8px' : '9px').style('border', '1px solid #d0d8e8')
      .style('padding', compact ? '2px' : '3px').style('gap', '2px')
      .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)');
  }

  function makePillBtn(bar, label) {
    return bar.append('button')
      .style('font-size', compact ? '10px' : '11px').style('padding', compact ? '4px 10px' : '5px 14px').style('border-radius', compact ? '5px' : '6px')
      .style('border', 'none').style('cursor', 'pointer').style('font-weight', '600')
      .style('transition', 'all 0.15s').text(label);
  }

  function setPillActive(btn, active) {
    btn.style('background', active ? UI_ACTIVE : 'transparent')
       .style('color', active ? '#fff' : UI_MUTED_INK)
       .style('box-shadow', active ? `0 1px 4px ${colorToRgba(UI_ACTIVE, 0.3)}` : 'none');
  }

  // Metric pills
  const metricBar = makePillBar(ctrlRow);
  const btnPct = makePillBtn(metricBar, '% PIL');
  const btnAbs = makePillBtn(metricBar, '$ Assoluto');

  btnPct.on('click', () => { viewMetric = 'pct'; updateMetricPills(); redraw(); });
  btnAbs.on('click', () => { viewMetric = 'abs'; updateMetricPills(); redraw(); });

  function updateMetricPills() {
    setPillActive(btnPct, viewMetric === 'pct');
    setPillActive(btnAbs, viewMetric === 'abs');
  }
  updateMetricPills();

  // ── SVG ──────────────────────────────────────────────────
  const svg = d3.select(container).append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('height', '100%').style('display', 'block');

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  svg.append('defs').append('clipPath').attr('id', `edu-clip-${isFullscreen ? 'fs' : 'sm'}`)
    .append('rect')
    .attr('x', -10)
    .attr('y', -10)
    .attr('width', iw + 20)
    .attr('height', ih + 20);
  const chartG = g.append('g').attr('clip-path', `url(#edu-clip-${isFullscreen ? 'fs' : 'sm'})`);

  // Axes groups (rebuilt on redraw)
  const xAxisG = g.append('g').attr('transform', `translate(0,${ih})`);
  const yAxisG = g.append('g');
  const gridG  = chartG.append('g').attr('class', 'grid-lines');

  g.append('text').attr('class', 'chart-axis-label').attr('x', iw / 2).attr('y', ih + (compact ? 28 : 34)).attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_AXIS).text('Anno');
  const yLabelEl = g.append('text').attr('class', 'chart-axis-label').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', compact ? -36 : -50).attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_AXIS);

  // Crosshair
  const crossLine = g.append('line').attr('y1', 0).attr('y2', ih)
    .attr('stroke', '#555').attr('stroke-width', 1).attr('stroke-dasharray', '4,3').attr('opacity', 0).style('pointer-events', 'none');
  const crossDots = CONTS.map(cont => ({
    cont, dot: g.append('circle').attr('r', SERIES_DOT_R).attr('fill', CONT_COLOR[cont]).attr('stroke', SERIES_DOT_STROKE).attr('stroke-width', SERIES_DOT_STROKE_W).attr('opacity', 0).style('pointer-events', 'none'),
  }));

  // Tooltip
  const tipEl = window.ensureHoverTooltip('edu-ml-tip', { maxWidth: 'min(92vw, 21rem)' });

  let currentYS = null;
  let meanByContYear = new Map();
  let coverageByYear = new Map();

  function fmtY(v) {
    if (viewMetric === 'pct') return `${v.toFixed(1)}%`;
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`;
    return `$${d3.format(',.0f')(v)}`;
  }

  function draw(cs) {
    // Y domain from mean series only (not raw per-country values)
    const allMeans = [];
    cs.forEach(s => s.mean.forEach(pt => { if (pt.mean != null) allMeans.push(pt.mean); }));
    const yMin = d3.min(allMeans) || 0;
    const yMax = d3.max(allMeans) || 1;
    const pad  = (yMax - yMin) * 0.10;
    currentYS = d3.scaleLinear()
      .domain([Math.max(0, yMin - pad), yMax + pad])
      .range([ih, 0]).nice();

    // Gridlines
    gridG.selectAll('.h-grid').remove();
    currentYS.ticks(5).forEach(t => {
      gridG.append('line').attr('class', 'h-grid')
        .attr('x1', 0).attr('x2', iw).attr('y1', currentYS(t)).attr('y2', currentYS(t))
        .attr('stroke', CHART_GRID).attr('stroke-width', 1);
    });

    // Rebuild axes
    xAxisG.call(
      d3.axisBottom(xS).ticks(6).tickFormat(d3.format('d'))
        .tickSize(4)
    )
    .call(ax => {
      ax.select('.domain').remove();
      ax.selectAll('.tick line').attr('stroke', UI_MUTED_BORDER);
      ax.selectAll('.tick text').attr('fill', CHART_AXIS).attr('font-size', compact ? 8 : 9);
    });

    yAxisG.call(
      d3.axisLeft(currentYS).ticks(5).tickFormat(fmtY).tickSize(4)
    )
    .call(ax => {
      ax.select('.domain').remove();
      ax.selectAll('.tick line').attr('stroke', UI_MUTED_BORDER);
      ax.selectAll('.tick text').attr('fill', CHART_AXIS).attr('font-size', compact ? 8 : 9);
    });

    yLabelEl.text(viewMetric === 'pct' ? 'Spesa istruzione (% PIL)' : 'Spesa istruzione (USD totale)');

    coverageByYear = new Map(allYears.map((year) => {
      const stats = CONTS.map((cont) => {
        const lines = [];
        const seen = (rows) => new Set(rows.filter(d => d.continent === cont && d.year === year && d.value != null).map(d => d.code));
        const pctCovered = seen(spendData);
        const pctTotal = coverageEligibleByMetric.pct.get(cont)?.size || 0;
        if (viewMetric === 'pct') {
          lines.push({ label: 'Spesa istruzione', covered: pctCovered.size, total: pctTotal });
        } else {
          const absCovered = seen(absData);
          const absTotal = coverageEligibleByMetric.abs.get(cont)?.size || 0;
          const incomeCovered = seen(incomeRaw);
          const incomeTotal = coverageEligibleByMetric.income.get(cont)?.size || 0;
          const popCovered = seen(popRaw);
          const popTotal = coverageEligibleByMetric.population.get(cont)?.size || 0;
          lines.push(
            { label: 'Spesa istruzione', covered: pctCovered.size, total: pctTotal },
            { label: 'Reddito', covered: incomeCovered.size, total: incomeTotal },
            { label: 'Popolazione', covered: popCovered.size, total: popTotal },
            { label: 'Aggregazione effettiva', covered: absCovered.size, total: absTotal },
          );
        }
        return { cont, lines };
      });
      return [year, { year, stats }];
    }));

    // Rebuild crosshair lookup
    meanByContYear = new Map();
    CONTS.forEach(cont => {
      (cs.get(cont)?.mean || []).forEach(pt => {
        if (!meanByContYear.has(pt.year)) meanByContYear.set(pt.year, {});
        meanByContYear.get(pt.year)[cont] = pt.mean;
      });
    });

    chartG.selectAll('.mean-line').remove();
    chartG.selectAll('.mean-point').remove();
    g.selectAll('.end-label').remove();

    const lineFn = d3.line().x(d => xS(d.year)).y(d => currentYS(d.mean)).curve(d3.curveMonotoneX).defined(d => d.mean != null);

    CONTS.forEach(cont => {
      const col = CONT_COLOR[cont];
      const s = cs.get(cont);
      if (!s) return;

      const meanPath = chartG.append('path').datum(s.mean).attr('class', 'mean-line')
        .attr('fill', 'none').attr('stroke', col).attr('stroke-width', SERIES_STROKE_W).attr('opacity', 0.9)
        .attr('d', lineFn);

      meanPath.attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
      const pathLength = meanPath.node()?.getTotalLength?.() || 0;
      if (pathLength > 0) {
        meanPath
        .attr('stroke-dasharray', `${pathLength} ${pathLength}`)
        .attr('stroke-dashoffset', pathLength)
        .transition()
          .duration(LINE_DRAW_MS)
          .ease(d3.easeCubicOut)
          .attr('stroke-dashoffset', 0);
      }

      chartG.selectAll(`.mean-point-${cont}`)
        .data(s.mean.filter(pt => pt.mean != null))
        .join('circle')
        .attr('class', `mean-point mean-point-${cont}`)
        .attr('cx', d => xS(d.year))
        .attr('cy', d => currentYS(d.mean))
        .attr('r', SERIES_DOT_R)
        .attr('fill', col)
        .attr('stroke', SERIES_DOT_STROKE)
        .attr('stroke-width', SERIES_DOT_STROKE_W)
        .attr('opacity', 0)
        .transition()
        .delay(LINE_DRAW_MS + 60)
        .duration(DOT_FADE_MS)
        .attr('opacity', 0.98);

      const last = s.mean[s.mean.length - 1];
      if (last) {
        g.append('text').attr('class', 'end-label')
          .attr('x', xS(last.year) + 5).attr('y', currentYS(last.mean) + 4)
          .attr('font-size', compact ? 8 : 9).attr('font-weight', '700').attr('fill', col).attr('opacity', 0)
          .text(compact ? cont : `${cont} ${fmtY(last.mean)}`)
          .transition().duration(LABEL_FADE_MS).delay(LINE_DRAW_MS + DOT_FADE_MS + 120).attr('opacity', 0.9);
      }
    });
  }

  function redraw() {
    draw(buildSeries(currentData()));
  }

  // ── Crosshair overlay ────────────────────────────────────
  g.append('rect').attr('width', iw).attr('height', ih).attr('fill', 'transparent').style('cursor', 'crosshair')
    .on('mousemove', function(event) {
      if (!currentYS) return;
      const [mx] = d3.pointer(event);
      const nearYear = allYears.reduce((a, b) => Math.abs(b - xS.invert(mx)) < Math.abs(a - xS.invert(mx)) ? b : a);
      const cx = xS(nearYear);
      crossLine.attr('x1', cx).attr('x2', cx).attr('opacity', 0.5);

      crossDots.forEach(({ cont, dot }) => {
        const v = meanByContYear.get(nearYear)?.[cont];
        if (v != null) dot.attr('cx', cx).attr('cy', currentYS(v)).attr('opacity', 1);
        else dot.attr('opacity', 0);
      });

      const coverage = coverageByYear.get(nearYear);
      window.showHoverTooltip(tipEl, event, {
        title: 'Spesa pubblica in istruzione',
        meta: `Anno: ${nearYear}`,
        sections: [
          {
            title: 'Valori',
            rows: CONTS.map(cont => ({
              label: cont,
              value: meanByContYear.get(nearYear)?.[cont] != null ? fmtY(meanByContYear.get(nearYear)[cont]) : 'N/D',
            })),
          },
          ...(coverage?.stats?.length ? coverage.stats.map(({ cont, lines }) => ({
            title: cont,
            rows: lines.map(line => ({
              label: line.label,
              value: `${line.covered}/${line.total} paesi`,
            })),
          })) : []),
        ],
      }, { offsetX: 14, offsetY: -28 });
    })
    .on('mouseleave', () => {
      crossLine.attr('opacity', 0);
      crossDots.forEach(({ dot }) => dot.attr('opacity', 0));
      window.hideHoverTooltip(tipEl);
    });

  // Initial draw
  redraw();

  // ── DOM API ───────────────────────────────────────────────
  container._treemapReset     = () => { viewMetric = 'pct'; updateMetricPills(); redraw(); };
  container._treemapHighlight = () => redraw();
  container._getHelpContext = () => ({
    viewMetric,
  });
}
