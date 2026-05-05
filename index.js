import { drawChart, getFieldRanges } from "./chart.mjs";

const chartType = document.getElementById("chartType");
const xaxis = document.getElementById("xaxis");
const yaxis = document.getElementById("yaxis");
const refresh = document.getElementById("refresh");
const filterTable = document.getElementById("filterTable");


const FIELDS = {
  age: { label: "Age", axis: "1" },
  reels_watch_time_hours: { label: "Watch Time", axis: "2" },
  daily_screen_time_hours: { label: "Daily Screen Time", axis: "3" },
  sleep_hours: { label: "Sleep Hours", axis: "4" },
  attention_span_score: { label: "Attention Span", axis: "5" },
  focus_level: { label: "Focus Level", axis: "6" },
  task_completion_rate: { label: "Task Completion Rate", axis: "7" },
  stress_level: { label: "Stress Level", axis: "8" },
  platform: { label: "Platform", axis: "9" }
};

const axisToField = Object.fromEntries(
  Object.entries(FIELDS).map(([k, v]) => [v.axis, k])
);

let used = new Set();
let ranges = null;

async function ensureRanges() {
  if (!ranges) ranges = await getFieldRanges();
}

function resolveField(select) {
  return axisToField[select.value];
}

function syncAxes() {
  const x = xaxis.value;
  const y = yaxis.value;

  [...xaxis.options].forEach(o => {
    o.disabled = o.value === y;
  });

  [...yaxis.options].forEach(o => {
    o.disabled = o.value === x || chartType.value === "2";
  });
}

function buildOptions(current = null) {
  const x = resolveField(xaxis);
  const y = resolveField(yaxis);

  return Object.entries(FIELDS)
    .map(([key, obj]) => {
      const disabled =
        (used.has(key) && key !== current) ||
        key === x ||
        key === y;

      return `
        <option value="${obj.axis}"
          ${key === current ? "selected" : ""}
          ${disabled ? "disabled" : ""}>
          ${obj.label}
        </option>
      `;
    })
    .join("");
}

function applyRange(row, field) {
  if (!ranges || !ranges[field]) return;

  const [min, max] = ranges[field];

  const minSlider = row.querySelector(".min");
  const maxSlider = row.querySelector(".max");

  minSlider.min = min;
  minSlider.max = max;
  minSlider.value = min;

  maxSlider.min = min;
  maxSlider.max = max;
  maxSlider.value = max;
}

async function createRow(field = null, showAdd = false, showRemove = true) {
  await ensureRanges();

  const row = document.createElement("tr");

  row.innerHTML = `
    <td>
      <select>
        ${buildOptions(field)}
      </select>
    </td>

    <td><input type="range" class="min"></td>
    <td><input type="range" class="max"></td>

    <td>
      ${showAdd ? `<button class="add">+</button>` : ""}
      ${showRemove ? `<button class="remove">−</button>` : ""}
    </td>
  `;

  const select = row.querySelector("select");
  const addBtn = row.querySelector(".add");
  const removeBtn = row.querySelector(".remove");

  let currentField = field || resolveField(select);

  if (!ranges[currentField]) {
    console.warn("Invalid field:", currentField);
    currentField = Object.keys(ranges)[0];
  }

  used.add(currentField);
  applyRange(row, currentField);

  select.addEventListener("change", () => {
    const newField = resolveField(select);

    if (!ranges[newField]) return;
    if (used.has(newField) && newField !== currentField) return;

    used.delete(currentField);
    currentField = newField;
    used.add(newField);

    applyRange(row, newField);
    syncAxes();
  });

  if (removeBtn) {
    removeBtn.onclick = () => {
      used.delete(currentField);
      row.remove();
      syncAxes();
    };
  }

  if (addBtn) {
    addBtn.onclick = async () => {
      const newRow = await createRow(null, false, true);
      filterTable.appendChild(newRow);

      const sel = newRow.querySelector("select");
      const f = resolveField(sel);

      if (ranges[f]) applyRange(newRow, f);

      syncAxes();
    };
  }

  return row;
}

async function initFilters() {
  await ensureRanges();

  filterTable.innerHTML = `
    <tr>
      <th>Filter</th>
      <th>Start</th>
    </tr>
  `;

  used.clear();

  const x = resolveField(xaxis);
  const y = chartType.value === "2" ? null : resolveField(yaxis);

  filterTable.appendChild(await createRow(x, true, false));

  if (y) {
    filterTable.appendChild(await createRow(y, false, true));
  }

  syncAxes();
}

function updateUI() {
  const isBar = chartType.value === "2";

  yaxis.disabled = isBar;
  yaxis.style.opacity = isBar ? 0.4 : 1;
}

// Show Chart
refresh.onclick = async () => {
  const rows = [...filterTable.querySelectorAll("tr")].slice(1);

  const filters = rows.map(r => ({
    field: resolveField(r.querySelector("select")),
    min: +r.querySelector(".min").value,
    max: +r.querySelector(".max").value
  }));

  await drawChart({
    type: chartType.value,
    x: resolveField(xaxis),
    y: chartType.value === "2" ? null : resolveField(yaxis),
    filters
  });
};

chartType.onchange = () => {
  updateUI();
  initFilters();
};

xaxis.onchange = () => initFilters();
yaxis.onchange = () => initFilters();

//Init
updateUI();
initFilters();
syncAxes();