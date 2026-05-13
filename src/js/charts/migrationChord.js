/* ============================================================
   Grafico 10 — Migranti internazionali per origine (Stacked Area)
   Stock migranti per continente di origine, 1990–2024.
   API: container._migrationShowYear(year)
        container._migrationAnimate()
        container._migrationHighlight(continentArr|null)
   ============================================================ */

async function renderMigrationChord(selector = '#chart-5-1', isFullscreen = false) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html('');
  container.style('width', '100%').style('height', '100%')
    .style('position', 'relative').style('font-family', 'inherit');

  const raw = await d3.csv('datasets/processed/10_migration_continent.csv', d3.autoType);
  if (!raw.length) { container.append('p').style('padding','1rem').text('Dati non disponibili.'); return; }

  const data = raw.filter(d => d.dest_continent === 'World' && d.origin_continent && d.stock);

  const CONT_COLOR = {
    'Africa':                           '#b04a4a',
    'Asia':                             '#4a6fa5',
    'Europe':                           '#5a8a6e',
    'Latin America and the Caribbean':  '#c97c3e',
    'North America':                    '#7a6fa5',
    'Oceania':                          '#3a9a9a',
  };

  const continents = [...new Set(data.map(d => d.origin_continent))].sort();
  const years = [...new Set(data.map(d => d.year))].sort((a, b) => a - b);

  // Pivot: year → { continent: stock }
  const byYear = new Map();
  years.forEach(yr => {
    const row = { year: yr };
    continents.forEach(c => { row[c] = 0; });
    data.filter(d => d.year === yr).forEach(d => { row[d.origin_continent] = d.stock; });
    byYear.set(yr, row);
  });
  const flatData = years.map(yr => byYear.get(yr));

  // State
  let highlightConts = null;
  let animTimer = null;
  let markerYear = null;

  // Tooltip
  d3.select('body').selectAll('.tooltip-migration').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip-migration')
    .style('position', 'absolute').style('background', 'rgba(0,0,0,0.88)')
    .style('color', '#fff').style('border-radius', '6px').style('padding', '10px 14px')
    .style('pointer-events', 'none').style('font-size', '12px').style('line-height', '1.6')
    .style('z-index', '10000').style('display', 'none');
  function showTip(e, html) {
    tooltip.style('display', 'block').html(html);
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 12, ty = e.pageY + 8;
    if (tx + r.width > window.innerWidth - 8) tx = e.pageX - r.width - 12;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 8;
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }
  function hideTip() { tooltip.style('display', 'none'); }

  const wrapper = container.append('div')
    .style('display', 'flex').style('flex-direction', 'column').style('height', '100%');

  const controls = wrapper.append('div')
    .style('flex', '0 0 auto').style('display', 'flex').style('align-items', 'center')
    .style('gap', '8px').style('padding', '6px 12px').style('border-bottom', '1px solid #e0e0e0')
    .style('background', '#fafafa').style('font-size', '11px').style('flex-wrap', 'wrap');

  controls.append('span').style('color', '#888').text('Anno:');
  const slider = controls.append('input').attr('type', 'range')
    .attr('min', years[0]).attr('max', years[years.length - 1])
    .attr('value', years[years.length - 1])
    .attr('step', years[1] - years[0])
    .style('width', '100px').style('cursor', 'pointer');
  const yearLabel = controls.append('strong').style('min-width', '32px').text(years[years.length - 1]);

  const playBtn = controls.append('button')
    .style('padding', '2px 10px').style('border-radius', '4px').style('font-size', '11px')
    .style('cursor', 'pointer').style('border', '1px solid #ddd').style('background', '#fff')
    .text('▶ Play')
    .on('click', startAnimation);

  controls.append('span').style('color', '#ccc').text('|');
  controls.append('span').style('color', '#888').text('Evidenzia:');

  continents.forEach(c => {
    const shortName = c.split(' ')[0];
    controls.append('button')
      .style('padding', '2px 7px').style('border-radius', '4px').style('font-size', '10px')
      .style('cursor', 'pointer').style('border', `1px solid ${CONT_COLOR[c]||'#ddd'}`)
      .style('background', '#fff').style('color', CONT_COLOR[c]||'#333')
      .text(shortName)
      .on('click', function() {
        if (highlightConts && highlightConts.includes(c)) {
          highlightConts = null;
        } else {
          highlightConts = [c];
        }
        draw(+slider.property('value'));
      });
  });

  slider.on('input', function() {
    stopAnimation();
    const yr = +this.value;
    markerYear = yr;
    yearLabel.text(yr);
    draw(yr);
  });

  const chartDiv = wrapper.append('div')
    .style('flex', '1 1 auto').style('position', 'relative').style('overflow', 'hidden');

  function stopAnimation() {
    if (animTimer) { animTimer.stop(); animTimer = null; }
    playBtn.text('▶ Play');
  }

  function startAnimation() {
    stopAnimation();
    let i = 0;
    playBtn.text('⏸ Pausa').on('click', stopAnimation);
    animTimer = d3.interval(() => {
      if (i >= years.length) { stopAnimation(); playBtn.on('click', startAnimation); return; }
      const yr = years[i];
      slider.property('value', yr);
      yearLabel.text(yr);
      markerYear = yr;
      draw(yr);
      i++;
    }, 600);
  }

  function draw(markedYear) {
    chartDiv.html('');
    const W = chartDiv.node().getBoundingClientRect().width || 600;
    const H = chartDiv.node().getBoundingClientRect().height || 340;
    if (W < 50 || H < 50) return;

    const margin = { top: 20, right: 16, bottom: 56, left: 70 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = chartDiv.append('svg').attr('width', W).attr('height', H).style('font-family', 'inherit');
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const stack = d3.stack().keys(continents)(flatData);
    const yMax = d3.max(stack[stack.length - 1], d => d[1]);

    const xScale = d3.scaleLinear().domain(d3.extent(years)).range([0, w]);
    const yScale = d3.scaleLinear().domain([0, yMax]).range([h, 0]).nice();

    // Grid
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickSize(-w).tickFormat(d => d3.format('.2s')(d)))
      .call(gg => gg.select('.domain').remove())
      .call(gg => gg.selectAll('.tick line').attr('stroke', '#e8e8e8').attr('stroke-dasharray', '3,3'))
      .call(gg => gg.selectAll('text').attr('font-size', 10).attr('fill', '#888'));

    g.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(xScale).tickFormat(d => d).ticks(years.length))
      .call(gg => gg.select('.domain').attr('stroke', '#ccc'))
      .call(gg => gg.selectAll('.tick line').attr('stroke', '#ccc'))
      .call(gg => gg.selectAll('text').attr('fill', '#888').attr('font-size', 10)
        .style('text-anchor', 'end').attr('transform', 'rotate(-40)').attr('dy', '0.5em').attr('dx', '-0.5em'));

    g.append('text').attr('x', -h / 2).attr('y', -56).attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle').attr('fill', '#888').attr('font-size', 11)
      .text('Stock migranti internazionali');

    const area = d3.area()
      .x(d => xScale(d.data.year))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveMonotoneX);

    stack.forEach(layer => {
      const dimmed = highlightConts && !highlightConts.includes(layer.key);
      g.append('path')
        .datum(layer)
        .attr('fill', CONT_COLOR[layer.key] || '#aaa')
        .attr('opacity', dimmed ? 0.12 : 0.78)
        .attr('d', area)
        .style('transition', 'opacity 0.3s')
        .on('mousemove', (e) => {
          const yr = Math.round(xScale.invert(e.offsetX - margin.left));
          const nearestYr = years.reduce((a, b) => Math.abs(b - yr) < Math.abs(a - yr) ? b : a);
          const val = byYear.get(nearestYr)?.[layer.key] || 0;
          showTip(e,
            `<div style="font-weight:700;color:${CONT_COLOR[layer.key]||'#fff'};margin-bottom:4px">${layer.key}</div>` +
            `Anno: <strong>${nearestYr}</strong><br/>` +
            `Migranti: <strong>${d3.format(',.0f')(val)}</strong>`
          );
        })
        .on('mouseleave', hideTip);
    });

    // Vertical marker for selected year
    if (markedYear && years.includes(markedYear)) {
      g.append('line')
        .attr('x1', xScale(markedYear)).attr('x2', xScale(markedYear))
        .attr('y1', 0).attr('y2', h)
        .attr('stroke', '#333').attr('stroke-width', 1.5).attr('stroke-dasharray', '4,3')
        .style('pointer-events', 'none');

      const mx = xScale(markedYear);
      const totalAtYear = continents.reduce((s, c) => s + (byYear.get(markedYear)?.[c] || 0), 0);
      g.append('text')
        .attr('x', mx + 4).attr('y', 10)
        .attr('font-size', 10).attr('fill', '#333')
        .text(`${markedYear}: ${d3.format('.2s')(totalAtYear)}`);
    }

    // Legend
    const leg = svg.append('g').attr('transform', `translate(${margin.left}, ${H - 18})`);
    let lx = 0;
    continents.forEach(c => {
      const shortC = c.length > 14 ? c.split(' ').map(w => w[0]).join('') : c.split(' ')[0];
      const grp = leg.append('g').attr('transform', `translate(${lx},0)`).style('cursor','pointer')
        .on('click', () => {
          highlightConts = (highlightConts && highlightConts.includes(c)) ? null : [c];
          draw(markedYear);
        });
      grp.append('rect').attr('width', 12).attr('height', 10).attr('y', -6).attr('rx', 2)
        .attr('fill', CONT_COLOR[c]||'#aaa');
      grp.append('text').attr('x', 15).attr('y', 3).attr('font-size', 10).attr('fill', '#555').text(shortC);
      lx += shortC.length * 6.5 + 22;
    });
  }

  // Initial draw: show latest year
  markerYear = years[years.length - 1];
  draw(markerYear);

  const node = container.node();
  node._migrationShowYear = function(yr) {
    const closest = years.reduce((a, b) => Math.abs(b - yr) < Math.abs(a - yr) ? b : a);
    slider.property('value', closest);
    yearLabel.text(closest);
    markerYear = closest;
    draw(closest);
  };
  node._migrationAnimate = startAnimation;
  node._migrationHighlight = function(contArr) {
    highlightConts = contArr && contArr.length ? contArr : null;
    draw(markerYear);
  };
}
