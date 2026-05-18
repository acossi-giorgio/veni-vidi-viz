/* ============================================================
   Grafico 1-2 (Atto I) — Gapminder bubble scatter
   X = income (log), Y = life_expectancy | poverty | mpi (toggle)
   Size = population, Color = continent, Play animation
   ============================================================ */
async function renderGapminderBubble(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const CONT_COLOR = {
    'Africa': '#e07b39', 'Asia': '#4a90d9', 'Europe': '#5aab6e',
    'North America': '#a45dc0', 'Oceania': '#888888', 'South America': '#d4b84a',
  };

  const [incomeRaw, lifeRaw, povertyRaw, mpiRaw, popRaw] = await Promise.all([
    d3.csv('datasets/processed/income.csv', d3.autoType),
    d3.csv('datasets/processed/life_expectancy.csv', d3.autoType),
    d3.csv('datasets/processed/poverty.csv', d3.autoType),
    d3.csv('datasets/processed/mpi.csv', d3.autoType),
    d3.csv('datasets/processed/population.csv', d3.autoType),
  ]);

  // Build year→code→value maps
  function buildMap(raw) {
    const m = {};
    raw.forEach(d => {
      if (d.value == null) return;
      if (!m[d.year]) m[d.year] = {};
      m[d.year][d.code] = d.value;
    });
    return m;
  }

  // For MPI (sparse): latest value per code
  const mpiLatest = {};
  d3.group(mpiRaw, d => d.code).forEach((rows, code) => {
    const sorted = rows.filter(r => r.value != null).sort((a, b) => b.year - a.year);
    if (sorted.length) mpiLatest[code] = sorted[0].value;
  });

  const incomeMap = buildMap(incomeRaw);
  const lifeMap = buildMap(lifeRaw);
  const povertyMap = buildMap(povertyRaw);
  const popMap = buildMap(popRaw);

  // Continent lookup from income
  const codeContinent = {};
  incomeRaw.forEach(d => { if (d.code && d.continent) codeContinent[d.code] = d.continent; });
  lifeRaw.forEach(d => { if (d.code && d.continent && !codeContinent[d.code]) codeContinent[d.code] = d.continent; });

  // Country name lookup
  const codeName = {};
  incomeRaw.forEach(d => { if (d.code && d.country) codeName[d.code] = d.country; });

  const incomeYears = Object.keys(incomeMap).map(Number).sort((a, b) => a - b);
  const YEAR_MIN = incomeYears[0], YEAR_MAX = incomeYears[incomeYears.length - 1];

  let currentYear = YEAR_MAX;
  let yMetric = 'life'; // 'life' | 'poverty' | 'mpi'
  let playing = false;
  let playTimer = null;
  let highlightContinent = null;

  const MARGIN = { top: 36, right: 20, bottom: 48, left: 58 };
  const W = container.clientWidth || (isFullscreen ? window.innerWidth * 0.85 : 760);
  const H = container.clientHeight || (isFullscreen ? window.innerHeight * 0.8 : 460);
  const iw = W - MARGIN.left - MARGIN.right;
  const ih = H - MARGIN.top - MARGIN.bottom;

  const svg = d3.select(container).append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('height', '100%')
    .style('display', 'block').style('font-family', 'Roboto Slab, serif');

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  // Scales
  const allIncome = incomeRaw.map(d => d.value).filter(v => v > 0);
  const xS = d3.scaleLog()
    .domain([d3.min(allIncome) * 0.8, d3.max(allIncome) * 1.2])
    .range([0, iw]).clamp(true);

  const allPop = popRaw.map(d => d.value).filter(v => v > 0);
  const rS = d3.scaleSqrt().domain([0, d3.max(allPop)]).range([2, 28]);

  // Y scales per metric
  const allLife = lifeRaw.map(d => d.value).filter(v => v > 0);
  const yScales = {
    life:    d3.scaleLinear().domain([d3.min(allLife) - 2, d3.max(allLife) + 2]).range([ih, 0]),
    poverty: d3.scaleLinear().domain([-2, 102]).range([ih, 0]),
    mpi:     d3.scaleLinear().domain([-0.01, 0.62]).range([ih, 0]),
  };

  const Y_LABELS = {
    life: 'Aspettativa di vita (anni)',
    poverty: 'Povertà estrema (% pop)',
    mpi: 'Indice MPI (0–1)',
  };

  // Axes groups
  const xAxisG = g.append('g').attr('transform', `translate(0,${ih})`);
  const yAxisG = g.append('g');

  function drawAxes() {
    xAxisG.call(d3.axisBottom(xS).tickValues([500, 1000, 2000, 5000, 10000, 30000, 100000])
      .tickFormat(v => v >= 1000 ? `$${v / 1000}k` : `$${v}`));
    yAxisG.call(d3.axisLeft(yScales[yMetric]).ticks(6));
    yAxisG.select('.y-label').remove();
    yAxisG.append('text').attr('class', 'y-label')
      .attr('transform', 'rotate(-90)').attr('y', -46).attr('x', -ih / 2)
      .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#555')
      .text(Y_LABELS[yMetric]);
  }

  // X axis label
  g.append('text').attr('x', iw / 2).attr('y', ih + 40)
    .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#555')
    .text('PIL pro capite (USD PPP, scala log)');

  // Gridlines
  const gridG = g.insert('g', ':first-child').attr('class', 'grid-g');
  function drawGrid() {
    gridG.selectAll('*').remove();
    yScales[yMetric].ticks(6).forEach(t => {
      gridG.append('line').attr('x1', 0).attr('x2', iw)
        .attr('y1', yScales[yMetric](t)).attr('y2', yScales[yMetric](t))
        .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
    });
  }

  // Build frame data
  function getFrame(year) {
    // Nearest available income year
    const iy = incomeYears.reduce((a, b) => Math.abs(b - year) < Math.abs(a - year) ? b : a);

    const codes = Object.keys(incomeMap[iy] || {});
    const rows = [];
    codes.forEach(code => {
      const income = incomeMap[iy]?.[code];
      if (!income || income <= 0) return;
      const continent = codeContinent[code];
      if (!continent) return;
      if (continent !== 'Africa' && continent !== 'Europe') return;

      let yVal;
      if (yMetric === 'life') {
        const lifeY = Object.keys(lifeMap).map(Number).sort((a, b) => Math.abs(a - year) - Math.abs(b - year))[0];
        yVal = lifeMap[lifeY]?.[code];
      } else if (yMetric === 'poverty') {
        const pvY = Object.keys(povertyMap).map(Number).sort((a, b) => Math.abs(a - year) - Math.abs(b - year))[0];
        yVal = povertyMap[pvY]?.[code];
      } else {
        yVal = mpiLatest[code];
      }
      if (yVal == null) return;

      const popY = Object.keys(popMap).map(Number).sort((a, b) => Math.abs(a - year) - Math.abs(b - year))[0];
      const pop = popMap[popY]?.[code] || 1000;

      rows.push({ code, country: codeName[code] || code, continent, income, yVal, pop });
    });
    return rows;
  }

  // Bubbles
  const bubblesG = g.append('g').attr('class', 'bubbles');

  // Tooltip
  let tipEl = document.getElementById('gapminder-tip');
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.id = 'gapminder-tip';
    Object.assign(tipEl.style, {
      position: 'fixed', display: 'none', pointerEvents: 'none',
      background: 'rgba(20,20,40,0.88)', color: '#fff',
      padding: '7px 11px', borderRadius: '5px', fontSize: '12px',
      lineHeight: '1.5', zIndex: '10000', whiteSpace: 'nowrap',
    });
    document.body.appendChild(tipEl);
  }

  function draw(year, animate) {
    const frame = getFrame(year);
    const yS = yScales[yMetric];
    const dur = animate ? 450 : 0;

    const circles = bubblesG.selectAll('circle').data(frame, d => d.code);

    const enter = circles.enter().append('circle')
      .attr('cx', d => xS(d.income))
      .attr('cy', d => yS(d.yVal))
      .attr('r', 0)
      .attr('fill', d => CONT_COLOR[d.continent] || '#888')
      .attr('opacity', d => highlightContinent ? (d.continent === highlightContinent ? 0.8 : 0.08) : 0.65)
      .attr('stroke', '#fff').attr('stroke-width', 0.5)
      .style('cursor', 'pointer');

    enter.merge(circles).transition().duration(dur)
      .attr('cx', d => xS(d.income))
      .attr('cy', d => yS(d.yVal))
      .attr('r', d => rS(d.pop))
      .attr('opacity', d => highlightContinent ? (d.continent === highlightContinent ? 0.82 : 0.07) : 0.65);

    circles.exit().transition().duration(dur).attr('r', 0).remove();

    bubblesG.selectAll('circle')
      .on('mouseover', function (event, d) {
        tipEl.innerHTML = `<strong>${d.country}</strong> (${d.continent})<br>
          Reddito: $${d3.format(',.0f')(d.income)}<br>
          ${Y_LABELS[yMetric]}: ${d3.format('.1f')(d.yVal)}`;
        tipEl.style.display = 'block';
        d3.select(this).attr('stroke', '#333').attr('stroke-width', 1.5);
      })
      .on('mousemove', event => {
        let x = event.clientX + 14, y = event.clientY - 28;
        tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
      })
      .on('mouseleave', function () {
        tipEl.style.display = 'none';
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.5);
      });
  }

  function renderAll(animate = false) {
    drawAxes();
    drawGrid();
    draw(currentYear, animate);
    yearLabel.text(currentYear);
    sliderEl.property('value', currentYear);
  }

  // Year watermark
  const yearLabel = svg.append('text')
    .attr('x', W - MARGIN.right - 8).attr('y', H - MARGIN.bottom - 8)
    .attr('text-anchor', 'end').attr('font-size', 40).attr('font-weight', 'bold')
    .attr('fill', '#000').attr('opacity', 0.12).attr('pointer-events', 'none')
    .text(currentYear);

  // Controls row (play + slider)
  const ctrlFO = svg.append('foreignObject')
    .attr('x', MARGIN.left).attr('y', H - MARGIN.bottom + 10)
    .attr('width', iw).attr('height', 30)
    .attr('pointer-events', 'auto')
    .on('mousedown', e => e.stopPropagation());

  const ctrlDiv = ctrlFO.append('xhtml:div')
    .style('display', 'flex').style('align-items', 'center').style('gap', '8px');

  const playBtn = ctrlDiv.append('xhtml:button')
    .style('border', 'none').style('background', 'none').style('cursor', 'pointer')
    .style('font-size', '16px').style('line-height', '1').style('padding', '0')
    .text('▶');

  const sliderEl = ctrlDiv.append('xhtml:input')
    .attr('type', 'range').attr('min', YEAR_MIN).attr('max', YEAR_MAX).attr('step', 1)
    .attr('value', currentYear).style('flex', '1').style('accent-color', '#4a6fa5')
    .style('cursor', 'pointer')
    .on('input', function () {
      stopPlay();
      currentYear = +this.value;
      renderAll(false);
    });

  function stopPlay() {
    playing = false;
    playBtn.text('▶');
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
  }

  function startPlay() {
    playing = true;
    playBtn.text('⏸');
    playTimer = setInterval(() => {
      currentYear = currentYear < YEAR_MAX ? currentYear + 1 : YEAR_MIN;
      renderAll(true);
    }, 600);
  }

  playBtn.on('click', () => { playing ? stopPlay() : startPlay(); });

  // Y-metric buttons (top-right of chart area)
  const yBtnFO = svg.append('foreignObject')
    .attr('x', MARGIN.left + iw - 280).attr('y', 6)
    .attr('width', 286).attr('height', 26)
    .attr('pointer-events', 'auto')
    .on('mousedown', e => e.stopPropagation());

  const yBtnDiv = yBtnFO.append('xhtml:div')
    .style('display', 'flex').style('gap', '4px').style('justify-content', 'flex-end');

  [{ key: 'life', label: 'Aspettativa vita' }, { key: 'poverty', label: 'Povertà' }, { key: 'mpi', label: 'MPI' }].forEach(b => {
    yBtnDiv.append('xhtml:button')
      .attr('data-ymetric', b.key)
      .style('padding', '2px 8px').style('font-size', '10px').style('border-radius', '16px')
      .style('border', '1.5px solid #e07b39').style('cursor', 'pointer')
      .style('font-family', 'Roboto Slab, serif')
      .style('background', b.key === yMetric ? '#e07b39' : 'rgba(255,255,255,0.92)')
      .style('color', b.key === yMetric ? '#fff' : '#e07b39')
      .text(b.label)
      .on('click', function () {
        yMetric = this.dataset.ymetric;
        yBtnDiv.selectAll('button').each(function () {
          const a = this.dataset.ymetric === yMetric;
          this.style.background = a ? '#e07b39' : 'rgba(255,255,255,0.92)';
          this.style.color = a ? '#fff' : '#e07b39';
        });
        renderAll(true);
      });
  });

  // Legend
  const legG = svg.append('g').attr('transform', `translate(${MARGIN.left + 4}, ${MARGIN.top + 4})`);
  [['Africa', CONT_COLOR['Africa']], ['Europe', CONT_COLOR['Europe']]].forEach(([c, col], i) => {
    legG.append('circle').attr('cx', 6).attr('cy', i * 14 + 6).attr('r', 5).attr('fill', col).attr('opacity', 0.75);
    legG.append('text').attr('x', 15).attr('y', i * 14 + 10).attr('font-size', 9).attr('fill', '#555').text(c);
  });

  renderAll(false);

  // DOM API
  container._gapminderPlay = () => { if (!playing) startPlay(); };
  container._gapminderPause = stopPlay;
  container._gapminderReset = () => {
    stopPlay();
    currentYear = YEAR_MAX;
    highlightContinent = null;
    yMetric = 'life';
    yBtnDiv.selectAll('button').each(function () {
      const a = this.dataset.ymetric === 'life';
      this.style.background = a ? '#e07b39' : 'rgba(255,255,255,0.92)';
      this.style.color = a ? '#fff' : '#e07b39';
    });
    renderAll(false);
  };
  container._gapminderHighlightContinent = (c) => {
    highlightContinent = c;
    bubblesG.selectAll('circle')
      .attr('opacity', d => c ? (d.continent === c ? 0.82 : 0.07) : 0.65);
  };
  container._gapminderAnimate = () => {
    stopPlay();
    currentYear = YEAR_MIN;
    renderAll(false);
    startPlay();
  };
  container._gapminderSwitchY = (metric) => {
    if (!yScales[metric]) return;
    stopPlay();
    yMetric = metric;
    yBtnDiv.selectAll('button').each(function () {
      const a = this.dataset.ymetric === yMetric;
      this.style.background = a ? '#e07b39' : 'rgba(255,255,255,0.92)';
      this.style.color = a ? '#fff' : '#e07b39';
    });
    renderAll(true);
  };
}
