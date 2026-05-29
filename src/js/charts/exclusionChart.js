/* ============================================================
   Grafico 3-3 (Atto II) — Scatter: spesa × alfabetizzazione / fuori scuola
   Africa (corallo) / Europa (teal)  ·  2000–2023 annuale
   X = spesa istruzione (B USD o % PIL)
   Y = alfabetizzazione % OR bambini fuori scuola (M)
   ============================================================ */
async function renderExclusionChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText += ';position:relative;font-family:inherit;display:flex;flex-direction:column;box-sizing:border-box;';

  const CONTS  = ['Africa', 'Europe'];
  const COLORS = { Africa: '#e07b39', Europe: '#5aab6e' };
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
  const allYears = [...new Set(incRaw.map(d => d.year))].filter(y => y >= 2000 && y <= 2023).sort((a, b) => a - b);

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
    .style('position', 'absolute').style('background', 'rgba(20,20,40,0.93)')
    .style('color', '#fff').style('border-radius', '6px').style('padding', '8px 13px')
    .style('pointer-events', 'none').style('font-size', '11px').style('line-height', '1.7')
    .style('z-index', '10000').style('display', 'none').style('max-width', '200px');

  function fmtSpend(b) {
    if (b >= 1000) return (b / 1000).toFixed(1) + ' T$';
    if (b >= 1)    return b.toFixed(1) + ' B$';
    return (b * 1000).toFixed(0) + ' M$';
  }

  function showTip(e, d) {
    const col = COLORS[d.continent];
    tooltip.style('display', 'block').html(
      `<strong style="color:${col}">${d.continent}</strong> · ${d.year}<br>` +
      `Spesa: <strong>${fmtSpend(d.spendB)}</strong> (${d.eduPct.toFixed(1)}% PIL)<br>` +
      `Alfabetizzazione: <strong>${d.litPct.toFixed(1)}%</strong><br>` +
      `Fuori scuola: <strong>${d.oosM.toFixed(1)} M</strong>`
    );
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 14, ty = e.pageY + 10;
    if (tx + r.width  > window.innerWidth  - 8) tx = e.pageX - r.width  - 14;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 10;
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }
  function hideTip() { tooltip.style('display', 'none'); }

  /* ── Top bar: toggles left ──────────────────────────────── */
  const topBar = d3.select(container).append('div')
    .style('display', 'flex').style('align-items', 'center')
    .style('padding', compact ? '6px 10px 2px' : '8px 16px 4px').style('flex-shrink', '0');

  const pillBar = topBar.append('div')
    .style('display', 'flex').style('align-items', 'center')
    .style('flex-wrap', compact ? 'wrap' : 'nowrap')
    .style('background', 'rgba(255,255,255,0.92)')
    .style('border-radius', compact ? '8px' : '9px').style('border', '1px solid #d0d8e8')
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
      .style('width', '1px').style('background', '#d0d8e8').style('margin', '4px 2px').style('align-self', 'stretch');
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
      .style('background', active ? '#4a6fa5' : 'transparent')
      .style('color',      active ? '#fff'    : '#7a8aaa')
      .style('box-shadow', active ? '0 1px 4px rgba(74,111,165,0.3)' : 'none');
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

    const margin = compact
      ? { top: 18, right: 68, bottom: 38, left: 58 }
      : { top: 20, right: 110, bottom: 44, left: 64 };
    const iw = W - margin.left - margin.right;
    const ih = H - margin.top  - margin.bottom;

    const xVal = d => xMode === 'absolute' ? d.spendB : d.eduPct;
    const yVal = d => yMode === 'literacy' ? d.litPct : d.oosM;
    const scalePts = focusCont ? points.filter(d => d.continent === focusCont) : points;

    /* Tight axes on selected focus, otherwise both continents together */
    const xExt = d3.extent(scalePts, xVal);
    const xPad = (xExt[1] - xExt[0]) * 0.06;
    const xScale = d3.scaleLinear()
      .domain([Math.max(0, xExt[0] - xPad), xExt[1] + xPad])
      .range([0, iw]).nice();

    const yExt = d3.extent(scalePts, yVal);
    const yPad = (yExt[1] - yExt[0]) * 0.12;
    const yScale = d3.scaleLinear()
      .domain([Math.max(0, yExt[0] - yPad), yExt[1] + yPad])
      .range([ih, 0]).nice();

    const xFmt = xMode === 'absolute'
      ? v => v >= 1000 ? (v/1000).toFixed(0)+'T$' : v >= 1 ? v.toFixed(0)+'B$' : (v*1000).toFixed(0)+'M$'
      : v => v.toFixed(1) + '%';
    const yFmt = yMode === 'literacy' ? v => v.toFixed(0) + '%' : v => v.toFixed(0) + ' M';

    const svg = vizDiv.append('svg').attr('width', W).attr('height', H)
      .style('display', 'block').style('font-family', 'inherit');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    /* Grid */
    g.append('g').call(d3.axisLeft(yScale).ticks(5).tickSize(-iw).tickFormat(''))
      .call(a => { a.select('.domain').remove(); a.selectAll('line').attr('stroke', '#ececec'); });
    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(-ih).tickFormat(''))
      .call(a => { a.select('.domain').remove(); a.selectAll('line').attr('stroke', '#ececec'); });

    /* Axes */
    g.append('g').call(d3.axisLeft(yScale).ticks(5).tickFormat(yFmt))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', '#888'); a.selectAll('.tick line').remove(); });
    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(xFmt))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', '#888'); a.selectAll('.tick line').remove(); });

    /* Axis labels */
    g.append('text').attr('x', iw / 2).attr('y', ih + 36)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', '#aaa')
      .text(xMode === 'absolute' ? 'Spesa pubblica istruzione (USD)' : 'Spesa pubblica istruzione (% PIL)');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -42)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', '#aaa')
      .text(yMode === 'literacy' ? 'Tasso di alfabetizzazione (%)' : 'Bambini fuori scuola (M)');

    const line = d3.line()
      .x(d => xScale(xVal(d)))
      .y(d => yScale(yVal(d)))
      .curve(d3.curveCatmullRom.alpha(0.5));

    CONTS.forEach(cont => {
      const col = COLORS[cont];
      const pts = points.filter(d => d.continent === cont).sort((a, b) => a.year - b.year);
      if (!pts.length) return;

      const isFocus = !focusCont || focusCont === cont;
      const lineOpacity = focusCont ? (isFocus ? 0.72 : 0.18) : 0.58;
      const dotOpacity = focusCont ? (isFocus ? 0.78 : 0.22) : 0.72;
      const strokeOpacity = focusCont ? (isFocus ? 1 : 0.4) : 1;

      const pathEl = g.append('path').datum(pts).attr('d', line)
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
        const delay = 2100 * (i / pts.length);
        g.append('circle')
          .attr('cx', cx).attr('cy', cy).attr('r', R)
          .attr('fill', col).attr('fill-opacity', 0)
          .attr('stroke', col).attr('stroke-opacity', strokeOpacity).attr('stroke-width', 1.2)
          .style('cursor', 'default')
          .on('mousemove', e => showTip(e, d))
          .on('mouseleave', hideTip)
          .transition().delay(delay).duration(180)
          .attr('fill-opacity', dotOpacity);
        g.append('circle')
          .attr('cx', cx).attr('cy', cy).attr('r', hoverR)
          .attr('fill', 'transparent')
          .style('cursor', 'default')
          .on('mousemove', e => showTip(e, d))
          .on('mouseleave', hideTip);
      });

    });
  }

  draw();

  container._exclusionShowBase   = () => { focusCont = null;     yMode = 'literacy'; updateBtns(); draw(); };
  container._exclusionFocusAfrica = () => { focusCont = 'Africa'; updateBtns(); draw(); };
  container._exclusionFocusEurope = () => { focusCont = 'Europe'; updateBtns(); draw(); };
  container._exclusionShowGpi    = () => { focusCont = null; yMode = 'oos';      updateBtns(); draw(); };
  container._exclusionShowTrend  = () => { focusCont = null; yMode = 'literacy'; updateBtns(); draw(); };
}
