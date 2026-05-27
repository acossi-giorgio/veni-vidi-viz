/* ============================================================
   Grafico 2-1 (Atto I) — MPI Africa: distribuzione o ranking
   Toggle: istogramma ↔ barre orizzontali per paese
   ============================================================ */
async function renderMpiBreakdown(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const COL_AFRICA = '#e07b39';

  // All 54 recognized African sovereign states
  const ALL_AFRICA = [
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
  ];

  const raw = await d3.csv('datasets/processed/mpi.csv', d3.autoType);

  const latestMap = new Map();
  d3.group(raw, d => d.code).forEach((rows, code) => {
    const r = rows.filter(d => d.value != null).sort((a, b) => b.year - a.year)[0];
    if (r) latestMap.set(code, r);
  });
  const africa = Array.from(latestMap.values())
    .filter(d => d.continent === 'Africa')
    .sort((a, b) => b.value - a.value);

  const africaCodes = new Set(africa.map(d => d.code));
  const noData = ALL_AFRICA.filter(c => !africaCodes.has(c.code));

  let mode     = 'africa'; // 'africa' | 'severe'
  let viewType = 'dist';   // 'dist' | 'rank'

  const W = container.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 760);
  const H = container.clientHeight || (isFullscreen ? window.innerHeight * 0.82 : 480);
  const compact = isFullscreen && (W < 760 || H < 420);
  const veryCompact = isFullscreen && (W < 620 || H < 360);

  // ── Toggle pills (top-left) ────────────────────────────────
  const toggleBar = d3.select(container).append('div')
    .style('position', 'absolute').style('top', compact ? '8px' : '10px').style('left', compact ? '8px' : '10px')
    .style('display', 'flex').style('background', 'rgba(255,255,255,0.92)')
    .style('border-radius', compact ? '8px' : '9px').style('border', '1px solid #d0d8e8')
    .style('padding', compact ? '2px' : '3px').style('gap', '2px').style('z-index', '20')
    .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)');

  function makeToggleBtn(label, val) {
    return toggleBar.append('button')
      .style('font-size', compact ? '10px' : '11px').style('padding', compact ? '4px 10px' : '5px 14px')
      .style('border-radius', compact ? '5px' : '6px').style('border', 'none').style('cursor', 'pointer')
      .style('font-weight', '600').style('transition', 'all 0.15s')
      .text(label)
      .on('click', () => { viewType = val; updateToggle(); draw(); });
  }

  const btnDist = makeToggleBtn('Distribuzione', 'dist');
  const btnRank = makeToggleBtn('Ranking', 'rank');

  function updateToggle() {
    [[btnDist, 'dist'], [btnRank, 'rank']].forEach(([btn, val]) => {
      const active = viewType === val;
      btn.style('background', active ? '#4a6fa5' : 'transparent')
         .style('color', active ? '#fff' : '#7a8aaa')
         .style('box-shadow', active ? '0 1px 4px rgba(74,111,165,0.3)' : 'none');
    });
  }
  updateToggle();

  // ── Layout constants ────────────────────────────────────────
  const PILL_H    = compact ? 42 : 48;
  const AXIS_H    = compact ? 30 : 36;
  const MIN_BAR_H = 10;
  const ND_ROW_H  = 11; // no-data row height in rank
  const ND_PAD    = 20; // padding above no-data section
  const MARGIN_DIST = compact
    ? { top: 26, right: 14, bottom: 46, left: 42 }
    : { top: 32, right: 24, bottom: 56, left: 52 };
  const MARGIN_RANK = compact
    ? { top: 8,  right: 16, bottom: 0,  left: veryCompact ? 86 : 96 }
    : { top: 8,  right: 24, bottom: 0,  left: 124 };

  // Scrollable area
  const scrollWrap = d3.select(container).append('div')
    .style('position', 'absolute').style('top', PILL_H + 'px').style('left', '0')
    .style('width', '100%').style('height', `calc(100% - ${PILL_H}px)`)
    .style('overflow-y', 'auto').style('overflow-x', 'hidden');

  const svg = scrollWrap.append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('display', 'block');

  const g = svg.append('g');

  // Fixed X-axis strip for rank view
  const axisDiv = d3.select(container).append('div')
    .style('position', 'absolute').style('bottom', '0').style('left', '0')
    .style('width', '100%').style('height', AXIS_H + 'px')
    .style('background', '#fff').style('border-top', '1px solid #f0f0f0')
    .style('display', 'none').style('z-index', '10');

  const axisSvg = axisDiv.append('svg')
    .attr('width', W).attr('height', AXIS_H)
    .style('width', '100%').style('display', 'block');

  let tipEl = document.getElementById('mpi-hist-tip');
  if (!tipEl) {
    tipEl = document.createElement('div'); tipEl.id = 'mpi-hist-tip';
    Object.assign(tipEl.style, {
      position: 'fixed', display: 'none', pointerEvents: 'none',
      background: 'rgba(20,20,40,0.93)', color: '#fff',
      padding: '8px 12px', borderRadius: '6px', fontSize: '11px',
      lineHeight: '1.65', zIndex: '10000', maxWidth: '220px', whiteSpace: 'normal',
    });
    document.body.appendChild(tipEl);
  }

  // ── No-data section renderer ────────────────────────────────
  // Rank: ghost rows below main bars. Dist: chip grid below chart.
  function appendNoDataRankRows(parent, yStart, barRowH, marginLeft, iw) {
    if (!noData.length) return;
    const fontSize = Math.max(compact ? 6.5 : 7, Math.min(compact ? 8.5 : 9, barRowH));

    parent.append('line')
      .attr('x1', -marginLeft + 8).attr('x2', iw)
      .attr('y1', yStart + ND_PAD / 2).attr('y2', yStart + ND_PAD / 2)
      .attr('stroke', '#e8e8e8').attr('stroke-dasharray', '4,3').attr('stroke-width', 1);

    noData.forEach((d, i) => {
      const y = yStart + ND_PAD + i * (barRowH + 3);
      parent.append('text')
        .attr('x', -5).attr('y', y + barRowH / 2)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('font-size', fontSize).attr('fill', '#ccc').attr('font-style', 'italic')
        .style('pointer-events', 'none')
        .text(d.country.length > (veryCompact ? 13 : compact ? 15 : 18)
          ? d.country.slice(0, veryCompact ? 12 : compact ? 14 : 17) + '…'
          : d.country);

    });
  }

  function appendNoDataDistChips(parent, iw, yStart) {
    if (!noData.length) return;

    const cols = veryCompact ? 2 : compact ? 3 : 4;
    const colW = iw / cols;
    noData.forEach((d, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * colW;
      const y = yStart + 12 + row * 14;
      parent.append('text')
        .attr('x', x).attr('y', y)
        .attr('font-size', compact ? 7 : 8).attr('fill', '#bbb').attr('font-style', 'italic')
        .text(d.country);
    });
  }

  function draw() {
    g.selectAll('*').remove();
    axisSvg.selectAll('*').remove();
    if (viewType === 'dist') {
      axisDiv.style('display', 'none');
      scrollWrap.style('height', `calc(100% - ${PILL_H}px)`).style('overflow-y', 'hidden');
      drawDist();
    } else {
      axisDiv.style('display', 'block');
      scrollWrap.style('height', `calc(100% - ${PILL_H}px - ${AXIS_H}px)`);
      drawRank();
    }
  }

  /* ── Distribuzione (istogramma) ─────────────────────────── */
  function drawDist() {
    const ndRows = Math.ceil(noData.length / (veryCompact ? 2 : compact ? 3 : 4));
    const ndH    = noData.length ? 12 + ndRows * 14 + 8 : 0;
    const M  = { ...MARGIN_DIST, bottom: MARGIN_DIST.bottom + ndH };
    const iw = W - M.left - M.right;
    const ih = H - PILL_H - M.top - M.bottom;

    svg.attr('height', H - PILL_H).style('height', '100%');
    g.attr('transform', `translate(${M.left},${M.top})`);

    const severeCut = mode === 'severe' ? 0.30 : null;
    const xMax = d3.max(africa, d => d.value);
    const xS   = d3.scaleLinear().domain([0, Math.ceil(xMax * 20) / 20]).range([0, iw]).nice();
    const binGen     = d3.bin().value(d => d.value).domain(xS.domain()).thresholds(xS.ticks(16));
    const africaBins = binGen(africa);
    const yMax = d3.max(africaBins, b => b.length);
    const yS   = d3.scaleLinear().domain([0, yMax + 1]).range([ih, 0]).nice();

    yS.ticks(5).forEach(t => {
      g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t))
        .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
    });

    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xS).ticks(compact ? 7 : 10).tickFormat(d3.format('.2f')))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick text').attr('font-size', compact ? 8 : 9).attr('fill', '#aaa'); ax.selectAll('.tick line').attr('stroke', '#dde3ef'); });

    g.append('g')
      .call(d3.axisLeft(yS).ticks(5).tickFormat(d => Math.round(d)))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick text').attr('font-size', compact ? 8 : 9).attr('fill', '#aaa'); ax.selectAll('.tick line').remove(); });

    g.append('text').attr('x', iw / 2).attr('y', ih + (compact ? 32 : 40)).attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', '#aaa').text('Indice di Povertà Multidimensionale (MPI)');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', compact ? -30 : -40).attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', '#aaa').text('N° paesi');

    if (severeCut) {
      g.append('line').attr('x1', xS(severeCut)).attr('x2', xS(severeCut)).attr('y1', 0).attr('y2', ih)
        .attr('stroke', '#b04a4a').attr('stroke-width', 1.5).attr('stroke-dasharray', '5,3');
      g.append('text').attr('x', xS(severeCut) + 4).attr('y', 14).attr('font-size', 9).attr('fill', '#b04a4a').text('soglia grave →');
    }

    const barW = africaBins[0] ? xS(africaBins[0].x1) - xS(africaBins[0].x0) : 20;
    africaBins.forEach(bin => {
      if (!bin.length) return;
      const isSevere = severeCut && bin.x0 >= severeCut;
      const fill = severeCut ? (isSevere ? COL_AFRICA : '#ddd') : COL_AFRICA;
      const opa  = severeCut ? (isSevere ? 0.85 : 0.45) : 0.78;

      g.append('rect').attr('x', xS(bin.x0) + 1).attr('y', yS(bin.length))
        .attr('width', barW - 2).attr('height', ih - yS(bin.length))
        .attr('fill', fill).attr('opacity', opa).attr('rx', 2).style('cursor', 'pointer')
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1);
          const sorted = [...bin].sort((a, b) => b.value - a.value);
          const listed = sorted.map(d => `${d.country} <span style="opacity:.6">${d.value.toFixed(3)}</span>`).join('<br>');
          tipEl.innerHTML = `<strong style="color:${COL_AFRICA}">MPI ${bin.x0.toFixed(2)}–${bin.x1.toFixed(2)}</strong><br><span style="opacity:.6">${bin.length} ${bin.length === 1 ? 'paese' : 'paesi'}</span><br>${listed}`;
          tipEl.style.display = 'block';
        })
        .on('mousemove', ev => { tipEl.style.left = (ev.clientX + 14) + 'px'; tipEl.style.top = (ev.clientY - 28) + 'px'; })
        .on('mouseleave', function () { d3.select(this).attr('opacity', opa); tipEl.style.display = 'none'; });

      if (bin.length >= 3) {
        g.append('text').attr('x', xS(bin.x0) + barW / 2).attr('y', yS(bin.length) - 3)
          .attr('text-anchor', 'middle').attr('font-size', 8.5)
          .attr('fill', fill).attr('opacity', opa + 0.1).style('pointer-events', 'none')
          .text(bin.length);
      }
    });

    // No-data chip grid
    appendNoDataDistChips(g, iw, ih + M.bottom + 4);
  }

  /* ── Ranking (scrollabile + asse X fisso) ────────────────── */
  function drawRank() {
    const M   = MARGIN_RANK;
    const iw  = W - M.left - M.right;
    const severeCut = mode === 'severe' ? 0.30 : null;

    const availH    = H - PILL_H - AXIS_H;
    const totalRows = africa.length + (noData.length || 0);
    const overhead  = M.top + 4 + (noData.length ? ND_PAD + 12 : 0);
    const idealBarH = Math.floor((availH - overhead) / totalRows - 3);
    // use idealBarH if it gives readable bars (≥4px); below that force MIN_BAR_H and scroll
    const barRowH   = idealBarH >= 4 ? idealBarH : MIN_BAR_H;
    const fits      = idealBarH >= 4;

    const mainH = africa.length * (barRowH + 3) + M.top + 4;
    const ndH   = noData.length ? ND_PAD + noData.length * (barRowH + 3) + 12 : 0;
    const rankH = fits ? availH : mainH + ndH;
    svg.attr('height', rankH).style('height', rankH + 'px');
    scrollWrap.style('overflow-y', fits ? 'hidden' : 'auto');

    const ih = mainH - M.top - 4;
    g.attr('transform', `translate(${M.left},${M.top})`);

    const xMax = d3.max(africa, d => d.value);
    const xS   = d3.scaleLinear().domain([0, xMax * 1.05]).range([0, iw]).nice();
    const yS   = d3.scaleBand().domain(africa.map(d => d.code)).range([0, ih]).padding(0.15);
    const barH = yS.bandwidth();
    const fontSize = Math.max(compact ? 6.5 : 7, Math.min(compact ? 8.5 : 9, barH));

    // Vertical gridlines
    xS.ticks(5).forEach(t => {
      g.append('line').attr('x1', xS(t)).attr('x2', xS(t)).attr('y1', 0).attr('y2', ih + ndH)
        .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
    });

    if (severeCut) {
      g.append('line').attr('x1', xS(severeCut)).attr('x2', xS(severeCut)).attr('y1', 0).attr('y2', ih)
        .attr('stroke', '#b04a4a').attr('stroke-width', 1.5).attr('stroke-dasharray', '5,3');
      g.append('text').attr('x', xS(severeCut) + 3).attr('y', 10).attr('font-size', 9).attr('fill', '#b04a4a').text('soglia grave');
    }

    africa.forEach(d => {
      const isSevere = severeCut && d.value >= severeCut;
      const fill = severeCut ? (isSevere ? COL_AFRICA : '#ddd') : COL_AFRICA;
      const opa  = severeCut ? (isSevere ? 0.85 : 0.35) : 0.78;

      g.append('text')
        .attr('x', -5).attr('y', yS(d.code) + barH / 2)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('font-size', fontSize).attr('fill', fill).attr('opacity', Math.max(opa, 0.6))
        .style('pointer-events', 'none')
        .text(d.country.length > (veryCompact ? 13 : compact ? 15 : 18)
          ? d.country.slice(0, veryCompact ? 12 : compact ? 14 : 17) + '…'
          : d.country);

      g.append('rect')
        .attr('x', 0).attr('y', yS(d.code))
        .attr('width', xS(d.value)).attr('height', barH)
        .attr('fill', fill).attr('opacity', opa).attr('rx', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1);
          tipEl.innerHTML = `<strong style="color:${COL_AFRICA}">${d.country}</strong><br>MPI: ${d.value.toFixed(3)}<br>Anno: ${d.year}`;
          tipEl.style.display = 'block';
        })
        .on('mousemove', ev => { tipEl.style.left = (ev.clientX + 14) + 'px'; tipEl.style.top = (ev.clientY - 28) + 'px'; })
        .on('mouseleave', function () { d3.select(this).attr('opacity', opa); tipEl.style.display = 'none'; });
    });

    // No-data rows at bottom
    appendNoDataRankRows(g, ih, barH, M.left, iw);

    // Fixed X axis
    const ag = axisSvg.append('g').attr('transform', `translate(${M.left}, 4)`);
    ag.call(d3.axisBottom(xS).ticks(5).tickFormat(d3.format('.2f')))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick text').attr('font-size', compact ? 8 : 9).attr('fill', '#aaa'); ax.selectAll('.tick line').attr('stroke', '#dde3ef'); });
    ag.append('text').attr('x', iw / 2).attr('y', compact ? 24 : 28).attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', '#aaa').text('MPI');
  }

  draw();

  container._mpiReset = () => { mode = 'africa'; viewType = 'dist'; updateToggle(); draw(); };
  container._mpiFilterContinent = (c) => {
    if (c === 'Africa') { mode = 'severe'; viewType = 'dist'; updateToggle(); draw(); }
    else { mode = 'africa'; viewType = 'rank'; updateToggle(); draw(); }
  };
  container._mpiHighlightSevere = () => { mode = 'severe'; viewType = 'dist'; updateToggle(); draw(); };
}
