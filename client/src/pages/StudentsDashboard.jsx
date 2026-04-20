/**
 * client/src/pages/StudentsDashboard.jsx
 *
 * Real Leaflet + GeoJSON choropleth map of Cagayan de Oro barangays.
 * Minimal UI — smaller text, tighter spacing, icon-only where possible.
 *
 * Requirements (already in package.json after your install):
 *   npm install leaflet react-leaflet@4
 *
 * Add to client/index.html <head>:
 *   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
 */

import { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Users, UserPlus, CalendarCheck, GraduationCap,
  MapPin, School, ChevronDown, RefreshCw,
  TrendingUp, TrendingDown,
} from "lucide-react";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  navy:   "#132F45",
  teal:   "#32667F",
  amber:  "#EEA23A",
  blue:   "#4285f4",
  green:  "#22c55e",
  rose:   "#f43f5e",
  cyan:   "#06b6d4",
  orange: "#f97316",
  pink:   "#ec4899",
  indigo: "#6366f1",
  slate:  "#64748b",
};

// ── Choropleth colour scale (light → dark blue) ───────────────────────────────
function choroplethColor(n) {
  if (n >= 280) return "#1a3a6b";
  if (n >= 200) return "#2d5fa8";
  if (n >= 150) return "#4a87d0";
  if (n >= 100) return "#7eb3e8";
  if (n >= 50)  return "#b8d8f5";
  return "#daeef8";
}

// ── GeoJSON: Cagayan de Oro City barangays (simplified polygons) ──────────────
// Real approximate coordinates for CDO barangays.
// For production, replace with the official NAMRIA / PhilGIS shapefile converted to GeoJSON.
const CDO_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Barangay 1",  students: 276 },
      geometry: { type: "Polygon", coordinates: [[[124.638,8.478],[124.645,8.478],[124.645,8.483],[124.638,8.483],[124.638,8.478]]] },
    },
    {
      type: "Feature",
      properties: { name: "Barangay 2",  students: 284 },
      geometry: { type: "Polygon", coordinates: [[[124.645,8.478],[124.652,8.478],[124.652,8.484],[124.645,8.484],[124.645,8.478]]] },
    },
    {
      type: "Feature",
      properties: { name: "Barangay 3",  students: 176 },
      geometry: { type: "Polygon", coordinates: [[[124.638,8.472],[124.645,8.472],[124.645,8.478],[124.638,8.478],[124.638,8.472]]] },
    },
    {
      type: "Feature",
      properties: { name: "Barangay 4",  students: 198 },
      geometry: { type: "Polygon", coordinates: [[[124.645,8.472],[124.652,8.472],[124.652,8.478],[124.645,8.478],[124.645,8.472]]] },
    },
    {
      type: "Feature",
      properties: { name: "Barangay 5",  students: 312 },
      geometry: { type: "Polygon", coordinates: [[[124.652,8.478],[124.660,8.478],[124.660,8.485],[124.652,8.485],[124.652,8.478]]] },
    },
    {
      type: "Feature",
      properties: { name: "Barangay 6",  students: 73 },
      geometry: { type: "Polygon", coordinates: [[[124.660,8.478],[124.667,8.478],[124.667,8.484],[124.660,8.484],[124.660,8.478]]] },
    },
    {
      type: "Feature",
      properties: { name: "Barangay 7",  students: 142 },
      geometry: { type: "Polygon", coordinates: [[[124.638,8.466],[124.645,8.466],[124.645,8.472],[124.638,8.472],[124.638,8.466]]] },
    },
    {
      type: "Feature",
      properties: { name: "Barangay 8",  students: 98 },
      geometry: { type: "Polygon", coordinates: [[[124.645,8.466],[124.652,8.466],[124.652,8.472],[124.645,8.472],[124.645,8.466]]] },
    },
    {
      type: "Feature",
      properties: { name: "Agusan",      students: 220 },
      geometry: { type: "Polygon", coordinates: [[[124.652,8.466],[124.665,8.466],[124.665,8.476],[124.652,8.476],[124.652,8.466]]] },
    },
    {
      type: "Feature",
      properties: { name: "Balulang",    students: 185 },
      geometry: { type: "Polygon", coordinates: [[[124.625,8.470],[124.638,8.470],[124.638,8.480],[124.625,8.480],[124.625,8.470]]] },
    },
    {
      type: "Feature",
      properties: { name: "Bonbon",      students: 134 },
      geometry: { type: "Polygon", coordinates: [[[124.625,8.460],[124.638,8.460],[124.638,8.470],[124.625,8.470],[124.625,8.460]]] },
    },
    {
      type: "Feature",
      properties: { name: "Bugo",        students: 261 },
      geometry: { type: "Polygon", coordinates: [[[124.667,8.472],[124.680,8.472],[124.680,8.483],[124.667,8.483],[124.667,8.472]]] },
    },
    {
      type: "Feature",
      properties: { name: "Bulua",       students: 193 },
      geometry: { type: "Polygon", coordinates: [[[124.618,8.472],[124.625,8.472],[124.625,8.482],[124.618,8.482],[124.618,8.472]]] },
    },
    {
      type: "Feature",
      properties: { name: "Carmen",      students: 244 },
      geometry: { type: "Polygon", coordinates: [[[124.638,8.484],[124.652,8.484],[124.652,8.494],[124.638,8.494],[124.638,8.484]]] },
    },
    {
      type: "Feature",
      properties: { name: "Consolacion", students: 167 },
      geometry: { type: "Polygon", coordinates: [[[124.652,8.485],[124.662,8.485],[124.662,8.494],[124.652,8.494],[124.652,8.485]]] },
    },
    {
      type: "Feature",
      properties: { name: "Cugman",      students: 118 },
      geometry: { type: "Polygon", coordinates: [[[124.662,8.484],[124.672,8.484],[124.672,8.493],[124.662,8.493],[124.662,8.484]]] },
    },
    {
      type: "Feature",
      properties: { name: "Iponan",      students: 156 },
      geometry: { type: "Polygon", coordinates: [[[124.618,8.460],[124.630,8.460],[124.630,8.472],[124.618,8.472],[124.618,8.460]]] },
    },
    {
      type: "Feature",
      properties: { name: "Kauswagan",   students: 209 },
      geometry: { type: "Polygon", coordinates: [[[124.630,8.482],[124.638,8.482],[124.638,8.492],[124.630,8.492],[124.630,8.482]]] },
    },
    {
      type: "Feature",
      properties: { name: "Lapasan",     students: 231 },
      geometry: { type: "Polygon", coordinates: [[[124.660,8.466],[124.672,8.466],[124.672,8.477],[124.660,8.477],[124.660,8.466]]] },
    },
    {
      type: "Feature",
      properties: { name: "Lumbia",      students: 88 },
      geometry: { type: "Polygon", coordinates: [[[124.625,8.450],[124.640,8.450],[124.640,8.462],[124.625,8.462],[124.625,8.450]]] },
    },
    {
      type: "Feature",
      properties: { name: "Macabalan",   students: 178 },
      geometry: { type: "Polygon", coordinates: [[[124.652,8.457],[124.664,8.457],[124.664,8.467],[124.652,8.467],[124.652,8.457]]] },
    },
    {
      type: "Feature",
      properties: { name: "Macasandig",  students: 203 },
      geometry: { type: "Polygon", coordinates: [[[124.640,8.457],[124.652,8.457],[124.652,8.467],[124.640,8.467],[124.640,8.457]]] },
    },
    {
      type: "Feature",
      properties: { name: "Nazareth",    students: 145 },
      geometry: { type: "Polygon", coordinates: [[[124.630,8.460],[124.640,8.460],[124.640,8.470],[124.630,8.470],[124.630,8.460]]] },
    },
    {
      type: "Feature",
      properties: { name: "Puntod",      students: 162 },
      geometry: { type: "Polygon", coordinates: [[[124.664,8.458],[124.675,8.458],[124.675,8.467],[124.664,8.467],[124.664,8.458]]] },
    },
    {
      type: "Feature",
      properties: { name: "Puerto",      students: 189 },
      geometry: { type: "Polygon", coordinates: [[[124.620,8.480],[124.630,8.480],[124.630,8.490],[124.620,8.490],[124.620,8.480]]] },
    },
    {
      type: "Feature",
      properties: { name: "Tablon",      students: 137 },
      geometry: { type: "Polygon", coordinates: [[[124.672,8.480],[124.685,8.480],[124.685,8.490],[124.672,8.490],[124.672,8.480]]] },
    },
    {
      type: "Feature",
      properties: { name: "Tignapoloan", students: 104 },
      geometry: { type: "Polygon", coordinates: [[[124.605,8.472],[124.618,8.472],[124.618,8.482],[124.605,8.482],[124.605,8.472]]] },
    },
    {
      type: "Feature",
      properties: { name: "Tumpagon",    students: 76 },
      geometry: { type: "Polygon", coordinates: [[[124.605,8.460],[124.618,8.460],[124.618,8.472],[124.605,8.472],[124.605,8.460]]] },
    },
  ],
};

// ── Top barangays derived from GeoJSON ────────────────────────────────────────
const TOP5 = [...CDO_GEOJSON.features]
  .sort((a, b) => b.properties.students - a.properties.students)
  .slice(0, 5)
  .map(f => f.properties);

// ── Mock data ─────────────────────────────────────────────────────────────────
const COURSE_BAR   = [
  { c:"BSIT",v:808},{c:"BSBA",v:617},{c:"BSED",v:470},
  {c:"BSN",v:352},{c:"BSA",v:222},{c:"BEED",v:173},
  {c:"BTVTED",v:115},{c:"Others",v:86},
];
const COURSE_DONUT = [
  {name:"BSIT",pct:28.4,color:C.blue},
  {name:"BSBA",pct:21.7,color:C.cyan},
  {name:"BSED",pct:16.6,color:C.indigo},
  {name:"BSN", pct:12.4,color:C.green},
  {name:"BSA", pct:7.8, color:C.slate},
  {name:"BEED",pct:6.1, color:C.amber},
  {name:"Others",pct:5.0,color:C.rose},
];
const FEEDER = [
  {name:"Sapang High School",       loc:"City A",n:186,top:"BSIT"},
  {name:"San Isidro National HS",   loc:"City A",n:153,top:"BSBA"},
  {name:"Riverside High School",    loc:"City B",n:142,top:"BSED"},
  {name:"East Valley Integrated HS",loc:"City B",n:118,top:"BSN"},
  {name:"West Point High School",   loc:"City C",n:97, top:"BSIT"},
];
const ATT_TIME = [
  {m:"Aug",v:94},{m:"Sep",v:92},{m:"Oct",v:91},{m:"Nov",v:88},
  {m:"Dec",v:85},{m:"Jan",v:87},{m:"Feb",v:90},{m:"Mar",v:92},
  {m:"Apr",v:93},{m:"May",v:91},
];
const ATT_COURSE = [
  {c:"BSIT",v:93.4},{c:"BSBA",v:92.1},{c:"BSED",v:91.7},
  {c:"BSN",v:90.8},{c:"BSA",v:89.6},{c:"BEED",v:88.3},{c:"BTVTED",v:86.5},
];
const AT_RISK = [
  {id:"20241001",c:"BSIT",v:"62%"},{id:"20241022",c:"BSED",v:"64%"},
  {id:"20241105",c:"BSBA",v:"66%"},{id:"20241087",c:"BSN", v:"67%"},
  {id:"20241132",c:"BSA", v:"68%"},
];
const LOC_COURSE = [
  {c:"BSIT",n:120,p:38.5},{c:"BSBA",n:84,p:26.9},
  {c:"BSED",n:54,p:17.3},{c:"BSN",n:28,p:9.0},{c:"Others",n:26,p:8.3},
];
const ENROLL_TREND = [
  {y:"2020-21",v:1850},{y:"2021-22",v:2150},
  {y:"2022-23",v:2320},{y:"2023-24",v:2620},{y:"2024-25",v:2843},
];
const COURSE_GROWTH = [
  {y:"2020-21",BSIT:480,BSBA:380,BSED:290,BSN:210,Others:490},
  {y:"2021-22",BSIT:560,BSBA:420,BSED:340,BSN:240,Others:590},
  {y:"2022-23",BSIT:640,BSBA:470,BSED:380,BSN:270,Others:630},
  {y:"2023-24",BSIT:730,BSBA:540,BSED:420,BSN:310,Others:620},
  {y:"2024-25",BSIT:808,BSBA:617,BSED:470,BSN:352,Others:596},
];
const GENDER = [
  {name:"Female",v:58.0,n:1648,color:C.pink},
  {name:"Male",  v:42.0,n:1195,color:C.blue},
];

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function Tip({ active, payload, label, suffix="" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:"var(--bg-surface)", border:"1px solid var(--border)",
      borderRadius:8, padding:"6px 10px", fontSize:11,
      boxShadow:"0 4px 14px rgba(0,0,0,.1)",
    }}>
      {label && <p style={{color:"var(--text-muted)",fontSize:10,marginBottom:3}}>{label}</p>}
      {payload.map((p,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:p.color||p.fill||p.stroke,flexShrink:0}}/>
          {p.name && <span style={{color:"var(--text-secondary)"}}>{p.name}:</span>}
          <span style={{fontWeight:700,color:"var(--text-primary)"}}>
            {typeof p.value==="number"?p.value.toLocaleString():p.value}{suffix}
          </span>
        </div>
      ))}
    </div>
  );
}

function Card({ title, subtitle, action, children, style={} }) {
  return (
    <div style={{
      background:"var(--bg-surface)", border:"1px solid var(--border)",
      borderRadius:10, boxShadow:"0 1px 3px rgba(0,0,0,.05)",
      overflow:"hidden", display:"flex", flexDirection:"column", ...style,
    }}>
      {(title||action) && (
        <div style={{
          display:"flex", alignItems:"flex-start", justifyContent:"space-between",
          padding:"11px 15px 9px", borderBottom:"1px solid var(--border-light)",
          gap:8, flexShrink:0,
        }}>
          <div>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:"var(--text-primary)"}}>{title}</p>
            {subtitle && <p style={{margin:"1px 0 0",fontSize:10,color:"var(--text-muted)"}}>{subtitle}</p>}
          </div>
          {action && <div style={{flexShrink:0}}>{action}</div>}
        </div>
      )}
      <div style={{padding:14,flex:1}}>{children}</div>
    </div>
  );
}

function Sel({ label }) {
  return (
    <button style={{
      display:"inline-flex", alignItems:"center", gap:3,
      padding:"3px 9px", fontSize:11, fontWeight:500, borderRadius:5,
      cursor:"pointer", background:"var(--bg-surface)",
      border:"1px solid var(--border)", color:"var(--text-primary)",
    }}>
      {label}<ChevronDown size={10} style={{color:"var(--text-muted)"}}/>
    </button>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:"4px 11px", fontSize:11, fontWeight:600, borderRadius:5,
      border:"none", cursor:"pointer",
      background:active?C.blue:"transparent",
      color:active?"#fff":"var(--text-secondary)",
    }}>{label}</button>
  );
}

function CBadge({ label }) {
  return (
    <span style={{
      fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20,
      background:"rgba(66,133,244,.1)", color:C.blue,
    }}>{label}</span>
  );
}

function KpiCard({ icon:Icon, iconBg, iconColor, label, value, sub, up }) {
  return (
    <div style={{
      background:"var(--bg-surface)", border:"1px solid var(--border)",
      borderRadius:10, padding:"13px 15px",
      display:"flex", alignItems:"center", gap:11,
      boxShadow:"0 1px 3px rgba(0,0,0,.05)",
    }}>
      <div style={{
        width:38, height:38, borderRadius:9, background:iconBg,
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
      }}>
        <Icon size={18} color={iconColor}/>
      </div>
      <div style={{minWidth:0}}>
        <p style={{margin:"0 0 1px",fontSize:10,color:"var(--text-muted)",fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{label}</p>
        <p style={{margin:"0 0 2px",fontSize:20,fontWeight:800,color:"var(--text-primary)",lineHeight:1}}>{value}</p>
        {sub && (
          <p style={{margin:0,fontSize:10,display:"flex",alignItems:"center",gap:2}}>
            {up===true  && <TrendingUp   size={10} color={C.green}/>}
            {up===false && <TrendingDown size={10} color={C.rose}/>}
            <span style={{color:up===true?C.green:up===false?C.rose:"var(--text-muted)"}}>{sub}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ── Leaflet Choropleth Map ────────────────────────────────────────────────────
function LeafletMap() {
  const mapRef    = useRef(null);
  const leafletRef = useRef(null);
  const [info, setInfo] = useState(null);   // hovered barangay

  useEffect(() => {
    // Dynamically import leaflet so SSR won't break
    import("leaflet").then(L => {
      if (leafletRef.current) return; // already initialised

      // Fix default marker icon paths broken by bundlers
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current, {
        center: [8.478, 124.648],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      // OpenStreetMap tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      // Style each feature based on student count
      function style(feature) {
        return {
          fillColor:   choroplethColor(feature.properties.students),
          weight:      1.5,
          opacity:     1,
          color:       "white",
          fillOpacity: 0.78,
        };
      }

      // Interaction handlers
      function onEachFeature(feature, layer) {
        layer.on({
          mouseover(e) {
            const l = e.target;
            l.setStyle({ weight:2.5, color:"#fff", fillOpacity:0.92 });
            l.bringToFront();
            setInfo(feature.properties);
          },
          mouseout(e) {
            geoLayer.resetStyle(e.target);
            setInfo(null);
          },
          click(e) {
            map.fitBounds(e.target.getBounds(), { padding:[30,30] });
          },
        });
      }

      const geoLayer = L.geoJSON(CDO_GEOJSON, { style, onEachFeature }).addTo(map);

      leafletRef.current = map;
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, []);

  return (
    <div>
      {/* Map container */}
      <div style={{ position:"relative" }}>
        <div
          ref={mapRef}
          style={{ height:300, borderRadius:8, border:"1px solid var(--border-light)", overflow:"hidden" }}
        />

        {/* Hover info box */}
        {info && (
          <div style={{
            position:"absolute", top:10, right:10, zIndex:1000,
            background:"white", borderRadius:8, padding:"8px 12px",
            boxShadow:"0 2px 10px rgba(0,0,0,.15)", minWidth:140,
            border:"1px solid #e2e8f0",
          }}>
            <p style={{margin:"0 0 2px",fontSize:12,fontWeight:700,color:"#1e293b"}}>{info.name}</p>
            <p style={{margin:0,fontSize:11,color:"#64748b"}}>{info.students} students</p>
          </div>
        )}

        {/* Legend */}
        <div style={{
          position:"absolute", bottom:10, left:10, zIndex:1000,
          background:"rgba(255,255,255,.92)", borderRadius:8,
          padding:"8px 10px", boxShadow:"0 2px 8px rgba(0,0,0,.12)",
          border:"1px solid #e2e8f0",
        }}>
          <p style={{margin:"0 0 5px",fontSize:10,fontWeight:700,color:"#475569"}}>Students</p>
          {[
            {label:"280+",  color:"#1a3a6b"},
            {label:"200–279",color:"#2d5fa8"},
            {label:"150–199",color:"#4a87d0"},
            {label:"100–149",color:"#7eb3e8"},
            {label:"50–99", color:"#b8d8f5"},
            {label:"<50",   color:"#daeef8"},
          ].map(l=>(
            <div key={l.label} style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
              <span style={{width:12,height:12,borderRadius:2,background:l.color,flexShrink:0,border:"1px solid rgba(0,0,0,.08)"}}/>
              <span style={{fontSize:10,color:"#475569"}}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 bar list */}
      <div style={{
        marginTop:10, background:"var(--bg-subtle)", borderRadius:8,
        padding:"10px 12px", border:"1px solid var(--border-light)",
      }}>
        <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"var(--text-primary)"}}>
          Top 5 Barangays
        </p>
        {TOP5.map((b,i)=>(
          <div key={b.name} style={{display:"flex",alignItems:"center",gap:7,marginBottom:i<4?5:0}}>
            <span style={{fontSize:10,color:"var(--text-secondary)",width:78,flexShrink:0,whiteSpace:"nowrap"}}>{b.name}</span>
            <div style={{flex:1,height:6,background:"var(--border-light)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",background:C.blue,borderRadius:3,width:`${(b.students/TOP5[0].students)*100}%`}}/>
            </div>
            <span style={{fontSize:10,fontWeight:700,color:"var(--text-primary)",width:26,textAlign:"right"}}>{b.students}</span>
          </div>
        ))}
        <button style={{marginTop:8,fontSize:11,fontWeight:600,color:C.blue,background:"none",border:"none",cursor:"pointer",padding:0}}>
          View all locations
        </button>
      </div>
    </div>
  );
}

// ── Attendance horizontal bars ────────────────────────────────────────────────
function AttBars() {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:7}}>
      {ATT_COURSE.map(d=>(
        <div key={d.c} style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{fontSize:10,fontWeight:600,color:"var(--text-secondary)",width:42,flexShrink:0}}>{d.c}</span>
          <div style={{flex:1,height:8,background:"var(--border-light)",borderRadius:4,overflow:"hidden"}}>
            <div style={{
              height:"100%",borderRadius:4,
              background:d.v>=92?"#16a34a":d.v>=90?"#22c55e":d.v>=88?"#4ade80":"#86efac",
              width:`${d.v}%`,
            }}/>
          </div>
          <span style={{fontSize:10,fontWeight:700,color:"var(--text-primary)",width:34,textAlign:"right"}}>{d.v}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StudentsDashboard() {
  const [courseTab, setCourseTab] = useState("Overall");

  return (
    <main style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* ── Header ── */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:10,
      }}>
        <div>
          <h1 style={{margin:0,fontSize:17,fontWeight:800,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:7}}>
            <Users size={17} color={C.blue}/> Overview
          </h1>
          <p style={{margin:"2px 0 0",fontSize:11,color:"var(--text-secondary)"}}>
            Summary of enrollment, attendance and student insights
          </p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div>
            <p style={{margin:"0 0 2px",fontSize:9,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".4px"}}>Academic Year</p>
            <Sel label="2024 – 2025"/>
          </div>
          <button style={{
            display:"flex",alignItems:"center",gap:6,padding:"6px 12px",
            fontSize:11,fontWeight:700,borderRadius:7,cursor:"pointer",
            background:"rgba(239,68,68,.06)",border:"1.5px solid rgba(239,68,68,.2)",color:"#ef4444",
          }}>
            <RefreshCw size={11}/> Clear Filters
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{
        background:"var(--bg-surface)", border:"1px solid var(--border)",
        borderRadius:10, padding:"10px 14px",
        display:"flex", alignItems:"flex-end", gap:12, flexWrap:"wrap",
      }}>
        {[["Semester","All"],["Course / Program","All"],["Region","All"],
          ["City / Municipality","All"],["Barangay","All"],
          ["Feeder School","All"],["Gender","All"],
        ].map(([lbl,val])=>(
          <div key={lbl} style={{display:"flex",flexDirection:"column",gap:2}}>
            <span style={{fontSize:9,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".4px"}}>{lbl}</span>
            <Sel label={val}/>
          </div>
        ))}
      </div>

      {/* ── KPI Row ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12}}>
        <KpiCard icon={Users}         iconBg="rgba(59,130,246,.1)"  iconColor={C.blue}   label="Total Students"    value="2,843"      sub="↑ 8.5% vs last year"  up={true}  />
        <KpiCard icon={UserPlus}      iconBg="rgba(34,197,94,.1)"   iconColor={C.green}  label="New Enrollees"     value="1,234"      sub="↑ 12.4% vs last year" up={true}  />
        <KpiCard icon={CalendarCheck} iconBg="rgba(238,162,58,.12)" iconColor={C.amber}  label="Attendance Rate"   value="92.6%"      sub="↓ 1.8% vs last year"  up={false} />
        <KpiCard icon={GraduationCap} iconBg="rgba(99,102,241,.1)"  iconColor={C.indigo} label="Top Course"        value="BSIT"       sub="28.4% of total"                  />
        <KpiCard icon={MapPin}        iconBg="rgba(244,63,94,.1)"   iconColor={C.rose}   label="Top Barangay"      value="Barangay 5" sub="312 students"                    />
        <KpiCard icon={School}        iconBg="rgba(6,182,212,.1)"   iconColor={C.cyan}   label="Top Feeder School" value="Sapang HS"  sub="186 students"                    />
      </div>

      {/* ── Row 2: Map + Course Demand ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>

        <Card title="Student Distribution Map" subtitle="Cagayan de Oro City · hover a barangay">
          <LeafletMap/>
        </Card>

        <Card
          title="Course Demand"
          subtitle="Enrollment per course"
          action={
            <div style={{display:"flex",background:"var(--bg-subtle)",borderRadius:7,padding:2,gap:1,border:"1px solid var(--border-light)"}}>
              <TabBtn label="Overall"     active={courseTab==="Overall"}     onClick={()=>setCourseTab("Overall")}/>
              <TabBtn label="By Location" active={courseTab==="By Location"} onClick={()=>setCourseTab("By Location")}/>
            </div>
          }
        >
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:14,alignItems:"start"}}>
            <div style={{height:256}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={COURSE_BAR} barSize={22} margin={{top:6,right:4,left:-22,bottom:0}}>
                  <CartesianGrid vertical={false} stroke="var(--border-light)"/>
                  <XAxis dataKey="c" tick={{fontSize:9,fill:"var(--text-muted)"}} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,1000]} ticks={[0,250,500,750,1000]} tick={{fontSize:9,fill:"var(--text-muted)"}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<Tip/>} cursor={{fill:"rgba(66,133,244,.06)"}}/>
                  <Bar dataKey="v" name="Students" fill={C.blue} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:155}}>
              <div style={{position:"relative",width:136,height:136}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={COURSE_DONUT} cx="50%" cy="50%"
                      innerRadius={40} outerRadius={64}
                      startAngle={90} endAngle={-270}
                      dataKey="pct" paddingAngle={1.5}>
                      {COURSE_DONUT.map((d,i)=><Cell key={i} fill={d.color} stroke="none"/>)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:10,color:"var(--text-muted)",fontWeight:600}}>Total</span>
                  <span style={{fontSize:16,fontWeight:800,color:"var(--text-primary)",lineHeight:1.1}}>2,843</span>
                </div>
              </div>
              <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:4,width:"100%"}}>
                {COURSE_DONUT.map((d,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/>
                      <span style={{fontSize:10,color:"var(--text-secondary)"}}>{d.name}</span>
                    </div>
                    <span style={{fontSize:10,fontWeight:700,color:"var(--text-primary)"}}>{d.pct}%</span>
                  </div>
                ))}
              </div>
              <button style={{marginTop:8,fontSize:11,fontWeight:600,color:C.blue,background:"none",border:"none",cursor:"pointer"}}>
                View course details
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Row 3: Feeder + Attendance + Location ── */}
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1.7fr) minmax(0,1fr)",gap:14}}>

        <Card title="Top Feeder Schools" subtitle="by number of enrollees">
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                {["School Name","Location","Enrollees","Top Course"].map(h=>(
                  <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".4px",paddingBottom:8,borderBottom:"1px solid var(--border-light)",paddingRight:8}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEEDER.map((s,i)=>(
                <tr key={i} style={{borderBottom:i<FEEDER.length-1?"1px solid var(--border-light)":"none"}}>
                  <td style={{padding:"8px 8px 8px 0",fontWeight:600,color:"var(--text-primary)",fontSize:11}}>{s.name}</td>
                  <td style={{padding:"8px 8px 8px 0",color:"var(--text-muted)",fontSize:10}}>{s.loc}</td>
                  <td style={{padding:"8px 8px 8px 0",fontWeight:700,color:"var(--text-primary)",fontSize:11}}>{s.n}</td>
                  <td style={{padding:"8px 0"}}><CBadge label={s.top}/></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button style={{marginTop:10,fontSize:11,fontWeight:600,color:C.blue,background:"none",border:"none",cursor:"pointer",padding:0}}>
            View all feeder schools
          </button>
        </Card>

        <Card title="Attendance Insights">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
            <div>
              <p style={{fontSize:10,fontWeight:700,color:"var(--text-secondary)",margin:"0 0 8px"}}>Rate Over Time</p>
              <div style={{height:140}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ATT_TIME} margin={{top:4,right:4,left:-34,bottom:0}}>
                    <CartesianGrid vertical={false} stroke="var(--border-light)"/>
                    <XAxis dataKey="m" tick={{fontSize:8,fill:"var(--text-muted)"}} axisLine={false} tickLine={false}/>
                    <YAxis domain={[80,100]} tickCount={5} tick={{fontSize:8,fill:"var(--text-muted)"}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
                    <Tooltip content={<Tip suffix="%"/>}/>
                    <Line type="monotone" dataKey="v" stroke={C.blue} strokeWidth={1.8} dot={{r:2,fill:C.blue,strokeWidth:0}} activeDot={{r:3.5}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <p style={{fontSize:10,fontWeight:700,color:"var(--text-secondary)",margin:"0 0 8px"}}>By Course</p>
              <AttBars/>
            </div>
            <div>
              <p style={{fontSize:10,fontWeight:700,color:"var(--text-secondary)",margin:"0 0 8px"}}>At Risk (Low Attendance)</p>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr>
                    {["ID","Course","Att."].map(h=>(
                      <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".3px",paddingBottom:7,borderBottom:"1px solid var(--border-light)"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {AT_RISK.map((s,i)=>(
                    <tr key={i} style={{borderBottom:i<AT_RISK.length-1?"1px solid var(--border-light)":"none"}}>
                      <td style={{padding:"6px 0",fontSize:10,fontWeight:600,color:"var(--text-primary)"}}>{s.id}</td>
                      <td style={{padding:"6px 4px"}}><CBadge label={s.c}/></td>
                      <td style={{padding:"6px 0",fontSize:10,fontWeight:700,color:C.rose}}>{s.v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button style={{marginTop:8,fontSize:10,fontWeight:600,color:C.blue,background:"none",border:"none",cursor:"pointer",padding:0}}>
                View all at-risk students
              </button>
            </div>
          </div>
        </Card>

        <Card title="Location vs Course" subtitle="Top Courses per Location" action={<Sel label="Barangay 5"/>}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                {["Course","Students","Pct"].map(h=>(
                  <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".3px",paddingBottom:8,borderBottom:"1px solid var(--border-light)",paddingRight:8}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LOC_COURSE.map((r,i)=>(
                <tr key={i} style={{borderBottom:i<LOC_COURSE.length-1?"1px solid var(--border-light)":"none"}}>
                  <td style={{padding:"8px 8px 8px 0",fontWeight:700,color:"var(--text-primary)",fontSize:11}}>{r.c}</td>
                  <td style={{padding:"8px 8px 8px 0",color:"var(--text-secondary)",fontSize:11}}>{r.n}</td>
                  <td style={{padding:"8px 0",fontWeight:700,color:C.blue,fontSize:11}}>{r.p}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button style={{marginTop:10,fontSize:11,fontWeight:600,color:C.blue,background:"none",border:"none",cursor:"pointer",padding:0}}>
            View other locations
          </button>
        </Card>
      </div>

      {/* ── Row 4: Enrollment + Course Growth + Gender ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr 1fr",gap:14}}>

        <Card title="Enrollment Trends" subtitle="Total enrollment over time">
          <div style={{height:210}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ENROLL_TREND} margin={{top:20,right:10,left:-12,bottom:0}}>
                <CartesianGrid vertical={false} stroke="var(--border-light)"/>
                <XAxis dataKey="y" tick={{fontSize:9,fill:"var(--text-muted)"}} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,4000]} ticks={[0,1000,2000,3000,4000]}
                  tick={{fontSize:9,fill:"var(--text-muted)"}} axisLine={false} tickLine={false}
                  tickFormatter={v=>v===0?"0":`${v/1000}k`}/>
                <Tooltip content={<Tip/>}/>
                <Line type="monotone" dataKey="v" name="Students" stroke={C.blue} strokeWidth={2.5}
                  dot={{r:4,fill:C.blue,strokeWidth:0}} activeDot={{r:5.5}}
                  label={({x,y,value})=>(
                    <text x={x} y={y-10} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--text-primary)">
                      {value.toLocaleString()}
                    </text>
                  )}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Course Growth Trends" subtitle="Enrollment per course over time">
          <div style={{height:210}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={COURSE_GROWTH} margin={{top:8,right:10,left:-12,bottom:0}}>
                <CartesianGrid vertical={false} stroke="var(--border-light)"/>
                <XAxis dataKey="y" tick={{fontSize:9,fill:"var(--text-muted)"}} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,1500]} ticks={[0,500,1000,1500]}
                  tick={{fontSize:9,fill:"var(--text-muted)"}} axisLine={false} tickLine={false}/>
                <Tooltip content={<Tip/>}/>
                <Legend iconSize={7} iconType="circle" wrapperStyle={{fontSize:10,paddingTop:4}}/>
                {[
                  {k:"BSIT",  color:C.blue},
                  {k:"BSBA",  color:C.cyan},
                  {k:"BSED",  color:C.indigo},
                  {k:"BSN",   color:C.orange},
                  {k:"Others",color:C.slate},
                ].map(l=>(
                  <Line key={l.k} type="monotone" dataKey={l.k} stroke={l.color}
                    strokeWidth={1.8} dot={{r:2.5,fill:l.color,strokeWidth:0}} activeDot={{r:4}}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Enrollment by Gender" subtitle="Distribution of students by gender">
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:8}}>
            <div style={{position:"relative",width:154,height:154}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={GENDER} cx="50%" cy="50%"
                    innerRadius={48} outerRadius={72}
                    startAngle={90} endAngle={-270}
                    dataKey="v" paddingAngle={2}>
                    {GENDER.map((d,i)=><Cell key={i} fill={d.color} stroke="none"/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:19,fontWeight:800,color:"var(--text-primary)"}}>2,843</span>
              </div>
            </div>
            <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:8,width:"100%"}}>
              {GENDER.map((d,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{width:10,height:10,borderRadius:"50%",background:d.color}}/>
                    <span style={{fontSize:11,color:"var(--text-secondary)"}}>{d.name}</span>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:"var(--text-primary)"}}>
                    {d.n.toLocaleString()}{" "}
                    <span style={{fontWeight:400,color:"var(--text-muted)"}}>({d.v}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}