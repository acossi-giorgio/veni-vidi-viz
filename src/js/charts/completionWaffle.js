/* ============================================================
   Grafico 5 — Completamento scolastico (small multiples waffle)
   Overview:   un waffle 10×10 per continente (celle = % completamento).
   Drill-down: un waffle 10×10 per paese nel continente selezionato.
   API: _waffleShowAll()
        _waffleHighlightPair(c1, c2)
   ============================================================ */

async function renderCompletionWaffle(selector = '#chart-3-2', isFullscreen = false) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html('');
  container.style('width', '100%').style('height', '100%')
    .style('position', 'relative').style('font-family', 'inherit').style('overflow', 'hidden');

  const raw = await d3.csv('datasets/processed/05_edu_completion.csv', d3.autoType);
  if (!raw.length) { container.append('p').style('padding', '1rem').text('Dati non disponibili.'); return; }

  const CONTINENT_COLOR = {
    'Africa':        '#b04a4a',
    'Asia':          '#4a6fa5',
    'Europe':        '#5a8a6e',
    'North America': '#7a6fa5',
    'South America': '#c97c3e',
    'Oceania':       '#3a9a9a',
  };
  const CONTINENT_ORDER = ['Asia', 'Africa', 'Europe', 'North America', 'South America', 'Oceania'];

  const latestByCountry = new Map();
  raw.forEach(d => {
    if (!d.continent || d.total == null || isNaN(d.total)) return;
    const prev = latestByCountry.get(d.iso3);
    if (!prev || d.year > prev.year) latestByCountry.set(d.iso3, d);
  });
  const countries = Array.from(latestByCountry.values());

  const contGroups = d3.group(countries, d => d.continent);
  const continentData = CONTINENT_ORDER
    .map(cont => {
      const rows = contGroups.get(cont) || [];
      return {
        continent: cont,
        color: CONTINENT_COLOR[cont] || '#888',
        avgRate: rows.length ? d3.mean(rows, r => r.total) : 0,
        nCountries: rows.length,
        countries: rows.slice().sort((a, b) => (b.total || 0) - (a.total || 0)),
      };
    })
    .filter(c => c.nCountries > 0);

  // State
  let drillContinent = null;
  let highlightConts = null;

  // Tooltip
  d3.select('body').selectAll('.tooltip-waffle5').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip-waffle5')
    .style('position', 'absolute').style('background', 'rgba(0,0,0,0.88)')
    .style('color', '#fff').style('border-radius', '6px').style('padding', '8px 12px')
    .style('pointer-events', 'none').style('font-size', '12px').style('line-height', '1.6')
    .style('z-index', '10000').style('display', 'none');
  function showTip(e, html) {
    tooltip.style('display', 'block').html(html);
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 14, ty = e.pageY + 8;
    if (tx + r.width > window.innerWidth - 8) tx = e.pageX - r.width - 14;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 8;
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }
  function hideTip() { tooltip.style('display', 'none'); }

  const wrapper = container.append('div')
    .style('display', 'flex').style('flex-direction', 'column').style('height', '100%');

  // Header bar (always present, content changes)
  const headerBar = wrapper.append('div')
    .style('flex', '0 0 auto').style('display', 'flex').style('align-items', 'center')
    .style('gap', '8px').style('padding', '5px 8px').style('background', '#f5f5f5')
    .style('border-bottom', '1px solid #e0e0e0').style('box-sizing', 'border-box')
    .style('min-height', '32px');

  const mainArea = wrapper.append('div')
    .style('flex', '1 1 auto').style('overflow', 'hidden').style('position', 'relative');

  // ── Waffle builder ─────────────────────────────────────────────────────────
  // Returns an SVG element (D3 selection) with a 10×10 waffle for a given rate [0–100].
  function buildWaffle(parent, rate, color, cellSize, gap) {
    const COLS = 10, ROWS = 10;
    const filled = Math.max(0, Math.min(100, Math.round(rate)));
    const w = COLS * cellSize + (COLS - 1) * gap;
    const h = ROWS * cellSize + (ROWS - 1) * gap;
    const svg = parent.append('svg')
      .attr('width', w).attr('height', h)
      .style('display', 'block').style('flex-shrink', '0');
    for (let i = 0; i < 100; i++) {
      // Fill bottom-to-top (row 9 first) so waffle "grows up"
      const visualIdx = 99 - i;
      const col = visualIdx % COLS;
      const row = Math.floor(visualIdx / COLS);
      svg.append('rect')
        .attr('x', col * (cellSize + gap))
        .attr('y', row * (cellSize + gap))
        .attr('width', cellSize).attr('height', cellSize).attr('rx', 1)
        .attr('fill', i < filled ? color : '#e0e0e0')
        .attr('opacity', i < filled ? 0.88 : 1);
    }
    return svg;
  }

  // ── OVERVIEW — small multiples ─────────────────────────────────────────────
  function drawOverview() {
    headerBar.html('');
    headerBar.append('span')
      .style('font-size', '11px').style('color', '#777')
      .text('Tasso completamento secondaria superiore per continente — clicca per esplorare i paesi');

    mainArea.html('');
    mainArea.style('overflow-y', 'auto').style('overflow-x', 'hidden');

    const areaW = mainArea.node().getBoundingClientRect().width || 400;

    // Figure out how many columns fit and what cell size to use
    const MIN_CELL = 8, MAX_CELL = 14;
    // Try to fit all 6 in 2 or 3 columns depending on width
    const nCols = areaW >= 420 ? 3 : 2;
    const waffleMargin = 16; // px between waffles
    const blockW = Math.floor((areaW - waffleMargin * (nCols + 1)) / nCols);
    // cellSize: fit 10 cells + 9 gaps into blockW (minus ~8px label padding)
    const cellSize = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor((blockW - 8 - 9) / 10)));
    const gap = 1;

    const grid = mainArea.append('div')
      .style('display', 'flex').style('flex-wrap', 'wrap')
      .style('gap', `${waffleMargin}px`).style('padding', `${waffleMargin}px`)
      .style('justify-content', 'center');

    continentData.forEach(c => {
      const dimmed = highlightConts && !highlightConts.includes(c.continent);

      const block = grid.append('div')
        .style('display', 'flex').style('flex-direction', 'column').style('align-items', 'center')
        .style('gap', '5px').style('cursor', 'pointer')
        .style('opacity', dimmed ? '0.2' : '1')
        .style('transition', 'opacity 0.25s, transform 0.15s')
        .style('width', `${blockW}px`)
        .on('mouseenter', function() { if (!dimmed) d3.select(this).style('transform', 'scale(1.03)'); })
        .on('mouseleave', function() { d3.select(this).style('transform', 'scale(1)'); hideTip(); })
        .on('mousemove', e => {
          showTip(e,
            `<div style="font-weight:700;color:${c.color};margin-bottom:3px">${c.continent}</div>` +
            `Completamento medio: <strong>${Math.round(c.avgRate)}%</strong><br/>` +
            `<span style="color:#aaa;font-size:10px">${c.nCountries} paesi · clicca per espandere</span>`
          );
        })
        .on('click', () => {
          hideTip();
          drillContinent = c.continent;
          highlightConts = null;
          draw();
        });

      // Continent label top
      block.append('div')
        .style('font-size', '10px').style('font-weight', '700')
        .style('color', c.color).style('text-align', 'center')
        .style('white-space', 'nowrap').style('overflow', 'hidden').style('text-overflow', 'ellipsis')
        .style('width', '100%')
        .text(c.continent);

      // Waffle
      const waffleWrap = block.append('div');
      buildWaffle(waffleWrap, c.avgRate, c.color, cellSize, gap);

      // Rate label bottom
      block.append('div')
        .style('font-size', '13px').style('font-weight', '700').style('color', '#1a1a1a')
        .text(`${Math.round(c.avgRate)}%`);
    });

    // Global annotation
    const globalRate = d3.mean(continentData, c => c.avgRate);
    mainArea.append('div')
      .style('padding', '0 16px 12px').style('font-size', '10px').style('color', '#aaa')
      .style('text-align', 'center')
      .text(`Media globale: ${Math.round(globalRate)}% · ogni cella = 1 studente su 100 · pieno = completa la secondaria`);
  }

  // ── DRILL-DOWN — paese per paese ───────────────────────────────────────────
  function drawDrillDown(contName) {
    const contInfo = continentData.find(c => c.continent === contName);
    if (!contInfo) return;

    headerBar.html('');
    headerBar.append('button')
      .attr('aria-label', 'Torna alla vista per continente')
      .style('padding', '3px 10px').style('border-radius', '4px').style('font-size', '11px')
      .style('cursor', 'pointer').style('border', '1px solid #ccc').style('background', '#fff')
      .style('font-family', 'inherit')
      .text('← Continenti')
      .on('click', () => { drillContinent = null; draw(); });
    headerBar.append('span')
      .style('font-size', '12px').style('font-weight', '700').style('color', contInfo.color)
      .text(contName);
    headerBar.append('span')
      .style('font-size', '11px').style('color', '#999').style('margin-left', '4px')
      .text(`— ${contInfo.nCountries} paesi`);

    mainArea.html('');
    mainArea.style('overflow-y', 'auto').style('overflow-x', 'hidden');

    const areaW = mainArea.node().getBoundingClientRect().width || 400;

    // Smaller waffles for countries: cell 6px, gap 1
    const CELL = 6, GAP = 1;
    const waffleSize = 10 * CELL + 9 * GAP; // 69px
    const blockW = waffleSize + 16; // label padding
    const nCols = Math.max(2, Math.floor(areaW / (blockW + 10)));

    const grid = mainArea.append('div')
      .style('display', 'flex').style('flex-wrap', 'wrap')
      .style('gap', '10px').style('padding', '12px')
      .style('justify-content', 'center');

    contInfo.countries.forEach(d => {
      const pct = d.total != null && !isNaN(d.total) ? d.total : null;

      const block = grid.append('div')
        .style('display', 'flex').style('flex-direction', 'column').style('align-items', 'center')
        .style('gap', '3px').style('width', `${blockW}px`)
        .on('mousemove', e => {
          if (pct == null) return;
          showTip(e,
            `<div style="font-weight:700;color:${contInfo.color};margin-bottom:2px">${d.country}</div>` +
            `Completamento: <strong>${Math.round(pct)}%</strong><br/>` +
            `<span style="color:#aaa;font-size:10px">Anno: ${d.year}</span>`
          );
        })
        .on('mouseleave', hideTip);

      // Rate prominent
      block.append('div')
        .style('font-size', '12px').style('font-weight', '700').style('color', '#1a1a1a')
        .text(pct != null ? `${Math.round(pct)}%` : 'N/D');

      // Waffle
      if (pct != null) {
        buildWaffle(block, pct, contInfo.color, CELL, GAP);
      } else {
        block.append('div')
          .style('width', `${waffleSize}px`).style('height', `${waffleSize}px`)
          .style('background', '#f0f0f0').style('border-radius', '3px');
      }

      // Country label
      block.append('div')
        .style('font-size', '9px').style('color', '#555').style('text-align', 'center')
        .style('width', '100%').style('overflow', 'hidden').style('text-overflow', 'ellipsis')
        .style('white-space', 'nowrap').attr('title', d.country)
        .text(d.country);
    });
  }

  function draw() {
    if (drillContinent) {
      drawDrillDown(drillContinent);
    } else {
      drawOverview();
    }
  }

  draw();

  const node = container.node();
  node._waffleShowAll = function() { highlightConts = null; drillContinent = null; draw(); };
  node._waffleHighlightPair = function(c1, c2) {
    drillContinent = null;
    highlightConts = [c1, c2];
    draw();
  };
}
