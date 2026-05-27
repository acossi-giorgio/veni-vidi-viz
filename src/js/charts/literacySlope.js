/* ============================================================
   Grafico 6 — Alfabetizzazione adulti (dot strip plot)
   Overview:   striscia orizzontale per continente.
               Ogni dot = un paese, X = tasso adulti (%).
               Dot più grandi = maggior progresso rispetto al primo dato.
   Drill-down: click su continente → bar chart paesi.
   API: _slopeShowAll()
        _slopeHighlightProgress()
        _slopeEnableControls()
   ============================================================ */

async function renderLiteracySlope(selector = '#chart-3-3', isFullscreen = false) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html('');
  container.style('width', '100%').style('height', '100%').style('position', 'relative').style('font-family', 'inherit');

  const raw = await d3.csv('datasets/processed/06_literacy.csv', d3.autoType);
  // Exclude world aggregate
  const data = raw.filter(d => d.iso3 !== 'OWID_WRL' && d.continent && d.adult_total != null && !isNaN(d.adult_total));

  const CONTINENT_COLOR = {
    'Africa': '#c0392b', 'Asia': '#2980b9', 'Europe': '#27ae60',
    'North America': '#8e44ad', 'South America': '#d35400', 'Oceania': '#16a085',
  };
  const CONTINENT_ORDER = ['Europe', 'North America', 'South America', 'Oceania', 'Asia', 'Africa'];

  // Per country: latest value + earliest value (for progress)
  const byCountry = d3.group(data, d => d.iso3);
  const countries = Array.from(byCountry, ([iso3, rows]) => {
    rows.sort((a, b) => a.year - b.year);
    const latest = rows[rows.length - 1];
    const earliest = rows[0];
    return {
      iso3,
      country: latest.country,
      continent: latest.continent,
      val: latest.adult_total,
      year: latest.year,
      firstVal: earliest.adult_total,
      firstYear: earliest.year,
      progress: latest.adult_total - earliest.adult_total,
      nPoints: rows.length,
    };
  }).filter(d => d.continent);

  // Continent summary
  const continentSummary = CONTINENT_ORDER.map(cont => {
    const rows = countries.filter(d => d.continent === cont);
    return { continent: cont, avg: d3.mean(rows, d => d.val), n: rows.length };
  }).filter(d => d.n > 0);

  // State
  let highlightProgress = false;
  let drillContinent = null;

  // Tooltip
  d3.select('body').selectAll('.tooltip-literacy').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip-literacy')
    .style('position', 'absolute').style('background', 'rgba(0,0,0,0.88)')
    .style('color', '#fff').style('border-radius', '6px').style('padding', '8px 12px')
    .style('pointer-events', 'none').style('font-size', '12px').style('line-height', '1.6')
    .style('z-index', '10000').style('display', 'none');
  function showTip(e, html) {
    tooltip.style('display', 'block').html(html);
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 14, ty = e.pageY + 8;
    if (tx + r.width > window.innerWidth - 8) tx = e.pageX - r.width - 14;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 8;
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }
  function hideTip() { tooltip.style('display', 'none'); }

  const wrapper = container.append('div')
    .style('display', 'flex').style('flex-direction', 'column').style('height', '100%');

  const headerBar = wrapper.append('div')
    .style('flex', '0 0 auto').style('display', 'flex').style('align-items', 'center')
    .style('gap', '8px').style('padding', '5px 8px').style('background', '#f5f5f5')
    .style('border-bottom', '1px solid #e0e0e0').style('min-height', '32px')
    .style('box-sizing', 'border-box');

  const chartArea = wrapper.append('div')
    .style('flex', '1 1 auto').style('overflow', 'hidden').style('position', 'relative');

  // ── Dot strip overview ─────────────────────────────────────────────────────
  function drawOverview() {
    headerBar.html('');
    headerBar.append('span').style('font-size', '11px').style('color', '#777')
      .text('Tasso di alfabetizzazione adulti (dato più recente disponibile) — clicca un continente per i paesi');

    chartArea.html('');
    const W = chartArea.node().getBoundingClientRect().width || 600;
    const H = chartArea.node().getBoundingClientRect().height || 380;
    if (W < 10 || H < 10) return;

    const margin = { top: 8, right: 16, bottom: 28, left: 100 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const visConts = continentSummary.filter(c => c.n > 0);
    const bandH = innerH / visConts.length;
    const R_BASE = Math.max(3, Math.min(5, bandH * 0.15));
    const R_BIG = R_BASE * 1.8;

    const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerW]);

    const svg = chartArea.append('svg').attr('width', W).attr('height', H)
      .style('display', 'block').style('font-family', 'inherit');
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X axis
    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d}%`))
      .call(gg => gg.select('.domain').attr('stroke', '#ddd'))
      .call(gg => gg.selectAll('text').attr('font-size', 10).attr('fill', '#888'))
      .call(gg => gg.selectAll('.tick line').attr('stroke', '#ddd'));

    // Grid lines
    [20, 40, 60, 80, 100].forEach(v => {
      g.append('line')
        .attr('x1', xScale(v)).attr('x2', xScale(v))
        .attr('y1', 0).attr('y2', innerH)
        .attr('stroke', '#ececec').attr('stroke-width', 1);
    });

    // Top-progress threshold: top 20%
    const progressVals = countries.filter(d => d.nPoints > 1).map(d => d.progress).sort((a, b) => b - a);
    const progressThreshold = progressVals[Math.floor(progressVals.length * 0.2)] || 20;

    visConts.forEach((cs, ci) => {
      const bandY = ci * bandH;
      const cy = bandY + bandH / 2;
      const color = CONTINENT_COLOR[cs.continent] || '#888';
      const contRows = countries.filter(d => d.continent === cs.continent);

      // Band background (hover target)
      g.append('rect')
        .attr('x', 0).attr('y', bandY + 2).attr('width', innerW).attr('height', bandH - 4)
        .attr('fill', 'transparent').style('cursor', 'pointer')
        .on('click', () => { drillContinent = cs.continent; draw(); });

      // Continent label
      g.append('text')
        .attr('x', -6).attr('y', cy + 4).attr('text-anchor', 'end')
        .attr('font-size', 11).attr('font-weight', '600').attr('fill', color)
        .style('cursor', 'pointer')
        .text(cs.continent)
        .on('click', () => { drillContinent = cs.continent; draw(); });

      // Average tick
      g.append('line')
        .attr('x1', xScale(cs.avg)).attr('x2', xScale(cs.avg))
        .attr('y1', bandY + 4).attr('y2', bandY + bandH - 4)
        .attr('stroke', color).attr('stroke-width', 1.5).attr('stroke-dasharray', '3,3').attr('opacity', 0.4);

      // Jitter: deterministic based on country hash
      function jitter(str, range) {
        let h = 0;
        for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff;
        return ((h / 0xffff) - 0.5) * range;
      }

      contRows.forEach(d => {
        const isHighProgress = highlightProgress && d.nPoints > 1 && d.progress >= progressThreshold;
        const dimmed = highlightProgress && !isHighProgress;
        const r = isHighProgress ? R_BIG : R_BASE;
        const cx = xScale(d.val);
        const dotY = cy + jitter(d.iso3, bandH * 0.55);
        const opacity = dimmed ? 0.12 : (isHighProgress ? 0.95 : 0.65);

        g.append('circle')
          .attr('cx', cx).attr('cy', dotY).attr('r', r)
          .attr('fill', color).attr('opacity', opacity)
          .style('cursor', 'pointer')
          .on('mousemove', e => {
            const prog = d.nPoints > 1
              ? `<br/><span style="color:#aaa">Progresso:</span> ${d.progress >= 0 ? '+' : ''}${d.progress.toFixed(1)}pp (${d.firstYear}→${d.year})`
              : '';
            showTip(e,
              `<div style="font-weight:700;color:${color};margin-bottom:2px">${d.country}</div>` +
              `<span style="color:#aaa">Alfabetizzazione adulti:</span> <strong>${d.val.toFixed(1)}%</strong><br/>` +
              `<span style="color:#aaa">Anno:</span> ${d.year}${prog}`
            );
          })
          .on('mouseleave', hideTip)
          .on('click', () => { drillContinent = cs.continent; draw(); });
      });
    });

    // Legend for highlight mode
    if (highlightProgress) {
      const legG = g.append('g').attr('transform', `translate(${innerW - 120}, ${innerH - 36})`);
      legG.append('circle').attr('r', R_BIG).attr('cx', R_BIG).attr('cy', R_BIG).attr('fill', '#555').attr('opacity', 0.85);
      legG.append('text').attr('x', R_BIG * 2 + 4).attr('y', R_BIG + 3).attr('font-size', 9).attr('fill', '#555')
        .text(`top 20% progresso (>${progressThreshold.toFixed(0)}pp)`);
    }
  }

  // ── Drill-down bar chart ───────────────────────────────────────────────────
  function drawDrillDown(contName) {
    const color = CONTINENT_COLOR[contName] || '#888';
    const contRows = countries.filter(d => d.continent === contName).sort((a, b) => b.val - a.val);

    headerBar.html('');
    headerBar.append('button')
      .attr('class', 'chart-back-btn')
      .style('font-family', 'inherit')
      .text('← Continenti')
      .on('click', () => { drillContinent = null; draw(); });
    headerBar.append('span')
      .style('font-size', '12px').style('font-weight', '700').style('color', color)
      .text(contName);
    headerBar.append('span').style('font-size', '11px').style('color', '#999').style('margin-left', '4px')
      .text(`— ${contRows.length} paesi`);

    chartArea.html('');
    const W = chartArea.node().getBoundingClientRect().width || 600;
    const H = chartArea.node().getBoundingClientRect().height || 380;
    if (W < 10 || H < 10) return;

    const avg = d3.mean(contRows, d => d.val);

    // Below-average color
    const hslBelow = d3.hsl(color);
    hslBelow.s *= 0.38; hslBelow.l = Math.min(hslBelow.l * 1.65, 0.80);
    const colorBelow = hslBelow.formatHex();

    const margin = { top: 12, right: 52, bottom: 8, left: 0 };
    const labelW = Math.min(130, W * 0.28);
    const innerW = W - labelW - margin.right;
    const rowH = Math.max(12, Math.min(24, (H - margin.top - margin.bottom) / contRows.length - 2));
    const totalH = contRows.length * (rowH + 3) + margin.top + margin.bottom;
    const scrollable = totalH > H;

    const scrollDiv = chartArea.append('div')
      .style('width', '100%').style('height', `${H}px`)
      .style('overflow-y', scrollable ? 'auto' : 'hidden').style('box-sizing', 'border-box');

    const svg = scrollDiv.append('svg')
      .attr('width', W).attr('height', scrollable ? totalH : H)
      .attr('role', 'img')
      .attr('aria-label', `Alfabetizzazione adulti — ${contName}`)
      .style('display', 'block').style('font-family', 'inherit');

    const g = svg.append('g').attr('transform', `translate(${labelW},${margin.top})`);

    const xMax = Math.max(100, (d3.max(contRows, d => d.val) || 100) * 1.05);
    const xScale = d3.scaleLinear().domain([0, xMax]).range([0, innerW]);

    // Average dashed line
    const avgX = xScale(avg);
    g.append('line')
      .attr('x1', avgX).attr('x2', avgX).attr('y1', 0)
      .attr('y2', contRows.length * (rowH + 3))
      .attr('stroke', '#aaa').attr('stroke-width', 1.2).attr('stroke-dasharray', '5,4');
    g.append('text').attr('x', avgX + 3).attr('y', 9)
      .attr('font-size', 9).attr('fill', '#999').text(`media ${avg.toFixed(1)}%`);

    const rows = g.selectAll('.lr').data(contRows).join('g').attr('class', 'lr')
      .attr('transform', (d, i) => `translate(0,${i * (rowH + 3)})`);

    // Label
    rows.append('text')
      .attr('x', -labelW + 4).attr('y', rowH / 2).attr('dominant-baseline', 'middle')
      .attr('font-size', Math.min(11, rowH - 1)).attr('fill', '#333')
      .text(d => {
        const max = Math.max(8, Math.floor((labelW - 8) / 6.5));
        return d.country.length > max ? d.country.slice(0, max - 1) + '…' : d.country;
      });

    // Bar
    rows.append('rect')
      .attr('x', 0).attr('y', 1).attr('height', rowH - 2).attr('rx', 2)
      .attr('fill', d => d.val >= avg ? color : colorBelow)
      .attr('opacity', d => d.val >= avg ? 0.88 : 0.70)
      .attr('role', 'graphics-symbol')
      .attr('aria-label', d => `${d.country}: ${d.val.toFixed(1)}%`)
      .attr('width', 0)
      .on('mousemove', (e, d) => {
        const prog = d.nPoints > 1
          ? `<br/><span style="color:#aaa">Progresso:</span> ${d.progress >= 0 ? '+' : ''}${d.progress.toFixed(1)}pp (${d.firstYear}→${d.year})`
          : '';
        showTip(e,
          `<div style="font-weight:700;color:${d.val >= avg ? color : colorBelow};margin-bottom:2px">${d.country}</div>` +
          `Alfabetizzazione: <strong>${d.val.toFixed(1)}%</strong> (${d.year})${prog}`
        );
      })
      .on('mouseleave', hideTip)
      .transition().duration(420).ease(d3.easeCubicOut).delay((d, i) => i * 22)
      .attr('width', d => Math.max(0, xScale(d.val)));

    // Value label
    rows.append('text')
      .attr('x', d => xScale(d.val) + 3).attr('y', rowH / 2)
      .attr('dominant-baseline', 'middle').attr('font-size', Math.min(10, rowH - 3))
      .attr('fill', '#666').attr('opacity', 0)
      .text(d => `${d.val.toFixed(1)}%`)
      .transition().duration(200).delay((d, i) => i * 22 + 380).attr('opacity', 1);
  }

  function draw() {
    if (drillContinent) drawDrillDown(drillContinent);
    else drawOverview();
  }

  draw();

  const node = container.node();
  node._slopeShowAll = function() { highlightProgress = false; drillContinent = null; draw(); };
  node._slopeHighlightProgress = function() { highlightProgress = true; drillContinent = null; draw(); };
  node._slopeEnableControls = function() { highlightProgress = false; draw(); };
}
