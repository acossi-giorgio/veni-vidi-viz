/* ============================================================
   Grafico 2-1 (Atto I) — MPI Africa: distribuzione o ranking
   Toggle: istogramma ↔ barre orizzontali per paese
   ============================================================ */
async function renderMpiBreakdown(selector, isFullscreen = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  container.style.position = 'relative';

  const CONT_COLOR = { 'Africa': '#e07b39', 'Asia': '#4a90d9' };

  const raw = await d3.csv('datasets/processed/mpi.csv', d3.autoType);

  const latestMap = new Map();
  d3.group(raw, d => d.code).forEach((rows, code) => {
    const r = rows.filter(d => d.value != null).sort((a, b) => b.year - a.year)[0];
    if (r) latestMap.set(code, r);
  });
  const allData = Array.from(latestMap.values());
  const africa  = allData.filter(d => d.continent === 'Africa').sort((a, b) => b.value - a.value);
  const asia    = allData.filter(d => d.continent === 'Asia').sort((a, b) => b.value - a.value);

  let mode     = 'africa'; // 'africa' | 'severe' | 'compare'
  let viewType = 'dist';   // 'dist' | 'rank'

  // ── Toggle button ──────────────────────────────────────────
  const toggleBtn = d3.select(container).append('div')
    .style('position', 'absolute').style('top', '6px').style('right', '8px')
    .style('display', 'flex').style('gap', '4px').style('z-index', '10');

  function makeToggleBtn(label, val) {
    return toggleBtn.append('button')
      .style('font-size', '10px').style('padding', '2px 8px')
      .style('border-radius', '5px').style('cursor', 'pointer')
      .style('border', '1px solid #c8d4e8').style('background', 'rgba(255,255,255,0.92)')
      .style('color', '#4a6fa5').style('transition', 'all 0.15s')
      .text(label)
      .on('click', () => { viewType = val; updateToggle(); draw(); });
  }

  const btnDist = makeToggleBtn('Distribuzione', 'dist');
  const btnRank = makeToggleBtn('Ranking', 'rank');

  function updateToggle() {
    btnDist.style('font-weight', viewType === 'dist' ? '700' : '400')
           .style('background', viewType === 'dist' ? '#e8eef7' : 'rgba(255,255,255,0.92)');
    btnRank.style('font-weight', viewType === 'rank' ? '700' : '400')
           .style('background', viewType === 'rank' ? '#e8eef7' : 'rgba(255,255,255,0.92)');
  }
  updateToggle();

  // ── Layout ─────────────────────────────────────────────────
  const MARGIN_DIST = { top: 32, right: 24, bottom: 56, left: 52 };
  const MARGIN_RANK = { top: 32, right: 24, bottom: 16, left: 120 };

  const W  = container.clientWidth  || (isFullscreen ? window.innerWidth  * 0.85 : 760);
  const H  = container.clientHeight || (isFullscreen ? window.innerHeight * 0.82 : 480);

  const svg = d3.select(container).append('svg')
    .attr('width', W).attr('height', H)
    .style('width', '100%').style('height', '100%').style('display', 'block');

  const g = svg.append('g');

  let tipEl = document.getElementById('mpi-hist-tip');
  if (!tipEl) {
    tipEl = document.createElement('div'); tipEl.id = 'mpi-hist-tip';
    Object.assign(tipEl.style, {
      position: 'fixed', display: 'none', pointerEvents: 'none',
      background: 'rgba(20,20,40,0.93)', color: '#fff',
      padding: '8px 12px', borderRadius: '6px', fontSize: '11px',
      lineHeight: '1.65', zIndex: '10000', maxWidth: '220px', whiteSpace: 'normal',
    });
    document.body.appendChild(tipEl);
  }

  function draw() {
    g.selectAll('*').remove();
    viewType === 'dist' ? drawDist() : drawRank();
  }

  /* ── Distribuzione (istogramma) ─────────────────────────── */
  function drawDist() {
    const M  = MARGIN_DIST;
    const iw = W - M.left - M.right;
    const ih = H - M.top  - M.bottom;
    g.attr('transform', `translate(${M.left},${M.top})`);

    const showAsia  = mode === 'compare';
    const severeCut = mode === 'severe' ? 0.30 : null;

    const xMax = d3.max(allData, d => d.value);
    const xS   = d3.scaleLinear().domain([0, Math.ceil(xMax * 20) / 20]).range([0, iw]).nice();

    const binGen = d3.bin().value(d => d.value).domain(xS.domain()).thresholds(xS.ticks(16));
    const africaBins = binGen(africa);
    const asiaBins   = showAsia ? binGen(asia) : [];

    const yMax = d3.max([...africaBins.map(b => b.length), ...(showAsia ? asiaBins.map(b => b.length) : [])]);
    const yS   = d3.scaleLinear().domain([0, yMax + 1]).range([ih, 0]).nice();

    yS.ticks(5).forEach(t => {
      g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yS(t)).attr('y2', yS(t))
        .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
    });

    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xS).ticks(10).tickFormat(d3.format('.2f')))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick text').attr('font-size', 9).attr('fill', '#aaa'); ax.selectAll('.tick line').attr('stroke', '#eee'); });

    g.append('g')
      .call(d3.axisLeft(yS).ticks(5).tickFormat(d => Math.round(d)))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick text').attr('font-size', 9).attr('fill', '#aaa'); ax.selectAll('.tick line').remove(); });

    g.append('text').attr('x', iw / 2).attr('y', ih + 40).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#666').text('Indice di Povertà Multidimensionale (MPI)');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -40).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#666').text('N° paesi');

    if (severeCut) {
      g.append('line').attr('x1', xS(severeCut)).attr('x2', xS(severeCut)).attr('y1', 0).attr('y2', ih)
        .attr('stroke', '#b04a4a').attr('stroke-width', 1.5).attr('stroke-dasharray', '5,3');
      g.append('text').attr('x', xS(severeCut) + 4).attr('y', 14).attr('font-size', 9).attr('fill', '#b04a4a').text('soglia grave →');
    }

    function drawBars(bins, col, offset, barsTotal) {
      const barW = bins[0] ? xS(bins[0].x1) - xS(bins[0].x0) : 20;
      const halfW = barW / barsTotal;
      bins.forEach(bin => {
        if (!bin.length) return;
        const x        = xS(bin.x0) + offset * halfW;
        const isSevere = severeCut && bin.x0 >= severeCut;
        const fill     = severeCut ? (isSevere ? col : '#ddd') : col;
        const opa      = severeCut ? (isSevere ? 0.85 : 0.45) : 0.78;

        g.append('rect').attr('x', x + 1).attr('y', yS(bin.length))
          .attr('width', halfW - 2).attr('height', ih - yS(bin.length))
          .attr('fill', fill).attr('opacity', opa).attr('rx', 2).style('cursor', 'pointer')
          .on('mouseover', function () {
            d3.select(this).attr('opacity', 1);
            const label  = col === CONT_COLOR['Africa'] ? 'Africa' : 'Asia';
            const sorted = [...bin].sort((a, b) => b.value - a.value);
            const listed = sorted.map(d => `${d.country} <span style="opacity:.6">${d.value.toFixed(3)}</span>`).join('<br>');
            tipEl.innerHTML = `<strong style="color:${col}">MPI ${bin.x0.toFixed(2)}–${bin.x1.toFixed(2)} · ${label}</strong><br><span style="opacity:.6">${bin.length} ${bin.length === 1 ? 'paese' : 'paesi'}</span><br>${listed}`;
            tipEl.style.display = 'block';
          })
          .on('mousemove', ev => { tipEl.style.left = (ev.clientX + 14) + 'px'; tipEl.style.top = (ev.clientY - 28) + 'px'; })
          .on('mouseleave', function () { d3.select(this).attr('opacity', opa); tipEl.style.display = 'none'; });

        if (bin.length >= 3) {
          g.append('text').attr('x', x + halfW / 2).attr('y', yS(bin.length) - 3)
            .attr('text-anchor', 'middle').attr('font-size', 8.5)
            .attr('fill', fill).attr('opacity', opa + 0.1).style('pointer-events', 'none')
            .text(bin.length);
        }
      });
    }

    if (showAsia) {
      drawBars(africaBins, CONT_COLOR['Africa'], 0, 2);
      drawBars(asiaBins,   CONT_COLOR['Asia'],   1, 2);
      [['Africa', '#e07b39'], ['Asia', '#4a90d9']].forEach(([lbl, col], i) => {
        g.append('rect').attr('x', iw - 80).attr('y', i * 16).attr('width', 12).attr('height', 10).attr('rx', 2).attr('fill', col).attr('opacity', 0.8);
        g.append('text').attr('x', iw - 64).attr('y', i * 16 + 9).attr('font-size', 9).attr('fill', '#555').text(lbl);
      });
    } else {
      drawBars(africaBins, CONT_COLOR['Africa'], 0, 1);
    }

    const mean = d3.mean(africa, d => d.value);
    g.append('line').attr('x1', xS(mean)).attr('x2', xS(mean)).attr('y1', 0).attr('y2', ih)
      .attr('stroke', CONT_COLOR['Africa']).attr('stroke-width', 1).attr('stroke-dasharray', '3,3').attr('opacity', 0.5);
    g.append('text').attr('x', xS(mean) + 3).attr('y', ih - 6)
      .attr('font-size', 8).attr('fill', CONT_COLOR['Africa']).attr('opacity', 0.7).text(`media ${mean.toFixed(3)}`);

    g.append('text').attr('x', iw).attr('y', -10).attr('text-anchor', 'end').attr('font-size', 9).attr('fill', '#bbb')
      .text(`n=${africa.length} paesi africani`);
  }

  /* ── Ranking (barre orizzontali per paese) ──────────────── */
  function drawRank() {
    const M  = MARGIN_RANK;
    const iw = W - M.left - M.right;
    const ih = H - M.top  - M.bottom;
    g.attr('transform', `translate(${M.left},${M.top})`);

    const showAsia  = mode === 'compare';
    const severeCut = mode === 'severe' ? 0.30 : null;

    const countries = showAsia
      ? [...africa, ...asia].sort((a, b) => b.value - a.value)
      : africa;

    const xMax = d3.max(countries, d => d.value);
    const xS   = d3.scaleLinear().domain([0, xMax * 1.05]).range([0, iw]).nice();
    const yS   = d3.scaleBand().domain(countries.map(d => d.code)).range([0, ih]).padding(0.18);

    const barH = yS.bandwidth();
    const fontSize = Math.max(6, Math.min(9, barH + 1));

    // Gridlines
    xS.ticks(5).forEach(t => {
      g.append('line').attr('x1', xS(t)).attr('x2', xS(t)).attr('y1', 0).attr('y2', ih)
        .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
    });

    // Severity threshold
    if (severeCut) {
      g.append('line').attr('x1', xS(severeCut)).attr('x2', xS(severeCut)).attr('y1', 0).attr('y2', ih)
        .attr('stroke', '#b04a4a').attr('stroke-width', 1.5).attr('stroke-dasharray', '5,3');
      g.append('text').attr('x', xS(severeCut) + 3).attr('y', -6).attr('font-size', 9).attr('fill', '#b04a4a').text('soglia grave');
    }

    // X axis
    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xS).ticks(5).tickFormat(d3.format('.2f')))
      .call(ax => { ax.select('.domain').remove(); ax.selectAll('.tick text').attr('font-size', 9).attr('fill', '#aaa'); ax.selectAll('.tick line').attr('stroke', '#eee'); });

    g.append('text').attr('x', iw / 2).attr('y', ih + 28).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#666').text('MPI');

    countries.forEach(d => {
      const col       = CONT_COLOR[d.continent] || '#aaa';
      const isSevere  = severeCut && d.value >= severeCut;
      const fill      = severeCut ? (isSevere ? col : '#ddd') : col;
      const opa       = severeCut ? (isSevere ? 0.85 : 0.35) : 0.78;

      // Country label
      g.append('text')
        .attr('x', -4).attr('y', yS(d.code) + barH / 2 + 0.5)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('font-size', fontSize).attr('fill', fill).attr('opacity', Math.max(opa, 0.55))
        .style('pointer-events', 'none')
        .text(d.country.length > 16 ? d.country.slice(0, 15) + '…' : d.country);

      // Bar
      g.append('rect')
        .attr('x', 0).attr('y', yS(d.code))
        .attr('width', xS(d.value)).attr('height', barH)
        .attr('fill', fill).attr('opacity', opa).attr('rx', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1);
          tipEl.innerHTML = `<strong style="color:${col}">${d.country}</strong> (${d.continent})<br>MPI: ${d.value.toFixed(3)}<br>Anno: ${d.year}`;
          tipEl.style.display = 'block';
        })
        .on('mousemove', ev => { tipEl.style.left = (ev.clientX + 14) + 'px'; tipEl.style.top = (ev.clientY - 28) + 'px'; })
        .on('mouseleave', function () { d3.select(this).attr('opacity', opa); tipEl.style.display = 'none'; });
    });

    // Legend (compare mode)
    if (showAsia) {
      [['Africa', '#e07b39'], ['Asia', '#4a90d9']].forEach(([lbl, col], i) => {
        g.append('rect').attr('x', iw - 60).attr('y', i * 14).attr('width', 10).attr('height', 8).attr('rx', 2).attr('fill', col).attr('opacity', 0.8);
        g.append('text').attr('x', iw - 46).attr('y', i * 14 + 7).attr('font-size', 8).attr('fill', '#555').text(lbl);
      });
    }

    g.append('text').attr('x', iw).attr('y', -10).attr('text-anchor', 'end').attr('font-size', 9).attr('fill', '#bbb')
      .text(`n=${countries.length} paesi`);
  }

  draw();

  container._mpiReset = () => { mode = 'africa'; draw(); };
  container._mpiFilterContinent = (c) => {
    if (c === 'Africa') { mode = 'severe';  draw(); }
    else if (c === 'Asia') { mode = 'compare'; draw(); }
    else { mode = 'africa'; draw(); }
  };
  container._mpiHighlightSevere = () => { mode = 'severe'; draw(); };
}
