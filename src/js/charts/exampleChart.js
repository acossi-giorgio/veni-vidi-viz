function renderExampleChart(selector = "#example-chart-container") {
    const container = d3.select(selector);
    if (container.empty()) return;
    container.html("");

    const width = 560;
    const height = 360;
    const margin = { top: 30, right: 30, bottom: 40, left: 50 };

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%")
        .style("display", "block");

    const dataCount = Math.floor(Math.random() * 6) + 5;
    const data = Array.from({ length: dataCount }, () => Math.floor(Math.random() * 90) + 10);


    const colors = ["#2a7700ff", "#1461a9ff", "#d84f05ff", "#e377c2", "#17becf", "#8c564b", "#bcbd22"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const x = d3.scaleBand()
        .domain(data.map((d, i) => i))
        .range([margin.left, width - margin.right])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data)])
        .range([height - margin.bottom, margin.top]);

    svg.append("g")
        .attr("fill", randomColor)
        .selectAll("rect")
        .data(data)
        .join("rect")
        .attr("x", (d, i) => x(i))
        .attr("y", d => y(d))
        .attr("height", d => y(0) - y(d))
        .attr("width", x.bandwidth());

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));
}
