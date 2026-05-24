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
  let xMode    = 'absolute'; // 'absolute' | 'pct'
  let yMode    = 'literacy'; // 'literacy' | 'oos'
  let contMode = 'Africa';   // 'Africa' | 'Europe'

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
    .style('padding', '8px 16px 4px').style('flex-shrink', '0');

  const pillBar = topBar.append('div')
    .style('display', 'flex').style('align-items', 'center')
    .style('background', 'rgba(255,255,255,0.92)')
    .style('border-radius', '9px').style('border', '1px solid #d0d8e8')
    .style('padding', '3px').style('gap', '2px')
    .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)');

  function mkBtn(label, onClick) {
    return pillBar.append('button')
      .style('font-size', '11px').style('padding', '5px 12px').style('border-radius', '6px')
      .style('border', 'none').style('cursor', 'pointer').style('font-weight', '600')
      .style('transition', 'all 0.15s').text(label)
      .on('click', onClick);
  }
  function mkSep() {
    pillBar.append('div')
      .style('width', '1px').style('background', '#d0d8e8').style('margin', '4px 2px').style('align-self', 'stretch');
  }

  const btnAfr = mkBtn('Africa',  () => { contMode = 'Africa';  updateBtns(); draw(); });
  const btnEur = mkBtn('Europe',  () => { contMode = 'Europe';  updateBtns(); draw(); });
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
    set(btnAfr, contMode === 'Africa');
    set(btnEur, contMode === 'Europe');
    set(btnLit, yMode === 'literacy');
    set(btnOos, yMode === 'oos');
    set(btnAbs, xMode === 'absolute');
    set(btnPct, xMode === 'pct');
  }
  updateBtns();

  /* ── Viz container ──────────────────────────────────────── */
  const vizDiv = d3.select(container).append('div')
    .style('flex', '1 1 0').style('position', 'relative').style('min-height', '0');

  /* ── Legend bottom-right ────────────────────────────────── */
  const legDiv = vizDiv.append('div')
    .style('position', 'absolute').style('bottom', '48px').style('right', '16px')
    .style('display', 'flex').style('flex-direction', 'column').style('gap', '4px')
    .style('background', 'rgba(255,255,255,0.88)').style('border-radius', '6px')
    .style('padding', '6px 10px').style('pointer-events', 'none')
    .style('box-shadow', '0 1px 4px rgba(0,0,0,0.08)').style('z-index', '10');
  CONTS.forEach(c => {
    const row = legDiv.append('div').style('display', 'flex').style('align-items', 'center').style('gap', '6px');
    row.append('div').style('width', '10px').style('height', '10px').style('border-radius', '50%')
      .style('background', COLORS[c]).style('opacity', '0.85').style('flex-shrink', '0');
    row.append('span').style('font-size', '11px').style('color', '#555').text(c);
  });

  /* ── Draw ───────────────────────────────────────────────── */
  function draw() {
    vizDiv.html('');
    const W = container.clientWidth  || 600;
    const H = vizDiv.node().clientHeight || 340;

    const margin = { top: 20, right: 32, bottom: 44, left: 56 };
    const iw = W - margin.left - margin.right;
    const ih = H - margin.top  - margin.bottom;

    const col  = COLORS[contMode];
    const pts  = points.filter(d => d.continent === contMode).sort((a, b) => a.year - b.year);

    const xVal = d => xMode === 'absolute' ? d.spendB : d.eduPct;
    const yVal = d => yMode === 'literacy' ? d.litPct : d.oosM;

    /* Tight axes on Africa data */
    const xExt = d3.extent(pts, xVal);
    const xPad = (xExt[1] - xExt[0]) * 0.06;
    const xScale = d3.scaleLinear()
      .domain([Math.max(0, xExt[0] - xPad), xExt[1] + xPad])
      .range([0, iw]).nice();

    const yExt = d3.extent(pts, yVal);
    const yPad = (yExt[1] - yExt[0]) * 0.12;
    const yScale = d3.scaleLinear()
      .domain([Math.max(0, yExt[0] - yPad), yExt[1] + yPad])
      .range([ih, 0]).nice();

    const xFmt = xMode === 'absolute'
      ? v => v >= 1000 ? (v/1000).toFixed(0)+'T$' : v >= 1 ? v.toFixed(0)+'B$' : (v*1000).toFixed(0)+'M$'
      : v => v.toFixed(1) + '%';
    const yFmt = yMode === 'literacy' ? v => v.toFixed(0) + '%' : v => v.toFixed(0) + ' M';

    const markerId = `arrow-excl-${contMode}`;

    const svg = vizDiv.append('svg').attr('width', W).attr('height', H)
      .style('display', 'block').style('font-family', 'inherit');

    svg.append('defs');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    /* Grid */
    g.append('g').call(d3.axisLeft(yScale).ticks(5).tickSize(-iw).tickFormat(''))
      .call(a => { a.select('.domain').remove(); a.selectAll('line').attr('stroke', '#ececec'); });
    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(-ih).tickFormat(''))
      .call(a => { a.select('.domain').remove(); a.selectAll('line').attr('stroke', '#ececec'); });

    /* Axes */
    g.append('g').call(d3.axisLeft(yScale).ticks(5).tickFormat(yFmt))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', 9).attr('fill', '#888'); a.selectAll('.tick line').remove(); });
    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(xFmt))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', 9).attr('fill', '#888'); a.selectAll('.tick line').remove(); });

    /* Axis labels */
    g.append('text').attr('x', iw / 2).attr('y', ih + 36)
      .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#aaa')
      .text(xMode === 'absolute' ? 'Spesa pubblica istruzione (USD)' : 'Spesa pubblica istruzione (% PIL)');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -42)
      .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#aaa')
      .text(yMode === 'literacy' ? 'Tasso di alfabetizzazione (%)' : 'Bambini fuori scuola (M)');

    /* Trajectory line — animated draw */
    const line = d3.line().x(d => xScale(xVal(d))).y(d => yScale(yVal(d))).curve(d3.curveCatmullRom.alpha(0.5));
    const pathEl = g.append('path').datum(pts).attr('d', line)
      .attr('fill', 'none').attr('stroke', col)
      .attr('stroke-width', 1.8).attr('opacity', 0.65).node();
    const totalLen = pathEl.getTotalLength();
    d3.select(pathEl)
      .attr('stroke-dasharray', totalLen)
      .attr('stroke-dashoffset', totalLen)
      .transition().duration(2800).ease(d3.easeCubicInOut)
      .attr('stroke-dashoffset', 0);

    /* Dots */
    const R = 5;
    pts.forEach((d, i) => {
      const cx = xScale(xVal(d)), cy = yScale(yVal(d));
      const delay = 2700 * (i / pts.length);
      g.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', R)
        .attr('fill', col).attr('fill-opacity', 0)
        .attr('stroke', col).attr('stroke-width', 1.2)
        .style('cursor', 'default')
        .on('mousemove', e => showTip(e, d))
        .on('mouseleave', hideTip)
        .transition().delay(delay).duration(200)
        .attr('fill-opacity', 0.75);
    });

    /* Labels — force simulation for collision avoidance */
    const labelNodes = pts.map((d, i) => {
      const cx = xScale(xVal(d)), cy = yScale(yVal(d));
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(pts.length - 1, i + 1)];
      const tdx = xScale(xVal(next)) - xScale(xVal(prev));
      const tdy = yScale(yVal(next)) - yScale(yVal(prev));
      const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
      const side = i % 2 === 0 ? 1 : -1;
      const LOFF = R + 12;
      return { d, i, cx, cy,
        x: cx + (-tdy / tlen) * LOFF * side,
        y: cy + ( tdx / tlen) * LOFF * side };
    });

    /* Labels — only first and last point */
    [labelNodes[0], labelNodes[labelNodes.length - 1]].forEach(n => {
      const isLast = n.i === pts.length - 1;
      const delay = isLast ? 2750 : 200;
      g.append('text')
        .attr('x', n.x).attr('y', n.y + 3)
        .attr('text-anchor', 'middle').attr('font-size', 9)
        .attr('fill', col).attr('font-weight', '600')
        .attr('pointer-events', 'none').attr('opacity', 0)
        .text(n.d.year)
        .transition().delay(delay).duration(250)
        .attr('opacity', 1);
    });
  }

  draw();

  container._exclusionHighlight  = () => draw();
  container._exclusionShowGpi    = () => { yMode = 'oos';     updateBtns(); draw(); };
  container._exclusionShowTrend  = () => { yMode = 'literacy'; updateBtns(); draw(); };
}
