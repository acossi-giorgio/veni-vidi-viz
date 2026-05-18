/* ============================================================
   Grafico 3-1 (Atto II) — Bubble scatter: spesa istruzione × miglioramento
   X = edu_spending (% PIL), Y = delta completamento
   Colore = continente, dimensione = popolazione
   ============================================================ */
async function renderEduTreemap(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const CONTINENTS = ['Africa', 'Europe'];
  const CONT_COLOR = {
    'Africa': '#e07b39', 'Europe': '#5aab6e',
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
    if (r.continent !== 'Africa' && r.continent !== 'Europe') return;
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

    btnBar.append('button')
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

  const MARGIN = { top: 20, right: 130, bottom: 48, left: 58 };
  const W = container.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 760);
  const H = (container.clientHeight || (isFullscreen ? window.innerHeight * 0.82 : 480)) - 28;
  const iw = W - MARGIN.left - MARGIN.right;
  const ih = H - MARGIN.top  - MARGIN.bottom;

  const xExt = d3.extent(data, d => d.spending);
  const yExt = d3.extent(data, d => d.delta);

  const xS = d3.scaleLinear().domain([0, xExt[1] * 1.06]).range([0, iw]).nice();
  const yS = d3.scaleLinear().domain([yExt[0] * 1.1, yExt[1] * 1.1]).range([ih, 0]).nice();

  const popExt = d3.extent(data, d => d.pop);
  const rS = d3.scaleSqrt().domain([0, popExt[1]]).range([3, 18]);

  const svg = d3.select(container).append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('display', 'block');

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  svg.append('defs').append('clipPath').attr('id', 'bubble-clip')
    .append('rect').attr('width', iw + 4).attr('height', ih + 4).attr('x', -2).attr('y', -2);

  // Gridlines
  xS.ticks(6).forEach(t => g.append('line').attr('x1', xS(t)).attr('x2', xS(t)).attr('y1', 0).attr('y2', ih).attr('stroke', '#f0f0f0').attr('stroke-width', 1));
  yS.ticks(10).forEach(t => g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t)).attr('stroke', '#f0f0f0').attr('stroke-width', 1));

  // Zero line
  g.append('line').attr('x1', 0).attr('x2', iw)
    .attr('y1', yS(0)).attr('y2', yS(0))
    .attr('stroke', '#bbb').attr('stroke-width', 1).attr('stroke-dasharray', '4,3');

  // Axes
  g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xS).ticks(6).tickFormat(d => `${d}%`))
    .attr('font-size', 9).call(ax => ax.select('.domain').remove());
  g.append('g').call(d3.axisLeft(yS).ticks(10).tickFormat(d => `${d >= 0 ? '+' : ''}${d}%`))
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

  // Legend: continents + pop size guide
  const lgX = iw + 10;
  g.append('text').attr('x', lgX).attr('y', 14).attr('font-size', 7.5).attr('fill', '#aaa').text('Continente');
  CONTINENTS.forEach((c, i) => {
    const col = CONT_COLOR[c];
    const ly = 26 + i * 18;
    g.append('circle').attr('cx', lgX + 5).attr('cy', ly).attr('r', 5).attr('fill', col).attr('opacity', 0.75);
    g.append('text').attr('x', lgX + 13).attr('y', ly + 4).attr('font-size', 8).attr('fill', '#555').text(c);
  });

  const lgY2 = 26 + CONTINENTS.length * 18 + 16;
  g.append('text').attr('x', lgX).attr('y', lgY2).attr('font-size', 7.5).attr('fill', '#aaa').text('Popolazione');
  [5e6, 50e6, 200e6].forEach((p, i) => {
    const r = rS(p);
    const ly = lgY2 + 14 + i * 28 + r;
    g.append('circle').attr('cx', lgX + 9).attr('cy', ly).attr('r', r).attr('fill', 'none').attr('stroke', '#bbb').attr('stroke-width', 1);
    g.append('text').attr('x', lgX + 22).attr('y', ly + 4).attr('font-size', 7.5).attr('fill', '#888')
      .text(p >= 1e9 ? `${(p/1e9).toFixed(0)}B` : p >= 1e6 ? `${(p/1e6).toFixed(0)}M` : p);
  });

  // Tooltip
  let tipEl = document.getElementById('edu-bubble-tip');
  if (!tipEl) {
    tipEl = document.createElement('div'); tipEl.id = 'edu-bubble-tip';
    Object.assign(tipEl.style, {
      position: 'fixed', display: 'none', pointerEvents: 'none',
      background: 'rgba(20,20,40,0.92)', color: '#fff',
      padding: '8px 12px', borderRadius: '6px', fontSize: '11px',
      lineHeight: '1.6', zIndex: '10000', maxWidth: '220px',
    });
    document.body.appendChild(tipEl);
  }

  const bubbleLayer = g.append('g').attr('clip-path', 'url(#bubble-clip)');

  function draw() {
    bubbleLayer.selectAll('*').remove();

    const filtered = activeContinent
      ? data.filter(d => d.continent === activeContinent)
      : data;

    // Sort: large bubbles behind small
    const sorted = filtered.slice().sort((a, b) => b.pop - a.pop);

    bubbleLayer.selectAll('circle').data(sorted).join('circle')
      .attr('cx', d => xS(d.spending))
      .attr('cy', d => yS(d.delta))
      .attr('r',  d => rS(d.pop))
      .attr('fill', d => CONT_COLOR[d.continent] || '#888')
      .attr('fill-opacity', 0.65)
      .attr('stroke', '#fff').attr('stroke-width', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('fill-opacity', 0.9).attr('stroke', '#333').attr('stroke-width', 1.5);
        tipEl.innerHTML =
          `<strong>${d.country}</strong> <span style="opacity:.6">(${d.continent})</span><br>` +
          `Spesa: ${d.spending.toFixed(1)}% PIL<br>` +
          `Completamento: ${d.delta >= 0 ? '+' : ''}${d.delta.toFixed(1)} pp (${d.yrEarly}→${d.yrRecent})<br>` +
          `Pop.: ${d.pop >= 1e6 ? (d.pop/1e6).toFixed(1)+'M' : d3.format(',')(d.pop)}`;
        tipEl.style.display = 'block';
      })
      .on('mousemove', event => { tipEl.style.left = (event.clientX + 14) + 'px'; tipEl.style.top = (event.clientY - 28) + 'px'; })
      .on('mouseleave', function() {
        d3.select(this).attr('fill-opacity', 0.65).attr('stroke', '#fff').attr('stroke-width', 0.8);
        tipEl.style.display = 'none';
      });
  }

  draw();

  container._treemapReset     = () => { activeContinent = null; renderBtns(); draw(); };
  container._treemapHighlight = (c) => { activeContinent = c;   renderBtns(); draw(); };
}
