/* ============================================================
   Grafico 1-1 (Atto I) — Choropleth multi-metrica + trend continenti
   Toggle: mappa choropleth ↔ small multiples (media ±1σ per continente)
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
    'Africa': '#e07b39', 'Asia': '#4a90d9', 'Europe': '#5aab6e',
    'North America': '#a45dc0', 'Oceania': '#888888', 'South America': '#d4b84a',
  };
  const CONT_ORDER = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];

  const [incomeRaw, povertyRaw, lifeRaw, geoData] = await Promise.all([
    d3.csv('datasets/processed/income.csv', d3.autoType),
    d3.csv('datasets/processed/poverty.csv', d3.autoType),
    d3.csv('datasets/processed/life_expectancy.csv', d3.autoType),
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json'),
  ]);

  const countries = topojson.feature(geoData, geoData.objects.countries).features;

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

  // Build continent mean ± std dev per year, per metric
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

  const METRICS = {
    income:          { label: 'PIL pro capite (USD PPP)', unit: '$',    log: true,  scheme: d3.interpolateYlGnBu,  reverse: false, map: buildMap(incomeRaw),  series: buildSeries(incomeRaw),  contStats: buildContStats(incomeRaw) },
    life_expectancy: { label: 'Aspettativa di vita',       unit: 'anni', log: false, scheme: d3.interpolateRdYlGn, reverse: false, map: buildMap(lifeRaw),   series: buildSeries(lifeRaw),   contStats: buildContStats(lifeRaw) },
    poverty:         { label: 'Povertà estrema (%)',        unit: '%',    log: false, scheme: d3.interpolateOrRd,   reverse: true,  map: buildMap(povertyRaw), series: buildSeries(povertyRaw), contStats: buildContStats(povertyRaw) },
  };

  const incomeYears = Object.keys(METRICS.income.map).map(Number).sort((a, b) => a - b);
  let currentMetric = 'income';
  let currentYear   = incomeYears[incomeYears.length - 1];
  let selectedCode  = null;
  let viewType      = 'map'; // 'map' | 'trend'

  const W = container.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 800);
  const H = container.clientHeight || (isFullscreen ? window.innerHeight * 0.8  : 480);

  // ── View toggle ───────────────────────────────────────────
  const viewToggle = d3.select(container).append('div')
    .style('position', 'absolute').style('bottom', '8px').style('left', '8px')
    .style('display', 'flex').style('gap', '4px').style('z-index', '20');

  function mkVBtn(label, val) {
    return viewToggle.append('button')
      .style('font-size', '10px').style('padding', '2px 8px').style('border-radius', '5px')
      .style('cursor', 'pointer').style('border', '1px solid #4a6fa5')
      .style('font-family', 'Roboto Slab, serif').style('transition', 'all 0.15s')
      .text(label)
      .on('click', () => { viewType = val; updateViewToggle(); renderView(); });
  }

  const btnMap   = mkVBtn('🗺 Mappa',   'map');
  const btnTrend = mkVBtn('📈 Trend',   'trend');

  function updateViewToggle() {
    [{ btn: btnMap, val: 'map' }, { btn: btnTrend, val: 'trend' }].forEach(({ btn, val }) => {
      const active = viewType === val;
      btn.style('background', active ? '#4a6fa5' : 'rgba(255,255,255,0.92)')
         .style('color', active ? '#fff' : '#4a6fa5')
         .style('font-weight', active ? '700' : '400');
    });
  }
  updateViewToggle();

  // ── Metric buttons (shared) ───────────────────────────────
  const BTN_META = [
    { key: 'income',          label: 'Reddito' },
    { key: 'life_expectancy', label: 'Aspettativa vita' },
    { key: 'poverty',         label: 'Povertà' },
  ];

  const metaBtnWrap = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '6px').style('left', '8px')
    .style('display', 'flex').style('gap', '5px').style('z-index', '20');

  function refreshMetaButtons() {
    metaBtnWrap.selectAll('button').each(function () {
      const active = this.dataset.metric === currentMetric;
      this.style.background = active ? '#4a6fa5' : 'rgba(255,255,255,0.92)';
      this.style.color      = active ? '#fff'    : '#4a6fa5';
    });
  }

  BTN_META.forEach(b => {
    metaBtnWrap.append('button')
      .attr('data-metric', b.key)
      .style('padding', '3px 10px').style('font-size', '10.5px').style('border-radius', '20px')
      .style('border', '1.5px solid #4a6fa5').style('cursor', 'pointer')
      .style('font-family', 'Roboto Slab, serif')
      .style('background', b.key === currentMetric ? '#4a6fa5' : 'rgba(255,255,255,0.92)')
      .style('color',      b.key === currentMetric ? '#fff'    : '#4a6fa5')
      .style('transition', 'all 0.15s')
      .text(b.label)
      .on('click', function () {
        currentMetric = this.dataset.metric;
        refreshMetaButtons();
        renderView();
        if (selectedCode && viewType === 'map') renderPanel(selectedCode);
      });
  });

  // ── Map SVG ───────────────────────────────────────────────
  const mapDiv = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('width', '100%').style('height', '100%');

  const svg = mapDiv.append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('height', '100%')
    .style('background', '#eef2f7').style('display', 'block').style('border-radius', '10px')
    .style('cursor', 'grab');

  svg.append('defs').append('clipPath').attr('id', `chm-clip-${isFullscreen}`)
    .append('rect').attr('width', W).attr('height', H);

  const mapGroup = svg.append('g').attr('clip-path', `url(#chm-clip-${isFullscreen})`);

  const projection = d3.geoNaturalEarth1()
    .fitExtent([[4, 36], [W - 4, H - 46]], { type: 'FeatureCollection', features: countries });
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

  function makeDomain(metric) {
    const m = METRICS[metric];
    const vals = Object.values(m.map).flatMap(y => Object.values(y)).filter(v => v > 0);
    let [lo, hi] = d3.extent(vals);
    if (m.reverse) [lo, hi] = [hi, lo];
    return m.log ? [Math.max(1, lo), hi] : [lo, hi];
  }

  function makeColorScale(metric) {
    const m = METRICS[metric];
    const [lo, hi] = makeDomain(metric);
    return m.log ? d3.scaleSequentialLog(m.scheme).domain([lo, hi]) : d3.scaleSequential(m.scheme).domain([lo, hi]);
  }

  let colorScale = makeColorScale(currentMetric);

  function getYearData(metric, year) {
    const m  = METRICS[metric];
    const ys = Object.keys(m.map).map(Number).sort((a, b) => a - b);
    if (!ys.length) return {};
    const best = ys.reduce((a, b) => Math.abs(b - year) < Math.abs(a - year) ? b : a);
    return m.map[best] || {};
  }

  function updateColors(transition = true) {
    colorScale = makeColorScale(currentMetric);
    const data = getYearData(currentMetric, currentYear);
    const upd  = transition ? paths.transition().duration(350) : paths;
    upd.attr('fill', d => {
      const code = numericToAlpha3[+d.id] || '';
      const v    = data[code];
      return v != null ? colorScale(v) : '#d8dce4';
    });
    yearLabel.text(currentYear);
    updateLegend();
  }

  const yearLabel = svg.append('text')
    .attr('x', W - 10).attr('y', H - 10).attr('text-anchor', 'end')
    .attr('font-size', 36).attr('font-weight', 'bold')
    .attr('fill', '#1a3a6a').attr('opacity', 0.18).attr('pointer-events', 'none')
    .text(currentYear);

  const sliderFO = svg.append('foreignObject')
    .attr('x', 10).attr('y', H - 36).attr('width', W - 180).attr('height', 28)
    .attr('pointer-events', 'auto')
    .on('mousedown', e => e.stopPropagation()).on('touchstart', e => e.stopPropagation());

  const sliderEl = sliderFO.append('xhtml:input')
    .attr('type', 'range').attr('min', incomeYears[0]).attr('max', incomeYears[incomeYears.length - 1])
    .attr('step', 1).attr('value', currentYear)
    .style('width', '100%').style('height', '4px').style('margin-top', '12px')
    .style('cursor', 'pointer').style('accent-color', '#4a6fa5').style('outline', 'none')
    .on('input', function () { currentYear = +this.value; updateColors(); });

  const legG = svg.append('g').attr('class', 'chm-legend');

  function updateLegend() {
    legG.selectAll('*').remove();
    const m  = METRICS[currentMetric];
    const lw = Math.min(180, W - 20), lh = 8;
    const lx = W - lw - 10, ly = H - 34;
    const defs2 = svg.select('defs');
    const gradId = `chm-grad-${isFullscreen ? 'fs' : 'sm'}`;
    let grad = defs2.select(`#${gradId}`);
    if (grad.empty()) grad = defs2.append('linearGradient').attr('id', gradId);
    grad.attr('x1', '0%').attr('x2', '100%').attr('y1', '0%').attr('y2', '0%');
    grad.selectAll('stop').remove();
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const [lo, hi] = makeDomain(currentMetric);
      const v = m.log ? Math.exp(Math.log(lo) + t * (Math.log(hi) - Math.log(lo))) : lo + t * (hi - lo);
      grad.append('stop').attr('offset', `${t * 100}%`).attr('stop-color', colorScale(v));
    }
    legG.append('rect').attr('x', lx).attr('y', ly).attr('width', lw).attr('height', lh).attr('rx', 3).attr('fill', `url(#${gradId})`);
    const [lo, hi] = makeDomain(currentMetric);
    const fmtLo = m.log ? `$${d3.format('.2s')(Math.min(lo, hi))}` : `${d3.format('.0f')(Math.min(lo, hi))}${m.unit}`;
    const fmtHi = m.log ? `$${d3.format('.2s')(Math.max(lo, hi))}` : `${d3.format('.0f')(Math.max(lo, hi))}${m.unit}`;
    [[lx, fmtLo, 'start'], [lx + lw, fmtHi, 'end']].forEach(([x, txt, anchor]) => {
      legG.append('text').attr('x', x).attr('y', ly - 2).attr('text-anchor', anchor).attr('font-size', 8.5).attr('fill', '#555').text(txt);
    });
  }

  const panel = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '40px').style('right', '8px')
    .style('width', '210px').style('background', 'rgba(255,255,255,0.97)')
    .style('border', '1px solid #c8d4e8').style('border-radius', '8px')
    .style('padding', '10px 12px').style('display', 'none').style('z-index', '5')
    .style('box-shadow', '0 2px 12px rgba(0,0,0,0.12)');

  function renderPanel(code) {
    const m = METRICS[currentMetric];
    const s = m.series[code];
    panel.style('display', 'block').html('');
    if (!s) { panel.html('<p style="font-size:11px;color:#999">Nessun dato</p>'); return; }
    panel.append('div').style('font-weight', '700').style('font-size', '13px').style('margin-bottom', '2px').style('color', '#1a1a1a').text(s.country);
    panel.append('div').style('font-size', '9.5px').style('color', '#888').style('margin-bottom', '8px').text(m.label);
    const pw = 186, ph = 110, pm = { top: 6, right: 6, bottom: 20, left: 36 };
    const iw = pw - pm.left - pm.right, ih = ph - pm.top - pm.bottom;
    const psvg = panel.append('svg').attr('width', pw).attr('height', ph);
    const pg = psvg.append('g').attr('transform', `translate(${pm.left},${pm.top})`);
    const pts = s.pts.filter(p => p.value != null && p.value > 0);
    if (!pts.length) { panel.append('p').style('font-size', '11px').style('color', '#999').text('Nessun dato'); return; }
    const xS = d3.scaleLinear().domain(d3.extent(pts, p => p.year)).range([0, iw]);
    const yExt = d3.extent(pts, p => p.value);
    const yS = m.log ? d3.scaleLog().domain([Math.max(1, yExt[0] * 0.85), yExt[1] * 1.15]).range([ih, 0]).clamp(true) : d3.scaleLinear().domain([yExt[0] * 0.95, yExt[1] * 1.05]).range([ih, 0]);
    pg.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xS).ticks(4).tickFormat(d3.format('d'))).attr('font-size', 7.5);
    pg.append('g').call(d3.axisLeft(yS).ticks(4).tickFormat(v => m.log ? d3.format('$.2s')(v) : d3.format('.0f')(v))).attr('font-size', 7.5);
    pg.append('path').datum(pts).attr('fill', 'none').attr('stroke', '#4a6fa5').attr('stroke-width', 1.5).attr('d', d3.line().x(p => xS(p.year)).y(p => yS(p.value)).defined(p => p.value > 0));
    const near = pts.reduce((a, b) => Math.abs(b.year - currentYear) < Math.abs(a.year - currentYear) ? b : a);
    pg.append('circle').attr('cx', xS(near.year)).attr('cy', yS(near.value)).attr('r', 3).attr('fill', '#e07b39');
    const val = near.value;
    const fmt = m.log ? `$${d3.format(',.0f')(val)}` : `${d3.format('.1f')(val)}${m.unit}`;
    panel.append('div').style('font-size', '11px').style('color', '#444').style('margin-top', '5px').text(`${near.year}: ${fmt}`);
    panel.append('div').style('font-size', '9px').style('color', '#aaa').style('margin-top', '3px').text('Clicca di nuovo per chiudere');
  }

  paths
    .on('mouseover', function (event, d) {
      const code = numericToAlpha3[+d.id] || '';
      const m    = METRICS[currentMetric];
      const data = getYearData(currentMetric, currentYear);
      const v    = data[code];
      const name = m.series[code]?.country || code || '?';
      const fv   = v != null ? (m.log ? `$${d3.format(',.0f')(v)}` : `${d3.format('.1f')(v)} ${m.unit}`) : 'N/D';
      tipEl.innerHTML = `<strong>${name}</strong><br>${m.label}: ${fv}`;
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
      if (!code) return;
      if (selectedCode === code) {
        selectedCode = null;
        paths.attr('opacity', 1).attr('stroke-width', 0.35);
        panel.style('display', 'none');
      } else {
        selectedCode = code;
        paths.attr('opacity', dd => numericToAlpha3[+dd.id] === code ? 1 : 0.35)
          .attr('stroke-width', dd => numericToAlpha3[+dd.id] === code ? 1.2 : 0.35);
        renderPanel(code);
      }
    });

  // ── Trend SVG (small multiples) ───────────────────────────
  const trendDiv = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('width', '100%').style('height', '100%').style('display', 'none')
    .style('background', '#fff').style('border-radius', '10px');

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
    const m = METRICS[currentMetric];

    const MARGIN = { top: 32, right: 90, bottom: 40, left: 58 };
    const tw = container.clientWidth  || W;
    const th = container.clientHeight || H;
    const iw = tw - MARGIN.left - MARGIN.right;
    const ih = th - MARGIN.top  - MARGIN.bottom;

    const tsvg = trendDiv.append('svg')
      .attr('width', tw).attr('height', th)
      .style('width', '100%').style('height', '100%').style('display', 'block');

    const g = tsvg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    const allPts = m.contStats ? Array.from(m.contStats.values()).flat() : [];
    const xDomain = d3.extent(allPts, d => d.year);

    // Global Y across all continents
    const allVals = allPts.flatMap(d => [d.lo, d.hi]).filter(v => v > 0 && isFinite(v));
    const [yLo, yHi] = d3.extent(allVals);
    const xS = d3.scaleLinear().domain(xDomain).range([0, iw]);
    const meanVals = allPts.map(d => d.mean).filter(v => v != null && isFinite(v) && v > 0);
    const [mLo, mHi] = d3.extent(meanVals);
    const yS = d3.scaleLinear().domain([Math.max(0, mLo * 0.95), mHi * 1.05]).range([ih, 0]).nice();

    const tickFmt = m.unit === '%' ? v => `${d3.format('.0f')(v)}%`
      : m.log ? v => `$${d3.format('.2s')(v)}`
      : v => `${d3.format('.0f')(v)} ${m.unit}`;

    function fmtV(v) {
      if (m.log) return `$${d3.format(',.0f')(v)}`;
      return `${d3.format('.1f')(v)}${m.unit}`;
    }

    // Gridlines
    yS.ticks(6).forEach(t => {
      g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t))
        .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
    });

    // Axes
    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xS).ticks(6).tickFormat(d3.format('d')))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick text').attr('font-size', 9).attr('fill', '#aaa'); ax.selectAll('.tick line').attr('stroke', '#eee'); });

    g.append('g')
      .call(d3.axisLeft(yS).ticks(6).tickFormat(tickFmt))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick text').attr('font-size', 9).attr('fill', '#aaa'); ax.selectAll('.tick line').remove(); });

    g.append('text').attr('x', iw / 2).attr('y', ih + 34).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#666').text('Anno');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -46).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#666').text(m.label);

    const lineFn = d3.line()
      .x(d => xS(d.year)).y(d => yS(d.mean))
      .curve(d3.curveMonotoneX).defined(d => d.mean != null && d.mean > 0);

    // Draw lines
    CONT_ORDER.forEach(continent => {
      const stats = m.contStats?.get(continent) || [];
      if (!stats.length) return;
      const color = CONT_COLOR[continent] || '#888';

      g.append('path').datum(stats)
        .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2).attr('opacity', 0.9)
        .attr('d', lineFn).style('cursor', 'pointer')
        .on('mouseover', function () {
          d3.select(this).attr('stroke-width', 3.5).attr('opacity', 1);
          const last = stats[stats.length - 1];
          if (!last) return;
          trendTip.innerHTML = `<strong style="color:${color}">${continent}</strong><br>Media: ${fmtV(last.mean)}<br>±1σ: ${fmtV(last.lo)} – ${fmtV(last.hi)}`;
          trendTip.style.display = 'block';
        })
        .on('mousemove', ev => { trendTip.style.left = (ev.clientX + 14) + 'px'; trendTip.style.top = (ev.clientY - 28) + 'px'; })
        .on('mouseleave', function () { d3.select(this).attr('stroke-width', 2).attr('opacity', 0.9); trendTip.style.display = 'none'; });

      // End label
      const last = stats[stats.length - 1];
      if (last) {
        g.append('text').attr('x', xS(last.year) + 4).attr('y', yS(last.mean) + 3)
          .attr('font-size', 9).attr('fill', color).attr('font-weight', '600').attr('opacity', 0.9)
          .style('pointer-events', 'none').text(continent);
      }
    });

    // Legend top-right
    const legG = tsvg.append('g').attr('transform', `translate(${MARGIN.left + iw + 8},${MARGIN.top})`);
    CONT_ORDER.forEach((continent, i) => {
      const color = CONT_COLOR[continent] || '#888';
      legG.append('line').attr('x1', 0).attr('x2', 14).attr('y1', i * 14 + 5).attr('y2', i * 14 + 5).attr('stroke', color).attr('stroke-width', 2.5);
      legG.append('text').attr('x', 18).attr('y', i * 14 + 8).attr('font-size', 8.5).attr('fill', '#555').text(continent);
    });
  }

  // ── Switch views ──────────────────────────────────────────
  function renderView() {
    if (viewType === 'map') {
      mapDiv.style('display', 'block');
      trendDiv.style('display', 'none');
      panel.style('display', selectedCode ? 'block' : 'none');
      updateColors();
    } else {
      mapDiv.style('display', 'none');
      trendDiv.style('display', 'block');
      panel.style('display', 'none');
      drawTrend();
    }
  }

  updateColors(false);

  // ── DOM API ───────────────────────────────────────────────
  container._choroplethSetMetric = (m) => {
    if (!METRICS[m]) return;
    currentMetric = m;
    refreshMetaButtons();
    renderView();
  };
  container._choroplethSetYear = (y) => {
    currentYear = y;
    sliderEl.property('value', y);
    if (viewType === 'map') updateColors();
  };
  container._choroplethReset = () => {
    selectedCode  = null;
    currentMetric = 'income';
    currentYear   = incomeYears[incomeYears.length - 1];
    viewType      = 'map';
    sliderEl.property('value', currentYear);
    paths.attr('opacity', 1).attr('stroke-width', 0.35);
    panel.style('display', 'none');
    svg.call(zoom.transform, d3.zoomIdentity);
    refreshMetaButtons();
    updateViewToggle();
    renderView();
  };
}
