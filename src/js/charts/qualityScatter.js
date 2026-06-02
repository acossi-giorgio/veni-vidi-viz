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

  const COL = {
    Africa: getContinentColor('Africa', '#c96a3d'),
    Europe: getContinentColor('Europe', '#5169b2'),
  };
  const COL_GIRLS = getUiColor('genderGirls', '#b05058');   // GPI < 1
  const COL_BOYS  = getUiColor('genderBoys', '#5a7fbe');    // GPI > 1
  const CHART_GRID = getUiColor('chartGrid', '#e8e1d7');
  const CHART_AXIS = getUiColor('chartAxis', '#a49788');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const TOOLTIP_BG = getUiColor('chartTooltipBg', 'rgba(28, 25, 23, 0.94)');
  const TOOLTIP_INK = getUiColor('chartTooltipInk', '#fffdf8');
  const CONTS = ['Africa', 'Europe'];

  const ALL_COUNTRIES = {
    Africa: [
      {code:'DZA',country:'Algeria'},{code:'AGO',country:'Angola'},{code:'BEN',country:'Benin'},
      {code:'BWA',country:'Botswana'},{code:'BFA',country:'Burkina Faso'},{code:'BDI',country:'Burundi'},
      {code:'CPV',country:'Cabo Verde'},{code:'CMR',country:'Cameroon'},{code:'CAF',country:'Central African Rep.'},
      {code:'TCD',country:'Chad'},{code:'COM',country:'Comoros'},{code:'COG',country:'Congo'},
      {code:'COD',country:'DR Congo'},{code:'DJI',country:'Djibouti'},{code:'EGY',country:'Egypt'},
      {code:'GNQ',country:'Equatorial Guinea'},{code:'ERI',country:'Eritrea'},{code:'SWZ',country:'Eswatini'},
      {code:'ETH',country:'Ethiopia'},{code:'GAB',country:'Gabon'},{code:'GMB',country:'Gambia'},
      {code:'GHA',country:'Ghana'},{code:'GIN',country:'Guinea'},{code:'GNB',country:'Guinea-Bissau'},
      {code:'CIV',country:"Cote d'Ivoire"},{code:'KEN',country:'Kenya'},{code:'LSO',country:'Lesotho'},
      {code:'LBR',country:'Liberia'},{code:'LBY',country:'Libya'},{code:'MDG',country:'Madagascar'},
      {code:'MWI',country:'Malawi'},{code:'MLI',country:'Mali'},{code:'MRT',country:'Mauritania'},
      {code:'MUS',country:'Mauritius'},{code:'MAR',country:'Morocco'},{code:'MOZ',country:'Mozambique'},
      {code:'NAM',country:'Namibia'},{code:'NER',country:'Niger'},{code:'NGA',country:'Nigeria'},
      {code:'RWA',country:'Rwanda'},{code:'STP',country:'Sao Tome and Pr.'},{code:'SEN',country:'Senegal'},
      {code:'SYC',country:'Seychelles'},{code:'SLE',country:'Sierra Leone'},{code:'SOM',country:'Somalia'},
      {code:'ZAF',country:'South Africa'},{code:'SSD',country:'South Sudan'},{code:'SDN',country:'Sudan'},
      {code:'TZA',country:'Tanzania'},{code:'TGO',country:'Togo'},{code:'TUN',country:'Tunisia'},
      {code:'UGA',country:'Uganda'},{code:'ZMB',country:'Zambia'},{code:'ZWE',country:'Zimbabwe'},
    ],
    Europe: [
      {code:'ALB',country:'Albania'},{code:'AND',country:'Andorra'},{code:'AUT',country:'Austria'},
      {code:'BEL',country:'Belgium'},{code:'BIH',country:'Bosnia and Herz.'},{code:'BGR',country:'Bulgaria'},
      {code:'BLR',country:'Belarus'},{code:'HRV',country:'Croatia'},{code:'CYP',country:'Cyprus'},
      {code:'CZE',country:'Czechia'},{code:'DNK',country:'Denmark'},{code:'EST',country:'Estonia'},
      {code:'FIN',country:'Finland'},{code:'FRA',country:'France'},{code:'DEU',country:'Germany'},
      {code:'GRC',country:'Greece'},{code:'HUN',country:'Hungary'},{code:'ISL',country:'Iceland'},
      {code:'IRL',country:'Ireland'},{code:'ITA',country:'Italy'},{code:'XKX',country:'Kosovo'},
      {code:'LVA',country:'Latvia'},{code:'LIE',country:'Liechtenstein'},{code:'LTU',country:'Lithuania'},
      {code:'LUX',country:'Luxembourg'},{code:'MLT',country:'Malta'},{code:'MDA',country:'Moldova'},
      {code:'MCO',country:'Monaco'},{code:'MNE',country:'Montenegro'},{code:'NLD',country:'Netherlands'},
      {code:'MKD',country:'North Macedonia'},{code:'NOR',country:'Norway'},{code:'POL',country:'Poland'},
      {code:'PRT',country:'Portugal'},{code:'ROU',country:'Romania'},{code:'RUS',country:'Russia'},
      {code:'SMR',country:'San Marino'},{code:'SRB',country:'Serbia'},{code:'SVK',country:'Slovakia'},
      {code:'SVN',country:'Slovenia'},{code:'ESP',country:'Spain'},{code:'SWE',country:'Sweden'},
      {code:'CHE',country:'Switzerland'},{code:'UKR',country:'Ukraine'},{code:'GBR',country:'United Kingdom'},
    ],
  };

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
  const compact = isFullscreen && (W < 760 || H < 420);
  const veryCompact = isFullscreen && (W < 620 || H < 360);
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  /* ── tooltip ────────────────────────────────────────────── */
  let tip = document.getElementById('qs-tip');
  if (!tip) {
    tip = document.createElement('div'); tip.id = 'qs-tip';
    Object.assign(tip.style, { position:'fixed', display:'none', pointerEvents:'none',
      background:TOOLTIP_BG, color:TOOLTIP_INK, padding:'10px 14px',
      borderRadius:'8px', border:'1px solid rgba(255,255,255,0.08)',
      boxShadow:'0 10px 28px rgba(16,18,34,0.35)',
      fontSize:'12px', lineHeight:'1.65',
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
    .style('width','100%').style('height','100%').style('display','block')
      .style('background', getCssToken('surface-raised', '#ffffff'));
  const root = svg.append('g');

  let drill = null; // null = overview, string = continent name

  function centerOutDelay(dev, maxAbsDev, duration = 760) {
    if (prefersReducedMotion || !Number.isFinite(dev) || !Number.isFinite(maxAbsDev) || maxAbsDev <= 0) return 0;
    const normalized = Math.min(1, Math.abs(dev) / maxAbsDev);
    return Math.log1p(normalized * 9) / Math.log1p(9) * duration;
  }

  function renderCurrentView(options = {}) {
    const { animateDrillBars = true } = options;
    root.selectAll('*').remove();
    d3.select(container).selectAll('button.qs-back').remove();
    drill ? drawDrill(drill, { animateBars: animateDrillBars }) : drawOverview();
  }

  function draw() {
    const animateDrillBars = true;
    if (window.runChartViewTransition && !drill) {
      window.runChartViewTransition(container, () => renderCurrentView({ animateDrillBars }), {
        duration: 170,
        enterDuration: 300,
        offsetY: 8
      });
      return;
    }
    renderCurrentView({ animateDrillBars });
  }

  /* ════════════════════════════════════════════════════════
     OVERVIEW — dot strip
  ════════════════════════════════════════════════════════ */
  function drawOverview() {
    const M  = compact
      ? { top: 28, right: 14, bottom: 38, left: veryCompact ? 62 : 76 }
      : { top: 32, right: 28, bottom: 44, left: 110 };
    const iw = W - M.left - M.right;
    const ih = H - M.top - M.bottom;
    const g  = root.append('g').attr('transform', `translate(${M.left},${M.top})`);

    const devs = countries.map(d => d.gpi - 1);
    const [dMin, dMax] = d3.extent(devs);
    const maxAbsDev = d3.max(devs, d => Math.abs(d)) || 1;
    const xS = d3.scaleLinear()
      .domain([Math.min(dMin - 0.04, -0.55), Math.max(dMax + 0.04, 0.24)])
      .range([0, iw]);

    const bandH = ih / CONTS.length;
    const DOT_R = 6;

    // colored zones: left = bambine escluse, right = bambini esclusi
    const parX = xS(0);

    // zone labels — top of each zone
    g.append('text').attr('x', parX / 2).attr('y', 14)
      .attr('text-anchor','middle').attr('font-size',compact ? 9 : 10).attr('font-weight','600')
      .attr('fill', COL_GIRLS).attr('opacity', 0.7).style('pointer-events','none')
      .text('più bambini a scuola');
    g.append('text').attr('x', parX + (iw - parX) / 2).attr('y', 14)
      .attr('text-anchor','middle').attr('font-size',compact ? 9 : 10).attr('font-weight','600')
      .attr('fill', COL_BOYS).attr('opacity', 0.7).style('pointer-events','none')
      .text('più bambine a scuola');

    // gridlines
    xS.ticks(8).forEach(t => {
      if (Math.abs(t) < 1e-9) return;
      g.append('line').attr('x1',xS(t)).attr('x2',xS(t)).attr('y1',0).attr('y2',ih)
        .attr('stroke',colorToRgba(getCssToken('ink', '#1f1d1a'), 0.08)).attr('stroke-width',1);
    });

    // parity dashed line + label
    g.append('line').attr('x1',parX).attr('x2',parX).attr('y1',0).attr('y2',ih)
      .attr('stroke',CHART_AXIS).attr('stroke-dasharray','4,3').attr('stroke-width',1.5);
    g.append('text').attr('x',parX).attr('y',-10)
      .attr('text-anchor','middle').attr('font-size',compact ? 8 : 9).attr('fill',CHART_AXIS).text('parità');

    // x axis
    g.append('g').attr('transform',`translate(0,${ih})`)
      .call(d3.axisBottom(xS).ticks(8)
        .tickFormat(d => d === 0 ? '0' : d > 0 ? `+${d.toFixed(2)}` : d.toFixed(2)))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('.tick text').attr('font-size',compact ? 8.5 : 10).attr('fill',CHART_AXIS);
        ax.selectAll('.tick line').attr('stroke',UI_MUTED_BORDER);
      });

    // bands
    CONTS.forEach((cont, i) => {
      const rows  = countries.filter(d => d.continent === cont);
      const color = COL[cont];
      const cy    = i * bandH + bandH / 2;
      // Center labels in the left gutter (between margin start and plot start)
      const labelX = (-M.left / 2) + (compact ? 2 : 4);


      // divider
      if (i > 0) g.append('line').attr('x1',-M.left+8).attr('x2',iw)
        .attr('y1',i*bandH).attr('y2',i*bandH).attr('stroke',CHART_GRID);

      // stats per tooltip
      const gpis   = rows.map(d => d.gpi).sort(d3.ascending);
      const cMean  = d3.mean(gpis);
      const cMed   = d3.median(gpis);
      const cMin   = d3.min(gpis);
      const cMax   = d3.max(gpis);
      const nBelow = rows.filter(d => d.gpi < 1).length;
      const nAbove = rows.filter(d => d.gpi >= 1).length;

      const showContTip = () => {
        tip.innerHTML =
          `<strong style="color:${color}">${cont}</strong>&ensp;<span style="color:${CHART_AXIS}">${rows.length} paesi</span><br>` +
          `<span style="color:${CHART_AXIS}">Media:</span> <strong>${cMean.toFixed(3)}</strong>&ensp;` +
          `<span style="color:${CHART_AXIS}">Mediana:</span> <strong>${cMed.toFixed(3)}</strong><br>` +
          `<span style="color:${CHART_AXIS}">Min:</span> ${cMin.toFixed(3)}&ensp;` +
          `<span style="color:${CHART_AXIS}">Max:</span> ${cMax.toFixed(3)}<br>` +
          `<span style="color:${COL_GIRLS}">▼ bambine escluse (GPI&lt;1):</span> ${nBelow}&ensp;` +
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

      // continent label
      g.append('text').attr('x',labelX).attr('y',cy)
        .attr('text-anchor','middle').attr('dominant-baseline','middle')
        .attr('font-size',compact ? 11 : 13).attr('font-weight','700').attr('fill',color)
        .style('cursor','pointer').text(cont)
        .on('click',() => { drill = cont; draw(); });

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
      const jScale = Math.min((bandH*0.38)/Math.max(maxBin,1), DOT_R * 2.2);

      rows.forEach(d => {
        const dev  = d.gpi - 1;
        const fill = color;
        const k    = Math.round(dev/binSz);
        const peers = bins.get(k);
        const rank  = peers.indexOf(d);
        const jit   = (rank - (peers.length-1)/2) * jScale;

        g.append('circle')
          .attr('cx', xS(dev)).attr('cy', cy + jit)
          .attr('r', 0).attr('fill', fill).attr('opacity', 0)
          .attr('stroke','#fff').attr('stroke-width',0.8)
          .style('cursor','pointer')
          .on('mouseover', function() {
            d3.select(this).attr('opacity',1).attr('r', DOT_R + 2);
            tip.innerHTML =
              `<strong style="color:${color}">${d.country}</strong><br>` +
              `GPI: <strong>${d.gpi.toFixed(3)}</strong>&ensp;` +
              `<em style="color:${CHART_AXIS}">${dev<0?'bambine escluse':'bambini esclusi'}</em><br>` +
              `<span style="color:${CHART_AXIS}">Anno:</span> ${d.year}`;
            tip.style.display = 'block';
          })
          .on('mousemove', moveTip)
          .on('mouseleave', function() { d3.select(this).attr('opacity',0.68).attr('r', DOT_R); hideTip(); })
          .on('click', () => { drill = cont; draw(); })
          .transition()
          .delay(centerOutDelay(dev, maxAbsDev))
          .duration(prefersReducedMotion ? 0 : 420)
          .ease(d3.easeCubicOut)
          .attr('r', DOT_R).attr('opacity', 0.68);
      });
    });

  }

  /* ════════════════════════════════════════════════════════
     DRILL-DOWN — barre verticali con parità a 1
  ════════════════════════════════════════════════════════ */
  function drawDrill(cont, options = {}) {
    const { animateBars: shouldAnimateBars = true } = options;
    const rows  = countries.filter(d => d.continent === cont).sort((a,b) => a.gpi - b.gpi);
    const color = COL[cont];
    const gpis  = rows.map(d => d.gpi);

    const M  = compact
      ? { top: 44, right: 14, bottom: 74, left: 42 }
      : { top: 52, right: 30, bottom: 90, left: 52 };
    const iw = W - M.left - M.right;
    const ih = H - M.top  - M.bottom;

    // Fixed domain [0.6, 1.4] — same for all continents so drill-downs are comparable
    const yS = d3.scaleLinear()
      .domain([0.6, 1.4])
      .range([ih, 0]);
    const parY = yS(1.0); // parity line = centro esatto

    const xS = d3.scaleBand().domain(rows.map(d => d.code)).range([0, iw]).padding(0.12);
    const bw  = xS.bandwidth();

    const g = root.append('g').attr('transform', `translate(${M.left},${M.top})`);

    /* back button — rectangular text style matching chart 1 */
    const backBtn = d3.select(container).append('button')
      .attr('class', 'chart-back-btn chart-back-btn--icon qs-back')
      .attr('aria-label', 'Torna alla vista di tutti i continenti')
      .attr('title', 'Torna alla vista di tutti i continenti')
      .style('position', 'absolute').style('top', compact ? '6px' : '8px').style('left', compact ? '6px' : '8px')
      .style('display', 'inline-flex')
      .style('z-index', '10')
      .html('<span class="chart-back-icon" aria-hidden="true"></span>')
      .on('click', () => { backBtn.remove(); drill = null; draw(); });

    /* title */
    root.append('text').attr('x',W/2).attr('y',26)
      .attr('text-anchor','middle').attr('font-size',compact ? 11 : 13).attr('font-weight','700').attr('fill',color)
      .text(cont);
    root.append('text').attr('x',W/2).attr('y',40)
      .attr('text-anchor','middle').attr('font-size',compact ? 8 : 9).attr('fill',CHART_AXIS)
      .text('GPI < 1 → barra sotto (bambine escluse)   ·   GPI > 1 → barra sopra (bambini esclusi)');

    /* horizontal gridlines */
    yS.ticks(6).forEach(t => {
      const isPar = Math.abs(t - 1.0) < 1e-9;
      g.append('line').attr('x1',0).attr('x2',iw).attr('y1',yS(t)).attr('y2',yS(t))
        .attr('stroke', isPar ? CHART_AXIS : CHART_GRID)
        .attr('stroke-width', isPar ? 1.5 : 1)
        .attr('stroke-dasharray', isPar ? '6,3' : null);
    });

    /* parity label */
    g.append('text').attr('x', iw + 5).attr('y', parY + 4)
      .attr('font-size',compact ? 7.5 : 8.5).attr('fill',CHART_AXIS).text('1 (parità)');

    /* Y axis */
    g.append('g')
      .call(d3.axisLeft(yS).ticks(6).tickFormat(d3.format('.2f')))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('.tick text').attr('font-size',8).attr('fill',CHART_AXIS);
        ax.selectAll('.tick line').attr('stroke',UI_MUTED_BORDER);
      });
    g.append('text').attr('transform','rotate(-90)').attr('x',-ih/2).attr('y',-36)
      .attr('text-anchor','middle').attr('font-size',compact ? 8 : 9).attr('fill',CHART_AXIS)
      .text('GPI (indice di parità di genere)');

    /* bars */
    const BASE_BAR_OPACITY = 0.78;
    const INACTIVE_BAR_OPACITY = 0.22;
    const animateBars = shouldAnimateBars && !prefersReducedMotion;
    const barSel = g.selectAll('.bar').data(rows).join('rect').attr('class','bar')
      .attr('x', d => xS(d.code))
      .attr('y', animateBars ? d => d.gpi >= 1 ? parY - 1 : parY : d => Math.min(yS(d.gpi), parY))
      .attr('width', bw)
      .attr('height', animateBars ? 1 : d => Math.max(1, Math.abs(yS(d.gpi) - parY)))
      .attr('fill', d => d.gpi < 1 ? COL_GIRLS : COL_BOYS)
      .attr('opacity', BASE_BAR_OPACITY).attr('rx', 1)
      .style('cursor','pointer');

    if (animateBars) {
      barSel.transition('bar-grow')
        .duration(620)
        .ease(d3.easeCubicOut)
        .attr('y', d => Math.min(yS(d.gpi), parY))
        .attr('height', d => Math.max(1, Math.abs(yS(d.gpi) - parY)));
    }

    /* labels: tutti i paesi, testo verticale -90° */
    const labelFsz = Math.max(6, Math.min(compact ? 7.5 : 8.5, bw * (compact ? 0.68 : 0.75)));
    const labelSel = g.selectAll('.x-label').data(rows).join('text').attr('class', 'x-label')
      .attr('transform', d => `translate(${xS(d.code) + bw / 2},${ih + 4}) rotate(-90)`)
      .attr('text-anchor','end').attr('dominant-baseline','middle')
      .attr('font-size', labelFsz)
      .attr('fill', d => d.gpi < 1 ? COL_GIRLS : COL_BOYS)
      .attr('opacity', 0.9)
      .style('pointer-events','none')
      .text(d => d.country.length > 16 ? d.country.slice(0,15)+'…' : d.country);

    /* hit areas: colonna intera invisibile, cattura hover anche sopra/sotto la barra */
    const hitSel = g.selectAll('.hit').data(rows).join('rect').attr('class','hit')
      .attr('x', d => xS(d.code))
      .attr('y', 0)
      .attr('width', bw)
      .attr('height', ih)
      .attr('fill', 'transparent')
      .style('cursor','pointer');

    let activeCode = null;
    const highlightCode = (code) => {
      if (activeCode === code) return;
      activeCode = code;
      barSel.interrupt('bar-highlight').transition('bar-highlight').duration(130)
        .attr('opacity', d => d.code === code ? 1 : INACTIVE_BAR_OPACITY)
        .attr('stroke', d => d.code === code ? '#ffffff' : 'none')
        .attr('stroke-width', d => d.code === code ? 1.2 : 0);
      labelSel.interrupt('label-highlight').transition('label-highlight').duration(130)
        .attr('opacity', d => d.code === code ? 1 : 0.62)
        .attr('font-weight', d => d.code === code ? '700' : null);
    };

    const clearHighlight = () => {
      activeCode = null;
      barSel.interrupt('bar-highlight').transition('bar-highlight').duration(130)
        .attr('opacity', BASE_BAR_OPACITY)
        .attr('stroke', 'none')
        .attr('stroke-width', 0);
      labelSel.interrupt('label-highlight').transition('label-highlight').duration(130)
        .attr('opacity', 0.9)
        .attr('font-weight', null);
    };

    const showTipFor = (d) => {
      const fill = d.gpi < 1 ? COL_GIRLS : COL_BOYS;
      const oos  = oosMap.get(d.code);
      tip.innerHTML =
        `<strong style="color:${fill}">${d.country}</strong><br>` +
        `GPI: <strong>${d.gpi.toFixed(3)}</strong>&ensp;` +
        `<em style="color:${CHART_AXIS}">${d.gpi<1?'bambine escluse':'bambini esclusi'}</em>` +
        (oos != null ? `<br>Fuori scuola: ${d3.format(',.0f')(oos)}` : '') +
        `<br><span style="color:${CHART_AXIS}">Anno:</span> ${d.year}`;
      tip.style.display = 'block';
    };

    const onHover = (ev, d) => {
      highlightCode(d.code);
      showTipFor(d);
      moveTip(ev);
    };

    hitSel.on('mouseover', onHover)
      .on('mousemove', onHover)
      .on('mouseleave', () => { clearHighlight(); hideTip(); });

    barSel.on('mouseover', onHover)
      .on('mousemove', onHover)
      .on('mouseleave', () => { clearHighlight(); hideTip(); });
  }

  draw();

  container._bumpReset           = () => { drill = null;     draw(); };
  container._bumpHighlightAfrica = () => { drill = 'Africa'; draw(); };
  container._bumpHighlightEurope = () => { drill = 'Europe'; draw(); };
  container._getHelpContext = () => ({
    drill,
  });
}
