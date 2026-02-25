// ─── TYPE INFERENCE (runs once at import, not per-render) ────────────────────
function inferType(a) {
  if (a.title === "Horário Verde") return "horario_verde";
  const t = a.title.toLowerCase();
  if (t.includes("ambulatório") || t.includes("ambulatorio") || t.includes("ambulat")) return "ambulatorio";
  if (t.includes("enfermaria"))                                return "enfermaria";
  if (t.includes("alojamento"))                                return "alojamento";
  if (t.includes("saúde mental") || t.includes("saude mental"))return "saude_mental";
  if (t.includes("simulações")   || t.includes("simulacoes")
   || t.includes("simulação"))                                  return "simulacao";
  if (t.includes("simulado"))                                   return "destaque";
  if (t.includes("prova"))                                      return "prova";
  if (t.includes("plantão")      || t.includes("plantao"))     return "plantao";
  if (t.includes("consolidação") || t.includes("consolidacao"))return "casa";
  return a.type;
}

function preProcess(weeks) {
  return weeks.map(w => {
    const dayMap = {};
    ["2ª","3ª","4ª","5ª","6ª","Sáb"].forEach(d => { dayMap[d] = {Manhã:[], Tarde:[]}; });
    const activities = w.activities.map(a => ({ ...a, effectiveType: inferType(a) }));
    activities.forEach(a => { if (dayMap[a.day]) dayMap[a.day][a.turno].push(a); });
    return { ...w, activities, dayMap };
  });
}

function buildWeeksByGroup(byGroupRaw) {
  const result = {};
  for (const [g, weeks] of Object.entries(byGroupRaw)) {
    result[g] = preProcess(weeks);
  }
  return result;
}

// ─── PED GRUPO 6 (manual — sem PDF disponível) ──────────────────────────────
const PED_G6_RAW = [
  {num:1,dates:"23/2 – 28/2",activities:[
    {id:"1-1",  day:"2ª",  turno:"Manhã",title:"Horário Verde",              sub:"",                     time:"",           type:"verde"},
    {id:"1-2",  day:"3ª",  turno:"Manhã",title:"C. de Simulações",           sub:"Dra. Thais",           time:"08:00–11:00",type:"normal"},
    {id:"1-3",  day:"4ª",  turno:"Manhã",title:"Horário Verde",              sub:"",                     time:"",           type:"verde"},
    {id:"1-3b", day:"5ª",  turno:"Manhã",title:"Saúde Mental",               sub:"Dr. Gabriel",          time:"08:00–12:00",type:"normal",loc:"Campus 8301"},
    {id:"1-3c", day:"6ª",  turno:"Manhã",title:"Consolidação e Performance", sub:"Em Casa",              time:"08:00–12:00",type:"casa"},
    {id:"1-4",  day:"2ª",  turno:"Tarde",title:"Ambulatório HUV",            sub:"Dra. Ana Carolina",    time:"14:00–17:00",type:"normal"},
    {id:"1-5",  day:"3ª",  turno:"Tarde",title:"Consolidação e Performance", sub:"Em Casa",              time:"14:00–18:00",type:"casa"},
    {id:"1-6",  day:"4ª",  turno:"Tarde",title:"Ambulatório HUV",            sub:"Dra. Victória",        time:"14:00–17:00",type:"normal"},
    {id:"1-7",  day:"5ª",  turno:"Tarde",title:"Consolidação e Performance", sub:"Em Casa",              time:"14:00–18:00",type:"casa"},
    {id:"1-8",  day:"6ª",  turno:"Tarde",title:"Horário Verde",              sub:"",                     time:"",           type:"verde"},
    {id:"1-9",  day:"Sáb", turno:"Tarde",title:"Simulado Nacional MEDCOF",   sub:"Campus Universitário", time:"13:00–18:00",type:"destaque"},
  ]},
  {num:2,dates:"02/3 – 07/3",activities:[
    {id:"2-1",  day:"2ª",turno:"Manhã",title:"Horário Verde",              sub:"",                 time:"",           type:"verde"},
    {id:"2-2",  day:"3ª",turno:"Manhã",title:"C. de Simulações",           sub:"Dra. Thais",       time:"08:00–11:00",type:"normal"},
    {id:"2-3",  day:"4ª",turno:"Manhã",title:"Horário Verde",              sub:"",                 time:"",           type:"verde"},
    {id:"2-3b", day:"5ª",turno:"Manhã",title:"Saúde Mental",               sub:"Dr. Gabriel",      time:"08:00–12:00",type:"normal",loc:"Campus 8301"},
    {id:"2-3c", day:"6ª",turno:"Manhã",title:"Consolidação e Performance", sub:"Em Casa",          time:"08:00–12:00",type:"casa"},
    {id:"2-4",  day:"2ª",turno:"Tarde",title:"Consolidação e Performance", sub:"Em Casa",          time:"14:00–18:00",type:"casa"},
    {id:"2-5",  day:"3ª",turno:"Tarde",title:"Consolidação e Performance", sub:"Em Casa",          time:"14:00–18:00",type:"casa"},
    {id:"2-6",  day:"4ª",turno:"Tarde",title:"Ambulatório HUV",            sub:"Dr. Luiz Eduardo", time:"14:00–17:00",type:"normal"},
    {id:"2-7",  day:"5ª",turno:"Tarde",title:"Horário Verde",              sub:"",                 time:"",           type:"verde"},
    {id:"2-8",  day:"6ª",turno:"Tarde",title:"Ambulatório HUV",            sub:"Dra. Victória",    time:"14:00–17:00",type:"normal"},
  ]},
  {num:3,dates:"09/3 – 14/3",activities:[
    {id:"3-1",  day:"2ª",turno:"Manhã",title:"Ambulatório HUV",                  sub:"Dra. Renata",  time:"08:00–12:00",type:"normal"},
    {id:"3-2",  day:"3ª",turno:"Manhã",title:"C. de Simulações",                 sub:"Dra. Thais",   time:"08:00–11:00",type:"normal"},
    {id:"3-3",  day:"4ª",turno:"Manhã",title:"Horário Verde",                    sub:"",             time:"",           type:"verde"},
    {id:"3-4",  day:"5ª",turno:"Manhã",title:"Saúde Mental",                     sub:"Dr. Gabriel",  time:"08:00–12:00",type:"normal",loc:"Campus 8301"},
    {id:"3-4b", day:"6ª",turno:"Manhã",title:"Ambulatório HUV + Sessão Clínica", sub:"Dra. Victória",time:"08:00–12:00",type:"normal"},
    {id:"3-5",  day:"2ª",turno:"Tarde",title:"Consolidação e Performance",        sub:"Em Casa",      time:"14:00–18:00",type:"casa"},
    {id:"3-6",  day:"3ª",turno:"Tarde",title:"Horário Verde",                    sub:"",             time:"",           type:"verde"},
    {id:"3-7",  day:"4ª",turno:"Tarde",title:"Consolidação e Performance",        sub:"Em Casa",      time:"14:00–18:00",type:"casa"},
    {id:"3-8",  day:"5ª",turno:"Tarde",title:"Horário Verde",                    sub:"",             time:"",           type:"verde"},
    {id:"3-9",  day:"6ª",turno:"Tarde",title:"Consolidação e Performance",        sub:"Em Casa",      time:"14:00–18:00",type:"casa"},
  ]},
  {num:4,dates:"16/3 – 21/3",activities:[
    {id:"4-1",  day:"2ª",turno:"Manhã",title:"Horário Verde",              sub:"",                 time:"",           type:"verde"},
    {id:"4-2",  day:"3ª",turno:"Manhã",title:"C. de Simulações",           sub:"Dra. Thais",       time:"08:00–11:00",type:"normal"},
    {id:"4-3",  day:"4ª",turno:"Manhã",title:"Ambulatório HUV",            sub:"Dr. Luiz Eduardo", time:"08:00–12:00",type:"normal"},
    {id:"4-4",  day:"5ª",turno:"Manhã",title:"Saúde Mental",               sub:"Dr. Gabriel",      time:"08:00–12:00",type:"normal",loc:"Campus 8301"},
    {id:"4-5",  day:"6ª",turno:"Manhã",title:"Consolidação e Performance", sub:"Em Casa",          time:"08:00–12:00",type:"casa"},
    {id:"4-6",  day:"2ª",turno:"Tarde",title:"Horário Verde",              sub:"",                 time:"",           type:"verde"},
    {id:"4-7",  day:"3ª",turno:"Tarde",title:"Consolidação e Performance", sub:"Em Casa",          time:"14:00–18:00",type:"casa"},
    {id:"4-8",  day:"4ª",turno:"Tarde",title:"Consolidação e Performance", sub:"Em Casa",          time:"14:00–18:00",type:"casa"},
    {id:"4-9",  day:"5ª",turno:"Tarde",title:"Consolidação e Performance", sub:"Em Casa",          time:"14:00–18:00",type:"casa"},
    {id:"4-10", day:"6ª",turno:"Tarde",title:"Horário Verde",              sub:"",                 time:"",           type:"verde"},
  ]},
  {num:5,dates:"23/3 – 28/3",activities:[
    {id:"5-1",  day:"2ª",turno:"Manhã",title:"Consolidação e Performance", sub:"Em Casa",             time:"08:00–12:00",type:"casa"},
    {id:"5-2",  day:"3ª",turno:"Manhã",title:"C. de Simulações",           sub:"Dra. Thais",           time:"08:00–11:00",type:"normal"},
    {id:"5-3",  day:"4ª",turno:"Manhã",title:"Plantão HUV",               sub:"B) 8–13h · A) 13–18h", time:"08:00–18:00",type:"plantao"},
    {id:"5-4",  day:"5ª",turno:"Manhã",title:"Saúde Mental",               sub:"Dr. Gabriel",          time:"08:00–12:00",type:"normal",loc:"Campus 8301"},
    {id:"5-5",  day:"6ª",turno:"Manhã",title:"Ambulatório HUV",            sub:"Dr. Leonardo",         time:"08:00–12:00",type:"normal"},
    {id:"5-6",  day:"2ª",turno:"Tarde",title:"Ambulatório HUV",            sub:"Dra. Patrícia",        time:"14:00–17:00",type:"normal"},
    {id:"5-7",  day:"3ª",turno:"Tarde",title:"Horário Verde",              sub:"",                     time:"",           type:"verde"},
    {id:"5-9",  day:"5ª",turno:"Tarde",title:"Consolidação e Performance", sub:"Em Casa",              time:"14:00–18:00",type:"casa"},
    {id:"5-10", day:"6ª",turno:"Tarde",title:"Horário Verde",              sub:"",                     time:"",           type:"verde"},
  ]},
  {num:6,dates:"30/3 – 04/4",activities:[
    {id:"6-1",  day:"2ª",  turno:"Manhã",title:"Enfermaria",                 sub:"",        time:"08:00–12:00",type:"normal"},
    {id:"6-2",  day:"3ª",  turno:"Manhã",title:"Enfermaria",                 sub:"",        time:"08:00–12:00",type:"normal"},
    {id:"6-3",  day:"4ª",  turno:"Manhã",title:"Enfermaria",                 sub:"",        time:"08:00–12:00",type:"normal"},
    {id:"6-4",  day:"5ª",  turno:"Manhã",title:"Enfermaria",                 sub:"",        time:"08:00–12:00",type:"normal"},
    {id:"6-5",  day:"6ª",  turno:"Manhã",title:"Feriado",                    sub:"",        time:"",           type:"feriado"},
    {id:"6-6",  day:"Sáb", turno:"Manhã",title:"Enfermaria",                 sub:"",        time:"08:00–12:00",type:"normal"},
    {id:"6-7",  day:"2ª",  turno:"Tarde",title:"Consolidação e Performance", sub:"Em Casa", time:"14:00–18:00",type:"casa"},
    {id:"6-8",  day:"3ª",  turno:"Tarde",title:"Horário Verde",              sub:"",        time:"",           type:"verde"},
    {id:"6-9",  day:"4ª",  turno:"Tarde",title:"Horário Verde",              sub:"",        time:"",           type:"verde"},
    {id:"6-10", day:"5ª",  turno:"Tarde",title:"Consolidação e Performance", sub:"Em Casa", time:"14:00–18:00",type:"casa"},
  ]},
  {num:7,dates:"06/4 – 11/4",activities:[
    {id:"7-1",  day:"2ª",turno:"Manhã",title:"Horário Verde",              sub:"",             time:"",           type:"verde"},
    {id:"7-2",  day:"3ª",turno:"Manhã",title:"Consolidação e Performance", sub:"Em Casa",      time:"08:00–12:00",type:"casa"},
    {id:"7-3",  day:"4ª",turno:"Manhã",title:"Horário Verde",              sub:"",             time:"",           type:"verde"},
    {id:"7-4",  day:"5ª",turno:"Manhã",title:"Ambulatório HUV",            sub:"Dr. Leonardo", time:"08:00–12:00",type:"normal"},
    {id:"7-5",  day:"6ª",turno:"Manhã",title:"Consolidação e Performance", sub:"Em Casa",      time:"08:00–12:00",type:"casa"},
    {id:"7-6",  day:"2ª",turno:"Tarde",title:"Enfermaria",                 sub:"",             time:"14:00–17:00",type:"normal"},
    {id:"7-7",  day:"3ª",turno:"Tarde",title:"Enfermaria",                 sub:"",             time:"14:00–17:00",type:"normal"},
    {id:"7-8",  day:"4ª",turno:"Tarde",title:"Enfermaria",                 sub:"",             time:"14:00–17:00",type:"normal"},
    {id:"7-9",  day:"5ª",turno:"Tarde",title:"Enfermaria",                 sub:"",             time:"14:00–17:00",type:"normal"},
    {id:"7-10", day:"6ª",turno:"Tarde",title:"Enfermaria",                 sub:"",             time:"14:00–17:00",type:"normal"},
  ]},
  {num:8,dates:"13/4 – 18/4",activities:[
    {id:"8-1",  day:"2ª",  turno:"Manhã",title:"Alojamento Conjunto",             sub:"",                    time:"08:00–12:00",type:"normal"},
    {id:"8-2",  day:"3ª",  turno:"Manhã",title:"Alojamento Conjunto",             sub:"",                    time:"08:00–12:00",type:"normal"},
    {id:"8-3",  day:"4ª",  turno:"Manhã",title:"Alojamento Conjunto",             sub:"",                    time:"08:00–12:00",type:"normal"},
    {id:"8-4",  day:"5ª",  turno:"Manhã",title:"Alojamento Conjunto",             sub:"",                    time:"08:00–12:00",type:"normal"},
    {id:"8-5",  day:"6ª",  turno:"Manhã",title:"Aloj. Conjunto + Sessão Clínica", sub:"",                    time:"08:00–12:00",type:"normal"},
    {id:"8-6",  day:"2ª",  turno:"Tarde",title:"Horário Verde",                   sub:"",                    time:"",           type:"verde"},
    {id:"8-7",  day:"3ª",  turno:"Tarde",title:"Ambulatório HUV",                 sub:"Dra. Melinda",        time:"14:00–17:00",type:"normal"},
    {id:"8-8",  day:"4ª",  turno:"Tarde",title:"Consolidação e Performance",       sub:"Em Casa",             time:"14:00–18:00",type:"casa"},
    {id:"8-9",  day:"5ª",  turno:"Tarde",title:"Ambulatório HUV",                 sub:"Dra. Lívia",          time:"14:00–17:00",type:"normal"},
    {id:"8-10", day:"6ª",  turno:"Tarde",title:"Horário Verde",                   sub:"",                    time:"",           type:"verde"},
    {id:"8-11", day:"Sáb", turno:"Tarde",title:"Simulado Geral do Módulo",        sub:"Campus Universitário",time:"13:00–18:00",type:"destaque"},
  ]},
  {num:9,dates:"20/4 – 25/4",activities:[
    {id:"9-1",day:"2ª",turno:"Manhã",title:"Consolidação e Performance", sub:"Em Casa",      time:"08:00–12:00",type:"casa"},
    {id:"9-2",day:"3ª",turno:"Manhã",title:"Feriado",                    sub:"",             time:"",           type:"feriado"},
    {id:"9-3",day:"4ª",turno:"Manhã",title:"Horário Verde",              sub:"",             time:"",           type:"verde"},
    {id:"9-4",day:"5ª",turno:"Manhã",title:"Feriado",                    sub:"",             time:"",           type:"feriado"},
    {id:"9-5",day:"6ª",turno:"Manhã",title:"Consolidação e Performance", sub:"Em Casa",      time:"08:00–12:00",type:"casa"},
    {id:"9-6",day:"2ª",turno:"Tarde",title:"Alojamento Conjunto",        sub:"",             time:"14:00–17:00",type:"normal"},
    {id:"9-7",day:"4ª",turno:"Tarde",title:"Ambulatório HUV",            sub:"Dra. Vitória", time:"14:00–17:00",type:"normal"},
    {id:"9-8",day:"6ª",turno:"Tarde",title:"Alojamento Conjunto",        sub:"",             time:"14:00–17:00",type:"normal"},
  ]},
  {num:10,dates:"27/4 – 02/5",activities:[
    {id:"10-1",day:"2ª",turno:"Manhã",title:"Horário Verde",              sub:"",                     time:"",           type:"verde"},
    {id:"10-2",day:"3ª",turno:"Manhã",title:"Plantão HUV",               sub:"A) 8–13h · B) 13–18h", time:"08:00–18:00",type:"plantao"},
    {id:"10-3",day:"4ª",turno:"Manhã",title:"C. de Simulações",           sub:"Prof. Pediatria",      time:"08:00–12:00",type:"normal"},
    {id:"10-4",day:"5ª",turno:"Manhã",title:"C. de Simulações",           sub:"Prof. Pediatria",      time:"08:00–12:00",type:"normal"},
    {id:"10-5",day:"6ª",turno:"Manhã",title:"Feriado",                    sub:"",                     time:"",           type:"feriado"},
    {id:"10-6",day:"2ª",turno:"Tarde",title:"Horário Verde",              sub:"",                     time:"",           type:"verde"},
    {id:"10-7",day:"3ª",turno:"Tarde",title:"Prova do Módulo",            sub:"Campus Universitário", time:"10:00–12:00",type:"prova"},
    {id:"10-8",day:"4ª",turno:"Tarde",title:"C. de Simulações",           sub:"Prof. Pediatria",      time:"14:00–17:00",type:"normal"},
    {id:"10-9",day:"5ª",turno:"Tarde",title:"Ambulatório HUV",            sub:"Dra. Natália",         time:"14:00–17:00",type:"normal"},
  ]},
];

// ─── LAZY DATA LOADING (code splitting) ────────────────────────────────────
const dataCache = {};

export async function loadMateriaData(id) {
  if (dataCache[id]) return dataCache[id];
  let raw;
  switch (id) {
    case "cm":  raw = (await import("./data/cm")).CM_BY_GROUP; break;
    case "go":  raw = (await import("./data/go")).GO_BY_GROUP; break;
    case "ped": {
      const parsed = (await import("./data/ped")).PED_BY_GROUP;
      raw = { ...parsed, 6: PED_G6_RAW };
      break;
    }
    default: return null;
  }
  dataCache[id] = buildWeeksByGroup(raw);
  return dataCache[id];
}

// ─── KEY EVENTS & WEEK DATES (shared across all matérias) ────────────────────
const KEY_EVENTS = [
  {date:new Date(2026,1,28), label:"Simulado Nacional MEDCOF", type:"simulado"},
  {date:new Date(2026,3,18), label:"Simulado Geral do Módulo", type:"simulado"},
  {date:new Date(2026,3,28), label:"Prova do Módulo",          type:"prova"},
];

const WEEK_DATES = [
  {num:1,  start:new Date(2026,1,23), end:new Date(2026,1,28)},
  {num:2,  start:new Date(2026,2,2),  end:new Date(2026,2,7)},
  {num:3,  start:new Date(2026,2,9),  end:new Date(2026,2,14)},
  {num:4,  start:new Date(2026,2,16), end:new Date(2026,2,21)},
  {num:5,  start:new Date(2026,2,23), end:new Date(2026,2,28)},
  {num:6,  start:new Date(2026,2,30), end:new Date(2026,3,4)},
  {num:7,  start:new Date(2026,3,6),  end:new Date(2026,3,11)},
  {num:8,  start:new Date(2026,3,13), end:new Date(2026,3,18)},
  {num:9,  start:new Date(2026,3,20), end:new Date(2026,3,25)},
  {num:10, start:new Date(2026,3,27), end:new Date(2026,4,2)},
];

// ─── MATÉRIAS ────────────────────────────────────────────────────────────────
export const MATERIAS = [
  {
    id:"ped",  label:"Pediatria",               icon:"👶", color:"#0EA5E9",
    hasData: true, keyEvents: KEY_EVENTS, weekDates: WEEK_DATES,
  },
  {
    id:"cm",  label:"Clínica Médica",           icon:"🩺", color:"#10B981",
    hasData: true, keyEvents: KEY_EVENTS, weekDates: WEEK_DATES,
  },
  {
    id:"go",  label:"GO",                       icon:"🤰", color:"#EC4899",
    hasData: true, keyEvents: KEY_EVENTS, weekDates: WEEK_DATES,
  },
  { id:"cc",  label:"Clínica Cirúrgica",        icon:"🔪", color:"#F59E0B", hasData:false, disponivelEm:"Junho 2026" },
  { id:"ubs", label:"Atenção Básica UBS",       icon:"🏥", color:"#8B5CF6", hasData:false, disponivelEm:"Agosto 2026" },
  { id:"sim", label:"Atenção Básica Simulação", icon:"🎯", color:"#EF4444", hasData:false, disponivelEm:"Agosto 2026" },
];

export const GRUPOS = Array.from({length:10}, (_, i) => i + 1);
