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
  const AFRICA_BASE = getContinentColor('Africa', '#e66100');
  const GRADIENT_STOPS = [
    tintColor(AFRICA_BASE, 0.82),
    tintColor(AFRICA_BASE, 0.6),
    AFRICA_BASE,
    '#99511d',
    '#4a2b1a',
  ];
  const COL_AFRICA = AFRICA_BASE;
  const UI_ACTIVE = getActColor(1, getUiColor('controlActive', '#525252'));
  const UI_MUTED_INK = getUiColor('controlMutedInk', '#75695d');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const CHART_GRID = getUiColor('chartGrid', '#e8e1d7');
  const CHART_AXIS = getUiColor('chartAxis', '#a49788');
  const CHART_LABEL = getUiColor('chartLabel', '#73675c');

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
    d3.csv('datasets/processed/multidimensional_poverty_index.csv', d3.autoType),
    d3.json(WORLD_ATLAS_URL).catch(() => null),
  ]);

  const latestMap = new Map();
  d3.group(raw, d => d.code).forEach((rows, code) => {
    const r = rows.filter(d => d.value != null).sort((a, b) => b.year - a.year)[0];
    if (r) latestMap.set(code, r);
  });

  const allLatestUnfiltered = Array.from(latestMap.values()).filter(d => d.value != null);
  const latestYearMax = d3.max(allLatestUnfiltered, d => d.year) || 2023;
  const latestYearMin = latestYearMax - 9;
  const allLatest = allLatestUnfiltered.filter(d => d.year >= latestYearMin);
  const latestRecentMap = new Map(allLatest.map(d => [d.code, d]));
  const africa = allLatest
    .filter(d => d.continent === 'Africa')
    .sort((a, b) => b.value - a.value);

  const maxValue = d3.max(allLatest, d => d.value) || 0.3;
  const scaleMax = Math.max(0.3, Math.ceil(maxValue * 20) / 20);
  const MPI_STEP = 0.05;
  const mpiRamp = d3.scaleSequential(d3.interpolateRgbBasis(GRADIENT_STOPS)).domain([0, scaleMax]);
  const mpiThresholds = d3.range(MPI_STEP, scaleMax, MPI_STEP);
  const mpiBinColors = d3.range(mpiThresholds.length + 1).map(i => {
    const lo = i * MPI_STEP;
    const hi = Math.min(scaleMax, lo + MPI_STEP);
    return mpiRamp((lo + hi) / 2);
  });
  const mpiColor = d3.scaleThreshold()
    .domain(mpiThresholds)
    .range(mpiBinColors);

  let mode = 'africa'; // 'africa' | 'severe'
  let viewType = 'dist'; // 'dist' | 'map'
  let mapFocusAfrica = false;

  if (typeof window.mountChartWarningHint === 'function') {
    window.mountChartWarningHint(container, `The data shows the most recent year for which data is available for each country. The years are not perfectly aligned, but they fall within the range ${latestYearMin}-${latestYearMax}.`);
  }

  const W = container.clientWidth || (isFullscreen ? window.innerWidth * 0.85 : 760);
  const H = container.clientHeight || (isFullscreen ? window.innerHeight * 0.82 : 480);
  const compact = isFullscreen && (W < 760 || H < 420);
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

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

  const btnDist = makeToggleBtn('Distribution', 'dist');
  const btnMap = makeToggleBtn('Map', 'map');

  function updateToggle() {
    [[btnDist, 'dist'], [btnMap, 'map']].forEach(([btn, val]) => {
      const active = viewType === val;
      btn.style('background', active ? UI_ACTIVE : 'transparent')
        .style('color', active ? '#fff' : UI_MUTED_INK)
        .style('box-shadow', active ? `0 1px 4px ${colorToRgba(UI_ACTIVE, 0.3)}` : 'none');
    });
  }
  updateToggle();

  // ── Layout constants ────────────────────────────────────────
  const PILL_H = compact ? 36 : 40;
  const MARGIN_DIST = compact
    ? { top: 14, right: 24, bottom: 38, left: 52 }
    : { top: 16, right: 40, bottom: 44, left: 68 };
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
  const noDataFill = getUiColor('chartNoDataFill', '#c3baad');
  const noDataPattern = ensureNoDataPattern(svg, `mpi-nodata-${isFullscreen ? 'fs' : 'ed'}`, {
    background: noDataFill,
    stripe: getUiColor('chartNoDataStripe', shadeColor(noDataFill, 0.24)),
  });
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

  const tipEl = window.ensureHoverTooltip('mpi-breakdown-tip', { maxWidth: 'min(92vw, 18rem)' });

  function getLegendRows() {
    const edges = [0, ...mpiThresholds, scaleMax];
    return d3.range(edges.length - 1).map(i => {
      const lo = edges[i];
      const hi = edges[i + 1];
      return {
        lo,
        hi,
        color: mpiColor((lo + hi) / 2),
      };
    }).reverse();
  }

  function drawLegendCard(parent, x, y, title, maxW = null, maxH = null) {
    const rows = getLegendRows();
    const SW = compact ? 12 : 14;
    const SH = compact ? 10 : 12;
    const GAP = 0;
    const stackH = rows.length * SH + (rows.length - 1) * GAP;
    const LABEL_X = SW + (compact ? 6 : 8);
    const titleGap = compact ? 16 : 18;
    const noDataGap = compact ? 6 : 8;
    const totalH = titleGap + stackH + noDataGap + SH + (compact ? 12 : 14);
    const totalW = compact ? 78 : 88;
    const outerW = totalW + 4;
    const outerH = totalH + 2;
    const pad = compact ? 10 : 12;
    const tx = maxW && maxH
      ? Math.max(pad, Math.min(x, maxW - outerW - pad))
      : x;
    const ty = maxW && maxH
      ? Math.max(pad, Math.min(y, maxH - outerH - pad))
      : y;
    const lg = parent.append('g').attr('class', 'chart-legend chart-legend--svg').attr('transform', `translate(${tx},${ty})`);

    lg.append('rect')
      .attr('x', -8).attr('y', -5)
      .attr('width', totalW + 10).attr('height', totalH + 6)
      .attr('rx', 8)
      .attr('fill', 'rgba(255,255,255,0.92)')
      .attr('stroke', UI_MUTED_BORDER)
      .attr('stroke-width', 1);

    lg.append('text')
      .attr('x', 0).attr('y', 10)
      .attr('font-size', compact ? 8 : 9)
      .attr('font-weight', '700')
      .attr('fill', CHART_AXIS)
      .attr('letter-spacing', '0.07em')
      .text(title.toUpperCase());

    const stackY = titleGap;
    rows.forEach((row, i) => {
      const cy = stackY + i * (SH + GAP);
      lg.append('rect')
        .attr('x', 0).attr('y', cy)
        .attr('width', SW).attr('height', SH)
        .attr('fill', row.color);
      lg.append('text')
        .attr('x', LABEL_X)
        .attr('y', cy + SH / 2 + 4)
        .attr('font-size', compact ? 8 : 9)
        .attr('fill', CHART_LABEL)
        .text(
          i === 0
            ? `> ${row.lo.toFixed(2)}`
            : i === rows.length - 1
              ? `< ${row.hi.toFixed(2)}`
              : row.hi.toFixed(2)
        );
    });

    const ndY = stackY + stackH + noDataGap;
    lg.append('rect')
      .attr('x', 0).attr('y', ndY)
      .attr('width', SW).attr('height', SH)
      .attr('rx', 2)
      .attr('fill', noDataPattern)
      .attr('stroke', UI_MUTED_BORDER)
      .attr('stroke-width', 0.5);
    lg.append('text')
      .attr('x', LABEL_X).attr('y', ndY + SH / 2 + 4)
      .attr('font-size', compact ? 8 : 9)
      .attr('fill', CHART_AXIS)
      .text('No data');
  }

  function draw() {
    g.selectAll('*').remove();
    window.hideHoverTooltip(tipEl);
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
    const topShift = compact ? 2 : 4;
    const bottomSpace = compact ? 30 : 48;
    const M = {
      ...MARGIN_DIST,
      top: MARGIN_DIST.top + topShift,
      // Keep a compact bottom margin so the X label sits close to the card edge
      // and the plot can use more vertical space.
      bottom: bottomSpace,
    };
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
    const yS = d3.scaleLinear().domain([0, yMax + 0.4]).range([ih, 0]).nice();

    yS.ticks(5).forEach(t => {
      g.append('line')
        .attr('x1', 0).attr('x2', iw)
        .attr('y1', yS(t)).attr('y2', yS(t))
        .attr('stroke', CHART_GRID).attr('stroke-width', 1);
    });

    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xS).ticks(compact ? 7 : 10).tickFormat(d3.format('.2f')))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('.tick text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS);
        ax.selectAll('.tick line').attr('stroke', UI_MUTED_BORDER);
      });

    g.append('g')
      .call(d3.axisLeft(yS).ticks(5).tickFormat(d => Math.round(d)))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('.tick text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS);
        ax.selectAll('.tick line').remove();
      });

    g.append('text')
      .attr('class', 'chart-axis-label').attr('x', iw / 2).attr('y', ih + (compact ? 24 : 28))
      .attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_AXIS)
      .text('Multidimensional Poverty Index (MPI)');
    g.append('text')
      .attr('class', 'chart-axis-label').attr('transform', 'rotate(-90)')
      .attr('x', -ih / 2).attr('y', compact ? -30 : -40)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_AXIS)
      .text('No. of countries');

    const dirInk = shadeColor(COL_AFRICA, 0.18);
    const dirFont = compact ? 9 : 10;
    const arrowX2 = iw - 8;

    g.append('text')
      .attr('x', arrowX2)
      .attr('y', compact ? 3 : 5)
      .attr('text-anchor', 'end')
      .attr('font-size', dirFont)
      .attr('font-weight', '600')
      .attr('fill', dirInk)
      .text('Moving right, MPI worsens →');

    if (severeCut) {
      g.append('line')
        .attr('x1', xS(severeCut)).attr('x2', xS(severeCut))
        .attr('y1', 0).attr('y2', ih)
        .attr('stroke', shadeColor(COL_AFRICA, 0.18)).attr('stroke-width', 1.5).attr('stroke-dasharray', '5,3');
    }

    const barW = africaBins[0] ? xS(africaBins[0].x1) - xS(africaBins[0].x0) : 20;
    const animateBars = !prefersReducedMotion;
    const barDuration = animateBars ? 650 : 0;
    africaBins.forEach((bin, index) => {
      if (!bin.length) return;
      const isBeforeSevereCut = severeCut != null && bin.x1 <= severeCut;
      const fill = isBeforeSevereCut
        ? getUiColor('chartBaseFill', '#ddd8cf')
        : mpiColor((bin.x0 + bin.x1) / 2);
      const opa = severeCut ? 0.9 : 0.82;
      const targetY = yS(bin.length);
      const targetH = ih - targetY;

      const bar = g.append('rect')
        .attr('x', xS(bin.x0) + 1).attr('y', animateBars ? ih : targetY)
        .attr('width', Math.max(1, barW - 2)).attr('height', animateBars ? 0 : targetH)
        .attr('fill', fill).attr('opacity', opa).attr('rx', 2).style('cursor', 'pointer')
        .on('mouseover', function (ev) {
          d3.select(this).attr('opacity', 1);
          const sorted = [...bin].sort((a, b) => b.value - a.value);
          window.showHoverTooltip(tipEl, ev, {
            title: `MPI ${bin.x0.toFixed(2)}-${bin.x1.toFixed(2)}`,
            titleColor: COL_AFRICA,
            sections: [{
              title: 'Included countries',
              rows: sorted.map(d => ({
                label: d.country,
                value: d.value.toFixed(3),
              })),
            }],
          });
        })
        .on('mousemove', ev => {
          window.positionHoverTooltip(tipEl, ev);
        })
        .on('mouseleave', function () {
          d3.select(this).attr('opacity', opa);
          window.hideHoverTooltip(tipEl);
        });

      if (animateBars) {
        bar.transition()
          .delay(index * 34)
          .duration(barDuration)
          .ease(d3.easeCubicOut)
          .attr('y', targetY)
          .attr('height', targetH);
      }

    });

    // No-data chip grid intentionally omitted to preserve vertical space.
  }

  /* ── Choropleth (world map) ─────────────────────────────── */
  function drawMap() {
    const iw = W;
    const ih = H;
    const clipId = `mpi-map-clip-${isFullscreen ? 'fs' : 'ed'}`;

    svg.attr('height', H).style('height', '100%');
    svg.style('background', getUiColor('chartWater', '#ece8e0')).style('border-radius', '0');
    g.attr('transform', 'translate(0,0)');

    if (!geoData || !geoData.objects || !geoData.objects.countries) {
      g.append('rect')
        .attr('x', 0).attr('y', 0).attr('width', iw).attr('height', ih)
        .attr('rx', 10).attr('fill', getUiColor('chartWater', '#ece8e0')).attr('stroke', UI_MUTED_BORDER);
      g.append('text')
        .attr('x', 18).attr('y', 28)
        .attr('font-size', compact ? 11 : 13).attr('fill', UI_MUTED_INK)
        .text('Map not available: error loading the world atlas.');
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
        if (!AFRICA_CODES.has(code)) return getUiColor('chartBaseFill', '#d6d0c5');
        const rec = latestRecentMap.get(code);
        return rec && rec.value != null ? mpiColor(rec.value) : noDataPattern;
      })
      .attr('pointer-events', d => {
        const code = numericToAlpha3[+d.id] || '';
        return AFRICA_CODES.has(code) ? 'all' : 'none';
      })
      .style('cursor', d => {
        const code = numericToAlpha3[+d.id] || '';
        return AFRICA_CODES.has(code) ? 'pointer' : 'default';
      })
      .on('mouseover', function (ev, d) {
        const code = numericToAlpha3[+d.id] || '';
        const rec = latestRecentMap.get(code);
        const name = rec?.country || ALL_AFRICA.find(x => x.code === code)?.country || code || '?';
        if (!rec || rec.value == null) {
          window.showHoverTooltip(tipEl, ev, {
            title: name,
            titleColor: COL_AFRICA,
            rows: [{ label: 'MPI', value: 'N/D' }],
          });
        } else {
          window.showHoverTooltip(tipEl, ev, {
            title: name,
            titleColor: COL_AFRICA,
            meta: `Year: ${rec.year}`,
            rows: [{ label: 'MPI', value: rec.value.toFixed(3) }],
          });
        }
      })
      .on('mousemove', ev => {
        window.positionHoverTooltip(tipEl, ev);
      })
      .on('mouseleave', () => { window.hideHoverTooltip(tipEl); });

    const africaFeatures = countries.filter(d => {
      const code = numericToAlpha3[+d.id] || '';
      return AFRICA_CODES.has(code);
    });
    const africaBounds = pathGen.bounds({ type: 'FeatureCollection', features: africaFeatures });
    const africaCx = (africaBounds[0][0] + africaBounds[1][0]) / 2;
    const africaCy = (africaBounds[0][1] + africaBounds[1][1]) / 2;
    const zoomScale = mapFocusAfrica
      ? (compact ? 1.85 : 2.05)
      : (compact ? 1.28 : 1.42);
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
      iw - (compact ? 96 : 110),
      ih - (compact ? 182 : 206),
      'MPI',
      iw,
      ih
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
    mapFocusAfrica = false;
    viewType = 'map';
    updateToggle();
    draw();
  };
  container._mpiZoomAfrica = () => {
    mapFocusAfrica = true;
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
  container._getHelpContext = () => ({
    viewType,
    mode,
  });
}
