/* ============================================================
   Grafico 2-1 (Atto I) — MPI Africa: distribuzione o mappa
   Viste: istogramma ↔ choropleth
   ============================================================ */
async function renderMpiBreakdown(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
  const GRADIENT_STOPS = ['#fff4e8', '#f6cfaa', '#ec9d64', '#e07b39', '#a54622'];
  const COL_AFRICA = '#e07b39';
  const COL_GREY = '#d7dbe2';

  // Reuse the shared global mapping when available.
  const numericToAlpha3 = typeof _MIG_NUM_TO_A3 !== 'undefined' ? _MIG_NUM_TO_A3 : {};

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
  const AFRICA_CODES = new Set(ALL_AFRICA.map(d => d.code));

  const [raw, geoData] = await Promise.all([
    d3.csv('datasets/processed/mpi.csv', d3.autoType),
    d3.json(WORLD_ATLAS_URL).catch(() => null),
  ]);

  const latestMap = new Map();
  d3.group(raw, d => d.code).forEach((rows, code) => {
    const r = rows.filter(d => d.value != null).sort((a, b) => b.year - a.year)[0];
    if (r) latestMap.set(code, r);
  });

  const allLatest = Array.from(latestMap.values()).filter(d => d.value != null);
  const africa = allLatest
    .filter(d => d.continent === 'Africa')
    .sort((a, b) => b.value - a.value);

  const africaCodes = new Set(africa.map(d => d.code));
  const noData = ALL_AFRICA.filter(c => !africaCodes.has(c.code));

  const maxValue = d3.max(allLatest, d => d.value) || 0.3;
  const scaleMax = Math.max(0.3, Math.ceil(maxValue * 20) / 20);
  const mpiColor = d3.scaleSequential(d3.interpolateRgbBasis(GRADIENT_STOPS)).domain([0, scaleMax]);

  let mode = 'africa'; // 'africa' | 'severe'
  let viewType = 'dist'; // 'dist' | 'map'

  const W = container.clientWidth || (isFullscreen ? window.innerWidth * 0.85 : 760);
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
      .on('click', () => {
        viewType = val;
        updateToggle();
        draw();
      });
  }

  const btnDist = makeToggleBtn('Distribuzione', 'dist');
  const btnMap = makeToggleBtn('Mappa', 'map');

  function updateToggle() {
    [[btnDist, 'dist'], [btnMap, 'map']].forEach(([btn, val]) => {
      const active = viewType === val;
      btn.style('background', active ? '#4a6fa5' : 'transparent')
        .style('color', active ? '#fff' : '#7a8aaa')
        .style('box-shadow', active ? '0 1px 4px rgba(74,111,165,0.3)' : 'none');
    });
  }
  updateToggle();

  // ── Layout constants ────────────────────────────────────────
  const PILL_H = compact ? 42 : 48;
  const ND_PAD = 20; // padding above no-data section
  const MARGIN_DIST = compact
    ? { top: 26, right: 14, bottom: 46, left: 42 }
    : { top: 32, right: 24, bottom: 56, left: 52 };
  const MARGIN_MAP = compact
    ? { top: 12, right: 14, bottom: 42, left: 14 }
    : { top: 18, right: 18, bottom: 52, left: 18 };

  // Scrollable area
  const scrollWrap = d3.select(container).append('div')
    .style('position', 'absolute').style('top', PILL_H + 'px').style('left', '0')
    .style('width', '100%').style('height', `calc(100% - ${PILL_H}px)`)
    .style('overflow-y', 'auto').style('overflow-x', 'hidden');

  const svg = scrollWrap.append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('display', 'block');

  const defs = svg.append('defs');
  const gradientId = `mpi-ramp-${isFullscreen ? 'fs' : 'ed'}`;
  const grad = defs.append('linearGradient')
    .attr('id', gradientId)
    .attr('x1', '0%').attr('y1', '0%')
    .attr('x2', '100%').attr('y2', '0%');
  [
    [0, GRADIENT_STOPS[0]],
    [25, GRADIENT_STOPS[1]],
    [50, GRADIENT_STOPS[2]],
    [75, GRADIENT_STOPS[3]],
    [100, GRADIENT_STOPS[4]],
  ].forEach(([offset, color]) => {
    grad.append('stop').attr('offset', `${offset}%`).attr('stop-color', color);
  });

  const g = svg.append('g');

  let tipEl = document.getElementById('mpi-breakdown-tip');
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.id = 'mpi-breakdown-tip';
    Object.assign(tipEl.style, {
      position: 'fixed',
      display: 'none',
      pointerEvents: 'none',
      background: 'rgba(20,20,40,0.93)',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '11px',
      lineHeight: '1.65',
      zIndex: '10000',
      maxWidth: '240px',
      whiteSpace: 'normal',
    });
    document.body.appendChild(tipEl);
  }

  function getLegendRows() {
    return d3.range(5).map(i => {
      const t = 1 - i / 4;
      const value = t * scaleMax;
      return {
        color: mpiColor(value),
        label: value.toFixed(2),
      };
    });
  }

  function drawLegendCard(parent, x, y, title) {
    const rows = getLegendRows();
    const SW = compact ? 12 : 14;
    const SH = compact ? 12 : 14;
    const GAP = compact ? 3 : 4;
    const LABEL_X = SW + (compact ? 5 : 7);
    const rowH = SH + GAP;
    const totalH = rows.length * rowH + (compact ? 6 : 8) + rowH + (compact ? 12 : 14) + (compact ? 8 : 10);
    const totalW = compact ? 88 : 110;
    const lg = parent.append('g').attr('transform', `translate(${x},${y})`);

    lg.append('rect')
      .attr('x', -10).attr('y', -6)
      .attr('width', totalW + 14).attr('height', totalH + 8)
      .attr('rx', 8)
      .attr('fill', 'rgba(255,255,255,0.92)')
      .attr('stroke', '#d8dce8')
      .attr('stroke-width', 1);

    lg.append('text')
      .attr('x', 0).attr('y', 10)
      .attr('font-size', compact ? 7 : 8)
      .attr('font-weight', '700')
      .attr('fill', '#888')
      .attr('letter-spacing', '0.07em')
      .text(title.toUpperCase());

    rows.forEach((row, i) => {
      const cy = 18 + i * rowH;
      lg.append('rect')
        .attr('x', 0).attr('y', cy)
        .attr('width', SW).attr('height', SH)
        .attr('rx', 3)
        .attr('fill', row.color);
      lg.append('text')
        .attr('x', LABEL_X).attr('y', cy + SH / 2 + 4)
        .attr('font-size', compact ? 8 : 9)
        .attr('fill', '#444')
        .text(row.label);
    });

    const ndY = 18 + rows.length * rowH + 6;
    lg.append('rect')
      .attr('x', 0).attr('y', ndY)
      .attr('width', SW).attr('height', SH)
      .attr('rx', 3)
      .attr('fill', '#c8cdd4');
    lg.append('text')
      .attr('x', LABEL_X).attr('y', ndY + SH / 2 + 4)
      .attr('font-size', compact ? 8 : 9)
      .attr('fill', '#888')
      .text('No data');

    return { width: totalW + 14, height: totalH + 8 };
  }

  // ── No-data section renderer ────────────────────────────────
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
    tipEl.style.display = 'none';
    svg.on('.zoom', null).style('cursor', 'default').style('background', null).style('border-radius', null);

    if (viewType === 'dist') {
      scrollWrap
        .style('top', PILL_H + 'px')
        .style('height', `calc(100% - ${PILL_H}px)`)
        .style('overflow-y', 'hidden');
      drawDist();
    } else {
      scrollWrap
        .style('top', '0')
        .style('height', '100%')
        .style('overflow-y', 'hidden');
      drawMap();
    }
  }

  /* ── Distribuzione (istogramma) ─────────────────────────── */
  function drawDist() {
    const ndRows = Math.ceil(noData.length / (veryCompact ? 2 : compact ? 3 : 4));
    const ndH = noData.length ? 12 + ndRows * 14 + 8 : 0;
    const M = { ...MARGIN_DIST, bottom: MARGIN_DIST.bottom + ndH };
    const iw = W - M.left - M.right;
    const ih = H - PILL_H - M.top - M.bottom;

    svg.attr('height', H - PILL_H).style('height', '100%');
    g.attr('transform', `translate(${M.left},${M.top})`);

    const severeCut = mode === 'severe' ? 0.30 : null;
    const xMax = d3.max(africa, d => d.value) || 0.3;
    const xS = d3.scaleLinear().domain([0, Math.ceil(xMax * 20) / 20]).range([0, iw]).nice();
    const binGen = d3.bin().value(d => d.value).domain(xS.domain()).thresholds(xS.ticks(16));
    const africaBins = binGen(africa);
    const yMax = d3.max(africaBins, b => b.length) || 1;
    const yS = d3.scaleLinear().domain([0, yMax + 1]).range([ih, 0]).nice();

    yS.ticks(5).forEach(t => {
      g.append('line')
        .attr('x1', 0).attr('x2', iw)
        .attr('y1', yS(t)).attr('y2', yS(t))
        .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
    });

    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xS).ticks(compact ? 7 : 10).tickFormat(d3.format('.2f')))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('.tick text').attr('font-size', compact ? 8 : 9).attr('fill', '#aaa');
        ax.selectAll('.tick line').attr('stroke', '#dde3ef');
      });

    g.append('g')
      .call(d3.axisLeft(yS).ticks(5).tickFormat(d => Math.round(d)))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('.tick text').attr('font-size', compact ? 8 : 9).attr('fill', '#aaa');
        ax.selectAll('.tick line').remove();
      });

    g.append('text')
      .attr('x', iw / 2).attr('y', ih + (compact ? 32 : 40))
      .attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', '#aaa')
      .text('Indice di Poverta Multidimensionale (MPI)');
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -ih / 2).attr('y', compact ? -30 : -40)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', '#aaa')
      .text('N° paesi');

    drawLegendCard(
      g,
      Math.max(0, iw - (compact ? 98 : 124)),
      4,
      'MPI'
    );

    if (severeCut) {
      g.append('line')
        .attr('x1', xS(severeCut)).attr('x2', xS(severeCut))
        .attr('y1', 0).attr('y2', ih)
        .attr('stroke', '#b04a4a').attr('stroke-width', 1.5).attr('stroke-dasharray', '5,3');
      g.append('text')
        .attr('x', xS(severeCut) + 4).attr('y', 14)
        .attr('font-size', 9).attr('fill', '#b04a4a')
        .text('soglia grave ->');
    }

    const barW = africaBins[0] ? xS(africaBins[0].x1) - xS(africaBins[0].x0) : 20;
    africaBins.forEach(bin => {
      if (!bin.length) return;
      const fill = mpiColor((bin.x0 + bin.x1) / 2);
      const opa = severeCut ? 0.9 : 0.82;

      g.append('rect')
        .attr('x', xS(bin.x0) + 1).attr('y', yS(bin.length))
        .attr('width', Math.max(1, barW - 2)).attr('height', ih - yS(bin.length))
        .attr('fill', fill).attr('opacity', opa).attr('rx', 2).style('cursor', 'pointer')
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1);
          const sorted = [...bin].sort((a, b) => b.value - a.value);
          const listed = sorted
            .map(d => `${d.country} <span style="opacity:.6">${d.value.toFixed(3)}</span>`)
            .join('<br>');
          tipEl.innerHTML = `<strong style="color:${COL_AFRICA}">MPI ${bin.x0.toFixed(2)}–${bin.x1.toFixed(2)}</strong><br><span style="opacity:.6">${bin.length} ${bin.length === 1 ? 'paese' : 'paesi'}</span><br>${listed}`;
          tipEl.style.display = 'block';
        })
        .on('mousemove', ev => {
          tipEl.style.left = (ev.clientX + 14) + 'px';
          tipEl.style.top = (ev.clientY - 28) + 'px';
        })
        .on('mouseleave', function () {
          d3.select(this).attr('opacity', opa);
          tipEl.style.display = 'none';
        });

      if (bin.length >= 3) {
        g.append('text')
          .attr('x', xS(bin.x0) + barW / 2).attr('y', yS(bin.length) - 3)
          .attr('text-anchor', 'middle').attr('font-size', 8.5)
          .attr('fill', fill).attr('opacity', opa + 0.1).style('pointer-events', 'none')
          .text(bin.length);
      }
    });

    // No-data chip grid
    appendNoDataDistChips(g, iw, ih + M.bottom + 4);
  }

  /* ── Choropleth (world map) ─────────────────────────────── */
  function drawMap() {
    const iw = W;
    const ih = H;
    const clipId = `mpi-map-clip-${isFullscreen ? 'fs' : 'ed'}`;

    svg.attr('height', H).style('height', '100%');
    svg.style('background', '#eef2f7').style('border-radius', '0');
    g.attr('transform', 'translate(0,0)');

    if (!geoData || !geoData.objects || !geoData.objects.countries) {
      g.append('rect')
        .attr('x', 0).attr('y', 0).attr('width', iw).attr('height', ih)
        .attr('rx', 10).attr('fill', '#eef2f7').attr('stroke', '#dde3ef');
      g.append('text')
        .attr('x', 18).attr('y', 28)
        .attr('font-size', compact ? 11 : 13).attr('fill', '#7d8491')
        .text('Mappa non disponibile: errore nel caricamento del world atlas.');
      return;
    }

    const countries = topojson.feature(geoData, geoData.objects.countries).features;
    const projection = d3.geoNaturalEarth1()
      .fitExtent([[4, 16], [iw - 4, ih - 16]], { type: 'FeatureCollection', features: countries });
    const pathGen = d3.geoPath().projection(projection);

    defs.select(`#${clipId}`).remove();
    defs.append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('width', iw)
      .attr('height', ih);

    const mapGroup = g.append('g').attr('clip-path', `url(#${clipId})`);
    const countryG = mapGroup.append('g');

    countryG.selectAll('path.country')
      .data(countries)
      .join('path')
      .attr('class', 'country')
      .attr('d', pathGen)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.35)
      .attr('fill', d => {
        const code = numericToAlpha3[+d.id] || '';
        if (!AFRICA_CODES.has(code)) return '#d8dce4';
        const rec = latestMap.get(code);
        return rec && rec.value != null ? mpiColor(rec.value) : '#c8cdd4';
      })
      .attr('pointer-events', d => {
        const code = numericToAlpha3[+d.id] || '';
        return AFRICA_CODES.has(code) && latestMap.has(code) ? 'all' : 'none';
      })
      .style('cursor', d => {
        const code = numericToAlpha3[+d.id] || '';
        return AFRICA_CODES.has(code) && latestMap.has(code) ? 'pointer' : 'default';
      })
      .on('mouseover', function (ev, d) {
        const code = numericToAlpha3[+d.id] || '';
        const rec = latestMap.get(code);
        if (!rec || rec.value == null) return;
        tipEl.innerHTML = `<strong style="color:${COL_AFRICA}">${rec.country}</strong><br>MPI: ${rec.value.toFixed(3)}<br>Anno: ${rec.year}<br><span style="opacity:.65">${rec.continent || ''}</span>`;
        tipEl.style.display = 'block';
      })
      .on('mousemove', ev => {
        tipEl.style.left = (ev.clientX + 14) + 'px';
        tipEl.style.top = (ev.clientY - 28) + 'px';
      })
      .on('mouseleave', function (ev, d) {
        const code = numericToAlpha3[+d.id] || '';
        const rec = latestMap.get(code);
        if (rec && rec.value != null) tipEl.style.display = 'none';
      });

    const africaFeatures = countries.filter(d => {
      const code = numericToAlpha3[+d.id] || '';
      return AFRICA_CODES.has(code);
    });
    const africaBounds = pathGen.bounds({ type: 'FeatureCollection', features: africaFeatures });
    const africaCx = (africaBounds[0][0] + africaBounds[1][0]) / 2;
    const africaCy = (africaBounds[0][1] + africaBounds[1][1]) / 2;
    const zoomScale = compact ? 1.28 : 1.42;
    const initialTransform = d3.zoomIdentity
      .translate(iw / 2 - zoomScale * africaCx, ih / 2 - zoomScale * africaCy + (compact ? 6 : 10))
      .scale(zoomScale);

    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', e => {
        mapGroup.attr('transform', e.transform);
        svg.style('cursor', 'grabbing');
      })
      .on('end', () => svg.style('cursor', 'grab'));

    svg
      .style('cursor', 'grab')
      .call(zoom)
      .call(zoom.transform, initialTransform);

    drawLegendCard(
      g,
      iw - (compact ? 104 : 120),
      ih - (compact ? 156 : 172),
      'MPI'
    );
  }

  draw();

  container._mpiReset = () => {
    mode = 'africa';
    viewType = 'dist';
    updateToggle();
    draw();
  };
  container._mpiFilterContinent = (c) => {
    if (c === 'Africa') {
      mode = 'severe';
      viewType = 'dist';
      updateToggle();
      draw();
    } else {
      mode = 'africa';
      viewType = 'map';
      updateToggle();
      draw();
    }
  };
  container._mpiHighlightSevere = () => {
    mode = 'severe';
    viewType = 'dist';
    updateToggle();
    draw();
  };
  container._mpiShowMap = () => {
    viewType = 'map';
    updateToggle();
    draw();
  };
  container._mpiSetView = (nextView) => {
    if (!['dist', 'map'].includes(nextView)) return;
    viewType = nextView;
    updateToggle();
    draw();
  };
}
