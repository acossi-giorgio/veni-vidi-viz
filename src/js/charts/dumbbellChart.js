/* ============================================================
   Grafico 1-3 (Atto I) — Gapminder: reddito × aspettativa di vita
   X = PIL pro capite (log), Y = aspettativa di vita, R = popolazione
   Player bar riciclato da choroplethMulti
   ============================================================ */
async function renderDumbbellChart(selector = '#chart-2-1', isFullscreen = false) {
  const containerEl = document.querySelector(selector);
  if (!containerEl) return;
  containerEl.innerHTML = '';
  containerEl.style.position = 'relative';

  const CONT_COLOR = { 'Africa': '#e07b39', 'Europe': '#5aab6e' };
  const PLAYER_H = 72;

  const [lifeRaw, incomeRaw, popRaw] = await Promise.all([
    d3.csv('datasets/processed/life_expectancy.csv', d3.autoType),
    d3.csv('datasets/processed/income.csv', d3.autoType),
    d3.csv('datasets/processed/population.csv', d3.autoType),
  ]);

  // Build per-code year→value maps
  function buildYearMap(raw) {
    const m = new Map();
    raw.forEach(d => {
      if (d.value == null) return;
      if (!m.has(d.code)) m.set(d.code, { country: d.country, continent: d.continent, pts: new Map() });
      m.get(d.code).pts.set(d.year, d.value);
    });
    return m;
  }

  const lifeSeries   = buildYearMap(lifeRaw);
  const incomeSeries = buildYearMap(incomeRaw);
  const popSeries    = buildYearMap(popRaw);

  function nearest(pts, year) {
    if (!pts || !pts.size) return null;
    const yrs = [...pts.keys()];
    const best = yrs.reduce((a, b) => Math.abs(b - year) < Math.abs(a - year) ? b : a);
    return pts.get(best);
  }

  const allYears = [...new Set(incomeRaw.map(d => d.year))].sort((a, b) => a - b);

  const codes = [...lifeSeries.keys()].filter(code => {
    const s = lifeSeries.get(code);
    return (s.continent === 'Africa' || s.continent === 'Europe') && incomeSeries.has(code);
  });

  function getPoints(year) {
    return codes.map(code => {
      const life   = lifeSeries.get(code);
      const lifeV  = nearest(life.pts, year);
      const incV   = nearest(incomeSeries.get(code)?.pts, year);
      const popV   = nearest(popSeries.get(code)?.pts, year) || 1e6;
      if (lifeV == null || incV == null || incV <= 0) return null;
      return { code, country: life.country, continent: life.continent, life: lifeV, income: incV, pop: popV };
    }).filter(Boolean).sort((a, b) => b.pop - a.pop);
  }

  let currentYear = allYears[allYears.length - 1];
  let playing = false, animTimer = null;

  // Fixed scales across all years
  const incAll  = incomeRaw.filter(d => d.value > 0 && (d.continent === 'Africa' || d.continent === 'Europe')).map(d => d.value);
  const lifeAll = lifeRaw.filter(d => d.value != null && (d.continent === 'Africa' || d.continent === 'Europe')).map(d => d.value);
  const popAll  = popRaw.filter(d => d.value != null && (d.continent === 'Africa' || d.continent === 'Europe')).map(d => d.value);

  const W = containerEl.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 800);
  const H = (containerEl.clientHeight || (isFullscreen ? window.innerHeight * 0.8 : 480)) - PLAYER_H;
  const MARGIN = { top: 20, right: 24, bottom: 44, left: 52 };
  const iw = W - MARGIN.left - MARGIN.right;
  const ih = H - MARGIN.top  - MARGIN.bottom;

  const xS = d3.scaleLog().domain(d3.extent(incAll)).range([0, iw]).nice();
  const yS = d3.scaleLinear().domain([d3.min(lifeAll) * 0.95, d3.max(lifeAll) * 1.02]).range([ih, 0]).nice();
  const rS = d3.scaleSqrt().domain([0, d3.max(popAll)]).range([3, 22]);

  // ── Chart SVG ────────────────────────────────────────────
  const chartDiv = d3.select(containerEl).append('div')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('width', '100%').style('height', `calc(100% - ${PLAYER_H}px)`);

  const svg = chartDiv.append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('height', '100%').style('display', 'block')
    .style('background', '#fff').style('border-radius', '10px 10px 0 0');

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  // Gridlines
  xS.ticks(6).forEach(t => g.append('line').attr('x1', xS(t)).attr('x2', xS(t)).attr('y1', 0).attr('y2', ih).attr('stroke', '#f0f0f0').attr('stroke-width', 1));
  yS.ticks(6).forEach(t => g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t)).attr('stroke', '#f0f0f0').attr('stroke-width', 1));

  // Axes
  g.append('g').attr('transform', `translate(0,${ih})`)
    .call(d3.axisBottom(xS).ticks(6).tickFormat(v => `$${d3.format('.2s')(v)}`))
    .call(ax => ax.select('.domain').remove()).attr('font-size', 9);
  g.append('g')
    .call(d3.axisLeft(yS).ticks(6))
    .call(ax => ax.select('.domain').remove()).attr('font-size', 9);

  g.append('text').attr('x', iw / 2).attr('y', ih + 36).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#888').text('PIL pro capite');
  g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -40).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#888').text('Aspettativa di vita (anni)');

  // Year watermark
  const yearLabel = g.append('text')
    .attr('x', iw - 8).attr('y', ih - 10).attr('text-anchor', 'end')
    .attr('font-size', 60).attr('font-weight', '700').attr('fill', '#eaecef')
    .style('pointer-events', 'none').text(currentYear);

  // Legend
  const legG = g.append('g').attr('transform', `translate(8, 4)`);
  ['Africa', 'Europe'].forEach((cont, i) => {
    const col = CONT_COLOR[cont];
    legG.append('circle').attr('cx', 6).attr('cy', i * 16).attr('r', 5).attr('fill', col).attr('opacity', 0.8);
    legG.append('text').attr('x', 15).attr('y', i * 16 + 4).attr('font-size', 9).attr('fill', '#555').text(cont);
  });

  svg.append('defs').append('clipPath').attr('id', `db-clip-${isFullscreen ? 'fs' : 'sm'}`)
    .append('rect').attr('width', iw + 4).attr('height', ih + 4).attr('x', -2).attr('y', -2);

  const bubbleLayer = g.append('g').attr('clip-path', `url(#db-clip-${isFullscreen ? 'fs' : 'sm'})`);

  // Tooltip
  let tipEl = document.getElementById('db-gapminder-tip');
  if (!tipEl) {
    tipEl = document.createElement('div'); tipEl.id = 'db-gapminder-tip';
    Object.assign(tipEl.style, {
      position: 'fixed', display: 'none', pointerEvents: 'none',
      background: 'rgba(20,20,40,0.9)', color: '#fff',
      padding: '8px 12px', borderRadius: '6px', fontSize: '11px',
      lineHeight: '1.6', zIndex: '10000', maxWidth: '200px',
    });
    document.body.appendChild(tipEl);
  }

  function draw() {
    const pts = getPoints(currentYear);
    yearLabel.text(currentYear);

    bubbleLayer.selectAll('circle').data(pts, d => d.code).join(
      enter => enter.append('circle')
        .attr('cx', d => xS(d.income)).attr('cy', d => yS(d.life)).attr('r', d => rS(d.pop))
        .attr('fill', d => CONT_COLOR[d.continent] || '#888')
        .attr('fill-opacity', 0.65).attr('stroke', '#fff').attr('stroke-width', 0.8)
        .style('cursor', 'pointer'),
      update => update.transition().duration(500).ease(d3.easeLinear)
        .attr('cx', d => xS(d.income)).attr('cy', d => yS(d.life)).attr('r', d => rS(d.pop)),
      exit => exit.remove()
    )
    .on('mouseover', function(event, d) {
      d3.select(this).attr('fill-opacity', 0.95).attr('stroke', '#333').attr('stroke-width', 1.5);
      tipEl.innerHTML =
        `<strong>${d.country}</strong><br>` +
        `Aspettativa: ${d.life.toFixed(1)} anni<br>` +
        `PIL pro capite: $${d3.format(',.0f')(d.income)}<br>` +
        `Pop.: ${d.pop >= 1e6 ? (d.pop / 1e6).toFixed(1) + 'M' : d3.format(',')(d.pop)}`;
      tipEl.style.display = 'block';
    })
    .on('mousemove', ev => { tipEl.style.left = (ev.clientX + 14) + 'px'; tipEl.style.top = (ev.clientY - 28) + 'px'; })
    .on('mouseleave', function() {
      d3.select(this).attr('fill-opacity', 0.65).attr('stroke', '#fff').attr('stroke-width', 0.8);
      tipEl.style.display = 'none';
    });
  }

  draw();

  // ── Player bar ────────────────────────────────────────────
  const playerBar = d3.select(containerEl).append('div')
    .style('position', 'absolute').style('bottom', '0').style('left', '0').style('right', '0')
    .style('height', PLAYER_H + 'px').style('background', '#fff')
    .style('border-radius', '0 0 10px 10px').style('border-top', '1px solid #e4e8f0')
    .style('display', 'flex').style('align-items', 'center')
    .style('padding', '8px 16px').style('gap', '8px').style('z-index', '20')
    .style('box-shadow', '0 -2px 8px rgba(0,0,0,0.04)');

  const ctrlWrap = playerBar.append('div')
    .style('display', 'flex').style('align-items', 'center').style('gap', '6px').style('flex-shrink', '0');

  function mkCtrlBtn(inner, title) {
    return ctrlWrap.append('button').attr('title', title)
      .style('width', '30px').style('height', '30px').style('border-radius', '50%')
      .style('border', '1px solid #d0d9e8').style('background', '#fff')
      .style('cursor', 'pointer').style('display', 'flex').style('align-items', 'center')
      .style('justify-content', 'center').style('color', '#8096b0')
      .style('flex-shrink', '0').style('transition', 'all 0.15s').style('padding', '0').style('line-height', '1')
      .html(inner);
  }

  function syncSlider() { yearDisplay.text(currentYear); sliderEl.property('value', currentYear); }

  mkCtrlBtn('&#8635;', 'Reset').on('click', () => { stopPlay(); currentYear = allYears[0]; draw(); syncSlider(); });
  mkCtrlBtn('&#8249;', 'Precedente').style('font-size', '18px').on('click', () => {
    stopPlay();
    const i = allYears.indexOf(currentYear);
    if (i > 0) { currentYear = allYears[i - 1]; draw(); syncSlider(); }
  });

  const btnPlay = ctrlWrap.append('button')
    .style('width', '42px').style('height', '42px').style('border-radius', '50%')
    .style('border', 'none').style('background', '#1a3a5c').style('cursor', 'pointer')
    .style('display', 'flex').style('align-items', 'center').style('justify-content', 'center')
    .style('color', '#fff').style('flex-shrink', '0').style('padding', '0').style('line-height', '1')
    .style('font-size', '16px')
    .text('▶')
    .on('click', () => playing ? stopPlay() : startPlay());

  mkCtrlBtn('&#8250;', 'Successivo').style('font-size', '18px').on('click', () => {
    stopPlay();
    const i = allYears.indexOf(currentYear);
    if (i < allYears.length - 1) { currentYear = allYears[i + 1]; draw(); syncSlider(); }
  });

  function startPlay() {
    playing = true;
    btnPlay.text('⏸');
    animTimer = setInterval(() => {
      const i = allYears.indexOf(currentYear);
      if (i >= allYears.length - 1) { stopPlay(); return; }
      currentYear = allYears[i + 1];
      draw(); syncSlider();
    }, 600);
  }

  function stopPlay() {
    playing = false; clearInterval(animTimer);
    btnPlay.text('▶');
  }

  const timelineWrap = playerBar.append('div').style('flex', '1').style('position', 'relative').style('padding', '0 4px');
  const labelRow = timelineWrap.append('div')
    .style('display', 'flex').style('justify-content', 'space-between')
    .style('font-size', '8.5px').style('color', '#bbb').style('margin-bottom', '2px').style('pointer-events', 'none');
  allYears.filter((y, i) => i % 5 === 0 || i === allYears.length - 1).forEach(y => labelRow.append('span').text(y));

  const sliderEl = timelineWrap.append('input').attr('type', 'range')
    .attr('id', 'db-gapminder-slider')
    .attr('min', allYears[0]).attr('max', allYears[allYears.length - 1]).attr('step', 1).attr('value', currentYear)
    .style('width', '100%').style('height', '5px').style('cursor', 'pointer')
    .style('-webkit-appearance', 'none').style('appearance', 'none')
    .style('background', 'rgba(0,0,0,0.25)').style('border-radius', '2px')
    .style('outline', 'none').style('display', 'block')
    .on('input', function() { stopPlay(); currentYear = +this.value; draw(); yearDisplay.text(currentYear); });

  if (!document.getElementById('db-gapminder-slider-style')) {
    const st = document.createElement('style');
    st.id = 'db-gapminder-slider-style';
    st.textContent = `
      #db-gapminder-slider::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none;
        width: 16px; height: 16px; border-radius: 50%;
        background: #1a3a5c; cursor: pointer;
      }
      #db-gapminder-slider::-moz-range-thumb {
        width: 16px; height: 16px; border-radius: 50%;
        background: #1a3a5c; cursor: pointer; border: none;
      }
    `;
    document.head.appendChild(st);
  }

  const yearDisplay = playerBar.append('div')
    .style('font-size', '28px').style('font-weight', '700').style('color', '#1a3a5c')
    .style('min-width', '60px').style('text-align', 'right').style('flex-shrink', '0')
    .style('font-family', 'inherit').style('letter-spacing', '-0.5px').text(currentYear);

  // ── DOM API ───────────────────────────────────────────────
  const node = containerEl;
  node._dumbbellShowOverview = () => { stopPlay(); currentYear = allYears[allYears.length - 1]; draw(); syncSlider(); };
  node._dumbbellDrillDown    = () => { stopPlay(); currentYear = allYears[0]; draw(); syncSlider(); startPlay(); };
}
