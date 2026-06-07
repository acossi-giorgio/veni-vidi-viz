/* ============================================================
   Grafico 1-2 (Atto I) — Gapminder: reddito × aspettativa di vita
   X = PIL pro capite (log/lin toggle), Y = aspettativa di vita, R = pop
   ============================================================ */
async function renderIncomeLifeExpectancyBubbleChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const CONT_COLOR = {
    'Africa': getContinentColor('Africa', '#c96a3d'),
    'Europe': getContinentColor('Europe', '#5169b2'),
  };
  const UI_ACTIVE = getUiColor('controlActive', '#5169b2');
  const UI_ACTIVE_STRONG = getUiColor('controlActiveStrong', '#314685');
  const UI_MUTED = getUiColor('controlMuted', '#f4efe7');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const UI_MUTED_INK = getUiColor('controlMutedInk', '#75695d');
  const CHART_GRID = getUiColor('chartGrid', '#e8e1d7');
  const CHART_AXIS = getUiColor('chartAxis', '#a49788');
  const CHART_LABEL = getUiColor('chartLabel', '#73675c');
  const TOOLTIP_BG = getUiColor('chartTooltipBg', 'rgba(28, 25, 23, 0.94)');
  const TOOLTIP_INK = getUiColor('chartTooltipInk', '#fffdf8');
  const BASE_PLAYER_H = 72;
  const EXCLUDED_CODES = new Set(['RUS']);

  const [incomeRows, lifeRows, popRows] = await Promise.all([
    d3.csv('datasets/processed/income.csv', d3.autoType),
    d3.csv('datasets/processed/life_expectancy.csv', d3.autoType),
    d3.csv('datasets/processed/population.csv', d3.autoType),
  ]);
  const incomeRaw = incomeRows.filter(d => d?.code && !EXCLUDED_CODES.has(d.code));
  const lifeRaw = lifeRows.filter(d => d?.code && !EXCLUDED_CODES.has(d.code));
  const popRaw = popRows.filter(d => d?.code && !EXCLUDED_CODES.has(d.code));

  function buildMap(raw) {
    const m = {};
    raw.forEach(d => {
      if (d.value == null) return;
      if (!m[d.year]) m[d.year] = {};
      m[d.year][d.code] = d.value;
    });
    return m;
  }

  const incomeMap = buildMap(incomeRaw);
  const lifeMap   = buildMap(lifeRaw);
  const popMap    = buildMap(popRaw);

  const codeContinent = {};
  incomeRaw.forEach(d => { if (d.code && d.continent) codeContinent[d.code] = d.continent; });
  lifeRaw.forEach(d => { if (d.code && d.continent && !codeContinent[d.code]) codeContinent[d.code] = d.continent; });

  const codeName = {};
  incomeRaw.forEach(d => { if (d.code && d.country) codeName[d.code] = d.country; });

  const continentUniverse = {
    Africa: new Set(),
    Europe: new Set(),
  };
  Object.entries(codeContinent).forEach(([code, continent]) => {
    if (continent === 'Africa' || continent === 'Europe') continentUniverse[continent].add(code);
  });

  const incomeYears = Object.keys(incomeMap).map(Number).sort((a, b) => a - b);
  const visibleYears = incomeYears.filter(y => y >= 2000 && y <= 2023);
  const YEAR_MIN = visibleYears[0];
  const YEAR_MAX = Math.min(2023, incomeYears[incomeYears.length - 1] || 2023);

  let currentYear = YEAR_MAX;
  let playing = false, playTimer = null;
  let highlightContinent = null;
  const rawW = container.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 760);
  const rawH = container.clientHeight || (isFullscreen ? window.innerHeight * 0.8 : 460);
  const compact = isFullscreen && (rawW < 760 || rawH < 420);
  const PLAYER_H = compact ? 64 : BASE_PLAYER_H;
  const W = rawW;
  const H = rawH - PLAYER_H;
  const MARGIN = compact ? { top: 22, right: 24, bottom: 34, left: 54 } : { top: 28, right: 40, bottom: 44, left: 72 };
  const iw = W - MARGIN.left - MARGIN.right;
  const ih = H - MARGIN.top  - MARGIN.bottom;

  const allIncome = incomeRaw.map(d => d.value).filter(v => v > 0);
  const allLife   = lifeRaw.map(d => d.value).filter(v => v > 0);
  const allPop    = popRaw.map(d => d.value).filter(v => v > 0);

  const incomeDomain = [d3.min(allIncome) * 0.8, d3.max(allIncome) * 1.2];
  const yS = d3.scaleLinear().domain([d3.min(allLife) - 2, d3.max(allLife) + 2]).range([ih, 0]);
  const rS = d3.scaleSqrt().domain([0, d3.max(allPop)]).range([2, 28]);
  const xS = d3.scaleLog().domain(incomeDomain).range([0, iw]).clamp(true);
  const xTicks = [500, 1000, 2000, 5000, 10000, 30000, 100000];

  // ── Chart SVG ────────────────────────────────────────────
  const chartDiv = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('width', '100%').style('height', `calc(100% - ${PLAYER_H}px)`);

  const svg = chartDiv.append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('height', '100%').style('display', 'block')
    .style('background', getCssToken('surface-raised', '#ffffff')).style('border-radius', '10px 10px 0 0')
    .style('font-family', 'Roboto Slab, serif');

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  // Gridlines
  const gridG = g.append('g');
  yS.ticks(6).forEach(t => gridG.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t)).attr('stroke', CHART_GRID).attr('stroke-width', 1));
  xTicks.forEach(t => {
    if (t < incomeDomain[0] || t > incomeDomain[1]) return;
    gridG.append('line')
      .attr('x1', xS(t)).attr('x2', xS(t))
      .attr('y1', 0).attr('y2', ih)
      .attr('stroke', CHART_GRID).attr('stroke-width', 1);
  });

  // Reference guides requested for quick reading on the X axis.
  const refG = g.append('g').attr('class', 'gapminder-x-reference');
  [
    { x: 0 },
    { x: xS(200) },
  ].forEach(ref => {
    refG.append('line')
      .attr('x1', ref.x).attr('x2', ref.x)
      .attr('y1', 0).attr('y2', ih)
      .attr('stroke', CHART_GRID)
      .attr('stroke-width', 1);
  });

  // Axes (X rebuilt on scale toggle)
  const xAxisG = g.append('g').attr('transform', `translate(0,${ih})`);
  const xLabelEl = g.append('text').attr('class', 'chart-axis-label').attr('x', iw / 2).attr('y', ih + (compact ? 30 : 36)).attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_AXIS);
  g.append('g').call(d3.axisLeft(yS).ticks(6)).call(ax => ax.select('.domain').remove()).attr('font-size', compact ? 8 : 9);
  g.append('text').attr('class', 'chart-axis-label').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -(compact ? 34 : 46)).attr('text-anchor', 'middle').attr('font-size', compact ? 9 : 10).attr('fill', CHART_AXIS).text('Life expectancy (years)');

  xAxisG.call(d3.axisBottom(xS).tickValues(xTicks).tickFormat(v => v >= 1000 ? `$${v/1000}k` : `$${v}`))
    .call(ax => ax.select('.domain').remove()).attr('font-size', compact ? 8 : 9);
  xLabelEl.text('GDP per capita (USD)');

  const bgHoverRect = g.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', iw)
    .attr('height', ih)
    .attr('fill', 'rgba(255,255,255,0.001)')
    .style('pointer-events', 'all');

  // ── Legend (bottom-right above player, choropleth style) ─
  const LEG_W = compact ? 96 : 120, LEG_H = compact ? 84 : 106;
  const legDiv = d3.select(container).append('div')
    .attr('class', 'chart-legend')
    .style('position', 'absolute')
    .style('bottom', (PLAYER_H + (compact ? 6 : 10)) + 'px').style('right', compact ? '8px' : '12px')
    .style('width', LEG_W + 'px').style('background', 'rgba(255,255,255,0.94)')
    .style('border', `1px solid ${UI_MUTED_BORDER}`).style('border-radius', '8px')
    .style('padding', compact ? '8px 9px' : '10px 12px').style('z-index', '15')
    .style('box-shadow', '0 1px 6px rgba(0,0,0,0.08)');

  legDiv.append('div').style('font-size', compact ? '7px' : '8px').style('font-weight', '700').style('color', CHART_AXIS).style('letter-spacing', '0.07em').style('text-transform', 'uppercase').style('margin-bottom', compact ? '4px' : '6px').text('Continente');

  ['Africa', 'Europe'].forEach(cont => {
    const row = legDiv.append('div').style('display', 'flex').style('align-items', 'center').style('gap', '6px').style('margin-bottom', '4px');
    row.append('div').style('width', '10px').style('height', '10px').style('border-radius', '50%').style('background', CONT_COLOR[cont]).style('flex-shrink', '0').style('opacity', '0.9');
    row.append('div')
      .style('font-size', compact ? '8px' : '9px')
      .style('font-weight', '600')
      .style('color', CONT_COLOR[cont])
      .text(cont);
  });

  legDiv.append('div').style('font-size', compact ? '7px' : '8px').style('font-weight', '700').style('color', CHART_AXIS).style('letter-spacing', '0.07em').style('text-transform', 'uppercase').style('margin-top', compact ? '6px' : '8px').style('margin-bottom', compact ? '4px' : '6px').text('Popolazione');

  (compact ? [5e6, 50e6] : [5e6, 50e6, 100e6]).forEach(p => {
    const row = legDiv.append('div').style('display', 'flex').style('align-items', 'center').style('gap', '6px').style('margin-bottom', '4px');
    const r = rS(p);
    const sz = Math.round(r * 2);
    row.append('div').style('width', sz + 'px').style('height', sz + 'px').style('border-radius', '50%')
      .style('border', `1.5px solid ${CHART_AXIS}`).style('flex-shrink', '0').style('box-sizing', 'border-box');
    row.append('div').style('font-size', compact ? '8px' : '9px').style('color', UI_MUTED_INK).text(p >= 1e6 ? `${(p/1e6).toFixed(0)}M` : p);
  });

  const backgroundBubblesG = g.append('g');
  const bubblesG = g.append('g');

  // Tooltip
  const tipEl = window.ensureHoverTooltip('income-life-tooltip');

  function getFrame(year) {
    const incomeYear = incomeMap[year] || {};
    const lifeYear = lifeMap[year] || {};
    const popYear = popMap[year] || {};

    return Object.keys(incomeYear).map(code => {
      const income = incomeYear[code];
      if (!income || income <= 0) return null;
      const cont = codeContinent[code];
      if (cont !== 'Africa' && cont !== 'Europe') return null;
      const lifeVal = lifeYear[code];
      const pop = popYear[code];
      if (lifeVal == null || pop == null) return null;
      return { code, country: codeName[code] || code, continent: cont, income, lifeVal, pop };
    }).filter(Boolean).sort((a, b) => b.pop - a.pop);
  }

  function getYearSummary(year) {
    const frame = getFrame(year);
    const byCont = d3.group(frame, d => d.continent);
    return ['Africa', 'Europe'].map((continent) => {
      const rows = byCont.get(continent) || [];
      return {
        continent,
        covered: rows.length,
        total: continentUniverse[continent]?.size || 0,
        meanIncome: rows.length ? d3.mean(rows, d => d.income) : null,
        meanLife: rows.length ? d3.mean(rows, d => d.lifeVal) : null,
        totalPopulation: rows.length ? d3.sum(rows, d => d.pop) : null,
      };
    });
  }

  function showTooltipAt(event, html) {
    window.showHoverTooltip(tipEl, event, html);
  }

  function formatPopulationTotal(value) {
    if (value == null || !Number.isFinite(value)) return 'N/D';
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)} mld`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)} M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)} k`;
    return d3.format(',.0f')(Math.round(value));
  }

  function getForegroundOpacity(d) {
    if (!highlightContinent) return 0.72;
    return d.continent === highlightContinent ? 0.9 : 0;
  }

  function syncBubbleLayerStyles(duration = 0) {
    const selection = bubblesG.selectAll('circle');
    const target = duration > 0
      ? selection.transition().duration(duration)
      : selection;
    target.attr('opacity', d => getForegroundOpacity(d));
  }

  function draw(animate) {
    const frame = getFrame(currentYear);
    const incomeYear = incomeMap[currentYear] || {};
    const eligibleCountries = Object.keys(incomeYear).filter((code) => {
      const cont = codeContinent[code];
      return cont === 'Africa' || cont === 'Europe';
    });
    const coverageCount = frame.length;
    const excludedCount = Math.max(0, eligibleCountries.length - coverageCount);
    const dur = animate ? 450 : 0;

    backgroundBubblesG.selectAll('circle').data(frame, d => d.code).join(
      enter => enter.append('circle')
        .attr('cx', d => xS(d.income)).attr('cy', d => yS(d.lifeVal)).attr('r', 0)
        .attr('fill', '#c9d2dc')
        .attr('opacity', 0.28)
        .attr('stroke', '#ffffff').attr('stroke-width', 0.35)
        .style('pointer-events', 'none'),
      update => update,
      exit => exit.transition().duration(dur).attr('r', 0).remove()
    ).transition().duration(dur)
      .attr('cx', d => xS(d.income)).attr('cy', d => yS(d.lifeVal)).attr('r', d => rS(d.pop))
      .attr('opacity', highlightContinent ? 0.22 : 0.18);

    bubblesG.selectAll('circle').data(frame, d => d.code).join(
      enter => enter.append('circle')
        .attr('cx', d => xS(d.income)).attr('cy', d => yS(d.lifeVal)).attr('r', 0)
        .attr('fill', d => CONT_COLOR[d.continent] || '#888')
        .attr('opacity', d => getForegroundOpacity(d))
        .attr('stroke', '#fff').attr('stroke-width', 0.5).style('cursor', 'pointer'),
      update => update,
      exit => exit.transition().duration(dur).attr('r', 0).remove()
    ).transition().duration(dur)
      .attr('cx', d => xS(d.income)).attr('cy', d => yS(d.lifeVal)).attr('r', d => rS(d.pop))
      .attr('opacity', d => getForegroundOpacity(d));

    bubblesG.selectAll('circle')
      .on('mouseover', function(event, d) {
        showTooltipAt(event, {
          title: d.country,
          meta: `Year: ${currentYear}`,
          rows: [
            { label: 'Income per capita', value: `$${d3.format(',.0f')(d.income)}` },
            { label: 'Life expectancy', value: `${d.lifeVal.toFixed(1)} years` },
            { label: 'Population', value: d3.format(',.0f')(d.pop) },
          ],
        });
        d3.select(this).attr('stroke', '#333').attr('stroke-width', 1.5);
      })
      .on('mousemove', (event, d) => {
        showTooltipAt(event, {
          title: d.country,
          meta: `Year: ${currentYear}`,
          rows: [
            { label: 'Income per capita', value: `$${d3.format(',.0f')(d.income)}` },
            { label: 'Life expectancy', value: `${d.lifeVal.toFixed(1)} years` },
            { label: 'Population', value: d3.format(',.0f')(d.pop) },
          ],
        });
      })
      .on('mouseleave', function() { window.hideHoverTooltip(tipEl); d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.5); });

    bgHoverRect
      .on('mousemove', (event) => {
        if (event.target !== bgHoverRect.node()) return;
        const summary = getYearSummary(currentYear);
        const html = [
          {
            title: 'Africa vs Europe',
            meta: `Year: ${currentYear}`,
            sections: summary.map((item) => ({
              title: item.continent,
              rows: [
                { label: 'Average income', value: item.meanIncome != null ? `$${d3.format(',.0f')(item.meanIncome)}` : 'N/A' },
                { label: 'Average life expectancy', value: item.meanLife != null ? `${item.meanLife.toFixed(1)} years` : 'N/A' },
                { label: 'Total population', value: formatPopulationTotal(item.totalPopulation) },
                { label: 'Data coverage', value: `${item.covered}/${item.total} countries` },
              ],
            })),
          },
        ][0];
        showTooltipAt(event, html);
      })
      .on('mouseleave', () => { window.hideHoverTooltip(tipEl); });

    sliderEl.property('value', currentYear);
    yearDisplay.text(currentYear);

    if (!frame.length) {
      const empty = chartDiv.selectAll('.gapminder-empty-state').data([0]).join('div')
        .attr('class', 'gapminder-empty-state')
        .style('position', 'absolute')
        .style('inset', '50% auto auto 50%')
        .style('transform', 'translate(-50%, -50%)')
        .style('padding', '10px 14px')
        .style('border', `1px solid ${UI_MUTED_BORDER}`)
        .style('border-radius', '10px')
        .style('background', 'rgba(255,255,255,0.95)')
        .style('box-shadow', '0 4px 16px rgba(0,0,0,0.10)')
        .style('font-size', compact ? '11px' : '12px')
        .style('line-height', '1.5')
        .style('color', UI_MUTED_INK);
      empty.html('No country has all three values in the same year for the selected frame.');
    } else {
      chartDiv.selectAll('.gapminder-empty-state').remove();
    }
  }

  // ── Player bar ────────────────────────────────────────────
  const playerBar = d3.select(container).append('div')
    .style('position', 'absolute').style('bottom', '0').style('left', '0').style('right', '0')
    .style('height', PLAYER_H + 'px').style('background', getCssToken('surface-raised', '#ffffff'))
    .style('border-radius', '0 0 10px 10px').style('border-top', `1px solid ${CHART_GRID}`)
    .style('display', 'flex').style('align-items', 'center')
    .style('padding', compact ? '0 10px' : '0 16px').style('gap', compact ? '10px' : '14px').style('z-index', '20')
    .style('box-shadow', '0 -2px 8px rgba(0,0,0,0.04)');

  const ctrlWrap = playerBar.append('div').style('display', 'flex').style('align-items', 'center').style('gap', '6px').style('flex-shrink', '0');

  function mkCtrlBtn(inner, title) {
    const iconVariant = inner.includes('8249') || inner.includes('8250')
      ? ' player-control-btn-icon--arrow'
      : inner.includes('8635')
        ? ' player-control-btn-icon--reset'
        : '';
    const btn = ctrlWrap.append('div').attr('title', title)
      .attr('role', 'button')
      .attr('tabindex', '0')
      .attr('class', 'player-control-btn')
      .style('width', compact ? '28px' : '30px').style('height', compact ? '28px' : '30px').style('border-radius', '50%')
      .style('border', `1px solid ${UI_MUTED_BORDER}`).style('background', UI_MUTED)
      .style('cursor', 'pointer').style('display', 'flex').style('align-items', 'center')
      .style('justify-content', 'center').style('color', UI_ACTIVE)
      .style('flex-shrink', '0').style('transition', 'all 0.15s').style('padding', '0').style('line-height', '1')
      .style('-webkit-appearance', 'none').style('appearance', 'none')
      .style('transform', 'none').style('outline', 'none')
      .style('-webkit-tap-highlight-color', 'transparent')
      .html(`<span class="player-control-btn-icon${iconVariant}">${inner}</span>`);
    btn.on('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        btn.dispatch('click');
      }
    });
    return btn;
  }

  mkCtrlBtn('&#8635;', 'Reset').on('click', () => { stopPlay(); currentYear = YEAR_MIN; draw(false); });
  mkCtrlBtn('&#8249;', 'Previous').style('font-size', '18px').on('click', () => {
    stopPlay(); const i = visibleYears.indexOf(currentYear);
    if (i > 0) { currentYear = visibleYears[i - 1]; draw(false); }
  });

  const btnPlay = ctrlWrap.append('button')
    .attr('class', 'player-control-btn')
    .style('width', compact ? '32px' : '36px').style('height', compact ? '32px' : '36px').style('border-radius', '50%')
    .style('border', 'none').style('background', UI_ACTIVE).style('cursor', 'pointer')
    .style('display', 'flex').style('align-items', 'center').style('justify-content', 'center')
    .style('color', '#fff').style('flex-shrink', '0').style('padding', '0').style('line-height', '1')
    .style('box-shadow', '0 2px 8px rgba(74,111,165,0.4)').style('transition', 'all 0.15s')
    .html('<span class="player-play-icon"><svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="1,0 11,7 1,14"/></svg></span>')
    .on('click', () => playing ? stopPlay() : startPlay());

  mkCtrlBtn('&#8250;', 'Next').style('font-size', '18px').on('click', () => {
    stopPlay(); const i = visibleYears.indexOf(currentYear);
    if (i < visibleYears.length - 1) { currentYear = visibleYears[i + 1]; draw(false); }
  });

  function startPlay() {
    playing = true;
    btnPlay.html('<span class="player-play-icon"><svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><rect x="0" y="0" width="3.5" height="14" rx="1"/><rect x="6.5" y="0" width="3.5" height="14" rx="1"/></svg></span>').style('background', CONT_COLOR.Africa);
    playTimer = setInterval(() => {
      currentYear = currentYear < YEAR_MAX ? visibleYears[visibleYears.indexOf(currentYear) + 1] : YEAR_MIN;
      draw(true);
    }, 600);
  }

  function stopPlay() {
    playing = false; clearInterval(playTimer); playTimer = null;
    btnPlay.html('<span class="player-play-icon"><svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="1,0 11,7 1,14"/></svg></span>').style('background', UI_ACTIVE);
  }

  const timelineWrap = playerBar.append('div').style('flex', '1').style('position', 'relative').style('padding', '0 4px');
  const labelRow = timelineWrap.append('div')
    .style('position', 'relative')
    .style('height', compact ? '11px' : '12px')
    .style('font-size', '8.5px')
    .style('color', CHART_AXIS)
    .style('margin-bottom', '2px')
    .style('pointer-events', 'none');

  const yearSpan = Math.max(1, YEAR_MAX - YEAR_MIN);
  const yearTicks = [];
  for (let y = YEAR_MIN; y <= YEAR_MAX; y += 1) {
    if ((y - YEAR_MIN) % 5 === 0 || y === YEAR_MAX) yearTicks.push(y);
  }

  yearTicks.forEach((y, idx) => {
    const pct = ((y - YEAR_MIN) / yearSpan) * 100;
    const tick = labelRow.append('span')
      .style('position', 'absolute')
      .style('left', `${pct}%`)
      .style('line-height', '1')
      .text(y);

    if (idx === 0) {
      tick.style('transform', 'translateX(0%)').style('text-align', 'left');
    } else if (idx === yearTicks.length - 1) {
      tick.style('transform', 'translateX(-100%)').style('text-align', 'right');
    } else {
      tick.style('transform', 'translateX(-50%)').style('text-align', 'center');
    }
  });

  const sliderEl = timelineWrap.append('input').attr('type', 'range')
    .attr('min', YEAR_MIN).attr('max', YEAR_MAX).attr('step', 1).attr('value', currentYear)
    .style('width', '100%').style('height', '4px').style('cursor', 'pointer')
    .style('accent-color', UI_ACTIVE).style('outline', 'none').style('display', 'block')
    .on('input', function() { stopPlay(); currentYear = +this.value; draw(false); });

  const yearDisplay = playerBar.append('div')
    .style('font-size', compact ? '20px' : '24px').style('font-weight', '700').style('color', UI_ACTIVE_STRONG)
    .style('min-width', compact ? '42px' : '54px').style('text-align', 'right').style('flex-shrink', '0')
    .style('letter-spacing', '-0.5px').text(currentYear);

  draw(false);

  // ── DOM API ───────────────────────────────────────────────
  container._gapminderPlay  = () => { if (!playing) startPlay(); };
  container._gapminderPause = stopPlay;
  container._gapminderReset = () => { stopPlay(); currentYear = YEAR_MAX; highlightContinent = null; draw(false); };
  container._gapminderAnimate = () => { stopPlay(); currentYear = YEAR_MIN; draw(false); startPlay(); };
  container._gapminderHighlightContinent = (c) => {
    highlightContinent = c;
    backgroundBubblesG.selectAll('circle').transition().duration(260).attr('opacity', c ? 0.22 : 0.18);
    syncBubbleLayerStyles(260);
  };
  container._gapminderSwitchY = () => {};
  container._getHelpContext = () => ({
    currentYear,
    playing,
    highlightContinent,
  });
}
