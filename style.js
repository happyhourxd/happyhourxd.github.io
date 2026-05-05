function styleRangeFilters() {
  const rows = document.querySelectorAll("#filterTable tr");

  rows.forEach(row => {
    const minSlider = row.querySelector(".min");
    const maxSlider = row.querySelector(".max");

    if (!minSlider || !maxSlider) return;
    if (minSlider.dataset.styled) return;

    minSlider.dataset.styled = "true";
    maxSlider.dataset.styled = "true";

    /* --- WRAPPER (stable layout container) --- */
    const wrapper = document.createElement("div");
    wrapper.className = "range-wrapper";

    minSlider.parentNode.insertBefore(wrapper, minSlider);
    wrapper.appendChild(minSlider);
    wrapper.appendChild(maxSlider);

    /* --- LABELS --- */
    const minLabel = document.createElement("div");
    const maxLabel = document.createElement("div");

    minLabel.className = "range-label";
    maxLabel.className = "range-label";

    wrapper.appendChild(minLabel);
    wrapper.appendChild(maxLabel);

    function update() {
      const min = Number(minSlider.min);
      const max = Number(minSlider.max);

      const vMin = Number(minSlider.value);
      const vMax = Number(maxSlider.value);

      const range = max - min;

      const start = ((vMin - min) / range) * 100;
      const end = ((vMax - min) / range) * 100;

      const s = Math.max(0, Math.min(100, start));
      const e = Math.max(0, Math.min(100, end));

      const gradient = `
        linear-gradient(
          to right,
          #e74c3c 0%,
          #e74c3c ${s}%,
          #2ecc71 ${s}%,
          #2ecc71 ${e}%,
          #e74c3c ${e}%,
          #e74c3c 100%
        )
      `;

      minSlider.style.background = gradient;
      maxSlider.style.background = gradient;

      minLabel.textContent = vMin;
      maxLabel.textContent = vMax;

      minLabel.style.left = `${s}%`;
      maxLabel.style.left = `${e}%`;
    }

    minSlider.addEventListener("input", update);
    maxSlider.addEventListener("input", update);

    update();
  });
}

/* run once + future rows */
styleRangeFilters();

new MutationObserver(() => {
  styleRangeFilters();
}).observe(document.getElementById("filterTable"), {
  childList: true,
  subtree: true
});