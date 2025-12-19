import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "https://eysofbxczoaesihxpelb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5c29mYnhjem9hZXNpaHhwZWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjM4MjIsImV4cCI6MjA3ODYzOTgyMn0.X4Nec16yXjcrQtpUzAlkwJDgQKHKz8lqU4WF7kjp2KU"
);

/* REALTIME */
supabase.channel("resp-channel")
  .on("postgres_changes",
    { event: "*", schema: "public", table: "responses" },
    () => loadData(true)
  ).subscribe();

loadData(false);

/* HELPERS */
const avg = arr =>
  arr.length ? +(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2) : 0;

const normalize = (v,min,max) =>
  +(((v-min)/(max-min))*100).toFixed(1);

/* LOAD */
async function loadData(animate){
  const { data } = await supabase.from("responses").select("*");

  tableZenix(data.filter(r=>r.type==="Zenix").slice(0,3), animate);
  tableM6(data.filter(r=>r.type==="M6").slice(0,3), animate);
  charts(data);
}

/* TABLES */
function tableZenix(rows,animate){
  const tb=document.getElementById("zenix-body");
  tb.innerHTML="";
  rows.reverse().forEach((r,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td class="tdname">${r.name}</td>
      <td>${r.dunlop_stability ?? "-"}</td>
      <td>${r.komp_stability ?? "-"}</td>`;
    if(animate && i===rows.length-1) tr.style.animation="nyundul .5s";
    tb.appendChild(tr);
  });
}

function tableM6(rows,animate){
  const tb=document.getElementById("m6-body");
  tb.innerHTML="";
  rows.reverse().forEach((r,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td class="tdname">${r.name}</td>
      <td>${r.dunlop_comfort ?? "-"}</td>
      <td>${r.komp_comfort ?? "-"}</td>
      <td>${r.dunlop_noise ?? "-"}</td>
      <td>${r.komp_noise ?? "-"}</td>`;
    if(animate && i===rows.length-1) tr.style.animation="nyundul .5s";
    tb.appendChild(tr);
  });
}

/* CHARTS */
function charts(rows){
  const dS=avg(rows.map(r=>r.dunlop_stability).filter(Boolean));
  const kS=avg(rows.map(r=>r.komp_stability).filter(Boolean));
  const dC=avg(rows.map(r=>r.dunlop_comfort).filter(Boolean));
  const kC=avg(rows.map(r=>r.komp_comfort).filter(Boolean));
  const dN=avg(rows.map(r=>r.dunlop_noise).filter(Boolean));
  const kN=avg(rows.map(r=>r.komp_noise).filter(Boolean));

  const stabVals = rows.flatMap(r=>[r.dunlop_stability,r.komp_stability]).filter(Boolean);
  const stabMin=Math.floor(Math.min(...stabVals));
  const stabMax=Math.ceil(Math.max(...stabVals)+1);

  bar("chart-stability",dS,kS,stabMin,stabMax,"m/s²");
  bar("chart-comfort",dC,kC,0,4,"m/s²");
  bar("chart-noise",dN,kN,50,100,"dB");

  radar(
    normalize(dS,stabMin,stabMax),
    normalize(kS,stabMin,stabMax),
    normalize(dC,0,4),
    normalize(kC,0,4),
    normalize(dN,50,100),
    normalize(kN,50,100)
  );

  setTimeout(()=>Highcharts.charts.forEach(c=>c&&c.reflow()),50);
}

/* BAR */
function bar(id,d,k,min,max,unit){
  Highcharts.chart(id,{
    chart:{type:"column",height:340},
    title:{text:""},
    credits:{enabled:false},
    xAxis:{categories:[""]},
    yAxis:{min,max,title:{text:unit}},
    tooltip:{valueSuffix:" "+unit},
    plotOptions:{column:{dataLabels:{enabled:true,format:"{y} "+unit}}},
    series:[
      {name:"Dunlop",data:[d],color:"#e6b800"},
      {name:"Kompetitor",data:[k],color:"#d40000"}
    ]
  });
}

/* RADAR */
function radar(dS,kS,dC,kC,dN,kN){
  Highcharts.chart("chart-radar",{
    chart:{polar:true,type:"area",height:340},
    title:{text:""},
    credits:{enabled:false},
    pane:{size:"65%"},
    xAxis:{categories:["Stability","Comfort","Noise"],tickmarkPlacement:"on"},
    yAxis:{min:0,max:100,tickPositions:[0,25,50,75,100],gridLineInterpolation:"polygon"},
    plotOptions:{area:{fillOpacity:0.2}},
    series:[
      {name:"Dunlop",data:[dS,dC,dN],color:"#e6b800"},
      {name:"Kompetitor",data:[kS,kC,kN],color:"#d40000"}
    ]
  });
}
