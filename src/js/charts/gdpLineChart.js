async function renderGdpLineChart(selector = "#chart-1-1", isFullscreen = false) {
    const container = d3.select(selector);
    if (container.empty()) return;
    container.html("");

    const boundingBox = container.node().getBoundingClientRect();
    const width = boundingBox.width || (isFullscreen ? window.innerWidth * 0.9 : 700);
    const height = boundingBox.height || (isFullscreen ? window.innerHeight * 0.8 : 400);

    const margin = { top: 30, right: 140, bottom: 50, left: 70 };

    const continentColors = {
        "Africa": "#e07b39",
        "Asia": "#4e9af1",
        "Europe": "#6dbf67",
        "North America": "#c96dd8",
        "South America": "#f1c94e",
        "Oceania": "#e05c5c"
    };

    const continents = Object.keys(continentColors);

    // ── Load data once ──────────────────────────────────────────────────────
    const raw = await d3.csv("/datasets/clean/gdp_per_capita.csv", d3.autoType);

    // Continent aggregates (mean by year)
    const grouped = d3.groups(raw, d => d.Continent)
        .filter(([c]) => continents.includes(c))
        .map(([continent, rows]) => {
            const byYear = d3.rollup(rows, v => d3.mean(v, d => d["GDP_Per_Capita (USD)"]), d => d.Year);
            const values = Array.from(byYear, ([year, gdp]) => ({ year, gdp }))
                .sort((a, b) => a.year - b.year);
            return { continent, values };
        });

    const allYears = [...new Set(raw.map(d => d.Year))].sort(d3.ascending);

    // Per-country data keyed by continent (for drill-down)
    const countriesByContinent = new Map();
    continents.forEach(cont => {
        const cRows = d3.groups(
            raw.filter(d => d.Continent === cont && d["Country Name"]),
            d => d["Country Name"]
        ).map(([country, rows]) => {
            const values = rows
                .map(r => ({ year: r.Year, gdp: r["GDP_Per_Capita (USD)"] }))
                .filter(v => v.gdp != null)
                .sort((a, b) => a.year - b.year);
            return { country, values };
        }).filter(d => d.values.length > 1);
        countriesByContinent.set(cont, cRows);
    });

    // ── Shared tooltip ──────────────────────────────────────────────────────
    d3.select("body").selectAll(".gdp-tooltip").remove();
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "gdp-tooltip")
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

    // ── View div (swapped between overview and drill-down) ──────────────────
    const view = container.append("div")
        .style("width", "100%")
        .style("height", "100%");

    // ── External API: preserved for scrollytelling in main.js ───────────────
    const domContainer = container.node();
    let overviewHighlightFn = null;
    domContainer._gdpHighlightContinents = function(conts) {
        if (overviewHighlightFn) overviewHighlightFn(conts);
    };

    // ═══════════════════════════════════════════════════════════════════════
    // OVERVIEW — continent aggregated line chart
    // ═══════════════════════════════════════════════════════════════════════
    function renderOverview() {
        view.html("");
        hideTooltip();

        let highlightedContinents = null;
        overviewHighlightFn = function(conts) {
            highlightedContinents = conts ? [...conts] : null;
            updateChart();
        };

        const svg = view.append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "100%")
            .style("display", "block")
            .style("font-family", "inherit")
            .style("cursor", "default");

        const x = d3.scaleLinear()
            .domain(d3.extent(allYears))
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(grouped, g => d3.max(g.values, v => v.gdp))])
            .nice()
            .range([height - margin.bottom, margin.top]);

        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(allYears.length > 15 ? 10 : allYears.length))
            .selectAll("text").attr("fill", "#555").style("font-size", "11px");
        svg.select(".x-axis path").attr("stroke", "#ccc");
        svg.selectAll(".x-axis .tick line").attr("stroke", "#ccc");

        svg.append("g")
            .attr("class", "y-axis")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).tickFormat(d => `$${d3.format(",.0f")(d)}`).ticks(6))
            .selectAll("text").attr("fill", "#555").style("font-size", "11px");
        svg.select(".y-axis path").attr("stroke", "#ccc");
        svg.selectAll(".y-axis .tick line").attr("stroke", "#ccc");

        svg.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(6).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
            .selectAll("line").attr("stroke", "#e8e8e8").attr("stroke-dasharray", "3,3");
        svg.select(".grid path").attr("stroke", "none");

        svg.append("text")
            .attr("x", margin.left + (width - margin.left - margin.right) / 2)
            .attr("y", height - 8)
            .attr("text-anchor", "middle").attr("fill", "#888").style("font-size", "11px")
            .text("Year");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -(margin.top + (height - margin.top - margin.bottom) / 2))
            .attr("y", 14)
            .attr("text-anchor", "middle").attr("fill", "#888").style("font-size", "11px")
            .text("GDP per Capita (USD)");

        const line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.gdp))
            .curve(d3.curveMonotoneX);

        const linesGroup  = svg.append("g").attr("class", "lines");
        const pointsGroup = svg.append("g").attr("class", "points");
        const labelsGroup = svg.append("g").attr("class", "labels");

        function isHighlighted(continent) {
            if (highlightedContinents !== null) return highlightedContinents.includes(continent);
            return true;
        }
        function getLineOpacity(c)   { return isHighlighted(c) ? 1 : 0.25; }
        function getLineWidth(c)     { return isHighlighted(c) ? 2 : 1.5; }
        function getPointRadius(c)   { return isHighlighted(c) ? 4 : 2.5; }
        function getPointOpacity(c)  { return isHighlighted(c) ? 0.85 : 0.45; }
        function getLabelSize(c)     { return isHighlighted(c) ? 12 : 10; }
        function getLabelWeight(c)   { return isHighlighted(c) ? "bold" : "normal"; }
        function getLabelColor(c)    { return isHighlighted(c) ? continentColors[c] : "#999"; }
        function getLabelOpacity(c)  { return isHighlighted(c) ? 1 : 0.5; }

        function updateChart() {
            // Lines
            linesGroup.selectAll(".continent-line")
                .data(grouped, d => d.continent)
                .join(
                    enter => enter.append("path")
                        .attr("class", "continent-line")
                        .attr("fill", "none")
                        .attr("stroke", d => continentColors[d.continent])
                        .attr("stroke-width", 1.5)
                        .attr("stroke-linejoin", "round")
                        .attr("stroke-linecap", "round")
                        .attr("d", d => line(d.values))
                        .attr("opacity", d => getLineOpacity(d.continent))
                        .style("cursor", "pointer")
                        .each(function(d) {
                            const len = this.getTotalLength();
                            const delay = continents.indexOf(d.continent) * 100;
                            d3.select(this)
                                .attr("stroke-dasharray", len)
                                .attr("stroke-dashoffset", len)
                                .transition().delay(delay).duration(3000).ease(d3.easeLinear)
                                .attr("stroke-dashoffset", 0)
                                .on("end", function() { d3.select(this).attr("stroke-dasharray", "none"); });
                        })
                        .on("mousemove", function(event, d) {
                            const vals = d.values.map(v => v.gdp);
                            const color = continentColors[d.continent];
                            showTooltip(event,
                                `<div style="font-weight:700;color:${color};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.continent}</div>` +
                                `<span style="color:#aaa">Periodo:</span> ${d.values[0].year}\u2013${d.values[d.values.length - 1].year}<br/>` +
                                `<span style="color:#aaa">Min:</span> $${d3.format(",.0f")(d3.min(vals))}<br/>` +
                                `<span style="color:#aaa">Max:</span> $${d3.format(",.0f")(d3.max(vals))}<br/>` +
                                `<span style="color:#aaa">Media:</span> $${d3.format(",.0f")(d3.mean(vals))}<br/>` +
                                `<span style="color:#aaa;font-style:italic">Clicca per esplorare i paesi</span>`
                            );
                        })
                        .on("mouseleave", () => hideTooltip())
                        .on("click", function(event, d) {
                            event.stopPropagation();
                            renderDrillDown(d.continent);
                        }),
                    update => update
                        .attr("opacity", d => getLineOpacity(d.continent))
                        .attr("stroke-width", d => getLineWidth(d.continent)),
                    exit => exit.remove()
                );

            // Dots
            const allDotsData = grouped.flatMap(g =>
                g.values.map(v => ({ continent: g.continent, year: v.year, gdp: v.gdp }))
            );
            pointsGroup.selectAll(".data-point")
                .data(allDotsData, d => `${d.continent}-${d.year}`)
                .join(
                    enter => enter.append("circle")
                        .attr("class", "data-point")
                        .attr("cx", d => x(d.year))
                        .attr("cy", d => y(d.gdp))
                        .attr("r", d => getPointRadius(d.continent))
                        .attr("fill", d => continentColors[d.continent])
                        .attr("opacity", d => getPointOpacity(d.continent))
                        .style("cursor", "pointer")
                        .on("mouseenter", function(event, d) {
                            d3.select(this).attr("r", 6).attr("opacity", 1);
                            const color = continentColors[d.continent];
                            showTooltip(event,
                                `<div style="font-weight:700;color:${color};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.continent}</div>` +
                                `<span style="color:#aaa">Anno:</span> ${d.year}<br/>` +
                                `<span style="color:#aaa">GDP per Capita:</span> $${d3.format(",.0f")(d.gdp)}`
                            );
                        })
                        .on("mousemove", function(event, d) {
                            const color = continentColors[d.continent];
                            showTooltip(event,
                                `<div style="font-weight:700;color:${color};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.continent}</div>` +
                                `<span style="color:#aaa">Anno:</span> ${d.year}<br/>` +
                                `<span style="color:#aaa">GDP per Capita:</span> $${d3.format(",.0f")(d.gdp)}`
                            );
                        })
                        .on("mouseleave", function(event, d) {
                            d3.select(this).attr("r", getPointRadius(d.continent)).attr("opacity", getPointOpacity(d.continent));
                            hideTooltip();
                        })
                        .on("click", function(event, d) {
                            event.stopPropagation();
                            renderDrillDown(d.continent);
                        }),
                    update => update
                        .attr("r", d => getPointRadius(d.continent))
                        .attr("opacity", d => getPointOpacity(d.continent)),
                    exit => exit.remove()
                );

            // Labels
            const labelData = grouped.map(d => {
                const last = d.values[d.values.length - 1];
                return { continent: d.continent, lx: x(last.year) + 5, ly: y(last.gdp) };
            }).sort((a, b) => a.ly - b.ly);

            const minLabelSpacing = 16;
            for (let i = 1; i < labelData.length; i++) {
                if (labelData[i].ly - labelData[i - 1].ly < minLabelSpacing) {
                    labelData[i].ly = labelData[i - 1].ly + minLabelSpacing;
                }
            }

            labelsGroup.selectAll(".continent-label")
                .data(labelData, d => d.continent)
                .join(
                    enter => enter.append("text")
                        .attr("class", "continent-label")
                        .attr("x", d => d.lx)
                        .attr("y", d => d.ly)
                        .attr("dy", "0.35em")
                        .attr("font-size", d => getLabelSize(d.continent))
                        .attr("font-weight", d => getLabelWeight(d.continent))
                        .attr("fill", d => getLabelColor(d.continent))
                        .attr("opacity", d => getLabelOpacity(d.continent))
                        .text(d => d.continent)
                        .style("cursor", "pointer")
                        .on("mouseover", function(event, d) {
                            showTooltip(event,
                                `<div style="font-weight:700;color:${continentColors[d.continent]};font-style:italic">Clicca per esplorare i paesi di ${d.continent}</div>`
                            );
                        })
                        .on("mouseleave", () => hideTooltip())
                        .on("click", (event, d) => {
                            event.stopPropagation();
                            renderDrillDown(d.continent);
                        }),
                    update => update
                        .attr("font-size", d => getLabelSize(d.continent))
                        .attr("font-weight", d => getLabelWeight(d.continent))
                        .attr("fill", d => getLabelColor(d.continent))
                        .attr("opacity", d => getLabelOpacity(d.continent)),
                    exit => exit.remove()
                );
        }

        // Crosshair overlay
        const hoverLineGroup = svg.append("g").style("pointer-events", "none");
        const hoverLine = hoverLineGroup.append("line")
            .attr("stroke", "#999").attr("stroke-width", 1)
            .attr("stroke-dasharray", "4,3").attr("opacity", 0)
            .attr("y1", margin.top).attr("y2", height - margin.bottom);

        svg.append("rect")
            .attr("x", margin.left).attr("y", margin.top)
            .attr("width", width - margin.left - margin.right)
            .attr("height", height - margin.top - margin.bottom)
            .attr("fill", "none")
            .style("pointer-events", "all")
            .style("cursor", "crosshair")
            .on("mousemove", function(event) {
                const [mx] = d3.pointer(event, svg.node());
                const xVal = x.invert(mx);
                const bisect = d3.bisector(d => d).left;
                let idx = bisect(allYears, xVal);
                if (idx >= allYears.length) idx = allYears.length - 1;
                let year;
                if (idx === 0) year = allYears[0];
                else if (idx >= allYears.length) year = allYears[allYears.length - 1];
                else {
                    const diff1 = Math.abs(xVal - allYears[idx - 1]);
                    const diff2 = Math.abs(xVal - allYears[idx]);
                    year = diff1 < diff2 ? allYears[idx - 1] : allYears[idx];
                }
                const xPos = x(year);
                hoverLine.attr("x1", xPos).attr("x2", xPos).attr("opacity", 0.7);

                const rows = grouped.map(g => {
                    const pt = g.values.find(v => v.year === year);
                    return pt ? { continent: g.continent, gdp: pt.gdp } : null;
                }).filter(Boolean).sort((a, b) => b.gdp - a.gdp);

                const rowsHtml = rows.map(r =>
                    `<div style="display:flex;justify-content:space-between;gap:16px;">` +
                    `<span style="color:${continentColors[r.continent]};font-weight:600;">${r.continent}</span>` +
                    `<span>$${d3.format(",.0f")(r.gdp)}</span></div>`
                ).join("");

                showTooltip(event,
                    `<div style="font-weight:700;text-align:center;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${year}</div>` +
                    rowsHtml
                );
            })
            .on("mouseleave", function() {
                hoverLine.attr("opacity", 0);
                hideTooltip();
            });

        updateChart();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DRILL-DOWN — per-country GDP lines for selected continent
    // ═══════════════════════════════════════════════════════════════════════
    function renderDrillDown(continent) {
        view.html("");
        hideTooltip();
        overviewHighlightFn = null;
        // Clean up any document listener left from a previous drill-down
        d3.select(document).on("click.gdp-drilldown", null);

        const color = continentColors[continent];
        const countryData = countriesByContinent.get(continent) || [];

        // State: all countries selected by default
        const selectedSet = new Set(countryData.map(d => d.country));

        // ── Scales (base = never mutated, live = rescaled by zoom) ───────
        const xBase = d3.scaleLinear()
            .domain(d3.extent(allYears))
            .range([margin.left, width - margin.right]);
        const yMax = d3.max(countryData, c => d3.max(c.values, v => v.gdp)) || 1;
        const yBase = d3.scaleLinear()
            .domain([0, yMax]).nice()
            .range([height - margin.bottom, margin.top]);
        let x = xBase.copy();
        let y = yBase.copy();

        const lineFn = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.gdp))
            .defined(d => d.gdp != null)
            .curve(d3.curveMonotoneX);

        // ── Top bar ──────────────────────────────────────────────────────
        const topBar = view.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "8px")
            .style("margin-bottom", "4px")
            .style("flex-wrap", "nowrap");

        // Back button
        topBar.append("button")
            .style("display", "inline-flex")
            .style("align-items", "center")
            .style("padding", "4px 10px")
            .style("background", "#f5f5f5")
            .style("border", "1px solid #ddd")
            .style("border-radius", "6px")
            .style("font-size", "12px")
            .style("font-weight", "600")
            .style("color", "#333")
            .style("cursor", "pointer")
            .style("white-space", "nowrap")
            .style("flex-shrink", "0")
            .html("&#8592; Tutti i continenti")
            .on("click", () => { d3.select(document).on("click.gdp-drilldown", null); renderOverview(); })
            .on("mouseover", function() { d3.select(this).style("background", "#e8e8e8"); })
            .on("mouseout",  function() { d3.select(this).style("background", "#f5f5f5"); });

        // Searchable country dropdown
        const searchWrap = topBar.append("div")
            .style("position", "relative")
            .style("flex", "1");

        const searchInput = searchWrap.append("input")
            .attr("type", "text")
            .style("width", "100%")
            .style("padding", "4px 10px")
            .style("border", "1px solid #ccc")
            .style("border-radius", "6px")
            .style("font-size", "12px")
            .style("font-family", "inherit")
            .style("background", "#fff")
            .style("box-sizing", "border-box")
            .style("cursor", "text");

        const dropPanel = searchWrap.append("div")
            .style("position", "absolute")
            .style("top", "105%")
            .style("left", "0")
            .style("right", "0")
            .style("min-width", "200px")
            .style("background", "#fff")
            .style("border", "1px solid #ccc")
            .style("border-radius", "6px")
            .style("box-shadow", "0 4px 16px rgba(0,0,0,0.15)")
            .style("z-index", "9999")
            .style("max-height", "200px")
            .style("overflow-y", "auto")
            .style("display", "none")
            .style("font-size", "12px");

        // Dropdown sticky header: select all / none
        const dropHeader = dropPanel.append("div")
            .style("display", "flex")
            .style("gap", "4px")
            .style("padding", "5px 8px")
            .style("border-bottom", "1px solid #eee")
            .style("background", "#f9f9f9")
            .style("position", "sticky")
            .style("top", "0")
            .style("z-index", "1");

        dropHeader.append("button")
            .text("Tutti")
            .style("flex", "1").style("padding", "2px 6px").style("font-size", "11px")
            .style("border", "1px solid #ccc").style("border-radius", "4px")
            .style("cursor", "pointer").style("background", "#fff")
            .on("click", function(event) {
                event.stopPropagation();
                countryData.forEach(d => selectedSet.add(d.country));
                refreshAll();
            });

        dropHeader.append("button")
            .text("Nessuno")
            .style("flex", "1").style("padding", "2px 6px").style("font-size", "11px")
            .style("border", "1px solid #ccc").style("border-radius", "4px")
            .style("cursor", "pointer").style("background", "#fff")
            .on("click", function(event) {
                event.stopPropagation();
                selectedSet.clear();
                refreshAll();
            });

        const dropItems = dropPanel.append("div");

        function renderDropItems(filter) {
            dropItems.html("");
            const q = (filter || "").toLowerCase();
            countryData
                .filter(d => !q || d.country.toLowerCase().includes(q))
                .forEach(d => {
                    const row = dropItems.append("label")
                        .style("display", "flex")
                        .style("align-items", "center")
                        .style("gap", "7px")
                        .style("padding", "4px 10px")
                        .style("cursor", "pointer")
                        .style("background", selectedSet.has(d.country) ? "rgba(20,97,169,0.06)" : "#fff")
                        .on("mouseover", function() { d3.select(this).style("background", "#f0f4ff"); })
                        .on("mouseout",  function() { d3.select(this).style("background", selectedSet.has(d.country) ? "rgba(20,97,169,0.06)" : "#fff"); });
                    row.append("input").attr("type", "checkbox")
                        .property("checked", selectedSet.has(d.country))
                        .on("change", function(event) {
                            event.stopPropagation();
                            if (this.checked) selectedSet.add(d.country);
                            else selectedSet.delete(d.country);
                            updateChart();
                            updatePlaceholder();
                        });
                    row.append("span").text(d.country);
                });
        }

        function updatePlaceholder() {
            const sel = selectedSet.size;
            const tot = countryData.length;
            searchInput.attr("placeholder", sel === tot
                ? `\uD83D\uDD0D Cerca paese\u2026 (tutti i ${tot})`
                : `\uD83D\uDD0D Cerca paese\u2026 (${sel}\u200A/\u200A${tot})`);
            if (document.activeElement !== searchInput.node()) {
                searchInput.property("value", "");
            }
        }

        function refreshAll() {
            updateChart();
            renderDropItems(searchInput.property("value"));
            updatePlaceholder();
        }

        searchInput
            .on("focus", function() {
                dropPanel.style("display", "block");
                renderDropItems(this.value);
            })
            .on("input", function() { renderDropItems(this.value); })
            .on("keydown", function(event) {
                if (event.key === "Escape") { dropPanel.style("display", "none"); this.blur(); }
            });

        d3.select(document).on("click.gdp-drilldown", function(event) {
            if (!searchWrap.node().contains(event.target)) {
                dropPanel.style("display", "none");
                updatePlaceholder();
            }
        });

        updatePlaceholder();

        // ── SVG ──────────────────────────────────────────────────────────
        const svg = view.append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "auto")
            .style("display", "block")
            .style("font-family", "inherit");

        // Clip path for plot area
        const clipId = `clip-dd-${continent.replace(/\s/g, "")}-${Date.now()}`;
        svg.append("defs").append("clipPath").attr("id", clipId)
            .append("rect")
            .attr("x", margin.left).attr("y", margin.top)
            .attr("width", width - margin.left - margin.right)
            .attr("height", height - margin.top - margin.bottom);

        // Continent title
        svg.append("text")
            .attr("x", margin.left).attr("y", 16)
            .attr("font-size", "13px").attr("font-weight", "700").attr("fill", color)
            .text(`${continent} \u2014 GDP per Capita per Paese`);

        // Zoom hint
        svg.append("text")
            .attr("x", width - 4).attr("y", 10)
            .attr("text-anchor", "end").attr("font-size", "8px").attr("fill", "#bbb")
            .text("scroll=zoom \u00B7 drag=pan \u00B7 dbl.click=reset");

        // Axes
        const xAxisG = svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height - margin.bottom})`);
        const yAxisG = svg.append("g").attr("class", "y-axis").attr("transform", `translate(${margin.left},0)`);
        const gridG  = svg.append("g").attr("class", "grid").attr("transform", `translate(${margin.left},0)`);

        function redrawAxes() {
            xAxisG.call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(8))
                .selectAll("text").attr("fill", "#555").style("font-size", "11px");
            xAxisG.select("path").attr("stroke", "#ccc");
            xAxisG.selectAll(".tick line").attr("stroke", "#ccc");
            yAxisG.call(d3.axisLeft(y).tickFormat(d => `$${d3.format(",.0f")(d)}`).ticks(6))
                .selectAll("text").attr("fill", "#555").style("font-size", "11px");
            yAxisG.select("path").attr("stroke", "#ccc");
            yAxisG.selectAll(".tick line").attr("stroke", "#ccc");
            gridG.call(d3.axisLeft(y).ticks(6).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
                .selectAll("line").attr("stroke", "#e8e8e8").attr("stroke-dasharray", "3,3");
            gridG.select("path").attr("stroke", "none");
        }
        redrawAxes();

        svg.append("text")
            .attr("x", margin.left + (width - margin.left - margin.right) / 2)
            .attr("y", height - 8)
            .attr("text-anchor", "middle").attr("fill", "#888").style("font-size", "11px")
            .text("Year");
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -(margin.top + (height - margin.top - margin.bottom) / 2))
            .attr("y", 14)
            .attr("text-anchor", "middle").attr("fill", "#888").style("font-size", "11px")
            .text("GDP per Capita (USD)");

        const linesGroup  = svg.append("g").attr("class", "country-lines").attr("clip-path", `url(#${clipId})`);
        const labelsGroup = svg.append("g").attr("class", "country-labels");

        // ── Render lines + labels ─────────────────────────────────────────
        function updateChart() {
            const vis = countryData.filter(d => selectedSet.has(d.country));

            linesGroup.selectAll(".country-line")
                .data(vis, d => d.country)
                .join(
                    enter => enter.append("path")
                        .attr("class", "country-line")
                        .attr("fill", "none")
                        .attr("stroke", color)
                        .attr("stroke-width", 1.2)
                        .attr("opacity", 0.5)
                        .attr("stroke-linejoin", "round")
                        .attr("d", d => lineFn(d.values))
                        .style("cursor", "pointer")
                        .on("mousemove", function(event, d) {
                            setHover(d.country);
                            const vals = d.values.map(v => v.gdp).filter(v => v != null);
                            showTooltip(event,
                                `<div style="font-weight:700;color:${color};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.country}</div>` +
                                `<span style="color:#aaa">Min:</span> $${d3.format(",.0f")(d3.min(vals))}<br/>` +
                                `<span style="color:#aaa">Max:</span> $${d3.format(",.0f")(d3.max(vals))}<br/>` +
                                `<span style="color:#aaa">Media:</span> $${d3.format(",.0f")(d3.mean(vals))}`
                            );
                        })
                        .on("mouseleave", function() { setHover(null); hideTooltip(); }),
                    update => update.attr("d", d => lineFn(d.values)),
                    exit   => exit.remove()
                );

            recomputeLabels(vis);
        }

        // Recompute label positions using current x/y scales
        function recomputeLabels(vis) {
            if (!vis) vis = countryData.filter(d => selectedSet.has(d.country));
            const cTop = margin.top + 4;
            const cBot = height - margin.bottom - 4;
            const minSp = 10;

            // Find the rightmost year visible in current x domain
            const xDom = x.domain();
            const visYrs = allYears.filter(yr => yr >= xDom[0] && yr <= xDom[1]);
            const lastYr = visYrs.length ? visYrs[visYrs.length - 1] : allYears[allYears.length - 1];
            const lxPos = x(lastYr) + 5;

            const labelData = vis.map(d => {
                const pt = d.values.find(v => v.year === lastYr)
                    || [...d.values].reverse().find(v => v.year <= lastYr && v.gdp != null);
                if (!pt) return null;
                return { country: d.country, ly: y(pt.gdp), gdp: pt.gdp, yr: lastYr };
            }).filter(Boolean).sort((a, b) => a.ly - b.ly);

            // Bidirectional iterative collision avoidance
            for (let p = 0; p < 10; p++) {
                for (let i = 1; i < labelData.length; i++)
                    if (labelData[i].ly - labelData[i - 1].ly < minSp)
                        labelData[i].ly = labelData[i - 1].ly + minSp;
                for (let i = labelData.length - 2; i >= 0; i--)
                    if (labelData[i + 1].ly - labelData[i].ly < minSp)
                        labelData[i].ly = labelData[i + 1].ly - minSp;
            }
            labelData.forEach(d => { d.ly = Math.max(cTop, Math.min(cBot, d.ly)); });

            labelsGroup.selectAll(".country-label")
                .data(labelData, d => d.country)
                .join(
                    enter => enter.append("text")
                        .attr("class", "country-label")
                        .attr("x", lxPos)
                        .attr("y", d => d.ly)
                        .attr("dy", "0.35em")
                        .attr("font-size", 9)
                        .attr("fill", color)
                        .attr("opacity", 0.75)
                        .text(d => d.country.length > 13 ? d.country.slice(0, 12) + "\u2026" : d.country)
                        .style("cursor", "pointer")
                        // Click: toggle deselect
                        .on("click", function(event, d) {
                            event.stopPropagation();
                            selectedSet.delete(d.country);
                            refreshAll();
                        })
                        // Hover: highlight line + show exact value tooltip
                        .on("mouseover", function(event, d) {
                            d3.select(this).attr("font-weight", "bold").attr("font-size", 10).attr("opacity", 1);
                            setHover(d.country);
                            showTooltip(event,
                                `<div style="font-weight:700;color:${color};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.country}</div>` +
                                `<span style="color:#aaa">GDP (${d.yr}):</span> $${d3.format(",.0f")(d.gdp)}<br/>` +
                                `<span style="color:#aaa;font-size:10px;font-style:italic;">Click per nascondere</span>`
                            );
                        })
                        .on("mouseleave", function() {
                            d3.select(this).attr("font-weight", "normal").attr("font-size", 9).attr("opacity", 0.75);
                            setHover(null);
                            hideTooltip();
                        }),
                    update => update
                        .attr("x", lxPos)
                        .attr("y", d => d.ly)
                        .text(d => d.country.length > 13 ? d.country.slice(0, 12) + "\u2026" : d.country),
                    exit => exit.remove()
                );
        }

        function setHover(country) {
            linesGroup.selectAll(".country-line")
                .attr("opacity",      d => country == null ? 0.5  : d.country === country ? 1    : 0.08)
                .attr("stroke-width", d => country == null ? 1.2  : d.country === country ? 2.5  : 1);
            labelsGroup.selectAll(".country-label")
                .attr("opacity",      d => country == null ? 0.75 : d.country === country ? 1    : 0.15)
                .attr("font-weight",  d => d.country === country ? "bold" : "normal");
        }

        // ── Zoom Y-only (scroll = zoom Y, dblclick = reset) ──────────────
        // Keep X fixed; only allow Y zoom via mouse wheel
        let yTransform = d3.zoomIdentity;
        function applyYZoom() {
            y = yTransform.rescaleY(yBase);
            redrawAxes();
            updateLinesAndHiding();
            recomputeLabels();
        }

        function updateLinesAndHiding() {
            const yDom = y.domain();
            const yMin = yDom[0];
            const yMax = yDom[1];
            linesGroup.selectAll(".country-line")
                .attr("d", d => lineFn(d.values))
                .attr("opacity", d => {
                    // Check if this country has ANY value in the visible Y range
                    const inRange = d.values.some(v => v.gdp != null && v.gdp >= yMin && v.gdp <= yMax);
                    return inRange ? 0.5 : 0.02;
                });
        }

        // Wheel zoom (Y-axis only)
        svg.on("wheel", function(event) {
            event.preventDefault();
            const wheelDelta = event.deltaY > 0 ? 0.8 : 1.2; // zoom out / in
            const k = Math.max(1, Math.min(30, yTransform.k * wheelDelta)); // scale extent [1, 30]
            const yCtr = (yBase.range()[0] + yBase.range()[1]) / 2; // center of Y axis
            const t = yCtr - (yCtr - yTransform.y) * (k / yTransform.k);
            yTransform = d3.zoomIdentity.translate(0, t).scale(k);
            applyYZoom();
        }, { passive: false });

        // Dblclick to reset
        svg.on("dblclick", () => {
            yTransform = d3.zoomIdentity;
            applyYZoom();
        });

        // ── Crosshair overlay (shows only selected countries) ─────────────
        const hoverLineG = svg.append("g").style("pointer-events", "none");
        const hoverLine = hoverLineG.append("line")
            .attr("stroke", "#999").attr("stroke-width", 1)
            .attr("stroke-dasharray", "4,3").attr("opacity", 0)
            .attr("y1", margin.top).attr("y2", height - margin.bottom);

        svg.append("rect")
            .attr("x", margin.left).attr("y", margin.top)
            .attr("width", width - margin.left - margin.right)
            .attr("height", height - margin.top - margin.bottom)
            .attr("fill", "none")
            .style("pointer-events", "all")
            .style("cursor", "crosshair")
            .on("mousemove", function(event) {
                const [mx] = d3.pointer(event, svg.node());
                const xVal = x.invert(mx);
                const xDom = x.domain();
                const visYrs = allYears.filter(yr => yr >= xDom[0] && yr <= xDom[1]);
                if (!visYrs.length) return;
                const year = visYrs.reduce((a, b) => Math.abs(b - xVal) < Math.abs(a - xVal) ? b : a);
                hoverLine.attr("x1", x(year)).attr("x2", x(year)).attr("opacity", 0.7);

                // Only show currently selected/visible countries
                const rows = countryData
                    .filter(d => selectedSet.has(d.country))
                    .map(d => {
                        const pt = d.values.find(v => v.year === year);
                        return pt && pt.gdp != null ? { country: d.country, gdp: pt.gdp } : null;
                    })
                    .filter(Boolean)
                    .sort((a, b) => b.gdp - a.gdp);

                const topN = rows.slice(0, 8);
                const rowsHtml = topN.map(r =>
                    `<div style="display:flex;justify-content:space-between;gap:16px;">` +
                    `<span style="color:${color};font-weight:600;">${r.country.length > 16 ? r.country.slice(0, 15) + "\u2026" : r.country}</span>` +
                    `<span>$${d3.format(",.0f")(r.gdp)}</span></div>`
                ).join("");
                const more = rows.length > 8
                    ? `<div style="color:#aaa;font-size:11px;margin-top:4px;">+${rows.length - 8} altri</div>` : "";

                showTooltip(event,
                    `<div style="font-weight:700;text-align:center;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${year}</div>` +
                    rowsHtml + more
                );
            })
            .on("mouseleave", function() { hoverLine.attr("opacity", 0); hideTooltip(); });

        updateChart();
    }

    renderOverview();
}
