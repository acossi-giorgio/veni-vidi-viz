/* ============================================================
   Grafico 2 (Atto I) — Income × Poverty × Gini scatter animato
   ============================================================ */
async function renderInequalityScatter(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';

  const CONT_COLOR = {
    'Africa': '#e07b39',
    'Asia': '#4a90d9',
    'Europe': '#5aab6e',
    'North America': '#a45dc0',
    'South America': '#d4b84a',
    'Oceania': '#888888'
  };

  // Load data
  const [incomeRaw, povertyRaw, giniRaw] = await Promise.all([
    d3.csv('datasets/processed/income.csv', d3.autoType),
    d3.csv('datasets/processed/poverty.csv', d3.autoType),
    d3.csv('datasets/processed/gini.csv', d3.autoType)
  ]);

  // Build lookup maps: code+year → value
  const povertyMap = new Map();
  povertyRaw.forEach(d => povertyMap.set(`${d.code}_${d.year}`, d.value));

  const giniMap = new Map();
  giniRaw.forEach(d => giniMap.set(`${d.code}_${d.year}`, d.value));

  // Build per-country per-year income lookup (for nearest-year fallback)
  const incomeByCode = d3.group(incomeRaw, d => d.code);

  // Get countries that have poverty data (primary constraint)
  const povertyByCode = d3.group(povertyRaw, d => d.code);

  // Available years in poverty data
  const allYears = [...new Set(povertyRaw.map(d => d.year))].sort(d3.ascending);

  // Build merged dataset: for each country with poverty data, per year
  // Find nearest income year within ±3 years
  function nearestIncome(code, year) {
    const rows = incomeByCode.get(code);
    if (!rows) return null;
    let best = null, bestDiff = Infinity;
    rows.forEach(r => {
      const diff = Math.abs(r.year - year);
      if (diff < bestDiff) { bestDiff = diff; best = r; }
    });
    return bestDiff <= 5 ? best : null;
  }

  // Build merged rows
  const merged = [];
  povertyByCode.forEach((rows, code) => {
    rows.forEach(prow => {
      const inc = nearestIncome(code, prow.year);
      if (!inc) return;
      const giniVal = giniMap.get(`${code}_${prow.year}`) ||
                      giniMap.get(`${code}_${prow.year - 1}`) ||
                      giniMap.get(`${code}_${prow.year + 1}`) ||
                      giniMap.get(`${code}_${prow.year - 2}`) ||
                      giniMap.get(`${code}_${prow.year + 2}`);
      merged.push({
        code,
        country: prow.country,
        continent: prow.continent,
        year: prow.year,
        income: inc.value,
        poverty: prow.value,
        gini: giniVal != null ? giniVal : null
      });
    });
  });

  const mergedByYear = d3.group(merged, d => d.year);
  const years = [...mergedByYear.keys()].sort(d3.ascending);
  const minYear = years[0], maxYear = years[years.length - 1];

  // State
  let currentYear = maxYear;
  let yMode = 'poverty'; // 'poverty' | 'gini'
  let playing = false;
  let playTimer = null;
  let highlightMode = 'none'; // 'none' | 'high-poverty' | 'gini-outliers'

  // Layout
  const margin = { top: 16, right: 20, bottom: 48, left: 64 };
  const W = container.clientWidth || 700;
  const H = container.clientHeight || 450;
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  // Controls bar
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 8px;font-size:12px;flex-wrap:wrap;';

  const playBtn = document.createElement('button');
  playBtn.textContent = '▶ Play';
  playBtn.style.cssText = 'padding:3px 10px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:11px;background:#fff;';

  const yearLabel = document.createElement('span');
  yearLabel.style.cssText = 'font-weight:600;min-width:36px;';
  yearLabel.textContent = currentYear;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = minYear; slider.max = maxYear;
  slider.step = 1; slider.value = currentYear;
  slider.style.cssText = 'flex:1;min-width:80px;max-width:180px;';

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = 'Y: Povertà';
  toggleBtn.style.cssText = 'padding:3px 10px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:11px;background:#fff;margin-left:auto;';

  controls.appendChild(playBtn);
  controls.appendChild(slider);
  controls.appendChild(yearLabel);
  controls.appendChild(toggleBtn);
  container.appendChild(controls);

  // SVG
  const svg = d3.select(container).append('svg')
    .attr('width', W)
    .attr('height', H - controls.offsetHeight - 4);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Scales
  const xScale = d3.scaleLog().range([0, w]);
  const yScale = d3.scaleLinear().range([h, 0]);

  // Axes groups
  const xAxisG = g.append('g').attr('transform', `translate(0,${h})`);
  const yAxisG = g.append('g');

  // Axis labels
  g.append('text').attr('class', 'x-label')
    .attr('x', w / 2).attr('y', h + 40)
    .attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#666')
    .text('Reddito pro capite (USD, scala logaritmica)');

  const yLabelEl = g.append('text').attr('class', 'y-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -h / 2).attr('y', -52)
    .attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#666')
    .text('% popolazione sotto $2.15/giorno');

  // Legend
  const legendG = g.append('g').attr('transform', `translate(${w - 130}, 0)`);
  Object.entries(CONT_COLOR).forEach(([cont, color], i) => {
    const row = legendG.append('g').attr('transform', `translate(0,${i * 16})`);
    row.append('circle').attr('r', 4).attr('cx', 4).attr('cy', 4).attr('fill', color).attr('opacity', 0.75);
    row.append('text').attr('x', 12).attr('y', 8).attr('font-size', 10).attr('fill', '#444').text(cont);
  });

  // Tooltip
  const tip = d3.select(container).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', 'rgba(255,255,255,0.95)').style('border', '1px solid #ccc')
    .style('border-radius', '6px').style('padding', '8px 12px')
    .style('font-size', '12px').style('line-height', '1.5')
    .style('box-shadow', '0 2px 8px rgba(0,0,0,0.12)')
    .style('display', 'none').style('z-index', '10');

  d3.select(container).style('position', 'relative');

  function getYVal(d) { return yMode === 'poverty' ? d.poverty : (d.gini != null ? d.gini * 100 : null); }

  function render(year, transition = false) {
    const rows = (mergedByYear.get(year) || []).filter(d => {
      const y = getYVal(d);
      return d.income > 0 && y != null && y >= 0;
    });

    // Compute domains
    const incomeExtent = d3.extent(rows, d => d.income);
    const yExtent = d3.extent(rows, d => getYVal(d));
    xScale.domain([Math.max(200, incomeExtent[0] * 0.8), incomeExtent[1] * 1.2]).clamp(true);
    yScale.domain([Math.max(0, yExtent[0] - 2), Math.min(100, yExtent[1] + 2)]);

    const xAxis = d3.axisBottom(xScale).tickFormat(d => d >= 1000 ? `$${d3.format(',.0f')(d)}` : `$${d}`).ticks(5);
    const yAxis = d3.axisLeft(yScale).ticks(6);

    if (transition) {
      xAxisG.transition().duration(400).call(xAxis);
      yAxisG.transition().duration(400).call(yAxis);
    } else {
      xAxisG.call(xAxis);
      yAxisG.call(yAxis);
    }

    // Style axes
    [xAxisG, yAxisG].forEach(ax => {
      ax.selectAll('line,path').attr('stroke', '#ddd');
      ax.selectAll('text').attr('fill', '#666').attr('font-size', 10);
    });

    // Gridlines
    g.selectAll('.grid-y').remove();
    g.insert('g', ':first-child').attr('class', 'grid-y')
      .call(d3.axisLeft(yScale).ticks(6).tickSize(-w).tickFormat(''))
      .call(ag => ag.select('.domain').remove())
      .call(ag => ag.selectAll('line').attr('stroke', '#f0f0f0').attr('stroke-dasharray', '3,3'));

    // Notable countries to always label
    const NOTABLE = new Set(['NER','TCD','NGA','IND','BGD','AFG','MOZ','BDI','NOR','DEU','BRA','USA','CHN','MLI','SEN','PAK','ETH','SOM','CMR','HTI','ZMB','MDG','LSO','UGA','TZA','KEN','GHA','RWA']);

    // Circles
    const dots = g.selectAll('circle.dot').data(rows, d => d.code);

    dots.enter().append('circle').attr('class', 'dot')
      .attr('r', 0)
      .attr('cx', d => xScale(d.income))
      .attr('cy', d => yScale(getYVal(d)))
      .merge(dots)
      .on('mouseover', (event, d) => {
        const yv = getYVal(d);
        tip.style('display', 'block')
          .html(`<strong>${d.country}</strong> (${d.year})<br>Reddito: $${d3.format(',.0f')(d.income)}<br>${yMode === 'poverty' ? `Povertà: ${yv != null ? yv.toFixed(1) : 'N/D'}%` : `Gini: ${yv != null ? yv.toFixed(1) : 'N/D'}`}${d.gini != null ? `<br>Gini: ${(d.gini * 100).toFixed(1)}` : ''}`);
      })
      .on('mousemove', (event) => {
        const rect = container.getBoundingClientRect();
        tip.style('left', (event.clientX - rect.left + 12) + 'px')
           .style('top', (event.clientY - rect.top - 28) + 'px');
      })
      .on('mouseleave', () => tip.style('display', 'none'))
      .transition().duration(transition ? 500 : 0)
      .attr('cx', d => xScale(d.income))
      .attr('cy', d => yScale(getYVal(d)))
      .attr('r', 5)
      .attr('fill', d => {
        if (highlightMode === 'high-poverty') {
          const pov = d.poverty;
          return pov > 30 ? CONT_COLOR[d.continent] || '#888' : '#ddd';
        }
        if (highlightMode === 'gini-outliers') {
          return (d.gini != null && d.gini > 0.45) ? CONT_COLOR[d.continent] || '#888' : '#ddd';
        }
        return CONT_COLOR[d.continent] || '#888';
      })
      .attr('opacity', d => {
        if (highlightMode !== 'none') {
          const pov = d.poverty;
          if (highlightMode === 'high-poverty') return pov > 30 ? 0.8 : 0.2;
          if (highlightMode === 'gini-outliers') return (d.gini != null && d.gini > 0.45) ? 0.8 : 0.2;
        }
        return 0.65;
      })
      .attr('stroke', d => CONT_COLOR[d.continent] || '#888')
      .attr('stroke-width', 0.5);

    dots.exit().transition().duration(300).attr('r', 0).remove();

    // Labels for notable countries
    g.selectAll('text.dot-label').remove();
    rows.filter(d => NOTABLE.has(d.code)).forEach(d => {
      const yv = getYVal(d);
      if (yv == null) return;
      g.append('text').attr('class', 'dot-label')
        .attr('x', xScale(d.income) + 7)
        .attr('y', yScale(yv) + 3)
        .attr('font-size', 9)
        .attr('fill', highlightMode !== 'none' && (
          (highlightMode === 'high-poverty' && d.poverty <= 30) ||
          (highlightMode === 'gini-outliers' && (d.gini == null || d.gini <= 0.45))
        ) ? '#bbb' : '#333')
        .text(d.code);
    });

    yearLabel.textContent = year;
    slider.value = year;
  }

  render(currentYear);

  // Year update
  function setYear(y) {
    currentYear = y;
    render(y, true);
  }

  slider.addEventListener('input', () => setYear(+slider.value));

  // Play
  function stepPlay() {
    if (!playing) return;
    const idx = years.indexOf(currentYear);
    if (idx >= years.length - 1) {
      currentYear = years[0];
    } else {
      currentYear = years[idx + 1];
    }
    render(currentYear, true);
    playTimer = setTimeout(stepPlay, 700);
  }

  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? '⏸ Pausa' : '▶ Play';
    if (playing) {
      if (currentYear >= maxYear) currentYear = minYear;
      stepPlay();
    } else {
      clearTimeout(playTimer);
    }
  });

  // Toggle Y axis
  toggleBtn.addEventListener('click', () => {
    yMode = yMode === 'poverty' ? 'gini' : 'poverty';
    toggleBtn.textContent = yMode === 'poverty' ? 'Y: Povertà' : 'Y: Gini';
    yLabelEl.text(yMode === 'poverty' ? '% popolazione sotto $2.15/giorno' : 'Coefficiente Gini (×100)');
    render(currentYear, true);
  });

  // Expose DOM API for triggerChartState
  container._inequalityReset = () => {
    highlightMode = 'none';
    playing = false; clearTimeout(playTimer);
    playBtn.textContent = '▶ Play';
    setYear(maxYear);
  };
  container._inequalityHighlightPoverty = () => {
    highlightMode = 'high-poverty';
    yMode = 'poverty';
    toggleBtn.textContent = 'Y: Povertà';
    yLabelEl.text('% popolazione sotto $2.15/giorno');
    render(currentYear, true);
  };
  container._inequalityShowGini = () => {
    highlightMode = 'gini-outliers';
    yMode = 'gini';
    toggleBtn.textContent = 'Y: Gini';
    yLabelEl.text('Coefficiente Gini (×100)');
    render(currentYear, true);
  };
}
