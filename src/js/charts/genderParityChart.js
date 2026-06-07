/* ============================================================
   Grafico 3-2 — GPI gap di genere nell'istruzione secondaria
   Overview : dot strip Africa / Europe (X = GPI deviation da 1)
   Drill-down: barre verticali per paese, fascia di parità tra 0.97 e 1.03
               GPI < 0.97 → svantaggio per le bambine
               0.97 ≤ GPI ≤ 1.03 → situazione di parità
               GPI > 1.03 → svantaggio per i bambini
   ============================================================ */
async function renderGenderParityChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const COL = {
    Africa: getContinentColor('Africa', '#2a9d8f'),
    Europe: getContinentColor('Europe', '#4c78a8'),
  };
  const COL_GIRLS = '#7fc0f1';   // GPI < 1, invertito in azzurro pastello un po' piu acceso
  const COL_BOYS  = '#eb95c0';   // GPI > 1, invertito in rosa pastello un po' piu acceso
  const COL_PARITY = '#f3ddb3';
  const CHART_GRID = getUiColor('chartGrid', '#e8e1d7');
  const CHART_AXIS = getUiColor('chartAxis', '#a49788');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const TOOLTIP_BG = getUiColor('chartTooltipBg', 'rgba(28, 25, 23, 0.94)');
  const TOOLTIP_INK = getUiColor('chartTooltipInk', '#fffdf8');
  const INTERACTION_HINT = getUiColor('chartAxis', '#8a94a6');
  const CONTS = ['Europe', 'Africa'];
  const EUROPE_TOTAL_EXCLUDED = new Set(['AND', 'LIE', 'MCO', 'SMR']);
  const PARITY_MIN = 0.97;
  const PARITY_MAX = 1.03;

  function getGpiStatus(gpi) {
    if (gpi < PARITY_MIN) return 'girls';
    if (gpi > PARITY_MAX) return 'boys';
    return 'parity';
  }

  function getGpiStatusLabel(gpi) {
    const status = getGpiStatus(gpi);
    if (status === 'girls') return 'More girls excluded';
    if (status === 'boys') return 'More boys excluded';
    return 'Country in parity range';
  }

  function getGpiStatusColor(gpi, fallbackColor = COL_PARITY) {
    const status = getGpiStatus(gpi);
    if (status === 'girls') return COL_GIRLS;
    if (status === 'boys') return COL_BOYS;
    return fallbackColor;
  }

  const ALL_COUNTRIES = {
    Africa: [
      {code:'DZA',country:'Algeria'},{code:'AGO',country:'Angola'},{code:'BEN',country:'Benin'},
      {code:'BWA',country:'Botswana'},{code:'BFA',country:'Burkina Faso'},{code:'BDI',country:'Burundi'},
      {code:'CPV',country:'Cabo Verde'},{code:'CMR',country:'Cameroon'},{code:'CAF',country:'Central African Rep.'},
      {code:'TCD',country:'Chad'},{code:'COM',country:'Comoros'},{code:'COG',country:'Congo'},
      {code:'COD',country:'DR Congo'},{code:'DJI',country:'Djibouti'},{code:'EGY',country:'Egypt'},
      {code:'GNQ',country:'Equatorial Guinea'},{code:'ERI',country:'Eritrea'},{code:'SWZ',country:'Eswatini'},
      {code:'ETH',country:'Ethiopia'},{code:'GAB',country:'Gabon'},{code:'GMB',country:'Gambia'},
      {code:'GHA',country:'Ghana'},{code:'GIN',country:'Guinea'},{code:'GNB',country:'Guinea-Bissau'},
      {code:'CIV',country:"Cote d'Ivoire"},{code:'KEN',country:'Kenya'},{code:'LSO',country:'Lesotho'},
      {code:'LBR',country:'Liberia'},{code:'LBY',country:'Libya'},{code:'MDG',country:'Madagascar'},
      {code:'MWI',country:'Malawi'},{code:'MLI',country:'Mali'},{code:'MRT',country:'Mauritania'},
      {code:'MUS',country:'Mauritius'},{code:'MAR',country:'Morocco'},{code:'MOZ',country:'Mozambique'},
      {code:'NAM',country:'Namibia'},{code:'NER',country:'Niger'},{code:'NGA',country:'Nigeria'},
      {code:'RWA',country:'Rwanda'},{code:'STP',country:'Sao Tome and Pr.'},{code:'SEN',country:'Senegal'},
      {code:'SYC',country:'Seychelles'},{code:'SLE',country:'Sierra Leone'},{code:'SOM',country:'Somalia'},
      {code:'ZAF',country:'South Africa'},{code:'SSD',country:'South Sudan'},{code:'SDN',country:'Sudan'},
      {code:'TZA',country:'Tanzania'},{code:'TGO',country:'Togo'},{code:'TUN',country:'Tunisia'},
      {code:'UGA',country:'Uganda'},{code:'ZMB',country:'Zambia'},{code:'ZWE',country:'Zimbabwe'},
    ],
    Europe: [
      {code:'ALB',country:'Albania'},{code:'AND',country:'Andorra'},{code:'AUT',country:'Austria'},
      {code:'BEL',country:'Belgium'},{code:'BIH',country:'Bosnia and Herz.'},{code:'BGR',country:'Bulgaria'},
      {code:'BLR',country:'Belarus'},{code:'HRV',country:'Croatia'},{code:'CYP',country:'Cyprus'},
      {code:'CZE',country:'Czechia'},{code:'DNK',country:'Denmark'},{code:'EST',country:'Estonia'},
      {code:'FIN',country:'Finland'},{code:'FRA',country:'France'},{code:'DEU',country:'Germany'},
      {code:'GRC',country:'Greece'},{code:'HUN',country:'Hungary'},{code:'ISL',country:'Iceland'},
      {code:'IRL',country:'Ireland'},{code:'ITA',country:'Italy'},{code:'XKX',country:'Kosovo'},
      {code:'LVA',country:'Latvia'},{code:'LIE',country:'Liechtenstein'},{code:'LTU',country:'Lithuania'},
      {code:'LUX',country:'Luxembourg'},{code:'MLT',country:'Malta'},{code:'MDA',country:'Moldova'},
      {code:'MCO',country:'Monaco'},{code:'MNE',country:'Montenegro'},{code:'NLD',country:'Netherlands'},
      {code:'MKD',country:'North Macedonia'},{code:'NOR',country:'Norway'},{code:'POL',country:'Poland'},
      {code:'PRT',country:'Portugal'},{code:'ROU',country:'Romania'},{code:'RUS',country:'Russia'},
      {code:'SMR',country:'San Marino'},{code:'SRB',country:'Serbia'},{code:'SVK',country:'Slovakia'},
      {code:'SVN',country:'Slovenia'},{code:'ESP',country:'Spain'},{code:'SWE',country:'Sweden'},
      {code:'CHE',country:'Switzerland'},{code:'UKR',country:'Ukraine'},{code:'GBR',country:'United Kingdom'},
    ],
  };

  /* ── dati ───────────────────────────────────────────────── */
  const [gpiRaw] = await Promise.all([
    d3.csv('datasets/processed/gender_parity_secondary.csv', d3.autoType),
  ]);

  const latestYearMax = d3.max(
    gpiRaw.filter(d => d.value != null && CONTS.includes(d.continent)),
    d => d.year
  ) || 2023;
  const latestYearMin = latestYearMax - 9;

  const byCode = new Map();
  d3.group(gpiRaw, d => d.code).forEach((rows, code) => {
    const r = rows
      .filter(d => d.value != null && d.year >= latestYearMin && d.year <= latestYearMax)
      .sort((a, b) => b.year - a.year)[0];
    if (r) byCode.set(code, { code: r.code, country: r.country, continent: r.continent, gpi: r.value, year: r.year });
  });
  const countries = Array.from(byCode.values()).filter(d => CONTS.includes(d.continent));
  const continentTotals = {
    Africa: ALL_COUNTRIES.Africa.length,
    Europe: ALL_COUNTRIES.Europe.filter(({ code }) => !EUROPE_TOTAL_EXCLUDED.has(code)).length,
  };

  if (typeof window.mountChartWarningHint === 'function') {
    window.mountChartWarningHint(
      container,
      `The data show the latest available year for each country. The years are not perfectly aligned, but they remain within the ${latestYearMin}-${latestYearMax} range.`
    );
  }

  /* ── layout base ────────────────────────────────────────── */
  const W = container.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 760);
  const H = container.clientHeight || (isFullscreen ? window.innerHeight * 0.82 : 480);
  const compact = isFullscreen && (W < 760 || H < 420);
  const veryCompact = isFullscreen && (W < 620 || H < 360);
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  /* ── tooltip ────────────────────────────────────────────── */
  let tip = document.getElementById('qs-tip');
  if (!tip) {
    tip = window.ensureHoverTooltip('qs-tip');
  }
  const hideTip = () => { window.hideHoverTooltip(tip); };
  const moveTip = ev => {
    window.positionHoverTooltip(tip, ev, { offsetY: -30 });
  };

  const svg = d3.select(container).append('svg')
    .attr('width', W).attr('height', H)
    .style('width','100%').style('height','100%').style('display','block')
      .style('background', getCssToken('surface-raised', '#ffffff'));
  const root = svg.append('g');

  let drill = null; // null = overview, string = continent name

  function centerOutDelay(dev, maxAbsDev, duration = 760) {
    if (prefersReducedMotion || !Number.isFinite(dev) || !Number.isFinite(maxAbsDev) || maxAbsDev <= 0) return 0;
    const normalized = Math.min(1, Math.abs(dev) / maxAbsDev);
    return Math.log1p(normalized * 9) / Math.log1p(9) * duration;
  }

  function computeBeeswarmLayout(items, xAccessor, centerX, centerY, radius, minY, maxY, padding = 1.5, maxXShift = 18) {
    const placed = [];
    const collisionDistance = radius * 2 + padding;
    const collisionDistanceSq = collisionDistance * collisionDistance;
    const isFree = (x, y) => placed.every(other => {
      const dx = x - other.x;
      const dy = y - other.y;
      return (dx * dx + dy * dy) >= collisionDistanceSq - 1e-6;
    });

    return items
      .map(item => ({ item, x: xAccessor(item) }))
      .sort((a, b) => {
        const dist = Math.abs(a.x - centerX);
        const otherDist = Math.abs(b.x - centerX);
        return dist - otherDist || a.x - b.x;
      })
      .map(node => {
        let placedNode = null;
        const xStep = 1.5;
        const xOffsets = [0];
        for (let offset = xStep; offset <= maxXShift; offset += xStep) {
          xOffsets.push(-offset, offset);
        }

        for (const xOffset of xOffsets) {
          const candidateX = node.x + xOffset;
          const candidates = [centerY];

          placed.forEach(other => {
            const dx = candidateX - other.x;
            if (Math.abs(dx) >= collisionDistance) return;
            const dy = Math.sqrt(Math.max(0, collisionDistanceSq - dx * dx));
            candidates.push(other.y - dy, other.y + dy);
          });

          const validY = candidates
            .filter(y => y >= minY && y <= maxY)
            .filter(y => isFree(candidateX, y))
            .sort((a, b) => Math.abs(a - centerY) - Math.abs(b - centerY) || a - b);

          let y = validY[0];
          if (y == null) {
            const step = 0.75;
            const maxOffset = Math.ceil((maxY - minY) / step);
            for (let i = 0; i <= maxOffset && y == null; i += 1) {
              const up = centerY - (i * step);
              const down = centerY + (i * step);
              if (up >= minY && isFree(candidateX, up)) y = up;
              else if (down <= maxY && isFree(candidateX, down)) y = down;
            }
          }
          if (y == null) continue;

          placedNode = { ...node, x: candidateX, y };
          break;
        }

        if (placedNode == null) {
          placedNode = { ...node, y: Math.max(minY, Math.min(maxY, centerY)) };
        }
        placed.push(placedNode);
        return placedNode;
      });
  }

  function computeOrderedDotplotLayout(items, xAccessor, centerY, radius, minY, maxY, options = {}) {
    const padding = options.padding ?? 2;
    const step = options.step ?? ((radius * 2) + padding);
    const snap = options.snap ?? Math.max(0.008, (options.domainStep ?? 0.012));
    const maxRows = Math.max(1, Math.floor((maxY - minY) / step));
    const columns = new Map();

    const sorted = items
      .map(item => ({ item, rawX: xAccessor(item) }))
      .sort((a, b) => a.rawX - b.rawX || String(a.item.code || '').localeCompare(String(b.item.code || '')));

    sorted.forEach(node => {
      const bucket = Math.round(node.rawX / snap) * snap;
      if (!columns.has(bucket)) columns.set(bucket, []);
      columns.get(bucket).push(node);
    });

    const layout = [];
    columns.forEach((nodes, bucket) => {
      const colX = bucket;
      const slots = [centerY];
      for (let level = 1; level <= maxRows; level += 1) {
        const up = centerY - (level * step);
        const down = centerY + (level * step);
        if (up >= minY) slots.push(up);
        if (down <= maxY) slots.push(down);
      }

      nodes.forEach((node, index) => {
        const y = slots[index] ?? Math.max(minY, Math.min(maxY, centerY));
        layout.push({ item: node.item, x: colX, y });
      });
    });

    return layout;
  }

  function renderCurrentView(options = {}) {
    const { animateDrillBars = true } = options;
    root.selectAll('*').remove();
    d3.select(container).selectAll('button.qs-back').remove();
    drill ? drawDrill(drill, { animateBars: animateDrillBars }) : drawOverview();
  }

  function draw() {
    const animateDrillBars = true;
    if (window.runChartViewTransition && !drill) {
      window.runChartViewTransition(container, () => renderCurrentView({ animateDrillBars }), {
        duration: 170,
        enterDuration: 300,
        offsetY: 8
      });
      return;
    }
    renderCurrentView({ animateDrillBars });
  }

  /* ════════════════════════════════════════════════════════
     OVERVIEW — dot strip
  ════════════════════════════════════════════════════════ */
  function drawOverview() {
    const M  = compact
      ? { top: 42, right: 56, bottom: 38, left: veryCompact ? 62 : 76 }
      : { top: 48, right: 132, bottom: 48, left: 110 };
    const iw = W - M.left - M.right;
    const ih = H - M.top - M.bottom;
    const g  = root.append('g').attr('transform', `translate(${M.left},${M.top})`);

    const devs = countries.map(d => d.gpi - 1);
    const maxAbsDev = d3.max(devs, d => Math.abs(d)) || 1;
    const xS = d3.scaleLinear()
      .domain([-0.4, 0.4])
      .range([0, iw]);

    const bandH = ih / CONTS.length;
    const DOT_R = compact ? 3.6 : 4.1;
    const parX = xS(0);
    const parityMinX = xS(PARITY_MIN - 1);
    const parityMaxX = xS(PARITY_MAX - 1);

    const zoneLabelY = compact ? -8 : -10;
    const parityLabelY = zoneLabelY - (compact ? 12 : 14);

    g.append('rect')
      .attr('x', parityMinX)
      .attr('y', 0)
      .attr('width', Math.max(0, parityMaxX - parityMinX))
      .attr('height', ih)
      .attr('fill', colorToRgba(COL_PARITY, 0.1));

    g.append('text').attr('x', parityMinX / 2).attr('y', zoneLabelY)
      .attr('text-anchor','middle').attr('font-size',compact ? 9 : 10).attr('font-weight','700')
      .attr('fill', COL_GIRLS).style('pointer-events','none')
      .text('← More girls excluded');
    g.append('text').attr('x', (parityMinX + parityMaxX) / 2).attr('y', parityLabelY)
      .attr('text-anchor','middle').attr('font-size',compact ? 8 : 9).attr('font-weight','700')
      .attr('fill', COL_PARITY).style('pointer-events','none')
      .text('Parity');
    g.append('text').attr('x', parityMaxX + (iw - parityMaxX) / 2).attr('y', zoneLabelY)
      .attr('text-anchor','middle').attr('font-size',compact ? 9 : 10).attr('font-weight','700')
      .attr('fill', COL_BOYS).style('pointer-events','none')
      .text('More boys excluded →');

    xS.ticks(8).forEach(t => {
      g.append('line').attr('x1',xS(t)).attr('x2',xS(t)).attr('y1',0).attr('y2',ih)
        .attr('stroke',colorToRgba(getCssToken('ink', '#1f1d1a'), 0.08)).attr('stroke-width',1);
    });

    g.append('line').attr('x1',parityMinX).attr('x2',parityMinX).attr('y1',0).attr('y2',ih)
      .attr('stroke',CHART_AXIS).attr('stroke-dasharray','4,3').attr('stroke-width',1.5);
    g.append('line').attr('x1',parityMaxX).attr('x2',parityMaxX).attr('y1',0).attr('y2',ih)
      .attr('stroke',CHART_AXIS).attr('stroke-dasharray','4,3').attr('stroke-width',1.5);

    const fmtGpiTick = d => {
      const gpi = d + 1;
      return Math.abs(gpi - 1) < 1e-9 ? '1.00' : gpi.toFixed(2);
    };

    g.append('g').attr('transform',`translate(0,${ih})`)
      .call(d3.axisBottom(xS).ticks(8)
        .tickFormat(fmtGpiTick))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('.tick text').attr('font-size',compact ? 8.5 : 10).attr('fill',CHART_AXIS);
        ax.selectAll('.tick line').attr('stroke',UI_MUTED_BORDER);
      });

    g.append('text')
      .attr('class', 'chart-axis-label')
      .attr('x', iw / 2)
      .attr('y', ih + (compact ? 34 : 36))
      .attr('text-anchor', 'middle')
      .attr('font-size', compact ? 8.5 : 10)
      .attr('font-weight', '600')
      .attr('fill', CHART_AXIS)
      .text('Gender Parity Index (GPI)');

    const interactionHint = g.append('text')
      .attr('x', iw + (compact ? 10 : 18))
      .attr('y', ih / 2 - (compact ? 10 : 16))
      .attr('text-anchor', 'start')
      .attr('font-size', compact ? 8 : 10)
      .attr('font-weight', '700')
      .attr('fill', INTERACTION_HINT)
      .style('pointer-events', 'none');

    interactionHint.append('tspan')
      .attr('x', iw + (compact ? 10 : 18))
      .attr('dy', 0)
      .text('Click');

    interactionHint.append('tspan')
      .attr('x', iw + (compact ? 10 : 18))
      .attr('dy', compact ? 10 : 13)
      .text('to');

    interactionHint.append('tspan')
      .attr('x', iw + (compact ? 10 : 18))
      .attr('dy', compact ? 10 : 13)
      .text('explore →');

    CONTS.forEach((cont, i) => {
      const rows  = countries.filter(d => d.continent === cont);
      const color = COL[cont];
      const cy    = i * bandH + bandH / 2;
      const labelX = (-M.left / 2) + (compact ? 2 : 4);
      if (i > 0) g.append('line').attr('x1',-M.left+8).attr('x2',iw)
        .attr('y1',i*bandH).attr('y2',i*bandH).attr('stroke',CHART_GRID);

      const gpis   = rows.map(d => d.gpi).sort(d3.ascending);
      const cMean  = d3.mean(gpis);
      const cMed   = d3.median(gpis);
      const cMin   = d3.min(gpis);
      const cMax   = d3.max(gpis);
      const nBelow = rows.filter(d => d.gpi < PARITY_MIN).length;
      const nParity = rows.filter(d => d.gpi >= PARITY_MIN && d.gpi <= PARITY_MAX).length;
      const nAbove = rows.filter(d => d.gpi > PARITY_MAX).length;

      const showContTip = (ev) => {
        window.showHoverTooltip(tip, ev, {
          title: cont,
          titleColor: color,
          rows: [
            { label: 'Average', value: cMean.toFixed(3) },
            { label: 'Median', value: cMed.toFixed(3) },
            { label: 'Min', value: cMin.toFixed(3) },
            { label: 'Max', value: cMax.toFixed(3) },
            { label: 'More girls excluded', value: `${nBelow}` },
            { label: 'In parity range', value: `${nParity}` },
            { label: 'More boys excluded', value: `${nAbove}` },
            { label: 'Data coverage', value: `${rows.length}/${continentTotals[cont]} countries` },
          ],
        });
      };

      g.append('rect').attr('x',0).attr('y',i*bandH).attr('width',iw).attr('height',bandH)
        .attr('fill','transparent').style('cursor','pointer')
        .on('mouseover', function(ev) { showContTip(ev); moveTip(ev); })
        .on('mousemove', function(ev) { showContTip(ev); moveTip(ev); })
        .on('mouseleave', hideTip)
        .on('click', () => { drill = cont; draw(); });

      g.append('text').attr('x',labelX).attr('y',cy)
        .attr('text-anchor','middle').attr('dominant-baseline','middle')
        .attr('font-size',compact ? 11 : 13).attr('font-weight','700').attr('fill',color)
        .style('cursor','pointer').text(cont)
        .on('click',() => { drill = cont; draw(); });

      g.append('line')
        .attr('x1',xS(cMed - 1)).attr('x2',xS(cMed - 1))
        .attr('y1',cy - bandH*0.46).attr('y2',cy + bandH*0.46)
        .attr('stroke',color)
        .attr('stroke-width',compact ? 2.2 : 2.6)
        .attr('stroke-linecap','round')
        .attr('opacity',0.98);

      const swarm = computeBeeswarmLayout(
        rows,
        d => xS(d.gpi - 1),
        parX,
        cy,
        DOT_R,
        cy - bandH * 0.4,
        cy + bandH * 0.4,
        1.5,
        compact ? 44 : 56
      );

      swarm.forEach(({ item: d, x, y }) => {
        const dev  = d.gpi - 1;
        const fill = color;

        g.append('circle')
          .attr('cx', x).attr('cy', y)
          .attr('r', 0).attr('fill', fill).attr('opacity', 0)
          .style('cursor','pointer')
          .on('mouseover', function(ev) {
            d3.select(this).attr('opacity',1).attr('r', DOT_R + 2);
            window.showHoverTooltip(tip, ev, {
              title: d.country,
              titleColor: fill,
              meta: `Year: ${d.year}`,
              rows: [
                { label: 'GPI', value: d.gpi.toFixed(3) },
                { label: 'Classificazione', value: getGpiStatusLabel(d.gpi) },
              ],
            }, { offsetY: -30 });
          })
          .on('mousemove', moveTip)
          .on('mouseleave', function() { d3.select(this).attr('opacity',0.68).attr('r', DOT_R); hideTip(); })
          .on('click', () => { drill = cont; draw(); })
          .transition()
          .delay(centerOutDelay(dev, maxAbsDev))
          .duration(prefersReducedMotion ? 0 : 420)
          .ease(d3.easeCubicOut)
          .attr('r', DOT_R).attr('opacity', 0.68);
      });
    });

  }

  /* ════════════════════════════════════════════════════════
     DRILL-DOWN — barre verticali con baseline a 1 e soglia di parità 0.97–1.03
  ════════════════════════════════════════════════════════ */
  function drawDrill(cont, options = {}) {
    const { animateBars: shouldAnimateBars = true } = options;
    const rows  = countries.filter(d => d.continent === cont).sort((a,b) => a.gpi - b.gpi);
    const color = COL[cont];
    const gpis  = rows.map(d => d.gpi);

    const M  = compact
      ? { top: 44, right: 14, bottom: 92, left: 42 }
      : { top: 52, right: 30, bottom: 118, left: 52 };
    const iw = W - M.left - M.right;
    const ih = H - M.top  - M.bottom;

    // Fixed domain [0.6, 1.4] — same for all continents so drill-downs are comparable
    const yS = d3.scaleLinear()
      .domain([0.6, 1.4])
      .range([ih, 0]);
    const parY = yS(1.0);
    const parityTopY = yS(PARITY_MAX);
    const parityBottomY = yS(PARITY_MIN);

    const xS = d3.scaleBand().domain(rows.map(d => d.code)).range([0, iw]).padding(0.12);
    const bw  = xS.bandwidth();

    const g = root.append('g').attr('transform', `translate(${M.left},${M.top})`);

    /* back button — rectangular text style matching chart 1 */
    const backBtn = d3.select(container).append('button')
      .attr('class', 'chart-back-btn chart-back-btn--icon qs-back')
      .attr('aria-label', 'Back to the view of all continents')
      .attr('title', 'Back to the view of all continents')
      .style('position', 'absolute').style('top', compact ? '6px' : '8px').style('left', compact ? '6px' : '8px')
      .style('display', 'inline-flex')
      .style('z-index', '10')
      .html('<span class="chart-back-icon" aria-hidden="true"></span>')
      .on('click', () => { backBtn.remove(); drill = null; draw(); });

    /* title */
    root.append('text').attr('x',W/2).attr('y',26)
      .attr('text-anchor','middle').attr('font-size',compact ? 11 : 13).attr('font-weight','700').attr('fill',color)
      .text(cont);
    const hintY = 40;
    const hintSpread = compact ? Math.min(78, iw * 0.12) : Math.min(210, Math.max(132, iw * 0.14));
    const hintLeftX = W / 2 - hintSpread;
    const hintRightX = W / 2 + hintSpread;

    root.append('text').attr('x', hintLeftX).attr('y', hintY)
      .attr('text-anchor', 'end').attr('font-size', compact ? 8 : 9).attr('font-weight', '600').attr('fill', COL_GIRLS)
      .text('← More girls excluded');

    root.append('text').attr('x', W / 2).attr('y', hintY + (compact ? 0 : 1))
      .attr('text-anchor', 'middle').attr('font-size', compact ? 8 : 9).attr('font-weight', '700').attr('fill', CHART_AXIS)
      .text('Parity');

    root.append('text').attr('x', hintRightX).attr('y', hintY)
      .attr('text-anchor', 'start').attr('font-size', compact ? 8 : 9).attr('font-weight', '600').attr('fill', COL_BOYS)
      .text('More boys excluded →');

    /* horizontal gridlines */
    yS.ticks(6).forEach(t => {
      g.append('line').attr('x1',0).attr('x2',iw).attr('y1',yS(t)).attr('y2',yS(t))
        .attr('stroke', CHART_GRID)
        .attr('stroke-width', 1);
    });

    g.append('line').attr('x1',0).attr('x2',iw).attr('y1',parY).attr('y2',parY)
      .attr('stroke',CHART_AXIS).attr('stroke-width',1.5);
    g.append('line').attr('x1',0).attr('x2',iw).attr('y1',parityBottomY).attr('y2',parityBottomY)
      .attr('stroke', CHART_AXIS).attr('stroke-width',1.5).attr('stroke-dasharray','6,3');
    g.append('line').attr('x1',0).attr('x2',iw).attr('y1',parityTopY).attr('y2',parityTopY)
      .attr('stroke', CHART_AXIS).attr('stroke-width',1.5).attr('stroke-dasharray','6,3');


    /* Y axis */
    g.append('g')
      .call(d3.axisLeft(yS).ticks(6).tickFormat(d3.format('.2f')))
      .call(ax => {
        ax.select('.domain').remove();
        ax.selectAll('.tick text').attr('font-size',8).attr('fill',CHART_AXIS);
        ax.selectAll('.tick line').attr('stroke',UI_MUTED_BORDER);
      });
    g.append('text').attr('class', 'chart-axis-label').attr('transform','rotate(-90)').attr('x',-ih/2).attr('y',-36)
      .attr('text-anchor','middle').attr('font-size',compact ? 8 : 9).attr('fill',CHART_AXIS)
      .text('Gender Parity Index (GPI)');

    /* bars */
    const BASE_BAR_OPACITY = 0.78;
    const INACTIVE_BAR_OPACITY = 0.22;
    const animateBars = shouldAnimateBars && !prefersReducedMotion;
    const barSel = g.selectAll('.bar').data(rows).join('rect').attr('class','bar')
      .attr('x', d => xS(d.code))
      .attr('y', animateBars ? d => d.gpi >= 1 ? parY - 1 : parY : d => Math.min(yS(d.gpi), parY))
      .attr('width', bw)
      .attr('height', animateBars ? 1 : d => Math.max(1, Math.abs(yS(d.gpi) - parY)))
      .attr('fill', d => getGpiStatusColor(d.gpi))
      .attr('opacity', BASE_BAR_OPACITY).attr('rx', 1)
      .style('cursor','pointer');

    if (animateBars) {
      barSel.transition('bar-grow')
        .duration(620)
        .ease(d3.easeCubicOut)
        .attr('y', d => Math.min(yS(d.gpi), parY))
        .attr('height', d => Math.max(1, Math.abs(yS(d.gpi) - parY)));
    }

    /* labels: tutti i paesi, testo verticale -90° */
    const labelFsz = Math.max(6, Math.min(compact ? 7.5 : 8.5, bw * (compact ? 0.68 : 0.75)));
    const labelSel = g.selectAll('.x-label').data(rows).join('text').attr('class', 'x-label')
      .attr('transform', d => `translate(${xS(d.code) + bw / 2},${ih + 4}) rotate(-90)`)
      .attr('text-anchor','end').attr('dominant-baseline','middle')
      .attr('font-size', labelFsz)
      .attr('fill', d => getGpiStatusColor(d.gpi))
      .attr('opacity', 0.9)
      .style('pointer-events','none')
      .text(d => d.country.length > 16 ? d.country.slice(0,15)+'…' : d.country);

    /* hit areas: colonna intera invisibile, cattura hover anche sopra/sotto la barra */
    const hitSel = g.selectAll('.hit').data(rows).join('rect').attr('class','hit')
      .attr('x', d => xS(d.code))
      .attr('y', 0)
      .attr('width', bw)
      .attr('height', ih)
      .attr('fill', 'transparent')
      .style('cursor','pointer');

    let activeCode = null;
    const highlightCode = (code) => {
      if (activeCode === code) return;
      activeCode = code;
      barSel.interrupt('bar-highlight').transition('bar-highlight').duration(130)
        .attr('opacity', d => d.code === code ? 1 : INACTIVE_BAR_OPACITY)
        .attr('stroke', d => d.code === code ? '#ffffff' : 'none')
        .attr('stroke-width', d => d.code === code ? 1.2 : 0);
      labelSel.interrupt('label-highlight').transition('label-highlight').duration(130)
        .attr('opacity', d => d.code === code ? 1 : 0.62)
        .attr('font-weight', d => d.code === code ? '700' : null);
    };

    const clearHighlight = () => {
      activeCode = null;
      barSel.interrupt('bar-highlight').transition('bar-highlight').duration(130)
        .attr('opacity', BASE_BAR_OPACITY)
        .attr('stroke', 'none')
        .attr('stroke-width', 0);
      labelSel.interrupt('label-highlight').transition('label-highlight').duration(130)
        .attr('opacity', 0.9)
        .attr('font-weight', null);
    };

    const showTipFor = (ev, d) => {
      const fill = getGpiStatusColor(d.gpi);
      window.showHoverTooltip(tip, ev, {
        title: d.country,
        titleColor: fill,
        meta: `Year: ${d.year}`,
        rows: [
          { label: 'GPI', value: d.gpi.toFixed(3) },
          { label: 'Classification', value: getGpiStatusLabel(d.gpi) },
        ],
      }, { offsetY: -30 });
    };

    const onHover = (ev, d) => {
      highlightCode(d.code);
      showTipFor(ev, d);
      moveTip(ev);
    };

    hitSel.on('mouseover', onHover)
      .on('mousemove', onHover)
      .on('mouseleave', () => { clearHighlight(); hideTip(); });

    barSel.on('mouseover', onHover)
      .on('mousemove', onHover)
      .on('mouseleave', () => { clearHighlight(); hideTip(); });
  }

  draw();

  container._bumpReset           = () => { drill = null;     draw(); };
  container._bumpHighlightAfrica = () => { drill = 'Africa'; draw(); };
  container._bumpHighlightEurope = () => { drill = 'Europe'; draw(); };
  container._getHelpContext = () => ({
    drill,
  });
}
