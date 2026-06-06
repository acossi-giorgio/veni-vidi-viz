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

async function renderMigrationChart(selector = '#chart-5-1', isFullscreen = false) {
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
    'Asia': '#6f86c9',
    'Europe': '#58b86a',
    'North America': '#d95c62',
    'South America': '#d7a93a',
    'Oceania': '#4f97c8',
  };
  const UI_ACTIVE = getActColor(4, getUiColor('controlActive', '#5169b2'));
  const UI_ACTIVE_STRONG = getActColorStrong(4, getUiColor('controlActiveStrong', '#314685'));
  const UI_MUTED = getUiColor('controlMuted', '#f4efe7');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const UI_MUTED_INK = getUiColor('controlMutedInk', '#75695d');
  const CHART_WATER = getUiColor('chartWater', '#ece8e0');
  const CHART_BASE_FILL = getUiColor('chartBaseFill', '#d6d0c5');
  const CHART_GRID = getUiColor('chartGrid', '#e8e1d7');
  const wrap = container.append('div')
    .style('width', '100%').style('height', '100%').style('position', 'relative');

  d3.select('body').selectAll('.tooltip-chord').remove();
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip-chord')
    .attr('aria-hidden', 'true');
  wrap.selectAll('.migration-popup').remove();
  const popup = wrap.append('div')
    .attr('class', 'migration-popup')
    .attr('aria-hidden', 'true')
    .style('pointer-events', 'none')
    .on('click', (event) => event.stopPropagation());

  let pinnedTipKey = null;
  let pinnedTipOnClose = null;

  function positionTip(clientX, clientY) {
    const node = tooltip.node();
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const margin = 12;
    let tx = clientX + 16;
    let ty = clientY + 12;

    if (tx + rect.width > window.innerWidth - margin) tx = clientX - rect.width - 16;
    if (tx < margin) tx = Math.max(margin, window.innerWidth - rect.width - margin);

    if (ty + rect.height > window.innerHeight - margin) ty = window.innerHeight - rect.height - margin;
    if (ty < margin) ty = margin;

    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }

  function hideTip(force = false) {
    if (pinnedTipKey && !force) return;
    tooltip
      .attr('class', 'tooltip-chord')
      .style('display', 'none')
      .attr('aria-hidden', 'true')
      .html('');
  }

  function closePinnedTip(options = {}) {
    const { skipOnClose = false } = options;
    const onClose = pinnedTipOnClose;
    pinnedTipKey = null;
    pinnedTipOnClose = null;
    hideTip(true);
    popup
      .style('display', 'none')
      .style('pointer-events', 'none')
      .attr('aria-hidden', 'true')
      .html('');
    if (!skipOnClose && typeof onClose === 'function') onClose();
  }

  function showTip(e, html, options = {}) {
    if (pinnedTipKey) return;
    const {
      maxWidth = 'min(92vw, 28rem)',
    } = options;

    tooltip
      .attr('class', 'tooltip-chord')
      .style('--tooltip-max-width', maxWidth)
      .style('display', 'block')
      .attr('aria-hidden', 'false')
      .html(html);

    positionTip(e.clientX, e.clientY);
  }

  function showPinnedTip(anchor, config) {
    const {
      key,
      title,
      meta = '',
      bodyHtml,
      actionLabel = '',
      actionHint = '',
      onAction = null,
      onClose = null,
      width = 'min(92vw, 34rem)',
    } = config;

    pinnedTipKey = key;
    pinnedTipOnClose = onClose;
    hideTip(true);

    popup
      .style('--popup-width', width)
      .style('display', 'block')
      .style('pointer-events', 'auto')
      .attr('aria-hidden', 'false')
      .html(`
        <div class="migration-popup__panel">
          <div class="migration-popup__header">
            <div class="migration-popup__header-copy">
              <div class="migration-popup__title">${title}</div>
              ${meta ? `<div class="migration-popup__meta">${meta}</div>` : ''}
            </div>
            <div class="migration-popup__header-actions">
              ${actionLabel ? `<button type="button" class="migration-popup__action">${actionLabel}</button>` : ''}
              <button type="button" class="migration-popup__close" aria-label="Chiudi dettaglio">×</button>
            </div>
          </div>
          ${actionHint ? `<div class="migration-popup__hint migration-popup__hint--header">${actionHint}</div>` : ''}
          <div class="migration-popup__body">${bodyHtml}</div>
        </div>
      `);

    const wrapRect = wrap.node().getBoundingClientRect();
    const margin = 14;
    const popupNode = popup.node();
    const popupRect = popupNode.getBoundingClientRect();
    let left = anchor.clientX - wrapRect.left + 18;
    let top = anchor.clientY - wrapRect.top + 18;

    if (left + popupRect.width > wrapRect.width - margin) left = wrapRect.width - popupRect.width - margin;
    if (top + popupRect.height > wrapRect.height - margin) top = wrapRect.height - popupRect.height - margin;
    if (left < margin) left = margin;
    if (top < margin) top = margin;

    popup.style('left', `${left}px`).style('top', `${top}px`);

    popup.select('.migration-popup__close').on('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closePinnedTip();
    });

    if (actionLabel && typeof onAction === 'function') {
      popup.select('.migration-popup__action').on('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onAction();
      });
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }
  function chunkRows(rows = [], size = 10) {
    const chunks = [];
    for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
    return chunks;
  }
  function detailRowsToHtml(detailRows = []) {
    if (!detailRows.length) return '';
    const fmt = d3.format(',.0f');
    const columns = chunkRows(detailRows, 10).map(columnRows => `
      <div style="display:flex;flex-direction:column;row-gap:2px;min-width:0;">
        ${columnRows.map(r => `<div><span style="opacity:.82">${escapeHtml(r.name)}</span>: ${fmt(r.val)}</div>`).join('')}
      </div>
    `);
    return [
      `<span style="opacity:.5;font-size:9px;text-transform:uppercase;letter-spacing:.05em">Paesi inclusi: ${detailRows.length}</span>`,
      `<div style="margin-top:3px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));column-gap:18px;row-gap:8px;max-width:min(88vw,1040px);">${columns.join('')}</div>`,
    ].join('');
  }
  function mapTooltipRowsToHtml(title, rows = [], nameKey, valueKey = 'stock') {
    if (!rows.length) return '';
    const fmt = d3.format(',.0f');
    const columns = chunkRows(rows, 10).map(columnRows => `
      <div style="display:flex;flex-direction:column;row-gap:2px;min-width:0;">
        ${columnRows.map(r => `
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;">
            <span style="opacity:.82;min-width:0;">${escapeHtml(r[nameKey])}</span>
            <strong>${fmt(r[valueKey])}</strong>
          </div>
        `).join('')}
      </div>
    `);
    return [
      `<div style="margin-top:6px;opacity:.5;font-size:9px;letter-spacing:.05em;text-transform:uppercase">Paesi inclusi: ${rows.length}</div>`,
      `<div style="margin-top:6px;opacity:.45;font-size:9px;letter-spacing:.05em;text-transform:uppercase">${title}</div>`,
      `<div style="margin-top:3px;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));column-gap:18px;row-gap:8px;max-width:min(88vw,1040px);">${columns.join('')}</div>`,
    ].join('');
  }

  function mapTooltipListHtml(title, rows = [], nameKey, valueKey = 'stock') {
    if (!rows.length) return '';
    const fmt = d3.format(',.0f');
    return `
      <section class="tooltip-chord__section">
        <div class="tooltip-chord__eyebrow">${escapeHtml(title)}</div>
        <div class="tooltip-chord__list">
          ${rows.map(r => `
            <div class="tooltip-chord__row">
              <span>${escapeHtml(r[nameKey])}</span>
              <strong>${fmt(r[valueKey])}</strong>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  const containerNode = container.node();
  const FIXED_YEAR = DATA_YEARS.includes(2020) ? 2020 : MAX_YEAR;
  let currentYear = FIXED_YEAR;
  let mode = 'sankey';
  let animTimer = null;
  let sankeyDrillAfrica = false;
  let sankeyDrillContinents = new Set(); // expanded dest continents

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
      .style('border', '1px solid transparent').style('cursor', 'pointer').style('font-weight', '600')
      .style('transition', 'all 0.15s').text(label)
      .on('click', () => {
        mode = m;
        stopAnim();
        sankeyDrillAfrica = false;
        sankeyDrillContinents.clear();
        updateModeBtns();
        draw();
      });
  }

  const btnSankey = mkModeBtn('sankey', 'Sankey');
  const btnMap    = mkModeBtn('map',    'Mappa');

  function updateModeBtns() {
    const set = (btn, active) => btn
      .style('background', active ? UI_ACTIVE : 'transparent')
      .style('color', active ? '#fff' : UI_ACTIVE_STRONG)
      .style('border-color', active ? UI_ACTIVE_STRONG : 'transparent')
      .style('box-shadow', active ? `0 1px 4px ${colorToRgba(UI_ACTIVE_STRONG, 0.28)}` : 'none');
    set(btnSankey, mode === 'sankey');
    set(btnMap,    mode === 'map');
  }
  updateModeBtns();

  const svgArea = wrap.append('div')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('right', '0').style('bottom', '0');

  // ── Fixed reference year badge ─────────────────────────────
  wrap.append('div')
    .style('position', 'absolute').style('right', '12px').style('bottom', '6px').style('z-index', '20')
    .style('display', 'flex').style('align-items', 'center')
    .style('background', 'transparent').style('backdrop-filter', 'none')
    .style('border', 'none').style('border-radius', '10px')
    .style('box-shadow', 'none')
    .style('padding', '0')
    .html(`<span style="font-size:32px;color:${UI_ACTIVE_STRONG};font-weight:750;letter-spacing:-.5px">${currentYear}</span>`);

  function stopAnim() {
    if (animTimer) { clearTimeout(animTimer); animTimer = null; }
  }

  const HEADER_H = 44; // approximate height of the top pill-bar header

  function draw() {
    closePinnedTip();
    svgArea.html('');
    wrap.selectAll('.migration-scale-note').remove();
    const svgRect = svgArea.node().getBoundingClientRect();
    const W = svgRect.width  || 560;
    const H = svgRect.height || 380;
    if (W < 10 || H < 10) return;
    if (mode === 'map') {
      drawMap(W, H);
    } else {
      const sankeyH = Math.max(50, H - HEADER_H);
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
        const countLine = d.countryCount && d.countryCount > 1
          ? `<br><span style="opacity:.7;font-size:10px">Paesi inclusi: ${d.countryCount}</span>`
          : '';
        showTip(e,
          `<strong style="color:${col}">${d.name}</strong>${hint}<br>` +
          (d.type==='src' ? 'Emigrati: ' : "Ricevuti dall'Africa: ") +
          `<strong>${d3.format(',.0f')(d.total)}</strong>` +
          countLine
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
    const linkLayer = g.append('g').attr('class', 'sk-link-layer');
    const nodeLayer = g.append('g').attr('class', 'sk-node-layer');
    const linkPath = d3.sankeyLinkHorizontal();
    let lastNodePos = new Map();

    function buildSankeyGraph() {
      const yearData = getYearData(currentYear).filter(d =>
        d.origin_continent === 'Africa' &&
        d.dest_continent !== 'Africa' && d.stock > 0
      );
      const destContStock = d3.rollup(yearData, v => d3.sum(v, d => d.stock), d => d.dest_continent);
      const destConts = [...destContStock.keys()].sort((a, b) => destContStock.get(b) - destContStock.get(a));
      const nodes = [];
      const links = [];
      const africaTotal = d3.sum(destContStock.values());

      nodes.push({
        id: 'AFRICA',
        name: 'Africa',
        layer: 0,
        col: CONT_COLOR.Africa,
        role: 'africa',
        total: africaTotal,
        countryCount: new Set(yearData.map(d => d.origin_code)).size,
      });

      if (sankeyDrillAfrica) {
        const sourceStock = d3.rollup(yearData, v => d3.sum(v, d => d.stock), d => d.origin_code);
        const sortedSrc = [...sourceStock.entries()].sort((a, b) => b[1] - a[1]);
        const srcThreshold = africaTotal * 0.01;
        const srcVisible = sortedSrc.filter(([, v]) => v >= srcThreshold);
        const srcHidden = sortedSrc.filter(([, v]) => v < srcThreshold);

        srcVisible.forEach(([code, val]) => {
          const name = yearData.find(d => d.origin_code === code)?.origin_country || code;
          nodes.push({ id: `SRC_${code}`, name, layer: 0, col: CONT_COLOR.Africa, role: 'src-country', parentId: 'AFRICA' });
          links.push({ source: `SRC_${code}`, target: 'AFRICA', value: val });
        });

        if (srcHidden.length > 0) {
          const detail = srcHidden.map(([code, val]) => {
            const name = yearData.find(d => d.origin_code === code)?.origin_country || code;
            return { name, val };
          });
          const srcOthersVal = d3.sum(srcHidden, d => d[1]);
          nodes.push({ id: 'SRC_OTHERS', name: 'Altri', layer: 0, col: CONT_COLOR.Africa, role: 'src-country', parentId: 'AFRICA', detail, countryCount: srcHidden.length });
          links.push({ source: 'SRC_OTHERS', target: 'AFRICA', value: srcOthersVal });
        }
      }

      destConts.forEach(cont => {
        const countryCount = new Set(yearData.filter(d => d.dest_continent === cont).map(d => d.dest_code)).size;
        nodes.push({
          id: cont,
          name: cont,
          layer: 1,
          col: CONT_COLOR[cont] || '#888',
          role: 'dest-cont',
          parentId: 'AFRICA',
          countryCount,
        });
        links.push({ source: 'AFRICA', target: cont, value: destContStock.get(cont) });
      });

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
          pendingCountries.push({ id: `__others_${cont}__`, name: 'Altri', col: CONT_COLOR[cont] || '#888', source: cont, value: othVal, detail, countryCount: hidden.length });
        }
      });
      pendingCountries.sort((a, b) => {
        const aOther = String(a.id).startsWith('__others_');
        const bOther = String(b.id).startsWith('__others_');
        if (aOther !== bOther) return aOther ? 1 : -1;
        return b.value - a.value;
      });
      pendingCountries.forEach(c => {
        nodes.push({ id: c.id, name: c.name, layer: 2, col: c.col, role: 'dest-country', parentId: c.source, detail: c.detail });
        links.push({ source: c.source, target: c.id, value: c.value });
      });

      const sankeyGen = d3.sankey()
        .nodeId(d => d.id)
        .nodeAlign(d3.sankeyLeft)
        .nodeSort(null)
        .linkSort(null)
        .nodeWidth(nodeWidth)
        .nodePadding(nodePadding)
        .extent([[0, 0], [iw, ih]]);

      return sankeyGen({
        nodes: nodes.map(d => ({ ...d })),
        links: links.filter(l => l.value > 0).map(d => ({ ...d })),
      });
    }

    function linkKey(d) {
      return `${d.source.id}->${d.target.id}`;
    }

    function nodeStartTransform(d, action = {}) {
      const parent = lastNodePos.get(d.parentId || action.parentId);
      if (!parent) return `translate(${d.x0},${d.y0})`;
      const h = Math.max(1, d.y1 - d.y0);
      return `translate(${parent.x0},${(parent.y0 + parent.y1) / 2 - h / 2})`;
    }

    function nodeExitTransform(d, action = {}) {
      const parent = lastNodePos.get(d.parentId || action.parentId);
      if (!parent) return `translate(${d.x0},${d.y0})`;
      const h = Math.max(1, d.y1 - d.y0);
      return `translate(${parent.x0},${(parent.y0 + parent.y1) / 2 - h / 2})`;
    }

    function revealFlow(path, direction = 'right', duration = 900, delay = 0) {
      const length = path.getTotalLength();
      d3.select(path)
        .attr('stroke-dasharray', length)
        .attr('stroke-dashoffset', direction === 'left' ? -length : length)
        .attr('stroke-opacity', 0.12)
        .transition()
        .delay(delay)
        .duration(duration)
        .ease(d3.easeSinInOut)
        .attr('stroke-dashoffset', 0)
        .attr('stroke-opacity', 0.25)
        .on('end', function() {
          d3.select(this).attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
        });
    }

    function compressFlow(path, direction = 'left', duration = 900, delay = 0) {
      const length = path.getTotalLength();
      d3.select(path)
        .interrupt()
        .attr('stroke-dasharray', length)
        .attr('stroke-dashoffset', 0)
        .transition()
        .delay(delay)
        .duration(duration)
        .ease(d3.easeSinInOut)
        .attr('stroke-dashoffset', direction === 'left' ? -length : length)
        .attr('stroke-opacity', 0)
        .remove();
    }

    function handleNodeClick(e, d) {
      if (!d) return;
      hideTip();
      if (d.role === 'africa') {
        const opening = !sankeyDrillAfrica;
        sankeyDrillAfrica = opening;
        renderSankey({
          type: opening ? 'expand' : 'collapse',
          direction: opening ? 'left' : 'right',
          parentId: 'AFRICA',
        });
      } else if (d.role === 'dest-cont') {
        const opening = !sankeyDrillContinents.has(d.id);
        if (opening) sankeyDrillContinents.add(d.id);
        else sankeyDrillContinents.delete(d.id);
        renderSankey({
          type: opening ? 'expand' : 'collapse',
          direction: opening ? 'right' : 'left',
          parentId: d.id,
        });
      }
    }

    function renderSankey(action = { type: 'initial', direction: 'right' }) {
      const graph = buildSankeyGraph();
      const visLinks = graph.links;
      const visNodes = graph.nodes;
      const flowDuration = action.type === 'initial' ? 1040 : 860;
      const settleDelay = 72;
      const revealDelay = Math.max(0, flowDuration - settleDelay);
      const labelRevealDelay = action.type === 'collapse' ? Math.max(0, flowDuration - 90) : revealDelay;
      const enteringNodeIds = new Set(visNodes.filter(d => !lastNodePos.has(d.id)).map(d => d.id));
      const pinnedInitialNodeIds = new Set(action.type === 'initial' ? ['AFRICA'] : []);
      const nodeOrder = new Map(visNodes.map((d, index) => [d.id, index]));
      const densityFactor = Math.max(0.45, Math.min(1, 10 / Math.max(10, visNodes.length)));
      const nodeStagger = (action.type === 'initial' ? 14 : 10) * densityFactor;
      const linkStagger = (action.type === 'initial' ? 8 : 6) * densityFactor;
      const nodeFadeDuration = 240;
      const labelFadeDuration = 210;
      const exitFadeDuration = 170;

      const linkSel = linkLayer.selectAll('path.sk-link')
        .data(visLinks, linkKey);

      linkSel.exit().each(function(_, index) {
        compressFlow(this, action.direction || 'left', flowDuration, index * 6);
      });

      const linkEnter = linkSel.enter()
        .append('path')
        .attr('class', 'sk-link')
        .attr('d', linkPath)
        .attr('fill', 'none')
        .attr('stroke', d => d.target.col || '#aaa')
        .attr('stroke-width', d => Math.max(1, d.width))
        .attr('stroke-opacity', 0)
        .style('cursor', 'pointer');

      linkEnter.each(function(_, index) {
        revealFlow(this, action.direction || 'right', flowDuration, index * linkStagger);
      });

      linkSel.merge(linkEnter)
        .on('mouseover', function() { d3.select(this).attr('stroke-opacity', 0.55); })
        .on('mousemove', (e, d) => showTip(e,
          `<strong style="color:${d.source.col||'#fff'}">${d.source.name}</strong>` +
          ` → <strong style="color:${d.target.col||'#fff'}">${d.target.name}</strong><br>` +
          `Migranti: <strong>${d3.format(',.0f')(d.value)}</strong>`
        ))
        .on('mouseleave', function() {
          hideTip();
          d3.select(this).attr('stroke-opacity', 0.25);
        });

      linkSel
        .transition()
        .delay((_, index) => index * linkStagger)
        .duration(flowDuration)
        .ease(d3.easeSinInOut)
        .attr('d', linkPath)
        .attr('stroke', d => d.target.col || '#aaa')
        .attr('stroke-width', d => Math.max(1, d.width))
        .attr('stroke-opacity', 0.25);

      const nodeSel = nodeLayer.selectAll('g.sk-node')
        .data(visNodes, d => d.id);

      nodeSel.exit()
        .transition()
        .delay((d, index) => (action.type === 'collapse' ? revealDelay : 0) + index * 14)
        .duration(exitFadeDuration)
        .ease(d3.easeQuadOut)
        .attr('opacity', 0)
        .remove();

      const nodeEnter = nodeSel.enter()
        .append('g')
        .attr('class', 'sk-node')
        .attr('transform', d => `translate(${d.x0},${d.y0})`)
        .attr('opacity', d => pinnedInitialNodeIds.has(d.id) ? 1 : 0);

      nodeEnter.append('rect')
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => Math.max(1, d.y1 - d.y0))
        .attr('fill', d => d.col || '#888')
        .attr('rx', 3)
        .attr('opacity', d => pinnedInitialNodeIds.has(d.id) ? 0.85 : 0);

      nodeEnter.append('text')
        .attr('dominant-baseline', 'middle')
        .attr('opacity', d => pinnedInitialNodeIds.has(d.id) ? 1 : 0)
        .style('pointer-events', 'none');

      const nodeMerged = nodeSel.merge(nodeEnter)
        .style('cursor', d => d.role === 'africa' || d.role === 'dest-cont' ? 'pointer' : 'default')
        .on('click', handleNodeClick)
        .on('mousemove', (e, d) => {
          if (!d || !d.name) return;
          let html = `<strong style="color:${d.col||'#fff'}">${d.name}</strong><br>` +
            `Stock totale: <strong>${d3.format(',.0f')(d.value)}</strong>`;
          if (d.role === 'africa') {
            html += sankeyDrillAfrica
              ? '<br><em style="opacity:.6;font-size:10px">Clicca per comprimere →</em>'
              : '<br><em style="opacity:.6;font-size:10px">Clicca per espandere ←</em>';
          } else if (d.role === 'dest-cont') {
            html += sankeyDrillContinents.has(d.id)
              ? '<br><em style="opacity:.6;font-size:10px">Clicca per comprimere ←</em>'
              : '<br><em style="opacity:.6;font-size:10px">Clicca per espandere →</em>';
          }
          if (d.detail) html += detailRowsToHtml(d.detail);
          showTip(e, html, {
            maxWidth: d.detail ? 'min(92vw, 70rem)' : 'min(92vw, 28rem)',
          });
        })
        .on('mouseleave', hideTip);

      nodeMerged.transition()
        .delay(d => (pinnedInitialNodeIds.has(d.id) ? 0 : (enteringNodeIds.has(d.id) ? revealDelay : 0)) + (pinnedInitialNodeIds.has(d.id) ? 0 : (nodeOrder.get(d.id) || 0) * nodeStagger))
        .duration(nodeFadeDuration)
        .ease(d3.easeSinOut)
        .attr('transform', d => `translate(${d.x0},${d.y0})`)
        .attr('opacity', 1);

      nodeMerged.select('rect').transition()
        .delay(d => (pinnedInitialNodeIds.has(d.id) ? 0 : (enteringNodeIds.has(d.id) ? revealDelay : 0)) + (pinnedInitialNodeIds.has(d.id) ? 0 : (nodeOrder.get(d.id) || 0) * nodeStagger))
        .duration(nodeFadeDuration)
        .ease(d3.easeSinOut)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => Math.max(1, d.y1 - d.y0))
        .attr('fill', d => d.col || '#888')
        .attr('opacity', 0.85);

      nodeMerged.select('text')
        .attr('x', d => d.layer === 0 ? -6 : (d.x1 - d.x0) + 6)
        .attr('y', d => (d.y1 - d.y0) / 2)
        .attr('text-anchor', d => d.layer === 0 ? 'end' : 'start')
        .attr('font-size', d => {
          if (d.layer === 0) return isCompact ? 10 : 11;
          return isVeryCompact ? 8 : 9;
        })
        .attr('font-weight', d => d.layer === 0 ? '400' : '500')
        .attr('fill', d => d.col || '#555')
        .attr('opacity', d => {
          if (pinnedInitialNodeIds.has(d.id)) return 1;
          return action.type === 'collapse' ? 0 : (enteringNodeIds.has(d.id) ? 0 : 1);
        })
        .text(d => {
          if (!d || !d.name) return '';
          const maxChars = isVeryCompact ? 9 : (isCompact ? 12 : 16);
          const label = d.name.length > maxChars ? d.name.slice(0, maxChars - 1) + '…' : d.name;
          return isVeryCompact ? label : `${label}  ${d3.format('.2~s')(d.value)}`;
        })
        .transition()
        .delay(d => {
          if (pinnedInitialNodeIds.has(d.id)) return 0;
          return (action.type === 'collapse' ? labelRevealDelay : (enteringNodeIds.has(d.id) ? revealDelay : 0)) + (nodeOrder.get(d.id) || 0) * nodeStagger + 70;
        })
        .duration(labelFadeDuration)
        .ease(d3.easeSinOut)
        .attr('opacity', 1);

      lastNodePos = new Map(visNodes.map(d => [d.id, { x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1 }]));
    }

    renderSankey({ type: 'initial', direction: 'right' });
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
    const continentByCode = new Map();
    migRaw.forEach((d) => {
      if (d.origin_code && d.origin_continent && !continentByCode.has(d.origin_code)) {
        continentByCode.set(d.origin_code, d.origin_continent);
      }
      if (d.dest_code && d.dest_continent && !continentByCode.has(d.dest_code)) {
        continentByCode.set(d.dest_code, d.dest_continent);
      }
    });
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
    // Countries with any valid flow in the selected year (for map coloring/tooltip).
    const countrySrcCodes = new Set(yearData.map(d => d.origin_code));
    const countryDstCodes = new Set(yearData.map(d => d.dest_code));
    const renderPairs = pairs.filter(p => centroidByA3.has(p.srcCode) && centroidByA3.has(p.dstCode));
    const arcSrcCodes = new Set(renderPairs.map(p => p.srcCode));
    const arcDstCodes = new Set(renderPairs.map(p => p.dstCode));

    // breakdown: destCode → [{srcName, stock}] sorted desc
    const byDest = new Map();
    pairs.forEach(p => {
      if (!byDest.has(p.dstCode)) byDest.set(p.dstCode, []);
      byDest.get(p.dstCode).push({ srcName: p.srcName, stock: p.stock });
    });
    byDest.forEach(arr => arr.sort((a, b) => b.stock - a.stock));

    // breakdown: srcCode → [{dstName, stock}] sorted desc
    const bySrc = new Map();
    pairs.forEach(p => {
      if (!bySrc.has(p.srcCode)) bySrc.set(p.srcCode, []);
      bySrc.get(p.srcCode).push({ dstName: p.dstName, stock: p.stock });
    });
    bySrc.forEach(arr => arr.sort((a, b) => b.stock - a.stock));

    // ── Color helpers: continent color + sqrt-opacity by stock ──────
    const destContMap = new Map();
    yearData.forEach(d => destContMap.set(d.dest_code, d.dest_continent));

    const maxDest = d3.max(stockByDest.values()) || 1;
    const maxOrig = d3.max(origStockMap.values()) || 1;
    const destOpScale = d3.scaleSqrt().domain([0, maxDest]).range([0.62, 0.98]);
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
    function continentFill(a3, opacity = 0.28) {
      const cont = continentByCode.get(a3);
      const base = CONT_COLOR[cont] || CHART_BASE_FILL;
      if (!base || base === CHART_BASE_FILL) return CHART_BASE_FILL;
      return hexToRgba(base, opacity);
    }
    function baseCountryFill(a3) {
      if (!a3) return CHART_BASE_FILL;
      if (topicSrcCodes.has(a3)) return continentFill(a3, 0.3);
      if (topicDstCodes.has(a3)) return continentFill(a3, 0.26);
      return continentFill(a3, 0.2);
    }
    function activeCountryFill(a3) {
      if (!a3) return CHART_BASE_FILL;
      if (countrySrcCodes.has(a3)) return origFill(a3) || hexToRgba(CONT_COLOR.Africa, 0.94);
      if (countryDstCodes.has(a3)) return destFill(a3) || hexToRgba(CONT_COLOR[continentByCode.get(a3)] || '#607d8b', 0.92);
      return hexToRgba(CONT_COLOR[continentByCode.get(a3)] || '#607d8b', 0.9);
    }
    function getLinkedCountryCodes(a3) {
      const linked = new Set([a3]);
      renderPairs.forEach((p) => {
        if (p.srcCode === a3) linked.add(p.dstCode);
        if (p.dstCode === a3) linked.add(p.srcCode);
      });
      return linked;
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
    const countriesSel = g.selectAll('.cty').data(geoCountries).join('path')
      .attr('class', 'cty')
      .attr('d', pathGen)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.35)
      .attr('fill', f => {
        const a3 = _MIG_NUM_TO_A3[+f.id];
        return baseCountryFill(a3);
      })
      .style('cursor', f => {
        const a3 = _MIG_NUM_TO_A3[+f.id];
        return (a3 && (topicSrcCodes.has(a3) || topicDstCodes.has(a3))) ? 'pointer' : 'default';
      })
      .on('mousemove', (e, f) => {
        if (pinnedTipKey) return;
        const a3 = _MIG_NUM_TO_A3[+f.id];
        if (!a3) return;
        if (topicSrcCodes.has(a3) || topicDstCodes.has(a3)) {
          if (arcHoverA3 !== a3 && (arcSrcCodes.has(a3) || arcDstCodes.has(a3))) {
            arcHoverA3 = a3;
            revealArcs(a3);
          }
          showTip(e, arcHoverHtml(a3), { maxWidth: 'min(92vw, 24rem)' });
        }
      })
      .on('mouseleave', () => {
        hideTip(true);
        clearArcHover();
      })
      .on('click', (e, f) => {
        e.stopPropagation();
        const a3 = _MIG_NUM_TO_A3[+f.id];
        if (!a3) return;
        if (!(topicSrcCodes.has(a3) || topicDstCodes.has(a3))) return;
        hideTip(true);
        if (pinnedTipKey && pinnedTipKey !== `migration-map-${a3}`) closePinnedTip();
        if (pinnedTipKey === `migration-map-${a3}`) {
          closePinnedTip();
          return;
        }
        clearArcSelection();
        openArcPopup(e, a3);
      });

    function updateCountryHighlight(activeCodes = null) {
      countriesSel.attr('fill', (f) => {
        const a3 = _MIG_NUM_TO_A3[+f.id];
        if (!a3) return CHART_BASE_FILL;
        if (activeCodes && activeCodes.has(a3)) return activeCountryFill(a3);
        return baseCountryFill(a3);
      });
    }

    // Arc click state
    let arcHoverA3 = null;

    function arcHoverHtml(a3) {
      const fmt = d3.format(',.0f');
      const countryName = TOPIC_NAME_BY_CODE.get(a3) || origNameMap.get(a3) || destNameMap.get(a3) || a3;
      if (topicSrcCodes.has(a3) && !countrySrcCodes.has(a3)) {
        return `<strong style="color:${CONT_COLOR.Africa}">${countryName}</strong> <span style="opacity:.5;font-size:9px">ORIGINE</span><br>Stock migratorio: <em>N/D</em>`;
      }
      if (topicDstCodes.has(a3) && !countryDstCodes.has(a3)) {
        return `<strong>${countryName}</strong> <span style="opacity:.5;font-size:9px">DESTINAZIONE</span><br>Stock migratorio: <em>N/D</em>`;
      }
      if (countrySrcCodes.has(a3)) {
        const total = origStockMap.get(a3) || 0;
        return `<strong style="color:${CONT_COLOR.Africa}">${origNameMap.get(a3) || countryName}</strong> <span style="opacity:.5;font-size:9px">ORIGINE</span><br>Totale emigrati: <strong>${fmt(total)}</strong>`;
      }
      const total = stockByDest.get(a3) || 0;
      const cont = destContMap.get(a3);
      const col = CONT_COLOR[cont] || '#607d8b';
      return `<strong style="color:${col}">${destNameMap.get(a3) || countryName}</strong> <span style="opacity:.5;font-size:9px">DESTINAZIONE</span><br>Totale migranti: <strong>${fmt(total)}</strong>`;
    }

    function buildArcPopupConfig(a3, anchor) {
      const fmt = d3.format(',.0f');
      const countryName = TOPIC_NAME_BY_CODE.get(a3) || origNameMap.get(a3) || destNameMap.get(a3) || a3;
      if (topicSrcCodes.has(a3) && !countrySrcCodes.has(a3)) {
        return {
          key: `migration-map-${a3}`,
          title: `<span style="color:${CONT_COLOR.Africa}">${countryName}</span>`,
          meta: 'Origine',
          bodyHtml: `<div><strong>Stock migratorio:</strong> <em>No data</em> (${currentYear})</div>`,
          onClose: () => clearArcSelection(),
        };
      }
      if (topicDstCodes.has(a3) && !countryDstCodes.has(a3)) {
        return {
          key: `migration-map-${a3}`,
          title: escapeHtml(countryName),
          meta: 'Destinazione',
          bodyHtml: `<div><strong>Stock migratorio:</strong> <em>No data</em> (${currentYear})</div>`,
          onClose: () => clearArcSelection(),
        };
      }
      if (countrySrcCodes.has(a3)) {
        const total = origStockMap.get(a3) || 0;
        const rows  = bySrc.get(a3) || [];
        return {
          key: `migration-map-${a3}`,
          title: `<span style="color:${CONT_COLOR.Africa}">${escapeHtml(origNameMap.get(a3) || countryName)}</span>`,
          meta: 'Origine',
          bodyHtml: `
            <div><strong>Totale emigrati:</strong> ${fmt(total)}</div>
            ${rows.length ? `<div style="margin-top:4px;opacity:.7;font-size:10px">Paesi inclusi: ${rows.length}</div>` : ''}
            ${mapTooltipListHtml('Principali destinazioni', rows, 'dstName')}
          `,
          onClose: () => clearArcSelection(),
        };
      }
      const total = stockByDest.get(a3) || 0;
      const rows  = byDest.get(a3) || [];
      const cont  = destContMap.get(a3);
      const col   = CONT_COLOR[cont] || '#607d8b';
      return {
        key: `migration-map-${a3}`,
        title: `<span style="color:${col}">${escapeHtml(destNameMap.get(a3) || countryName)}</span>`,
        meta: 'Destinazione',
        bodyHtml: `
          <div><strong>Totale migranti africani:</strong> ${fmt(total)}</div>
          ${rows.length ? `<div style="margin-top:4px;opacity:.7;font-size:10px">Paesi inclusi: ${rows.length}</div>` : ''}
          ${mapTooltipListHtml('Per paese di origine', rows, 'srcName')}
        `,
        onClose: () => clearArcSelection(),
      };
    }

    function openArcPopup(anchor, a3) {
      showPinnedTip(anchor, buildArcPopupConfig(a3, anchor));
    }
    const HOVER_ARC_OPACITY = 0.52;
    const ARC_STROKE_WIDTH = 1.2;

    function revealArcs(a3) {
      const activeCodes = getLinkedCountryCodes(a3);
      updateCountryHighlight(activeCodes);
      const sel = arcSrcCodes.has(a3)
        ? g.selectAll(`.mig-arc[data-src="${a3}"]`)
        : g.selectAll(`.mig-arc[data-dest="${a3}"]`);
      g.selectAll('.mig-arc')
        .interrupt()
        .attr('stroke-dasharray', null)
        .attr('stroke-dashoffset', null)
        .attr('opacity', 0);
      sel.raise().each(function() {
        const len = this.getTotalLength();
        d3.select(this)
          .interrupt()
          .attr('stroke-dasharray', len)
          .attr('stroke-dashoffset', len)
          .attr('opacity', HOVER_ARC_OPACITY)
          .transition().duration(700).ease(d3.easeLinear)
          .attr('stroke-dashoffset', 0);
      });
    }
    function clearArcHover() {
      arcHoverA3 = null;
      updateCountryHighlight();
      g.selectAll('.mig-arc').interrupt()
        .attr('stroke-dasharray', null).attr('stroke-dashoffset', null).attr('opacity', 0);
    }

    function clearArcSelection() {
      arcHoverA3 = null;
      updateCountryHighlight();
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
          .attr('stroke-width', ARC_STROKE_WIDTH)
          .attr('stroke-linecap', 'round')
          .attr('opacity', 0)
          .style('pointer-events', 'none');
      });

    const noteCompact = W < 720 || H < 360;
    const noteLines = [
      { label: 'Hover sul paese', value: 'mostra i flussi' },
      { label: 'Click sul paese', value: 'apre il dettaglio' },
    ];
    const note = wrap.append('div')
      .attr('class', 'migration-scale-note')
      .style('position', 'absolute')
      .style('left', '12px')
      .style('bottom', '12px')
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
      .html(noteLines.map(line => `
        <div style="display:flex;align-items:center;gap:${noteCompact ? '7px' : '9px'};">
          <span>${escapeHtml(line.label)}</span>
          <span style="color:${UI_MUTED_INK};font-size:${noteCompact ? '13px' : '15px'};line-height:1;">&rarr;</span>
          <span>${escapeHtml(line.value)}</span>
        </div>
      `).join(''));

    svg.on('click', () => {
      closePinnedTip();
      clearArcSelection();
    });
  }

  draw();

  containerNode._migrationShowYear = function() {
    stopAnim(); mode = 'sankey'; currentYear = FIXED_YEAR;
    updateModeBtns();
    draw();
  };
  containerNode._migrationAnimate = function() {
    stopAnim(); mode = 'sankey'; currentYear = FIXED_YEAR;
    updateModeBtns();
    draw();
  };
  containerNode._migrationShowMap = function() {
    stopAnim(); mode = 'map'; currentYear = FIXED_YEAR;
    updateModeBtns();
    draw();
  };
  containerNode._getHelpContext = () => ({
    mode,
    currentYear,
  });
}

