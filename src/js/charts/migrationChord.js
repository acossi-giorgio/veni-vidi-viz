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
const _MIG_AFRICA_TOPIC_COUNTRIES = [
  { code: 'DZA', name: 'Algeria' }, { code: 'AGO', name: 'Angola' }, { code: 'BEN', name: 'Benin' },
  { code: 'BWA', name: 'Botswana' }, { code: 'BFA', name: 'Burkina Faso' }, { code: 'BDI', name: 'Burundi' },
  { code: 'CPV', name: 'Cape Verde' }, { code: 'CMR', name: 'Cameroon' }, { code: 'CAF', name: 'Central African Republic' },
  { code: 'TCD', name: 'Chad' }, { code: 'COM', name: 'Comoros' }, { code: 'COG', name: 'Congo' },
  { code: 'COD', name: 'DR Congo' }, { code: 'DJI', name: 'Djibouti' }, { code: 'EGY', name: 'Egypt' },
  { code: 'GNQ', name: 'Equatorial Guinea' }, { code: 'ERI', name: 'Eritrea' }, { code: 'SWZ', name: 'Eswatini' },
  { code: 'ETH', name: 'Ethiopia' }, { code: 'GAB', name: 'Gabon' }, { code: 'GMB', name: 'Gambia' },
  { code: 'GHA', name: 'Ghana' }, { code: 'GIN', name: 'Guinea' }, { code: 'GNB', name: 'Guinea-Bissau' },
  { code: 'CIV', name: 'Cote d\'Ivoire' }, { code: 'KEN', name: 'Kenya' }, { code: 'LSO', name: 'Lesotho' },
  { code: 'LBR', name: 'Liberia' }, { code: 'LBY', name: 'Libya' }, { code: 'MDG', name: 'Madagascar' },
  { code: 'MWI', name: 'Malawi' }, { code: 'MLI', name: 'Mali' }, { code: 'MRT', name: 'Mauritania' },
  { code: 'MUS', name: 'Mauritius' }, { code: 'MAR', name: 'Morocco' }, { code: 'MOZ', name: 'Mozambique' },
  { code: 'NAM', name: 'Namibia' }, { code: 'NER', name: 'Niger' }, { code: 'NGA', name: 'Nigeria' },
  { code: 'RWA', name: 'Rwanda' }, { code: 'STP', name: 'Sao Tome and Principe' }, { code: 'SEN', name: 'Senegal' },
  { code: 'SYC', name: 'Seychelles' }, { code: 'SLE', name: 'Sierra Leone' }, { code: 'SOM', name: 'Somalia' },
  { code: 'ZAF', name: 'South Africa' }, { code: 'SSD', name: 'South Sudan' }, { code: 'SDN', name: 'Sudan' },
  { code: 'TZA', name: 'Tanzania' }, { code: 'TGO', name: 'Togo' }, { code: 'TUN', name: 'Tunisia' },
  { code: 'UGA', name: 'Uganda' }, { code: 'ZMB', name: 'Zambia' }, { code: 'ZWE', name: 'Zimbabwe' },
];

async function renderMigrationChord(selector = '#chart-5-1', isFullscreen = false) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html('');
  container.style('width', '100%').style('height', '100%').style('position', 'relative').style('font-family', 'inherit');

  const migRaw = await d3.csv('datasets/processed/migration.csv', d3.autoType);

  const DATA_YEARS = [...new Set(migRaw.map(d => d.year))].sort((a, b) => a - b);
  const MIN_YEAR = DATA_YEARS[0];
  const MAX_YEAR = DATA_YEARS[DATA_YEARS.length - 1];
  const MIG_TOPIC_ALL = migRaw.filter(d =>
    d.origin_continent === 'Africa' &&
    d.dest_continent !== 'Africa' &&
    d.stock > 0
  );
  const TOPIC_SRC_CODES_ALL_YEARS = new Set(MIG_TOPIC_ALL.map(d => d.origin_code));
  const TOPIC_DST_CODES_ALL_YEARS = new Set(MIG_TOPIC_ALL.map(d => d.dest_code));
  const TOPIC_NAME_BY_CODE = new Map();
  MIG_TOPIC_ALL.forEach(d => {
    if (d.origin_code && d.origin_country) TOPIC_NAME_BY_CODE.set(d.origin_code, d.origin_country);
    if (d.dest_code && d.dest_country) TOPIC_NAME_BY_CODE.set(d.dest_code, d.dest_country);
  });
  _MIG_AFRICA_TOPIC_COUNTRIES.forEach(d => {
    if (!TOPIC_NAME_BY_CODE.has(d.code)) TOPIC_NAME_BY_CODE.set(d.code, d.name);
  });

  function getYearData(year) {
    return migRaw.filter(d => d.year === year);
  }

  function clampYearToAvailable(year) {
    let closest = DATA_YEARS[0];
    let minDiff = Math.abs(year - closest);
    for (const candidate of DATA_YEARS) {
      const diff = Math.abs(year - candidate);
      if (diff < minDiff) {
        closest = candidate;
        minDiff = diff;
      }
    }
    return closest;
  }

  function yearToIndex(year) {
    return Math.max(0, DATA_YEARS.indexOf(clampYearToAvailable(year)));
  }

  const CONT_COLOR = {
    'Africa': getContinentColor('Africa', '#c96a3d'),
    'Asia': getContinentColor('Asia', '#4f97c8'),
    'Europe': getContinentColor('Europe', '#5169b2'),
    'North America': getContinentColor('North America', '#9a68c7'),
    'South America': getContinentColor('South America', '#5f9c63'),
    'Oceania': getContinentColor('Oceania', '#d39b3d'),
  };
  const UI_ACTIVE = getUiColor('controlActive', '#5169b2');
  const UI_ACTIVE_STRONG = getUiColor('controlActiveStrong', '#314685');
  const UI_MUTED = getUiColor('controlMuted', '#f4efe7');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const UI_MUTED_INK = getUiColor('controlMutedInk', '#75695d');
  const CHART_WATER = getUiColor('chartWater', '#ece8e0');
  const CHART_BASE_FILL = getUiColor('chartBaseFill', '#d6d0c5');
  const CHART_GRID = getUiColor('chartGrid', '#e8e1d7');
  const TOOLTIP_BG = getUiColor('chartTooltipBg', 'rgba(28, 25, 23, 0.94)');
  const TOOLTIP_INK = getUiColor('chartTooltipInk', '#fffdf8');

  d3.select('body').selectAll('.tooltip-chord').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip-chord')
    .style('position', 'absolute').style('background', TOOLTIP_BG)
    .style('color', TOOLTIP_INK).style('border-radius', '6px').style('padding', '10px 14px')
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
  let currentYear = MAX_YEAR;
  let mode = 'sankey';
  let animTimer = null;
  let sankeyDrillContinents = new Set(); // expanded dest continents

  const wrap = container.append('div')
    .style('width', '100%').style('height', '100%').style('position', 'relative');

  // ── Top header: pill buttons (overlay) ───────────────────────
  const header = wrap.append('div')
    .style('display', 'flex').style('align-items', 'center')
    .style('padding', '8px 10px 4px')
    .style('position', 'absolute').style('top', '0').style('left', '0').style('z-index', '20');

  const pillBar = header.append('div')
    .style('display', 'flex').style('background', 'rgba(255,255,255,0.92)')
    .style('border-radius', '9px').style('border', `1px solid ${UI_MUTED_BORDER}`)
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
      .style('background', active ? UI_ACTIVE : 'transparent')
      .style('color',      active ? '#fff'    : UI_MUTED_INK)
      .style('box-shadow', active ? `0 1px 4px ${colorToRgba(UI_ACTIVE, 0.3)}` : 'none');
    set(btnSankey, mode === 'sankey');
    set(btnMap,    mode === 'map');
  }
  updateModeBtns();

  const PLAYER_H = 72;

  const svgArea = wrap.append('div')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('right', '0').style('bottom', '0');

  // ── Bottom player bar (overlay) ───────────────────────────
  const footer = wrap.append('div')
    .style('position', 'absolute').style('bottom', '0').style('left', '0').style('right', '0')
    .style('height', PLAYER_H + 'px')
    .style('background', 'rgba(255,255,255,0.88)')
    .style('backdrop-filter', 'blur(4px)')
    .style('border-radius', '0 0 10px 10px')
    .style('border-top', '1px solid rgba(232,238,247,0.8)')
    .style('display', 'flex').style('align-items', 'center')
    .style('padding', '0 16px').style('gap', '14px').style('z-index', '20')
    .style('box-shadow', '0 -2px 8px rgba(0,0,0,0.04)');

  const ctrlWrap = footer.append('div')
    .style('display', 'flex').style('align-items', 'center').style('gap', '6px').style('flex-shrink', '0');

  function mkCtrlBtn(inner, title) {
    return ctrlWrap.append('button')
      .attr('title', title)
      .style('width', '30px').style('height', '30px').style('border-radius', '50%')
      .style('border', `1px solid ${UI_MUTED_BORDER}`).style('background', UI_MUTED)
      .style('cursor', 'pointer').style('display', 'flex').style('align-items', 'center')
      .style('justify-content', 'center').style('font-size', '13px').style('color', UI_ACTIVE)
      .style('flex-shrink', '0').style('transition', 'all 0.15s')
      .style('padding', '0').style('line-height', '1')
      .html(inner);
  }

  function syncYearUi() {
    slider.property('value', yearToIndex(currentYear));
    yearLabel.text(currentYear);
  }

  const btnReset = mkCtrlBtn('&#8635;', 'Reset').on('click', () => {
    stopAnim();
    currentYear = MIN_YEAR;
    syncYearUi();
    draw();
  });
  const btnPrev = mkCtrlBtn('&#8249;', 'Anno precedente').style('font-size', '18px').on('click', () => {
    stopAnim();
    const idx = yearToIndex(currentYear);
    currentYear = DATA_YEARS[Math.max(0, idx - 1)];
    syncYearUi();
    draw();
  });

  const playBtn = ctrlWrap.append('button')
    .style('width', '36px').style('height', '36px').style('border-radius', '50%')
    .style('border', 'none').style('background', UI_ACTIVE).style('cursor', 'pointer')
    .style('display', 'flex').style('align-items', 'center').style('justify-content', 'center')
    .style('font-size', '15px').style('color', '#fff').style('flex-shrink', '0')
    .style('padding', '0').style('line-height', '1')
    .style('box-shadow', '0 2px 8px rgba(74,111,165,0.4)').style('transition', 'all 0.15s')
    .html('<svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="1,0 11,7 1,14"/></svg>')
    .on('click', () => {
      if (animTimer) { stopAnim(); return; }
      let idx = currentYear >= MAX_YEAR ? 0 : yearToIndex(currentYear);
      playBtn.html('<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><rect x="0" y="0" width="3.5" height="14" rx="1"/><rect x="6.5" y="0" width="3.5" height="14" rx="1"/></svg>').style('background', CONT_COLOR.Africa);
      function step() {
        currentYear = DATA_YEARS[idx];
        syncYearUi();
        draw();
        idx++;
        if (idx < DATA_YEARS.length) animTimer = setTimeout(step, 1200);
        else stopAnim();
      }
      step();
    });

  const btnNext = mkCtrlBtn('&#8250;', 'Anno successivo').style('font-size', '18px').on('click', () => {
    stopAnim();
    const idx = yearToIndex(currentYear);
    currentYear = DATA_YEARS[Math.min(DATA_YEARS.length - 1, idx + 1)];
    syncYearUi();
    draw();
  });

  // Timeline
  const timelineWrap = footer.append('div')
    .style('flex', '1').style('position', 'relative').style('padding', '0 4px');

  const labelRow = timelineWrap.append('div')
    .style('display', 'flex').style('justify-content', 'space-between')
    .style('font-size', '8.5px').style('color', UI_MUTED_INK).style('margin-bottom', '2px')
    .style('pointer-events', 'none');
  DATA_YEARS.forEach(y => labelRow.append('span').text(y));

  const slider = timelineWrap.append('input')
    .attr('type', 'range')
    .attr('min', 0).attr('max', DATA_YEARS.length - 1).attr('step', 1).attr('value', DATA_YEARS.length - 1)
    .style('width', '100%').style('height', '4px').style('cursor', 'pointer')
    .style('accent-color', UI_ACTIVE).style('outline', 'none').style('display', 'block')
    .on('input', function() {
      stopAnim();
      currentYear = DATA_YEARS[+this.value];
      syncYearUi();
      draw();
    });

  // Year display — bottom-right of player bar
  const yearLabel = footer.append('div')
    .style('font-size', '24px').style('font-weight', '700').style('color', UI_ACTIVE_STRONG)
    .style('min-width', '54px').style('text-align', 'right').style('flex-shrink', '0')
    .style('letter-spacing', '-0.5px').text(currentYear);

  function stopAnim() {
    if (animTimer) { clearTimeout(animTimer); animTimer = null; }
    playBtn.html('<svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="1,0 11,7 1,14"/></svg>').style('background', UI_ACTIVE);
  }

  const HEADER_H = 44; // approximate height of the top pill-bar header

  function draw() {
    svgArea.html('');
    const svgRect = svgArea.node().getBoundingClientRect();
    const W = svgRect.width  || 560;
    const H = svgRect.height || 380;
    if (W < 10 || H < 10) return;
    if (mode === 'map') {
      drawMap(W, H);
    } else {
      const sankeyH = Math.max(50, H - HEADER_H - PLAYER_H);
      drawSankey(W, sankeyH);
      svgArea.select('svg').style('margin-top', HEADER_H + 'px');
    }
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
      .style('display','block').style('font-family','inherit').style('background', getCssToken('surface-raised', '#ffffff'));
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
      .style('border',`1px solid ${UI_MUTED_BORDER}`).style('border-radius','5px').style('background',getCssToken('surface-raised', '#ffffff'))
      .style('cursor','pointer').style('color',UI_MUTED_INK).on('click', fn));

    const linkLayer  = g.append('g');
    const nodeLayer  = g.append('g');
    const labelLayer = g.append('g');

    const linkEls = linkLayer.selectAll('line').data(links).join('line')
      .attr('stroke',CHART_BASE_FILL).attr('stroke-linecap','round')
      .attr('stroke-width', d => wScale(d.value)).attr('opacity', 0.55)
      .on('mousemove', (e, d) => showTip(e,
        `<strong style="color:${CONT_COLOR.Africa}">${d.source.name}</strong> → <strong style="color:${CONT_COLOR[d.target.continent]||getCssToken('ink', '#1f1d1a')}">${d.target.name}</strong><br>` +
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
          .attr('stroke', l => (l.source===d||l.target===d) ? (d.type==='src' ? CONT_COLOR.Africa : CONT_COLOR[d.continent]||CONT_COLOR.Asia) : CHART_GRID)
          .attr('opacity', l => (l.source===d||l.target===d) ? 0.9 : 0.08);
        const col  = d.type==='src' ? CONT_COLOR.Africa : (CONT_COLOR[d.continent]||CONT_COLOR.Asia);
        const hint = d.expandable ? ' <span style="opacity:.5;font-size:9px">· espandi</span>'
                   : d.collapsible ? ' <span style="opacity:.5;font-size:9px">· comprimi</span>' : '';
        showTip(e,
          `<strong style="color:${col}">${d.name}</strong>${hint}<br>` +
          (d.type==='src' ? 'Emigrati: ' : "Ricevuti dall'Africa: ") +
          `<strong>${d3.format(',.0f')(d.total)}</strong>`
        );
      })
      .on('mouseleave', () => { linkEls.attr('stroke',CHART_BASE_FILL).attr('opacity',0.55); hideTip(); });

    nodeEls.append('circle')
      .attr('r', d => d.type==='src' ? rSrc(d.total) : rDst(d.total))
      .attr('fill', d => d.type==='src' ? CONT_COLOR.Africa : (CONT_COLOR[d.continent]||CONT_COLOR.Asia))
      .attr('stroke','#fff').attr('stroke-width', 2);

    nodeEls.filter(d => d.expandable || d.collapsible).append('circle')
      .attr('r', d => (d.type==='src' ? rSrc(d.total) : rDst(d.total)) + 4)
      .attr('fill','none')
      .attr('stroke', d => d.type==='src' ? CONT_COLOR.Africa : (CONT_COLOR[d.continent]||CONT_COLOR.Asia))
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
      .attr('fill', d => d.type==='src' ? CONT_COLOR.Africa : getCssToken('ink', '#1f1d1a'))
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

    const isCompact = W < 760;
    const isVeryCompact = W < 560;
    const margin = {
      top: isCompact ? 12 : 20,
      right: isVeryCompact ? 84 : (isCompact ? 112 : 180),
      bottom: isCompact ? 12 : 20,
      left: isVeryCompact ? 54 : (isCompact ? 72 : 120),
    };
    const iw = Math.max(140, W - margin.left - margin.right);
    const ih = Math.max(120, H - margin.top - margin.bottom);
    const nodeWidth = isVeryCompact ? 10 : (isCompact ? 12 : 16);
    const nodePadding = isVeryCompact ? 7 : (isCompact ? 8 : 10);

    const svg = svgArea.append('svg').attr('width', W).attr('height', H)
      .style('display', 'block').style('background', getCssToken('surface-raised', '#ffffff')).style('font-family', 'inherit');
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // ── Build nodes & links ─────────────────────────────────────
    const destContStock = d3.rollup(yearData, v => d3.sum(v, d => d.stock), d => d.dest_continent);
    const destConts = [...destContStock.keys()].sort((a, b) => destContStock.get(b) - destContStock.get(a));

    let nodes = [], links = [];

    // Always show all continents at layer 1
    const srcNode = { id: 'AFRICA', name: 'Africa', layer: 0, col: CONT_COLOR.Africa };
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
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
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
      .attr('stroke-opacity', 0)
      .style('cursor', 'pointer')
      .on('mouseover', function() { d3.select(this).attr('stroke-opacity', 0.55); })
      .on('mouseleave', function() { d3.select(this).attr('stroke-opacity', 0.25); })
      .call(s => s.transition().duration(600).ease(d3.easeCubicOut).attr('stroke-opacity', 0.25))
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
      .attr('rx', 3).attr('opacity', 0)
      .call(s => s.transition().duration(500).ease(d3.easeCubicOut)
        .delay((_, i) => i * 30).attr('opacity', 0.85))
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
      .attr('font-size', d => {
        if (nodes[d.index]?.layer === 0) return isCompact ? 10 : 11;
        return isVeryCompact ? 8 : 9;
      })
      .attr('font-weight', d => nodes[d.index]?.layer === 0 ? '400' : '500')
      .attr('fill', d => nodes[d.index]?.col || '#555')
      .attr('opacity', 0)
      .style('pointer-events', 'none')
      .call(s => s.transition().duration(400).ease(d3.easeCubicOut).delay(300).attr('opacity', 1))
      .text(d => {
        const nd = nodes[d.index];
        if (!nd || !nd.name) return '';
        const maxChars = isVeryCompact ? 9 : (isCompact ? 12 : 16);
        const label = nd.name.length > maxChars ? nd.name.slice(0, maxChars - 1) + '…' : nd.name;
        return isVeryCompact ? label : `${label}  ${d3.format('.2~s')(d.value)}`;
      });


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
    const topicAfricaCodes = new Set(_MIG_AFRICA_TOPIC_COUNTRIES.map(d => d.code));
    const topicSrcCodes = new Set([...topicAfricaCodes, ...TOPIC_SRC_CODES_ALL_YEARS]);
    const topicDstCodes = TOPIC_DST_CODES_ALL_YEARS;
    const destNameMap  = new Map();
    yearData.forEach(d => destNameMap.set(d.dest_code, d.dest_country));
    const origNameMap  = new Map();
    yearData.forEach(d => origNameMap.set(d.origin_code, d.origin_country));
    const origStockMap = d3.rollup(yearData, v => d3.sum(v, d => d.stock), d => d.origin_code);

    const geoCountries = topojson.feature(_migWorldData, _migWorldData.objects.countries).features;
    const projection   = d3.geoNaturalEarth1()
      .fitSize([W, H], { type: 'FeatureCollection', features: geoCountries });
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
    // Countries with any valid flow in the selected year (for map coloring/tooltip).
    const countrySrcCodes = new Set(yearData.map(d => d.origin_code));
    const countryDstCodes = new Set(yearData.map(d => d.dest_code));
    // Keep low-volume origins/destinations clickable: force top links per source and per destination.
    const topPairsBySource = new Set();
    d3.group(pairs, p => p.srcCode).forEach(srcPairs => {
      srcPairs
        .filter(p => centroidByA3.has(p.srcCode) && centroidByA3.has(p.dstCode))
        .sort((a, b) => b.stock - a.stock)
        .slice(0, 2)
        .forEach(p => topPairsBySource.add(`${p.srcCode}||${p.dstCode}`));
    });
    const topPairsByDestination = new Set();
    d3.group(pairs, p => p.dstCode).forEach(dstPairs => {
      dstPairs
        .filter(p => centroidByA3.has(p.srcCode) && centroidByA3.has(p.dstCode))
        .sort((a, b) => b.stock - a.stock)
        .slice(0, 2)
        .forEach(p => topPairsByDestination.add(`${p.srcCode}||${p.dstCode}`));
    });
    const renderPairs = pairs.filter(p =>
      (
        p.stock >= threshold ||
        topPairsBySource.has(`${p.srcCode}||${p.dstCode}`) ||
        topPairsByDestination.has(`${p.srcCode}||${p.dstCode}`)
      ) &&
      centroidByA3.has(p.srcCode) && centroidByA3.has(p.dstCode)
    );
    const arcSrcCodes = new Set(renderPairs.map(p => p.srcCode));
    const arcDstCodes = new Set(renderPairs.map(p => p.dstCode));

    // breakdown: destCode → [{srcName, stock}] sorted desc
    const byDest = new Map();
    renderPairs.forEach(p => {
      if (!byDest.has(p.dstCode)) byDest.set(p.dstCode, []);
      byDest.get(p.dstCode).push({ srcName: p.srcName, stock: p.stock });
    });
    byDest.forEach(arr => arr.sort((a, b) => b.stock - a.stock));

    // breakdown: srcCode → [{dstName, stock}] sorted desc
    const bySrc = new Map();
    renderPairs.forEach(p => {
      if (!bySrc.has(p.srcCode)) bySrc.set(p.srcCode, []);
      bySrc.get(p.srcCode).push({ dstName: p.dstName, stock: p.stock });
    });
    bySrc.forEach(arr => arr.sort((a, b) => b.stock - a.stock));

    // ── Color helpers: continent color + sqrt-opacity by stock ──────
    const destContMap = new Map();
    yearData.forEach(d => destContMap.set(d.dest_code, d.dest_continent));

    const maxDest = d3.max(stockByDest.values()) || 1;
    const maxOrig = d3.max(origStockMap.values()) || 1;
    const destOpScale = d3.scaleSqrt().domain([0, maxDest]).range([0.18, 0.88]);
    // Keep low-stock origins visibly distinguishable from true no-data countries.
    const origOpScale = d3.scaleSqrt().domain([0, maxOrig]).range([0.38, 1.00]);

    function hexToRgba(hex, op) {
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
      return `rgba(${r},${g},${b},${op.toFixed(2)})`;
    }
    function destFill(a3) {
      const stock = stockByDest.get(a3);
      if (!stock) return null; // no immigration → grey
      const cont = destContMap.get(a3);
      return hexToRgba(CONT_COLOR[cont] || '#607d8b', destOpScale(stock));
    }
    function origFill(a3) {
      const stock = origStockMap.get(a3);
      if (!stock) return null;
      return hexToRgba(CONT_COLOR.Africa, origOpScale(stock));
    }

    // ── SVG + zoom ───────────────────────────────────────────────
    const svg = svgArea.append('svg').attr('width', W).attr('height', H)
      .style('display', 'block').style('font-family', 'inherit').style('background', '#eef2f7')
      .style('border-radius', '0').style('cursor', 'grab');
    const g    = svg.append('g');
    const zoom = d3.zoom().scaleExtent([0.5, 12])
      .on('zoom', e => { g.attr('transform', e.transform); svg.style('cursor', 'grabbing'); })
      .on('end',  () => svg.style('cursor', 'grab'));
    svg.call(zoom).on('dblclick.zoom', null);

    // Countries — destinations by destination color, African origins in orange.
    // Distinguish true no-flow African origins via no-data pattern.
    g.selectAll('.cty').data(geoCountries).join('path')
      .attr('class', 'cty')
      .attr('d', pathGen)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.35)
      .attr('fill', f => {
        const a3 = _MIG_NUM_TO_A3[+f.id];
        if (!a3) return '#ccd8df';
        if (topicSrcCodes.has(a3)) return countrySrcCodes.has(a3) ? (origFill(a3) || '#ccd8df') : '#ccd8df';
        if (topicDstCodes.has(a3)) return countryDstCodes.has(a3) ? (destFill(a3) || '#ccd8df') : '#ccd8df';
        return '#ccd8df';
      })
      .style('cursor', f => {
        const a3 = _MIG_NUM_TO_A3[+f.id];
        return (a3 && (topicSrcCodes.has(a3) || topicDstCodes.has(a3))) ? 'pointer' : 'default';
      })
      .on('mousemove', (e, f) => {
        const a3 = _MIG_NUM_TO_A3[+f.id];
        if (!a3) return;
        if (topicSrcCodes.has(a3) || topicDstCodes.has(a3))
          showTip(e, arcTipHtml(a3));
      })
      .on('mouseleave', hideTip)
      .on('click', (e, f) => {
        const a3 = _MIG_NUM_TO_A3[+f.id];
        if (!a3) return;
        if (a3 === arcHoverA3) { clearArcHover(); return; } // click again → hide
        clearArcHover();
        if (arcSrcCodes.has(a3) || arcDstCodes.has(a3)) {
          arcHoverA3 = a3;
          revealArcs(a3);
        }
      });

    // Arc click state
    let arcHoverA3 = null;

    function arcTipHtml(a3) {
      const fmt = d3.format(',.0f');
      const countryName = TOPIC_NAME_BY_CODE.get(a3) || origNameMap.get(a3) || destNameMap.get(a3) || a3;
      if (topicSrcCodes.has(a3) && !countrySrcCodes.has(a3)) {
        return `<strong style="color:${CONT_COLOR.Africa}">${countryName}</strong> <span style="opacity:.5;font-size:9px">ORIGINE</span><br>Stock migratorio: <em>No data</em> (${currentYear})`;
      }
      if (topicDstCodes.has(a3) && !countryDstCodes.has(a3)) {
        return `<strong>${countryName}</strong> <span style="opacity:.5;font-size:9px">DESTINAZIONE</span><br>Stock migratorio: <em>No data</em> (${currentYear})`;
      }
      if (countrySrcCodes.has(a3)) {
        const total = origStockMap.get(a3) || 0;
        const rows  = bySrc.get(a3) || [];
        let html = `<strong style="color:${CONT_COLOR.Africa}">${origNameMap.get(a3) || countryName}</strong> <span style="opacity:.5;font-size:9px">ORIGINE</span><br>`;
        html += `Totale emigrati: <strong>${fmt(total)}</strong>`;
        if (rows.length) {
          html += `<br><span style="opacity:.45;font-size:9px;letter-spacing:.05em">PRINCIPALI DESTINAZIONI</span>`;
          rows.slice(0, 8).forEach(r => {
            html += `<br><span style="opacity:.8">${r.dstName}</span>: <strong>${fmt(r.stock)}</strong>`;
          });
          if (rows.length > 8) html += `<br><span style="opacity:.4;font-size:9px">+ altri ${rows.length - 8} paesi</span>`;
        }
        html += `<br><em style="opacity:.4;font-size:9px">Clicca per vedere i flussi</em>`;
        return html;
      }
      const total = stockByDest.get(a3) || 0;
      const rows  = byDest.get(a3) || [];
      const cont  = destContMap.get(a3);
      const col   = CONT_COLOR[cont] || '#607d8b';
      let html = `<strong style="color:${col}">${destNameMap.get(a3) || countryName}</strong> <span style="opacity:.5;font-size:9px">DESTINAZIONE</span><br>`;
      html += `Totale migranti africani: <strong>${fmt(total)}</strong>`;
      if (rows.length) {
        html += `<br><span style="opacity:.45;font-size:9px;letter-spacing:.05em">PER PAESE DI ORIGINE</span>`;
        rows.slice(0, 8).forEach(r => {
          html += `<br><span style="opacity:.8">${r.srcName}</span>: <strong>${fmt(r.stock)}</strong>`;
        });
        if (rows.length > 8) html += `<br><span style="opacity:.4;font-size:9px">+ altri ${rows.length - 8} paesi</span>`;
      }
      html += `<br><em style="opacity:.4;font-size:9px">Clicca per vedere i flussi</em>`;
      return html;
    }
    function revealArcs(a3) {
      const sel = arcSrcCodes.has(a3)
        ? g.selectAll(`.mig-arc[data-src="${a3}"]`)
        : g.selectAll(`.mig-arc[data-dest="${a3}"]`);
      sel.raise().each(function() {
        const len = this.getTotalLength();
        d3.select(this)
          .attr('stroke-dasharray', len)
          .attr('stroke-dashoffset', len)
          .attr('opacity', 0.75)
          .transition().duration(700).ease(d3.easeLinear)
          .attr('stroke-dashoffset', 0);
      });
    }
    function clearArcHover() {
      arcHoverA3 = null;
      g.selectAll('.mig-arc').interrupt()
        .attr('stroke-dasharray', null).attr('stroke-dashoffset', null).attr('opacity', 0);
    }

    // Great circle arcs via projection invert → GeoJSON LineString → pathGen
    function arcPath(src, dst) {
      const srcGeo = projection.invert(src);
      const dstGeo = projection.invert(dst);
      if (!srcGeo || !dstGeo) return `M${src[0]},${src[1]}`;
      return pathGen({ type: 'LineString', coordinates: [srcGeo, dstGeo] }) || `M${src[0]},${src[1]}`;
    }

    const arcWScale = d3.scaleSqrt().domain([0, maxPair]).range([0.6, 5]).clamp(true);

    // draw small arcs first so large ones render on top
    renderPairs
      .sort((a, b) => a.stock - b.stock)
      .forEach(p => {
        const src  = centroidByA3.get(p.srcCode);
        const dst  = centroidByA3.get(p.dstCode);
        const cont = destContMap.get(p.dstCode);
        const col  = CONT_COLOR[cont] || '#607d8b';
        g.append('path')
          .attr('class', 'mig-arc')
          .attr('data-src', p.srcCode).attr('data-dest', p.dstCode)
          .attr('d', arcPath(src, dst))
          .attr('fill', 'none')
          .attr('stroke', col)
          .attr('stroke-width', arcWScale(p.stock))
          .attr('stroke-linecap', 'round')
          .attr('opacity', 0)
          .style('pointer-events', 'none');
      });
  }

  draw();

  containerNode._migrationShowYear = function(year) {
    stopAnim(); mode = 'network'; currentYear = clampYearToAvailable(year);
    syncYearUi();
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
  containerNode._getHelpContext = () => ({
    mode,
    currentYear,
  });
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

  const CONT_COLOR = {
    Africa: getContinentColor('Africa', '#c96a3d'),
  };
  const UI_ACTIVE = getUiColor('controlActive', '#5169b2');
  const UI_ACTIVE_STRONG = getUiColor('controlActiveStrong', '#314685');
  const UI_MUTED = getUiColor('controlMuted', '#f4efe7');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const UI_MUTED_INK = getUiColor('controlMutedInk', '#75695d');
  const CHART_GRID = getUiColor('chartGrid', '#e8e1d7');
  const CHART_BASE_FILL = getUiColor('chartBaseFill', '#d6d0c5');
  const CHART_NODATA_FILL = getUiColor('chartNoDataFill', '#c3baad');

  const [remRaw, incomeRaw, popRaw, worldData] = await Promise.all([
    d3.csv('datasets/processed/remittances.csv', d3.autoType),
    d3.csv('datasets/processed/income.csv',      d3.autoType),
    d3.csv('datasets/processed/population.csv',  d3.autoType),
    _migWorldData
      ? Promise.resolve(_migWorldData)
      : d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json').then(d => { _migWorldData = d; return d; }),
  ]);

  /* ── Data prep ──────────────────────────────────────────── */
  // income lookup: Map<"code|year", gdp_per_capita>
  const incomeMap = new Map();
  incomeRaw.forEach(d => incomeMap.set(`${d.code}|${d.year}`, d.value));
  // population lookup: Map<"code|year", pop>
  const popMap = new Map();
  popRaw.forEach(d => popMap.set(`${d.code}|${d.year}`, d.value));

  const africaRaw = remRaw.filter(d => d.continent === 'Africa' && d.code && d.value != null && d.value > 0 && d.year <= 2023)
    .map(d => {
      const gdp = incomeMap.get(`${d.code}|${d.year}`);
      const pop = popMap.get(`${d.code}|${d.year}`);
      const absUSD = (gdp && pop) ? (d.value / 100) * gdp * pop : null;
      return { ...d, absUSD };
    });

  const years     = [...new Set(africaRaw.map(d => d.year))].sort((a, b) => a - b);
  const byYear    = d3.group(africaRaw, d => d.year);

  /* per each code keep latest year as fallback */
  const latestByCode = new Map();
  africaRaw.forEach(d => {
    const prev = latestByCode.get(d.code);
    if (!prev || d.year > prev.year) latestByCode.set(d.code, d);
  });
  const remCountryNameByCode = new Map();
  africaRaw.forEach(d => {
    if (d.code && d.country) remCountryNameByCode.set(d.code, d.country);
  });
  _MIG_AFRICA_TOPIC_COUNTRIES.forEach(d => {
    if (!remCountryNameByCode.has(d.code)) remCountryNameByCode.set(d.code, d.name);
  });
  if (!remCountryNameByCode.has('ESH')) remCountryNameByCode.set('ESH', 'Western Sahara');

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

  /* ── Color scales ───────────────────────────────────────── */
  const COLORS        = ['#edf5e1', '#c5e1a5', '#81c784', '#4caf50', '#2e7d32', '#1b5e20'];
  // pct scale: thresholds in %
  const PCT_THRESHOLDS = [1, 3, 7, 12, 20];
  const PCT_SCALE      = d3.scaleThreshold().domain(PCT_THRESHOLDS).range(COLORS);
  // abs scale: thresholds in USD (billions)
  const ABS_THRESHOLDS = [1e8, 5e8, 1e9, 5e9, 1e10]; // 100M, 500M, 1B, 5B, 10B
  const ABS_SCALE      = d3.scaleThreshold().domain(ABS_THRESHOLDS).range(COLORS);

  function colorScale(d) {
    if (metricMode === 'pct') return d.value != null ? PCT_SCALE(d.value) : null;
    return d.absUSD != null ? ABS_SCALE(d.absUSD) : null;
  }
  function displayVal(d) {
    if (metricMode === 'pct') return d.value != null ? d.value.toFixed(1) + '% PIL' : 'N/D';
    if (d.absUSD == null) return 'N/D';
    return d.absUSD >= 1e9
      ? (d.absUSD / 1e9).toFixed(1) + ' Mld USD'
      : (d.absUSD / 1e6).toFixed(0) + ' Mln USD';
  }

  /* ── State ──────────────────────────────────────────────── */
  let viewMode   = 'treemap';
  let metricMode = 'pct'; // 'pct' | 'abs'
  let curYear    = years[years.length - 1];
  let playing    = false;
  let playTimer  = null;

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
      `Rimesse: <strong>${displayVal(d)}</strong><br>` +
      (metricMode === 'abs' && d.value != null ? `<em style="opacity:.6;font-size:10px">${d.value.toFixed(1)}% del PIL</em><br>` : '') +
      `<em style="opacity:.5;font-size:9px">Anno: ${d.year}</em>`
    );
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 14, ty = e.pageY + 10;
    if (tx + r.width  > window.innerWidth  - 8) tx = e.pageX - r.width  - 14;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 10;
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }
  function showNoDataTip(e, code) {
    const country = remCountryNameByCode.get(code) || code;
    tooltip.style('display', 'block').html(
      `<strong style="color:#81c784">${country}</strong><br>` +
      `Rimesse: <em>No data</em><br>` +
      `<em style="opacity:.5;font-size:9px">Anno: ${curYear}</em>`
    );
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 14, ty = e.pageY + 10;
    if (tx + r.width  > window.innerWidth  - 8) tx = e.pageX - r.width  - 14;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 10;
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }
  function hideTip() { tooltip.style('display', 'none'); }

  /* ── Viz area ───────────────────────────────────────────── */
  const PLAYER_H = 72;

  const vizDiv = d3.select(containerEl).append('div')
    .style('flex', '1 1 0').style('position', 'relative').style('overflow', 'hidden')
    .style('padding-top', '48px')
    .style('padding-bottom', PLAYER_H + 'px');

  /* ── Player bar ─────────────────────────────────────────── */

  const playerBar = d3.select(containerEl).append('div')
    .style('position', 'absolute').style('bottom', '0').style('left', '0').style('right', '0')
    .style('height', PLAYER_H + 'px')
    .style('background', getCssToken('surface-raised', '#ffffff'))
    .style('border-radius', '0 0 10px 10px')
    .style('border-top', `1px solid ${CHART_GRID}`)
    .style('display', 'flex').style('align-items', 'center')
    .style('padding', '0 16px').style('gap', '14px').style('z-index', '20')
    .style('box-shadow', '0 -2px 8px rgba(0,0,0,0.04)');

  const ctrlWrap = playerBar.append('div')
    .style('display', 'flex').style('align-items', 'center').style('gap', '6px').style('flex-shrink', '0');

  function mkCtrlBtn(inner, title) {
    return ctrlWrap.append('button')
      .attr('title', title)
      .style('width', '30px').style('height', '30px').style('border-radius', '50%')
      .style('border', `1px solid ${UI_MUTED_BORDER}`).style('background', UI_MUTED)
      .style('cursor', 'pointer').style('display', 'flex').style('align-items', 'center')
      .style('justify-content', 'center').style('font-size', '13px').style('color', UI_ACTIVE)
      .style('flex-shrink', '0').style('transition', 'all 0.15s')
      .style('padding', '0').style('line-height', '1')
      .html(inner);
  }

  const btnReset = mkCtrlBtn('&#8635;', 'Reset').on('click', () => {
    stopPlay();
    curYear = years[0];
    slider.property('value', 0);
    yearLabel.text(curYear);
    redraw();
  });
  const btnPrev = mkCtrlBtn('&#8249;', 'Anno precedente').style('font-size', '18px').on('click', () => {
    stopPlay();
    const idx = years.indexOf(curYear);
    if (idx > 0) { curYear = years[idx - 1]; slider.property('value', idx - 1); yearLabel.text(curYear); redraw(); }
  });

  const playBtn = ctrlWrap.append('button')
    .style('width', '36px').style('height', '36px').style('border-radius', '50%')
    .style('border', 'none').style('background', UI_ACTIVE).style('cursor', 'pointer')
    .style('display', 'flex').style('align-items', 'center').style('justify-content', 'center')
    .style('font-size', '15px').style('color', '#fff').style('flex-shrink', '0')
    .style('padding', '0').style('line-height', '1')
    .style('box-shadow', '0 2px 8px rgba(74,111,165,0.4)').style('transition', 'all 0.15s')
    .html('<svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="1,0 11,7 1,14"/></svg>');

  const btnNext = mkCtrlBtn('&#8250;', 'Anno successivo').style('font-size', '18px').on('click', () => {
    stopPlay();
    const idx = years.indexOf(curYear);
    if (idx < years.length - 1) { curYear = years[idx + 1]; slider.property('value', idx + 1); yearLabel.text(curYear); redraw(); }
  });

  /* Timeline slider + tick labels */
  const timelineWrap = playerBar.append('div')
    .style('flex', '1').style('position', 'relative').style('padding', '0 4px');

  const labelRow = timelineWrap.append('div')
    .style('display', 'flex').style('justify-content', 'space-between')
    .style('font-size', '8.5px').style('color', UI_MUTED_INK).style('margin-bottom', '2px')
    .style('pointer-events', 'none');
  [years[0], years[Math.floor(years.length / 2)], years[years.length - 1]]
    .filter((y, i, a) => a.indexOf(y) === i)
    .forEach(y => labelRow.append('span').text(y));

  const slider = timelineWrap.append('input').attr('type', 'range')
    .attr('min', 0).attr('max', years.length - 1)
    .attr('value', years.length - 1).attr('step', 1)
    .style('width', '100%').style('height', '4px').style('cursor', 'pointer')
    .style('accent-color', UI_ACTIVE).style('outline', 'none').style('display', 'block');

  /* Year display */
  const yearLabel = playerBar.append('div')
    .style('font-size', '24px').style('font-weight', '700').style('color', UI_ACTIVE_STRONG)
    .style('min-width', '54px').style('text-align', 'right').style('flex-shrink', '0')
    .style('letter-spacing', '-0.5px').text(curYear);

  function stopPlay() {
    playing = false;
    if (playTimer) { clearTimeout(playTimer); playTimer = null; }
    playBtn.html('<svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="1,0 11,7 1,14"/></svg>').style('background', UI_ACTIVE);
  }

  /* ── Pill buttons — top bar (in-flow, above chart) ───────── */
  const pillBar = d3.select(containerEl).append('div')
    .style('position', 'absolute').style('top', '8px').style('left', '8px')
    .style('display', 'flex').style('background', 'rgba(255,255,255,0.92)')
    .style('border-radius', '9px').style('border', `1px solid ${UI_MUTED_BORDER}`)
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

  // Separator
  pillBar.append('div').style('width', '1px').style('background', UI_MUTED_BORDER).style('margin', '4px 2px');

  function mkMetricBtn(label, val) {
    return pillBar.append('button')
      .style('font-size', '11px').style('padding', '5px 14px').style('border-radius', '6px')
      .style('border', 'none').style('cursor', 'pointer').style('font-weight', '600')
      .style('transition', 'all 0.15s').text(label)
      .on('click', () => { metricMode = val; updateBtns(); redraw(); });
  }
  const btnPct = mkMetricBtn('% PIL',    'pct');
  const btnAbs = mkMetricBtn('Assoluto', 'abs');

  function updateBtns() {
    const set = (btn, active) => btn
      .style('background', active ? UI_ACTIVE : 'transparent')
      .style('color',      active ? '#fff'    : UI_MUTED_INK)
      .style('box-shadow', active ? `0 1px 4px ${colorToRgba(UI_ACTIVE, 0.3)}` : 'none');
    set(btnTree, viewMode === 'treemap');
    set(btnMap,  viewMode === 'map');
    set(btnPct,  metricMode === 'pct');
    set(btnAbs,  metricMode === 'abs');
  }
  updateBtns();

  /* ── Legend — discrete swatches, bottom-right ──────────── */
  function drawLegend(svg, W, H) {
    const noDataPattern = ensureNoDataPattern(svg, `rem-nodata-${isFullscreen ? 'fs' : 'ed'}-${metricMode}`, {
      background: CHART_NODATA_FILL,
      stripe: getUiColor('chartNoDataStripe', shadeColor(CHART_NODATA_FILL, 0.24)),
    });
    const SW = 14, SH = 14, GAP = 4, TW = 72;
    const rowH   = SH + GAP;
    const labels = metricMode === 'pct' ? [
      { color: COLORS[5], text: '> 20%'    },
      { color: COLORS[4], text: '12 – 20%' },
      { color: COLORS[3], text: '7 – 12%'  },
      { color: COLORS[2], text: '3 – 7%'   },
      { color: COLORS[1], text: '1 – 3%'   },
      { color: COLORS[0], text: '< 1%'     },
      ...(viewMode !== 'treemap' ? [{ fill: noDataPattern, stroke: UI_MUTED_BORDER, text: 'No data' }] : []),
    ] : [
      { color: COLORS[5], text: '> 10 Mld' },
      { color: COLORS[4], text: '5 – 10 Mld' },
      { color: COLORS[3], text: '1 – 5 Mld' },
      { color: COLORS[2], text: '500M – 1Mld' },
      { color: COLORS[1], text: '100 – 500M' },
      { color: COLORS[0], text: '< 100M'   },
      ...(viewMode !== 'treemap' ? [{ fill: noDataPattern, stroke: UI_MUTED_BORDER, text: 'No data' }] : []),
    ];
    const boxW = SW + 8 + TW + 10;
    const boxH = 14 + labels.length * rowH + 8;
    const LX   = W - boxW - 10;
    const LY   = H - boxH - 10;

    const legG = svg.append('g').attr('transform', `translate(${LX},${LY})`);
    legG.append('rect').attr('x', 0).attr('y', 0).attr('width', boxW).attr('height', boxH)
      .attr('rx', 6).attr('fill', 'rgba(255,255,255,0.92)').attr('stroke', '#e0e0e0').attr('stroke-width', 1);

    legG.append('text').attr('x', 8).attr('y', 11)
      .attr('font-size', 8).attr('font-weight', '700').attr('fill', '#aaa').attr('letter-spacing', '0.06em')
      .text(metricMode === 'pct' ? 'RIMESSE % PIL' : 'RIMESSE USD');

    labels.forEach((item, i) => {
      const y = 14 + i * rowH + GAP / 2;
      legG.append('rect').attr('x', 8).attr('y', y)
        .attr('width', SW).attr('height', SH).attr('rx', 2)
        .attr('fill', item.fill || item.color)
        .attr('stroke', item.stroke || '#ddd')
        .attr('stroke-width', 0.5);
      legG.append('text').attr('x', 8 + SW + 6).attr('y', y + SH - 3)
        .attr('font-size', 9).attr('fill', '#444').text(item.text);
    });
  }

  /* ── Data for current year ──────────────────────────────── */
  function dataForYear(yr) {
    return (byYear.get(yr) || []).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }

  /* ── Treemap ────────────────────────────────────────────── */
  function drawTreemap(W, H) {
    const data    = dataForYear(curYear);
    const LEG_W   = 104; /* reserved for legend on the right */
    const PAD     = { top: 8, right: 8 + LEG_W, bottom: 8, left: 8 };
    const iw      = W - PAD.left - PAD.right;
    const ih      = H - PAD.top  - PAD.bottom;

    const sortKey = d => metricMode === 'pct' ? (d.value ?? 0) : (d.absUSD ?? 0);
    const root = d3.hierarchy({ children: data })
      .sum(d => sortKey(d)).sort((a, b) => sortKey(b.data) - sortKey(a.data));
    d3.treemap().size([iw, ih]).paddingOuter(4).paddingInner(2).round(true)(root);

    const svg = vizDiv.append('svg').attr('width', W).attr('height', H)
      .style('display', 'block').style('font-family', 'inherit');
    const g = svg.append('g').attr('transform', `translate(${PAD.left},${PAD.top})`);

    const cell = g.selectAll('g').data(root.leaves()).join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // Clip each cell so text never overflows its bounds
    cell.append('clipPath')
      .attr('id', (d, i) => `rem-cp-${i}`)
      .append('rect')
      .attr('width',  d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('rx', 3);

    cell.attr('clip-path', (d, i) => `url(#rem-cp-${i})`);

    cell.append('rect')
      .attr('width',  d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('rx', 3).attr('fill', d => colorScale(d.data))
      .attr('stroke', '#fff').attr('stroke-width', 1.5).style('cursor', 'default')
      .on('mousemove', (e, d) => showTip(e, d.data)).on('mouseleave', hideTip);

    cell.each(function(d) {
      const cw = d.x1 - d.x0, ch = d.y1 - d.y0;
      if (cw < 20 || ch < 12) return;
      const sel  = d3.select(this);
      const v    = metricMode === 'pct' ? (d.data.value ?? 0) : (d.data.absUSD ?? 0);
      const light = metricMode === 'pct' ? v >= 7 : v >= 5e8;
      const fill = light ? '#fff' : '#2a2a2a';
      const maxChars = Math.max(2, Math.floor(cw / 6));
      const name = d.data.country.length > maxChars
        ? d.data.country.slice(0, maxChars - 1) + '…' : d.data.country;
      if (ch >= 22) sel.append('text').attr('x', 4).attr('y', 13)
        .attr('font-size', Math.min(11, Math.max(7, cw / 8))).attr('font-weight', '600')
        .attr('fill', fill).attr('pointer-events', 'none').text(name);
      if (ch >= 34) sel.append('text').attr('x', 4).attr('y', ch - 5)
        .attr('font-size', Math.min(10, Math.max(6, cw / 9))).attr('fill', fill)
        .attr('opacity', 0.85).attr('pointer-events', 'none')
        .text(displayVal(d.data));
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
    const noDataPattern = ensureNoDataPattern(svg, `rem-map-nodata-${isFullscreen ? 'fs' : 'ed'}-${metricMode}`, {
      background: CHART_NODATA_FILL,
      stripe: getUiColor('chartNoDataStripe', shadeColor(CHART_NODATA_FILL, 0.24)),
    });
    const g = svg.append('g').attr('transform', `translate(${PAD},${PAD})`);

    g.selectAll('.bg-cty').data(allFeatures).join('path').attr('class', 'bg-cty')
      .attr('d', path).attr('fill', CHART_BASE_FILL).attr('stroke', '#fff').attr('stroke-width', 0.4);

    g.selectAll('.af-cty').data(africaFeatures).join('path').attr('class', 'af-cty')
      .attr('d', path)
      .attr('fill', f => {
        const rec = dataByCode.get(_MIG_NUM_TO_A3[+f.id]);
        const fill = rec ? colorScale(rec) : null;
        return fill || noDataPattern;
      })
      .attr('stroke', '#fff').attr('stroke-width', 0.8)
      .style('cursor', 'pointer')
      .on('mousemove', (e, f) => {
        const code = _MIG_NUM_TO_A3[+f.id];
        if (!code) return;
        const rec = dataByCode.get(code);
        if (rec) showTip(e, rec);
        else showNoDataTip(e, code);
      })
      .on('mouseleave', hideTip);

    drawLegend(svg, W, H);
  }

  /* ── Redraw ─────────────────────────────────────────────── */
  const VIZ_PAD_TOP = 48;

  function redraw() {
    vizDiv.selectAll('*').remove();
    const padTop = viewMode === 'treemap' ? VIZ_PAD_TOP : 0;
    vizDiv.style('padding-top', padTop + 'px');
    const W = containerEl.clientWidth  || 560;
    const H = Math.max(50, (containerEl.clientHeight || (PLAYER_H + 460)) - PLAYER_H - padTop);
    if (viewMode === 'treemap') drawTreemap(W, H);
    else                        drawMap(W, H);
  }

  /* ── Player controls ────────────────────────────────────── */
  slider.on('input', function() {
    stopPlay();
    curYear = years[+this.value];
    yearLabel.text(curYear);
    redraw();
  });

  playBtn.on('click', () => {
    if (playing) { stopPlay(); return; }
    playing = true;
    playBtn.html('<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><rect x="0" y="0" width="3.5" height="14" rx="1"/><rect x="6.5" y="0" width="3.5" height="14" rx="1"/></svg>').style('background', CONT_COLOR.Africa);
    let idx = years.indexOf(curYear);
    if (idx >= years.length - 1) idx = -1;
    function step() {
      idx++;
      curYear = years[idx];
      slider.property('value', idx);
      yearLabel.text(curYear);
      redraw();
      if (idx < years.length - 1) playTimer = setTimeout(step, 900);
      else stopPlay();
    }
    playTimer = setTimeout(step, 900);
  });

  redraw();

  /* ── API ────────────────────────────────────────────────── */
  containerEl._remittancesReset     = () => { viewMode = 'treemap'; updateBtns(); redraw(); };
  containerEl._remittancesHighlight = () => { viewMode = 'treemap'; updateBtns(); redraw(); };
  containerEl._remittancesShowTrend = () => { viewMode = 'map';     updateBtns(); redraw(); };
}
