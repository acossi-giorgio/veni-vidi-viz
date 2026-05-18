/* ============================================================
   Grafico 5-1 (Atto IV) — Migrazioni africane
   Tab: Rete (force-directed) | Mappa (choropleth + archi)
   ============================================================ */

const _MIG_NUM_TO_A3 = {
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

let _migWorldData = null; // world atlas cache

async function renderMigrationChord(selector = '#chart-5-1', isFullscreen = false) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html('');
  container.style('width', '100%').style('height', '100%').style('position', 'relative').style('font-family', 'inherit');

  const migRaw = await d3.csv('datasets/processed/migration.csv', d3.autoType);

  const MIGRATION_YEARS = [2000, 2005, 2010, 2015, 2020];

  const CONT_COLOR = {
    'Africa':        '#c0392b',
    'Asia':          '#2980b9',
    'Europe':        '#27ae60',
    'North America': '#8e44ad',
    'South America': '#d35400',
    'Oceania':       '#16a085',
  };

  d3.select('body').selectAll('.tooltip-chord').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip-chord')
    .style('position', 'absolute').style('background', 'rgba(0,0,0,0.88)')
    .style('color', '#fff').style('border-radius', '6px').style('padding', '10px 14px')
    .style('pointer-events', 'none').style('font-size', '12px').style('line-height', '1.6')
    .style('z-index', '10000').style('display', 'none').style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');

  function showTip(e, html) {
    tooltip.style('display', 'block').html(html);
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 12, ty = e.pageY + 8;
    if (tx + r.width  > window.innerWidth  - 8) tx = e.pageX - r.width  - 12;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 8;
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }
  function hideTip() { tooltip.style('display', 'none'); }

  const containerNode = container.node();
  let currentYear = 2020;
  let mode = 'network';
  let animTimer = null;

  const wrap = container.append('div')
    .style('width', '100%').style('height', '100%')
    .style('display', 'flex').style('flex-direction', 'column');

  const header = wrap.append('div')
    .style('display', 'flex').style('align-items', 'center').style('gap', '8px').style('flex-wrap', 'wrap')
    .style('padding', '5px 8px').style('background', '#f5f5f5')
    .style('border-bottom', '1px solid #e0e0e0').style('flex-shrink', '0');

  [['network', 'Rete'], ['map', 'Mappa']].forEach(([m, label]) => {
    header.append('button')
      .datum(m)
      .attr('class', 'chord-mode-btn')
      .style('padding', '2px 9px').style('border-radius', '12px').style('font-size', '11px')
      .style('cursor', 'pointer').style('border', '1px solid #ccc').style('font-family', 'inherit')
      .style('background', m === 'network' ? '#333' : '#fff')
      .style('color', m === 'network' ? '#fff' : '#333')
      .text(label)
      .on('click', function(e, d) {
        mode = d; stopAnim();
        header.selectAll('.chord-mode-btn')
          .style('background', btn => btn === d ? '#333' : '#fff')
          .style('color', btn => btn === d ? '#fff' : '#333');
        draw();
      });
  });

  const sliderWrap = header.append('div').style('display', 'flex').style('align-items', 'center').style('gap', '4px');
  const yearLabel = sliderWrap.append('span').style('font-size', '11px').style('color', '#555').style('min-width', '32px').text('2020');
  const slider = sliderWrap.append('input').attr('type', 'range')
    .attr('min', 0).attr('max', MIGRATION_YEARS.length - 1).attr('value', MIGRATION_YEARS.length - 1)
    .attr('step', 1).style('width', '100px').style('cursor', 'pointer')
    .on('input', function() {
      currentYear = MIGRATION_YEARS[+this.value];
      yearLabel.text(currentYear);
      draw();
    });

  const playBtn = header.append('button')
    .style('padding', '2px 8px').style('border-radius', '12px').style('font-size', '11px')
    .style('cursor', 'pointer').style('border', '1px solid #ccc').style('font-family', 'inherit')
    .style('background', '#fff').style('color', '#333')
    .text('▶ Play')
    .on('click', () => {
      if (animTimer) { stopAnim(); return; }
      mode = 'network';
      header.selectAll('.chord-mode-btn')
        .style('background', d => d === 'network' ? '#333' : '#fff')
        .style('color', d => d === 'network' ? '#fff' : '#333');
      let i = 0;
      playBtn.text('⏸ Pausa');
      function step() {
        currentYear = MIGRATION_YEARS[i];
        yearLabel.text(currentYear);
        slider.property('value', i);
        draw();
        i++;
        if (i < MIGRATION_YEARS.length) animTimer = setTimeout(step, 900);
        else stopAnim();
      }
      step();
    });

  function stopAnim() {
    if (animTimer) { clearTimeout(animTimer); animTimer = null; }
    playBtn.text('▶ Play');
  }

  const svgArea = wrap.append('div').style('flex', '1').style('position', 'relative').style('min-height', '0');

  function draw() {
    svgArea.html('');
    const W = containerNode.getBoundingClientRect().width  || 560;
    const H = svgArea.node().getBoundingClientRect().height || 380;
    if (W < 10 || H < 10) return;
    if (mode === 'map') drawMap(W, H);
    else drawNetwork(W, H);
  }

  /* ── Network: expand/collapse in-place ────────────────────── */
  let _sim         = null;
  let _expandedSrc = false;
  let _expandedDst = new Set();
  let _posCache    = new Map();

  function drawNetwork(W, H) {
    if (_sim) { _sim.stop(); _sim = null; }

    const yearData = migRaw.filter(d =>
      d.year === currentYear && d.origin_continent === 'Africa' &&
      d.dest_continent !== 'Africa' && d.stock > 0
    );

    let srcNodes;
    if (!_expandedSrc) {
      const total = d3.sum(yearData, d => d.stock);
      const pos   = _posCache.get('AFRICA') || { x: W * 0.35, y: H / 2 };
      srcNodes = [{ code: 'AFRICA', name: 'Africa', total, type: 'src', expandable: true, x: pos.x, y: pos.y }];
    } else {
      const m = new Map();
      yearData.forEach(d => {
        if (!m.has(d.origin_code))
          m.set(d.origin_code, { code: d.origin_code, name: d.origin_country, total: 0, type: 'src', collapsible: true, parentCode: 'AFRICA' });
        m.get(d.origin_code).total += d.stock;
      });
      const ref = _posCache.get('AFRICA') || { x: W * 0.35, y: H / 2 };
      srcNodes = Array.from(m.values()).map(n => ({
        ...n,
        x: _posCache.get(n.code)?.x ?? ref.x + (Math.random()-.5)*80,
        y: _posCache.get(n.code)?.y ?? ref.y + (Math.random()-.5)*80,
      }));
    }

    const destConts = [...new Set(yearData.map(d => d.dest_continent))];
    let dstNodes = [];
    destConts.forEach(cont => {
      if (_expandedDst.has(cont)) {
        const m = new Map();
        yearData.filter(d => d.dest_continent === cont).forEach(d => {
          if (!m.has(d.dest_code))
            m.set(d.dest_code, { code: d.dest_code, name: d.dest_country, continent: cont, total: 0, type: 'dst', collapsible: true, parentCode: cont });
          m.get(d.dest_code).total += d.stock;
        });
        const ref = _posCache.get(cont) || { x: W * 0.65, y: H / 2 };
        Array.from(m.values()).forEach(n => dstNodes.push({
          ...n,
          x: _posCache.get(n.code)?.x ?? ref.x + (Math.random()-.5)*80,
          y: _posCache.get(n.code)?.y ?? ref.y + (Math.random()-.5)*80,
        }));
      } else {
        const total = d3.sum(yearData.filter(d => d.dest_continent === cont), d => d.stock);
        const pos   = _posCache.get(cont) || { x: W * 0.65, y: H / 2 };
        dstNodes.push({ code: cont, name: cont, continent: cont, total, type: 'dst', expandable: true, x: pos.x, y: pos.y });
      }
    });

    const allNodes = [...srcNodes, ...dstNodes];
    allNodes.forEach((n, i) => { n.index = i; });

    const srcByCode = new Map(srcNodes.map(n => [n.code, n]));
    const dstByCode = new Map(dstNodes.map(n => [n.code, n]));
    const lMap = new Map();
    yearData.forEach(d => {
      const sk = srcByCode.has(d.origin_code) ? d.origin_code : 'AFRICA';
      const dk = dstByCode.has(d.dest_code)   ? d.dest_code   : d.dest_continent;
      const src = srcByCode.get(sk), dst = dstByCode.get(dk);
      if (!src || !dst) return;
      const key = `${sk}||${dk}`;
      if (!lMap.has(key)) lMap.set(key, { source: src, target: dst, value: 0 });
      lMap.get(key).value += d.stock;
    });
    const links = Array.from(lMap.values()).filter(l => l.value > 0);

    const maxStock = d3.max(links, d => d.value) || 1;
    const wScale   = d3.scaleSqrt().domain([0, maxStock]).range([0.5, 10]);
    const rSrc     = _expandedSrc
      ? d3.scaleSqrt().domain([0, d3.max(srcNodes, n => n.total)||1]).range([4, 14])
      : () => 26;
    const rDst     = d3.scaleSqrt().domain([0, d3.max(dstNodes, n => n.total)||1]).range([10, 26]);

    const svg = svgArea.append('svg').attr('width', W).attr('height', H)
      .style('display','block').style('font-family','inherit').style('background','#fff');
    const g = svg.append('g');
    const zoom = d3.zoom().scaleExtent([0.1, 4]).on('zoom', e => g.attr('transform', e.transform));
    svg.call(zoom).on('dblclick.zoom', null);

    const ctrl = svgArea.append('div')
      .style('position','absolute').style('top','8px').style('right','8px')
      .style('display','flex').style('flex-direction','column').style('gap','3px').style('z-index','5');
    [['＋', () => svg.transition().duration(220).call(zoom.scaleBy, 1.4)],
     ['－', () => svg.transition().duration(220).call(zoom.scaleBy, 0.7)],
     ['⌂',  () => svg.transition().duration(280).call(zoom.transform, d3.zoomIdentity)],
    ].forEach(([lbl, fn]) => ctrl.append('button').text(lbl)
      .style('width','26px').style('height','26px').style('font-size','14px').style('line-height','1')
      .style('border','1px solid #ddd').style('border-radius','5px').style('background','#fff')
      .style('cursor','pointer').style('color','#555').on('click', fn));

    const linkLayer  = g.append('g');
    const nodeLayer  = g.append('g');
    const labelLayer = g.append('g');

    const linkEls = linkLayer.selectAll('line').data(links).join('line')
      .attr('stroke','#cccccc').attr('stroke-linecap','round')
      .attr('stroke-width', d => wScale(d.value)).attr('opacity', 0.55)
      .on('mousemove', (e, d) => showTip(e,
        `<strong style="color:#e07b39">${d.source.name}</strong> → <strong style="color:${CONT_COLOR[d.target.continent]||'#333'}">${d.target.name}</strong><br>` +
        `Stock: <strong>${d3.format(',.0f')(d.value)}</strong>`
      )).on('mouseleave', hideTip);

    function savePos() { allNodes.forEach(n => _posCache.set(n.code, { x: n.x, y: n.y })); }

    const nodeEls = nodeLayer.selectAll('g').data(allNodes).join('g')
      .style('cursor', d => (d.expandable || d.collapsible) ? 'pointer' : 'grab')
      .call(d3.drag()
        .on('start', function(e, d) { if (!e.active) _sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  function(e, d) { d.fx = e.x; d.fy = e.y; })
        .on('end',   function(e, d) { if (!e.active) _sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('click', (e, d) => {
        e.stopPropagation();
        savePos();
        if (d.expandable && d.code === 'AFRICA') {
          _expandedSrc = true; draw();
        } else if (d.collapsible && d.type === 'src') {
          _posCache.set('AFRICA', { x: d3.mean(srcNodes, n => n.x), y: d3.mean(srcNodes, n => n.y) });
          _expandedSrc = false; draw();
        } else if (d.expandable && d.type === 'dst') {
          _expandedDst.add(d.code); draw();
        } else if (d.collapsible && d.type === 'dst') {
          const siblings = dstNodes.filter(n => n.parentCode === d.parentCode);
          _posCache.set(d.parentCode, { x: d3.mean(siblings, n => n.x), y: d3.mean(siblings, n => n.y) });
          _expandedDst.delete(d.parentCode); draw();
        }
      })
      .on('mouseover', (e, d) => {
        linkEls
          .attr('stroke', l => (l.source===d||l.target===d) ? (d.type==='src' ? '#e07b39' : CONT_COLOR[d.continent]||'#2980b9') : '#f0f0f0')
          .attr('opacity', l => (l.source===d||l.target===d) ? 0.9 : 0.08);
        const col  = d.type==='src' ? '#e07b39' : (CONT_COLOR[d.continent]||'#2980b9');
        const hint = d.expandable ? ' <span style="opacity:.5;font-size:9px">· espandi</span>'
                   : d.collapsible ? ' <span style="opacity:.5;font-size:9px">· comprimi</span>' : '';
        showTip(e,
          `<strong style="color:${col}">${d.name}</strong>${hint}<br>` +
          (d.type==='src' ? 'Emigrati: ' : "Ricevuti dall'Africa: ") +
          `<strong>${d3.format(',.0f')(d.total)}</strong>`
        );
      })
      .on('mouseleave', () => { linkEls.attr('stroke','#cccccc').attr('opacity',0.55); hideTip(); });

    nodeEls.append('circle')
      .attr('r', d => d.type==='src' ? rSrc(d.total) : rDst(d.total))
      .attr('fill', d => d.type==='src' ? '#e07b39' : (CONT_COLOR[d.continent]||'#2980b9'))
      .attr('stroke','#fff').attr('stroke-width', 2);

    nodeEls.filter(d => d.expandable || d.collapsible).append('circle')
      .attr('r', d => (d.type==='src' ? rSrc(d.total) : rDst(d.total)) + 4)
      .attr('fill','none')
      .attr('stroke', d => d.type==='src' ? '#e07b39' : (CONT_COLOR[d.continent]||'#2980b9'))
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', d => d.expandable ? '4,3' : '2,2')
      .attr('opacity', 0.45);

    const topSrcSet = _expandedSrc
      ? new Set(srcNodes.slice().sort((a,b)=>b.total-a.total).slice(0,6).map(n=>n.code))
      : new Set(['AFRICA']);
    const labelEls = labelLayer.selectAll('text')
      .data(allNodes.filter(d => d.type==='dst' || topSrcSet.has(d.code))).join('text')
      .attr('font-size', d => (!d.collapsible && d.type==='dst') ? 11 : 9)
      .attr('font-weight', d => (!d.collapsible && d.type==='dst') || d.code==='AFRICA' ? '700' : '400')
      .attr('fill', d => d.type==='src' ? '#e07b39' : '#333')
      .style('pointer-events','none')
      .text(d => d.name.length > 14 ? d.name.slice(0,13)+'…' : d.name);

    _sim = d3.forceSimulation(allNodes)
      .force('link', d3.forceLink(links).id(d => d.index).distance(d => 90 + rDst(d.target.total)*2).strength(0.25))
      .force('charge', d3.forceManyBody().strength(d => d.type==='src' ? -160 : -380))
      .force('center', d3.forceCenter(W/2, H/2).strength(0.04))
      .force('collide', d3.forceCollide(d => (d.type==='src' ? rSrc(d.total) : rDst(d.total)) + 16))
      .force('x', d3.forceX(d => d.type==='dst' ? W*0.65 : W*0.35).strength(0.04))
      .on('tick', () => {
        linkEls.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
               .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        nodeEls.attr('transform', d => `translate(${d.x},${d.y})`);
        labelEls
          .attr('x', d => d.x + (d.type==='dst' ? rDst(d.total)+5 : -(rSrc(d.total)+5)))
          .attr('y', d => d.y + 4)
          .attr('text-anchor', d => d.type==='dst' ? 'start' : 'end');
      });
  }

  /* ── Connection Map ────────────────────────────────────────── */
  async function drawMap(W, H) {
    if (!_migWorldData) {
      _migWorldData = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json');
    }

    const yearData = migRaw.filter(d =>
      d.year === currentYear && d.origin_continent === 'Africa' &&
      d.dest_continent !== 'Africa' && d.stock > 0
    );

    const stockByDest  = d3.rollup(yearData, v => d3.sum(v, d => d.stock), d => d.dest_code);
    const africaCodes  = new Set(yearData.map(d => d.origin_code));
    const destNameMap  = new Map();
    yearData.forEach(d => destNameMap.set(d.dest_code, d.dest_country));
    const origNameMap  = new Map();
    yearData.forEach(d => origNameMap.set(d.origin_code, d.origin_country));
    const origStockMap = d3.rollup(yearData, v => d3.sum(v, d => d.stock), d => d.origin_code);

    const geoCountries = topojson.feature(_migWorldData, _migWorldData.objects.countries).features;
    const projection   = d3.geoNaturalEarth1()
      .fitExtent([[4, 4], [W - 4, H - 36]], { type: 'FeatureCollection', features: geoCountries });
    const pathGen      = d3.geoPath().projection(projection);

    // Projected centroids — for MultiPolygon use largest polygon to avoid overseas-territory skew
    function largestPolyCentroid(feature) {
      if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
        let best = null, bestArea = -1;
        feature.geometry.coordinates.forEach(rings => {
          const f = { type: 'Feature', geometry: { type: 'Polygon', coordinates: rings } };
          const a = d3.geoArea(f);
          if (a > bestArea) { bestArea = a; best = f; }
        });
        if (best) return pathGen.centroid(best);
      }
      return pathGen.centroid(feature);
    }

    const centroidByA3 = new Map();
    geoCountries.forEach(f => {
      const a3 = _MIG_NUM_TO_A3[+f.id];
      if (!a3) return;
      const c = largestPolyCentroid(f);
      if (!isNaN(c[0]) && !isNaN(c[1])) centroidByA3.set(a3, c);
    });

    // Per-pair aggregation: (origin_code, dest_code) → stock
    const pairMap = new Map();
    yearData.forEach(d => {
      const key = `${d.origin_code}||${d.dest_code}`;
      if (!pairMap.has(key)) pairMap.set(key, { srcCode: d.origin_code, srcName: d.origin_country, dstCode: d.dest_code, dstName: d.dest_country, stock: 0 });
      pairMap.get(key).stock += d.stock;
    });
    const pairs = Array.from(pairMap.values()).sort((a, b) => a.stock - b.stock);
    const maxPair = d3.max(pairs, d => d.stock) || 1;
    const threshold = maxPair * 0.005;
    const visiblePairs = pairs.filter(p => p.stock >= threshold);
    const activeSrcCodes = new Set(visiblePairs.map(p => p.srcCode));
    const activeDstCodes = new Set(visiblePairs.map(p => p.dstCode));

    const maxDest    = d3.max(Array.from(stockByDest.values())) || 1;
    const maxSrc     = d3.max(Array.from(origStockMap.values())) || 1;
    const destColorS = d3.scaleSequential(d3.interpolateBlues).domain([0, maxDest]);
    const srcColorS  = d3.scaleSequential(d3.interpolateOranges).domain([0, maxSrc]);

    // ── SVG + zoom ───────────────────────────────────────────────
    const svg = svgArea.append('svg').attr('width', W).attr('height', H)
      .style('display', 'block').style('font-family', 'inherit').style('background', '#eef2f7')
      .style('border-radius', '10px').style('cursor', 'grab');

    const g    = svg.append('g');
    const zoom = d3.zoom().scaleExtent([0.5, 12])
      .on('zoom', e => { g.attr('transform', e.transform); svg.style('cursor', 'grabbing'); })
      .on('end',  () => svg.style('cursor', 'grab'));
    svg.call(zoom).on('dblclick.zoom', null);

    const ctrl = svgArea.append('div')
      .style('position', 'absolute').style('top', '8px').style('right', '8px')
      .style('display', 'flex').style('flex-direction', 'column').style('gap', '3px').style('z-index', '5');
    [['＋', () => svg.transition().duration(220).call(zoom.scaleBy, 1.6)],
     ['－', () => svg.transition().duration(220).call(zoom.scaleBy, 0.625)],
     ['⌂',  () => svg.transition().duration(280).call(zoom.transform, d3.zoomIdentity)],
    ].forEach(([lbl, fn]) => ctrl.append('button').text(lbl)
      .style('width', '26px').style('height', '26px').style('font-size', '14px').style('line-height', '1')
      .style('border', '1px solid #ddd').style('border-radius', '5px').style('background', '#fff')
      .style('cursor', 'pointer').style('color', '#555').on('click', fn));

    // Countries
    g.selectAll('.cty').data(geoCountries).join('path')
      .attr('class', 'cty')
      .attr('d', pathGen)
      .attr('stroke', '#fff').attr('stroke-width', 0.35)
      .attr('fill', f => {
        const a3 = _MIG_NUM_TO_A3[+f.id];
        if (!a3) return '#ccd8df';
        if (activeSrcCodes.has(a3)) return srcColorS(origStockMap.get(a3) || 0);
        if (activeDstCodes.has(a3)) return destColorS(stockByDest.get(a3) || 0);
        return '#ccd8df';
      })
      .on('mousemove', (e, f) => {
        const a3 = _MIG_NUM_TO_A3[+f.id];
        if (!a3) return;
        if (activeSrcCodes.has(a3)) {
          g.selectAll('.mig-arc').attr('opacity', 0.05).attr('stroke', '#999').attr('fill', '#999');
          g.selectAll(`.mig-arc[data-src="${a3}"]`)
            .attr('opacity', 0.9).attr('stroke', '#c0602a').attr('fill', '#c0602a').raise();
          showTip(e,
            `<strong style="color:#c0602a">${origNameMap.get(a3) || a3}</strong> (origine)<br>` +
            `Emigrati fuori Africa: <strong>${d3.format(',.0f')(origStockMap.get(a3) || 0)}</strong>`
          );
        } else if (activeDstCodes.has(a3)) {
          g.selectAll('.mig-arc').attr('opacity', 0.05).attr('stroke', '#999').attr('fill', '#999');
          g.selectAll(`.mig-arc[data-dest="${a3}"]`)
            .attr('opacity', 0.9).attr('stroke', '#1a5276').attr('fill', '#1a5276').raise();
          showTip(e,
            `<strong style="color:#1a5276">${destNameMap.get(a3) || a3}</strong> (destinazione)<br>` +
            `Migranti africani: <strong>${d3.format(',.0f')(stockByDest.get(a3) || 0)}</strong>`
          );
        }
      })
      .on('mouseleave', () => {
        hideTip();
        g.selectAll('.mig-arc').attr('opacity', 0.35).attr('stroke', '#999').attr('fill', '#999');
      });

    pairs.filter(p => p.stock >= threshold && centroidByA3.has(p.srcCode) && centroidByA3.has(p.dstCode))
      .forEach(p => {
        const src = centroidByA3.get(p.srcCode);
        const dst = centroidByA3.get(p.dstCode);
        g.append('path')
          .attr('class', 'mig-arc')
          .attr('data-src', p.srcCode).attr('data-dest', p.dstCode)
          .attr('d', `M${src[0]},${src[1]} L${dst[0]},${dst[1]}`)
          .attr('fill', 'none').attr('stroke', '#999')
          .attr('stroke-width', 1).attr('opacity', 0.35)
          .style('pointer-events', 'none');

        [src, dst].forEach(pt => {
          g.append('circle')
            .attr('class', 'mig-arc')
            .attr('data-src', p.srcCode).attr('data-dest', p.dstCode)
            .attr('cx', pt[0]).attr('cy', pt[1])
            .attr('r', 2)
            .attr('fill', '#999').attr('opacity', 0.35)
            .style('pointer-events', 'none');
        });
      });

    // Legend — fixed on svg (outside g, doesn't zoom)
    const lgW = 100, lgH = 7;
    const lgY = H - 44;
    const defs = svg.append('defs');

    // Destination scale (blue)
    const lgXd = W - lgW - 12;
    const gradD = defs.append('linearGradient').attr('id', 'mig-map-grad-d');
    [0, 0.5, 1].forEach(t =>
      gradD.append('stop').attr('offset', `${t*100}%`).attr('stop-color', destColorS(t * maxDest))
    );
    svg.append('text').attr('x', lgXd).attr('y', lgY - 2)
      .attr('font-size', 7.5).attr('fill', '#666').text('Destinazione');
    svg.append('rect').attr('x', lgXd).attr('y', lgY).attr('width', lgW).attr('height', lgH)
      .attr('fill', 'url(#mig-map-grad-d)').attr('rx', 2);
    svg.append('text').attr('x', lgXd).attr('y', lgY + lgH + 9)
      .attr('font-size', 7.5).attr('fill', '#888').text('meno');
    svg.append('text').attr('x', lgXd + lgW).attr('y', lgY + lgH + 9)
      .attr('text-anchor', 'end').attr('font-size', 7.5).attr('fill', '#888').text('più migranti ricevuti');

    // Source scale (orange)
    const lgXs = lgXd - lgW - 16;
    const gradS = defs.append('linearGradient').attr('id', 'mig-map-grad-s');
    [0, 0.5, 1].forEach(t =>
      gradS.append('stop').attr('offset', `${t*100}%`).attr('stop-color', srcColorS(t * maxSrc))
    );
    svg.append('text').attr('x', lgXs).attr('y', lgY - 2)
      .attr('font-size', 7.5).attr('fill', '#666').text('Origine (Africa)');
    svg.append('rect').attr('x', lgXs).attr('y', lgY).attr('width', lgW).attr('height', lgH)
      .attr('fill', 'url(#mig-map-grad-s)').attr('rx', 2);
    svg.append('text').attr('x', lgXs).attr('y', lgY + lgH + 9)
      .attr('font-size', 7.5).attr('fill', '#888').text('meno');
    svg.append('text').attr('x', lgXs + lgW).attr('y', lgY + lgH + 9)
      .attr('text-anchor', 'end').attr('font-size', 7.5).attr('fill', '#888').text('più emigrati');
  }

  draw();

  containerNode._migrationShowYear = function(year) {
    stopAnim(); mode = 'network'; currentYear = year;
    const i = MIGRATION_YEARS.indexOf(year);
    if (i >= 0) { slider.property('value', i); yearLabel.text(year); }
    header.selectAll('.chord-mode-btn')
      .style('background', d => d === 'network' ? '#333' : '#fff')
      .style('color', d => d === 'network' ? '#fff' : '#333');
    draw();
  };
  containerNode._migrationAnimate = function() { playBtn.dispatch('click'); };
  containerNode._migrationShowMap = function() {
    stopAnim(); mode = 'map';
    header.selectAll('.chord-mode-btn')
      .style('background', d => d === 'map' ? '#333' : '#fff')
      .style('color', d => d === 'map' ? '#fff' : '#333');
    draw();
  };
}

/* ============================================================
   Grafico 5-2 — Rimesse come % PIL — Bubble Map + toggle Bolle
   ============================================================ */
async function renderRemittancesChart(selector = '#chart-5-2', isFullscreen = false) {
  const containerEl = document.querySelector(selector);
  if (!containerEl) return;
  containerEl.innerHTML = '';
  containerEl.style.position = 'relative';
  containerEl.style.fontFamily = 'inherit';

  const [remRaw, worldData] = await Promise.all([
    d3.csv('datasets/processed/remittances.csv', d3.autoType),
    _migWorldData
      ? Promise.resolve(_migWorldData)
      : d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json').then(d => { _migWorldData = d; return d; }),
  ]);

  const CONT_COLOR = {
    'Africa': '#e07b39', 'Asia': '#4a90d9', 'Europe': '#5aab6e',
    'North America': '#a45dc0', 'South America': '#d4b84a', 'Oceania': '#888888',
  };

  const remLatest = new Map();
  remRaw.forEach(d => {
    if (!d.code || d.value == null) return;
    const prev = remLatest.get(d.code);
    if (!prev || d.year > prev.year) remLatest.set(d.code, d);
  });
  const allData = Array.from(remLatest.values()).filter(d => d.value > 0 && (d.continent === 'Africa' || d.continent === 'Europe'));

  const geoCountries = topojson.feature(worldData, worldData.objects.countries).features;

  d3.select('body').selectAll('.tooltip-rem').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip-rem')
    .style('position', 'absolute').style('background', 'rgba(0,0,0,0.88)')
    .style('color', '#fff').style('border-radius', '6px').style('padding', '8px 12px')
    .style('pointer-events', 'none').style('font-size', '11px').style('line-height', '1.6')
    .style('z-index', '10000').style('display', 'none');

  function showTip(e, d) {
    const col = CONT_COLOR[d.continent] || '#fff';
    tooltip.style('display', 'block').html(
      `<div style="font-weight:700;color:${col};margin-bottom:3px">${d.country}</div>` +
      `Rimesse: <strong>${d.value.toFixed(1)}% del PIL</strong><br>` +
      `Anno: ${d.year}`
    );
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 12, ty = e.pageY + 8;
    if (tx + r.width  > window.innerWidth  - 8) tx = e.pageX - r.width  - 12;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 8;
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }
  function hideTip() { tooltip.style('display', 'none'); }

  let mode = 'map'; // 'map' | 'bubble'

  // Toggle button
  const btnWrap = d3.select(containerEl).append('div')
    .style('position', 'absolute').style('top', '6px').style('right', '8px')
    .style('z-index', '10').style('display', 'flex').style('gap', '4px');

  const btnMap = btnWrap.append('button')
    .style('font-size', '10px').style('padding', '2px 8px').style('border-radius', '5px')
    .style('cursor', 'pointer').style('border', '1px solid #c8d4e8').style('font-family', 'inherit')
    .text('Mappa').on('click', () => { mode = 'map'; updateBtns(); draw(); });

  const btnBub = btnWrap.append('button')
    .style('font-size', '10px').style('padding', '2px 8px').style('border-radius', '5px')
    .style('cursor', 'pointer').style('border', '1px solid #c8d4e8').style('font-family', 'inherit')
    .text('Bolle').on('click', () => { mode = 'bubble'; updateBtns(); draw(); });

  function updateBtns() {
    btnMap.style('background', mode === 'map'    ? '#e8eef7' : 'rgba(255,255,255,0.92)').style('font-weight', mode === 'map'    ? '700' : '400');
    btnBub.style('background', mode === 'bubble' ? '#e8eef7' : 'rgba(255,255,255,0.92)').style('font-weight', mode === 'bubble' ? '700' : '400');
  }
  updateBtns();

  const svgWrap = d3.select(containerEl).append('div').style('width', '100%').style('height', '100%');
  let _bubbleSim = null;

  const maxVal = d3.max(allData, d => d.value) || 1;
  const rScale = d3.scaleSqrt().domain([0, maxVal]).range([2, 28]);

  function draw() {
    if (_bubbleSim) { _bubbleSim.stop(); _bubbleSim = null; }
    svgWrap.html('');
    const W = containerEl.clientWidth  || 560;
    const H = containerEl.clientHeight || 460;
    if (mode === 'map') drawBubbleMap(W, H);
    else                drawBubbles(W, H);
  }

  function drawBubbleMap(W, H) {
    const projection = d3.geoNaturalEarth1()
      .fitExtent([[4, 4], [W - 4, H - 4]], { type: 'FeatureCollection', features: geoCountries });
    const pathGen = d3.geoPath().projection(projection);

    // Centroid of largest polygon
    function bestCentroid(f) {
      if (f.geometry && f.geometry.type === 'MultiPolygon') {
        let best = null, bestA = -1;
        f.geometry.coordinates.forEach(rings => {
          const ff = { type: 'Feature', geometry: { type: 'Polygon', coordinates: rings } };
          const a = d3.geoArea(ff);
          if (a > bestA) { bestA = a; best = ff; }
        });
        if (best) return pathGen.centroid(best);
      }
      return pathGen.centroid(f);
    }

    const centByA3 = new Map();
    geoCountries.forEach(f => {
      const a3 = _MIG_NUM_TO_A3[+f.id];
      if (!a3) return;
      const c = bestCentroid(f);
      if (!isNaN(c[0]) && !isNaN(c[1])) centByA3.set(a3, c);
    });

    const svg = svgWrap.append('svg').attr('width', W).attr('height', H)
      .style('display', 'block').style('background', '#eef2f7').style('border-radius', '10px');

    const mapG = svg.append('g');

    // Zoom
    const zoom = d3.zoom().scaleExtent([0.5, 10])
      .on('zoom', e => mapG.attr('transform', e.transform));
    svg.call(zoom).on('dblclick.zoom', null);

    // Countries base
    mapG.selectAll('.rem-cty').data(geoCountries).join('path')
      .attr('class', 'rem-cty').attr('d', pathGen)
      .attr('fill', '#d8e4ed').attr('stroke', '#fff').attr('stroke-width', 0.35);

    // Bubbles — only countries with data and centroid
    const bubData = allData.filter(d => centByA3.has(d.code)).sort((a, b) => b.value - a.value);

    mapG.selectAll('.rem-bub').data(bubData).join('circle')
      .attr('class', 'rem-bub')
      .attr('cx', d => centByA3.get(d.code)[0])
      .attr('cy', d => centByA3.get(d.code)[1])
      .attr('r', d => rScale(d.value))
      .attr('fill', d => CONT_COLOR[d.continent] || '#888')
      .attr('fill-opacity', 0.72)
      .attr('stroke', '#fff').attr('stroke-width', 0.8)
      .style('cursor', 'pointer')
      .on('mousemove', showTip).on('mouseleave', hideTip);
  }

  function drawBubbles(W, H) {
    const nodes = allData.map(d => ({ ...d, r: rScale(d.value) }));

    const svg = svgWrap.append('svg').attr('width', W).attr('height', H)
      .style('display', 'block').style('background', '#eef2f7').style('border-radius', '10px');

    const nodeEls = svg.selectAll('.bub-g').data(nodes).join('g').attr('class', 'bub-g')
      .style('cursor', 'pointer')
      .on('mousemove', (e, d) => showTip(e, d)).on('mouseleave', hideTip);

    nodeEls.append('circle')
      .attr('r', d => d.r)
      .attr('fill', d => CONT_COLOR[d.continent] || '#888')
      .attr('fill-opacity', 0.75)
      .attr('stroke', '#fff').attr('stroke-width', 0.8);

    nodeEls.append('text')
      .style('pointer-events', 'none')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('font-size', d => Math.min(9, d.r * 0.7))
      .attr('fill', '#fff').attr('font-weight', '600')
      .text(d => d.r >= 10 ? (d.country.length > 10 ? d.code : d.country) : '');

    _bubbleSim = d3.forceSimulation(nodes)
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide(d => d.r + 1.5).strength(0.85))
      .force('x', d3.forceX(W / 2).strength(0.04))
      .force('y', d3.forceY(H / 2).strength(0.06))
      .on('tick', () => nodeEls.attr('transform', d => `translate(${d.x},${d.y})`));

    // Legend
    const conts = [...new Set(nodes.map(d => d.continent))].sort();
    const lgG = svg.append('g').attr('transform', `translate(8,${H - conts.length * 13 - 8})`);
    conts.forEach((c, i) => {
      lgG.append('circle').attr('cx', 5).attr('cy', i * 13 + 5).attr('r', 5).attr('fill', CONT_COLOR[c] || '#888').attr('opacity', 0.8);
      lgG.append('text').attr('x', 13).attr('y', i * 13 + 9).attr('font-size', 8).attr('fill', '#555').text(c);
    });
  }

  draw();
  containerEl._remittancesReset = () => { mode = 'map'; updateBtns(); draw(); };
}
