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
    u3: "U3 · Total unemployed (official rate)",
    u4: "U4 · U3 + inactive for economic reasons",
    u5: "U5 · U4 + other inactive people who want work",
    u6: "U6 · U5 + involuntary part-time workers",
  },
  bls: {
    u1: "U1 · Unemployed 15+ weeks",
    u2: "U2 · Job losers + temporary-job completers",
    u3: "U3 · Total unemployed (official rate)",
    u4: "U4 · U3 + discouraged workers",
    u5: "U5 · U4 + other marginally attached workers",
    u6: "U6 · U5 + involuntary part-time workers",
  },
};

const CONSTRUCTION = {
  felgueroso: "U4 adds available inactive people who did not search for economic reasons; U5 adds all available inactive people who want work; U6 adds involuntary part-time workers to the numerator only.",
  bls: "This stricter BLS-style mapping reports U1 and U4–U6 as transparent estimates or proxies wherever public EPA variables cannot reproduce a BLS screen exactly.",
};

const LEVEL_INTERPRETATION = "U3 is the official unemployment rate. U4–U6 progressively include forms of labor underutilization excluded from U3; they are broader indicators, not corrections to an incorrectly measured unemployment rate.";

const state = {
  family: new URLSearchParams(window.location.search).get("family") || "felgueroso",
  frequency: new URLSearchParams(window.location.search).get("frequency") || "quarterly",
  change: new URLSearchParams(window.location.search).get("change") || "level",
};

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

function formatValue(value) {
  if (state.change === "level") return `${value.toFixed(2)}%`;
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return `${normalized >= 0 ? "+" : ""}${normalized.toFixed(2)} pp`;
}

function changeDescription() {
  if (state.change === "level") return "";
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

function trace(series, rows) {
  return {
    x: rows.map(displayPeriod),
    y: seriesValues(rows, series),
    customdata: rows.map((row) => row.period),
    name: LABELS[state.family][series],
    mode: "lines",
    connectgaps: false,
    line: {color: COLORS[series], width: 3.2},
    legendgroup: series,
    hovertemplate: state.change === "level"
      ? "%{y:.2f}%<extra></extra>"
      : "%{y:+.2f} pp<extra></extra>",
  };
}

function u1Band(rows) {
  const x = rows.map(displayPeriod);
  const lower = {
    x,
    y: rows.map((row) => number(row.u1_lower_bound)),
    mode: "lines",
    line: {width: 0},
    hoverinfo: "skip",
    showlegend: false,
    legendgroup: "u1",
  };
  const upper = {
    x,
    y: rows.map((row) => number(row.u1_upper_bound)),
    mode: "lines",
    line: {width: 0},
    fill: "tonexty",
    fillcolor: "rgba(153,153,153,0.14)",
    hoverinfo: "skip",
    showlegend: false,
    legendgroup: "u1",
  };
  return [lower, upper];
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

function latestText(rows) {
  const valuesBySeries = Object.fromEntries(
    SERIES[state.family].map((series) => [series, seriesValues(rows, series)]),
  );
  let index = rows.length - 1;
  while (index >= 0 && SERIES[state.family].every((series) => valuesBySeries[series][index] === null)) {
    index -= 1;
  }
  if (index < 0) return "No comparable observation";

  const row = rows[index];
  const values = SERIES[state.family]
    .filter((series) => valuesBySeries[series][index] !== null)
    .map((series) => `${series.toUpperCase()} ${formatValue(valuesBySeries[series][index])}`)
    .join(" · ");
  return `${displayPeriod(row)} · ${values}`;
}

async function draw() {
  const status = document.getElementById("chart-status");
  status.textContent = "";
  const path = DATASETS[state.family][state.frequency];

  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load ${path}`);
    const rows = parseCsv(await response.text());
    const traces = [];
    if (state.family === "bls" && state.change === "level") traces.push(...u1Band(rows));
    traces.push(...SERIES[state.family].map((series) => trace(series, rows)));

    const periods = rows.map(displayPeriod);
    // Plotly treats a numeric-looking category in a shape as a coordinate.
    const breakPeriod = state.frequency === "quarterly"
      ? "2021-Q1"
      : periods.indexOf("2021");
    const ticks = state.frequency === "annual" ? annualTickSettings(rows) : null;
    const title = state.family === "felgueroso"
      ? "Felgueroso-style labor-underutilization measures"
      : "BLS-style measures of labor underutilization";

    const view = changeDescription();
    const chartTitle = `${title} — Spain (${state.frequency}${view ? `, ${view}` : ""})`;
    document.getElementById("plot-title").textContent = chartTitle;

    const xaxis = {
      type: "category",
      categoryorder: "array",
      categoryarray: periods,
      tickangle: -55,
      showgrid: true,
      gridcolor: "#d9d9d9",
      zeroline: false,
      fixedrange: false,
    };
    if (ticks) {
      Object.assign(xaxis, {tickmode: "array", tickvals: ticks.tickvals, ticktext: ticks.ticktext});
    } else {
      Object.assign(xaxis, {tickmode: "auto", nticks: 24});
    }

    const showingChanges = state.change !== "level";

    const layout = {
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#ffffff",
      font: {family: "Helvetica, Arial, sans-serif", color: "#252525", size: 14},
      margin: {l: 68, r: 24, t: 42, b: 150},
      hovermode: "x unified",
      hoverlabel: {bgcolor: "#ffffff", bordercolor: "#969696", font: {color: "#252525"}},
      xaxis,
      yaxis: {
        title: {text: showingChanges ? "Change (percentage points)" : "Percent"},
        rangemode: showingChanges ? "normal" : "tozero",
        ticksuffix: showingChanges ? " pp" : "%",
        showgrid: true,
        gridcolor: "#d9d9d9",
        zeroline: showingChanges,
        zerolinecolor: "#666666",
        zerolinewidth: 1,
        fixedrange: false,
      },
      legend: {
        orientation: "h",
        x: 0,
        xanchor: "left",
        y: -0.23,
        yanchor: "top",
        traceorder: "normal",
        groupclick: "togglegroup",
        font: {size: 13},
      },
      shapes: [{
        type: "line",
        xref: "x",
        yref: "paper",
        x0: breakPeriod,
        x1: breakPeriod,
        y0: 0,
        y1: 1,
        line: {color: "#666666", width: 1.5, dash: "dash"},
      }],
      annotations: [{
        xref: "x",
        yref: "paper",
        x: breakPeriod,
        y: 0.98,
        text: "EPA-2021 break",
        showarrow: false,
        xanchor: "left",
        xshift: 8,
        font: {color: "#666666", size: 13},
      }],
    };

    await Plotly.react("chart", traces, layout, {
      responsive: true,
      displaylogo: false,
      scrollZoom: false,
      modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d"],
      toImageButtonOptions: {format: "png", filename: `${state.family}-${state.frequency}-${state.change}`},
    });

    document.getElementById("latest-values").textContent = latestText(rows);
    document.getElementById("download-link").href = path;
    document.getElementById("construction-note").textContent = CONSTRUCTION[state.family];
    document.getElementById("interpretation-note").textContent = interpretationText();
  } catch (error) {
    status.textContent = `${error.message}. Serve the repository through HTTP rather than opening index.html directly.`;
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
    const query = new URLSearchParams(state);
    window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
    draw();
  });
}

if (!DATASETS[state.family]) state.family = "felgueroso";
if (!DATASETS[state.family][state.frequency]) state.frequency = "quarterly";
if (!["level", "qoq", "yoy"].includes(state.change)) state.change = "level";
if (state.frequency === "annual" && state.change === "qoq") state.change = "yoy";
bindControl("family-control", "family");
bindControl("frequency-control", "frequency");
bindControl("change-control", "change");
updateControls();
draw();
