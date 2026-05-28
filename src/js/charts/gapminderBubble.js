/* ============================================================
   Grafico 1-2 (Atto I) — Gapminder: reddito × aspettativa di vita
   X = PIL pro capite (log/lin toggle), Y = aspettativa di vita, R = pop
   ============================================================ */
async function renderGapminderBubble(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const CONT_COLOR = { 'Africa': '#e07b39', 'Europe': '#5aab6e' };
  const BASE_PLAYER_H = 72;

  const [incomeRaw, lifeRaw, popRaw] = await Promise.all([
    d3.csv('datasets/processed/income.csv', d3.autoType),
    d3.csv('datasets/processed/life_expectancy.csv', d3.autoType),
    d3.csv('datasets/processed/population.csv', d3.autoType),
  ]);

  function buildMap(raw) {
    const m = {};
    raw.forEach(d => {
      if (d.value == null) return;
      if (!m[d.year]) m[d.year] = {};
      m[d.year][d.code] = d.value;
    });
    return m;
  }

  const incomeMap = buildMap(incomeRaw);
  const lifeMap   = buildMap(lifeRaw);
  const popMap    = buildMap(popRaw);

  const codeContinent = {};
  incomeRaw.forEach(d => { if (d.code && d.continent) codeContinent[d.code] = d.continent; });
  lifeRaw.forEach(d => { if (d.code && d.continent && !codeContinent[d.code]) codeContinent[d.code] = d.continent; });

  const codeName = {};
  incomeRaw.forEach(d => { if (d.code && d.country) codeName[d.code] = d.country; });

  const incomeYears = Object.keys(incomeMap).map(Number).sort((a, b) => a - b);
  const YEAR_MIN = incomeYears[0], YEAR_MAX = incomeYears[incomeYears.length - 1];

  let currentYear = YEAR_MAX;
  let playing = false, playTimer = null;
  let highlightContinent = null;
  const rawW = container.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 760);
  const rawH = container.clientHeight || (isFullscreen ? window.innerHeight * 0.8 : 460);
  const compact = isFullscreen && (rawW < 760 || rawH < 420);
  const PLAYER_H = compact ? 64 : BASE_PLAYER_H;
  const W = rawW;
  const H = rawH - PLAYER_H;
  const MARGIN = compact ? { top: 22, right: 14, bottom: 34, left: 46 } : { top: 28, right: 24, bottom: 44, left: 58 };
  const iw = W - MARGIN.left - MARGIN.right;
  const ih = H - MARGIN.top  - MARGIN.bottom;

  const allIncome = incomeRaw.map(d => d.value).filter(v => v > 0);
  const allLife   = lifeRaw.map(d => d.value).filter(v => v > 0);
  const allPop    = popRaw.map(d => d.value).filter(v => v > 0);

  const incomeDomain = [d3.min(allIncome) * 0.8, d3.max(allIncome) * 1.2];
  const yS = d3.scaleLinear().domain([d3.min(allLife) - 2, d3.max(allLife) + 2]).range([ih, 0]);
  const rS = d3.scaleSqrt().domain([0, d3.max(allPop)]).range([2, 28]);
  const xS = d3.scaleLog().domain(incomeDomain).range([0, iw]).clamp(true);
  const xTicks = [500, 1000, 2000, 5000, 10000, 30000, 100000];

  // ── Chart SVG ────────────────────────────────────────────
  const chartDiv = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('width', '100%').style('height', `calc(100% - ${PLAYER_H}px)`);

  const svg = chartDiv.append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('height', '100%').style('display', 'block')
    .style('background', '#fff').style('border-radius', '10px 10px 0 0')
    .style('font-family', 'Roboto Slab, serif');

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  // Gridlines
  const gridG = g.append('g');
  yS.ticks(6).forEach(t => gridG.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t)).attr('stroke', '#f0f0f0').attr('stroke-width', 1));
  xTicks.forEach(t => {
    if (t < incomeDomain[0] || t > incomeDomain[1]) return;
    gridG.append('line')
      .attr('x1', xS(t)).attr('x2', xS(t))
      .attr('y1', 0).attr('y2', ih)
      .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
  });

  // Axes (X rebuilt on scale toggle)
  const xAxisG = g.append('g').attr('transform', `translate(0,${ih})`);
  const xLabelEl = g.append('text').attr('x', iw / 2).attr('y', ih + (compact ? 30 : 36)).attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', '#888');
  g.append('g').call(d3.axisLeft(yS).ticks(6)).call(ax => ax.select('.domain').remove()).attr('font-size', compact ? 8 : 9);
  g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -(compact ? 34 : 46)).attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', '#888').text('Aspettativa di vita (anni)');

  xAxisG.call(d3.axisBottom(xS).tickValues(xTicks).tickFormat(v => v >= 1000 ? `$${v/1000}k` : `$${v}`))
    .call(ax => ax.select('.domain').remove()).attr('font-size', compact ? 8 : 9);
  xLabelEl.text('PIL pro capite (USD PPP, scala log)');

  // ── Legend (bottom-right above player, choropleth style) ─
  const LEG_W = compact ? 96 : 120, LEG_H = compact ? 84 : 106;
  const legDiv = d3.select(container).append('div')
    .style('position', 'absolute')
    .style('bottom', (PLAYER_H + (compact ? 6 : 10)) + 'px').style('right', compact ? '8px' : '12px')
    .style('width', LEG_W + 'px').style('background', 'rgba(255,255,255,0.94)')
    .style('border', '1px solid #d8dce8').style('border-radius', '8px')
    .style('padding', compact ? '8px 9px' : '10px 12px').style('z-index', '15')
    .style('box-shadow', '0 1px 6px rgba(0,0,0,0.08)');

  legDiv.append('div').style('font-size', compact ? '7px' : '8px').style('font-weight', '700').style('color', '#aaa').style('letter-spacing', '0.07em').style('text-transform', 'uppercase').style('margin-bottom', compact ? '4px' : '6px').text('Continente');

  ['Africa', 'Europe'].forEach(cont => {
    const row = legDiv.append('div').style('display', 'flex').style('align-items', 'center').style('gap', '6px').style('margin-bottom', '4px');
    row.append('div').style('width', '10px').style('height', '10px').style('border-radius', '50%').style('background', CONT_COLOR[cont]).style('flex-shrink', '0').style('opacity', '0.8');
    row.append('div').style('font-size', compact ? '8px' : '9px').style('color', '#444').text(cont);
  });

  legDiv.append('div').style('font-size', compact ? '7px' : '8px').style('font-weight', '700').style('color', '#aaa').style('letter-spacing', '0.07em').style('text-transform', 'uppercase').style('margin-top', compact ? '6px' : '8px').style('margin-bottom', compact ? '4px' : '6px').text('Popolazione');

  (compact ? [5e6, 50e6] : [5e6, 50e6, 200e6]).forEach(p => {
    const row = legDiv.append('div').style('display', 'flex').style('align-items', 'center').style('gap', '6px').style('margin-bottom', '4px');
    const r = rS(p);
    const sz = Math.round(r * 2);
    row.append('div').style('width', sz + 'px').style('height', sz + 'px').style('border-radius', '50%')
      .style('border', '1.5px solid #bbb').style('flex-shrink', '0').style('box-sizing', 'border-box');
    row.append('div').style('font-size', compact ? '8px' : '9px').style('color', '#777').text(p >= 1e6 ? `${(p/1e6).toFixed(0)}M` : p);
  });

  const bubblesG = g.append('g');

  // Tooltip
  let tipEl = document.getElementById('gapminder-tip');
  if (!tipEl) {
    tipEl = document.createElement('div'); tipEl.id = 'gapminder-tip';
    Object.assign(tipEl.style, { position: 'fixed', display: 'none', pointerEvents: 'none', background: 'rgba(20,20,40,0.88)', color: '#fff', padding: '7px 11px', borderRadius: '5px', fontSize: '12px', lineHeight: '1.5', zIndex: '10000', whiteSpace: 'nowrap' });
    document.body.appendChild(tipEl);
  }

  function getFrame(year) {
    const iy = incomeYears.reduce((a, b) => Math.abs(b - year) < Math.abs(a - year) ? b : a);
    const lyYears = Object.keys(lifeMap).map(Number);
    const ly = lyYears.reduce((a, b) => Math.abs(b - year) < Math.abs(a - year) ? b : a);
    const pyYears = Object.keys(popMap).map(Number);
    const py = pyYears.reduce((a, b) => Math.abs(b - year) < Math.abs(a - year) ? b : a);
    return Object.keys(incomeMap[iy] || {}).map(code => {
      const income = incomeMap[iy][code];
      if (!income || income <= 0) return null;
      const cont = codeContinent[code];
      if (cont !== 'Africa' && cont !== 'Europe') return null;
      const lifeVal = lifeMap[ly]?.[code];
      if (lifeVal == null) return null;
      const pop = popMap[py]?.[code] || 1000;
      return { code, country: codeName[code] || code, continent: cont, income, lifeVal, pop };
    }).filter(Boolean).sort((a, b) => b.pop - a.pop);
  }

  function draw(animate) {
    const frame = getFrame(currentYear);
    const dur = animate ? 450 : 0;

    bubblesG.selectAll('circle').data(frame, d => d.code).join(
      enter => enter.append('circle')
        .attr('cx', d => xS(d.income)).attr('cy', d => yS(d.lifeVal)).attr('r', 0)
        .attr('fill', d => CONT_COLOR[d.continent] || '#888')
        .attr('opacity', d => highlightContinent ? (d.continent === highlightContinent ? 0.82 : 0.07) : 0.65)
        .attr('stroke', '#fff').attr('stroke-width', 0.5).style('cursor', 'pointer'),
      update => update,
      exit => exit.transition().duration(dur).attr('r', 0).remove()
    ).transition().duration(dur)
      .attr('cx', d => xS(d.income)).attr('cy', d => yS(d.lifeVal)).attr('r', d => rS(d.pop))
      .attr('opacity', d => highlightContinent ? (d.continent === highlightContinent ? 0.82 : 0.07) : 0.65);

    bubblesG.selectAll('circle')
      .on('mouseover', function(event, d) {
        tipEl.innerHTML = `<strong>${d.country}</strong> (${d.continent})<br>Reddito: $${d3.format(',.0f')(d.income)}<br>Aspettativa: ${d.lifeVal.toFixed(1)} anni`;
        tipEl.style.display = 'block';
        d3.select(this).attr('stroke', '#333').attr('stroke-width', 1.5);
      })
      .on('mousemove', ev => { tipEl.style.left = (ev.clientX + 14) + 'px'; tipEl.style.top = (ev.clientY - 28) + 'px'; })
      .on('mouseleave', function() { tipEl.style.display = 'none'; d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.5); });

    sliderEl.property('value', currentYear);
    yearDisplay.text(currentYear);
  }

  // ── Player bar ────────────────────────────────────────────
  const playerBar = d3.select(container).append('div')
    .style('position', 'absolute').style('bottom', '0').style('left', '0').style('right', '0')
    .style('height', PLAYER_H + 'px').style('background', '#fff')
    .style('border-radius', '0 0 10px 10px').style('border-top', '1px solid #e8eef7')
    .style('display', 'flex').style('align-items', 'center')
    .style('padding', compact ? '0 10px' : '0 16px').style('gap', compact ? '10px' : '14px').style('z-index', '20')
    .style('box-shadow', '0 -2px 8px rgba(0,0,0,0.04)');

  const ctrlWrap = playerBar.append('div').style('display', 'flex').style('align-items', 'center').style('gap', '6px').style('flex-shrink', '0');

  function mkCtrlBtn(inner, title) {
    return ctrlWrap.append('button').attr('title', title)
      .style('width', compact ? '28px' : '30px').style('height', compact ? '28px' : '30px').style('border-radius', '50%')
      .style('border', '1px solid #dde3ef').style('background', '#f5f7fb')
      .style('cursor', 'pointer').style('display', 'flex').style('align-items', 'center')
      .style('justify-content', 'center').style('color', '#4a6fa5')
      .style('flex-shrink', '0').style('transition', 'all 0.15s').style('padding', '0').style('line-height', '1')
      .html(inner);
  }

  mkCtrlBtn('&#8635;', 'Reset').on('click', () => { stopPlay(); currentYear = YEAR_MIN; draw(false); });
  mkCtrlBtn('&#8249;', 'Precedente').style('font-size', '18px').on('click', () => {
    stopPlay(); const i = incomeYears.indexOf(currentYear);
    if (i > 0) { currentYear = incomeYears[i - 1]; draw(false); }
  });

  const btnPlay = ctrlWrap.append('button')
    .style('width', compact ? '32px' : '36px').style('height', compact ? '32px' : '36px').style('border-radius', '50%')
    .style('border', 'none').style('background', '#4a6fa5').style('cursor', 'pointer')
    .style('display', 'flex').style('align-items', 'center').style('justify-content', 'center')
    .style('color', '#fff').style('flex-shrink', '0').style('padding', '0').style('line-height', '1')
    .style('box-shadow', '0 2px 8px rgba(74,111,165,0.4)').style('transition', 'all 0.15s')
    .html('<svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="1,0 11,7 1,14"/></svg>')
    .on('click', () => playing ? stopPlay() : startPlay());

  mkCtrlBtn('&#8250;', 'Successivo').style('font-size', '18px').on('click', () => {
    stopPlay(); const i = incomeYears.indexOf(currentYear);
    if (i < incomeYears.length - 1) { currentYear = incomeYears[i + 1]; draw(false); }
  });

  function startPlay() {
    playing = true;
    btnPlay.html('<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><rect x="0" y="0" width="3.5" height="14" rx="1"/><rect x="6.5" y="0" width="3.5" height="14" rx="1"/></svg>').style('background', '#e07b39');
    playTimer = setInterval(() => {
      currentYear = currentYear < YEAR_MAX ? incomeYears[incomeYears.indexOf(currentYear) + 1] : YEAR_MIN;
      draw(true);
    }, 600);
  }

  function stopPlay() {
    playing = false; clearInterval(playTimer); playTimer = null;
    btnPlay.html('<svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="1,0 11,7 1,14"/></svg>').style('background', '#4a6fa5');
  }

  const timelineWrap = playerBar.append('div').style('flex', '1').style('position', 'relative').style('padding', '0 4px');
  const labelRow = timelineWrap.append('div').style('display', 'flex').style('justify-content', 'space-between').style('font-size', '8.5px').style('color', '#bbb').style('margin-bottom', '2px').style('pointer-events', 'none');
  incomeYears.filter((y, i) => i % 5 === 0 || i === incomeYears.length - 1).forEach(y => labelRow.append('span').text(y));

  const sliderEl = timelineWrap.append('input').attr('type', 'range')
    .attr('min', YEAR_MIN).attr('max', YEAR_MAX).attr('step', 1).attr('value', currentYear)
    .style('width', '100%').style('height', '4px').style('cursor', 'pointer')
    .style('accent-color', '#4a6fa5').style('outline', 'none').style('display', 'block')
    .on('input', function() { stopPlay(); currentYear = +this.value; draw(false); });

  const yearDisplay = playerBar.append('div')
    .style('font-size', compact ? '20px' : '24px').style('font-weight', '700').style('color', '#1a3a6a')
    .style('min-width', compact ? '42px' : '54px').style('text-align', 'right').style('flex-shrink', '0')
    .style('letter-spacing', '-0.5px').text(currentYear);

  draw(false);

  // ── DOM API ───────────────────────────────────────────────
  container._gapminderPlay  = () => { if (!playing) startPlay(); };
  container._gapminderPause = stopPlay;
  container._gapminderReset = () => { stopPlay(); currentYear = YEAR_MAX; highlightContinent = null; draw(false); };
  container._gapminderAnimate = () => { stopPlay(); currentYear = YEAR_MIN; draw(false); startPlay(); };
  container._gapminderHighlightContinent = (c) => {
    highlightContinent = c;
    bubblesG.selectAll('circle').attr('opacity', d => c ? (d.continent === c ? 0.82 : 0.07) : 0.65);
  };
  container._gapminderSwitchY = () => {};
}
