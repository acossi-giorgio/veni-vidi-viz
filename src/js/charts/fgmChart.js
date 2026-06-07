/* ============================================================
   Grafico 4-3 (Atto III) — FGM: barchart + choropleth Africa
   ============================================================ */
async function renderFgmChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;

  container.innerHTML = '';
  container.style.cssText += ';position:relative;font-family:inherit;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;width:100%;height:100%;min-width:0;min-height:0;align-items:stretch;justify-content:flex-start;';

  const UI_ACTIVE = getActColor(3, getUiColor('controlActive', '#525252'));
  const UI_MUTED = getUiColor('controlMuted', '#f4efe7');
  const UI_MUTED_INK = getUiColor('controlMutedInk', '#75695d');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const CHART_GRID = getUiColor('chartGrid', '#e8e1d7');
  const CHART_AXIS = getUiColor('chartAxis', '#a49788');
  const CHART_LABEL = getUiColor('chartLabel', '#73675c');
  const CHART_PANEL = getUiColor('chartPanel', 'rgba(255,253,249,0.96)');
  const CHART_BASE = getUiColor('chartBaseFill', '#d6d0c5');
  const CHART_WATER = '#ffffff';
  const CHART_NODATA = getUiColor('chartNoDataFill', '#c3baad');
  const TOOLTIP_BG = getUiColor('chartTooltipBg', 'rgba(28, 25, 23, 0.94)');
  const TOOLTIP_INK = getUiColor('chartTooltipInk', '#fffdf8');
  // Manteniamo una scala arancione esplicita per la choropleth FGM.
  const RISK_STOPS = ['#fff1df', '#fdc980', '#f59e42', '#e97817', '#b8550f'];
  const HIGHLIGHT = shadeColor(UI_ACTIVE, 0.2);
  const MAX_BAR_VALUE = 100;
  const OVERVIEW_MAX_BAR_VALUE = 25;
  const riskColor = d3.scaleThreshold()
    .domain([20, 40, 60, 80])
    .range(RISK_STOPS);

  const quintiles = [
    { key: 'poorest', label: 'Poorest' },
    { key: 'second', label: 'Second' },
    { key: 'middle', label: 'Middle' },
    { key: 'fourth', label: 'Fourth' },
    { key: 'richest', label: 'Richest' },
  ];
  const QUINTILE_COLORS = new Map([
    ['poorest', '#A25A43'],
    ['second', '#C07A4E'],
    ['middle', '#D4A24F'],
    ['fourth', '#91AF72'],
    ['richest', '#6F9DB7'],
  ]);
  const [rowsRaw, atlas, countryCodeRaw] = await Promise.all([
    d3.csv('datasets/processed/fgm_quintile_prevalence.csv', d3.autoType),
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json'),
    d3.csv('datasets/raw/country_codes_raw.csv', d3.autoType),
  ]);

  function normalizeCountryCodeRow(row) {
    const code = String(row['alpha-3'] || row.Three_Letter_Country_Code || '').trim();
    const region = String(row.region || row.Continent_Name || '').trim();
    const subRegion = String(row['sub-region'] || row.sub_region || '').trim();
    const country = String(row.name || row.Country_Name || '').trim();
    let continent = region;
    if (region === 'Americas') continent = subRegion === 'South America' ? 'South America' : 'North America';
    if (code === 'ATA' || country === 'Antarctica' || region === 'Antarctica') continent = 'Oceania';
    return {
      code,
      country,
      continent,
      num: Number(row['country-code'] || row.Country_Number),
    };
  }

  if (!Array.isArray(rowsRaw) || !rowsRaw.length) {
    container.innerHTML = '<p style="padding:20px;color:#999;">Dati FGM non disponibili.</p>';
    return;
  }

  function parseReferenceYearRange(value) {
    const matches = String(value || '').match(/\d{2,4}/g);
    if (!matches || !matches.length) return { label: '', start: null, end: null };

    let start = Number(matches[0]);
    if (start < 100) start += start <= 30 ? 2000 : 1900;

    let end = start;
    if (matches.length > 1) {
      let endRaw = Number(matches[matches.length - 1]);
      if (endRaw < 100) {
        end = Math.floor(start / 100) * 100 + endRaw;
        if (end < start) end += 100;
      } else {
        end = endRaw;
      }
    }

    return {
      label: start === end ? String(start) : `${start}-${end}`,
      start,
      end,
    };
  }

  const rows = rowsRaw
    .map((d) => {
      const parsed = { ...d };
      quintiles.forEach((q) => { parsed[q.key] = Number(parsed[q.key]); });
      parsed.quintile_mean = Number(parsed.quintile_mean);
      parsed.code = String(parsed.code || '').trim();
      parsed.country = String(parsed.country || '').trim();
      const refLabelRaw = String(parsed.reference_year || '').trim();
      const refRange = parseReferenceYearRange(refLabelRaw);
      parsed.reference_year = refRange.label || refLabelRaw;
      parsed.reference_year_start = Number.isFinite(Number(parsed.reference_year_start))
        ? Number(parsed.reference_year_start)
        : refRange.start;
      parsed.reference_year_end = Number.isFinite(Number(parsed.reference_year_end))
        ? Number(parsed.reference_year_end)
        : refRange.end;
      parsed.reference_year_max = parsed.reference_year_end;
      return parsed;
    })
    .filter((d) => d.code && quintiles.every((q) => Number.isFinite(d[q.key])) && Number.isFinite(d.quintile_mean));

  if (!rows.length) {
    container.innerHTML = '<p style="padding:20px;color:#999;">Nessun valore numerico FGM disponibile.</p>';
    return;
  }

  const latestYearMax = d3.max(rows.filter(d => Number.isFinite(d.reference_year_max)), d => d.reference_year_max) || 2024;
  const latestYearMin = latestYearMax - 9;
  const recentRows = rows.filter((d) => {
    const start = Number.isFinite(d.reference_year_start) ? d.reference_year_start : d.reference_year_max;
    const end = Number.isFinite(d.reference_year_end) ? d.reference_year_end : d.reference_year_max;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    return start <= latestYearMax && end >= latestYearMin;
  });
  if (typeof window.mountChartWarningHint === 'function') {
    window.mountChartWarningHint(container, `I dati mostrano l'ultimo anno campionato per ciascun paese. Le annate non sono perfettamente allineate, ma il grafico considera solo gli ultimi 10 anni, nel range ${latestYearMin}-${latestYearMax}.`);
  }
  if (!recentRows.length) {
    container.innerHTML = '<p style="padding:20px;color:#999;">Nessun valore FGM nel range recente disponibile.</p>';
    return;
  }

  const byCode = new Map(recentRows.map((d) => [d.code, d]));
  const maxMeanRow = recentRows.reduce((best, cur) => (cur.quintile_mean > best.quintile_mean ? cur : best), recentRows[0]);
  const globalMean = Object.fromEntries(
    quintiles.map((q) => [q.key, d3.mean(recentRows, (d) => d[q.key]) || 0]),
  );

  const countryMeta = countryCodeRaw
    .map(normalizeCountryCodeRow)
    .filter((d) => d.code && Number.isFinite(d.num));
  const numToCode = new Map(countryMeta.map((d) => [d.num, d.code]));
  numToCode.set(729, 'SDN');
  const africaCodes = new Set(countryMeta.filter((d) => d.continent === 'Africa').map((d) => d.code));
  const codeToName = new Map(countryMeta.map((d) => [d.code, d.country]));
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  let mode = 'bar';
  let selectedCode = maxMeanRow.code;
  let mapFocusAfrica = false;

  const tip = window.ensureHoverTooltip('fgm-hover-tooltip', { maxWidth: 'min(92vw, 20rem)' });

  const stage = d3.select(container).append('div')
    .style('position', 'relative')
    .style('flex', '1 1 0')
    .style('width', '100%')
    .style('min-height', '0')
    .style('overflow', 'hidden')
    .style('background', CHART_WATER);

  function showTooltip(event, html) {
    window.showHoverTooltip(tip, event, html, { offsetX: 12, offsetY: 12 });
  }

  function hideTooltip() {
    window.hideHoverTooltip(tip);
  }

  function getRiskColor(value) {
    return riskColor(Number.isFinite(value) ? value : 0);
  }

  function getQuintileColor(key) {
    return QUINTILE_COLORS.get(key) || HIGHLIGHT;
  }

  function addModeSelector(parent) {
    const tabs = parent.append('div')
      .style('position', 'absolute')
      .style('top', '16px')
      .style('left', '16px')
      .style('display', 'inline-flex')
      .style('gap', '4px')
      .style('padding', isFullscreen ? '3px' : '3px')
      .style('border', `1px solid ${UI_MUTED_BORDER}`)
      .style('background', 'rgba(255,255,255,0.92)')
      .style('border-radius', isFullscreen ? '9px' : '9px')
      .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)')
      .style('z-index', '20');

    [
      ['Bar chart medio', 'bar'],
      ['Mappa', 'map'],
    ].forEach(([label, value]) => {
      const active = mode === value;
      tabs.append('button')
        .text(label)
        .style('border', 'none')
        .style('cursor', 'pointer')
        .style('padding', isFullscreen ? '5px 14px' : '5px 14px')
        .style('border-radius', isFullscreen ? '6px' : '6px')
        .style('font-size', isFullscreen ? '11px' : '11px')
        .style('font-weight', '600')
        .style('background', active ? UI_ACTIVE : 'transparent')
        .style('color', active ? '#fff' : UI_MUTED_INK)
        .style('box-shadow', active ? `0 1px 4px ${colorToRgba(UI_ACTIVE, 0.3)}` : 'none')
        .on('click', () => {
          mode = value;
          render();
        });
    });
  }

  function drawBarChart(target, values, options = {}) {
    target.innerHTML = '';
    const rect = target.getBoundingClientRect();
    const W = Math.max(300, rect.width || 420);
    const H = Math.max(260, rect.height || 320);
    const showAxisLabels = Boolean(options.showAxisLabels);
    const isGrouped = Array.isArray(options.series) && options.series.length > 1;
    const series = isGrouped
      ? options.series
      : [{
          key: 'value',
          label: options.series?.[0]?.label || 'Media africana',
          color: HIGHLIGHT,
          variant: 'primary',
          values,
        }];
    const maxValue = options.maxValue || MAX_BAR_VALUE;
    const margin = {
      top: showAxisLabels ? 26 : 26,
      right: isGrouped ? 20 : 12,
      bottom: showAxisLabels ? 52 : 52,
      left: showAxisLabels ? 54 : 54,
    };
    const innerW = Math.max(160, W - margin.left - margin.right);
    const innerH = Math.max(140, H - margin.top - margin.bottom);

    const svg = d3.select(target).append('svg')
      .attr('width', W)
      .attr('height', H)
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'block');

    const chartG = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand()
      .domain(quintiles.map((q) => q.label))
      .range([0, innerW])
      .padding(isGrouped ? 0.06 : 0.08);

    const x1 = d3.scaleBand()
      .domain(series.map((s) => s.label))
      .range([0, x0.bandwidth()])
      .padding(0.02);

    const barWidthRatio = isGrouped ? 0.82 : 0.7;

    const y = d3.scaleLinear()
      .domain([0, maxValue])
      .nice()
      .range([innerH, 0]);

    chartG.append('g')
      .call(d3.axisLeft(y).ticks(Math.min(6, Math.max(4, Math.floor(innerH / 50)))).tickFormat((d) => `${d}%`))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('line').attr('stroke', CHART_GRID))
      .call((g) => g.selectAll('text').attr('fill', CHART_AXIS).attr('font-size', 10));

    chartG.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x0))
      .call((g) => g.select('.domain').attr('stroke', CHART_GRID))
      .call((g) => g.selectAll('line').remove())
      .call((g) => g.selectAll('text')
        .attr('fill', CHART_LABEL)
        .attr('font-size', 10)
        .attr('font-weight', '700'));

    if (showAxisLabels) {
      chartG.append('text')
        .attr('class', 'chart-axis-label-y')
        .attr('transform', `translate(${-margin.left + 12},${innerH / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle')
        .attr('font-size', 11)
        .attr('font-weight', 600)
        .attr('fill', CHART_AXIS)
        .text('Ragazze africane minori di 14 anni che hanno subito FGM (%)');

      chartG.append('text')
        .attr('class', 'chart-axis-label-x')
        .attr('x', innerW / 2)
        .attr('y', innerH + Math.max(34, margin.bottom - 10))
        .attr('text-anchor', 'middle')
        .attr('font-size', 11)
        .attr('font-weight', 600)
        .attr('fill', CHART_AXIS)
        .text('Quintile di reddito');
    }

    chartG.append('g')
      .call(d3.axisLeft(y).ticks(Math.min(6, Math.max(4, Math.floor(innerH / 50)))))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick text').remove())
      .call((g) => g.selectAll('.tick line').attr('x2', innerW).attr('stroke', colorToRgba(CHART_GRID, 0.9, CHART_GRID)));

    const groupedRows = quintiles.map((q) => ({
      quintile: q.label,
      quintileKey: q.key,
      values: series.map((s) => ({
        series: s.label,
        variant: s.variant || 'primary',
        value: Number(s.values?.[q.key] || 0),
      })),
    }));

    const groups = chartG.selectAll('.fgm-bar-group')
      .data(groupedRows)
      .join('g')
      .attr('class', 'fgm-bar-group')
      .attr('transform', (d) => `translate(${x0(d.quintile)},0)`);

    groups.selectAll('rect')
      .data((d) => d.values.map((entry) => ({ ...entry, quintile: d.quintile, quintileKey: d.quintileKey })))
      .join('rect')
      .attr('x', (d) => x1(d.series) + ((x1.bandwidth() * (1 - barWidthRatio)) / 2))
      .attr('y', innerH)
      .attr('width', x1.bandwidth() * barWidthRatio)
      .attr('height', 0)
      .attr('rx', 4)
      .attr('fill', (d) => {
        const base = getQuintileColor(d.quintileKey);
        if (!isGrouped) return base;
        return d.variant === 'reference' ? '#fffdf9' : base;
      })
      .attr('stroke', (d) => {
        if (!isGrouped || d.variant !== 'reference') return 'none';
        return getQuintileColor(d.quintileKey);
      })
      .attr('stroke-width', (d) => (isGrouped && d.variant === 'reference' ? 2 : 0))
      .attr('stroke-dasharray', (d) => (isGrouped && d.variant === 'reference' ? '6 4' : null))
      .on('mousemove', (event, d) => {
        const html = {
          title: d.quintile,
          rows: [
            { label: d.series, value: `${d.value.toFixed(1)}%` },
          ],
        };
        showTooltip(event, html);
      })
      .on('mouseleave', hideTooltip)
      .transition()
      .delay((d, i) => prefersReducedMotion ? 0 : i * 55)
      .duration(prefersReducedMotion ? 0 : 650)
      .ease(d3.easeCubicOut)
      .attr('y', (d) => y(Math.max(0, d.value)))
      .attr('height', (d) => Math.max(0, innerH - y(Math.max(0, d.value))));

    if (isGrouped) {
      const legend = svg.append('g')
        .attr('class', 'chart-legend chart-legend--svg')
        .attr('transform', `translate(${margin.left},8)`);

      series.forEach((s, i) => {
        const row = legend.append('g').attr('transform', `translate(${i * 130},0)`);
        row.append('rect')
          .attr('width', 12)
          .attr('height', 12)
          .attr('rx', 3)
          .attr('fill', s.variant === 'reference' ? '#fffdf9' : UI_ACTIVE)
          .attr('stroke', s.variant === 'reference' ? UI_ACTIVE : 'none')
          .attr('stroke-width', s.variant === 'reference' ? 2 : 0)
          .attr('stroke-dasharray', s.variant === 'reference' ? '6 4' : null);
        row.append('text')
          .attr('x', 18)
          .attr('y', 6)
          .attr('dominant-baseline', 'middle')
          .attr('font-size', 10)
          .attr('font-weight', '600')
          .attr('fill', CHART_LABEL)
          .text(s.variant === 'reference' ? `${s.label}` : `${s.label}`);
      });
    }
  }

  function drawOverview() {
    stage.html('');
    stage.style('background', '#ffffff');
    addModeSelector(stage);

    const chartWrap = stage.append('div')
      .style('position', 'absolute')
      .style('inset', '72px 12px 14px')
      .style('min-height', '0')
      .node();

    drawBarChart(chartWrap, globalMean, {
      series: [{
        label: 'Media africana',
        color: HIGHLIGHT,
        variant: 'primary',
        values: globalMean,
      }],
      maxValue: OVERVIEW_MAX_BAR_VALUE,
      showAxisLabels: true,
      coverage: {
        'Media africana': {
          covered: recentRows.length,
          total: africaCodes.size,
          label: 'Copertura media africana',
          includePercent: false,
        },
      },
    });
  }

  function drawLegendCard(svg, x, y, color, noDataPattern) {
    const rowsLegend = [
      { label: '80+', color: color(80) },
      { label: '79', color: color(60) },
      { label: '59', color: color(40) },
      { label: '39', color: color(20) },
      { label: '19', color: color(0) },
    ];
    const sw = 14;
    const sh = 14;
    const gap = 0;
    const stackH = rowsLegend.length * sh + (rowsLegend.length - 1) * gap;
    const cardW = 122;
    const cardH = 140;
    const leftPad = 14;
    const topPad = 12;
    const titleGap = 16;
    const noDataGap = 6;
    const valueX = leftPad + sw + 8;
    const rowsTop = topPad + titleGap;
    const lg = svg.append('g').attr('transform', `translate(${x},${y})`);

    lg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', cardW)
      .attr('height', cardH)
      .attr('rx', 8)
      .attr('fill', 'rgba(255,255,255,0.92)')
      .attr('stroke', UI_MUTED_BORDER)
      .attr('stroke-width', 1)
      .style('filter', 'drop-shadow(0 6px 14px rgba(17,15,12,0.08))');

    lg.append('text')
      .attr('x', leftPad)
      .attr('y', topPad)
      .attr('dominant-baseline', 'hanging')
      .attr('font-size', 8.5)
      .attr('font-weight', '700')
      .attr('fill', CHART_AXIS)
      .attr('letter-spacing', '0.04em')
      .text('FGM (%)');

    rowsLegend.forEach((row, i) => {
      const yy = rowsTop + i * (sh + gap);
      lg.append('rect')
        .attr('x', leftPad)
        .attr('y', yy)
        .attr('width', sw)
        .attr('height', sh)
        .attr('fill', row.color);
      lg.append('text')
        .attr('x', valueX)
        .attr('y', yy + sh / 2)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 9)
        .attr('font-weight', '500')
        .attr('fill', CHART_LABEL)
        .text(row.label);
    });

    const ndY = rowsTop + stackH + noDataGap;
    lg.append('rect')
      .attr('x', leftPad)
      .attr('y', ndY)
      .attr('width', sw)
      .attr('height', sh)
      .attr('rx', 2)
      .attr('fill', noDataPattern)
      .attr('stroke', UI_MUTED_BORDER)
      .attr('stroke-width', 0.5);
    lg.append('text')
      .attr('x', valueX)
      .attr('y', ndY + sh / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 9)
      .attr('font-weight', '500')
      .attr('fill', CHART_AXIS)
      .text('No data');
  }

  function drawCountryPopup(parent, row) {
    parent.selectAll('.fgm-country-popup').remove();
    const popup = parent.append('div')
      .attr('class', 'fgm-country-popup')
      .style('position', 'absolute')
      .style('left', '50%')
      .style('top', '50%')
      .style('transform', 'translate(-50%, -50%)')
      .style('width', 'min(420px, calc(100% - 32px))')
      .style('height', 'min(390px, calc(100% - 48px))')
      .style('background', '#ffffff')
      .style('border', `1px solid ${UI_MUTED_BORDER}`)
      .style('border-radius', '8px')
      .style('box-shadow', '0 18px 38px rgba(17,15,12,0.22)')
      .style('z-index', '30')
      .style('display', 'grid')
      .style('grid-template-rows', 'auto auto 1fr')
      .style('overflow', 'hidden');

    const head = popup.append('div')
      .style('display', 'flex')
      .style('align-items', 'start')
      .style('justify-content', 'space-between')
      .style('gap', '12px')
      .style('padding', '16px 16px 4px');

    head.append('div')
      .style('font-size', '17px')
      .style('font-weight', '700')
      .style('line-height', '1.2')
      .style('color', '#1f1d1a')
      .text(row.country);

    head.append('button')
      .attr('type', 'button')
      .attr('aria-label', 'Chiudi dettaglio paese')
      .text('×')
      .style('border', 'none')
      .style('background', 'transparent')
      .style('cursor', 'pointer')
      .style('font-size', '22px')
      .style('line-height', '1')
      .style('color', CHART_AXIS)
      .on('click', () => popup.remove());

    popup.append('div')
      .style('padding', '0 16px 4px')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('color', CHART_AXIS)
      .text(`Media quintili: ${row.quintile_mean.toFixed(1)}%`);
    
      popup.append('div')
      .style('padding', '0 16px 4px')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('color', CHART_AXIS)
      .text(`Anno: ${row.reference_year || 'n/d'}`);

    const chartWrap = popup.append('div')
      .style('min-height', '0')
      .style('padding', '0 10px 12px')
      .node();

    drawBarChart(chartWrap, row, {
      series: [
        { label: 'Paese selezionato', color: HIGHLIGHT, variant: 'primary', values: row },
        { label: 'Media africana', color: colorToRgba(CHART_LABEL, 0.7, CHART_LABEL), variant: 'reference', values: globalMean },
      ],
      maxValue: MAX_BAR_VALUE,
      coverage: {
        'Media africana': {
          covered: recentRows.length,
          total: africaCodes.size,
          label: 'Copertura media africana',
          includePercent: false,
        },
      },
    });
  }

  function drawInteractionNote(hostSelection, lines) {
    const noteCompact = (container.clientWidth || 0) < 720 || (container.clientHeight || 0) < 360;
    hostSelection.selectAll('.chart-interaction-note').remove();
    const note = hostSelection.append('div')
      .attr('class', 'chart-interaction-note')
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
      .html(lines.map(line => `
        <div style="display:flex;align-items:center;gap:${noteCompact ? '7px' : '9px'};">
          <span>${line.label}</span>
          <span style="color:${UI_MUTED_INK};font-size:${noteCompact ? '13px' : '15px'};line-height:1;">&rarr;</span>
          <span>${line.value}</span>
        </div>
      `).join(''));

    return note;
  }

  function drawMapMode() {
    stage.html('');
    stage.style('background', '#ffffff');
    hideTooltip();
    addModeSelector(stage);

    const rect = stage.node().getBoundingClientRect();
    const width = Math.max(360, rect.width || 760);
    const height = Math.max(300, rect.height || 500);

    const svg = stage.append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'block')
      .style('cursor', 'grab');

    const noDataPattern = ensureNoDataPattern(svg, `fgm-nodata-${isFullscreen ? 'fs' : 'ed'}`, {
      background: CHART_NODATA,
      stripe: getUiColor('chartNoDataStripe', shadeColor(CHART_NODATA, 0.24)),
    });

    const countries = topojson.feature(atlas, atlas.objects.countries).features;
    const projection = d3.geoNaturalEarth1()
      .fitExtent([[4, 8], [width - 4, height - 8]], { type: 'FeatureCollection', features: countries });
    const path = d3.geoPath(projection);
    const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
    const clipId = `fgm-map-clip-${isFullscreen ? 'fs' : 'ed'}`;
    defs.select(`#${clipId}`).remove();
    defs.append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('width', width)
      .attr('height', height);

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#ffffff');

    const mapGroup = svg.append('g').attr('clip-path', `url(#${clipId})`);
    const countryG = mapGroup.append('g');

    const paths = countryG.selectAll('path.country')
      .data(countries)
      .join('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.45)
      .attr('fill', (d) => {
        const code = numToCode.get(Number(d.id)) || '';
        if (!africaCodes.has(code)) return CHART_BASE;
        const row = byCode.get(code);
        return row ? getRiskColor(row.quintile_mean) : noDataPattern;
      })
      .attr('pointer-events', (d) => {
        const code = numToCode.get(Number(d.id)) || '';
        return africaCodes.has(code) ? 'all' : 'none';
      })
      .style('cursor', (d) => {
        const code = numToCode.get(Number(d.id)) || '';
        return byCode.has(code) ? 'pointer' : 'default';
      })
      .on('mousemove', (event, d) => {
        const code = numToCode.get(Number(d.id)) || '';
        const row = byCode.get(code);
        const name = row?.country || codeToName.get(code) || code || 'N/D';
        if (!row) {
          showTooltip(event, {
            title: name,
            rows: [{ label: 'FGM', value: 'N/D' }],
          });
          return;
        }
        showTooltip(
          event,
          {
            title: row.country,
            meta: `Anno: ${row.reference_year || 'N/D'}`,
            rows: [
              { label: 'Media quintili', value: `${row.quintile_mean.toFixed(1)}%` },
            ],
          },
        );
      })
      .on('mouseleave', hideTooltip)
      .on('click', (event, d) => {
        const code = numToCode.get(Number(d.id)) || '';
        const row = byCode.get(code);
        if (!row) return;
        selectedCode = code;
        paths
          .attr('stroke', '#fff')
          .attr('stroke-width', (f) => (numToCode.get(Number(f.id)) === selectedCode ? 1.7 : 0.45));
        drawCountryPopup(stage, row);
        event.stopPropagation();
      });

    const africaFeatures = countries.filter((d) => africaCodes.has(numToCode.get(Number(d.id)) || ''));
    const africaBounds = path.bounds({ type: 'FeatureCollection', features: africaFeatures });
    const africaCx = (africaBounds[0][0] + africaBounds[1][0]) / 2;
    const africaCy = (africaBounds[0][1] + africaBounds[1][1]) / 2;
    const zoomScale = mapFocusAfrica
      ? (width < 720 ? 1.7 : 2.0)
      : (width < 720 ? 1.18 : 1.42);
    const initialTransform = d3.zoomIdentity
      .translate(width / 2 - zoomScale * africaCx, height / 2 - zoomScale * africaCy + (width < 720 ? 4 : 10))
      .scale(zoomScale);

    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        mapGroup.attr('transform', event.transform);
        svg.style('cursor', 'grabbing');
      })
      .on('end', () => svg.style('cursor', 'grab'));

    svg
      .call(zoom)
      .call(zoom.transform, initialTransform)
      .on('click', () => stage.selectAll('.fgm-country-popup').remove());

    drawLegendCard(svg, width - 158, height - 204, getRiskColor, noDataPattern);
    drawInteractionNote(stage, [
      { label: 'Click sul paese', value: 'apre il dettaglio' },
    ]);
  }

  function render() {
    if (mode === 'bar') drawOverview();
    else drawMapMode();
  }

  render();

  container._mortalityScatter = () => {
    mode = 'bar';
    render();
  };
  container._mortalityHighlightMarriage = () => {
    mapFocusAfrica = true;
    mode = 'map';
    render();
  };
  
  container._mortalitySlope = () => {
    mode = 'map';
    if (!selectedCode) selectedCode = maxMeanRow.code;
    render();
  };
  container._getHelpContext = () => ({
    mode,
    selectedCountry: byCode.get(selectedCode)?.country || null,
  });
}
