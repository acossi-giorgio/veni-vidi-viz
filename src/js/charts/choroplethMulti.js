/* ============================================================
   Grafico 1-1 (Atto I) — Choropleth reddito + trend continenti
   Metrica fissa: income. Player esterno con timeline.
   ============================================================ */
async function renderChoroplethMulti(selector, isFullscreen = false) {
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
    'Africa': '#e07b39', 'Europe': '#5aab6e',
  };
  const CONT_ORDER = ['Africa', 'Europe'];

  const [incomeRaw, lifeRaw, povertyRaw, geoData] = await Promise.all([
    d3.csv('datasets/processed/income.csv', d3.autoType),
    d3.csv('datasets/processed/life_expectancy.csv', d3.autoType),
    d3.csv('datasets/processed/poverty.csv', d3.autoType),
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json'),
  ]);

  const countries = topojson.feature(geoData, geoData.objects.countries).features;

  const codeToContinent = {};
  incomeRaw.forEach(d => { if (d.code && d.continent) codeToContinent[d.code] = d.continent; });
  lifeRaw.forEach(d => { if (d.code && d.continent && !codeToContinent[d.code]) codeToContinent[d.code] = d.continent; });
  povertyRaw.forEach(d => { if (d.code && d.continent && !codeToContinent[d.code]) codeToContinent[d.code] = d.continent; });

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

  const incomeYears = Object.keys(incomeMap).map(Number).sort((a, b) => a - b);
  let currentYear  = incomeYears[incomeYears.length - 1];
  let selectedCode = null;
  let viewType     = 'map';
  let playing      = false;
  let animTimer    = null;

  const PLAYER_H = 72;
  const W = container.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 800);
  const H = (container.clientHeight || (isFullscreen ? window.innerHeight * 0.8 : 480)) - PLAYER_H;

  // ── View toggle ───────────────────────────────────────────
  const viewToggle = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '10px').style('left', '10px')
    .style('z-index', '20').style('display', 'flex').style('flex-direction', 'column')
    .style('gap', '4px');

  const pillWrap = viewToggle.append('div')
    .style('display', 'flex').style('background', 'rgba(255,255,255,0.92)')
    .style('border-radius', '9px').style('border', '1px solid #d0d8e8')
    .style('padding', '3px').style('gap', '2px')
    .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)');

  function mkPill(label, val) {
    return pillWrap.append('button')
      .style('font-size', '11px').style('padding', '5px 14px').style('border-radius', '6px')
      .style('border', 'none').style('cursor', 'pointer').style('font-weight', '600')
      .style('transition', 'all 0.15s').style('white-space', 'nowrap')
      .text(label)
      .on('click', () => { viewType = val; updateViewToggle(); renderView(); });
  }

  const btnMap   = mkPill('Mappa', 'map');
  const btnTrend = mkPill('Trend', 'trend');

  function updateViewToggle() {
    [{ btn: btnMap, val: 'map' }, { btn: btnTrend, val: 'trend' }].forEach(({ btn, val }) => {
      const active = viewType === val;
      btn.style('background', active ? '#4a6fa5' : 'transparent')
         .style('color', active ? '#fff' : '#7a8aaa')
         .style('box-shadow', active ? '0 1px 4px rgba(74,111,165,0.3)' : 'none');
    });
  }
  updateViewToggle();

  // ── Map SVG ───────────────────────────────────────────────
  const mapDiv = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('width', '100%').style('height', `calc(100% - ${PLAYER_H}px)`);

  const svg = mapDiv.append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('height', '100%')
    .style('background', '#eef2f7').style('display', 'block').style('border-radius', '10px 10px 0 0')
    .style('cursor', 'grab');

  svg.append('defs').append('clipPath').attr('id', `chm-clip-${isFullscreen}`)
    .append('rect').attr('width', W).attr('height', H);

  const mapGroup = svg.append('g').attr('clip-path', `url(#chm-clip-${isFullscreen})`);

  const projection = d3.geoNaturalEarth1()
    .fitExtent([[4, 16], [W - 4, H - 16]], { type: 'FeatureCollection', features: countries });
  const geoPath = d3.geoPath().projection(projection);

  const paths = mapGroup.selectAll('path.country')
    .data(countries).join('path').attr('class', 'country')
    .attr('d', geoPath).attr('stroke', '#fff').attr('stroke-width', 0.35)
    .style('cursor', 'pointer');

  const zoom = d3.zoom().scaleExtent([1, 8])
    .on('zoom', e => { mapGroup.attr('transform', e.transform); svg.style('cursor', 'grabbing'); })
    .on('end', () => svg.style('cursor', 'grab'));
  svg.call(zoom);

  let tipEl = document.getElementById('chm-tooltip');
  if (!tipEl) {
    tipEl = document.createElement('div'); tipEl.id = 'chm-tooltip';
    Object.assign(tipEl.style, {
      position: 'fixed', display: 'none', pointerEvents: 'none',
      background: 'rgba(20,20,40,0.88)', color: '#fff',
      padding: '8px 12px', borderRadius: '5px', fontSize: '12px',
      lineHeight: '1.55', zIndex: '10000', whiteSpace: 'nowrap',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    });
    document.body.appendChild(tipEl);
  }

  const vals = Object.values(incomeMap).flatMap(y => Object.values(y)).filter(v => v > 0);
  const [vLo, vHi] = d3.extent(vals);
  const colorScale = d3.scaleSequentialLog(d3.interpolateYlGnBu).domain([Math.max(1, vLo), vHi]);

  function getYearData(year) {
    const ys = incomeYears;
    const best = ys.reduce((a, b) => Math.abs(b - year) < Math.abs(a - year) ? b : a);
    return incomeMap[best] || {};
  }

  function updateColors(transition = true) {
    const data = getYearData(currentYear);
    const upd  = transition ? paths.transition().duration(300) : paths;
    upd.attr('fill', d => {
      const code = numericToAlpha3[+d.id] || '';
      const cont = codeToContinent[code];
      if (cont !== 'Africa' && cont !== 'Europe') return '#d8dce4';
      const v = data[code];
      return v != null ? colorScale(v) : '#c8cdd4';
    });
    yearDisplay.text(currentYear);
    sliderEl.property('value', currentYear);
    updateLegend();
    updatePanelYear();
  }

  // Legend — discrete stepped swatches
  const legG = svg.append('g').attr('class', 'chm-legend');
  function updateLegend() {
    legG.selectAll('*').remove();

    const STEPS = 5;
    const SW = 14, SH = 14, GAP = 4, LABEL_X = SW + 7;
    const rowH = SH + GAP;
    const extraRows = 2; // separator + no-data
    const totalH = STEPS * rowH + 8 + rowH + 14 + 10; // steps + title + no-data + padding
    const totalW = 110;
    const px = W - totalW - 10, py = H - totalH - 10;

    // Background panel
    legG.append('rect')
      .attr('x', px - 10).attr('y', py - 6)
      .attr('width', totalW + 14).attr('height', totalH + 8)
      .attr('rx', 8).attr('fill', 'rgba(255,255,255,0.92)')
      .attr('stroke', '#d8dce8').attr('stroke-width', 1);

    // Title
    legG.append('text')
      .attr('x', px).attr('y', py + 10)
      .attr('font-size', 8).attr('font-weight', '700').attr('fill', '#888')
      .attr('letter-spacing', '0.07em').text('PIL PRO CAPITE');

    // Build log-spaced thresholds
    const logLo = Math.log(Math.max(1, vLo)), logHi = Math.log(vHi);
    const thresholds = d3.range(STEPS).map(i => {
      const t = 1 - i / (STEPS - 1);
      return Math.round(Math.exp(logLo + t * (logHi - logLo)));
    });

    thresholds.forEach((v, i) => {
      const cy = py + 18 + i * rowH;
      legG.append('rect')
        .attr('x', px).attr('y', cy)
        .attr('width', SW).attr('height', SH).attr('rx', 3)
        .attr('fill', colorScale(v));
      legG.append('text')
        .attr('x', px + LABEL_X).attr('y', cy + SH / 2 + 4)
        .attr('font-size', 9).attr('fill', '#444')
        .text(`$${d3.format('.2s')(v)}`);
    });

    // No Data
    const ndY = py + 18 + STEPS * rowH + 6;
    legG.append('rect')
      .attr('x', px).attr('y', ndY)
      .attr('width', SW).attr('height', SH).attr('rx', 3)
      .attr('fill', '#c8cdd4');
    legG.append('text')
      .attr('x', px + LABEL_X).attr('y', ndY + SH / 2 + 4)
      .attr('font-size', 9).attr('fill', '#888').text('No data');
  }

  // Country detail panel — floats near click position, reactive to year slider
  const PANEL_W = 320, PANEL_H = 260;
  const panel = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('width', PANEL_W + 'px').style('background', 'rgba(255,255,255,0.97)')
    .style('border', '1px solid #c8d4e8').style('border-radius', '10px')
    .style('padding', '12px 14px').style('display', 'none').style('z-index', '30')
    .style('box-shadow', '0 4px 18px rgba(0,0,0,0.16)').style('pointer-events', 'auto');

  // Persistent refs for live updates
  let panelDot  = null;
  let panelLine = null;
  let panelVal  = null;
  let panelXS   = null;
  let panelYS   = null;
  let panelPts  = null;

  function closePanel() {
    selectedCode = null;
    paths.attr('opacity', 1).attr('stroke-width', 0.35);
    panel.style('display', 'none');
    panelDot = panelLine = panelVal = panelXS = panelYS = panelPts = null;
  }

  function positionPanel(event) {
    const cr = container.getBoundingClientRect();
    let px = event.clientX - cr.left + 16;
    let py = event.clientY - cr.top  - 24;
    if (px + PANEL_W > cr.width  - 4) px = event.clientX - cr.left - PANEL_W - 16;
    if (py + PANEL_H > cr.height - 4) py = cr.height - PANEL_H - 4;
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
    if (event) positionPanel(event);

    const hdr = panel.append('div').style('display', 'flex').style('align-items', 'flex-start').style('justify-content', 'space-between').style('margin-bottom', '4px');
    hdr.append('div').style('font-weight', '700').style('font-size', '14px').style('color', '#1a1a1a').style('line-height', '1.3').text(s ? s.country : code);
    hdr.append('button')
      .style('background', 'none').style('border', 'none').style('cursor', 'pointer')
      .style('font-size', '18px').style('color', '#bbb').style('line-height', '1').style('padding', '0 0 0 8px')
      .style('flex-shrink', '0').text('×').on('click', closePanel);

    if (!s) { panel.append('p').style('font-size', '11px').style('color', '#999').text('Nessun dato'); return; }
    panel.append('div').style('font-size', '10px').style('color', '#888').style('margin-bottom', '10px').text('PIL pro capite (USD PPP)');

    const pw = PANEL_W - 28, ph = 170, pm = { top: 8, right: 8, bottom: 24, left: 48 };
    const iw = pw - pm.left - pm.right, ih = ph - pm.top - pm.bottom;
    const psvg = panel.append('svg').attr('width', pw).attr('height', ph);
    const pg = psvg.append('g').attr('transform', `translate(${pm.left},${pm.top})`);

    const pts = s.pts.filter(p => p.value != null && p.value > 0);
    if (!pts.length) { panel.append('p').style('font-size', '11px').style('color', '#999').text('Nessun dato'); return; }

    const xS = d3.scaleLinear().domain(d3.extent(pts, p => p.year)).range([0, iw]);
    const yExt = d3.extent(pts, p => p.value);
    const yS = d3.scaleLinear().domain([yExt[0] * 0.9, yExt[1] * 1.05]).range([ih, 0]);

    // Gridlines
    yS.ticks(4).forEach(t => pg.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t)).attr('stroke', '#f0f0f0').attr('stroke-width', 1));

    pg.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xS).ticks(5).tickFormat(d3.format('d'))).attr('font-size', 8).call(ax => ax.select('.domain').remove());
    pg.append('g').call(d3.axisLeft(yS).ticks(4).tickFormat(v => `$${d3.format('.2s')(v)}`)).attr('font-size', 8).call(ax => ax.select('.domain').remove());

    // Area fill
    pg.append('path').datum(pts)
      .attr('fill', '#4a6fa5').attr('fill-opacity', 0.08)
      .attr('d', d3.area().x(p => xS(p.year)).y0(ih).y1(p => yS(p.value)).defined(p => p.value > 0).curve(d3.curveMonotoneX));

    pg.append('path').datum(pts)
      .attr('fill', 'none').attr('stroke', '#4a6fa5').attr('stroke-width', 2)
      .attr('d', d3.line().x(p => xS(p.year)).y(p => yS(p.value)).defined(p => p.value > 0).curve(d3.curveMonotoneX));

    const near = pts.reduce((a, b) => Math.abs(b.year - currentYear) < Math.abs(a.year - currentYear) ? b : a);

    // Vertical year line (reactive)
    panelLine = pg.append('line')
      .attr('x1', xS(near.year)).attr('x2', xS(near.year)).attr('y1', 0).attr('y2', ih)
      .attr('stroke', '#e07b39').attr('stroke-width', 1).attr('stroke-dasharray', '3,2').attr('opacity', 0.7);

    // Dot (reactive)
    panelDot = pg.append('circle')
      .attr('cx', xS(near.year)).attr('cy', yS(near.value))
      .attr('r', 5).attr('fill', '#e07b39').attr('stroke', '#fff').attr('stroke-width', 1.5);

    panelVal = panel.append('div')
      .style('font-size', '12px').style('color', '#444').style('margin-top', '6px').style('font-weight', '600')
      .text(`${near.year}: $${d3.format(',.0f')(near.value)}`);

    // Save refs for live updates
    panelXS  = xS;
    panelYS  = yS;
    panelPts = pts;

    // Hover overlay — drag orange line → updates whole map year
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
  }

  paths
    .on('mouseover', function (event, d) {
      const code = numericToAlpha3[+d.id] || '';
      const data = getYearData(currentYear);
      const v    = data[code];
      const name = incomeSeries[code]?.country || code || '?';
      const fv   = v != null ? `$${d3.format(',.0f')(v)}` : 'N/D';
      tipEl.innerHTML = `<strong>${name}</strong><br>PIL pro capite: ${fv}`;
      tipEl.style.display = 'block';
      d3.select(this).attr('stroke', '#333').attr('stroke-width', 1);
    })
    .on('mousemove', event => {
      let x = event.clientX + 14, y = event.clientY - 28;
      const r = tipEl.getBoundingClientRect();
      if (x + r.width > window.innerWidth - 8) x = event.clientX - r.width - 14;
      tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
    })
    .on('mouseleave', function () {
      tipEl.style.display = 'none';
      d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.35);
    })
    .on('click', function (event, d) {
      const code = numericToAlpha3[+d.id] || '';
      const cont = codeToContinent[code];
      // Gray country → close panel
      if (cont !== 'Africa' && cont !== 'Europe') { closePanel(); return; }
      if (selectedCode === code) {
        closePanel();
      } else {
        selectedCode = code;
        paths.attr('opacity', dd => numericToAlpha3[+dd.id] === code ? 1 : 0.35)
          .attr('stroke-width', dd => numericToAlpha3[+dd.id] === code ? 1.2 : 0.35);
        renderPanel(code, event);
      }
    });

  // ── Trend SVG ─────────────────────────────────────────────
  const trendDiv = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('width', '100%').style('height', '100%')
    .style('display', 'none').style('background', '#fff').style('border-radius', '10px');

  let trendTip = document.getElementById('chm-trend-tip');
  if (!trendTip) {
    trendTip = document.createElement('div'); trendTip.id = 'chm-trend-tip';
    Object.assign(trendTip.style, {
      position: 'fixed', display: 'none', pointerEvents: 'none',
      background: 'rgba(20,20,40,0.9)', color: '#fff',
      padding: '5px 10px', borderRadius: '5px', fontSize: '11px',
      lineHeight: '1.5', zIndex: '10000', whiteSpace: 'nowrap',
    });
    document.body.appendChild(trendTip);
  }

  function drawTrend() {
    trendDiv.selectAll('*').remove();
    const MARGIN = { top: 32, right: 72, bottom: 40, left: 58 };
    const tw = container.clientWidth || W;
    const th = container.clientHeight || H + PLAYER_H;
    const iw = tw - MARGIN.left - MARGIN.right;
    const ih = th - MARGIN.top  - MARGIN.bottom;

    const tsvg = trendDiv.append('svg').attr('width', tw).attr('height', th)
      .style('width', '100%').style('height', '100%').style('display', 'block');
    const g = tsvg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    const allPts = Array.from(incomeStats.values()).flat();
    const xDomain = d3.extent(allPts, d => d.year);
    const allYears = [...new Set(allPts.map(d => d.year))].sort((a, b) => a - b);
    const meanVals = allPts.map(d => d.mean).filter(v => v != null && isFinite(v) && v > 0);
    const [mLo, mHi] = d3.extent(meanVals);
    const xS = d3.scaleLinear().domain(xDomain).range([0, iw]);
    const yS = d3.scaleLinear().domain([Math.max(0, mLo * 0.95), mHi * 1.05]).range([ih, 0]).nice();

    // Build per-year lookup for all continents
    const statsByContYear = new Map();
    CONT_ORDER.forEach(cont => {
      const stats = incomeStats.get(cont) || [];
      stats.forEach(pt => {
        if (!statsByContYear.has(pt.year)) statsByContYear.set(pt.year, {});
        statsByContYear.get(pt.year)[cont] = pt.mean;
      });
    });

    yS.ticks(6).forEach(t => {
      g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t))
        .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
    });
    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xS).ticks(6).tickFormat(d3.format('d')))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick text').attr('font-size', 9).attr('fill', '#aaa'); ax.selectAll('.tick line').attr('stroke', '#eee'); });
    g.append('g')
      .call(d3.axisLeft(yS).ticks(6).tickFormat(v => `$${d3.format('.2s')(v)}`))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick text').attr('font-size', 9).attr('fill', '#aaa'); ax.selectAll('.tick line').remove(); });
    g.append('text').attr('x', iw / 2).attr('y', ih + 34).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#666').text('Anno');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -46).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#666').text('PIL pro capite (USD PPP)');

    const lineFn = d3.line().x(d => xS(d.year)).y(d => yS(d.mean)).curve(d3.curveMonotoneX).defined(d => d.mean != null && d.mean > 0);

    CONT_ORDER.forEach((continent, ci) => {
      const stats = incomeStats.get(continent) || [];
      if (!stats.length) return;
      const color = CONT_COLOR[continent] || '#888';
      const path = g.append('path').datum(stats)
        .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2).attr('opacity', 0.9)
        .attr('d', lineFn).style('pointer-events', 'none');
      const len = path.node().getTotalLength();
      path.attr('stroke-dasharray', len).attr('stroke-dashoffset', len)
        .transition().duration(1400).delay(ci * 200).ease(d3.easeCubicInOut)
        .attr('stroke-dashoffset', 0);
      const last = stats[stats.length - 1];
      if (last) {
        const lbl = g.append('text').attr('x', xS(last.year) + 4).attr('y', yS(last.mean) + 3)
          .attr('font-size', 9).attr('fill', color).attr('font-weight', '600')
          .attr('opacity', 0).style('pointer-events', 'none').text(continent);
        lbl.transition().duration(400).delay(ci * 200 + 1400).attr('opacity', 0.9);
      }
    });


    // ── Crosshair overlay ────────────────────────────────────
    const crossLine = g.append('line')
      .attr('y1', 0).attr('y2', ih)
      .attr('stroke', '#333').attr('stroke-width', 1).attr('stroke-dasharray', '4,3')
      .attr('opacity', 0).style('pointer-events', 'none');

    const crossDots = CONT_ORDER.map(cont => ({
      cont,
      dot: g.append('circle').attr('r', 5)
        .attr('fill', CONT_COLOR[cont] || '#888').attr('stroke', '#fff').attr('stroke-width', 1.5)
        .attr('opacity', 0).style('pointer-events', 'none'),
    }));

    const overlay = g.append('rect')
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

        // Tooltip
        let html = `<strong style="color:#888">${nearYear}</strong>`;
        CONT_ORDER.forEach(cont => {
          const v = yearData[cont];
          const col = CONT_COLOR[cont] || '#888';
          html += `<br><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col};margin-right:4px;vertical-align:middle"></span><strong style="color:${col}">${cont}</strong>: ${v != null ? '$' + d3.format(',.0f')(v) : 'N/D'}`;
        });
        trendTip.innerHTML = html;
        trendTip.style.display = 'block';
        let tx = event.clientX + 14, ty = event.clientY - 28;
        const r = trendTip.getBoundingClientRect();
        if (tx + r.width > window.innerWidth - 8) tx = event.clientX - r.width - 14;
        trendTip.style.left = tx + 'px'; trendTip.style.top = ty + 'px';
      })
      .on('mouseleave', () => {
        crossLine.attr('opacity', 0);
        crossDots.forEach(({ dot }) => dot.attr('opacity', 0));
        trendTip.style.display = 'none';
      });
  }

  // ── Player bar ────────────────────────────────────────────
  const playerBar = d3.select(container).append('div')
    .style('position', 'absolute').style('bottom', '0').style('left', '0').style('right', '0')
    .style('height', PLAYER_H + 'px')
    .style('background', '#fff')
    .style('border-radius', '0 0 10px 10px')
    .style('border-top', '1px solid #e8eef7')
    .style('display', 'flex').style('align-items', 'center')
    .style('padding', '0 16px').style('gap', '14px').style('z-index', '20')
    .style('box-shadow', '0 -2px 8px rgba(0,0,0,0.04)');

  // Control buttons
  const ctrlWrap = playerBar.append('div')
    .style('display', 'flex').style('align-items', 'center').style('gap', '6px').style('flex-shrink', '0');

  function mkCtrlBtn(inner, title) {
    return ctrlWrap.append('button')
      .attr('title', title)
      .style('width', '30px').style('height', '30px').style('border-radius', '50%')
      .style('border', '1px solid #dde3ef').style('background', '#f5f7fb')
      .style('cursor', 'pointer').style('display', 'flex').style('align-items', 'center')
      .style('justify-content', 'center').style('font-size', '13px').style('color', '#4a6fa5')
      .style('flex-shrink', '0').style('transition', 'all 0.15s')
      .style('padding', '0').style('line-height', '1')
      .html(inner);
  }

  const btnReset = mkCtrlBtn('&#8635;', 'Reset').on('click', () => { stopPlay(); currentYear = incomeYears[0]; updateColors(); });
  const btnPrev  = mkCtrlBtn('&#8249;', 'Anno precedente').style('font-size', '18px').on('click', () => {
    stopPlay();
    const i = incomeYears.indexOf(currentYear);
    if (i > 0) { currentYear = incomeYears[i - 1]; updateColors(); }
  });

  const btnPlay = ctrlWrap.append('button')
    .style('width', '36px').style('height', '36px').style('border-radius', '50%')
    .style('border', 'none').style('background', '#4a6fa5').style('cursor', 'pointer')
    .style('display', 'flex').style('align-items', 'center').style('justify-content', 'center')
    .style('font-size', '15px').style('color', '#fff').style('flex-shrink', '0')
    .style('padding', '0').style('line-height', '1')
    .style('box-shadow', '0 2px 8px rgba(74,111,165,0.4)').style('transition', 'all 0.15s')
    .html('<svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="1,0 11,7 1,14"/></svg>')
    .on('click', () => playing ? stopPlay() : startPlay());

  const btnNext = mkCtrlBtn('&#8250;', 'Anno successivo').style('font-size', '18px').on('click', () => {
    stopPlay();
    const i = incomeYears.indexOf(currentYear);
    if (i < incomeYears.length - 1) { currentYear = incomeYears[i + 1]; updateColors(); }
  });

  function startPlay() {
    playing = true;
    btnPlay.html('<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><rect x="0" y="0" width="3.5" height="14" rx="1"/><rect x="6.5" y="0" width="3.5" height="14" rx="1"/></svg>').style('background', '#e07b39');
    animTimer = setInterval(() => {
      const i = incomeYears.indexOf(currentYear);
      if (i >= incomeYears.length - 1) { stopPlay(); return; }
      currentYear = incomeYears[i + 1];
      updateColors();
    }, 600);
  }

  function stopPlay() {
    playing = false;
    clearInterval(animTimer);
    btnPlay.html('<svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="1,0 11,7 1,14"/></svg>').style('background', '#4a6fa5');
  }

  // Timeline
  const timelineWrap = playerBar.append('div')
    .style('flex', '1').style('position', 'relative').style('padding', '0 4px');

  // Tick labels
  const labelRow = timelineWrap.append('div')
    .style('display', 'flex').style('justify-content', 'space-between')
    .style('font-size', '8.5px').style('color', '#bbb').style('margin-bottom', '2px')
    .style('pointer-events', 'none');

  const tickYears = incomeYears.filter((y, i) => i % 5 === 0 || i === incomeYears.length - 1);
  tickYears.forEach(y => labelRow.append('span').text(y));

  // Slider
  const sliderEl = timelineWrap.append('input')
    .attr('type', 'range')
    .attr('min', incomeYears[0]).attr('max', incomeYears[incomeYears.length - 1])
    .attr('step', 1).attr('value', currentYear)
    .style('width', '100%').style('height', '4px').style('cursor', 'pointer')
    .style('accent-color', '#4a6fa5').style('outline', 'none').style('display', 'block')
    .on('input', function () { stopPlay(); currentYear = +this.value; updateColors(); });

  // Year display
  const yearDisplay = playerBar.append('div')
    .style('font-size', '24px').style('font-weight', '700').style('color', '#1a3a6a')
    .style('min-width', '54px').style('text-align', 'right').style('flex-shrink', '0')
    .style('letter-spacing', '-0.5px').text(currentYear);

  // ── Switch views ──────────────────────────────────────────
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

  // ── DOM API ───────────────────────────────────────────────
  container._choroplethSetMetric = () => {};
  container._choroplethSetYear = (y) => { currentYear = y; updateColors(); };
  container._choroplethReset = () => {
    stopPlay();
    selectedCode = null;
    currentYear  = incomeYears[incomeYears.length - 1];
    viewType     = 'map';
    paths.attr('opacity', 1).attr('stroke-width', 0.35);
    panel.style('display', 'none');
    svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
    updateViewToggle();
    renderView();
  };
}
