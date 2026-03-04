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
        .style("font-family", "inherit");

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
    const allGdp = raw.map(d => d["GDP_Per_Capita (USD)"]);

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

    grouped.forEach(({ continent, values }) => {
        linesGroup.append("path")
            .datum(values)
            .attr("fill", "none")
            .attr("stroke", continentColors[continent])
            .attr("stroke-width", 2.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("d", line)
            .attr("data-continent", continent);
    });

    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - margin.right + 12}, ${margin.top})`);

    continents.forEach((continent, i) => {
        const g = legend.append("g").attr("transform", `translate(0, ${i * 22})`);
        g.append("line")
            .attr("x1", 0).attr("y1", 8)
            .attr("x2", 18).attr("y2", 8)
            .attr("stroke", continentColors[continent])
            .attr("stroke-width", 2.5)
            .attr("stroke-linecap", "round");
        g.append("text")
            .attr("x", 24)
            .attr("y", 12)
            .attr("fill", "#444")
            .style("font-size", "11px")
            .text(continent);
    });

    const tooltip = d3.select(selector)
        .append("div")
        .attr("class", "gdp-tooltip")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.97)")
        .style("border", "1px solid #ddd")
        .style("border-radius", "8px")
        .style("padding", "10px 14px")
        .style("pointer-events", "none")
        .style("box-shadow", "0 4px 18px rgba(0,0,0,0.12)")
        .style("font-size", "12px")
        .style("line-height", "1.7")
        .style("min-width", "170px")
        .style("opacity", 0)
        .style("transition", "opacity 0.15s ease");

    const bisectYear = d3.bisector(d => d.year).left;

    const overlay = svg.append("rect")
        .attr("class", "overlay")
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", "none")
        .attr("pointer-events", "all");

    const hoverLine = svg.append("line")
        .attr("class", "hover-line")
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
        .attr("stroke", "#aaa")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,3")
        .style("opacity", 0);

    const dots = svg.append("g").attr("class", "hover-dots");

    grouped.forEach(({ continent }) => {
        dots.append("circle")
            .attr("class", `hover-dot hover-dot-${continent.replace(/\s/g, '-')}`)
            .attr("r", 5)
            .attr("fill", continentColors[continent])
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .style("opacity", 0);
    });

    overlay.on("mousemove", function (event) {
        const containerEl = document.querySelector(selector);
        const containerRect = containerEl.getBoundingClientRect();

        const [mx] = d3.pointer(event, svg.node());
        const yearVal = x.invert(mx);

        hoverLine
            .attr("x1", mx)
            .attr("x2", mx)
            .style("opacity", 1);

        const rows = grouped.map(({ continent, values }) => {
            const idx = bisectYear(values, yearVal, 1);
            const d0 = values[idx - 1];
            const d1 = values[idx] || d0;
            const d = (!d1 || Math.abs(yearVal - d0.year) <= Math.abs(yearVal - d1.year)) ? d0 : d1;

            const dot = dots.select(`.hover-dot-${continent.replace(/\s/g, '-')}`);
            dot.attr("cx", x(d.year)).attr("cy", y(d.gdp)).style("opacity", 1);

            return { continent, year: d.year, gdp: d.gdp };
        });

        const nearestYear = rows[0].year;
        let html = `<div style="font-weight:700;color:#333;margin-bottom:4px;border-bottom:1px solid #eee;padding-bottom:4px;">${nearestYear}</div>`;
        const sorted = [...rows].sort((a, b) => b.gdp - a.gdp);
        sorted.forEach(({ continent, gdp }) => {
            const color = continentColors[continent];
            html += `<div style="display:flex;align-items:center;gap:6px;">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
                <span style="color:#555;">${continent}:</span>
                <span style="font-weight:600;color:#222;margin-left:auto;">$${d3.format(",.0f")(gdp)}</span>
            </div>`;
        });

        const svgRect = svg.node().getBoundingClientRect();
        const xRatio = svgRect.width / width;
        const yRatio = svgRect.height / height;

        let tipX = (mx + 16) * xRatio;
        let tipY = (margin.top) * yRatio;

        const tipWidth = 180;
        if (tipX + tipWidth > svgRect.width - 10) tipX = (mx - 16) * xRatio - tipWidth;

        tooltip
            .style("left", tipX + "px")
            .style("top", tipY + "px")
            .style("opacity", 1)
            .html(html);
    });

    overlay.on("mouseleave", function () {
        hoverLine.style("opacity", 0);
        dots.selectAll(".hover-dot").style("opacity", 0);
        tooltip.style("opacity", 0);
    });
}
