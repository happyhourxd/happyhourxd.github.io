import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let cache = null;

async function loadData() {
  if (cache) return cache;

  cache = await d3.csv("data.csv", d => ({
    age: +d.age,
    reels_watch_time_hours: +d.reels_watch_time_hours,
    daily_screen_time_hours: +d.daily_screen_time_hours,
    sleep_hours: +d.sleep_hours,
    attention_span_score: +d.attention_span_score,
    focus_level: +d.focus_level,
    task_completion_rate: +d.task_completion_rate,
    stress_level: +d.stress_level,
    platform: d.platform
  }));

  return cache;
}

export async function getFieldRanges() {
  const data = await loadData();

  const numeric = [
    "age",
    "reels_watch_time_hours",
    "daily_screen_time_hours",
    "sleep_hours",
    "attention_span_score",
    "focus_level",
    "task_completion_rate",
    "stress_level"
  ];

  const ranges = {};
  for (const f of numeric) {
    ranges[f] = d3.extent(data, d => d[f]);
  }

  return ranges;
}

// generate labels
function labelMap(f) {
  return {
    age: "Age",
    reels_watch_time_hours: "Reels Watch Time (hours)",
    daily_screen_time_hours: "Daily Screen Time (hours)",
    sleep_hours: "Sleep (hours)",
    attention_span_score: "Attention Span (scale of 1 - 10)",
    focus_level: "Focus Level",
    task_completion_rate: "Rate of task completion",
    stress_level: "Stress Level",
    platform: "Platform"
  }[f] || f;
}

// applies filters
function applyFilters(data, filters) {
  return data.filter(d =>
    filters.every(f => {
      if (!f.field || f.field === "platform") return true;
      return d[f.field] >= f.min && d[f.field] <= f.max;
    })
  );
}

// colors
function makeColor(data, valueAccessor, color) {
  const values = data.map(valueAccessor);
  const isNumeric = values.every(v => !isNaN(v));

  //solid color (no scaling needed)
  if (!isNumeric || typeof color === "string") {
    return () => color;
  }

  const [min, max] = d3.extent(values);

  return d3.scaleSequential(
    d3.interpolateBlues
  ).domain([min, max]);
}

//axis
function addAxes(svg, x, y, config, w, h, m) {
  svg.append("g")
    .attr("transform", `translate(0,${h - m})`)
    .call(d3.axisBottom(x));

  if (y) {
    svg.append("g")
      .attr("transform", `translate(${m},0)`)
      .call(d3.axisLeft(y));
  }

  svg.append("text")
    .attr("x", w / 2)
    .attr("y", h - 5)
    .attr("text-anchor", "middle")
    .text(labelMap(config.x));

  if (y && config.y) {
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -h / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .text(labelMap(config.y));
  }
}

export async function drawChart(config) {
  const w = 700, h = 450
  const raw = await loadData();
  const data = applyFilters(raw, config.filters);

  d3.select("#container").html("");

  switch (config.type) {
    case "1": return scatter(data, config, w, h);
    case "2": return bar(data, config, w, h);
    case "3": return bubble(data, config, w, h);
    case "4": return heatmap(data, config, w, h);
    case "5": return boxplot(data, config, w, h);
    case "6": return barAvg(data, config, w, h);
  }
}

function scatter(data, config, w, h) {
  const color = config.color
  const m = 50;

  data = [...data].sort((a, b) => d3.ascending(+a[config.x], +b[config.x]));

  const svg = d3.select("#container").append("svg")
    .attr("width", w)
    .attr("height", h);

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => +d[config.x]))
    .range([m, w - m]);

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => +d[config.y]))
    .range([h - m, m]);

  svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(+d[config.x]))
    .attr("cy", d => y(+d[config.y]))
    .attr("r", 4)
    .attr("fill", typeof color === "function" ? color(key) : color)
    .attr("opacity", 0.7);

  addAxes(svg, x, y, config, w, h, m);
}

function bar(data, config, w, h, bins = 10) {
  const m = 50;

  const values = data.map(d => +d[config.x]);

  const bin = d3.bin()
    .domain(d3.extent(values))
    .thresholds(bins);

  const binsData = bin(values);

  const grouped = binsData.map(b => ({
    x: `${Math.round(b.x0)}–${Math.round(b.x1)}`,
    value: b.length
  }));

  const svg = d3.select("#container").append("svg")
    .attr("width", w)
    .attr("height", h);

  const x = d3.scaleBand()
    .domain(grouped.map(d => d.x))
    .range([50, w - 50])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d.value)])
    .range([h - 50, 50]);

  svg.selectAll("rect")
    .data(grouped)
    .enter()
    .append("rect")
    .attr("x", d => x(d.x))
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", d => h - 50 - y(d.value))
    .attr("fill", config.color);

  addAxes(svg, x, y, { x: config.x }, w, h, m);
}

function barAvg(data, config, w, h, bins = 8) {
  const m = 50;
  const color = config.color

  const values = data.map(d => d[config.x]);

  const binGenerator = d3.bin()
    .domain(d3.extent(values))
    .thresholds(bins);

  const binsData = binGenerator(values);

  const grouped = binsData.map(bin => {
    const items = data.filter(d =>
      d[config.x] >= bin.x0 && d[config.x] < bin.x1
    );

    return [
      `${Math.round(bin.x0)}–${Math.round(bin.x1)}`,
      d3.mean(items, d => d[config.y])
    ];
  });

  const svg = d3.select("#container").append("svg")
    .attr("width", w)
    .attr("height", h);

  const x = d3.scaleBand()
    .domain(grouped.map(d => d[0]))
    .range([m, w - m])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d[1])])
    .nice()
    .range([h - m, m]);

  svg.selectAll("rect")
    .data(grouped)
    .enter()
    .append("rect")
    .attr("x", d => x(d[0]))
    .attr("y", d => y(d[1]))
    .attr("width", x.bandwidth())
    .attr("height", d => h - m - y(d[1]))
    .attr("fill", typeof color === "function" ? color(key) : color)

  addAxes(svg, x, y, { x: config.x, y: config.y }, w, h, m);
}

function bubble(data, config, w, h, bins = 20) {
  const m = 50;

  const svg = d3.select("#container").append("svg")
    .attr("width", w)
    .attr("height", h);

  const xVals = data.map(d => +d[config.x]);
  const yVals = data.map(d => +d[config.y]);

  const xBin = d3.bin()
    .domain(d3.extent(xVals))
    .thresholds(bins);

  const yBin = d3.bin()
    .domain(d3.extent(yVals))
    .thresholds(bins);

  const xBins = xBin(xVals);
  const yBins = yBin(yVals);

  const processed = [];

  xBins.forEach(xb => {
    yBins.forEach(yb => {
      const items = data.filter(d =>
        d[config.x] >= xb.x0 && d[config.x] < xb.x1 &&
        d[config.y] >= yb.x0 && d[config.y] < yb.x1
      );

      processed.push({
        x: (xb.x0 + xb.x1) / 2,
        y: (yb.x0 + yb.x1) / 2,
        count: items.length
      });
    });
  });

  const x = d3.scaleLinear()
    .domain(d3.extent(xVals))
    .range([m, w - m]);

  const y = d3.scaleLinear()
    .domain(d3.extent(yVals))
    .range([h - m, m]);

  const r = d3.scaleSqrt()
    .domain([0, d3.max(processed, d => d.count)])
    .range([0, 20]);

  const colorScale = d3.scaleLinear()
    .domain([0, d3.max(processed, d => d.count)])
    .range(["#e0f3ff", config.color]);

  svg.selectAll("circle")
    .data(processed)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.x))
    .attr("cy", d => y(d.y))
    .attr("r", d => r(d.count))
    .attr("fill", d => colorScale(d.count))
    .attr("fill-opacity", 0.7);

  addAxes(svg, x, y, config, w, h, m);
}

function heatmap(data, config, w, h, bins = 10) {
  const m = 50;

  const svg = d3.select("#container").append("svg")
    .attr("width", w)
    .attr("height", h);

  const xVals = data.map(d => +d[config.x]);
  const yVals = data.map(d => +d[config.y]);

  const isXNumeric = xVals.every(v => !isNaN(v));
  const isYNumeric = yVals.every(v => !isNaN(v));

  let processed = [];

  if (isXNumeric && isYNumeric) {
    const xBin = d3.bin()
      .domain(d3.extent(xVals))
      .thresholds(bins);

    const yBin = d3.bin()
      .domain(d3.extent(yVals))
      .thresholds(bins);

    const xBins = xBin(xVals);
    const yBins = yBin(yVals);

    xBins.forEach(xb => {
      yBins.forEach(yb => {
        const items = data.filter(d =>
          d[config.x] >= xb.x0 && d[config.x] < xb.x1 &&
          d[config.y] >= yb.x0 && d[config.y] < yb.x1
        );

        processed.push({
          x: `${Math.round(xb.x0)}–${Math.round(xb.x1)}`,
          y: `${Math.round(yb.x0)}–${Math.round(yb.x1)}`,
          value: items.length
        });
      });
    });

  } else {
    const grouped = d3.rollups(
      data,
      v => v.length,
      d => d[config.x],
      d => d[config.y]
    );

    grouped.forEach(([xKey, yGroups]) => {
      yGroups.forEach(([yKey, value]) => {
        processed.push({
          x: xKey,
          y: yKey,
          value
        });
      });
    });
  }

  const x = d3.scaleBand()
    .domain([...new Set(processed.map(d => d.x))])
    .range([m, w - m])
    .padding(0.05);

  const y = d3.scaleBand()
    .domain([...new Set(processed.map(d => d.y))])
    .range([m, h - m])
    .padding(0.05);

  const max = d3.max(processed, d => d.value);

  const colorScale = d3.scaleLinear()
    .domain([0, max / 2, max])
    .range([
      "white",
      config.color,
      "black"
    ]);

  svg.selectAll("rect")
    .data(processed)
    .enter()
    .append("rect")
    .attr("x", d => x(d.x))
    .attr("y", d => y(d.y))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => colorScale(d.value));

  addAxes(svg, x, y, config, w, h, m);
}

function boxplot(data, config, w = 700, h = 450, bins = 8) {
  const color = config.color
  const m = 50;

  const svg = d3.select("#container").append("svg")
    .attr("width", w)
    .attr("height", h);

  const xVals = data.map(d => +d[config.x]);
  const isNumericX = xVals.every(v => !isNaN(v));

  let grouped;

  if (isNumericX) {
    // bin numeric X into ranges
    const binGen = d3.bin()
      .domain(d3.extent(xVals))
      .thresholds(bins);

    const binsData = binGen(xVals);

    grouped = binsData.map(bin => {
      const items = data.filter(d =>
        d[config.x] >= bin.x0 && d[config.x] < bin.x1
      );

      return [
        `${Math.round(bin.x0)}–${Math.round(bin.x1)}`,
        items
      ];
    }).filter(d => d[1].length > 0); // remove empty bins
  } else {
    grouped = d3.groups(data, d => d[config.x]);
  }

  const x = d3.scaleBand()
    .domain(grouped.map(d => d[0]))
    .range([m, w - m])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => +d[config.y]))
    .nice()
    .range([h - m, m]);

  grouped.forEach(([key, vals]) => {
    const arr = vals.map(d => +d[config.y]).sort(d3.ascending);

    const q1 = d3.quantile(arr, 0.25);
    const med = d3.quantile(arr, 0.5);
    const q3 = d3.quantile(arr, 0.75);
    const min = d3.min(arr);
    const max = d3.max(arr);

    const cx = x(key);

    svg.append("rect")
      .attr("x", cx)
      .attr("y", y(q3))
      .attr("width", x.bandwidth())
      .attr("height", y(q1) - y(q3))
      .attr("fill", typeof color === "function" ? color(key) : color)
      .attr("fill", "#888");

    svg.append("line")
      .attr("x1", cx)
      .attr("x2", cx + x.bandwidth())
      .attr("y1", y(med))
      .attr("y2", y(med))
      .attr("stroke", "black");

    svg.append("line")
      .attr("x1", cx + x.bandwidth()/2)
      .attr("x2", cx + x.bandwidth()/2)
      .attr("y1", y(min))
      .attr("y2", y(max))
      .attr("stroke", "black");
  });

  addAxes(svg, x, y, config, w, h, m);
}