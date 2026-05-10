async function renderGdpMapChart(selector, initialYear = 2023, isFullscreen = false) {
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

  // ISO numeric → ISO alpha-3 lookup (complete ISO 3166-1)
  const numericToAlpha3 = {
    4:'AFG',8:'ALB',12:'DZA',16:'ASM',20:'AND',24:'AGO',28:'ATG',32:'ARG',36:'AUS',40:'AUT',
    31:'AZE',44:'BHS',48:'BHR',50:'BGD',52:'BRB',56:'BEL',60:'BMU',64:'BTN',68:'BOL',
    70:'BIH',72:'BWA',76:'BRA',84:'BLZ',90:'SLB',96:'BRN',100:'BGR',104:'MMR',108:'BDI',
    112:'BLR',116:'KHM',120:'CMR',124:'CAN',132:'CPV',136:'CYM',140:'CAF',144:'LKA',
    148:'TCD',152:'CHL',156:'CHN',158:'TWN',170:'COL',174:'COM',175:'MYT',178:'COG',
    180:'COD',184:'COK',188:'CRI',191:'HRV',192:'CUB',196:'CYP',203:'CZE',204:'BEN',
    208:'DNK',212:'DMA',214:'DOM',218:'ECU',222:'SLV',226:'GNQ',231:'ETH',232:'ERI',
    233:'EST',234:'FRO',238:'FLK',242:'FJI',246:'FIN',250:'FRA',258:'PYF',262:'DJI',
    266:'GAB',268:'GEO',270:'GMB',275:'PSE',276:'DEU',288:'GHA',292:'GIB',296:'KIR',
    300:'GRC',304:'GRL',308:'GRD',312:'GLP',316:'GUM',320:'GTM',324:'GIN',328:'GUY',
    332:'HTI',340:'HND',344:'HKG',348:'HUN',352:'ISL',356:'IND',360:'IDN',364:'IRN',
    368:'IRQ',372:'IRL',376:'ISR',380:'ITA',384:'CIV',388:'JAM',392:'JPN',398:'KAZ',
    400:'JOR',404:'KEN',408:'PRK',410:'KOR',414:'KWT',417:'KGZ',418:'LAO',422:'LBN',
    426:'LSO',428:'LVA',430:'LBR',434:'LBY',438:'LIE',440:'LTU',442:'LUX',446:'MAC',
    450:'MDG',454:'MWI',458:'MYS',462:'MDV',466:'MLI',470:'MLT',474:'MTQ',478:'MRT',
    480:'MUS',484:'MEX',492:'MCO',496:'MNG',498:'MDA',499:'MNE',504:'MAR',508:'MOZ',
    512:'OMN',516:'NAM',524:'NPL',528:'NLD',531:'CUW',533:'ABW',534:'SXM',540:'NCL',
    548:'VUT',551:'ARM',554:'NZL',558:'NIC',562:'NER',566:'NGA',578:'NOR',580:'MNP',
    583:'FSM',584:'MHL',585:'PLW',586:'PAK',591:'PAN',598:'PNG',600:'PRY',604:'PER',
    608:'PHL',616:'POL',620:'PRT',624:'GNB',626:'TLS',630:'PRI',634:'QAT',638:'REU',
    642:'ROU',643:'RUS',646:'RWA',659:'KNA',660:'AIA',662:'LCA',670:'VCT',674:'SMR',
    678:'STP',682:'SAU',686:'SEN',688:'SRB',690:'SYC',694:'SLE',702:'SGP',703:'SVK',
    704:'VNM',705:'SVN',706:'SOM',710:'ZAF',716:'ZWE',724:'ESP',728:'SSD',729:'SDN',
    732:'ESH',740:'SUR',748:'SWZ',752:'SWE',756:'CHE',760:'SYR',762:'TJK',764:'THA',
    768:'TGO',776:'TON',780:'TTO',784:'ARE',788:'TUN',792:'TUR',795:'TKM',798:'TUV',
    800:'UGA',804:'UKR',807:'MKD',818:'EGY',826:'GBR',831:'GGY',832:'JEY',833:'IMN',
    834:'TZA',840:'USA',850:'VIR',854:'BFA',858:'URY',860:'UZB',862:'VEN',882:'WSM',
    887:'YEM',894:'ZMB',51:'ARM',
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
  let minGdp = d3.min(allValues) || 1;
  let maxGdp = d3.max(allValues) || 1000;
  
  // Ensure minGdp is > 0 for logarithmic scale
  minGdp = Math.max(minGdp, 1);
  
  // Cap the maximum at 100k for the gradient scale
  const maxGdpCap = 100000;
  const scaledMaxGdp = Math.min(maxGdp, maxGdpCap);

  const colorScale = d3.scaleLog().domain([minGdp, scaledMaxGdp]).range(['#ffe8e8', '#0066ff']);

  // Generate legend intervals dynamically based on data range (capped at 100k)
  const numIntervals = 7;
  const intervalSize = (scaledMaxGdp - minGdp) / numIntervals;
  const legendData = Array.from({ length: numIntervals }, (_, i) => {
    const start = minGdp + i * intervalSize;
    const end = minGdp + (i + 1) * intervalSize;
    const mid = (start + end) / 2;
    const formatValue = (val) => {
      if (val < 1000) return '$' + Math.round(val);
      return '$' + Math.round(val / 1000) + 'K';
    };
    const startStr = formatValue(start);
    const endStr = formatValue(end);
    return {
      value: i === numIntervals - 1 ? `${startStr}+` : `${startStr}-${endStr}`,
      color: colorScale(mid)
    };
  });

  // Dimensions
  // If in fullscreen, use window dimensions as fallback if clientWidth is 0
  const containerRect = container.getBoundingClientRect();
  const width = containerRect.width || (isFullscreen ? window.innerWidth * 0.9 : 800);
  const height = containerRect.height || (isFullscreen ? window.innerHeight * 0.9 : 600);

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
    // Add viewBox for responsiveness if precise dimensions were missed or change
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('width', '100%')
    .style('height', '100%')
    .style('background', '#f5f5f5')
    .style('cursor', 'grab')
    .style('display', 'block')
    .style('border-radius', '12px');

  // Clip path so map doesn't overflow SVG bounds during zoom
  const clipId = `gdp-map-clip-${isFullscreen ? 'fullscreen' : 'small'}`;
  const defs = svg.append('defs');
  defs.append('clipPath').attr('id', clipId)
    .append('rect').attr('width', width).attr('height', height);

  // Map group – target for zoom transform
  const mapGroup = svg.append('g')
    .attr('class', 'map-group')
    .attr('clip-path', `url(#${clipId})`);

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
      const alpha3 = numericToAlpha3[+d.id] || '';
      const val = (gdpByYear[currentYear] || {})[alpha3] || 0;
      return val > 0 ? colorScale(val) : '#e8e8e8';
    })
    .on('mouseenter', function (event, d) {
      const alpha3 = numericToAlpha3[+d.id] || '';
      if (!alpha3) {
        console.warn('Codice numerico non trovato:', d.id);
      }
      const name = codeToName[alpha3] || 'Unknown';
      if (name === 'Unknown' && alpha3) {
        console.warn(`Codice alpha3 '${alpha3}' non trovato nel dataset`);
      }
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
      const alpha3 = numericToAlpha3[+d.id] || '';
      const name = codeToName[alpha3] || 'Unknown';
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
    .attr('opacity', 0.4)
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
    .attr('opacity', 0.4)
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
    .style('height', '5px')
    .style('background', 'rgba(0,0,0,0.4)')
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

  // Add CSS for slider thumb styling
  if (!document.getElementById('gdp-slider-thumb-style')) {
    const style = document.createElement('style');
    style.id = 'gdp-slider-thumb-style';
    style.textContent = `
      #gdp-map-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #000;
        cursor: pointer;
        transition: background 0.2s;
      }
      #gdp-map-slider::-webkit-slider-thumb:hover {
        background: #000;
      }
      #gdp-map-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #000;
        cursor: pointer;
        border: none;
        transition: background 0.2s;
      }
      #gdp-map-slider::-moz-range-thumb:hover {
        background: #000;
      }
    `;
    document.head.appendChild(style);
  }

  // Legend (TOP of chart, won't zoom) - styled like choroplethMap

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
        const alpha3 = numericToAlpha3[+d.id] || '';
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
