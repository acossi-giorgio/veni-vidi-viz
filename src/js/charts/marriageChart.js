/* ============================================================
   Grafico 4-2 (Atto III) — Matrimoni precoci (Africa)
   Overview: waffle Africa 10×10 (by15 + by18) + pannello stats
   Drill-down: stacked bar per paese — toggle % / Assoluto
   ============================================================ */
async function renderMarriageChart(selector = '#chart-4-2', isFullscreen = false) {
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

  const raw = await d3.csv('datasets/processed/child_marriage_cmmm.csv', d3.autoType);

  const C_BY15  = '#7b2226';
  const C_BY18  = '#e07b6a';
  const C_EMPTY = '#e8e8e8';

  let drillDown = false;
  let dotMode   = false;

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
    .style('position', 'absolute').style('background', 'rgba(20,20,40,0.93)')
    .style('color', '#fff').style('border-radius', '6px').style('padding', '8px 13px')
    .style('pointer-events', 'none').style('font-size', '11px').style('line-height', '1.7')
    .style('z-index', '10000').style('display', 'none').style('max-width', '230px');

  function showTip(e, html) {
    tooltip.style('display', 'block').html(html);
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 14, ty = e.pageY + 10;
    if (tx + r.width  > window.innerWidth  - 8) tx = e.pageX - r.width  - 14;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 10;
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }
  function hideTip() { tooltip.style('display', 'none'); }

  /* ── Viz container ──────────────────────────────────────── */
  const vizDiv = container.append('div')
    .style('flex', '1 1 0').style('position', 'relative').style('overflow', 'hidden');

  /* ── Back button ────────────────────────────────────────── */
  const backBtn = container.append('button')
    .attr('class', 'chart-back-btn chart-back-btn--icon')
    .attr('aria-label', 'Torna alla panoramica')
    .attr('title', 'Torna alla panoramica')
    .style('position', 'absolute').style('top', '8px').style('left', '8px')
    .style('display', 'none').style('z-index', '20')
    .html('<span class="chart-back-icon" aria-hidden="true"></span>')
    .on('click', () => { drillDown = false; dotMode = false; draw(); });

  /* ── Waffle helper ──────────────────────────────────────── */
  function drawWaffle(svg, x0, y0, pct15, pct18, cs, gap, COLS, ROWS) {
    const total = COLS * ROWS;
    const n15   = Math.round(Math.min(total, pct15));
    const n18   = Math.round(Math.min(total - n15, Math.max(0, pct18 - pct15)));
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const idx  = row * COLS + col;
        const fill = idx < n15 ? C_BY15 : idx < n15 + n18 ? C_BY18 : C_EMPTY;
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

    const PAD  = compact ? { top: 12, bottom: 12, left: 16, right: 14 } : { top: 16, bottom: 16, left: 24, right: 20 };
    const PW   = compact ? (veryCompact ? 64 : 70) : 80;
    const PGAP = compact ? (veryCompact ? 16 : 20) : 28;
    const PP   = compact ? 10 : 14;
    const leftZoneW = W - PAD.left - PAD.right - PW - PGAP;
    const avH       = H - PAD.top - PAD.bottom;

    const TITLE_H = 34, HINT_H = 20;
    const maxWaffle = Math.min(avH - TITLE_H - HINT_H, leftZoneW);
    const afGap     = 2;
    const afCS      = Math.max(5, Math.floor((maxWaffle - 9 * afGap) / 10));
    const afW       = 10 * afCS + 9 * afGap;
    const blockH    = TITLE_H + afW + HINT_H;
    const blockY    = PAD.top + (avH - blockH) / 2;
    const afX       = PAD.left + (leftZoneW - afW) / 2;
    const afY       = blockY + TITLE_H;

    const svg = vizDiv.append('svg').attr('width', W).attr('height', H)
      .style('display', 'block').style('font-family', 'inherit');

    svg.append('text').attr('x', afX + afW / 2).attr('y', blockY + 14)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 12 : 14).attr('font-weight', '700').attr('fill', '#b04a4a')
      .text('Africa');
    svg.append('text').attr('x', afX + afW / 2).attr('y', blockY + 28)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 7.5 : 8.5).attr('fill', '#bbb')
      .text(`${n} paesi · ponderato per base donne · ogni cella = 1%`);

    drawWaffle(svg, afX, afY, af15, af18, afCS, afGap, 10, 10);

    svg.append('rect').attr('x', afX).attr('y', afY).attr('width', afW).attr('height', afW)
      .attr('fill', 'transparent').style('cursor', 'pointer')
      .on('mousemove', e => showTip(e,
        `<strong style="color:#b04a4a">Africa</strong><br>` +
        `<span style="color:${C_BY15}">●</span> Prima dei 15: <strong>${fmt(af15, '%')}</strong> (${fmtN(afN15)})<br>` +
        `<span style="color:${C_BY18}">●</span> Prima dei 18: <strong>${fmt(af18, '%')}</strong> (${fmtN(afN18)})<br>` +
        `<em style="opacity:.5;font-size:9px">clicca per i singoli paesi →</em>`
      ))
      .on('mouseleave', hideTip)
      .on('click', () => { drillDown = true; draw(); });

    svg.append('text').attr('x', afX + afW / 2).attr('y', afY + afW + 14)
      .attr('text-anchor', 'middle').attr('font-size', compact ? 7 : 8).attr('fill', '#ccc')
      .text('clicca per esplorare i singoli paesi →');

    /* ── Pannello stats destra ──────────────────────────────── */
    const px0    = afX + afW + PGAP;
    const panelH = compact ? 220 : 250;
    const py0    = blockY + (blockH - panelH) / 2;

    svg.append('rect').attr('x', px0 - PP).attr('y', py0 - PP)
      .attr('width', PW + PP * 2).attr('height', panelH + PP * 2)
      .attr('rx', 8).attr('fill', '#fafafa').attr('stroke', '#e8e8e8').attr('stroke-width', 1);

    const sections = [
      { title: 'Africa', titleColor: '#b04a4a', rows: [
          { label: 'Prima dei 15', pct: fmt(af15, '%'), n: fmtN(afN15), color: C_BY15 },
          { label: 'Prima dei 18', pct: fmt(af18, '%'), n: fmtN(afN18), color: C_BY18 },
        ]
      },
      { title: 'Europa', titleColor: '#4a6fa5', rows: [
          { label: 'Prima dei 15', pct: fmt(eu15, '%'), n: fmtN(euN15), color: C_BY15 },
          { label: 'Prima dei 18', pct: fmt(eu18, '%'), n: fmtN(euN18), color: C_BY18 },
        ]
      },
    ];

    let curY = py0 + 6;
    sections.forEach((sec, si) => {
      if (si > 0) {
        svg.append('line').attr('x1', px0 - PP + 6).attr('x2', px0 + PW + PP - 6)
          .attr('y1', curY).attr('y2', curY).attr('stroke', '#e8e8e8');
        curY += 10;
      }
      svg.append('text').attr('x', px0).attr('y', curY + 10)
        .attr('font-size', compact ? 8 : 9).attr('font-weight', '700').attr('fill', sec.titleColor).text(sec.title);
      curY += 20;
      sec.rows.forEach(r => {
        svg.append('circle').attr('cx', px0 + 5).attr('cy', curY + 2).attr('r', 4.5)
          .attr('fill', r.color).attr('opacity', 0.88);
        svg.append('text').attr('x', px0 + 14).attr('y', curY + 6)
          .attr('font-size', compact ? 7 : 8).attr('fill', '#999').text(r.label);
        curY += 16;
        svg.append('text').attr('x', px0).attr('y', curY + 12)
          .attr('font-size', compact ? 15 : 17).attr('font-weight', '700').attr('fill', r.color).text(r.pct);
        curY += 16;
        svg.append('text').attr('x', px0).attr('y', curY + 4)
          .attr('font-size', compact ? 6.5 : 7.5).attr('fill', '#bbb').text(`≈ ${r.n}`);
        curY += 18;
      });
    });

    svg.append('text').attr('x', px0).attr('y', py0 + panelH + PP + 10)
      .attr('font-size', compact ? 6 : 7).attr('fill', '#ccc').text('Fonte: CMMM/UNICEF 2025');
  }

  /* ── DRILL-DOWN: stacked bar ────────────────────────────── */
  function drawDrillDown(W, H) {
    const data = raw
      .filter(d => d.continent === 'Africa' && d.by18_pct != null)
      .sort((a, b) => b.by18_pct - a.by18_pct);

    data.forEach(d => {
      if (d.by18_pct > 0 && d.by18_n != null) {
        d._total_n   = d.by18_n / (d.by18_pct / 100);
        d._notby18_n = d._total_n - d.by18_n;
      } else {
        d._total_n = null; d._notby18_n = null;
      }
    });

    const PAD    = compact ? { top: 40, bottom: 60, left: 42, right: 10 } : { top: 44, bottom: 68, left: 52, right: 12 };
    const chartH = H - PAD.top - PAD.bottom;
    const BAR_G  = 2;
    const availW = W - PAD.left - PAD.right;
    const BAR_W  = Math.max(10, Math.min(28, Math.floor(availW / data.length) - BAR_G));
    const barsW  = data.length * (BAR_W + BAR_G);
    const totalW = PAD.left + barsW + PAD.right;

    /* center bars if they fit within the container */
    const svgW        = Math.max(W, totalW);
    const barsOffsetX = svgW > totalW ? (svgW - totalW) / 2 : 0;

    vizDiv.style('overflow-x', svgW > W ? 'auto' : 'hidden').style('overflow-y', 'hidden');

    const svg = vizDiv.append('svg')
      .attr('width', svgW).attr('height', H)
      .style('display', 'block').style('font-family', 'inherit');

    /* ── Toggle % / Assoluto — top-left pill (after back btn) ─ */
    const controlRow = vizDiv.append('div')
      .style('position', 'absolute').style('top', compact ? '6px' : '8px').style('left', compact ? '6px' : '8px')
      .style('display', 'flex').style('align-items', 'center').style('gap', compact ? '4px' : '6px')
      .style('z-index', '10');

    controlRow.node().appendChild(backBtn.node());
    backBtn
      .style('position', 'static')
      .style('top', null)
      .style('left', null)
      .style('z-index', null)
      .style('display', 'inline-flex');

    const pillBar = controlRow.append('div')
      .style('display', 'flex').style('background', 'rgba(255,255,255,0.92)')
      .style('border-radius', compact ? '8px' : '9px').style('border', '1px solid #d0d8e8')
      .style('padding', compact ? '2px' : '3px').style('gap', '2px')
      .style('box-shadow', '0 1px 6px rgba(0,0,0,0.10)');

    function mkToggleBtn(label, active) {
      return pillBar.append('button')
        .style('font-size', compact ? '10px' : '11px').style('padding', compact ? '4px 10px' : '5px 14px').style('border-radius', compact ? '5px' : '6px')
        .style('border', 'none').style('cursor', 'pointer').style('font-weight', '600')
        .style('transition', 'all 0.15s')
        .style('background', active ? '#4a6fa5' : 'transparent')
        .style('color',      active ? '#fff'    : '#7a8aaa')
        .style('box-shadow', active ? '0 1px 4px rgba(74,111,165,0.3)' : 'none')
        .text(label);
    }

    mkToggleBtn('%',        !dotMode).on('click', () => { dotMode = false; vizDiv.selectAll('*').remove(); drawDrillDown(W, H); });
    mkToggleBtn('Assoluto',  dotMode).on('click', () => { dotMode = true;  vizDiv.selectAll('*').remove(); drawDrillDown(W, H); });

    /* ── Scale Y ──────────────────────────────────────────── */
    const yScale = dotMode
      ? d3.scaleLinear().domain([0, 25e6]).range([chartH, 0])
      : d3.scaleLinear().domain([0, 100]).range([chartH, 0]);

    const yFmt = dotMode
      ? v => v >= 1e6 ? (v / 1e6).toFixed(0) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : v
      : v => v + '%';

    const axisX = barsOffsetX + PAD.left;

    const yG = svg.append('g').attr('transform', `translate(${axisX},${PAD.top})`)
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(yFmt).tickSize(-barsW));
    yG.select('.domain').remove();
    yG.selectAll('.tick line').attr('stroke', '#e8e8e8');
    yG.selectAll('.tick text').attr('font-size', compact ? 7 : 8).attr('fill', '#888');

    svg.append('text').attr('x', axisX + barsW / 2).attr('y', PAD.top - 8)
      .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#999')
      .text(`Africa · ${data.length} paesi · ordinati per % prima dei 18`);

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

      const barBottom = PAD.top + chartH;
      if (h18 > 0) svg.append('rect').attr('x', bx).attr('y', barBottom - h15 - h18)
        .attr('width', BAR_W).attr('height', h18).attr('fill', C_BY18).attr('opacity', 0.88);
      if (h15 > 0) svg.append('rect').attr('x', bx).attr('y', barBottom - h15)
        .attr('width', BAR_W).attr('height', h15).attr('fill', C_BY15).attr('opacity', 0.9);

      const name = d.country.length > 10 ? d.country.slice(0, 9) + '…' : d.country;
      svg.append('text')
        .attr('transform', `translate(${bx + BAR_W / 2},${PAD.top + chartH + 4}) rotate(-55)`)
        .attr('text-anchor', 'end').attr('font-size', compact ? 6.5 : 7.5).attr('fill', '#666').text(name);

      svg.append('rect').attr('x', bx).attr('y', PAD.top).attr('width', BAR_W).attr('height', chartH)
        .attr('fill', 'transparent').style('cursor', 'default')
        .on('mousemove', e => showTip(e,
          `<strong>${d.country}</strong> · ${d.year ?? '—'}<br>` +
          (d.source ? `<em style="opacity:.6;font-size:9px">${d.source}</em><br>` : '') +
          `<span style="color:${C_BY15}">●</span> Prima dei 15: <strong>${fmt(d.by15_pct, '%')}</strong>` +
          (d.by15_n != null ? `  (${fmtN(d.by15_n)})` : '') + '<br>' +
          `<span style="color:${C_BY18}">●</span> Prima dei 18: <strong>${fmt(d.by18_pct, '%')}</strong>` +
          (d.by18_n != null ? `  (${fmtN(d.by18_n)})` : '')
        ))
        .on('mouseleave', hideTip);
    });

    /* ── Legenda top-right ──────────────────────────────────── */
    const LEG_ITEMS = [
      { color: C_BY15, label: 'Prima dei 15 anni' },
      { color: C_BY18, label: 'Tra 15 e 18 anni'  },
    ];
    const LP = compact ? 6 : 8, LHH = compact ? 12 : 14, LRH = compact ? 14 : 16, LW = compact ? 128 : 148;
    const LH = LP + LHH + 4 + LEG_ITEMS.length * LRH + LP;
    const LX = Math.min(svgW, axisX + barsW) - 4;
    const LY = PAD.top + 4;
    const legG = svg.append('g').attr('transform', `translate(${LX},${LY})`);
    legG.append('rect').attr('x', -LW).attr('y', 0).attr('width', LW).attr('height', LH)
      .attr('rx', 6).attr('fill', 'rgba(255,255,255,0.92)').attr('stroke', '#e0e0e0').attr('stroke-width', 1);
    legG.append('text').attr('x', -LW + 10).attr('y', LP + 9)
      .attr('font-size', compact ? 7 : 8).attr('font-weight', '700').attr('fill', '#aaa').attr('letter-spacing', '0.08em')
      .text('FASCIA');
    LEG_ITEMS.forEach((item, i) => {
      const ly = LP + LHH + 4 + i * LRH;
      legG.append('circle').attr('cx', -LW + 14).attr('cy', ly + 5).attr('r', 4)
        .attr('fill', item.color).attr('opacity', 0.85);
      legG.append('text').attr('x', -LW + 23).attr('y', ly + 9)
        .attr('font-size', compact ? 8 : 9).attr('fill', '#555').text(item.label);
    });
  }

  /* ── Draw dispatcher ────────────────────────────────────── */
  function draw() {
    vizDiv.selectAll('svg,div').remove();
    vizDiv.style('overflow-x', drillDown ? 'auto' : 'hidden').style('overflow-y', 'hidden');
    backBtn.style('display', drillDown ? 'inline-flex' : 'none');

    const cn = vizDiv.node();
    const W  = cn.getBoundingClientRect().width  || 560;
    const H  = cn.getBoundingClientRect().height || 400;

    drillDown ? drawDrillDown(W, H) : drawOverview(W, H);
  }

  draw();

  /* ── API triggerChartState ──────────────────────────────── */
  const el = container.node();
  el._marriageReset     = () => { drillDown = false; dotMode = false; draw(); };
  el._marriageHighlight = () => { drillDown = false; draw(); };
  el._marriageShowTrend = () => { drillDown = true;  draw(); };
}
