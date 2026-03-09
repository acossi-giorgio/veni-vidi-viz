async function renderGdpMapChart(selector, initialYear = 2023) {
  const container = document.querySelector(selector);
  if (!container) return;

  container.innerHTML = '';
  container.style.position = 'relative';

  // Load data
  const data = await loadData('datasets/clean/gdp_per_capita.csv');
  console.table(data);
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

  // Build country name lookup from CSV data (for tooltip display)
  const codeToName = {};
  data.forEach(d => { if (d.Code && d['Country Name']) codeToName[d.Code] = d['Country Name']; });

  // ISO numeric → ISO alpha-3 lookup
  // world-atlas@2 features have numeric id but empty properties (no name)
  const numericToAlpha3 = {
    4:'AFG',8:'ALB',12:'DZA',16:'ASM',20:'AND',24:'AGO',28:'ATG',32:'ARG',36:'AUS',40:'AUT',
    31:'AZE',44:'BHS',48:'BHR',50:'BGD',52:'BRB',112:'BLR',56:'BEL',84:'BLZ',204:'BEN',
    64:'BTN',68:'BOL',70:'BIH',72:'BWA',76:'BRA',96:'BRN',100:'BGR',854:'BFA',108:'BDI',
    132:'CPV',116:'KHM',120:'CMR',124:'CAN',140:'CAF',148:'TCD',152:'CHL',156:'CHN',
    170:'COL',174:'COM',180:'COD',178:'COG',188:'CRI',384:'CIV',191:'HRV',192:'CUB',
    196:'CYP',203:'CZE',208:'DNK',262:'DJI',212:'DMA',214:'DOM',218:'ECU',818:'EGY',
    222:'SLV',226:'GNQ',232:'ERI',233:'EST',231:'ETH',238:'FLK',242:'FJI',246:'FIN',
    250:'FRA',266:'GAB',270:'GMB',268:'GEO',276:'DEU',288:'GHA',300:'GRC',308:'GRD',
    304:'GRL',320:'GTM',324:'GIN',624:'GNB',328:'GUY',332:'HTI',340:'HND',348:'HUN',
    352:'ISL',356:'IND',360:'IDN',364:'IRN',368:'IRQ',372:'IRL',376:'ISR',380:'ITA',
    388:'JAM',392:'JPN',400:'JOR',398:'KAZ',404:'KEN',296:'KIR',408:'PRK',410:'KOR',
    414:'KWT',417:'KGZ',418:'LAO',422:'LBN',426:'LSO',430:'LBR',434:'LBY',438:'LIE',
    440:'LTU',442:'LUX',450:'MDG',454:'MWI',458:'MYS',462:'MDV',466:'MLI',470:'MLT',
    584:'MHL',478:'MRT',480:'MUS',484:'MEX',583:'FSM',498:'MDA',492:'MCO',496:'MNG',
    499:'MNE',504:'MAR',508:'MOZ',516:'NAM',524:'NPL',528:'NLD',554:'NZL',558:'NIC',
    562:'NER',566:'NGA',807:'MKD',578:'NOR',512:'OMN',586:'PAK',585:'PLW',591:'PAN',
    598:'PNG',600:'PRY',604:'PER',608:'PHL',616:'POL',620:'PRT',634:'QAT',642:'ROU',
    643:'RUS',646:'RWA',659:'KNA',662:'LCA',670:'VCT',882:'WSM',674:'SMR',678:'STP',
    682:'SAU',686:'SEN',688:'SRB',694:'SLE',703:'SVK',705:'SVN',706:'SOM',710:'ZAF',
    728:'SSD',724:'ESP',144:'LKA',729:'SDN',740:'SUR',748:'SWZ',752:'SWE',756:'CHE',
    760:'SYR',762:'TJK',764:'THA',626:'TLS',768:'TGO',776:'TON',780:'TTO',788:'TUN',
    792:'TUR',795:'TKM',798:'TUV',800:'UGA',804:'UKR',784:'ARE',826:'GBR',840:'USA',
    858:'URY',860:'UZB',548:'VUT',862:'VEN',704:'VNM',887:'YEM',894:'ZMB',716:'ZWE',
    60:'BMU',136:'CYM',234:'FRO',258:'PYF',316:'GUM',344:'HKG',446:'MAC',540:'NCL',
    580:'MNP',630:'PRI',533:'ABW',531:'CUW',534:'SXM',850:'VIR',833:'IMN',
  };

  // Pre-compute GDP maps for all years at once (keyed by ISO alpha-3 code)
  const gdpByYear = {};
  data.forEach((d) => {
    const year = +d.Year;
    if (!gdpByYear[year]) gdpByYear[year] = {};
    const val = parseFloat(d['GDP_Per_Capita (USD)']);
    if (d.Code && val > 0 && isFinite(val)) gdpByYear[year][d.Code] = val;
  });

  // Sorted list of available years
  const years = Object.keys(gdpByYear).map(y => +y).sort((a, b) => a - b);

  // Global min/max for consistent color scale across all years
  const allValues = data.map((d) => parseFloat(d['GDP_Per_Capita (USD)'])).filter((v) => v > 0 && isFinite(v));
  const minGdp = d3.min(allValues) || 0;
  const maxGdp = d3.max(allValues) || 1000;

  const colorScale = d3.scaleLinear().domain([minGdp, maxGdp]).range(['#ffb3b3', '#cc0000']);

  // Dimensions
  const width = container.clientWidth || 800;
  const height = Math.max(container.clientHeight || 0, 600);

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
  let currentYear = years.includes(initialYear) ? initialYear : years[0];

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
      const alpha3 = numericToAlpha3[d.id] || '';
      const val = (gdpByYear[currentYear] || {})[alpha3] || 0;
      return val > 0 ? colorScale(val) : '#e8e8e8';
    })
    .on('mouseenter', function (event, d) {
      const alpha3 = numericToAlpha3[d.id] || '';
      const name = codeToName[alpha3] || alpha3 || 'Unknown';
      const val = (gdpByYear[currentYear] || {})[alpha3] || 0;
      showTooltip(
        event,
        `<div style="text-align:center;font-weight:bold;margin-bottom:4px;">${name}</div>` +
          (val > 0
            ? `<strong>GDP per capita:</strong> $${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
            : '<em>No data</em>')
      );
    })
    .on('mousemove', function (event, d) {
      const alpha3 = numericToAlpha3[d.id] || '';
      const name = codeToName[alpha3] || alpha3 || 'Unknown';
      const val = (gdpByYear[currentYear] || {})[alpha3] || 0;
      showTooltip(
        event,
        `<div style="text-align:center;font-weight:bold;margin-bottom:4px;">${name}</div>` +
          (val > 0
            ? `<strong>GDP per capita:</strong> $${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
            : '<em>No data</em>')
      );
    })
    .on('mouseleave', function () {
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

  // Play/Pause icon (same style as year label, bottom left)
  const playPauseLabel = svg
    .append('text')
    .attr('class', 'play-pause-label')
    .attr('x', 12)
    .attr('y', height - 12)
    .attr('text-anchor', 'start')
    .attr('font-size', 48)
    .attr('font-weight', 'bold')
    .attr('fill', '#000')
    .attr('opacity', 0.12)
    .attr('pointer-events', 'auto')
    .style('cursor', 'pointer')
    .text('▶');

  let isAnimationPlaying = true;

  playPauseLabel.on('click', function(event) {
    event.stopPropagation();
    if (!isAnimationPlaying) {
      isAnimationPlaying = true;
      playPauseLabel.text('⏸');
      if (container._gdpStartAnimation) container._gdpStartAnimation(1000);
    } else {
      isAnimationPlaying = false;
      playPauseLabel.text('▶');
      if (container._gdpClearAnimation) container._gdpClearAnimation();
    }
  });

  // Year slider between play button and year watermark
  const sliderPadL = 72;
  const sliderPadR = 148;
  const sliderFO = svg.append('foreignObject')
    .attr('x', sliderPadL)
    .attr('y', height - 46)
    .attr('width', width - sliderPadL - sliderPadR)
    .attr('height', 32)
    .attr('pointer-events', 'auto')
    .on('mousedown', (e) => e.stopPropagation())
    .on('touchstart', (e) => e.stopPropagation());

  const sliderNode = sliderFO.append('xhtml:input')
    .attr('id', 'gdp-map-slider')
    .attr('type', 'range')
    .attr('min', years[0])
    .attr('max', years[years.length - 1])
    .attr('step', 1)
    .attr('value', currentYear)
    .style('margin-top', '14px')
    .style('-webkit-appearance', 'none')
    .style('appearance', 'none')
    .style('width', '100%')
    .style('height', '4px')
    .style('background', 'rgba(0,0,0,0.18)')
    .style('border-radius', '2px')
    .style('outline', 'none')
    .style('cursor', 'pointer')
    .on('input', function() {
      const y = +this.value;
      container._gdpClearAnimation();
      isAnimationPlaying = false;
      playPauseLabel.text('▶');
      update(y);
    });

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

  // Play/Pause button handler (duplicate removed — handled above)

  // Animation state
  let animationInterval = null;

  // Update function — only repaints fills, preserves zoom state
  function update(year) {
    currentYear = year;
    yearLabel.text(year);
    sliderNode.property('value', year);
    mapGroup
      .selectAll('path.country')
      .transition()
      .duration(300)
      .attr('fill', (d) => {
        const alpha3 = numericToAlpha3[d.id] || '';
        const val = (gdpByYear[year] || {})[alpha3] || 0;
        return val > 0 ? colorScale(val) : '#e8e8e8';
      });
  }

  function startAnimation(speed) {
    animationInterval = setInterval(() => {
      let currentIndex = years.indexOf(currentYear);
      currentIndex++;
      if (currentIndex >= years.length) currentIndex = 0;
      const nextYear = years[currentIndex];
      updateGdpMapChart(selector, nextYear);
    }, speed);
  }

  // Expose update function on the container element
  container._gdpUpdate = update;
  container._gdpStartAnimation = startAnimation;
  container._gdpYears = years;
  container._gdpIsPlaying = () => isAnimationPlaying;
  container._gdpSetPlaying = (v) => { isAnimationPlaying = v; };
  container._gdpClearAnimation = () => {
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
  };

  // Start animation by default
  if (startAnimation) {
    startAnimation(2000);
    playPauseLabel.text('⏸');
  }

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
