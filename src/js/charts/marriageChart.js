/* ============================================================
   Grafico 4-2 (Atto III) — Waffle chart matrimoni precoci
   Overview: Africa vs Europa side by side
   Click → drill-down griglia paesi per continente
   ============================================================ */
async function renderMarriageChart(selector = '#chart-4-2', isFullscreen = false) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html('');
  container.style('width', '100%').style('height', '100%').style('position', 'relative').style('font-family', 'inherit');

  const raw = await d3.csv('datasets/processed/child_marriage.csv', d3.autoType);

  const latestMap = new Map();
  raw.forEach(d => {
    if (!d.code || d.value == null) return;
    const prev = latestMap.get(d.code);
    if (!prev || d.year > prev.year) latestMap.set(d.code, d);
  });

  const africaCountries = Array.from(latestMap.values())
    .filter(d => d.continent === 'Africa')
    .sort((a, b) => b.value - a.value);

  const europeCountries = Array.from(latestMap.values())
    .filter(d => d.continent === 'Europe')
    .sort((a, b) => b.value - a.value);

  const africaMean = d3.mean(africaCountries, d => d.value);
  const europeMean = europeCountries.length ? d3.mean(europeCountries, d => d.value) : 0;
  const COLOR_AF = '#c0392b';
  const COLOR_EU = '#5aab6e';

  d3.select('body').selectAll('.tooltip-marriage').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip-marriage')
    .style('position', 'absolute').style('background', 'rgba(20,20,40,0.92)')
    .style('color', '#fff').style('border-radius', '6px').style('padding', '8px 12px')
    .style('pointer-events', 'none').style('font-size', '11px').style('line-height', '1.6')
    .style('z-index', '10000').style('display', 'none');

  function showTip(e, html) {
    tooltip.style('display', 'block').html(html);
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 12, ty = e.pageY + 8;
    if (tx + r.width  > window.innerWidth  - 8) tx = e.pageX - r.width  - 12;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 8;
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }
  function hideTip() { tooltip.style('display', 'none'); }

  const containerNode = container.node();
  let drillDown = null; // null | 'Africa' | 'Europe'

  // Back button
  const backBtn = d3.select(containerNode).append('div')
    .style('position', 'absolute').style('top', '6px').style('left', '8px').style('display', 'none')
    .style('cursor', 'pointer').style('font-size', '11px').style('color', '#4a6fa5')
    .style('background', 'rgba(255,255,255,0.92)').style('border', '1px solid #c8d4e8')
    .style('border-radius', '6px').style('padding', '3px 10px').style('z-index', '10')
    .on('click', () => { drillDown = null; draw(); });

  function drawWaffle(svg, gx, gy, pct, cellSize, gap, color, cols = 10, rows = 10) {
    const filled = Math.round(Math.min(100, Math.max(0, pct)));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        svg.append('rect')
          .attr('x', gx + c * (cellSize + gap))
          .attr('y', gy + r * (cellSize + gap))
          .attr('width', cellSize).attr('height', cellSize)
          .attr('rx', Math.max(1, cellSize * 0.18))
          .attr('fill', idx < filled ? color : '#e8e8e8')
          .attr('opacity', idx < filled ? 0.85 : 0.45);
      }
    }
  }

  function draw() {
    d3.select(containerNode).selectAll('svg').remove();
    backBtn.style('display', drillDown ? 'block' : 'none');
    backBtn.text('← Panoramica');

    const W = containerNode.getBoundingClientRect().width  || 560;
    const H = containerNode.getBoundingClientRect().height || 420;

    if (drillDown) drawGrid(W, H, drillDown);
    else           drawOverview(W, H);
  }

  /* ── Overview: Africa vs Europa waffles side by side ─────── */
  function drawOverview(W, H) {
    const COLS = 10, ROWS = 10;
    const margin = { top: 48, bottom: 52, left: 16, right: 16 };
    const halfW  = (W - margin.left - margin.right) / 2 - 12;
    const avail  = Math.min(halfW, H - margin.top - margin.bottom);
    const cellSize = Math.max(5, Math.floor(avail / COLS) - 2);
    const gap  = 2;
    const gridW = COLS * (cellSize + gap) - gap;
    const gridH = ROWS * (cellSize + gap) - gap;
    const gy   = margin.top + (H - margin.top - margin.bottom - gridH) / 2;

    const svg = d3.select(containerNode).append('svg')
      .attr('width', W).attr('height', H).style('display', 'block').style('font-family', 'inherit');

    // Africa waffle (left)
    const gxA = margin.left + (halfW - gridW) / 2;
    svg.append('text').attr('x', gxA + gridW / 2).attr('y', 18)
      .attr('text-anchor', 'middle').attr('font-size', 12).attr('font-weight', '700').attr('fill', COLOR_AF)
      .text('Africa');
    svg.append('text').attr('x', gxA + gridW / 2).attr('y', 34)
      .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#555')
      .text(`media ${africaMean.toFixed(1)}%`);
    drawWaffle(svg, gxA, gy, africaMean, cellSize, gap, COLOR_AF);

    svg.append('rect').attr('x', gxA).attr('y', gy).attr('width', gridW).attr('height', gridH)
      .attr('fill', 'transparent').style('cursor', 'pointer')
      .on('mousemove', e => showTip(e,
        `<strong style="color:${COLOR_AF}">Africa — media</strong><br>` +
        `${africaMean.toFixed(1)}% sposate prima dei 18<br>` +
        `Dati da ${africaCountries.length} paesi<br>` +
        `<em style="opacity:.6;font-size:10px">Clicca per i singoli paesi</em>`
      ))
      .on('mouseleave', hideTip)
      .on('click', () => { drillDown = 'Africa'; draw(); });

    // Europa waffle (right)
    const gxE = margin.left + halfW + 24 + (halfW - gridW) / 2;
    svg.append('text').attr('x', gxE + gridW / 2).attr('y', 18)
      .attr('text-anchor', 'middle').attr('font-size', 12).attr('font-weight', '700').attr('fill', COLOR_EU)
      .text('Europa');
    svg.append('text').attr('x', gxE + gridW / 2).attr('y', 34)
      .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#555')
      .text(europeCountries.length ? `media ${europeMean.toFixed(1)}%` : 'dati limitati');
    drawWaffle(svg, gxE, gy, europeMean, cellSize, gap, COLOR_EU);

    svg.append('rect').attr('x', gxE).attr('y', gy).attr('width', gridW).attr('height', gridH)
      .attr('fill', 'transparent').style('cursor', europeCountries.length ? 'pointer' : 'default')
      .on('mousemove', e => showTip(e,
        `<strong style="color:${COLOR_EU}">Europa — media</strong><br>` +
        `${europeMean.toFixed(1)}% sposate prima dei 18<br>` +
        `Dati da ${europeCountries.length} paesi` +
        (europeCountries.length ? `<br><em style="opacity:.6;font-size:10px">Clicca per i singoli paesi</em>` : '')
      ))
      .on('mouseleave', hideTip)
      .on('click', () => { if (europeCountries.length) { drillDown = 'Europe'; draw(); } });

    // Legend
    const lgY = gy + gridH + 12;
    svg.append('rect').attr('x', gxA).attr('y', lgY).attr('width', cellSize).attr('height', cellSize).attr('rx', 2).attr('fill', COLOR_AF).attr('opacity', 0.85);
    svg.append('text').attr('x', gxA + cellSize + 4).attr('y', lgY + cellSize - 1).attr('font-size', 8.5).attr('fill', '#555').text('= 1% sposate');
    svg.append('rect').attr('x', gxA + 110).attr('y', lgY).attr('width', cellSize).attr('height', cellSize).attr('rx', 2).attr('fill', '#e8e8e8').attr('opacity', 0.7);
    svg.append('text').attr('x', gxA + 110 + cellSize + 4).attr('y', lgY + cellSize - 1).attr('font-size', 8.5).attr('fill', '#555').text('= non sposate');

    svg.append('text').attr('x', W / 2).attr('y', H - 8)
      .attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#bbb')
      .text('Clicca su un continente per esplorare i singoli paesi →');
  }

  /* ── Drill-down: griglia waffle per paese ─────────────────── */
  function drawGrid(W, H, continent) {
    const ctrs  = continent === 'Africa' ? africaCountries : europeCountries;
    const color = continent === 'Africa' ? COLOR_AF : COLOR_EU;
    const COLS = Math.max(2, Math.min(6, Math.floor(W / 110)));
    const ROWS = Math.ceil(ctrs.length / COLS);

    const PAD = { top: 30, right: 8, bottom: 8, left: 8 };
    const GAP = 8;
    const panelW = (W - PAD.left - PAD.right - GAP * (COLS - 1)) / COLS;

    const G_COLS = 10, G_ROWS = 10;
    const cellSize = Math.max(2.5, Math.min((panelW - 16) / G_COLS - 1.2, 9));
    const gap = 1;
    const gridW = G_COLS * (cellSize + gap) - gap;
    const gridH = G_ROWS * (cellSize + gap) - gap;
    const panelH = gridH + 34;
    const totalH = PAD.top + ROWS * (panelH + GAP) + 8;

    const svg = d3.select(containerNode).append('svg')
      .attr('width', W).attr('height', Math.max(H, totalH))
      .style('display', 'block').style('font-family', 'inherit');

    svg.append('text').attr('x', W / 2).attr('y', 20)
      .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#888')
      .text(`${continent === 'Africa' ? 'Africa' : 'Europa'} · ${ctrs.length} paesi · ordinati per % decrescente`);

    ctrs.forEach((d, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const px  = PAD.left + col * (panelW + GAP);
      const py  = PAD.top  + row * (panelH + GAP);

      svg.append('rect').attr('x', px).attr('y', py).attr('width', panelW).attr('height', panelH)
        .attr('fill', 'none').attr('stroke', '#e8e8e8').attr('stroke-width', 1).attr('rx', 4);

      const name = d.country.length > 14 ? d.country.slice(0, 13) + '…' : d.country;
      svg.append('text').attr('x', px + panelW / 2).attr('y', py + 11)
        .attr('text-anchor', 'middle').attr('font-size', 8).attr('font-weight', '600').attr('fill', '#333')
        .text(name);
      svg.append('text').attr('x', px + panelW / 2).attr('y', py + 22)
        .attr('text-anchor', 'middle').attr('font-size', 8).attr('fill', color).attr('font-weight', '700')
        .text(`${d.value.toFixed(1)}%`);

      const gx = px + (panelW - gridW) / 2;
      const gy = py + 26;
      drawWaffle(svg, gx, gy, d.value, cellSize, gap, color);

      svg.append('rect').attr('x', px).attr('y', py).attr('width', panelW).attr('height', panelH)
        .attr('fill', 'transparent').style('cursor', 'default')
        .on('mousemove', e => showTip(e,
          `<strong style="color:${color}">${d.country}</strong><br>` +
          `Sposate prima dei 18: <strong>${d.value.toFixed(1)}%</strong><br>` +
          `Anno: ${d.year}`
        ))
        .on('mouseleave', hideTip);
    });
  }

  draw();

  containerNode._marriageReset       = () => { drillDown = null;      draw(); };
  containerNode._marriageHighlight   = () => { drillDown = null;      draw(); };
  containerNode._marriageShowTrend   = () => { drillDown = 'Africa';  draw(); };
}
