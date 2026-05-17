/* ============================================================
   Grafico 4-2 (Atto III) — Waffle chart matrimoni precoci Africa
   Default: un waffle grande → media Africa
   Click → drill-down griglia paesi
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

  const africaMean = d3.mean(africaCountries, d => d.value);
  const COLOR = '#c0392b';

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
  let drillDown = false;

  // Back button
  const backBtn = d3.select(containerNode).append('div')
    .style('position', 'absolute').style('top', '6px').style('left', '8px').style('display', 'none')
    .style('cursor', 'pointer').style('font-size', '11px').style('color', '#4a6fa5')
    .style('background', 'rgba(255,255,255,0.92)').style('border', '1px solid #c8d4e8')
    .style('border-radius', '6px').style('padding', '3px 10px').style('z-index', '10')
    .text('← Africa')
    .on('click', () => { drillDown = false; draw(); });

  function drawWaffle(svg, gx, gy, pct, cellSize, gap, cols = 10, rows = 10, countryData = null) {
    const filled = Math.round(Math.min(100, Math.max(0, pct)));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const isFilled = idx < filled;
        svg.append('rect')
          .attr('x', gx + c * (cellSize + gap))
          .attr('y', gy + r * (cellSize + gap))
          .attr('width', cellSize).attr('height', cellSize)
          .attr('rx', Math.max(1, cellSize * 0.18))
          .attr('fill', isFilled ? COLOR : '#e8e8e8')
          .attr('opacity', isFilled ? 0.85 : 0.45);
      }
    }
  }

  function draw() {
    d3.select(containerNode).selectAll('svg').remove();
    backBtn.style('display', drillDown ? 'block' : 'none');

    const W = containerNode.getBoundingClientRect().width  || 560;
    const H = containerNode.getBoundingClientRect().height || 420;

    if (drillDown) drawGrid(W, H);
    else           drawOverview(W, H);
  }

  /* ── Overview: un waffle grande = media Africa ────────────── */
  function drawOverview(W, H) {
    const COLS = 10, ROWS = 10;
    const margin = { top: 56, bottom: 52, left: 20, right: 20 };
    const avail  = Math.min(W - margin.left - margin.right, H - margin.top - margin.bottom);
    const cellSize = Math.max(8, Math.floor(avail / COLS) - 2);
    const gap = 2;
    const gridW = COLS * (cellSize + gap) - gap;
    const gridH = ROWS * (cellSize + gap) - gap;

    const svg = d3.select(containerNode).append('svg')
      .attr('width', W).attr('height', H).style('display', 'block').style('font-family', 'inherit');

    // Title
    svg.append('text').attr('x', W / 2).attr('y', 22)
      .attr('text-anchor', 'middle').attr('font-size', 13).attr('font-weight', '700').attr('fill', COLOR)
      .text('Africa — matrimoni precoci');

    svg.append('text').attr('x', W / 2).attr('y', 40)
      .attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#555')
      .text(`Media: ${africaMean.toFixed(1)}% delle ragazze sposate prima dei 18 anni`);

    const gx = (W - gridW) / 2;
    const gy = margin.top + (H - margin.top - margin.bottom - gridH) / 2;

    drawWaffle(svg, gx, gy, africaMean, cellSize, gap);

    // Legend
    svg.append('rect').attr('x', gx).attr('y', gy + gridH + 12)
      .attr('width', cellSize).attr('height', cellSize).attr('rx', 2).attr('fill', COLOR).attr('opacity', 0.85);
    svg.append('text').attr('x', gx + cellSize + 5).attr('y', gy + gridH + 12 + cellSize - 1)
      .attr('font-size', 9).attr('fill', '#555').text('= 1% di ragazze');
    svg.append('rect').attr('x', gx + 120).attr('y', gy + gridH + 12)
      .attr('width', cellSize).attr('height', cellSize).attr('rx', 2).attr('fill', '#e8e8e8').attr('opacity', 0.7);
    svg.append('text').attr('x', gx + 120 + cellSize + 5).attr('y', gy + gridH + 12 + cellSize - 1)
      .attr('font-size', 9).attr('fill', '#555').text('= non sposate');

    // Click overlay
    svg.append('rect').attr('x', gx).attr('y', gy).attr('width', gridW).attr('height', gridH)
      .attr('fill', 'transparent').style('cursor', 'pointer')
      .on('mousemove', e => showTip(e,
        `<strong style="color:${COLOR}">Africa — media</strong><br>` +
        `${africaMean.toFixed(1)}% sposate prima dei 18<br>` +
        `Dati da ${africaCountries.length} paesi<br>` +
        `<em style="opacity:.6;font-size:10px">Clicca per vedere i singoli paesi</em>`
      ))
      .on('mouseleave', hideTip)
      .on('click', () => { drillDown = true; draw(); });

    // Prompt
    svg.append('text').attr('x', W / 2).attr('y', H - 8)
      .attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#bbb')
      .text('Clicca sul grafico per esplorare i paesi →');
  }

  /* ── Drill-down: griglia waffle per paese ─────────────────── */
  function drawGrid(W, H) {
    const ctrs = africaCountries;
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
      .text(`Africa · ${ctrs.length} paesi · ordinati per % decrescente`);

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
        .attr('text-anchor', 'middle').attr('font-size', 8).attr('fill', COLOR).attr('font-weight', '700')
        .text(`${d.value.toFixed(1)}%`);

      const gx = px + (panelW - gridW) / 2;
      const gy = py + 26;
      drawWaffle(svg, gx, gy, d.value, cellSize, gap);

      svg.append('rect').attr('x', px).attr('y', py).attr('width', panelW).attr('height', panelH)
        .attr('fill', 'transparent').style('cursor', 'default')
        .on('mousemove', e => showTip(e,
          `<strong style="color:${COLOR}">${d.country}</strong><br>` +
          `Sposate prima dei 18: <strong>${d.value.toFixed(1)}%</strong><br>` +
          `Anno: ${d.year}`
        ))
        .on('mouseleave', hideTip);
    });
  }

  draw();

  containerNode._marriageReset       = () => { drillDown = false; draw(); };
  containerNode._marriageHighlight   = () => { drillDown = false; draw(); };
  containerNode._marriageShowTrend   = () => { drillDown = true;  draw(); };
}
