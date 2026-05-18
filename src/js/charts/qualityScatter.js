/* ============================================================
   Grafico 3-2 (Atto II) — Strip chart GPI per continente
   Vista aggregata: dot strip multiplo (un punto = un paese)
   Drill-down: click continente → barre verticali divergenti per paese
   X = deviazione GPI da parità (GPI − 1)
   ============================================================ */
async function renderQualityScatter(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const CONT_COLOR = {
    'Africa': '#e07b39', 'Asia': '#4a90d9', 'Europe': '#5aab6e',
    'North America': '#a45dc0', 'Oceania': '#888888', 'South America': '#d4b84a',
  };

  const [gpiRaw, oosRaw] = await Promise.all([
    d3.csv('datasets/processed/gpi_secondary.csv', d3.autoType),
    d3.csv('datasets/processed/out_of_school.csv', d3.autoType),
  ]);

  // Latest GPI per country
  const allCountries = [];
  d3.group(gpiRaw, d => d.code).forEach((rows, code) => {
    const r = rows.filter(d => d.value != null).sort((a, b) => b.year - a.year)[0];
    if (r) allCountries.push({ code: r.code, country: r.country, continent: r.continent, gpi: r.value, dev: r.value - 1.0, year: r.year });
  });

  const oosMap = new Map();
  d3.group(oosRaw, d => d.code).forEach((rows, code) => {
    const r = rows.filter(d => d.value != null).sort((a, b) => b.year - a.year)[0];
    if (r) oosMap.set(code, r.value);
  });

  // Filter to Africa + Europe only
  const filteredCountries = allCountries.filter(d => d.continent === 'Africa' || d.continent === 'Europe');

  // Continent groups sorted by mean deviation
  const contGroups = [];
  d3.group(filteredCountries, d => d.continent).forEach((rows, cont) => {
    const devs = rows.map(d => d.dev);
    contGroups.push({ continent: cont, rows, devs, mean: d3.mean(devs), n: rows.length });
  });
  contGroups.sort((a, b) => a.mean - b.mean);

  let drillContinent = null;

  const MARGIN = { top: 36, right: 20, bottom: 40, left: 110 };
  const W = container.clientWidth || (isFullscreen ? window.innerWidth * 0.85 : 760);
  const H = container.clientHeight || (isFullscreen ? window.innerHeight * 0.82 : 480);
  const iw = W - MARGIN.left - MARGIN.right;
  const ih = H - MARGIN.top - MARGIN.bottom;

  const svg = d3.select(container).append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('height', '100%').style('display', 'block');

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  let tipEl = document.getElementById('gpi-tip');
  if (!tipEl) {
    tipEl = document.createElement('div'); tipEl.id = 'gpi-tip';
    Object.assign(tipEl.style, { position: 'fixed', display: 'none', pointerEvents: 'none', background: 'rgba(20,20,40,0.88)', color: '#fff', padding: '7px 11px', borderRadius: '5px', fontSize: '12px', lineHeight: '1.55', zIndex: '10000', whiteSpace: 'nowrap' });
    document.body.appendChild(tipEl);
  }

  const backBtn = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '6px').style('left', '8px')
    .style('display', 'none').style('cursor', 'pointer')
    .style('font-size', '11px').style('color', '#4a6fa5')
    .style('background', 'rgba(255,255,255,0.92)').style('border', '1px solid #c8d4e8')
    .style('border-radius', '6px').style('padding', '3px 10px')
    .text('← Tutti i continenti')
    .on('click', () => { drillContinent = null; draw(); });

  function draw() {
    g.selectAll('*').remove();
    drillContinent
      ? (backBtn.style('display', 'block'), drawDrill(drillContinent))
      : (backBtn.style('display', 'none'),  drawStrip());
  }

  /* ── Strip chart aggregato ── */
  function drawStrip() {
    const allDevs = filteredCountries.map(d => d.dev);
    const xExt = d3.extent(allDevs);
    const xPad = 0.05;
    const xS = d3.scaleLinear()
      .domain([Math.min(xExt[0] - xPad, -0.55), Math.max(xExt[1] + xPad, 0.25)])
      .range([0, iw]);

    const n = contGroups.length;
    const bandH = ih / n;
    const DOT_R = 4;

    // X axis
    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xS).ticks(8).tickFormat(d => d === 0 ? '0 (parità)' : d > 0 ? `+${d.toFixed(2)}` : d.toFixed(2)))
      .attr('font-size', 8.5).call(ax => ax.select('.domain').remove());

    // Parity line
    g.append('line').attr('x1', xS(0)).attr('x2', xS(0)).attr('y1', 0).attr('y2', ih)
      .attr('stroke', '#555').attr('stroke-width', 1).attr('stroke-dasharray', '4,3');

    // Direction labels
    g.append('text').attr('x', xS(-0.25)).attr('y', -18).attr('text-anchor', 'middle').attr('font-size', 8.5).attr('fill', '#b04a4a').text('← bambine escluse (GPI < 1)');
    g.append('text').attr('x', xS(0.12)).attr('y', -18).attr('text-anchor', 'middle').attr('font-size', 8.5).attr('fill', '#4a6fa5').text('bambini esclusi →');

    contGroups.forEach((cg, i) => {
      const cy  = i * bandH + bandH / 2;
      const col = CONT_COLOR[cg.continent] || '#888';

      // Row separator
      g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', i * bandH).attr('y2', i * bandH)
        .attr('stroke', '#f0f0f0').attr('stroke-width', 1);

      // Mean tick
      g.append('line')
        .attr('x1', xS(cg.mean)).attr('x2', xS(cg.mean))
        .attr('y1', cy - bandH * 0.35).attr('y2', cy + bandH * 0.35)
        .attr('stroke', col).attr('stroke-width', 2).attr('opacity', 0.6);

      // Dots with vertical jitter (deterministic by index within same x-bin)
      const binSize = 0.02;
      const dotsByBin = new Map();
      cg.rows.forEach(d => {
        const bin = Math.round(d.dev / binSize);
        if (!dotsByBin.has(bin)) dotsByBin.set(bin, []);
        dotsByBin.get(bin).push(d);
      });

      const maxPerBin = d3.max([...dotsByBin.values()], v => v.length);
      const jitterScale = Math.min((bandH * 0.38) / Math.max(maxPerBin, 1), DOT_R * 2.5);

      cg.rows.forEach(d => {
        const bin   = Math.round(d.dev / binSize);
        const peers = dotsByBin.get(bin);
        const rank  = peers.indexOf(d);
        const jitter = (rank - (peers.length - 1) / 2) * jitterScale;

        g.append('circle')
          .attr('cx', xS(d.dev)).attr('cy', cy + jitter)
          .attr('r', DOT_R).attr('fill', col).attr('opacity', 0.65)
          .attr('stroke', '#fff').attr('stroke-width', 0.5)
          .style('cursor', 'pointer')
          .on('mouseover', (event) => {
            tipEl.innerHTML = `<strong>${d.country}</strong><br>GPI: ${d.gpi.toFixed(3)} (${d.dev < 0 ? 'bambine escluse' : 'bambini esclusi'})<br>Anno: ${d.year}<br><em style="opacity:.6;font-size:10px">Clicca per dettaglio continente</em>`;
            tipEl.style.display = 'block';
          })
          .on('mousemove', ev => { tipEl.style.left = (ev.clientX + 14) + 'px'; tipEl.style.top = (ev.clientY - 28) + 'px'; })
          .on('mouseleave', () => tipEl.style.display = 'none')
          .on('click', () => { drillContinent = cg.continent; draw(); });
      });

      // Continent label
      g.append('text').attr('x', -8).attr('y', cy + 2)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('font-size', 10).attr('font-weight', '600').attr('fill', col)
        .text(cg.continent).style('cursor', 'pointer')
        .on('click', () => { drillContinent = cg.continent; draw(); });

      g.append('text').attr('x', -8).attr('y', cy + 13)
        .attr('text-anchor', 'end').attr('font-size', 7.5).attr('fill', '#bbb')
        .text(`n=${cg.n} · click`);
    });

    // Last separator
    g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', ih).attr('y2', ih)
      .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
  }

  /* ── Drill-down paesi ── */
  function drawDrill(continent) {
    const countries = allCountries.filter(d => d.continent === continent)
      .sort((a, b) => a.dev - b.dev);

    const oosMax = d3.max(countries, d => oosMap.get(d.code) || 0) || 1;
    const col = CONT_COLOR[continent] || '#888';

    const xS = d3.scaleBand().domain(countries.map(d => d.code)).range([0, iw]).padding(0.12);
    const yMax = Math.max(Math.abs(d3.min(countries, d => d.dev)), Math.abs(d3.max(countries, d => d.dev)), 0.08) * 1.2;
    const yS = d3.scaleLinear().domain([-yMax, yMax]).range([ih, 0]);

    yS.ticks(5).forEach(t => {
      g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t))
        .attr('stroke', Math.abs(t) < 0.001 ? '#555' : '#efefef')
        .attr('stroke-width', Math.abs(t) < 0.001 ? 1.2 : 1)
        .attr('stroke-dasharray', Math.abs(t) < 0.001 ? '4,3' : 'none');
    });

    g.append('g').call(d3.axisLeft(yS).ticks(5).tickFormat(d => d > 0 ? `+${d.toFixed(2)}` : d.toFixed(2))).attr('font-size', 9).call(ax => ax.select('.domain').remove());

    g.append('text').attr('x', iw / 2).attr('y', -20).attr('text-anchor', 'middle').attr('font-size', 12).attr('font-weight', '600').attr('fill', col).text(continent);
    g.append('text').attr('x', iw / 2).attr('y', -8).attr('text-anchor', 'middle').attr('font-size', 8).attr('fill', '#aaa').text('rosso = bambine escluse · blu = bambini esclusi');

    countries.forEach(d => {
      const oos     = oosMap.get(d.code) || 0;
      const opa     = 0.4 + 0.55 * (oos / oosMax);
      const fillCol = d.dev < 0 ? '#b04a4a' : '#4a6fa5';
      const barY    = yS(Math.max(0, d.dev));
      const barH    = Math.max(1, Math.abs(yS(d.dev) - yS(0)));

      g.append('rect')
        .attr('x', xS(d.code)).attr('y', barY)
        .attr('width', xS.bandwidth()).attr('height', barH)
        .attr('fill', fillCol).attr('opacity', opa).attr('rx', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function (event) {
          d3.select(this).attr('opacity', 1);
          const oos = oosMap.get(d.code);
          tipEl.innerHTML = `<strong>${d.country}</strong><br>GPI: ${d.gpi.toFixed(3)} (${d.dev < 0 ? 'bambine escluse' : 'bambini esclusi'})<br>Fuori scuola: ${oos > 0 ? d3.format(',.0f')(oos) : 'N/D'}<br><span style="opacity:.7;font-size:10px">Dato ${d.year}</span>`;
          tipEl.style.display = 'block';
        })
        .on('mousemove', ev => { tipEl.style.left = (ev.clientX + 14) + 'px'; tipEl.style.top = (ev.clientY - 28) + 'px'; })
        .on('mouseleave', function () { d3.select(this).attr('opacity', opa); tipEl.style.display = 'none'; });

      const bw = xS.bandwidth();
      g.append('text')
        .attr('x', xS(d.code) + bw / 2).attr('y', ih + 6)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('transform', `rotate(-50, ${xS(d.code) + bw / 2}, ${ih + 6})`)
        .attr('font-size', Math.min(9, bw + 4)).attr('fill', fillCol)
        .text(d.country.length > 12 ? d.country.slice(0, 11) + '…' : d.country);
    });

    g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -36).attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#666').text('Deviazione GPI dalla parità');
  }

  draw();

  container._bumpReset            = () => { drillContinent = null;     draw(); };
  container._bumpHighlightAfrica  = () => { drillContinent = 'Africa'; draw(); };
  container._bumpHighlightEurope  = () => { drillContinent = 'Europe'; draw(); };
}
