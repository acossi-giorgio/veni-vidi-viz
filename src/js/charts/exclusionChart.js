/* ============================================================
   Grafico 3-3 (Atto II) — Bubble chart: spesa × alfabetizzazione
   Africa (corallo) / Europa (teal)  ·  2000–2020 annuale
   X = spesa istruzione (B USD o % PIL)  Y = alfabetizzazione %
   R = √(bambini fuori scuola, M)
   ============================================================ */
async function renderExclusionChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText += ';position:relative;font-family:inherit;display:flex;flex-direction:column;box-sizing:border-box;';

  const CONTS  = ['Africa', 'Europe'];
  const COLORS = { Africa: '#e07b6a', Europe: '#3a9e8c' };
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

  function nearest(map, code, targetYear, range = 4) {
    for (let d = 0; d <= range; d++) {
      const v = map.get(`${code}|${targetYear + d}`) ?? map.get(`${code}|${targetYear - d}`);
      if (v != null) return v;
    }
    return null;
  }

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
        const edu = nearest(eduIdx, code, yr);
        const inc = nearest(incIdx, code, yr);
        const pop = nearest(popIdx, code, yr);
        const lit = nearest(litIdx, code, yr);
        const oos = nearest(oosIdx, code, yr);
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
  let xMode = 'absolute'; // 'absolute' | 'pct'

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

  /* ── Top bar: legend + toggle ───────────────────────────── */
  const topBar = d3.select(container).append('div')
    .style('display', 'flex').style('align-items', 'center').style('justify-content', 'space-between')
    .style('padding', '8px 16px 4px').style('flex-shrink', '0');

  const legendDiv = topBar.append('div')
    .style('display', 'flex').style('align-items', 'center').style('gap', '16px');

  CONTS.forEach(c => {
    const item = legendDiv.append('div').style('display', 'flex').style('align-items', 'center').style('gap', '6px');
    item.append('div')
      .style('width', '12px').style('height', '12px').style('border-radius', '50%')
      .style('background', COLORS[c]).style('opacity', '0.85');
    item.append('span').style('font-size', '11px').style('color', '#555').text(c);
  });

  const sizeLeg = legendDiv.append('div').style('display', 'flex').style('align-items', 'center').style('gap', '8px').style('margin-left', '8px');
  sizeLeg.append('span').style('font-size', '10px').style('color', '#bbb').text('● bolla = bambini fuori scuola');

  /* Pill toggle */
  const pillBar = topBar.append('div')
    .style('display', 'flex').style('background', 'rgba(255,255,255,0.92)')
    .style('border-radius', '9px').style('border', '1px solid #d0d8e8')
    .style('padding', '3px').style('gap', '2px')
    .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)');

  function mkBtn(label, val) {
    return pillBar.append('button')
      .style('font-size', '11px').style('padding', '5px 14px').style('border-radius', '6px')
      .style('border', 'none').style('cursor', 'pointer').style('font-weight', '600')
      .style('transition', 'all 0.15s').text(label)
      .on('click', () => { xMode = val; updateBtns(); draw(); });
  }
  const btnAbs = mkBtn('Assoluto (USD)', 'absolute');
  const btnPct = mkBtn('% PIL',          'pct');

  function updateBtns() {
    const set = (btn, active) => btn
      .style('background', active ? '#c97c3e' : 'transparent')
      .style('color',      active ? '#fff'    : '#7a8aaa')
      .style('box-shadow', active ? '0 1px 4px rgba(201,124,62,0.3)' : 'none');
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

    const margin = { top: 20, right: 44, bottom: 44, left: 64 };
    const iw = W - margin.left - margin.right;
    const ih = H - margin.top  - margin.bottom;

    const xVal   = d => xMode === 'absolute' ? d.spendB : d.eduPct;
    const xExt   = d3.extent(points, xVal);
    const xPad   = (xExt[1] - xExt[0]) * 0.08;
    const xScale = d3.scaleLinear().domain([Math.max(0, xExt[0] - xPad), xExt[1] + xPad]).range([0, iw]).nice();
    const yScale = d3.scaleLinear().domain([50, 102]).range([ih, 0]);
    const maxOos = d3.max(points, d => d.oosM) || 1;
    const rScale = d3.scaleSqrt().domain([0, maxOos]).range([4, 22]);

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
    const xFmt = xMode === 'absolute'
      ? v => v >= 1000 ? (v / 1000).toFixed(0) + 'T$' : v >= 1 ? v.toFixed(0) + 'B$' : (v * 1000).toFixed(0) + 'M$'
      : v => v.toFixed(1) + '%';

    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(xFmt))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', 9).attr('fill', '#888'); a.selectAll('.tick line').remove(); });

    g.append('g').call(d3.axisLeft(yScale).ticks(6).tickFormat(v => v + '%'))
      .call(a => { a.select('.domain').remove(); a.selectAll('text').attr('font-size', 9).attr('fill', '#888'); a.selectAll('.tick line').remove(); });

    /* Axis labels */
    g.append('text').attr('x', iw / 2).attr('y', ih + 36)
      .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#aaa')
      .text(xMode === 'absolute' ? 'Spesa pubblica istruzione (USD)' : 'Spesa pubblica istruzione (% PIL)');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -50)
      .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#aaa')
      .text('Tasso di alfabetizzazione (%)');

    /* Trajectory lines */
    CONTS.forEach(cont => {
      const pts = points.filter(d => d.continent === cont).sort((a, b) => a.year - b.year);
      if (pts.length < 2) return;
      const line = d3.line().x(d => xScale(xVal(d))).y(d => yScale(d.litPct)).curve(d3.curveCatmullRom.alpha(0.5));
      g.append('path').datum(pts).attr('d', line)
        .attr('fill', 'none').attr('stroke', COLORS[cont])
        .attr('stroke-width', 1.2).attr('stroke-dasharray', '4,3').attr('opacity', 0.4);
    });

    /* Dots — all years */
    points.forEach(d => {
      const cx = xScale(xVal(d)), cy = yScale(d.litPct);
      const r  = rScale(d.oosM);
      const isLabel = LABEL_YEARS.includes(d.year);
      const col = COLORS[d.continent];

      g.append('circle')
        .attr('cx', cx).attr('cy', cy)
        .attr('r', isLabel ? r : Math.max(3, r * 0.55))
        .attr('fill', col)
        .attr('fill-opacity', isLabel ? 0.6 : 0.3)
        .attr('stroke', isLabel ? col : 'none')
        .attr('stroke-width', isLabel ? 1.5 : 0)
        .style('cursor', 'default')
        .on('mousemove', e => showTip(e, d))
        .on('mouseleave', hideTip);

      if (isLabel) {
        g.append('text')
          .attr('x', cx).attr('y', cy - r - 5)
          .attr('text-anchor', 'middle').attr('font-size', 9)
          .attr('fill', col).attr('font-weight', '600')
          .attr('pointer-events', 'none')
          .text(d.year);
      }
    });
  }

  draw();

  container._exclusionHighlight  = () => draw();
  container._exclusionShowGpi    = () => draw();
  container._exclusionShowTrend  = () => draw();
}
