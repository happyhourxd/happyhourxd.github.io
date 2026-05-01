const allOptions = Array.from(
  document.querySelector("#xaxis").options
).filter(o => o.value !== "0").map(o => ({ value: o.value, label: o.text }));

const optionMap = Object.fromEntries(allOptions.map(o => [o.value, o.label]));

function updateSlider(input, cls) {
  const min = +input.min, max = +input.max, val = +input.value;
  const pct = ((val - min) / (max - min)) * 100;
  const red   = "#E24B4A";
  const track = "#D3D1C7";
  if (cls === "slider-s") {
    input.style.background = `linear-gradient(to right, ${red} 0%, ${red} ${pct}%, ${track} ${pct}%, ${track} 100%)`;
  } else {
    input.style.background = `linear-gradient(to right, ${track} 0%, ${track} ${pct}%, ${red} ${pct}%, ${red} 100%)`;
  }
}

function initSliders(root) {
  root.querySelectorAll(".slider-s, .slider-e").forEach(el => {
    const cls = el.classList.contains("slider-s") ? "slider-s" : "slider-e";
    updateSlider(el, cls);
    el.addEventListener("input", () => updateSlider(el, cls));
  });
}

function getChartedValues() {
  const vals = [document.getElementById("xaxis").value];
  const y = document.getElementById("yaxis").value;
  if (y !== "0") vals.push(y);
  return vals;
}

function getUsedFilterValues() {
  return Array.from(document.querySelectorAll("#filterTable select"))
    .map(sel => sel.value);
}

function getBlockedValues() {
  return [...getChartedValues(), ...getUsedFilterValues()];
}

function rebuildSelect(sel, currentValue, blockedValues, includeNone = false) {
  sel.innerHTML = "";
  if (includeNone) {
    const none = document.createElement("option");
    none.value = "0";
    none.textContent = "None";
    sel.appendChild(none);
  }
  allOptions.forEach(opt => {
    if (opt.value === currentValue || !blockedValues.includes(opt.value)) {
      const el = document.createElement("option");
      el.value = opt.value;
      el.textContent = opt.label;
      sel.appendChild(el);
    }
  });
  sel.value = currentValue;
  if (!sel.value || sel.value === "") sel.selectedIndex = 0;
}

function syncDropdowns() {
  const xSel = document.getElementById("xaxis");
  const ySel = document.getElementById("yaxis");
  const xVal = xSel.value;
  const yVal = ySel.value;
  const filterVals = getUsedFilterValues();
  const charted = getChartedValues();

  // xaxis — never rebuilt, always shows everything

  // yaxis — blocked only by xaxis
  rebuildSelect(ySel, yVal, [xVal], true);

  // filter rows — each blocked by charted + every other filter

  document.querySelectorAll("#filterTable select").forEach(sel => {
  const current = sel.value;
  const otherFilters = filterVals.filter(v => v !== current);
  const blocked = [...charted, ...otherFilters];

  // if this filter's value was taken by a chart axis, find next free one
  if (charted.includes(current)) {
    const next = allOptions.find(opt => !blocked.includes(opt.value));
    if (!next) { sel.closest("tr").remove(); return; }

    // full rebuild with new value as current, not just one option
    const newOtherFilters = filterVals.filter(v => v !== current && v !== next.value);
    const newBlocked = [...charted, ...newOtherFilters];
    sel.innerHTML = "";
    allOptions.forEach(opt => {
      if (opt.value === next.value || !newBlocked.includes(opt.value)) {
        const el = document.createElement("option");
        el.value = opt.value;
        el.textContent = opt.label;
        sel.appendChild(el);
      }
    });
    sel.value = next.value;
    return;
  }

  sel.innerHTML = "";
  allOptions.forEach(opt => {
    if (opt.value === current || !blocked.includes(opt.value)) {
      const el = document.createElement("option");
      el.value = opt.value;
      el.textContent = opt.label;
      sel.appendChild(el);
    }
  });
  sel.value = current;
});
}

function addFilterListeners(row) {
  row.querySelector("select").addEventListener("change", syncDropdowns);
  initSliders(row);
  const removeBtn = row.querySelector(".removeFilter");
  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      row.remove();
      syncDropdowns();
    });
  }
}

document.getElementById("addFilter").addEventListener("click", () => {
  const blocked = getBlockedValues();
  const next = allOptions.find(opt => !blocked.includes(opt.value));
  if (!next) return;

  const row = document.createElement("tr");
  row.innerHTML = `
    <td><select></select></td>
    <td><input type="range" min="0" max="100" value="0"   class="slider-s"></td>
    <td><input type="range" min="0" max="100" value="100" class="slider-e"></td>
    <td><button class="removeFilter">-</button></td>
  `;
  document.getElementById("filterTable").appendChild(row);

  const newSel = row.querySelector("select");
  const el = document.createElement("option");
  el.value = next.value;
  el.textContent = next.label;
  newSel.appendChild(el);
  newSel.value = next.value;

  addFilterListeners(row);
  syncDropdowns();
});

document.getElementById("yaxis").addEventListener("change", syncDropdowns);

// setChart reads option values and passes them to window.setChart from mjs
const container = document.getElementById("container");

document.getElementById("refresh").addEventListener("click", () => {
  const svg = window.setChart();
  container.innerHTML = "";
  container.append((svg ?? window.invalidChart()).node());
});

// init — don't call syncDropdowns before first row listeners are attached
const firstFilterRow = document.querySelector("#filterTable tr:nth-child(2)");
if (firstFilterRow) addFilterListeners(firstFilterRow);
initSliders(document);
syncDropdowns();