/* ============================================================
   Grafico 8 — Matrimoni precoci (Sankey)
   Sorgenti: regioni UN SDG | Target: sposata <18 / non sposata
   API: container._sankeyHighlight(regionArr|null)
        container._sankeyReset()
   ============================================================ */

async function renderMarriageSankey(selector = '#chart-4-2', isFullscreen = false) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html('');
  container.style('width', '100%').style('height', '100%')
    .style('position', 'relative').style('font-family', 'inherit');

  const raw = await d3.csv('datasets/processed/08_child_marriage.csv', d3.autoType);
  if (!raw.length) { container.append('p').style('padding','1rem').text('Dati non disponibili.'); return; }

  const REGION_LABEL = {
    'Sub-Saharan Africa':              'Africa Sub-sahariana',
    'Central and Southern Asia':       'Asia Centr. e Merid.',
    'Latin America and the Caribbean': 'America Latina',
    'Europe and Northern America':     'Europa e Nord America',
    'Oceania':                         'Oceania',
  };
  const REGION_COLOR = {
    'Sub-Saharan Africa':              '#b04a4a',
    'Central and Southern Asia':       '#4a6fa5',
    'Latin America and the Caribbean': '#c97c3e',
    'Europe and Northern America':     '#5a8a6e',
    'Oceania':                         '#7a6fa5',
  };

  // Regional averages from country data
  const regionGroups = d3.group(
    raw.filter(d => d.region && !isNaN(d.married_before_18) && d.married_before_18 > 0),
    d => d.region
  );
  const regionStats = Array.from(regionGroups, ([region, rows]) => ({
    id: region,
    label: REGION_LABEL[region] || region,
    color: REGION_COLOR[region] || '#888',
    avgRate: d3.mean(rows, r => r.married_before_18),
    nCountries: rows.length,
  })).filter(r => REGION_LABEL[r.id])
    .sort((a, b) => b.avgRate - a.avgRate);

  let highlightRegions = null;

  // Tooltip
  d3.select('body').selectAll('.tooltip-sankey-8').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip-sankey-8')
    .style('position', 'absolute').style('background', 'rgba(0,0,0,0.88)')
    .style('color', '#fff').style('border-radius', '6px').style('padding', '10px 14px')
    .style('pointer-events', 'none').style('font-size', '12px').style('line-height', '1.6')
    .style('z-index', '10000').style('display', 'none');
  function showTip(e, html) {
    tooltip.style('display', 'block').html(html);
    const r = tooltip.node().getBoundingClientRect();
    let tx = e.pageX + 12, ty = e.pageY + 8;
    if (tx + r.width > window.innerWidth - 8) tx = e.pageX - r.width - 12;
    if (ty + r.height > window.innerHeight - 8) ty = e.pageY - r.height - 8;
    tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
  }
  function hideTip() { tooltip.style('display', 'none'); }

  const wrapper = container.append('div')
    .style('display', 'flex').style('flex-direction', 'column').style('height', '100%');

  // Controls
  const controls = wrapper.append('div')
    .style('flex', '0 0 auto').style('display', 'flex').style('align-items', 'center')
    .style('gap', '6px').style('padding', '6px 12px').style('border-bottom', '1px solid #e0e0e0')
    .style('background', '#fafafa').style('font-size', '11px').style('flex-wrap', 'wrap');

  controls.append('span').style('color', '#888').style('margin-right', '2px').text('Regione:');

  const btnMap = new Map();
  [{ id: null, label: 'Tutte', color: '#555' }, ...regionStats].forEach(r => {
    const isActive = !r.id;
    const btn = controls.append('button')
      .style('padding', '2px 8px').style('border-radius', '4px').style('font-size', '11px')
      .style('cursor', 'pointer').style('border', '1px solid #ddd')
      .style('background', isActive ? '#b04a4a' : '#fff')
      .style('color', isActive ? '#fff' : '#333')
      .text(r.label || 'Tutte')
      .on('click', () => {
        highlightRegions = r.id ? [r.id] : null;
        btnMap.forEach((b, id) => {
          const active = !highlightRegions ? !id : highlightRegions.includes(id);
          b.style('background', active ? '#b04a4a' : '#fff').style('color', active ? '#fff' : '#333');
        });
        draw();
      });
    btnMap.set(r.id, btn);
  });

  const svgWrap = wrapper.append('div')
    .style('flex', '1 1 auto').style('position', 'relative').style('overflow', 'hidden');

  function draw() {
    svgWrap.html('');
    const W = svgWrap.node().getBoundingClientRect().width || 600;
    const H = svgWrap.node().getBoundingClientRect().height || 360;
    if (W < 50 || H < 50) return;

    if (typeof d3.sankey !== 'function') {
      svgWrap.append('div').style('padding', '2rem').style('color', '#888').style('text-align', 'center')
        .text('Libreria d3-sankey non caricata.');
      return;
    }

    const margin = { top: 24, right: 140, bottom: 28, left: 160 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = svgWrap.append('svg').attr('width', W).attr('height', H).style('font-family', 'inherit');
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const active = highlightRegions
      ? regionStats.filter(r => highlightRegions.includes(r.id))
      : regionStats;

    const nodeList = [
      ...active.map(r => ({ id: r.id, label: r.label, color: r.color, isSource: true, rate: r.avgRate })),
      { id: '__married__',     label: 'Sposata\nprima dei 18', color: '#b04a4a', isSource: false },
      { id: '__not_married__', label: 'Non sposata\nprima dei 18', color: '#5a8a6e', isSource: false },
    ];

    const linkList = active.flatMap(r => [
      { source: r.id, target: '__married__',     value: Math.max(0.5, r.avgRate),       region: r.id, color: r.color },
      { source: r.id, target: '__not_married__', value: Math.max(0.5, 100 - r.avgRate), region: r.id, color: r.color },
    ]);

    const sankey = d3.sankey()
      .nodeId(d => d.id)
      .nodeAlign(d3.sankeyLeft)
      .nodeWidth(16)
      .nodePadding(Math.max(8, (h - 20) / (active.length * 3)))
      .extent([[1, 1], [w - 1, h - 1]]);

    let graph;
    try { graph = sankey({ nodes: nodeList.map(d => ({...d})), links: linkList.map(d => ({...d})) }); }
    catch(e) { console.error('Sankey error:', e); return; }

    // Links
    g.append('g').attr('fill', 'none')
      .selectAll('path')
      .data(graph.links)
      .join('path')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('stroke', d => d.color || '#aaa')
        .attr('stroke-width', d => Math.max(1, d.width))
        .attr('stroke-opacity', d => {
          if (!highlightRegions) return 0.38;
          return highlightRegions.includes(d.region) ? 0.6 : 0.08;
        })
        .style('cursor', 'pointer')
        .on('mousemove', (e, d) => {
          const src = graph.nodes.find(n => n.id === d.source.id);
          const tgt = graph.nodes.find(n => n.id === d.target.id);
          const pct = d.value.toFixed(1);
          showTip(e,
            `<div style="font-weight:700;color:${src?.color||'#fff'};margin-bottom:4px">${src?.label || ''}</div>` +
            `→ ${(tgt?.label||'').replace('\n',' ')}<br/>` +
            `<strong>${pct} su 100 ragazze</strong>`
          );
        })
        .on('mouseleave', hideTip);

    // Nodes
    const nodeG = g.selectAll('.snode').data(graph.nodes).join('g').attr('class', 'snode')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    nodeG.append('rect')
      .attr('height', d => Math.max(1, d.y1 - d.y0))
      .attr('width', d => d.x1 - d.x0)
      .attr('fill', d => d.color || '#888')
      .attr('opacity', 0.88).attr('rx', 2)
      .on('mousemove', (e, d) => {
        const stat = regionStats.find(r => r.id === d.id);
        const body = stat
          ? `Media matrimoni precoci: <strong>${stat.avgRate.toFixed(1)}%</strong><br/><span style="color:#aaa">${stat.nCountries} paesi</span>`
          : '';
        showTip(e, `<div style="font-weight:700;color:${d.color||'#fff'};margin-bottom:4px">${d.label.replace('\n',' ')}</div>${body}`);
      })
      .on('mouseleave', hideTip);

    // Labels
    nodeG.each(function(d) {
      const nodeH = d.y1 - d.y0;
      const lines = d.label.split('\n');
      const sel = d3.select(this);
      const x = d.isSource ? -6 : (d.x1 - d.x0) + 6;
      const anchor = d.isSource ? 'end' : 'start';
      const yOff = (nodeH / 2) - (lines.length - 1) * 6;
      lines.forEach((line, i) => {
        const suffix = (d.isSource && d.rate != null) ? (i === 0 ? ` — ${d.rate.toFixed(0)}%` : '') : '';
        sel.append('text')
          .attr('x', x).attr('y', yOff + i * 13).attr('dy', '0.35em')
          .attr('text-anchor', anchor).attr('font-size', 11).attr('fill', '#333')
          .text(line + suffix);
      });
    });

    // Footer
    svg.append('text').attr('x', W / 2).attr('y', H - 4)
      .attr('text-anchor', 'middle').attr('fill', '#bbb').attr('font-size', 9)
      .text('% donne 20–24 anni sposate prima dei 18 — media per regione UN SDG — Fonte: UNICEF 2024');
  }

  draw();

  const node = container.node();
  node._sankeyHighlight = function(regionArr) {
    highlightRegions = regionArr && regionArr.length ? regionArr : null;
    btnMap.forEach((b, id) => {
      const active = !highlightRegions ? !id : (id && highlightRegions.includes(id));
      b.style('background', active ? '#b04a4a' : '#fff').style('color', active ? '#fff' : '#333');
    });
    draw();
  };
  node._sankeyReset = function() {
    highlightRegions = null;
    btnMap.forEach((b, id) => {
      b.style('background', !id ? '#b04a4a' : '#fff').style('color', !id ? '#fff' : '#333');
    });
    draw();
  };
}
