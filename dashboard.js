// dashboard.js
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// === Supabase config: ganti kalau perlu ===
const SUPABASE_URL = "https://eysofbxczoaesihxpelb.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5c29mYnhjem9hZXNpaHhwZWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjM4MjIsImV4cCI6MjA3ODYzOTgyMn0.X4Nec16yXjcrQtpUzAlkwJDgQKHKz8lqU4WF7kjp2KU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// === small lookup: centroid coordinates (lat, lon) for provinces (edit/add if needed) ===
// Coordinates are approximate centroids for visualization (latitude, longitude)
const provinceCoords = {
  "ACEH": {lat: 5.5483, lon: 95.3238},
  "SUMATERA UTARA": {lat: 2.9800, lon: 99.1332},
  "SUMATERA BARAT": {lat: -0.9471, lon: 100.4172},
  "RIAU": {lat: 0.5073, lon: 101.4478},
  "JAMBI": {lat: -1.6149, lon: 103.6078},
  "SUMATERA SELATAN": {lat: -3.0036, lon: 104.7450},
  "BENGKULU": {lat: -3.7986, lon: 102.2643},
  "LAMPUNG": {lat: -5.4167, lon: 105.2667},
  "BANGKA BELITUNG": {lat: -2.3676, lon: 106.1139},
  "KEPULAUAN RIAU": {lat: 0.9496, lon: 105.0540},
  "DKI JAKARTA": {lat: -6.1751, lon: 106.8650},
  "JAWA BARAT": {lat: -6.9147, lon: 107.6098},
  "JAWA TENGAH": {lat: -7.1500, lon: 110.1403},
  "DI YOGYAKARTA": {lat: -7.7956, lon: 110.3695},
  "JAWA TIMUR": {lat: -7.2504, lon: 112.7688},
  "BANTEN": {lat: -6.1200, lon: 106.1500},
  "BALI": {lat: -8.3405, lon: 115.0920},
  "NTB": {lat: -8.6400, lon: 116.3246},
  "NTT": {lat: -9.6516, lon: 119.9876},
  "KALIMANTAN BARAT": {lat: -0.0269, lon: 109.3425},
  "KALIMANTAN TENGAH": {lat: -1.6575, lon: 113.3883},
  "KALIMANTAN SELATAN": {lat: -3.3159, lon: 114.5906},
  "KALIMANTAN TIMUR": {lat: 0.8395, lon: 116.9214},
  "SULAWESI UTARA": {lat: 1.3569, lon: 124.8454},
  "SULAWESI TENGAH": {lat: -1.4578, lon: 120.3542},
  "SULAWESI SELATAN": {lat: -5.1477, lon: 119.4327},
  "SULAWESI TENGGARA": {lat: -4.0278, lon: 122.5326},
  "GORONTALO": {lat: 0.5400, lon: 123.0639},
  "SULAWESI BARAT": {lat: -2.9833, lon: 118.7833},
  "MALUKU": {lat: -3.3333, lon: 129.5167},
  "MALUKU UTARA": {lat: 1.8030, lon: 127.6225},
  "PAPUA BARAT": {lat: -0.3276, lon: 133.9201},
  "PAPUA": {lat: -4.2696, lon: 138.0800}
};

// === Helpers ===
function avg(arr){
  const filtered = arr.filter(x => typeof x === "number" && !isNaN(x));
  if(filtered.length === 0) return 0;
  return filtered.reduce((a,b)=>a+b, 0)/filtered.length;
}

// chart instances (Highcharts)
let charts = {};

// compute aggregates from raw rows
function computeAggregates(rows){
  const agg = {
    total: rows.length,
    genderCounts: {},
    provinceCounts: {},
    dunlop: { durability: [], comfort: [], grip: [] },
    bridge: { durability: [], comfort: [], grip: [] },
    perRespondent: [] // list of {dunlopAvg, bridgeAvg, gender, province, created_at}
  };

  rows.forEach(r => {
    const g = (r.gender || "Unknown").toString();
    agg.genderCounts[g] = (agg.genderCounts[g]||0) + 1;

    const prov = (r.region || "Unknown").toString().toUpperCase();
    agg.provinceCounts[prov] = (agg.provinceCounts[prov]||0) + 1;

    const dd = Number(r.dunlop_durability) || 0;
    const dc = Number(r.dunlop_comfort) || 0;
    const dg = Number(r.dunlop_grip) || 0;
    const bd = Number(r.bridge_durability) || 0;
    const bc = Number(r.bridge_comfort) || 0;
    const bg = Number(r.bridge_grip) || 0;

    if(dd) agg.dunlop.durability.push(dd);
    if(dc) agg.dunlop.comfort.push(dc);
    if(dg) agg.dunlop.grip.push(dg);
    if(bd) agg.bridge.durability.push(bd);
    if(bc) agg.bridge.comfort.push(bc);
    if(bg) agg.bridge.grip.push(bg);

    const dunlopAvg = (dd + dc + dg)/3;
    const bridgeAvg = (bd + bc + bg)/3;
    agg.perRespondent.push({
      dunlopAvg: dunlopAvg || 0,
      bridgeAvg: bridgeAvg || 0,
      gender: g,
      province: prov,
      created_at: r.created_at || r.createdAt || null
    });
  });

  // compute averages
  const dunlopAvgTotals = {
    durability: avg(agg.dunlop.durability),
    comfort: avg(agg.dunlop.comfort),
    grip: avg(agg.dunlop.grip)
  };
  const bridgeAvgTotals = {
    durability: avg(agg.bridge.durability),
    comfort: avg(agg.bridge.comfort),
    grip: avg(agg.bridge.grip)
  };

  return {
    meta: { total: agg.total },
    genderCounts: agg.genderCounts,
    provinceCounts: agg.provinceCounts,
    dunlopAvgTotals,
    bridgeAvgTotals,
    perRespondent: agg.perRespondent
  };
}

// === init Highcharts charts ===
function initCharts(){
  charts.gender = Highcharts.chart('chart-gender', {
    chart: { type: 'pie' },
    title: { text: null },
    plotOptions: { pie: { allowPointSelect: true, cursor:'pointer', dataLabels:{enabled:true}} },
    series: [{ name:'Respon', data: [] }],
    credits: { enabled:false }
  });

  charts.sideBySide = Highcharts.chart('chart-sidebyside', {
    chart: { type: 'column' },
    title: { text: null },
    xAxis: { categories: ['Durabilitas','Kenyamanan','Grip'] },
    yAxis: { min:0, max:100, title: { text: 'Avg (1-100)' } },
    series: [
      { name: 'Dunlop', data: [0,0,0], color:'#f7d000' },
      { name: 'Bridgestone', data: [0,0,0], color:'#cc0000' }
    ],
    credits: { enabled:false }
  });

  charts.radar = Highcharts.chart('chart-radar', {
    chart: { polar:true, type:'line' },
    title:{ text: null },
    pane:{ size:'80%' },
    xAxis:{ categories:['Durabilitas','Kenyamanan','Grip'], tickmarkPlacement:'on', lineWidth:0 },
    yAxis:{ min:0, max:100 },
    series:[
      { name:'Dunlop', data:[0,0,0], pointPlacement:'on', color:'#f7d000' },
      { name:'Bridgestone', data:[0,0,0], pointPlacement:'on', color:'#cc0000' }
    ],
    credits:{ enabled:false }
  });

  charts.diff = Highcharts.chart('chart-diff', {
    chart:{ type:'column' },
    title:{ text: null },
    xAxis:{ categories:['Durabilitas','Kenyamanan','Grip'] },
    yAxis:{ title:{ text: 'Selisih (Dunlop - Bridgestone)' } },
    series:[ { name:'Selisih', data:[0,0,0], color:'#4e8cff' } ],
    credits:{ enabled:false }
  });

  charts.scatter = Highcharts.chart('chart-scatter', {
    chart:{ type:'scatter', zoomType:'xy' },
    title:{ text: null },
    xAxis:{ title:{ text:'Dunlop Avg' }, min:0, max:100 },
    yAxis:{ title:{ text:'Bridgestone Avg' }, min:0, max:100 },
    series:[
      { name:'Responden', data: [], marker:{ radius:4 }, color:'#6b7280' }
    ],
    credits:{ enabled:false }
  });

  charts.treemap = Highcharts.chart('chart-treemap', {
    series: [{
      type:'treemap',
      layoutAlgorithm:'squarified',
      data: []
    }],
    title:{ text: null },
    credits:{ enabled:false }
  });

  charts.geo = Highcharts.chart('chart-geo', {
    chart:{ type:'scatter', map: false },
    title:{ text: 'Geolokasi Provinsi (centroid scatter)' },
    xAxis:{ title:{ text:'Longitude' } },
    yAxis:{ title:{ text:'Latitude' } },
    series:[ { name:'Provinsi', data: [], marker:{ radius:6 } } ],
    credits:{ enabled:false }
  });
}

// === update charts with aggregates ===
function renderAll(agg){
  document.getElementById('total_count').textContent = agg.meta.total;

  // gender pie
  const genderData = Object.entries(agg.genderCounts || {}).map(([k,v])=>({ name:k, y:v }));
  charts.gender.series[0].setData(genderData, true);

  // side-by-side & radar
  const d = agg.dunlopAvgTotals;
  const b = agg.bridgeAvgTotals;
  const dArr = [ Number((d.durability||0).toFixed(2)), Number((d.comfort||0).toFixed(2)), Number((d.grip||0).toFixed(2)) ];
  const bArr = [ Number((b.durability||0).toFixed(2)), Number((b.comfort||0).toFixed(2)), Number((b.grip||0).toFixed(2)) ];

  charts.sideBySide.series[0].setData(dArr, false);
  charts.sideBySide.series[1].setData(bArr, false);
  charts.sideBySide.redraw();

  charts.radar.series[0].setData(dArr, false);
  charts.radar.series[1].setData(bArr, false);
  charts.radar.redraw();

  // difference (Dunlop - Bridge)
  const diff = dArr.map((v,i)=> Number((v - bArr[i]).toFixed(2)));
  charts.diff.series[0].setData(diff, true);

  // scatter per respondent
  const scatterData = agg.perRespondent.map(p => {
    return { x: Number(p.dunlopAvg.toFixed(2)), y: Number(p.bridgeAvg.toFixed(2)), custom: { gender:p.gender, province: p.province } };
  });
  charts.scatter.series[0].setData(scatterData, true);

  // treemap provinces
  const treemapData = Object.entries(agg.provinceCounts || {}).map(([name, val]) => ({ name: name, value: val }));
  charts.treemap.series[0].setData(treemapData, true);

  // geo scatter using provinceCoords lookup
  const geoPoints = [];
  Object.entries(agg.provinceCounts || {}).forEach(([prov, count])=>{
    const key = prov.toString().trim().toUpperCase();
    if(provinceCoords[key]){
      geoPoints.push({
        x: provinceCoords[key].lon,
        y: provinceCoords[key].lat,
        name: prov,
        value: count
      });
    }
  });
  charts.geo.series[0].setData(geoPoints, true);

  document.getElementById('status').textContent = `Terakhir update: ${new Date().toLocaleString()} • Total: ${agg.meta.total}`;
}

// === Initial load ===
let cachedRows = [];
async function loadInitial(){
  const { data, error } = await supabase
    .from('responses')
    .select('*')
    .order('created_at', { ascending: true });

  if(error){
    console.error("Error fetch initial:", error);
    document.getElementById('status').textContent = 'Error memuat data: '+ error.message;
    return;
  }

  cachedRows = data || [];
  const agg = computeAggregates(cachedRows);
  renderAll(agg);
}

// === Realtime subscribe (inserts) ===
function attachRealtime(){
  supabase
    .channel('responses_changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'responses' }, payload => {
      // push new row and recompute
      cachedRows.push(payload.new);
      const agg = computeAggregates(cachedRows);
      renderAll(agg);
    })
    .subscribe();
}

// === start ===
window.addEventListener('load', () => {
  initCharts();
  loadInitial().then(()=> {
    attachRealtime();
  });
});
