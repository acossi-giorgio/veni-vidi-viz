async function renderIncomeChoroplethChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const numericToAlpha3 = {
    4:'AFG',8:'ALB',12:'DZA',16:'ASM',20:'AND',24:'AGO',28:'ATG',32:'ARG',36:'AUS',40:'AUT',
    31:'AZE',44:'BHS',48:'BHR',50:'BGD',52:'BRB',56:'BEL',60:'BMU',64:'BTN',68:'BOL',
    70:'BIH',72:'BWA',76:'BRA',84:'BLZ',90:'SLB',96:'BRN',100:'BGR',104:'MMR',108:'BDI',
    112:'BLR',116:'KHM',120:'CMR',124:'CAN',132:'CPV',136:'CYM',140:'CAF',144:'LKA',
    148:'TCD',152:'CHL',156:'CHN',158:'TWN',170:'COL',174:'COM',175:'MYT',178:'COG',
    180:'COD',184:'COK',188:'CRI',191:'HRV',192:'CUB',196:'CYP',203:'CZE',204:'BEN',
    208:'DNK',212:'DMA',214:'DOM',218:'ECU',222:'SLV',226:'GNQ',231:'ETH',232:'ERI',
    233:'EST',234:'FRO',238:'FLK',242:'FJI',246:'FIN',250:'FRA',258:'PYF',262:'DJI',
    266:'GAB',268:'GEO',270:'GMB',275:'PSE',276:'DEU',288:'GHA',292:'GIB',296:'KIR',
    300:'GRC',304:'GRL',308:'GRD',312:'GLP',316:'GUM',320:'GTM',324:'GIN',328:'GUY',
    332:'HTI',340:'HND',344:'HKG',348:'HUN',352:'ISL',356:'IND',360:'IDN',364:'IRN',
    368:'IRQ',372:'IRL',376:'ISR',380:'ITA',384:'CIV',388:'JAM',392:'JPN',398:'KAZ',
    400:'JOR',404:'KEN',408:'PRK',410:'KOR',414:'KWT',417:'KGZ',418:'LAO',422:'LBN',
    426:'LSO',428:'LVA',430:'LBR',434:'LBY',438:'LIE',440:'LTU',442:'LUX',446:'MAC',
    450:'MDG',454:'MWI',458:'MYS',462:'MDV',466:'MLI',470:'MLT',474:'MTQ',478:'MRT',
    480:'MUS',484:'MEX',492:'MCO',496:'MNG',498:'MDA',499:'MNE',504:'MAR',508:'MOZ',
    512:'OMN',516:'NAM',524:'NPL',528:'NLD',531:'CUW',533:'ABW',534:'SXM',540:'NCL',
    548:'VUT',551:'ARM',554:'NZL',558:'NIC',562:'NER',566:'NGA',578:'NOR',580:'MNP',
    583:'FSM',584:'MHL',585:'PLW',586:'PAK',591:'PAN',598:'PNG',600:'PRY',604:'PER',
    608:'PHL',616:'POL',620:'PRT',624:'GNB',626:'TLS',630:'PRI',634:'QAT',638:'REU',
    642:'ROU',643:'RUS',646:'RWA',659:'KNA',660:'AIA',662:'LCA',670:'VCT',674:'SMR',
    678:'STP',682:'SAU',686:'SEN',688:'SRB',690:'SYC',694:'SLE',702:'SGP',703:'SVK',
    704:'VNM',705:'SVN',706:'SOM',710:'ZAF',716:'ZWE',724:'ESP',728:'SSD',729:'SDN',
    732:'ESH',740:'SUR',748:'SWZ',752:'SWE',756:'CHE',760:'SYR',762:'TJK',764:'THA',
    768:'TGO',776:'TON',780:'TTO',784:'ARE',788:'TUN',792:'TUR',795:'TKM',798:'TUV',
    800:'UGA',804:'UKR',807:'MKD',818:'EGY',826:'GBR',831:'GGY',832:'JEY',833:'IMN',
    834:'TZA',840:'USA',850:'VIR',854:'BFA',858:'URY',860:'UZB',862:'VEN',882:'WSM',
    887:'YEM',894:'ZMB',51:'ARM',
  };

  const CONT_COLOR = {
    'Africa': getContinentColor('Africa', '#c96a3d'),
    'Europe': getContinentColor('Europe', '#5169b2'),
  };
  const UI_ACTIVE = getActColor(1, getUiColor('controlActive', '#5169b2'));
  const UI_ACTIVE_STRONG = getActColorStrong(1, getUiColor('controlActiveStrong', '#314685'));
  const UI_MUTED_INK = getUiColor('controlMutedInk', '#75695d');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const CHART_WATER = getUiColor('chartWater', '#ece8e0');
  const CHART_BASE_FILL = getUiColor('chartBaseFill', '#d6d0c5');
  const CHART_NODATA_FILL = getUiColor('chartNoDataFill', '#c3baad');
  const CHART_GRID = getUiColor('chartGrid', '#e8e1d7');
  const CHART_AXIS = getUiColor('chartAxis', '#a49788');
  const CHART_LABEL = getUiColor('chartLabel', '#73675c');
  const CHORO_COLORS = ['#e3f0ff', '#b8d8ff', '#79b5f2', '#3f8fda', '#145ea8'];
  const CONT_ORDER = ['Africa', 'Europe'];
  const INTERACTIVE_CONTINENTS = new Set(CONT_ORDER);
  const EXCLUDED_CODES = new Set(['RUS']);

  const [incomeRows, geoData] = await Promise.all([
    d3.csv('datasets/processed/income.csv', d3.autoType),
    d3.json('datasets/raw/countries-110m.json'),
  ]);
  const incomeRaw = incomeRows.filter(d => d?.code && !EXCLUDED_CODES.has(d.code));

  const countries = topojson.feature(geoData, geoData.objects.countries).features;

  const codeToContinent = {};
  incomeRaw.forEach(d => { if (d.code && d.continent) codeToContinent[d.code] = d.continent; });
  const mappableCodes = new Set(
    countries
      .map(f => numericToAlpha3[+f.id] || '')
      .filter(code => code && INTERACTIVE_CONTINENTS.has(codeToContinent[code]))
  );

  function buildMap(raw) {
    const m = {};
    raw.forEach(d => {
      if (d.value == null) return;
      if (!m[d.year]) m[d.year] = {};
      m[d.year][d.code] = d.value;
    });
    return m;
  }

  function buildSeries(raw) {
    const s = {};
    raw.forEach(d => {
      if (!s[d.code]) s[d.code] = { country: d.country, pts: [] };
      if (d.value != null) s[d.code].pts.push({ year: d.year, value: d.value });
    });
    Object.values(s).forEach(v => v.pts.sort((a, b) => a.year - b.year));
    return s;
  }

  function buildContStats(raw) {
    const valid = raw.filter(d => d.value != null && d.code && d.continent);
    const result = new Map();
    d3.group(valid, d => d.continent).forEach((rows, cont) => {
      const byYear = d3.rollup(rows, v => {
        const mean = d3.mean(v, d => d.value);
        const std  = d3.deviation(v, d => d.value) || 0;
        return { mean, lo: Math.max(0, mean - std), hi: mean + std, n: v.length };
      }, d => d.year);
      result.set(cont, Array.from(byYear, ([year, s]) => ({ year, ...s })).sort((a, b) => a.year - b.year));
    });
    return result;
  }

  const incomeMap    = buildMap(incomeRaw);
  const incomeSeries = buildSeries(incomeRaw);
  const incomeStats  = buildContStats(incomeRaw);
  const incomeEligibleByCont = new Map(CONT_ORDER.map(cont => [
    cont,
    new Set(incomeRaw.filter(d => d.value != null && d.continent === cont).map(d => d.code)),
  ]));

  const incomeYears = Object.keys(incomeMap).map(Number).sort((a, b) => a - b);
  const visibleYears = incomeYears.filter(y => y >= 2000 && y <= 2023);
  let currentYear  = visibleYears[0];
  let selectedCode = null;
  let viewType     = 'map';
  let playing      = false;
  let animTimer    = null;
  let africaZoomTimer = null;

  const rawW = container.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 800);
  const rawH = container.clientHeight || (isFullscreen ? window.innerHeight * 0.8 : 480);
  const compact = isFullscreen && (rawW < 760 || rawH < 420);
  const SERIES_STROKE_W = compact ? 2.2 : 2.5;
  const SERIES_DOT_R = compact ? 4.2 : 4.8;
  const SERIES_DOT_STROKE_W = compact ? 1.4 : 1.7;
  const SERIES_DOT_STROKE = '#f7f7f5';
  const TREND_LINE_DRAW_MS = 1400;
  const DOT_FADE_MS = 320;
  const LABEL_FADE_MS = 220;
  const PLAYER_H = compact ? 64 : 72;
  const W = rawW;
  const H = rawH - PLAYER_H;
  const viewToggle = d3.select(container).append('div')
    .style('position', 'absolute').style('top', compact ? '6px' : '10px').style('left', compact ? '6px' : '10px')
    .style('z-index', '20').style('display', 'flex').style('flex-direction', 'column')
    .style('gap', '4px');

  const pillWrap = viewToggle.append('div')
    .style('display', 'flex').style('background', 'rgba(255,255,255,0.92)')
    .style('border-radius', '9px').style('border', '1px solid #d0d8e8')
    .style('padding', '3px').style('gap', '2px')
    .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)');

  function mkPill(label, val) {
    return pillWrap.append('button')
      .style('font-size', compact ? '10px' : '11px').style('padding', compact ? '4px 10px' : '5px 14px').style('border-radius', '6px')
      .style('border', 'none').style('cursor', 'pointer').style('font-weight', '600')
      .style('transition', 'all 0.15s').style('white-space', 'nowrap')
      .text(label)
      .on('click', () => { viewType = val; updateViewToggle(); renderView(); });
  }

  const btnMap   = mkPill('Map', 'map');
  const btnTrend = mkPill('Trend', 'trend');

  function updateViewToggle() {
    [{ btn: btnMap, val: 'map' }, { btn: btnTrend, val: 'trend' }].forEach(({ btn, val }) => {
      const active = viewType === val;
      btn.style('background', active ? UI_ACTIVE : 'transparent')
         .style('color', active ? '#fff' : UI_MUTED_INK)
         .style('box-shadow', active ? `0 1px 4px ${colorToRgba(UI_ACTIVE, 0.3)}` : 'none');
    });
  }
  updateViewToggle();

  function mountInteractionNote(hostSelection, lines) {
    const noteCompact = compact || W < 720 || H < 360;
    hostSelection.selectAll('.chart-interaction-note').remove();
    return hostSelection.append('div')
      .attr('class', 'chart-interaction-note')
      .style('position', 'absolute')
      .style('left', compact ? '10px' : '12px')
      .style('bottom', compact ? '10px' : '12px')
      .style('z-index', '25')
      .style('pointer-events', 'none')
      .style('background', 'rgba(255,255,255,0.94)')
      .style('border', `1px solid ${UI_MUTED_BORDER}`)
      .style('border-radius', '8px')
      .style('padding', noteCompact ? '9px 12px' : '12px 16px')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.11)')
      .style('color', UI_MUTED_INK)
      .style('font-size', noteCompact ? '10px' : '11.5px')
      .style('font-weight', '600')
      .style('line-height', '1.5')
      .html(lines.map(line => `
        <div style="display:flex;align-items:center;gap:${noteCompact ? '7px' : '9px'};">
          <span>${line.label}</span>
          <span style="color:${UI_MUTED_INK};font-size:${noteCompact ? '13px' : '15px'};line-height:1;">&rarr;</span>
          <span>${line.value}</span>
        </div>
      `).join(''));
  }

  const AFRICA_CODES = new Set(incomeRaw.filter(d => d.value != null && d.continent === 'Africa' && d.code).map(d => d.code));
  const africaFeatures = countries.filter(feature => AFRICA_CODES.has(numericToAlpha3[+feature.id] || ''));
  const focusFeatures = countries.filter(feature => mappableCodes.has(numericToAlpha3[+feature.id] || ''));

  function getFocusZoomTransform() {
    if (!focusFeatures.length) return d3.zoomIdentity;
    const bounds = geoPath.bounds({ type: 'FeatureCollection', features: focusFeatures });
    const dx = bounds[1][0] - bounds[0][0];
    const dy = bounds[1][1] - bounds[0][1];
    const cx = (bounds[0][0] + bounds[1][0]) / 2;
    const cy = (bounds[0][1] + bounds[1][1]) / 2;
    const scale = Math.min(1.45, 0.88 / Math.max(dx / W, dy / H));
    return d3.zoomIdentity.translate(W / 2 - scale * cx, H / 2 - scale * cy).scale(scale);
  }

  function getAfricaZoomTransform() {
    if (!africaFeatures.length) return d3.zoomIdentity;
    const bounds = geoPath.bounds({ type: 'FeatureCollection', features: africaFeatures });
    const dx = bounds[1][0] - bounds[0][0];
    const dy = bounds[1][1] - bounds[0][1];
    const cx = (bounds[0][0] + bounds[1][0]) / 2;
    const cy = (bounds[0][1] + bounds[1][1]) / 2;
    const scale = Math.min(5.5, 0.9 / Math.max(dx / W, dy / H));
    return d3.zoomIdentity.translate(W / 2 - scale * cx, H / 2 - scale * cy).scale(scale);
  }

  function cancelAfricaZoom() {
    if (africaZoomTimer) {
      clearTimeout(africaZoomTimer);
      africaZoomTimer = null;
    }
  }

  function showMapView({ autoplay = false, zoomAfrica = false, year = visibleYears[0] } = {}) {
    cancelAfricaZoom();
    stopPlay();
    closePanel();
    selectedCode = null;
    currentYear = visibleYears.includes(year) ? year : visibleYears[0];
    viewType = 'map';
    updateViewToggle();
    updateColors(false);
    renderView();

    if (zoomAfrica) {
      africaZoomTimer = window.setTimeout(() => {
        africaZoomTimer = null;
        svg.transition().duration(500).call(zoom.transform, getAfricaZoomTransform());
      }, 240);
    } else {
      svg.transition().duration(350).call(zoom.transform, getFocusZoomTransform());
    }

    if (autoplay) startPlay();
  }

  function showTrendView() {
    cancelAfricaZoom();
    stopPlay();
    closePanel();
    viewType = 'trend';
    updateViewToggle();
    renderView();
  }
  const mapDiv = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('width', '100%').style('height', `calc(100% - ${PLAYER_H}px)`);

  mountInteractionNote(mapDiv, [
    { label: 'Click on a country', value: 'opens the details' },
  ]);

  const svg = mapDiv.append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('height', '100%')
    .style('background', CHART_WATER).style('display', 'block').style('border-radius', '0')
    .style('cursor', 'grab');

  svg.append('defs').append('clipPath').attr('id', `chm-clip-${isFullscreen}`)
    .append('rect').attr('width', W).attr('height', H);

  const mapGroup = svg.append('g').attr('clip-path', `url(#chm-clip-${isFullscreen})`);
  const NO_DATA_PATTERN = ensureNoDataPattern(svg, `chm-nodata-${isFullscreen ? 'fs' : 'ed'}`, {
    background: CHART_NODATA_FILL,
    stripe: getUiColor('chartNoDataStripe', shadeColor(CHART_NODATA_FILL, 0.24)),
  });

  const projection = d3.geoNaturalEarth1()
    .fitExtent([[4, 16], [W - 4, H - 16]], { type: 'FeatureCollection', features: countries });
  const geoPath = d3.geoPath().projection(projection);

  const paths = mapGroup.selectAll('path.country')
    .data(countries).join('path').attr('class', 'country')
    .attr('d', geoPath).attr('stroke', '#fff').attr('stroke-width', 0.35);

  const zoom = d3.zoom().scaleExtent([1, 8])
    .on('zoom', e => { mapGroup.attr('transform', e.transform); svg.style('cursor', 'grabbing'); })
    .on('end', () => svg.style('cursor', 'grab'));
  svg.call(zoom);

  const tipEl = window.ensureHoverTooltip('income-choropleth-tooltip');

  const colorScale = d3.scaleQuantile().range(CHORO_COLORS);

  function getYearData(year) {
    const ys = incomeYears;
    const best = ys.reduce((a, b) => Math.abs(b - year) < Math.abs(a - year) ? b : a);
    return incomeMap[best] || {};
  }

  function getYearValues(data) {
    return Object.entries(data)
      .filter(([code, v]) => mappableCodes.has(code) && v != null && v > 0)
      .map(([, v]) => v);
  }

  function fmtLegendValue(v) {
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${Math.round(v / 1e3)}k`;
    return `$${Math.round(v)}`;
  }
  function isInteractiveCountry(code) {
    return INTERACTIVE_CONTINENTS.has(codeToContinent[code]);
  }

  function updateColors(transition = true) {
    const data = getYearData(currentYear);
    const vals = getYearValues(data);
    colorScale.domain(vals.length ? vals : [0, 1]);
    const upd  = transition ? paths.transition().duration(300) : paths;
    upd.attr('fill', d => {
      const code = numericToAlpha3[+d.id] || '';
      if (!isInteractiveCountry(code)) return CHART_BASE_FILL;
      const v = data[code];
      return v != null ? colorScale(v) : NO_DATA_PATTERN;
    })
    .attr('pointer-events', d => {
      const code = numericToAlpha3[+d.id] || '';
      return isInteractiveCountry(code) ? 'all' : 'none';
    })
    .style('cursor', d => {
      const code = numericToAlpha3[+d.id] || '';
      return isInteractiveCountry(code) ? 'pointer' : 'default';
    });
    yearDisplay.text(currentYear);
    sliderEl.property('value', currentYear);
    updateLegend();
    updatePanelYear();
  }
  const legG = svg.append('g').attr('class', 'chm-legend chart-legend');
  function updateLegend() {
    legG.selectAll('*').remove();
    const data = getYearData(currentYear);
    const vals = getYearValues(data).sort((a, b) => a - b);
    if (!vals.length) return;
    colorScale.domain(vals.length ? vals : [0, 1]);

    const STEPS = CHORO_COLORS.length;
    const SW = compact ? 18 : 22;
    const SH = compact ? 13 : 16;
    const GAP = 0;
    const stackH = STEPS * SH + (STEPS - 1) * GAP;
    const LABEL_X = SW + (compact ? 6 : 8);
    const titleGap = compact ? 16 : 18;
    const noDataGap = compact ? 6 : 8;
    const totalH = titleGap + stackH + noDataGap + SH + (compact ? 12 : 14);
    const totalW = compact ? 118 : 132;
    const px = W - totalW - (compact ? 6 : 10), py = H - totalH - (compact ? 6 : 10);
    legG.append('rect')
      .attr('x', px - 8).attr('y', py - 5)
      .attr('width', totalW + 10).attr('height', totalH + 6)
      .attr('rx', 8).attr('fill', 'rgba(255,255,255,0.92)')
      .attr('stroke', UI_MUTED_BORDER).attr('stroke-width', 1);
    legG.append('text')
      .attr('x', px).attr('y', py + 10)
      .attr('font-size', compact ? 7 : 8).attr('font-weight', '700').attr('fill', CHART_AXIS)
      .attr('letter-spacing', '0.07em').text('GDP PER CAPITA (USD)');

    const q = colorScale.quantiles();
    const bins = [];
    for (let i = 0; i < STEPS; i++) {
      const lo = i === 0 ? vals[0] : q[i - 1];
      const hi = i === STEPS - 1 ? vals[vals.length - 1] : q[i];
      bins.push({ lo, hi, color: CHORO_COLORS[i] });
    }
    bins.reverse();

    const stackY = py + titleGap;
    bins.forEach((b, i) => {
      const cy = stackY + i * (SH + GAP);
      legG.append('rect')
        .attr('x', px).attr('y', cy)
        .attr('width', SW).attr('height', SH)
        .attr('fill', b.color);
      legG.append('text')
        .attr('x', px + LABEL_X)
        .attr('y', cy + SH / 2 + (compact ? 3 : 4))
        .attr('font-size', compact ? 8 : 9)
        .attr('fill', CHART_LABEL)
        .text(
          i === 0
            ? `> ${fmtLegendValue(b.lo)}`
            : i === bins.length - 1
              ? `< ${fmtLegendValue(b.hi)}`
              : fmtLegendValue(b.hi)
        );
    });
    const ndY = stackY + stackH + noDataGap;
    legG.append('rect')
      .attr('x', px).attr('y', ndY)
      .attr('width', SW).attr('height', SH).attr('rx', 2)
      .attr('fill', NO_DATA_PATTERN)
      .attr('stroke', UI_MUTED_BORDER)
      .attr('stroke-width', 0.5);
    legG.append('text')
      .attr('x', px + LABEL_X).attr('y', ndY + SH / 2 + 4)
      .attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS).text('No data');
  }
  const PANEL_W = 346, PANEL_H = 260;
  const panel = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('width', PANEL_W + 'px').style('background', 'rgba(255,255,255,0.97)')
    .style('border', `1px solid ${UI_MUTED_BORDER}`).style('border-radius', '10px')
    .style('padding', '12px 14px').style('display', 'none').style('z-index', '30')
    .style('box-shadow', '0 4px 18px rgba(0,0,0,0.16)').style('pointer-events', 'auto');
  let panelDot  = null;
  let panelLine = null;
  let panelVal  = null;
  let panelXS   = null;
  let panelYS   = null;
  let panelPts  = null;
  const PANEL_MIN_YEAR = 2000;
  const PANEL_MAX_YEAR = 2024;

  function closePanel() {
    selectedCode = null;
    paths.attr('opacity', 1).attr('stroke-width', 0.35);
    panel.style('display', 'none');
    panelDot = panelLine = panelVal = panelXS = panelYS = panelPts = null;
  }

  function positionPanel(event) {
    const cr = container.getBoundingClientRect();
    const panelBox = panel.node()?.getBoundingClientRect();
    const panelW = panelBox?.width || PANEL_W;
    const panelH = panelBox?.height || PANEL_H;
    let px = event.clientX - cr.left + 16;
    let py = event.clientY - cr.top  - 24;
    if (px + panelW > cr.width  - 4) px = event.clientX - cr.left - panelW - 16;
    if (py + panelH > cr.height - 4) py = cr.height - panelH - 4;
    if (px < 4) px = 4;
    if (py < 4) py = 4;
    panel.style('left', px + 'px').style('top', py + 'px');
  }

  function updatePanelYear() {
    if (!panelDot || !panelPts || !panelXS || !panelYS || !panelVal) return;
    const near = panelPts.reduce((a, b) => Math.abs(b.year - currentYear) < Math.abs(a.year - currentYear) ? b : a);
    panelDot.attr('cx', panelXS(near.year)).attr('cy', panelYS(near.value));
    panelLine.attr('x1', panelXS(near.year)).attr('x2', panelXS(near.year)).attr('y1', 0).attr('y2', panelYS.range()[0]);
    panelVal.text(`${near.year}: $${d3.format(',.0f')(near.value)}`);
  }

  function renderPanel(code, event) {
    const s = incomeSeries[code];
    panel.style('display', 'block').html('');

    const hdr = panel.append('div').style('display', 'flex').style('align-items', 'flex-start').style('justify-content', 'space-between').style('margin-bottom', '4px');
    hdr.append('div').style('font-weight', '700').style('font-size', '14px').style('color', getCssToken('ink', '#1f1d1a')).style('line-height', '1.3').text(s ? s.country : code);
    hdr.append('button')
      .style('background', 'none').style('border', 'none').style('cursor', 'pointer')
      .style('font-size', '18px').style('color', CHART_AXIS).style('line-height', '1').style('padding', '0 0 0 8px')
      .style('flex-shrink', '0').text('×').on('click', closePanel);

    if (!s) { panel.append('p').style('font-size', '11px').style('color', '#999').text('No data'); return; }
    panel.append('div').style('font-size', '10px').style('color', CHART_AXIS).style('margin-bottom', '10px').text('GDP per capita (USD)');

    const pw = PANEL_W - 28, ph = 170, pm = { top: 8, right: 22, bottom: 24, left: 48 };
    const iw = pw - pm.left - pm.right, ih = ph - pm.top - pm.bottom;
    const psvg = panel.append('svg').attr('width', pw).attr('height', ph);
    const pg = psvg.append('g').attr('transform', `translate(${pm.left},${pm.top})`);

    const pts = s.pts.filter(p => p.year >= PANEL_MIN_YEAR && p.year <= PANEL_MAX_YEAR && p.value != null && p.value > 0);
    if (!pts.length) { panel.append('p').style('font-size', '11px').style('color', '#999').text('No data'); return; }

    const valueByYear = new Map(pts.map(p => [p.year, p.value]));
    const panelSeries = d3.range(PANEL_MIN_YEAR, PANEL_MAX_YEAR + 1).map(year => ({
      year,
      value: valueByYear.has(year) ? valueByYear.get(year) : null,
    }));
    const gapSegments = [];
    for (let i = 1; i < pts.length; i += 1) {
      const prev = pts[i - 1];
      const next = pts[i];
      if ((next.year - prev.year) > 1) gapSegments.push({ prev, next });
    }

    const xS = d3.scaleLinear().domain([PANEL_MIN_YEAR, PANEL_MAX_YEAR]).range([0, iw]);
    const yExt = d3.extent(pts, p => p.value);
    const yS = d3.scaleLinear().domain([yExt[0] * 0.9, yExt[1] * 1.05]).range([ih, 0]);
    yS.ticks(4).forEach(t => pg.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t)).attr('stroke', CHART_GRID).attr('stroke-width', 1));

    pg.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xS).tickValues([2000, 2005, 2010, 2015, 2020, 2024]).tickFormat(d3.format('d'))).attr('font-size', 8).call(ax => ax.select('.domain').remove());
    pg.append('g').call(d3.axisLeft(yS).ticks(4).tickFormat(v => `$${d3.format('.2s')(v)}`)).attr('font-size', 8).call(ax => ax.select('.domain').remove());
    pg.append('path').datum(panelSeries)
      .attr('fill', UI_ACTIVE).attr('fill-opacity', 0.08)
      .attr('d', d3.area().x(p => xS(p.year)).y0(ih).y1(p => yS(p.value)).defined(p => p.value != null && p.value > 0).curve(d3.curveMonotoneX));

    pg.append('path').datum(panelSeries)
      .attr('fill', 'none').attr('stroke', UI_ACTIVE).attr('stroke-width', SERIES_STROKE_W)
      .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
      .attr('d', d3.line().x(p => xS(p.year)).y(p => yS(p.value)).defined(p => p.value != null && p.value > 0).curve(d3.curveMonotoneX));

    gapSegments.forEach(({ prev, next }) => {
      pg.append('line')
        .attr('x1', xS(prev.year)).attr('y1', yS(prev.value))
        .attr('x2', xS(next.year)).attr('y2', yS(next.value))
        .attr('stroke', UI_ACTIVE)
        .attr('stroke-width', Math.max(1.2, SERIES_STROKE_W - 0.3))
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.72);
      pg.append('circle')
        .attr('cx', xS(prev.year)).attr('cy', yS(prev.value))
        .attr('r', 2.2)
        .attr('fill', UI_ACTIVE);
      pg.append('circle')
        .attr('cx', xS(next.year)).attr('cy', yS(next.value))
        .attr('r', 2.2)
        .attr('fill', UI_ACTIVE);
    });

    const near = pts.reduce((a, b) => Math.abs(b.year - currentYear) < Math.abs(a.year - currentYear) ? b : a);
    panelLine = pg.append('line')
      .attr('x1', xS(near.year)).attr('x2', xS(near.year)).attr('y1', 0).attr('y2', ih)
      .attr('stroke', CONT_COLOR.Africa).attr('stroke-width', 1).attr('stroke-dasharray', '3,2').attr('opacity', 0.7);
    panelDot = pg.append('circle')
      .attr('cx', xS(near.year)).attr('cy', yS(near.value))
      .attr('r', SERIES_DOT_R).attr('fill', CONT_COLOR.Africa).attr('stroke', SERIES_DOT_STROKE).attr('stroke-width', SERIES_DOT_STROKE_W);

    panelVal = panel.append('div')
      .style('font-size', '12px').style('color', CHART_LABEL).style('margin-top', '6px').style('font-weight', '600')
      .text(`${near.year}: $${d3.format(',.0f')(near.value)}`);
    panelXS  = xS;
    panelYS  = yS;
    panelPts = pts;
    pg.append('rect')
      .attr('width', iw).attr('height', ih).attr('fill', 'transparent').style('cursor', 'ew-resize')
      .on('mousemove', function(event) {
        const [mx] = d3.pointer(event);
        const hoverYear = xS.invert(Math.max(0, Math.min(iw, mx)));
        const hoverPt = pts.reduce((a, b) => Math.abs(b.year - hoverYear) < Math.abs(a.year - hoverYear) ? b : a);
        panelDot.attr('cx', xS(hoverPt.year)).attr('cy', yS(hoverPt.value));
        panelLine.attr('x1', xS(hoverPt.year)).attr('x2', xS(hoverPt.year));
        panelVal.text(`${hoverPt.year}: $${d3.format(',.0f')(hoverPt.value)}`);
        if (hoverPt.year !== currentYear) {
          currentYear = hoverPt.year;
          updateColors();
        }
      })
      .on('mouseleave', () => updatePanelYear());

    if (event) positionPanel(event);
  }

  paths
    .on('mouseover', function (event, d) {
      if (selectedCode) {
        window.hideHoverTooltip(tipEl);
        return;
      }
      const code = numericToAlpha3[+d.id] || '';
      if (!isInteractiveCountry(code)) return;
      const data = getYearData(currentYear);
      const v    = data[code];
      const name = incomeSeries[code]?.country || code || '?';
      const fv   = v != null ? `$${d3.format(',.0f')(v)}` : 'N/D';
      window.showHoverTooltip(tipEl, event, {
        title: name,
        meta: `Year: ${currentYear}`,
        rows: [
          { label: 'GDP per capita', value: fv },
        ],
      });
    })
    .on('mousemove', event => {
      if (selectedCode) return;
      window.positionHoverTooltip(tipEl, event);
    })
    .on('mouseleave', function () {
      window.hideHoverTooltip(tipEl);
    })
    .on('click', function (event, d) {
      const code = numericToAlpha3[+d.id] || '';
      if (!isInteractiveCountry(code)) return;
      window.hideHoverTooltip(tipEl);
      if (selectedCode === code) {
        closePanel();
      } else {
        selectedCode = code;
        paths.attr('opacity', dd => numericToAlpha3[+dd.id] === code ? 1 : 0.35)
          .attr('stroke-width', dd => numericToAlpha3[+dd.id] === code ? 1.2 : 0.35);
        renderPanel(code, event);
      }
    });
  const trendDiv = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('width', '100%').style('height', '100%')
    .style('display', 'none').style('background', '#fff').style('border-radius', '10px');

  const trendTip = window.ensureHoverTooltip('chm-trend-tip', {
    className: 'chart-hover-tooltip chart-hover-tooltip--light',
    maxWidth: 'min(92vw, 18rem)',
  });

  function drawTrend() {
    trendDiv.selectAll('*').remove();
    const MARGIN = compact
      ? { top: 24, right: 36, bottom: 34, left: 50 }
      : { top: 32, right: 72, bottom: 40, left: 68 };
    const tw = container.clientWidth || W;
    const th = container.clientHeight || H + PLAYER_H;
    const iw = tw - MARGIN.left - MARGIN.right;
    const ih = th - MARGIN.top  - MARGIN.bottom;

    const tsvg = trendDiv.append('svg').attr('width', tw).attr('height', th)
      .style('width', '100%').style('height', '100%').style('display', 'block');
    const g = tsvg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    const allPts = Array.from(incomeStats.values()).flat().filter(d => d.year >= 2000 && d.year <= 2023);
    const xDomain = d3.extent(allPts, d => d.year);
    const allYears = [...new Set(allPts.map(d => d.year))].sort((a, b) => a - b);
    const meanVals = allPts.map(d => d.mean).filter(v => v != null && isFinite(v) && v > 0);
    const [mLo, mHi] = d3.extent(meanVals);
    const xS = d3.scaleLinear().domain(xDomain).range([0, iw]);
    const yS = d3.scaleLinear().domain([Math.max(0, mLo * 0.95), mHi * 1.05]).range([ih, 0]).nice();
    const statsByContYear = new Map();
    CONT_ORDER.forEach(cont => {
      const stats = (incomeStats.get(cont) || []).filter(pt => pt.year >= 2000 && pt.year <= 2023);
      stats.forEach(pt => {
        if (!statsByContYear.has(pt.year)) statsByContYear.set(pt.year, {});
        statsByContYear.get(pt.year)[cont] = pt.mean;
      });
    });

    yS.ticks(6).forEach(t => {
      g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t))
        .attr('stroke', CHART_GRID).attr('stroke-width', 1);
    });
    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xS).ticks(6).tickFormat(d3.format('d')))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick text').attr('font-size', 9).attr('fill', CHART_AXIS); ax.selectAll('.tick line').attr('stroke', CHART_GRID); });
    g.append('g')
      .call(d3.axisLeft(yS).ticks(6).tickFormat(v => `$${d3.format('.2s')(v)}`))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick text').attr('font-size', 9).attr('fill', CHART_AXIS); ax.selectAll('.tick line').remove(); });
    g.append('text').attr('class', 'chart-axis-label').attr('x', iw / 2).attr('y', ih + (compact ? 28 : 34)).attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_LABEL).text('Year');
    g.append('text').attr('class', 'chart-axis-label').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -(compact ? 34 : 46)).attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_LABEL).text('GDP per capita (USD)');

    const lineFn = d3.line().x(d => xS(d.year)).y(d => yS(d.mean)).curve(d3.curveMonotoneX).defined(d => d.mean != null && d.mean > 0);
    CONT_ORDER.forEach((continent, ci) => {
      const stats = (incomeStats.get(continent) || []).filter(pt => pt.year >= 2000 && pt.year <= 2023);
      if (!stats.length) return;
      const color = CONT_COLOR[continent] || '#888';
      const path = g.append('path').datum(stats)
        .attr('fill', 'none').attr('stroke', color).attr('stroke-width', SERIES_STROKE_W).attr('opacity', 0.9)
        .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
        .attr('d', lineFn).style('pointer-events', 'none');
      const len = path.node().getTotalLength();
      path.attr('stroke-dasharray', len).attr('stroke-dashoffset', len)
        .transition().duration(TREND_LINE_DRAW_MS).delay(ci * 200).ease(d3.easeCubicInOut)
        .attr('stroke-dashoffset', 0);

      g.selectAll(`.trend-point-${continent}`)
        .data(stats.filter(pt => pt.mean != null && pt.mean > 0))
        .join('circle')
        .attr('class', `trend-point-${continent}`)
        .attr('cx', d => xS(d.year))
        .attr('cy', d => yS(d.mean))
        .attr('r', SERIES_DOT_R)
        .attr('fill', color)
        .attr('stroke', SERIES_DOT_STROKE)
        .attr('stroke-width', SERIES_DOT_STROKE_W)
        .attr('opacity', 0)
        .style('pointer-events', 'none')
        .transition()
        .delay(ci * 200 + TREND_LINE_DRAW_MS + 60)
        .duration(DOT_FADE_MS)
        .attr('opacity', 0.98);

      const last = stats[stats.length - 1];
      if (last) {
        const lbl = g.append('text').attr('x', xS(last.year) + 4).attr('y', yS(last.mean) + 3)
          .attr('font-size', 9).attr('fill', color).attr('font-weight', '600')
          .attr('opacity', 0).style('pointer-events', 'none').text(continent);
        lbl.transition().duration(LABEL_FADE_MS).delay(ci * 200 + TREND_LINE_DRAW_MS + DOT_FADE_MS + 120).attr('opacity', 0.9);
      }
    });
    const crossLine = g.append('line')
      .attr('y1', 0).attr('y2', ih)
      .attr('stroke', '#333').attr('stroke-width', 1).attr('stroke-dasharray', '4,3')
      .attr('opacity', 0).style('pointer-events', 'none');

    const crossDots = CONT_ORDER.map(cont => ({
      cont,
      dot: g.append('circle').attr('r', SERIES_DOT_R)
        .attr('fill', CONT_COLOR[cont] || '#888').attr('stroke', SERIES_DOT_STROKE).attr('stroke-width', SERIES_DOT_STROKE_W)
        .attr('opacity', 0).style('pointer-events', 'none'),
    }));

    g.append('rect')
      .attr('width', iw).attr('height', ih).attr('fill', 'transparent').style('cursor', 'crosshair')
      .on('mousemove', function(event) {
        const [mx] = d3.pointer(event);
        const year0 = xS.invert(mx);
        const nearYear = allYears.reduce((a, b) => Math.abs(b - year0) < Math.abs(a - year0) ? b : a);
        const cx = xS(nearYear);
        const yearData = statsByContYear.get(nearYear) || {};

        crossLine.attr('x1', cx).attr('x2', cx).attr('opacity', 0.6);

        crossDots.forEach(({ cont, dot }) => {
          const v = yearData[cont];
          if (v != null) {
            dot.attr('cx', cx).attr('cy', yS(v)).attr('opacity', 1);
          } else {
            dot.attr('opacity', 0);
          }
        });

        const titleHtml = `
          <span style="color:${CONT_COLOR.Africa}">Africa</span>
          <span style="color:#334155"> vs </span>
          <span style="color:${CONT_COLOR.Europe}">Europe</span>
        `;
        window.showHoverTooltip(trendTip, event, {
          titleHtml,
          meta: `Year: ${nearYear}`,
          sections: CONT_ORDER.map(cont => {
            const v = yearData[cont];
            const covered = ((incomeStats.get(cont) || []).find(pt => pt.year === nearYear)?.n) || 0;
            const total = incomeEligibleByCont.get(cont)?.size || 0;
            return {
              title: cont,
              rows: [
                { label: 'GDP per capita', value: v != null ? `$${d3.format(',.0f')(v)}` : 'N/A' },
                { label: 'Countries involved', value: `${covered}/${total} countries` },
              ],
            };
          }),
        }, { offsetX: 14, offsetY: -28 });
      })
      .on('mouseleave', () => {
        crossLine.attr('opacity', 0);
        crossDots.forEach(({ dot }) => dot.attr('opacity', 0));
        window.hideHoverTooltip(trendTip);
      });
  }
  const playerBar = d3.select(container).append('div')
    .style('position', 'absolute').style('bottom', '0').style('left', '0').style('right', '0')
    .style('height', PLAYER_H + 'px')
    .style('background', getCssToken('surface-raised', '#ffffff'))
    .style('border-radius', '0 0 10px 10px')
    .style('border-top', `1px solid ${CHART_GRID}`)
    .style('display', 'flex').style('align-items', 'center')
    .style('padding', compact ? '0 10px' : '0 16px').style('gap', compact ? '10px' : '14px').style('z-index', '20')
    .style('box-shadow', '0 -2px 8px rgba(0,0,0,0.04)');
  const ctrlWrap = playerBar.append('div')
    .style('display', 'flex').style('align-items', 'center').style('gap', '6px').style('flex-shrink', '0');

  function mkCtrlBtn(inner, title) {
    const iconVariant = inner.includes('8249') || inner.includes('8250')
      ? ' player-control-btn-icon--arrow'
      : inner.includes('8635')
        ? ' player-control-btn-icon--reset'
        : '';
    const btn = ctrlWrap.append('div')
      .attr('title', title)
      .attr('role', 'button')
      .attr('tabindex', '0')
      .attr('class', 'player-control-btn')
      .style('width', compact ? '28px' : '30px').style('height', compact ? '28px' : '30px').style('border-radius', '50%')
      .style('border', `1px solid ${UI_MUTED_BORDER}`).style('background', getUiColor('controlMuted', '#f4efe7'))
      .style('cursor', 'pointer').style('display', 'flex').style('align-items', 'center')
      .style('justify-content', 'center').style('font-size', '13px').style('color', UI_ACTIVE)
      .style('flex-shrink', '0').style('transition', 'all 0.15s')
      .style('padding', '0').style('line-height', '1')
      .style('-webkit-appearance', 'none').style('appearance', 'none')
      .style('transform', 'none').style('outline', 'none')
      .style('-webkit-tap-highlight-color', 'transparent')
      .html(`<span class="player-control-btn-icon${iconVariant}">${inner}</span>`);
    btn.on('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        btn.dispatch('click');
      }
    });
    return btn;
  }

  mkCtrlBtn('&#8635;', 'Reset').on('click', () => { stopPlay(); currentYear = visibleYears[0]; updateColors(false); });
  mkCtrlBtn('&#8249;', 'Previous year').style('font-size', '18px').on('click', () => {
    stopPlay();
    const i = visibleYears.indexOf(currentYear);
    if (i > 0) { currentYear = visibleYears[i - 1]; updateColors(); }
  });

  const btnPlay = ctrlWrap.append('button')
    .attr('class', 'player-control-btn')
    .style('width', compact ? '32px' : '36px').style('height', compact ? '32px' : '36px').style('border-radius', '50%')
    .style('border', 'none').style('background', UI_ACTIVE).style('cursor', 'pointer')
    .style('display', 'flex').style('align-items', 'center').style('justify-content', 'center')
    .style('font-size', '15px').style('color', '#fff').style('flex-shrink', '0')
    .style('padding', '0').style('line-height', '1')
    .style('box-shadow', '0 2px 8px rgba(74,111,165,0.4)').style('transition', 'all 0.15s')
    .html('<span class="player-play-icon"><svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="1,0 11,7 1,14"/></svg></span>')
    .on('click', () => playing ? stopPlay() : startPlay());

  mkCtrlBtn('&#8250;', 'Next year').style('font-size', '18px').on('click', () => {
    stopPlay();
    const i = visibleYears.indexOf(currentYear);
    if (i < visibleYears.length - 1) { currentYear = visibleYears[i + 1]; updateColors(); }
  });

  function startPlay() {
    playing = true;
    btnPlay.html('<span class="player-play-icon"><svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><rect x="0" y="0" width="3.5" height="14" rx="1"/><rect x="6.5" y="0" width="3.5" height="14" rx="1"/></svg></span>').style('background', CONT_COLOR.Africa);
    animTimer = setInterval(() => {
      const i = visibleYears.indexOf(currentYear);
      if (i >= visibleYears.length - 1) { stopPlay(); return; }
      currentYear = visibleYears[i + 1];
      updateColors();
    }, 600);
  }

  function stopPlay() {
    playing = false;
    clearInterval(animTimer);
    btnPlay.html('<span class="player-play-icon"><svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="1,0 11,7 1,14"/></svg></span>').style('background', UI_ACTIVE);
  }
  const timelineWrap = playerBar.append('div')
    .style('flex', '1').style('position', 'relative').style('padding', '0 4px');
  const labelRow = timelineWrap.append('div')
    .style('display', 'flex').style('justify-content', 'space-between')
    .style('font-size', '8.5px').style('color', '#bbb').style('margin-bottom', '2px')
    .style('pointer-events', 'none');

  const tickYears = visibleYears.filter((y, i) => i % 5 === 0 || i === visibleYears.length - 1);
  tickYears.forEach(y => labelRow.append('span').text(y));
  const sliderEl = timelineWrap.append('input')
    .attr('type', 'range')
    .attr('min', visibleYears[0]).attr('max', visibleYears[visibleYears.length - 1])
    .attr('step', 1).attr('value', currentYear)
    .style('width', '100%').style('height', '4px').style('cursor', 'pointer')
    .style('accent-color', UI_ACTIVE).style('outline', 'none').style('display', 'block')
    .on('input', function () { stopPlay(); currentYear = +this.value; updateColors(); });
  const yearDisplay = playerBar.append('div')
    .style('font-size', compact ? '20px' : '24px').style('font-weight', '700').style('color', UI_ACTIVE_STRONG)
    .style('min-width', compact ? '42px' : '54px').style('text-align', 'right').style('flex-shrink', '0')
    .style('letter-spacing', '-0.5px').text(currentYear);
  function renderView() {
    if (viewType === 'map') {
      trendDiv.transition().duration(180).style('opacity', '0').on('end', () => {
        trendDiv.style('display', 'none');
        mapDiv.style('display', 'block').style('opacity', '0')
          .transition().duration(320).style('opacity', '1');
        playerBar.style('display', 'flex').style('opacity', '0')
          .transition().duration(320).style('opacity', '1');
        panel.style('display', selectedCode ? 'block' : 'none');
        updateColors();
      });
    } else {
      mapDiv.transition().duration(180).style('opacity', '0').on('end', () => {
        mapDiv.style('display', 'none');
        playerBar.style('display', 'none');
        panel.style('display', 'none');
        drawTrend();
        trendDiv.style('display', 'block').style('opacity', '0')
          .transition().duration(320).style('opacity', '1');
      });
    }
  }

  updateColors(false);
  svg.call(zoom.transform, getFocusZoomTransform());
  container._choroplethSetMetric = () => {};
  container._choroplethSetYear = (y) => { currentYear = y; updateColors(); };
  container._choroplethShowPlayMap = () => showMapView({ autoplay: true });
  container._choroplethShowTrend = () => showTrendView();
  container._choroplethZoomAfrica = () => showMapView({ zoomAfrica: true, year: 2023 });
  container._choroplethReset = () => {
    stopPlay();
    cancelAfricaZoom();
    selectedCode = null;
    currentYear  = visibleYears[0];
    viewType     = 'map';
    paths.attr('opacity', 1).attr('stroke-width', 0.35);
    panel.style('display', 'none');
    svg.transition().duration(400).call(zoom.transform, getFocusZoomTransform());
    updateColors(false);
    updateViewToggle();
    renderView();
  };
  container._getHelpContext = () => ({
    viewType,
    currentYear,
    selectedCode,
  });
}
