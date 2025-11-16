import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "https://eysofbxczoaesihxpelb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5c29mYnhjem9hZXNpaHhwZWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjM4MjIsImV4cCI6MjA3ODYzOTgyMn0.X4Nec16yXjcrQtpUzAlkwJDgQKHKz8lqU4WF7kjp2KU"
);

// =========================
// REALTIME LISTENER
// =========================
const channel = supabase.channel("resp-channel", {
  config: {
    broadcast: { self: true },
    presence: { key: "dashboard" }
  }
});

channel
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "responses"
    },
    payload => {
      console.log("Realtime data masuk:", payload);
      loadData(true);
    }
  )
  .subscribe((status) => {
    console.log("Realtime status:", status);
  });


// =========================
// LOAD AWAL
// =========================
loadData(false);


// =========================
// LOAD DATA FROM SUPABASE
// =========================
async function loadData(animate) {
  const { data, error } = await supabase
    .from("responses")
    .select("*")
    .order("id", { ascending: false })
    .limit(5);

  if (error) return console.error(error);

  updateTable(data, animate);
  updateCharts(data);
}


// =========================
//  UPDATE TABLE + ANIMASI
// =========================
function updateTable(rows, animate) {
  const tbody = document.getElementById("data-body");

  // Data terbaru ada di bawah → reverse
  const ordered = rows.slice().reverse();

  tbody.innerHTML = "";

  ordered.forEach((r, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.name}</td>
      <td>${r.dunlop_speedtest}</td>
      <td>${r.komp_speedtest}</td>
      <td>${r.dunlop_comfort}</td>
      <td>${r.komp_comfort}</td>
      <td>${r.dunlop_noise}</td>
      <td>${r.komp_noise}</td>
    `;

    // 🔥 ANIMASI “NYUNDUL” (data baru naik dari bawah)
    if (animate && index === ordered.length - 1) {
      tr.style.animation = "nyundul 0.55s ease-out";
    }

    tbody.appendChild(tr);
  });
}


// =========================
// UPDATE CHARTS
// =========================
function updateCharts(rows) {

  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

  const dSpeed = avg(rows.map(r => r.dunlop_speedtest));
  const kSpeed = avg(rows.map(r => r.komp_speedtest));

  const dComfort = avg(rows.map(r => r.dunlop_comfort));
  const kComfort = avg(rows.map(r => r.komp_comfort));

  const dNoise = avg(rows.map(r => r.dunlop_noise));
  const kNoise = avg(rows.map(r => r.komp_noise));

  // =========================
  // BAR CHART – SPEEDTEST
  // =========================
  Highcharts.chart("chart-speed", {
    chart: { type: "column" },
    title: { text: "" },
    credits: { enabled: false },
    xAxis: { categories: ["Speedtest"] },
    yAxis: { max: 100, title: { text: "" } },

    series: [
      {
        name: "Dunlop",
        data: [dSpeed],
        color: "#e6b800"   // KUNING
      },
      {
        name: "Kompetitor",
        data: [kSpeed],
        color: "#d40000"   // MERAH
      }
    ]
  });

  // =========================
  // BAR CHART – COMFORT
  // =========================
  Highcharts.chart("chart-comfort", {
    chart: { type: "column" },
    title: { text: "" },
    credits: { enabled: false },
    xAxis: { categories: ["Comfort"] },
    yAxis: { max: 100, title: { text: "" } },

    series: [
      {
        name: "Dunlop",
        data: [dComfort],
        color: "#e6b800"
      },
      {
        name: "Kompetitor",
        data: [kComfort],
        color: "#d40000"
      }
    ]
  });

  // =========================
  // BAR CHART – NOISE
  // =========================
  Highcharts.chart("chart-noise", {
    chart: { type: "column" },
    title: { text: "" },
    credits: { enabled: false },
    xAxis: { categories: ["Noise"] },
    yAxis: { max: 100, title: { text: "" } },

    series: [
      {
        name: "Dunlop",
        data: [dNoise],
        color: "#e6b800"
      },
      {
        name: "Kompetitor",
        data: [kNoise],
        color: "#d40000"
      }
    ]
  });

  // =========================
  // RADAR – DUNLOP VS KOMPETITOR
  // =========================
  Highcharts.chart("chart-radar", {
    chart: { polar: true, type: "line" },
    title: { text: "" },
    credits: { enabled: false },
    pane: { size: "80%" },
    xAxis: {
      categories: ["Speedtest", "Comfort", "Noise"],
      tickmarkPlacement: "on"
    },
    yAxis: {
      min: 0,
      max: 100,
      tickInterval: 20
    },
    colors: ["#e6b800", "#d40000"],
    series: [
      { name: "Dunlop", data: [dSpeed, dComfort, dNoise] },
      { name: "Kompetitor", data: [kSpeed, kComfort, kNoise] }
    ]
  });
}
