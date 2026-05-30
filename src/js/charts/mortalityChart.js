/* ============================================================
   Grafico 4-3 (Atto III) — Line chart semplice
   Africa vs Europe nel tempo (toggle: materna/infantile)
   ============================================================ */
async function renderMortalityChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText += ';position:relative;font-family:inherit;display:flex;flex-direction:column;box-sizing:border-box;';

  const COLORS = {
    Africa: getContinentColor('Africa', '#c96a3d'),
    Europe: getContinentColor('Europe', '#5169b2'),
  };
  const UI_ACTIVE = getUiColor('controlActive', '#5169b2');
  const UI_MUTED_INK = getUiColor('controlMutedInk', '#75695d');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const CHART_GRID = getUiColor('chartGrid', '#e8e1d7');
  const CHART_AXIS = getUiColor('chartAxis', '#a49788');
  const TOOLTIP_BG = getUiColor('chartTooltipBg', 'rgba(28, 25, 23, 0.94)');
  const TOOLTIP_INK = getUiColor('chartTooltipInk', '#fffdf8');

  const [maternalRaw, childRaw] = await Promise.all([
    d3.csv('datasets/processed/maternal_mortality.csv', d3.autoType),
    d3.csv('datasets/processed/child_mortality.csv', d3.autoType),
  ]);

  function buildSeries(raw) {
    const filtered = raw.filter(d =>
      d.value != null && d.value > 0 && d.year >= 2000 && d.year <= 2025 &&
      (d.continent === 'Africa' || d.continent === 'Europe')
    );
    const byYearCont = d3.rollup(filtered, v => d3.mean(v, d => d.value), d => d.year, d => d.continent);
    const years = [...new Set(filtered.map(d => d.year))].sort((a, b) => a - b);
    return years.map(year => {
      const m = byYearCont.get(year);
      if (!m) return null;
      const africa = m.get('Africa');
      const europe = m.get('Europe');
      if (!africa || !europe) return null;
      return { year, africa, europe, ratio: africa / europe };
    }).filter(Boolean);
  }

  const maternalSeries = buildSeries(maternalRaw);
  const childSeries = buildSeries(childRaw);

  let metric = 'maternal';
  const compact = isFullscreen && (
    (container.clientWidth || window.innerWidth * 0.85) < 760 ||
    (container.clientHeight || window.innerHeight * 0.82) < 420
  );

  const tip = d3.select('body').selectAll('.mortality-tip').data([0]).join('div')
    .attr('class', 'mortality-tip')
    .style('position', 'fixed').style('pointer-events', 'none')
    .style('background', TOOLTIP_BG).style('color', TOOLTIP_INK)
    .style('border-radius', '6px').style('padding', '7px 11px')
    .style('font-size', '11px').style('line-height', '1.6')
    .style('z-index', '10000').style('display', 'none');

  const topBar = d3.select(container).append('div')
    .style('display', 'flex').style('align-items', 'center')
    .style('padding', compact ? '6px 10px 2px' : '8px 16px 4px').style('flex-shrink', '0');

  const pillBar = topBar.append('div')
    .style('display', 'flex').style('background', 'rgba(255,255,255,0.92)')
    .style('border-radius', compact ? '8px' : '9px').style('border', `1px solid ${UI_MUTED_BORDER}`)
    .style('padding', compact ? '2px' : '3px').style('gap', '2px')
    .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)');

  function mkBtn(label, val) {
    return pillBar.append('button')
      .style('font-size', compact ? '10px' : '11px').style('padding', compact ? '4px 10px' : '5px 14px').style('border-radius', compact ? '5px' : '6px')
      .style('border', 'none').style('cursor', 'pointer').style('font-weight', '600')
      .style('transition', 'all 0.15s').text(label)
      .on('click', () => { metric = val; updateBtns(); draw(); });
  }

  const btnM = mkBtn('Mortalità materna', 'maternal');
  const btnC = mkBtn('Mortalità infantile', 'child');

  function updateBtns() {
    const style = (btn, active) => btn
      .style('background', active ? UI_ACTIVE : 'transparent')
      .style('color', active ? '#fff' : UI_MUTED_INK)
      .style('box-shadow', active ? `0 1px 4px ${colorToRgba(UI_ACTIVE, 0.3)}` : 'none');
    style(btnM, metric === 'maternal');
    style(btnC, metric === 'child');
  }
  updateBtns();

  const vizDiv = d3.select(container).append('div')
    .style('flex', '1 1 0').style('position', 'relative').style('min-height', '0');

  const legDiv = vizDiv.append('div')
    .style('position', 'absolute').style('bottom', compact ? '38px' : '52px').style('right', compact ? '8px' : '16px')
    .style('display', 'flex').style('flex-direction', 'column').style('gap', '4px')
    .style('background', 'rgba(255,255,255,0.88)').style('border-radius', '6px')
    .style('padding', compact ? '4px 8px' : '6px 10px').style('pointer-events', 'none')
    .style('box-shadow', '0 1px 4px rgba(0,0,0,0.08)').style('z-index', '10');

  ['Africa', 'Europe'].forEach(c => {
    const row = legDiv.append('div').style('display', 'flex').style('align-items', 'center').style('gap', '6px');
    row.append('div').style('width', '10px').style('height', '10px').style('border-radius', '50%').style('background', COLORS[c]);
    row.append('span').style('font-size', compact ? '9px' : '11px').style('color', UI_MUTED_INK).text(c);
  });

  function draw() {
    vizDiv.selectAll('svg').remove();

    const series = metric === 'maternal' ? maternalSeries : childSeries;
    if (!series.length) return;
    const unitLabel = metric === 'maternal' ? 'per 100k nati vivi' : 'per 1k nati vivi';

    const W = container.clientWidth || 700;
    const H = vizDiv.node().clientHeight || 380;
    const margin = compact
      ? { top: 16, right: 18, bottom: 40, left: 52 }
      : { top: 20, right: 24, bottom: 48, left: 64 };
    const iw = W - margin.left - margin.right;
    const ih = H - margin.top - margin.bottom;

    const x = d3.scaleBand().domain(series.map(d => d.year)).range([0, iw]).padding(0.4);
    const y = d3.scaleLinear().domain([0, d3.max(series, d => Math.max(d.africa, d.europe)) * 1.1]).range([ih, 0]).nice();
    const everyN = Math.ceil(series.length / (compact ? 7 : 10));
    const xTicks = series.filter((_, i) => i % everyN === 0).map(d => d.year);
    const cx = d => x(d.year) + x.bandwidth() / 2;

    const svg = vizDiv.append('svg').attr('width', W).attr('height', H).style('display', 'block').style('font-family', 'inherit');
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    y.ticks(6).forEach(t => {
      g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', y(t)).attr('y2', y(t))
        .attr('stroke', CHART_GRID).attr('stroke-width', 1);
    });

    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(x).tickValues(xTicks).tickSize(3))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS);
        ax.selectAll('.tick line').remove();
      });

    g.append('g').call(d3.axisLeft(y).ticks(6))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('text').attr('font-size', compact ? 8 : 9).attr('fill', CHART_AXIS);
        ax.selectAll('.tick line').remove();
      });

    g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -50)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_AXIS)
      .text(unitLabel);

    const line = cont => d3.line()
      .x(d => cx(d))
      .y(d => y(cont === 'Africa' ? d.africa : d.europe))
      .curve(d3.curveMonotoneX);

    ['Africa', 'Europe'].forEach(cont => {
      g.append('path')
        .datum(series)
        .attr('fill', 'none')
        .attr('stroke', COLORS[cont])
        .attr('stroke-width', compact ? 2 : 2.4)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('d', line(cont));

      g.selectAll(`.pt-${cont}`).data(series).enter().append('circle')
        .attr('class', `pt-${cont}`)
        .attr('cx', d => cx(d))
        .attr('cy', d => y(cont === 'Africa' ? d.africa : d.europe))
        .attr('r', compact ? 3.3 : 4)
        .attr('fill', COLORS[cont]).attr('fill-opacity', 0.9)
        .attr('stroke', '#fff').attr('stroke-width', 1)
        .on('mousemove', (e, d) => {
          tip.style('display', 'block')
            .html(
              `<strong>${d.year}</strong><br>` +
              `<span style="color:${COLORS.Africa}">● Africa</span>: <strong>${d.africa.toFixed(1)}</strong><br>` +
              `<span style="color:${COLORS.Europe}">● Europe</span>: <strong>${d.europe.toFixed(1)}</strong><br>` +
              `<span style="color:${CHART_AXIS};font-size:10px">${unitLabel}</span><br>` +
              `Rapporto: <strong>×${d.ratio.toFixed(1)}</strong>`
            )
            .style('left', `${e.clientX + 14}px`)
            .style('top', `${e.clientY - 28}px`);
        })
        .on('mouseleave', () => tip.style('display', 'none'));
    });
  }

  draw();

  container._mortalityScatter = () => { metric = 'maternal'; updateBtns(); draw(); };
  container._mortalityHighlightMarriage = () => { metric = 'maternal'; updateBtns(); draw(); };
  container._mortalitySlope = () => { metric = 'child'; updateBtns(); draw(); };
}
