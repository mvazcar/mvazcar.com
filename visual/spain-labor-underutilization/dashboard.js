"use strict";

const DATASETS = {
  felgueroso: {
    quarterly: "data/derived/felgueroso_quarterly.csv",
    annual: "data/derived/felgueroso_annual.csv",
  },
  bls: {
    quarterly: "data/derived/bls_quarterly.csv",
    annual: "data/derived/bls_annual.csv",
  },
};

const SERIES = {
  felgueroso: ["u3", "u4", "u5", "u6"],
  bls: ["u1", "u2", "u3", "u4", "u5", "u6"],
};

const COLORS = {
  u1: "#999999",
  u2: "#a65628",
  u3: "#ff7f00",
  u4: "#377eb8",
  u5: "#984ea3",
  u6: "#4daf4a",
};

const LABELS = {
  felgueroso: {
    u3: "Total unemployed (official rate)",
    u4: "U3 + inactive for economic reasons",
    u5: "U4 + other inactive people who want work",
    u6: "U5 + involuntary part-time workers",
  },
  bls: {
    u1: "Unemployed for 15 weeks or longer",
    u2: "Job losers + temporary-job completers",
    u3: "Total unemployed (official rate)",
    u4: "U3 + discouraged workers",
    u5: "U4 + other marginally attached workers",
    u6: "U5 + involuntary part-time workers",
  },
};

const CONSTRUCTION = {
  felgueroso: "U4 adds available inactive people who did not search for economic reasons; U5 adds all available inactive people who want work; U6 adds involuntary part-time workers to the numerator only.",
  bls: "This stricter BLS-style mapping reports U1 and U4–U6 as transparent estimates or proxies wherever public EPA variables cannot reproduce a BLS screen exactly.",
};

const LEVEL_INTERPRETATION = "U3 is the official unemployment rate. U4–U6 progressively include forms of labor underutilization excluded from U3; they are broader indicators, not corrections to an incorrectly measured unemployment rate.";
const VALID_SERIES = new Set(Object.values(SERIES).flat());
const params = new URLSearchParams(window.location.search);
const dataCache = new Map();

const state = {
  family: params.get("family") || "felgueroso",
  frequency: params.get("frequency") || "quarterly",
  change: params.get("change") || "level",
  view: params.get("view") || "chart",
  hidden: new Set((params.get("hide") || "").split(",").filter((series) => VALID_SERIES.has(series))),
};

let currentRows = [];
let currentPath = "";

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function number(value) {
  return value === "" || value === undefined ? null : Number(value);
}

function completeYear(row) {
  return String(row.complete_year).toLowerCase() === "true";
}

function displayPeriod(row) {
  if (state.frequency === "annual" && !completeYear(row)) {
    return `${row.period} YTD`;
  }
  return row.period;
}

function changeLag() {
  if (state.change === "level") return 0;
  if (state.change === "qoq") return 1;
  return state.frequency === "quarterly" ? 4 : 1;
}

function seriesValues(rows, series) {
  const values = rows.map((row) => number(row[series]));
  const lag = changeLag();
  if (lag === 0) return values;

  return values.map((value, index) => {
    const previous = values[index - lag];
    if (value === null || previous === null || previous === undefined) return null;
    if (state.frequency === "annual" && !completeYear(rows[index])) return null;
    return value - previous;
  });
}

function valuesBySeries(rows) {
  return Object.fromEntries(
    SERIES[state.family].map((series) => [series, seriesValues(rows, series)]),
  );
}

function formatValue(value) {
  if (state.change === "level") return `${value.toFixed(2)}%`;
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return `${normalized >= 0 ? "+" : ""}${normalized.toFixed(2)} pp`;
}

function changeDescription() {
  if (state.change === "level") return "level";
  return state.change === "qoq" ? "quarter-on-quarter change" : "year-on-year change";
}

function interpretationText() {
  if (state.change === "level") return LEVEL_INTERPRETATION;
  const comparison = state.change === "qoq"
    ? "Quarter-on-quarter compares adjacent quarters."
    : state.frequency === "quarterly"
      ? "Year-on-year compares each quarter with the same quarter one year earlier."
      : "Year-on-year compares adjacent complete calendar years; incomplete YTD years are omitted.";
  return `${LEVEL_INTERPRETATION} Changes are arithmetic differences in percentage points, not percentage growth rates. ${comparison}`;
}

function latestIndex(values) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (values[index] !== null) return index;
  }
  return -1;
}

function latestComparableIndex(rows, seriesMap, selectedSeries) {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (selectedSeries.some((series) => seriesMap[series][index] !== null)) return index;
  }
  return -1;
}

function availableSeries(seriesMap) {
  return SERIES[state.family].filter((series) => seriesMap[series].some((value) => value !== null));
}

function selectedSeries(seriesMap) {
  return availableSeries(seriesMap).filter((series) => !state.hidden.has(series));
}

function trace(series, rows, seriesMap) {
  return {
    x: rows.map(displayPeriod),
    y: seriesMap[series],
    customdata: rows.map((row) => row.period),
    name: series.toUpperCase(),
    mode: "lines",
    connectgaps: false,
    line: {color: COLORS[series], width: 2.8},
    hovertemplate: state.change === "level"
      ? `<b>${series.toUpperCase()}</b> %{y:.2f}%<extra></extra>`
      : `<b>${series.toUpperCase()}</b> %{y:+.2f} pp<extra></extra>`,
  };
}

function u1Band(rows) {
  const x = rows.map(displayPeriod);
  return [
    {
      x,
      y: rows.map((row) => number(row.u1_lower_bound)),
      mode: "lines",
      line: {width: 0},
      hoverinfo: "skip",
      showlegend: false,
    },
    {
      x,
      y: rows.map((row) => number(row.u1_upper_bound)),
      mode: "lines",
      line: {width: 0},
      fill: "tonexty",
      fillcolor: "rgba(153,153,153,0.15)",
      hoverinfo: "skip",
      showlegend: false,
    },
  ];
}

function annualTickSettings(rows) {
  const periods = rows.map(displayPeriod);
  const indices = periods.map((_, index) => index).filter((index) => index % 2 === 0);
  if (indices.at(-1) !== periods.length - 1) indices.push(periods.length - 1);
  return {
    tickvals: indices.map((index) => periods[index]),
    ticktext: indices.map((index) => periods[index]),
  };
}

function chartTitle() {
  const definition = state.family === "felgueroso" ? "Felgueroso/Fedea definitions" : "BLS-style definitions";
  return `${definition} · ${state.frequency} · ${changeDescription()}`;
}

function renderSeriesControls(rows, seriesMap) {
  const control = document.getElementById("series-control");
  control.replaceChildren();
  const available = new Set(availableSeries(seriesMap));

  for (const series of SERIES[state.family]) {
    const isAvailable = available.has(series);
    const isSelected = isAvailable && !state.hidden.has(series);
    const valueIndex = latestIndex(seriesMap[series]);
    const value = valueIndex >= 0 ? formatValue(seriesMap[series][valueIndex]) : "Not available";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "series-toggle";
    button.dataset.series = series;
    button.disabled = !isAvailable;
    button.setAttribute("aria-pressed", String(isSelected));
    button.setAttribute("aria-label", isAvailable
      ? `${series.toUpperCase()}, ${LABELS[state.family][series]}, ${isSelected ? "shown" : "hidden"}, latest ${value}`
      : `${series.toUpperCase()}, ${LABELS[state.family][series]}, not available in these public microdata`);
    button.title = LABELS[state.family][series];
    button.style.setProperty("--series-color", COLORS[series]);

    const swatch = document.createElement("span");
    swatch.className = "series-swatch";
    swatch.setAttribute("aria-hidden", "true");
    const code = document.createElement("span");
    code.className = "series-code";
    code.textContent = series.toUpperCase();
    const name = document.createElement("span");
    name.className = "series-name";
    name.textContent = LABELS[state.family][series];
    const latest = document.createElement("span");
    latest.className = "series-value";
    latest.textContent = value;

    button.append(swatch, code, name, latest);
    control.append(button);
  }

  document.getElementById("show-all-lines").disabled = [...available].every((series) => !state.hidden.has(series));
}

function renderTable(rows, seriesMap, selected) {
  const table = document.getElementById("data-table");
  table.replaceChildren();

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const periodHeader = document.createElement("th");
  periodHeader.scope = "col";
  periodHeader.textContent = "Period";
  headerRow.append(periodHeader);

  for (const series of selected) {
    const header = document.createElement("th");
    header.scope = "col";
    header.textContent = `${series.toUpperCase()} (${state.change === "level" ? "%" : "pp"})`;
    header.title = LABELS[state.family][series];
    headerRow.append(header);
  }
  thead.append(headerRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  if (selected.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 1;
    cell.textContent = "Select at least one measure above.";
    row.append(cell);
    tbody.append(row);
  } else {
    const indices = rows
      .map((_, index) => index)
      .filter((index) => selected.some((series) => seriesMap[series][index] !== null))
      .reverse();
    for (const index of indices) {
      const row = document.createElement("tr");
      const period = document.createElement("td");
      period.textContent = displayPeriod(rows[index]);
      row.append(period);
      for (const series of selected) {
        const cell = document.createElement("td");
        const value = seriesMap[series][index];
        cell.textContent = value === null ? "—" : formatValue(value);
        row.append(cell);
      }
      tbody.append(row);
    }
  }
  table.append(tbody);
}

function emptySelectionAnnotation() {
  return {
    xref: "paper",
    yref: "paper",
    x: 0.5,
    y: 0.5,
    text: "Select at least one measure above",
    showarrow: false,
    font: {color: "#5f6c76", size: 15},
  };
}

async function renderPlot(rows, seriesMap, selected) {
  const traces = [];
  if (state.family === "bls" && state.change === "level" && selected.includes("u1")) {
    traces.push(...u1Band(rows));
  }
  traces.push(...selected.map((series) => trace(series, rows, seriesMap)));

  const periods = rows.map(displayPeriod);
  const breakPeriod = state.frequency === "quarterly" ? "2021-Q1" : periods.indexOf("2021");
  const breakIsPresent = state.frequency === "quarterly"
    ? periods.includes("2021-Q1")
    : breakPeriod >= 0;
  const ticks = state.frequency === "annual" ? annualTickSettings(rows) : null;
  const showingChanges = state.change !== "level";

  const xaxis = {
    type: "category",
    categoryorder: "array",
    categoryarray: periods,
    tickangle: state.frequency === "quarterly" ? -45 : 0,
    tickfont: {color: "#5f6c76", size: 11},
    ticks: "outside",
    tickcolor: "#a9b4bc",
    showline: true,
    linecolor: "#a9b4bc",
    showgrid: false,
    zeroline: false,
    fixedrange: false,
    showspikes: true,
    spikecolor: "#9aa7b0",
    spikedash: "dot",
    spikemode: "across",
    spikesnap: "cursor",
  };
  if (ticks) {
    Object.assign(xaxis, {tickmode: "array", tickvals: ticks.tickvals, ticktext: ticks.ticktext});
  } else {
    Object.assign(xaxis, {tickmode: "auto", nticks: 24});
  }

  const shapes = [];
  const annotations = [];
  if (breakIsPresent) {
    shapes.push({
      type: "line",
      xref: "x",
      yref: "paper",
      x0: breakPeriod,
      x1: breakPeriod,
      y0: 0,
      y1: 1,
      line: {color: "#7f8b94", width: 1.2, dash: "dash"},
    });
    annotations.push({
      xref: "x",
      yref: "paper",
      x: breakPeriod,
      y: 0.98,
      text: "EPA-2021 break",
      showarrow: false,
      xanchor: "left",
      xshift: 7,
      font: {color: "#5f6c76", size: 11},
    });
  }
  if (selected.length === 0) annotations.push(emptySelectionAnnotation());

  const layout = {
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#ffffff",
    font: {family: "Helvetica, Arial, sans-serif", color: "#1d2f3f", size: 13},
    margin: {l: 58, r: 16, t: 28, b: state.frequency === "quarterly" ? 92 : 66},
    hovermode: "x unified",
    hoverdistance: 80,
    spikedistance: -1,
    hoverlabel: {
      bgcolor: "#ffffff",
      bordercolor: "#a9b4bc",
      font: {color: "#1d2f3f", family: "Helvetica, Arial, sans-serif", size: 12},
      namelength: -1,
    },
    showlegend: false,
    xaxis,
    yaxis: {
      title: {text: showingChanges ? "Change (percentage points)" : "Share (%)", font: {size: 12, color: "#5f6c76"}, standoff: 8},
      rangemode: showingChanges ? "normal" : "tozero",
      ticksuffix: showingChanges ? " pp" : "%",
      tickfont: {color: "#5f6c76", size: 11},
      showgrid: true,
      gridcolor: "#d9e0e5",
      gridwidth: 1,
      zeroline: showingChanges,
      zerolinecolor: "#7f8b94",
      zerolinewidth: 1,
      fixedrange: false,
    },
    shapes,
    annotations,
  };

  await Plotly.react("chart", traces, layout, {
    responsive: true,
    displaylogo: false,
    displayModeBar: false,
    scrollZoom: false,
    toImageButtonOptions: {format: "png", filename: `${state.family}-${state.frequency}-${state.change}`},
  });
}

function latestText(rows, seriesMap, selected) {
  if (selected.length === 0) return "No measures selected";
  const index = latestComparableIndex(rows, seriesMap, selected);
  if (index < 0) return "No comparable observation";
  const values = selected
    .filter((series) => seriesMap[series][index] !== null)
    .map((series) => `${series.toUpperCase()} ${formatValue(seriesMap[series][index])}`)
    .join(" · ");
  return `${displayPeriod(rows[index])} · ${values}`;
}

async function renderDashboard(rows) {
  const seriesMap = valuesBySeries(rows);
  const selected = selectedSeries(seriesMap);
  const latest = latestComparableIndex(rows, seriesMap, availableSeries(seriesMap));
  const title = chartTitle();

  renderSeriesControls(rows, seriesMap);
  renderTable(rows, seriesMap, selected);
  await renderPlot(rows, seriesMap, selected);

  document.getElementById("plot-title").textContent = title;
  document.getElementById("table-title").textContent = `${title}. Newest comparable period first.`;
  document.getElementById("latest-period").textContent = latest >= 0 ? `Latest shown: ${displayPeriod(rows[latest])}` : "No comparable data";
  document.getElementById("latest-values").textContent = latestText(rows, seriesMap, selected);
  document.getElementById("download-link").href = currentPath;
  document.getElementById("construction-note").textContent = CONSTRUCTION[state.family];
  document.getElementById("interpretation-note").textContent = interpretationText();
  updateView();
}

async function loadRows(path) {
  if (dataCache.has(path)) return dataCache.get(path);
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  const rows = parseCsv(await response.text());
  dataCache.set(path, rows);
  return rows;
}

async function draw() {
  const status = document.getElementById("chart-status");
  status.textContent = "";
  currentPath = DATASETS[state.family][state.frequency];

  try {
    currentRows = await loadRows(currentPath);
    await renderDashboard(currentRows);
  } catch (error) {
    status.textContent = `${error.message}. Serve the repository through HTTP rather than opening index.html directly.`;
  }
}

function updateUrl() {
  const query = new URLSearchParams({
    family: state.family,
    frequency: state.frequency,
    change: state.change,
    view: state.view,
  });
  if (state.hidden.size > 0) query.set("hide", [...state.hidden].sort().join(","));
  window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
}

function updateView() {
  document.querySelectorAll(".view-tab").forEach((button) => {
    const selected = button.dataset.view === state.view;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  document.getElementById("chart-panel").hidden = state.view !== "chart";
  document.getElementById("table-panel").hidden = state.view !== "table";
  if (state.view === "chart" && window.Plotly) {
    window.requestAnimationFrame(() => Plotly.Plots.resize(document.getElementById("chart")));
  }
}

function updateControls() {
  for (const [control, value] of [
    ["family-control", state.family],
    ["frequency-control", state.frequency],
    ["change-control", state.change],
  ]) {
    document.querySelectorAll(`#${control} button`).forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.value === value));
    });
  }
  document.querySelector("#change-control [data-value='qoq']").hidden = state.frequency === "annual";
  updateView();
}

function bindControl(id, key) {
  document.getElementById(id).addEventListener("click", (event) => {
    const button = event.target.closest("button[data-value]");
    if (!button || state[key] === button.dataset.value) return;
    state[key] = button.dataset.value;
    if (key === "frequency" && state.frequency === "annual" && state.change === "qoq") {
      state.change = "yoy";
    }
    updateControls();
    updateUrl();
    void draw();
  });
}

function bindViewTabs() {
  const tabList = document.querySelector(".view-tabs");
  tabList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view]");
    if (!button || state.view === button.dataset.view) return;
    state.view = button.dataset.view;
    updateView();
    updateUrl();
  });

  tabList.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = [...tabList.querySelectorAll("button[data-view]")];
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    event.preventDefault();
    const target = event.key === "Home"
      ? tabs[0]
      : event.key === "End"
        ? tabs.at(-1)
        : tabs[(current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    target.focus();
    target.click();
  });
}

function bindSeriesControls() {
  document.getElementById("series-control").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-series]");
    if (!button || button.disabled) return;
    const series = button.dataset.series;
    if (state.hidden.has(series)) state.hidden.delete(series);
    else state.hidden.add(series);
    updateUrl();
    void renderDashboard(currentRows);
  });

  document.getElementById("show-all-lines").addEventListener("click", () => {
    for (const series of SERIES[state.family]) state.hidden.delete(series);
    updateUrl();
    void renderDashboard(currentRows);
  });
}

function downloadPng() {
  Plotly.downloadImage(document.getElementById("chart"), {
    format: "png",
    width: 1400,
    height: 850,
    scale: 1,
    filename: `${state.family}-${state.frequency}-${state.change}`,
  });
}

async function copyLink() {
  const button = document.getElementById("copy-link");
  updateUrl();
  try {
    await navigator.clipboard.writeText(window.location.href);
  } catch {
    const input = document.createElement("textarea");
    input.value = window.location.href;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
  button.textContent = "Copied";
  window.setTimeout(() => { button.textContent = "Copy link"; }, 1400);
}

if (!DATASETS[state.family]) state.family = "felgueroso";
if (!DATASETS[state.family][state.frequency]) state.frequency = "quarterly";
if (!["level", "qoq", "yoy"].includes(state.change)) state.change = "level";
if (!["chart", "table"].includes(state.view)) state.view = "chart";
if (state.frequency === "annual" && state.change === "qoq") state.change = "yoy";

bindControl("family-control", "family");
bindControl("frequency-control", "frequency");
bindControl("change-control", "change");
bindViewTabs();
bindSeriesControls();
document.getElementById("download-png").addEventListener("click", downloadPng);
document.getElementById("copy-link").addEventListener("click", () => { void copyLink(); });
updateControls();
updateUrl();
void draw();
