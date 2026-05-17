/* ============================================================
   Grafico 3-1 (Atto II) — Hexbin: spesa istruzione × miglioramento completamento
   X = edu_spending (% PIL), Y = delta completamento
   Colore esagono = numero paesi nel bin (densità)
   ============================================================ */
async function renderEduTreemap(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'];
  const CONT_COLOR = {
    'Africa': '#e07b39', 'Asia': '#4a90d9', 'Europe': '#5aab6e',
    'North America': '#a45dc0', 'Oceania': '#888888', 'South America': '#d4b84a',
  };

  const [spendRaw, compRaw, popRaw] = await Promise.all([
    d3.csv('datasets/processed/edu_spending.csv', d3.autoType),
    d3.csv('datasets/processed/edu_completion.csv', d3.autoType),
    d3.csv('datasets/processed/population.csv', d3.autoType),
  ]);

  function nearest(rows, targetYear) {
    const valid = rows.filter(d => d.value != null && d.value > 0);
    if (!valid.length) return null;
    return valid.sort((a, b) => Math.abs(a.year - targetYear) - Math.abs(b.year - targetYear))[0];
  }

  const spendByCode = new Map();
  d3.group(spendRaw, d => d.code).forEach((rows, code) => spendByCode.set(code, rows));
  const compByCode = new Map();
  d3.group(compRaw, d => d.code).forEach((rows, code) => compByCode.set(code, rows));
  const popByCode = new Map();
  d3.group(popRaw, d => d.code).forEach((rows, code) => {
    const r = rows.filter(d => d.value != null).sort((a, b) => b.year - a.year)[0];
    if (r) popByCode.set(code, r.value);
  });

  const data = [];
  spendByCode.forEach((spRows, code) => {
    const cpRows = compByCode.get(code);
    if (!cpRows) return;
    const r = spRows[0];
    const spendRecent = nearest(spRows, 2019);
    const compEarly   = nearest(cpRows, 2003);
    const compRecent  = nearest(cpRows, 2020);
    if (!spendRecent || !compEarly || !compRecent) return;
    if (Math.abs(compRecent.year - compEarly.year) < 4) return;
    const delta = compRecent.value - compEarly.value;
    const pop   = popByCode.get(code) || 1e6;
    data.push({
      code, country: r.country, continent: r.continent,
      spending: spendRecent.value, delta, pop,
      compEarly: compEarly.value, compRecent: compRecent.value,
      yrEarly: compEarly.year, yrRecent: compRecent.year,
    });
  });

  let activeContinent = null;

  // Continent filter buttons
  const btnBar = d3.select(container).append('div')
    .style('display', 'flex').style('flex-wrap', 'wrap').style('gap', '4px')
    .style('padding', '4px 6px 0').style('z-index', '10');

  function renderBtns() {
    btnBar.selectAll('button').remove();

    const allBtn = btnBar.append('button')
      .style('font-size', '10px').style('padding', '2px 9px')
      .style('border-radius', '12px').style('cursor', 'pointer')
      .style('border', '1px solid #ccc')
      .style('background', activeContinent === null ? '#444' : '#f5f5f5')
      .style('color', activeContinent === null ? '#fff' : '#555')
      .style('font-weight', activeContinent === null ? '700' : '400')
      .text('Tutti')
      .on('click', () => { activeContinent = null; renderBtns(); draw(); });

    CONTINENTS.forEach(c => {
      const active = activeContinent === c;
      const col = CONT_COLOR[c] || '#888';
      btnBar.append('button')
        .style('font-size', '10px').style('padding', '2px 9px')
        .style('border-radius', '12px').style('cursor', 'pointer')
        .style('border', `1px solid ${active ? col : '#ccc'}`)
        .style('background', active ? col : '#f5f5f5')
        .style('color', active ? '#fff' : '#555')
        .style('font-weight', active ? '700' : '400')
        .text(c)
        .on('click', () => { activeContinent = c; renderBtns(); draw(); });
    });
  }

  renderBtns();

  const MARGIN = { top: 20, right: 110, bottom: 48, left: 58 };
  const W = container.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 760);
  const H = (container.clientHeight || (isFullscreen ? window.innerHeight * 0.82 : 480)) - 28;
  const iw = W - MARGIN.left - MARGIN.right;
  const ih = H - MARGIN.top  - MARGIN.bottom;

  const xExt = d3.extent(data, d => d.spending);
  const yExt = d3.extent(data, d => d.delta);

  const xS = d3.scaleLinear().domain([0, xExt[1] * 1.06]).range([0, iw]).nice();
  const yS = d3.scaleLinear().domain([yExt[0] * 1.1, yExt[1] * 1.1]).range([ih, 0]).nice();

  const HEX_R = Math.max(14, Math.min(26, iw / 14));

  const svg = d3.select(container).append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('display', 'block');

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  svg.append('defs').append('clipPath').attr('id', 'hex-clip')
    .append('rect').attr('width', iw).attr('height', ih);

  // Gridlines
  xS.ticks(6).forEach(t => g.append('line').attr('x1', xS(t)).attr('x2', xS(t)).attr('y1', 0).attr('y2', ih).attr('stroke', '#f0f0f0').attr('stroke-width', 1));
  yS.ticks(12).forEach(t => g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t)).attr('stroke', '#f0f0f0').attr('stroke-width', 1));

  // Zero line
  if (yExt[0] < 0) {
    g.append('line').attr('x1', 0).attr('x2', iw)
      .attr('y1', yS(0)).attr('y2', yS(0))
      .attr('stroke', '#bbb').attr('stroke-width', 1).attr('stroke-dasharray', '4,3');
  }

  // Axes
  g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xS).ticks(6).tickFormat(d => `${d}%`))
    .attr('font-size', 9).call(ax => ax.select('.domain').remove());
  g.append('g').call(d3.axisLeft(yS).ticks(12).tickFormat(d => `${d >= 0 ? '+' : ''}${d}%`))
    .attr('font-size', 9).call(ax => ax.select('.domain').remove());
  g.append('text').attr('x', iw / 2).attr('y', ih + 38).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#666')
    .text('Spesa pubblica istruzione (% PIL, anno recente)');
  g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -46).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#666')
    .text('Variazione completamento secondaria (punti %)');

  // Quadrant labels
  g.append('text').attr('x', iw * 0.12).attr('y', 12).attr('font-size', 8).attr('fill', '#5aab6e').attr('opacity', 0.7).text('Bassa spesa · molto migliorato');
  g.append('text').attr('x', iw * 0.72).attr('y', 12).attr('font-size', 8).attr('fill', '#4a90d9').attr('opacity', 0.7).text('Alta spesa · molto migliorato');
  if (yExt[0] < 0) {
    g.append('text').attr('x', iw * 0.72).attr('y', ih - 4).attr('font-size', 8).attr('fill', '#e07b39').attr('opacity', 0.7).text('Alta spesa · peggiorato');
  }

  // Tooltip
  let tipEl = document.getElementById('edu-hex-tip');
  if (!tipEl) {
    tipEl = document.createElement('div'); tipEl.id = 'edu-hex-tip';
    Object.assign(tipEl.style, {
      position: 'fixed', display: 'none', pointerEvents: 'none',
      background: 'rgba(20,20,40,0.92)', color: '#fff',
      padding: '8px 12px', borderRadius: '6px', fontSize: '11px',
      lineHeight: '1.6', zIndex: '10000', maxWidth: '220px',
    });
    document.body.appendChild(tipEl);
  }

  const hexLayer = g.append('g').attr('clip-path', 'url(#hex-clip)');

  // Fixed threshold color scale: 1 / 2-3 / 4-6 / 7-10 / 11+
  const THRESHOLDS = [2, 4, 7, 11];
  const STEP_COLORS = ['#ffffb2', '#fecc5c', '#fd8d3c', '#f03b20', '#bd0026'];
  const STEP_LABELS = ['1', '2–3', '4–6', '7–10', '11+'];
  const colorS = d3.scaleThreshold().domain(THRESHOLDS).range(STEP_COLORS);

  // Discrete legend
  const lgH = 12, lgX = iw + 8, lgY0 = ih / 2 - (STEP_COLORS.length * (lgH + 3)) / 2;
  g.append('text').attr('x', lgX).attr('y', lgY0 - 8).attr('font-size', 7.5).attr('fill', '#aaa').text('n° paesi');
  STEP_COLORS.forEach((col, i) => {
    const y = lgY0 + i * (lgH + 3);
    g.append('rect').attr('x', lgX).attr('y', y).attr('width', lgH).attr('height', lgH)
      .attr('fill', col).attr('rx', 2);
    g.append('text').attr('x', lgX + lgH + 4).attr('y', y + lgH - 2)
      .attr('font-size', 7.5).attr('fill', '#666').text(STEP_LABELS[i]);
  });

  function draw() {
    hexLayer.selectAll('*').remove();

    const filtered = activeContinent
      ? data.filter(d => d.continent === activeContinent)
      : data;

    const hexbin = d3.hexbin()
      .x(d => xS(d.spending))
      .y(d => yS(d.delta))
      .radius(HEX_R)
      .extent([[0, 0], [iw, ih]]);

    const bins = hexbin(filtered);

    // Hexagons — full radius (no gaps)
    hexLayer.selectAll('path.hex').data(bins).join('path')
      .attr('class', 'hex')
      .attr('d', hexbin.hexagon(HEX_R))
      .attr('transform', b => `translate(${b.x},${b.y})`)
      .attr('fill', b => colorS(b.length))
      .attr('fill-opacity', 0.88)
      .attr('stroke', '#fff').attr('stroke-width', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, b) {
        d3.select(this).attr('stroke', '#333').attr('stroke-width', 2);
        const avgD = d3.mean(b, d => d.delta);
        const avgS = d3.mean(b, d => d.spending);
        const allNames = b.slice().sort((a, z) => z.pop - a.pop).map(d => d.country).join('<br>');
        tipEl.innerHTML =
          `<strong>${b.length} paes${b.length === 1 ? 'e' : 'i'}</strong><br>` +
          `Spesa media: ${avgS.toFixed(1)}% PIL<br>` +
          `Miglioramento medio: ${avgD >= 0 ? '+' : ''}${avgD.toFixed(1)} pp<br>` +
          `<span style="opacity:.75;font-size:10px">${allNames}</span>`;
        tipEl.style.display = 'block';
      })
      .on('mousemove', event => { tipEl.style.left = (event.clientX + 14) + 'px'; tipEl.style.top = (event.clientY - 28) + 'px'; })
      .on('mouseleave', function() { d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.8); tipEl.style.display = 'none'; });

  }

  draw();

  container._treemapReset     = () => { activeContinent = null; renderBtns(); draw(); };
  container._treemapHighlight = (c) => { activeContinent = c;   renderBtns(); draw(); };
}
