import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let cache = null;

/* ---------------- LOAD DATA ---------------- */
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

/* ---------------- FIELD RANGES ---------------- */
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

/* ---------------- LABELS ---------------- */
function labelMap(f) {
  return {
    age: "Age",
    reels_watch_time_hours: "Reels Watch Time",
    daily_screen_time_hours: "Daily Screen Time",
    sleep_hours: "Sleep Hours",
    attention_span_score: "Attention Span",
    focus_level: "Focus Level",
    task_completion_rate: "Task Completion",
    stress_level: "Stress Level",
    platform: "Platform"
  }[f] || f;
}

/* ---------------- FILTERS ---------------- */
function applyFilters(data, filters) {
  return data.filter(d =>
    filters.every(f => {
      if (!f.field || f.field === "platform") return true;
      return d[f.field] >= f.min && d[f.field] <= f.max;
    })
  );
}

/* ---------------- COLORS ---------------- */
function colorScale() {
  return d3.scaleOrdinal()
    .domain(["iOS", "Android", "Web"])
    .range(["#4e79a7", "#f28e2c", "#59a14f"]);
}

/* ---------------- AXES ---------------- */
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

/* ---------------- MAIN ---------------- */
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
  }
}

function scatter(data, config, w, h) {
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
    .attr("fill", d => colorScale()(d.platform))
    .attr("opacity", 0.7);

  addAxes(svg, x, y, config, w, h, m);
}

function bar(data, config, w, h) {
  const m = 50;

  const grouped = d3.rollups(data, v => v.length, d => d[config.x])
    .sort((a, b) => d3.ascending(a[0], b[0]));

  const svg = d3.select("#container").append("svg")
    .attr("width", w)
    .attr("height", h);

  const x = d3.scaleBand()
    .domain(grouped.map(d => d[0]))
    .range([m, w - m])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d[1])])
    .range([h - m, m]);

  svg.selectAll("rect")
    .data(grouped)
    .enter()
    .append("rect")
    .attr("x", d => x(d[0]))
    .attr("y", d => y(d[1]))
    .attr("width", x.bandwidth())
    .attr("height", d => h - m - y(d[1]))
    .attr("fill", "#4e79a7");

  addAxes(svg, x, y, { x: config.x }, w, h, m);
}

function bubble(data, config, w, h) {
  const m = 50;

  const svg = d3.select("#container").append("svg")
    .attr("width", w)
    .attr("height", h);

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => +d[config.x]))
    .range([m, w - m]);

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => +d[config.y]))
    .range([h - m, m]);

  const r = d3.scaleSqrt()
    .domain(d3.extent(data, d => +d.task_completion_rate))
    .range([3, 18]);

  svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(+d[config.x]))
    .attr("cy", d => y(+d[config.y]))
    .attr("r", d => r(+d.task_completion_rate))
    .attr("fill", "orange")
    .attr("opacity", 0.6);

  addAxes(svg, x, y, config, w, h, m);
}

function heatmap(data, config, w,h) {
  const svg = d3.select("#container").append("svg")
    .attr("width", w)
    .attr("height", h);

  const color = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, d3.max(data, d => +d.task_completion_rate)]);

  svg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => +d[config.x] * 20)
    .attr("y", d => +d[config.y] * 20)
    .attr("width", 20)
    .attr("height", 20)
    .attr("fill", d => color(+d.task_completion_rate));
}

function boxplot(data, config) {
  const w = 700, h = 450, m = 50;

  const svg = d3.select("#container").append("svg")
    .attr("width", w)
    .attr("height", h);

  const groups = d3.groups(data, d => d[config.x]);

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => +d[config.y]))
    .range([h - m, m]);

  groups.forEach(([k, vals], i) => {
    const arr = vals.map(d => +d[config.y]).sort(d3.ascending);

    const q1 = d3.quantile(arr, 0.25);
    const med = d3.quantile(arr, 0.5);
    const q3 = d3.quantile(arr, 0.75);

    svg.append("rect")
      .attr("x", i * 40 + 60)
      .attr("y", y(q3))
      .attr("width", 20)
      .attr("height", y(q1) - y(q3))
      .attr("fill", "#888");

    svg.append("line")
      .attr("x1", i * 40 + 60)
      .attr("x2", i * 40 + 80)
      .attr("y1", y(med))
      .attr("y2", y(med))
      .attr("stroke", "black");
  });
}