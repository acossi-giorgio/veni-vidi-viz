async function renderGdpMapChart(selector, initialYear = 2023) {
  const container = document.querySelector(selector);
  if (!container) return;

  container.innerHTML = '';
  container.style.position = 'relative';

  // Load data
  const data = await loadData('datasets/clean/gdp_per_capita.csv');
  if (!data || data.length === 0) {
    container.innerHTML = '<p style="padding:20px;color:#999;">Errore nel caricamento dei dati</p>';
    return;
  }

  // Load world map TopoJSON
  let countries;
  try {
    const geoData = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json');
    if (!geoData || !geoData.objects) throw new Error('Invalid GeoJSON structure');
    const countriesObj = geoData.objects.countries || geoData.objects.land;
    if (!countriesObj) throw new Error('Countries data not found');
    countries = topojson.feature(geoData, countriesObj).features;
    if (!countries || countries.length === 0) throw new Error('No countries features found');
  } catch (error) {
    console.error('Error loading world map data:', error);
    container.innerHTML = '<p style="padding:20px;color:#e74c3c;">Errore nel caricamento della mappa</p>';
    return;
  }

  // Country name mapping (CSV names -> GeoJSON names)
  const countryNameMap = {
    'United States': 'United States of America',
    'USA': 'United States of America',
    'United Kingdom': 'United Kingdom',
    'UK': 'United Kingdom',
    'South Korea': 'South Korea',
    'Korea': 'South Korea',
    'UAE': 'United Arab Emirates',
  };

  // Pre-compute GDP maps for all years at once
  const gdpByYear = {};
  data.forEach((d) => {
    const year = +d.Year;
    if (!gdpByYear[year]) gdpByYear[year] = {};
    const csvName = d['Country Name'];
    const geoName = countryNameMap[csvName] || csvName;
    const val = parseFloat(d['GDPPerCapita']);
    if (val > 0 && isFinite(val)) gdpByYear[year][geoName] = val;
  });

  // Global min/max for consistent color scale across all years
  const allValues = data.map((d) => parseFloat(d['GDPPerCapita'])).filter((v) => v > 0 && isFinite(v));
  const minGdp = d3.min(allValues) || 0;
  const maxGdp = d3.max(allValues) || 1000;

  const colorScale = d3.scaleLinear().domain([minGdp, maxGdp]).range(['#ffb3b3', '#cc0000']);

  // Dimensions
  const width = container.clientWidth || 800;
  const height = Math.max(container.clientHeight || 0, 450);

  // Tooltip
  let tooltip = d3.select('#gdp-map-tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div').attr('id', 'gdp-map-tooltip');
  }
  tooltip
    .style('position', 'fixed')
    .style('pointer-events', 'none')
    .style('display', 'none')
    .style('background', 'rgba(0,0,0,0.85)')
    .style('color', '#fff')
    .style('padding', '8px 12px')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('font-family', 'Roboto Slab, serif')
    .style('z-index', 10000)
    .style('white-space', 'nowrap')
    .style('box-shadow', '0 2px 8px rgba(0,0,0,0.3)');

  function showTooltip(event, html) {
    tooltip.html(html).style('display', 'block');
    let x = event.clientX + 14;
    let y = event.clientY + 16;
    const rect = tooltip.node().getBoundingClientRect();
    if (x + rect.width > window.innerWidth - 8) x = event.clientX - rect.width - 14;
    if (y + rect.height > window.innerHeight - 8) y = event.clientY - rect.height - 14;
    tooltip.style('left', `${x}px`).style('top', `${y}px`);
  }

  function hideTooltip() {
    tooltip.style('display', 'none');
  }

  // SVG
  const svg = d3
    .select(selector)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('background', '#f5f5f5')
    .style('cursor', 'grab')
    .style('display', 'block')
    .style('border-radius', '12px');

  // Clip path so map doesn't overflow SVG bounds during zoom
  const defs = svg.append('defs');
  defs.append('clipPath').attr('id', 'gdp-map-clip')
    .append('rect').attr('width', width).attr('height', height);

  // Map group – target for zoom transform
  const mapGroup = svg.append('g')
    .attr('class', 'map-group')
    .attr('clip-path', 'url(#gdp-map-clip)');

  // Projection & path
  const projection = d3
    .geoMercator()
    .fitExtent([[0, 0], [width, height]], { type: 'FeatureCollection', features: countries });
  const pathGenerator = d3.geoPath().projection(projection);

  // Draw country paths
  let currentYear = initialYear;

  mapGroup
    .selectAll('path.country')
    .data(countries)
    .enter()
    .append('path')
    .attr('class', 'country')
    .attr('d', pathGenerator)
    .attr('stroke', '#fff')
    .attr('stroke-width', 0.5)
    .attr('fill', (d) => {
      const val = (gdpByYear[currentYear] || {})[d.properties?.name || ''] || 0;
      return val > 0 ? colorScale(val) : '#e8e8e8';
    })
    .on('mouseenter', function (event, d) {
      d3.select(this).attr('stroke-width', 2).raise();
      const name = d.properties?.name || 'Unknown';
      const val = (gdpByYear[currentYear] || {})[name] || 0;
      showTooltip(
        event,
        `<div style="text-align:center;font-weight:bold;margin-bottom:4px;">${name}</div>` +
          (val > 0
            ? `<strong>GDP per capita:</strong> $${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
            : '<em>No data</em>')
      );
    })
    .on('mousemove', function (event, d) {
      const name = d.properties?.name || 'Unknown';
      const val = (gdpByYear[currentYear] || {})[name] || 0;
      showTooltip(
        event,
        `<div style="text-align:center;font-weight:bold;margin-bottom:4px;">${name}</div>` +
          (val > 0
            ? `<strong>GDP per capita:</strong> $${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
            : '<em>No data</em>')
      );
    })
    .on('mouseleave', function () {
      d3.select(this).attr('stroke-width', 0.5).attr('stroke', '#fff');
      hideTooltip();
    });

  // Year watermark (outside mapGroup, won't zoom)
  const yearLabel = svg
    .append('text')
    .attr('class', 'year-label')
    .attr('x', width - 12)
    .attr('y', height - 12)
    .attr('text-anchor', 'end')
    .attr('font-size', 48)
    .attr('font-weight', 'bold')
    .attr('fill', '#000')
    .attr('opacity', 0.12)
    .attr('pointer-events', 'none')
    .text(currentYear);

  // Legend (TOP of chart, won't zoom) - styled like choroplethMap
  const legendData = [
    { value: '$0-5K', color: colorScale(2500) },
    { value: '$5K-10K', color: colorScale(7500) },
    { value: '$10K-20K', color: colorScale(15000) },
    { value: '$20K-30K', color: colorScale(25000) },
    { value: '$30K-40K', color: colorScale(35000) },
    { value: '$40K-50K', color: colorScale(45000) },
    { value: '$50K+', color: colorScale(Math.max(60000, maxGdp)) },
  ];

  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(0, 15)`);

  const rectSize = 16;
  const textPadding = 8;
  const gapBetweenTexts = 20;

  const items = legend.selectAll('.legend-item')
    .data(legendData)
    .enter()
    .append('g')
    .attr('class', 'legend-item');

  items.append('rect')
    .attr('width', rectSize)
    .attr('height', rectSize)
    .attr('fill', d => d.color)
    .attr('stroke', '#333')
    .attr('stroke-width', 0.5);

  items.append('text')
    .attr('x', rectSize + textPadding)
    .attr('y', rectSize / 2)
    .attr('alignment-baseline', 'middle')
    .style('font-size', '12px')
    .style('font-family', 'Roboto Slab, serif')
    .text(d => d.value);

  let x = 0;
  items.each(function() {
    const g = d3.select(this);
    const textNode = g.select('text').node();
    const textBBox = textNode.getBBox();
    const groupWidth = rectSize + textPadding + textBBox.width;

    g.attr('transform', `translate(${x}, 0)`);
    x += groupWidth + gapBetweenTexts;
  });

  // Center legend horizontally within available chart width
  const totalLegendWidth = x - gapBetweenTexts;
  const startX = Math.max(0, (width - totalLegendWidth) / 2);
  legend.attr('transform', `translate(${startX}, 15)`);

  // Zoom behaviour
  const zoom = d3
    .zoom()
    .scaleExtent([1, 8])
    .translateExtent([[0, 0], [width, height]])
    .on('zoom', (event) => {
      mapGroup.attr('transform', event.transform);
      svg.style('cursor', 'grabbing');
    })
    .on('end', () => {
      svg.style('cursor', 'grab');
    });

  svg.call(zoom);

  // Zoom control buttons
  const btnStyle =
    'width:32px;height:32px;background:#fff;border:1px solid #ccc;border-radius:4px;' +
    'font-size:18px;line-height:1;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.2);' +
    'display:flex;align-items:center;justify-content:center;';

  const controls = document.createElement('div');
  controls.style.cssText =
    'position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:4px;z-index:10;';
  controls.innerHTML = `
    <button id="gdp-zoom-in"    title="Zoom in"    style="${btnStyle}">+</button>
    <button id="gdp-zoom-out"   title="Zoom out"   style="${btnStyle}">−</button>
    <button id="gdp-zoom-reset" title="Reset zoom" style="${btnStyle}">⌂</button>
  `;
  container.appendChild(controls);

  container.querySelector('#gdp-zoom-in').addEventListener('click', () => {
    svg.transition().duration(300).call(zoom.scaleBy, 1.5);
  });
  container.querySelector('#gdp-zoom-out').addEventListener('click', () => {
    svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.5);
  });
  container.querySelector('#gdp-zoom-reset').addEventListener('click', () => {
    svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
  });

  // Animation state
  let animationInterval = null;
  let isPlaying = false;
  const years = Object.keys(gdpByYear).map(y => +y).sort((a, b) => a - b);

  // Update function — only repaints fills, preserves zoom state
  function update(year) {
    currentYear = year;
    yearLabel.text(year);
    mapGroup
      .selectAll('path.country')
      .transition()
      .duration(300)
      .attr('fill', (d) => {
        const val = (gdpByYear[year] || {})[d.properties?.name || ''] || 0;
        return val > 0 ? colorScale(val) : '#e8e8e8';
      });
  }

  function startAnimation(speed) {
    animationInterval = setInterval(() => {
      const yearSlider = document.getElementById('year-selector');
      let currentIndex = years.indexOf(currentYear);
      currentIndex++;
      
      if (currentIndex >= years.length) {
        currentIndex = 0;
      }
      
      const nextYear = years[currentIndex];
      if (yearSlider) yearSlider.value = nextYear;
      updateGdpMapChart(selector, nextYear);
    }, speed);
  }

  // Expose update function on the container element
  container._gdpUpdate = update;
  container._gdpStartAnimation = startAnimation;
  container._gdpYears = years;
  container._gdpIsPlaying = () => isPlaying;
  container._gdpSetPlaying = (v) => { isPlaying = v; };
  container._gdpClearAnimation = () => {
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
  };

  // Region zoom functions
  container._gdpZoomToEurope = function() {
    if (!svg.node()) return;
    // Project the NW and SE corners of Europe directly
    const [x0, y0] = projection([-15, 72]); // NW: west=-15, north=72
    const [x1, y1] = projection([45, 34]);  // SE: east=45, south=34
    const scale = Math.min(8, 0.85 * Math.min(width / (x1 - x0), height / (y1 - y0)));
    const tx = width / 2 - scale * (x0 + x1) / 2;
    const ty = height / 2 - scale * (y0 + y1) / 2;
    svg.transition()
      .duration(3000)
      .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  };

  container._gdpZoomToAfrica = function() {
    if (!svg.node()) return;
    // Project the NW and SE corners of Africa directly
    const [x0, y0] = projection([-20, 38]);  // NW: west=-20, north=38
    const [x1, y1] = projection([55, -35]);  // SE: east=55, south=-35
    const scale = Math.min(8, 0.85 * Math.min(width / (x1 - x0), height / (y1 - y0)));
    const tx = width / 2 - scale * (x0 + x1) / 2;
    const ty = height / 2 - scale * (y0 + y1) / 2;
    svg.transition()
      .duration(1200)
      .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  };

  container._gdpZoomToWorld = function() {
    if (!svg.node()) return;
    // Reset zoom to show entire world
    svg.transition()
      .duration(1200)
      .call(zoom.transform, d3.zoomIdentity);
  };
}

// Called by the year slider in main.js — updates fills without re-rendering
function updateGdpMapChart(selector, year) {
  const container = document.querySelector(selector);
  if (container && container._gdpUpdate) {
    container._gdpUpdate(year);
  }
}
