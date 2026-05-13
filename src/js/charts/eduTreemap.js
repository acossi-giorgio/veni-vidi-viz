async function renderEduTreemap(selector = '#chart-3-1', isFullscreen = false) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html('');
  container.style('width', '100%').style('height', '100%').style('position', 'relative').style('font-family', 'inherit');

  const raw = await d3.csv('datasets/processed/04_edu_spending.csv', d3.autoType);

  const latestByCountry = new Map();
  raw.forEach(d => {
    if (!d.continent || !d.value || isNaN(d.value)) return;
    const prev = latestByCountry.get(d.iso3);
    if (!prev || d.year > prev.year) latestByCountry.set(d.iso3, d);
  });
  const countries = Array.from(latestByCountry.values());

  const CONTINENT_COLOR = {
    'Africa':        '#c0392b',
    'Asia':          '#2980b9',
    'Europe':        '#27ae60',
    'North America': '#8e44ad',
    'South America': '#d35400',
    'Oceania':       '#16a085',
  };

  const CONTINENT_DESCRIPTIONS = {
    'Africa': 'I paesi africani spendono in media il 3.9% del PIL in istruzione — ma questa percentuale si applica a PIL molto bassi. La spesa assoluta per studente è spesso 20–50 volte inferiore a quella europea, rendendo strutturalmente difficile costruire un sistema di qualità.',
    'Asia': "L'Asia nasconde enormi disparità: da Singapore e Giappone con sistemi d'eccellenza, a Pakistan e Myanmar con spesa e completamento scolastico molto bassi. La media regionale maschera realtà radicalmente diverse.",
    'Europe': 'I paesi europei investono tra il 4% e il 7% del PIL in istruzione, con i paesi nordici in testa. I tassi di completamento vicini al 100% e una maggiore mobilità sociale riflettono decenni di investimento costante.',
    'North America': 'Il Nord America presenta un quadro duale: Stati Uniti e Canada investono il 5–6% del PIL, ma con grandi differenze di qualità tra stati e fasce sociali. Messico e paesi centroamericani restano significativamente indietro.',
    'South America': "Il Sud America mostra segnali di progresso: Brasile, Argentina e Bolivia hanno aumentato la spesa pubblica in istruzione nell'ultimo decennio. La media regionale è tra le più alte dei paesi in via di sviluppo.",
    'Oceania': "L'Oceania guida la classifica mondiale: Nuova Zelanda e Australia investono costantemente nel sistema educativo. Alcune piccole isole del Pacifico destinano percentuali di PIL tra le più alte al mondo, per necessità di sviluppare capitale umano interno.",
  };

  // Continent-level aggregation
  const continentData = Array.from(
    d3.group(countries, d => d.continent),
    ([cont, rows]) => ({
      continent: cont,
      country: cont,
      value: d3.mean(rows, r => r.value),
      year: d3.max(rows, r => r.year),
      _isContinent: true,
      _count: rows.length,
    })
  ).sort((a, b) => b.value - a.value);

  // Tooltip
  d3.select('body').selectAll('.tooltip-treemap').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip-treemap')
    .style('position', 'absolute').style('background', 'rgba(0,0,0,0.88)')
    .style('color', '#fff').style('border-radius', '6px').style('padding', '10px 14px')
    .style('pointer-events', 'none').style('font-size', '12px').style('line-height', '1.6')
    .style('z-index', '10000').style('display', 'none').style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');

  function showTip(e, html) {
    tooltip.style('display', 'block').html(html);
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 12, ty = e.pageY + 8;
    if (tx + r.width > window.innerWidth - 8) tx = e.pageX - r.width - 12;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 8;
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }
  function hideTip() { tooltip.style('display', 'none'); }

  // ── State ──────────────────────────────────────────────────────────────────
  let highlightContinent = null; // null = all, string = highlight one (for narrative cards)
  let drillContinent = null;     // null = continent view, string = country view

  // ── Text panel (main chart only) ───────────────────────────────────────────
  const containerNode = container.node();
  const sectionInner = containerNode.closest('.chart-section-inner');
  const chartTextEl = sectionInner ? sectionInner.querySelector('.chart-text') : null;

  let drillPanel = null;
  if (chartTextEl) {
    drillPanel = document.createElement('div');
    drillPanel.className = 'treemap-drill-text';
    drillPanel.style.display = 'none';
    chartTextEl.appendChild(drillPanel);
  }

  function updateTextPanel(cont) {
    if (!chartTextEl || !drillPanel) return;
    const cards = chartTextEl.querySelectorAll('.narrative-card');
    if (!cont) {
      cards.forEach(c => { c.style.display = ''; });
      drillPanel.style.display = 'none';
      drillPanel.innerHTML = '';
    } else {
      cards.forEach(c => { c.style.display = 'none'; });
      const color = CONTINENT_COLOR[cont] || '#333';
      const avg = d3.mean(countries.filter(d => d.continent === cont && d.value > 0), d => d.value);
      drillPanel.innerHTML = `
        <div class="narrative-card is-active" style="opacity:1">
          <h3 style="color:${color};margin-bottom:0.5rem">${cont}</h3>
          <p>${CONTINENT_DESCRIPTIONS[cont] || ''}</p>
          <p style="margin-top:0.75rem;font-size:0.85em;color:var(--ink-muted)">
            Media continentale: <strong>${avg ? avg.toFixed(1) + '% PIL' : '—'}</strong>
          </p>
        </div>
      `;
      drillPanel.style.display = '';
    }
  }

  // ── Render wrapper ─────────────────────────────────────────────────────────
  const svgWrap = container.append('div')
    .style('width', '100%').style('height', '100%').style('position', 'relative')
    .style('transition', 'opacity 0.25s ease-out');

  function transitionTo(newContinent) {
    drillContinent = newContinent;
    updateTextPanel(newContinent);
    svgWrap.style('opacity', '0');
    setTimeout(() => { draw(); svgWrap.style('opacity', '1'); }, 250);
  }

  // ── Bar chart ──────────────────────────────────────────────────────────────
  function draw() {
    svgWrap.html('');
    const W = containerNode.getBoundingClientRect().width || 600;
    const H = containerNode.getBoundingClientRect().height || 400;
    if (W < 10 || H < 10) return;

    const isDrill = !!drillContinent;
    const data = isDrill
      ? countries.filter(d => d.continent === drillContinent && d.value > 0).sort((a, b) => b.value - a.value)
      : continentData;

    const color = isDrill ? (CONTINENT_COLOR[drillContinent] || '#888') : null;

    // Below-average color for drill view
    let colorBelow = '#bbb';
    if (isDrill && color) {
      const hsl = d3.hsl(color);
      hsl.s *= 0.38;
      hsl.l = Math.min(hsl.l * 1.65, 0.80);
      colorBelow = hsl.formatHex();
    }

    const avg = d3.mean(data, d => d.value);

    // ── Header bar ────────────────────────────────────────────────────────────
    const headerBar = svgWrap.append('div')
      .style('display', 'flex').style('align-items', 'center').style('gap', '8px')
      .style('padding', '5px 8px').style('background', '#f5f5f5')
      .style('border-bottom', '1px solid #e0e0e0').style('box-sizing', 'border-box')
      .style('min-height', '34px');

    if (isDrill) {
      headerBar.append('button')
        .attr('aria-label', 'Torna alla vista per continente')
        .style('padding', '3px 10px').style('background', '#fff')
        .style('border', '1px solid #ccc').style('border-radius', '4px')
        .style('cursor', 'pointer').style('font-size', '12px').style('font-family', 'inherit')
        .text('← Continenti')
        .on('click', () => transitionTo(null));

      headerBar.append('span')
        .style('font-size', '13px').style('font-weight', '700').style('color', color)
        .text(drillContinent);
    } else {
      headerBar.append('span')
        .style('font-size', '12px').style('color', '#666')
        .text('Spesa pubblica in istruzione (% PIL) — clicca un continente per esplorare i paesi');
    }

    const headerH = 34;
    const chartH = H - headerH;

    const margin = { top: 14, right: 56, bottom: 8, left: 0 };
    const labelW = Math.min(isDrill ? 140 : 120, W * 0.28);
    const innerW = W - labelW - margin.right;
    const rowH = Math.max(13, Math.min(isDrill ? 24 : 36, (chartH - margin.top - margin.bottom) / data.length - 3));
    const totalH = data.length * (rowH + 3) + margin.top + margin.bottom;
    const scrollable = totalH > chartH;

    const chartDiv = svgWrap.append('div')
      .style('width', '100%')
      .style('height', `${chartH}px`)
      .style('overflow-y', scrollable ? 'auto' : 'hidden')
      .style('overflow-x', 'hidden')
      .style('box-sizing', 'border-box');

    const svgH = scrollable ? totalH : chartH;
    const svg = chartDiv.append('svg')
      .attr('width', W).attr('height', svgH)
      .attr('role', 'img')
      .attr('aria-label', isDrill ? `Paesi di ${drillContinent} per spesa istruzione` : 'Spesa istruzione per continente')
      .style('display', 'block').style('font-family', 'inherit');

    const g = svg.append('g').attr('transform', `translate(${labelW},${margin.top})`);

    const xMax = (d3.max(data, d => d.value) || 10) * 1.12;
    const xScale = d3.scaleLinear().domain([0, xMax]).range([0, innerW]);

    // Average dashed line
    const avgX = xScale(avg);
    const lineH = data.length * (rowH + 3);
    g.append('line')
      .attr('x1', avgX).attr('x2', avgX).attr('y1', 0).attr('y2', lineH)
      .attr('stroke', '#aaa').attr('stroke-width', 1.2).attr('stroke-dasharray', '5,4');

    g.append('text')
      .attr('x', avgX + 3).attr('y', 9)
      .attr('font-size', 9).attr('fill', '#999')
      .text(`media ${avg.toFixed(1)}%`);

    // Bar rows
    const barGroups = g.selectAll('.bar-row')
      .data(data).join('g')
      .attr('class', 'bar-row')
      .attr('transform', (d, i) => `translate(0,${i * (rowH + 3)})`);

    // Label
    barGroups.append('text')
      .attr('x', -labelW + 4).attr('y', rowH / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', Math.min(11, rowH - 1))
      .attr('fill', '#333')
      .text(d => {
        const maxChars = Math.max(8, Math.floor((labelW - 8) / 6.5));
        const name = isDrill ? d.country : d.continent;
        return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
      });

    // Color per bar
    function barColor(d) {
      if (!isDrill) {
        const base = CONTINENT_COLOR[d.continent] || '#888';
        if (!highlightContinent) return base;
        return d.continent === highlightContinent ? base : '#ccc';
      }
      return d.value >= avg ? color : colorBelow;
    }
    function barOpacity(d) {
      if (!isDrill) {
        if (!highlightContinent) return 0.85;
        return d.continent === highlightContinent ? 0.92 : 0.25;
      }
      return d.value >= avg ? 0.88 : 0.70;
    }

    // Bar (animated width)
    barGroups.append('rect')
      .attr('x', 0).attr('y', 1)
      .attr('height', rowH - 2).attr('rx', 2)
      .attr('fill', barColor)
      .attr('opacity', barOpacity)
      .attr('role', 'graphics-symbol')
      .attr('aria-label', d => `${isDrill ? d.country : d.continent}: ${d.value.toFixed(1)}% PIL`)
      .attr('width', 0)
      .style('cursor', isDrill ? 'default' : 'pointer')
      .on('mousemove', (e, d) => {
        const label = isDrill ? d.country : d.continent;
        const c = isDrill ? barColor(d) : (CONTINENT_COLOR[d.continent] || '#fff');
        const extra = isDrill
          ? `<br/><span style="color:#aaa">Anno dato:</span> ${d.year}<br/><span style="color:#aaa">vs media:</span> ${d.value >= avg ? '+' : ''}${(d.value - avg).toFixed(2)}pp`
          : `<br/><span style="color:#bbb;font-size:11px">Clicca per vedere i paesi</span>`;
        showTip(e,
          `<div style="font-weight:700;color:${c};margin-bottom:4px">${label}</div>` +
          `<span style="color:#aaa">Spesa istruzione:</span> ${d.value.toFixed(2)}% PIL${extra}`
        );
      })
      .on('mouseleave', hideTip)
      .on('click', (e, d) => {
        if (!isDrill) { hideTip(); transitionTo(d.continent); }
      })
      .transition().duration(420).ease(d3.easeCubicOut)
      .delay((d, i) => i * 28)
      .attr('width', d => Math.max(0, xScale(d.value)));

    // Value label
    barGroups.append('text')
      .attr('x', d => xScale(d.value) + 3)
      .attr('y', rowH / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', Math.min(10, rowH - 3))
      .attr('fill', '#666').attr('opacity', 0)
      .text(d => `${d.value.toFixed(1)}%`)
      .transition().duration(200)
      .delay((d, i) => i * 28 + 380)
      .attr('opacity', 1);
  }

  draw();

  // ── DOM API ────────────────────────────────────────────────────────────────
  containerNode._treemapHighlight = function(cont) {
    if (drillContinent) { drillContinent = null; updateTextPanel(null); }
    highlightContinent = cont;
    draw();
  };
  containerNode._treemapReset = function() {
    if (drillContinent) { drillContinent = null; updateTextPanel(null); }
    highlightContinent = null;
    draw();
  };
}
