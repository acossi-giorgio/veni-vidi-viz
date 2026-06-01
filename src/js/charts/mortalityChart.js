/* ============================================================
   Grafico 4-3 (Atto III) — FGM: spider + choropleth Africa
   ============================================================ */
async function renderMortalityChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;

  container.innerHTML = '';
  container.style.cssText += ';position:relative;font-family:inherit;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;';

  const UI_ACTIVE = getUiColor('controlActive', '#a44742');
  const UI_MUTED = getUiColor('controlMuted', '#f4efe7');
  const UI_MUTED_INK = getUiColor('controlMutedInk', '#75695d');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const CHART_GRID = getUiColor('chartGrid', '#e8e1d7');
  const CHART_AXIS = getUiColor('chartAxis', '#a49788');
  const CHART_LABEL = getUiColor('chartLabel', '#73675c');
  const CHART_PANEL = getUiColor('chartPanel', 'rgba(255,253,249,0.96)');
  const CHART_BASE = getUiColor('chartBaseFill', '#d6d0c5');
  const CHART_WATER = getUiColor('chartWater', '#ece8e0');
  const CHART_NODATA = getUiColor('chartNoDataFill', '#c3baad');
  const TOOLTIP_BG = getUiColor('chartTooltipBg', 'rgba(28, 25, 23, 0.94)');
  const TOOLTIP_INK = getUiColor('chartTooltipInk', '#fffdf8');
  const RISK_STOPS = getMetricStops('risk', ['#f4e3de', '#e5aea4', '#cf7669', '#aa4943', '#782826']);
  const HIGHLIGHT = shadeColor(UI_ACTIVE, 0.2);
  const MAX_SPIDER_VALUE = 25;

  const quintiles = [
    { key: 'poorest', label: 'Poorest' },
    { key: 'second', label: 'Second' },
    { key: 'middle', label: 'Middle' },
    { key: 'fourth', label: 'Fourth' },
    { key: 'richest', label: 'Richest' },
  ];

  const [rowsRaw, atlas, countryCodeRaw] = await Promise.all([
    d3.csv('datasets/processed/fgm_quintile_prevalence.csv', d3.autoType),
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json'),
    d3.csv('datasets/raw/country-code.csv', d3.autoType),
  ]);

  if (!Array.isArray(rowsRaw) || !rowsRaw.length) {
    container.innerHTML = '<p style="padding:20px;color:#999;">Dati FGM non disponibili.</p>';
    return;
  }

  const rows = rowsRaw
    .map((d) => {
      const parsed = { ...d };
      quintiles.forEach((q) => { parsed[q.key] = Number(parsed[q.key]); });
      parsed.quintile_mean = Number(parsed.quintile_mean);
      parsed.code = String(parsed.code || '').trim();
      parsed.country = String(parsed.country || '').trim();
      parsed.reference_year = String(parsed.reference_year || '').trim();
      return parsed;
    })
    .filter((d) => d.code && quintiles.every((q) => Number.isFinite(d[q.key])) && Number.isFinite(d.quintile_mean));

  if (!rows.length) {
    container.innerHTML = '<p style="padding:20px;color:#999;">Nessun valore numerico FGM disponibile.</p>';
    return;
  }

  const byCode = new Map(rows.map((d) => [d.code, d]));
  const maxMeanRow = rows.reduce((best, cur) => (cur.quintile_mean > best.quintile_mean ? cur : best), rows[0]);
  const globalMean = Object.fromEntries(
    quintiles.map((q) => [q.key, d3.mean(rows, (d) => d[q.key]) || 0]),
  );

  const countryMeta = countryCodeRaw
    .map((d) => ({
      code: String(d.Three_Letter_Country_Code || '').trim(),
      country: String(d.Country_Name || '').trim(),
      continent: String(d.Continent_Name || '').trim(),
      num: Number(d.Country_Number),
    }))
    .filter((d) => d.code && Number.isFinite(d.num));
  const numToCode = new Map(countryMeta.map((d) => [d.num, d.code]));
  numToCode.set(729, 'SDN');
  const africaCodes = new Set(countryMeta.filter((d) => d.continent === 'Africa').map((d) => d.code));
  const codeToName = new Map(countryMeta.map((d) => [d.code, d.country]));

  let mode = 'spider';
  let selectedCode = maxMeanRow.code;

  const tip = d3.select('body').selectAll('.fgm-tip').data([0]).join('div')
    .attr('class', 'fgm-tip')
    .style('position', 'fixed')
    .style('pointer-events', 'none')
    .style('display', 'none')
    .style('z-index', '10000')
    .style('background', TOOLTIP_BG)
    .style('color', TOOLTIP_INK)
    .style('border-radius', '6px')
    .style('padding', '7px 10px')
    .style('font-size', '11px')
    .style('line-height', '1.5')
    .style('box-shadow', '0 4px 18px rgba(0,0,0,0.25)');

  const stage = d3.select(container).append('div')
    .style('position', 'relative')
    .style('flex', '1 1 0')
    .style('min-height', '0')
    .style('overflow', 'hidden')
    .style('background', CHART_WATER);

  function showTooltip(event, html) {
    tip.html(html).style('display', 'block');
    const box = tip.node().getBoundingClientRect();
    let x = event.clientX + 12;
    let y = event.clientY + 12;
    if (x + box.width > window.innerWidth - 8) x = event.clientX - box.width - 14;
    if (y + box.height > window.innerHeight - 8) y = event.clientY - box.height - 14;
    tip.style('left', `${x}px`).style('top', `${y}px`);
  }

  function hideTooltip() {
    tip.style('display', 'none');
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
      ['Spider medio', 'spider'],
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

  function drawRadar(target, values, options = {}) {
    target.innerHTML = '';
    const rect = target.getBoundingClientRect();
    const W = Math.max(280, rect.width || 420);
    const H = Math.max(260, rect.height || 320);
    const compactRadar = W < 380 || H < 300;
    const isOverview = !options.compareValues;
    const maxValue = options.maxValue || MAX_SPIDER_VALUE;
    const levels = 5;
    const labelPad = compactRadar ? 18 : (isOverview ? 22 : 24);
    const sidePad = compactRadar ? 44 : (isOverview ? 70 : 54);
    const topPad = compactRadar ? 34 : (isOverview ? 46 : 40);
    const bottomPad = compactRadar ? 40 : (isOverview ? 62 : 46);
    const innerW = Math.max(140, W - sidePad * 2);
    const innerH = Math.max(140, H - topPad - bottomPad);
    const radius = Math.max(
      isOverview ? 132 : 86,
      Math.min(
        innerW / 2,
        innerH / 2,
        Math.min(W, H) * (compactRadar ? 0.37 : (isOverview ? 0.5 : 0.43))
      )
    );
    const cx = W * 0.5;
    const cy = topPad + innerH / 2;
    const angleStep = (Math.PI * 2) / quintiles.length;

    const svg = d3.select(target).append('svg')
      .attr('width', W)
      .attr('height', H)
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'block');

    const r = d3.scaleLinear().domain([0, maxValue]).range([0, radius]);
    const point = (q, i, source) => {
      const angle = angleStep * i;
      const value = Math.max(0, Math.min(maxValue, Number(source[q.key] || 0)));
      return {
        key: q.key,
        label: q.label,
        value: Number(source[q.key] || 0),
        x: cx + Math.sin(angle) * r(value),
        y: cy - Math.cos(angle) * r(value),
        angle,
      };
    };
    const pointsFor = (source) => quintiles.map((q, i) => point(q, i, source));
    const line = d3.line()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveLinearClosed);

    const ringColor = colorToRgba(CHART_GRID, 0.95, CHART_GRID);
    for (let i = 1; i <= levels; i += 1) {
      svg.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', (radius / levels) * i)
        .attr('fill', 'none')
        .attr('stroke', ringColor)
        .attr('stroke-width', 1);
    }

    if (isOverview) {
      [5, 10, 15, 20, 25].forEach((v) => {
        svg.append('text')
          .attr('x', cx + 5)
          .attr('y', cy - r(v) + 11)
          .attr('font-size', compactRadar ? 9 : 10)
          .attr('fill', CHART_AXIS)
          .text(`${v}%`);
      });
    }

    quintiles.forEach((q, i) => {
      const angle = angleStep * i;
      const x2 = cx + Math.sin(angle) * radius;
      const y2 = cy - Math.cos(angle) * radius;
      svg.append('line')
        .attr('x1', cx)
        .attr('y1', cy)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', CHART_GRID)
        .attr('stroke-width', 1);

      const lx = cx + Math.sin(angle) * (radius + labelPad);
      const ly = cy - Math.cos(angle) * (radius + labelPad);
      svg.append('text')
        .attr('x', lx)
        .attr('y', ly)
        .attr('text-anchor', Math.abs(Math.sin(angle)) < 0.25 ? 'middle' : (Math.sin(angle) > 0 ? 'start' : 'end'))
        .attr('dominant-baseline', Math.cos(angle) > 0.55 ? 'auto' : (Math.cos(angle) < -0.55 ? 'hanging' : 'middle'))
        .attr('font-size', compactRadar ? 10 : 11)
        .attr('font-weight', '700')
        .attr('fill', CHART_LABEL)
        .text(q.label);
    });

    if (options.compareValues) {
      svg.append('path')
        .datum(pointsFor(options.compareValues))
        .attr('d', line)
        .attr('fill', colorToRgba(CHART_LABEL, 0.06, CHART_LABEL))
        .attr('stroke', colorToRgba(CHART_LABEL, 0.7, CHART_LABEL))
        .attr('stroke-width', 1.4)
        .attr('stroke-dasharray', '4 3');
    }

    const pts = pointsFor(values);
    svg.append('path')
      .datum(pts)
      .attr('d', line)
      .attr('fill', colorToRgba(UI_ACTIVE, 0.22, UI_ACTIVE))
      .attr('stroke', HIGHLIGHT)
      .attr('stroke-width', 2.4)
      .attr('stroke-linejoin', 'round');

    svg.selectAll('.radar-point')
      .data(pts)
      .join('circle')
      .attr('class', 'radar-point')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', 4)
      .attr('fill', HIGHLIGHT)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.1)
      .on('mousemove', (event, d) => {
        showTooltip(event, `<strong>${d.label}</strong><br>${d.value.toFixed(1)}%`);
      })
      .on('mouseleave', hideTooltip);
  }

  function drawOverview() {
    stage.html('');
    stage.style('background', '#fffdf9');
    addModeSelector(stage);

    const radarWrap = stage.append('div')
      .style('position', 'absolute')
      .style('inset', '72px 12px 14px')
      .style('min-height', '0')
      .node();

    drawRadar(radarWrap, globalMean);
  }

  function drawLegendCard(svg, x, y, color, noDataPattern) {
    const rowsLegend = [
      { value: 80, color: color(80) },
      { value: 60, color: color(60) },
      { value: 40, color: color(40) },
      { value: 20, color: color(20) },
      { value: 0, color: color(0) },
    ];
    const sw = 15;
    const sh = 15;
    const rowH = 21;
    const cardW = 136;
    const cardH = 184;
    const leftPad = 16;
    const topPad = 15;
    const valueX = leftPad + sw + 8;
    const rowsTop = topPad + 27;
    const lg = svg.append('g').attr('transform', `translate(${x},${y})`);

    lg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', cardW)
      .attr('height', cardH)
      .attr('rx', 8)
      .attr('fill', 'rgba(255,255,255,0.94)')
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
      .text('FGM MEDIA');

    rowsLegend.forEach((row, i) => {
      const yy = rowsTop + i * rowH;
      lg.append('rect')
        .attr('x', leftPad)
        .attr('y', yy)
        .attr('width', sw)
        .attr('height', sh)
        .attr('rx', 3)
        .attr('fill', row.color);
      lg.append('text')
        .attr('x', valueX)
        .attr('y', yy + sh / 2)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 10)
        .attr('font-weight', '500')
        .attr('fill', CHART_LABEL)
        .text(`${row.value}%`);
    });

    const ndY = rowsTop + rowsLegend.length * rowH + 11;
    lg.append('rect')
      .attr('x', leftPad)
      .attr('y', ndY)
      .attr('width', sw)
      .attr('height', sh)
      .attr('rx', 3)
      .attr('fill', noDataPattern)
      .attr('stroke', UI_MUTED_BORDER)
      .attr('stroke-width', 0.5);
    lg.append('text')
      .attr('x', valueX)
      .attr('y', ndY + sh / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 10)
      .attr('font-weight', '500')
      .attr('fill', CHART_AXIS)
      .text('No data');
  }

  function getPopupRadarMax(localValues, compareValues) {
    const peak = d3.max(
      [localValues, compareValues]
        .flatMap((source) => quintiles.map((q) => Number(source?.[q.key])))
        .filter((value) => Number.isFinite(value) && value >= 0),
    ) || MAX_SPIDER_VALUE;

    const padded = peak <= 1 ? peak + 1 : peak * 1.08;
    const step = padded <= 5 ? 1 : padded <= 10 ? 2 : padded <= 25 ? 5 : padded <= 50 ? 10 : 20;
    return Math.max(step, Math.ceil(padded / step) * step);
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
      .style('background', '#fffdf9')
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
      .text(`Media quintili: ${row.quintile_mean.toFixed(1)}% | Anno: ${row.reference_year || 'n/d'}`);

    const radarWrap = popup.append('div')
      .style('min-height', '0')
      .style('padding', '0 10px 12px')
      .node();

    drawRadar(radarWrap, row, {
      compareValues: globalMean,
      maxValue: getPopupRadarMax(row, globalMean),
    });
  }

  function drawMapMode() {
    stage.html('');
    stage.style('background', CHART_WATER);
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
    const color = d3.scaleThreshold()
      .domain([20, 40, 60, 80])
      .range(RISK_STOPS);

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
      .attr('fill', CHART_WATER);

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
        return row ? color(row.quintile_mean) : noDataPattern;
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
        const name = row?.country || codeToName.get(code) || code || 'No data';
        if (!row) {
          showTooltip(event, `<strong>${name}</strong><br>FGM: <em>No data</em>`);
          return;
        }
        showTooltip(
          event,
          `<strong>${row.country}</strong><br>` +
            `Media quintili: <strong>${row.quintile_mean.toFixed(1)}%</strong><br>` +
            `Anno riferimento: ${row.reference_year || 'n/d'}`,
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
    const zoomScale = width < 720 ? 1.18 : 1.42;
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

    drawLegendCard(svg, width - 158, height - 204, color, noDataPattern);
  }

  function render() {
    if (mode === 'spider') drawOverview();
    else drawMapMode();
  }

  render();

  container._mortalityScatter = () => {
    mode = 'spider';
    render();
  };
  container._mortalityHighlightMarriage = () => {
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
