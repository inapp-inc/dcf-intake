import { useState, useEffect, useRef } from "react";

// ── DESIGN TOKENS ──────────────────────────────────────────────────────────
const C = {
  navy:        "#1B3054",
  navyDeep:    "#0F1F38",
  navyMid:     "#243E6A",
  teal:        "#0A8A85",
  tealBright:  "#0DAAAA",
  tealPale:    "#E4F7F6",
  coral:       "#D44530",
  coralPale:   "#FEE9E5",
  amber:       "#C97500",
  amberPale:   "#FEF3C7",
  green:       "#0A7A55",
  greenPale:   "#D1FAE5",
  bg:          "#EEF1F8",
  white:       "#FFFFFF",
  textDark:    "#1B3054",
  textMid:     "#4C607A",
  textLight:   "#8A9BB8",
  border:      "#DDE5F1",
  purple:      "#6C3FBF",
  purplePale:  "#EDE9FF",
};

// ── GLOBAL STYLE INJECTION ─────────────────────────────────────────────────
function injectGlobals() {
  if (document.getElementById("dcf-globals")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,600&display=swap";
  document.head.appendChild(link);
  const s = document.createElement("style");
  s.id = "dcf-globals";
  s.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
    html, body { height: 100%; font-family:'Outfit',system-ui,sans-serif; }
    ::-webkit-scrollbar { width:5px; height:5px; }
    ::-webkit-scrollbar-thumb { background:#C8D5EE; border-radius:10px; }
    input,textarea,select,button { font-family:'Outfit',system-ui,sans-serif; }
    @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
    @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.45} }
    @keyframes shimmer { 0%{width:15%} 60%{width:80%} 100%{width:95%} }
    @keyframes slideR  { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
    .fade-up  { animation: fadeUp  0.32s ease forwards; }
    .fade-in  { animation: fadeIn  0.25s ease forwards; }
    .pulsing  { animation: pulse  1.6s ease-in-out infinite; }
    .slide-r  { animation: slideR 0.28s ease forwards; }
    .nav-item {
      display:flex; align-items:center; gap:9px;
      padding:8px 12px; border-radius:8px; cursor:pointer;
      font-size:13px; font-weight:500; color:rgba(255,255,255,0.6);
      transition:all 0.15s ease; user-select:none;
    }
    .nav-item:hover  { background:rgba(255,255,255,0.09); color:rgba(255,255,255,0.92); }
    .nav-item.active { background:rgba(255,255,255,0.13); color:#fff; font-weight:600; }
    .card {
      background:#fff; border-radius:12px;
      border:1px solid ${C.border};
      box-shadow:0 1px 4px rgba(27,48,84,0.05);
    }
    .dcf-input {
      width:100%; padding:8px 11px; border-radius:8px;
      border:1.5px solid ${C.border}; font-size:13px; color:${C.textDark};
      background:#fff; outline:none; transition:border-color 0.15s, background 0.15s;
    }
    .dcf-input:focus  { border-color:${C.tealBright}; }
    .dcf-input.ai     { background:${C.tealPale}; border-color:${C.teal}; color:${C.teal}; }
    .dcf-input.miss   { background:${C.amberPale}; border-color:${C.amber}; }
    .dcf-ta { resize:vertical; min-height:72px; }
    .dcf-btn {
      display:inline-flex; align-items:center; gap:5px;
      padding:8px 16px; border-radius:8px; font-size:13px;
      font-weight:600; cursor:pointer; border:none; outline:none;
      transition:opacity 0.15s, transform 0.1s;
    }
    .dcf-btn:hover  { opacity:0.86; transform:translateY(-1px); }
    .dcf-btn:active { transform:translateY(0); }
    .ghost-btn {
      background:${C.bg}; color:${C.textMid};
      border:1px solid ${C.border};
    }
    .chip {
      display:inline-flex; align-items:center; gap:3px;
      padding:2px 9px; border-radius:100px;
      font-size:11px; font-weight:600; letter-spacing:0.3px; white-space:nowrap;
    }
    .hover-lift { transition:transform 0.15s ease, box-shadow 0.15s ease; }
    .hover-lift:hover { transform:translateY(-2px); box-shadow:0 6px 18px rgba(27,48,84,0.10) !important; }
    .field-label {
      display:block; font-size:11px; font-weight:600;
      letter-spacing:0.5px; text-transform:uppercase;
      color:${C.textLight}; margin-bottom:5px;
    }
    .divider { height:1px; background:${C.border}; margin:14px 0; }
    .sec-title { font-size:13px; font-weight:700; color:${C.textDark}; margin-bottom:12px; }
  `;
  document.head.appendChild(s);
}

// ── STATIC DATA ────────────────────────────────────────────────────────────
const ROLES = [
  { id:"screener", label:"Screener",      desc:"51A Intake & Hotline",         icon:"🎧", clr:C.teal,   bg:C.tealPale  },
  { id:"supervisor",label:"Supervisor",   desc:"Case Review & Approval",       icon:"📋", clr:C.navy,   bg:"#E8EDF8"   },
  { id:"worker",   label:"Social Worker", desc:"51B Field Investigator",        icon:"🏡", clr:C.purple, bg:C.purplePale},
  { id:"admin",    label:"IT Admin",      desc:"Governance & System Access",    icon:"⚙️", clr:"#374151",bg:"#F3F4F6"   },
];

const NAV = {
  screener:   [{id:"dashboard",label:"My Queue",icon:"⊞"},{id:"intake",label:"New 51A Intake",icon:"＋",hi:true},{id:"history",label:"Case History",icon:"◷"}],
  supervisor: [{id:"dashboard",label:"Team Overview",icon:"⊞"},{id:"review",label:"Pending Review",icon:"◉",badge:3},{id:"summaries",label:"Case Summaries",icon:"≡"},{id:"audit",label:"Audit Trail",icon:"🔐"}],
  worker:     [{id:"dashboard",label:"My Cases",icon:"⊞"},{id:"briefing",label:"51B Briefing",icon:"📑"},{id:"report",label:"Field Report",icon:"✏"}],
  admin:      [{id:"dashboard",label:"System Status",icon:"⊞"},{id:"audit",label:"Audit Logs",icon:"📊"},{id:"users",label:"User Management",icon:"👥"},{id:"models",label:"AI Governance",icon:"🤖"}],
};

const PAGE_LABELS = {
  dashboard:"Dashboard", intake:"New 51A Intake", history:"Case History",
  review:"Pending Review", summaries:"Case Summaries", audit:"Audit Trail",
  briefing:"51B Pre-Visit Briefing", report:"Field Report",
  users:"User Management", models:"AI Governance",
};

const TRANSCRIPT = [
  {s:"S", text:"DCF Hotline, this is Alex speaking. How can I help you today?"},
  {s:"C", text:"Hi, I'm really worried about the kids next door. I heard a lot of shouting and I think I saw a bruise on the little girl's arm yesterday."},
  {s:"S", text:"I'm glad you called. Can you tell me the address where the children live?"},
  {s:"C", text:"It's 142 Maple Street in Springfield. The older girl is maybe 7 or 8 years old — Emma, I think. And there's also a little one, maybe 2 years old."},
  {s:"S", text:"Do you know the name of the adult living there with the children?"},
  {s:"C", text:"The dad, Robert — last name Johnson I think. The mom moved out a few months ago. Haven't seen her around at all."},
  {s:"C", text:"I don't want to overreact but I heard Robert say something about a gun last night when he was yelling. I'm genuinely scared for those kids.", hi:true},
];

const FORM_FIELDS = {
  child: {
    title:"Child Information", icon:"👶",
    fields:[
      {id:"child_name",  label:"Child's Full Name",    val:"Emma Johnson",                          ai:true,  req:true},
      {id:"child_dob",   label:"Date of Birth",        val:"",                                      ai:false, req:true,  miss:true},
      {id:"child_age",   label:"Approximate Age",      val:"7–8 years",                             ai:true,  req:true},
      {id:"child_gender",label:"Gender",               val:"Female",                                ai:true,  req:true},
      {id:"child_addr",  label:"Home Address",         val:"142 Maple St, Springfield, MA 01103",   ai:true,  req:true},
      {id:"child_school",label:"School / Daycare",     val:"",                                      ai:false, req:false},
    ]
  },
  incident: {
    title:"Incident Details", icon:"🔍",
    fields:[
      {id:"allegation",  label:"Nature of Allegation", val:"Physical Abuse / Neglect",              ai:true,  req:true},
      {id:"inc_date",    label:"Date of Most Recent Incident",val:"",                               ai:false, req:true,  miss:true},
      {id:"description", label:"Incident Description", val:"Caller observed visible bruising on child's upper arm. Ongoing shouting from the residence reported. Alleged perpetrator mentioned a firearm during an altercation the prior evening.", ai:true, req:true, ta:true},
    ]
  },
  reporter: {
    title:"Reporter Information", icon:"📞",
    fields:[
      {id:"rep_type",    label:"Reporter Type",                   val:"Community Member / Neighbor",  ai:true, req:true},
      {id:"rep_name",    label:"Reporter Name (if disclosed)",    val:"[Confidential — intake record only]", ai:false, req:false},
      {id:"rep_phone",   label:"Callback Number",                 val:"",                             ai:false, req:false},
    ]
  },
  household: {
    title:"Household Members", icon:"👨‍👩‍👧",
    fields:[
      {id:"caregiver",   label:"Primary Caregiver",       val:"Robert Johnson (Father)",              ai:true, req:true},
      {id:"alleged",     label:"Alleged Responsible Party",val:"Robert Johnson (Father)",              ai:true, req:true},
      {id:"other_kids",  label:"Other Children in Household",val:"Unknown infant (~2 yrs old)",       ai:true, req:false},
      {id:"caregiver2",  label:"Second Caregiver / Absent Parent",val:"Mother — moved out, location unknown", ai:true, req:false},
    ]
  }
};

const TRIAGE_FLAGS = [
  {id:"young_child", label:"Very young child in household",      sev:"high",     evid:"Caller described an infant (~2 yrs) living in the home."},
  {id:"weapon",      label:"Weapon mentioned by caller",         sev:"critical", evid:'Caller stated: "I heard him say something about a gun last night."'},
  {id:"perp_home",   label:"Alleged perpetrator currently in home",sev:"high",  evid:"Father (Robert Johnson) identified as sole caregiver and alleged responsible party."},
];

const INIT_AI_MSGS = [
  {id:1,type:"success", msg:"I've transcribed the audio and auto-populated fields highlighted in teal. Please review each one — AI-filled fields must be confirmed before saving."},
  {id:2,type:"warning", msg:"Emma's date of birth is missing — I couldn't extract it from the call. This is required for risk scoring. Could you check CCWIS records or call the reporter back?", jump:"child_dob"},
  {id:3,type:"critical",msg:"I detected a potential weapon reference in the transcript. I've raised an emergency triage flag below. Please review and confirm or dismiss it."},
  {id:4,type:"warning", msg:"The date of the most recent incident wasn't captured. The caller implied 'yesterday' — want me to use that as a placeholder?", jump:"inc_date"},
  {id:5,type:"info",    msg:"Background checks for Robert Johnson are now running in parallel (Central Registry, CORI, SORI, FBI/NCIC, 911 CAD). Results in ~3–5 minutes."},
];

const SCREENER_Q = [
  {id:"51A-2024-0847",child:"Emma J., F, 7",  risk:14, flags:3, status:"In Progress",       emergency:true,  since:"12 min"},
  {id:"51A-2024-0846",child:"Marcus L., M, 12",risk:8, flags:1, status:"Pending Review",    emergency:false, since:"52 min"},
  {id:"51A-2024-0844",child:"Aaliyah T., F, 5",risk:11,flags:2, status:"Background Check",  emergency:false, since:"1.5 hr"},
];

const SUPERVISOR_Q = [
  {id:"51A-2024-0847",child:"Emma J.",  age:7,  risk:14,flags:3,emergency:true,
   summary:"Neighbor reported visible bruising on 7-year-old female. Potential firearm in home. Father is sole caregiver and alleged responsible party.",
   rec:"Screen In — Emergency (2-Hour Response)", screener:"A. Martinez", ago:"12 min"},
  {id:"51A-2024-0845",child:"Sofia R.", age:3,  risk:16,flags:2,emergency:true,
   summary:"Physician reported signs of physical neglect for a 3-year-old with prior 51A history (2022). Mother not currently involved.",
   rec:"Screen In — Emergency (2-Hour Response)", screener:"T. Williams", ago:"1 hr"},
  {id:"51A-2024-0843",child:"Tyler M.", age:10, risk:6, flags:0,emergency:false,
   summary:"Anonymous caller reported possible educational neglect. Child is enrolled in school per DESE records. No prior CPS history.",
   rec:"Screen In — Non-Emergency", screener:"J. Chen", ago:"2 hr"},
];

const BRIEFING = {
  caseId:"51A-2024-0847", child:"Emma J., Female, Age 7",
  address:"142 Maple Street, Springfield, MA 01103",
  risk:14, prior51A:2, prior51B:1, lastContact:"March 2023",
  riskFactors:["Physical abuse allegation (bruising on upper arm)","Potential firearm in the home","Single-caregiver household (father)","Second caregiver absent — location unknown","Infant sibling also in household"],
  protectiveFactors:["Child enrolled in school (regular adult oversight)","Engaged neighbor actively monitoring"],
  collateral:[{name:"Springfield Elementary",role:"Current School",phone:"(413) 555-0120"},{name:"Dr. Sarah Kim",role:"Pediatrician",phone:"(413) 555-0244"}],
  leFlag:true, leReason:"Weapon reference in report — coordinate with Springfield PD before home visit.",
  resources:["Springfield Family Resource Center (0.3 mi)","WIC Program — Springfield (1.1 mi)","Safe Families Network — Western MA"],
};

// ── HELPERS ────────────────────────────────────────────────────────────────
const rClr  = s => s>=13 ? C.coral : s>=8 ? C.amber : C.green;
const rPale = s => s>=13 ? C.coralPale : s>=8 ? C.amberPale : C.greenPale;
const rLbl  = s => s>=13 ? "High Risk" : s>=8 ? "Moderate Risk" : "Lower Risk";

// ── ATOMS ──────────────────────────────────────────────────────────────────
function Chip({children, color, bg, size="sm"}) {
  return (
    <span className="chip" style={{color, background:bg, fontSize:size==="xs"?"10px":"11px"}}>
      {children}
    </span>
  );
}
function RiskBadge({score}) {
  return <Chip color={rClr(score)} bg={rPale(score)}>{score}/20 — {rLbl(score)}</Chip>;
}
function EmergBadge() {
  return <Chip color="#fff" bg={C.coral}>⚠ EMERGENCY</Chip>;
}
function AiBadge() {
  return <span style={{fontSize:"9px",fontWeight:700,color:C.teal,background:C.tealPale,padding:"1px 6px",borderRadius:4,letterSpacing:"0.4px",marginLeft:6}}>AI</span>;
}
function PulseCircle({color}) {
  return <span style={{width:7,height:7,borderRadius:"50%",background:color,display:"inline-block",flexShrink:0}} className="pulsing"/>;
}

// ── LOGIN ──────────────────────────────────────────────────────────────────
function LoginScreen({onSelect}) {
  const [hover, setHover] = useState(null);
  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(150deg,${C.navyDeep} 0%,${C.navy} 55%,#1A4580 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Outfit',sans-serif"}}>
      <div style={{position:"fixed",inset:0,opacity:0.035,backgroundImage:"radial-gradient(#fff 1px,transparent 1px)",backgroundSize:"30px 30px",pointerEvents:"none"}}/>
      <div style={{maxWidth:500,width:"100%"}} className="fade-up">
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:14,marginBottom:12}}>
            <div style={{width:52,height:52,background:C.teal,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>🛡</div>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:11,fontWeight:700,color:C.tealBright,letterSpacing:"2px",textTransform:"uppercase"}}>Massachusetts DCF</div>
              <div style={{fontSize:24,fontWeight:700,color:"#fff",lineHeight:1,fontFamily:"'Fraunces',serif"}}>Automated Intake Tool</div>
            </div>
          </div>
          <p style={{color:"rgba(255,255,255,0.4)",fontSize:12}}>Secure Government System · Authorized Access Only · AIT v2.0</p>
        </div>

        {/* Role cards */}
        <p style={{color:"rgba(255,255,255,0.45)",fontSize:11,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:14,textAlign:"center"}}>Select your role to continue</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {ROLES.map(r=>(
            <div key={r.id}
              onClick={()=>onSelect(r.id)}
              onMouseEnter={()=>setHover(r.id)}
              onMouseLeave={()=>setHover(null)}
              style={{
                background: hover===r.id ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.07)",
                border:`1px solid ${hover===r.id?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)"}`,
                borderRadius:14, padding:"20px 18px", cursor:"pointer",
                transition:"all 0.2s ease",
              }}>
              <div style={{fontSize:28,marginBottom:10}}>{r.icon}</div>
              <div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:3}}>{r.label}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginBottom:12}}>{r.desc}</div>
              <div style={{display:"flex",alignItems:"center",gap:4,color:r.clr,fontSize:11,fontWeight:700}}>
                <span>Sign in</span><span>→</span>
              </div>
            </div>
          ))}
        </div>
        <p style={{textAlign:"center",color:"rgba(255,255,255,0.2)",fontSize:11,marginTop:20}}>
          Protected under M.G.L. Chapter 119 · All access is logged and audited
        </p>
      </div>
    </div>
  );
}

// ── SIDEBAR ────────────────────────────────────────────────────────────────
function Sidebar({role, page, onNav, onLogout}) {
  const ri = ROLES.find(r=>r.id===role);
  return (
    <div style={{width:216,flexShrink:0,background:`linear-gradient(180deg,${C.navyDeep},${C.navy})`,display:"flex",flexDirection:"column",borderRight:"1px solid rgba(255,255,255,0.05)"}}>
      {/* Logo */}
      <div style={{padding:"18px 14px 14px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:30,height:30,background:C.teal,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>🛡</div>
          <div>
            <div style={{fontSize:9,color:C.tealBright,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase"}}>MA DCF</div>
            <div style={{fontSize:13,fontWeight:700,color:"#fff",lineHeight:1}}>AIT System</div>
          </div>
        </div>
      </div>

      {/* User chip */}
      <div style={{padding:"10px 12px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{background:"rgba(255,255,255,0.07)",borderRadius:8,padding:"9px 10px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>{ri?.icon}</span>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{ri?.label}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.38)"}}>John Smith · Springfield</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{flex:1,padding:"10px 6px"}}>
        {(NAV[role]||[]).map(item=>(
          <div key={item.id}
            className={`nav-item${page===item.id?" active":""}`}
            onClick={()=>onNav(item.id)}
            style={item.hi && page!==item.id ? {color:C.tealBright,background:"rgba(13,170,170,0.1)"} : {}}>
            <span style={{fontSize:15,width:17,textAlign:"center"}}>{item.icon}</span>
            <span style={{flex:1}}>{item.label}</span>
            {item.badge && <span style={{background:C.coral,color:"#fff",borderRadius:100,padding:"1px 7px",fontSize:10,fontWeight:700}}>{item.badge}</span>}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{padding:"10px 6px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
        <div className="nav-item" style={{fontSize:12,color:"rgba(255,255,255,0.32)"}}>
          <span>🔒</span><span>All Systems Secure</span>
        </div>
        <div className="nav-item" onClick={onLogout} style={{fontSize:12,color:"rgba(255,255,255,0.32)"}}>
          <span>←</span><span>Sign Out</span>
        </div>
      </div>
    </div>
  );
}

// ── APP HEADER ─────────────────────────────────────────────────────────────
function AppHeader({role, page}) {
  const ri = ROLES.find(r=>r.id===role);
  return (
    <div style={{height:52,background:C.white,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 22px",gap:12,flexShrink:0}}>
      <div style={{flex:1}}>
        <span style={{fontSize:11,color:C.textLight,fontWeight:600,letterSpacing:"0.5px",textTransform:"uppercase"}}>{ri?.label} ›</span>
        <span style={{fontSize:15,fontWeight:700,color:C.textDark,marginLeft:6}}>{PAGE_LABELS[page]||page}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,background:C.coralPale,border:`1px solid ${C.coral}33`,borderRadius:8,padding:"5px 12px"}}>
        <PulseCircle color={C.coral}/>
        <span style={{fontSize:12,fontWeight:600,color:C.coral}}>2 Emergency Cases Active</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        <span style={{width:6,height:6,borderRadius:"50%",background:C.green,display:"inline-block"}}/>
        <span style={{fontSize:11,color:C.textLight,fontWeight:500}}>All Systems Operational</span>
      </div>
    </div>
  );
}

// ── AUDIO UPLOAD ───────────────────────────────────────────────────────────
function AudioUpload({state, file, onUpload}) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);

  if (state==="complete") return (
    <div className="card" style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:14}}>
      <div style={{width:40,height:40,borderRadius:10,background:C.greenPale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🎵</div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:C.textDark}}>{file?.name||"call_recording_51A_0847.mp3"}</div>
        <div style={{fontSize:11,color:C.textLight,marginTop:2}}>Transcription complete · 4 min 32 sec · Speaker diarization: Screener & Caller</div>
      </div>
      <Chip color={C.green} bg={C.greenPale}>✓ Transcribed</Chip>
    </div>
  );

  if (state==="processing"||state==="uploading") return (
    <div className="card" style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:14}}>
      <div style={{width:40,height:40,borderRadius:10,background:C.tealPale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}} className="pulsing">🎙</div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:C.textDark}}>{file?.name||"Processing audio..."}</div>
        <div style={{fontSize:11,color:C.teal,marginTop:2}} className="pulsing">
          {state==="uploading"?"Uploading securely to AWS GovCloud...":"AI transcription in progress · Speaker diarization enabled..."}
        </div>
        <div style={{marginTop:8,height:3,background:C.border,borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:state==="uploading"?"30%":"72%",background:C.teal,borderRadius:3,transition:"width 1.2s ease",animation:"shimmer 2s ease-in-out"}}/>
        </div>
      </div>
      <Chip color={C.teal} bg={C.tealPale}>Processing…</Chip>
    </div>
  );

  return (
    <div className="card"
      onDragOver={e=>{e.preventDefault();setDrag(true)}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)onUpload(f);}}
      onClick={()=>ref.current?.click()}
      style={{padding:28,textAlign:"center",cursor:"pointer",border:`2px dashed ${drag?C.tealBright:C.border}`,background:drag?C.tealPale:C.white,transition:"all 0.2s"}}>
      <input ref={ref} type="file" accept=".mp3,.wav,.m4a,.ogg" style={{display:"none"}} onChange={e=>e.target.files[0]&&onUpload(e.target.files[0])}/>
      <div style={{fontSize:32,marginBottom:10}}>🎙</div>
      <div style={{fontSize:14,fontWeight:600,color:C.textDark,marginBottom:4}}>Upload Call Recording</div>
      <div style={{fontSize:12,color:C.textLight,marginBottom:16}}>Drag & drop or click · MP3, WAV, M4A · End-to-end encrypted</div>
      <button className="dcf-btn" style={{background:C.teal,color:"#fff"}} onClick={e=>{e.stopPropagation();ref.current?.click();}}>
        ⬆ Select Audio File
      </button>
    </div>
  );
}

// ── TRANSCRIPT PANEL ───────────────────────────────────────────────────────
function TranscriptPanel() {
  return (
    <div className="card fade-up" style={{padding:"16px 18px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:C.textDark}}>📝 Call Transcript — Speaker Attributed</div>
        <Chip color={C.teal} bg={C.tealPale}>AI-generated</Chip>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:220,overflowY:"auto"}}>
        {TRANSCRIPT.map((line,i)=>(
          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",background:line.hi?C.coralPale:"transparent",borderRadius:8,padding:line.hi?"8px 10px":"2px 0",border:line.hi?`1px solid ${C.coral}33`:"none"}}>
            <div style={{flexShrink:0,width:22,height:22,borderRadius:"50%",background:line.s==="S"?C.navy:C.tealPale,color:line.s==="S"?"#fff":C.teal,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,marginTop:1}}>{line.s}</div>
            <div style={{flex:1,fontSize:12,lineHeight:"1.65",color:line.hi?C.coral:C.textMid}}>
              {line.text}
              {line.hi && <span style={{fontSize:10,fontWeight:700,color:C.coral,marginLeft:8,background:C.coralPale,padding:"1px 7px",borderRadius:4,border:`1px solid ${C.coral}44`}}>⚠ KEYWORD FLAGGED</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BG CHECKS PANEL ────────────────────────────────────────────────────────
function BgChecks() {
  const checks = [
    {label:"Central Registry",  status:"complete", found:true},
    {label:"CORI Check",        status:"complete", found:true},
    {label:"SORI Check",        status:"complete", found:false},
    {label:"FBI / NCIC",        status:"running",  found:null},
    {label:"911 CAD History",   status:"complete", found:true},
    {label:"Out-of-State CPS",  status:"pending",  found:null},
  ];
  return (
    <div className="card fade-up" style={{padding:"14px 18px"}}>
      <div className="sec-title">🔎 Background Checks — Running in Parallel</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {checks.map(c=>(
          <div key={c.label} style={{padding:"9px 11px",borderRadius:8,background:C.bg,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:"0.3px",marginBottom:4}}>{c.label}</div>
            {c.status==="complete" ? (c.found
              ? <Chip color={C.amber} bg={C.amberPale} size="xs">⚠ Record Found</Chip>
              : <Chip color={C.green} bg={C.greenPale} size="xs">✓ No Record</Chip>)
            : c.status==="running"
              ? <span className="chip pulsing" style={{color:C.teal,background:C.tealPale,fontSize:10,fontWeight:600}}>Running…</span>
              : <Chip color={C.textLight} bg={C.bg} size="xs">Pending</Chip>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FORM SECTION ───────────────────────────────────────────────────────────
function FormSection({secKey, expanded, onToggle, formData, onChange}) {
  const sec = FORM_FIELDS[secKey];
  const missing = sec.fields.filter(f=>f.miss && !formData[f.id]).length;
  return (
    <div className="card" style={{overflow:"hidden"}}>
      <div style={{padding:"13px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:expanded?C.white:"#FDFEFF"}} onClick={onToggle}>
        <span style={{fontSize:16}}>{sec.icon}</span>
        <span style={{flex:1,fontSize:13,fontWeight:700,color:C.textDark}}>{sec.title}</span>
        {missing>0 && <Chip color={C.amber} bg={C.amberPale}>{missing} missing</Chip>}
        <span style={{color:C.textLight,fontSize:12}}>{expanded?"▲":"▼"}</span>
      </div>
      {expanded && (
        <div className="fade-up" style={{padding:"0 16px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
          {sec.fields.map(f=>(
            <div key={f.id} style={{gridColumn:f.ta?"1/-1":"auto"}}>
              <label className="field-label">{f.label}{f.req&&<span style={{color:C.coral,marginLeft:2}}>*</span>}{f.ai&&<AiBadge/>}</label>
              {f.ta ? (
                <textarea
                  className={`dcf-input dcf-ta ${f.ai&&!formData[f.id]?"ai":""}`}
                  defaultValue={f.val}
                  onChange={e=>onChange(f.id,e.target.value)}/>
              ) : (
                <input
                  className={`dcf-input ${f.ai&&!formData[f.id]?"ai":""} ${f.miss&&!formData[f.id]?"miss":""}`}
                  defaultValue={f.val}
                  placeholder={f.miss?"⚠ Required — not captured from call":""}
                  onChange={e=>onChange(f.id,e.target.value)}/>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RISK SCORE CARD ────────────────────────────────────────────────────────
function RiskScoreCard() {
  const score = 14;
  const arc = (score/20)*360;
  const color = rClr(score);
  const factors = [
    "Visible physical injury reported",
    "Weapon mentioned in home environment",
    "Very young child (infant) also in household",
    "Single-caregiver household after parental separation",
    "Prior DCF involvement (2022)",
  ];
  return (
    <div className="card fade-up" style={{padding:"16px 18px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div className="sec-title" style={{margin:0}}>📊 AI Risk Assessment</div>
        <div style={{display:"flex",gap:7}}>
          <Chip color={C.textLight} bg={C.bg}>Model v2.4</Chip>
          <Chip color={C.teal} bg={C.tealPale}>Decision Support Only</Chip>
        </div>
      </div>
      <div style={{display:"flex",gap:20,alignItems:"center"}}>
        {/* Gauge */}
        <div style={{textAlign:"center",flexShrink:0}}>
          <div style={{width:84,height:84,borderRadius:"50%",background:`conic-gradient(${color} ${arc}deg, ${C.border} 0)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:C.white,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:22,fontWeight:800,color,lineHeight:1,fontFamily:"'Fraunces',serif"}}>{score}</span>
              <span style={{fontSize:9,color:C.textLight,fontWeight:600}}>/ 20</span>
            </div>
          </div>
          <div style={{fontSize:11,fontWeight:700,color,marginTop:6}}>{rLbl(score)}</div>
        </div>
        {/* Factors */}
        <div style={{flex:1}}>
          <div style={{fontSize:10,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Contributing Factors</div>
          {factors.map((f,i)=>(
            <div key={i} style={{fontSize:12,color:C.textMid,display:"flex",gap:6,alignItems:"flex-start",marginBottom:6}}>
              <span style={{color,flexShrink:0,marginTop:1}}>▸</span>{f}
            </div>
          ))}
        </div>
      </div>
      <div style={{marginTop:14,paddingTop:12,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <p style={{fontSize:11,color:C.textLight}}>Advisory only. Screener retains full override authority.</p>
        <button className="dcf-btn ghost-btn" style={{fontSize:12,padding:"6px 13px"}}>Override Score</button>
      </div>
    </div>
  );
}

// ── TRIAGE FLAGS ───────────────────────────────────────────────────────────
function TriageSection({decisions, setDecisions}) {
  const [dismissing, setDismissing] = useState(null);
  const [reason, setReason] = useState("");
  const confirmed = Object.values(decisions).filter(d=>d==="accept").length;
  return (
    <div className="card fade-up" style={{padding:"16px 18px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:confirmed>=2?10:14}}>
        <div className="sec-title" style={{margin:0}}>🚨 Emergency Triage Flags</div>
        <Chip color={C.coral} bg={C.coralPale}>{TRIAGE_FLAGS.length} detected</Chip>
        {confirmed>=2 && <Chip color="#fff" bg={C.coral}>⚠ ESCALATION — {confirmed} confirmed</Chip>}
      </div>
      {confirmed>=2 && (
        <div style={{background:C.coralPale,border:`1px solid ${C.coral}33`,borderRadius:10,padding:"11px 14px",marginBottom:12,fontSize:12,color:C.coral,fontWeight:600}}>
          Multi-indicator escalation: {confirmed} emergency indicators confirmed. This report will bypass the Screening Team queue and route directly to the emergency response workflow.
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {TRIAGE_FLAGS.map(flag=>(
          <div key={flag.id} style={{border:`1px solid ${flag.sev==="critical"?C.coral:C.amber}44`,borderRadius:10,padding:"12px 14px",background:flag.sev==="critical"?C.coralPale:C.amberPale}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <Chip color={flag.sev==="critical"?C.coral:C.amber} bg="transparent" size="xs">{flag.sev==="critical"?"● CRITICAL":"● HIGH"}</Chip>
                  <span style={{fontSize:13,fontWeight:600,color:C.textDark}}>{flag.label}</span>
                </div>
                <p style={{fontSize:11,color:C.textMid,fontStyle:"italic"}}>{flag.evid}</p>
              </div>
              {decisions[flag.id]==="accept" ? <Chip color={C.coral} bg={C.coralPale}>✓ Confirmed</Chip>
              : decisions[flag.id]==="dismiss" ? <Chip color={C.green} bg={C.greenPale}>Dismissed</Chip>
              : (
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button className="dcf-btn" style={{background:C.coral,color:"#fff",fontSize:11,padding:"5px 12px"}}
                    onClick={()=>setDecisions(p=>({...p,[flag.id]:"accept"}))}>Confirm Flag</button>
                  <button className="dcf-btn ghost-btn" style={{fontSize:11,padding:"5px 12px"}}
                    onClick={()=>setDismissing(flag.id)}>Dismiss</button>
                </div>
              )}
            </div>
            {dismissing===flag.id && (
              <div className="fade-in" style={{marginTop:10,display:"flex",gap:8}}>
                <input className="dcf-input" style={{flex:1,fontSize:12}} placeholder="Brief reason for dismissal (required)…"
                  value={reason} onChange={e=>setReason(e.target.value)}/>
                <button className="dcf-btn" style={{background:C.navy,color:"#fff",fontSize:12,padding:"5px 14px"}}
                  onClick={()=>{if(reason.trim()){setDecisions(p=>({...p,[flag.id]:"dismiss"}));setDismissing(null);setReason("");}}}>Save</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AI ASSISTANT PANEL ─────────────────────────────────────────────────────
const MSG_STYLE = {
  success: {bg:C.greenPale,  bdr:`${C.green}33`,  ico:"✓", clr:C.green,  lbl:"Complete"},
  warning: {bg:C.amberPale,  bdr:`${C.amber}33`,  ico:"!", clr:C.amber,  lbl:"Action Needed"},
  critical:{bg:C.coralPale,  bdr:`${C.coral}33`,  ico:"⚠", clr:C.coral,  lbl:"Alert"},
  info:    {bg:C.tealPale,   bdr:`${C.teal}33`,   ico:"i", clr:C.teal,   lbl:"Update"},
  user:    {bg:C.navy,       bdr:"transparent",    ico:"›", clr:"#fff",   lbl:""},
};

function AIAssistant({messages, input, setInput, onSend, msgRef}) {
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#FFFDF8"}}>
      {/* Header */}
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,background:C.white,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${C.teal},${C.navy})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🤖</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.textDark}}>AIT Assistant</div>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:C.green,display:"inline-block"}}/>
              <span style={{fontSize:10,color:C.green,fontWeight:600}}>Active · Monitoring intake</span>
            </div>
          </div>
        </div>
        <p style={{fontSize:11,color:C.textLight}}>I'll flag missing fields, surface risks, and answer your questions.</p>
      </div>

      {/* Messages */}
      <div ref={msgRef} style={{flex:1,overflow:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:9}}>
        {messages.length===0 && (
          <div style={{textAlign:"center",paddingTop:40,color:C.textLight}}>
            <div style={{fontSize:30,marginBottom:10}}>🎙</div>
            <div style={{fontSize:12}}>Upload an audio file to begin. I'll analyze the call and guide you through the intake form, flagging anything that needs attention.</div>
          </div>
        )}
        {messages.map(m=>{
          const t = MSG_STYLE[m.type]||MSG_STYLE.info;
          const isUser = m.type==="user";
          return (
            <div key={m.id} className="slide-r" style={{
              background:t.bg, border:`1px solid ${t.bdr}`,
              borderRadius:isUser?"12px 12px 4px 12px":"4px 12px 12px 12px",
              padding:"9px 11px", alignSelf:isUser?"flex-end":"flex-start", maxWidth:"92%",
            }}>
              {!isUser && (
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:5}}>
                  <span style={{width:15,height:15,borderRadius:"50%",background:t.clr,color:"#fff",fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{t.ico}</span>
                  <span style={{fontSize:10,fontWeight:700,color:t.clr,textTransform:"uppercase",letterSpacing:"0.4px"}}>{t.lbl}</span>
                </div>
              )}
              <p style={{fontSize:12,lineHeight:"1.65",color:isUser?"#fff":C.textDark}}>{m.msg}</p>
              {m.jump && (
                <button className="dcf-btn" style={{marginTop:7,background:"rgba(0,0,0,0.05)",color:t.clr,border:`1px solid ${t.clr}33`,fontSize:10,padding:"3px 9px"}}>
                  ↗ Jump to field
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={{padding:"11px 14px",borderTop:`1px solid ${C.border}`,background:C.white,flexShrink:0}}>
        <div style={{display:"flex",gap:7}}>
          <input className="dcf-input" style={{flex:1,fontSize:12}} placeholder="Ask me anything about this case…"
            value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&onSend()}/>
          <button className="dcf-btn" style={{background:C.teal,color:"#fff",padding:"7px 13px",flexShrink:0}} onClick={onSend}>↑</button>
        </div>
        <p style={{fontSize:10,color:C.textLight,marginTop:5}}>Press Enter to send · All conversations are logged for audit</p>
      </div>
    </div>
  );
}

// ── INTAKE PAGE ────────────────────────────────────────────────────────────
function IntakePage({txState, uploadedFile, onUpload, triageDec, setTriageDec, aiMsgs, aiInput, setAiInput, onAiSend, aiRef, openSec, setOpenSec}) {
  const [formData, setFormData] = useState({});
  const sections = Object.keys(FORM_FIELDS);
  const done = txState==="complete";
  return (
    <div style={{display:"flex",gap:0,height:"calc(100vh - 94px)",overflow:"hidden"}}>
      {/* Main content */}
      <div style={{flex:1,overflowY:"auto",paddingRight:2,display:"flex",flexDirection:"column",gap:12}}>
        {/* Case header */}
        <div className="card" style={{padding:"13px 17px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:C.textLight,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase"}}>New 51A Report</div>
            <div style={{fontSize:19,fontWeight:700,color:C.textDark,fontFamily:"'Fraunces',serif"}}>Case #51A-2024-0847</div>
          </div>
          <EmergBadge/><RiskBadge score={14}/>
          <Chip color={C.teal} bg={C.tealPale}>Initiated 12:34 PM</Chip>
        </div>

        {/* Legend */}
        {done && (
          <div style={{display:"flex",gap:14,alignItems:"center",padding:"0 2px"}}>
            <div style={{fontSize:11,fontWeight:600,color:C.textDark}}>51A Report Fields</div>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:11,height:11,borderRadius:3,background:C.tealPale,border:`1.5px solid ${C.teal}`}}/>
              <span style={{fontSize:10,color:C.textLight}}>AI auto-populated</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:11,height:11,borderRadius:3,background:C.amberPale,border:`1.5px solid ${C.amber}`}}/>
              <span style={{fontSize:10,color:C.textLight}}>Needs your attention</span>
            </div>
          </div>
        )}

        <AudioUpload state={txState} file={uploadedFile} onUpload={onUpload}/>
        {done && <TranscriptPanel/>}
        {done && <BgChecks/>}
        {done && sections.map(k=>(
          <FormSection key={k} secKey={k} expanded={openSec===k} onToggle={()=>setOpenSec(openSec===k?null:k)} formData={formData} onChange={(id,v)=>setFormData(p=>({...p,[id]:v}))}/>
        ))}
        {done && <RiskScoreCard/>}
        {done && <TriageSection decisions={triageDec} setDecisions={setTriageDec}/>}
        {done && (
          <div className="card fade-up" style={{padding:"13px 17px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.textDark}}>Ready to submit?</div>
              <div style={{fontSize:11,color:C.amber,marginTop:2}}>⚠ 2 required fields still missing — review items flagged by the assistant</div>
            </div>
            <div style={{display:"flex",gap:9}}>
              <button className="dcf-btn ghost-btn">Save Draft</button>
              <button className="dcf-btn" style={{background:C.teal,color:"#fff"}}>Submit to Supervisor →</button>
            </div>
          </div>
        )}
        <div style={{height:18}}/>
      </div>

      {/* AI Panel */}
      <div style={{width:308,flexShrink:0,display:"flex",flexDirection:"column",marginLeft:13,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`,boxShadow:`0 2px 14px rgba(27,48,84,0.07)`}}>
        <AIAssistant messages={aiMsgs} input={aiInput} setInput={setAiInput} onSend={onAiSend} msgRef={aiRef}/>
      </div>
    </div>
  );
}

// ── SCREENER DASHBOARD ─────────────────────────────────────────────────────
function ScreenerDashboard({onNewIntake}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}} className="fade-up">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {[
          {label:"Reports Today",        val:"8",   sub:"+3 from yesterday",        clr:C.navy},
          {label:"Emergency Active",     val:"2",   sub:"2-hour response required", clr:C.coral},
          {label:"Pending BG Checks",    val:"5",   sub:"Avg 3.2 min completion",   clr:C.amber},
          {label:"Completed Today",      val:"3",   sub:"All within SLA",           clr:C.green},
        ].map(s=>(
          <div key={s.label} className="card hover-lift" style={{padding:"15px 16px"}}>
            <div style={{fontSize:28,fontWeight:800,color:s.clr,fontFamily:"'Fraunces',serif",lineHeight:1}}>{s.val}</div>
            <div style={{fontSize:12,fontWeight:600,color:C.textDark,marginTop:4}}>{s.label}</div>
            <div style={{fontSize:11,color:C.textLight,marginTop:2}}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:"16px 18px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div className="sec-title" style={{margin:0}}>Active Case Queue</div>
          <button className="dcf-btn" style={{background:C.teal,color:"#fff"}} onClick={onNewIntake}>+ New 51A Intake</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {SCREENER_Q.map(c=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 13px",borderRadius:10,background:c.emergency?C.coralPale:C.bg,border:`1px solid ${c.emergency?C.coral+"33":C.border}`}}>
              {c.emergency && <PulseCircle color={C.coral}/>}
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:C.textDark}}>{c.child}</div>
                <div style={{fontSize:11,color:C.textLight}}>Case {c.id} · {c.since} ago</div>
              </div>
              <RiskBadge score={c.risk}/>
              {c.emergency && <EmergBadge/>}
              <Chip color={C.textMid} bg={C.bg}>{c.status}</Chip>
              <button className="dcf-btn" style={{background:C.navy,color:"#fff",fontSize:12,padding:"6px 13px"}}>Open →</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SUPERVISOR DASHBOARD ───────────────────────────────────────────────────
function SupervisorDashboard({expanded, setExpanded}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}} className="fade-up">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {[
          {label:"Pending Your Review",  val:"3",    clr:C.coral},
          {label:"Team Active Cases",    val:"12",   clr:C.navy},
          {label:"Avg Risk Score Today", val:"11.2", clr:C.amber},
          {label:"SLA Compliance",       val:"96%",  clr:C.green},
        ].map(s=>(
          <div key={s.label} className="card hover-lift" style={{padding:"15px 16px"}}>
            <div style={{fontSize:28,fontWeight:800,color:s.clr,fontFamily:"'Fraunces',serif",lineHeight:1}}>{s.val}</div>
            <div style={{fontSize:12,fontWeight:600,color:C.textDark,marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:"16px 18px"}}>
        <div className="sec-title">Cases Pending Your Review</div>
        <p style={{fontSize:11,color:C.textLight,marginBottom:14,marginTop:-8}}>AI pre-meeting summaries are ready. Review, then approve or request clarification before the daily meeting.</p>
        <div style={{display:"flex",flexDirection:"column",gap:11}}>
          {SUPERVISOR_Q.map(c=>(
            <div key={c.id} style={{border:`1px solid ${c.emergency?C.coral+"44":C.border}`,borderRadius:12,overflow:"hidden"}}>
              <div style={{padding:"13px 15px",display:"flex",alignItems:"center",gap:11,cursor:"pointer",background:c.emergency?C.coralPale:C.white}}
                onClick={()=>setExpanded(expanded===c.id?null:c.id)}>
                {c.emergency && <PulseCircle color={C.coral}/>}
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.textDark}}>{c.child}, Age {c.age} — Case {c.id}</div>
                  <div style={{fontSize:11,color:C.textLight}}>Screener: {c.screener} · Submitted {c.ago} ago · {c.flags} triage flags</div>
                </div>
                <RiskBadge score={c.risk}/>
                {c.emergency && <EmergBadge/>}
                <span style={{color:C.textLight,fontSize:12}}>{expanded===c.id?"▲":"▼"}</span>
              </div>
              {expanded===c.id && (
                <div className="fade-in" style={{padding:"0 15px 15px",background:C.white,borderTop:`1px solid ${C.border}`}}>
                  <div style={{marginTop:13,display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>AI Case Summary</div>
                      <div style={{background:C.tealPale,border:`1px solid ${C.teal}22`,borderRadius:10,padding:"11px 13px"}}>
                        <p style={{fontSize:12,color:C.textMid,lineHeight:"1.7"}}>{c.summary}</p>
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>AI Recommendation</div>
                      <div style={{background:c.emergency?C.coralPale:C.amberPale,border:`1px solid ${(c.emergency?C.coral:C.amber)}22`,borderRadius:10,padding:"11px 13px"}}>
                        <p style={{fontSize:12,fontWeight:700,color:c.emergency?C.coral:C.amber,lineHeight:"1.7"}}>{c.rec}</p>
                        <p style={{fontSize:10,color:C.textLight,marginTop:4}}>Advisory only. Supervisor retains full determination authority.</p>
                      </div>
                    </div>
                  </div>
                  <div style={{marginTop:13,display:"flex",gap:9}}>
                    <button className="dcf-btn" style={{background:C.green,color:"#fff"}}>Approve — Screen In</button>
                    <button className="dcf-btn" style={{background:C.navy,color:"#fff"}}>Screen Out</button>
                    <button className="dcf-btn ghost-btn">Request Clarification</button>
                    <button className="dcf-btn ghost-btn" style={{marginLeft:"auto"}}>Full Case View →</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── WORKER PAGES ───────────────────────────────────────────────────────────
function WorkerDashboard({setPage}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}} className="fade-up">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        {[
          {label:"Assigned Cases",       val:"2", clr:C.navy},
          {label:"Emergency Responses",  val:"1", clr:C.coral},
          {label:"Reports Pending",      val:"1", clr:C.amber},
        ].map(s=>(
          <div key={s.label} className="card hover-lift" style={{padding:"15px 16px"}}>
            <div style={{fontSize:28,fontWeight:800,color:s.clr,fontFamily:"'Fraunces',serif"}}>{s.val}</div>
            <div style={{fontSize:12,fontWeight:600,color:C.textDark,marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:"16px 18px"}}>
        <div className="sec-title">My Assigned Cases</div>
        <div style={{display:"flex",alignItems:"center",gap:11,padding:"11px 13px",borderRadius:10,background:C.coralPale,border:`1px solid ${C.coral}33`}}>
          <PulseCircle color={C.coral}/>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:C.textDark}}>Emma J., F, 7</div>
            <div style={{fontSize:11,color:C.textLight}}>Case 51A-2024-0847 · Status: Pre-Visit Prep</div>
          </div>
          <RiskBadge score={14}/><EmergBadge/>
          <button className="dcf-btn" style={{background:C.teal,color:"#fff",fontSize:12}} onClick={()=>setPage("briefing")}>View Briefing →</button>
          <button className="dcf-btn" style={{background:C.navy,color:"#fff",fontSize:12}} onClick={()=>setPage("report")}>Write Report →</button>
        </div>
      </div>
    </div>
  );
}

function WorkerBriefing({onBack}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:13}} className="fade-up">
      <div className="card" style={{padding:"13px 17px",display:"flex",alignItems:"center",gap:11}}>
        <button onClick={onBack} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,color:C.textMid}}>← Back</button>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:C.textLight,fontWeight:600}}>AI Pre-Visit Briefing</div>
          <div style={{fontSize:18,fontWeight:700,color:C.textDark,fontFamily:"'Fraunces',serif"}}>Case #51A-2024-0847 — Emma J.</div>
        </div>
        <EmergBadge/><RiskBadge score={BRIEFING.risk}/>
      </div>
      {BRIEFING.leFlag && (
        <div style={{background:C.coralPale,border:`1.5px solid ${C.coral}66`,borderRadius:12,padding:"13px 17px",display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:22}}>🚔</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.coral,marginBottom:3}}>Law Enforcement Accompaniment Recommended</div>
            <p style={{fontSize:12,color:C.textMid}}>{BRIEFING.leReason}</p>
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
        <div className="card" style={{padding:"15px 17px"}}>
          <div className="sec-title">Risk Factors</div>
          {BRIEFING.riskFactors.map((f,i)=>(
            <div key={i} style={{fontSize:12,color:C.textMid,display:"flex",gap:6,marginBottom:7}}>
              <span style={{color:C.coral,flexShrink:0}}>▸</span>{f}
            </div>
          ))}
          <div className="divider"/>
          <div className="sec-title">Protective Factors</div>
          {BRIEFING.protectiveFactors.map((f,i)=>(
            <div key={i} style={{fontSize:12,color:C.textMid,display:"flex",gap:6,marginBottom:7}}>
              <span style={{color:C.green,flexShrink:0}}>▸</span>{f}
            </div>
          ))}
        </div>
        <div className="card" style={{padding:"15px 17px"}}>
          <div className="sec-title">Collateral Contacts</div>
          {BRIEFING.collateral.map((c,i)=>(
            <div key={i} style={{padding:"9px 11px",background:C.bg,borderRadius:8,marginBottom:8}}>
              <div style={{fontSize:12,fontWeight:700,color:C.textDark}}>{c.name}</div>
              <div style={{fontSize:11,color:C.textLight}}>{c.role} · {c.phone}</div>
            </div>
          ))}
          <div className="divider"/>
          <div className="sec-title">Community Resources</div>
          {BRIEFING.resources.map((r,i)=>(
            <div key={i} style={{fontSize:12,color:C.textMid,marginBottom:6}}>📍 {r}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkerReport() {
  const [notes, setNotes] = useState("");
  const [audioSt, setAudioSt] = useState("idle");
  const [generated, setGenerated] = useState(false);
  const fileRef = useRef();

  const DRAFT = `CASE: 51A-2024-0847 — Emma J., Female, Age 7
INVESTIGATOR: John Smith, DCF Springfield
VISIT DATE: ${new Date().toLocaleDateString()}

FINDINGS:
Worker made contact at 142 Maple Street, Springfield. Emma was present in the home and appeared [OBSERVATION REQUIRED]. Worker observed [ENTER FIELD OBSERVATIONS].

Prior history reviewed: Two prior 51A reports filed in 2022. DCF involvement closed June 2023.

Risk factors noted during visit: [ENTER FINDINGS]

Protective factors observed: [ENTER FINDINGS]

DETERMINATION: [SUPPORTED / SUBSTANTIATED CONCERN / UNSUPPORTED]

[Worker signature and supervisor approval required before submission]`;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:13}} className="fade-up">
      <div className="card" style={{padding:"13px 17px"}}>
        <div style={{fontSize:18,fontWeight:700,color:C.textDark,fontFamily:"'Fraunces',serif"}}>51B Field Report — Case #51A-2024-0847</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
        <div className="card" style={{padding:"15px 17px"}}>
          <div className="sec-title">Field Notes & Voice Memos</div>
          <textarea className="dcf-input dcf-ta" style={{minHeight:120,marginBottom:12}} placeholder="Enter your field observations here, or upload a voice memo below…" value={notes} onChange={e=>setNotes(e.target.value)}/>
          <input ref={fileRef} type="file" accept=".mp3,.wav" style={{display:"none"}} onChange={()=>{setAudioSt("processing");setTimeout(()=>setAudioSt("complete"),3000);}}/>
          <div style={{borderRadius:9,border:`2px dashed ${C.border}`,padding:16,textAlign:"center",cursor:"pointer",marginBottom:12}} onClick={()=>fileRef.current?.click()}>
            {audioSt==="idle" && <><div style={{fontSize:20,marginBottom:5}}>🎙</div><div style={{fontSize:12,color:C.textLight}}>Upload voice memo · MP3, WAV</div></>}
            {audioSt==="processing" && <div style={{fontSize:12,color:C.teal}} className="pulsing">Transcribing voice memo…</div>}
            {audioSt==="complete" && <div style={{fontSize:12,color:C.green}}>✓ Voice memo transcribed and appended to field notes</div>}
          </div>
          <button className="dcf-btn" style={{background:C.teal,color:"#fff",width:"100%",justifyContent:"center"}} onClick={()=>setGenerated(true)}>
            Generate AI Draft Report →
          </button>
        </div>
        <div className="card" style={{padding:"15px 17px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:13}}>
            <div className="sec-title" style={{margin:0}}>AI Draft Report</div>
            {generated && <Chip color={C.teal} bg={C.tealPale}>Draft Ready — Review Required</Chip>}
          </div>
          {!generated ? (
            <div style={{background:C.bg,borderRadius:9,padding:28,textAlign:"center"}}>
              <div style={{fontSize:24,marginBottom:8}}>📄</div>
              <div style={{fontSize:12,color:C.textLight}}>Add field notes or upload a voice memo, then click Generate.</div>
            </div>
          ) : (
            <div className="fade-in">
              <textarea className="dcf-input dcf-ta" style={{minHeight:200,background:C.tealPale,borderColor:C.teal,fontSize:12,lineHeight:"1.7",color:C.textDark}} defaultValue={DRAFT}/>
              <div style={{marginTop:11,display:"flex",gap:9}}>
                <button className="dcf-btn" style={{background:C.navy,color:"#fff",flex:1,justifyContent:"center"}}>Submit to Supervisor</button>
                <button className="dcf-btn ghost-btn">Compliance Check</button>
              </div>
              <p style={{fontSize:10,color:C.textLight,marginTop:7}}>AI-generated draft must be reviewed and approved by the assigned worker before submission. Worker approval is required — human-in-the-loop is a system invariant.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ADMIN DASHBOARD ────────────────────────────────────────────────────────
function AdminDashboard() {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}} className="fade-up">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {[
          {label:"System Uptime",      val:"99.97%", sub:"Last 30 days",              clr:C.green},
          {label:"Active Sessions",    val:"14",     sub:"Across all roles",           clr:C.navy},
          {label:"AI Jobs Today",      val:"231",    sub:"Transcriptions + risk jobs", clr:C.teal},
          {label:"Audit Entries",      val:"1,847",  sub:"All access logged",          clr:C.amber},
        ].map(s=>(
          <div key={s.label} className="card hover-lift" style={{padding:"13px 15px"}}>
            <div style={{fontSize:26,fontWeight:800,color:s.clr,fontFamily:"'Fraunces',serif",lineHeight:1}}>{s.val}</div>
            <div style={{fontSize:12,fontWeight:600,color:C.textDark,marginTop:3}}>{s.label}</div>
            <div style={{fontSize:10,color:C.textLight}}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
        {/* RBAC */}
        <div className="card" style={{padding:"15px 17px"}}>
          <div className="sec-title">RBAC — Role Definitions</div>
          {[
            {role:"Screener",            users:12,access:"51A Intake, Own Cases, Background Check Results"},
            {role:"Supervisor",          users:4, access:"All Screener Data, Approvals, Team Analytics"},
            {role:"Social Worker (51B)", users:8, access:"Assigned Cases, Briefings, Field Reports"},
            {role:"IT Admin",            users:2, access:"System Config, Audit Logs, User Mgmt (No Case Data)"},
            {role:"EOHHS Analytics",     users:1, access:"Aggregate Metrics Only — No PII Access"},
          ].map(r=>(
            <div key={r.role} style={{padding:"9px 11px",background:C.bg,borderRadius:8,marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                <span style={{fontSize:12,fontWeight:700,color:C.textDark}}>{r.role}</span>
                <Chip color={C.teal} bg={C.tealPale}>{r.users} users</Chip>
              </div>
              <div style={{fontSize:10,color:C.textLight}}>{r.access}</div>
            </div>
          ))}
        </div>
        {/* AI Governance */}
        <div className="card" style={{padding:"15px 17px"}}>
          <div className="sec-title">AI Model Governance</div>
          {[
            {model:"Transcription (AWS Transcribe)",     ver:"v2.1",          acc:"96.4% WER"},
            {model:"NLP Field Extractor (SageMaker)",    ver:"v1.8",          acc:"94.1% field coverage"},
            {model:"Risk Scoring Model",                 ver:"v2.4",          acc:"87.3% AUC"},
            {model:"Triage Classifier",                  ver:"v1.5",          acc:"91.8% recall"},
            {model:"Document Generator (Claude Haiku)",  ver:"Bedrock",       acc:"Human-in-loop"},
          ].map(m=>(
            <div key={m.model} style={{padding:"9px 11px",background:C.bg,borderRadius:8,marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                <span style={{fontSize:11,fontWeight:700,color:C.textDark}}>{m.model}</span>
                <Chip color={C.green} bg={C.greenPale}>Active</Chip>
              </div>
              <div style={{fontSize:10,color:C.textLight}}>{m.ver} · {m.acc}</div>
            </div>
          ))}
          <div style={{marginTop:9,padding:"9px 11px",background:C.amberPale,borderRadius:8,fontSize:11,color:C.amber,fontWeight:600}}>
            ⏰ Next quarterly bias audit due: Jun 30, 2026
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ROOT APP ───────────────────────────────────────────────────────────────
export default function App() {
  useEffect(()=>{ injectGlobals(); }, []);

  const [role,       setRole]       = useState(null);
  const [page,       setPage]       = useState("dashboard");
  const [txState,    setTxState]    = useState("idle");
  const [uploadFile, setUploadFile] = useState(null);
  const [triageDec,  setTriageDec]  = useState({});
  const [aiMsgs,     setAiMsgs]     = useState([]);
  const [aiInput,    setAiInput]    = useState("");
  const [openSec,    setOpenSec]    = useState("child");
  const [supExp,     setSupExp]     = useState(null);
  const aiRef = useRef(null);

  const handleUpload = (file) => {
    setUploadFile(file);
    setTxState("uploading");
    setTimeout(()=>setTxState("processing"), 1600);
    setTimeout(()=>{ setTxState("complete"); setAiMsgs(INIT_AI_MSGS); }, 4200);
  };

  const handleAiSend = () => {
    if (!aiInput.trim()) return;
    const user  = {id:Date.now(),    type:"user",    msg:aiInput.trim()};
    const reply = {id:Date.now()+1,  type:"info",    msg:"Thanks — I've noted that context. Is there anything else I should check before you finalize this intake?"};
    setAiMsgs(prev=>[...prev, user, reply]);
    setAiInput("");
    setTimeout(()=>{ if(aiRef.current) aiRef.current.scrollTop=aiRef.current.scrollHeight; }, 120);
  };

  const handleLogout = () => { setRole(null); setPage("dashboard"); setTxState("idle"); setAiMsgs([]); setTriageDec({}); };

  if (!role) return <LoginScreen onSelect={r=>{ setRole(r); setPage("dashboard"); }}/>;

  return (
    <div style={{display:"flex",height:"100vh",fontFamily:"'Outfit',system-ui,sans-serif",overflow:"hidden"}}>
      <Sidebar role={role} page={page} onNav={setPage} onLogout={handleLogout}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <AppHeader role={role} page={page}/>
        <div style={{flex:1,overflow:"auto",padding:"18px 20px",background:C.bg}}>

          {/* ── SCREENER ── */}
          {role==="screener" && page==="dashboard" && <ScreenerDashboard onNewIntake={()=>setPage("intake")}/>}
          {role==="screener" && page==="intake" && (
            <IntakePage
              txState={txState} uploadedFile={uploadFile} onUpload={handleUpload}
              triageDec={triageDec} setTriageDec={setTriageDec}
              aiMsgs={aiMsgs} aiInput={aiInput} setAiInput={setAiInput}
              onAiSend={handleAiSend} aiRef={aiRef}
              openSec={openSec} setOpenSec={setOpenSec}
            />
          )}
          {role==="screener" && page==="history" && (
            <div className="card fade-up" style={{padding:40,textAlign:"center",color:C.textLight}}>
              <div style={{fontSize:32,marginBottom:10}}>📁</div>
              <div style={{fontSize:14,fontWeight:600}}>Case History</div>
              <div style={{fontSize:12,marginTop:4}}>Historical 51A records would appear here with search and filter capabilities.</div>
            </div>
          )}

          {/* ── SUPERVISOR ── */}
          {role==="supervisor" && (page==="dashboard"||page==="review"||page==="summaries") && (
            <SupervisorDashboard expanded={supExp} setExpanded={setSupExp}/>
          )}
          {role==="supervisor" && page==="audit" && (
            <div className="card fade-up" style={{padding:40,textAlign:"center",color:C.textLight}}>
              <div style={{fontSize:32,marginBottom:10}}>🔐</div>
              <div style={{fontSize:14,fontWeight:600}}>Audit Trail</div>
              <div style={{fontSize:12,marginTop:4}}>Tamper-evident 7-year audit log with all AI outputs, human overrides, and system events. Accessible to authorized DCF, EOHHS, and OIG personnel.</div>
            </div>
          )}

          {/* ── WORKER ── */}
          {role==="worker" && page==="dashboard" && <WorkerDashboard setPage={setPage}/>}
          {role==="worker" && page==="briefing"  && <WorkerBriefing  onBack={()=>setPage("dashboard")}/>}
          {role==="worker" && page==="report"    && <WorkerReport/>}

          {/* ── ADMIN ── */}
          {role==="admin" && <AdminDashboard/>}
        </div>
      </div>
    </div>
  );
}
