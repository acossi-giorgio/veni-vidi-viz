/* ============================================================
   Grafico 4-2 (Atto III) — Matrimoni precoci (Africa)
   Overview: waffle Africa 10×10 (by15 + by18) + pannello stats
   Drill-down: stacked bar per paese — toggle % / Assoluto
   ============================================================ */
async function renderChildMarriageChart(selector = '#chart-4-2', isFullscreen = false) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html('');
  container
    .style('width', '100%').style('height', '100%')
    .style('display', 'flex').style('flex-direction', 'column')
    .style('font-family', 'inherit').style('box-sizing', 'border-box').style('position', 'relative');

  const containerNode = container.node();
  const compact = isFullscreen && (
    (containerNode.clientWidth  || window.innerWidth  * 0.85) < 760 ||
    (containerNode.clientHeight || window.innerHeight * 0.82) < 420
  );
  const veryCompact = isFullscreen && (
    (containerNode.clientWidth  || window.innerWidth  * 0.85) < 620 ||
    (containerNode.clientHeight || window.innerHeight * 0.82) < 360
  );
  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const raw = await d3.csv('datasets/processed/child_marriage_prevalence.csv', d3.autoType);

  const AFRICA = getThemeColor('childMarriage', getContinentColor('Africa', '#d46a4c'));
  const EUROPE = getThemeColor('europe', getContinentColor('Europe', '#4c78a8'));
  const C_BY15  = shadeColor(AFRICA, 0.28);
  const C_BY18  = tintColor(AFRICA, 0.18);
  const C_EU_BY15 = shadeColor(EUROPE, 0.18);
  const C_EU_BY18 = tintColor(EUROPE, 0.24);
  const C_EMPTY = getUiColor('chartBaseFill', '#d6d0c5');
  const UI_ACTIVE = getActColor(3, getUiColor('controlActive', '#525252'));
  const UI_MUTED_INK = getUiColor('controlMutedInk', '#75695d');
  const UI_MUTED_BORDER = getUiColor('controlMutedBorder', '#d9d0c3');
  const CHART_AXIS = getUiColor('chartAxis', '#a49788');
  const CHART_LABEL = getUiColor('chartLabel', '#73675c');
  const TOOLTIP_BG = getUiColor('chartTooltipBg', 'rgba(28, 25, 23, 0.94)');
  const TOOLTIP_INK = getUiColor('chartTooltipInk', '#fffdf8');

  let drillDown = false;
  let dotMode   = false;
  let selectedContinent = 'Africa';

  function fmt(v, suffix = '') { return v == null ? '—' : v.toFixed(1) + suffix; }
  function fmtN(v) {
    if (v == null || isNaN(v)) return '—';
    if (v >= 1e9) return (v / 1e9).toFixed(1) + ' Mrd';
    if (v >= 1e6) return (v / 1e6).toFixed(0) + ' M';
    if (v >= 1e3) return (v / 1e3).toFixed(0) + ' K';
    return Math.round(v).toString();
  }

  /* ── Tooltip ────────────────────────────────────────────── */
  d3.select('body').selectAll('.tooltip-marriage').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip-marriage')
    .style('position', 'absolute').style('background', TOOLTIP_BG)
    .style('color', TOOLTIP_INK).style('border-radius', '8px').style('padding', '10px 14px')
    .style('border', '1px solid rgba(255,255,255,0.08)')
    .style('box-shadow', '0 10px 28px rgba(16,18,34,0.35)')
    .style('pointer-events', 'none').style('font-size', '12px').style('line-height', '1.65')
    .style('z-index', '10000').style('display', 'none').style('max-width', '250px');

  function showTip(e, html) {
    tooltip.style('display', 'block').html(html);
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 14, ty = e.pageY + 10;
    if (tx + r.width  > window.innerWidth  - 8) tx = e.pageX - r.width  - 14;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 10;
    tx = Math.max(8, Math.min(tx, window.innerWidth - r.width - 8));
    ty = Math.max(8, Math.min(ty, window.innerHeight - r.height - 8));
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }
  function hideTip() { tooltip.style('display', 'none'); }

  /* ── Viz container ──────────────────────────────────────── */
  const vizDiv = container.append('div')
    .style('flex', '1 1 0').style('position', 'relative').style('overflow', 'hidden');

  /* ── Waffle helper ──────────────────────────────────────── */
  function drawWaffle(svg, x0, y0, pct15, pct18, cs, gap, COLS, ROWS, colors = {}) {
    const total = COLS * ROWS;
    const n15   = Math.round(Math.min(total, pct15));
    const n18   = Math.round(Math.min(total - n15, Math.max(0, pct18 - pct15)));
    const by15Color = colors.by15 || C_BY15;
    const by18Color = colors.by18 || C_BY18;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const idx  = row * COLS + col;
        const fill = idx < n15 ? by15Color : idx < n15 + n18 ? by18Color : C_EMPTY;
        svg.append('rect')
          .attr('x', x0 + col * (cs + gap)).attr('y', y0 + row * (cs + gap))
          .attr('width', cs).attr('height', cs).attr('rx', Math.max(1, cs * 0.12))
          .attr('fill', fill).attr('opacity', 0)
          .transition().duration(300).ease(d3.easeCubicOut).delay(idx * 6)
          .attr('opacity', fill === C_EMPTY ? 0.4 : 0.9);
      }
    }
  }

  /* ── OVERVIEW ───────────────────────────────────────────── */
  function drawOverview(W, H) {
    const mobileFullscreen = isFullscreen && compact;
    const scaledMobileOverview = mobileFullscreen;
    const layoutW = scaledMobileOverview ? Math.max(640, W) : W;
    const layoutH = scaledMobileOverview ? Math.max(380, Math.min(H, 440)) : H;
    const africa = raw.filter(d => d.continent === 'Africa' && d.by18_pct != null && d.by18_n != null && d.by18_pct > 0);
    const afN15  = d3.sum(africa, d => d.by15_n ?? 0);
    const afN18  = d3.sum(africa, d => d.by18_n ?? 0);
    const afNTot = d3.sum(africa, d => d.by18_n / (d.by18_pct / 100));
    const af15   = afNTot > 0 ? afN15 / afNTot * 100 : 0;
    const af18   = afNTot > 0 ? afN18 / afNTot * 100 : 0;
    const n      = africa.length;

    const europe = raw.filter(d => d.continent === 'Europe' && d.by18_pct != null && d.by18_n != null && d.by18_pct > 0);
    const euN15  = d3.sum(europe, d => d.by15_n ?? 0);
    const euN18  = d3.sum(europe, d => d.by18_n ?? 0);
    const euNTot = d3.sum(europe, d => d.by18_n / (d.by18_pct / 100));
    const eu15   = euNTot > 0 ? euN15 / euNTot * 100 : 0;
    const eu18   = euNTot > 0 ? euN18 / euNTot * 100 : 0;

    const africaRows = [
      { label: 'Prima dei 15', pct: fmt(af15, '%'), n: fmtN(afN15), color: C_BY15 },
      { label: 'Prima dei 18', pct: fmt(af18, '%'), n: fmtN(afN18), color: C_BY18 },
    ];
    const europeRows = [
      { label: 'Prima dei 15', pct: fmt(eu15, '%'), n: fmtN(euN15), color: C_EU_BY15 },
      { label: 'Prima dei 18', pct: fmt(eu18, '%'), n: fmtN(euN18), color: C_EU_BY18 },
    ];

    const PAD  = compact ? { top: 12, bottom: 12, left: 12, right: 12 } : { top: 16, bottom: 16, left: 24, right: 20 };
    const PW   = compact ? (veryCompact ? 76 : 88) : 102;
    const PGAP = compact ? (veryCompact ? 8 : 12) : 14;
    const WGAP = compact ? (scaledMobileOverview ? 10 : 14) : 24;
    const PP   = compact ? 7 : 8;
    const avH  = layoutH - PAD.top - PAD.bottom;

    const TITLE_H = 34;
    const HINT_H = 20;
    const afGap = 2;
    const euGap = compact ? 1 : 2;
    const europeRatio = compact ? 0.46 : 0.5;

    const svg = vizDiv.append('svg').attr('width', W).attr('height', H)
      .attr('viewBox', `0 0 ${layoutW} ${layoutH}`)
      .attr('preserveAspectRatio', scaledMobileOverview ? 'xMidYMid meet' : 'none')
      .style('display', 'block').style('font-family', 'inherit');

    function drawPanelRows(rows, xLabel, xValue, startY) {
      let y = startY;
      rows.forEach(r => {
        svg.append('circle').attr('cx', xLabel - 9).attr('cy', y + 2).attr('r', 4.5)
          .attr('fill', r.color).attr('opacity', 0.88);
        svg.append('text').attr('x', xLabel).attr('y', y + 6)
          .attr('font-size', compact ? 7 : 8).attr('fill', CHART_AXIS).text(r.label);
        y += 16;
        const pctY = y + 12;
        const pctText = svg.append('text').attr('x', xValue).attr('y', pctY)
          .attr('font-size', compact ? 15 : 17).attr('font-weight', '700').attr('fill', r.color).text(r.pct);

        const pctBox = pctText.node().getBBox();
        svg.append('text')
          .attr('x', xValue + pctBox.width + 4)
          .attr('y', pctY)
          .attr('font-size', compact ? 5.5 : 6)
          .attr('font-weight', '500')
          .attr('fill', CHART_AXIS)
          .text(`≈ ${r.n}`);
        y += 20;
      });
      return y;
    }

    const panelX = PAD.left + 50;
    const rightZoneX = panelX + PW + PGAP;
    const rightZoneW = layoutW - rightZoneX - PAD.right;
    const maxWaffleH = avH - TITLE_H - HINT_H;

    let afCS = Math.max(5, Math.floor((Math.min(maxWaffleH, rightZoneW / (1 + europeRatio)) - 9 * afGap) / 10));
    let euCS = Math.max(3, Math.floor(afCS * europeRatio));
    let afW = 10 * afCS + 9 * afGap;
    let euW = 10 * euCS + 9 * euGap;

    while (afW + WGAP + euW > rightZoneW && afCS > 5) {
      afCS -= 1;
      euCS = Math.max(3, Math.floor(afCS * europeRatio));
      afW = 10 * afCS + 9 * afGap;
      euW = 10 * euCS + 9 * euGap;
    }

    const blockH = TITLE_H + afW + HINT_H;
    const blockY = scaledMobileOverview
      ? PAD.top + 6
      : PAD.top + (avH - blockH) / 2;
    const afX = rightZoneX + Math.max(0, (rightZoneW - afW - WGAP - euW) / 2);
    const euX = afX + afW + WGAP;
    const afY = blockY + TITLE_H;
    const euY = afY + Math.max(0, (afW - euW) / 2);

    svg.append('text').attr('x', afX + afW / 2).attr('y', blockY + 14)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 12 : 14).attr('font-weight', '700').attr('fill', AFRICA)
      .text('Africa');
    svg.append('text').attr('x', afX + afW / 2).attr('y', blockY + 28)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 7.5 : 8.5).attr('fill', CHART_AXIS)
      .text(`${n} paesi · ponderato per base donne · ogni cella = 1%`);

    drawWaffle(svg, afX, afY, af15, af18, afCS, afGap, 10, 10);
    drawWaffle(svg, euX, euY, eu15, eu18, euCS, euGap, 10, 10, {
      by15: C_EU_BY15,
      by18: C_EU_BY18
    });

    svg.append('text').attr('x', euX + euW / 2).attr('y', euY - 10)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 10 : 12).attr('font-weight', '700').attr('fill', EUROPE)
      .text('Europa');

    svg.append('rect').attr('x', afX).attr('y', afY).attr('width', afW).attr('height', afW)
      .attr('fill', 'transparent').style('cursor', 'pointer')
      .on('mousemove', e => showTip(e,
        `<strong style="color:${AFRICA}">Africa</strong><br>` +
        `<span style="color:${C_BY15}">●</span> Prima dei 15: <strong>${fmt(af15, '%')}</strong> (${fmtN(afN15)})<br>` +
        `<span style="color:${C_BY18}">●</span> Prima dei 18: <strong>${fmt(af18, '%')}</strong> (${fmtN(afN18)})<br>` +
        `<em style="opacity:.5;font-size:9px">clicca per i singoli paesi →</em>`
      ))
      .on('mouseleave', hideTip)
      .on('click', () => { selectedContinent = 'Africa'; drillDown = true; draw(); });

    svg.append('rect').attr('x', euX).attr('y', euY).attr('width', euW).attr('height', euW)
      .attr('fill', 'transparent')
      .on('mousemove', e => showTip(e,
        `<strong style="color:${EUROPE}">Europa</strong><br>` +
        `<span style="color:${C_EU_BY15}">●</span> Prima dei 15: <strong>${fmt(eu15, '%')}</strong> (${fmtN(euN15)})<br>` +
        `<span style="color:${C_EU_BY18}">●</span> Prima dei 18: <strong>${fmt(eu18, '%')}</strong> (${fmtN(euN18)})`
      ))
      .on('mouseleave', hideTip)
      .style('cursor', 'pointer')
      .on('click', () => { selectedContinent = 'Europe'; drillDown = true; draw(); });

    svg.append('text').attr('x', afX + afW / 2).attr('y', afY + afW + 14)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 7 : 8).attr('fill', CHART_AXIS)
      .text('clicca per esplorare i singoli paesi →');

    /* ── Pannello stats sinistra ────────────────────────────── */
    const px0    = panelX;
    const panelH = compact ? 198 : 208;
    const py0    = blockY + (blockH - panelH) / 2;

    svg.append('rect').attr('x', px0 - PP).attr('y', py0 - PP)
      .attr('width', PW + PP * 2).attr('height', panelH + PP * 2)
      .attr('rx', 8).attr('fill', getCssToken('surface-raised', '#ffffff')).attr('stroke', UI_MUTED_BORDER).attr('stroke-width', 1);

    const panelLeft = px0;
    const panelInnerTop = py0 + 2;

    svg.append('text').attr('x', panelLeft).attr('y', panelInnerTop + 10)
      .attr('font-size', compact ? 8 : 9).attr('font-weight', '700').attr('fill', AFRICA).text('Africa');
    const africaEndY = drawPanelRows(africaRows, panelLeft + 14, panelLeft, panelInnerTop + 28);

    const dividerY = africaEndY;
    svg.append('line').attr('x1', px0 - PP + 6).attr('x2', px0 + PW + PP - 6)
      .attr('y1', dividerY).attr('y2', dividerY).attr('stroke', UI_MUTED_BORDER);

    const europeTitleY = dividerY + 12;
    svg.append('text').attr('x', panelLeft).attr('y', europeTitleY)
      .attr('font-size', compact ? 8 : 9).attr('font-weight', '700').attr('fill', EUROPE).text('Europa');

    drawPanelRows(europeRows, panelLeft + 14, panelLeft, europeTitleY + 18);

  }

  /* ── DRILL-DOWN: stacked bar ────────────────────────────── */
  function drawDrillDown(W, H) {
    const mobileFullscreen = isFullscreen && compact;
    const data = raw
      .filter(d => d.continent === selectedContinent && d.by18_pct != null)
      .sort((a, b) => b.by18_pct - a.by18_pct);

    const isEurope = selectedContinent === 'Europe';
    const colorBy15 = isEurope ? C_EU_BY15 : C_BY15;
    const colorBy18 = isEurope ? C_EU_BY18 : C_BY18;
    const titleColor = isEurope ? EUROPE : AFRICA;
    const continentLabel = isEurope ? 'Europa' : 'Africa';

    data.forEach(d => {
      if (d.by18_pct > 0 && d.by18_n != null) {
        d._total_n   = d.by18_n / (d.by18_pct / 100);
        d._notby18_n = d._total_n - d.by18_n;
      } else {
        d._total_n = null; d._notby18_n = null;
      }
    });

    // Reserve a dedicated header lane for controls so they never overlap bars/axes
    const CONTROL_LANE_H = compact ? 34 : 38;
    const frameW = W;
    const frameH = mobileFullscreen
      ? Math.max(360, Math.min(H - 10, Math.round(H * 0.74)))
      : H;
    const frameX = 0;
    const frameY = mobileFullscreen ? 8 : 0;
    const PAD    = mobileFullscreen
      ? { top: 28 + CONTROL_LANE_H, bottom: 68, left: 36, right: 10 }
      : compact
        ? { top: 40 + CONTROL_LANE_H, bottom: 60, left: 34, right: 6 }
        : { top: 44 + CONTROL_LANE_H, bottom: 68, left: 42, right: 8 };
    const chartH = frameH - PAD.top - PAD.bottom;
    const BAR_G  = mobileFullscreen ? 1 : 2;
    const availW = frameW - PAD.left - PAD.right;
    const BAR_W  = Math.max(mobileFullscreen ? 12 : 10, Math.min(28, (availW - BAR_G * (data.length - 1)) / data.length));
    const barsW  = data.length * BAR_W + (data.length - 1) * BAR_G;
    const totalW = PAD.left + barsW + PAD.right;

    /* center bars if they fit within the container */
    const svgW        = Math.max(frameW, totalW);
    const barsOffsetX = svgW > totalW ? (svgW - totalW) / 2 : 0;

    vizDiv
      .style('overflow-x', svgW > W ? 'auto' : 'hidden')
      .style('overflow-y', 'hidden')
      .style('-webkit-overflow-scrolling', 'touch');

    const svg = vizDiv.append('svg')
      .attr('width', svgW).attr('height', H)
      .style('display', 'block').style('font-family', 'inherit');

    /* ── Toggle % / Assoluto — top-left pill (after back btn) ─ */
    const controlRow = vizDiv.append('div')
      .style('position', 'absolute').style('top', compact ? '6px' : '8px').style('left', compact ? '6px' : '8px')
      .style('display', 'flex').style('align-items', 'center').style('gap', compact ? '4px' : '6px')
      .style('z-index', '10');

    controlRow.append('button')
      .attr('class', 'chart-back-btn chart-back-btn--icon')
      .attr('aria-label', 'Torna alla panoramica')
      .attr('title', 'Torna alla panoramica')
      .html('<span class="chart-back-icon" aria-hidden="true"></span>')
      .on('click', () => { drillDown = false; dotMode = false; draw(); });

    const pillBar = controlRow.append('div')
      .style('display', 'flex').style('background', 'rgba(255,255,255,0.92)')
      .style('border-radius', compact ? '8px' : '9px').style('border', `1px solid ${UI_MUTED_BORDER}`)
      .style('padding', compact ? '2px' : '3px').style('gap', '2px')
      .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)');

    function mkToggleBtn(label, active) {
      return pillBar.append('button')
        .style('font-size', compact ? '10px' : '11px').style('padding', compact ? '4px 10px' : '5px 14px').style('border-radius', compact ? '5px' : '6px')
        .style('border', 'none').style('cursor', 'pointer').style('font-weight', '600')
        .style('transition', 'all 0.15s')
        .style('background', active ? UI_ACTIVE : 'transparent')
        .style('color',      active ? '#fff'    : UI_MUTED_INK)
        .style('box-shadow', active ? `0 1px 4px ${colorToRgba(UI_ACTIVE, 0.3)}` : 'none')
        .text(label);
    }

    mkToggleBtn('%', !dotMode).on('click', () => {
      if (!dotMode) return;
      dotMode = false;
      draw();
    });
    mkToggleBtn('Assoluto', dotMode).on('click', () => {
      if (dotMode) return;
      dotMode = true;
      draw();
    });

    /* ── Scale Y ──────────────────────────────────────────── */
    const yScale = dotMode
      ? d3.scaleLinear().domain([0, 25e6]).range([chartH, 0])
      : d3.scaleLinear().domain([0, 100]).range([chartH, 0]);

    const yFmt = dotMode
      ? v => v >= 1e6 ? (v / 1e6).toFixed(0) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : v
      : v => v + '%';

    const axisX = frameX + barsOffsetX + PAD.left;

    const yG = svg.append('g').attr('transform', `translate(${axisX},${frameY + PAD.top})`)
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(yFmt).tickSize(-barsW));
    yG.select('.domain').remove();
    yG.selectAll('.tick line').attr('stroke', UI_MUTED_BORDER);
    yG.selectAll('.tick text').attr('font-size', compact ? 7 : 8).attr('fill', CHART_AXIS);

    svg.append('text').attr('x', mobileFullscreen ? axisX : frameX + frameW / 2).attr('y', frameY + PAD.top - 12)
      .attr('text-anchor', mobileFullscreen ? 'start' : 'middle')
      .attr('font-size', mobileFullscreen ? 9 : 10).attr('fill', titleColor)
      .text(mobileFullscreen
        ? `${continentLabel} · ${data.length} paesi`
        : `${continentLabel} · ${data.length} paesi · ordinati per % prima dei 18`);

    const BASE_OPACITY_BY15 = 0.9;
    const BASE_OPACITY_BY18 = 0.88;
    const INACTIVE_FADE = 0.28;
    const HOVER_BY15 = isEurope ? shadeColor(EUROPE, 0.34) : shadeColor(AFRICA, 0.5);
    const HOVER_BY18 = isEurope ? tintColor(EUROPE, 0.4) : tintColor(AFRICA, 0.4);
    const columns = [];
    let activeColumnIndex = -1;
    let animating = !prefersReducedMotion;

    function styleColumn(c, { active = false, dimmed = false } = {}) {
      if (animating) return;
      if (!c) return;
      const fade = dimmed ? INACTIVE_FADE : 1;
      const o18 = active ? 1 : BASE_OPACITY_BY18 * fade;
      const o15 = active ? 1 : BASE_OPACITY_BY15 * fade;

      if (c.bar18) {
        c.bar18.interrupt().transition().duration(140)
          .attr('fill', active ? HOVER_BY18 : colorBy18)
          .attr('opacity', o18)
          .attr('stroke', active ? '#ffffff' : 'none')
          .attr('stroke-width', active ? 1.2 : 0);
      }
      if (c.bar15) {
        c.bar15.interrupt().transition().duration(140)
          .attr('fill', active ? HOVER_BY15 : colorBy15)
          .attr('opacity', o15)
          .attr('stroke', active ? '#ffffff' : 'none')
          .attr('stroke-width', active ? 1.2 : 0);
      }

      c.label.interrupt().transition().duration(140)
        .attr('fill', active ? shadeColor(titleColor, 0.4) : CHART_LABEL)
        .attr('opacity', active ? 1 : (dimmed ? 0.68 : 0.92))
        .attr('font-weight', active ? '700' : null);

      c.hit.interrupt().transition().duration(140)
        .attr('fill', 'transparent')
        .attr('stroke', 'none')
        .attr('stroke-width', 0);
    }

    function activateColumn(idx) {
      if (activeColumnIndex === idx) return;
      columns.forEach((c, i) => {
        styleColumn(c, { active: i === idx, dimmed: i !== idx });
      });
      activeColumnIndex = idx;
    }

    function clearActiveColumn() {
      if (activeColumnIndex >= 0) {
        columns.forEach((c) => styleColumn(c, { active: false, dimmed: false }));
      }
      activeColumnIndex = -1;
    }

    data.forEach((d, i) => {
      const bx = axisX + i * (BAR_W + BAR_G);
      let h15, h18;

      if (dotMode) {
        const n15 = d.by15_n ?? 0, n18 = d.by18_n ?? 0;
        h15 = yScale(0) - yScale(n15);
        h18 = Math.max(0, yScale(0) - yScale(n18 - n15));
      } else {
        h15 = yScale(0) - yScale(d.by15_pct ?? 0);
        h18 = Math.max(0, yScale(0) - yScale((d.by18_pct ?? 0) - (d.by15_pct ?? 0)));
      }

      const barBottom = frameY + PAD.top + chartH;
      const bar18 = h18 > 0
        ? svg.append('rect').attr('x', bx).attr('y', prefersReducedMotion ? barBottom - h15 - h18 : barBottom)
          .attr('width', BAR_W).attr('height', prefersReducedMotion ? h18 : 0).attr('fill', colorBy18).attr('opacity', BASE_OPACITY_BY18)
        : null;
      const bar15 = h15 > 0
        ? svg.append('rect').attr('x', bx).attr('y', prefersReducedMotion ? barBottom - h15 : barBottom)
          .attr('width', BAR_W).attr('height', prefersReducedMotion ? h15 : 0).attr('fill', colorBy15).attr('opacity', BASE_OPACITY_BY15)
        : null;

      if (!prefersReducedMotion) {
        const delay = i * 12;
        if (bar15) {
          bar15.transition()
            .delay(delay)
            .duration(520)
            .ease(d3.easeCubicOut)
            .attr('y', barBottom - h15)
            .attr('height', h15)
            .on('end', () => { if (i === data.length - 1) animating = false; });
        }
        if (bar18) {
          bar18.transition()
            .delay(delay + 120)
            .duration(520)
            .ease(d3.easeCubicOut)
            .attr('y', barBottom - h15 - h18)
            .attr('height', h18);
        }
      }

      const labelCut = mobileFullscreen ? 8 : 10;
      const name = d.country.length > labelCut ? d.country.slice(0, labelCut - 1) + '…' : d.country;
      const label = svg.append('text')
        .attr('transform', `translate(${bx + BAR_W / 2},${frameY + PAD.top + chartH + 4}) rotate(-55)`)
        .attr('text-anchor', 'end').attr('font-size', mobileFullscreen ? 6 : (compact ? 6.5 : 7.5)).attr('fill', CHART_LABEL).text(name);

      const hit = svg.append('rect').attr('x', bx).attr('y', frameY + PAD.top).attr('width', BAR_W).attr('height', chartH)
        .attr('rx', 3)
        .attr('fill', 'transparent').style('cursor', 'default')
        .on('mousemove', e => {
          activateColumn(i);
          showTip(e,
          `<strong>${d.country}</strong> · ${d.year ?? '—'}<br>` +
          (d.source ? `<em style="opacity:.6;font-size:9px">${d.source}</em><br>` : '') +
          `<span style="color:${colorBy15}">●</span> Prima dei 15: <strong>${fmt(d.by15_pct, '%')}</strong>` +
          (d.by15_n != null ? `  (${fmtN(d.by15_n)})` : '') + '<br>' +
          `<span style="color:${colorBy18}">●</span> Prima dei 18: <strong>${fmt(d.by18_pct, '%')}</strong>` +
          (d.by18_n != null ? `  (${fmtN(d.by18_n)})` : '')
          );
        })
        .on('mouseleave', () => {
          clearActiveColumn();
          hideTip();
        });

      if (coarsePointer) {
        hit.on('click', e => {
          activateColumn(i);
          showTip(e,
            `<strong>${d.country}</strong> · ${d.year ?? '—'}<br>` +
            (d.source ? `<em style="opacity:.6;font-size:9px">${d.source}</em><br>` : '') +
            `<span style="color:${colorBy15}">●</span> Prima dei 15: <strong>${fmt(d.by15_pct, '%')}</strong>` +
            (d.by15_n != null ? `  (${fmtN(d.by15_n)})` : '') + '<br>' +
            `<span style="color:${colorBy18}">●</span> Prima dei 18: <strong>${fmt(d.by18_pct, '%')}</strong>` +
            (d.by18_n != null ? `  (${fmtN(d.by18_n)})` : '')
          );
        });
      }

      columns.push({ bar18, bar15, label, hit });
    });

    svg.on('mouseleave', () => {
      clearActiveColumn();
      hideTip();
    });

    /* ── Legenda top-right ──────────────────────────────────── */
    if (!mobileFullscreen) {
      const LEG_ITEMS = [
        { color: colorBy15, label: 'Prima dei 15 anni' },
        { color: colorBy18, label: 'Tra 15 e 18 anni'  },
      ];
      const LP = compact ? 6 : 8, LHH = compact ? 12 : 14, LRH = compact ? 14 : 16, LW = compact ? 128 : 148;
      const LH = LP + LHH + 4 + LEG_ITEMS.length * LRH + LP;
      const LX = Math.min(frameX + svgW, axisX + barsW) - 4;
      const LY = frameY + PAD.top + 4;
      const legG = svg.append('g').attr('transform', `translate(${LX},${LY})`);
      legG.append('rect').attr('x', -LW).attr('y', 0).attr('width', LW).attr('height', LH)
        .attr('rx', 6).attr('fill', getUiColor('chartPanel', 'rgba(255, 253, 249, 0.94)')).attr('stroke', UI_MUTED_BORDER).attr('stroke-width', 1);
      legG.append('text').attr('x', -LW + 10).attr('y', LP + 9)
        .attr('font-size', compact ? 7 : 8).attr('font-weight', '700').attr('fill', CHART_AXIS).attr('letter-spacing', '0.08em')
        .text('FASCIA');
      LEG_ITEMS.forEach((item, i) => {
        const ly = LP + LHH + 4 + i * LRH;
        legG.append('circle').attr('cx', -LW + 14).attr('cy', ly + 5).attr('r', 4)
          .attr('fill', item.color).attr('opacity', 0.85);
        legG.append('text').attr('x', -LW + 23).attr('y', ly + 9)
          .attr('font-size', compact ? 8 : 9).attr('fill', CHART_LABEL).text(item.label);
      });
    }
  }

  /* ── Draw dispatcher ────────────────────────────────────── */
  function renderCurrentView() {
    vizDiv.selectAll('svg,div').remove();
    vizDiv.style('overflow-x', drillDown ? 'auto' : 'hidden').style('overflow-y', 'hidden');

    const cn = vizDiv.node();
    const W  = cn.getBoundingClientRect().width  || 560;
    const H  = cn.getBoundingClientRect().height || 400;

    drillDown ? drawDrillDown(W, H) : drawOverview(W, H);
  }

  function draw() {
    const host = vizDiv.node();
    if (window.runChartViewTransition && host) {
      window.runChartViewTransition(host, renderCurrentView, {
        duration: 185,
        enterDuration: 315,
        offsetY: 10
      });
      return;
    }
    renderCurrentView();
  }

  draw();

  /* ── API triggerChartState ──────────────────────────────── */
  const el = container.node();
  el._marriageReset     = () => { selectedContinent = 'Africa'; drillDown = false; dotMode = false; draw(); };
  el._marriageHighlight = (continent = 'Africa') => { selectedContinent = continent; drillDown = false; draw(); };
  el._marriageShowTrend = (continent = 'Africa') => { selectedContinent = continent; drillDown = true;  draw(); };
  el._getHelpContext = () => ({
    drillDown,
    dotMode,
    selectedContinent,
  });
}
