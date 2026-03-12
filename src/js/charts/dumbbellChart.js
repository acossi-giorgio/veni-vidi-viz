async function renderDumbbellChart(selector = "#chart-2-1") {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html("");

  const raw = await d3.csv("/datasets/clean/life_expectancy.csv", d3.autoType);

  const data2000 = new Map();
  const data2023 = new Map();
  raw.forEach(d => {
    if (d.Year === 2000) data2000.set(d.Entity, d);
    if (d.Year === 2023) data2023.set(d.Entity, d);
  });

  // Per-country rows
  const countryRows = [];
  data2023.forEach((d23, country) => {
    const d00 = data2000.get(country);
    if (!d00 || !d23.Continent) return;
    countryRows.push({
      country,
      continent: d23.Continent,
      start: +d00["Life expectancy"],
      end: +d23["Life expectancy"],
      diff: +d23["Life expectancy"] - +d00["Life expectancy"],
    });
  });

  // Continent aggregate rows (mean of all countries)
  const contData2000 = d3.rollup(
    Array.from(data2000.values()).filter(d => d.Continent),
    v => d3.mean(v, d => +d["Life expectancy"]),
    d => d.Continent
  );
  const contData2023 = d3.rollup(
    Array.from(data2023.values()).filter(d => d.Continent),
    v => d3.mean(v, d => +d["Life expectancy"]),
    d => d.Continent
  );
  const continentRows = [];
  contData2023.forEach((val2023, continent) => {
    const val2000 = contData2000.get(continent);
    if (val2000) continentRows.push({ continent, start: val2000, end: val2023, diff: val2023 - val2000 });
  });
  continentRows.sort((a, b) => d3.ascending(a.end, b.end));

  const continents = [...new Set(countryRows.map(d => d.continent))].sort();
  const continentColor = {
    "Africa":        "#c0392b",
    "Asia":          "#2980b9",
    "Europe":        "#27ae60",
    "North America": "#8e44ad",
    "South America": "#d35400",
    "Oceania":       "#16a085",
  };

  container.style("font-family", "inherit");

  // ── Shared tooltip ───────────────────────────────────────────────────────
  d3.select("body").selectAll(".tooltip-dumbbell").remove();
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip-dumbbell")
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
  function hideTooltip() { tooltip.style("display", "none"); }

  // ── Main view container (swapped between overview and drill-down) ────────
  const view = container.append("div").style("width", "100%");

  // ═══════════════════════════════════════════════════════════════════════
  // OVERVIEW — continent-level aggregated dumbbell
  // ═══════════════════════════════════════════════════════════════════════
  function renderOverview() {
    view.html("");

    const margin = { left: 160, right: 40 };
    const totalWidth = Math.max(540, container.node().offsetWidth || 700);
    const W = totalWidth - margin.left - margin.right;
    const rowH = 52;
    const bodyH = continentRows.length * rowH;
    const xAxisH = 48;

    const xMin = Math.floor(d3.min(continentRows, d => d.start) / 5) * 5 - 2;
    const xMax = Math.ceil(d3.max(continentRows, d => d.end) / 5) * 5 + 2;
    const x = d3.scaleLinear().domain([xMin, xMax]).range([0, W]);
    const y = d3.scaleBand()
      .domain(continentRows.map(d => d.continent))
      .range([0, bodyH])
      .padding(0.4);

    // Hint label
    view.append("div")
      .style("font-size", "12px")
      .style("color", "#888")
      .style("margin-bottom", "6px")
      .style("padding-left", `${margin.left}px`)
      .text("← Clicca su un continente per esplorare i paesi");

    const svgBody = view.append("svg")
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
      .call(gg => gg.selectAll("line").attr("stroke", "#e8e8e8").attr("stroke-dasharray", "3,3"));

    // Dumbbell lines
    g.selectAll(".db-line")
      .data(continentRows)
      .join("line")
      .attr("class", "db-line")
      .attr("x1", d => x(d.start))
      .attr("x2", d => x(d.end))
      .attr("y1", d => y(d.continent) + y.bandwidth() / 2)
      .attr("y2", d => y(d.continent) + y.bandwidth() / 2)
      .attr("stroke", d => continentColor[d.continent] || "#555")
      .attr("stroke-width", 2.5)
      .attr("opacity", 0.55);

    // Dot 2000 (small)
    g.selectAll(".db-dot-start")
      .data(continentRows)
      .join("circle")
      .attr("class", "db-dot-start")
      .attr("cx", d => x(d.start))
      .attr("cy", d => y(d.continent) + y.bandwidth() / 2)
      .attr("r", 5)
      .attr("fill", d => continentColor[d.continent] || "#555")
      .attr("opacity", 0.45)
      .style("cursor", "pointer")
      .on("mousemove", (event, d) => {
        const c = continentColor[d.continent] || "#555";
        showTooltip(event,
          `<div style="font-weight:700;color:${c};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.continent}</div>` +
          `<span style="color:#aaa">2000 (media):</span> ${d.start.toFixed(2)} anni<br/>` +
          `<span style="color:#aaa">2023 (media):</span> ${d.end.toFixed(2)} anni<br/>` +
          `<span style="color:#aaa">Variazione:</span> +${d.diff.toFixed(2)} anni<br/>` +
          `<span style="color:#aaa;font-style:italic">Clicca per esplorare i paesi</span>`
        );
      })
      .on("mouseleave", hideTooltip)
      .on("click", (event, d) => renderDrillDown(d.continent));

    // Dot 2023 (large)
    g.selectAll(".db-dot-end")
      .data(continentRows)
      .join("circle")
      .attr("class", "db-dot-end")
      .attr("cx", d => x(d.end))
      .attr("cy", d => y(d.continent) + y.bandwidth() / 2)
      .attr("r", 8)
      .attr("fill", d => continentColor[d.continent] || "#555")
      .attr("opacity", 1)
      .style("cursor", "pointer")
      .on("mousemove", (event, d) => {
        const c = continentColor[d.continent] || "#555";
        showTooltip(event,
          `<div style="font-weight:700;color:${c};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.continent}</div>` +
          `<span style="color:#aaa">2000 (media):</span> ${d.start.toFixed(2)} anni<br/>` +
          `<span style="color:#aaa">2023 (media):</span> ${d.end.toFixed(2)} anni<br/>` +
          `<span style="color:#aaa">Variazione:</span> +${d.diff.toFixed(2)} anni<br/>` +
          `<span style="color:#aaa;font-style:italic">Clicca per esplorare i paesi</span>`
        );
      })
      .on("mouseleave", hideTooltip)
      .on("click", (event, d) => renderDrillDown(d.continent));

    // Invisible hover band covering the full row (easier click target)
    g.selectAll(".db-hover-band")
      .data(continentRows)
      .join("rect")
      .attr("class", "db-hover-band")
      .attr("x", 0)
      .attr("y", d => y(d.continent))
      .attr("width", W)
      .attr("height", y.bandwidth())
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mousemove", (event, d) => {
        const c = continentColor[d.continent] || "#555";
        showTooltip(event,
          `<div style="font-weight:700;color:${c};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.continent}</div>` +
          `<span style="color:#aaa">2000 (media):</span> ${d.start.toFixed(2)} anni<br/>` +
          `<span style="color:#aaa">2023 (media):</span> ${d.end.toFixed(2)} anni<br/>` +
          `<span style="color:#aaa">Variazione:</span> +${d.diff.toFixed(2)} anni<br/>` +
          `<span style="color:#aaa;font-style:italic">Clicca per esplorare i paesi</span>`
        );
      })
      .on("mouseleave", hideTooltip)
      .on("click", (event, d) => renderDrillDown(d.continent));

    // Y axis
    svgBody.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickSize(0).tickPadding(8))
      .call(gg => gg.select(".domain").remove())
      .call(gg => gg.selectAll("text")
        .attr("font-size", "12px")
        .attr("font-weight", "500")
        .attr("fill", "#333")
        .style("cursor", "pointer"))
      .selectAll("text")
      .on("click", (event, d) => renderDrillDown(d));

    // X axis below
    const xAxisBar = view.append("div").style("border-top", "1px solid #e8e8e8");
    const svgX = xAxisBar.append("svg")
      .attr("width", totalWidth).attr("height", xAxisH)
      .style("width", "100%").style("display", "block").style("font-family", "inherit");
    svgX.append("g")
      .attr("transform", `translate(${margin.left},8)`)
      .call(d3.axisBottom(x).ticks(8))
      .call(gg => gg.select(".domain").attr("stroke", "#ccc"))
      .call(gg => gg.selectAll("text").attr("font-size", "11px").attr("fill", "#555"))
      .call(gg => gg.selectAll(".tick line").attr("stroke", "#ccc"));
    svgX.append("text")
      .attr("x", margin.left + W / 2).attr("y", xAxisH - 4)
      .attr("text-anchor", "middle").attr("fill", "#888").style("font-size", "11px")
      .text("Life Expectancy (anni)");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DRILL-DOWN — per-country dumbbell for a selected continent
  // ═══════════════════════════════════════════════════════════════════════
  function renderDrillDown(continent) {
    view.html("");
    hideTooltip();

    const color = continentColor[continent] || "#555";

    // Back button
    const backBtn = view.append("button")
      .style("display", "inline-flex")
      .style("align-items", "center")
      .style("gap", "6px")
      .style("margin-bottom", "10px")
      .style("padding", "6px 14px")
      .style("background", "#f5f5f5")
      .style("border", "1px solid #ddd")
      .style("border-radius", "6px")
      .style("font-size", "13px")
      .style("font-weight", "600")
      .style("color", "#333")
      .style("cursor", "pointer")
      .html("&#8592; Tutti i continenti")
      .on("click", () => renderOverview())
      .on("mouseover", function() { d3.select(this).style("background", "#e8e8e8"); })
      .on("mouseout",  function() { d3.select(this).style("background", "#f5f5f5"); });

    const rows = countryRows
      .filter(d => d.continent === continent)
      .sort((a, b) => d3.ascending(a.end, b.end));

    const margin = { left: 160, right: 40 };
    const totalWidth = Math.max(540, container.node().offsetWidth || 700);
    const W = totalWidth - margin.left - margin.right;
    const rowH = 22;
    const bodyH = Math.max(200, rows.length * rowH);
    const xAxisH = 48;

    const xMin = Math.floor(d3.min(rows, d => d.start) / 5) * 5 - 2;
    const xMax = Math.ceil(d3.max(rows, d => d.end) / 5) * 5 + 2;
    const x = d3.scaleLinear().domain([xMin, xMax]).range([0, W]);
    const y = d3.scaleBand()
      .domain(rows.map(d => d.country))
      .range([0, bodyH])
      .padding(0.35);

    // Continent name header
    view.append("div")
      .style("font-size", "13px")
      .style("font-weight", "700")
      .style("color", color)
      .style("margin-bottom", "4px")
      .style("padding-left", `${margin.left}px`)
      .text(`${continent} — 2000 (piccolo) → 2023 (grande)`);

    // Scrollable rows
    const scrollBody = view.append("div")
      .style("overflow-y", "auto")
      .style("overflow-x", "hidden")
      .style("max-height", "460px");

    const svgBody = scrollBody.append("svg")
      .attr("width", totalWidth).attr("height", bodyH)
      .style("width", "100%").style("display", "block").style("font-family", "inherit");

    const g = svgBody.append("g").attr("transform", `translate(${margin.left},0)`);

    g.append("g")
      .call(d3.axisBottom(x).ticks(8).tickSize(bodyH).tickFormat(""))
      .call(gg => gg.select(".domain").remove())
      .call(gg => gg.selectAll("line").attr("stroke", "#e8e8e8").attr("stroke-dasharray", "3,3"));

    g.selectAll(".db-line")
      .data(rows).join("line").attr("class", "db-line")
      .attr("x1", d => x(d.start)).attr("x2", d => x(d.end))
      .attr("y1", d => y(d.country) + y.bandwidth() / 2)
      .attr("y2", d => y(d.country) + y.bandwidth() / 2)
      .attr("stroke", color).attr("stroke-width", 2).attr("opacity", 0.55);

    g.selectAll(".db-dot-start")
      .data(rows).join("circle").attr("class", "db-dot-start")
      .attr("cx", d => x(d.start)).attr("cy", d => y(d.country) + y.bandwidth() / 2)
      .attr("r", 4).attr("fill", color).attr("opacity", 0.45).style("cursor", "pointer")
      .on("mousemove", (event, d) => showTooltip(event,
        `<div style="font-weight:700;color:${color};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.country}</div>` +
        `<span style="color:#aaa">2000:</span> ${d.start.toFixed(1)} anni<br/>` +
        `<span style="color:#aaa">2023:</span> ${d.end.toFixed(1)} anni<br/>` +
        `<span style="color:#aaa">Variazione:</span> +${d.diff.toFixed(1)} anni`
      ))
      .on("mouseleave", hideTooltip);

    g.selectAll(".db-dot-end")
      .data(rows).join("circle").attr("class", "db-dot-end")
      .attr("cx", d => x(d.end)).attr("cy", d => y(d.country) + y.bandwidth() / 2)
      .attr("r", 6).attr("fill", color).attr("opacity", 1).style("cursor", "pointer")
      .on("mousemove", (event, d) => showTooltip(event,
        `<div style="font-weight:700;color:${color};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.country}</div>` +
        `<span style="color:#aaa">2000:</span> ${d.start.toFixed(1)} anni<br/>` +
        `<span style="color:#aaa">2023:</span> ${d.end.toFixed(1)} anni<br/>` +
        `<span style="color:#aaa">Variazione:</span> +${d.diff.toFixed(1)} anni`
      ))
      .on("mouseleave", hideTooltip);

    svgBody.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickSize(0).tickPadding(8))
      .call(gg => gg.select(".domain").remove())
      .call(gg => gg.selectAll("text")
        .attr("font-size", "11px").attr("fill", "#333")
        .each(function(d) { if (d.length > 22) d3.select(this).text(d.slice(0, 21) + "…"); }));

    // Fixed X axis below scroll
    const xAxisBar = view.append("div").style("border-top", "1px solid #e8e8e8");
    const svgX = xAxisBar.append("svg")
      .attr("width", totalWidth).attr("height", xAxisH)
      .style("width", "100%").style("display", "block").style("font-family", "inherit");
    svgX.append("g")
      .attr("transform", `translate(${margin.left},8)`)
      .call(d3.axisBottom(x).ticks(8))
      .call(gg => gg.select(".domain").attr("stroke", "#ccc"))
      .call(gg => gg.selectAll("text").attr("font-size", "11px").attr("fill", "#555"))
      .call(gg => gg.selectAll(".tick line").attr("stroke", "#ccc"));
    svgX.append("text")
      .attr("x", margin.left + W / 2).attr("y", xAxisH - 4)
      .attr("text-anchor", "middle").attr("fill", "#888").style("font-size", "11px")
      .text("Life Expectancy (anni)");
  }

  // Start with the overview
  renderOverview();
}

