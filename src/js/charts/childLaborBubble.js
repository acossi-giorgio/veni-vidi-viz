/* ============================================================
   Grafico 4-1 (Atto III) — Quadrant plot Africa
   X = reddito pro capite (log), Y = lavoro minorile %
   Mediane come separatori dei 4 quadranti
   ============================================================ */
async function renderChildLaborBubble(selector = '#chart-4-1', isFullscreen = false) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html('');
  container.style('width', '100%').style('height', '100%').style('position', 'relative').style('font-family', 'inherit');

  const [incRaw, clRaw] = await Promise.all([
    d3.csv('datasets/processed/income.csv', d3.autoType),
    d3.csv('datasets/processed/child_labor.csv', d3.autoType),
  ]);

  const clMap = new Map();
  clRaw.forEach(d => {
    if (!d.code || d.value == null) return;
    if (d.continent !== 'Africa' && d.continent !== 'Europe') return;
    const prev = clMap.get(d.code);
    if (!prev || d.year > prev.year) clMap.set(d.code, d);
  });

  const incLatest = new Map();
  incRaw.forEach(d => {
    if (!d.code || d.value == null) return;
    const prev = incLatest.get(d.code);
    if (!prev || d.year > prev.year) incLatest.set(d.code, d.value);
  });
  const incByYear = new Map();
  incRaw.forEach(d => { if (d.code && d.value != null) incByYear.set(`${d.code}|${d.year}`, d.value); });

  const data = [];
  clMap.forEach((cl, code) => {
    const inc = incByYear.get(`${code}|${cl.year}`) ?? incLatest.get(code);
    if (!inc) return;
    data.push({ code, country: cl.country, labor: cl.value, income: inc, year: cl.year });
  });

  const medIncome = d3.median(data, d => d.income);
  const medLabor  = d3.median(data, d => d.labor);

  const LABEL_SET = new Set(['NER', 'TCD', 'BDI', 'MLI', 'CMR', 'NGA', 'MOZ', 'MDG', 'ZWE', 'UGA', 'TZA', 'KEN', 'GHA', 'SEN', 'DZA', 'EGY', 'ZAF', 'DEU', 'FRA', 'GBR', 'ITA', 'ESP', 'POL', 'ROU', 'PRT']);

  const QUADRANT = [
    { id: 'q1', xSide: 'left',  ySide: 'top',    label: 'Povero · alto lavoro minorile', color: '#b04a4a', anchor: 'start'  },
    { id: 'q2', xSide: 'right', ySide: 'top',    label: 'Ricco · alto lavoro minorile',  color: '#c97c3e', anchor: 'end'    },
    { id: 'q3', xSide: 'left',  ySide: 'bottom', label: 'Povero · basso lavoro minorile',color: '#4a6fa5', anchor: 'start'  },
    { id: 'q4', xSide: 'right', ySide: 'bottom', label: 'Ricco · basso lavoro minorile', color: '#5aab6e', anchor: 'end'    },
  ];

  function getQuadrant(d) {
    const xSide = d.income < medIncome ? 'left' : 'right';
    const ySide = d.labor  > medLabor  ? 'top'  : 'bottom';
    return QUADRANT.find(q => q.xSide === xSide && q.ySide === ySide);
  }

  d3.select('body').selectAll('.tooltip-bubble').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip-bubble')
    .style('position', 'absolute').style('background', 'rgba(20,20,40,0.92)')
    .style('color', '#fff').style('border-radius', '6px').style('padding', '8px 12px')
    .style('pointer-events', 'none').style('font-size', '11px').style('line-height', '1.6')
    .style('z-index', '10000').style('display', 'none');

  function showTip(e, d) {
    const q = getQuadrant(d);
    tooltip.style('display', 'block').html(
      `<strong style="color:${q.color}">${d.country}</strong><br>` +
      `Lavoro minorile: ${d.labor.toFixed(1)}% (${d.year})<br>` +
      `Reddito: $${d3.format(',.0f')(d.income)}`
    );
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 12, ty = e.pageY + 8;
    if (tx + r.width  > window.innerWidth  - 8) tx = e.pageX - r.width  - 12;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 8;
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }
  function hideTip() { tooltip.style('display', 'none'); }

  const containerNode = container.node();

  function draw() {
    d3.select(containerNode).selectAll('svg').remove();
    const W = containerNode.getBoundingClientRect().width  || 560;
    const H = containerNode.getBoundingClientRect().height || 480;

    const MARGIN = { top: 24, right: 24, bottom: 48, left: 64 };
    const iw = W - MARGIN.left - MARGIN.right;
    const ih = H - MARGIN.top  - MARGIN.bottom;

    const xS = d3.scaleLog()
      .domain([d3.min(data, d => d.income) * 0.85, d3.max(data, d => d.income) * 1.15])
      .range([0, iw]).nice();
    const yS = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.labor) * 1.1])
      .range([ih, 0]).nice();

    const mx = xS(medIncome);
    const my = yS(medLabor);

    const svg = d3.select(containerNode).append('svg')
      .attr('width', W).attr('height', H).style('display', 'block').style('font-family', 'inherit');
    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Quadrant backgrounds
    const qBg = [
      { x: 0,  y: 0,  w: mx,    h: my,    q: QUADRANT[0] },
      { x: mx, y: 0,  w: iw-mx, h: my,    q: QUADRANT[1] },
      { x: 0,  y: my, w: mx,    h: ih-my, q: QUADRANT[2] },
      { x: mx, y: my, w: iw-mx, h: ih-my, q: QUADRANT[3] },
    ];
    qBg.forEach(({ x, y, w, h, q }) => {
      g.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h)
        .attr('fill', q.color).attr('opacity', 0.05);
    });

    // Median lines
    g.append('line').attr('x1', mx).attr('x2', mx).attr('y1', 0).attr('y2', ih)
      .attr('stroke', '#999').attr('stroke-width', 1).attr('stroke-dasharray', '5,3');
    g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', my).attr('y2', my)
      .attr('stroke', '#999').attr('stroke-width', 1).attr('stroke-dasharray', '5,3');

    // Median labels
    g.append('text').attr('x', mx + 4).attr('y', 10).attr('font-size', 8).attr('fill', '#999')
      .text(`mediana $${d3.format(',.0f')(medIncome)}`);
    g.append('text').attr('x', 4).attr('y', my - 4).attr('font-size', 8).attr('fill', '#999')
      .text(`mediana ${medLabor.toFixed(1)}%`);

    // Quadrant labels (corner)
    qBg.forEach(({ x, y, w, h, q }) => {
      const lx = q.xSide === 'left' ? x + 6 : x + w - 6;
      const ly = q.ySide === 'top'  ? y + 14 : y + h - 6;
      g.append('text').attr('x', lx).attr('y', ly)
        .attr('text-anchor', q.anchor).attr('font-size', 8.5).attr('font-weight', '600')
        .attr('fill', q.color).attr('opacity', 0.6).text(q.label);
    });

    // Gridlines (light, behind dots)
    g.append('g').call(d3.axisLeft(yS).tickSize(-iw).tickFormat(''))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick line').attr('stroke', '#f0f0f0'); });

    // Dots
    g.selectAll('circle.dot').data(data, d => d.code).join('circle').attr('class', 'dot')
      .attr('cx', d => xS(d.income)).attr('cy', d => yS(d.labor))
      .attr('r', 5)
      .attr('fill', d => getQuadrant(d).color)
      .attr('fill-opacity', 0.75)
      .attr('stroke', '#fff').attr('stroke-width', 1)
      .style('cursor', 'default')
      .on('mousemove', showTip).on('mouseleave', hideTip);

    // Labels for notable countries
    data.filter(d => LABEL_SET.has(d.code)).forEach(d => {
      const q = getQuadrant(d);
      g.append('text')
        .attr('x', xS(d.income) + 7).attr('y', yS(d.labor) + 3)
        .attr('font-size', 8).attr('fill', q.color).attr('font-weight', '500')
        .style('pointer-events', 'none')
        .text(d.country.length > 12 ? d.country.slice(0, 11) + '…' : d.country);
    });

    // Axes
    g.append('g').attr('transform', `translate(0,${ih})`).call(
      d3.axisBottom(xS).ticks(5).tickFormat(d => `$${d3.format(',.0f')(d)}`)
    ).call(ax => { ax.select('.domain').attr('stroke', '#ccc'); ax.selectAll('.tick text').attr('fill', '#888').attr('font-size', 9); });

    g.append('g').call(d3.axisLeft(yS).ticks(5).tickFormat(d => `${d}%`))
      .call(ax => { ax.select('.domain').attr('stroke', '#ccc'); ax.selectAll('.tick text').attr('fill', '#888').attr('font-size', 9); });

    g.append('text').attr('x', iw / 2).attr('y', ih + 40)
      .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#666')
      .text('Reddito pro capite (USD, scala logaritmica) — Africa & Europa');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -50)
      .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#666')
      .text('Lavoro minorile 5-17 anni (%)');

    // Count per quadrant
    qBg.forEach(({ x, y, w, h, q }) => {
      const n = data.filter(d => getQuadrant(d).id === q.id).length;
      const lx = q.xSide === 'left' ? x + 6 : x + w - 6;
      const ly = q.ySide === 'top'  ? y + 25 : y + h - 18;
      g.append('text').attr('x', lx).attr('y', ly)
        .attr('text-anchor', q.anchor).attr('font-size', 9).attr('fill', q.color).attr('opacity', 0.5)
        .text(`${n} paesi`);
    });
  }

  draw();

  containerNode._bubbleReset             = () => draw();
  containerNode._bubbleHighlightContinent = () => draw();
}
