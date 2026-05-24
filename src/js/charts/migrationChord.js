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

  const DATA_YEARS = [2000, 2005, 2010, 2015, 2020];

  // Linear interpolation between 5-year data points → annual granularity
  function getYearData(year) {
    const clamped = Math.max(2000, Math.min(2020, year));
    if (DATA_YEARS.includes(clamped)) return migRaw.filter(d => d.year === clamped);
    let i = 0;
    while (i < DATA_YEARS.length - 1 && DATA_YEARS[i + 1] < clamped) i++;
    const y0 = DATA_YEARS[i], y1 = DATA_YEARS[i + 1];
    const t = (clamped - y0) / (y1 - y0);
    const rows0 = migRaw.filter(d => d.year === y0);
    const map1 = new Map();
    migRaw.filter(d => d.year === y1).forEach(d => map1.set(`${d.origin_code}|${d.dest_code}`, d.stock));
    return rows0.map(d => {
      const s1 = map1.get(`${d.origin_code}|${d.dest_code}`) ?? d.stock;
      return { ...d, year: clamped, stock: Math.round(d.stock + t * (s1 - d.stock)) };
    });
  }

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
  let mode = 'sankey';
  let animTimer = null;
  let sankeyDrillContinents = new Set(); // expanded dest continents

  const wrap = container.append('div')
    .style('width', '100%').style('height', '100%').style('position', 'relative')
    .style('display', 'flex').style('flex-direction', 'column');

  // ── Top header: pill buttons ─────────────────────────────────
  const header = wrap.append('div')
    .style('display', 'flex').style('align-items', 'center')
    .style('padding', '8px 10px 4px').style('flex-shrink', '0');

  const pillBar = header.append('div')
    .style('display', 'flex').style('background', 'rgba(255,255,255,0.92)')
    .style('border-radius', '9px').style('border', '1px solid #d0d8e8')
    .style('padding', '3px').style('gap', '2px')
    .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)')
    .style('position', 'relative').style('z-index', '20');

  function mkModeBtn(m, label) {
    return pillBar.append('button')
      .style('font-size', '11px').style('padding', '5px 14px').style('border-radius', '6px')
      .style('border', 'none').style('cursor', 'pointer').style('font-weight', '600')
      .style('transition', 'all 0.15s').text(label)
      .on('click', () => { mode = m; stopAnim(); sankeyDrillContinents.clear(); updateModeBtns(); draw(); });
  }

  const btnSankey = mkModeBtn('sankey', 'Sankey');
  const btnMap    = mkModeBtn('map',    'Mappa');

  function updateModeBtns() {
    const set = (btn, active) => btn
      .style('background', active ? '#5a8a6e' : 'transparent')
      .style('color',      active ? '#fff'    : '#7a8aaa')
      .style('box-shadow', active ? '0 1px 4px rgba(90,138,110,0.3)' : 'none');
    set(btnSankey, mode === 'sankey');
    set(btnMap,    mode === 'map');
  }
  updateModeBtns();

  const svgArea = wrap.append('div').style('flex', '1').style('position', 'relative').style('min-height', '0');

  // ── Bottom player bar — styled like GDP map ───────────────────
  const footer = wrap.append('div')
    .style('display', 'flex').style('align-items', 'center').style('gap', '8px')
    .style('padding', '8px 16px').style('background', '#fff')
    .style('border-top', '1px solid #e4e8f0').style('flex-shrink', '0');

  const btnStyle = btn => btn
    .style('width', '30px').style('height', '30px').style('border-radius', '50%')
    .style('border', '1px solid #d0d9e8').style('background', '#fff')
    .style('cursor', 'pointer').style('font-size', '13px').style('display', 'flex')
    .style('align-items', 'center').style('justify-content', 'center')
    .style('color', '#8096b0').style('flex-shrink', '0').style('line-height', '1');

  btnStyle(footer.append('button').text('↺'))
    .on('click', () => {
      stopAnim();
      currentYear = 2000;
      slider.property('value', 0);
      yearLabel.text(currentYear);
      draw();
    });

  btnStyle(footer.append('button').text('‹'))
    .on('click', () => {
      stopAnim();
      currentYear = Math.max(2000, currentYear - 1);
      slider.property('value', currentYear - 2000);
      yearLabel.text(currentYear);
      draw();
    });

  const playBtn = footer.append('button')
    .style('width', '42px').style('height', '42px').style('border-radius', '50%')
    .style('border', 'none').style('background', '#1a3a5c')
    .style('cursor', 'pointer').style('font-size', '16px').style('display', 'flex')
    .style('align-items', 'center').style('justify-content', 'center')
    .style('color', '#fff').style('flex-shrink', '0')
    .text('▶')
    .on('click', () => {
      if (animTimer) { stopAnim(); return; }
      let y = currentYear >= 2020 ? 2000 : currentYear;
      playBtn.text('⏸');
      function step() {
        currentYear = y;
        slider.property('value', y - 2000);
        yearLabel.text(y);
        draw();
        y++;
        if (y <= 2020) animTimer = setTimeout(step, 250);
        else stopAnim();
      }
      step();
    });

  btnStyle(footer.append('button').text('›'))
    .on('click', () => {
      stopAnim();
      currentYear = Math.min(2020, currentYear + 1);
      slider.property('value', currentYear - 2000);
      yearLabel.text(currentYear);
      draw();
    });

  // Timeline slider + tick labels
  const timelineWrap = footer.append('div')
    .style('flex', '1').style('display', 'flex').style('flex-direction', 'column')
    .style('padding', '0 8px').style('min-width', '0');

  const slider = timelineWrap.append('input')
    .attr('id', 'mig-chord-slider')
    .attr('type', 'range')
    .attr('min', 0).attr('max', 20).attr('value', 20).attr('step', 1)
    .style('width', '100%').style('cursor', 'pointer')
    .style('-webkit-appearance', 'none').style('appearance', 'none')
    .style('height', '5px').style('background', 'rgba(0,0,0,0.25)')
    .style('border-radius', '2px').style('outline', 'none')
    .on('input', function() {
      stopAnim();
      currentYear = 2000 + +this.value;
      yearLabel.text(currentYear);
      draw();
    });

  if (!document.getElementById('mig-chord-slider-style')) {
    const st = document.createElement('style');
    st.id = 'mig-chord-slider-style';
    st.textContent = `
      #mig-chord-slider::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none;
        width: 16px; height: 16px; border-radius: 50%;
        background: #1a3a5c; cursor: pointer;
      }
      #mig-chord-slider::-moz-range-thumb {
        width: 16px; height: 16px; border-radius: 50%;
        background: #1a3a5c; cursor: pointer; border: none;
      }
    `;
    document.head.appendChild(st);
  }

  const tickRow = timelineWrap.append('div')
    .style('display', 'flex').style('justify-content', 'space-between')
    .style('padding', '2px 2px 0');
  DATA_YEARS.forEach(y => {
    tickRow.append('span').style('font-size', '9px').style('color', '#aaa').text(y);
  });

  const yearLabel = footer.append('div')
    .style('font-size', '28px').style('font-weight', '700').style('color', '#1a3a5c')
    .style('min-width', '60px').style('text-align', 'right').style('flex-shrink', '0')
    .style('font-family', 'inherit').style('letter-spacing', '-0.5px')
    .text('2020');

  function stopAnim() {
    if (animTimer) { clearTimeout(animTimer); animTimer = null; }
    playBtn.text('▶');
  }

  function draw() {
    svgArea.html('');
    d3.select(containerNode).selectAll('svg.mig-map-svg').remove();
    const rect = containerNode.getBoundingClientRect();
    const W = rect.width  || 560;
    const H = mode === 'map'
      ? (rect.height || 480)
      : (svgArea.node().getBoundingClientRect().height || 380);
    if (W < 10 || H < 10) return;
    if (mode === 'map') drawMap(W, H);
    else drawSankey(W, H);
  }

  /* ── Network: expand/collapse in-place ────────────────────── */
  let _sim         = null;
  let _expandedSrc = false;
  let _expandedDst = new Set();
  let _posCache    = new Map();

  function drawNetwork(W, H) {
    if (_sim) { _sim.stop(); _sim = null; }

    const yearData = getYearData(currentYear).filter(d =>
      d.origin_continent === 'Africa' &&
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

  /* ── Sankey: Africa → Dest Continents → Top Countries ─────── */
  function drawSankey(W, H) {
    const yearData = getYearData(currentYear).filter(d =>
      d.origin_continent === 'Africa' &&
      d.dest_continent !== 'Africa' && d.stock > 0
    );

    const margin = { top: 20, right: 180, bottom: 20, left: 120 };
    const iw = W - margin.left - margin.right;
    const ih = H - margin.top  - margin.bottom;

    const svg = svgArea.append('svg').attr('width', W).attr('height', H)
      .style('display', 'block').style('background', '#fff').style('font-family', 'inherit');
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // ── Build nodes & links ─────────────────────────────────────
    const destContStock = d3.rollup(yearData, v => d3.sum(v, d => d.stock), d => d.dest_continent);
    const destConts = [...destContStock.keys()].sort((a, b) => destContStock.get(b) - destContStock.get(a));

    let nodes = [], links = [];

    // Always show all continents at layer 1
    const srcNode = { id: 'AFRICA', name: 'Africa', layer: 0, col: '#e07b39' };
    nodes = [srcNode];
    destConts.forEach(cont => {
      nodes.push({ id: cont, name: cont, layer: 1, col: CONT_COLOR[cont] || '#888' });
      links.push({ source: 'AFRICA', target: cont, value: destContStock.get(cont) });
    });

    // Collect all country nodes globally, sort by value desc
    // Dynamic threshold: 1% of that continent's total → aggregate rest into "Altri"
    const pendingCountries = [];
    sankeyDrillContinents.forEach(cont => {
      const contData = yearData.filter(d => d.dest_continent === cont);
      const countryStock = d3.rollup(contData, v => d3.sum(v, d => d.stock), d => d.dest_code);
      const contTotal = d3.sum(countryStock.values());
      const threshold = contTotal * 0.01;
      const sorted = [...countryStock.entries()].sort((a, b) => b[1] - a[1]);
      const visible = sorted.filter(([, v]) => v >= threshold);
      const hidden  = sorted.filter(([, v]) => v < threshold);
      visible.forEach(([code, val]) => {
        const name = contData.find(d => d.dest_code === code)?.dest_country || code;
        pendingCountries.push({ id: code, name, col: CONT_COLOR[cont] || '#888', source: cont, value: val, detail: null });
      });
      if (hidden.length > 0) {
        const othVal = d3.sum(hidden, d => d[1]);
        const detail = hidden.map(([code, val]) => {
          const name = contData.find(d => d.dest_code === code)?.dest_country || code;
          return { name, val };
        });
        pendingCountries.push({ id: `__others_${cont}__`, name: 'Altri', col: CONT_COLOR[cont] || '#888', source: cont, value: othVal, detail });
      }
    });
    pendingCountries.sort((a, b) => b.value - a.value);
    pendingCountries.forEach(c => {
      nodes.push({ id: c.id, name: c.name, layer: 2, col: c.col, detail: c.detail });
      links.push({ source: c.source, target: c.id, value: c.value });
    });

    const DUMMY_ID = '__dummy__'; // kept for filter references below

    // Build sankey-compatible index
    const nodeById = new Map(nodes.map((n, i) => [n.id, i]));
    const sankeyLinks = links.map(l => ({
      source: nodeById.get(l.source),
      target: nodeById.get(l.target),
      value: l.value,
    })).filter(l => l.source != null && l.target != null && l.value > 0);

    const sankeyGen = d3.sankey()
      .nodeId(d => d.index)
      .nodeAlign(d3.sankeyLeft)
      .nodeSort(null)
      .linkSort(null)
      .nodeWidth(16)
      .nodePadding(10)
      .extent([[0, 0], [iw, ih]]);

    const { nodes: sNodes, links: sLinks } = sankeyGen({
      nodes: nodes.map((d, i) => ({ ...d, index: i })),
      links: sankeyLinks,
    });

    // ── Links (exclude dummy) ──────────────────────────────────
    const visLinks = sLinks.filter(l => nodes[l.target.index]?.id !== DUMMY_ID);
    g.selectAll('.sk-link').data(visLinks).join('path')
      .attr('class', 'sk-link')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('fill', 'none')
      .attr('stroke', d => nodes[d.target.index]?.col || '#aaa')
      .attr('stroke-width', d => Math.max(1, d.width))
      .attr('stroke-opacity', 0.25)
      .style('cursor', 'pointer')
      .on('mouseover', function() { d3.select(this).attr('stroke-opacity', 0.55); })
      .on('mouseleave', function() { d3.select(this).attr('stroke-opacity', 0.25); })
      .on('mousemove', (e, d) => showTip(e,
        `<strong style="color:${nodes[d.source.index]?.col||'#fff'}">${nodes[d.source.index]?.name}</strong>` +
        ` → <strong style="color:${nodes[d.target.index]?.col||'#fff'}">${nodes[d.target.index]?.name}</strong><br>` +
        `Migranti: <strong>${d3.format(',.0f')(d.value)}</strong>`
      ))
      .on('mouseleave', () => { hideTip(); g.selectAll('.sk-link').attr('stroke-opacity', 0.25); });

    // ── Nodes (exclude dummy) ──────────────────────────────────
    const visNodes = sNodes.filter(n => nodes[n.index]?.id !== DUMMY_ID);
    const nodeG = g.selectAll('.sk-node').data(visNodes).join('g').attr('class', 'sk-node');

    nodeG.append('rect')
      .attr('x', d => d.x0).attr('y', d => d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => Math.max(1, d.y1 - d.y0))
      .attr('fill', d => nodes[d.index]?.col || '#888')
      .attr('rx', 3).attr('opacity', 0.85)
      .style('cursor', d => nodes[d.index]?.layer === 1 ? 'pointer' : 'default')
      .on('click', (e, d) => {
        const nd = nodes[d.index];
        if (!nd || nd.layer !== 1) return;
        if (sankeyDrillContinents.has(nd.id)) sankeyDrillContinents.delete(nd.id);
        else sankeyDrillContinents.add(nd.id);
        draw();
      })
      .on('mousemove', (e, d) => {
        const nd = nodes[d.index];
        if (!nd || !nd.name) return;
        let html = `<strong style="color:${nd.col||'#fff'}">${nd.name}</strong><br>` +
          `Stock totale: <strong>${d3.format(',.0f')(d.value)}</strong>`;
        if (nd.layer === 1) {
          html += sankeyDrillContinents.has(nd.id)
            ? '<br><em style="opacity:.6;font-size:10px">Clicca per chiudere ↩</em>'
            : '<br><em style="opacity:.6;font-size:10px">Clicca per dettaglio →</em>';
        }
        if (nd.detail) {
          html += '<br><span style="opacity:.5;font-size:9px;text-transform:uppercase;letter-spacing:.05em">Paesi inclusi</span>';
          nd.detail.forEach(r => {
            html += `<br><span style="opacity:.8">${r.name}</span>: ${d3.format(',.0f')(r.val)}`;
          });
        }
        showTip(e, html);
      })
      .on('mouseleave', hideTip);

    // ── Labels ─────────────────────────────────────────────────
    nodeG.append('text')
      .attr('x', d => nodes[d.index]?.layer === 0 ? d.x0 - 6 : d.x1 + 6)
      .attr('y', d => (d.y1 + d.y0) / 2)
      .attr('text-anchor', d => nodes[d.index]?.layer === 0 ? 'end' : 'start')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', d => nodes[d.index]?.layer === 0 ? 11 : 9)
      .attr('font-weight', d => nodes[d.index]?.layer === 0 ? '700' : '500')
      .attr('fill', d => nodes[d.index]?.col || '#555')
      .style('pointer-events', 'none')
      .text(d => {
        const nd = nodes[d.index];
        if (!nd || !nd.name) return '';
        const label = nd.name.length > 16 ? nd.name.slice(0, 15) + '…' : nd.name;
        return `${label}  ${d3.format('.2~s')(d.value)}`;
      });

    // ── Year label ─────────────────────────────────────────────
    svg.append('text').attr('x', W - 8).attr('y', H - 8)
      .attr('text-anchor', 'end').attr('font-size', 9).attr('fill', '#ccc')
      .text(currentYear);
  }

  /* ── Connection Map ────────────────────────────────────────── */
  async function drawMap(W, H) {
    if (!_migWorldData) {
      _migWorldData = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json');
    }

    const yearData = getYearData(currentYear).filter(d =>
      d.origin_continent === 'Africa' &&
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

    // ── Color scale for destination countries ───────────────────
    const maxDest   = d3.max(stockByDest.values()) || 1;
    const destColor = d3.scaleSequential()
      .domain([0, maxDest]).interpolator(d3.interpolateBlues);

    // ── SVG + zoom ───────────────────────────────────────────────
    const svg = d3.select(containerNode).append('svg').attr('width', W).attr('height', H)
      .attr('class', 'mig-map-svg')
      .style('display', 'block').style('font-family', 'inherit').style('background', '#eef2f7')
      .style('position', 'absolute').style('top', '0').style('left', '0').style('z-index', '1')
      .style('border-radius', '10px').style('cursor', 'grab');

    const g    = svg.append('g');
    const zoom = d3.zoom().scaleExtent([0.5, 12])
      .on('zoom', e => { g.attr('transform', e.transform); svg.style('cursor', 'grabbing'); })
      .on('end',  () => svg.style('cursor', 'grab'));
    svg.call(zoom).on('dblclick.zoom', null);

    // Countries — choropleth for destinations, orange for Africa origins, grey otherwise
    g.selectAll('.cty').data(geoCountries).join('path')
      .attr('class', 'cty')
      .attr('d', pathGen)
      .attr('stroke', '#fff').attr('stroke-width', 0.35)
      .attr('fill', f => {
        const a3 = _MIG_NUM_TO_A3[+f.id];
        if (!a3) return '#ccd8df';
        if (africaCodes.has(a3)) return '#e07b39';
        const stock = stockByDest.get(a3);
        return stock ? destColor(stock) : '#ccd8df';
      })
      .on('mousemove', (e, f) => {
        const a3 = _MIG_NUM_TO_A3[+f.id];
        if (!a3) return;
        if (activeSrcCodes.has(a3)) {
          g.selectAll('.mig-arc').attr('opacity', 0.05);
          g.selectAll(`.mig-arc[data-src="${a3}"]`).attr('opacity', 0.85).raise();
          showTip(e,
            `<strong>${origNameMap.get(a3) || a3}</strong> (origine)<br>` +
            `Emigrati fuori Africa: <strong>${d3.format(',.0f')(origStockMap.get(a3) || 0)}</strong>`
          );
        } else if (activeDstCodes.has(a3)) {
          g.selectAll('.mig-arc').attr('opacity', 0.05);
          g.selectAll(`.mig-arc[data-dest="${a3}"]`).attr('opacity', 0.85).raise();
          showTip(e,
            `<strong>${destNameMap.get(a3) || a3}</strong> (destinazione)<br>` +
            `Migranti africani: <strong>${d3.format(',.0f')(stockByDest.get(a3) || 0)}</strong>`
          );
        }
      })
      .on('mouseleave', () => {
        hideTip();
        g.selectAll('.mig-arc').attr('opacity', 0.28);
      });

    // Curved arcs — always curve upward (pick normal pointing to smaller Y)
    function arcPath(src, dst) {
      const mx = (src[0] + dst[0]) / 2;
      const my = (src[1] + dst[1]) / 2;
      const dx = dst[0] - src[0];
      const dy = dst[1] - src[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return `M${src[0]},${src[1]}`;
      const offset = dist * 0.42;
      const nx = -dy / dist;
      const ny =  dx / dist;
      const [cpx, cpy] = (my + ny * offset) < (my - ny * offset)
        ? [mx + nx * offset, my + ny * offset]
        : [mx - nx * offset, my - ny * offset];
      return `M${src[0]},${src[1]} Q${cpx},${cpy} ${dst[0]},${dst[1]}`;
    }

    pairs.filter(p => p.stock >= threshold && centroidByA3.has(p.srcCode) && centroidByA3.has(p.dstCode))
      .forEach(p => {
        const src = centroidByA3.get(p.srcCode);
        const dst = centroidByA3.get(p.dstCode);
        const w = 1.4;
        g.append('path')
          .attr('class', 'mig-arc')
          .attr('data-src', p.srcCode).attr('data-dest', p.dstCode)
          .attr('d', arcPath(src, dst))
          .attr('fill', 'none').attr('stroke', '#607d8b')
          .attr('stroke-width', w).attr('opacity', 0.28)
          .style('pointer-events', 'none');
      });
  }

  draw();

  containerNode._migrationShowYear = function(year) {
    stopAnim(); mode = 'network'; currentYear = Math.max(2000, Math.min(2020, year));
    slider.property('value', currentYear - 2000); yearLabel.text(currentYear);
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
   Grafico 5-2 — Rimesse come % PIL (Africa)
   Treemap | Choropleth  +  player anni
   ============================================================ */
async function renderRemittancesChart(selector = '#chart-5-2', isFullscreen = false) {
  const containerEl = document.querySelector(selector);
  if (!containerEl) return;
  containerEl.innerHTML = '';
  containerEl.style.cssText += ';position:relative;font-family:inherit;display:flex;flex-direction:column;box-sizing:border-box;';

  const [remRaw, worldData] = await Promise.all([
    d3.csv('datasets/processed/remittances.csv', d3.autoType),
    _migWorldData
      ? Promise.resolve(_migWorldData)
      : d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json').then(d => { _migWorldData = d; return d; }),
  ]);

  /* ── Data prep ──────────────────────────────────────────── */
  const africaRaw = remRaw.filter(d => d.continent === 'Africa' && d.code && d.value != null && d.value > 0);
  const years     = [...new Set(africaRaw.map(d => d.year))].sort((a, b) => a - b);
  const byYear    = d3.group(africaRaw, d => d.year);

  /* per each code keep latest year as fallback */
  const latestByCode = new Map();
  africaRaw.forEach(d => {
    const prev = latestByCode.get(d.code);
    if (!prev || d.year > prev.year) latestByCode.set(d.code, d);
  });

  const allFeatures = topojson.feature(worldData, worldData.objects.countries).features;
  const AFRICA_CODES = new Set([
    'DZA','AGO','BEN','BWA','BFA','BDI','CMR','CPV','CAF','TCD','COM','COG','COD',
    'CIV','DJI','EGY','GNQ','ERI','ETH','GAB','GMB','GHA','GIN','GNB','KEN','LSO',
    'LBR','LBY','MDG','MWI','MLI','MRT','MUS','MAR','MOZ','NAM','NER','NGA','RWA',
    'STP','SEN','SLE','SOM','ZAF','SSD','SDN','SWZ','TZA','TGO','TUN','UGA','ZMB',
    'ZWE','ESH',
  ]);
  const africaFeatures = allFeatures.filter(f => {
    const c = _MIG_NUM_TO_A3[+f.id]; return c && AFRICA_CODES.has(c);
  });

  /* ── Threshold color scale (discrete, fixed across all years) ── */
  const globalMax = d3.max(africaRaw, d => d.value) || 1;
  const THRESHOLDS = [1, 3, 7, 12, 20];
  const COLORS     = ['#edf5e1', '#c5e1a5', '#81c784', '#4caf50', '#2e7d32', '#1b5e20'];
  const COLOR_SCALE = d3.scaleThreshold().domain(THRESHOLDS).range(COLORS);
  const NO_DATA_COLOR = '#cccccc';

  /* ── State ──────────────────────────────────────────────── */
  let viewMode  = 'treemap';
  let curYear   = years[years.length - 1];
  let playing   = false;
  let playTimer = null;

  /* ── Tooltip ────────────────────────────────────────────── */
  d3.select('body').selectAll('.tooltip-rem').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip-rem')
    .style('position', 'absolute').style('background', 'rgba(20,20,40,0.93)')
    .style('color', '#fff').style('border-radius', '6px').style('padding', '8px 13px')
    .style('pointer-events', 'none').style('font-size', '11px').style('line-height', '1.7')
    .style('z-index', '10000').style('display', 'none').style('max-width', '220px');

  function showTip(e, d) {
    tooltip.style('display', 'block').html(
      `<strong style="color:#81c784">${d.country}</strong><br>` +
      `Rimesse: <strong>${d.value.toFixed(1)}% del PIL</strong><br>` +
      `<em style="opacity:.5;font-size:9px">Anno: ${d.year}</em>`
    );
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 14, ty = e.pageY + 10;
    if (tx + r.width  > window.innerWidth  - 8) tx = e.pageX - r.width  - 14;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 10;
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }
  function hideTip() { tooltip.style('display', 'none'); }

  /* ── Viz area ───────────────────────────────────────────── */
  const vizDiv = d3.select(containerEl).append('div')
    .style('flex', '1 1 0').style('position', 'relative').style('overflow', 'hidden')
    .style('padding-top', '40px');

  /* ── Player bar ─────────────────────────────────────────── */
  const playerBar = d3.select(containerEl).append('div')
    .style('display', 'flex').style('align-items', 'center')
    .style('gap', '8px').style('padding', '8px 16px')
    .style('background', '#fff').style('border-top', '1px solid #e4e8f0')
    .style('flex-shrink', '0');

  /* Play/pause button */
  const playBtn = playerBar.append('button')
    .style('width', '42px').style('height', '42px').style('border-radius', '50%')
    .style('border', 'none').style('background', '#1a3a5c')
    .style('cursor', 'pointer').style('display', 'flex')
    .style('align-items', 'center').style('justify-content', 'center')
    .style('color', '#fff').style('flex-shrink', '0').style('font-size', '16px')
    .text('▶');

  /* Timeline slider + tick labels */
  const timelineWrap = playerBar.append('div')
    .style('flex', '1').style('display', 'flex').style('flex-direction', 'column')
    .style('padding', '0 8px').style('min-width', '0');

  const slider = timelineWrap.append('input').attr('type', 'range')
    .attr('id', 'rem-chart-slider')
    .attr('min', 0).attr('max', years.length - 1)
    .attr('value', years.length - 1).attr('step', 1)
    .style('width', '100%').style('cursor', 'pointer')
    .style('-webkit-appearance', 'none').style('appearance', 'none')
    .style('height', '5px').style('background', 'rgba(0,0,0,0.25)')
    .style('border-radius', '2px').style('outline', 'none');

  if (!document.getElementById('rem-chart-slider-style')) {
    const st = document.createElement('style');
    st.id = 'rem-chart-slider-style';
    st.textContent = `
      #rem-chart-slider::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none;
        width: 16px; height: 16px; border-radius: 50%;
        background: #1a3a5c; cursor: pointer;
      }
      #rem-chart-slider::-moz-range-thumb {
        width: 16px; height: 16px; border-radius: 50%;
        background: #1a3a5c; cursor: pointer; border: none;
      }
    `;
    document.head.appendChild(st);
  }

  const tickRow = timelineWrap.append('div')
    .style('display', 'flex').style('justify-content', 'space-between')
    .style('padding', '2px 2px 0');
  [years[0], years[Math.floor(years.length / 2)], years[years.length - 1]]
    .filter((y, i, a) => a.indexOf(y) === i)
    .forEach(y => tickRow.append('span').style('font-size', '9px').style('color', '#aaa').text(y));

  /* Year display */
  const yearLabel = playerBar.append('div')
    .style('font-size', '28px').style('font-weight', '700').style('color', '#1a3a5c')
    .style('min-width', '60px').style('text-align', 'right').style('flex-shrink', '0')
    .style('font-family', 'inherit').style('letter-spacing', '-0.5px').text(curYear);

  /* ── Pill buttons — top-right ───────────────────────────── */
  const pillBar = d3.select(containerEl).append('div')
    .style('position', 'absolute').style('top', '8px').style('left', '8px')
    .style('display', 'flex').style('background', 'rgba(255,255,255,0.92)')
    .style('border-radius', '9px').style('border', '1px solid #d0d8e8')
    .style('padding', '3px').style('gap', '2px')
    .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)').style('z-index', '10');

  function mkBtn(label, val) {
    return pillBar.append('button')
      .style('font-size', '11px').style('padding', '5px 14px').style('border-radius', '6px')
      .style('border', 'none').style('cursor', 'pointer').style('font-weight', '600')
      .style('transition', 'all 0.15s').text(label)
      .on('click', () => { viewMode = val; updateBtns(); redraw(); });
  }
  const btnTree = mkBtn('Treemap', 'treemap');
  const btnMap  = mkBtn('Mappa',   'map');

  function updateBtns() {
    const set = (btn, active) => btn
      .style('background', active ? '#5a8a6e' : 'transparent')
      .style('color',      active ? '#fff'    : '#7a8aaa')
      .style('box-shadow', active ? '0 1px 4px rgba(90,138,110,0.3)' : 'none');
    set(btnTree, viewMode === 'treemap');
    set(btnMap,  viewMode === 'map');
  }
  updateBtns();

  /* ── Legend — discrete swatches, bottom-right ──────────── */
  function drawLegend(svg, W, H) {
    const SW = 14, SH = 14, GAP = 4, TW = 52;
    const rowH   = SH + GAP;
    const labels = [
      { color: COLORS[5], text: '> 20%'   },
      { color: COLORS[4], text: '12 – 20%' },
      { color: COLORS[3], text: '7 – 12%'  },
      { color: COLORS[2], text: '3 – 7%'   },
      { color: COLORS[1], text: '1 – 3%'   },
      { color: COLORS[0], text: '< 1%'     },
      { color: NO_DATA_COLOR, text: 'No data' },
    ];
    const boxW = SW + 8 + TW + 10;
    const boxH = 14 + labels.length * rowH + 8;
    const LX   = W - boxW - 10;
    const LY   = 10;

    const legG = svg.append('g').attr('transform', `translate(${LX},${LY})`);
    legG.append('rect').attr('x', 0).attr('y', 0).attr('width', boxW).attr('height', boxH)
      .attr('rx', 6).attr('fill', 'rgba(255,255,255,0.92)').attr('stroke', '#e0e0e0').attr('stroke-width', 1);

    legG.append('text').attr('x', 8).attr('y', 11)
      .attr('font-size', 8).attr('font-weight', '700').attr('fill', '#aaa').attr('letter-spacing', '0.06em')
      .text('RIMESSE % PIL');

    labels.forEach((item, i) => {
      const y = 14 + i * rowH + GAP / 2;
      legG.append('rect').attr('x', 8).attr('y', y)
        .attr('width', SW).attr('height', SH).attr('rx', 2)
        .attr('fill', item.color).attr('stroke', '#ddd').attr('stroke-width', 0.5);
      legG.append('text').attr('x', 8 + SW + 6).attr('y', y + SH - 3)
        .attr('font-size', 9).attr('fill', '#444').text(item.text);
    });
  }

  /* ── Data for current year ──────────────────────────────── */
  function dataForYear(yr) {
    const yearData = byYear.get(yr) || [];
    const byCode   = new Map(yearData.map(d => [d.code, d]));
    /* fallback: use latest available if country missing in this year */
    latestByCode.forEach((d, code) => { if (!byCode.has(code)) byCode.set(code, d); });
    return Array.from(byCode.values()).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }

  /* ── Treemap ────────────────────────────────────────────── */
  function drawTreemap(W, H) {
    const data    = dataForYear(curYear);
    const LEG_W   = 104; /* reserved for legend on the right */
    const PAD     = { top: 8, right: 8 + LEG_W, bottom: 8, left: 8 };
    const iw      = W - PAD.left - PAD.right;
    const ih      = H - PAD.top  - PAD.bottom;

    const root = d3.hierarchy({ children: data })
      .sum(d => d.value ?? 0).sort((a, b) => b.value - a.value);
    d3.treemap().size([iw, ih]).paddingOuter(4).paddingInner(2).round(true)(root);

    const svg = vizDiv.append('svg').attr('width', W).attr('height', H)
      .style('display', 'block').style('font-family', 'inherit');
    const g = svg.append('g').attr('transform', `translate(${PAD.left},${PAD.top})`);

    const cell = g.selectAll('g').data(root.leaves()).join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    cell.append('rect')
      .attr('width',  d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('rx', 3).attr('fill', d => COLOR_SCALE(d.data.value))
      .attr('stroke', '#fff').attr('stroke-width', 1.5).style('cursor', 'default')
      .on('mousemove', (e, d) => showTip(e, d.data)).on('mouseleave', hideTip);

    cell.each(function(d) {
      const cw = d.x1 - d.x0, ch = d.y1 - d.y0;
      if (cw < 20 || ch < 12) return;
      const sel  = d3.select(this);
      const dark = d.data.value >= 12;
      const fill = dark ? '#fff' : '#1a1a1a';
      const maxChars = Math.max(2, Math.floor(cw / 6));
      const name = d.data.country.length > maxChars
        ? d.data.country.slice(0, maxChars - 1) + '…' : d.data.country;
      if (ch >= 22) sel.append('text').attr('x', 4).attr('y', 13)
        .attr('font-size', Math.min(11, Math.max(7, cw / 8))).attr('font-weight', '600')
        .attr('fill', fill).attr('pointer-events', 'none').text(name);
      if (ch >= 34) sel.append('text').attr('x', 4).attr('y', ch - 5)
        .attr('font-size', Math.min(10, Math.max(6, cw / 9))).attr('fill', fill)
        .attr('opacity', 0.85).attr('pointer-events', 'none')
        .text(d.data.value.toFixed(1) + '%');
    });

    drawLegend(svg, W, H);
  }

  /* ── Choropleth ─────────────────────────────────────────── */
  function drawMap(W, H) {
    const data      = dataForYear(curYear);
    const dataByCode = new Map(data.map(d => [d.code, d]));
    const PAD       = 24;
    const projection = d3.geoNaturalEarth1()
      .fitSize([W - PAD * 2, H - PAD * 2], { type: 'FeatureCollection', features: africaFeatures });
    const path = d3.geoPath().projection(projection);

    const svg = vizDiv.append('svg').attr('width', W).attr('height', H)
      .style('display', 'block').style('font-family', 'inherit');
    const g = svg.append('g').attr('transform', `translate(${PAD},${PAD})`);

    g.selectAll('.bg-cty').data(allFeatures).join('path').attr('class', 'bg-cty')
      .attr('d', path).attr('fill', '#e8e8e8').attr('stroke', '#fff').attr('stroke-width', 0.4);

    g.selectAll('.af-cty').data(africaFeatures).join('path').attr('class', 'af-cty')
      .attr('d', path)
      .attr('fill', f => {
        const rec = dataByCode.get(_MIG_NUM_TO_A3[+f.id]);
        return rec ? COLOR_SCALE(rec.value) : NO_DATA_COLOR;
      })
      .attr('stroke', '#fff').attr('stroke-width', 0.8)
      .on('mousemove', (e, f) => {
        const rec = dataByCode.get(_MIG_NUM_TO_A3[+f.id]);
        if (rec) showTip(e, rec);
      })
      .on('mouseleave', hideTip);

    drawLegend(svg, W, H);
  }

  /* ── Redraw ─────────────────────────────────────────────── */
  const VIZ_PAD_TOP = 40;

  function redraw() {
    vizDiv.selectAll('*').remove();
    const W = containerEl.clientWidth  || 560;
    const H = (containerEl.clientHeight || 460) - 58 - VIZ_PAD_TOP;
    if (viewMode === 'treemap') drawTreemap(W, H);
    else                        drawMap(W, H);
  }

  /* ── Player controls ────────────────────────────────────── */
  slider.on('input', function() {
    curYear = years[+this.value];
    yearLabel.text(curYear);
    redraw();
  });

  playBtn.on('click', () => {
    playing = !playing;
    playBtn.text(playing ? '⏸' : '▶');
    if (playing) {
      function step() {
        const idx = years.indexOf(curYear);
        const next = (idx + 1) % years.length;
        curYear = years[next];
        slider.attr('value', next).node().value = next;
        yearLabel.text(curYear);
        redraw();
        if (next === 0) { playing = false; playBtn.text('▶'); return; }
        playTimer = setTimeout(step, 900);
      }
      playTimer = setTimeout(step, 900);
    } else {
      if (playTimer) { clearTimeout(playTimer); playTimer = null; }
    }
  });

  redraw();

  /* ── API ────────────────────────────────────────────────── */
  containerEl._remittancesReset     = () => { viewMode = 'treemap'; updateBtns(); redraw(); };
  containerEl._remittancesHighlight = () => { viewMode = 'treemap'; updateBtns(); redraw(); };
  containerEl._remittancesShowTrend = () => { viewMode = 'map';     updateBtns(); redraw(); };
}
