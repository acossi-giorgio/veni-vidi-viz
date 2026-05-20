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
  const COL_GIRLS = '#b04a4a';
  const COL_BOYS  = '#4a6fa5';

  const [gpiRaw, oosRaw] = await Promise.all([
    d3.csv('datasets/processed/gpi_secondary.csv', d3.autoType),
    d3.csv('datasets/processed/out_of_school.csv', d3.autoType),
  ]);

  // Latest GPI per country
  const allCountries = [];
  d3.group(gpiRaw, d => d.code).forEach((rows) => {
    const r = rows.filter(d => d.value != null).sort((a, b) => b.year - a.year)[0];
    if (r) allCountries.push({ code: r.code, country: r.country, continent: r.continent, gpi: r.value, dev: r.value - 1.0, year: r.year });
  });

  const oosMap = new Map();
  d3.group(oosRaw, d => d.code).forEach((rows, code) => {
    const r = rows.filter(d => d.value != null).sort((a, b) => b.year - a.year)[0];
    if (r) oosMap.set(code, r.value);
  });

  const filteredCountries = allCountries.filter(d => d.continent === 'Africa' || d.continent === 'Europe');

  const contGroups = [];
  d3.group(filteredCountries, d => d.continent).forEach((rows, cont) => {
    const devs = rows.map(d => d.dev);
    contGroups.push({ continent: cont, rows, devs, mean: d3.mean(devs), n: rows.length });
  });
  contGroups.sort((a, b) => a.mean - b.mean);

  let drillContinent = null;

  const W = container.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 760);
  const H = container.clientHeight || (isFullscreen ? window.innerHeight * 0.82 : 480);

  // ── Tooltip ────────────────────────────────────────────────
  let tipEl = document.getElementById('gpi-tip');
  if (!tipEl) {
    tipEl = document.createElement('div'); tipEl.id = 'gpi-tip';
    Object.assign(tipEl.style, {
      position: 'fixed', display: 'none', pointerEvents: 'none',
      background: 'rgba(20,20,40,0.9)', color: '#fff',
      padding: '6px 11px', borderRadius: '5px', fontSize: '11px',
      lineHeight: '1.55', zIndex: '10000', whiteSpace: 'nowrap',
    });
    document.body.appendChild(tipEl);
  }
  function hideTip() { tipEl.style.display = 'none'; }
  function moveTip(ev) {
    let tx = ev.clientX + 14, ty = ev.clientY - 28;
    if (tx + 240 > window.innerWidth - 8) tx = ev.clientX - 240 - 14;
    tipEl.style.left = tx + 'px'; tipEl.style.top = ty + 'px';
  }

  const svg = d3.select(container).append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('height', '100%').style('display', 'block');

  const gRoot = svg.append('g');

  function draw() {
    gRoot.selectAll('*').remove();
    if (drillContinent) drawDrill(drillContinent);
    else drawStrip();
  }

  /* ── Strip chart aggregato ─────────────────────────────────── */
  function drawStrip() {
    const MARGIN = { top: 44, right: 20, bottom: 36, left: 110 };
    const iw = W - MARGIN.left - MARGIN.right;
    const ih = H - MARGIN.top - MARGIN.bottom;

    const g = gRoot.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    const allDevs = filteredCountries.map(d => d.dev);
    const xExt    = d3.extent(allDevs);
    const xPad    = 0.05;
    const xS = d3.scaleLinear()
      .domain([Math.min(xExt[0] - xPad, -0.55), Math.max(xExt[1] + xPad, 0.25)])
      .range([0, iw]);

    const n     = contGroups.length;
    const bandH = ih / n;
    const DOT_R = 4.5;

    // Gridlines
    xS.ticks(8).forEach(t => {
      if (t === 0) return;
      g.append('line').attr('x1', xS(t)).attr('x2', xS(t)).attr('y1', 0).attr('y2', ih)
        .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
    });

    // Parity dashed line
    g.append('line').attr('x1', xS(0)).attr('x2', xS(0)).attr('y1', -8).attr('y2', ih)
      .attr('stroke', '#bbb').attr('stroke-width', 1).attr('stroke-dasharray', '4,3');

    // Direction labels
    g.append('text').attr('x', xS(-0.25)).attr('y', -28)
      .attr('text-anchor', 'middle').attr('font-size', 8.5).attr('fill', COL_GIRLS)
      .text('← bambine escluse (GPI < 1)');
    g.append('text').attr('x', xS(0.12)).attr('y', -28)
      .attr('text-anchor', 'middle').attr('font-size', 8.5).attr('fill', COL_BOYS)
      .text('bambini esclusi →');
    g.append('text').attr('x', xS(0)).attr('y', -14)
      .attr('text-anchor', 'middle').attr('font-size', 7.5).attr('fill', '#ccc')
      .text('0 (parità)');

    // X axis
    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xS).ticks(8).tickFormat(d => d === 0 ? '0' : d > 0 ? `+${d.toFixed(2)}` : d.toFixed(2)))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('.tick text').attr('font-size', 9).attr('fill', '#aaa');
        ax.selectAll('.tick line').attr('stroke', '#dde3ef');
      });

    contGroups.forEach((cg, i) => {
      const cy  = i * bandH + bandH / 2;
      const col = CONT_COLOR[cg.continent] || '#888';

      // Band dividers
      g.append('line').attr('x1', -MARGIN.left + 8).attr('x2', iw)
        .attr('y1', i * bandH).attr('y2', i * bandH)
        .attr('stroke', '#f0f0f0').attr('stroke-width', 1);

      // Click rect for whole band
      g.append('rect')
        .attr('x', 0).attr('y', i * bandH).attr('width', iw).attr('height', bandH)
        .attr('fill', 'transparent').style('cursor', 'pointer')
        .on('click', () => { drillContinent = cg.continent; draw(); });

      // Continent label
      g.append('text').attr('x', -8).attr('y', cy - 5)
        .attr('text-anchor', 'end').attr('font-size', 11).attr('font-weight', '700').attr('fill', col)
        .style('cursor', 'pointer')
        .text(cg.continent)
        .on('click', () => { drillContinent = cg.continent; draw(); });
      g.append('text').attr('x', -8).attr('y', cy + 9)
        .attr('text-anchor', 'end').attr('font-size', 7.5).attr('fill', '#ccc')
        .style('cursor', 'pointer')
        .text(`n=${cg.n} · click`)
        .on('click', () => { drillContinent = cg.continent; draw(); });

      // Mean tick
      g.append('line')
        .attr('x1', xS(cg.mean)).attr('x2', xS(cg.mean))
        .attr('y1', cy - bandH * 0.35).attr('y2', cy + bandH * 0.35)
        .attr('stroke', col).attr('stroke-width', 2).attr('opacity', 0.55);

      // Dots with bin-jitter
      const binSize = 0.02;
      const dotsByBin = new Map();
      cg.rows.forEach(d => {
        const bin = Math.round(d.dev / binSize);
        if (!dotsByBin.has(bin)) dotsByBin.set(bin, []);
        dotsByBin.get(bin).push(d);
      });
      const maxPerBin = d3.max([...dotsByBin.values()], v => v.length);
      const jitterScale = Math.min((bandH * 0.38) / Math.max(maxPerBin, 1), DOT_R * 2.4);

      cg.rows.forEach(d => {
        const bin    = Math.round(d.dev / binSize);
        const peers  = dotsByBin.get(bin);
        const rank   = peers.indexOf(d);
        const jitter = (rank - (peers.length - 1) / 2) * jitterScale;
        const fill   = d.dev < 0 ? COL_GIRLS : COL_BOYS;

        g.append('circle')
          .attr('cx', xS(d.dev)).attr('cy', cy + jitter)
          .attr('r', DOT_R).attr('fill', fill).attr('opacity', 0.68)
          .attr('stroke', '#fff').attr('stroke-width', 0.5)
          .style('cursor', 'pointer')
          .on('mouseover', function() {
            d3.select(this).attr('opacity', 1).attr('r', DOT_R + 1.5);
            tipEl.innerHTML =
              `<strong style="color:${fill}">${d.country}</strong><br>` +
              `GPI: ${d.gpi.toFixed(3)}&ensp;<em style="color:#aaa">${d.dev < 0 ? 'bambine escluse' : 'bambini esclusi'}</em><br>` +
              `<span style="color:#aaa">Anno:</span> ${d.year}<br>` +
              `<em style="color:#666;font-size:10px">Clicca per dettaglio</em>`;
            tipEl.style.display = 'block';
          })
          .on('mousemove', moveTip)
          .on('mouseleave', function() { d3.select(this).attr('opacity', 0.68).attr('r', DOT_R); hideTip(); })
          .on('click', () => { drillContinent = cg.continent; draw(); });
      });
    });

    // Bottom separator
    g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', ih).attr('y2', ih)
      .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
  }

  /* ── Drill-down paesi ──────────────────────────────────────── */
  function drawDrill(continent) {
    const countries = allCountries.filter(d => d.continent === continent)
      .sort((a, b) => a.dev - b.dev);
    const col = CONT_COLOR[continent] || '#888';
    const devs = countries.map(d => d.dev);

    // Dynamic bottom margin for rotated labels
    const labelFontSz = Math.max(7, Math.min(9, 260 / countries.length));
    const bottomM     = Math.min(130, Math.max(72, countries.length * 1.6));
    const MARGIN = { top: 52, right: 24, bottom: bottomM, left: 46 };
    const iw = W - MARGIN.left - MARGIN.right;
    const ih = H - MARGIN.top - MARGIN.bottom;

    // Proportional domain: space allocated to actual data range, not forced symmetric.
    // Zero always visible; space below/above proportional to data extent.
    const dMin  = d3.min(devs);
    const dMax  = d3.max(devs);
    const range = dMax - dMin;
    const pad   = Math.max(0.003, range * 0.07);
    const yLo   = (dMin < 0 ? dMin : -pad) - pad;
    const yHi   = (dMax > 0 ? dMax : +pad) + pad;
    const yS = d3.scaleLinear().domain([yLo, yHi]).range([ih, 0]).nice();
    const zeroY = yS(0);

    const xS = d3.scaleBand().domain(countries.map(d => d.code)).range([0, iw]).padding(0.15);
    const bw  = xS.bandwidth();

    const g = gRoot.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Back button (pill style, top-left)
    const backG = gRoot.append('g').attr('transform', 'translate(10,10)').style('cursor', 'pointer')
      .on('click', () => { drillContinent = null; draw(); });
    backG.append('rect').attr('rx', 6).attr('width', 128).attr('height', 26)
      .attr('fill', 'rgba(255,255,255,0.92)').attr('stroke', '#d0d8e8').attr('stroke-width', 1);
    backG.append('text').attr('x', 10).attr('y', 17)
      .attr('font-size', 11).attr('font-weight', '600').attr('fill', '#4a6fa5')
      .text('← Tutti i continenti');

    // Title / subtitle
    gRoot.append('text').attr('x', W / 2).attr('y', 26)
      .attr('text-anchor', 'middle').attr('font-size', 13).attr('font-weight', '700').attr('fill', col)
      .text(continent);
    gRoot.append('text').attr('x', W / 2).attr('y', 40)
      .attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#aaa')
      .text('rosso = bambine escluse · blu = bambini esclusi');

    // Gridlines
    yS.ticks(5).forEach(t => {
      g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t))
        .attr('stroke', Math.abs(t) < 1e-9 ? '#ccc' : '#f0f0f0')
        .attr('stroke-width', Math.abs(t) < 1e-9 ? 1.5 : 1)
        .attr('stroke-dasharray', Math.abs(t) < 1e-9 ? '5,3' : null);
    });

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yS).ticks(5).tickFormat(d => d === 0 ? '0' : d3.format('+.3f')(d)))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('.tick text').attr('font-size', 8).attr('fill', '#aaa');
        ax.selectAll('.tick line').attr('stroke', '#dde3ef');
      });
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -36)
      .attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#aaa')
      .text('Deviazione GPI dalla parità');

    // Bars
    const barSel = g.selectAll('.bar').data(countries).join('rect').attr('class', 'bar')
      .attr('x', d => xS(d.code))
      .attr('y', d => d.dev < 0 ? yS(d.dev) : zeroY)
      .attr('width', bw)
      .attr('height', d => Math.max(1, Math.abs(yS(d.dev) - zeroY)))
      .attr('fill', d => d.dev < 0 ? COL_GIRLS : COL_BOYS)
      .attr('opacity', 0.75).attr('rx', 1)
      .style('cursor', 'pointer')
      .on('mouseover', function(ev, d) {
        barSel.attr('opacity', 0.15);
        d3.select(this).attr('opacity', 1);
        const fill = d.dev < 0 ? COL_GIRLS : COL_BOYS;
        const oos  = oosMap.get(d.code);
        tipEl.innerHTML =
          `<strong style="color:${fill}">${d.country}</strong><br>` +
          `GPI: ${d.gpi.toFixed(3)}&ensp;<em style="color:#aaa">${d.dev < 0 ? 'bambine escluse' : 'bambini esclusi'}</em><br>` +
          (oos != null ? `Fuori scuola: ${d3.format(',.0f')(oos)}<br>` : '') +
          `<span style="color:#aaa">Anno:</span> ${d.year}`;
        tipEl.style.display = 'block';
      })
      .on('mousemove', moveTip)
      .on('mouseleave', function() { barSel.attr('opacity', 0.75); hideTip(); });

    // Country labels
    countries.forEach(d => {
      const cx = xS(d.code) + bw / 2;
      const fill = d.dev < 0 ? COL_GIRLS : COL_BOYS;
      g.append('text')
        .attr('transform', `translate(${cx},${ih + 5}) rotate(-45)`)
        .attr('text-anchor', 'end').attr('font-size', labelFontSz).attr('fill', fill)
        .style('pointer-events', 'none')
        .text(d.country.length > 15 ? d.country.slice(0, 14) + '…' : d.country);
    });
  }

  draw();

  container._bumpReset           = () => { drillContinent = null;     draw(); };
  container._bumpHighlightAfrica = () => { drillContinent = 'Africa'; draw(); };
  container._bumpHighlightEurope = () => { drillContinent = 'Europe'; draw(); };
}
