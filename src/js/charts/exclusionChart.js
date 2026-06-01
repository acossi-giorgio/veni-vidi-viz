/* ============================================================
   Grafico 3-3 (Atto II) — Scatter: spesa × alfabetizzazione / fuori scuola
   Africa (corallo) / Europa (teal)  ·  2000–2023
   X = spesa istruzione (B USD o % PIL)
   Y = alfabetizzazione % OR bambini fuori scuola (M)
   Pannello sotto: rendimento marginale su finestra mobile triennale
   ============================================================ */
async function renderExclusionChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText += ';position:relative;font-family:inherit;display:flex;flex-direction:column;box-sizing:border-box;';

  const CONTS  = ['Africa', 'Europe'];
  const COLORS = {
    Africa: getContinentColor('Africa', '#c96a3d'),
    Europe: getContinentColor('Europe', '#5169b2'),
  };
  const UI_ACTIVE = getUiColor('controlActive', '#5169b2');
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
    d3.csv('datasets/processed/edu_spending.csv',  d3.autoType),
    d3.csv('datasets/processed/literacy.csv',      d3.autoType),
    d3.csv('datasets/processed/out_of_school.csv', d3.autoType),
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
  let xMode     = 'absolute'; // 'absolute' | 'pct'
  let yMode     = 'literacy'; // 'literacy' | 'oos'
  let focusCont = null;       // null | 'Africa' | 'Europe'
  const compact = isFullscreen && (
    (container.clientWidth  || window.innerWidth  * 0.85) < 760 ||
    (container.clientHeight || window.innerHeight * 0.82) < 420
  );

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

  /* ── Top bar: toggles left ──────────────────────────────── */
  const topBar = d3.select(container).append('div')
    .style('display', 'flex').style('align-items', 'center')
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
  function mkSep() {
    pillBar.append('div')
      .style('width', '1px').style('background', UI_MUTED_BORDER).style('margin', '4px 2px').style('align-self', 'stretch');
  }

  const btnAll = mkBtn('Tutti',            () => { focusCont = null;     updateBtns(); draw(); });
  const btnAfr = mkBtn('Africa',           () => { focusCont = 'Africa'; updateBtns(); draw(); });
  const btnEur = mkBtn('Europe',           () => { focusCont = 'Europe'; updateBtns(); draw(); });
  mkSep();
  const btnLit = mkBtn('Alfabetizzazione', () => { yMode = 'literacy'; updateBtns(); draw(); });
  const btnOos = mkBtn('Fuori scuola',     () => { yMode = 'oos';     updateBtns(); draw(); });
  mkSep();
  const btnAbs = mkBtn('Assoluto (USD)',   () => { xMode = 'absolute'; updateBtns(); draw(); });
  const btnPct = mkBtn('% PIL',             () => { xMode = 'pct';     updateBtns(); draw(); });

  function updateBtns() {
    const set = (btn, active) => btn
      .style('background', active ? UI_ACTIVE : 'transparent')
      .style('color',      active ? '#fff'    : UI_MUTED_INK)
      .style('box-shadow', active ? `0 1px 4px ${colorToRgba(UI_ACTIVE, 0.3)}` : 'none');
    set(btnAll, focusCont == null);
    set(btnAfr, focusCont === 'Africa');
    set(btnEur, focusCont === 'Europe');
    set(btnLit, yMode === 'literacy');
    set(btnOos, yMode === 'oos');
    set(btnAbs, xMode === 'absolute');
    set(btnPct, xMode === 'pct');
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
    const topPanelH = Math.max(170, Math.round(H * (compact ? 0.62 : 0.66)));
    const bottomPanelH = Math.max(110, H - topPanelH);

    const topMargin = compact
      ? { top: 16, right: 12, bottom: 42, left: 58 }
      : { top: 20, right: 20, bottom: 52, left: 64 };
    const bottomMargin = compact
      ? { top: 14, right: 12, bottom: 30, left: 68 }
      : { top: 14, right: 20, bottom: 34, left: 80 };
    const topIw = W - topMargin.left - topMargin.right;
    const topIh = topPanelH - topMargin.top - topMargin.bottom;
    const botIw = W - bottomMargin.left - bottomMargin.right;
    const botIh = bottomPanelH - bottomMargin.top - bottomMargin.bottom;

    const xVal = d => xMode === 'absolute' ? d.spendB : d.eduPct;
    const yVal = d => yMode === 'literacy' ? d.litPct : d.oosM;
    const scalePts = focusCont ? points.filter(d => d.continent === focusCont) : points;

    /* Tight axes on selected focus, otherwise both continents together */
    const xExt = d3.extent(scalePts, xVal);
    const xPad = (xExt[1] - xExt[0]) * 0.03;
    const xScale = d3.scaleLinear()
      .domain([Math.max(0, xExt[0] - xPad), xExt[1] + xPad])
      .range([0, topIw]).nice();

    const yExt = d3.extent(scalePts, yVal);
    const yPad = (yExt[1] - yExt[0]) * 0.12;
    const yScale = d3.scaleLinear()
      .domain([Math.max(0, yExt[0] - yPad), yExt[1] + yPad])
      .range([topIh, 0]).nice();

    const xFmt = xMode === 'absolute'
      ? v => v >= 1000 ? (v/1000).toFixed(0)+'T$' : v >= 1 ? v.toFixed(0)+'B$' : (v*1000).toFixed(0)+'M$'
      : v => v.toFixed(1) + '%';
    const yFmt = yMode === 'literacy' ? v => v.toFixed(0) + '%' : v => v.toFixed(0) + ' M';
    const fmtXVal = v => (xMode === 'absolute' ? fmtSpend(v) : `${v.toFixed(2)}% PIL`);
    const fmtYVal = v => (yMode === 'literacy' ? `${v.toFixed(2)}%` : `${v.toFixed(2)} M`);
    const xLabel = xMode === 'absolute' ? 'Spesa istruzione' : 'Spesa istruzione';
    const yLabel = yMode === 'literacy' ? 'Alfabetizzazione' : 'Fuori scuola';

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

    /* Grid */
    g.append('g').call(d3.axisLeft(yScale).ticks(5).tickSize(-topIw).tickFormat(''))
      .call(a => { a.select('.domain').remove(); a.selectAll('line').attr('stroke', CHART_GRID); });
    g.append('g').attr('transform', `translate(0,${topIh})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(-topIh).tickFormat(''))
      .call(a => { a.select('.domain').remove(); a.selectAll('line').attr('stroke', CHART_GRID); });

    /* Axes */
    g.append('g').call(d3.axisLeft(yScale).ticks(5).tickFormat(yFmt))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS); a.selectAll('.tick line').remove(); });
    g.append('g').attr('transform', `translate(0,${topIh})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(xFmt))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS); a.selectAll('.tick line').remove(); });

    /* Axis labels */
    g.append('text').attr('x', topIw / 2).attr('y', topIh + 32)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_AXIS)
      .text(xMode === 'absolute' ? 'Spesa pubblica istruzione (USD)' : 'Spesa pubblica istruzione (% PIL)');
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
      const lineOpacity = focusCont ? (isFocus ? 0.72 : 0.18) : 0.58;
      const dotOpacity = focusCont ? (isFocus ? 0.78 : 0.22) : 0.72;
      const strokeOpacity = focusCont ? (isFocus ? 1 : 0.4) : 1;

      const pathEl = g.append('path').datum(pts).attr('d', line)
        .attr('class', 'excl-hover-line')
        .attr('data-cont', cont)
        .attr('data-base-opacity', lineOpacity)
        .attr('fill', 'none').attr('stroke', col)
        .attr('stroke-width', isFocus ? 1.9 : 1.5).attr('opacity', lineOpacity).node();
      const totalLen = pathEl.getTotalLength();
      d3.select(pathEl)
        .attr('stroke-dasharray', totalLen)
        .attr('stroke-dashoffset', totalLen)
        .transition().duration(2200).ease(d3.easeCubicInOut)
        .attr('stroke-dashoffset', 0);

      const R = focusCont ? (isFocus ? 4.2 : 2.8) : 2.9;
      const hoverR = focusCont ? (isFocus ? 8 : 6) : 8;
      pts.forEach((d, i) => {
        const cx = xScale(xVal(d)), cy = yScale(yVal(d));
        const prev = byContYear.get(`${d.continent}|${d.year - 1}`) || null;
        const dx = prev ? xVal(d) - xVal(prev) : null;
        const dy = prev ? yVal(d) - yVal(prev) : null;
        const key = `${d.continent}|${d.year}`;
        const delay = 2100 * (i / pts.length);
        g.append('circle')
          .attr('class', 'excl-top-dot')
          .attr('data-key', key)
          .attr('data-base-fill-opacity', dotOpacity)
          .attr('data-base-stroke-opacity', strokeOpacity)
          .attr('data-base-r', R)
          .attr('data-base-stroke-width', 1.2)
          .attr('cx', cx).attr('cy', cy).attr('r', R)
          .attr('fill', col).attr('fill-opacity', 0)
          .attr('stroke', col).attr('stroke-opacity', strokeOpacity).attr('stroke-width', 1.2)
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
                ? `<br>Δ anno: ${xLabel} <strong>${fmtSigned(dx)}${xMode === 'absolute' ? ' B$' : ' pp %PIL'}</strong>, ${yLabel} <strong>${fmtSigned(dy)}${yMode === 'literacy' ? ' pp' : ' M'}</strong>`
                : '')
            );
          })
          .on('mouseleave', () => { hideTip(); setLinkedHover(null); })
          .transition().delay(delay).duration(180)
          .attr('fill-opacity', dotOpacity);
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
                ? `<br>Δ anno: ${xLabel} <strong>${fmtSigned(dx)}${xMode === 'absolute' ? ' B$' : ' pp %PIL'}</strong>, ${yLabel} <strong>${fmtSigned(dy)}${yMode === 'literacy' ? ' pp' : ' M'}</strong>`
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
        .attr('opacity', focusCont ? (isFocus ? 0.95 : 0) : 0.86)
        .text(d => d.year);

    });

    /* ── Bottom panel: corrected 3-year rolling return ── */
    const metricKey = yMode === 'literacy' ? 'litPct' : 'oosM';
    const metricLabel = yMode === 'literacy' ? 'alfabetizzazione' : 'fuori scuola';
    const metricUnit = yMode === 'literacy' ? 'pp' : 'M';
    const outcomeDirection = yMode === 'literacy' ? 1 : -1; // for out_of_school, a decrease is positive
    const MARGINAL_WINDOW_YEARS = 1;
    const minDeltaSpend = xMode === 'absolute' ? 0.01 : 0.005;

    function buildMarginalSeries(cont) {
      const pts = points.filter(d => d.continent === cont).sort((a, b) => a.year - b.year);
      const out = [];
      for (let i = MARGINAL_WINDOW_YEARS; i < pts.length; i += 1) {
        const prev = pts[i - MARGINAL_WINDOW_YEARS];
        const cur = pts[i];
        const yearSpan = cur.year - prev.year;
        if (!Number.isFinite(yearSpan) || yearSpan < MARGINAL_WINDOW_YEARS) continue;
        const dSpend = xVal(cur) - xVal(prev);
        const dMetric = cur[metricKey] - prev[metricKey];
        const dOutcome = dMetric * outcomeDirection;
        if (!Number.isFinite(dSpend) || !Number.isFinite(dMetric) || !Number.isFinite(dOutcome) || Math.abs(dSpend) < minDeltaSpend) continue;
        const corrected = dOutcome / Math.abs(dSpend);
        out.push({
          continent: cont,
          year: cur.year,
          value: corrected,
          dMetric,
          dOutcome,
          dSpend,
          windowYears: yearSpan,
        });
      }
      return out;
    }

    const marginalsAll = CONTS.flatMap(buildMarginalSeries).filter(d => Number.isFinite(d.value));
    if (!marginalsAll.length) return;
    const forScale = focusCont ? marginalsAll.filter(d => d.continent === focusCont) : marginalsAll;
    const absVals = forScale.map(d => Math.abs(d.value)).sort((a, b) => a - b);
    const absMax = d3.max(absVals) || 1;
    const yCap = Math.max(0.01, absMax * 1.08);

    const xYearExtent = d3.extent(forScale, d => d.year);
    const xYearMin = xYearExtent[0] ?? 2000;
    const xYearMax = xYearExtent[1] ?? xYearMin;
    const xYearPad = xYearMin === xYearMax ? 1 : 0.2;
    const xYearScale = d3.scaleLinear()
      .domain([xYearMin - xYearPad, xYearMax + xYearPad])
      .range([0, botIw]);
    const yReturnScale = d3.scaleSymlog()
      .constant(Math.max(0.05, yCap * 0.02))
      .domain([-yCap, yCap])
      .nice()
      .range([botIh, 0])
      .clamp(false);

    const yReturnFmt = (v) => {
      const abs = Math.abs(v);
      const fmt = abs < 1 ? d3.format('+.2f') : abs < 10 ? d3.format('+.1f') : d3.format('+.0f');
      return fmt(v);
    };

    const bottomSvg = vizDiv.append('svg').attr('width', W).attr('height', bottomPanelH)
      .style('display', 'block').style('font-family', 'inherit');
    const gb = bottomSvg.append('g').attr('transform', `translate(${bottomMargin.left},${bottomMargin.top})`);

    gb.append('g').call(d3.axisLeft(yReturnScale).ticks(4).tickSize(-botIw).tickFormat(''))
      .call(a => { a.select('.domain').remove(); a.selectAll('line').attr('stroke', CHART_GRID); });
    gb.append('g').call(d3.axisLeft(yReturnScale).ticks(4).tickFormat(yReturnFmt))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS); a.selectAll('.tick line').remove(); });
    gb.append('g').attr('transform', `translate(0,${botIh})`)
      .call(d3.axisBottom(xYearScale).ticks(compact ? 4 : 6).tickFormat(d3.format('d')))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS); a.selectAll('.tick line').remove(); });

    gb.append('line')
      .attr('x1', 0).attr('x2', botIw)
      .attr('y1', yReturnScale(0)).attr('y2', yReturnScale(0))
      .attr('stroke', CHART_AXIS).attr('stroke-width', 1).attr('stroke-dasharray', '3 3').attr('opacity', 0.7);

    gb.append('text')
      .attr('x', 0).attr('y', -2)
      .attr('font-size', compact ? 8 : 9)
      .attr('font-weight', 600)
      .attr('fill', CHART_AXIS)
      .text(`Indice corretto annuale (Δ outcome / |Δ spesa|) · ${metricLabel}`);
    gb.append('text')
      .attr('x', botIw / 2).attr('y', botIh + (compact ? 20 : 24))
      .attr('text-anchor', 'middle').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS)
      .text('Anno');
    gb.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -botIh / 2).attr('y', -42)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS)
      .text('Indice (scala log)');

    const lineReturn = d3.line()
      .defined(d => Number.isFinite(d.value))
      .x(d => xYearScale(d.year))
      .y(d => yReturnScale(d.value))
      .curve(d3.curveMonotoneX);

    CONTS.forEach((cont) => {
      if (focusCont && cont !== focusCont) return;
      const series = marginalsAll.filter(d => d.continent === cont).sort((a, b) => a.year - b.year);
      if (!series.length) return;
      const col = COLORS[cont];
      const isFocus = !focusCont || focusCont === cont;
      const baseLineOp = focusCont ? (isFocus ? 0.82 : 0.2) : 0.72;
      const baseDotOp = focusCont ? (isFocus ? 0.86 : 0.22) : 0.72;
      const baseR = isFocus ? 2.8 : 2.3;

      gb.append('path')
        .datum(series)
        .attr('class', 'excl-hover-line')
        .attr('data-cont', cont)
        .attr('data-base-opacity', baseLineOp)
        .attr('fill', 'none')
        .attr('stroke', col)
        .attr('stroke-width', isFocus ? 1.9 : 1.3)
        .attr('opacity', baseLineOp)
        .attr('d', lineReturn);

      gb.selectAll(`.marg-dot-${cont}`)
        .data(series)
        .join('circle')
        .attr('class', `marg-dot-${cont} excl-bottom-dot`)
        .attr('data-key', d => `${d.continent}|${d.year}`)
        .attr('data-base-opacity', baseDotOp)
        .attr('data-base-r', baseR)
        .attr('cx', d => xYearScale(d.year))
        .attr('cy', d => yReturnScale(d.value))
        .attr('r', baseR)
        .attr('fill', col)
        .attr('opacity', baseDotOp)
        .style('pointer-events', 'none');

      gb.selectAll(`.marg-hit-${cont}`)
        .data(series)
        .join('circle')
        .attr('class', `marg-hit-${cont}`)
        .attr('data-key', d => `${d.continent}|${d.year}`)
        .attr('cx', d => xYearScale(d.year))
        .attr('cy', d => yReturnScale(d.value))
        .attr('r', isFocus ? 7 : 6)
        .attr('fill', 'transparent')
        .style('cursor', 'default')
        .on('mouseenter', (e, d) => setLinkedHover(`${d.continent}|${d.year}`))
        .on('mousemove', (e, d) => {
          const spendUnit = xMode === 'absolute' ? 'B$' : 'pp %PIL';
          showTipHtml(e,
            `<strong style="color:${col}">${d.continent}</strong> · ${d.year}<br>` +
            `Δ ${metricLabel} (${d.windowYears} anni): <strong>${d3.format('+.2f')(d.dMetric)} ${metricUnit}</strong><br>` +
            `Δ spesa (${d.windowYears} anni): <strong>${d3.format('+.2f')(d.dSpend)} ${spendUnit}</strong><br>` +
            `Indice corretto: <strong>${d3.format('+.2f')(d.value)}</strong>`
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

  container._exclusionShowBase   = () => { focusCont = null;     yMode = 'literacy'; updateBtns(); draw(); };
  container._exclusionFocusAfrica = () => { focusCont = 'Africa'; updateBtns(); draw(); };
  container._exclusionFocusEurope = () => { focusCont = 'Europe'; updateBtns(); draw(); };
  container._exclusionShowGpi    = () => { focusCont = null; yMode = 'oos';      updateBtns(); draw(); };
  container._exclusionShowTrend  = () => { focusCont = null; yMode = 'literacy'; updateBtns(); draw(); };
  container._getHelpContext = () => ({
    xMode,
    yMode,
    focusCont,
  });
}
