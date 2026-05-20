/* ============================================================
   Grafico 3-2 — GPI gap di genere nell'istruzione secondaria
   Overview : dot strip Africa / Europe (X = GPI deviation da 1)
   Drill-down: barre verticali per paese, linea parità a GPI = 1
               GPI < 1 → barra SOTTO la linea  (bambine escluse)
               GPI > 1 → barra SOPRA la linea  (bambini esclusi)
   ============================================================ */
async function renderQualityScatter(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const COL = { Africa: '#e07b39', Europe: '#5aab6e' };
  const COL_GIRLS = '#b04a4a';   // GPI < 1
  const COL_BOYS  = '#4a6fa5';   // GPI > 1
  const CONTS = ['Africa', 'Europe'];

  /* ── dati ───────────────────────────────────────────────── */
  const [gpiRaw, oosRaw] = await Promise.all([
    d3.csv('datasets/processed/gpi_secondary.csv', d3.autoType),
    d3.csv('datasets/processed/out_of_school.csv', d3.autoType),
  ]);

  const byCode = new Map();
  d3.group(gpiRaw, d => d.code).forEach((rows, code) => {
    const r = rows.filter(d => d.value != null).sort((a, b) => b.year - a.year)[0];
    if (r) byCode.set(code, { code: r.code, country: r.country, continent: r.continent, gpi: r.value, year: r.year });
  });
  const countries = Array.from(byCode.values()).filter(d => CONTS.includes(d.continent));

  const oosMap = new Map();
  d3.group(oosRaw, d => d.code).forEach((rows, code) => {
    const r = rows.filter(d => d.value != null).sort((a, b) => b.year - a.year)[0];
    if (r) oosMap.set(code, r.value);
  });

  /* ── layout base ────────────────────────────────────────── */
  const W = container.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 760);
  const H = container.clientHeight || (isFullscreen ? window.innerHeight * 0.82 : 480);

  /* ── tooltip ────────────────────────────────────────────── */
  let tip = document.getElementById('qs-tip');
  if (!tip) {
    tip = document.createElement('div'); tip.id = 'qs-tip';
    Object.assign(tip.style, { position:'fixed', display:'none', pointerEvents:'none',
      background:'rgba(20,20,40,0.92)', color:'#fff', padding:'7px 12px',
      borderRadius:'5px', fontSize:'11px', lineHeight:'1.6',
      zIndex:'10000', whiteSpace:'nowrap' });
    document.body.appendChild(tip);
  }
  const hideTip = () => { tip.style.display = 'none'; };
  const moveTip = ev => {
    let x = ev.clientX + 14, y = ev.clientY - 30;
    if (x + 250 > window.innerWidth) x = ev.clientX - 264;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  };

  const svg = d3.select(container).append('svg')
    .attr('width', W).attr('height', H)
    .style('width','100%').style('height','100%').style('display','block');
  const root = svg.append('g');

  let drill = null; // null = overview, string = continent name

  function draw() {
    root.selectAll('*').remove();
    drill ? drawDrill(drill) : drawOverview();
  }

  /* ════════════════════════════════════════════════════════
     OVERVIEW — dot strip
  ════════════════════════════════════════════════════════ */
  function drawOverview() {
    const M  = { top: 48, right: 28, bottom: 36, left: 96 };
    const iw = W - M.left - M.right;
    const ih = H - M.top - M.bottom;
    const g  = root.append('g').attr('transform', `translate(${M.left},${M.top})`);

    // X: GPI deviation (GPI - 1)
    const devs = countries.map(d => d.gpi - 1);
    const [dMin, dMax] = d3.extent(devs);
    const xS = d3.scaleLinear()
      .domain([Math.min(dMin - 0.04, -0.55), Math.max(dMax + 0.04, 0.24)])
      .range([0, iw]);

    const bandH = ih / CONTS.length;

    // gridlines
    xS.ticks(8).forEach(t => {
      if (Math.abs(t) < 1e-9) return;
      g.append('line').attr('x1',xS(t)).attr('x2',xS(t)).attr('y1',0).attr('y2',ih)
        .attr('stroke','#f0f0f0').attr('stroke-width',1);
    });

    // parity dashed line
    g.append('line').attr('x1',xS(0)).attr('x2',xS(0)).attr('y1',-10).attr('y2',ih)
      .attr('stroke','#bbb').attr('stroke-dasharray','4,3').attr('stroke-width',1);
    g.append('text').attr('x',xS(0)).attr('y',-22)
      .attr('text-anchor','middle').attr('font-size',8).attr('fill','#bbb').text('parità');

    // direction labels
    g.append('text').attr('x',xS(-0.22)).attr('y',-34)
      .attr('text-anchor','middle').attr('font-size',8.5).attr('fill',COL_GIRLS)
      .text('← bambine escluse (GPI < 1)');
    g.append('text').attr('x',xS(0.11)).attr('y',-34)
      .attr('text-anchor','middle').attr('font-size',8.5).attr('fill',COL_BOYS)
      .text('bambini esclusi →');

    // x axis
    g.append('g').attr('transform',`translate(0,${ih})`)
      .call(d3.axisBottom(xS).ticks(8)
        .tickFormat(d => d === 0 ? '0' : d > 0 ? `+${d.toFixed(2)}` : d.toFixed(2)))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('.tick text').attr('font-size',9).attr('fill','#aaa');
        ax.selectAll('.tick line').attr('stroke','#dde3ef');
      });

    // bands
    CONTS.forEach((cont, i) => {
      const rows  = countries.filter(d => d.continent === cont);
      const color = COL[cont];
      const cy    = i * bandH + bandH / 2;

      // divider
      if (i > 0) g.append('line').attr('x1',-M.left+8).attr('x2',iw)
        .attr('y1',i*bandH).attr('y2',i*bandH).attr('stroke','#f0f0f0');

      // stats per tooltip
      const gpis   = rows.map(d => d.gpi).sort(d3.ascending);
      const cMean  = d3.mean(gpis);
      const cMed   = d3.median(gpis);
      const cMin   = d3.min(gpis);
      const cMax   = d3.max(gpis);
      const nBelow = rows.filter(d => d.gpi < 1).length;
      const nAbove = rows.filter(d => d.gpi >= 1).length;

      const showContTip = ev => {
        tip.innerHTML =
          `<strong style="color:${color}">${cont}</strong>&ensp;<span style="color:#aaa">${rows.length} paesi</span><br>` +
          `<span style="color:#aaa">Media:</span> <strong>${cMean.toFixed(3)}</strong>&ensp;` +
          `<span style="color:#aaa">Mediana:</span> <strong>${cMed.toFixed(3)}</strong><br>` +
          `<span style="color:#aaa">Min:</span> ${cMin.toFixed(3)}&ensp;` +
          `<span style="color:#aaa">Max:</span> ${cMax.toFixed(3)}<br>` +
          `<span style="color:${COL_GIRLS}">▼ bambine escluse (GPI&lt;1):</span> ${nBelow}<br>` +
          `<span style="color:${COL_BOYS}">▲ bambini esclusi (GPI&gt;1):</span> ${nAbove}`;
        tip.style.display = 'block';
      };

      // click overlay
      g.append('rect').attr('x',0).attr('y',i*bandH).attr('width',iw).attr('height',bandH)
        .attr('fill','transparent').style('cursor','pointer')
        .on('mouseover', showContTip)
        .on('mousemove', moveTip)
        .on('mouseleave', hideTip)
        .on('click', () => { drill = cont; draw(); });

      // label
      g.append('text').attr('x',-8).attr('y',cy-5)
        .attr('text-anchor','end').attr('font-size',11).attr('font-weight','700').attr('fill',color)
        .style('cursor','pointer').text(cont)
        .on('click',() => { drill = cont; draw(); });
      g.append('text').attr('x',-8).attr('y',cy+9)
        .attr('text-anchor','end').attr('font-size',8).attr('fill','#ccc')
        .text(`n=${rows.length} · click`);

      // mean tick
      const mean = d3.mean(rows, d => d.gpi - 1);
      g.append('line')
        .attr('x1',xS(mean)).attr('x2',xS(mean))
        .attr('y1',cy - bandH*0.35).attr('y2',cy + bandH*0.35)
        .attr('stroke',color).attr('stroke-width',2).attr('opacity',0.5);

      // dots with bin jitter
      const binSz = 0.02;
      const bins  = new Map();
      rows.forEach(d => {
        const k = Math.round((d.gpi-1)/binSz);
        if (!bins.has(k)) bins.set(k,[]);
        bins.get(k).push(d);
      });
      const maxBin = d3.max([...bins.values()], v => v.length);
      const jScale = Math.min((bandH*0.38)/Math.max(maxBin,1), 9);

      rows.forEach(d => {
        const dev  = d.gpi - 1;
        const fill = color;
        const k    = Math.round(dev/binSz);
        const peers = bins.get(k);
        const rank  = peers.indexOf(d);
        const jit   = (rank - (peers.length-1)/2) * jScale;

        g.append('circle')
          .attr('cx', xS(dev)).attr('cy', cy + jit)
          .attr('r', 4.5).attr('fill', fill).attr('opacity', 0.68)
          .attr('stroke','#fff').attr('stroke-width',0.5)
          .style('cursor','pointer')
          .on('mouseover', function() {
            d3.select(this).attr('opacity',1).attr('r',6);
            tip.innerHTML =
              `<strong style="color:${color}">${d.country}</strong><br>` +
              `GPI: <strong>${d.gpi.toFixed(3)}</strong>&ensp;` +
              `<em style="color:#aaa">${dev<0?'bambine escluse':'bambini esclusi'}</em><br>` +
              `<span style="color:#aaa">Anno:</span> ${d.year}`;
            tip.style.display = 'block';
          })
          .on('mousemove', moveTip)
          .on('mouseleave', function() { d3.select(this).attr('opacity',0.68).attr('r',4.5); hideTip(); })
          .on('click', () => { drill = cont; draw(); });
      });
    });
  }

  /* ════════════════════════════════════════════════════════
     DRILL-DOWN — barre verticali con parità a 1
  ════════════════════════════════════════════════════════ */
  function drawDrill(cont) {
    const rows  = countries.filter(d => d.continent === cont).sort((a,b) => a.gpi - b.gpi);
    const color = COL[cont];
    const gpis  = rows.map(d => d.gpi);

    const M  = { top: 52, right: 80, bottom: 90, left: 48 };
    const iw = W - M.left - M.right;
    const ih = H - M.top  - M.bottom;

    // Symmetric domain around parity=1: min e max equidistanti → barre confrontabili
    const absMax = d3.max(gpis, d => Math.abs(d - 1.0));
    const pad    = absMax * 0.12;
    const yS     = d3.scaleLinear()
      .domain([1 - absMax - pad, 1 + absMax + pad])
      .range([ih, 0]);
    const parY = yS(1.0); // parity line = centro esatto

    const xS = d3.scaleBand().domain(rows.map(d => d.code)).range([0, iw]).padding(0.12);
    const bw  = xS.bandwidth();

    const g = root.append('g').attr('transform', `translate(${M.left},${M.top})`);

    /* back button */
    const back = root.append('g').attr('transform','translate(10,10)').style('cursor','pointer')
      .on('click', () => { drill = null; draw(); });
    back.append('rect').attr('rx',6).attr('width',130).attr('height',26)
      .attr('fill','rgba(255,255,255,0.92)').attr('stroke','#d0d8e8');
    back.append('text').attr('x',10).attr('y',17)
      .attr('font-size',11).attr('font-weight','600').attr('fill','#4a6fa5')
      .text('← Tutti i continenti');

    /* title */
    root.append('text').attr('x',W/2).attr('y',26)
      .attr('text-anchor','middle').attr('font-size',13).attr('font-weight','700').attr('fill',color)
      .text(cont);
    root.append('text').attr('x',W/2).attr('y',40)
      .attr('text-anchor','middle').attr('font-size',9).attr('fill','#aaa')
      .text('GPI < 1 → barra sotto (bambine escluse)   ·   GPI > 1 → barra sopra (bambini esclusi)');

    /* horizontal gridlines */
    yS.ticks(6).forEach(t => {
      const isPar = Math.abs(t - 1.0) < 1e-9;
      g.append('line').attr('x1',0).attr('x2',iw).attr('y1',yS(t)).attr('y2',yS(t))
        .attr('stroke', isPar ? '#999' : '#f0f0f0')
        .attr('stroke-width', isPar ? 1.5 : 1)
        .attr('stroke-dasharray', isPar ? '6,3' : null);
    });

    /* parity label */
    g.append('text').attr('x', iw + 5).attr('y', parY + 4)
      .attr('font-size',8.5).attr('fill','#999').text('1 (parità)');

    /* Y axis */
    g.append('g')
      .call(d3.axisLeft(yS).ticks(6).tickFormat(d3.format('.2f')))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('.tick text').attr('font-size',8).attr('fill','#aaa');
        ax.selectAll('.tick line').attr('stroke','#dde3ef');
      });
    g.append('text').attr('transform','rotate(-90)').attr('x',-ih/2).attr('y',-36)
      .attr('text-anchor','middle').attr('font-size',9).attr('fill','#aaa')
      .text('GPI (indice di parità di genere)');

    /* hit areas: colonna intera invisibile, cattura hover anche sopra/sotto la barra */
    const showTipFor = (d) => {
      barSel.attr('opacity', 0.15);
      barSel.filter(b => b.code === d.code).attr('opacity', 1);
      const fill = d.gpi < 1 ? COL_GIRLS : COL_BOYS;
      const oos  = oosMap.get(d.code);
      tip.innerHTML =
        `<strong style="color:${fill}">${d.country}</strong><br>` +
        `GPI: <strong>${d.gpi.toFixed(3)}</strong>&ensp;` +
        `<em style="color:#aaa">${d.gpi<1?'bambine escluse':'bambini esclusi'}</em>` +
        (oos != null ? `<br>Fuori scuola: ${d3.format(',.0f')(oos)}` : '') +
        `<br><span style="color:#aaa">Anno:</span> ${d.year}`;
      tip.style.display = 'block';
    };

    g.selectAll('.hit').data(rows).join('rect').attr('class','hit')
      .attr('x', d => xS(d.code))
      .attr('y', 0)
      .attr('width', bw)
      .attr('height', ih)
      .attr('fill', 'transparent')
      .style('cursor','pointer')
      .on('mouseover', (ev, d) => showTipFor(d))
      .on('mousemove', moveTip)
      .on('mouseleave', () => { barSel.attr('opacity', 0.78); hideTip(); });

    /* bars */
    const barSel = g.selectAll('.bar').data(rows).join('rect').attr('class','bar')
      .attr('x', d => xS(d.code))
      .attr('y', d => Math.min(yS(d.gpi), parY))
      .attr('width', bw)
      .attr('height', d => Math.max(1, Math.abs(yS(d.gpi) - parY)))
      .attr('fill', d => d.gpi < 1 ? COL_GIRLS : COL_BOYS)
      .attr('opacity', 0.78).attr('rx', 1)
      .style('cursor','pointer')
      .on('mouseover', (ev, d) => showTipFor(d))
      .on('mousemove', moveTip)
      .on('mouseleave', () => { barSel.attr('opacity', 0.78); hideTip(); });

    /* labels: tutti i paesi, testo verticale -90° */
    const labelFsz = Math.max(6.5, Math.min(8.5, bw * 0.75));
    rows.forEach(d => {
      const cx   = xS(d.code) + bw / 2;
      const fill = d.gpi < 1 ? COL_GIRLS : COL_BOYS;
      g.append('text')
        .attr('transform', `translate(${cx},${ih + 4}) rotate(-90)`)
        .attr('text-anchor','end').attr('dominant-baseline','middle')
        .attr('font-size', labelFsz).attr('fill', fill)
        .style('pointer-events','none')
        .text(d.country.length > 16 ? d.country.slice(0,15)+'…' : d.country);
    });
  }

  draw();

  container._bumpReset           = () => { drill = null;     draw(); };
  container._bumpHighlightAfrica = () => { drill = 'Africa'; draw(); };
  container._bumpHighlightEurope = () => { drill = 'Europe'; draw(); };
}
