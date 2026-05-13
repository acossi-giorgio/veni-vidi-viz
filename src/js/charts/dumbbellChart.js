async function renderDumbbellChart(selector = "#chart-2-1", isFullscreen = false) {
  const container = d3.select(selector);
  if (container.empty()) return;

  // Clear previous content but retain the container structure if needed
  container.html("");

  // In fullscreen, we want the container to fill the modal content area
  if (isFullscreen) {
    container
      .style("width", "100%")
      .style("height", "100%")
      .style("display", "flex") // Use flex for fullscreen too (better control)
      .style("flex-direction", "column")
      .style("overflow", "hidden") // Keep container static, scroll inside
      .style("position", "relative");
  } else {
      // Reset styles for normal mode, and ensure strict flex layout
      container
      .style("width", "100%")
      .style("height", "100%")
      .style("display", "block") 
      .style("overflow", "hidden")
      .style("position", "relative");
  }

  const raw = await d3.csv("datasets/processed/03_life_expectancy.csv", d3.autoType);

  // Processed file is already wide: iso3, country, continent, year_2000, year_2023, delta
  const countryRows = raw
    .filter(d => d.continent && d.year_2000 != null && d.year_2023 != null)
    .map(d => ({
      country:   d.country,
      continent: d.continent,
      start:     +d.year_2000,
      end:       +d.year_2023,
      diff:      +d.delta,
    }));

  // Continent aggregate rows (mean of countries)
  const contGroups = d3.group(countryRows, d => d.continent);
  const continentRows = Array.from(contGroups, ([continent, rows]) => ({
    continent,
    start: d3.mean(rows, r => r.start),
    end:   d3.mean(rows, r => r.end),
    diff:  d3.mean(rows, r => r.diff),
  })).sort((a, b) => d3.ascending(a.end, b.end));

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
  const view = container.append("div")
    .style("width", "100%")
    .style("max-width", "100%");

  // ═══════════════════════════════════════════════════════════════════════
  // OVERVIEW — continent-level aggregated dumbbell
  // ═══════════════════════════════════════════════════════════════════════
  function renderOverview() {
    view.html("");
    
    // Reset view styles and ensure full height flex column
    view.attr("style", "")
        .style("width", "100%")
        .style("height", "100%")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("overflow", "hidden");

    const margin = { left: 160, right: 40 };
    const containerWidth = container.node().getBoundingClientRect().width;
    const totalWidth = containerWidth > 0 ? containerWidth : (isFullscreen ? window.innerWidth * 0.8 : 700);
    const W = totalWidth - margin.left - margin.right;
    const rowH = 52;
    const bodyH = continentRows.length * rowH; // Fixed height for overview is fine as it's short
    const xAxisH = 48;

    const xMin = Math.floor(d3.min(continentRows, d => d.start) / 5) * 5 - 2;
    const xMax = Math.ceil(d3.max(continentRows, d => d.end) / 5) * 5 + 2;
    const x = d3.scaleLinear().domain([xMin, xMax]).range([0, W]);
    const y = d3.scaleBand()
      .domain(continentRows.map(d => d.continent))
      .range([0, bodyH])
      .padding(0.4);

    // ── Header Section ─────────────────────────────────────────────────────
    const headerDiv = view.append("div")
      .style("flex", "0 0 auto")
      .style("z-index", "10");

    // Hint label
    headerDiv.append("div")
      .style("font-size", "12px")
      .style("color", "#888")
      .style("margin-bottom", "6px")
      .style("padding-left", `${margin.left}px`)
      .text("← Clicca su un continente per esplorare i paesi");

    // ── Scrollable Body (Flexible) ─────────────────────────────────────────
    const scrollBody = view.append("div")
      .style("flex", "1 1 auto")
      .style("overflow-y", "auto")
      .style("overflow-x", "hidden")
      .style("position", "relative")
      .style("display", "flex") // Enable flex layout for centering
      .style("flex-direction", "column");

    const svgBody = scrollBody.append("svg")
      .attr("width", totalWidth)
      .attr("height", bodyH)
      .style("width", "100%")
      .style("display", "block")
      .style("font-family", "inherit")
      .style("margin", "auto"); // Safe centering

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

    // ── Footer Section (Fixed X-Axis) ──────────────────────────────────────
    const footerDiv = view.append("div")
      .style("flex", "0 0 auto")
      .style("border-top", "1px solid #e8e8e8")
      .style("background", "#fff")
      .style("z-index", "10");

    const svgX = footerDiv.append("svg")
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
    
    // Reset view styles and ensure full height flex column (internal scroll)
    view.attr("style", "")
        .style("width", "100%")
        .style("height", "100%")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("overflow", "hidden");

    const color = continentColor[continent] || "#555";
    
    // ── Header Section (Fixed) ─────────────────────────────────────────────
    const headerDiv = view.append("div")
      .style("flex", "0 0 auto")
      .style("padding", "10px 0")
      .style("background", "#fff")
      .style("z-index", "10")
      .style("border-bottom", "1px solid #f0f0f0");

    // Container for back button and continent title
    const headerContent = headerDiv.append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("justify-content", "space-between")
      .style("margin-bottom", "6px");

    // Back button
    headerContent.append("button")
      .style("display", "inline-flex")
      .style("align-items", "center")
      .style("gap", "6px")
      .style("padding", "6px 14px")
      .style("background", "#f5f5f5")
      .style("border", "1px solid #ddd")
      .style("border-radius", "6px")
      .style("font-size", "13px")
      .style("font-weight", "600")
      .style("color", "#333")
      .style("cursor", "pointer")
      .html("&#8592; Indietro")
      .on("click", () => renderOverview())
      .on("mouseover", function() { d3.select(this).style("background", "#e8e8e8"); })
      .on("mouseout",  function() { d3.select(this).style("background", "#f5f5f5"); });
      
    // Continent name header
    headerContent.append("span")
      .style("font-size", "14px")
      .style("font-weight", "700")
      .style("color", color)
      .text(continent);

    // ── Pre-calculate scales and dimensions ────────────────────────────────
    const rows = countryRows
      .filter(d => d.continent === continent)
      .sort((a, b) => d3.ascending(a.end, b.end));

    const margin = { left: 160, right: 40 };
    // Get width of parent .chart-box (container.style.width is 100%, so use bounding client rect)
    // IMPORTANT: If clientWidth is small/zero (e.g. during transitions), fallback to a reasonable default
    let containerWidth = container.node().getBoundingClientRect().width;
    
    // Fallback if width is suspicious
    if (!containerWidth || containerWidth < 100) {
        // Try to find the closest chart-box parent's width
        const box = container.node().closest('.chart-box');
        if (box) containerWidth = box.getBoundingClientRect().width;
    }

    const totalWidth = (containerWidth > 200) ? containerWidth : (isFullscreen ? window.innerWidth * 0.9 : 700);
    const W = totalWidth - margin.left - margin.right;
    
    // Ensure W is positive
    const safeW = Math.max(W, 100);
    const rowH = 22; 
    // Calculate full height needed for all rows
    const contentHeight = Math.max(200, rows.length * rowH);

    const xAxisH = 48;

    const xMin = Math.floor(d3.min(rows, d => d.start) / 5) * 5 - 2;
    const xMax = Math.ceil(d3.max(rows, d => d.end) / 5) * 5 + 2;
    // Use safeW instead of W
    const x = d3.scaleLinear().domain([xMin, xMax]).range([0, safeW]);
    const y = d3.scaleBand()
      .domain(rows.map(d => d.country))
      .range([0, contentHeight])
      .padding(0.35);

    // Legend / Explanation
    headerDiv.append("div")
      .style("font-size", "12px")
      .style("color", "#666")
      .style("padding-left", `${margin.left}px`)
      .text("2000 (piccolo) → 2023 (grande)");


    // ── Scrollable Body (must scroll, NOT the SVG) ─────────────────────────────
    const scrollBody = view.append("div")
      .style("flex", "1 1 auto")
      .style("overflow-y", "auto")
      .style("overflow-x", "hidden")
      .style("position", "relative")
      .style("display", "block")
      .style("min-height", "0") // Allow shrinking in flex container
      .style("width", "100%")
      .style("border-bottom", "1px solid #e8e8e8");

    const svgBody = scrollBody.append("svg")
      .attr("width", totalWidth)
      .attr("height", contentHeight)
      .style("width", "100%")
      .style("height", `${contentHeight}px`)
      .style("display", "block")
      .style("font-family", "inherit");

    const g = svgBody.append("g").attr("transform", `translate(${margin.left},0)`);

    // Dotted guide lines (part of scrolling content)
    g.append("g")
      .call(d3.axisBottom(x).ticks(8).tickSize(contentHeight).tickFormat(""))
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

    g.selectAll(".db-hover-band")
      .data(rows)
      .join("rect")
      .attr("class", "db-hover-band")
      .attr("x", 0)
      .attr("y", d => y(d.country))
      .attr("width", safeW)
      .attr("height", y.bandwidth())
      .attr("fill", "transparent")
      .style("cursor", "pointer")
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

    // ── X-Axis Footer (Fixed) ──────────────────────────────────────────────
    const footerDiv = view.append("div")
      .style("flex", "0 0 auto")
      .style("border-top", "1px solid #e8e8e8")
      .style("background", "#fff")
      .style("z-index", "10");

    const svgX = footerDiv.append("svg")
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

  // Expose API on DOM element for narrative card triggers
  const node = container.node();
  node._dumbbellShowOverview = renderOverview;
  node._dumbbellDrillDown = renderDrillDown;
}

