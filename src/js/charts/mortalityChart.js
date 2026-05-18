/* ============================================================
   Grafico 4-3 (Atto III) — Grouped bar: mortalità per continente × anno
   Metric toggle: materna | infantile
   ============================================================ */
async function renderMortalityChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';
  container.style.overflowY = 'visible';

  const CONT_ORDER = ['Africa', 'Europe'];
  const CONT_COLOR = {
    'Africa': '#e07b39', 'Asia': '#4a90d9', 'Europe': '#5aab6e',
    'North America': '#a45dc0', 'Oceania': '#888888', 'South America': '#d4b84a',
  };

  const [maternalRaw, childRaw] = await Promise.all([
    d3.csv('datasets/processed/maternal_mortality.csv', d3.autoType),
    d3.csv('datasets/processed/child_mortality.csv', d3.autoType),
  ]);

  function buildGrouped(raw) {
    const filtered = raw.filter(d => d.value != null && d.value > 0 && d.year >= 2000 && d.year <= 2025 && (d.continent === 'Africa' || d.continent === 'Europe'));
    const byYearCont = d3.rollup(filtered, v => d3.mean(v, d => d.value), d => d.year, d => d.continent);
    const years = [...new Set(filtered.map(d => d.year))].sort((a, b) => a - b);
    return { byYearCont, years };
  }

  const maternalGrouped = buildGrouped(maternalRaw);
  const childGrouped    = buildGrouped(childRaw);

  let metric = 'maternal';

  // Tooltip
  const tip = d3.select('body').selectAll('.mortality-tip').data([0]).join('div')
    .attr('class', 'mortality-tip')
    .style('position', 'fixed').style('pointer-events', 'none')
    .style('background', 'rgba(20,20,40,0.92)').style('color', '#fff')
    .style('border-radius', '6px').style('padding', '7px 11px')
    .style('font-size', '11px').style('line-height', '1.6')
    .style('z-index', '10000').style('display', 'none');

  // Control bar
  const ctrlBar = d3.select(container).append('div')
    .style('display', 'flex').style('align-items', 'center').style('justify-content', 'flex-end')
    .style('padding', '4px 8px 0').style('gap', '4px').style('z-index', '10');

  const btnWrap = ctrlBar.append('div').style('display', 'flex').style('gap', '4px');

  function mkBtn(label, val) {
    return btnWrap.append('button')
      .style('font-size', '10px').style('padding', '2px 8px')
      .style('border-radius', '5px').style('cursor', 'pointer')
      .style('border', '1px solid #c8d4e8').style('background', 'rgba(255,255,255,0.92)')
      .style('color', '#4a6fa5')
      .text(label)
      .on('click', () => { metric = val; updateBtns(); draw(); });
  }

  const btnM = mkBtn('Mortalità materna', 'maternal');
  const btnC = mkBtn('Mortalità infantile', 'child');

  function updateBtns() {
    btnM.style('font-weight', metric === 'maternal' ? '700' : '400')
        .style('background',  metric === 'maternal' ? '#e8eef7' : 'rgba(255,255,255,0.92)');
    btnC.style('font-weight', metric === 'child' ? '700' : '400')
        .style('background',  metric === 'child' ? '#e8eef7' : 'rgba(255,255,255,0.92)');
  }
  updateBtns();

  const svgEl = d3.select(container).append('svg').style('display', 'block').style('width', '100%');

  function draw() {
    svgEl.selectAll('*').remove();

    const { byYearCont, years } = metric === 'maternal' ? maternalGrouped : childGrouped;

    const W = container.clientWidth || (isFullscreen ? window.innerWidth * 0.85 : 760);
    const H = (container.clientHeight || (isFullscreen ? window.innerHeight * 0.82 : 480)) - 28;
    const margin = { top: 24, right: 16, bottom: 56, left: 60 };
    const iw = W - margin.left - margin.right;
    const ih = H - margin.top - margin.bottom;

    svgEl.attr('width', W).attr('height', H);

    const g = svgEl.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xYear = d3.scaleBand().domain(years).range([0, iw]).padding(0.18);
    const xCont = d3.scaleBand().domain(CONT_ORDER).range([0, xYear.bandwidth()]).padding(0.08);

    const allVals = [];
    years.forEach(y => {
      const contMap = byYearCont.get(y);
      if (!contMap) return;
      contMap.forEach(v => allVals.push(v));
    });
    const yMax = d3.max(allVals) * 1.08;
    const yS = d3.scaleLinear().domain([0, yMax]).range([ih, 0]).nice();

    // Gridlines
    yS.ticks(6).forEach(t => {
      g.append('line')
        .attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t))
        .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
    });

    // Axes
    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xYear).tickSize(3))
      .attr('font-size', 9)
      .call(ax => ax.select('.domain').remove());

    const unitLabel = metric === 'maternal' ? 'per 100k nati vivi' : 'per 1k nati vivi';
    g.append('g')
      .call(d3.axisLeft(yS).ticks(6))
      .attr('font-size', 9)
      .call(ax => ax.select('.domain').remove());

    g.append('text')
      .attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -48)
      .attr('text-anchor', 'middle').attr('font-size', 9.5).attr('fill', '#666')
      .text(unitLabel);

    // Bars
    years.forEach(year => {
      const contMap = byYearCont.get(year);
      if (!contMap) return;
      const yearG = g.append('g').attr('transform', `translate(${xYear(year)},0)`);

      CONT_ORDER.forEach(cont => {
        const val = contMap.get(cont);
        if (val == null) return;
        const bx = xCont(cont);
        const bw = xCont.bandwidth();
        const by = yS(val);
        const bh = ih - by;
        const col = CONT_COLOR[cont] || '#888';

        yearG.append('rect')
          .attr('x', bx).attr('y', by).attr('width', bw).attr('height', bh)
          .attr('fill', col).attr('rx', 2)
          .style('cursor', 'pointer')
          .on('mouseover', function(event) {
            d3.select(this).attr('opacity', 0.75);
            tip.style('display', 'block').html(
              `<strong>${cont}</strong> · ${year}<br>` +
              `${metric === 'maternal' ? 'Mortalità materna' : 'Mortalità infantile'}: <strong>${d3.format(',.1f')(val)}</strong> ${unitLabel}`
            );
          })
          .on('mousemove', event => {
            tip.style('left', (event.clientX + 14) + 'px').style('top', (event.clientY - 28) + 'px');
          })
          .on('mouseleave', function() {
            d3.select(this).attr('opacity', 1);
            tip.style('display', 'none');
          });
      });
    });

    // Legend
    const lgG = g.append('g').attr('transform', `translate(0,${ih + 36})`);
    CONT_ORDER.forEach((cont, i) => {
      const lx = i * (iw / CONT_ORDER.length);
      lgG.append('rect').attr('x', lx).attr('y', 0).attr('width', 10).attr('height', 10)
        .attr('fill', CONT_COLOR[cont] || '#888').attr('rx', 2);
      lgG.append('text').attr('x', lx + 13).attr('y', 9)
        .attr('font-size', 8.5).attr('fill', '#555').text(cont);
    });
  }

  draw();

  container._mortalityScatter           = () => { metric = 'maternal'; updateBtns(); draw(); };
  container._mortalityHighlightMarriage = () => { metric = 'maternal'; updateBtns(); draw(); };
  container._mortalitySlope             = () => { metric = 'child';    updateBtns(); draw(); };
}
