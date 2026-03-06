async function renderGdpLineChart(selector = "#chart-1-1") {
    const container = d3.select(selector);
    if (container.empty()) return;
    container.html("");

    const width = 700;
    const height = 400;
    const margin = { top: 30, right: 140, bottom: 50, left: 70 };

    const continentColors = {
        "Africa": "#e07b39",
        "Asia": "#4e9af1",
        "Europe": "#6dbf67",
        "North America": "#c96dd8",
        "South America": "#f1c94e",
        "Oceania": "#e05c5c"
    };

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%")
        .style("display", "block")
        .style("font-family", "inherit")
        .style("cursor", "default");

    const raw = await d3.csv("/datasets/clean/gdp_per_capita.csv", d3.autoType);

    const continents = Object.keys(continentColors);

    const grouped = d3.groups(raw, d => d.Continent)
        .filter(([c]) => continents.includes(c))
        .map(([continent, rows]) => {
            const byYear = d3.rollup(rows, v => d3.mean(v, d => d["GDP_Per_Capita (USD)"]), d => d.Year);
            const values = Array.from(byYear, ([year, gdp]) => ({ year, gdp }))
                .sort((a, b) => a.year - b.year);
            return { continent, values };
        });

    const allYears = [...new Set(raw.map(d => d.Year))].sort(d3.ascending);

    const x = d3.scaleLinear()
        .domain(d3.extent(allYears))
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(grouped, g => d3.max(g.values, v => v.gdp))])
        .nice()
        .range([height - margin.bottom, margin.top]);

    const xAxis = d3.axisBottom(x)
        .tickFormat(d3.format("d"))
        .ticks(allYears.length > 15 ? 10 : allYears.length);

    const yAxis = d3.axisLeft(y)
        .tickFormat(d => `$${d3.format(",.0f")(d)}`)
        .ticks(6);

    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(xAxis)
        .selectAll("text")
        .attr("fill", "#555")
        .style("font-size", "11px");

    svg.select(".x-axis path").attr("stroke", "#ccc");
    svg.selectAll(".x-axis .tick line").attr("stroke", "#ccc");

    svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${margin.left},0)`)
        .call(yAxis)
        .selectAll("text")
        .attr("fill", "#555")
        .style("font-size", "11px");

    svg.select(".y-axis path").attr("stroke", "#ccc");
    svg.selectAll(".y-axis .tick line").attr("stroke", "#ccc");

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(6).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
        .selectAll("line")
        .attr("stroke", "#e8e8e8")
        .attr("stroke-dasharray", "3,3");

    svg.select(".grid path").attr("stroke", "none");

    svg.append("text")
        .attr("x", margin.left + (width - margin.left - margin.right) / 2)
        .attr("y", height - 8)
        .attr("text-anchor", "middle")
        .attr("fill", "#888")
        .style("font-size", "11px")
        .text("Year");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(margin.top + (height - margin.top - margin.bottom) / 2))
        .attr("y", 14)
        .attr("text-anchor", "middle")
        .attr("fill", "#888")
        .style("font-size", "11px")
        .text("GDP per Capita (USD)");

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.gdp))
        .curve(d3.curveMonotoneX);

    const linesGroup = svg.append("g").attr("class", "lines");
    const pointsGroup = svg.append("g").attr("class", "points");
    const labelsGroup = svg.append("g").attr("class", "labels");
    const verticalLineGroup = svg.append("g").attr("class", "vertical-line");

    let currentContinent = null;  // null = all lines selected
    let selectedYear = null;
    let highlightedContinents = null;  // null = all visible, array = highlight these only

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
        .style("display", "none")
        .style("opacity", 0)
        .style("transition", "opacity 0.15s ease");

    function isHighlighted(continent) {
        if (highlightedContinents !== null) {
            return highlightedContinents.includes(continent);
        }
        if (currentContinent === null) return true;
        return continent === currentContinent;
    }

    function getOpacity(continent) {
        return isHighlighted(continent) ? 1 : 0.25;
    }

    function getLineOpacity(continent) {
        return isHighlighted(continent) ? 1 : 0.25;
    }

    function getLineWidth(continent) {
        return isHighlighted(continent) ? 2 : 1.5;
    }

    function getPointRadius(continent) {
        return isHighlighted(continent) ? 4 : 2.5;
    }

    function getPointOpacity(continent) {
        return isHighlighted(continent) ? 0.85 : 0.45;
    }

    function getLabelFontSize(continent) {
        return isHighlighted(continent) ? 12 : 10;
    }

    function getLabelFontWeight(continent) {
        return isHighlighted(continent) ? "bold" : "normal";
    }

    function getLabelColor(continent) {
        return isHighlighted(continent) ? continentColors[continent] : "#999";
    }

    function getLabelOpacity(continent) {
        return isHighlighted(continent) ? 1 : 0.5;
    }

    function updateChart() {
        // Update lines
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
                        // Animate all lines left-to-right on initial load
                        const len = this.getTotalLength();
                        const delay = continents.indexOf(d.continent) * 100;
                        d3.select(this)
                            .attr("stroke-dasharray", len)
                            .attr("stroke-dashoffset", len)
                            .transition()
                            .delay(delay)
                            .duration(3000)
                            .ease(d3.easeLinear)
                            .attr("stroke-dashoffset", 0)
                            .on("end", function() {
                                d3.select(this).attr("stroke-dasharray", "none");
                            });
                    })
                    .on("mousemove", function(event, d) {
                        if (currentContinent !== null && d.continent !== currentContinent) {
                            d3.select(this).attr("stroke-width", 2.5).attr("opacity", 0.5);
                        }
                        const vals = d.values.map(v => v.gdp);
                        const color = continentColors[d.continent];
                        const html = `<div style="font-weight:700;color:${color};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.continent}</div>` +
                            `<span style="color:#aaa">Period:</span> ${d.values[0].year}–${d.values[d.values.length - 1].year}<br/>` +
                            `<span style="color:#aaa">Min:</span> $${d3.format(",.0f")(d3.min(vals))}<br/>` +
                            `<span style="color:#aaa">Max:</span> $${d3.format(",.0f")(d3.max(vals))}<br/>` +
                            `<span style="color:#aaa">Avg:</span> $${d3.format(",.0f")(d3.mean(vals))}`;
                        showTooltip(event, html);
                    })
                    .on("mouseleave", function(event, d) {
                        if (currentContinent !== null && d.continent !== currentContinent) {
                            d3.select(this).attr("stroke-width", 1.5).attr("opacity", 0.25);
                        }
                        hideTooltip();
                    })
                    .on("click", function(event, d) {
                        event.stopPropagation();
                        if (d.continent !== currentContinent) {
                            currentContinent = d.continent;
                            selectedYear = null;
                            updateChart();
                        }
                    }),
                update => update
                    .attr("opacity", d => getLineOpacity(d.continent))
                    .attr("stroke-width", d => getLineWidth(d.continent)),
                exit => exit.remove()
            );

        // Dots on ALL continent lines
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
                        d3.select(this)
                            .attr("r", isHighlighted(d.continent) ? 6 : 4)
                            .attr("opacity", 1);
                        const color = continentColors[d.continent];
                        showTooltip(event,
                            `<div style="font-weight:700;color:${color};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.continent}</div>` +
                            `<span style="color:#aaa">Year:</span> ${d.year}<br/>` +
                            `<span style="color:#aaa">GDP per Capita:</span> $${d3.format(",.0f")(d.gdp)}`
                        );
                    })
                    .on("mousemove", function(event, d) {
                        const color = continentColors[d.continent];
                        showTooltip(event,
                            `<div style="font-weight:700;color:${color};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.continent}</div>` +
                            `<span style="color:#aaa">Year:</span> ${d.year}<br/>` +
                            `<span style="color:#aaa">GDP per Capita:</span> $${d3.format(",.0f")(d.gdp)}`
                        );
                    })
                    .on("mouseleave", function(event, d) {
                        d3.select(this)
                            .attr("r", getPointRadius(d.continent))
                            .attr("opacity", getPointOpacity(d.continent));
                        hideTooltip();
                    })
                    .on("click", function(event, d) {
                        event.stopPropagation();
                        if (d.continent !== currentContinent) {
                            currentContinent = d.continent;
                            selectedYear = d.year;
                        } else {
                            selectedYear = selectedYear === d.year ? null : d.year;
                        }
                        updateChart();
                    }),
                update => update
                    .attr("r", d => getPointRadius(d.continent))
                    .attr("opacity", d => getPointOpacity(d.continent)),
                exit => exit.remove()
            );

        // Update labels
        const labelData = grouped.map(d => {
            const last = d.values[d.values.length - 1];
            return { continent: d.continent, x: x(last.year) + 5, y: y(last.gdp) };
        }).sort((a, b) => a.y - b.y);

        const minLabelSpacing = 16;
        for (let i = 1; i < labelData.length; i++) {
            if (labelData[i].y - labelData[i - 1].y < minLabelSpacing) {
                labelData[i].y = labelData[i - 1].y + minLabelSpacing;
            }
        }

        labelsGroup.selectAll(".continent-label")
            .data(labelData, d => d.continent)
            .join(
                enter => enter.append("text")
                    .attr("class", "continent-label")
                    .attr("x", d => d.x)
                    .attr("y", d => d.y)
                    .attr("dy", "0.35em")
                    .attr("font-size", d => getLabelFontSize(d.continent))
                    .attr("font-weight", d => getLabelFontWeight(d.continent))
                    .attr("fill", d => getLabelColor(d.continent))
                    .attr("opacity", d => getLabelOpacity(d.continent))
                    .text(d => d.continent)
                    .style("cursor", d => d.continent === currentContinent ? "default" : "pointer"),
                update => update
                    .attr("font-size", d => getLabelFontSize(d.continent))
                    .attr("font-weight", d => getLabelFontWeight(d.continent))
                    .attr("fill", d => getLabelColor(d.continent))
                    .attr("opacity", d => getLabelOpacity(d.continent)),
                exit => exit.remove()
            );

        updateVerticalLine();
    }

    function updateVerticalLine() {
        verticalLineGroup.selectAll("*").remove();

        if (selectedYear === null) return;

        const xPos = x(selectedYear);
        
        // Vertical line
        verticalLineGroup.append("line")
            .attr("x1", xPos).attr("x2", xPos)
            .attr("y1", margin.top).attr("y2", height - margin.bottom)
            .attr("stroke", "#000").attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,4").attr("opacity", 0.5);

        // Year label
        verticalLineGroup.append("text")
            .attr("x", xPos).attr("y", margin.top - 8)
            .attr("text-anchor", "middle")
            .attr("font-size", 12).attr("font-weight", "bold")
            .attr("fill", "#d32f2f")
            .text(selectedYear);

        // Comparison points for all continents
        const yearData = grouped.map(d => {
            const p = d.values.find(v => v.year === selectedYear);
            return p ? { continent: d.continent, ...p } : null;
        }).filter(Boolean);

        verticalLineGroup.selectAll(".comparison-point")
            .data(yearData)
            .join("circle")
            .attr("class", "comparison-point")
            .attr("cx", xPos)
            .attr("cy", d => y(d.gdp))
            .attr("r", 5)
            .attr("fill", d => continentColors[d.continent])
            .attr("opacity", 0.9)
            .style("cursor", "pointer")
            .on("mouseenter", function(e, d) {
                d3.select(this).attr("r", 7);
                const color = continentColors[d.continent];
                showTooltip(e,
                    `<div style="font-weight:700;color:${color};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.continent}</div>` +
                    `<span style="color:#aaa">Year:</span> ${d.year}<br/>` +
                    `<span style="color:#aaa">GDP per Capita:</span> $${d3.format(",.0f")(d.gdp)}`
                );
            })
            .on("mousemove", function(e, d) {
                const color = continentColors[d.continent];
                showTooltip(e,
                    `<div style="font-weight:700;color:${color};margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">${d.continent}</div>` +
                    `<span style="color:#aaa">Year:</span> ${d.year}<br/>` +
                    `<span style="color:#aaa">GDP per Capita:</span> $${d3.format(",.0f")(d.gdp)}`
                );
            })
            .on("mouseleave", function() {
                d3.select(this).attr("r", 5);
                hideTooltip();
            })
            .on("click", function(e, d) {
                e.stopPropagation();
                if (d.continent !== currentContinent) {
                    currentContinent = d.continent;
                    selectedYear = null;
                    updateChart();
                }
            });
    }

    function showTooltip(event, html) {
        tooltip.style("display", "block").html(html).style("opacity", 1);
        const rect = tooltip.node().getBoundingClientRect();
        const offsetX = 12;
        const offsetY = 8;
        let x = event.pageX + offsetX;
        let y = event.pageY + offsetY;
        
        // Adjust if tooltip goes off right edge
        if (x + rect.width > window.innerWidth - 8) {
            x = event.pageX - rect.width - offsetX;
        }
        // Adjust if tooltip goes off bottom edge
        if (y + rect.height > window.innerHeight - 8) {
            y = event.pageY - rect.height - offsetY;
        }
        tooltip.style("left", `${x}px`).style("top", `${y}px`);
    }

    function hideTooltip() {
        tooltip.style("opacity", 0).style("display", "none");
    }

    svg.on("click", () => {
        selectedYear = null;
        updateChart();
    });

    // Esponi una funzione per controllare i continenti evidenziati
    const domContainer = d3.select(selector).node();
    domContainer._gdpHighlightContinents = function(continents) {
        highlightedContinents = continents ? continents : null;
        updateChart();
    };

    // Crosshair overlay for precise year tooltip
    const hoverLineGroup = svg.append("g").attr("class", "hover-line").style("pointer-events", "none");
    const hoverLine = hoverLineGroup.append("line")
        .attr("stroke", "#999")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,3")
        .attr("opacity", 0)
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom);

    svg.append("rect")
        .attr("x", margin.left)
        .attr("y", margin.top)
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
            
            // Clamp to valid range
            if (idx === 0) idx = 0;
            if (idx >= allYears.length) idx = allYears.length - 1;
            
            // Find nearest year
            let year;
            if (idx === 0) {
                year = allYears[0];
            } else if (idx >= allYears.length) {
                year = allYears[allYears.length - 1];
            } else {
                const diff1 = Math.abs(xVal - allYears[idx - 1]);
                const diff2 = Math.abs(xVal - allYears[idx]);
                year = diff1 < diff2 ? allYears[idx - 1] : allYears[idx];
            }

            const xPos = x(year);
            hoverLine.attr("x1", xPos).attr("x2", xPos).attr("opacity", 0.7);

            const rows = grouped
                .map(g => {
                    const pt = g.values.find(v => v.year === year);
                    return pt ? { continent: g.continent, gdp: pt.gdp } : null;
                })
                .filter(Boolean)
                .sort((a, b) => b.gdp - a.gdp);

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

// Funzione per evidenziare continenti specifici nel grafico GDP
function highlightGdpContinents(containerSelector, continentsToHighlight) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  
  // Se None o array vuoto, reset
  if (!continentsToHighlight || continentsToHighlight.length === 0) {
    container._gdpHighlightedContinents = null;
  } else {
    container._gdpHighlightedContinents = continentsToHighlight;
  }
}
