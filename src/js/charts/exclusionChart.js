/* ============================================================
   Grafico 3-3 (Atto II) — Small multiples: alfabetizzazione o fuori scuola
   6 pannelli (uno per continente) — toggle tra i due dataset
   ============================================================ */
async function renderExclusionChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const CONT_COLOR = {
    'Africa': '#e07b39', 'Asia': '#4a90d9', 'Europe': '#5aab6e',
    'North America': '#a45dc0', 'Oceania': '#888888', 'South America': '#d4b84a',
  };
  const CONT_ORDER = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];

  // ── Load both datasets ────────────────────────────────────
  const [litRaw, oosRaw] = await Promise.all([
    d3.csv('datasets/processed/literacy.csv', d3.autoType),
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
        const lo   = clampPct ? Math.max(0,   mean - std) : Math.max(0, mean - std);
        const hi   = clampPct ? Math.min(100, mean + std) : mean + std;
        return { mean, lo, hi };
      }, d => d.year);
      statsByContinent.set(cont, Array.from(byYear, ([year, s]) => ({ year, ...s })).sort((a, b) => a.year - b.year));
    });

    return { countByContinent, statsByContinent, xDomain };
  }

  const litStats = buildStats(litRaw,  true);
  const oosStats = buildStats(oosRaw, false);

  // ── State ─────────────────────────────────────────────────
  let metric             = 'literacy'; // 'literacy' | 'oos'
  let highlightContinent = null;

  // ── Toggle buttons ────────────────────────────────────────
  const toggleWrap = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '6px').style('right', '8px')
    .style('display', 'flex').style('gap', '4px').style('z-index', '10');

  function mkBtn(label, val) {
    return toggleWrap.append('button')
      .style('font-size', '10px').style('padding', '2px 8px')
      .style('border-radius', '5px').style('cursor', 'pointer')
      .style('border', '1px solid #c8d4e8').style('background', 'rgba(255,255,255,0.92)')
      .style('color', '#4a6fa5').style('transition', 'all 0.15s')
      .text(label)
      .on('click', () => { metric = val; updateToggle(); draw(); });
  }

  const btnLit = mkBtn('Alfabetizzazione', 'literacy');
  const btnOos = mkBtn('Fuori scuola',     'oos');

  function updateToggle() {
    btnLit.style('font-weight', metric === 'literacy' ? '700' : '400')
          .style('background',  metric === 'literacy' ? '#e8eef7' : 'rgba(255,255,255,0.92)');
    btnOos.style('font-weight', metric === 'oos' ? '700' : '400')
          .style('background',  metric === 'oos' ? '#e8eef7' : 'rgba(255,255,255,0.92)');
  }
  updateToggle();

  // ── Layout ────────────────────────────────────────────────
  const COLS = 3, ROWS = 2;
  const OUTER = { top: 10, right: 10, bottom: 10, left: 10 };
  const P_PAD = { top: 22, right: 14, bottom: 28, left: 40 };

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
    .style('width', '100%').style('height', '100%').style('display', 'block');

  const root = svg.append('g').attr('transform', `translate(${OUTER.left},${OUTER.top})`);

  let tipEl = document.getElementById('lit-sm-tip');
  if (!tipEl) {
    tipEl = document.createElement('div'); tipEl.id = 'lit-sm-tip';
    Object.assign(tipEl.style, {
      position: 'fixed', display: 'none', pointerEvents: 'none',
      background: 'rgba(20,20,40,0.9)', color: '#fff',
      padding: '5px 10px', borderRadius: '5px', fontSize: '11px',
      lineHeight: '1.5', zIndex: '10000', whiteSpace: 'nowrap',
    });
    document.body.appendChild(tipEl);
  }

  function fmtVal(v) {
    if (metric === 'literacy') return `${v.toFixed(1)}%`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
    return v.toFixed(0);
  }

  function draw() {
    root.selectAll('.panel').remove();

    const { countByContinent, statsByContinent, xDomain } = metric === 'literacy' ? litStats : oosStats;
    const isLit = metric === 'literacy';

    // For OOS: global yMax across all continents (same axis everywhere)
    let oosGlobalMax = 1;
    if (!isLit) {
      statsByContinent.forEach(pts => {
        const m = d3.max(pts, d => d.hi) || 0;
        if (m > oosGlobalMax) oosGlobalMax = m;
      });
    }

    CONT_ORDER.forEach((continent, idx) => {
      const col   = idx % COLS;
      const row   = Math.floor(idx / COLS);
      const tx    = col * panelW + P_PAD.left;
      const ty    = row * panelH + P_PAD.top;
      const color = CONT_COLOR[continent] || '#888';
      const isHi  = highlightContinent === continent;
      const isDim = highlightContinent && !isHi;
      const stats = statsByContinent.get(continent) || [];
      const n     = countByContinent.get(continent) || 0;

      const pg = root.append('g').attr('class', 'panel')
        .attr('transform', `translate(${tx},${ty})`);

      pg.append('rect')
        .attr('x', -P_PAD.left + 2).attr('y', -P_PAD.top + 2)
        .attr('width', panelW - 4).attr('height', panelH - 4)
        .attr('fill', isHi ? `${color}08` : 'none')
        .attr('stroke', isHi ? color : '#e8e8e8')
        .attr('stroke-width', isHi ? 1.8 : 1).attr('rx', 4);

      pg.append('text')
        .attr('x', pw / 2).attr('y', -8)
        .attr('text-anchor', 'middle').attr('font-size', 10)
        .attr('font-weight', isHi ? '700' : '600')
        .attr('fill', isDim ? '#ccc' : color)
        .text(`${continent} (${n} paesi)`);

      if (!stats.length) return;

      const xS = d3.scaleLinear().domain(xDomain).range([0, pw]);
      const yS = isLit
        ? d3.scaleLinear().domain([0, 100]).range([ph, 0])
        : d3.scaleLinear().domain([0, oosGlobalMax * 1.05]).range([ph, 0]).nice();

      const tickFmt = isLit
        ? d => `${d}%`
        : d => d >= 1e6 ? `${d / 1e6 | 0}M` : d >= 1e3 ? `${d / 1e3 | 0}k` : d;

      // Gridlines
      yS.ticks(3).forEach(t => {
        pg.append('line').attr('x1', 0).attr('x2', pw)
          .attr('y1', yS(t)).attr('y2', yS(t))
          .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
      });

      // Axes
      pg.append('g').attr('transform', `translate(0,${ph})`)
        .call(d3.axisBottom(xS).ticks(3).tickFormat(d3.format('d')))
        .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick text').attr('font-size', 7.5).attr('fill', '#bbb'); ax.selectAll('.tick line').remove(); });

      pg.append('g')
        .call(d3.axisLeft(yS).ticks(3).tickFormat(tickFmt))
        .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick text').attr('font-size', 7.5).attr('fill', '#bbb'); ax.selectAll('.tick line').remove(); });

      const areaFn = d3.area()
        .x(d => xS(d.year)).y0(d => yS(d.lo)).y1(d => yS(d.hi))
        .curve(d3.curveMonotoneX).defined(d => d.mean != null);

      const lineFn = d3.line()
        .x(d => xS(d.year)).y(d => yS(d.mean))
        .curve(d3.curveMonotoneX).defined(d => d.mean != null);

      const aOpa = isDim ? 0.05 : 0.18;
      const lOpa = isDim ? 0.2  : 0.9;

      pg.append('path').datum(stats)
        .attr('fill', color).attr('opacity', aOpa)
        .attr('d', areaFn).style('pointer-events', 'none');

      pg.append('path').datum(stats)
        .attr('fill', 'none').attr('stroke', color)
        .attr('stroke-width', isDim ? 1.5 : 2.2)
        .attr('opacity', lOpa)
        .attr('d', lineFn)
        .style('cursor', 'pointer')
        .on('mouseover', () => {
          const last = stats[stats.length - 1];
          if (!last) return;
          tipEl.innerHTML = `<strong style="color:${color}">${continent}</strong><br>Media: ${fmtVal(last.mean)}<br>Range ±1σ: ${fmtVal(last.lo)} – ${fmtVal(last.hi)}`;
          tipEl.style.display = 'block';
        })
        .on('mousemove', ev => { tipEl.style.left = (ev.clientX + 14) + 'px'; tipEl.style.top = (ev.clientY - 28) + 'px'; })
        .on('mouseleave', () => tipEl.style.display = 'none');

      const last = stats[stats.length - 1];
      if (last && !isDim) {
        pg.append('text')
          .attr('x', xS(last.year) + 3).attr('y', yS(last.mean) + 3)
          .attr('font-size', 8).attr('fill', color).attr('font-weight', '700')
          .attr('opacity', 0.85).style('pointer-events', 'none')
          .text(fmtVal(last.mean));
      }
    });
  }

  draw();

  container._exclusionShowBase   = () => { highlightContinent = null;     draw(); };
  container._exclusionOverlayGPI = () => { highlightContinent = 'Africa'; draw(); };
  container._exclusionShowTrend  = () => { highlightContinent = 'Asia';   draw(); };
}
