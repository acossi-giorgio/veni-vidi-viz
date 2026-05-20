/* ============================================================
   Grafico 3-3 (Atto II) — Small multiples: alfabetizzazione o fuori scuola
   Africa / Europe — toggle metrica, crosshair, legenda
   ============================================================ */
async function renderExclusionChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const CONT_COLOR = {
    Africa: '#e07b39', Europe: '#5aab6e',
  };
  const CONT_ORDER = ['Africa', 'Europe'];

  const [litRaw, oosRaw] = await Promise.all([
    d3.csv('datasets/processed/literacy.csv',      d3.autoType),
    d3.csv('datasets/processed/out_of_school.csv', d3.autoType),
  ]);

  function buildStats(raw, clampPct) {
    const valid = raw.filter(d => d.value != null && d.code);
    const countByContinent = new Map();
    const statsByContinent = new Map();
    const xDomain = d3.extent(valid, d => d.year);
    d3.group(valid, d => d.continent).forEach((rows, cont) => {
      countByContinent.set(cont, new Set(rows.map(d => d.code)).size);
      const byYear = d3.rollup(rows, v => {
        const mean = d3.mean(v, d => d.value);
        const std  = d3.deviation(v, d => d.value) || 0;
        const lo   = Math.max(0, mean - std);
        const hi   = clampPct ? Math.min(100, mean + std) : mean + std;
        return { mean, lo, hi };
      }, d => d.year);
      statsByContinent.set(cont, Array.from(byYear, ([year, s]) => ({ year, ...s })).sort((a, b) => a.year - b.year));
    });
    return { countByContinent, statsByContinent, xDomain };
  }

  const litStats = buildStats(litRaw,  true);
  const oosStats = buildStats(oosRaw, false);

  let metric             = 'literacy';
  let highlightContinent = null;

  // ── Buttons — top-right, dumbbell style ───────────────────
  const pillBar = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '8px').style('left', '10px')
    .style('display', 'flex').style('background', 'rgba(255,255,255,0.92)')
    .style('border-radius', '9px').style('border', '1px solid #d0d8e8')
    .style('padding', '3px').style('gap', '2px')
    .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)').style('z-index', '10');

  function mkBtn(label, val) {
    return pillBar.append('button')
      .style('font-size', '11px').style('padding', '5px 14px').style('border-radius', '6px')
      .style('border', 'none').style('cursor', 'pointer').style('font-weight', '600')
      .style('transition', 'all 0.15s').text(label)
      .on('click', () => { metric = val; updateToggle(); draw(); });
  }

  const btnLit = mkBtn('Alfabetizzazione', 'literacy');
  const btnOos = mkBtn('Fuori scuola',     'oos');

  function updateToggle() {
    const setActive = (btn, active) => btn
      .style('background', active ? '#4a6fa5' : 'transparent')
      .style('color',      active ? '#fff'    : '#7a8aaa')
      .style('box-shadow', active ? '0 1px 4px rgba(74,111,165,0.3)' : 'none');
    setActive(btnLit, metric === 'literacy');
    setActive(btnOos, metric === 'oos');
  }
  updateToggle();

  // ── Layout ────────────────────────────────────────────────
  const COLS = 1, ROWS = 2;
  const OUTER = { top: 10, right: 10, bottom: 10, left: 10 };
  const P_PAD = { top: 22, right: 60, bottom: 28, left: 44 };

  const W  = container.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 760);
  const H  = container.clientHeight || (isFullscreen ? window.innerHeight * 0.82 : 480);
  const iw = W - OUTER.left - OUTER.right;
  const ih = H - OUTER.top  - OUTER.bottom;

  const panelW = iw / COLS;
  const panelH = ih / ROWS;
  const pw     = panelW - P_PAD.left - P_PAD.right;
  const ph     = panelH - P_PAD.top  - P_PAD.bottom;

  const svg = d3.select(container).append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('height', '100%').style('display', 'block')
    .style('background', '#fff');

  const root = svg.append('g').attr('transform', `translate(${OUTER.left},${OUTER.top})`);

  // ── Tooltip ───────────────────────────────────────────────
  let tipEl = document.getElementById('lit-sm-tip');
  if (!tipEl) {
    tipEl = document.createElement('div'); tipEl.id = 'lit-sm-tip';
    Object.assign(tipEl.style, {
      position: 'fixed', display: 'none', pointerEvents: 'none',
      background: 'rgba(20,20,40,0.92)', color: '#fff',
      padding: '7px 12px', borderRadius: '5px', fontSize: '11px',
      lineHeight: '1.6', zIndex: '10000', whiteSpace: 'nowrap',
    });
    document.body.appendChild(tipEl);
  }

  function fmtVal(v) {
    if (v == null) return 'n/d';
    if (metric === 'literacy') return `${v.toFixed(1)}%`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
    return v.toFixed(0);
  }

  // crosshair elements — created once, reused across redraws
  const hoverG    = svg.append('g').style('pointer-events', 'none').style('opacity', 0);
  const hoverLine = hoverG.append('line')
    .attr('stroke', '#999').attr('stroke-width', 1).attr('stroke-dasharray', '4,3');

  // dots per panel (2 panels × mean dot)
  const hoverDots = CONT_ORDER.map(() => hoverG.append('circle').attr('r', 4).attr('fill', '#fff').attr('stroke-width', 2));

  function draw() {
    root.selectAll('.panel').remove();
    root.selectAll('.legend').remove();

    const { countByContinent, statsByContinent, xDomain } = metric === 'literacy' ? litStats : oosStats;
    const isLit = metric === 'literacy';

    let oosGlobalMax = 1;
    if (!isLit) {
      statsByContinent.forEach(pts => {
        const m = d3.max(pts, d => d.hi) || 0;
        if (m > oosGlobalMax) oosGlobalMax = m;
      });
    }

    // clamp to 2022
    const xS = d3.scaleLinear().domain([xDomain[0], Math.min(xDomain[1], 2022)]).range([0, pw]);
    const allYears = [...new Set([...litRaw, ...oosRaw].map(d => d.year))].sort(d3.ascending);
    const bisect   = d3.bisector(d => d).left;

    // per-panel yS and stats (needed for crosshair)
    const panelInfo = [];

    CONT_ORDER.forEach((continent, idx) => {
      const col   = idx % COLS;
      const row   = Math.floor(idx / COLS);
      const tx    = col * panelW + P_PAD.left;
      const ty    = row * panelH + P_PAD.top;
      const color = CONT_COLOR[continent];
      const isHi  = highlightContinent === continent;
      const isDim = highlightContinent && !isHi;
      const stats = statsByContinent.get(continent) || [];
      const n     = countByContinent.get(continent) || 0;

      const yS = isLit
        ? d3.scaleLinear().domain([0, 100]).range([ph, 0])
        : d3.scaleLinear().domain([0, oosGlobalMax * 1.05]).range([ph, 0]).nice();

      panelInfo.push({ continent, color, stats, xS, yS, tx, ty });

      const pg = root.append('g').attr('class', 'panel')
        .attr('transform', `translate(${tx},${ty})`);

      pg.append('rect')
        .attr('x', -P_PAD.left + 2).attr('y', -P_PAD.top + 2)
        .attr('width', panelW - 4).attr('height', panelH - 4)
        .attr('fill', isHi ? `${color}08` : 'none')
        .attr('stroke', 'none');


      if (!stats.length) return;

      const tickFmt = isLit
        ? d => `${d}%`
        : d => d >= 1e6 ? `${d / 1e6 | 0}M` : d >= 1e3 ? `${d / 1e3 | 0}k` : d;

      yS.ticks(3).forEach(t => {
        pg.append('line').attr('x1', 0).attr('x2', pw)
          .attr('y1', yS(t)).attr('y2', yS(t))
          .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
      });

      pg.append('g').attr('transform', `translate(0,${ph})`)
        .call(d3.axisBottom(xS).tickValues(d3.range(2000, 2023, 5)).tickFormat(d3.format('d')))
        .call(ax => {
          ax.select('.domain').remove();
          ax.selectAll('.tick text').attr('font-size', 7.5).attr('fill', '#bbb');
          ax.selectAll('.tick line').remove();
        });

      pg.append('g')
        .call(d3.axisLeft(yS).ticks(3).tickFormat(tickFmt))
        .call(ax => {
          ax.select('.domain').remove();
          ax.selectAll('.tick text').attr('font-size', 7.5).attr('fill', '#bbb');
          ax.selectAll('.tick line').remove();
        });

      const areaFn = d3.area()
        .x(d => xS(d.year)).y0(d => yS(d.lo)).y1(d => yS(d.hi))
        .curve(d3.curveMonotoneX).defined(d => d.mean != null);

      const lineFn = d3.line()
        .x(d => xS(d.year)).y(d => yS(d.mean))
        .curve(d3.curveMonotoneX).defined(d => d.mean != null);

      const drawStats = stats.filter(d => d.year <= 2022);

      pg.append('path').datum(drawStats)
        .attr('fill', color).attr('opacity', isDim ? 0.05 : 0.18)
        .attr('d', areaFn).style('pointer-events', 'none');

      pg.append('path').datum(drawStats)
        .attr('fill', 'none').attr('stroke', color)
        .attr('stroke-width', isDim ? 1.5 : 2.2)
        .attr('opacity', isDim ? 0.2 : 0.9)
        .attr('d', lineFn).style('pointer-events', 'none');

      const clampedStats = stats.filter(d => d.year <= 2022);
      const last = clampedStats[clampedStats.length - 1];
      if (last && !isDim) {
        pg.append('text')
          .attr('x', xS(last.year) + 5).attr('y', yS(last.mean))
          .attr('font-size', 9).attr('fill', color).attr('font-weight', '700')
          .attr('dominant-baseline', 'middle')
          .style('pointer-events', 'none')
          .text(continent);
      }

      // ±1σ band annotation — only first panel, in upper part of band
      if (idx === 0 && !isDim && stats.length) {
        const midIdx  = Math.floor(stats.length * 0.25);
        const midPt   = stats[midIdx];
        if (midPt) {
          const annX = xS(midPt.year);
          const annY = yS(midPt.hi) + 10;
          pg.append('text')
            .attr('x', annX).attr('y', annY)
            .attr('text-anchor', 'middle').attr('font-size', 8)
            .attr('fill', color).attr('opacity', 0.55)
            .attr('font-style', 'italic').style('pointer-events', 'none')
            .text('banda = deviazione standard (±1σ)');
        }
      }
    });

    // ── Crosshair overlay ────────────────────────────────────
    // Update dot colors
    CONT_ORDER.forEach((cont, i) => hoverDots[i].attr('stroke', CONT_COLOR[cont]));

    // Overlay rect spanning all panels
    root.selectAll('.hover-overlay').remove();
    root.append('rect').attr('class', 'hover-overlay')
      .attr('x', P_PAD.left).attr('y', OUTER.top)
      .attr('width', pw).attr('height', ih)
      .attr('fill', 'none').style('pointer-events', 'all').style('cursor', 'crosshair')
      .on('mousemove', function(event) {
        const [mx, my] = d3.pointer(event, root.node());
        const xVal = xS.invert(mx - P_PAD.left);

        let idx = bisect(allYears, xVal);
        if (idx >= allYears.length) idx = allYears.length - 1;
        const year = idx === 0 ? allYears[0]
          : (Math.abs(allYears[idx] - xVal) < Math.abs(allYears[idx - 1] - xVal) ? allYears[idx] : allYears[idx - 1]);

        const lineX = P_PAD.left + xS(year) + OUTER.left;

        hoverG.style('opacity', 1);
        hoverLine
          .attr('x1', lineX).attr('x2', lineX)
          .attr('y1', OUTER.top + P_PAD.top - 8)
          .attr('y2', OUTER.top + ih - P_PAD.bottom + 8);

        // dots + tooltip content
        let tipHtml = `<span style="color:#aaa;font-size:10px">${year}</span>`;
        panelInfo.forEach(({ continent, color, stats, yS, tx, ty }, i) => {
          const pt = stats.find(d => d.year === year);
          if (pt) {
            const dotY = OUTER.top + ty + yS(pt.mean);
            hoverDots[i].attr('cx', lineX).attr('cy', dotY).style('display', null);
            tipHtml += `<br><span style="color:${color}">●</span> <strong>${continent}</strong>: ${fmtVal(pt.mean)}`;
          } else {
            hoverDots[i].style('display', 'none');
            tipHtml += `<br><span style="color:${color}">●</span> <strong>${continent}</strong>: n/d`;
          }
        });

        tipEl.innerHTML = tipHtml;
        let tx2 = event.clientX + 14, ty2 = event.clientY - 36;
        if (tx2 + 220 > window.innerWidth) tx2 = event.clientX - 234;
        tipEl.style.left = tx2 + 'px'; tipEl.style.top = ty2 + 'px';
        tipEl.style.display = 'block';
      })
      .on('mouseleave', () => {
        hoverG.style('opacity', 0);
        tipEl.style.display = 'none';
      });
  }

  draw();

  container._exclusionShowBase   = () => { highlightContinent = null;     draw(); };
  container._exclusionOverlayGPI = () => { highlightContinent = 'Africa'; draw(); };
  container._exclusionShowTrend  = () => { highlightContinent = 'Europe'; draw(); };
}
