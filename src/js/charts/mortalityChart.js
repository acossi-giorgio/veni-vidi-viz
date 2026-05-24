/* ============================================================
   Grafico 4-3 (Atto III) — Dumbbell: mortalità Africa vs Europa
   Y = log scale  ·  segmento verticale per anno  ·  ratio ×N
   ============================================================ */
async function renderMortalityChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText += ';position:relative;font-family:inherit;display:flex;flex-direction:column;box-sizing:border-box;';

  const CONTS      = ['Africa', 'Europe'];
  const COLORS     = { Africa: '#e07b39', Europe: '#5aab6e' };

  const [maternalRaw, childRaw] = await Promise.all([
    d3.csv('datasets/processed/maternal_mortality.csv', d3.autoType),
    d3.csv('datasets/processed/child_mortality.csv',    d3.autoType),
  ]);

  function buildGrouped(raw) {
    const filtered = raw.filter(d =>
      d.value != null && d.value > 0 && d.year >= 2000 && d.year <= 2025 &&
      (d.continent === 'Africa' || d.continent === 'Europe')
    );
    const byYearCont = d3.rollup(filtered, v => d3.mean(v, d => d.value), d => d.year, d => d.continent);
    const years = [...new Set(filtered.map(d => d.year))].sort((a, b) => a - b);
    return { byYearCont, years };
  }

  const maternalData = buildGrouped(maternalRaw);
  const childData    = buildGrouped(childRaw);

  let metric = 'maternal';

  /* ── Tooltip ────────────────────────────────────────────── */
  const tip = d3.select('body').selectAll('.mortality-tip').data([0]).join('div')
    .attr('class', 'mortality-tip')
    .style('position', 'fixed').style('pointer-events', 'none')
    .style('background', 'rgba(20,20,40,0.92)').style('color', '#fff')
    .style('border-radius', '6px').style('padding', '7px 11px')
    .style('font-size', '11px').style('line-height', '1.6')
    .style('z-index', '10000').style('display', 'none');

  /* ── Top bar ────────────────────────────────────────────── */
  const topBar = d3.select(container).append('div')
    .style('display', 'flex').style('align-items', 'center')
    .style('padding', '8px 16px 4px').style('flex-shrink', '0');

  const pillBar = topBar.append('div')
    .style('display', 'flex').style('background', 'rgba(255,255,255,0.92)')
    .style('border-radius', '9px').style('border', '1px solid #d0d8e8')
    .style('padding', '3px').style('gap', '2px')
    .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)');

  function mkBtn(label, val) {
    return pillBar.append('button')
      .style('font-size', '11px').style('padding', '5px 14px').style('border-radius', '6px')
      .style('border', 'none').style('cursor', 'pointer').style('font-weight', '600')
      .style('transition', 'all 0.15s').text(label)
      .on('click', () => { metric = val; updateBtns(); draw(); });
  }

  const btnM = mkBtn('Mortalità materna',   'maternal');
  const btnC = mkBtn('Mortalità infantile', 'child');

  function updateBtns() {
    const set = (btn, active) => btn
      .style('background', active ? '#4a6fa5' : 'transparent')
      .style('color',      active ? '#fff'    : '#7a8aaa')
      .style('box-shadow', active ? '0 1px 4px rgba(74,111,165,0.3)' : 'none');
    set(btnM, metric === 'maternal');
    set(btnC, metric === 'child');
  }
  updateBtns();

  /* ── Viz container ──────────────────────────────────────── */
  const vizDiv = d3.select(container).append('div')
    .style('flex', '1 1 0').style('position', 'relative').style('min-height', '0');

  /* ── Legend bottom-right ────────────────────────────────── */
  const legDiv = vizDiv.append('div')
    .style('position', 'absolute').style('bottom', '52px').style('right', '16px')
    .style('display', 'flex').style('flex-direction', 'column').style('gap', '4px')
    .style('background', 'rgba(255,255,255,0.88)').style('border-radius', '6px')
    .style('padding', '6px 10px').style('pointer-events', 'none')
    .style('box-shadow', '0 1px 4px rgba(0,0,0,0.08)').style('z-index', '10');
  CONTS.forEach(c => {
    const row = legDiv.append('div').style('display','flex').style('align-items','center').style('gap','6px');
    row.append('div').style('width','10px').style('height','10px').style('border-radius','50%')
      .style('background', COLORS[c]).style('flex-shrink','0');
    row.append('span').style('font-size','11px').style('color','#555').text(c);
  });

  /* ── Draw ───────────────────────────────────────────────── */
  function draw() {
    vizDiv.selectAll('svg').remove();

    const W = container.clientWidth  || 700;
    const H = (vizDiv.node().clientHeight || 380);

    const margin = { top: 20, right: 56, bottom: 48, left: 60 };
    const iw = W - margin.left - margin.right;
    const ih = H - margin.top  - margin.bottom;

    const { byYearCont, years } = metric === 'maternal' ? maternalData : childData;
    const unitLabel = metric === 'maternal' ? 'per 100k nati vivi' : 'per 1k nati vivi';

    /* Collect paired values */
    const pairs = years.map(yr => {
      const m = byYearCont.get(yr);
      if (!m) return null;
      const a = m.get('Africa'), e = m.get('Europe');
      if (!a || !e) return null;
      return { year: yr, africa: a, europe: e, ratio: a / e };
    }).filter(Boolean);

    if (!pairs.length) return;

    /* Scales */
    const xBand  = d3.scaleBand().domain(pairs.map(d => d.year)).range([0, iw]).padding(0.45);
    const allVals = pairs.flatMap(d => [d.africa, d.europe]);
    const yS = d3.scaleLinear()
      .domain([0, d3.max(allVals) * 1.1])
      .range([ih, 0]).nice();

    const svg = vizDiv.append('svg').attr('width', W).attr('height', H)
      .style('display', 'block').style('font-family', 'inherit');
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    /* Grid */
    yS.ticks(5).forEach(t => {
      g.append('line').attr('x1', 0).attr('x2', iw)
        .attr('y1', yS(t)).attr('y2', yS(t))
        .attr('stroke', '#ececec').attr('stroke-width', 1);
    });

    /* Axes */
    const everyN = Math.ceil(pairs.length / 10);
    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xBand).tickValues(pairs.filter((_, i) => i % everyN === 0).map(d => d.year)).tickSize(3))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('text').attr('font-size', 9).attr('fill', '#aaa'); ax.selectAll('.tick line').remove(); });

    g.append('g')
      .call(d3.axisLeft(yS).ticks(6))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('text').attr('font-size', 9).attr('fill', '#aaa'); ax.selectAll('.tick line').remove(); });

    g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -46)
      .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#aaa')
      .text(unitLabel);

    /* Dumbbells */
    pairs.forEach(d => {
      const cx = xBand(d.year) + xBand.bandwidth() / 2;

      /* Segment — grows from Europe dot downward */
      g.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', yS(d.europe)).attr('y2', yS(d.europe))
        .attr('stroke', '#d8d8d8').attr('stroke-width', 1.5)
        .transition().duration(700).ease(d3.easeCubicOut)
        .attr('y2', yS(d.africa));

      /* Dots */
      CONTS.forEach(cont => {
        const val = cont === 'Africa' ? d.africa : d.europe;
        g.append('circle')
          .attr('cx', cx).attr('cy', yS(val)).attr('r', 0)
          .attr('fill', COLORS[cont]).attr('fill-opacity', 0)
          .style('cursor', 'default')
          .on('mousemove', e => {
            tip.style('display', 'block')
              .html(
                `<strong>${d.year}</strong><br>` +
                `<span style="color:${COLORS['Africa']}">● Africa</span>: <strong>${d.africa.toFixed(1)}</strong><br>` +
                `<span style="color:${COLORS['Europe']}">● Europe</span>: <strong>${d.europe.toFixed(1)}</strong><br>` +
                `<span style="color:#aaa;font-size:10px">${unitLabel}</span><br>` +
                `Rapporto: <strong>×${Math.round(d.ratio)}</strong>`
              )
              .style('left', (e.clientX + 14) + 'px').style('top', (e.clientY - 28) + 'px');
          })
          .on('mouseleave', () => tip.style('display', 'none'))
          .transition().duration(600).ease(d3.easeCubicOut)
          .attr('r', 5).attr('fill-opacity', 0.85);
      });
    });

    /* Ratio annotations — first and last */
    [pairs[0], pairs[pairs.length - 1]].forEach((d, idx) => {
      const cx   = xBand(d.year) + xBand.bandwidth() / 2;
      const midY = (yS(d.africa) + yS(d.europe)) / 2;
      const isFirst = idx === 0;
      const tx  = isFirst ? cx - xBand.step() * 0.35 : cx + xBand.step() * 0.35;

      g.append('text')
        .attr('x', tx).attr('y', midY + 4)
        .attr('text-anchor', isFirst ? 'end' : 'start')
        .attr('font-size', 10).attr('fill', '#999').attr('font-weight', '600')
        .text(`×${Math.round(d.ratio)}`);
    });
  }

  draw();

  container._mortalityScatter           = () => { metric = 'maternal'; updateBtns(); draw(); };
  container._mortalityHighlightMarriage = () => { metric = 'maternal'; updateBtns(); draw(); };
  container._mortalitySlope             = () => { metric = 'child';    updateBtns(); draw(); };
}
