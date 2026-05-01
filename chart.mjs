import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 640;
const height = 400;
const marginTop = 20;
const marginRight = 30;
const marginBottom = 40;
const marginLeft = 30;

const dataP = await d3.csv("data.csv", d => ({
  age:        +d.age,
  reelstime:  +d.reels_watch_time_hours,
  screenTime: +d.daily_screen_time_hours,
  sleep:      +d.sleep_hours,
  attention:  +d.attention_span_score,
  focus:      +d.focus_level,
  completion: +d.task_completion_rate,
  stress:     d.stress_level.trim().toLowerCase(),
  platform:   d.platform.trim().toLowerCase()
}));

const names = {
  age:          "Age (in years)",
  reelstime:    "Time spent on App (in hours)",
  screenTime:   "Time spent on a screen (in hours)",
  sleep:        "Time spent sleeping (in hours)",
  attention:    "Attention span score (1 bad, 10 good)",
  focus:        "Focus level (1 bad, 10 good)",
  completion:   "Percentage of tasks completed",
  stress:       "Categorical stress level",
  platform:     "Platform content was consumed on"
};

// maps HTML option value → dataP key
const colums = {
  "1": "age",
  "2": "reelstime",
  "3": "screenTime",
  "4": "sleep",
  "5": "attention",
  "6": "focus",
  "7": "completion",
  "8": "stress",
  "9": "platform",
  "0": "none"
};

function isNumeric(data, col) {
  return !isNaN(+data[0][col]);
}

function addAxisTitles(svg, xaxis, yaxis) {
  svg.append("text")
    .attr("x", marginLeft + (width - marginLeft - marginRight) / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .text(names[xaxis]);

  svg.append("text")
    .attr("x", -(marginTop + (height - marginTop - marginBottom) / 2))
    .attr("y", 12)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("transform", "rotate(-90)")
    .text(names[yaxis]);
}

function getFilteredData() {
  const rows = document.querySelectorAll("#filterTable select");
  const filters = [];

  rows.forEach(sel => {
    const optionVal = sel.value;
    const col = colums[optionVal];
    const row = sel.closest("tr");
    const start = +row.querySelector(".slider-s").value;
    const end   = +row.querySelector(".slider-e").value;
    filters.push({ col, start, end });
  });

  return dataP.filter(d => {
    return filters.every(f => {
      if (isNumeric(dataP, f.col)) {
        // numeric — filter by slider range
        const val = d[f.col];
        const colMin = d3.min(dataP, r => r[f.col]);
        const colMax = d3.max(dataP, r => r[f.col]);
        // map slider 0-100 to actual data range
        const realStart = colMin + (f.start / 100) * (colMax - colMin);
        const realEnd   = colMin + (f.end   / 100) * (colMax - colMin);
        return val >= realStart && val <= realEnd;
      } else {
        // categorical — slider doesn't apply, include all
        return true;
      }
    });
  });
}

function scatterplot(xaxis, yaxis) {
    const data = getFilteredData();

    if (!isNumeric(data, xaxis) || !isNumeric(data, yaxis)) {
        console.warn("both axes must be numeric for a scatterplot");
        return null;
    }

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[xaxis])])
        .range([marginLeft, width - marginRight])
        .nice();

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[yaxis])])
        .range([height - marginBottom, marginTop])
        .nice();

    const svg = d3.create("svg")
        .attr("viewBox", [0, 0, width, height]);

    const g = svg.append("g");

    g.selectAll("circle")
        .data(data)
        .join("circle")
        .attr("r", 5)
        .attr("cx", d => x(d[xaxis]))
        .attr("cy", d => y(d[yaxis]));

    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x));

    svg.append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y));

    addAxisTitles(svg, xaxis, yaxis)
    return svg;
}

function bubbleChart(xaxis, yaxis) {
    const data = getFilteredData();
    if (!isNumeric(data, xaxis) || !isNumeric(data, yaxis)) {
        console.warn("both axes must be numeric for a bubble chart");
        return null;
    }

    const bin = v => Math.round(v * 2) / 2;

    const grouped = d3.rollup(
        data,
        v => v.length,
        d => bin(d[xaxis]),
        d => bin(d[yaxis])
    );

    const bubbleData = Array.from(grouped, ([x, yMap]) =>
        Array.from(yMap, ([y, count]) => ({ x, y, count }))
    ).flat();

    const x = d3.scaleLinear()
        .domain([0, d3.max(bubbleData, d => d.x)])
        .range([marginLeft, width - marginRight])
        .nice();

    const y = d3.scaleLinear()
        .domain([0, d3.max(bubbleData, d => d.y)])
        .range([height - marginBottom, marginTop])
        .nice();

    const r = d3.scaleSqrt()
        .domain([1, d3.max(bubbleData, d => d.count)])
        .range([3, 20]);

    const svg = d3.create("svg")
        .attr("viewBox", [0, 0, width, height]);

    const g = svg.append("g");

    g.selectAll("circle")
        .data(bubbleData)
        .join("circle")
        .attr("cx", d => x(d.x))
        .attr("cy", d => y(d.y))
        .attr("r", d => r(d.count))
        .attr("fill", "steelblue")
        .attr("fill-opacity", 0.5)
        .attr("stroke", "steelblue")
        .attr("stroke-width", 0.5);

    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y));

    addAxisTitles(svg, xaxis, yaxis)
    return svg;
}

function heatmap(xaxis, yaxis) {
  const data = getFilteredData();
  if (!isNumeric(data, xaxis) || !isNumeric(data, yaxis)) {
    return invalidChart("heatmap needs two numeric axes");
  }

  const xBins = 20;
  const yBins = 20;

  const xExtent = d3.extent(data, d => d[xaxis]);
  const yExtent = d3.extent(data, d => d[yaxis]);

  const xScale = d3.scaleLinear().domain(xExtent).range([marginLeft, width - marginRight]);
  const yScale = d3.scaleLinear().domain(yExtent).range([height - marginBottom, marginTop]);

  const cellW = (width  - marginLeft  - marginRight)  / xBins;
  const cellH = (height - marginTop   - marginBottom) / yBins;

  // bin the data into a grid
  const bins = d3.rollup(
    data,
    v => v.length,
    d => Math.floor((d[xaxis] - xExtent[0]) / (xExtent[1] - xExtent[0]) * (xBins - 1)),
    d => Math.floor((d[yaxis] - yExtent[0]) / (yExtent[1] - yExtent[0]) * (yBins - 1))
  );

  const cellData = [];
  bins.forEach((yMap, xi) => {
    yMap.forEach((count, yi) => {
      cellData.push({ xi, yi, count });
    });
  });

  const color = d3.scaleSequential()
    .domain([0, d3.max(cellData, d => d.count)])
    .interpolator(d3.interpolateBlues);

  const svg = d3.create("svg").attr("viewBox", [0, 0, width, height]);

  svg.append("g")
    .selectAll("rect")
    .data(cellData)
    .join("rect")
    .attr("x", d => marginLeft + d.xi * cellW)
    .attr("y", d => marginTop  + (yBins - 1 - d.yi) * cellH)
    .attr("width",  cellW)
    .attr("height", cellH)
    .attr("fill", d => color(d.count));

  svg.append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(xScale));

  svg.append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(yScale));

  addAxisTitles(svg, xaxis, yaxis);
  return svg;
}

function boxPlot(xaxis, yaxis) {
  const data = getFilteredData();
  if (isNumeric(data, xaxis) || !isNumeric(data, yaxis)) {
    return invalidChart("box plot needs categorical x and numeric y");
  }

  const grouped = d3.group(data, d => d[xaxis]);

  const boxData = Array.from(grouped, ([key, values]) => {
    const sorted = values.map(d => d[yaxis]).sort(d3.ascending);
    const q1  = d3.quantile(sorted, 0.25);
    const med = d3.quantile(sorted, 0.5);
    const q3  = d3.quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const min = Math.max(d3.min(sorted), q1 - 1.5 * iqr);
    const max = Math.min(d3.max(sorted), q3 + 1.5 * iqr);
    return { key, q1, med, q3, min, max };
  });

  const y = d3.scaleBand()
    .domain(boxData.map(d => d.key))
    .range([marginTop, height - marginBottom])
    .padding(0.4);

  const x = d3.scaleLinear()
    .domain([d3.min(boxData, d => d.min), d3.max(boxData, d => d.max)])
    .range([marginLeft, width - marginRight])
    .nice();

  const svg = d3.create("svg").attr("viewBox", [0, 0, width, height]);
  const g   = svg.append("g");

  const bh = y.bandwidth();

  // whiskers
  g.selectAll(".whisker")
    .data(boxData)
    .join("line")
    .attr("y1", d => y(d.key) + bh / 2)
    .attr("y2", d => y(d.key) + bh / 2)
    .attr("x1", d => x(d.min))
    .attr("x2", d => x(d.max))
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5);

  // boxes
  g.selectAll(".box")
    .data(boxData)
    .join("rect")
    .attr("y", d => y(d.key))
    .attr("x", d => x(d.q1))
    .attr("height", bh)
    .attr("width", d => x(d.q3) - x(d.q1))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.5)
    .attr("stroke", "steelblue");

  // median line
  g.selectAll(".median")
    .data(boxData)
    .join("line")
    .attr("y1", d => y(d.key))
    .attr("y2", d => y(d.key) + bh)
    .attr("x1", d => x(d.med))
    .attr("x2", d => x(d.med))
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2.5);

  svg.append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y));

  addAxisTitles(svg, xaxis, yaxis);
  return svg;
}

function barChart(xaxis, yaxis = null) {
  const data = getFilteredData();
  const svg = d3.create("svg").attr("viewBox", [0, 0, width, height]);
  const g = svg.append("g");

  if (yaxis === null) {
    const total = data.length;

    // only bin numeric columns, leave categorical as-is
    const key = isNumeric(data, xaxis)
      ? d => Math.round(d[xaxis])
      : d => d[xaxis];

    const counts = d3.rollup(data, v => v.length, key);
    const barData = Array.from(counts, ([k, count]) => ({
      key: k,
      count: (count / total) * 100
    })).sort((a, b) => isNumeric(data, xaxis)
      ? d3.ascending(a.key, b.key)
      : d3.descending(a.count, b.count)
    );

    const x = d3.scaleBand()
      .domain(barData.map(d => d.key))
      .range([marginLeft, width - marginRight])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(barData, d => d.count)])
      .range([height - marginBottom, marginTop])
      .nice();

    g.selectAll("rect")
      .data(barData)
      .join("rect")
      .attr("x", d => x(d.key))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => y(0) - y(d.count))
      .attr("fill", "steelblue");

    svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).tickFormat(d => `${d.toFixed(0)}%`));

    addAxisTitles(svg, xaxis, "percentage");
    return svg;
  }

  // two axis bar chart
  if (yaxis !== null) {
    const xIsNum = isNumeric(data, xaxis);
    const yIsNum = isNumeric(data, yaxis);

    // both categorical — show count per x category colored by y (not very useful, fallback)
    if (!xIsNum && !yIsNum) {
      return invalidChart("cannot bar chart two categorical columns");
    }

    // numeric x + numeric y — bin x, mean y per bin
    if (xIsNum && yIsNum) {
      const binned = d3.rollup(
        data,
        v => d3.mean(v, d => d[yaxis]),
        d => Math.round(d[xaxis])
      );
      const barData = Array.from(binned, ([key, mean]) => ({ key, mean }))
        .sort((a, b) => d3.ascending(a.key, b.key));

      const x = d3.scaleBand()
        .domain(barData.map(d => d.key))
        .range([marginLeft, width - marginRight])
        .padding(0.2);

      const y = d3.scaleLinear()
        .domain([0, d3.max(barData, d => d.mean)])
        .range([height - marginBottom, marginTop])
        .nice();

      g.selectAll("rect")
        .data(barData)
        .join("rect")
        .attr("x", d => x(d.key))
        .attr("y", d => y(d.mean))
        .attr("width", x.bandwidth())
        .attr("height", d => y(0) - y(d.mean))
        .attr("fill", "steelblue");

      svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y));

      addAxisTitles(svg, xaxis, `mean ${yaxis}`);
      return svg;
    }

    // categorical x + numeric y — mean y per category
    // if x is numeric and y is categorical, swap them
    const catCol = xIsNum ? yaxis : xaxis;
    const numCol = xIsNum ? xaxis : yaxis;

    const grouped = d3.rollup(
      data,
      v => d3.mean(v, d => d[numCol]),
      d => d[catCol]
    );
    const barData = Array.from(grouped, ([key, mean]) => ({ key, mean }))
      .sort((a, b) => d3.descending(a.mean, b.mean));

    const x = d3.scaleBand()
      .domain(barData.map(d => d.key))
      .range([marginLeft, width - marginRight])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(barData, d => d.mean)])
      .range([height - marginBottom, marginTop])
      .nice();

    g.selectAll("rect")
      .data(barData)
      .join("rect")
      .attr("x", d => x(d.key))
      .attr("y", d => y(d.mean))
      .attr("width", x.bandwidth())
      .attr("height", d => y(0) - y(d.mean))
      .attr("fill", "steelblue");

    svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y));

    addAxisTitles(svg, catCol, `mean ${numCol}`);
    return svg;
  }
}

function invalidChart(message = "combination incorrect") {
  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height]);

  const x = d3.scaleLinear().range([marginLeft, width - marginRight]);
  const y = d3.scaleLinear().range([height - marginBottom, marginTop]);

  svg.append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).tickFormat(""));

  svg.append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y).tickFormat(""));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("font-size", 32)
    .attr("fill", "#888")
    .text(message);

  return svg;
}


window.setChart = function() {
  const type  = document.getElementById("chartType").value;
  const xVal  = document.getElementById("xaxis").value;
  const yVal  = document.getElementById("yaxis").value;
  const xaxis = colums[xVal];
  const yaxis = colums[yVal] ?? "none";

  if (yaxis === "none") {
    switch(type) {
      case "2": return barChart(xaxis, null);
      default:  return invalidChart("select a y axis");
    }
  }

  switch(type) {
    case "1": return scatterplot(xaxis, yaxis);
    case "2": return barChart(xaxis, yaxis);
    case "3": return bubbleChart(xaxis, yaxis);
    case "4": return heatmap(xaxis, yaxis);
    case "5": return boxPlot(xaxis, yaxis);
    default:  return invalidChart();
  }
}