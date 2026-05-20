/* ============================================================
   Grafico 4-3 (Atto III) — Bar + trend line mortalità per continente
   Metric toggle: materna | infantile
   ============================================================ */
async function renderMortalityChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const CONT_ORDER = ['Africa', 'Europe'];
  const CONT_COLOR = { Africa: '#e07b39', Europe: '#5aab6e' };

  const [maternalRaw, childRaw] = await Promise.all([
    d3.csv('datasets/processed/maternal_mortality.csv', d3.autoType),
    d3.csv('datasets/processed/child_mortality.csv', d3.autoType),
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

  const maternalGrouped = buildGrouped(maternalRaw);
  const childGrouped    = buildGrouped(childRaw);

  let metric = 'maternal';

  // Tooltip
  const tip = d3.select('body').selectAll('.mortality-tip').data([0]).join('div')
    .attr('class', 'mortality-tip')
    .style('position', 'fixed').style('pointer-events', 'none')
    .style('background', 'rgba(20,20,40,0.92)').style('color', '#fff')
    .style('border-radius', '6px').style('padding', '7px 11px')
    .style('font-size', '11px').style('line-height', '1.6')
    .style('z-index', '10000').style('display', 'none');

  // ── Pill buttons — top-left ───────────────────────────────
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
      .on('click', () => { metric = val; updateBtns(); draw(); });
  }

  const btnM = mkBtn('Mortalità materna', 'maternal');
  const btnC = mkBtn('Mortalità infantile', 'child');

  function updateBtns() {
    const setActive = (btn, active) => btn
      .style('background', active ? '#4a6fa5' : 'transparent')
      .style('color',      active ? '#fff'    : '#7a8aaa')
      .style('box-shadow', active ? '0 1px 4px rgba(74,111,165,0.3)' : 'none');
    setActive(btnM, metric === 'maternal');
    setActive(btnC, metric === 'child');
  }
  updateBtns();

  const svgEl = d3.select(container).append('svg').style('display', 'block').style('width', '100%');

  // Compute 3-year rolling mean for trend line
  function rollingMean(years, contData, window = 3) {
    const half = Math.floor(window / 2);
    return years.map((y, i) => {
      const lo = Math.max(0, i - half), hi = Math.min(years.length - 1, i + half);
      const vals = years.slice(lo, hi + 1).map(yr => contData.get(yr)).filter(v => v != null);
      return { year: y, mean: vals.length ? d3.mean(vals) : null };
    }).filter(d => d.mean != null);
  }

  function draw() {
    svgEl.selectAll('*').remove();

    const { byYearCont, years } = metric === 'maternal' ? maternalGrouped : childGrouped;

    const W = container.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 760);
    const H = (container.clientHeight || (isFullscreen ? window.innerHeight * 0.82 : 480)) - 36;
    const margin = { top: 44, right: 20, bottom: 60, left: 64 };
    const iw = W - margin.left - margin.right;
    const ih = H - margin.top  - margin.bottom;

    svgEl.attr('width', W).attr('height', H);

    const g = svgEl.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xYear = d3.scaleBand().domain(years).range([0, iw]).padding(0.25);
    const xCont = d3.scaleBand().domain(CONT_ORDER).range([0, xYear.bandwidth()]).padding(0.1);

    const allVals = [];
    years.forEach(y => { const m = byYearCont.get(y); if (m) m.forEach(v => allVals.push(v)); });
    const yMax = d3.max(allVals) * 1.10;
    const yS = d3.scaleLinear().domain([0, yMax]).range([ih, 0]).nice();

    // Gridlines
    yS.ticks(6).forEach(t => {
      g.append('line')
        .attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t))
        .attr('stroke', t === 0 ? '#ccc' : '#f0f0f0').attr('stroke-width', t === 0 ? 1 : 1);
    });

    // Axes
    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xYear).tickSize(3))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('.tick text').attr('font-size', 9).attr('fill', '#aaa');
        ax.selectAll('.tick line').attr('stroke', '#dde3ef');
      });

    const unitLabel = metric === 'maternal' ? 'per 100k nati vivi' : 'per 1k nati vivi';
    g.append('g')
      .call(d3.axisLeft(yS).ticks(6).tickSize(4))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('.tick text').attr('font-size', 9).attr('fill', '#aaa');
        ax.selectAll('.tick line').attr('stroke', '#dde3ef');
      });

    g.append('text')
      .attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -52)
      .attr('text-anchor', 'middle').attr('font-size', 9.5).attr('fill', '#aaa')
      .text(unitLabel);

    // Bars
    years.forEach(year => {
      const contMap = byYearCont.get(year);
      if (!contMap) return;
      const yearG = g.append('g').attr('transform', `translate(${xYear(year)},0)`);

      CONT_ORDER.forEach(cont => {
        const val = contMap.get(cont);
        if (val == null) return;
        const bx = xCont(cont);
        const bw = xCont.bandwidth();
        const by = yS(val);
        const bh = ih - by;
        const col = CONT_COLOR[cont] || '#888';

        yearG.append('rect')
          .attr('x', bx).attr('y', by).attr('width', bw).attr('height', bh)
          .attr('fill', col).attr('rx', 2).attr('opacity', 0.7)
          .style('cursor', 'pointer')
          .on('mouseover', function(event) {
            d3.select(this).attr('opacity', 1);
            tip.style('display', 'block').html(
              `<strong style="color:${col}">${cont}</strong> · ${year}<br>` +
              `${metric === 'maternal' ? 'Mortalità materna' : 'Mortalità infantile'}: ` +
              `<strong>${d3.format(',.1f')(val)}</strong> ${unitLabel}`
            );
          })
          .on('mousemove', event => {
            tip.style('left', (event.clientX + 14) + 'px').style('top', (event.clientY - 28) + 'px');
          })
          .on('mouseleave', function() {
            d3.select(this).attr('opacity', 0.7);
            tip.style('display', 'none');
          });
      });
    });

    // Trend lines — 3-year rolling mean per continent
    const lineFn = d3.line()
      .x(d => xYear(d.year) + xYear.bandwidth() / 2)
      .y(d => yS(d.mean))
      .curve(d3.curveMonotoneX)
      .defined(d => d.mean != null);

    CONT_ORDER.forEach(cont => {
      const contYearMap = new Map(years.map(y => [y, byYearCont.get(y)?.get(cont)]));
      const trend = rollingMean(years, contYearMap);
      const col   = CONT_COLOR[cont] || '#888';

      g.append('path').datum(trend)
        .attr('fill', 'none')
        .attr('stroke', col)
        .attr('stroke-width', 2.2)
        .attr('stroke-dasharray', '6,3')
        .attr('opacity', 0.9)
        .attr('d', lineFn)
        .style('pointer-events', 'none');

      // End dot on trend line
      const last = trend[trend.length - 1];
      if (last) {
        g.append('circle')
          .attr('cx', xYear(last.year) + xYear.bandwidth() / 2)
          .attr('cy', yS(last.mean))
          .attr('r', 4)
          .attr('fill', col).attr('stroke', '#fff').attr('stroke-width', 1.5)
          .style('pointer-events', 'none');
      }
    });

    // ── Legend — CONTINENTE pill style ────────────────────────
    const LEG_ITEMS = CONT_ORDER.map(c => ({ col: CONT_COLOR[c], label: c }));
    const PAD = 8, HDR_H = 14, ROW_H = 16;
    const pillW = 130;
    // include continent rows + divider row + trend row
    const pillH = PAD + HDR_H + 4 + LEG_ITEMS.length * ROW_H + 6 + ROW_H + PAD;
    const LEG_X = iw, LEG_Y = 0;
    const legG = g.append('g').attr('transform', `translate(${LEG_X},${LEG_Y})`);
    legG.append('rect').attr('x', -pillW).attr('y', 0)
      .attr('width', pillW).attr('height', pillH)
      .attr('rx', 6).attr('fill', 'rgba(255,255,255,0.92)').attr('stroke', '#e0e0e0').attr('stroke-width', 1);
    legG.append('text')
      .attr('x', -pillW + 10).attr('y', PAD + 9)
      .attr('font-size', 8).attr('font-weight', '700').attr('fill', '#aaa')
      .attr('letter-spacing', '0.08em').style('pointer-events', 'none')
      .text('CONTINENTE');
    LEG_ITEMS.forEach((item, i) => {
      const ly = PAD + HDR_H + 4 + i * ROW_H;
      legG.append('circle').attr('cx', -pillW + 14).attr('cy', ly + 5).attr('r', 4)
        .attr('fill', item.col).attr('opacity', 0.85);
      legG.append('text').attr('x', -pillW + 23).attr('y', ly + 9)
        .attr('font-size', 9).attr('fill', '#555').style('pointer-events', 'none')
        .text(item.label);
    });

    // Divider
    const divY = PAD + HDR_H + 4 + LEG_ITEMS.length * ROW_H + 4;
    legG.append('line')
      .attr('x1', -pillW + 8).attr('x2', -8)
      .attr('y1', divY).attr('y2', divY)
      .attr('stroke', '#e8e8e8').attr('stroke-width', 1);

    // Trend line legend entry — inside pill
    const trendLy = divY + 6;
    legG.append('line')
      .attr('x1', -pillW + 8).attr('x2', -pillW + 22)
      .attr('y1', trendLy + 5).attr('y2', trendLy + 5)
      .attr('stroke', '#999').attr('stroke-width', 1.8).attr('stroke-dasharray', '4,2');
    legG.append('text').attr('x', -pillW + 26).attr('y', trendLy + 9)
      .attr('font-size', 8.5).attr('fill', '#888').style('pointer-events', 'none')
      .text('trend (media 3a)');
  }

  draw();

  container._mortalityScatter           = () => { metric = 'maternal'; updateBtns(); draw(); };
  container._mortalityHighlightMarriage = () => { metric = 'maternal'; updateBtns(); draw(); };
  container._mortalitySlope             = () => { metric = 'child';    updateBtns(); draw(); };
}
