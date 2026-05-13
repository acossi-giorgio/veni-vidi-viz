/* ============================================================
   Grafico 9 — Trend multi-indicatore (small multiples)
   3 pannelli affiancati, uno per indicatore.
   API: container._trendsShowAll()
        container._trendsHighlightIndicator(key|null)
        container._trendsActivateToggle()
   ============================================================ */

async function renderTrendsMultimode(selector = '#chart-4-3', isFullscreen = false) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html('');
  container.style('width', '100%').style('height', '100%')
    .style('position', 'relative').style('font-family', 'inherit');

  const raw = await d3.csv('datasets/processed/09_trends.csv', d3.autoType);
  if (!raw.length) { container.append('p').style('padding','1rem').text('Dati non disponibili.'); return; }

  const INDICATORS = [
    { key: 'child_labor',    label: 'Lavoro minorile',    unit: '% bambini 5–17',  color: '#b04a4a' },
    { key: 'child_marriage', label: 'Matrimoni precoci',  unit: '% donne 20–24',   color: '#c97c3e' },
    { key: 'out_of_school',  label: 'Fuori dalla scuola', unit: 'milioni',          color: '#4a6fa5' },
  ];

  const REGIONS = [
    'Sub-Saharan Africa',
    'Central and Southern Asia',
    'Latin America and the Caribbean',
    'Europe and Northern America',
    'Oceania',
  ];

  let highlightKey = null;
  let selectedRegion = 'Global';

  // Aggregate: mean per (indicator, year) across countries in region
  function buildSeries(region) {
    const filtered = raw.filter(d =>
      !String(d.iso3).startsWith('UNSDG') &&
      d.value != null && !isNaN(d.value) && d.value >= 0 &&
      d.year >= 1990 &&
      (region === 'Global' || d.region === region)
    );
    const map = new Map();
    INDICATORS.forEach(ind => {
      const byYear = d3.rollup(
        filtered.filter(d => d.indicator === ind.key),
        rows => d3.mean(rows, r => r.value),
        d => d.year
      );
      const pts = [...byYear.entries()]
        .map(([yr, v]) => ({ year: yr, value: v }))
        .filter(d => d.value != null)
        .sort((a, b) => a.year - b.year);
      map.set(ind.key, pts);
    });
    return map;
  }

  // Tooltip
  d3.select('body').selectAll('.tooltip-trends9').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip-trends9')
    .style('position', 'absolute').style('background', 'rgba(0,0,0,0.88)')
    .style('color', '#fff').style('border-radius', '6px').style('padding', '8px 12px')
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

  // Controls
  const controls = wrapper.append('div')
    .style('flex', '0 0 auto').style('display', 'flex').style('align-items', 'center')
    .style('gap', '8px').style('padding', '6px 12px').style('border-bottom', '1px solid #e0e0e0')
    .style('background', '#fafafa').style('font-size', '11px').style('flex-wrap', 'wrap');

  controls.append('span').style('color', '#888').text('Regione:');
  const regionSelect = controls.append('select')
    .style('font-size', '11px').style('border', '1px solid #ddd').style('border-radius', '4px')
    .style('padding', '2px 4px').style('cursor', 'pointer')
    .on('change', function() { selectedRegion = this.value; draw(); });

  [{ v: 'Global', l: 'Globale' }, ...REGIONS.map(r => ({ v: r, l: r }))].forEach(opt => {
    regionSelect.append('option').attr('value', opt.v).text(opt.l);
  });

  controls.append('span').style('color', '#ccc').text('|');
  controls.append('span').style('color', '#888').text('Clicca un pannello per isolarlo.');

  const panelsDiv = wrapper.append('div')
    .style('flex', '1 1 auto').style('display', 'flex').style('gap', '0')
    .style('overflow', 'hidden');

  function draw() {
    panelsDiv.html('');
    const totalW = panelsDiv.node().getBoundingClientRect().width || 600;
    const totalH = panelsDiv.node().getBoundingClientRect().height || 340;
    if (totalW < 50 || totalH < 50) return;

    const seriesMap = buildSeries(selectedRegion);

    INDICATORS.forEach((ind, idx) => {
      const pts = seriesMap.get(ind.key) || [];
      const dimmed = highlightKey && highlightKey !== ind.key;

      const panelW = totalW / INDICATORS.length;

      const panel = panelsDiv.append('div')
        .style('width', `${panelW}px`)
        .style('height', `${totalH}px`)
        .style('flex', '0 0 auto')
        .style('border-right', idx < INDICATORS.length - 1 ? '1px solid #e8e8e8' : 'none')
        .style('cursor', 'pointer')
        .style('opacity', dimmed ? '0.22' : '1')
        .style('transition', 'opacity 0.3s')
        .on('click', () => {
          highlightKey = (highlightKey === ind.key) ? null : ind.key;
          draw();
        });

      const margin = { top: 32, right: idx === INDICATORS.length - 1 ? 12 : 8, bottom: 36, left: idx === 0 ? 48 : 32 };
      const w = panelW - margin.left - margin.right;
      const h = totalH - margin.top - margin.bottom;

      const svg = panel.append('svg')
        .attr('width', panelW).attr('height', totalH)
        .style('display', 'block').style('font-family', 'inherit');

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Panel title
      svg.append('text')
        .attr('x', panelW / 2).attr('y', 16)
        .attr('text-anchor', 'middle').attr('font-size', 12).attr('font-weight', '700')
        .attr('fill', dimmed ? '#ccc' : ind.color)
        .text(ind.label);

      if (!pts.length) {
        g.append('text').attr('x', w / 2).attr('y', h / 2)
          .attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#aaa')
          .text('Nessun dato');
        return;
      }

      const xScale = d3.scaleLinear()
        .domain(d3.extent(pts, d => d.year))
        .range([0, w]);

      const yMax = d3.max(pts, d => d.value);
      const yScale = d3.scaleLinear()
        .domain([0, yMax * 1.12])
        .range([h, 0]).nice();

      // Grid lines
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(4).tickSize(-w).tickFormat(() => ''))
        .call(gg => gg.select('.domain').remove())
        .call(gg => gg.selectAll('.tick line')
          .attr('stroke', '#ebebeb').attr('stroke-dasharray', '3,3'));

      // Y axis (only leftmost panel, or all if highlighted)
      if (idx === 0 || !dimmed) {
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(4).tickFormat(v => {
            if (ind.key === 'out_of_school') return d3.format('.1f')(v / 1e6) + 'M';
            return v.toFixed(1) + '%';
          }))
          .call(gg => gg.select('.domain').remove())
          .call(gg => gg.selectAll('.tick line').remove())
          .call(gg => gg.selectAll('text').attr('font-size', 9).attr('fill', '#999'));
      }

      // X axis
      g.append('g').attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(xScale)
          .ticks(Math.min(pts.length, 5))
          .tickFormat(d => String(d)))
        .call(gg => gg.select('.domain').attr('stroke', '#ddd'))
        .call(gg => gg.selectAll('.tick line').attr('stroke', '#ddd'))
        .call(gg => gg.selectAll('text').attr('font-size', 9).attr('fill', '#999'));

      // Area fill
      const area = d3.area()
        .defined(d => d.value != null)
        .x(d => xScale(d.year))
        .y0(h)
        .y1(d => yScale(d.value))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(pts)
        .attr('fill', ind.color)
        .attr('fill-opacity', 0.1)
        .attr('d', area);

      // Line
      const line = d3.line()
        .defined(d => d.value != null)
        .x(d => xScale(d.year))
        .y(d => yScale(d.value))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(pts)
        .attr('fill', 'none')
        .attr('stroke', ind.color)
        .attr('stroke-width', 2.5)
        .attr('d', line);

      // Dots + hover
      g.selectAll('.dot')
        .data(pts)
        .join('circle')
          .attr('class', 'dot')
          .attr('cx', d => xScale(d.year))
          .attr('cy', d => yScale(d.value))
          .attr('r', 3)
          .attr('fill', ind.color)
          .attr('opacity', 0)
          .style('pointer-events', 'all')
          .on('mouseover', function() { d3.select(this).attr('opacity', 1); })
          .on('mouseout', function() { d3.select(this).attr('opacity', 0); })
          .on('mousemove', (e, d) => {
            const val = ind.key === 'out_of_school'
              ? `${(d.value / 1e6).toFixed(1)} M`
              : `${d.value.toFixed(2)}%`;
            showTip(e,
              `<div style="font-weight:700;color:${ind.color};margin-bottom:3px">${ind.label}</div>` +
              `Anno: <strong>${d.year}</strong><br/>` +
              `${ind.unit}: <strong>${val}</strong>` +
              (selectedRegion !== 'Global' ? `<br/><span style="color:#aaa;font-size:10px">${selectedRegion}</span>` : '')
            );
          })
          .on('mouseleave', hideTip);

      // Unit label bottom-right
      g.append('text')
        .attr('x', w).attr('y', h + 28)
        .attr('text-anchor', 'end').attr('font-size', 9).attr('fill', '#bbb')
        .text(ind.unit);
    });
  }

  draw();

  const node = container.node();
  node._trendsShowAll = function() { highlightKey = null; draw(); };
  node._trendsHighlightIndicator = function(k) { highlightKey = k || null; draw(); };
  node._trendsActivateToggle = function() { highlightKey = null; draw(); };
}
