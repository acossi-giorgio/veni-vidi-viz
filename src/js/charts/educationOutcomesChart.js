/* ============================================================
   Grafico 3-3 (Atto II) — Scatter: spesa × alfabetizzazione / fuori scuola
   Africa (corallo) / Europa (teal)  ·  2000–2023
   X = spesa istruzione (USD assoluti)
   Y = alfabetizzazione % OR bambini fuori scuola (M)
   Pannello sotto: rendimento marginale su finestra mobile triennale
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
  const LABEL_YEARS = [2000, 2005, 2010, 2015, 2020];

  /* ── Load data ──────────────────────────────────────────── */
  const [eduRaw, litRaw, oosRaw, incRaw, popRaw] = await Promise.all([
    d3.csv('datasets/processed/education_spending.csv',  d3.autoType),
    d3.csv('datasets/processed/youth_literacy.csv',      d3.autoType),
    d3.csv('datasets/processed/out_of_school_children.csv', d3.autoType),
    d3.csv('datasets/processed/income.csv',        d3.autoType),
    d3.csv('datasets/processed/population.csv',    d3.autoType),
  ]);

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

  /* ── All years available ────────────────────────────────── */
  const allYears = [...new Set(incRaw.map(d => d.year))].filter(y => y >= 2000 && y <= 2022).sort((a, b) => a - b);

  /* ── Aggregate per continent × year ────────────────────── */
  const points = [];
  CONTS.forEach(cont => {
    const codes = [...codeContinent.entries()].filter(([, c]) => c === cont).map(([k]) => k);
    allYears.forEach(yr => {
      let totalSpendB = 0, eduPctSum = 0, eduPctW = 0;
      let litSum = 0, litW = 0, oosSum = 0;
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
        if (lit != null && pop != null) { litSum += lit * pop; litW += pop; }
        if (oos != null) oosSum += oos;
      });
      if (litW > 0 && eduPctW > 0) {
        points.push({
          continent: cont,
          year:      yr,
          spendB:    totalSpendB,
          eduPct:    eduPctSum / eduPctW,
          litPct:    litSum / litW,
          oosM:      oosSum / 1e6,
        });
      }
    });
  });

  const yearExtent = d3.extent(points, d => d.year);
  const keyYearSet = new Set([...LABEL_YEARS, yearExtent[0], yearExtent[1]]);

  /* ── State ──────────────────────────────────────────────── */
  const xMode   = 'absolute'; // fixed: absolute USD only
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
  const LABEL_FADE_MS = 220;

  /* ── Tooltip ────────────────────────────────────────────── */
  d3.select('body').selectAll('.tooltip-excl').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip-excl')
    .style('position', 'absolute').style('background', TOOLTIP_BG)
    .style('color', TOOLTIP_INK).style('border-radius', '6px').style('padding', '8px 13px')
    .style('pointer-events', 'none').style('font-size', '11px').style('line-height', '1.7')
    .style('z-index', '10000').style('display', 'none').style('max-width', '200px');

  function fmtSpend(b) {
    if (b >= 1000) return (b / 1000).toFixed(1) + ' T$';
    if (b >= 1)    return b.toFixed(1) + ' B$';
    return (b * 1000).toFixed(0) + ' M$';
  }
  const fmtSigned = (v, digits = 2) => `${v >= 0 ? '+' : ''}${v.toFixed(digits)}`;

  function hideTip() { tooltip.style('display', 'none'); }
  function showTipHtml(e, html) {
    tooltip.style('display', 'block').html(html);
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 14, ty = e.pageY + 10;
    if (tx + r.width  > window.innerWidth  - 8) tx = e.pageX - r.width  - 14;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 10;
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
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
  const btnOos = mkBtn('Fuori scuola',     () => { yMode = 'oos';     updateBtns(); draw(); });

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
      : 'Traiettoria della spesa e dei bambini fuori scuola in Africa';
    const bottomPanelTitle = yMode === 'literacy'
      ? 'Andamento nel tempo dell alfabetizzazione in Africa'
      : 'Andamento nel tempo dei bambini fuori scuola in Africa';

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
    const yVal = d => yMode === 'literacy' ? d.litPct : d.oosM;
    const scalePts = focusCont ? points.filter(d => d.continent === focusCont) : points;

    /* Tight axes on selected focus, otherwise both continents together */
    const xExt = d3.extent(scalePts, xVal);
    const xPad = (xExt[1] - xExt[0]) * 0.03;
    const xScale = d3.scaleLinear()
      .domain([Math.max(0, xExt[0] - xPad), xExt[1] + xPad])
      .range([0, topIw]).nice();

    const xFmt = v => v >= 1000 ? (v / 1000).toFixed(0) + 'T$' : v >= 1 ? v.toFixed(0) + 'B$' : (v * 1000).toFixed(0) + 'M$';
    const yFmt = yMode === 'literacy' ? v => v.toFixed(0) + '%' : v => v.toFixed(0) + ' M';
    const fmtXVal = v => fmtSpend(v);
    const fmtYVal = v => (yMode === 'literacy' ? `${v.toFixed(2)}%` : `${v.toFixed(2)} M`);
    const xLabel = 'Spesa pubblica istruzione (USD)';
    const yLabel = yMode === 'literacy' ? 'Alfabetizzazione' : 'Fuori scuola';
    const metricKey = yMode === 'literacy' ? 'litPct' : 'oosM';
    const metricAxisLabel = yMode === 'literacy' ? 'Alfabetizzazione (%)' : 'Bambini fuori scuola (M)';
    const metricSeriesAll = (focusCont ? points.filter(d => d.continent === focusCont) : points)
      .filter(d => Number.isFinite(d[metricKey]));
    if (!metricSeriesAll.length) return;
    const metricExtent = d3.extent(metricSeriesAll, d => d[metricKey]);
    const metricMin = metricExtent[0] ?? 0;
    const metricMax = metricExtent[1] ?? 1;
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

    function setLinkedHover(key = null) {
      activeHoverKey = key;
      const activeCont = key ? key.split('|')[0] : null;

      vizDiv.selectAll('.excl-top-dot').each(function() {
        const el = d3.select(this);
        const same = key && el.attr('data-key') === key;
        const baseFill = +el.attr('data-base-fill-opacity');
        const baseStroke = +el.attr('data-base-stroke-opacity');
        const baseR = +el.attr('data-base-r');
        const baseSW = +el.attr('data-base-stroke-width');
        if (!key) {
          el.attr('fill-opacity', baseFill).attr('stroke-opacity', baseStroke).attr('r', baseR).attr('stroke-width', baseSW);
        } else if (same) {
          el.attr('fill-opacity', 0.98).attr('stroke-opacity', 1).attr('r', baseR + 2.1).attr('stroke-width', baseSW + 0.8);
        } else {
          el.attr('fill-opacity', Math.max(0.06, baseFill * HOVER_DIM)).attr('stroke-opacity', Math.max(0.08, baseStroke * HOVER_DIM)).attr('r', baseR).attr('stroke-width', baseSW);
        }
      });

      vizDiv.selectAll('.excl-bottom-dot').each(function() {
        const el = d3.select(this);
        const same = key && el.attr('data-key') === key;
        const baseOpacity = +el.attr('data-base-opacity');
        const baseR = +el.attr('data-base-r');
        if (!key) {
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
        const sameCont = key && el.attr('data-cont') === activeCont;
        if (!key) {
          el.attr('opacity', baseOpacity);
        } else if (sameCont) {
          el.attr('opacity', Math.max(baseOpacity, 0.82));
        } else {
          el.attr('opacity', Math.max(0.06, baseOpacity * HOVER_LINE_DIM));
        }
      });
    }

    const topSvg = vizDiv.append('svg').attr('width', W).attr('height', topPanelH)
      .style('display', 'block').style('font-family', 'inherit');

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
      .attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_AXIS)
      .text('Spesa pubblica istruzione (USD)');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -topIh / 2).attr('y', -42)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_AXIS)
      .text(yMode === 'literacy' ? 'Tasso di alfabetizzazione (%)' : 'Bambini fuori scuola (M)');

    const line = d3.line()
      .x(d => xScale(xVal(d)))
      .y(d => yScale(yVal(d)))
      .curve(d3.curveCatmullRom.alpha(0.5));

    CONTS.forEach(cont => {
      if (focusCont && cont !== focusCont) return;
      const col = COLORS[cont];
      const pts = points.filter(d => d.continent === cont).sort((a, b) => a.year - b.year);
      if (!pts.length) return;

      const isFocus = !focusCont || focusCont === cont;
      const lineOpacity = focusCont ? (isFocus ? 0.82 : 0.18) : 0.74;
      const dotOpacity = focusCont ? (isFocus ? 1 : 0.22) : 1;
      const strokeOpacity = focusCont ? (isFocus ? 1 : 0.4) : 1;

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
          .on('mousemove', e => {
            const secondaryLine = yMode === 'literacy'
              ? `Fuori scuola: <strong>${d.oosM.toFixed(1)} M</strong>`
              : `Alfabetizzazione: <strong>${d.litPct.toFixed(1)}%</strong>`;
            showTipHtml(
              e,
              `<strong style="color:${col}">${d.continent}</strong> · ${d.year}<br>` +
              `${xLabel}: <strong>${fmtXVal(xVal(d))}</strong><br>` +
              `${yLabel}: <strong>${fmtYVal(yVal(d))}</strong><br>` +
              `${secondaryLine}` +
              (dx != null && dy != null
                ? `<br>Δ anno: ${xLabel} <strong>${fmtSigned(dx)} B$</strong>, ${yLabel} <strong>${fmtSigned(dy)}${yMode === 'literacy' ? ' pp' : ' M'}</strong>`
                : '')
            );
          })
          .on('mouseleave', () => { hideTip(); setLinkedHover(null); })
          .transition().delay(delay).duration(DOT_FADE_MS)
          .attr('fill-opacity', dotOpacity)
          .attr('stroke-opacity', strokeOpacity);
        g.append('circle')
          .attr('class', 'excl-top-hit')
          .attr('data-key', key)
          .attr('cx', cx).attr('cy', cy).attr('r', hoverR)
          .attr('fill', 'transparent')
          .style('cursor', 'default')
          .on('mouseenter', () => setLinkedHover(key))
          .on('mousemove', e => {
            const secondaryLine = yMode === 'literacy'
              ? `Fuori scuola: <strong>${d.oosM.toFixed(1)} M</strong>`
              : `Alfabetizzazione: <strong>${d.litPct.toFixed(1)}%</strong>`;
            showTipHtml(
              e,
              `<strong style="color:${col}">${d.continent}</strong> · ${d.year}<br>` +
              `${xLabel}: <strong>${fmtXVal(xVal(d))}</strong><br>` +
              `${yLabel}: <strong>${fmtYVal(yVal(d))}</strong><br>` +
              `${secondaryLine}` +
              (dx != null && dy != null
                ? `<br>Δ anno: ${xLabel} <strong>${fmtSigned(dx)} B$</strong>, ${yLabel} <strong>${fmtSigned(dy)}${yMode === 'literacy' ? ' pp' : ' M'}</strong>`
                : '')
            );
          })
          .on('mouseleave', () => { hideTip(); setLinkedHover(null); });
      });

      const labelPts = pts.filter(d => keyYearSet.has(d.year));
      g.append('g')
        .attr('aria-hidden', 'true')
        .style('pointer-events', 'none')
        .selectAll('text')
        .data(labelPts)
        .join('text')
        .attr('x', d => xScale(xVal(d)) + 6)
        .attr('y', d => yScale(yVal(d)) - 6)
        .attr('font-size', compact ? 8 : 9)
        .attr('font-weight', 600)
        .attr('fill', col)
        .attr('paint-order', 'stroke')
        .attr('stroke', '#f7f7f5')
        .attr('stroke-width', 3)
        .attr('stroke-linejoin', 'round')
        .attr('opacity', 0)
        .text(d => d.year)
        .transition()
        .delay(TOP_LINE_DRAW_MS + 160)
        .duration(LABEL_FADE_MS)
        .attr('opacity', focusCont ? (isFocus ? 0.95 : 0) : 0.86);

    });

    /* ── Bottom panel: metric trend over time ── */
    const metricLabel = yMode === 'literacy' ? 'alfabetizzazione' : 'fuori scuola';
    const xYearExtent = d3.extent(metricSeriesAll, d => d.year);
    const xYearMin = xYearExtent[0] ?? 2000;
    const xYearMax = xYearExtent[1] ?? xYearMin;
    const xYearPad = xYearMin === xYearMax ? 1 : 0.2;
    const xYearScale = d3.scaleLinear()
      .domain([xYearMin - xYearPad, xYearMax + xYearPad])
      .range([0, botIw]);
    const yTrendScale = d3.scaleLinear()
      .domain(sharedMetricDomain)
      .range([botIh, 0]);

    const bottomSvg = vizDiv.append('svg').attr('width', W).attr('height', bottomPanelH)
      .style('display', 'block').style('font-family', 'inherit');
    const gb = bottomSvg.append('g').attr('transform', `translate(${bottomMargin.left},${bottomMargin.top})`);

    gb.append('text')
      .attr('x', 0).attr('y', compact ? -12 : -14)
      .attr('font-size', compact ? 9 : 10)
      .attr('font-weight', 700)
      .attr('fill', CHART_AXIS)
      .text(bottomPanelTitle);

    gb.append('g').call(d3.axisLeft(yTrendScale).tickValues(sharedMetricTicks).tickSize(-botIw).tickFormat(''))
      .call(a => { a.select('.domain').remove(); a.selectAll('line').attr('stroke', CHART_GRID); });
    gb.append('g').call(d3.axisLeft(yTrendScale).tickValues(sharedMetricTicks).tickFormat(yFmt))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS); a.selectAll('.tick line').remove(); });
    gb.append('g').attr('transform', `translate(0,${botIh})`)
      .call(d3.axisBottom(xYearScale).ticks(compact ? 4 : 6).tickFormat(d3.format('d')))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS); a.selectAll('.tick line').remove(); });

    gb.append('text')
      .attr('x', botIw / 2).attr('y', botIh + (compact ? 20 : 24))
      .attr('text-anchor', 'middle').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS)
      .text('Anno');
    gb.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -botIh / 2).attr('y', -42)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS)
      .text(metricAxisLabel);

    const lineTrend = d3.line()
      .defined(d => Number.isFinite(d[metricKey]))
      .x(d => xYearScale(d.year))
      .y(d => yTrendScale(d[metricKey]))
      .curve(d3.curveMonotoneX);

    CONTS.forEach((cont) => {
      if (focusCont && cont !== focusCont) return;
      const series = points
        .filter(d => d.continent === cont && Number.isFinite(d[metricKey]))
        .sort((a, b) => a.year - b.year);
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
        .attr('cy', d => yTrendScale(d[metricKey]))
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
        .attr('cy', d => yTrendScale(d[metricKey]))
        .attr('r', isFocus ? 7 : 6)
        .attr('fill', 'transparent')
        .style('cursor', 'default')
        .on('mouseenter', (e, d) => setLinkedHover(`${d.continent}|${d.year}`))
        .on('mousemove', (e, d) => {
          const secondaryLine = yMode === 'literacy'
            ? `Fuori scuola: <strong>${d.oosM.toFixed(1)} M</strong>`
            : `Alfabetizzazione: <strong>${d.litPct.toFixed(1)}%</strong>`;
          showTipHtml(e,
            `<strong style="color:${col}">${d.continent}</strong> · ${d.year}<br>` +
            `${xLabel}: <strong>${fmtXVal(xVal(d))}</strong><br>` +
            `${yLabel}: <strong>${fmtYVal(yVal(d))}</strong><br>` +
            `${secondaryLine}`
          );
        })
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
    xMode,
    yMode,
    focusCont,
  });
}
