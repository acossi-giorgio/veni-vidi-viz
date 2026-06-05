/* ============================================================
   Grafico 4-1 (Atto III) — Quadrant plot Africa
   X = reddito pro capite (log), Y = lavoro minorile %
   Mediane come separatori dei 4 quadranti
   ============================================================ */
async function renderChildLaborChart(selector = '#chart-4-1', isFullscreen = false) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html('');
  container.style('width', '100%').style('height', '100%').style('position', 'relative').style('font-family', 'inherit');

  const [incRaw, clRaw] = await Promise.all([
    d3.csv('datasets/processed/income.csv', d3.autoType),
    d3.csv('datasets/processed/child_labor.csv', d3.autoType),
  ]);

  const RISK_HIGH = '#A25A43';
  const RISK_MID = '#D4A24F';
  const LOW_NEUTRAL = '#91AF72';
  const LOW_NEUTRAL_SOFT = '#6F9DB7';
  const CHART_GRID = getUiColor('chartGrid', '#e8e1d7');
  const CHART_AXIS = getUiColor('chartAxis', '#a49788');
  const CHART_LABEL = getUiColor('chartLabel', '#73675c');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const TOOLTIP_BG = getUiColor('chartTooltipBg', 'rgba(28, 25, 23, 0.94)');
  const TOOLTIP_INK = getUiColor('chartTooltipInk', '#fffdf8');

  const clMap = new Map();
  clRaw.forEach(d => {
    if (!d.code || d.value == null) return;
    if (d.continent !== 'Africa') return;
    const prev = clMap.get(d.code);
    if (!prev || d.year > prev.year) clMap.set(d.code, d);
  });

  const incByYear = new Map();
  incRaw.forEach(d => { if (d.code && d.value != null) incByYear.set(`${d.code}|${d.year}`, d.value); });

  const data = [];
  clMap.forEach((cl, code) => {
    const inc = incByYear.get(`${code}|${cl.year}`);
    if (!inc) return;
    data.push({ code, country: cl.country, labor: cl.value, income: inc, year: cl.year, continent: cl.continent });
  });

  const medIncome = d3.median(data, d => d.income);
  const medLabor  = d3.median(data, d => d.labor);

  // label all countries with data

  const QUADRANT = [
    { id: 'q1', xSide: 'left',  ySide: 'top',    label: 'Povero · alto lavoro minorile', color: RISK_HIGH, anchor: 'start'  },
    { id: 'q2', xSide: 'right', ySide: 'top',    label: 'Ricco · alto lavoro minorile',  color: RISK_MID, anchor: 'end'    },
    { id: 'q3', xSide: 'left',  ySide: 'bottom', label: 'Povero · basso lavoro minorile',color: LOW_NEUTRAL, anchor: 'start'  },
    { id: 'q4', xSide: 'right', ySide: 'bottom', label: 'Ricco · basso lavoro minorile', color: LOW_NEUTRAL_SOFT, anchor: 'end'    },
  ];

  function getQuadrant(d) {
    const xSide = d.income < medIncome ? 'left' : 'right';
    const ySide = d.labor  > medLabor  ? 'top'  : 'bottom';
    return QUADRANT.find(q => q.xSide === xSide && q.ySide === ySide);
  }

  d3.select('body').selectAll('.tooltip-bubble').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip-bubble')
    .style('position', 'absolute').style('background', TOOLTIP_BG)
    .style('color', TOOLTIP_INK).style('border-radius', '6px').style('padding', '8px 12px')
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
    const compact = isFullscreen && (W < 760 || H < 420);
    const veryCompact = isFullscreen && (W < 620 || H < 360);

    const MARGIN = compact
      ? { top: 18, right: 8, bottom: 46, left: 50 }
      : { top: 24, right: 28, bottom: 56, left: 68 };
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
      .attr('width', W).attr('height', H).style('display', 'block').style('font-family', 'inherit').style('background', '#ffffff');
    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Quadrant backgrounds
    const qBg = [
      { x: 0,  y: 0,  w: mx,    h: my,    q: QUADRANT[0] },
      { x: mx, y: 0,  w: iw-mx, h: my,    q: QUADRANT[1] },
      { x: 0,  y: my, w: mx,    h: ih-my, q: QUADRANT[2] },
      { x: mx, y: my, w: iw-mx, h: ih-my, q: QUADRANT[3] },
    ];
    qBg.forEach(({ x, y, w, h, q }) => {
      g.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', w)
        .attr('height', h)
        .attr('fill', colorToRgba(q.color, 0.09, 'rgba(255,255,255,0.96)'))
        .attr('opacity', 1);
    });

    // Median lines
    g.append('line').attr('x1', mx).attr('x2', mx).attr('y1', 0).attr('y2', ih)
      .attr('stroke', CHART_AXIS).attr('stroke-width', 1).attr('stroke-dasharray', '5,3');
    g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', my).attr('y2', my)
      .attr('stroke', CHART_AXIS).attr('stroke-width', 1).attr('stroke-dasharray', '5,3');

    // Median labels
    g.append('text').attr('x', mx + 4).attr('y', 10).attr('font-size', 8).attr('fill', CHART_AXIS)
      .text(`mediana $${d3.format(',.0f')(medIncome)}`);
    g.append('text').attr('x', 4).attr('y', my - 4).attr('font-size', 8).attr('fill', CHART_AXIS)
      .text(`mediana ${medLabor.toFixed(1)}%`);

    // Quadrant labels (corner)
    qBg.forEach(({ x, y, w, h, q }) => {
      const lx = q.xSide === 'left' ? x + 6 : x + w - 6;
      const ly = q.ySide === 'top'  ? y + 14 : y + h - 6;
      g.append('text').attr('x', lx).attr('y', ly)
        .attr('text-anchor', q.anchor).attr('font-size', compact ? 7.5 : 8.5).attr('font-weight', '600')
        .attr('fill', q.color).attr('opacity', q.ySide === 'top' ? 0.78 : 0.72)
        .text(veryCompact ? q.label.split('·')[0].trim() : q.label);
    });

    // Gridlines (light, behind dots)
    g.append('g').call(d3.axisLeft(yS).tickSize(-iw).tickFormat(''))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick line').attr('stroke', CHART_GRID); });

    // Quadrant background rects with hover tooltip
    qBg.forEach(({ x, y, w, h, q }) => {
      const n = data.filter(d => getQuadrant(d).id === q.id).length;
      g.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h)
        .attr('fill', 'transparent').style('cursor', 'default')
        .on('mousemove', function(ev) {
          tooltip.style('display', 'block').html(
            `<strong style="color:${q.color}">${q.label}</strong><br>` +
            `Copertura dati: ${n}/${data.length} paesi`
          );
          const r = tooltip.node().getBoundingClientRect();
          let tx = ev.pageX + 12, ty = ev.pageY + 8;
          if (tx + r.width  > window.innerWidth  - 8) tx = ev.pageX - r.width  - 12;
          if (ty + r.height > window.innerHeight - 8) ty = ev.pageY - r.height - 8;
          tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
        })
        .on('mouseleave', hideTip);
    });

    // In this quadrant chart, dot color is part of the primary reading aid.
    g.selectAll('circle.dot').data(data, d => d.code).join(
      enter => enter.append('circle').attr('class', 'dot')
        .attr('cx', d => xS(d.income)).attr('cy', d => yS(d.labor))
        .attr('r', 0).attr('fill', d => getQuadrant(d).color)
        .attr('fill-opacity', 0).attr('stroke', '#ffffff').attr('stroke-width', 0.9)
        .style('cursor', 'default')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .attr('fill-opacity', 0.98)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.15)
            .attr('r', 6.5);
          showTip(event, d);
        })
        .on('mousemove', showTip)
        .on('mouseleave', function() {
          d3.select(this)
            .attr('fill', d => getQuadrant(d).color)
            .attr('fill-opacity', 0.84)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 0.9)
            .attr('r', 5);
          hideTip();
        })
        .call(s => s.transition().duration(600).ease(d3.easeCubicOut)
          .delay((_, i) => i * 8)
          .attr('r', 5).attr('fill-opacity', 0.84)),
      update => update
        .attr('cx', d => xS(d.income)).attr('cy', d => yS(d.labor))
        .attr('fill', d => getQuadrant(d).color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 0.9)
        .attr('fill-opacity', 0.84)
    );

    // Axes
    // X axis: explicit ticks to avoid crowding at low end of log scale
    const xTicks = (compact ? [200, 1000, 5000, 10000] : [200, 500, 1000, 2000, 5000, 10000])
      .filter(v => v >= xS.domain()[0] * 0.9 && v <= xS.domain()[1] * 1.1);
    g.append('g').attr('transform', `translate(0,${ih})`).call(
      d3.axisBottom(xS).tickValues(xTicks).tickFormat(d => `$${d3.format(',.0f')(d)}`)
    ).call(ax => { ax.select('.domain').attr('stroke', UI_MUTED_BORDER); ax.selectAll('.tick text').attr('fill', CHART_AXIS).attr('font-size', compact ? 8 : 9); });

    g.append('g').call(d3.axisLeft(yS).ticks(5).tickFormat(d => `${d}%`))
      .call(ax => { ax.select('.domain').attr('stroke', UI_MUTED_BORDER); ax.selectAll('.tick text').attr('fill', CHART_AXIS).attr('font-size', compact ? 8 : 9); });

    g.append('text').attr('x', iw / 2).attr('y', ih + 40)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_LABEL)
      .text(compact ? 'Reddito pro capite (USD, log)' : 'Reddito pro capite (USD, scala logaritmica) — Africa');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -50)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_LABEL)
      .text('Lavoro minorile 5-17 anni (%)');

    // Count per quadrant (corners, below the quadrant label)
    qBg.forEach(({ x, y, w, h, q }) => {
      const n = data.filter(d => getQuadrant(d).id === q.id).length;
      const lx = q.xSide === 'left' ? x + 6 : x + w - 6;
      const ly = q.ySide === 'top'  ? y + 25 : y + h - 18;
      g.append('text').attr('x', lx).attr('y', ly)
        .attr('text-anchor', q.anchor).attr('font-size', compact ? 8 : 9).attr('fill', q.color).attr('opacity', 0.5)
        .style('pointer-events', 'none')
        .text(`${n} paesi`);
    });

    // ── Legend top-right — panel style ───────────────────────
    d3.select(containerNode).selectAll('.section-legend').remove();
    const LEG_W = compact ? 148 : 180;
    const legDiv = d3.select(containerNode).append('div')
      .attr('class', 'section-legend')
      .style('position', 'absolute')
      .style('top', compact ? '84px' : '92px')
      .style('right', compact ? '8px' : '12px')
      .style('width', LEG_W + 'px')
        .style('background', 'rgba(255,255,255,0.96)')
      .style('border', `1px solid ${UI_MUTED_BORDER}`)
      .style('border-radius', '8px')
      .style('padding', compact ? '8px 10px' : '10px 12px')
      .style('z-index', '15')
      .style('box-shadow', '0 1px 6px rgba(0,0,0,0.08)');

    legDiv.append('div')
      .style('font-size', compact ? '7px' : '8px')
      .style('font-weight', '700')
      .style('color', CHART_AXIS)
      .style('letter-spacing', '0.07em')
      .style('text-transform', 'uppercase')
      .style('margin-bottom', compact ? '6px' : '8px')
      .text('Sezione');

    QUADRANT.forEach((q) => {
      const row = legDiv.append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('gap', '8px')
        .style('margin-bottom', compact ? '4px' : '5px');

      row.append('div')
        .style('width', compact ? '8px' : '9px')
        .style('height', compact ? '8px' : '9px')
        .style('border-radius', '50%')
        .style('background', q.color)
        .style('opacity', q.ySide === 'top' ? '0.92' : '0.82')
        .style('flex-shrink', '0');

      row.append('div')
        .style('font-size', compact ? '8px' : '9px')
        .style('color', CHART_LABEL)
        .text(veryCompact ? q.label.split('·')[0].trim() : q.label);
    });

    // ── Missing countries (no matching data) ──────────────────
    const presentCodes = new Set(data.map(d => d.code));
    const allCl = clRaw.filter(d => d.continent === 'Africa' && d.value != null);
    const missingCodes = [...new Set(allCl.map(d => d.code))].filter(c => !presentCodes.has(c));
    const missingNames = missingCodes.map(c => { const r = allCl.find(d => d.code === c); return r ? r.country : c; });

    if (missingNames.length) {
      const mY = ih + 50;
      g.append('text').attr('x', 0).attr('y', mY - 10)
        .attr('font-size', 8).attr('fill', CHART_AXIS).attr('font-style', 'italic')
        .text(`Paesi senza dati reddito (${missingNames.length}):`);
      const DOT_GAP = 14, dotsPerRow = Math.floor(iw / DOT_GAP);
      missingNames.forEach((name, mi) => {
        const cx = (mi % dotsPerRow) * DOT_GAP + 6;
        const cy = mY + Math.floor(mi / dotsPerRow) * 14;
        g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 4)
          .attr('fill', UI_MUTED_BORDER).attr('opacity', 0.7)
          .on('mouseover', function(ev) {
            tooltip.style('display','block').html(`<strong style="color:${CHART_AXIS}">${name}</strong><br><em style="color:${CHART_AXIS}">reddito non disponibile</em>`);
            tooltip.style('left', (ev.pageX+12)+'px').style('top', (ev.pageY+8)+'px');
          })
          .on('mousemove', function(ev) { tooltip.style('left', (ev.pageX+12)+'px').style('top', (ev.pageY+8)+'px'); })
          .on('mouseleave', hideTip);
      });
    }
  }

  draw();

  containerNode._bubbleReset             = () => draw();
  containerNode._bubbleHighlightContinent = () => draw();
  containerNode._getHelpContext = () => ({});
}
