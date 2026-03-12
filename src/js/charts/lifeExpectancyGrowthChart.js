// Merged into renderDumbbellChart (overview + drill-down). This file is kept for reference.
async function renderLifeExpectancyGrowthChart(selector = "#chart-3-1") {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html("");

  // Load CSV data
  const raw = await d3.csv("/datasets/clean/life_expectancy.csv", d3.autoType);

  // Keep only year 2000 and 2023
  const data2000 = new Map();
  const data2023 = new Map();
  raw.forEach(d => {
    if (d.Year === 2000) data2000.set(d.Entity, d);
    if (d.Year === 2023) data2023.set(d.Entity, d);
  });

  // Aggregate mean life expectancy by continent for 2000 and 2023
  const continentData2000 = d3.rollup(
    Array.from(data2000.values()).filter(d => d.Continent),
    v => d3.mean(v, d => +d["Life expectancy"]),
    d => d.Continent
  );

  const continentData2023 = d3.rollup(
    Array.from(data2023.values()).filter(d => d.Continent),
    v => d3.mean(v, d => +d["Life expectancy"]),
    d => d.Continent
  );

  // Build dumbbell data: { continent, start (2000), end (2023), diff }
  const allRows = [];
  continentData2023.forEach((val2023, continent) => {
    const val2000 = continentData2000.get(continent);
    if (val2000) {
      allRows.push({
        continent,
        start: val2000,
        end: val2023,
        diff: val2023 - val2000,
      });
    }
  });

  // Sort by end value
  allRows.sort((a, b) => d3.ascending(a.end, b.end));

  const continentColor = {
    "Africa": "#c0392b",
    "Asia": "#2980b9",
    "Europe": "#27ae60",
    "North America": "#8e44ad",
    "South America": "#d35400",
    "Oceania": "#16a085",
  };

  container.style("font-family", "inherit");

  const wrapper = container.append("div")
    .style("width", "100%")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("gap", "0");

  const margin = { left: 160, right: 40 };
  const totalWidth = Math.max(540, container.node().offsetWidth || 700);
  const W = totalWidth - margin.left - margin.right;
  const rowH = 52;
  const bodyH = allRows.length * rowH;
  const xAxisH = 48;

  const xMin = Math.floor(d3.min(allRows, d => d.start) / 5) * 5 - 2;
  const xMax = Math.ceil(d3.max(allRows, d => d.end) / 5) * 5 + 2;
  const x = d3.scaleLinear().domain([xMin, xMax]).range([0, W]);
  const y = d3.scaleBand()
    .domain(allRows.map(d => d.continent))
    .range([0, bodyH])
    .padding(0.4);

  // ── Tooltip ───────────────────────────────────────────────────────────────
  d3.select("body").selectAll(".tooltip-life-growth").remove();
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip-life-growth")
    .style("position", "absolute")
    .style("background", "rgba(0,0,0,0.9)")
    .style("color", "#fff")
    .style("border-radius", "6px")
    .style("padding", "10px 14px")
    .style("pointer-events", "none")
    .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
    .style("font-size", "12px")
    .style("line-height", "1.6")
    .style("z-index", "10000")
    .style("display", "none");

  function showTooltip(event, html) {
    tooltip.style("display", "block").html(html);
    const rect = tooltip.node().getBoundingClientRect();
    let tx = event.pageX + 12, ty = event.pageY + 8;
    if (tx + rect.width > window.innerWidth - 8) tx = event.pageX - rect.width - 12;
    if (ty + rect.height > window.innerHeight - 8) ty = event.pageY - rect.height - 8;
    tooltip.style("left", `${tx}px`).style("top", `${ty}px`);
  }

  function hideTooltip() {
    tooltip.style("display", "none");
  }

  // ── Body SVG ──────────────────────────────────────────────────────────────
  const svgBody = wrapper.append("svg")
    .attr("width", totalWidth)
    .attr("height", bodyH)
    .style("width", "100%")
    .style("display", "block")
    .style("font-family", "inherit");

  const g = svgBody.append("g").attr("transform", `translate(${margin.left},0)`);

  // Vertical grid lines
  g.append("g")
    .call(d3.axisBottom(x).ticks(8).tickSize(bodyH).tickFormat(""))
    .call(gg => gg.select(".domain").remove())
    .call(gg => gg.selectAll("line")
      .attr("stroke", "#e8e8e8")
      .attr("stroke-dasharray", "3,3"));

  // Dumbbell lines
  g.selectAll(".db-line")
    .data(allRows)
    .join("line")
    .attr("class", "db-line")
    .attr("x1", d => x(d.start))
    .attr("x2", d => x(d.end))
    .attr("y1", d => y(d.continent) + y.bandwidth() / 2)
    .attr("y2", d => y(d.continent) + y.bandwidth() / 2)
    .attr("stroke", d => continentColor[d.continent] || "#555")
    .attr("stroke-width", 2.5)
    .attr("opacity", 0.55);

  // Dot 2000 (small, lighter)
  g.selectAll(".db-dot-start")
    .data(allRows)
    .join("circle")
    .attr("class", "db-dot-start")
    .attr("cx", d => x(d.start))
    .attr("cy", d => y(d.continent) + y.bandwidth() / 2)
    .attr("r", 5)
    .attr("fill", d => continentColor[d.continent] || "#555")
    .attr("opacity", 0.45)
    .style("cursor", "pointer")
    .on("mousemove", (event, d) => {
      const color = continentColor[d.continent] || "#555";
      showTooltip(event,
        `<div style="font-weight:700;color:${color};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.continent}</div>` +
        `<span style="color:#aaa">2000 (media):</span> ${d.start.toFixed(2)} anni<br/>` +
        `<span style="color:#aaa">2023 (media):</span> ${d.end.toFixed(2)} anni<br/>` +
        `<span style="color:#aaa">Variazione:</span> +${d.diff.toFixed(2)} anni`
      );
    })
    .on("mouseleave", hideTooltip);

  // Dot 2023 (large, solid)
  g.selectAll(".db-dot-end")
    .data(allRows)
    .join("circle")
    .attr("class", "db-dot-end")
    .attr("cx", d => x(d.end))
    .attr("cy", d => y(d.continent) + y.bandwidth() / 2)
    .attr("r", 8)
    .attr("fill", d => continentColor[d.continent] || "#555")
    .attr("opacity", 1)
    .style("cursor", "pointer")
    .on("mousemove", (event, d) => {
      const color = continentColor[d.continent] || "#555";
      showTooltip(event,
        `<div style="font-weight:700;color:${color};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.continent}</div>` +
        `<span style="color:#aaa">2000 (media):</span> ${d.start.toFixed(2)} anni<br/>` +
        `<span style="color:#aaa">2023 (media):</span> ${d.end.toFixed(2)} anni<br/>` +
        `<span style="color:#aaa">Variazione:</span> +${d.diff.toFixed(2)} anni`
      );
    })
    .on("mouseleave", hideTooltip);

  // Y axis — continent names on the left
  svgBody.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(0).tickPadding(8))
    .call(gg => gg.select(".domain").remove())
    .call(gg => gg.selectAll("text")
      .attr("font-size", "12px")
      .attr("fill", "#333")
      .attr("font-weight", "500"));

  // ── X axis — always visible below body ───────────────────────────────────
  const xAxisBar = wrapper.append("div")
    .style("border-top", "1px solid #e8e8e8")
    .style("width", "100%");

  const svgX = xAxisBar.append("svg")
    .attr("width", totalWidth)
    .attr("height", xAxisH)
    .style("width", "100%")
    .style("display", "block")
    .style("font-family", "inherit");

  svgX.append("g")
    .attr("transform", `translate(${margin.left},8)`)
    .call(d3.axisBottom(x).ticks(8))
    .call(gg => gg.select(".domain").attr("stroke", "#ccc"))
    .call(gg => gg.selectAll("text").attr("font-size", "11px").attr("fill", "#555"))
    .call(gg => gg.selectAll(".tick line").attr("stroke", "#ccc"));

  svgX.append("text")
    .attr("x", margin.left + W / 2)
    .attr("y", xAxisH - 4)
    .attr("text-anchor", "middle")
    .attr("fill", "#888")
    .style("font-size", "11px")
    .text("Life Expectancy (anni)");
}
