/* ============================================================
   Grafico 7 — Reddito vs Lavoro Minorile (Bubble Chart)
   scatter plot: GDP per capita (x) vs child_labor_pct (y),
   bolla dimensionata per pop_5_17, colorata per continente.
   API: container._bubbleHighlightContinent(name|null)
        container._bubbleReset()
        container._bubbleShowContinent(name|null)
   ============================================================ */

async function renderChildLaborBubble(selector = '#chart-4-1', isFullscreen = false) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html('');

  const node = container.node();
  const bbox = node.getBoundingClientRect();
  const width  = bbox.width  || (isFullscreen ? window.innerWidth  * 0.88 : 680);
  const height = bbox.height || (isFullscreen ? window.innerHeight * 0.78 : 480);

  const margin = { top: 28, right: 160, bottom: 56, left: 68 };
  const W = width  - margin.left - margin.right;
  const H = height - margin.top  - margin.bottom;

  const CONTINENT_COLORS = {
    'Africa':        '#e07b39',
    'Asia':          '#4e9af1',
    'Europe':        '#6dbf67',
    'North America': '#c96dd8',
    'South America': '#f1c94e',
    'Oceania':       '#e05c5c',
  };

  // ── Load data ────────────────────────────────────────────
  const raw = await d3.csv('datasets/processed/07_bubble.csv', d3.autoType);
  if (!raw.length) { container.append('p').text('Dati non disponibili.'); return; }

  const continents = [...new Set(raw.map(d => d.continent))].sort();

  // ── Scales ──────────────────────────────────────────────
  const xExtent = d3.extent(raw, d => d.income);
  const xScale = d3.scaleLog()
    .domain([Math.max(200, xExtent[0] * 0.85), xExtent[1] * 1.15])
    .range([0, W])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(raw, d => d.child_labor_pct) * 1.12])
    .range([H, 0])
    .nice();

  const rScale = d3.scaleSqrt()
    .domain([0, d3.max(raw, d => d.pop_5_17)])
    .range([4, isFullscreen ? 40 : 28]);

  // ── SVG ─────────────────────────────────────────────────
  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('font-family', 'Roboto Slab, serif');

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Grid lines
  g.append('g').attr('class', 'grid grid-y')
    .call(
      d3.axisLeft(yScale).tickSize(-W).tickFormat('')
    )
    .call(gg => {
      gg.select('.domain').remove();
      gg.selectAll('.tick line')
        .attr('stroke', '#e8e8e4')
        .attr('stroke-dasharray', '3,3');
    });

  // ── Axes ─────────────────────────────────────────────────
  const xAxis = g.append('g')
    .attr('transform', `translate(0,${H})`)
    .call(
      d3.axisBottom(xScale)
        .ticks(6)
        .tickFormat(d => d >= 1000 ? `$${d3.format(',.0f')(d)}` : `$${d}`)
    );
  xAxis.select('.domain').attr('stroke', '#ccc');
  xAxis.selectAll('.tick line').attr('stroke', '#ccc');
  xAxis.selectAll('.tick text').attr('fill', '#5a5a5a').style('font-size', '11px');

  g.append('text')
    .attr('x', W / 2)
    .attr('y', H + 44)
    .attr('text-anchor', 'middle')
    .attr('fill', '#5a5a5a')
    .style('font-size', '12px')
    .text('PIL pro capite (USD, prezzi costanti 2021)');

  const yAxis = g.append('g')
    .call(d3.axisLeft(yScale).ticks(6).tickFormat(d => d + '%'));
  yAxis.select('.domain').attr('stroke', '#ccc');
  yAxis.selectAll('.tick line').attr('stroke', '#ccc');
  yAxis.selectAll('.tick text').attr('fill', '#5a5a5a').style('font-size', '11px');

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -H / 2)
    .attr('y', -52)
    .attr('text-anchor', 'middle')
    .attr('fill', '#5a5a5a')
    .style('font-size', '12px')
    .text('Bambini 5–17 anni in attività lavorative (%)');

  // ── Bubbles ──────────────────────────────────────────────
  const bubbles = g.selectAll('.bubble')
    .data(raw)
    .join('circle')
      .attr('class', 'bubble')
      .attr('cx', d => xScale(d.income))
      .attr('cy', d => yScale(d.child_labor_pct))
      .attr('r',  d => rScale(d.pop_5_17))
      .attr('fill', d => CONTINENT_COLORS[d.continent] || '#aaa')
      .attr('fill-opacity', 0.72)
      .attr('stroke', d => d3.color(CONTINENT_COLORS[d.continent] || '#aaa').darker(0.4))
      .attr('stroke-width', 1)
      .style('cursor', 'pointer');

  // ── Labels for notable countries ─────────────────────────
  const LABEL_COUNTRIES = new Set([
    'Niger', 'Chad', 'Burundi', 'Mali', 'Cameroon',
    'India', 'Bangladesh', 'Nigeria',
    'Norway', 'Germany', 'Italy',
    'Brazil', 'Afghanistan',
  ]);

  const labels = g.selectAll('.bubble-label')
    .data(raw.filter(d => LABEL_COUNTRIES.has(d.country)))
    .join('text')
      .attr('class', 'bubble-label')
      .attr('x', d => xScale(d.income) + rScale(d.pop_5_17) + 3)
      .attr('y', d => yScale(d.child_labor_pct) + 4)
      .attr('fill', '#3a3a3a')
      .style('font-size', '10px')
      .style('pointer-events', 'none')
      .text(d => d.country);

  // ── Tooltip ──────────────────────────────────────────────
  const tooltip = d3.select('body').selectAll('.bubble-tooltip').data([0]).join('div')
    .attr('class', 'bubble-tooltip')
    .style('position', 'fixed')
    .style('background', 'rgba(26,26,26,0.92)')
    .style('color', '#fff')
    .style('padding', '8px 12px')
    .style('border-radius', '6px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('line-height', '1.6')
    .style('z-index', 9999)
    .style('max-width', '200px');

  bubbles
    .on('mouseover', function (event, d) {
      d3.select(this).attr('fill-opacity', 1).attr('stroke-width', 2);
      tooltip
        .style('opacity', 1)
        .html(`
          <strong>${d.country}</strong><br>
          PIL: <strong>$${d3.format(',.0f')(d.income)}</strong><br>
          Lavoro minorile: <strong>${d.child_labor_pct}%</strong><br>
          Pop. 5–17: <strong>${d3.format(',.0f')(d.pop_5_17)}</strong><br>
          <span style="opacity:0.7;font-size:10px">Anno survey: ${d.year}</span>
        `);
    })
    .on('mousemove', function (event) {
      tooltip
        .style('left', (event.clientX + 14) + 'px')
        .style('top',  (event.clientY - 32) + 'px');
    })
    .on('mouseout', function () {
      d3.select(this)
        .attr('fill-opacity', d => node._activeContinent && node._activeContinent !== d.continent ? 0.12 : 0.72)
        .attr('stroke-width', 1);
      tooltip.style('opacity', 0);
    });

  // ── Legend ───────────────────────────────────────────────
  const legendG = svg.append('g')
    .attr('transform', `translate(${margin.left + W + 12}, ${margin.top + 4})`);

  continents.forEach((c, i) => {
    const row = legendG.append('g').attr('transform', `translate(0, ${i * 20})`);
    row.append('circle')
      .attr('r', 6)
      .attr('cx', 6)
      .attr('cy', 0)
      .attr('fill', CONTINENT_COLORS[c] || '#aaa')
      .attr('fill-opacity', 0.8)
      .style('cursor', 'pointer')
      .on('click', () => {
        if (node._activeContinent === c) {
          _bubbleReset();
        } else {
          _bubbleShowContinent(c);
        }
      });
    row.append('text')
      .attr('x', 16)
      .attr('y', 4)
      .attr('fill', '#3a3a3a')
      .style('font-size', '11px')
      .style('cursor', 'pointer')
      .text(c)
      .on('click', () => {
        if (node._activeContinent === c) {
          _bubbleReset();
        } else {
          _bubbleShowContinent(c);
        }
      });
  });

  // Size legend
  const sizeLegendG = svg.append('g')
    .attr('transform', `translate(${margin.left + W + 12}, ${margin.top + continents.length * 20 + 20})`);
  sizeLegendG.append('text')
    .attr('y', 0)
    .attr('fill', '#5a5a5a')
    .style('font-size', '10px')
    .text('Dimensione = pop. 5–17');

  [10_000_000, 50_000_000].forEach((v, i) => {
    const r = rScale(v);
    sizeLegendG.append('circle')
      .attr('cx', 10 + i * 50)
      .attr('cy', 20 + r)
      .attr('r', r)
      .attr('fill', 'none')
      .attr('stroke', '#aaa')
      .attr('stroke-width', 1);
    sizeLegendG.append('text')
      .attr('x', 10 + i * 50)
      .attr('y', 20 + r * 2 + 12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#777')
      .style('font-size', '9px')
      .text(d3.format('.0s')(v));
  });

  // ── Year watermark ────────────────────────────────────────
  g.append('text')
    .attr('class', 'year-label')
    .attr('x', W - 8)
    .attr('y', H - 8)
    .attr('text-anchor', 'end')
    .attr('fill', '#d8d8d4')
    .style('font-size', '36px')
    .style('font-weight', 'bold')
    .style('pointer-events', 'none')
    .text('~2020');

  // ── API exposed on DOM node ───────────────────────────────
  node._activeContinent = null;

  function _bubbleHighlightContinent(name) {
    node._activeContinent = name;
    bubbles
      .transition().duration(350)
      .attr('fill-opacity', d => !name || d.continent === name ? 0.8 : 0.1)
      .attr('stroke-width',  d => !name || d.continent === name ? 1.5 : 0.5);
    labels
      .transition().duration(350)
      .attr('opacity', d => !name || d.continent === name ? 1 : 0);
  }

  function _bubbleReset() {
    node._activeContinent = null;
    bubbles
      .transition().duration(350)
      .attr('fill-opacity', 0.72)
      .attr('stroke-width', 1);
    labels
      .transition().duration(350)
      .attr('opacity', 1);
  }

  function _bubbleShowContinent(name) {
    _bubbleHighlightContinent(name);
  }

  node._bubbleHighlightContinent = _bubbleHighlightContinent;
  node._bubbleReset              = _bubbleReset;
  node._bubbleShowContinent      = _bubbleShowContinent;
}
