/* ============================================================
   Grafico 4-3 (Atto III) — Bump chart: rank mortalità Africa
   Africa only · 5-year snapshots · rank 1 = peggiore
   Toggle: mortalità materna | mortalità infantile <5
   ============================================================ */
async function renderMortalityChart(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const YEARS = [2000, 2005, 2010, 2015, 2020];

  const [maternalRaw, childRaw] = await Promise.all([
    d3.csv('datasets/processed/maternal_mortality.csv', d3.autoType),
    d3.csv('datasets/processed/child_mortality.csv', d3.autoType),
  ]);

  function buildBumpData(raw) {
    const africaRaw = raw.filter(d => d.continent === 'Africa' && d.value != null && d.value > 0);
    const byCode = d3.group(africaRaw, d => d.code);

    const countries = new Map();
    byCode.forEach((pts, code) => {
      const yearValues = new Map();
      YEARS.forEach(targetYear => {
        const nearby = pts
          .filter(d => Math.abs(d.year - targetYear) <= 3)
          .sort((a, b) => Math.abs(a.year - targetYear) - Math.abs(b.year - targetYear));
        if (nearby.length) yearValues.set(targetYear, { value: nearby[0].value, year: nearby[0].year });
      });
      if (yearValues.size >= 2) {
        countries.set(code, { code, country: pts[0].country, yearValues });
      }
    });

    // Rank per year (1 = highest value = worst)
    const ranksByYear = new Map();
    YEARS.forEach(year => {
      const present = [];
      countries.forEach((c, code) => {
        if (c.yearValues.has(year)) present.push({ code, value: c.yearValues.get(year).value });
      });
      present.sort((a, b) => b.value - a.value);
      const rankMap = new Map();
      present.forEach((d, i) => rankMap.set(d.code, i + 1));
      ranksByYear.set(year, { rankMap, total: present.length });
    });

    const result = [];
    countries.forEach((c, code) => {
      const ranks = YEARS.map(y => {
        const yr = ranksByYear.get(y);
        const yv = c.yearValues.get(y);
        return { year: y, rank: yr.rankMap.get(code) ?? null, total: yr.total, value: yv?.value ?? null };
      });
      const firstRank = ranks.find(r => r.rank != null);
      const lastRank  = [...ranks].reverse().find(r => r.rank != null);
      if (!firstRank || !lastRank) return;
      const improvement = firstRank.rank - lastRank.rank; // positive = fell in rank number = improved
      result.push({ code, country: c.country, ranks, improvement, firstRank, lastRank });
    });

    return result;
  }

  const maternalBump = buildBumpData(maternalRaw);
  const childBump    = buildBumpData(childRaw);

  let metric = 'maternal';

  const NOTABLE = new Set([
    'SLE', 'CAF', 'NGA', 'TCD', 'SOM', 'COD', 'NER', 'MLI', 'SSD',
    'MOZ', 'ETH', 'AGO', 'CMR', 'ZAF', 'GHA', 'KEN', 'TZA', 'RWA', 'EGY',
  ]);

  // Tooltip
  const tip = d3.select('body').selectAll('.mortality-tip').data([0]).join('div')
    .attr('class', 'mortality-tip')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', 'rgba(20,20,40,0.92)').style('color', '#fff')
    .style('border-radius', '6px').style('padding', '7px 11px')
    .style('font-size', '11px').style('line-height', '1.6')
    .style('z-index', '10000').style('display', 'none');

  // Toggle buttons
  const btnWrap = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '6px').style('right', '8px')
    .style('display', 'flex').style('gap', '4px').style('z-index', '10');

  function mkBtn(label, val) {
    return btnWrap.append('button')
      .style('font-size', '10px').style('padding', '2px 8px')
      .style('border-radius', '5px').style('cursor', 'pointer')
      .style('border', '1px solid #c8d4e8').style('background', 'rgba(255,255,255,0.92)')
      .style('color', '#4a6fa5')
      .text(label)
      .on('click', () => { metric = val; updateBtns(); draw(); });
  }

  const btnM = mkBtn('Mortalità materna', 'maternal');
  const btnC = mkBtn('Mortalità infantile', 'child');

  function updateBtns() {
    btnM.style('font-weight', metric === 'maternal' ? '700' : '400')
        .style('background',  metric === 'maternal' ? '#e8eef7' : 'rgba(255,255,255,0.92)');
    btnC.style('font-weight', metric === 'child' ? '700' : '400')
        .style('background',  metric === 'child' ? '#e8eef7' : 'rgba(255,255,255,0.92)');
  }
  updateBtns();

  const svgEl = d3.select(container).append('svg').style('display', 'block');

  function draw() {
    svgEl.selectAll('*').remove();

    const W = container.clientWidth  || 680;
    const H = container.clientHeight || 460;
    const margin = { top: 44, right: 110, bottom: 28, left: 110 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top  - margin.bottom;

    svgEl.attr('width', W).attr('height', H);
    const g = svgEl.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const countries = metric === 'maternal' ? maternalBump : childBump;
    const maxRank   = d3.max(countries, d => d3.max(d.ranks, r => r.rank ?? 0));

    const xS = d3.scalePoint().domain(YEARS).range([0, w]).padding(0);
    const yS = d3.scaleLinear().domain([1, maxRank]).range([0, h]);

    // Color: improvement (positive = improved rank)
    const impExt = d3.extent(countries, d => d.improvement);
    const colorS = d3.scaleDiverging(d3.interpolateRdYlGn)
      .domain([impExt[0], 0, Math.max(1, impExt[1])]);

    const lineFn = d3.line()
      .x(d => xS(d.year))
      .y(d => yS(d.rank))
      .curve(d3.curveCatmullRom.alpha(0.5))
      .defined(d => d.rank != null);

    // Year columns
    YEARS.forEach(y => {
      g.append('line')
        .attr('x1', xS(y)).attr('x2', xS(y)).attr('y1', 0).attr('y2', h)
        .attr('stroke', '#ececec').attr('stroke-width', 1);
      g.append('text')
        .attr('x', xS(y)).attr('y', -26)
        .attr('text-anchor', 'middle').attr('font-size', 12).attr('font-weight', '600')
        .attr('fill', '#555').text(y);
    });

    // Subtitle
    g.append('text').attr('x', w / 2).attr('y', -10)
      .attr('text-anchor', 'middle').attr('font-size', 8.5).attr('fill', '#aaa')
      .text(`Africa · ${countries.length} paesi · rank 1 = mortalità più alta`);

    // Rank 1 / last label on Y
    g.append('text').attr('x', -margin.left + 4).attr('y', yS(1) + 4)
      .attr('font-size', 8).attr('fill', '#ccc').text('1° (peggiore)');
    g.append('text').attr('x', -margin.left + 4).attr('y', yS(maxRank) + 4)
      .attr('font-size', 8).attr('fill', '#ccc').text(`${maxRank}° (migliore)`);

    // Lines — draw dim ones first, notable on top
    const sorted = [...countries].sort((a, b) => +NOTABLE.has(b.code) - +NOTABLE.has(a.code));

    sorted.forEach(d => {
      const isNotable = NOTABLE.has(d.code);
      const col   = colorS(d.improvement);
      const baseOpa = isNotable ? 0.7 : 0.18;
      const baseSW  = isNotable ? 1.8 : 0.8;

      const path = g.append('path')
        .datum(d.ranks)
        .attr('class', `bump-line bump-${d.code}`)
        .attr('fill', 'none')
        .attr('stroke', col)
        .attr('stroke-width', baseSW)
        .attr('opacity', baseOpa)
        .attr('d', lineFn)
        .style('cursor', 'pointer');

      // Dots
      d.ranks.forEach(r => {
        if (r.rank == null) return;
        g.append('circle')
          .attr('class', `bump-dot bump-dot-${d.code}`)
          .attr('cx', xS(r.year)).attr('cy', yS(r.rank))
          .attr('r', isNotable ? 3 : 1.8)
          .attr('fill', col).attr('opacity', baseOpa)
          .style('pointer-events', 'none');
      });

      // Labels for notable
      if (isNotable) {
        const fr = d.ranks.find(r => r.rank != null);
        const lr = [...d.ranks].reverse().find(r => r.rank != null);
        const shortName = d.country.length > 13 ? d.code : d.country;
        if (fr) g.append('text').attr('class', `bump-lbl bump-lbl-${d.code}`)
          .attr('x', -8).attr('y', yS(fr.rank) + 3.5)
          .attr('text-anchor', 'end').attr('font-size', 8).attr('fill', col)
          .attr('opacity', 0.85).style('pointer-events', 'none').text(shortName);
        if (lr) g.append('text').attr('class', `bump-lbl bump-lbl-${d.code}`)
          .attr('x', w + 8).attr('y', yS(lr.rank) + 3.5)
          .attr('font-size', 8).attr('fill', col)
          .attr('opacity', 0.85).style('pointer-events', 'none').text(shortName);
      }

      // Hover events
      path.on('mouseover', (event) => {
        // Dim all
        g.selectAll('.bump-line').attr('opacity', 0.07).attr('stroke-width', 0.5);
        g.selectAll('.bump-dot').attr('opacity', 0.07);
        g.selectAll('.bump-lbl').attr('opacity', 0.1);
        // Highlight this
        g.select(`.bump-${d.code}`).attr('opacity', 1).attr('stroke-width', 2.8);
        g.selectAll(`.bump-dot-${d.code}`).attr('opacity', 1).attr('r', 4);
        g.selectAll(`.bump-lbl-${d.code}`).attr('opacity', 1).attr('font-size', 9.5).attr('font-weight', '700');

        const fr = d.ranks.find(r => r.rank != null);
        const lr = [...d.ranks].reverse().find(r => r.rank != null);
        const unitLabel = metric === 'maternal' ? 'per 100k nati vivi' : 'per 1k nati vivi';
        tip.style('display', 'block').html(
          `<strong>${d.country}</strong><br>` +
          `${fr?.year}: rank <strong>${fr?.rank}</strong>/${fr?.total} (${fr?.value != null ? d3.format(',.0f')(fr.value) : '—'} ${unitLabel})<br>` +
          `${lr?.year}: rank <strong>${lr?.rank}</strong>/${lr?.total} (${lr?.value != null ? d3.format(',.0f')(lr.value) : '—'} ${unitLabel})<br>` +
          `Spostamento: ${d.improvement > 0 ? `▼ ${d.improvement} pos. (migliorato)` : d.improvement < 0 ? `▲ ${Math.abs(d.improvement)} pos. (peggiorato)` : 'invariato'}`
        );
      })
      .on('mousemove', (event) => {
        tip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseleave', () => {
        tip.style('display', 'none');
        // Restore
        sorted.forEach(dd => {
          const isN = NOTABLE.has(dd.code);
          g.select(`.bump-${dd.code}`).attr('opacity', isN ? 0.7 : 0.18).attr('stroke-width', isN ? 1.8 : 0.8);
          g.selectAll(`.bump-dot-${dd.code}`).attr('opacity', isN ? 0.7 : 0.18).attr('r', isN ? 3 : 1.8);
          g.selectAll(`.bump-lbl-${dd.code}`).attr('opacity', 0.85).attr('font-size', 8).attr('font-weight', '500');
        });
      });
    });

    // Color legend
    const lgW = 90, lgH = 7;
    const lgX = w / 2 - lgW / 2;
    const lgY = h + 14;
    const defs = svgEl.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'bump-grad-m');
    [0, 0.5, 1].forEach(t => {
      grad.append('stop').attr('offset', `${t * 100}%`)
        .attr('stop-color', colorS(impExt[0] + t * (impExt[1] - impExt[0])));
    });
    g.append('rect').attr('x', lgX).attr('y', lgY)
      .attr('width', lgW).attr('height', lgH)
      .attr('fill', 'url(#bump-grad-m)').attr('rx', 2);
    g.append('text').attr('x', lgX).attr('y', lgY + lgH + 9)
      .attr('font-size', 7.5).attr('fill', '#aaa').text('Peggiorato');
    g.append('text').attr('x', lgX + lgW).attr('y', lgY + lgH + 9)
      .attr('text-anchor', 'end').attr('font-size', 7.5).attr('fill', '#aaa').text('Migliorato');
  }

  draw();

  container._mortalityScatter          = () => { metric = 'maternal'; updateBtns(); draw(); };
  container._mortalityHighlightMarriage = () => { metric = 'maternal'; updateBtns(); draw(); };
  container._mortalitySlope             = () => { metric = 'child';    updateBtns(); draw(); };
}
