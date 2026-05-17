/* ============================================================
   Grafico 3-1 (Atto II) — Bubble: spesa istruzione × miglioramento completamento
   X = edu_spending (% PIL, anno recente)
   Y = delta edu_completion (anno recente - anno iniziale)
   R = popolazione (scala sqrt)
   Color = continente
   ============================================================ */
async function renderEduTreemap(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const CONT_COLOR = {
    'Africa': '#e07b39', 'Asia': '#4a90d9', 'Europe': '#5aab6e',
    'North America': '#a45dc0', 'Oceania': '#888888', 'South America': '#d4b84a',
  };

  const NOTABLE = new Set(['NER', 'TCD', 'ETH', 'NOR', 'FIN', 'KOR', 'CUB', 'VNM', 'BRA', 'IND', 'ZAF', 'BGD', 'COD', 'MLI', 'AFG', 'DEU', 'GBR', 'MAR', 'MOZ', 'RWA', 'CHN', 'USA', 'PAK', 'IDN', 'NGA']);

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
      spending: spendRecent.value,
      compEarly: compEarly.value,
      compRecent: compRecent.value,
      delta, pop,
      yrSpend: spendRecent.year,
      yrEarly: compEarly.year,
      yrRecent: compRecent.year,
    });
  });

  // Sort so small bubbles render on top
  data.sort((a, b) => b.pop - a.pop);

  let highlightContinent = null;

  const MARGIN = { top: 28, right: 24, bottom: 48, left: 58 };
  const W = container.clientWidth || (isFullscreen ? window.innerWidth * 0.85 : 760);
  const H = container.clientHeight || (isFullscreen ? window.innerHeight * 0.82 : 480);
  const iw = W - MARGIN.left - MARGIN.right;
  const ih = H - MARGIN.top - MARGIN.bottom;

  const svg = d3.select(container).append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('height', '100%').style('display', 'block');

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  const xExt = d3.extent(data, d => d.spending);
  const yExt = d3.extent(data, d => d.delta);
  const popExt = d3.extent(data, d => d.pop);

  const xS = d3.scaleLinear().domain([0, xExt[1] * 1.06]).range([0, iw]).nice();
  const yS = d3.scaleLinear().domain([yExt[0] * 1.1, yExt[1] * 1.1]).range([ih, 0]).nice();
  const rS = d3.scaleSqrt().domain([0, popExt[1]]).range([3, isFullscreen ? 32 : 24]);

  // Gridlines
  xS.ticks(6).forEach(t => g.append('line').attr('x1', xS(t)).attr('x2', xS(t)).attr('y1', 0).attr('y2', ih).attr('stroke', '#f0f0f0').attr('stroke-width', 1));
  yS.ticks(6).forEach(t => g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t)).attr('stroke', '#f0f0f0').attr('stroke-width', 1));

  // Zero line (delta = 0)
  if (yExt[0] < 0) {
    g.append('line').attr('x1', 0).attr('x2', iw)
      .attr('y1', yS(0)).attr('y2', yS(0))
      .attr('stroke', '#aaa').attr('stroke-width', 1).attr('stroke-dasharray', '4,3');
    g.append('text').attr('x', iw + 2).attr('y', yS(0) + 3)
      .attr('font-size', 8).attr('fill', '#aaa').text('nessun cambiamento');
  }

  // Axes
  g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xS).ticks(6).tickFormat(d => `${d}%`)).attr('font-size', 9).call(ax => ax.select('.domain').remove());
  g.append('g').call(d3.axisLeft(yS).ticks(6).tickFormat(d => `+${d}%`.replace('+-', '-'))).attr('font-size', 9).call(ax => ax.select('.domain').remove());

  g.append('text').attr('x', iw / 2).attr('y', ih + 38).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#666').text('Spesa pubblica istruzione (% PIL, anno recente)');
  g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -46).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#666').text('Variazione completamento secondaria (punti %)');

  // Quadrant labels
  g.append('text').attr('x', iw * 0.75).attr('y', yS(yExt[1]) + 14).attr('text-anchor', 'middle').attr('font-size', 8.5).attr('fill', '#5aab6e').attr('opacity', 0.7).text('Alta spesa · molto migliorato');
  g.append('text').attr('x', iw * 0.1).attr('y', yS(yExt[1]) + 14).attr('text-anchor', 'middle').attr('font-size', 8.5).attr('fill', '#4a90d9').attr('opacity', 0.7).text('Bassa spesa · molto migliorato');
  if (yExt[0] < 0) {
    g.append('text').attr('x', iw * 0.75).attr('y', yS(yExt[0]) - 4).attr('text-anchor', 'middle').attr('font-size', 8.5).attr('fill', '#e07b39').attr('opacity', 0.7).text('Alta spesa · peggiorato');
  }

  let tipEl = document.getElementById('eduscatter-tip');
  if (!tipEl) {
    tipEl = document.createElement('div'); tipEl.id = 'eduscatter-tip';
    Object.assign(tipEl.style, { position: 'fixed', display: 'none', pointerEvents: 'none', background: 'rgba(20,20,40,0.88)', color: '#fff', padding: '7px 11px', borderRadius: '5px', fontSize: '12px', lineHeight: '1.55', zIndex: '10000', whiteSpace: 'nowrap' });
    document.body.appendChild(tipEl);
  }

  function colFn(d) { return !highlightContinent || d.continent === highlightContinent ? (CONT_COLOR[d.continent] || '#888') : '#ddd'; }
  function opaFn(d) { return !highlightContinent || d.continent === highlightContinent ? 0.65 : 0.08; }

  function draw() {
    g.selectAll('.bubble').remove();
    g.selectAll('.label').remove();

    g.selectAll('.bubble').data(data, d => d.code).join('circle').attr('class', 'bubble')
      .attr('cx', d => xS(d.spending)).attr('cy', d => yS(d.delta))
      .attr('r', d => rS(d.pop))
      .attr('fill', colFn).attr('opacity', opaFn)
      .attr('stroke', d => colFn(d) === '#ddd' ? 'none' : '#fff')
      .attr('stroke-width', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 1).attr('stroke-width', 1.5);
        tipEl.innerHTML = `<strong>${d.country}</strong> (${d.continent})<br>Spesa: ${d.spending.toFixed(1)}% PIL (${d.yrSpend})<br>Completamento: ${d.compEarly.toFixed(0)}% → ${d.compRecent.toFixed(0)}% (${d.yrEarly}–${d.yrRecent})<br>Variazione: ${d.delta >= 0 ? '+' : ''}${d.delta.toFixed(1)} pp<br>Popolazione: ${d3.format(',.0f')(d.pop)}`;
        tipEl.style.display = 'block';
      })
      .on('mousemove', event => { tipEl.style.left = (event.clientX + 14) + 'px'; tipEl.style.top = (event.clientY - 28) + 'px'; })
      .on('mouseleave', function (event, d) {
        d3.select(this).attr('opacity', opaFn(d)).attr('stroke-width', 0.8);
        tipEl.style.display = 'none';
      });

    data.filter(d => NOTABLE.has(d.code) && opaFn(d) > 0.5).forEach(d => {
      g.append('text').attr('class', 'label')
        .attr('x', xS(d.spending) + rS(d.pop) + 2).attr('y', yS(d.delta) + 3)
        .attr('font-size', 8).attr('fill', CONT_COLOR[d.continent] || '#555')
        .style('pointer-events', 'none')
        .text(d.code);
    });
  }

  // Legend (continent colors)
  const legG = svg.append('g').attr('transform', `translate(${MARGIN.left + 4},${MARGIN.top + 2})`);
  Object.entries(CONT_COLOR).forEach(([c, color], i) => {
    legG.append('circle').attr('cx', 5).attr('cy', i * 13 + 5).attr('r', 4.5).attr('fill', color).attr('opacity', 0.8);
    legG.append('text').attr('x', 13).attr('y', i * 13 + 9).attr('font-size', 9).attr('fill', '#555').text(c);
  });

  // Bubble size legend
  const sizeLeg = svg.append('g').attr('transform', `translate(${W - MARGIN.right - 60},${MARGIN.top + ih - 40})`);
  sizeLeg.append('text').attr('x', 0).attr('y', -4).attr('font-size', 8).attr('fill', '#aaa').text('dimensione = pop.');
  [1e7, 1e8, 5e8].forEach((p, i) => {
    const r = rS(p);
    sizeLeg.append('circle').attr('cx', 10 + i * 26).attr('cy', 10).attr('r', r).attr('fill', 'none').attr('stroke', '#ccc').attr('stroke-width', 1);
    sizeLeg.append('text').attr('x', 10 + i * 26).attr('y', 10 + r + 8).attr('text-anchor', 'middle').attr('font-size', 7).attr('fill', '#bbb').text(p >= 1e9 ? `${p/1e9}G` : p >= 1e6 ? `${p/1e6}M` : p);
  });

  draw();

  container._treemapReset     = () => { highlightContinent = null; draw(); };
  container._treemapHighlight = (c) => { highlightContinent = c; draw(); };
}
